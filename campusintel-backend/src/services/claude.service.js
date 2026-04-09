const supabase = require('../config/supabase');

const DEV_MODE = process.env.CLAUDE_MOCK === 'true';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.MODELSLAB_API_KEY || process.env.NVIDIA_API_KEY; 
const TIMEOUT_MS = 45000;
const MODEL = 'gemini-1.5-flash'; // Google Gemini directly from AI Studio

// ── Mock Data (DEV_MODE=true → zero tokens burned) ────────────
const MOCK_BRIEF = {
  headline: 'Focus on System Design + Arrays — LPU-Google pattern shows 75% frequency',
  confidence_in_data: 'MEDIUM',
  data_source: 'LOCAL_DB',
  topics: [
    {
      name: 'system_design',
      priority: 1,
      frequency_in_interviews: 0.75,
      student_current_level: 0.15,
      gap_severity: 'CRITICAL',
      time_to_allocate_hours: 5,
      specific_subtopics: ['LLD', 'HLD', 'CAP theorem', 'distributed systems'],
      sample_questions: ['Design Google Drive', 'Design a rate limiter service'],
    }
  ],
  prep_plan: {
    total_hours: 10,
    schedule: [{ day: 1, focus: 'System Design crash course', hours: 5, tasks: ['Grokking SD Ch1-3'] }],
  },
  success_tips: ['Think out loud', 'State assumptions first'],
  red_flags_to_avoid: ['Jumping to code without approach'],
  mock_question_for_now: 'Design a parking lot management system with LLD focus',
};

const MOCK_ASSESSMENT = {
  topic: 'system_design',
  questions: [
    {
      id: 'q1',
      question: 'Design a system to handle 10M concurrent requests per day. Walk me through your architecture.',
      type: 'open_ended',
      expected_concepts: ['load balancing', 'caching', 'database sharding', 'CDN'],
      time_minutes: 20,
    }
  ],
};

// ── Helpers ────────────────────────────────────────────────────
function reduceContext(message, fraction) {
  const lines = message.split('\n');
  return lines.slice(0, Math.floor(lines.length * fraction)).join('\n') +
    '\n\n[Context reduced for retry.]';
}

async function logFallback(supabaseClient, ctx, attempt, durationMs) {
  try {
    await supabaseClient.from('agent_logs').insert({
      session_id: ctx.sessionId || 'unknown',
      student_id: ctx.studentId || null,
      college_id: ctx.collegeId || 'college-lpu-001',
      step_number: ctx.stepNumber || 99,
      step_name: ctx.stepName || 'NVIDIA_CALL',
      input: { attempt, message: 'Timeout exceeded threshold' },
      output: null,
      decision_basis: `API response exceeded ${TIMEOUT_MS}ms. Retrying.`,
      decision_made: 'RETRY_REDUCED_CONTEXT',
      duration_ms: durationMs,
      status: 'fallback_triggered',
    });
  } catch (e) {
    console.error('[NVIDIA] Failed to log fallback:', e.message);
  }
}

async function callWithFallback(systemPrompt, userMessage, maxTokens, logCtx = {}) {
  let currentMessage = userMessage;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const startTime = Date.now();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Using Google Gemini's official OpenAI Compatibility Endpoint
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          temperature: 0.5,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: currentMessage }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`ModelsLab API Error: ${response.status} - ${await response.text()}`);
      }

      const json = await response.json();
      
      if (!json.choices || !json.choices[0]) {
        throw new Error(`Gemini API Error: Unexpected Response Payload - ${JSON.stringify(json)}`);
      }
      
      return json.choices[0].message.content;

    } catch (error) {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      if ((error.name === 'AbortError' || error.code === 'ETIMEDOUT') && attempt === 1) {
        console.warn(`[NVIDIA] Timeout on attempt ${attempt}. Retrying with reduced context.`);
        if (logCtx.sessionId) await logFallback(supabase, logCtx, attempt, duration);
        currentMessage = reduceContext(userMessage, 0.5);
        continue;
      }
      throw error;
    }
  }
}

// ── Public Functions ───────────────────────────────────────────

async function generateBrief(studentProfile, intelData, gaps, daysLeft, logCtx = {}) {
  if (DEV_MODE) {
    console.log('[DEV_MODE] generateBrief — returning mock (no API call)');
    await new Promise(r => setTimeout(r, 800));
    return MOCK_BRIEF;
  }

  const systemPrompt = `You are a placement coach. Generate a hyper-specific prep brief as JSON. 
Be specific to the company. Prioritize topics by interview frequency. Return ONLY valid JSON, no markdown formatting blocks. Just the raw JSON object starting with {.`;

  const userMessage = `
Student skills: ${JSON.stringify(studentProfile.inferred_skills)}
Critical gaps: ${JSON.stringify(gaps)}
Days until interview: ${daysLeft}
Company: ${intelData.company_name}
Top topics: ${JSON.stringify(intelData.top_topics?.slice(0, 5))}

Return JSON with structure: { "headline": "", "confidence_in_data": "", "data_source": "", "topics": [{"name":"", "priority":1, "frequency_in_interviews":0.0, "student_current_level":0.0, "gap_severity":"", "time_to_allocate_hours":0, "specific_subtopics":[], "sample_questions":[]}], "prep_plan": { "total_hours":10, "schedule":[{"day":1, "focus":"", "hours":0, "tasks":[]}] }, "success_tips":[], "red_flags_to_avoid":[], "mock_question_for_now":"" }`;

  let raw = await callWithFallback(systemPrompt, userMessage, 1500, logCtx);
  
  // Clean up any markdown blocks that Nemotron might try to inject
  raw = raw.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

  try {
    return JSON.parse(raw);
  } catch {
    console.error("[NVIDIA] Failed to parse generated brief JSON:", raw.substring(0, 50));
    return MOCK_BRIEF; // Safe fallback so the agent loop doesn't explode
  }
}

async function generateAssessment(topic, studentLevel, companyName, logCtx = {}) {
  if (DEV_MODE) {
    console.log('[DEV_MODE] generateAssessment — returning mock');
    await new Promise(r => setTimeout(r, 500));
    return { ...MOCK_ASSESSMENT, topic };
  }

  const systemPrompt = `You are a technical interviewer at ${companyName}. 
Generate a targeted skill assessment as JSON. Return ONLY valid JSON starting with {. No markdown.`;

  const userMessage = `
Topic: ${topic}
Student current level (0-1): ${studentLevel}

Return JSON: { "topic": "${topic}", "questions": [{"id":"q1", "question":"", "type":"", "expected_concepts":[], "time_minutes":10}] }
Include 3 questions of increasing difficulty.`;

  let raw = await callWithFallback(systemPrompt, userMessage, 800, logCtx);
  raw = raw.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
  
  try {
    return JSON.parse(raw);
  } catch {
    return MOCK_ASSESSMENT;
  }
}

async function evaluateAssessment(questions, responses, topic, logCtx = {}) {
  if (DEV_MODE) {
    return { overall_score: 0.45, skill_level_inferred: 'BEGINNER', per_question: [], improvement_areas: [topic], strengths: [] };
  }

  const systemPrompt = `You are a technical evaluator. Score assessment responses as JSON. Return ONLY valid JSON starting with {. no markdown.`;
  const userMessage = `
Topic: ${topic}
Questions and expected concepts: ${JSON.stringify(questions)}
Student responses: ${JSON.stringify(responses)}

Return JSON: { "overall_score": 0.5, "skill_level_inferred": "INTERMEDIATE", "per_question": [], "improvement_areas": [], "strengths": [] }`;

  let raw = await callWithFallback(systemPrompt, userMessage, 600, logCtx);
  raw = raw.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

  try {
    return JSON.parse(raw);
  } catch {
    return { overall_score: 0.5, skill_level_inferred: 'INTERMEDIATE', per_question: [], improvement_areas: [], strengths: [] };
  }
}

module.exports = { generateBrief, generateAssessment, evaluateAssessment };

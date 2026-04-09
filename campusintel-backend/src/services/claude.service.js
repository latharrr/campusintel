const anthropic = require('../config/claude');
const supabase = require('../config/supabase');

const DEV_MODE = process.env.CLAUDE_MOCK === 'true';
const CLAUDE_TIMEOUT_MS = 5000;
const MODEL = 'claude-haiku-3-20240307'; // cheap — $0.004/run vs $0.037 sonnet

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
      sample_questions: [
        'Design Google Drive with sharing and versioning',
        'Design a URL shortener at scale',
        'Design a rate limiter service',
      ],
    },
    {
      name: 'dsa_arrays',
      priority: 2,
      frequency_in_interviews: 0.87,
      student_current_level: 0.55,
      gap_severity: 'MODERATE',
      time_to_allocate_hours: 3,
      specific_subtopics: ['two pointers', 'sliding window', 'merge intervals'],
      sample_questions: [
        'Merge k sorted arrays',
        'Find all anagrams in a string',
        'Minimum window substring',
      ],
    },
    {
      name: 'graphs',
      priority: 3,
      frequency_in_interviews: 0.62,
      student_current_level: 0.55,
      gap_severity: 'MODERATE',
      time_to_allocate_hours: 2,
      specific_subtopics: ['BFS', 'DFS', 'Dijkstra', 'topological sort'],
      sample_questions: ['Number of islands', 'Course schedule', 'Shortest path in grid'],
    },
  ],
  prep_plan: {
    total_hours: 10,
    schedule: [
      { day: 1, focus: 'System Design crash course', hours: 5, tasks: ['Grokking SD Ch1-3', 'Draw Google Drive architecture', 'Practice LLD: Parking lot'] },
      { day: 2, focus: 'Arrays + Graphs', hours: 3, tasks: ['LeetCode: Two pointers x5', 'BFS/DFS x3', 'Dijkstra implementation'] },
      { day: 3, focus: 'Mock + Revise', hours: 2, tasks: ['Full mock interview', 'Weak area revision', 'Behavioral prep'] },
    ],
  },
  success_tips: ['Think out loud', 'State assumptions first', 'Always discuss time + space complexity', 'Draw architecture before coding'],
  red_flags_to_avoid: ['Jumping to code without approach', 'Not handling edge cases', 'Ignoring scalability in system design'],
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
    },
    {
      id: 'q2',
      question: 'What is the CAP theorem? Give a real-world example of each trade-off.',
      type: 'conceptual',
      expected_concepts: ['consistency', 'availability', 'partition tolerance', 'MongoDB vs Cassandra'],
      time_minutes: 10,
    },
    {
      id: 'q3',
      question: 'Compare SQL vs NoSQL. When would you choose each for a social media platform?',
      type: 'comparative',
      expected_concepts: ['ACID', 'schema flexibility', 'horizontal scaling', 'use case fit'],
      time_minutes: 10,
    },
  ],
};

// ── Helpers ────────────────────────────────────────────────────
function reduceContext(message, fraction) {
  const lines = message.split('\n');
  return lines.slice(0, Math.floor(lines.length * fraction)).join('\n') +
    '\n\n[Context reduced for retry. Focus on top 3 topics only.]';
}

async function logFallback(supabaseClient, ctx, attempt, durationMs) {
  try {
    await supabaseClient.from('agent_logs').insert({
      session_id: ctx.sessionId || 'unknown',
      student_id: ctx.studentId || null,
      college_id: ctx.collegeId || 'college-lpu-001',
      step_number: ctx.stepNumber || 99,
      step_name: ctx.stepName || 'CLAUDE_CALL',
      input: { attempt, message: 'Claude timeout exceeded threshold' },
      output: null,
      decision_basis: `Claude response exceeded ${CLAUDE_TIMEOUT_MS}ms. Retrying with reduced context (attempt ${attempt}).`,
      decision_made: 'RETRY_REDUCED_CONTEXT',
      duration_ms: durationMs,
      status: 'fallback_triggered',
    });
  } catch (e) {
    console.error('[Claude] Failed to log fallback:', e.message);
  }
}

async function callWithFallback(systemPrompt, userMessage, maxTokens, logCtx = {}) {
  let currentMessage = userMessage;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const startTime = Date.now();
    const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

    try {
      const response = await anthropic.messages.create(
        {
          model: MODEL,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: currentMessage }],
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      return response.content[0].text;
    } catch (error) {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      if ((error.name === 'AbortError' || error.code === 'ETIMEDOUT') && attempt === 1) {
        console.warn(`[Claude] Timeout on attempt ${attempt}. Retrying with reduced context.`);
        if (logCtx.sessionId) await logFallback(supabase, logCtx, attempt, duration);
        currentMessage = reduceContext(userMessage, 0.4);
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
Be specific to the company. Prioritize topics by interview frequency. Return ONLY valid JSON, no markdown.`;

  const userMessage = `
Student skills: ${JSON.stringify(studentProfile.inferred_skills)}
Critical gaps: ${JSON.stringify(gaps)}
Days until interview: ${daysLeft}
Company: ${intelData.company_name}
Top interview topics at this company: ${JSON.stringify(intelData.top_topics?.slice(0, 5))}
Data source: ${intelData.source}
Data confidence: ${intelData.confidence_level}

Return JSON with structure: { headline, confidence_in_data, data_source, topics[], prep_plan, success_tips[], red_flags_to_avoid[], mock_question_for_now }
Each topic: { name, priority, frequency_in_interviews, student_current_level, gap_severity, time_to_allocate_hours, specific_subtopics[], sample_questions[] }
prep_plan: { total_hours, schedule[{ day, focus, hours, tasks[] }] }`;

  const raw = await callWithFallback(systemPrompt, userMessage, 1200, logCtx);
  try {
    return JSON.parse(raw);
  } catch {
    return { headline: raw.substring(0, 200), topics: [], prep_plan: { total_hours: 0, schedule: [] }, error: 'parse_failed' };
  }
}

async function generateAssessment(topic, studentLevel, companyName, logCtx = {}) {
  if (DEV_MODE) {
    console.log('[DEV_MODE] generateAssessment — returning mock (no API call)');
    await new Promise(r => setTimeout(r, 500));
    return { ...MOCK_ASSESSMENT, topic };
  }

  const systemPrompt = `You are a technical interviewer at ${companyName}. 
Generate a targeted skill assessment as JSON. Return ONLY valid JSON, no markdown.`;

  const userMessage = `
Topic: ${topic}
Student current level (0-1): ${studentLevel}
Company: ${companyName}

Return JSON: { topic, questions[{ id, question, type, expected_concepts[], time_minutes }] }
Include 3 questions of increasing difficulty.`;

  const raw = await callWithFallback(systemPrompt, userMessage, 600, logCtx);
  try {
    return JSON.parse(raw);
  } catch {
    return MOCK_ASSESSMENT;
  }
}

async function evaluateAssessment(questions, responses, topic, logCtx = {}) {
  if (DEV_MODE) {
    console.log('[DEV_MODE] evaluateAssessment — returning mock');
    return {
      overall_score: 0.45,
      skill_level_inferred: 'BEGINNER',
      per_question: questions.map((q, i) => ({
        question_id: q.id,
        score: 0.4,
        feedback: 'Partially correct — missed key concepts. Review CAP theorem.',
      })),
      improvement_areas: [topic],
      strengths: [],
    };
  }

  const systemPrompt = `You are a technical evaluator. Score assessment responses as JSON. Return ONLY valid JSON.`;
  const userMessage = `
Topic: ${topic}
Questions and expected concepts: ${JSON.stringify(questions)}
Student responses: ${JSON.stringify(responses)}

Return JSON: { overall_score (0-1), skill_level_inferred (BEGINNER/INTERMEDIATE/ADVANCED), 
per_question[{ question_id, score, feedback }], improvement_areas[], strengths[] }`;

  const raw = await callWithFallback(systemPrompt, userMessage, 400, logCtx);
  try {
    return JSON.parse(raw);
  } catch {
    return { overall_score: 0.5, skill_level_inferred: 'INTERMEDIATE', per_question: [], improvement_areas: [], strengths: [] };
  }
}

module.exports = { generateBrief, generateAssessment, evaluateAssessment };

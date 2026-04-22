// src/lib/grok.js — Groq client (OpenAI-compatible, Llama models)
import OpenAI from 'openai';

// Support both GROQ_API_KEY and GROK_API_KEY (legacy fallback)
const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;

if (!GROQ_KEY) {
  console.error('[Groq] WARNING: Neither GROQ_API_KEY nor GROK_API_KEY is set. AI features will fail.');
}

const client = new OpenAI({
  apiKey: GROQ_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Fast model — llama-3.1-8b-instant (replaces grok-3-mini)
export const GROK_FAST = 'llama-3.1-8b-instant';
// Full model — llama-3.3-70b-versatile (replaces grok-3)
export const GROK_FULL = 'llama-3.3-70b-versatile';

/**
 * Generate a placement preparation brief using Grok
 */
export async function generateBrief({ student, intel, drive }) {
  const prompt = `You are a placement preparation expert. Generate a highly specific, actionable preparation brief.

STUDENT PROFILE:
- Name: ${student.name}
- Branch: ${student.branch || 'CSE'}
- CGPA: ${student.cgpa || 'N/A'}
- Current Skills (0-1 scale): ${JSON.stringify(student.inferred_skills || {})}
- Readiness Score: ${student.confidence_score}

COMPANY: ${drive.company_name || 'Target Company'}
DRIVE DATE: ${drive.drive_date}

CAMPUS INTERVIEW INTELLIGENCE (from ${intel.debrief_count} verified debriefs):
${JSON.stringify(intel.top_topics || [], null, 2)}
Selection Rate: ${intel.selection_rate || 0.5}
Avg Rounds: ${intel.avg_rounds || 4}

Generate a JSON response with this EXACT structure:
{
  "headline": "one sentence summary of the student's biggest risk and priority",
  "confidence_in_data": "HIGH|MEDIUM|LOW",
  "data_source": "LOCAL_DB|GLOBAL_DB|SCRAPED",
  "topics": [
    {
      "name": "topic name",
      "priority": 1,
      "frequency_in_interviews": 0.75,
      "student_current_level": 0.15,
      "required_level": 0.75,
      "gap_severity": "CRITICAL|MODERATE|OK",
      "time_to_allocate_hours": 5,
      "specific_subtopics": ["subtopic1", "subtopic2"],
      "sample_questions": ["question1", "question2"]
    }
  ],
  "prep_plan": {
    "total_hours": 16,
    "schedule": [
      {
        "day": 1,
        "focus": "topic focus",
        "hours": 5,
        "tasks": ["task1", "task2", "task3"]
      }
    ]
  },
  "success_tips": ["tip1", "tip2"],
  "red_flags_to_avoid": ["flag1", "flag2"],
  "mock_question_for_now": "one practice question to attempt right now"
}

Return ONLY valid JSON. No markdown, no explanation.`;

  const response = await client.chat.completions.create({
    model: GROK_FULL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const raw = response.choices[0].message.content.trim();
  return extractJSON(raw);
}

/**
 * Generate targeted assessment questions
 */
export async function generateAssessment({ topic, subtopics, studentLevel, companyName }) {
  const prompt = `You are an expert interviewer at ${companyName || 'a top tech company'}.

Generate 3 targeted interview questions for a student with ${Math.round(studentLevel * 100)}% proficiency in ${topic}.
Focus on: ${subtopics.join(', ')}

Return JSON:
{
  "questions": [
    {
      "question": "full question text",
      "type": "coding|system_design|conceptual|behavioral",
      "difficulty": "easy|medium|hard",
      "expected_answer_points": ["point1", "point2"],
      "follow_up": "follow-up question if they answer correctly"
    }
  ]
}

Return ONLY valid JSON.`;

  const response = await client.chat.completions.create({
    model: GROK_FAST,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1000,
  });

  const raw = response.choices[0].message.content.trim();
  return extractJSON(raw);
}

/**
 * Extract skills from resume text using Grok
 */
export async function extractSkillsFromResume(resumeText) {
  const prompt = `You are a strict technical recruiter scoring a candidate's resume. Assign proficiency scores that VARY significantly based on evidence in the resume.

SCORING RULES (strictly enforce these):
- 0.85–1.0: Core skill with multiple projects + years of experience + advanced usage
- 0.65–0.84: Used in real projects with moderate complexity
- 0.45–0.64: Mentioned in projects but not deeply demonstrated  
- 0.25–0.44: Listed as known but no real project evidence
- 0.05–0.24: Barely mentioned or implied only
- DO NOT give the same score to more than 2 skills. Scores MUST vary.

RESUME:
${resumeText.substring(0, 4000)}

Analyze the resume carefully. For each skill, look for:
1. Number of projects using it
2. Complexity of usage (basic vs advanced)
3. Years of experience
4. Whether it's a primary tool or just supporting

Return ONLY a JSON object. Include these core categories plus any frameworks/languages found:
dsa, system_design, dbms, os, networking, oops, sql, behavioral

Example of correctly VARIED output (do not copy these values, derive from the actual resume):
{
  "dsa": 0.72,
  "system_design": 0.31,
  "dbms": 0.58,
  "os": 0.42,
  "sql": 0.81,
  "python": 0.88,
  "javascript": 0.64,
  "behavioral": 0.55
}

Return ONLY valid JSON with 0.0–1.0 values. Scores must be differentiated.`;

  const response = await client.chat.completions.create({
    model: GROK_FAST,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 600,
  });

  const raw = response.choices[0].message.content.trim();
  return extractJSON(raw);
}

/**
 * Extract topics from interview debrief
 */
export async function extractDebriefTopics(questionsAsked, roundType) {
  const prompt = `Analyze this interview experience and extract structured data.

Round Type: ${roundType}
Questions/Experience: ${questionsAsked}

Return JSON:
{
  "technical": ["topic1", "topic2"],
  "behavioral": ["topic1"],
  "difficulty": {
    "dsa": 4,
    "system_design": 5
  },
  "key_patterns": ["pattern1", "pattern2"]
}

Only include categories that are relevant. Return ONLY valid JSON.`;

  const response = await client.chat.completions.create({
    model: GROK_FAST,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 300,
  });

  const raw = response.choices[0].message.content.trim();
  try {
    return extractJSON(raw);
  } catch {
    return { technical: [], behavioral: [] };
  }
}


/**
 * Robustly extract JSON from a model response that may contain
 * extra text, markdown code fences, or trailing commentary.
 */
function extractJSON(raw) {
  // Strip markdown code fences if present
  let text = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  // Try direct parse first (fast path)
  try { return JSON.parse(text); } catch (_) { /* fall through */ }

  // Extract first balanced {...} or [...] block
  const start = text.search(/[\[{]/);
  if (start === -1) throw new SyntaxError('No JSON object found in model response');

  const openChar = text[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    else if (text[i] === closeChar) { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new SyntaxError('Unbalanced JSON in model response');
  return JSON.parse(text.slice(start, end + 1));
}

export default client;

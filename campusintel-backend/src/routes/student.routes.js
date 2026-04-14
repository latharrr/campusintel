const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const pdfParse = require('pdf-parse');
const claudeService = require('../services/claude.service');
const { v4: uuidv4 } = require('uuid');

// ── Smart keyword-based skill extractor ─────────────────────────────────────
// Used as fallback when Gemini API is unavailable.
// Scores skills based on: mention frequency, section context, and experience signals.
function smartSkillExtract(text) {
  const lower = text.toLowerCase();

  // Skill definitions: { key, patterns[], weight }
  // weight = how "impressive" this skill is when found
  const SKILL_DEFS = [
    // Languages
    { key: 'python',      patterns: [/python/g],                                  weight: 1.0 },
    { key: 'javascript',  patterns: [/javascript/g, /\bjs\b/g, /node\.?js/g],     weight: 1.0 },
    { key: 'java',        patterns: [/\bjava\b/g],                                 weight: 1.0 },
    { key: 'cpp',         patterns: [/c\+\+/g, /\bcpp\b/g],                        weight: 1.0 },
    { key: 'typescript',  patterns: [/typescript/g, /\bts\b/g],                    weight: 1.0 },
    { key: 'golang',      patterns: [/\bgolang\b/g, /\bgo\b lang/g],               weight: 1.1 },
    { key: 'rust',        patterns: [/\brust\b/g],                                  weight: 1.2 },
    // Frontend/Backend frameworks
    { key: 'react',       patterns: [/\breact\b/g, /react\.js/g, /reactjs/g],      weight: 1.0 },
    { key: 'nodejs',      patterns: [/node\.?js/g, /\bexpress\b/g],                weight: 1.0 },
    { key: 'nextjs',      patterns: [/next\.?js/g],                                 weight: 1.0 },
    { key: 'django',      patterns: [/django/g],                                     weight: 1.0 },
    { key: 'fastapi',     patterns: [/fastapi/g],                                    weight: 1.1 },
    { key: 'spring',      patterns: [/spring boot/g, /spring/g],                    weight: 1.0 },
    // Databases / storage
    { key: 'sql',         patterns: [/\bsql\b/g, /mysql/g, /postgres/g, /sqlite/g], weight: 0.9 },
    { key: 'mongodb',     patterns: [/mongodb/g, /mongo\b/g],                        weight: 1.0 },
    { key: 'redis',       patterns: [/redis/g],                                       weight: 1.1 },
    { key: 'dbms',        patterns: [/\bdbms\b/g, /database design/g, /rdbms/g],     weight: 0.9 },
    // CS fundamentals
    { key: 'data_structures', patterns: [/data structure/g, /linked list/g, /binary tree/g, /heap\b/g], weight: 0.9 },
    { key: 'algorithms',      patterns: [/algorithm/g, /dynamic programming/g, /\bdp\b/g, /graph traversal/g], weight: 1.0 },
    { key: 'system_design',   patterns: [/system design/g, /distributed system/g, /microservice/g, /scalab/g], weight: 1.2 },
    { key: 'os',              patterns: [/operating system/g, /linux/g, /unix/g, /process scheduling/g],       weight: 0.8 },
    { key: 'networking',      patterns: [/networking/g, /\btcp\b/g, /http\b/g, /rest\s*api/g, /grpc/g],       weight: 0.9 },
    { key: 'oops',            patterns: [/object.oriented/g, /\boops\b/g, /oop\b/g, /inheritance/g, /polymorphism/g], weight: 0.8 },
    // Cloud / DevOps
    { key: 'aws',         patterns: [/\baws\b/g, /amazon web service/g, /ec2/g, /s3\b/g],  weight: 1.1 },
    { key: 'docker',      patterns: [/docker/g, /container/g],                              weight: 1.1 },
    { key: 'kubernetes',  patterns: [/kubernetes/g, /\bk8s\b/g],                            weight: 1.3 },
    { key: 'git',         patterns: [/\bgit\b/g, /github/g, /gitlab/g],                    weight: 0.7 },
    { key: 'ci_cd',       patterns: [/ci\/cd/g, /github actions/g, /jenkins/g, /pipeline/g], weight: 1.1 },
    // ML / AI
    { key: 'machine_learning', patterns: [/machine learning/g, /\bml\b/g, /sklearn/g, /tensorflow/g, /pytorch/g], weight: 1.2 },
    { key: 'deep_learning',    patterns: [/deep learning/g, /neural network/g, /cnn/g, /lstm/g],              weight: 1.3 },
  ];

  // Identify high-signal sections in the resume (skills section → higher weight multiplier)
  const isInSkillsSection = (pattern) => {
    // Check if the pattern appears near words like "skills", "technologies", "tech stack"
    const skillsSectionMatch = lower.match(/(skills|technologies|tech stack|technical expertise)[^\n]{0,300}/g) || [];
    return skillsSectionMatch.some(section => pattern.test(section));
  };

  const scores = {};

  for (const { key, patterns, weight } of SKILL_DEFS) {
    let totalMatches = 0;
    let inSkillsSection = false;

    for (const pattern of patterns) {
      const globalPattern = new RegExp(pattern.source, 'gi');
      const matches = lower.match(globalPattern);
      totalMatches += matches ? matches.length : 0;
      if (!inSkillsSection) inSkillsSection = isInSkillsSection(globalPattern);
    }

    if (totalMatches === 0) continue;

    // Base score: frequency-scaled (1 mention → 0.45, 3 mentions → 0.65, 7+ → 0.85)
    let baseScore = Math.min(0.85, 0.35 + (Math.log(totalMatches + 1) / Math.log(8)) * 0.5);

    // Boost for skills section presence
    if (inSkillsSection) baseScore = Math.min(0.95, baseScore + 0.12);

    // Apply skill weight (harder/rarer skills get a small bump)
    baseScore = Math.min(0.95, baseScore * weight);

    // Round to 2 decimal places
    scores[key] = Math.round(baseScore * 100) / 100;
  }

  // Look for experience-level signals: "3 years of X", "X expert", "proficient in X"
  const expertPatterns = [
    { regex: /expert\s+in\s+(\w+)/gi, boost: 0.15 },
    { regex: /proficient\s+in\s+(\w+)/gi, boost: 0.10 },
    { regex: /(\d+)\+?\s+years?\s+(?:of\s+)?(?:experience\s+(?:in|with)\s+)?(\w+)/gi, boost: 0.12 },
    { regex: /strong\s+(?:foundation\s+in|knowledge\s+of)\s+(\w+)/gi, boost: 0.08 },
  ];

  for (const { regex, boost } of expertPatterns) {
    const matches = [...lower.matchAll(regex)];
    for (const match of matches) {
      const mentionedSkill = match[match.length - 1]?.toLowerCase();
      for (const key of Object.keys(scores)) {
        if (mentionedSkill && key.includes(mentionedSkill.substring(0, 4))) {
          scores[key] = Math.min(0.95, scores[key] + boost);
        }
      }
    }
  }

  console.log(`[SmartExtract] Detected ${Object.keys(scores).length} skills:`, scores);
  return scores;
}



/**
 * POST /api/student/register
 * Create a new student account (email-based, no password)
 * Body: { name, email, collegeId, branch, batchYear, cgpa }
 */
router.post('/register', async (req, res) => {
  const { name, email, collegeId = 'college-lpu-001', branch, batchYear, cgpa } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  // Normalise email
  const normalizedEmail = email.trim().toLowerCase();

  // Check if user already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id, name, email, college_id, role, current_state')
    .eq('email', normalizedEmail)
    .single();

  if (existing) {
    // Return existing user — treat as login
    console.log(`[Register] Email already exists, returning existing user: ${existing.id}`);
    return res.json({
      success: true,
      already_exists: true,
      student: existing,
      message: 'Account already exists. Signed in automatically.',
    });
  }

  // Create new user
  const studentId = `student-${uuidv4().slice(0, 8)}`;

  const { data: newUser, error: insertErr } = await supabase
    .from('users')
    .insert({
      id: studentId,
      college_id: collegeId,
      name: name.trim(),
      email: normalizedEmail,
      role: 'student',
      batch_year: batchYear ? parseInt(batchYear) : null,
      branch: branch || null,
      cgpa: cgpa ? parseFloat(cgpa) : null,
      current_state: 'UNAWARE',
      inferred_skills: {},
      confidence_score: 0.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[Register] Insert failed:', insertErr.message);
    return res.status(500).json({ error: insertErr.message });
  }

  console.log(`[Register] ✅ New student created: ${studentId} — ${name} <${normalizedEmail}>`);
  res.json({
    success: true,
    already_exists: false,
    student: newUser,
    message: 'Account created successfully!',
  });
});

/**
 * POST /api/student/login
 * Email-lookup based auth — finds user by email, returns profile
 * Body: { email }
 */
router.post('/login', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, college_id, role, branch, cgpa, batch_year, current_state, confidence_score, inferred_skills, updated_at')
    .eq('email', normalizedEmail)
    .single();

  if (error || !user) {
    return res.status(404).json({
      error: 'No account found with that email. Please register first.',
      not_found: true,
    });
  }

  console.log(`[Login] ✅ ${user.name} signed in (${user.id})`);
  res.json({
    success: true,
    student: user,
    message: `Welcome back, ${user.name}!`,
  });
});

/**
 * GET /api/student/:studentId/registrations
 * Returns all drive registrations for a student (with drive + company info)
 */
router.get('/:studentId/registrations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_registrations')
      .select(`
        id, status, registered_at, current_round,
        drive:campus_drives(
          id, drive_date, registration_deadline, roles_offered,
          package_offered, status,
          company:companies(id, name, normalized_name, website)
        )
      `)
      .eq('student_id', req.params.studentId)
      .order('registered_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Student] registrations fetch failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/student/upload-resume
 * Accepts a PDF as base64, extracts text, infers skills via Gemini,
 * saves to user's inferred_skills + resume_text.
 * Body: { studentId, pdfBase64 }
 */
router.post('/upload-resume', async (req, res) => {
  const { studentId = 'demo-student-rahul', pdfBase64 } = req.body;

  if (!pdfBase64) {
    return res.status(400).json({ error: 'pdfBase64 is required.' });
  }

  let resumeText = '';
  try {
    const buffer = Buffer.from(pdfBase64, 'base64');
    const parsed = await pdfParse(buffer);
    resumeText = parsed.text?.trim() || '';
  } catch (parseErr) {
    console.error('[Resume] PDF parse failed:', parseErr.message);
    return res.status(400).json({ error: 'Could not parse PDF. Make sure it is a valid PDF file.' });
  }

  if (!resumeText || resumeText.length < 100) {
    return res.status(400).json({ error: 'PDF appears to be empty or unreadable (image-based PDF?).' });
  }

  // Extract skills via Gemini
  let inferredSkills = {};
  try {
    const systemPrompt = `You are a technical recruiter. Extract skills from a student's resume.
Return ONLY valid JSON no markdown. Start directly with {`;

    const userMessage = `
Resume text:
${resumeText.substring(0, 3000)}

Return a flat JSON object where keys are skill names (lowercase_underscore) 
and values are proficiency from 0.0 to 1.0.
Focus on: programming languages, frameworks, CS topics (data structures, algorithms, system design, dbms, os, networks), tools.

Example output:
{
  "python": 0.85,
  "javascript": 0.70,
  "system_design": 0.30,
  "arrays": 0.75,
  "dbms": 0.60,
  "react": 0.65
}`;

    const raw = claudeService.callWithFallback
      ? await claudeService.callWithFallback(systemPrompt, userMessage, 400, {})
      : null;

    if (raw) {
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      inferredSkills = JSON.parse(cleaned);
    }
  } catch (skillErr) {
    console.warn('[Resume] Skill extraction failed, using smart keyword fallback:', skillErr.message);
    inferredSkills = smartSkillExtract(resumeText);
  }

  // If Gemini returned something but it parsed to empty object, also run smart fallback
  if (Object.keys(inferredSkills).length === 0) {
    console.warn('[Resume] Gemini returned empty skills, using smart keyword fallback');
    inferredSkills = smartSkillExtract(resumeText);
  }

  // Save to Supabase
  const { error: updateError } = await supabase
    .from('users')
    .update({
      resume_text: resumeText.substring(0, 10000),
      inferred_skills: inferredSkills,
      current_state: 'PROFILED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId);

  if (updateError) {
    console.error('[Resume] Supabase update failed:', updateError.message);
    return res.status(500).json({ error: updateError.message });
  }

  const skillCount = Object.keys(inferredSkills).length;
  console.log(`[Resume] ✅ Parsed resume for ${studentId}. Extracted ${skillCount} skills.`);

  res.json({
    success: true,
    student_id: studentId,
    skills_extracted: skillCount,
    inferred_skills: inferredSkills,
    resume_preview: resumeText.substring(0, 300) + '...',
    message: `Resume parsed! ${skillCount} skills extracted and saved to your profile.`,
  });
});

/**
 * GET /api/student/:studentId
 * Fetch student profile
 */
router.get('/:studentId', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, branch, cgpa, batch_year, college_id, current_state, confidence_score, inferred_skills, resume_text, updated_at')
    .eq('id', req.params.studentId)
    .single();

  if (error) return res.status(404).json({ error: 'Student not found.' });
  res.json({ ...data, resume_text: data?.resume_text ? '[Resume on file]' : null });
});

module.exports = router;

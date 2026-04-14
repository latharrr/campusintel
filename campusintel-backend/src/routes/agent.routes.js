const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { runAgentLoop } = require('../agent/reactor');
const { scanAndQueuePendingStudents } = require('../agent/scanner.job');

const { v4: uuidv4 } = require('uuid');

// ── POST /api/agent/trigger ───────────────────────────────────
// Run agent for any real student + drive combination
router.post('/trigger', async (req, res) => {
  try {
    const { studentId, driveId } = req.body;
    if (!studentId || !driveId) {
      return res.status(400).json({ error: 'studentId and driveId are required' });
    }
    const forceSessionId = uuidv4();
    runAgentLoop(studentId, driveId, forceSessionId).catch(console.error);
    res.json({ status: 'triggered', sessionId: forceSessionId, studentId, driveId });
  } catch (err) {
    console.error('[Route] trigger failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/agent/trigger-demo ──────────────────────────────
// Primary demo: Rahul (low confidence, scrape fallback path)
router.post('/trigger-demo', async (req, res) => {
  try {
    const studentId = process.env.DEMO_STUDENT_ID || 'demo-student-rahul';
    const driveId = process.env.DEMO_DRIVE_ID || 'demo-drive-google';
    const forceSessionId = uuidv4();
    
    // Fire and forget the heavy Agent loop so the frontend gets the session instantly
    runAgentLoop(studentId, driveId, forceSessionId).catch(console.error);

    res.json({ status: 'triggered', sessionId: forceSessionId });
  } catch (err) {
    console.error('[Route] trigger-demo failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ── POST /api/agent/trigger-demo-low-data ────────────────────
// Adversarial: force scrape by temporarily unverifying local debriefs
router.post('/trigger-demo-low-data', async (req, res) => {
  const studentId = process.env.DEMO_STUDENT_ID || 'demo-student-rahul';
  const driveId = process.env.DEMO_DRIVE_ID || 'demo-drive-google';

  // Temporarily unverify all local debriefs — agent finds 0
  await supabase
    .from('interview_debriefs')
    .update({ is_verified: false })
    .eq('college_id', 'college-lpu-001')
    .eq('company_id', 'company-google-001');

  // Clear cached intel
  await supabase
    .from('college_company_intel')
    .update({ local_debrief_count: 0, updated_at: new Date(0).toISOString() })
    .eq('college_id', 'college-lpu-001')
    .eq('company_id', 'company-google-001');

  // Run agent (will genuinely find 0 verified debriefs → scrape)
  runAgentLoop(studentId, driveId)
    .then(() => {
      // Restore after 30s
      setTimeout(async () => {
        await supabase
          .from('interview_debriefs')
          .update({ is_verified: true })
          .eq('college_id', 'college-lpu-001')
          .eq('company_id', 'company-google-001');
        await supabase
          .from('college_company_intel')
          .update({ local_debrief_count: 8, updated_at: new Date().toISOString() })
          .eq('college_id', 'college-lpu-001')
          .eq('company_id', 'company-google-001');
        console.log('[Demo] Local data restored after low-data scenario');
      }, 30000);
    })
    .catch(console.error);

  res.json({
    status: 'low_data_scenario_triggered',
    message: 'Agent running with 0 verified debriefs → will scrape. Data restores in 30s.',
  });
});

// ── POST /api/agent/trigger-demo-high-confidence ─────────────
// Adversarial: Priya — high confidence, skips assessment + session
router.post('/trigger-demo-high-confidence', async (req, res) => {
  const studentId = 'demo-student-priya';
  const driveId = 'demo-drive-google';

  runAgentLoop(studentId, driveId).catch(console.error);

  res.json({
    status: 'high_confidence_scenario_triggered',
    message: 'Running agent for Priya (confidence: 0.82) — expect BRIEF_ONLY, no assessment, no session.',
  });
});

// ── GET /api/agent/trigger-scanner ────────────────────────────
// Manual override to run the cron job immediately
router.get('/trigger-scanner', async (req, res) => {
  scanAndQueuePendingStudents().catch(console.error);
  res.json({ status: 'scanner_triggered', message: 'Scanning for pending students and queueing them up...' });
});

// ── GET /api/agent/logs/:sessionId ───────────────────────────
// Polling fallback for ReasoningTrace when WebSocket drops
router.get('/logs/:sessionId', async (req, res) => {
  const { data, error } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('session_id', req.params.sessionId)
    .order('step_number', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── GET /api/agent/status ─────────────────────────────────────
router.get('/status', async (req, res) => {
  const { data: recentLogs } = await supabase
    .from('agent_logs')
    .select('id, session_id, student_id, step_name, decision_made, decision_basis, status, started_at')
    .order('started_at', { ascending: false })
    .limit(15);

  res.json({ agent: 'active', recent_steps: recentLogs || [] });
});

// ── POST /api/agent/cold-start-reply ─────────────────────────
// Webhook: called when a student replies to the cold-start WhatsApp probe.
// Parses answers (format: "1a 2b 3c"), writes inferred_skills, restarts loop.
//
// Body: { studentId, driveId, reply } e.g. { reply: "1b 2a 3c" }
//
// This closes the cold-start loop — the gap flagged in the evaluation.
router.post('/cold-start-reply', async (req, res) => {
  const { studentId, driveId, reply } = req.body;

  if (!studentId || !driveId || !reply) {
    return res.status(400).json({ error: 'studentId, driveId, and reply are required.' });
  }

  // ── Parse the reply: "1a 2b 3c" → extract answers ──────────
  const answers = {};
  const matches = reply.trim().match(/(\d)([abc])/gi);
  if (!matches || matches.length < 3) {
    return res.status(400).json({
      error: 'Invalid reply format. Expected format: "1a 2b 3c"',
      received: reply,
    });
  }
  matches.forEach(m => {
    const q = m[0]; // question number
    const a = m[1].toLowerCase(); // answer letter
    answers[q] = a;
  });

  // ── Map answers to skill levels (a=0.15, b=0.50, c=0.85) ──
  const levelMap = { a: 0.15, b: 0.50, c: 0.85 };

  const inferredSkills = {
    DSA:           levelMap[answers['1']] ?? 0.3,
    System_Design: levelMap[answers['2']] ?? 0.3,
    DBMS:          levelMap[answers['3']] ?? 0.3,
  };

  console.log(`[ColdStartReply] student=${studentId} | answers=`, answers, '| skills=', inferredSkills);

  // ── Write inferred skills back to Supabase ────────────────
  const { error: updateError } = await supabase
    .from('users')
    .update({
      inferred_skills: inferredSkills,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId);

  if (updateError) {
    console.error('[ColdStartReply] DB update failed:', updateError.message);
    return res.status(500).json({ error: updateError.message });
  }

  // ── Acknowledge immediately, then restart the agent loop ──
  res.json({
    status: 'cold_start_resolved',
    message: 'Skills profile updated. Agent loop restarting.',
    inferredSkills,
  });

  // Fire-and-forget: restart the agent loop with the new data
  const forceSessionId = uuidv4();
  console.log(`[ColdStartReply] Restarting agent loop | session=${forceSessionId}`);
  runAgentLoop(studentId, driveId, forceSessionId).catch(err => {
    console.error('[ColdStartReply] Agent loop restart failed:', err.message);
  });
});

module.exports = router;


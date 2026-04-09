const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { runAgentLoop } = require('../agent/reactor');
const { scanAndQueuePendingStudents } = require('../agent/scanner.job');

const { v4: uuidv4 } = require('uuid');

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
  const driveId = process.env.DEMO_DRIVE_ID || 'demo-drive-google';

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
    .select('session_id, student_id, step_name, status, started_at')
    .order('started_at', { ascending: false })
    .limit(10);

  res.json({ agent: 'active', recent_steps: recentLogs || [] });
});

module.exports = router;

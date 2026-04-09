const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { updateWeights } = require('../agent/learner');

// ── POST /api/tpc/record-outcome ──────────────────────────────
// TPC records interview outcome → triggers learning loop
router.post('/record-outcome', async (req, res) => {
  const { studentId, driveId, outcome } = req.body;

  if (!studentId || !driveId || !outcome) {
    return res.status(400).json({ error: 'studentId, driveId, and outcome are required' });
  }
  if (!['selected', 'rejected'].includes(outcome)) {
    return res.status(400).json({ error: 'outcome must be selected or rejected' });
  }

  const result = await updateWeights(studentId, driveId, outcome);
  res.json({ success: true, learning_update: result });
});

// ── GET /api/tpc/students/:collegeId ─────────────────────────
router.get('/students/:collegeId', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, branch, current_state, confidence_score, inferred_skills, updated_at')
    .eq('college_id', req.params.collegeId)
    .eq('role', 'student')
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── GET /api/tpc/alerts/:collegeId ───────────────────────────
router.get('/alerts/:collegeId', async (req, res) => {
  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('college_id', req.params.collegeId)
    .eq('role', 'tpc_admin')
    .single();

  if (!admin) return res.json([]);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('student_id', admin.id)
    .eq('notification_type', 'tpc_alert')
    .order('sent_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── GET /api/tpc/strategy-weights/:collegeId/:companyId ──────
router.get('/strategy-weights/:collegeId/:companyId', async (req, res) => {
  const { data, error } = await supabase
    .from('strategy_weights')
    .select('*')
    .eq('college_id', req.params.collegeId)
    .eq('company_id', req.params.companyId)
    .order('weight', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── GET /api/tpc/briefs/:studentId ───────────────────────────
router.get('/briefs/:studentId', async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('student_id', req.params.studentId)
    .eq('notification_type', 'brief_delivered')
    .order('sent_at', { ascending: false })
    .limit(5);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

module.exports = router;

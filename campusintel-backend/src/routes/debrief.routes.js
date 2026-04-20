const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const claudeService = require('../services/claude.service');

/**
 * POST /api/debriefs
 * Submit a new interview debrief for a specific drive.
 * After saving, re-synthesizes the college_company_intel for that company.
 */
router.post('/', async (req, res) => {
  const {
    driveId,
    collegeId,
    companyId,
    roundType,
    questionsAsked,
    topicsCovered,
    outcome,
    difficultyRating,
    studentId,
  } = req.body;

  // studentId is now required — never silently fall back to demo user
  if (!driveId || !companyId || !collegeId || !outcome || !studentId) {
    return res.status(400).json({
      error: 'driveId, companyId, collegeId, outcome, and studentId are all required.',
      hint: studentId ? null : 'You must be logged in to submit a debrief.',
    });
  }

  if (!['selected', 'rejected', 'waiting', 'withdrew'].includes(outcome)) {
    return res.status(400).json({ error: 'outcome must be: selected, rejected, waiting, or withdrew' });
  }

  // 1. Insert the raw debrief
  const { data: debrief, error: insertError } = await supabase
    .from('interview_debriefs')
    .insert({
      id: uuidv4(),
      college_id: collegeId,
      company_id: companyId,
      student_id: studentId,
      drive_id: driveId,
      round_type: roundType || 'technical_1',
      questions_asked: questionsAsked || '',
      topics_covered: topicsCovered || [],
      outcome,
      difficulty_rating: difficultyRating || 3,
      is_verified: true,
      data_quality_score: 0.85,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Debrief] Insert failed:', insertError.message);
    return res.status(500).json({ error: insertError.message });
  }

  // 2. Fetch all verified debriefs for this college+company to re-synthesize intel
  const { data: allDebriefs } = await supabase
    .from('interview_debriefs')
    .select('questions_asked, topics_covered, outcome, success_factors, failure_factors, difficulty_rating')
    .eq('college_id', collegeId)
    .eq('company_id', companyId)
    .eq('is_verified', true);

  const debriefCount = allDebriefs?.length || 1;

  // 3. Run Gemini synthesis to extract updated top_topics from all debriefs
  let synthesisResult = null;
  try {
    const systemPrompt = `You are a data analyst for a placement intelligence system.
Analyze these interview debriefs and extract the most important preparation topics.
Return ONLY valid JSON, no markdown. Start directly with {`;

    const userMessage = `
Company ID: ${companyId}
Total debriefs: ${debriefCount}
All debriefs:
${JSON.stringify(allDebriefs?.slice(0, 20), null, 2)}

Return JSON with structure:
{
  "top_topics": [{"topic": "system_design", "frequency": 0.75}, {"topic": "arrays", "frequency": 0.60}],
  "success_profile": "one sentence describing what selected candidates had in common",
  "rejection_patterns": "one sentence describing why rejected candidates failed",
  "avg_rounds": 3,
  "selection_rate": 0.25
}
Include up to 6 topics, ordered by frequency.`;

    const raw = await claudeService.callWithFallback
      ? await claudeService.callWithFallback(systemPrompt, userMessage, 600, {})
      : null;

    if (raw) {
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      synthesisResult = JSON.parse(cleaned);
    }
  } catch (synthErr) {
    console.warn('[Debrief] Synthesis via LLM failed, using frequency count fallback:', synthErr.message);
  }

  // 4. Fallback synthesis: simple topic frequency count if LLM fails
  if (!synthesisResult) {
    const topicCounts = {};
    allDebriefs?.forEach(d => {
      (d.topics_covered || []).forEach(t => {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });
    });
    const selectedCount = allDebriefs?.filter(d => d.outcome === 'selected').length || 0;
    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([topic, count]) => ({ topic, frequency: parseFloat((count / debriefCount).toFixed(2)) }));

    synthesisResult = {
      top_topics: topTopics,
      success_profile: 'Strong CS fundamentals and problem-solving approach',
      rejection_patterns: 'Poor communication and incomplete answers',
      avg_rounds: 3,
      selection_rate: parseFloat((selectedCount / debriefCount).toFixed(2)),
    };
  }

  // 5. Upsert the synthesized intel into college_company_intel
  const { error: upsertError } = await supabase
    .from('college_company_intel')
    .upsert({
      college_id: collegeId,
      company_id: companyId,
      debrief_count: debriefCount,
      local_debrief_count: debriefCount,
      top_topics: synthesisResult.top_topics,
      success_profile: synthesisResult.success_profile,
      rejection_patterns: synthesisResult.rejection_patterns,
      avg_rounds: synthesisResult.avg_rounds,
      selection_rate: synthesisResult.selection_rate,
      confidence_level: debriefCount >= 10 ? 'HIGH' : debriefCount >= 5 ? 'MEDIUM' : 'LOW',
      last_synthesized: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'college_id,company_id' });

  if (upsertError) {
    console.error('[Debrief] Intel upsert failed:', upsertError.message);
  }

  console.log(`[Debrief] ✅ New debrief saved. Intel re-synthesized. Total debriefs: ${debriefCount}`);

  res.json({
    success: true,
    debrief_id: debrief.id,
    total_debriefs: debriefCount,
    intel_updated: !upsertError,
    synthesized_topics: synthesisResult.top_topics,
    message: `Debrief submitted! Intel re-synthesized from ${debriefCount} total debriefs.`,
  });
});

/**
 * GET /api/debriefs/:collegeId/:companyId
 * Fetch all verified debriefs for a given college/company pair.
 */
router.get('/:collegeId/:companyId', async (req, res) => {
  const { data, error } = await supabase
    .from('interview_debriefs')
    .select('id, round_type, topics_covered, outcome, difficulty_rating, created_at')
    .eq('college_id', req.params.collegeId)
    .eq('company_id', req.params.companyId)
    .eq('is_verified', true)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

module.exports = router;

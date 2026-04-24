// src/routes/debriefs.js
import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { extractDebriefTopics } from '../lib/grok.js';

const router = Router();

function calculateReadiness(studentSkills = {}, topTopics = []) {
  if (!Array.isArray(topTopics) || topTopics.length === 0) return 0.5;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const topic of topTopics) {
    const skillKey = String(topic.topic || '')
      .toLowerCase()
      .replace(/\s+/g, '_');
    const studentLevel = Number(studentSkills?.[skillKey] ?? 0.3);
    const freq = Number(topic.frequency ?? 0.5);

    weightedSum += studentLevel * freq;
    totalWeight += freq;
  }

  if (totalWeight <= 0) return 0.3;
  return Math.max(0, Math.min(1, weightedSum / totalWeight));
}

// Submit a debrief
router.post('/', async (req, res) => {
  try {
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

    if (!questionsAsked || !outcome)
      return res.status(400).json({ error: 'questionsAsked and outcome required' });

    // Extract structured topics using Grok
    let extractedTopics = {};
    try {
      extractedTopics = await extractDebriefTopics(questionsAsked, roundType);
    } catch (err) {
      console.warn('[Debriefs] Topic extraction failed, using manual topics:', err.message);
      extractedTopics = { technical: topicsCovered || [], behavioral: [] };
    }

    // Insert debrief
    const { data: debrief, error } = await supabase
      .from('interview_debriefs')
      .insert({
        college_id: collegeId,
        company_id: companyId,
        student_id: studentId || null,
        drive_id: driveId || null,
        round_type: roundType,
        questions_asked: questionsAsked,
        topics_covered: topicsCovered || extractedTopics.technical || [],
        outcome,
        difficulty_rating: difficultyRating || 3,
        extracted_topics: extractedTopics,
        is_verified: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Resynthesize intel for this company and propagate score updates
    const intel = await resynthesizeIntel(collegeId, companyId);
    await refreshImpactedStudentScores({
      collegeId,
      companyId,
      driveId,
      fallbackStudentId: studentId,
      topTopics: intel?.top_topics || [],
    });

    // Get updated count
    const { count } = await supabase
      .from('interview_debriefs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // Get latest topic synthesis
    const { data: intelRecord } = await supabase
      .from('college_company_intel')
      .select('top_topics')
      .eq('college_id', collegeId)
      .eq('company_id', companyId)
      .single();

    const synthesizedTopics = (intelRecord?.top_topics || []).map((t) => ({
      topic: t.topic,
      frequency: t.frequency,
    }));

    res.json({
      success: true,
      debrief,
      total_debriefs: count || 1,
      synthesized_topics: synthesizedTopics,
      message: `Intelligence updated from ${count} debriefs`,
    });
  } catch (err) {
    console.error('[Debriefs] Submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get debriefs for a college + company
router.get('/:collegeId/:companyId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('interview_debriefs')
      .select('id, round_type, outcome, difficulty_rating, topics_covered, created_at')
      .eq('college_id', req.params.collegeId)
      .eq('company_id', req.params.companyId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Internal: Re-synthesize intel after new debrief ──────────
async function resynthesizeIntel(collegeId, companyId) {
  try {
    const { data: debriefs } = await supabase
      .from('interview_debriefs')
      .select('*')
      .eq('college_id', collegeId)
      .eq('company_id', companyId)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!debriefs || debriefs.length === 0) return null;

    const topicCounts = {};
    let selectedCount = 0;
    let totalRounds = 0;

    for (const d of debriefs) {
      totalRounds++;
      if (d.outcome === 'selected') selectedCount++;
      const topics = [
        ...(d.extracted_topics?.technical || []),
        ...(d.topics_covered || []),
      ];
      for (const topic of [...new Set(topics)]) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([topic, count], idx) => ({
        topic,
        frequency: parseFloat((count / debriefs.length).toFixed(2)),
        priority: idx + 1,
      }));

    const selectionRate =
      totalRounds > 0
        ? parseFloat((selectedCount / totalRounds).toFixed(2))
        : 0.5;

    const payload = {
      college_id: collegeId,
      company_id: companyId,
      debrief_count: debriefs.length,
      local_debrief_count: debriefs.length,
      top_topics: topTopics,
      selection_rate: selectionRate,
      confidence_level:
        debriefs.length >= 10
          ? 'HIGH'
          : debriefs.length >= 5
          ? 'MEDIUM'
          : 'LOW',
      last_synthesized: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('college_company_intel')
      .upsert(payload, { onConflict: 'college_id,company_id' });

    return {
      debrief_count: debriefs.length,
      top_topics: topTopics,
      selection_rate: selectionRate,
      confidence_level: payload.confidence_level,
    };
  } catch (err) {
    console.error('[Intel] Re-synthesis error:', err.message);
    return null;
  }
}

async function refreshImpactedStudentScores({
  collegeId,
  companyId,
  driveId,
  fallbackStudentId,
  topTopics,
}) {
  try {
    if (!Array.isArray(topTopics) || topTopics.length === 0) return;

    const studentIds = new Set();

    // Prefer direct drive registrations when driveId is known.
    if (driveId) {
      const { data: directRegs, error: directErr } = await supabase
        .from('student_registrations')
        .select('student_id')
        .eq('drive_id', driveId);
      if (!directErr && Array.isArray(directRegs)) {
        for (const reg of directRegs) {
          if (reg.student_id) studentIds.add(reg.student_id);
        }
      }
    }

    // Also include registrations from all drives of the same company in this college.
    const { data: companyDrives, error: driveErr } = await supabase
      .from('campus_drives')
      .select('id')
      .eq('college_id', collegeId)
      .eq('company_id', companyId);

    if (!driveErr && Array.isArray(companyDrives) && companyDrives.length > 0) {
      const driveIds = companyDrives.map((d) => d.id).filter(Boolean);
      const { data: regs, error: regErr } = await supabase
        .from('student_registrations')
        .select('student_id')
        .in('drive_id', driveIds);
      if (!regErr && Array.isArray(regs)) {
        for (const reg of regs) {
          if (reg.student_id) studentIds.add(reg.student_id);
        }
      }
    }

    if (fallbackStudentId) studentIds.add(fallbackStudentId);
    if (studentIds.size === 0) return;

    const { data: students, error: studentErr } = await supabase
      .from('users')
      .select('id, inferred_skills, current_state')
      .in('id', Array.from(studentIds));

    if (studentErr || !Array.isArray(students) || students.length === 0) return;

    await Promise.all(
      students.map(async (student) => {
        const nextScore = Number(
          calculateReadiness(student.inferred_skills || {}, topTopics).toFixed(2)
        );
        const nextState =
          student.current_state === 'UNAWARE'
            ? 'PROFILED'
            : student.current_state;

        await supabase
          .from('users')
          .update({
            confidence_score: nextScore,
            current_state: nextState,
            updated_at: new Date().toISOString(),
          })
          .eq('id', student.id);
      })
    );
  } catch (err) {
    console.error('[Debriefs] Failed to refresh impacted student scores:', err.message);
  }
}

export default router;

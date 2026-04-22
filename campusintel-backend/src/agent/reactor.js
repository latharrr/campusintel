// src/agent/reactor.js — 9-Step ReAct Agent Loop
import { v4 as uuidv4 } from 'uuid';
import supabase from '../lib/supabase.js';
import {
  generateBrief,
  generateAssessment,
  GROK_FAST,
} from '../lib/grok.js';

// ── Log a step to Supabase (triggers Realtime on frontend) ──
async function logStep({
  sessionId,
  studentId,
  collegeId,
  driveId,
  stepNumber,
  stepName,
  input,
  output,
  decisionBasis,
  decisionMade,
  durationMs,
  status,
  errorMessage,
}) {
  const { error } = await supabase.from('agent_logs').insert({
    session_id: sessionId,
    student_id: studentId,
    college_id: collegeId,
    drive_id: driveId,
    step_number: stepNumber,
    step_name: stepName,
    input: input || {},
    output: output || {},
    decision_basis: decisionBasis,
    decision_made: decisionMade,
    duration_ms: durationMs,
    started_at: new Date().toISOString(),
    status,
    error_message: errorMessage || null,
  });
  if (error) console.error('[Agent] Log step error:', error.message);
}

// ── Calculate readiness score ──
function calculateReadiness(studentSkills, topTopics) {
  if (!topTopics || topTopics.length === 0) return 0.5;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const topic of topTopics) {
    const skillKey = topic.topic?.toLowerCase().replace(/ /g, '_');
    const studentLevel = studentSkills?.[skillKey] || 0.3;
    const freq = topic.frequency || 0.5;
    weightedSum += studentLevel * freq;
    totalWeight += freq;
  }
  return totalWeight > 0 ? Math.min(1, weightedSum / totalWeight) : 0.3;
}

// ── Select strategy via epsilon-greedy weights ──
async function selectStrategy(collegeId, companyId, profileType) {
  const { data: weights } = await supabase
    .from('strategy_weights')
    .select('*')
    .eq('college_id', collegeId)
    .eq('company_id', companyId)
    .eq('student_profile_type', profileType)
    .order('weight', { ascending: false });

  if (!weights || weights.length === 0) {
    // Default strategies by profile type
    const defaults = {
      HIGH_CONFIDENCE: 'BRIEF_ONLY',
      MEDIUM_CONFIDENCE: 'BRIEF_ASSESS',
      LOW_CONFIDENCE: 'BRIEF_ASSESS_SESSION',
      NO_DATA: 'BRIEF_ASSESS_SESSION',
    };
    return defaults[profileType] || 'BRIEF_ASSESS';
  }

  // Epsilon-greedy: 10% exploration, 90% exploitation
  const epsilon = 0.1;
  if (Math.random() < epsilon) {
    return weights[Math.floor(Math.random() * weights.length)].strategy;
  }
  return weights[0].strategy;
}

// ── Synthesize intel from debriefs ──
async function synthesizeIntel(collegeId, companyId) {
  const { data: debriefs } = await supabase
    .from('interview_debriefs')
    .select('*')
    .eq('college_id', collegeId)
    .eq('company_id', companyId)
    .eq('is_verified', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!debriefs || debriefs.length === 0) return null;

  // Count topic frequencies
  const topicCounts = {};
  let totalRounds = 0;
  let selectedCount = 0;

  for (const d of debriefs) {
    totalRounds++;
    if (d.outcome === 'selected') selectedCount++;

    const topics = d.extracted_topics?.technical || d.topics_covered || [];
    for (const topic of topics) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }

  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([topic, count], idx) => ({
      topic,
      frequency: count / debriefs.length,
      priority: idx + 1,
    }));

  return {
    debrief_count: debriefs.length,
    local_debrief_count: debriefs.length,
    top_topics: topTopics,
    selection_rate: selectedCount / totalRounds,
    confidence_level:
      debriefs.length >= 10 ? 'HIGH' : debriefs.length >= 5 ? 'MEDIUM' : 'LOW',
  };
}

// ══════════════════════════════════════════════════════════════
//  MAIN AGENT LOOP
// ══════════════════════════════════════════════════════════════
export async function runAgentLoop({ studentId, driveId, collegeId }) {
  const sessionId = uuidv4();
  let stepNumber = 0;
  const t = () => Date.now();

  console.log(
    `[Agent] Starting loop | session=${sessionId} student=${studentId} drive=${driveId}`
  );

  // ── STEP 1: OBSERVE_PROFILE ──────────────────────────────────
  stepNumber++;
  let stepStart = t();
  let student, drive;

  try {
    const [studentRes, driveRes] = await Promise.all([
      supabase
        .from('users')
        .select('*, colleges(name,short_name)')
        .eq('id', studentId)
        .single(),
      supabase
        .from('campus_drives')
        .select('*, companies(name,normalized_name,website)')
        .eq('id', driveId)
        .single(),
    ]);

    if (studentRes.error || !studentRes.data)
      throw new Error('Student not found: ' + studentId);
    if (driveRes.error || !driveRes.data)
      throw new Error('Drive not found: ' + driveId);

    student = studentRes.data;
    drive = driveRes.data;
    drive.company_name = drive.companies?.name || 'Unknown Company';
    const hoursLeft = Math.round(
      (new Date(drive.drive_date) - new Date()) / 3600000
    );

    await logStep({
      sessionId,
      studentId,
      collegeId: student.college_id,
      driveId,
      stepNumber,
      stepName: 'OBSERVE_PROFILE',
      decisionBasis: `Student: ${student.name} | Company: ${drive.company_name} | ${hoursLeft}h remaining`,
      decisionMade: 'CONTINUE',
      durationMs: t() - stepStart,
      status: 'success',
    });
  } catch (err) {
    await logStep({
      sessionId,
      studentId,
      collegeId,
      driveId,
      stepNumber,
      stepName: 'OBSERVE_PROFILE',
      decisionBasis: err.message,
      decisionMade: 'ERROR',
      durationMs: t() - stepStart,
      status: 'failed',
      errorMessage: err.message,
    });
    return { sessionId, error: err.message };
  }

  // ── STEP 2: COLD_START_CHECK ─────────────────────────────────
  stepNumber++;
  stepStart = t();
  const hasSkillData =
    student.inferred_skills &&
    Object.keys(student.inferred_skills).length > 0;
  const hasProfile = student.current_state !== 'UNAWARE';

  if (!hasSkillData && !hasProfile) {
    await logStep({
      sessionId,
      studentId,
      collegeId: student.college_id,
      driveId,
      stepNumber,
      stepName: 'COLD_START_DETECTED',
      decisionBasis:
        'No skill data and no profile. Student needs onboarding.',
      decisionMade: 'EXIT_COLD_START',
      durationMs: t() - stepStart,
      status: 'skipped',
    });
    return { sessionId, status: 'cold_start', message: 'Student needs to upload resume first' };
  }

  await logStep({
    sessionId,
    studentId,
    collegeId: student.college_id,
    driveId,
    stepNumber,
    stepName: 'COLD_START_DETECTED',
    decisionBasis: `hasSkillData=${hasSkillData} | hasProfile=${hasProfile} | PROCEED`,
    decisionMade: 'PROCEED',
    durationMs: t() - stepStart,
    status: 'skipped',
  });

  // ── STEP 3: QUERY_LOCAL_DB ────────────────────────────────────
  stepNumber++;
  stepStart = t();
  let intel = null;
  let dataSource = 'LOCAL_DB';

  intel = await synthesizeIntel(student.college_id, drive.company_id);
  const localCount = intel?.debrief_count || 0;

  await logStep({
    sessionId,
    studentId,
    collegeId: student.college_id,
    driveId,
    stepNumber,
    stepName: 'QUERY_LOCAL_DB',
    decisionBasis: `local_data=${localCount} debriefs · threshold=5 · ${localCount >= 5 ? 'ABOVE_THRESHOLD' : 'BELOW_THRESHOLD'}`,
    decisionMade: localCount >= 5 ? 'USE_LOCAL_DATA' : 'NEED_MORE_DATA',
    durationMs: t() - stepStart,
    status: 'success',
  });

  // ── STEP 4: QUERY_GLOBAL_DB (if needed) ──────────────────────
  if (localCount < 5) {
    stepNumber++;
    stepStart = t();

    // Query across all colleges for this company
    const { data: globalDebriefs } = await supabase
      .from('interview_debriefs')
      .select('*')
      .eq('company_id', drive.company_id)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(30);

    const globalCount = globalDebriefs?.length || 0;

    if (globalCount >= 5 && globalDebriefs) {
      // Blend local + global
      const topicCounts = {};
      let selectedCount = 0;

      for (const d of globalDebriefs) {
        if (d.outcome === 'selected') selectedCount++;
        const topics = d.extracted_topics?.technical || d.topics_covered || [];
        for (const topic of topics) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      }

      intel = {
        debrief_count: globalCount,
        local_debrief_count: localCount,
        global_debrief_count: globalCount - localCount,
        top_topics: Object.entries(topicCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8)
          .map(([topic, count], idx) => ({
            topic,
            frequency: count / globalDebriefs.length,
            priority: idx + 1,
          })),
        selection_rate: selectedCount / globalDebriefs.length,
        confidence_level: globalCount >= 10 ? 'MEDIUM' : 'LOW',
      };
      dataSource = 'GLOBAL_DB';
    }

    await logStep({
      sessionId,
      studentId,
      collegeId: student.college_id,
      driveId,
      stepNumber,
      stepName: 'QUERY_GLOBAL_DB',
      decisionBasis: `global_count=${globalCount} | source=GLOBAL_DB | blending 70/30`,
      decisionMade: globalCount >= 5 ? 'USE_GLOBAL_DATA' : 'INSUFFICIENT_DATA',
      durationMs: t() - stepStart,
      status: 'success',
    });
  }

  // Fallback minimal intel if still nothing
  if (!intel || intel.debrief_count === 0) {
    intel = {
      debrief_count: 0,
      top_topics: [
        { topic: 'dsa', frequency: 0.85, priority: 1 },
        { topic: 'system_design', frequency: 0.65, priority: 2 },
        { topic: 'behavioral', frequency: 0.75, priority: 3 },
      ],
      selection_rate: 0.5,
      confidence_level: 'LOW',
    };
    dataSource = 'DEFAULT';
  }

  // ── STEP 5: ASSESS_READINESS ──────────────────────────────────
  stepNumber++;
  stepStart = t();

  const readinessScore = calculateReadiness(
    student.inferred_skills,
    intel.top_topics
  );

  // Find critical gaps
  const criticalGaps = [];
  for (const topic of intel.top_topics) {
    const skillKey = topic.topic?.toLowerCase().replace(/ /g, '_');
    const studentLevel = student.inferred_skills?.[skillKey] || 0.3;
    if (topic.frequency >= 0.6 && studentLevel < 0.4) {
      criticalGaps.push(topic.topic);
    }
  }

  await logStep({
    sessionId,
    studentId,
    collegeId: student.college_id,
    driveId,
    stepNumber,
    stepName: 'ASSESS_READINESS',
    decisionBasis: `readiness_score=${readinessScore.toFixed(2)} · critical_gaps=[${criticalGaps.join(',')}]`,
    decisionMade: 'CONTINUE',
    durationMs: t() - stepStart,
    status: 'success',
  });

  // ── STEP 6: SELECT_STRATEGY ───────────────────────────────────
  stepNumber++;
  stepStart = t();

  const profileType =
    readinessScore >= 0.7
      ? 'HIGH_CONFIDENCE'
      : readinessScore >= 0.4
      ? 'MEDIUM_CONFIDENCE'
      : 'LOW_CONFIDENCE';

  const strategy = await selectStrategy(
    student.college_id,
    drive.company_id,
    profileType
  );

  await logStep({
    sessionId,
    studentId,
    collegeId: student.college_id,
    driveId,
    stepNumber,
    stepName: 'SELECT_STRATEGY',
    decisionBasis: `profileType=${profileType} · strategy=${strategy} · source=STRATEGY_WEIGHTS_TABLE`,
    decisionMade: strategy,
    durationMs: t() - stepStart,
    status: 'success',
  });

  // ── STEP 7: GENERATE_BRIEF ────────────────────────────────────
  stepNumber++;
  stepStart = t();
  let brief = null;
  let briefStatus = 'success';

  try {
    brief = await generateBrief({
      student,
      intel,
      drive: { ...drive, company_name: drive.company_name },
    });
    brief.data_source = dataSource;
    brief.confidence_in_data = intel.confidence_level;
  } catch (err) {
    console.error('[Agent] Brief generation failed:', err.message);
    briefStatus = 'fallback_triggered';
    // Construct a basic brief from intel data
    brief = buildFallbackBrief(student, intel, drive);
  }

  // Save brief to DB — log any error so it's visible in Railway logs
  let savedBrief = null;
  try {
    const { data, error: insertErr } = await supabase
      .from('skill_assessments')
      .insert({
        student_id: studentId,
        college_id: student.college_id,
        drive_id: driveId,
        topic_assessed: 'FULL_BRIEF',
        questions: brief,
        overall_score: readinessScore,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[Agent] Failed to save brief to skill_assessments:', insertErr.message, insertErr.details);
    } else {
      savedBrief = data;
      console.log('[Agent] Brief saved — id:', savedBrief?.id);
    }
  } catch (saveErr) {
    console.error('[Agent] Brief save threw:', saveErr.message);
  }

  await logStep({
    sessionId,
    studentId,
    collegeId: student.college_id,
    driveId,
    stepNumber,
    stepName: 'GENERATE_BRIEF',
    decisionBasis: `Calling Grok · focus=${criticalGaps[0] || 'general'} · topics=${intel.top_topics.length}`,
    decisionMade: 'COMPLETE',
    output: brief,
    durationMs: t() - stepStart,
    status: briefStatus,
  });

  // ── STEP 8: GENERATE_ASSESSMENT (if strategy includes it) ─────
  if (strategy.includes('ASSESS') && criticalGaps.length > 0) {
    stepNumber++;
    stepStart = t();

    try {
      const mainGap = criticalGaps[0];
      const topicIntel = intel.top_topics.find((t) => t.topic === mainGap);
      const studentLevel = student.inferred_skills?.[mainGap] || 0.2;

      const assessment = await generateAssessment({
        topic: mainGap,
        subtopics: topicIntel?.specific_subtopics || [mainGap],
        studentLevel,
        companyName: drive.company_name,
      });

      // Save assessment
      await supabase.from('skill_assessments').insert({
        student_id: studentId,
        college_id: student.college_id,
        drive_id: driveId,
        topic_assessed: mainGap,
        questions: assessment.questions,
        overall_score: studentLevel,
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      });

      await logStep({
        sessionId,
        studentId,
        collegeId: student.college_id,
        driveId,
        stepNumber,
        stepName: 'GENERATE_ASSESSMENT',
        decisionBasis: `critical_gap=${mainGap} · generating ${assessment.questions?.length || 3} targeted questions`,
        decisionMade: 'COMPLETE',
        durationMs: t() - stepStart,
        status: 'success',
      });
    } catch (err) {
      await logStep({
        sessionId,
        studentId,
        collegeId: student.college_id,
        driveId,
        stepNumber,
        stepName: 'GENERATE_ASSESSMENT',
        decisionBasis: `Assessment generation failed: ${err.message}`,
        decisionMade: 'SKIP',
        durationMs: t() - stepStart,
        status: 'failed',
      });
    }
  }

  // ── STEP 9: ALERT_TPC (cohort gap detection) ─────────────────
  stepNumber++;
  stepStart = t();

  if (criticalGaps.length > 0) {
    // Check how many students in this cohort share the same gap
    const { data: cohortStudents } = await supabase
      .from('student_registrations')
      .select('student_id, users!inner(inferred_skills, name)')
      .eq('drive_id', driveId)
      .eq('college_id', student.college_id);

    const atRiskStudents = (cohortStudents || []).filter((s) => {
      const skills = s.users?.inferred_skills || {};
      const mainGapKey = criticalGaps[0];
      return (skills[mainGapKey] || 0.3) < 0.4;
    });

    if (atRiskStudents.length >= 3) {
      // Create TPC notification
      await supabase.from('notifications').insert({
        student_id: studentId,
        college_id: student.college_id,
        channel: 'in_app',
        notification_type: 'tpc_alert',
        content: `CRITICAL GAP ALERT: ${atRiskStudents.length} students preparing for ${drive.company_name} have a critical gap in ${criticalGaps[0]}. Recommend scheduling a focused session.`,
        metadata: {
          drive_id: driveId,
          critical_gap: criticalGaps[0],
          at_risk_count: atRiskStudents.length,
        },
        status: 'sent',
      });
    }

    await logStep({
      sessionId,
      studentId,
      collegeId: student.college_id,
      driveId,
      stepNumber,
      stepName: 'ALERT_TPC',
      decisionBasis: `at_risk_students=${atRiskStudents.length} · same_gap=${criticalGaps[0]} · alert_sent=${atRiskStudents.length >= 3}`,
      decisionMade: atRiskStudents.length >= 3 ? 'ALERTED' : 'THRESHOLD_NOT_MET',
      durationMs: t() - stepStart,
      status: 'success',
    });
  } else {
    await logStep({
      sessionId,
      studentId,
      collegeId: student.college_id,
      driveId,
      stepNumber,
      stepName: 'ALERT_TPC',
      decisionBasis: 'No critical gaps detected. No alert needed.',
      decisionMade: 'NO_ACTION',
      durationMs: t() - stepStart,
      status: 'skipped',
    });
  }

  // ── STEP 10: UPDATE_STUDENT_STATE ─────────────────────────────
  stepNumber++;
  stepStart = t();

  const newState =
    readinessScore >= 0.7
      ? 'INTERVIEW_READY'
      : readinessScore >= 0.4
      ? 'PREPARING'
      : 'ASSESSED';

  await supabase
    .from('users')
    .update({
      current_state: newState,
      confidence_score: readinessScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId);

  await logStep({
    sessionId,
    studentId,
    collegeId: student.college_id,
    driveId,
    stepNumber,
    stepName: 'UPDATE_STUDENT_STATE',
    decisionBasis: `new_state=${newState} · confidence_score=${readinessScore.toFixed(2)} · brief_delivered=true`,
    decisionMade: 'COMPLETE',
    durationMs: t() - stepStart,
    status: 'success',
  });

  console.log(`[Agent] Loop complete | session=${sessionId} | state=${newState}`);

  return {
    sessionId,
    status: 'complete',
    readinessScore,
    newState,
    strategy,
    briefId: savedBrief?.id,
  };
}

// ── Fallback brief when Grok is unavailable ──
function buildFallbackBrief(student, intel, drive) {
  const topics = (intel.top_topics || []).map((t, idx) => {
    const skillKey = t.topic?.toLowerCase().replace(/ /g, '_');
    const studentLevel = student.inferred_skills?.[skillKey] || 0.3;
    const gap = t.frequency - studentLevel;
    return {
      name: t.topic,
      priority: idx + 1,
      frequency_in_interviews: t.frequency,
      student_current_level: studentLevel,
      required_level: t.frequency,
      gap_severity: gap > 0.4 ? 'CRITICAL' : gap > 0.2 ? 'MODERATE' : 'OK',
      time_to_allocate_hours: Math.round(gap * 10),
      specific_subtopics: [t.topic],
      sample_questions: [`Demonstrate proficiency in ${t.topic}`],
    };
  });

  return {
    headline: `Focus on ${topics[0]?.name || 'DSA'} — your most critical gap for ${drive.company_name}.`,
    confidence_in_data: intel.confidence_level,
    data_source: 'FALLBACK',
    topics,
    prep_plan: {
      total_hours: 16,
      schedule: [
        { day: 1, focus: topics[0]?.name || 'Core DSA', hours: 6, tasks: ['Study fundamentals', 'Practice problems', 'Review solutions'] },
        { day: 2, focus: topics[1]?.name || 'System Design', hours: 6, tasks: ['Study patterns', 'Design practice', 'Mock interview'] },
        { day: 3, focus: 'Review & Mock', hours: 4, tasks: ['Full mock interview', 'Weak area review', 'Rest'] },
      ],
    },
    success_tips: ['Think aloud during interviews', 'State assumptions before starting', 'Discuss trade-offs'],
    red_flags_to_avoid: ['Jumping to code without approach', 'Not handling edge cases'],
    mock_question_for_now: `Solve a coding problem related to ${topics[0]?.name || 'arrays'} in 30 minutes.`,
  };
}

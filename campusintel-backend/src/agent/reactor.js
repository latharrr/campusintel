const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { logStep } = require('./logger');

// Tools
const queryLocalDB = require('./tools/queryLocalDB');
const queryGlobalDB = require('./tools/queryGlobalDB');
const scrapeCompanyIntel = require('./tools/scrapeCompanyIntel');
const generateBrief = require('./tools/generateBrief');
const generateAssessment = require('./tools/generateAssessment');
const scheduleSession = require('./tools/scheduleSession');
const alertTPC = require('./tools/alertTPC');
const coldStartProbe = require('./tools/coldStartProbe');

// ── Thresholds (change these in env to alter agent behavior live on stage) ──
const LOCAL_THRESHOLD = parseInt(process.env.LOCAL_THRESHOLD || '5');
const GLOBAL_THRESHOLD = parseInt(process.env.GLOBAL_THRESHOLD || '10');
const READINESS_THRESHOLD = parseFloat(process.env.READINESS_THRESHOLD || '0.65');
const CRITICAL_GAP_THRESHOLD = parseFloat(process.env.CRITICAL_GAP_THRESHOLD || '0.3');
const TPC_ALERT_MIN_STUDENTS = parseInt(process.env.TPC_ALERT_MIN_STUDENTS || '3');

/**
 * Compute readiness score and identify gaps.
 * readiness = sum(student_level * topic_frequency) / sum(topic_frequency)
 */
function assessReadiness(inferredSkills, topTopics) {
  if (!topTopics || topTopics.length === 0) {
    return { score: 0.5, gaps: [], profileType: 'NO_DATA' };
  }

  let totalWeight = 0;
  let coveredWeight = 0;
  const gaps = [];

  topTopics.forEach(({ topic, frequency }) => {
    const freq = frequency || 0.5;
    const studentLevel = inferredSkills[topic] ?? inferredSkills[topic?.split('_')[0]] ?? 0.5;
    totalWeight += freq;
    coveredWeight += studentLevel * freq;

    if (studentLevel < CRITICAL_GAP_THRESHOLD) {
      gaps.push({ topic, student_level: studentLevel, severity: 'CRITICAL', frequency: freq });
    } else if (studentLevel < 0.5) {
      gaps.push({ topic, student_level: studentLevel, severity: 'MODERATE', frequency: freq });
    }
  });

  const score = totalWeight > 0 ? parseFloat((coveredWeight / totalWeight).toFixed(2)) : 0.5;
  const profileType =
    score >= 0.7 ? 'HIGH_CONFIDENCE' :
    score >= 0.4 ? 'MEDIUM_CONFIDENCE' :
    'LOW_CONFIDENCE';

  return { score, gaps, profileType };
}

/**
 * Blend local + global intel (70/30 weighting).
 */
function blendIntelligence(local, global_) {
  const merged = [...(local.top_topics || [])];
  (global_.top_topics || []).forEach(gt => {
    if (!merged.find(lt => lt.topic === gt.topic)) merged.push(gt);
  });

  return {
    top_topics: merged.slice(0, 6),
    debrief_count: (local.debrief_count || 0) + (global_.debrief_count || 0),
    confidence_level: 'MEDIUM',
    source: 'BLENDED',
    local_count: local.debrief_count || 0,
    global_count: global_.debrief_count || 0,
  };
}

/**
 * Get best strategy from strategy_weights table.
 * Falls back to defaults if no weights exist.
 */
async function selectStrategy(collegeId, companyId, profileType) {
  const { data: weights } = await supabase
    .from('strategy_weights')
    .select('strategy, weight')
    .eq('college_id', collegeId)
    .eq('company_id', companyId)
    .eq('student_profile_type', profileType)
    .order('weight', { ascending: false });

  if (weights && weights.length > 0) {
    return { name: weights[0].strategy, weight: weights[0].weight, source: 'STRATEGY_WEIGHTS_TABLE' };
  }

  // Default fallback if no weights exist
  const defaults = {
    HIGH_CONFIDENCE: 'BRIEF_ONLY',
    MEDIUM_CONFIDENCE: 'BRIEF_ASSESS',
    LOW_CONFIDENCE: 'BRIEF_ASSESS_SESSION',
    NO_DATA: 'BRIEF_ASSESS_SESSION',
  };
  return { name: defaults[profileType] || 'BRIEF_ASSESS_SESSION', weight: 1.0, source: 'DEFAULT_FALLBACK' };
}

// ── Main Agent Loop ────────────────────────────────────────────────────────
async function runAgentLoop(studentId, driveId, forceSessionId = null) {
  const sessionId = forceSessionId || uuidv4();
  console.log(`\n[Reactor] Starting agent loop | session=${sessionId} | student=${studentId}`);

  let stepNum = 0;
  const ctx = { sessionId, studentId, driveId, collegeId: null };

  try {
    // ─────────────────────────────────────────
    // STEP 1: OBSERVE_PROFILE
    // ─────────────────────────────────────────
    stepNum = 1;
    let t = new Date();

    const [studentRes, driveRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', studentId).single(),
      supabase.from('campus_drives')
        .select('*, company:companies(*)')
        .eq('id', driveId).single(),
    ]);

    const student = studentRes.data;
    const drive = driveRes.data;

    if (!student) throw new Error(`Student not found: ${studentId}`);
    if (!drive) throw new Error(`Drive not found: ${driveId}`);

    ctx.collegeId = student.college_id;
    const company = drive.company;
    const daysLeft = Math.ceil((new Date(drive.drive_date) - new Date()) / (1000 * 60 * 60 * 24));

    await logStep({
      ...ctx, stepNumber: stepNum, stepName: 'OBSERVE_PROFILE',
      input: { studentId, driveId },
      output: { student_name: student.name, company: company.name, days_left: daysLeft, current_state: student.current_state },
      decisionBasis: `Student: ${student.name} | Company: ${company.name} | ${daysLeft} days remaining`,
      decisionMade: 'CONTINUE',
      startedAt: t, status: 'success',
    });

    // ─────────────────────────────────────────
    // STEP 2: COLD START CHECK
    // ─────────────────────────────────────────
    stepNum = 2;
    t = new Date();
    const hasSkillData = student.inferred_skills && Object.keys(student.inferred_skills).length > 0;
    const hasResume = !!student.resume_text;

    if (!hasSkillData && !hasResume) {
      const probeResult = await coldStartProbe.execute(student);
      await logStep({
        ...ctx, stepNumber: stepNum, stepName: 'COLD_START_DETECTED',
        input: { has_skills: hasSkillData, has_resume: hasResume },
        output: probeResult,
        decisionBasis: 'No skill data and no resume. Cannot assess readiness accurately.',
        decisionMade: 'COLD_START_PROBE_SENT',
        startedAt: t, status: 'success',
      });
      return { sessionId, outcome: 'cold_start_probe_sent' };
    }

    await logStep({
      ...ctx, stepNumber: stepNum, stepName: 'COLD_START_DETECTED',
      input: { has_skills: hasSkillData, has_resume: hasResume },
      output: { verdict: 'sufficient_data' },
      decisionBasis: `Has skill data: ${hasSkillData}, has resume: ${hasResume}`,
      decisionMade: 'SKIP_COLD_START',
      startedAt: t, status: 'skipped',
    });

    // ─────────────────────────────────────────
    // STEP 3: QUERY LOCAL DB
    // ─────────────────────────────────────────
    stepNum = 3;
    t = new Date();
    const localIntel = await queryLocalDB.execute(student.college_id, company.id);
    const localSufficient = localIntel.debrief_count >= LOCAL_THRESHOLD;

    await logStep({
      ...ctx, stepNumber: stepNum, stepName: 'QUERY_LOCAL_DB',
      input: { college_id: student.college_id, company_id: company.id, threshold: LOCAL_THRESHOLD },
      output: localIntel,
      decisionBasis: `Found ${localIntel.debrief_count} local debriefs. Threshold is ${LOCAL_THRESHOLD}.`,
      decisionMade: localSufficient ? 'USE_LOCAL_DATA' : 'NEED_SUPPLEMENTAL',
      startedAt: t, status: 'success',
    });

    // ─────────────────────────────────────────
    // STEP 4: QUERY GLOBAL DB (conditional)
    // ─────────────────────────────────────────
    stepNum = 4;
    t = new Date();
    let finalIntel = { ...localIntel, company_name: company.name };

    if (!localSufficient) {
      const globalIntel = await queryGlobalDB.execute(company.id, student.college_id);
      const globalSufficient = globalIntel.debrief_count >= GLOBAL_THRESHOLD;

      await logStep({
        ...ctx, stepNumber: stepNum, stepName: 'QUERY_GLOBAL_DB',
        input: { company_id: company.id, exclude_college: student.college_id, threshold: GLOBAL_THRESHOLD },
        output: globalIntel,
        decisionBasis: `Found ${globalIntel.debrief_count} global debriefs. Threshold is ${GLOBAL_THRESHOLD}.`,
        decisionMade: globalSufficient ? 'USE_GLOBAL_DATA' : 'SCRAPE_EXTERNAL',
        startedAt: t, status: 'success',
      });

      if (globalSufficient) {
        finalIntel = { ...blendIntelligence(localIntel, globalIntel), company_name: company.name };
      } else {
        // ─────────────────────────────────────
        // STEP 4b: SCRAPE (fallback)
        // ─────────────────────────────────────
        const scrapeT = new Date();
        const scraped = await scrapeCompanyIntel.execute(company.name);

        await logStep({
          ...ctx, stepNumber: 4.5, stepName: 'SCRAPE_COMPANY_INTEL',
          input: { company: company.name },
          output: { topics_found: scraped.top_topics?.length, sources: scraped.scraped_sources },
          decisionBasis: `Both local (${localIntel.debrief_count}) and global (${globalIntel.debrief_count}) below threshold. Scraping external sources.`,
          decisionMade: 'USE_SCRAPED_DATA',
          startedAt: scrapeT, status: 'fallback_triggered',
        });

        finalIntel = { ...scraped, company_name: company.name };
      }
    } else {
      // Skip global query — log as skipped
      await logStep({
        ...ctx, stepNumber: stepNum, stepName: 'QUERY_GLOBAL_DB',
        input: {}, output: {},
        decisionBasis: `Local data sufficient (${localIntel.debrief_count} >= ${LOCAL_THRESHOLD}). Skipping global query.`,
        decisionMade: 'SKIPPED',
        startedAt: t, status: 'skipped',
      });
    }

    // ─────────────────────────────────────────
    // STEP 5: ASSESS READINESS
    // ─────────────────────────────────────────
    stepNum = 5;
    t = new Date();
    const { score, gaps, profileType } = assessReadiness(
      student.inferred_skills || {},
      finalIntel.top_topics || []
    );
    const criticalGaps = gaps.filter(g => g.severity === 'CRITICAL');

    await logStep({
      ...ctx, stepNumber: stepNum, stepName: 'ASSESS_READINESS',
      input: { skills: student.inferred_skills, top_topics: finalIntel.top_topics?.slice(0, 4) },
      output: { score, profile_type: profileType, gaps_count: gaps.length, critical_gaps: criticalGaps.map(g => g.topic) },
      decisionBasis: `Readiness score: ${score}. ${criticalGaps.length} critical gap(s): ${criticalGaps.map(g => g.topic).join(', ') || 'none'}`,
      decisionMade: score >= READINESS_THRESHOLD ? 'NO_GAPS_DETECTED' : 'GAPS_DETECTED',
      startedAt: t, status: 'success',
    });

    // ─────────────────────────────────────────
    // STEP 6: SELECT STRATEGY
    // ─────────────────────────────────────────
    stepNum = 6;
    t = new Date();
    const strategy = await selectStrategy(student.college_id, company.id, profileType);

    await logStep({
      ...ctx, stepNumber: stepNum, stepName: 'SELECT_STRATEGY',
      input: { college_id: student.college_id, company_id: company.id, profile_type: profileType },
      output: strategy,
      decisionBasis: `Profile: ${profileType} | Strategy selected: ${strategy.name} (weight: ${strategy.weight}) from ${strategy.source}`,
      decisionMade: strategy.name,
      startedAt: t, status: 'success',
    });

    // ─────────────────────────────────────────
    // STEP 7: ACT — generateBrief (always)
    // ─────────────────────────────────────────
    stepNum = 7;
    t = new Date();
    const briefResult = await generateBrief.execute(student, finalIntel, {
      gaps: criticalGaps,
      daysLeft,
      driveId,
      sessionId,
      studentId,
      collegeId: student.college_id,
      stepNumber: stepNum,
      stepName: 'GENERATE_BRIEF',
      companyName: company.name,
    });

    await logStep({
      ...ctx, stepNumber: stepNum, stepName: 'GENERATE_BRIEF',
      input: { strategy: strategy.name, data_source: finalIntel.source, days_left: daysLeft },
      output: { topics_count: briefResult.topics?.length, confidence: briefResult.confidence_in_data, headline: briefResult.headline?.substring(0, 80) },
      decisionBasis: `Brief generated using ${finalIntel.source} data. ${briefResult.topics?.length || 0} topics, ${briefResult.prep_plan?.total_hours || 0}hr plan.`,
      decisionMade: 'BRIEF_DELIVERED',
      startedAt: t, status: 'success',
    });

    // ─────────────────────────────────────────
    // STEP 7b: GENERATE ASSESSMENT (conditional)
    // ─────────────────────────────────────────
    stepNum = 8;
    if (strategy.name.includes('ASSESS') && criticalGaps.length > 0) {
      t = new Date();
      const assessResult = await generateAssessment.execute(student, criticalGaps[0], driveId, {
        companyName: company.name, sessionId, studentId, collegeId: student.college_id,
        stepNumber: stepNum, stepName: 'GENERATE_ASSESSMENT',
      });

      await logStep({
        ...ctx, stepNumber: stepNum, stepName: 'GENERATE_ASSESSMENT',
        input: { topic: criticalGaps[0].topic, student_level: criticalGaps[0].student_level },
        output: assessResult,
        decisionBasis: `Strategy ${strategy.name} includes ASSESS. Critical gap detected in ${criticalGaps[0].topic} (level: ${criticalGaps[0].student_level}).`,
        decisionMade: 'ASSESSMENT_SENT',
        startedAt: t, status: 'success',
      });
    } else {
      await logStep({
        ...ctx, stepNumber: stepNum, stepName: 'GENERATE_ASSESSMENT',
        input: {}, output: {},
        decisionBasis: `Strategy: ${strategy.name} does not include ASSESS, or no critical gaps found.`,
        decisionMade: 'SKIPPED',
        startedAt: new Date(), status: 'skipped',
      });
    }

    // ─────────────────────────────────────────
    // STEP 7c: SCHEDULE SESSION (conditional)
    // ─────────────────────────────────────────
    stepNum = 9;
    if (strategy.name.includes('SESSION') && criticalGaps.length > 0) {
      t = new Date();
      const sessionResult = await scheduleSession.execute(student, criticalGaps, driveId);

      await logStep({
        ...ctx, stepNumber: stepNum, stepName: 'SCHEDULE_SESSION',
        input: { critical_gaps: criticalGaps.map(g => g.topic) },
        output: sessionResult,
        decisionBasis: `Strategy ${strategy.name} includes SESSION. Auto-enrolling student in ${sessionResult.title}.`,
        decisionMade: 'SESSION_BOOKED',
        startedAt: t, status: 'success',
      });
    } else {
      await logStep({
        ...ctx, stepNumber: stepNum, stepName: 'SCHEDULE_SESSION',
        input: {}, output: {},
        decisionBasis: `Strategy: ${strategy.name} does not include SESSION, or no critical gaps.`,
        decisionMade: 'SKIPPED',
        startedAt: new Date(), status: 'skipped',
      });
    }

    // ─────────────────────────────────────────
    // STEP 8: CHECK TPC ALERT
    // ─────────────────────────────────────────
    stepNum = 10;
    t = new Date();
    let tpcAlertResult = { alerted: false };

    if (criticalGaps.length > 0) {
      tpcAlertResult = await alertTPC.execute(student.college_id, driveId, criticalGaps[0].topic);
    }

    await logStep({
      ...ctx, stepNumber: stepNum, stepName: 'ALERT_TPC',
      input: { critical_gap: criticalGaps[0]?.topic, threshold: TPC_ALERT_MIN_STUDENTS },
      output: tpcAlertResult,
      decisionBasis: tpcAlertResult.alerted
        ? `${tpcAlertResult.affected_count} students have critical gap in ${criticalGaps[0]?.topic}. TPC alert sent.`
        : `${tpcAlertResult.affected_count || 0} students affected — below threshold (${TPC_ALERT_MIN_STUDENTS}). No alert sent.`,
      decisionMade: tpcAlertResult.alerted ? 'TPC_ALERTED' : 'SKIPPED',
      startedAt: t, status: tpcAlertResult.alerted ? 'success' : 'skipped',
    });

    // ─────────────────────────────────────────
    // STEP 9: UPDATE STUDENT STATE
    // ─────────────────────────────────────────
    stepNum = 11;
    t = new Date();
    const newState = strategy.name.includes('ASSESS') ? 'ASSESSED' : 'PREPARING';

    await supabase.from('users')
      .update({ current_state: newState, confidence_score: score, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    await logStep({
      ...ctx, stepNumber: stepNum, stepName: 'UPDATE_STUDENT_STATE',
      input: { previous_state: student.current_state, new_state: newState, confidence_score: score },
      output: { state_updated: true, new_state: newState },
      decisionBasis: `Agent run complete. Strategy: ${strategy.name} → state transitions to ${newState}.`,
      decisionMade: `STATE_${newState}`,
      startedAt: t, status: 'success',
    });

    console.log(`[Reactor] ✅ Agent loop complete | session=${sessionId} | student=${student.name} | state→${newState}`);
    return { sessionId, outcome: 'completed', new_state: newState, strategy: strategy.name, readiness: score };

  } catch (err) {
    console.error(`[Reactor] ❌ Error at step ${stepNum}:`, err.message);
    if (ctx.collegeId) {
      await logStep({
        ...ctx, stepNumber: stepNum, stepName: 'ERROR',
        input: {}, output: {},
        decisionBasis: err.message,
        decisionMade: 'AGENT_FAILED',
        startedAt: new Date(), status: 'failed',
        errorMessage: err.message,
      });
    }
    throw err;
  }
}

module.exports = { runAgentLoop };

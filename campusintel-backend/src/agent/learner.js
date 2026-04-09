const supabase = require('../config/supabase');

/**
 * Called after TPC records an interview outcome.
 * Updates strategy_weights — this is the learning loop.
 */
async function updateWeights(studentId, driveId, outcome) {
  const isSuccess = outcome === 'selected';

  // 1. Find which strategy was used from agent_logs
  const { data: logs } = await supabase
    .from('agent_logs')
    .select('output, input')
    .eq('student_id', studentId)
    .eq('drive_id', driveId)
    .eq('step_name', 'SELECT_STRATEGY')
    .order('started_at', { ascending: false })
    .limit(1);

  const strategyLog = logs?.[0];
  const strategyName = strategyLog?.output?.name;
  const profileType = strategyLog?.input?.profile_type;

  if (!strategyName || !profileType) {
    console.warn('[Learner] Could not find strategy from logs for:', studentId, driveId);
    return { updated: false, reason: 'no_strategy_log_found' };
  }

  // 2. Get student's college_id and drive's company_id
  const { data: student } = await supabase.from('users').select('college_id').eq('id', studentId).single();
  const { data: drive } = await supabase.from('campus_drives').select('company_id').eq('id', driveId).single();

  if (!student || !drive) return { updated: false, reason: 'data_not_found' };

  const collegeId = student.college_id;
  const companyId = drive.company_id;

  // 3. Fetch current weights
  const { data: current } = await supabase
    .from('strategy_weights')
    .select('*')
    .eq('college_id', collegeId)
    .eq('company_id', companyId)
    .eq('strategy', strategyName)
    .eq('student_profile_type', profileType)
    .single();

  const timesUsed = (current?.times_used || 0) + 1;
  const timesSuccessful = (current?.times_successful || 0) + (isSuccess ? 1 : 0);
  const winRate = parseFloat((timesSuccessful / timesUsed).toFixed(3));
  // Weight = win_rate * 3, clamped to [0.1, 5.0]
  const weight = parseFloat(Math.min(5.0, Math.max(0.1, winRate * 3)).toFixed(4));

  // 4. Upsert the weight
  const { error } = await supabase.from('strategy_weights').upsert({
    college_id: collegeId,
    company_id: companyId,
    strategy: strategyName,
    student_profile_type: profileType,
    times_used: timesUsed,
    times_successful: timesSuccessful,
    win_rate: winRate,
    weight,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'college_id,company_id,strategy,student_profile_type' });

  if (error) {
    console.error('[Learner] Failed to update weights:', error.message);
    return { updated: false, error: error.message };
  }

  // 5. Update student state to POST_INTERVIEW
  await supabase.from('users')
    .update({ current_state: 'POST_INTERVIEW', updated_at: new Date().toISOString() })
    .eq('id', studentId);

  // 6. Update registration status
  await supabase.from('student_registrations')
    .update({ status: outcome, outcome_recorded_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('drive_id', driveId);

  console.log(`[Learner] ✅ Updated ${strategyName}/${profileType}: weight ${current?.weight} → ${weight} (win_rate: ${winRate})`);

  return {
    updated: true,
    strategy: strategyName,
    profile_type: profileType,
    old_weight: current?.weight || 1.0,
    new_weight: weight,
    win_rate: winRate,
    times_used: timesUsed,
  };
}

module.exports = { updateWeights };

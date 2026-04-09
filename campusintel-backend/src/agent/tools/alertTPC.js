const supabase = require('../../config/supabase');

const TPC_ALERT_THRESHOLD = 3; // 3+ students with same gap triggers an alert

async function execute(collegeId, driveId, criticalGapTopic) {
  // Count how many students in this drive have this critical gap
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('college_id', collegeId)
    .lt(`inferred_skills->>${criticalGapTopic}`, 0.3);

  const affectedCount = count || 0;

  if (affectedCount < TPC_ALERT_THRESHOLD) {
    return { alerted: false, affected_count: affectedCount, threshold: TPC_ALERT_THRESHOLD };
  }

  // Find TPC admin for this college
  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('college_id', collegeId)
    .eq('role', 'tpc_admin')
    .single();

  if (!admin) {
    console.warn('[AlertTPC] No TPC admin found for college:', collegeId);
    return { alerted: false, reason: 'no_tpc_admin' };
  }

  // Create TPC alert notification
  await supabase.from('notifications').insert({
    student_id: admin.id,
    college_id: collegeId,
    channel: 'in_app',
    notification_type: 'tpc_alert',
    content: `⚠️ ALERT: ${affectedCount} students have critical gap in ${criticalGapTopic} before the upcoming drive. Immediate intervention recommended.`,
    metadata: {
      drive_id: driveId,
      gap_topic: criticalGapTopic,
      affected_student_count: affectedCount,
      severity: 'CRITICAL',
    },
    status: 'sent',
  });

  return { alerted: true, affected_count: affectedCount, tpc_admin_id: admin.id };
}

module.exports = { execute };

const cron = require('node-cron');
const supabase = require('../config/supabase');
const { enqueueAgentRun } = require('../config/redis');

/**
 * Scanner Job
 * Finds students who need preparation for upcoming campus drives.
 */
async function scanAndQueuePendingStudents() {
  console.log('[Scanner] Running periodic scan for pending students...');

  try {
    const { data: drives } = await supabase
      .from('campus_drives')
      .select('id, college_id')
      .gte('drive_date', new Date().toISOString())
      .lte('drive_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!drives || drives.length === 0) {
      console.log('[Scanner] No upcoming drives found in the next 7 days.');
      return;
    }

    for (const drive of drives) {
      const { data: registrations } = await supabase
        .from('student_registrations')
        .select('student_id')
        .eq('drive_id', drive.id)
        .eq('status', 'registered');

      if (!registrations || registrations.length === 0) continue;

      const studentIds = registrations.map(r => r.student_id);

      const { data: studentsObj } = await supabase
        .from('users')
        .select('id')
        .in('id', studentIds)
        .eq('current_state', 'TARGETED');

      if (!studentsObj || studentsObj.length === 0) continue;

      console.log(`[Scanner] Found ${studentsObj.length} TARGETED students for drive ${drive.id}.`);

      for (const student of studentsObj) {
        // enqueueAgentRun handles Redis-or-direct automatically
        await enqueueAgentRun(student.id, drive.id);

        await supabase
          .from('users')
          .update({ current_state: 'PREPARING' })
          .eq('id', student.id);
      }
    }
  } catch (err) {
    console.error('[Scanner] Check failed:', err.message);
  }
}

function startScanner(cronSchedule = '0 * * * *') {
  console.log(`[Scanner] Initialized with schedule: ${cronSchedule}`);
  cron.schedule(cronSchedule, scanAndQueuePendingStudents);
}

module.exports = { startScanner, scanAndQueuePendingStudents };

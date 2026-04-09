const cron = require('node-cron');
const supabase = require('../config/supabase');
const redisQueue = require('../config/redis');
const { runAgentLoop } = require('./reactor');

/**
 * Scanner Job
 * Finds students who need preparation for upcoming campus drives.
 * Enqueues them for the Agent loop or runs directly if Redis is disabled.
 */
async function scanAndQueuePendingStudents() {
  console.log('[Scanner] Running periodic scan for pending students...');

  try {
    // 1. Find upcoming drives (e.g., starting within the next 7 days)
    const { data: drives } = await supabase
      .from('campus_drives')
      .select('id, college_id')
      .gte('drive_date', new Date().toISOString())
      .lte('drive_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!drives || drives.length === 0) {
      console.log('[Scanner] No upcoming drives found in the next 7 days.');
      return;
    }

    // 2. For each drive, find registered students whose state is 'TARGETED'
    for (const drive of drives) {
      const { data: registrations } = await supabase
        .from('student_registrations')
        .select('student_id')
        .eq('drive_id', drive.id)
        .eq('status', 'registered');

      if (!registrations || registrations.length === 0) continue;

      const studentIds = registrations.map(r => r.student_id);

      // Find which of these students are in the 'TARGETED' state (need agent attention)
      const { data: studentsObj } = await supabase
        .from('users')
        .select('id')
        .in('id', studentIds)
        .eq('current_state', 'TARGETED');

      if (!studentsObj || studentsObj.length === 0) continue;

      console.log(`[Scanner] Found ${studentsObj.length} TARGETED students for drive ${drive.id}. Triggering agent...`);

      // 3. Queue them or process directly
      for (const student of studentsObj) {
        // Enqueue if Redis is wired up, otherwise process directly for dev
        if (redisQueue) {
          await redisQueue.add('process-student', { studentId: student.id, driveId: drive.id });
          console.log(`[Scanner] Queued student ${student.id}`);
        } else {
          console.log(`[Scanner] Redis inactive, running agent directly for ${student.id}`);
          // Don't await in loop to avoid blocking scan, fire and forget
          runAgentLoop(student.id, drive.id).catch(err => console.error('[Scanner] Direct run failed:', err));
        }

        // Optimistically update state so they aren't queued twice
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

// Export the start function
function startScanner(cronSchedule = '0 * * * *') { // Default to every hour
  console.log(`[Scanner] Initialized with schedule: ${cronSchedule}`);
  cron.schedule(cronSchedule, scanAndQueuePendingStudents);
}

module.exports = { startScanner, scanAndQueuePendingStudents };

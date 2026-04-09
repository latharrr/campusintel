const supabase = require('../../config/supabase');

/**
 * Cold Start Probe — handles students with zero skill/resume data.
 * For demo: logs action + creates notification (WhatsApp send simulated).
 */
async function execute(student) {
  const probeMessage =
    `Hi ${student.name}! 👋 You have an upcoming interview and we want to help you prepare.\n\n` +
    `Quick 3-question calibration (reply with a, b, or c):\n\n` +
    `1️⃣ LeetCode comfort level?\n   a) Just starting\n   b) 50-100 solved\n   c) 100+ solved\n\n` +
    `2️⃣ System Design familiarity?\n   a) Never studied\n   b) Basic concepts\n   c) Solid knowledge\n\n` +
    `3️⃣ SQL/DBMS readiness?\n   a) Beginner\n   b) Comfortable with queries\n   c) Advanced\n\n` +
    `Reply format: 1a 2b 3c`;

  // Log notification (WhatsApp simulated for demo)
  await supabase.from('notifications').insert({
    student_id: student.id,
    college_id: student.college_id,
    channel: 'whatsapp',
    notification_type: 'cold_start_probe',
    content: probeMessage,
    metadata: {
      probe_sent: true,
      simulated: true,
      message: 'WhatsApp integration active in production. Logged for demo.',
    },
    status: 'sent',
  });

  return {
    probe_sent: true,
    channel: 'whatsapp',
    message: probeMessage,
    next_action: 'WAIT_FOR_REPLY',
  };
}

module.exports = { execute };

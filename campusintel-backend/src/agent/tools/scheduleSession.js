const supabase = require('../../config/supabase');

async function execute(student, criticalGaps, driveId) {
  const topic = criticalGaps[0]?.topic || 'general';
  const sessionTitle = `${topic.replace(/_/g, ' ').toUpperCase()} Prep Session`;

  // Look for an existing upcoming session for this topic at this college
  const { data: existing } = await supabase
    .from('tpc_sessions')
    .select('*')
    .eq('college_id', student.college_id)
    .eq('topic', topic)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .single();

  if (existing) {
    // Auto-enroll in existing session
    const enrolled = [...(existing.auto_enrolled_students || []), student.id];
    await supabase.from('tpc_sessions')
      .update({ auto_enrolled_students: enrolled })
      .eq('id', existing.id);

    await supabase.from('notifications').insert({
      student_id: student.id,
      college_id: student.college_id,
      channel: 'in_app',
      notification_type: 'session_enrolled',
      content: `Auto-enrolled in ${sessionTitle} on ${new Date(existing.scheduled_at).toDateString()}.`,
      metadata: { session_id: existing.id, topic },
      status: 'sent',
    });

    return { session_id: existing.id, action: 'enrolled_in_existing', title: sessionTitle };
  }

  // Create new session
  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: session } = await supabase.from('tpc_sessions').insert({
    college_id: student.college_id,
    title: sessionTitle,
    topic,
    scheduled_at: scheduledAt,
    duration_mins: 90,
    venue: 'TPC Room / Google Meet',
    max_students: 30,
    auto_enrolled_students: [student.id],
    created_by: 'agent',
    agent_reasoning: `Agent detected critical gap in ${topic} for ${student.name}. Auto-session created.`,
    status: 'scheduled',
  }).select().single();

  await supabase.from('notifications').insert({
    student_id: student.id,
    college_id: student.college_id,
    channel: 'in_app',
    notification_type: 'session_enrolled',
    content: `TPC session on ${topic} has been auto-scheduled for you on ${new Date(scheduledAt).toDateString()}.`,
    metadata: { session_id: session?.id, topic },
    status: 'sent',
  });

  return { session_id: session?.id, action: 'created_new_session', title: sessionTitle };
}

module.exports = { execute };

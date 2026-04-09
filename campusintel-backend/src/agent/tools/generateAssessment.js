const supabase = require('../../config/supabase');
const claudeService = require('../../services/claude.service');

async function execute(student, criticalGap, driveId, logCtx = {}) {
  const assessment = await claudeService.generateAssessment(
    criticalGap.topic,
    criticalGap.student_level || 0.3,
    logCtx.companyName || 'the target company',
    logCtx
  );

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: saved } = await supabase.from('skill_assessments').insert({
    student_id: student.id,
    college_id: student.college_id,
    drive_id: driveId,
    topic_assessed: criticalGap.topic,
    questions: assessment.questions || [],
    status: 'sent',
    expires_at: expiresAt,
  }).select().single();

  // Log notification
  await supabase.from('notifications').insert({
    student_id: student.id,
    college_id: student.college_id,
    channel: 'in_app',
    notification_type: 'assessment_sent',
    content: `Skill assessment for ${criticalGap.topic} sent. Complete within 48 hours.`,
    metadata: { assessment_id: saved?.id, topic: criticalGap.topic },
    status: 'sent',
  });

  return { assessment_id: saved?.id, questions_count: assessment.questions?.length || 0 };
}

module.exports = { execute };

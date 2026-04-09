const supabase = require('../../config/supabase');
const claudeService = require('../../services/claude.service');

async function execute(student, intelData, logCtx = {}) {
  const brief = await claudeService.generateBrief(
    student,
    intelData,
    logCtx.gaps || [],
    logCtx.daysLeft || 3,
    logCtx
  );

  // Store in notifications
  await supabase.from('notifications').insert({
    student_id: student.id,
    college_id: student.college_id,
    channel: 'in_app',
    notification_type: 'brief_delivered',
    content: brief.headline || 'Your interview prep brief is ready.',
    metadata: { ...brief, drive_id: logCtx.driveId, company: intelData.company_name },
    status: 'delivered',
  });

  return brief;
}

module.exports = { execute };

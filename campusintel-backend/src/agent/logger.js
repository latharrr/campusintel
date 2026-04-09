const supabase = require('../config/supabase');

/**
 * Logs a single agent step to agent_logs table.
 * Powers the live Realtime reasoning trace on the demo screen.
 */
async function logStep({
  sessionId,
  studentId,
  collegeId,
  driveId = null,
  stepNumber,
  stepName,
  input = null,
  output = null,
  decisionBasis = null,
  decisionMade = null,
  startedAt,      // Date object — pass before the step runs
  status = 'success',
  errorMessage = null,
}) {
  const durationMs = startedAt ? Date.now() - startedAt.getTime() : null;

  const { error } = await supabase.from('agent_logs').insert({
    session_id: sessionId,
    student_id: studentId,
    college_id: collegeId,
    drive_id: driveId,
    step_number: stepNumber,
    step_name: stepName,
    input,
    output,
    decision_basis: decisionBasis,
    decision_made: decisionMade,
    duration_ms: durationMs,
    started_at: startedAt ? startedAt.toISOString() : new Date().toISOString(),
    status,
    error_message: errorMessage,
  });

  if (error) console.error(`[Logger] Failed to log step ${stepName}:`, error.message);
  else console.log(`[Agent:${stepName}] ${decisionMade || status} (${durationMs}ms)`);
}

module.exports = { logStep };

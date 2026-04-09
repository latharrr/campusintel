const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

let redisConnection = null;
let agentQueue = null;

function getRedisConnection() {
  if (redisConnection) return redisConnection;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[Redis] No REDIS_URL found — running without queue (direct mode)');
    return null;
  }

  try {
    redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    redisConnection.on('connect', () => console.log('[Redis] Connected ✅'));
    redisConnection.on('error', (err) => console.error('[Redis] Error:', err.message));
    return redisConnection;
  } catch (err) {
    console.warn('[Redis] Failed to connect — running without queue:', err.message);
    return null;
  }
}

function getAgentQueue() {
  if (agentQueue) return agentQueue;
  const conn = getRedisConnection();
  if (!conn) return null;

  agentQueue = new Queue('agent-jobs', { connection: conn });
  return agentQueue;
}

async function enqueueAgentRun(studentId, driveId) {
  const queue = getAgentQueue();
  if (queue) {
    await queue.add('run-agent', { studentId, driveId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    console.log(`[Queue] Enqueued agent run: ${studentId} / ${driveId}`);
  } else {
    // No Redis — run directly in background
    const { runAgentLoop } = require('../agent/reactor');
    runAgentLoop(studentId, driveId).catch(console.error);
    console.log(`[Direct] Running agent directly: ${studentId} / ${driveId}`);
  }
}

module.exports = { getRedisConnection, getAgentQueue, enqueueAgentRun };

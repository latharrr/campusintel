// src/index.js — CampusIntel Backend Server
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import supabase from './lib/supabase.js';
import { runAgentLoop } from './agent/reactor.js';

// Routes
import agentRoutes from './routes/agent.js';
import studentRoutes from './routes/student.js';
import debriefRoutes from './routes/debriefs.js';
import driveRoutes from './routes/drives.js';
import tpcRoutes from './routes/tpc.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(
  cors({
    origin: true, // reflect any origin — tighten after confirming end-to-end works
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ──
app.use('/api/agent', agentRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/debriefs', debriefRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/tpc', tpcRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'campusintel-backend',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    grok: process.env.GROK_API_KEY ? '✓ configured' : '✗ MISSING',
    supabase: process.env.SUPABASE_URL ? '✓ configured' : '✗ MISSING',
  });
});

// Status — recent agent logs
app.get('/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agent_logs')
      .select('session_id, student_id, step_name, status, duration_ms, started_at')
      .order('started_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json({ status: 'ok', recent_sessions: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   CampusIntel Backend — v2.0.0 (Grok)       ║
║   Port: ${PORT}                                   ║
║   Grok API: ${process.env.GROK_API_KEY ? '✓ Configured' : '✗ MISSING — add GROK_API_KEY'}  ║
║   Supabase: ${process.env.SUPABASE_URL ? '✓ Configured' : '✗ MISSING'}             ║
╚══════════════════════════════════════════════╝
  `);
});

// ── Cron: Scan for upcoming drives every 30 minutes ──
cron.schedule('*/30 * * * *', async () => {
  console.log('[Cron] Scanning upcoming drives...');
  try {
    // Find drives happening within next 72 hours
    const windowEnd = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    const { data: drives } = await supabase
      .from('campus_drives')
      .select('id, college_id, company_id')
      .eq('status', 'upcoming')
      .lte('drive_date', windowEnd)
      .gte('drive_date', new Date().toISOString());

    if (!drives || drives.length === 0) return;

    for (const drive of drives) {
      // Get unprocessed registrations for this drive
      const { data: regs } = await supabase
        .from('student_registrations')
        .select('student_id')
        .eq('drive_id', drive.id)
        .eq('status', 'registered');

      if (!regs) continue;

      // Check who hasn't had agent run yet
      for (const reg of regs.slice(0, 10)) {
        // Limit to 10 per cron run
        const { count } = await supabase
          .from('agent_logs')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', reg.student_id)
          .eq('drive_id', drive.id);

        if (!count || count === 0) {
          console.log(
            `[Cron] Triggering agent for student=${reg.student_id} drive=${drive.id}`
          );
          runAgentLoop({
            studentId: reg.student_id,
            driveId: drive.id,
            collegeId: drive.college_id,
          }).catch((err) => console.error('[Cron] Agent error:', err.message));

          // Small delay between runs
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  } catch (err) {
    console.error('[Cron] Scan error:', err.message);
  }
});

export default app;

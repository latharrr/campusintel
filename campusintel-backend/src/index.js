require('dotenv').config();

const express = require('express');
const cors = require('cors');
const tenantMiddleware = require('./middleware/tenant.middleware');
const { startScanner } = require('./agent/scanner.job');

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-college-id'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle ALL preflight requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(tenantMiddleware);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CampusIntel Backend',
    dev_mode: process.env.CLAUDE_MOCK === 'true',
    time: new Date().toISOString(),
  });
});

// ── Routes (added as we build) ────────────────────────────────
app.use('/api/agent', require('./routes/agent.routes'));
app.use('/api/tpc', require('./routes/tpc.routes'));
app.use('/api/drives', require('./routes/drive.routes'));
app.use('/api/debriefs', require('./routes/debrief.routes'));
app.use('/api/student', require('./routes/student.routes'));

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 CampusIntel backend running on port ${PORT}`);
  console.log(`   DEV_MODE / CLAUDE_MOCK: ${process.env.CLAUDE_MOCK === 'true' ? '✅ ON (no tokens burned)' : '❌ OFF (real Claude calls)'}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);

  // Start the background scanner job (runs every hour)
  startScanner('0 * * * *');
});

const express = require('express');
const router = express.Router();

// Stub — full implementation in Phase 4
router.get('/:collegeId', (req, res) => {
  res.json([]);
});

router.get('/:driveId/intel', (req, res) => {
  res.json({});
});

module.exports = router;

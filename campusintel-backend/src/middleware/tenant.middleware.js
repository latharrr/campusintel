// Injects college_id on every request
// For demo: defaults to LPU if no header provided
function tenantMiddleware(req, res, next) {
  const collegeId = req.headers['x-college-id'] || 'college-lpu-001';
  req.collegeId = collegeId;
  next();
}

module.exports = tenantMiddleware;

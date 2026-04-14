const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * GET /api/drives/:collegeId
 * List all campus drives for a college (upcoming + ongoing)
 */
router.get('/:collegeId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campus_drives')
      .select(`
        id, drive_date, registration_deadline, roles_offered,
        eligible_branches, min_cgpa, package_offered, status,
        company:companies(id, name, normalized_name, sector, website)
      `)
      .eq('college_id', req.params.collegeId)
      .order('drive_date', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Drives] GET list failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/drives/:driveId/detail
 * Get full detail for a single drive (including intel + registrations count)
 */
router.get('/:driveId/detail', async (req, res) => {
  try {
    const { driveId } = req.params;

    const { data: drive, error: driveErr } = await supabase
      .from('campus_drives')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', driveId)
      .single();

    if (driveErr || !drive) return res.status(404).json({ error: 'Drive not found' });

    // Count registrations
    const { count: regCount } = await supabase
      .from('student_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('drive_id', driveId);

    // Get intel
    const { data: intel } = await supabase
      .from('college_company_intel')
      .select('top_topics, confidence_level, debrief_count, success_profile')
      .eq('college_id', drive.college_id)
      .eq('company_id', drive.company_id)
      .single();

    res.json({ ...drive, registration_count: regCount || 0, intel: intel || null });
  } catch (err) {
    console.error('[Drives] GET detail failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/drives/:driveId/register
 * Register a student for a drive
 * Body: { studentId }
 */
router.post('/:driveId/register', async (req, res) => {
  const { driveId } = req.params;
  const { studentId } = req.body;

  if (!studentId) return res.status(400).json({ error: 'studentId is required' });

  try {
    // Fetch drive to get college_id
    const { data: drive, error: driveErr } = await supabase
      .from('campus_drives')
      .select('id, college_id, status, registration_deadline, min_cgpa')
      .eq('id', driveId)
      .single();

    if (driveErr || !drive) return res.status(404).json({ error: 'Drive not found' });
    if (drive.status === 'completed') return res.status(400).json({ error: 'Drive is already completed' });

    // Check eligibility
    const { data: student } = await supabase
      .from('users')
      .select('id, cgpa, college_id')
      .eq('id', studentId)
      .single();

    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (student.college_id !== drive.college_id) {
      return res.status(403).json({ error: 'Student is not from the same college as this drive' });
    }
    if (drive.min_cgpa && student.cgpa && student.cgpa < drive.min_cgpa) {
      return res.status(400).json({ error: `Minimum CGPA required: ${drive.min_cgpa}. Your CGPA: ${student.cgpa}` });
    }

    // Insert registration (ignore duplicate)
    const { data: reg, error: regErr } = await supabase
      .from('student_registrations')
      .upsert({
        id: uuidv4(),
        student_id: studentId,
        drive_id: driveId,
        college_id: drive.college_id,
        status: 'registered',
        registered_at: new Date().toISOString(),
      }, { onConflict: 'student_id,drive_id', ignoreDuplicates: true })
      .select()
      .single();

    if (regErr) {
      // Duplicate key = already registered
      if (regErr.code === '23505') {
        return res.json({ success: true, message: 'Already registered for this drive', already_registered: true });
      }
      throw regErr;
    }

    console.log(`[Drives] ✅ Student ${studentId} registered for drive ${driveId}`);
    res.json({ success: true, registration_id: reg?.id, message: 'Successfully registered!' });
  } catch (err) {
    console.error('[Drives] Registration failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/drives/:driveId/registrations
 * Get all registrations for a drive (TPC view)
 */
router.get('/:driveId/registrations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_registrations')
      .select(`
        id, status, registered_at, current_round,
        student:users(id, name, email, branch, cgpa, current_state, confidence_score)
      `)
      .eq('drive_id', req.params.driveId)
      .order('registered_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/drives
 * Create a new campus drive (TPC admin)
 */
router.post('/', async (req, res) => {
  const { collegeId, companyId, driveDate, registrationDeadline, rolesOffered, eligibleBranches, minCgpa, packageOffered } = req.body;

  if (!collegeId || !companyId || !driveDate) {
    return res.status(400).json({ error: 'collegeId, companyId, and driveDate are required' });
  }

  try {
    const { data, error } = await supabase
      .from('campus_drives')
      .insert({
        id: `drive-${uuidv4().slice(0, 8)}`,
        college_id: collegeId,
        company_id: companyId,
        drive_date: new Date(driveDate).toISOString(),
        registration_deadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
        roles_offered: rolesOffered || [],
        eligible_branches: eligibleBranches || [],
        min_cgpa: minCgpa || null,
        package_offered: packageOffered || null,
        status: 'upcoming',
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, drive: data });
  } catch (err) {
    console.error('[Drives] Create failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

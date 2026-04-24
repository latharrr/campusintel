// src/routes/student.js
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../lib/supabase.js';
import { extractSkillsFromResume } from '../lib/grok.js';

const router = Router();

// Login by email (no password — email-based auth for simplicity)
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const { data: student, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !student)
      return res.status(404).json({ error: 'No account found with this email', success: false });

    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register new student
router.post('/register', async (req, res) => {
  try {
    const { name, email, collegeId, branch, batchYear, cgpa } = req.body;
    if (!name || !email)
      return res.status(400).json({ error: 'Name and email required' });

    // Check existing
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      const { data: student } = await supabase
        .from('users')
        .select('*')
        .eq('id', existing.id)
        .single();
      return res.json({ success: true, student, existed: true });
    }

    const id = `student-${uuidv4()}`;
    const { data: student, error } = await supabase
      .from('users')
      .insert({
        id,
        college_id: collegeId || 'college-lpu-001',
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: 'student',
        branch: branch || null,
        batch_year: batchYear || null,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        current_state: 'UNAWARE',
        confidence_score: 0,
        inferred_skills: {},
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, student });
  } catch (err) {
    if (err.message?.includes('unique'))
      return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

// Get student by ID
router.get('/:studentId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.studentId)
      .single();

    if (error || !data)
      return res.status(404).json({ error: 'Student not found' });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student registrations
router.get('/:studentId/registrations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_registrations')
      .select('*, campus_drives(*, companies(name,website))')
      .eq('student_id', req.params.studentId);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload resume — parse with Grok, update skills
router.post('/upload-resume', async (req, res) => {
  try {
    const { studentId, pdfBase64 } = req.body;
    if (!studentId || !pdfBase64)
      return res.status(400).json({ error: 'studentId and pdfBase64 required' });

    // Decode PDF to text
    let resumeText = '';
    try {
      const pdfParse = await import('pdf-parse');
      const buffer = Buffer.from(pdfBase64, 'base64');
      const pdfData = await pdfParse.default(buffer);
      resumeText = pdfData.text;
    } catch (pdfErr) {
      console.error('[Resume] PDF parse error:', pdfErr.message);
      return res.status(400).json({ error: 'Could not parse PDF: ' + pdfErr.message });
    }

    if (!resumeText || resumeText.length < 50)
      return res.status(400).json({ error: 'PDF appears to be empty or unreadable' });

    // ── Validate that the document is actually a resume/CV ──
    const resumeKeywords = [
      'experience', 'education', 'skills', 'project', 'university', 'college',
      'degree', 'bachelor', 'master', 'intern', 'developer', 'engineer',
      'objective', 'summary', 'certification', 'achievement', 'gpa', 'cgpa',
      'resume', 'curriculum vitae', 'cv', 'contact', 'phone', 'email',
      'linkedin', 'github', 'portfolio', 'technical', 'work',
      'programming', 'language', 'framework', 'database', 'software',
    ];
    const lowerText = resumeText.toLowerCase();
    const matchedKeywords = resumeKeywords.filter(kw => lowerText.includes(kw));

    if (matchedKeywords.length < 3) {
      console.warn(`[Resume] Rejected upload — only ${matchedKeywords.length} resume keywords found: [${matchedKeywords.join(', ')}]`);
      return res.status(400).json({
        error: 'This doesn\'t appear to be a resume/CV. Please upload your actual resume PDF containing your education, skills, and experience.',
        success: false,
      });
    }

    // Extract skills using Grok
    let skills;
    try {
      skills = await extractSkillsFromResume(resumeText);
    } catch (grokErr) {
      console.error('[Resume] Grok extraction error:', grokErr.message);
      return res.status(500).json({ error: 'Skill extraction failed: ' + grokErr.message });
    }

    // Calculate confidence score from extracted skills
    const skillValues = Object.values(skills);
    const avgScore =
      skillValues.reduce((sum, v) => sum + v, 0) / (skillValues.length || 1);

    // Update student profile
    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update({
        inferred_skills: skills,
        resume_text: resumeText.substring(0, 5000),
        current_state: 'PROFILED',
        confidence_score: parseFloat(avgScore.toFixed(2)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({
      success: true,
      inferred_skills: skills,
      skills_extracted: Object.keys(skills).length,
      resume_preview: resumeText.substring(0, 200) + '...',
      student: updated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

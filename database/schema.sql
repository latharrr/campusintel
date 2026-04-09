-- ============================================================
-- CampusIntel — Full Database Schema
-- Run this in: Supabase → SQL Editor → New Query
-- ============================================================

-- ── Table 1: colleges (tenant root) ──────────────────────────
create table if not exists colleges (
  id text primary key,
  name text not null,
  short_name text not null,
  domain text unique,
  tpc_email text,
  city text,
  state text,
  tier integer default 2,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ── Table 2: companies ────────────────────────────────────────
create table if not exists companies (
  id text primary key,
  name text not null,
  normalized_name text not null unique,
  sector text,
  company_type text,
  typical_ctc_range text,
  website text,
  is_global boolean default true,
  created_at timestamptz default now()
);

-- ── Table 3: users ────────────────────────────────────────────
create table if not exists users (
  id text primary key,
  college_id text not null references colleges(id),
  name text not null,
  email text unique not null,
  phone text,
  role text not null check (role in ('student', 'tpc_admin', 'super_admin')),
  batch_year integer,
  branch text,
  cgpa numeric(3,1),
  resume_url text,
  resume_text text,
  linkedin_url text,
  github_url text,
  inferred_skills jsonb default '{}',
  current_state text default 'UNAWARE' check (current_state in (
    'UNAWARE', 'PROFILED', 'TARGETED', 'ASSESSED',
    'PREPARING', 'INTERVIEW_READY', 'POST_INTERVIEW'
  )),
  confidence_score numeric(3,2) default 0.0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Table 4: campus_drives ────────────────────────────────────
create table if not exists campus_drives (
  id text primary key,
  college_id text not null references colleges(id),
  company_id text not null references companies(id),
  drive_date timestamptz not null,
  registration_deadline timestamptz,
  roles_offered text[],
  eligible_branches text[],
  min_cgpa numeric(3,1),
  package_offered text,
  round_structure jsonb,
  status text default 'upcoming' check (status in ('upcoming','ongoing','completed')),
  created_by text references users(id),
  created_at timestamptz default now()
);

-- ── Table 5: student_registrations ───────────────────────────
create table if not exists student_registrations (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references users(id),
  drive_id text not null references campus_drives(id),
  college_id text not null references colleges(id),
  registered_at timestamptz default now(),
  current_round integer default 0,
  status text default 'registered' check (
    status in ('registered','appeared','selected','rejected','withdrawn')
  ),
  outcome_recorded_at timestamptz,
  outcome_recorded_by text references users(id),
  unique(student_id, drive_id)
);

-- ── Table 6: interview_debriefs ───────────────────────────────
create table if not exists interview_debriefs (
  id uuid primary key default gen_random_uuid(),
  college_id text not null references colleges(id),
  company_id text not null references companies(id),
  student_id text references users(id),
  drive_id text references campus_drives(id),
  round_type text check (round_type in (
    'online_test','technical_1','technical_2','system_design',
    'hr','managerial','group_discussion'
  )),
  questions_asked text,
  topics_covered text[],
  outcome text check (outcome in ('selected','rejected','waiting','withdrew')),
  difficulty_rating integer check (difficulty_rating between 1 and 5),
  extracted_topics jsonb,
  success_factors text,
  failure_factors text,
  is_verified boolean default false,
  data_quality_score numeric(3,2),
  created_at timestamptz default now()
);

-- ── Table 7: college_company_intel ───────────────────────────
create table if not exists college_company_intel (
  id uuid primary key default gen_random_uuid(),
  college_id text not null references colleges(id),
  company_id text not null references companies(id),
  debrief_count integer default 0,
  last_synthesized timestamptz,
  top_topics jsonb,
  question_patterns jsonb,
  success_profile text,
  rejection_patterns text,
  avg_rounds integer,
  typical_timeline_days integer,
  selection_rate numeric(3,2),
  local_debrief_count integer default 0,
  global_debrief_count integer default 0,
  confidence_level text check (confidence_level in ('HIGH','MEDIUM','LOW')),
  updated_at timestamptz default now(),
  unique(college_id, company_id)
);

-- ── Table 8: agent_logs ⭐ ────────────────────────────────────
create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  student_id text references users(id),
  college_id text not null references colleges(id),
  drive_id text references campus_drives(id),
  session_id text not null,
  step_number integer not null,
  step_name text not null,
  input jsonb,
  output jsonb,
  decision_basis text,
  decision_made text,
  duration_ms integer,
  started_at timestamptz default now(),
  status text check (status in ('success','failed','skipped','fallback_triggered')),
  error_message text
);

-- Enable Realtime on agent_logs (powers live reasoning trace)
alter publication supabase_realtime add table agent_logs;

-- ── Table 9: skill_assessments ────────────────────────────────
create table if not exists skill_assessments (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references users(id),
  college_id text not null references colleges(id),
  drive_id text references campus_drives(id),
  topic_assessed text not null,
  questions jsonb not null,
  responses jsonb,
  evaluation jsonb,
  overall_score numeric(3,2),
  skill_level_inferred text check (skill_level_inferred in ('BEGINNER','INTERMEDIATE','ADVANCED')),
  status text default 'sent' check (status in ('sent','in_progress','completed','expired')),
  sent_at timestamptz default now(),
  completed_at timestamptz,
  expires_at timestamptz
);

-- ── Table 10: tpc_sessions ────────────────────────────────────
create table if not exists tpc_sessions (
  id uuid primary key default gen_random_uuid(),
  college_id text not null references colleges(id),
  title text not null,
  topic text not null,
  scheduled_at timestamptz not null,
  duration_mins integer default 90,
  venue text,
  max_students integer,
  auto_enrolled_students text[],
  manually_enrolled_students text[],
  created_by text default 'agent' check (created_by in ('agent','tpc_admin')),
  agent_reasoning text,
  status text default 'scheduled' check (status in ('scheduled','confirmed','completed','cancelled')),
  created_at timestamptz default now()
);

-- ── Table 11: strategy_weights ⭐ ─────────────────────────────
create table if not exists strategy_weights (
  id uuid primary key default gen_random_uuid(),
  college_id text not null references colleges(id),
  company_id text not null references companies(id),
  strategy text not null check (strategy in (
    'BRIEF_ONLY','BRIEF_ASSESS','BRIEF_ASSESS_SESSION','BRIEF_SESSION'
  )),
  student_profile_type text not null check (student_profile_type in (
    'HIGH_CONFIDENCE','MEDIUM_CONFIDENCE','LOW_CONFIDENCE','NO_DATA'
  )),
  times_used integer default 0,
  times_successful integer default 0,
  win_rate numeric(4,3) default 0.0,
  weight numeric(6,4) default 1.0,
  last_updated timestamptz default now(),
  unique(college_id, company_id, strategy, student_profile_type)
);

-- ── Table 12: notifications ───────────────────────────────────
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references users(id),
  college_id text not null references colleges(id),
  channel text check (channel in ('whatsapp','email','in_app')),
  notification_type text check (notification_type in (
    'brief_delivered','assessment_sent','session_enrolled',
    'cold_start_probe','reminder','tpc_alert','outcome_request'
  )),
  content text not null,
  metadata jsonb,
  status text default 'sent' check (status in ('sent','delivered','read','failed')),
  sent_at timestamptz default now(),
  read_at timestamptz
);

-- ============================================================
-- ✅ Schema complete. Now run seed.sql.
-- ============================================================

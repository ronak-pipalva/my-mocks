-- ============================================================
-- Mock Test Platform — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- exams
-- ----------------------------------------------------------------
create table if not exists exams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  is_bilingual boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- sections
-- ----------------------------------------------------------------
create table if not exists sections (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid not null references exams(id) on delete cascade,
  name          text not null,
  display_order int  not null default 0
);

-- ----------------------------------------------------------------
-- mocks
-- ----------------------------------------------------------------
create table if not exists mocks (
  id               uuid primary key default gen_random_uuid(),
  exam_id          uuid not null references exams(id) on delete restrict,
  title            text not null,
  slug             text not null unique,
  negative_marking numeric not null default 0,
  max_attempts     int,                         -- null = unlimited
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- mock_section_config
-- marks_per_question lives here (supports per-section values like
-- IBPS English 0.5 vs Reasoning/Quant 1.0)
-- ----------------------------------------------------------------
create table if not exists mock_section_config (
  id                 uuid primary key default gen_random_uuid(),
  mock_id            uuid not null references mocks(id) on delete cascade,
  section_id         uuid not null references sections(id) on delete restrict,
  duration_minutes   int  not null,
  marks_per_question numeric not null default 1,
  display_order      int  not null default 0,
  unique (mock_id, section_id)
);

-- ----------------------------------------------------------------
-- questions
-- ----------------------------------------------------------------
create table if not exists questions (
  id                 uuid primary key default gen_random_uuid(),
  mock_id            uuid not null references mocks(id) on delete cascade,
  section_id         uuid not null references sections(id) on delete restrict,
  question_number    int  not null,
  question_text_en   text not null,
  question_text_hi   text,
  option_a_en        text not null,
  option_a_hi        text,
  option_b_en        text not null,
  option_b_hi        text,
  option_c_en        text not null,
  option_c_hi        text,
  option_d_en        text not null,
  option_d_hi        text,
  correct_option     char(1) not null check (correct_option in ('A','B','C','D')),
  created_at         timestamptz not null default now(),
  unique (mock_id, question_number)
);

-- ----------------------------------------------------------------
-- attempts
-- ----------------------------------------------------------------
create table if not exists attempts (
  id                 uuid primary key default gen_random_uuid(),
  mock_id            uuid not null references mocks(id) on delete cascade,
  attempt_number     int  not null,
  started_at         timestamptz not null default now(),
  submitted_at       timestamptz,
  ended_reason       text check (ended_reason in ('submitted','time_up')),
  total_score        numeric,
  correct_count      int,
  wrong_count        int,
  unattempted_count  int
);

-- ----------------------------------------------------------------
-- attempt_answers
-- ----------------------------------------------------------------
create table if not exists attempt_answers (
  id                  uuid primary key default gen_random_uuid(),
  attempt_id          uuid not null references attempts(id) on delete cascade,
  question_id         uuid not null references questions(id) on delete cascade,
  selected_option     char(1) check (selected_option in ('A','B','C','D')),
  is_correct          boolean,
  time_spent_seconds  int,
  unique (attempt_id, question_id)
);

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
create index if not exists idx_sections_exam        on sections(exam_id);
create index if not exists idx_mocks_exam           on mocks(exam_id);
create index if not exists idx_msc_mock             on mock_section_config(mock_id);
create index if not exists idx_questions_mock       on questions(mock_id);
create index if not exists idx_questions_section    on questions(section_id);
create index if not exists idx_attempts_mock        on attempts(mock_id);
create index if not exists idx_answers_attempt      on attempt_answers(attempt_id);

-- ----------------------------------------------------------------
-- Seed data — two exams + their canonical sections
-- ----------------------------------------------------------------
do $$
declare
  ibps_id  uuid;
  aiap_id  uuid;
begin
  -- IBPS SO IT Officer Prelims
  insert into exams (name, is_bilingual)
  values ('IBPS SO IT Officer Prelims', false)
  on conflict do nothing
  returning id into ibps_id;

  if ibps_id is not null then
    insert into sections (exam_id, name, display_order) values
      (ibps_id, 'English Language',       1),
      (ibps_id, 'Reasoning',              2),
      (ibps_id, 'Quantitative Aptitude',  3);
  end if;

  -- AIAPGET
  insert into exams (name, is_bilingual)
  values ('AIAPGET', true)
  on conflict do nothing
  returning id into aiap_id;

  if aiap_id is not null then
    insert into sections (exam_id, name, display_order) values
      (aiap_id, 'General', 1);
  end if;
end $$;

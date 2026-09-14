-- Complete, auditable DIRI digital-certificate workflow.
-- Learners record lesson completion, request review after qualifying, and
-- receive a digital certificate only after a DIRI administrator approves it.

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (lesson_id in (
    'privacy', 'cybersecurity', 'governance', 'ai', 'rights',
    'scams', 'identity', 'mobile-money', 'misinformation'
  )),
  lesson_title text not null check (char_length(lesson_title) between 2 and 180),
  status text not null default 'started' check (status in ('started', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id),
  check (status <> 'completed' or completed_at is not null)
);

create table public.certificate_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  pathway text not null check (pathway in ('online', 'physical')),
  participant_id uuid references public.cohort_participants(id) on delete set null,
  full_learner_name text not null check (char_length(full_learner_name) between 2 and 120),
  certificate_title text not null default 'DIRI Digital Safety Certificate'
    check (char_length(certificate_title) between 3 and 160),
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'approved', 'rejected', 'issued', 'cancelled')),
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  learner_message text check (learner_message is null or char_length(learner_message) <= 1000),
  reviewer_notes text check (reviewer_notes is null or char_length(reviewer_notes) <= 2000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  certificate_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pathway = 'online' or participant_id is not null),
  check (pathway = 'physical' or user_id is not null)
);

alter table public.training_cohorts
  add column duration_hours numeric(3,1) not null default 4
  check (duration_hours between 1 and 8);

alter table public.certificates drop constraint certificates_user_id_fkey;
alter table public.certificates alter column user_id drop not null;
alter table public.certificates
  add constraint certificates_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
alter table public.certificates
  add column request_id uuid unique,
  add column source_pathway text not null default 'online'
    check (source_pathway in ('online', 'physical')),
  add column delivery_method text not null default 'digital'
    check (delivery_method = 'digital');

alter table public.certificates
  add constraint certificates_request_id_fkey
  foreign key (request_id) references public.certificate_requests(id) on delete set null;

alter table public.certificate_requests
  add constraint certificate_requests_certificate_id_fkey
  foreign key (certificate_id) references public.certificates(id) on delete set null;

create index lesson_progress_user_status_idx
  on public.lesson_progress(user_id, status);
create index certificate_requests_status_created_idx
  on public.certificate_requests(status, created_at desc);
create index certificate_requests_user_idx
  on public.certificate_requests(user_id, created_at desc)
  where user_id is not null;
create unique index certificate_requests_one_active_online_idx
  on public.certificate_requests(user_id)
  where pathway = 'online'
    and user_id is not null
    and status in ('pending', 'under_review', 'approved', 'issued');
create unique index certificate_requests_one_physical_participant_idx
  on public.certificate_requests(participant_id)
  where pathway = 'physical' and participant_id is not null;

alter table public.lesson_progress enable row level security;
alter table public.certificate_requests enable row level security;

revoke all on public.lesson_progress, public.certificate_requests from anon, authenticated;
grant select, insert, update on public.lesson_progress to authenticated;
grant select on public.certificate_requests to authenticated;

create policy "Learners view their lesson progress"
on public.lesson_progress for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners start their own lessons"
on public.lesson_progress for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Learners complete their own lessons"
on public.lesson_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Admins manage lesson progress"
on public.lesson_progress for all
to authenticated
using ((select private.diri_is_admin()))
with check ((select private.diri_is_admin()));

create policy "Learners view their certificate requests"
on public.certificate_requests for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Admins view certificate requests"
on public.certificate_requests for select
to authenticated
using ((select private.diri_is_admin()));

create or replace function private.diri_sync_participant_eligibility()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.certification_status in ('issued', 'revoked') then
    return new;
  end if;

  if new.attendance_status = 'present'
     and new.assessment_status in ('passed', 'exempt') then
    new.certification_status := 'eligible';
  else
    new.certification_status := 'not_eligible';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists diri_sync_participant_eligibility on public.cohort_participants;
create trigger diri_sync_participant_eligibility
before insert or update of attendance_status, assessment_status
on public.cohort_participants
for each row execute function private.diri_sync_participant_eligibility();

update public.cohort_participants
set certification_status = case
  when attendance_status = 'present' and assessment_status in ('passed', 'exempt') then 'eligible'
  else 'not_eligible'
end,
updated_at = now()
where certification_status not in ('issued', 'revoked');

create or replace function public.request_diri_certificate(p_full_learner_name text)
returns table (
  request_id uuid,
  request_status text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := trim(p_full_learner_name);
  v_completed_lessons integer;
  v_assessment_passed boolean;
  v_existing public.certificate_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to request a certificate.';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Enter the learner name that should appear on the certificate.';
  end if;

  select cr.* into v_existing
  from public.certificate_requests cr
  where cr.user_id = v_user_id
    and cr.pathway = 'online'
    and cr.status in ('pending', 'under_review', 'approved', 'issued')
  order by cr.created_at desc
  limit 1;

  if found then
    return query select v_existing.id, v_existing.status, v_existing.created_at;
    return;
  end if;

  if exists (
    select 1 from public.certificates c
    where c.user_id = v_user_id and c.status = 'valid'
  ) then
    raise exception 'A valid DIRI certificate has already been issued to this account.';
  end if;

  select count(distinct lp.lesson_id)::integer into v_completed_lessons
  from public.lesson_progress lp
  where lp.user_id = v_user_id and lp.status = 'completed';

  select exists (
    select 1
    from public.quiz_attempts qa
    where qa.user_id = v_user_id
      and qa.status = 'completed'
      and qa.total_questions > 0
      and qa.score * 100 >= qa.total_questions * 70
  ) into v_assessment_passed;

  if v_completed_lessons < 9 then
    raise exception 'Complete all 9 DIRI lessons before requesting certificate verification.';
  end if;

  if not v_assessment_passed then
    raise exception 'Pass a DIRI assessment with at least 70%% before requesting certificate verification.';
  end if;

  insert into public.certificate_requests (
    user_id,
    pathway,
    full_learner_name,
    status,
    eligibility_snapshot
  ) values (
    v_user_id,
    'online',
    v_name,
    'pending',
    jsonb_build_object(
      'completed_lessons', v_completed_lessons,
      'required_lessons', 9,
      'assessment_passed', v_assessment_passed,
      'pass_percentage', 70,
      'checked_at', now()
    )
  ) returning * into v_existing;

  return query select v_existing.id, v_existing.status, v_existing.created_at;
end;
$$;

create or replace function public.review_diri_certificate_request(
  p_request_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns table (
  request_id uuid,
  request_status text,
  certificate_id uuid,
  certificate_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_request public.certificate_requests%rowtype;
  v_certificate public.certificates%rowtype;
  v_completed_lessons integer;
  v_assessment_passed boolean;
  v_number text;
begin
  if v_admin_id is null or not (select private.diri_is_admin()) then
    raise exception 'Only a DIRI administrator can review certificate requests.';
  end if;

  if p_decision not in ('review', 'approve', 'reject') then
    raise exception 'Decision must be review, approve or reject.';
  end if;

  select cr.* into v_request
  from public.certificate_requests cr
  where cr.id = p_request_id
  for update;

  if not found then
    raise exception 'Certificate request not found.';
  end if;

  if v_request.status = 'issued' then
    select c.* into v_certificate
    from public.certificates c
    where c.id = v_request.certificate_id;
    return query select v_request.id, v_request.status, v_certificate.id, v_certificate.certificate_number;
    return;
  end if;

  if p_decision = 'review' then
    update public.certificate_requests
    set status = 'under_review',
        reviewer_notes = nullif(trim(p_review_notes), ''),
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        updated_at = now()
    where id = v_request.id
    returning * into v_request;
    return query select v_request.id, v_request.status, null::uuid, null::text;
    return;
  end if;

  if p_decision = 'reject' then
    update public.certificate_requests
    set status = 'rejected',
        reviewer_notes = coalesce(nullif(trim(p_review_notes), ''), 'Eligibility could not be verified.'),
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        updated_at = now()
    where id = v_request.id
    returning * into v_request;
    return query select v_request.id, v_request.status, null::uuid, null::text;
    return;
  end if;

  if v_request.status = 'rejected' or v_request.status = 'cancelled' then
    raise exception 'This request is closed. The learner must submit a new request.';
  end if;

  if v_request.pathway = 'online' then
    select count(distinct lp.lesson_id)::integer into v_completed_lessons
    from public.lesson_progress lp
    where lp.user_id = v_request.user_id and lp.status = 'completed';

    select exists (
      select 1
      from public.quiz_attempts qa
      where qa.user_id = v_request.user_id
        and qa.status = 'completed'
        and qa.total_questions > 0
        and qa.score * 100 >= qa.total_questions * 70
    ) into v_assessment_passed;

    if v_completed_lessons < 9 or not v_assessment_passed then
      raise exception 'The learner no longer meets the online certificate requirements.';
    end if;
  else
    if not exists (
      select 1
      from public.cohort_participants cp
      where cp.id = v_request.participant_id
        and cp.attendance_status = 'present'
        and cp.assessment_status in ('passed', 'exempt')
    ) then
      raise exception 'Physical attendance and assessment eligibility must be recorded first.';
    end if;
  end if;

  v_number := 'DIRI-' || to_char(current_date, 'YYYY') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.certificates (
    user_id,
    cohort_id,
    participant_id,
    request_id,
    full_learner_name,
    certificate_title,
    certificate_number,
    source_pathway,
    delivery_method,
    issued_by,
    status
  )
  select
    v_request.user_id,
    cp.cohort_id,
    v_request.participant_id,
    v_request.id,
    v_request.full_learner_name,
    v_request.certificate_title,
    v_number,
    v_request.pathway,
    'digital',
    v_admin_id,
    'valid'
  from (select 1) seed
  left join public.cohort_participants cp on cp.id = v_request.participant_id
  returning * into v_certificate;

  update public.certificate_requests
  set status = 'issued',
      certificate_id = v_certificate.id,
      reviewer_notes = nullif(trim(p_review_notes), ''),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
  where id = v_request.id
  returning * into v_request;

  if v_request.participant_id is not null then
    update public.cohort_participants
    set certification_status = 'issued', updated_at = now()
    where id = v_request.participant_id;
  end if;

  return query select v_request.id, v_request.status, v_certificate.id, v_certificate.certificate_number;
end;
$$;

create or replace function public.issue_diri_physical_certificate(p_participant_id uuid)
returns table (
  certificate_id uuid,
  certificate_number text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_participant public.cohort_participants%rowtype;
  v_request public.certificate_requests%rowtype;
  v_certificate public.certificates%rowtype;
  v_number text;
begin
  if v_admin_id is null or not (select private.diri_is_admin()) then
    raise exception 'Only a DIRI administrator can issue physical-training certificates.';
  end if;

  select cp.* into v_participant
  from public.cohort_participants cp
  where cp.id = p_participant_id
  for update;

  if not found then
    raise exception 'Training participant not found.';
  end if;

  if v_participant.attendance_status <> 'present'
     or v_participant.assessment_status not in ('passed', 'exempt') then
    raise exception 'Record full attendance and a passed or exempted assessment before issuing a certificate.';
  end if;

  select c.* into v_certificate
  from public.certificates c
  where c.participant_id = v_participant.id and c.status = 'valid'
  order by c.created_at desc
  limit 1;

  if found then
    return query select v_certificate.id, v_certificate.certificate_number;
    return;
  end if;

  insert into public.certificate_requests (
    user_id,
    pathway,
    participant_id,
    full_learner_name,
    status,
    eligibility_snapshot,
    reviewed_by,
    reviewed_at
  ) values (
    v_participant.user_id,
    'physical',
    v_participant.id,
    v_participant.full_name,
    'approved',
    jsonb_build_object(
      'attendance_status', v_participant.attendance_status,
      'assessment_status', v_participant.assessment_status,
      'checked_at', now()
    ),
    v_admin_id,
    now()
  ) returning * into v_request;

  v_number := 'DIRI-' || to_char(current_date, 'YYYY') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.certificates (
    user_id,
    cohort_id,
    participant_id,
    request_id,
    full_learner_name,
    certificate_title,
    certificate_number,
    source_pathway,
    delivery_method,
    issued_by,
    status
  ) values (
    v_participant.user_id,
    v_participant.cohort_id,
    v_participant.id,
    v_request.id,
    v_participant.full_name,
    v_request.certificate_title,
    v_number,
    'physical',
    'digital',
    v_admin_id,
    'valid'
  ) returning * into v_certificate;

  update public.certificate_requests
  set status = 'issued',
      certificate_id = v_certificate.id,
      updated_at = now()
  where id = v_request.id;

  update public.cohort_participants
  set certification_status = 'issued', updated_at = now()
  where id = v_participant.id;

  return query select v_certificate.id, v_certificate.certificate_number;
end;
$$;

revoke all on function public.request_diri_certificate(text) from public;
revoke all on function public.review_diri_certificate_request(uuid, text, text) from public;
revoke all on function public.issue_diri_physical_certificate(uuid) from public;
grant execute on function public.request_diri_certificate(text) to authenticated;
grant execute on function public.review_diri_certificate_request(uuid, text, text) to authenticated;
grant execute on function public.issue_diri_physical_certificate(uuid) to authenticated;

comment on table public.lesson_progress is
  'Authenticated learner progress for DIRI short online lessons.';
comment on table public.certificate_requests is
  'Auditable online and physical certificate review requests.';
comment on column public.certificates.delivery_method is
  'DIRI issues digital certificates only. The digital document can be downloaded as PDF or printed.';

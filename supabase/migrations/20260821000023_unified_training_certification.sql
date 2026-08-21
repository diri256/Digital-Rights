-- DIRI unified training, assessment and certification architecture.
-- Online and physically trained learners share auth.users and public.profiles.

create schema if not exists private;

create or replace function private.diri_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.diri_is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.diri_is_admin() to authenticated;

create table public.training_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  organization_type text not null check (organization_type in ('company','school','university','ngo','community','rural_community','other')),
  location text,
  contact_email text,
  contact_phone text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_requests (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null check (char_length(organization_name) between 2 and 160),
  contact_person text not null check (char_length(contact_person) between 2 and 100),
  email text not null check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  phone text not null check (char_length(phone) between 7 and 30),
  location text not null check (char_length(location) between 2 and 160),
  participant_count integer not null check (participant_count between 1 and 10000),
  participant_type text not null check (participant_type in ('students','staff','teachers','community_members','youth','mixed','other')),
  preferred_training_date date,
  training_topics text not null check (char_length(training_topics) between 5 and 2000),
  certification_required boolean not null default false,
  additional_message text check (additional_message is null or char_length(additional_message) <= 3000),
  requester_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'new' check (status in ('new','reviewing','quoted','accepted','declined','completed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_cohorts (
  id uuid primary key default gen_random_uuid(),
  training_name text not null check (char_length(training_name) between 3 and 180),
  organization_id uuid references public.training_organizations(id) on delete set null,
  source_request_id uuid references public.training_requests(id) on delete set null,
  training_date date not null,
  location text,
  status text not null default 'planned' check (status in ('planned','enrolling','active','assessment','completed','cancelled')),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cohort_participants (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.training_cohorts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text,
  attendance_status text not null default 'pending' check (attendance_status in ('pending','present','absent','partial')),
  assessment_status text not null default 'not_started' check (assessment_status in ('not_started','in_progress','passed','not_passed','exempt')),
  certification_status text not null default 'not_eligible' check (certification_status in ('not_eligible','eligible','approved','issued','revoked')),
  enrolled_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  cohort_id uuid references public.training_cohorts(id) on delete set null,
  participant_id uuid references public.cohort_participants(id) on delete set null,
  full_learner_name text not null check (char_length(full_learner_name) between 2 and 120),
  certificate_title text not null default 'DIRI Digital Safety Certificate' check (char_length(certificate_title) between 3 and 160),
  certificate_number text not null unique check (certificate_number ~ '^DIRI-[A-Z0-9-]{8,40}$'),
  verification_token uuid not null default gen_random_uuid() unique,
  issue_date date not null default current_date,
  status text not null default 'valid' check (status in ('valid','revoked','expired')),
  issued_by uuid not null references auth.users(id),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (setting_key, setting_value, description)
values ('certificate_fee_ugx', '{"amount":20000,"currency":"UGX","applies_where_required":true}'::jsonb,
        'Proposed DIRI certificate fee. Learning access remains separate and the fee is configurable.')
on conflict (setting_key) do nothing;

create index training_requests_status_created_idx on public.training_requests(status, created_at desc);
create index training_cohorts_date_idx on public.training_cohorts(training_date desc);
create index cohort_participants_user_idx on public.cohort_participants(user_id) where user_id is not null;
create index certificates_user_idx on public.certificates(user_id, issue_date desc);
create index certificates_number_idx on public.certificates(certificate_number);

alter table public.training_organizations enable row level security;
alter table public.training_requests enable row level security;
alter table public.training_cohorts enable row level security;
alter table public.cohort_participants enable row level security;
alter table public.certificates enable row level security;
alter table public.platform_settings enable row level security;

revoke all on public.training_organizations, public.training_requests, public.training_cohorts,
  public.cohort_participants, public.certificates, public.platform_settings from anon, authenticated;

grant insert on public.training_requests to anon, authenticated;
grant select on public.training_cohorts, public.cohort_participants, public.certificates to authenticated;
grant select on public.platform_settings to anon, authenticated;
grant select, insert, update, delete on public.training_organizations, public.training_requests,
  public.training_cohorts, public.cohort_participants, public.certificates to authenticated;
grant update on public.platform_settings to authenticated;

create policy "Public can submit training requests"
on public.training_requests for insert
to anon, authenticated
with check (requester_user_id is null or requester_user_id = (select auth.uid()));

create policy "Admins manage training requests"
on public.training_requests for all
to authenticated
using ((select private.diri_is_admin()))
with check ((select private.diri_is_admin()));

create policy "Admins manage organizations"
on public.training_organizations for all
to authenticated
using ((select private.diri_is_admin()))
with check ((select private.diri_is_admin()));

create policy "Admins manage cohorts"
on public.training_cohorts for all
to authenticated
using ((select private.diri_is_admin()))
with check ((select private.diri_is_admin()));

create policy "Learners view their cohorts"
on public.training_cohorts for select
to authenticated
using (exists (
  select 1 from public.cohort_participants cp
  where cp.cohort_id = training_cohorts.id and cp.user_id = (select auth.uid())
));

create policy "Admins manage cohort participants"
on public.cohort_participants for all
to authenticated
using ((select private.diri_is_admin()))
with check ((select private.diri_is_admin()));

create policy "Learners view their participation"
on public.cohort_participants for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Admins manage certificates"
on public.certificates for all
to authenticated
using ((select private.diri_is_admin()))
with check ((select private.diri_is_admin()));

create policy "Learners view their certificates"
on public.certificates for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Public can view certificate pricing"
on public.platform_settings for select
to anon, authenticated
using (setting_key = 'certificate_fee_ugx');

create policy "Admins manage platform settings"
on public.platform_settings for all
to authenticated
using ((select private.diri_is_admin()))
with check ((select private.diri_is_admin()));

create or replace function public.verify_diri_certificate(p_certificate_id text)
returns table (
  is_valid boolean,
  certificate_holder text,
  certificate_type text,
  certificate_number text,
  issue_date date,
  certificate_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.status = 'valid' as is_valid,
    c.full_learner_name,
    c.certificate_title,
    c.certificate_number,
    c.issue_date,
    c.status
  from public.certificates c
  where upper(c.certificate_number) = upper(trim(p_certificate_id))
     or c.verification_token::text = trim(p_certificate_id)
  limit 1;
$$;

revoke all on function public.verify_diri_certificate(text) from public;
grant execute on function public.verify_diri_certificate(text) to anon, authenticated;

comment on table public.training_cohorts is 'Internal DIRI training groups. Physical and online learners remain in the same auth/profile system.';
comment on table public.certificates is 'Approved DIRI certificates only. No rows are seeded by this migration.';

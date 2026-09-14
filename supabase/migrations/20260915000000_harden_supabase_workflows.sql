-- Harden DIRI's Supabase RPC surface and add indexes for foreign-key workflows.
-- Public API functions remain thin SECURITY INVOKER wrappers; privileged work
-- stays in the unexposed private schema.

alter function public.request_diri_certificate(text) set schema private;
alter function public.review_diri_certificate_request(uuid, text, text) set schema private;
alter function public.issue_diri_physical_certificate(uuid) set schema private;

revoke all on function private.request_diri_certificate(text) from public, anon, authenticated;
revoke all on function private.review_diri_certificate_request(uuid, text, text) from public, anon, authenticated;
revoke all on function private.issue_diri_physical_certificate(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.request_diri_certificate(text) to authenticated;
grant execute on function private.review_diri_certificate_request(uuid, text, text) to authenticated;
grant execute on function private.issue_diri_physical_certificate(uuid) to authenticated;

create function public.request_diri_certificate(p_full_learner_name text)
returns table (
  request_id uuid,
  request_status text,
  requested_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.request_diri_certificate(p_full_learner_name);
$$;

create function public.review_diri_certificate_request(
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
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.review_diri_certificate_request(
    p_request_id,
    p_decision,
    p_review_notes
  );
$$;

create function public.issue_diri_physical_certificate(p_participant_id uuid)
returns table (
  certificate_id uuid,
  certificate_number text
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.issue_diri_physical_certificate(p_participant_id);
$$;

revoke all on function public.request_diri_certificate(text) from public, anon;
revoke all on function public.review_diri_certificate_request(uuid, text, text) from public, anon;
revoke all on function public.issue_diri_physical_certificate(uuid) from public, anon;
grant execute on function public.request_diri_certificate(text) to authenticated;
grant execute on function public.review_diri_certificate_request(uuid, text, text) to authenticated;
grant execute on function public.issue_diri_physical_certificate(uuid) to authenticated;

comment on function public.request_diri_certificate(text)
  is 'Authenticated entry point for a qualified learner to request DIRI certificate review.';
comment on function public.review_diri_certificate_request(uuid, text, text)
  is 'Authenticated entry point; the private implementation enforces DIRI administrator access.';
comment on function public.issue_diri_physical_certificate(uuid)
  is 'Authenticated entry point; the private implementation enforces DIRI administrator access.';

-- Trigger functions must not be callable as Data API RPCs.
alter function public.update_updated_at_column() set search_path = '';
alter function public.sync_profile_email() set search_path = '';
alter function public.check_role_update() set search_path = '';
alter function public.user_has_role(text) set search_path = '';

revoke all on function public.update_updated_at_column() from public, anon, authenticated;
revoke all on function public.sync_profile_email() from public, anon, authenticated;
revoke all on function public.check_role_update() from public, anon, authenticated;
revoke all on function public.user_has_role(text) from public, anon;
grant execute on function public.user_has_role(text) to authenticated;

-- Cover foreign keys used by certificate, training, quiz and existing admin flows.
create index if not exists access_requests_user_id_idx
  on public.access_requests(user_id);
create index if not exists access_requests_reviewed_by_idx
  on public.access_requests(reviewed_by) where reviewed_by is not null;
create index if not exists ai_response_reports_user_id_idx
  on public.ai_response_reports(user_id) where user_id is not null;
create index if not exists ai_response_reports_reviewed_by_idx
  on public.ai_response_reports(reviewed_by) where reviewed_by is not null;
create index if not exists certificate_requests_reviewed_by_idx
  on public.certificate_requests(reviewed_by) where reviewed_by is not null;
create index if not exists certificates_cohort_id_idx
  on public.certificates(cohort_id) where cohort_id is not null;
create index if not exists certificates_issued_by_idx
  on public.certificates(issued_by);
create index if not exists certificates_participant_id_idx
  on public.certificates(participant_id) where participant_id is not null;
create index if not exists certificates_revoked_by_idx
  on public.certificates(revoked_by) where revoked_by is not null;
create index if not exists platform_settings_updated_by_idx
  on public.platform_settings(updated_by) where updated_by is not null;
create index if not exists quiz_weeks_created_by_idx
  on public.quiz_weeks(created_by) where created_by is not null;
create index if not exists training_cohorts_created_by_idx
  on public.training_cohorts(created_by);
create index if not exists training_cohorts_organization_id_idx
  on public.training_cohorts(organization_id) where organization_id is not null;
create index if not exists training_cohorts_source_request_id_idx
  on public.training_cohorts(source_request_id) where source_request_id is not null;
create index if not exists training_organizations_created_by_idx
  on public.training_organizations(created_by) where created_by is not null;
create index if not exists training_requests_requester_user_id_idx
  on public.training_requests(requester_user_id) where requester_user_id is not null;
create index if not exists training_requests_reviewed_by_idx
  on public.training_requests(reviewed_by) where reviewed_by is not null;

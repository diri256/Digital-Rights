create table if not exists public.ai_response_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  question text not null check (char_length(question) between 1 and 1000),
  response text not null check (char_length(response) between 1 and 5000),
  reason text not null check (char_length(reason) between 3 and 500),
  page_url text null check (page_url is null or char_length(page_url) <= 500),
  status text not null default 'open'
    check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by uuid null references public.profiles(id) on delete set null
);

alter table public.ai_response_reports enable row level security;
revoke all on public.ai_response_reports from anon, authenticated;

create index if not exists ai_response_reports_status_created_at_idx
  on public.ai_response_reports (status, created_at desc);

-- Keep public quiz reads independent from authenticated role checks.
-- Anonymous visitors can only read active questions and published weeks.

revoke insert, update, delete on public.quiz_questions from anon;
revoke insert, update, delete on public.quiz_weeks from anon;
grant select on public.quiz_questions, public.quiz_weeks to anon, authenticated;

drop policy if exists "Anyone can read active questions" on public.quiz_questions;

create policy "Anonymous users read active questions"
on public.quiz_questions for select
to anon
using (is_active = true);

create policy "Authenticated users read permitted questions"
on public.quiz_questions for select
to authenticated
using (
  is_active = true
  or public.user_has_role('admin')
  or public.user_has_role('policymaker')
);

drop policy if exists "Anyone can read published weeks" on public.quiz_weeks;

create policy "Anonymous users read published weeks"
on public.quiz_weeks for select
to anon
using (is_published = true);

create policy "Authenticated users read permitted weeks"
on public.quiz_weeks for select
to authenticated
using (
  is_published = true
  or public.user_has_role('admin')
  or public.user_has_role('policymaker')
);

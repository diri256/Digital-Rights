-- Replace event-specific quiz material with practical digital-safety content.
-- Historical quiz attempts are preserved; old forum weeks are only unpublished.
update public.quiz_weeks
set is_published = false
where title ilike '%UIGF%'
   or title ilike '%UYIGF%'
   or title ilike '%Internet Governance Forum%';

update public.quiz_questions
set is_active = false
where question_text ilike '%UIGF%'
   or question_text ilike '%UYIGF%'
   or question_text ilike '%Internet Governance Forum%'
   or question_text ilike 'Who is the current speaker of Uganda?';

do $$
declare
  v_question_ids uuid[];
  v_week_id uuid;
  v_week_number integer;
begin
  insert into public.quiz_questions (
    question_text,
    options,
    correct_answer,
    category,
    topic,
    is_active
  )
  select
    seed.question_text,
    seed.options,
    seed.correct_answer,
    seed.category,
    seed.topic,
    true
  from (
    values
      (
        'A caller claiming to be from your mobile-money provider asks for your PIN and one-time code. What should you do?',
        jsonb_build_array('Share only the one-time code', 'Share the PIN if the caller knows your name', 'End the call and contact the provider using its official number', 'Move the money to the account the caller gives you'),
        2,
        'scenario',
        'Mobile money safety'
      ),
      (
        'Which password practice gives your accounts the strongest everyday protection?',
        jsonb_build_array('Reuse one difficult password everywhere', 'Use a unique passphrase for each account and store it in a password manager', 'Use your phone number followed by your birth year', 'Change one reused password every month'),
        1,
        'lesson',
        'Account security'
      ),
      (
        'Which sign most strongly suggests that a login page may be a phishing site?',
        jsonb_build_array('It has a company logo', 'Its address slightly misspells a known name and demands urgent action', 'It uses photographs and modern colours', 'It contains a privacy-policy link'),
        1,
        'scenario',
        'Phishing'
      ),
      (
        'Your phone is lost while it is signed in to email and mobile money. What should you do first?',
        jsonb_build_array('Wait a day to see whether it is returned', 'Post every password on social media so friends can help', 'Create a new social-media account', 'Lock the device remotely, contact your provider and secure important accounts'),
        3,
        'scenario',
        'Device security'
      ),
      (
        'A torch app asks for access to your contacts, location and microphone. What is the safest response?',
        jsonb_build_array('Deny unnecessary permissions and remove the app if it will not work without them', 'Allow everything because the app is free', 'Allow access and switch off the screen', 'Send the app developer your contact list instead'),
        0,
        'scenario',
        'App permissions'
      ),
      (
        'Someone repeatedly threatens you online. Which response best protects you?',
        jsonb_build_array('Threaten them back', 'Delete all evidence immediately', 'Save evidence, block and report the account, and seek trusted help', 'Share their private information publicly'),
        2,
        'scenario',
        'Online harassment'
      ),
      (
        'Before forwarding a dramatic claim from social media, what should you do?',
        jsonb_build_array('Forward it quickly before it is deleted', 'Check the source, date and context, then compare with credible sources', 'Trust it when many people have shared it', 'Trust it if it includes a photograph'),
        1,
        'scenario',
        'Misinformation'
      ),
      (
        'You need to make a sensitive payment while connected to public Wi-Fi. What is safest?',
        jsonb_build_array('Use trusted mobile data or wait for a secure connection', 'Continue because public Wi-Fi is always encrypted', 'Ask a stranger to complete the payment', 'Turn off two-factor authentication first'),
        0,
        'scenario',
        'Safe connections'
      ),
      (
        'Why should you install security updates on your phone and computer?',
        jsonb_build_array('They guarantee that every website is truthful', 'They make passwords unnecessary', 'They prevent all loss or theft', 'They fix known weaknesses that attackers may exploit'),
        3,
        'lesson',
        'Software updates'
      ),
      (
        'When an organisation asks for your personal information, what is good privacy practice?',
        jsonb_build_array('Collect every detail in case it becomes useful later', 'Publish the information so the process is transparent', 'Explain the purpose, collect only what is needed and protect it', 'Keep the purpose secret until after collection'),
        2,
        'lesson',
        'Data privacy'
      )
  ) as seed(question_text, options, correct_answer, category, topic)
  where not exists (
    select 1
    from public.quiz_questions existing
    where existing.question_text = seed.question_text
  );

  select array_agg(question.id order by seed.ordinal)
  into v_question_ids
  from (
    values
      (1, 'A caller claiming to be from your mobile-money provider asks for your PIN and one-time code. What should you do?'),
      (2, 'Which password practice gives your accounts the strongest everyday protection?'),
      (3, 'Which sign most strongly suggests that a login page may be a phishing site?'),
      (4, 'Your phone is lost while it is signed in to email and mobile money. What should you do first?'),
      (5, 'A torch app asks for access to your contacts, location and microphone. What is the safest response?'),
      (6, 'Someone repeatedly threatens you online. Which response best protects you?'),
      (7, 'Before forwarding a dramatic claim from social media, what should you do?'),
      (8, 'You need to make a sensitive payment while connected to public Wi-Fi. What is safest?'),
      (9, 'Why should you install security updates on your phone and computer?'),
      (10, 'When an organisation asks for your personal information, what is good privacy practice?')
  ) as seed(ordinal, question_text)
  join lateral (
    select existing.id
    from public.quiz_questions existing
    where existing.question_text = seed.question_text
    order by existing.created_at
    limit 1
  ) as question on true;

  select id
  into v_week_id
  from public.quiz_weeks
  where title = 'Practical Digital Safety Essentials'
  order by created_at
  limit 1;

  if v_week_id is null then
    select coalesce(max(week_number), 0) + 1 into v_week_number from public.quiz_weeks;

    insert into public.quiz_weeks (
      week_number,
      title,
      description,
      question_ids,
      time_limit_minutes,
      starts_at,
      ends_at,
      is_published
    ) values (
      v_week_number,
      'Practical Digital Safety Essentials',
      'Ten short, practical questions on scams, privacy, account security and safer online choices.',
      v_question_ids,
      10,
      null,
      null,
      true
    );
  else
    update public.quiz_weeks
    set description = 'Ten short, practical questions on scams, privacy, account security and safer online choices.',
        question_ids = v_question_ids,
        time_limit_minutes = 10,
        starts_at = null,
        ends_at = null,
        is_published = true
    where id = v_week_id;
  end if;
end;
$$;

create index if not exists idx_quiz_attempts_completed_week
  on public.quiz_attempts (week_id, score desc, time_spent_seconds asc)
  where status = 'completed' and total_questions > 0;

create index if not exists idx_quiz_attempts_completed_created
  on public.quiz_attempts (created_at desc)
  where status = 'completed' and total_questions > 0;

-- The helper runs with its owner's access because leaderboard participants cannot
-- read other learners' attempts or profiles through the normal RLS policies.
create schema if not exists diri_private;
revoke all on schema diri_private from public, anon, authenticated;

create or replace function diri_private.get_quiz_leaderboard(p_period text default 'weekly')
returns table (
  leaderboard_rank bigint,
  display_name text,
  score_points bigint,
  time_seconds bigint,
  quizzes_completed bigint,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with request_context as (
    select
      case when p_period in ('weekly', 'monthly', 'all-time') then p_period else 'weekly' end as period,
      (select auth.uid()) as caller_id
  ),
  current_week as (
    select week.id
    from public.quiz_weeks week
    where week.is_published = true
      and (week.starts_at is null or week.starts_at <= now())
      and (week.ends_at is null or week.ends_at >= now())
    order by week.week_number desc
    limit 1
  ),
  eligible_attempts as (
    select
      attempt.user_id,
      round((attempt.score::numeric / attempt.total_questions::numeric) * 1000)::bigint as score_points,
      coalesce(nullif(attempt.time_spent_seconds, 0), attempt.elapsed_seconds, 0)::bigint as time_seconds
    from public.quiz_attempts attempt
    join public.quiz_weeks attempt_week on attempt_week.id = attempt.week_id
    cross join request_context context
    where context.caller_id is not null
      and attempt.status = 'completed'
      and attempt.total_questions > 0
      and attempt_week.title not ilike '%UIGF%'
      and attempt_week.title not ilike '%UYIGF%'
      and attempt_week.title not ilike '%Internet Governance Forum%'
      and (context.period <> 'weekly' or attempt.week_id = (select id from current_week))
      and (context.period <> 'monthly' or attempt.created_at >= date_trunc('month', now()))
  ),
  totals as (
    select
      attempt.user_id,
      sum(attempt.score_points)::bigint as score_points,
      sum(attempt.time_seconds)::bigint as time_seconds,
      count(*)::bigint as quizzes_completed
    from eligible_attempts attempt
    group by attempt.user_id
  ),
  ranked as (
    select
      row_number() over (order by totals.score_points desc, totals.time_seconds asc, profile.username asc, totals.user_id asc) as leaderboard_rank,
      coalesce(nullif(btrim(profile.username), ''), 'DIRI Learner') as display_name,
      totals.score_points,
      totals.time_seconds,
      totals.quizzes_completed,
      profile.id = (select caller_id from request_context) as is_current_user
    from totals
    join public.profiles profile on profile.id = totals.user_id
  )
  select
    ranked.leaderboard_rank,
    ranked.display_name,
    ranked.score_points,
    ranked.time_seconds,
    ranked.quizzes_completed,
    ranked.is_current_user
  from ranked
  where ranked.leaderboard_rank <= 100
     or ranked.is_current_user
  order by ranked.leaderboard_rank;
$$;

revoke all on function diri_private.get_quiz_leaderboard(text) from public, anon, authenticated;
grant usage on schema diri_private to authenticated;
grant execute on function diri_private.get_quiz_leaderboard(text) to authenticated;

create or replace function public.get_quiz_leaderboard(p_period text default 'weekly')
returns table (
  leaderboard_rank bigint,
  display_name text,
  score_points bigint,
  time_seconds bigint,
  quizzes_completed bigint,
  is_current_user boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from diri_private.get_quiz_leaderboard(p_period);
$$;

revoke all on function public.get_quiz_leaderboard(text) from public, anon;
grant execute on function public.get_quiz_leaderboard(text) to authenticated;

comment on function public.get_quiz_leaderboard(text)
  is 'Returns privacy-limited quiz rankings for signed-in DIRI learners.';

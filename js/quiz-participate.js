(function() {
  'use strict';
  const sb = window.diriSupabase;
  let currentUser = null;
  let currentWeek = null;
  let questions = [];
  let answers = [];
  let currentIndex = 0;
  let timerInterval = null;
  let elapsedSeconds = 0;
  let attemptId = null;
  let hasSubmitted = false;

  async function init() {
    if (!sb) return showUnavailable('Quiz temporarily unavailable.');

    const sessionRes = await sb.auth.getSession();
    const session = sessionRes.data.session;
    if (!session || !session.user) {
      window.location.href = 'login.html';
      return;
    }
    currentUser = session.user;

    // Fetch published weeks and pick the latest active one by week number
    const now = new Date();
    const { data: weeks, error: weeksErr } = await sb.from('quiz_weeks').select('*').eq('is_published', true).order('week_number', { ascending: false });
    if (weeksErr) { console.error(weeksErr); showUnavailable('Unable to load quiz: ' + weeksErr.message); return; }

    if (!weeks || weeks.length === 0) {
      console.log('No published weeks found.');
      updateHeroContent('No active quiz', 'No quizzes have been published yet. Check back soon!');
      showView('quiz-unavailable');
      return;
    }

    const valid = (weeks || []).filter(function(w) {
      const starts = w.starts_at ? new Date(w.starts_at) : null;
      const ends = w.ends_at ? new Date(w.ends_at) : null;
      // If both dates are null, week is always available
      if (!starts && !ends) return true;
      // If only starts is set, check if now >= starts
      if (starts && !ends) return now >= starts;
      // If only ends is set, check if now <= ends
      if (!starts && ends) return now <= ends;
      // Both set: check if now is in range
      return now >= starts && now <= ends;
    });

    if (!valid || valid.length === 0) {
      const reasons = [];
      weeks.forEach(function(w) {
        const starts = w.starts_at ? new Date(w.starts_at) : null;
        const ends = w.ends_at ? new Date(w.ends_at) : null;
        if (starts && now < starts) reasons.push('Week ' + w.week_number + ' starts on ' + starts.toLocaleDateString());
        if (ends && now > ends) reasons.push('Week ' + w.week_number + ' ended on ' + ends.toLocaleDateString());
      });
      const msg = reasons.length > 0 ? reasons.join('; ') + '.' : 'The current quiz is outside its active window.';
      console.log('No valid weeks found:', msg);
      updateHeroContent('Quiz not yet active', msg);
      showView('quiz-unavailable');
      return;
    }

    // Choose highest-numbered valid week
    currentWeek = valid.sort(function(a, b) { return (b.week_number || 0) - (a.week_number || 0); })[0];
    updateHeroContent(currentWeek.title || ('Week ' + currentWeek.week_number), currentWeek.description || 'Test your digital rights knowledge with this week\'s quiz challenge.');

    // Load questions for week
    await fetchQuestionsForWeek(currentWeek);

    // Check if questions loaded
    if (!questions || questions.length === 0) {
      updateHeroContent(currentWeek.title || ('Week ' + currentWeek.week_number), 'This week\'s quiz has no questions yet. The admin may still be setting it up.');
      showView('quiz-unavailable');
      // Override the unavailable view message
      var unavailableMsg = document.getElementById('unavailable-message');
      if (unavailableMsg) unavailableMsg.textContent = 'No questions have been assigned to this week. Check back later or contact the admin.';
      var unavailableTitle = document.getElementById('unavailable-title');
      if (unavailableTitle) unavailableTitle.textContent = 'No questions available';
      return;
    }

    // Check for existing attempt
    const { data: attempts, error: attErr } = await sb.from('quiz_attempts').select('*').eq('user_id', currentUser.id).eq('week_id', currentWeek.id).maybeSingle();
    if (attErr) {
      console.error('attempts load error', attErr);
      // Table may not exist yet — that's OK, treat as no attempt
    }

    if (attempts && attempts.id) {
      attemptId = attempts.id;
      if (attempts.status === 'completed') {
        // show previous results
        answers = attempts.answers || [];
        elapsedSeconds = attempts.time_spent_seconds || attempts.elapsed_seconds || 0;
        renderResultsFromAttempt(attempts);
        return;
      }
      // in_progress -> restore
      answers = attempts.answers || [];
      currentIndex = attempts.current_index || 0;
      elapsedSeconds = attempts.elapsed_seconds || 0;
      startTimer();
      showView('quiz-active');
      renderQuestion(currentIndex);
      return;
    }

    // No attempt yet — show start
    document.getElementById('quiz-week-title').textContent = currentWeek.title || ('Week ' + currentWeek.week_number);
    document.getElementById('quiz-week-desc').textContent = currentWeek.description || '';
    const meta = document.getElementById('quiz-week-meta');
    if (meta) meta.innerHTML = '<div class="body-sm">' + (questions.length) + ' questions • ' + (currentWeek.time_limit_minutes) + ' min</div>';
    showView('quiz-start');

    // Wire start button (remove old listener first to avoid duplicates)
    var startBtn = document.getElementById('btn-start-quiz');
    if (startBtn) {
      var newBtn = startBtn.cloneNode(true);
      startBtn.parentNode.replaceChild(newBtn, startBtn);
      newBtn.addEventListener('click', startQuiz);
    }

    // Wire prev/next buttons (remove old listeners)
    ['btn-prev', 'btn-next'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (btn) {
        var newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
      }
    });
    document.getElementById('btn-prev').addEventListener('click', function() { prevQuestion(); });
    document.getElementById('btn-next').addEventListener('click', function() { nextQuestion(); });
  }

  function updateHeroContent(title, description) {
    const heroTitle = document.getElementById('quiz-hero-title');
    const heroDesc = document.getElementById('quiz-hero-description');
    if (heroTitle) heroTitle.textContent = title || 'Weekly Quiz';
    if (heroDesc) heroDesc.textContent = description || 'Test your digital rights knowledge with this week\'s quiz challenge.';
  }

  function showView(viewId) {
    document.querySelectorAll('.quiz-view').forEach(function(v){ v.style.display = 'none'; });
    const el = document.getElementById(viewId);
    if (el) el.style.display = 'block';
  }

  async function fetchQuestionsForWeek(week) {
    const qids = week.question_ids || [];
    if (!qids || qids.length === 0) { questions = []; return; }
    const { data, error } = await sb.from('quiz_questions').select('*').in('id', qids);
    if (error) { console.error(error); questions = []; return; }
    // preserve original order
    const map = {};
    (data || []).forEach(d => map[d.id] = d);
    questions = qids.map(id => map[id]).filter(Boolean);
  }

  function renderQuestion(index) {
    // If questions array is empty, show fallback message
    if (!questions || questions.length === 0) {
      document.getElementById('quiz-question-text').textContent = '';
      var optsEmpty = document.getElementById('quiz-options-container');
      optsEmpty.innerHTML = '<div class="body-md" style="text-align:center;padding:var(--space-8);color:var(--color-dark-secondary);">No questions are available for this quiz. The admin may still be setting it up.</div>';
      document.getElementById('quiz-progress').textContent = '0/0';
      document.getElementById('quiz-question-counter').textContent = '0 of 0';
      document.getElementById('btn-next').disabled = true;
      document.getElementById('btn-prev').disabled = true;
      return;
    }

    currentIndex = Math.max(0, Math.min(index, questions.length - 1));
    const q = questions[currentIndex];
    if (!q) {
      // Fallback for missing question data at this index
      document.getElementById('quiz-question-text').textContent = 'Question data is missing.';
      document.getElementById('quiz-options-container').innerHTML = '<div class="body-sm" style="text-align:center;padding:var(--space-8);color:var(--color-dark-secondary);">This question could not be loaded.</div>';
      document.getElementById('quiz-progress').textContent = (currentIndex + 1) + '/' + questions.length;
      document.getElementById('quiz-question-counter').textContent = (currentIndex + 1) + ' of ' + questions.length;
      document.getElementById('btn-next').disabled = false;
      document.getElementById('btn-prev').disabled = false;
      if (currentIndex === questions.length - 1) document.getElementById('btn-next').textContent = 'Submit'; else document.getElementById('btn-next').textContent = 'Next →';
      saveProgress();
      return;
    }

    document.getElementById('quiz-question-text').textContent = q.question_text;
    const opts = document.getElementById('quiz-options-container');
    opts.innerHTML = '';
    (q.options || []).forEach(function(opt, i){
      const div = document.createElement('div');
      div.className = 'quiz-option';
      div.innerHTML = '<span class="option-letter">' + String.fromCharCode(65 + i) + '</span> ' + escHtml(opt);
      div.dataset.index = i;
      div.addEventListener('click', function(){ selectOption(i); });
      opts.appendChild(div);
    });

    // mark previously selected
    const sel = answers[currentIndex];
    if (typeof sel === 'number') {
      const chosen = opts.querySelector('[data-index="' + sel + '"]');
      if (chosen) chosen.classList.add('selected');
    }

    document.getElementById('quiz-progress').textContent = (currentIndex + 1) + '/' + questions.length;
    document.getElementById('quiz-question-counter').textContent = (currentIndex + 1) + ' of ' + questions.length;

    // Ensure buttons are enabled
    document.getElementById('btn-next').disabled = false;
    document.getElementById('btn-prev').disabled = false;

    // Update Next button label
    var nextBtn = document.getElementById('btn-next');
    if (currentIndex === questions.length - 1) nextBtn.textContent = 'Submit'; else nextBtn.textContent = 'Next →';

    // Save progress on render (to ensure current_index persisted)
    saveProgress();
  }

  function selectOption(optionIndex) {
    if (hasSubmitted) return;
    // set answer for currentIndex
    answers[currentIndex] = optionIndex;
    // mark UI
    const opts = document.getElementById('quiz-options-container');
    opts.querySelectorAll('.quiz-option').forEach(function(el){ el.classList.toggle('selected', parseInt(el.dataset.index,10) === optionIndex); });
    // Save
    saveProgress();
  }

  async function startQuiz() {
    if (!currentWeek) return;
    if (!questions || questions.length === 0) {
      showToast('No questions available for this week.', 'error');
      return;
    }
    try {
      // Build payload with only the columns that definitely exist
      var payload = {
        user_id: currentUser.id,
        week_id: currentWeek.id,
        answers: [],
        total_questions: questions.length
      };
      // These columns may not exist if Phase 2 migration hasn't run
      // Include them — Supabase ignores unknown columns
      payload.status = 'in_progress';
      payload.current_index = 0;
      payload.elapsed_seconds = 0;
      payload.started_at = new Date().toISOString();

      const { data, error } = await sb.from('quiz_attempts').insert(payload).select('*').single();
      if (error) {
        // If column-related error, try minimal payload
        if (error.message && (error.message.indexOf('column') !== -1 || error.code === 'PGRST204')) {
          var minimalPayload = {
            user_id: currentUser.id,
            week_id: currentWeek.id,
            answers: [],
            total_questions: questions.length
          };
          var fallbackResult = await sb.from('quiz_attempts').insert(minimalPayload).select('*').single();
          if (fallbackResult.error) throw fallbackResult.error;
          attemptId = fallbackResult.data.id;
        } else {
          throw error;
        }
      } else {
        attemptId = data.id;
      }
      answers = [];
      currentIndex = 0;
      elapsedSeconds = 0;
      startTimer();
      showView('quiz-active');
      renderQuestion(0);
    } catch (err) {
      console.error('start error', err);
      showToast('Unable to start quiz: ' + err.message, 'error');
    }
  }

  async function saveProgress() {
    if (!attemptId) return;
    try {
      var payload = { answers: answers };
      // These columns may not exist yet on the table
      try {
        payload.current_index = currentIndex;
        payload.elapsed_seconds = elapsedSeconds;
      } catch (_) {}
      await sb.from('quiz_attempts').update(payload).eq('id', attemptId);
    } catch (err) {
      // If column error, retry with minimal payload
      if (err.message && (err.message.indexOf('column') !== -1 || err.code === 'PGRST204')) {
        try {
          await sb.from('quiz_attempts').update({ answers: answers }).eq('id', attemptId);
        } catch (_) {}
      } else {
        console.error('save error', err);
      }
    }
  }

  function nextQuestion() {
    // If last question, submit
    if (currentIndex === questions.length - 1) {
      submitQuiz();
      return;
    }
    currentIndex = Math.min(questions.length - 1, currentIndex + 1);
    renderQuestion(currentIndex);
  }

  function prevQuestion() {
    if (currentIndex === 0) return;
    currentIndex = Math.max(0, currentIndex - 1);
    renderQuestion(currentIndex);
  }

  async function submitQuiz() {
    if (hasSubmitted) return;
    hasSubmitted = true;
    stopTimer();
    try {
      // Compute score
      var finalScore = 0;
      for (var si = 0; si < questions.length; si++) {
        var qs = questions[si];
        var as = answers[si];
        if (typeof as === 'number' && as === qs.correct_answer) finalScore++;
      }

      var finalElapsed = elapsedSeconds;
      var timeLimitSec = (currentWeek.time_limit_minutes || 0) * 60 + 30;
      if (timeLimitSec > 30 && finalElapsed > timeLimitSec) {
        finalScore = 0; // exceeded time limit
      }

      // Update attempt with result — try full payload first, fallback to minimal
      var updatePayload = {
        score: finalScore,
        answers: answers,
        time_spent_seconds: finalElapsed,
        status: 'completed'
      };
      try {
        var ur = await sb.from('quiz_attempts').update(updatePayload).eq('id', attemptId);
        if (ur.error && (ur.error.message.indexOf('column') !== -1 || ur.error.code === 'PGRST204')) {
          // Columns missing — retry minimal
          await sb.from('quiz_attempts').update({ score: finalScore, answers: answers }).eq('id', attemptId);
        } else if (ur.error) {
          console.error('submit update error', ur.error);
        }
      } catch (e) {
        console.error('submit update exception', e);
      }

      renderResults({ score: finalScore, total_questions: questions.length, time_spent_seconds: finalElapsed, answers: answers });
    } catch (err) {
      console.error('submit error', err);
      showToast('Unable to submit quiz. Try again.', 'error');
      hasSubmitted = false;
      startTimer();
    }
  }

  function renderResultsFromAttempt(attempt) {
    // Handle both old (time_spent_seconds) and new (elapsed_seconds) column names
    var timeSpent = attempt.time_spent_seconds || attempt.elapsed_seconds || 0;
    renderResults({ score: attempt.score || 0, total_questions: attempt.total_questions || questions.length, time_spent_seconds: timeSpent, answers: attempt.answers || [] });
  }

  function renderResults(payload) {
    showView('quiz-results');
    const scoreEl = document.getElementById('quiz-score-display');
    scoreEl.innerHTML = '<div class="quiz-score-number">' + (payload.score || 0) + '/' + (payload.total_questions || questions.length) + '</div>';
    const stats = document.getElementById('quiz-stats');
    stats.innerHTML = '<div class="body-sm">Time: ' + formatTime(payload.time_spent_seconds || 0) + '</div>';

    const review = document.getElementById('quiz-answers-review');
    review.innerHTML = '';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const userA = (payload.answers && payload.answers[i]);
      const correct = q.correct_answer;
      const item = document.createElement('div');
      item.className = 'quiz-review-item ' + (userA === correct ? 'correct' : 'incorrect');
      item.innerHTML = '<div style="font-weight:600;">' + (i+1) + '. ' + escHtml(q.question_text) + '</div>' +
        '<div style="margin-top:6px;">Your answer: ' + (typeof userA === 'number' ? String.fromCharCode(65+userA) + ' — ' + escHtml(q.options[userA] || '') : '<em>No answer</em>') + '</div>' +
        '<div style="margin-top:6px; color:var(--color-dark-secondary);">Correct: ' + String.fromCharCode(65+correct) + ' — ' + escHtml(q.options[correct]) + '</div>';
      review.appendChild(item);
    }
  }

  function startTimer() {
    stopTimer();
    const total = (currentWeek.time_limit_minutes || 0) * 60;
    let remaining = Math.max(0, total - elapsedSeconds);
    const el = document.getElementById('quiz-timer');
    if (!el) return;
    el.textContent = formatTime(remaining);
    timerInterval = setInterval(function(){
      remaining--;
      elapsedSeconds++;
      if (remaining <= 0) {
        stopTimer();
        el.textContent = '00:00';
        submitQuiz();
        return;
      }
      el.textContent = formatTime(remaining);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function formatTime(s) {
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const sec = (s%60).toString().padStart(2,'0');
    return m + ':' + sec;
  }

  function escHtml(str) {
    if (!str) return '';
    const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
  }

  function showUnavailable(msg) {
    const title = document.getElementById('unavailable-title');
    const msgEl = document.getElementById('unavailable-message');
    if (title) title.textContent = 'No quiz available';
    if (msgEl) msgEl.textContent = msg || 'Check back later.';
    showView('quiz-unavailable');
  }

  function showToast(msg, type) {
    type = type || 'success';
    const t = document.createElement('div'); t.className = 'admin-toast toast-' + type; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(()=> t.classList.add('toast-visible'));
    setTimeout(()=> { t.classList.remove('toast-visible'); setTimeout(()=> t.remove(),300); }, 2500);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

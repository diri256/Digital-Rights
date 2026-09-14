'use strict';

(function () {
  const sb = window.diriSupabase;
  const requiredLessonIds = [
    'privacy',
    'cybersecurity',
    'governance',
    'ai',
    'rights',
    'scams',
    'identity',
    'mobile-money',
    'misinformation'
  ];

  document.addEventListener('DOMContentLoaded', async function () {
    const modal = document.querySelector('[data-lesson-modal]');
    if (!modal) return;

    const completeButton = modal.querySelector('[data-complete-lesson]');
    const completionTitle = modal.querySelector('[data-lesson-completion-title]');
    const completionDetail = modal.querySelector('[data-lesson-completion-detail]');
    const cardCounter = modal.querySelector('[data-card-counter]');
    const libraryProgress = document.querySelector('[data-course-library-progress]');
    let session = null;
    let activeLessonId = null;
    let activeLessonTitle = null;
    const completedLessons = new Set();

    if (sb) {
      const sessionResult = await sb.auth.getSession();
      session = sessionResult.data.session;
      if (session && session.user) {
        const progressResult = await sb.from('lesson_progress')
          .select('lesson_id,status')
          .eq('user_id', session.user.id);
        if (!progressResult.error) {
          (progressResult.data || []).forEach(function (item) {
            if (item.status === 'completed') completedLessons.add(item.lesson_id);
          });
          if (libraryProgress) libraryProgress.classList.remove('hidden');
        }
      }
    }

    if ((!session || !session.user) && libraryProgress) {
      libraryProgress.classList.remove('hidden');
      libraryProgress.innerHTML = '<div><strong>Track your course progress</strong><span>Sign in to save completed lessons to your DIRI account.</span></div>' +
        '<div class="course-library-progress-track" role="progressbar" aria-label="Online lesson completion" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0"><span></span></div>' +
        '<a href="login.html?redirect=learn.html">Sign in to track progress &rarr;</a>';
    }

    function refreshLibraryProgress() {
      const completedCount = requiredLessonIds.filter(function (id) { return completedLessons.has(id); }).length;
      document.querySelectorAll('[data-lesson-id]').forEach(function (card) {
        const id = card.dataset.lessonId;
        const body = card.querySelector('.topic-body');
        let badge = card.querySelector('.lesson-complete-badge');
        if (completedLessons.has(id)) {
          if (!badge && body) {
            badge = document.createElement('span');
            badge.className = 'lesson-complete-badge';
            badge.textContent = 'Completed';
            body.insertBefore(badge, body.firstChild);
          }
          const startButton = card.querySelector('[data-open-lesson]');
          if (startButton) startButton.textContent = 'Review lesson';
        } else if (badge) {
          badge.remove();
        }
      });

      const count = document.querySelector('[data-library-completed]');
      const progressbar = document.querySelector('[data-library-progressbar]');
      const fill = document.querySelector('[data-library-progress-fill]');
      if (count) count.textContent = completedCount;
      if (progressbar) progressbar.setAttribute('aria-valuenow', String(completedCount));
      if (fill) fill.style.width = ((completedCount / requiredLessonIds.length) * 100) + '%';
    }

    function cardsAreComplete() {
      const match = cardCounter && cardCounter.textContent.match(/Card\s+(\d+)\s+of\s+(\d+)/i);
      return Boolean(match && Number(match[1]) === Number(match[2]));
    }

    function refreshCompletionControl() {
      if (!activeLessonId) return;
      if (completedLessons.has(activeLessonId)) {
        completionTitle.textContent = 'Lesson completed';
        completionDetail.textContent = 'This lesson is saved in your DIRI learning record.';
        completeButton.textContent = 'Completed';
        completeButton.disabled = true;
        return;
      }
      if (!session || !session.user) {
        completionTitle.textContent = 'Sign in to save progress';
        completionDetail.textContent = 'Your lesson completion must be linked to a DIRI account.';
        completeButton.textContent = 'Sign in to save progress';
        completeButton.disabled = false;
        return;
      }
      const ready = cardsAreComplete();
      completionTitle.textContent = ready ? 'Ready to complete' : 'Complete this lesson';
      completionDetail.textContent = ready
        ? 'Save this lesson to your certificate pathway.'
        : 'Read all lesson cards, then save your completion.';
      completeButton.textContent = ready ? 'Mark lesson complete' : 'Read all cards to complete';
      completeButton.disabled = !ready;
    }

    async function recordLessonStart() {
      if (!sb || !session || !session.user || !activeLessonId || completedLessons.has(activeLessonId)) return;
      const result = await sb.from('lesson_progress').insert({
        user_id: session.user.id,
        lesson_id: activeLessonId,
        lesson_title: activeLessonTitle,
        status: 'started'
      });
      if (result.error && result.error.code !== '23505') console.error('Unable to save lesson start:', result.error);
    }

    document.querySelectorAll('[data-open-lesson]').forEach(function (button) {
      button.addEventListener('click', function () {
        activeLessonId = button.dataset.openLesson;
        const card = button.closest('[data-lesson-id]');
        const title = card && card.querySelector('h3');
        activeLessonTitle = title ? title.textContent.trim() : 'DIRI lesson';
        recordLessonStart();
        window.setTimeout(refreshCompletionControl, 0);
      });
    });

    completeButton.addEventListener('click', async function () {
      if (!session || !session.user) {
        window.location.href = 'login.html?redirect=learn.html';
        return;
      }
      if (!activeLessonId || !cardsAreComplete()) return;

      completeButton.disabled = true;
      completeButton.textContent = 'Saving...';
      const now = new Date().toISOString();
      const result = await sb.from('lesson_progress').upsert({
        user_id: session.user.id,
        lesson_id: activeLessonId,
        lesson_title: activeLessonTitle,
        status: 'completed',
        completed_at: now,
        updated_at: now
      }, { onConflict: 'user_id,lesson_id' });

      if (result.error) {
        completionTitle.textContent = 'Progress was not saved';
        completionDetail.textContent = 'Please try again. If this continues, contact diriuganda@gmail.com.';
        completeButton.disabled = false;
        completeButton.textContent = 'Try again';
        return;
      }

      completedLessons.add(activeLessonId);
      refreshLibraryProgress();
      refreshCompletionControl();
    });

    if (cardCounter) new MutationObserver(refreshCompletionControl).observe(cardCounter, { childList: true, subtree: true });
    refreshLibraryProgress();
  });
})();

(function () {
  'use strict';

  const sb = window.diriSupabase;
  const podium = document.querySelector('[data-leaderboard-podium]');
  const rowsContainer = document.querySelector('[data-leaderboard-rows]');
  const note = document.querySelector('[data-leaderboard-note]');
  const tabs = Array.from(document.querySelectorAll('[data-leaderboard-tab]'));
  let signedIn = false;
  let activePeriod = 'weekly';

  function escapeHtml(value) {
    const node = document.createElement('div');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
  }

  function initials(name) {
    const letters = String(name || 'DIRI Learner').trim().split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join('');
    return letters || 'DL';
  }

  function formatTime(totalSeconds) {
    const total = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = Math.floor(total % 60);
    return hours
      ? hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
      : minutes + ':' + String(seconds).padStart(2, '0');
  }

  function periodLabel(period) {
    if (period === 'monthly') return 'this month';
    if (period === 'all-time') return 'across all quizzes';
    return 'in the current quiz';
  }

  function setBusy(isBusy) {
    tabs.forEach(function (tab) { tab.disabled = isBusy; });
  }

  function renderState(message, actionHtml) {
    if (podium) podium.innerHTML = '';
    if (rowsContainer) {
      rowsContainer.innerHTML = '<div class="leaderboard-state"><p>' + escapeHtml(message) + '</p>' + (actionHtml || '') + '</div>';
    }
  }

  function podiumCard(entry, place) {
    if (!entry) return '<div class="podium-place is-empty" aria-hidden="true"></div>';
    const medal = place === 1 ? 'gold' : (place === 2 ? 'silver' : 'bronze');
    return '<article class="podium-place podium-' + medal + (entry.is_current_user ? ' is-current-user' : '') + '">' +
      '<div class="podium-avatar">' + escapeHtml(initials(entry.display_name)) + '</div>' +
      '<strong>' + escapeHtml(entry.display_name) + (entry.is_current_user ? ' <span>(You)</span>' : '') + '</strong>' +
      '<small>' + Number(entry.score_points || 0).toLocaleString('en-UG') + ' pts · ' + formatTime(entry.time_seconds) + '</small>' +
      '<div class="podium-step"><span>' + place + (place === 1 ? 'st' : (place === 2 ? 'nd' : 'rd')) + '</span></div>' +
      '</article>';
  }

  function renderLeaderboard(entries) {
    if (!entries.length) {
      renderState('No completed quiz attempts ' + periodLabel(activePeriod) + ' yet.', '<a class="btn btn-primary btn-sm" href="quiz.html">Take the quiz</a>');
      if (note) note.textContent = 'Be the first learner on this leaderboard.';
      return;
    }

    if (podium) {
      podium.innerHTML = podiumCard(entries[1], 2) + podiumCard(entries[0], 1) + podiumCard(entries[2], 3);
    }

    if (rowsContainer) {
      rowsContainer.innerHTML = entries.map(function (entry) {
        const rank = Number(entry.leaderboard_rank || 0);
        const medal = rank === 1 ? ' gold' : (rank === 2 ? ' silver' : (rank === 3 ? ' bronze' : ''));
        const quizCount = Number(entry.quizzes_completed || 0);
        return '<div class="leaderboard-row' + (entry.is_current_user ? ' is-current-user' : '') + '">' +
          '<span class="rank' + medal + '">' + rank + '</span>' +
          '<div class="player"><div class="avatar">' + escapeHtml(initials(entry.display_name)) + '</div><div>' +
          '<div class="player-name">' + escapeHtml(entry.display_name) + (entry.is_current_user ? ' <span class="you-label">You</span>' : '') + '</div>' +
          '<div class="player-flag">' + quizCount + ' quiz' + (quizCount === 1 ? '' : 'zes') + ' completed</div></div></div>' +
          '<span class="score">' + Number(entry.score_points || 0).toLocaleString('en-UG') + ' pts</span>' +
          '<span class="time">' + formatTime(entry.time_seconds) + '</span></div>';
      }).join('');
    }

    const currentEntry = entries.find(function (entry) { return entry.is_current_user; });
    if (note) {
      note.textContent = currentEntry
        ? 'You are ranked #' + currentEntry.leaderboard_rank + ' ' + periodLabel(activePeriod) + '.'
        : 'Complete a quiz to join this leaderboard.';
    }
  }

  async function loadLeaderboard(period) {
    activePeriod = period;
    tabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.leaderboardTab === period);
    });

    if (!signedIn) {
      renderState('Sign in to view real learner rankings.', '<a class="btn btn-primary btn-sm" href="login.html?redirect=leaderboard.html">Sign in</a>');
      if (note) note.textContent = 'Leaderboard entries are based on completed DIRI quizzes.';
      return;
    }

    setBusy(true);
    renderState('Loading real quiz rankings...');
    const result = await sb.rpc('get_quiz_leaderboard', { p_period: period });
    setBusy(false);

    if (result.error) {
      console.error('leaderboard load error', result.error);
      renderState('The leaderboard is temporarily unavailable. Please try again shortly.');
      if (note) note.textContent = 'Your completed quiz score remains saved.';
      return;
    }

    renderLeaderboard(result.data || []);
  }

  async function init() {
    if (!podium || !rowsContainer) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        loadLeaderboard(tab.dataset.leaderboardTab || 'weekly');
      });
    });

    if (!sb) {
      renderState('The leaderboard is temporarily unavailable.');
      return;
    }

    const sessionResult = await sb.auth.getSession();
    signedIn = Boolean(sessionResult.data.session && sessionResult.data.session.user);
    await loadLeaderboard('weekly');
  }

  document.addEventListener('DOMContentLoaded', init);
})();

/* =============================================
   DIRI - Admin Panel
   Question bank & weekly quiz management
   ============================================= */

'use strict';

(function () {
  const sb = window.diriSupabase;
  if (!sb) {
    document.body.innerHTML =
      '<div style="padding:2rem;text-align:center;font-family:sans-serif;">' +
      '<h2>Supabase client not available</h2>' +
      '<p>Please check your connection and try again.</p></div>';
    return;
  }

  let currentUser = null;
  let currentUserRole = null;
  let questionsCache = [];
  let weeksCache = [];

  /* -----------------------------------------
     AUTH & ACCESS CONTROL
     ----------------------------------------- */
  async function checkAccess() {
    const sessionResult = await sb.auth.getSession();
    const session = sessionResult.data.session;
    if (!session || !session.user) {
      window.location.href = 'login.html';
      return false;
    }
    currentUser = session.user;

    // Fetch profile to get the role
    const profileResult = await sb.from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (profileResult.error) {
      console.error('Failed to load profile:', profileResult.error);
      showAccessDenied('Could not verify your account permissions.');
      return false;
    }

    const role = (profileResult.data && profileResult.data.role) || 'user';
    currentUserRole = role;

    if (role !== 'admin' && role !== 'policymaker') {
      showAccessDenied('You do not have permission to access this page.');
      return false;
    }

    // Show the logout button
    const logoutBtns = document.querySelectorAll('#admin-logout-btn, #admin-logout-btn-mobile');
    logoutBtns.forEach(function (btn) { btn.style.display = ''; });

    // Show the role badge
    const badge = document.getElementById('admin-role-badge');
    if (badge) {
      badge.textContent = role === 'admin' ? 'Super Admin' : 'Policymaker';
      badge.className = 'admin-role-badge ' + (role === 'admin' ? 'badge-admin' : 'badge-policymaker');
    }

    // Show access tab only for admins
    if (role === 'admin') {
      document.getElementById('access-tab').style.display = '';
    }

    return true;
  }

  function showAccessDenied(message) {
    document.querySelector('.admin-layout').innerHTML =
      '<div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;min-height:80vh;">' +
      '<div style="text-align:center;max-width:400px;">' +
      '<h1 class="heading-lg" style="margin-bottom:var(--space-4);">Access Denied</h1>' +
      '<p class="body-md" style="margin-bottom:var(--space-6);">' + message + '</p>' +
      '<a href="index.html" class="btn btn-primary">Back to Home</a>' +
      '</div></div>';
  }

  /* -----------------------------------------
     TAB SWITCHING
     ----------------------------------------- */
  function setupTabs() {
    document.querySelectorAll('.admin-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        const tabName = this.getAttribute('data-tab');
        switchTab(tabName);
      });
    });

    // Quick action buttons that target a tab
    document.querySelectorAll('[data-tab-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(this.getAttribute('data-tab-target'));
      });
    });
  }

  function switchTab(name) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === name);
    });

    // Show/hide panels
    document.querySelectorAll('.admin-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'panel-' + name);
    });

    // Refresh data when switching to a tab
    if (name === 'dashboard') loadDashboard();
    else if (name === 'questions') loadQuestions();
    else if (name === 'weeks') loadWeeks();
    else if (name === 'access') loadAccessList();
  }

  /* -----------------------------------------
     DASHBOARD
     ----------------------------------------- */
  async function loadDashboard() {
    try {
      // Count questions
      const { count: totalQ, error: errQ } = await sb
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true });
      if (errQ) throw errQ;

      const { count: activeQ, error: errAQ } = await sb
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      if (errAQ) throw errAQ;

      // Count weeks
      const { count: totalW, error: errW } = await sb
        .from('quiz_weeks')
        .select('*', { count: 'exact', head: true });
      if (errW) throw errW;

      const { count: pubW, error: errPW } = await sb
        .from('quiz_weeks')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);
      if (errPW) throw errPW;

      document.getElementById('stat-total-questions').textContent = totalQ || 0;
      document.getElementById('stat-active-questions').textContent = activeQ || 0;
      document.getElementById('stat-total-weeks').textContent = totalW || 0;
      document.getElementById('stat-published-weeks').textContent = pubW || 0;
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }

  /* -----------------------------------------
     QUESTIONS - CRUD
     ----------------------------------------- */
  async function loadQuestions() {
    const tbody = document.getElementById('questions-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center body-sm" style="padding: var(--space-10);">Loading questions...</td></tr>';

    try {
      const { data, error } = await sb
        .from('quiz_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      questionsCache = data || [];

      // Apply local filters
      const searchVal = (document.getElementById('question-search').value || '').toLowerCase().trim();
      const catFilter = document.getElementById('question-category-filter').value;
      const statusFilter = document.getElementById('question-status-filter').value;

      const filtered = questionsCache.filter(function (q) {
        if (catFilter !== 'all' && q.category !== catFilter) return false;
        if (statusFilter === 'active' && !q.is_active) return false;
        if (statusFilter === 'inactive' && q.is_active) return false;
        if (searchVal && !q.question_text.toLowerCase().includes(searchVal)) return false;
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center body-sm" style="padding: var(--space-10);">No questions found. Create your first question!</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(function (q, i) {
        const catLabel = categoryLabel(q.category);
        return '<tr>' +
          '<td>' + (i + 1) + '</td>' +
          '<td><div class="admin-question-text">' + escHtml(q.question_text) + '</div></td>' +
          '<td><span class="admin-category-badge cat-' + q.category + '">' + catLabel + '</span></td>' +
          '<td>' + escHtml(q.topic || '-') + '</td>' +
          '<td>' + (q.is_active
            ? '<span class="admin-status-badge status-active">Active</span>'
            : '<span class="admin-status-badge status-inactive">Inactive</span>') +
          '</td>' +
          '<td>' +
          '<button class="btn btn-sm btn-ghost admin-action-btn" data-action="edit-question" data-id="' + q.id + '">Edit</button> ' +
          '<button class="btn btn-sm btn-ghost admin-action-btn" style="color:var(--color-error);" data-action="delete-question" data-id="' + q.id + '">Delete</button>' +
          '</td>' +
          '</tr>';
      }).join('');

      // Attach action events
      tbody.querySelectorAll('[data-action="edit-question"]').forEach(function (btn) {
        btn.addEventListener('click', function () { editQuestion(this.getAttribute('data-id')); });
      });
      tbody.querySelectorAll('[data-action="delete-question"]').forEach(function (btn) {
        btn.addEventListener('click', function () { deleteQuestion(this.getAttribute('data-id')); });
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center body-sm" style="padding: var(--space-10); color: var(--color-error);">Error loading questions: ' + escHtml(err.message) + '</td></tr>';
    }
  }

  function openQuestionModal(question) {
    const isEdit = !!question;
    document.getElementById('question-modal-title').textContent = isEdit ? 'Edit Question' : 'New Question';
    document.getElementById('question-id').value = isEdit ? question.id : '';
    document.getElementById('question-text').value = isEdit ? question.question_text : '';

    if (isEdit && question.options) {
      question.options.forEach(function (opt, idx) {
        document.getElementById('option-' + idx).value = opt;
      });
    } else {
      for (var i = 0; i < 4; i++) document.getElementById('option-' + i).value = '';
    }

    document.getElementById('correct-answer').value = isEdit ? String(question.correct_answer) : '0';
    document.getElementById('question-category').value = isEdit ? question.category : 'lesson';
    document.getElementById('question-topic').value = isEdit ? (question.topic || '') : '';
    document.getElementById('question-modal-message').textContent = '';
    document.getElementById('question-modal-message').className = 'admin-modal-message';
    document.getElementById('question-modal').classList.add('open');
  }

  async function saveQuestion() {
    const id = document.getElementById('question-id').value;
    const questionText = document.getElementById('question-text').value.trim();
    const options = [
      document.getElementById('option-0').value.trim(),
      document.getElementById('option-1').value.trim(),
      document.getElementById('option-2').value.trim(),
      document.getElementById('option-3').value.trim()
    ];
    const correctAnswer = parseInt(document.getElementById('correct-answer').value, 10);
    const category = document.getElementById('question-category').value;
    const topic = document.getElementById('question-topic').value.trim();

    // Validate
    if (!questionText) { showModalMessage('question-modal-message', 'Please enter the question text.', 'error'); return; }
    for (var i = 0; i < 4; i++) {
      if (!options[i]) { showModalMessage('question-modal-message', 'Please fill in all four options.', 'error'); return; }
    }

    const payload = {
      question_text: questionText,
      options: options,
      correct_answer: correctAnswer,
      category: category,
      topic: topic
    };

    try {
      if (id) {
        const { error } = await sb.from('quiz_questions').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        payload.created_by = currentUser.id;
        const { error } = await sb.from('quiz_questions').insert(payload);
        if (error) throw error;
      }
      closeModal('question-modal');
      loadQuestions();
      showToast(id ? 'Question updated.' : 'Question created.');
    } catch (err) {
      showModalMessage('question-modal-message', err.message, 'error');
    }
  }

  async function editQuestion(id) {
    const q = questionsCache.find(function (x) { return x.id === id; });
    if (q) openQuestionModal(q);
  }

  function deleteQuestion(id) {
    openConfirmModal(
      'Are you sure you want to delete this question? This action cannot be undone.',
      async function () {
        try {
          const { error } = await sb.from('quiz_questions').delete().eq('id', id);
          if (error) throw error;
          closeModal('confirm-modal');
          loadQuestions();
          showToast('Question deleted.');
        } catch (err) {
          showModalMessage('confirm-modal-message', err.message, 'error');
        }
      }
    );
  }

  /* -----------------------------------------
     WEEKS - CRUD
     ----------------------------------------- */
  async function loadWeeks() {
    const tbody = document.getElementById('weeks-tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center body-sm" style="padding: var(--space-10);">Loading weeks...</td></tr>';

    try {
      const { data, error } = await sb
        .from('quiz_weeks')
        .select('*')
        .order('week_number', { ascending: false });

      if (error) throw error;
      weeksCache = data || [];

      if (weeksCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center body-sm" style="padding: var(--space-10);">No weeks yet. Create your first weekly quiz!</td></tr>';
        return;
      }

      tbody.innerHTML = weeksCache.map(function (w) {
        var qCount = (w.question_ids || []).length;
        var statusLabel = w.is_published ? 'Published' : 'Draft';
        var statusClass = w.is_published ? 'status-active' : 'status-inactive';
        return '<tr>' +
          '<td>' + w.week_number + '</td>' +
          '<td><strong>' + escHtml(w.title) + '</strong></td>' +
          '<td><div class="admin-question-text">' + escHtml(w.description || '-') + '</div></td>' +
          '<td>' + qCount + '/10</td>' +
          '<td>' + w.time_limit_minutes + ' min</td>' +
          '<td><span class="admin-status-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
          '<td>' +
          '<button class="btn btn-sm btn-ghost admin-action-btn" data-action="edit-week" data-id="' + w.id + '">Edit</button> ' +
          '<button class="btn btn-sm btn-ghost admin-action-btn" style="color:var(--color-error);" data-action="delete-week" data-id="' + w.id + '">Delete</button>' +
          '</td>' +
          '</tr>';
      }).join('');

      tbody.querySelectorAll('[data-action="edit-week"]').forEach(function (btn) {
        btn.addEventListener('click', function () { editWeek(this.getAttribute('data-id')); });
      });
      tbody.querySelectorAll('[data-action="delete-week"]').forEach(function (btn) {
        btn.addEventListener('click', function () { deleteWeek(this.getAttribute('data-id')); });
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center body-sm" style="padding: var(--space-10); color: var(--color-error);">Error: ' + escHtml(err.message) + '</td></tr>';
    }
  }

  async function openWeekModal(week) {
    const isEdit = !!week;

    document.getElementById('week-modal-title').textContent = isEdit ? 'Edit Week' : 'New Week';
    document.getElementById('week-id').value = isEdit ? week.id : '';
    document.getElementById('week-number').value = isEdit ? week.week_number : '';
    document.getElementById('week-title').value = isEdit ? week.title : '';
    document.getElementById('week-description').value = isEdit ? (week.description || '') : '';
    document.getElementById('week-timer').value = isEdit ? week.time_limit_minutes : 15;
    document.getElementById('week-modal-message').textContent = '';
    document.getElementById('week-modal-message').className = 'admin-modal-message';

    // Load available questions for selection
    await loadWeekQuestions(isEdit ? (week.question_ids || []) : []);
    document.getElementById('week-modal').classList.add('open');
  }

  async function loadWeekQuestions(selectedIds) {
    const container = document.getElementById('week-questions-container');
    container.innerHTML = '<p class="body-sm" style="color: var(--color-dark-secondary);">Loading questions...</p>';

    try {
      const { data, error } = await sb
        .from('quiz_questions')
        .select('id, question_text, category, topic')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      var available = data || [];

      if (available.length === 0) {
        container.innerHTML = '<p class="body-sm" style="color: var(--color-dark-secondary);">No active questions available. Create some questions first.</p>';
        document.getElementById('week-question-count').textContent = '0';
        return;
      }

      var selectedSet = {};
      (selectedIds || []).forEach(function (id) { selectedSet[id] = true; });

      container.innerHTML = available.map(function (q) {
        var checked = selectedSet[q.id] ? 'checked' : '';
        var catLabel = categoryLabel(q.category);
        return '<label class="admin-week-question-item">' +
          '<input type="checkbox" value="' + q.id + '" ' + checked + ' class="week-question-cb">' +
          '<div class="admin-week-question-info">' +
          '<div class="admin-week-question-text">' + escHtml(q.question_text) + '</div>' +
          '<div><span class="admin-category-badge cat-' + q.category + '" style="font-size:11px;">' + catLabel + '</span> ' +
          '<span class="body-sm" style="color:var(--color-dark-secondary);font-size:11px;">' + escHtml(q.topic || '-') + '</span></div>' +
          '</div>' +
          '</label>';
      }).join('');

      updateWeekCount();

      // Listen for checkbox changes
      container.querySelectorAll('.week-question-cb').forEach(function (cb) {
        cb.addEventListener('change', updateWeekCount);
      });

    } catch (err) {
      container.innerHTML = '<p class="body-sm" style="color: var(--color-error);">Error loading questions: ' + escHtml(err.message) + '</p>';
    }
  }

  function updateWeekCount() {
    var checked = document.querySelectorAll('.week-question-cb:checked').length;
    document.getElementById('week-question-count').textContent = checked;
  }

  async function saveWeek() {
    const id = document.getElementById('week-id').value;
    const weekNumber = parseInt(document.getElementById('week-number').value, 10);
    const title = document.getElementById('week-title').value.trim();
    const description = document.getElementById('week-description').value.trim();
    const timer = parseInt(document.getElementById('week-timer').value, 10) || 15;
    const selectedCbs = document.querySelectorAll('.week-question-cb:checked');
    const questionIds = Array.from(selectedCbs).map(function (cb) { return cb.value; });

    // Validate
    if (!weekNumber || weekNumber < 1) { showModalMessage('week-modal-message', 'Please enter a valid week number.', 'error'); return; }
    if (!title) { showModalMessage('week-modal-message', 'Please enter a week title.', 'error'); return; }
    if (questionIds.length === 0) { showModalMessage('week-modal-message', 'Please select at least one question.', 'error'); return; }
    if (questionIds.length > 10) { showModalMessage('week-modal-message', 'Maximum 10 questions per week.', 'error'); return; }

    const payload = {
      week_number: weekNumber,
      title: title,
      description: description,
      question_ids: questionIds,
      time_limit_minutes: timer
    };

    try {
      if (id) {
        const { error } = await sb.from('quiz_weeks').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        payload.created_by = currentUser.id;
        const { error } = await sb.from('quiz_weeks').insert(payload);
        if (error) throw error;
      }
      closeModal('week-modal');
      loadWeeks();
      showToast(id ? 'Week updated.' : 'Week created.');
    } catch (err) {
      showModalMessage('week-modal-message', err.message, 'error');
    }
  }

  async function editWeek(id) {
    const w = weeksCache.find(function (x) { return x.id === id; });
    if (w) openWeekModal(w);
  }

  function deleteWeek(id) {
    openConfirmModal(
      'Are you sure you want to delete this week? Any quiz attempts linked to it will also be removed.',
      async function () {
        try {
          const { error } = await sb.from('quiz_weeks').delete().eq('id', id);
          if (error) throw error;
          closeModal('confirm-modal');
          loadWeeks();
          showToast('Week deleted.');
        } catch (err) {
          showModalMessage('confirm-modal-message', err.message, 'error');
        }
      }
    );
  }

  /* -----------------------------------------
     ACCESS MANAGEMENT (admin only)
     ----------------------------------------- */
  async function loadAccessList() {
    const tbody = document.getElementById('access-tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center body-sm" style="padding: var(--space-10);">Loading users...</td></tr>';

    try {
      const { data, error } = await sb
        .from('profiles')
        .select('id, username, email, role')
        .order('created_at', { ascending: false });

      if (error) throw error;
      var users = data || [];

      var searchVal = (document.getElementById('access-search').value || '').toLowerCase().trim();
      if (searchVal) {
        users = users.filter(function (u) {
          return (u.username || '').toLowerCase().includes(searchVal) ||
                 (u.email || '').toLowerCase().includes(searchVal);
        });
      }

      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center body-sm" style="padding: var(--space-10);">No users found.</td></tr>';
        return;
      }

      tbody.innerHTML = users.map(function (u) {
        var role = u.role || 'user';
        var roleLabel = role === 'admin' ? 'Super Admin' : role === 'policymaker' ? 'Policymaker' : 'User';
        return '<tr>' +
          '<td><strong>' + escHtml(u.username || 'Unknown') + '</strong></td>' +
          '<td class="body-sm">' + escHtml(u.email || '-') + '</td>' +
          '<td><span class="admin-role-badge badge-' + role + '">' + roleLabel + '</span></td>' +
          '<td>' +
          '<select class="form-input role-select" data-user-id="' + u.id + '" style="width:auto;">' +
          '<option value="user"' + (role === 'user' ? ' selected' : '') + '>User</option>' +
          '<option value="policymaker"' + (role === 'policymaker' ? ' selected' : '') + '>Policymaker</option>' +
          '<option value="admin"' + (role === 'admin' ? ' selected' : '') + '>Super Admin</option>' +
          '</select>' +
          '</td>' +
          '</tr>';
      }).join('');

      // Attach role change events
      tbody.querySelectorAll('.role-select').forEach(function (select) {
        select.addEventListener('change', async function () {
          var userId = this.getAttribute('data-user-id');
          var newRole = this.value;
          if (!confirm('Change this user\'s role to "' + newRole + '"?')) {
            // Revert to original
            loadAccessList();
            return;
          }
          try {
            var { error } = await sb.from('profiles').update({ role: newRole }).eq('id', userId);
            if (error) throw error;
            showToast('Role updated to ' + newRole + '.');
          } catch (err) {
            showToast('Error: ' + err.message, 'error');
            loadAccessList();
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center body-sm" style="padding: var(--space-10); color: var(--color-error);">Error: ' + escHtml(err.message) + '</td></tr>';
    }
  }

  /* -----------------------------------------
     MODAL HELPERS
     ----------------------------------------- */
  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
  }

  function showModalMessage(id, text, type) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'admin-modal-message ' + (type || '');
  }

  function openConfirmModal(message, onConfirm) {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal-message').textContent = '';
    document.getElementById('confirm-modal-message').className = 'admin-modal-message';

    var confirmBtn = document.getElementById('confirm-modal-confirm');
    // Replace old listener
    var newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', onConfirm);

    document.getElementById('confirm-modal').classList.add('open');
  }

  /* -----------------------------------------
     TOAST NOTIFICATION
     ----------------------------------------- */
  function showToast(message, type) {
    type = type || 'success';
    var existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'admin-toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('toast-visible');
    });

    setTimeout(function () {
      toast.classList.remove('toast-visible');
      setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
  }

  /* -----------------------------------------
     UTILITY
     ----------------------------------------- */
  function categoryLabel(cat) {
    var labels = {
      'lesson': 'Lesson',
      'current_issue': 'Current Issue',
      'scenario': 'Scenario',
      'hidden_check': 'Hidden Check'
    };
    return labels[cat] || cat;
  }

  function escHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* -----------------------------------------
     EVENT BINDING
     ----------------------------------------- */
  function init() {
    setupTabs();
    loadDashboard();

    // Question modal
    document.getElementById('btn-new-question').addEventListener('click', function () { openQuestionModal(null); });
    document.getElementById('question-modal-save').addEventListener('click', saveQuestion);
    document.getElementById('question-modal-close').addEventListener('click', function () { closeModal('question-modal'); });
    document.getElementById('question-modal-cancel').addEventListener('click', function () { closeModal('question-modal'); });
    document.getElementById('question-modal').addEventListener('click', function (e) {
      if (e.target === this) closeModal('question-modal');
    });

    // Week modal
    document.getElementById('btn-new-week').addEventListener('click', function () { openWeekModal(null); });
    document.getElementById('week-modal-save').addEventListener('click', saveWeek);
    document.getElementById('week-modal-close').addEventListener('click', function () { closeModal('week-modal'); });
    document.getElementById('week-modal-cancel').addEventListener('click', function () { closeModal('week-modal'); });
    document.getElementById('week-modal').addEventListener('click', function (e) {
      if (e.target === this) closeModal('week-modal');
    });

    // Confirm modal
    document.getElementById('confirm-modal-close').addEventListener('click', function () { closeModal('confirm-modal'); });
    document.getElementById('confirm-modal-cancel').addEventListener('click', function () { closeModal('confirm-modal'); });
    document.getElementById('confirm-modal').addEventListener('click', function (e) {
      if (e.target === this) closeModal('confirm-modal');
    });

    // Search / filter for questions
    document.getElementById('question-search').addEventListener('input', debounce(loadQuestions, 300));
    document.getElementById('question-category-filter').addEventListener('change', loadQuestions);
    document.getElementById('question-status-filter').addEventListener('change', loadQuestions);

    // Search for access
    document.getElementById('access-search').addEventListener('input', debounce(loadAccessList, 300));

    // Logout
    document.querySelectorAll('#admin-logout-btn, #admin-logout-btn-mobile').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        await sb.auth.signOut();
        window.location.href = 'index.html';
      });
    });
  }

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  /* -----------------------------------------
     BOOT
     ----------------------------------------- */
  checkAccess().then(function (granted) {
    if (granted) init();
  });

})();

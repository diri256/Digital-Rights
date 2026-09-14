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
  let newsCache = [];
  let newsBlocks = [];

  /* -----------------------------------------
     AUTH & ACCESS CONTROL
     ----------------------------------------- */
  async function checkAccess() {
    const sessionResult = await sb.auth.getSession();
    const session = sessionResult.data.session;
    if (!session || !session.user) {
      window.location.href = 'login.html?redirect=admin.html';
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
      document.getElementById('updates-tab').style.display = '';
      ['training-tab', 'cohorts-tab', 'certificates-tab'].forEach(function (id) {
        var tab = document.getElementById(id);
        if (tab) tab.style.display = '';
      });
      // Show pending requests section to admins
      var reqSection = document.getElementById('access-requests-section');
      if (reqSection) reqSection.style.display = '';
    }

    // Show the request access button to policymakers
    if (role === 'policymaker') {
      var btnReq = document.getElementById('btn-request-access');
      if (btnReq) btnReq.style.display = '';
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
    else if (name === 'updates') loadNews();
    else if (name === 'training') loadTrainingRequests();
    else if (name === 'cohorts') loadCohorts();
    else if (name === 'certificates') {
      loadCertificateRequests();
      loadCertificates();
    }
    else if (name === 'access') {
      loadAccessList();
      if (currentUserRole === 'admin') loadAccessRequests();
    }
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

      const { count: totalUsers, error: errUsers } = await sb
        .from('profiles').select('*', { count: 'exact', head: true });
      if (errUsers) throw errUsers;
      const { count: publishedNews, error: errNews } = await sb
        .from('news_articles').select('*', { count: 'exact', head: true }).eq('status', 'published');
      if (errNews) throw errNews;
      document.getElementById('stat-total-users').textContent = totalUsers || 0;
      document.getElementById('stat-published-news').textContent = publishedNews || 0;

      const requestCount = await sb.from('training_requests').select('*', { count: 'exact', head: true }).eq('status', 'new');
      const certificateCount = await sb.from('certificates').select('*', { count: 'exact', head: true }).eq('status', 'valid');
      var requestStat = document.getElementById('stat-training-requests');
      var certificateStat = document.getElementById('stat-valid-certificates');
      if (requestStat && !requestCount.error) requestStat.textContent = requestCount.count || 0;
      if (certificateStat && !certificateCount.error) certificateStat.textContent = certificateCount.count || 0;
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }

  /* -----------------------------------------
     UNIFIED TRAINING & CERTIFICATION
     ----------------------------------------- */
  async function loadTrainingRequests() {
    var tbody = document.getElementById('training-requests-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5">Loading requests...</td></tr>';
    var query = sb.from('training_requests').select('*').order('created_at', { ascending: false });
    var filter = document.getElementById('training-status-filter').value;
    if (filter !== 'all') query = query.eq('status', filter);
    var result = await query;
    if (result.error) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--color-error);">Unable to load requests: ' + escHtml(result.error.message) + '</td></tr>';
      return;
    }
    if (!result.data.length) {
      tbody.innerHTML = '<tr><td colspan="5">No training requests found.</td></tr>';
      return;
    }
    tbody.innerHTML = result.data.map(function (request) {
      return '<tr><td><strong>' + escHtml(request.organization_name) + '</strong><div class="body-sm">' + escHtml(request.contact_person) + '<br>' + escHtml(request.email) + '<br>' + escHtml(request.phone) + '</div></td>' +
        '<td>' + Number(request.participant_count || 0) + '<div class="body-sm">' + escHtml(request.participant_type) + '</div></td>' +
        '<td>' + escHtml(request.location) + '<div class="body-sm">' + (request.preferred_training_date || 'Flexible') + '</div></td>' +
        '<td class="body-sm">' + escHtml(request.training_topics) + '<br>Certification: ' + (request.certification_required ? 'Yes' : 'No / unsure') + '</td>' +
        '<td><select class="form-input training-request-status" data-id="' + request.id + '"><option value="new"' + selected(request.status, 'new') + '>New</option><option value="reviewing"' + selected(request.status, 'reviewing') + '>Reviewing</option><option value="quoted"' + selected(request.status, 'quoted') + '>Quoted</option><option value="accepted"' + selected(request.status, 'accepted') + '>Accepted</option><option value="declined"' + selected(request.status, 'declined') + '>Declined</option><option value="completed"' + selected(request.status, 'completed') + '>Completed</option></select></td></tr>';
    }).join('');
    tbody.querySelectorAll('.training-request-status').forEach(function (selectEl) {
      selectEl.addEventListener('change', async function () {
        var update = await sb.from('training_requests').update({ status: this.value, reviewed_by: currentUser.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', this.dataset.id);
        showToast(update.error ? update.error.message : 'Training request updated.', update.error ? 'error' : 'success');
      });
    });
  }

  function selected(current, value) { return current === value ? ' selected' : ''; }

  async function loadCohorts() {
    var cohortBody = document.getElementById('cohorts-tbody');
    var participantBody = document.getElementById('participants-tbody');
    var cohortSelect = document.getElementById('participant-cohort');
    if (!cohortBody) return;
    var cohortsResult = await sb.from('training_cohorts').select('*, training_organizations(name)').order('training_date', { ascending: false });
    var participantsResult = await sb.from('cohort_participants').select('*, training_cohorts(training_name)').order('enrolled_at', { ascending: false });
    if (cohortsResult.error) {
      cohortBody.innerHTML = '<tr><td colspan="6" style="color:var(--color-error);">' + escHtml(cohortsResult.error.message) + '</td></tr>';
      return;
    }
    var cohorts = cohortsResult.data || [];
    var participants = participantsResult.data || [];
    cohortSelect.innerHTML = cohorts.length ? cohorts.map(function (cohort) { return '<option value="' + cohort.id + '">' + escHtml(cohort.training_name) + '</option>'; }).join('') : '<option value="">Create a cohort first</option>';
    cohortBody.innerHTML = cohorts.length ? cohorts.map(function (cohort) {
      var count = participants.filter(function (person) { return person.cohort_id === cohort.id; }).length;
      return '<tr><td><strong>' + escHtml(cohort.training_name) + '</strong></td><td>' + escHtml(cohort.training_organizations ? cohort.training_organizations.name : '—') + '</td><td>' + escHtml(cohort.training_date) + '</td><td>' + Number(cohort.duration_hours || 4) + ' hours</td><td>' + count + '</td><td>' + escHtml(cohort.status) + '</td></tr>';
    }).join('') : '<tr><td colspan="6">No cohorts created yet.</td></tr>';
    if (!participantBody) return;
    participantBody.innerHTML = participants.length ? participants.map(function (person) {
      return '<tr><td><strong>' + escHtml(person.full_name) + '</strong><div class="body-sm">' + escHtml(person.email || 'Account not linked yet') + '</div></td><td>' + escHtml(person.training_cohorts ? person.training_cohorts.training_name : '—') + '</td>' +
        '<td>' + statusSelect('attendance', person.id, person.attendance_status, ['pending','present','partial','absent']) + '</td>' +
        '<td>' + statusSelect('assessment', person.id, person.assessment_status, ['not_started','in_progress','passed','not_passed','exempt']) + '</td>' +
        '<td><span class="certificate-pathway-badge" data-status="' + escHtml(person.certification_status) + '">' + escHtml(person.certification_status.replaceAll('_', ' ')) + '</span></td>' +
        '<td>' + (person.certification_status === 'revoked'
          ? '<span class="body-sm">Revoked — review the certificate record</span>'
          : (person.certification_status === 'issued'
          ? '<span class="body-sm">Digital certificate issued</span>'
          : (person.attendance_status === 'present' && ['passed', 'exempt'].includes(person.assessment_status)
            ? '<button type="button" class="btn btn-sm btn-primary generate-physical-certificate" data-id="' + person.id + '">Generate Digital Certificate</button>'
            : '<span class="body-sm">Record attendance and assessment first</span>'))) + '</td></tr>';
    }).join('') : '<tr><td colspan="6">No participants enrolled yet.</td></tr>';
    participantBody.querySelectorAll('.participant-status').forEach(function (control) {
      control.addEventListener('change', async function () {
        var field = this.dataset.field + '_status';
        var payload = { updated_at: new Date().toISOString() };
        payload[field] = this.value;
        var update = await sb.from('cohort_participants').update(payload).eq('id', this.dataset.id);
        showToast(update.error ? update.error.message : 'Participant record updated.', update.error ? 'error' : 'success');
        if (!update.error) loadCohorts();
      });
    });
    participantBody.querySelectorAll('.generate-physical-certificate').forEach(function (button) {
      button.addEventListener('click', function () { generatePhysicalCertificate(this.dataset.id); });
    });
  }

  function statusSelect(field, id, value, options) {
    return '<select class="form-input participant-status" data-field="' + field + '" data-id="' + id + '">' + options.map(function (option) { return '<option value="' + option + '"' + selected(value, option) + '>' + option.replaceAll('_', ' ') + '</option>'; }).join('') + '</select>';
  }

  async function createCohort(event) {
    event.preventDefault();
    var message = document.getElementById('cohort-form-message');
    var organizationResult = await sb.from('training_organizations').insert({
      name: document.getElementById('cohort-organization').value.trim(),
      organization_type: document.getElementById('cohort-type').value,
      location: document.getElementById('cohort-location').value.trim() || null,
      created_by: currentUser.id
    }).select('id').single();
    if (organizationResult.error) { message.textContent = organizationResult.error.message; message.className = 'auth-message error'; return; }
    var cohortResult = await sb.from('training_cohorts').insert({
      training_name: document.getElementById('cohort-name').value.trim(),
      organization_id: organizationResult.data.id,
      training_date: document.getElementById('cohort-date').value,
      duration_hours: Number(document.getElementById('cohort-duration').value),
      location: document.getElementById('cohort-location').value.trim() || null,
      created_by: currentUser.id
    });
    message.textContent = cohortResult.error ? cohortResult.error.message : 'Cohort created.';
    message.className = 'auth-message ' + (cohortResult.error ? 'error' : 'success');
    if (!cohortResult.error) { event.target.reset(); loadCohorts(); }
  }

  async function enrolParticipant(event) {
    event.preventDefault();
    var email = document.getElementById('participant-email').value.trim();
    var userId = null;
    if (email) {
      var profile = await sb.from('profiles').select('id').eq('email', email).maybeSingle();
      if (profile.data) userId = profile.data.id;
    }
    var result = await sb.from('cohort_participants').insert({
      cohort_id: document.getElementById('participant-cohort').value,
      user_id: userId,
      full_name: document.getElementById('participant-name').value.trim(),
      email: email || null,
      attendance_status: document.getElementById('participant-attendance').value,
      assessment_status: document.getElementById('participant-assessment').value
    });
    var message = document.getElementById('participant-form-message');
    message.textContent = result.error ? result.error.message : (userId ? 'Participant enrolled and linked to an existing DIRI account.' : 'Participant enrolled. Their account can be linked when activated.');
    message.className = 'auth-message ' + (result.error ? 'error' : 'success');
    if (!result.error) { event.target.reset(); loadCohorts(); }
  }

  async function generatePhysicalCertificate(participantId) {
    var result = await sb.rpc('issue_diri_physical_certificate', { p_participant_id: participantId });
    showToast(result.error ? result.error.message : 'Digital certificate generated from the verified training record.', result.error ? 'error' : 'success');
    if (!result.error) {
      loadCohorts();
      loadCertificates();
    }
  }

  async function loadCertificateRequests() {
    var tbody = document.getElementById('certificate-requests-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5">Loading verification requests...</td></tr>';
    var result = await sb.from('certificate_requests').select('*').eq('pathway', 'online').order('created_at', { ascending: false });
    if (result.error) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--color-error);">' + escHtml(result.error.message) + '</td></tr>';
      return;
    }
    var requests = result.data || [];
    tbody.innerHTML = requests.length ? requests.map(function (request) {
      var evidence = request.eligibility_snapshot || {};
      var actions = '';
      if (request.status === 'pending') actions += '<button type="button" class="btn btn-sm btn-outline review-certificate-request" data-id="' + request.id + '">Start Review</button> ';
      if (['pending', 'under_review', 'approved'].includes(request.status)) {
        actions += '<button type="button" class="btn btn-sm btn-primary approve-certificate-request" data-id="' + request.id + '">Approve &amp; Issue</button> ';
        actions += '<button type="button" class="btn btn-sm btn-ghost reject-certificate-request" data-id="' + request.id + '">Reject</button>';
      }
      if (request.status === 'issued' && request.certificate_id) actions = '<span class="body-sm">Certificate issued</span>';
      if (!actions) actions = '<span class="body-sm">No action available</span>';
      return '<tr><td><strong>' + escHtml(request.full_learner_name) + '</strong><div class="body-sm">Online learner</div></td>' +
        '<td><strong>' + Number(evidence.completed_lessons || 0) + ' / ' + Number(evidence.required_lessons || 9) + ' lessons</strong><div class="body-sm">Assessment: ' + (evidence.assessment_passed ? 'Passed' : 'Not passed') + '</div></td>' +
        '<td>' + escHtml(new Date(request.created_at).toLocaleString('en-UG')) + '</td>' +
        '<td><span class="certificate-pathway-badge" data-status="' + escHtml(request.status) + '">' + escHtml(request.status.replaceAll('_', ' ')) + '</span>' +
        (request.reviewer_notes ? '<div class="body-sm">' + escHtml(request.reviewer_notes) + '</div>' : '') + '</td><td>' + actions + '</td></tr>';
    }).join('') : '<tr><td colspan="5">No online certificate requests yet.</td></tr>';
    tbody.querySelectorAll('.review-certificate-request').forEach(function (button) {
      button.addEventListener('click', function () { reviewCertificateRequest(this.dataset.id, 'review'); });
    });
    tbody.querySelectorAll('.approve-certificate-request').forEach(function (button) {
      button.addEventListener('click', function () { reviewCertificateRequest(this.dataset.id, 'approve'); });
    });
    tbody.querySelectorAll('.reject-certificate-request').forEach(function (button) {
      button.addEventListener('click', function () { reviewCertificateRequest(this.dataset.id, 'reject'); });
    });
  }

  async function reviewCertificateRequest(requestId, decision) {
    var notes = null;
    if (decision === 'reject') {
      notes = prompt('Explain what the learner needs to correct before trying again:');
      if (!notes || !notes.trim()) return;
    }
    var result = await sb.rpc('review_diri_certificate_request', {
      p_request_id: requestId,
      p_decision: decision,
      p_review_notes: notes
    });
    showToast(result.error ? result.error.message : (decision === 'approve' ? 'Approved. The digital certificate is now available to the learner.' : 'Verification request updated.'), result.error ? 'error' : 'success');
    if (!result.error) {
      loadCertificateRequests();
      loadCertificates();
    }
  }

  async function loadCertificates() {
    var tbody = document.getElementById('certificates-tbody');
    if (!tbody) return;
    var result = await sb.from('certificates').select('*').order('issue_date', { ascending: false });
    if (result.error) { tbody.innerHTML = '<tr><td colspan="5" style="color:var(--color-error);">' + escHtml(result.error.message) + '</td></tr>'; return; }
    var search = (document.getElementById('certificate-search').value || '').toLowerCase().trim();
    var certificates = (result.data || []).filter(function (certificate) { return !search || (certificate.full_learner_name + ' ' + certificate.certificate_number).toLowerCase().includes(search); });
    tbody.innerHTML = certificates.length ? certificates.map(function (certificate) {
      return '<tr><td><strong>' + escHtml(certificate.certificate_number) + '</strong><div class="body-sm">' + escHtml(certificate.certificate_title) + '</div></td><td>' + escHtml(certificate.full_learner_name) + '<div class="body-sm">' + escHtml((certificate.source_pathway || 'online').replaceAll('_', ' ')) + '</div></td><td>' + escHtml(certificate.issue_date) + '</td><td>' + escHtml(certificate.status) + '</td><td><a class="btn btn-sm btn-primary" target="_blank" href="certificate.html?id=' + encodeURIComponent(certificate.certificate_number) + '">Open Digital Certificate</a> <a class="btn btn-sm btn-ghost" target="_blank" href="verify.html?id=' + encodeURIComponent(certificate.certificate_number) + '">Verify</a> ' + (certificate.status === 'valid' ? '<button class="btn btn-sm btn-ghost revoke-certificate" data-id="' + certificate.id + '" style="color:var(--color-error);">Revoke</button>' : '') + '</td></tr>';
    }).join('') : '<tr><td colspan="5">No certificates found. None are fabricated or preloaded.</td></tr>';
    tbody.querySelectorAll('.revoke-certificate').forEach(function (button) { button.addEventListener('click', function () { revokeCertificate(this.dataset.id); }); });
    var settings = await sb.from('platform_settings').select('setting_value').eq('setting_key', 'certificate_fee_ugx').maybeSingle();
    if (settings.data && settings.data.setting_value) document.getElementById('certificate-fee').value = settings.data.setting_value.amount || 50000;
  }

  async function revokeCertificate(id) {
    var reason = prompt('Reason for revoking this certificate:');
    if (!reason || !reason.trim()) return;
    var result = await sb.from('certificates').update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: currentUser.id, revocation_reason: reason.trim(), updated_at: new Date().toISOString() }).eq('id', id).select('participant_id').single();
    if (!result.error && result.data && result.data.participant_id) {
      await sb.from('cohort_participants').update({ certification_status: 'revoked', updated_at: new Date().toISOString() }).eq('id', result.data.participant_id);
    }
    showToast(result.error ? result.error.message : 'Certificate revoked.', result.error ? 'error' : 'success');
    if (!result.error) {
      loadCertificates();
      loadCohorts();
    }
  }

  async function saveCertificateFee() {
    var amount = Number(document.getElementById('certificate-fee').value);
    var result = await sb.from('platform_settings').update({ setting_value: { amount: amount, currency: 'UGX', applies_where_required: true }, updated_by: currentUser.id, updated_at: new Date().toISOString() }).eq('setting_key', 'certificate_fee_ugx');
    showToast(result.error ? result.error.message : 'Certificate fee updated.', result.error ? 'error' : 'success');
  }

  /* -----------------------------------------
     NEWS & UPDATES CMS
     ----------------------------------------- */
  async function loadNews() {
    var tbody = document.getElementById('news-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center body-sm" style="padding:var(--space-10);">Loading updates...</td></tr>';
    try {
      var result = await sb.from('news_articles').select('*').order('updated_at', { ascending: false });
      if (result.error) throw result.error;
      newsCache = result.data || [];
      var search = (document.getElementById('news-search').value || '').toLowerCase().trim();
      var status = document.getElementById('news-status-filter').value;
      var rows = newsCache.filter(function (item) {
        if (status !== 'all' && item.status !== status) return false;
        return !search || (item.title + ' ' + item.summary).toLowerCase().includes(search);
      });
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center body-sm" style="padding:var(--space-10);">No updates found.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(function (item) {
        return '<tr><td><strong>' + escHtml(item.title) + '</strong><div class="body-sm">' + escHtml(item.summary) + '</div></td>' +
          '<td>' + escHtml(item.category) + '</td>' +
          '<td><span class="admin-status-badge status-' + (item.status === 'published' ? 'active' : 'inactive') + '">' + escHtml(item.status) + '</span></td>' +
          '<td class="body-sm">' + (item.published_at ? new Date(item.published_at).toLocaleDateString() : '—') + '</td>' +
          '<td><button class="btn btn-sm btn-ghost edit-news" data-id="' + item.id + '">Edit</button> ' +
          '<button class="btn btn-sm btn-ghost delete-news" data-id="' + item.id + '" style="color:var(--color-error);">Delete</button></td></tr>';
      }).join('');
      tbody.querySelectorAll('.edit-news').forEach(function (btn) {
        btn.addEventListener('click', function () { openNewsModal(newsCache.find(function (item) { return item.id === btn.dataset.id; })); });
      });
      tbody.querySelectorAll('.delete-news').forEach(function (btn) {
        btn.addEventListener('click', function () { deleteNews(btn.dataset.id); });
      });
    } catch (error) {
      tbody.innerHTML = '<tr><td colspan="5" style="padding:var(--space-8);color:var(--color-error);">Unable to load updates: ' + escHtml(error.message) + '</td></tr>';
    }
  }

  function slugify(value) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
  }

  function openNewsModal(article) {
    article = article || null;
    document.getElementById('news-modal-title').textContent = article ? 'Edit Update' : 'New Update';
    document.getElementById('news-id').value = article ? article.id : '';
    document.getElementById('news-title').value = article ? article.title : '';
    document.getElementById('news-summary').value = article ? article.summary : '';
    document.getElementById('news-category').value = article ? article.category : 'Data & Privacy';
    document.getElementById('news-status').value = article ? article.status : 'draft';
    document.getElementById('news-preview-url').value = article ? (article.preview_image_url || article.image_url || '') : '';
    document.getElementById('news-preview-file').value = '';
    newsBlocks = article && Array.isArray(article.content_blocks) && article.content_blocks.length
      ? article.content_blocks.map(function (block) { return Object.assign({}, block); })
      : [{ type: 'paragraph', text: '' }];
    renderNewsBlocks();
    showModalMessage('news-modal-message', '', '');
    document.getElementById('news-modal').classList.add('open');
  }

  function renderNewsBlocks() {
    var container = document.getElementById('news-blocks');
    container.innerHTML = newsBlocks.map(function (block, index) {
      var field = '';
      if (block.type === 'image') {
        field = '<input type="file" accept="image/jpeg,image/png,image/webp" class="form-input news-block-file" data-index="' + index + '">' +
          '<input type="text" class="form-input news-block-caption" data-index="' + index + '" placeholder="Image caption" value="' + escHtml(block.caption || '') + '">' +
          (block.url ? '<div class="body-sm news-current-media">Current image: ' + escHtml(block.url) + '</div>' : '');
      } else if (block.type === 'video') {
        field = '<input type="url" class="form-input news-block-text" data-index="' + index + '" placeholder="YouTube video URL" value="' + escHtml(block.url || '') + '">';
      } else {
        var placeholder = block.type === 'heading' ? 'Subheading' : block.type === 'quote' ? 'Quoted statement' : 'Write a paragraph';
        field = '<textarea class="form-input news-block-text" data-index="' + index + '" rows="' + (block.type === 'paragraph' ? '4' : '2') + '" placeholder="' + placeholder + '">' + escHtml(block.text || '') + '</textarea>';
      }
      return '<div class="news-block" data-index="' + index + '"><div class="news-block-toolbar"><strong>' + block.type.charAt(0).toUpperCase() + block.type.slice(1) + '</strong><div>' +
        '<button type="button" class="news-move-up" data-index="' + index + '" aria-label="Move up">↑</button>' +
        '<button type="button" class="news-move-down" data-index="' + index + '" aria-label="Move down">↓</button>' +
        '<button type="button" class="news-remove-block" data-index="' + index + '" aria-label="Remove">×</button></div></div>' + field + '</div>';
    }).join('');
    bindNewsBlockEvents();
  }

  function captureNewsBlocks() {
    document.querySelectorAll('.news-block-text').forEach(function (field) {
      var index = Number(field.dataset.index);
      if (newsBlocks[index].type === 'video') newsBlocks[index].url = field.value.trim();
      else newsBlocks[index].text = field.value.trim();
    });
    document.querySelectorAll('.news-block-caption').forEach(function (field) {
      newsBlocks[Number(field.dataset.index)].caption = field.value.trim();
    });
  }

  function bindNewsBlockEvents() {
    document.querySelectorAll('.news-move-up,.news-move-down,.news-remove-block').forEach(function (btn) {
      btn.addEventListener('click', function () {
        captureNewsBlocks();
        var index = Number(btn.dataset.index);
        if (btn.classList.contains('news-remove-block')) newsBlocks.splice(index, 1);
        else {
          var next = btn.classList.contains('news-move-up') ? index - 1 : index + 1;
          if (next >= 0 && next < newsBlocks.length) {
            var temp = newsBlocks[index]; newsBlocks[index] = newsBlocks[next]; newsBlocks[next] = temp;
          }
        }
        renderNewsBlocks();
      });
    });
  }

  async function uploadNewsImage(file) {
    if (!file) return '';
    var extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = currentUser.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + extension;
    var upload = await sb.storage.from('news-media').upload(path, file, { cacheControl: '3600', upsert: false });
    if (upload.error) throw upload.error;
    return sb.storage.from('news-media').getPublicUrl(path).data.publicUrl;
  }

  async function saveNews() {
    captureNewsBlocks();
    var id = document.getElementById('news-id').value;
    var title = document.getElementById('news-title').value.trim();
    var summary = document.getElementById('news-summary').value.trim();
    var status = document.getElementById('news-status').value;
    if (title.length < 8 || summary.length < 20) {
      showModalMessage('news-modal-message', 'Add a complete headline and summary before saving.', 'error'); return;
    }
    if (!newsBlocks.length) {
      showModalMessage('news-modal-message', 'Add at least one article content block.', 'error'); return;
    }
    try {
      var previewFile = document.getElementById('news-preview-file').files[0];
      var previewUrl = previewFile ? await uploadNewsImage(previewFile) : document.getElementById('news-preview-url').value;
      for (var i = 0; i < newsBlocks.length; i++) {
        if (newsBlocks[i].type === 'image') {
          var fileInput = document.querySelector('.news-block-file[data-index="' + i + '"]');
          if (fileInput && fileInput.files[0]) newsBlocks[i].url = await uploadNewsImage(fileInput.files[0]);
        }
      }
      var body = newsBlocks.filter(function (b) { return b.type === 'paragraph' && b.text; }).map(function (b) { return b.text; });
      var existingArticle = id ? newsCache.find(function (item) { return item.id === id; }) : null;
      var payload = {
        slug: slugify(title), title: title, summary: summary,
        category: document.getElementById('news-category').value,
        status: status, preview_image_url: previewUrl || null, image_url: previewUrl || null,
        content_blocks: newsBlocks, body: body, reviewer: 'DIRI Editorial Desk',
        published_at: status === 'published'
          ? ((existingArticle && existingArticle.published_at) || new Date().toISOString())
          : null,
        updated_at: new Date().toISOString()
      };
      var result;
      if (id) result = await sb.from('news_articles').update(payload).eq('id', id);
      else { payload.created_by = currentUser.id; result = await sb.from('news_articles').insert(payload); }
      if (result.error) throw result.error;
      closeModal('news-modal'); loadNews(); loadDashboard();
      showToast(status === 'published' ? 'Update published.' : 'Update saved as ' + status + '.');
    } catch (error) {
      showModalMessage('news-modal-message', error.message || 'Unable to save update.', 'error');
    }
  }

  function deleteNews(id) {
    openConfirmModal('Delete this update permanently?', async function () {
      var result = await sb.from('news_articles').delete().eq('id', id);
      if (result.error) return showModalMessage('confirm-modal-message', result.error.message, 'error');
      closeModal('confirm-modal'); loadNews(); loadDashboard(); showToast('Update deleted.');
    });
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
          '<td><button class="btn btn-sm btn-ghost toggle-publish" data-id="' + w.id + '" data-published="' + (w.is_published ? '1' : '0') + '">' + (w.is_published ? 'Unpublish' : 'Publish') + '</button></td>' +
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
      // Publish toggle
      tbody.querySelectorAll('.toggle-publish').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          const weekId = this.getAttribute('data-id');
          const isPublished = this.getAttribute('data-published') === '1';
          try {
            const { error } = await sb.from('quiz_weeks').update({ is_published: !isPublished }).eq('id', weekId);
            if (error) throw error;
            showToast(isPublished ? 'Week unpublished.' : 'Week published.');
            loadWeeks();
          } catch (err) {
            showToast(err.message || 'Unable to change publish state', 'error');
          }
        });
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
     REQUEST ACCESS UI (policymaker -> admin requests)
     ----------------------------------------- */
  function openRequestModal() {
    var reason = document.getElementById('request-reason');
    if (reason) reason.value = '';
    var msg = document.getElementById('request-modal-message'); if (msg) { msg.textContent = ''; msg.className = 'admin-modal-message'; }
    document.getElementById('request-modal').classList.add('open');
  }

  async function submitAccessRequest() {
    var reason = document.getElementById('request-reason').value.trim();
    var messageEl = document.getElementById('request-modal-message');
    if (!reason) { if (messageEl) { messageEl.textContent = 'Please explain why you need admin access.'; messageEl.className = 'admin-modal-message error'; } return; }
    try {
      const payload = { user_id: currentUser.id, requested_role: 'admin', reason: reason };
      const { error } = await sb.from('access_requests').insert(payload);
      if (error) throw error;
      if (messageEl) { messageEl.textContent = 'Request submitted. An admin will review it soon.'; messageEl.className = 'admin-modal-message success'; }
      setTimeout(function () { document.getElementById('request-modal').classList.remove('open'); }, 900);
    } catch (err) {
      if (messageEl) { messageEl.textContent = err.message || 'Unable to submit request'; messageEl.className = 'admin-modal-message error'; }
    }
  }

  /* -----------------------------------------
     ADMIN: Pending Access Requests (approve/reject)
     ----------------------------------------- */
  async function loadAccessRequests() {
    const tbody = document.getElementById('access-requests-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center body-sm" style="padding: var(--space-10);">Loading requests...</td></tr>';
    try {
      const { data, error } = await sb.from('access_requests').select('*').eq('status', 'pending').order('created_at', { ascending: true });
      if (error) throw error;
      const requests = data || [];
      if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center body-sm" style="padding: var(--space-10);">No pending requests.</td></tr>';
        return;
      }
      // Fetch profile info for each requester
      const rows = await Promise.all(requests.map(async function (r) {
        const pr = await sb.from('profiles').select('username, email').eq('id', r.user_id).maybeSingle();
        const username = pr.data ? pr.data.username : 'Unknown';
        const email = pr.data ? pr.data.email : '-';
        return '<tr>' +
          '<td><strong>' + escHtml(username) + '</strong></td>' +
          '<td class="body-sm">' + escHtml(r.requested_role || 'admin') + '</td>' +
          '<td class="body-sm">' + escHtml(r.reason || '') + '</td>' +
          '<td class="body-sm">' + (new Date(r.created_at).toLocaleString()) + '</td>' +
          '<td>' +
            '<button class="btn btn-sm btn-primary" data-action="approve-request" data-id="' + r.id + '">Approve</button> ' +
            '<button class="btn btn-sm btn-ghost" data-action="reject-request" data-id="' + r.id + '" style="color:var(--color-error);">Reject</button>' +
          '</td>' +
        '</tr>';
      }));
      tbody.innerHTML = rows.join('');

      // Wire approve/reject
      tbody.querySelectorAll('[data-action="approve-request"]').forEach(function (btn) {
        btn.addEventListener('click', function () { approveAccessRequest(this.getAttribute('data-id')); });
      });
      tbody.querySelectorAll('[data-action="reject-request"]').forEach(function (btn) {
        btn.addEventListener('click', function () { rejectAccessRequest(this.getAttribute('data-id')); });
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center body-sm" style="padding: var(--space-10); color: var(--color-error);">Error: ' + escHtml(err.message) + '</td></tr>';
    }
  }

  async function approveAccessRequest(id) {
    try {
      const now = new Date().toISOString();
      const { error: up1 } = await sb.from('access_requests').update({ status: 'approved', reviewed_by: currentUser.id, reviewed_at: now }).eq('id', id);
      if (up1) throw up1;
      // Promote user to admin
      const req = await sb.from('access_requests').select('user_id').eq('id', id).maybeSingle();
      if (req.error) throw req.error;
      const userId = req.data.user_id;
      const { error: up2 } = await sb.from('profiles').update({ role: 'admin' }).eq('id', userId);
      if (up2) throw up2;
      showToast('Request approved and user promoted to admin.');
      loadAccessRequests();
      loadAccessList();
    } catch (err) {
      showToast(err.message || 'Unable to approve request', 'error');
    }
  }

  async function rejectAccessRequest(id) {
    try {
      const now = new Date().toISOString();
      const { error } = await sb.from('access_requests').update({ status: 'rejected', reviewed_by: currentUser.id, reviewed_at: now }).eq('id', id);
      if (error) throw error;
      showToast('Request rejected.');
      loadAccessRequests();
    } catch (err) {
      showToast(err.message || 'Unable to reject request', 'error');
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

    document.getElementById('btn-new-news').addEventListener('click', function () { openNewsModal(null); });
    document.getElementById('news-modal-save').addEventListener('click', saveNews);
    document.getElementById('news-modal-close').addEventListener('click', function () { closeModal('news-modal'); });
    document.getElementById('news-modal-cancel').addEventListener('click', function () { closeModal('news-modal'); });
    document.getElementById('news-add-block').addEventListener('click', function () {
      captureNewsBlocks();
      newsBlocks.push({ type: document.getElementById('news-add-block-type').value });
      renderNewsBlocks();
    });
    document.getElementById('news-search').addEventListener('input', debounce(loadNews, 300));
    document.getElementById('news-status-filter').addEventListener('change', loadNews);

    // Unified training, cohort and certificate management
    document.getElementById('training-status-filter').addEventListener('change', loadTrainingRequests);
    document.getElementById('cohort-form').addEventListener('submit', createCohort);
    document.getElementById('participant-form').addEventListener('submit', enrolParticipant);
    document.getElementById('certificate-search').addEventListener('input', debounce(loadCertificates, 250));
    document.getElementById('save-certificate-fee').addEventListener('click', saveCertificateFee);

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

    // Request Access (policymakers)
    var btnReq = document.getElementById('btn-request-access');
    if (btnReq) btnReq.addEventListener('click', openRequestModal);
    var reqClose = document.getElementById('request-modal-close'); if (reqClose) reqClose.addEventListener('click', function () { closeModal('request-modal'); });
    var reqCancel = document.getElementById('request-modal-cancel'); if (reqCancel) reqCancel.addEventListener('click', function () { closeModal('request-modal'); });
    var reqSubmit = document.getElementById('request-modal-submit'); if (reqSubmit) reqSubmit.addEventListener('click', submitAccessRequest);
    var reqModal = document.getElementById('request-modal'); if (reqModal) reqModal.addEventListener('click', function (e) { if (e.target === this) closeModal('request-modal'); });
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

'use strict';

(function () {
  const sb = window.diriSupabase;

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function formatDate(value) {
    if (!value) return 'Not set';
    return new Date(value + (String(value).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-UG', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  async function currentSession() {
    if (!sb) return null;
    const result = await sb.auth.getSession();
    return result.data.session;
  }

  async function setupTrainingRequest() {
    const form = document.querySelector('[data-training-request-form]');
    if (!form || !sb) return;
    const message = form.querySelector('[data-form-message]');
    const submit = form.querySelector('button[type="submit"]');
    const session = await currentSession();

    if (session && session.user) {
      const email = form.querySelector('[name="email"]');
      if (email && !email.value) email.value = session.user.email || '';
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      const honeypot = form.querySelector('[name="website"]');
      if (honeypot && honeypot.value) return;

      submit.disabled = true;
      message.textContent = 'Sending your training request...';
      message.className = 'auth-message info';
      const data = new FormData(form);
      const payload = {
        organization_name: String(data.get('organization_name') || '').trim(),
        contact_person: String(data.get('contact_person') || '').trim(),
        email: String(data.get('email') || '').trim(),
        phone: String(data.get('phone') || '').trim(),
        location: String(data.get('location') || '').trim(),
        participant_count: Number(data.get('participant_count')),
        participant_type: data.get('participant_type'),
        preferred_training_date: data.get('preferred_training_date') || null,
        training_topics: String(data.get('training_topics') || '').trim(),
        certification_required: data.get('certification_required') === 'yes',
        additional_message: String(data.get('additional_message') || '').trim() || null,
        requester_user_id: session && session.user ? session.user.id : null
      };
      const result = await sb.from('training_requests').insert(payload);
      submit.disabled = false;
      if (result.error) {
        message.textContent = result.error.code === '42P01'
          ? 'Training requests are being prepared. Please email diriuganda@gmail.com for now.'
          : 'We could not send your request. Please try again or email diriuganda@gmail.com.';
        message.className = 'auth-message error';
        return;
      }
      form.reset();
      message.textContent = 'Request received. DIRI will contact you to discuss your needs and provide a quote.';
      message.className = 'auth-message success';
    });
  }

  function certificateVerificationUrl(certificate) {
    return window.location.origin + '/verify/' + encodeURIComponent(certificate.certificate_number);
  }

  function renderCertificate(certificate) {
    const url = certificateVerificationUrl(certificate);
    return '<article class="certificate-card" data-certificate-card>' +
      '<div class="certificate-brand"><span>DIRI</span><small>Digital Safety Certificate</small></div>' +
      '<p class="certificate-kicker">This certifies that</p>' +
      '<h3>' + escapeHtml(certificate.full_learner_name) + '</h3>' +
      '<p>has qualified for the</p><h4>' + escapeHtml(certificate.certificate_title) + '</h4>' +
      '<div class="certificate-details"><span><strong>Certificate number</strong>' + escapeHtml(certificate.certificate_number) + '</span>' +
      '<span><strong>Date issued</strong>' + formatDate(certificate.issue_date) + '</span>' +
      '<span><strong>Status</strong><b class="certificate-status status-' + escapeHtml(certificate.status) + '">' + escapeHtml(certificate.status) + '</b></span></div>' +
      '<div class="certificate-verify"><div data-certificate-qr data-value="' + escapeHtml(url) + '"></div>' +
      '<div><strong>Verify online</strong><a href="' + escapeHtml(url) + '">' + escapeHtml(url) + '</a></div></div>' +
      '</article>';
  }

  async function setupLearnerDashboard() {
    const dashboard = document.querySelector('[data-learner-dashboard]');
    if (!dashboard || !sb) return;
    const session = await currentSession();
    if (!session || !session.user) return;

    const [attemptsResult, participationResult, certificatesResult] = await Promise.all([
      sb.from('quiz_attempts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      sb.from('cohort_participants').select('attendance_status, assessment_status, certification_status, training_cohorts(training_name, training_date, status)').eq('user_id', session.user.id),
      sb.from('certificates').select('*').eq('user_id', session.user.id).order('issue_date', { ascending: false })
    ]);

    const attempts = attemptsResult.data || [];
    const completedAttempts = attempts.filter(function (attempt) { return attempt.status === 'completed' || attempt.score != null; });
    const bestAttempt = completedAttempts.reduce(function (best, attempt) {
      if (!best) return attempt;
      const currentRatio = Number(attempt.score || 0) / Math.max(1, Number(attempt.total_questions || 1));
      const bestRatio = Number(best.score || 0) / Math.max(1, Number(best.total_questions || 1));
      return currentRatio > bestRatio ? attempt : best;
    }, null);
    const quizCount = document.querySelector('[data-dashboard-stat="assessments"]');
    const bestScoreEl = document.querySelector('[data-dashboard-stat="best-score"]');
    if (quizCount) quizCount.textContent = completedAttempts.length;
    if (bestScoreEl) bestScoreEl.textContent = bestAttempt ? (Number(bestAttempt.score || 0) + '/' + Number(bestAttempt.total_questions || 0)) : '—';

    const trainingList = document.querySelector('[data-training-participation]');
    const participations = participationResult.data || [];
    if (trainingList) {
      trainingList.innerHTML = participations.length ? participations.map(function (item) {
        const cohort = item.training_cohorts || {};
        return '<article class="dashboard-list-card"><div><strong>' + escapeHtml(cohort.training_name || 'DIRI training') + '</strong>' +
          '<span>' + formatDate(cohort.training_date) + '</span></div><div class="status-stack">' +
          '<span>Attendance: ' + escapeHtml(item.attendance_status) + '</span><span>Assessment: ' + escapeHtml(item.assessment_status) + '</span>' +
          '<span>Certificate: ' + escapeHtml(item.certification_status) + '</span></div></article>';
      }).join('') : '<div class="dashboard-empty"><strong>No physical training recorded yet.</strong><p>If you attend a DIRI training, it will appear here under this same account.</p></div>';
    }

    const certificateList = document.querySelector('[data-certificate-list]');
    const certificates = certificatesResult.data || [];
    if (certificateList) {
      certificateList.innerHTML = certificates.length ? certificates.map(renderCertificate).join('') :
        '<div class="dashboard-empty"><strong>No certificate has been issued to this account.</strong><p>Complete the required learning or training and assessment. Qualifying certificates are issued only after DIRI approval.</p></div>';
      if (window.QRCode) {
        certificateList.querySelectorAll('[data-certificate-qr]').forEach(function (node) {
          new window.QRCode(node, { text: node.dataset.value, width: 86, height: 86, correctLevel: window.QRCode.CorrectLevel.M });
        });
      }
    }

    const printButton = document.querySelector('[data-print-certificates]');
    if (printButton) {
      printButton.hidden = !certificates.length;
      printButton.addEventListener('click', function () { window.print(); });
    }
  }

  async function setupVerification() {
    const form = document.querySelector('[data-verification-form]');
    const resultBox = document.querySelector('[data-verification-result]');
    if (!form || !resultBox || !sb) return;
    const input = form.querySelector('[name="certificate_id"]');
    const params = new URLSearchParams(window.location.search);
    const pathMatch = window.location.pathname.match(/\/verify\/([^/]+)\/?$/);
    input.value = params.get('id') || (pathMatch ? decodeURIComponent(pathMatch[1]) : '') || '';

    async function verify() {
      const certificateId = input.value.trim();
      if (!certificateId) return;
      resultBox.innerHTML = '<div class="verification-state">Checking certificate...</div>';
      const response = await sb.rpc('verify_diri_certificate', { p_certificate_id: certificateId });
      if (response.error) {
        resultBox.innerHTML = '<div class="verification-state invalid"><h2>Unable to verify</h2><p>Please check the certificate ID and try again.</p></div>';
        return;
      }
      const certificate = response.data && response.data[0];
      if (!certificate) {
        resultBox.innerHTML = '<div class="verification-state invalid"><h2>Certificate not found</h2><p>No DIRI certificate matches that ID. Check the number exactly as shown on the certificate.</p></div>';
        return;
      }
      resultBox.innerHTML = '<div class="verification-state ' + (certificate.is_valid ? 'valid' : 'invalid') + '">' +
        '<span class="verification-icon" aria-hidden="true">' + (certificate.is_valid ? '✓' : '!') + '</span>' +
        '<p class="section-tag">Verification result</p><h2>' + (certificate.is_valid ? 'Valid certificate' : 'Certificate is not valid') + '</h2>' +
        '<dl><div><dt>Certificate holder</dt><dd>' + escapeHtml(certificate.certificate_holder) + '</dd></div>' +
        '<div><dt>Certificate type</dt><dd>' + escapeHtml(certificate.certificate_type) + '</dd></div>' +
        '<div><dt>Certificate number</dt><dd>' + escapeHtml(certificate.certificate_number) + '</dd></div>' +
        '<div><dt>Issue date</dt><dd>' + formatDate(certificate.issue_date) + '</dd></div>' +
        '<div><dt>Status</dt><dd>' + escapeHtml(certificate.certificate_status) + '</dd></div></dl></div>';
    }

    form.addEventListener('submit', function (event) { event.preventDefault(); verify(); });
    if (input.value) verify();
  }

  async function setupCertificateFee() {
    const targets = document.querySelectorAll('[data-certificate-fee]');
    if (!targets.length || !sb) return;
    const result = await sb.from('platform_settings').select('setting_value').eq('setting_key', 'certificate_fee_ugx').maybeSingle();
    if (result.error || !result.data || !result.data.setting_value) return;
    const amount = Number(result.data.setting_value.amount);
    if (!Number.isFinite(amount)) return;
    const label = 'UGX ' + amount.toLocaleString('en-UG');
    targets.forEach(function (target) { target.textContent = label; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupTrainingRequest();
    setupLearnerDashboard();
    setupVerification();
    setupCertificateFee();
  });
})();

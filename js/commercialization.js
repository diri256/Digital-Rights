'use strict';

(function () {
  const sb = window.diriSupabase;
  const REQUIRED_LESSONS = 9;
  const PASS_PERCENTAGE = 70;

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

  function formatStatus(value) {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
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
    const verifyUrl = certificateVerificationUrl(certificate);
    const documentUrl = 'certificate.html?id=' + encodeURIComponent(certificate.certificate_number);
    return '<article class="certificate-card" data-certificate-card>' +
      '<div class="certificate-brand"><span>DIRI</span><small>Digital Safety Certificate</small></div>' +
      '<p class="certificate-kicker">Issued digitally to</p>' +
      '<h3>' + escapeHtml(certificate.full_learner_name) + '</h3>' +
      '<p>for qualifying in</p><h4>' + escapeHtml(certificate.certificate_title) + '</h4>' +
      '<div class="certificate-details"><span><strong>Certificate number</strong>' + escapeHtml(certificate.certificate_number) + '</span>' +
      '<span><strong>Date issued</strong>' + formatDate(certificate.issue_date) + '</span>' +
      '<span><strong>Pathway</strong>' + escapeHtml(formatStatus(certificate.source_pathway || 'online')) + '</span>' +
      '<span><strong>Status</strong><b class="certificate-status status-' + escapeHtml(certificate.status) + '">' + escapeHtml(formatStatus(certificate.status)) + '</b></span></div>' +
      '<div class="certificate-verify"><div data-certificate-qr data-value="' + escapeHtml(verifyUrl) + '"></div>' +
      '<div><strong>Public verification</strong><a href="' + escapeHtml(verifyUrl) + '">' + escapeHtml(verifyUrl) + '</a></div></div>' +
      '<div class="certificate-card-actions"><a class="btn btn-primary" href="' + escapeHtml(documentUrl) + '">Open / Download Certificate</a>' +
      '<a class="btn btn-outline" href="verify.html?id=' + encodeURIComponent(certificate.certificate_number) + '">Verify</a></div>' +
      '</article>';
  }

  function bestAssessment(attempts) {
    return attempts.reduce(function (best, attempt) {
      if (!best) return attempt;
      const ratio = Number(attempt.score || 0) / Math.max(1, Number(attempt.total_questions || 1));
      const bestRatio = Number(best.score || 0) / Math.max(1, Number(best.total_questions || 1));
      return ratio > bestRatio ? attempt : best;
    }, null);
  }

  function setWorkflowStep(name, state, detail) {
    const step = document.querySelector('[data-certificate-step="' + name + '"]');
    if (!step) return;
    step.classList.remove('is-complete', 'is-current', 'is-locked', 'is-error');
    step.classList.add('is-' + state);
    const detailNode = step.querySelector('[data-certificate-step-detail]');
    if (detailNode && detail) detailNode.textContent = detail;
  }

  function requestStateCopy(request, qualified) {
    if (!request) {
      return qualified
        ? { title: 'Ready for DIRI verification', message: 'Confirm the full name for your certificate, then send your results to the DIRI team.' }
        : { title: 'Keep learning', message: 'Complete all 9 lessons and pass an assessment with at least 70%.' };
    }
    if (request.status === 'pending') return { title: 'Verification requested', message: 'Your request is waiting for the DIRI team to begin its review.' };
    if (request.status === 'under_review') return { title: 'DIRI is reviewing your results', message: 'Your identity, lesson completion and assessment result are being checked.' };
    if (request.status === 'approved') return { title: 'Approved', message: 'Your certificate is being generated.' };
    if (request.status === 'issued') return { title: 'Digital certificate issued', message: 'Your certificate is ready below. You can download it as a PDF or print it.' };
    if (request.status === 'rejected') return { title: 'Verification needs attention', message: request.reviewer_notes || 'Review the requirements and submit a new request when ready.' };
    return { title: formatStatus(request.status), message: request.reviewer_notes || 'Check this page for the latest certificate status.' };
  }

  async function setupLearnerDashboard() {
    const dashboard = document.querySelector('[data-learner-dashboard]');
    if (!dashboard || !sb) return;
    const session = await currentSession();
    if (!session || !session.user) return;

    const requestForm = document.querySelector('[data-certificate-request-form]');
    const requestBox = requestForm && requestForm.closest('.certificate-request-box');
    const requestButton = requestForm && requestForm.querySelector('button[type="submit"]');
    const fullNameInput = requestForm && requestForm.querySelector('[name="full_learner_name"]');
    let pollTimer = null;

    async function loadDashboardData() {
      const results = await Promise.all([
        sb.from('lesson_progress').select('lesson_id,status,completed_at').eq('user_id', session.user.id),
        sb.from('quiz_attempts').select('score,total_questions,status,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        sb.from('cohort_participants').select('attendance_status,assessment_status,certification_status,training_cohorts(training_name,training_date,status,duration_hours)').eq('user_id', session.user.id),
        sb.from('certificate_requests').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        sb.from('certificates').select('*').eq('user_id', session.user.id).order('issue_date', { ascending: false }),
        sb.from('profiles').select('username').eq('id', session.user.id).maybeSingle()
      ]);

      const progressResult = results[0];
      const attemptsResult = results[1];
      const participationResult = results[2];
      const requestsResult = results[3];
      const certificatesResult = results[4];
      const profileResult = results[5];
      const completedLessonIds = new Set((progressResult.data || []).filter(function (item) { return item.status === 'completed'; }).map(function (item) { return item.lesson_id; }));
      const completedLessons = Math.min(REQUIRED_LESSONS, completedLessonIds.size);
      const progressPercent = Math.round((completedLessons / REQUIRED_LESSONS) * 100);
      const attempts = (attemptsResult.data || []).filter(function (attempt) { return attempt.status === 'completed'; });
      const bestAttempt = bestAssessment(attempts);
      const bestPercentage = bestAttempt && Number(bestAttempt.total_questions) > 0
        ? Math.round((Number(bestAttempt.score) / Number(bestAttempt.total_questions)) * 100)
        : 0;
      const assessmentPassed = bestPercentage >= PASS_PERCENTAGE;
      const requests = requestsResult.data || [];
      const latestRequest = requests[0] || null;
      const activeRequest = requests.find(function (request) { return ['pending', 'under_review', 'approved', 'issued'].includes(request.status); }) || null;
      const certificates = certificatesResult.data || [];
      const latestCertificate = certificates[0] || null;
      const validCertificate = certificates.find(function (certificate) { return certificate.status === 'valid'; }) || null;
      const revokedCertificate = latestCertificate && latestCertificate.status === 'revoked' ? latestCertificate : null;
      const lessonsComplete = completedLessons === REQUIRED_LESSONS;
      const qualified = lessonsComplete && assessmentPassed;
      const certificateExists = Boolean(latestCertificate);
      const requestSubmitted = Boolean(activeRequest) || certificateExists;
      const reviewComplete = certificateExists || Boolean(activeRequest && ['approved', 'issued'].includes(activeRequest.status));
      const certificateReady = Boolean(validCertificate);
      const requestWorkflowReady = !requestsResult.error;
      const canSubmitRequest = qualified && !requestSubmitted && requestWorkflowReady;

      const lessonStat = document.querySelector('[data-dashboard-stat="lessons"]');
      const quizCount = document.querySelector('[data-dashboard-stat="assessments"]');
      const bestScoreEl = document.querySelector('[data-dashboard-stat="best-score"]');
      const pathwayStat = document.querySelector('[data-dashboard-stat="certificate-status"]');
      if (lessonStat) lessonStat.textContent = completedLessons + ' / ' + REQUIRED_LESSONS;
      if (quizCount) quizCount.textContent = attempts.length;
      if (bestScoreEl) bestScoreEl.textContent = bestAttempt ? bestPercentage + '%' : '—';

      const meter = document.querySelector('[data-course-progress-meter]');
      const percent = document.querySelector('[data-course-progress-percent]');
      const count = document.querySelector('[data-course-progress-count]');
      const fill = document.querySelector('[data-course-progress-fill]');
      if (meter) {
        meter.style.setProperty('--course-progress', progressPercent + '%');
        meter.setAttribute('aria-valuenow', String(completedLessons));
      }
      if (percent) percent.textContent = progressPercent + '%';
      if (count) count.textContent = completedLessons;
      if (fill) fill.style.width = progressPercent + '%';

      const trainingList = document.querySelector('[data-training-participation]');
      const participations = participationResult.data || [];
      if (trainingList) {
        trainingList.innerHTML = participations.length ? participations.map(function (item) {
          const cohort = item.training_cohorts || {};
          const duration = cohort.duration_hours ? ' · ' + Number(cohort.duration_hours) + ' hours' : '';
          return '<article class="dashboard-list-card"><div><strong>' + escapeHtml(cohort.training_name || 'DIRI training') + '</strong>' +
            '<span>' + formatDate(cohort.training_date) + escapeHtml(duration) + '</span></div><div class="status-stack">' +
            '<span>Attendance: ' + escapeHtml(formatStatus(item.attendance_status)) + '</span><span>Assessment: ' + escapeHtml(formatStatus(item.assessment_status)) + '</span>' +
            '<span>Certificate: ' + escapeHtml(formatStatus(item.certification_status)) + '</span></div></article>';
        }).join('') : '<div class="dashboard-empty"><strong>No physical training recorded yet.</strong><p>If you attend a DIRI training, it will appear here under this same account.</p></div>';
      }

      const assessmentDetail = bestAttempt
        ? 'Best result: ' + bestPercentage + '% (pass mark ' + PASS_PERCENTAGE + '%)' + (!lessonsComplete && assessmentPassed ? ' · Complete lessons first' : '')
        : 'Pass mark: ' + PASS_PERCENTAGE + '%';
      const requestDetail = activeRequest
        ? 'Sent ' + formatDate(activeRequest.created_at)
        : (certificateExists ? 'Verification completed' : (latestRequest && latestRequest.status === 'rejected' ? 'A new request can be submitted' : 'Available after qualification'));
      setWorkflowStep('lessons', lessonsComplete ? 'complete' : 'current', completedLessons + ' of ' + REQUIRED_LESSONS + ' completed');
      setWorkflowStep('assessment', lessonsComplete ? (assessmentPassed ? 'complete' : 'current') : 'locked', assessmentDetail);
      setWorkflowStep('request', requestSubmitted ? 'complete' : (latestRequest && latestRequest.status === 'rejected' ? 'error' : (qualified ? 'current' : 'locked')), requestDetail);
      setWorkflowStep('review', reviewComplete ? 'complete' : (requestSubmitted ? 'current' : 'locked'), activeRequest ? formatStatus(activeRequest.status) : (reviewComplete ? 'Approved by DIRI' : 'Identity and results checked'));
      setWorkflowStep('issued', certificateReady ? 'complete' : (revokedCertificate ? 'error' : (reviewComplete ? 'current' : 'locked')), validCertificate ? validCertificate.certificate_number : (revokedCertificate ? 'Certificate revoked' : (reviewComplete ? 'Preparing your digital certificate' : 'Download your digital certificate')));

      const displayRequest = activeRequest || latestRequest;
      const state = validCertificate
        ? { title: 'Digital certificate issued', message: 'Your certificate is ready below. Open it to download as a PDF or print it.' }
        : (revokedCertificate
          ? { title: 'Certificate revoked', message: revokedCertificate.revocation_reason || 'This certificate is no longer valid. Contact DIRI for assistance.' }
          : requestStateCopy(displayRequest, qualified));
      const statusBox = document.querySelector('[data-certificate-request-status]');
      if (statusBox) statusBox.innerHTML = '<strong>' + escapeHtml(state.title) + '</strong><p>' + escapeHtml(state.message) + '</p>';

      const statusLabel = validCertificate ? 'Issued' : (revokedCertificate ? 'Revoked' : (activeRequest ? formatStatus(activeRequest.status) : (latestRequest && latestRequest.status === 'rejected' ? 'Action needed' : (qualified ? 'Ready to request' : 'Learning'))));
      const badge = document.querySelector('[data-certificate-pathway-badge]');
      if (badge) {
        badge.textContent = statusLabel;
        badge.dataset.status = validCertificate ? 'issued' : (revokedCertificate ? 'revoked' : (activeRequest ? activeRequest.status : (latestRequest ? latestRequest.status : 'learning')));
      }
      if (pathwayStat) pathwayStat.textContent = statusLabel;

      if (fullNameInput && !fullNameInput.value) {
        fullNameInput.value = (displayRequest && displayRequest.full_learner_name) || (profileResult.data && profileResult.data.username) || '';
      }
      if (requestForm) requestForm.hidden = !canSubmitRequest;
      if (requestBox) requestBox.classList.toggle('is-request-ready', canSubmitRequest);
      if (fullNameInput) fullNameInput.disabled = !canSubmitRequest;
      if (requestButton) {
        requestButton.disabled = !canSubmitRequest;
        requestButton.textContent = activeRequest ? 'Verification Already Requested' : (validCertificate ? 'Certificate Issued' : (latestRequest && latestRequest.status === 'rejected' ? 'Submit New Verification Request' : 'Request DIRI Verification'));
      }

      const certificateList = document.querySelector('[data-certificate-list]');
      if (certificateList) {
        certificateList.innerHTML = certificates.length ? certificates.map(renderCertificate).join('') :
          '<div class="dashboard-empty"><strong>No digital certificate has been issued yet.</strong><p>Complete the steps above. A certificate appears here only after DIRI verifies and approves the request.</p></div>';
        if (window.QRCode) {
          certificateList.querySelectorAll('[data-certificate-qr]').forEach(function (node) {
            new window.QRCode(node, { text: node.dataset.value, width: 86, height: 86, correctLevel: window.QRCode.CorrectLevel.M });
          });
        }
      }

      if (progressResult.error || requestsResult.error) {
        if (statusBox) statusBox.innerHTML = '<strong>Certificate workflow needs setup</strong><p>The new certificate database migration has not been applied yet. Contact the DIRI administrator.</p>';
      }

      const shouldPoll = activeRequest && ['pending', 'under_review', 'approved'].includes(activeRequest.status);
      if (shouldPoll && !pollTimer) pollTimer = window.setInterval(loadDashboardData, 20000);
      if (!shouldPoll && pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    if (requestForm) {
      requestForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const name = fullNameInput.value.trim();
        requestButton.disabled = true;
        requestButton.textContent = 'Sending request...';
        const result = await sb.rpc('request_diri_certificate', { p_full_learner_name: name });
        if (result.error) {
          const statusBox = document.querySelector('[data-certificate-request-status]');
          if (statusBox) statusBox.innerHTML = '<strong>Request not sent</strong><p>' + escapeHtml(result.error.message) + '</p>';
          requestButton.disabled = false;
          requestButton.textContent = 'Request DIRI Verification';
          return;
        }
        await loadDashboardData();
      });
    }

    await loadDashboardData();
    window.addEventListener('beforeunload', function () { if (pollTimer) window.clearInterval(pollTimer); }, { once: true });
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
        resultBox.innerHTML = '<div class="verification-state invalid"><h2>Unable to verify</h2><p>The verification service could not be reached. Please try again.</p></div>';
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
        '<div><dt>Status</dt><dd>' + escapeHtml(formatStatus(certificate.certificate_status)) + '</dd></div></dl>' +
        (certificate.is_valid ? '<a class="btn btn-primary" href="certificate.html?id=' + encodeURIComponent(certificate.certificate_number) + '">View Digital Certificate</a>' : '') +
        '</div>';
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

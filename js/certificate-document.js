'use strict';

(function () {
  function escapeHtml(value) {
    var div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function formatDate(value) {
    if (!value) return 'Not set';
    return new Date(value + (String(value).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-UG', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function certificateIdFromLocation() {
    var queryId = new URLSearchParams(window.location.search).get('id');
    var pathMatch = window.location.pathname.match(/\/certificate\/([^/]+)\/?$/);
    return (queryId || (pathMatch ? decodeURIComponent(pathMatch[1]) : '') || '').trim();
  }

  function verificationUrl(id) {
    return window.location.origin + '/verify/' + encodeURIComponent(id);
  }

  function showFailure(container, title, message) {
    container.innerHTML = '<div class="certificate-document-error"><span aria-hidden="true">!</span><h1>' + escapeHtml(title) + '</h1><p>' + escapeHtml(message) + '</p><a class="btn btn-primary" href="verify.html">Verify Another Certificate</a></div>';
  }

  async function loadCertificate() {
    var container = document.querySelector('[data-certificate-document]');
    var actions = document.querySelector('[data-certificate-actions]');
    var certificateId = certificateIdFromLocation();
    var sb = window.diriSupabase;
    if (!container) return;
    if (!certificateId) {
      showFailure(container, 'Certificate ID required', 'Open this page from a DIRI certificate link or enter the ID on the verification page.');
      return;
    }
    if (!sb) {
      showFailure(container, 'Verification unavailable', 'The certificate service could not be loaded. Please try again.');
      return;
    }

    var response = await sb.rpc('verify_diri_certificate', { p_certificate_id: certificateId });
    if (response.error) {
      showFailure(container, 'Unable to verify this certificate', 'The verification service could not be reached. Please try again.');
      return;
    }
    var certificate = response.data && response.data[0];
    if (!certificate) {
      showFailure(container, 'Certificate not found', 'No DIRI digital certificate matches this certificate ID.');
      return;
    }

    var verifyUrl = verificationUrl(certificate.certificate_number);
    var statusLabel = certificate.is_valid ? 'VALID DIGITAL CERTIFICATE' : 'CERTIFICATE ' + String(certificate.certificate_status || 'INVALID').toUpperCase();
    document.title = certificate.certificate_holder + ' — DIRI Digital Certificate';
    container.innerHTML = '<article class="official-certificate ' + (certificate.is_valid ? '' : 'is-invalid') + '">' +
      '<div class="official-certificate-border">' +
      '<header class="official-certificate-header"><img src="assets/logo.png" alt="DIRI"><span>Digital Rights Initiative</span></header>' +
      '<p class="official-certificate-label">DIRI DIGITAL SAFETY CERTIFICATE</p>' +
      '<h1>Certificate of Completion</h1>' +
      '<p class="official-certificate-intro">This digital certificate confirms that</p>' +
      '<h2>' + escapeHtml(certificate.certificate_holder) + '</h2>' +
      '<p class="official-certificate-copy">successfully completed the required learning or training and assessment for</p>' +
      '<h3>' + escapeHtml(certificate.certificate_type) + '</h3>' +
      '<div class="official-certificate-meta"><div><span>Date issued</span><strong>' + escapeHtml(formatDate(certificate.issue_date)) + '</strong></div><div><span>Certificate number</span><strong>' + escapeHtml(certificate.certificate_number) + '</strong></div></div>' +
      '<footer class="official-certificate-footer"><div><strong class="official-certificate-status">' + escapeHtml(statusLabel) + '</strong><p>This certificate is issued digitally by DIRI. Its authenticity and current status are confirmed through the public verification record.</p><span class="official-certificate-url">' + escapeHtml(verifyUrl) + '</span></div><div class="official-certificate-qr" data-document-qr></div></footer>' +
      '</div></article>';

    var qrNode = container.querySelector('[data-document-qr]');
    if (qrNode && window.QRCode) {
      new window.QRCode(qrNode, { text: verifyUrl, width: 110, height: 110, correctLevel: window.QRCode.CorrectLevel.M });
    }
    if (actions) actions.hidden = false;
    var verificationLink = document.querySelector('[data-public-verification-link]');
    if (verificationLink) verificationLink.href = 'verify.html?id=' + encodeURIComponent(certificate.certificate_number);
    var downloadButton = document.querySelector('[data-download-certificate]');
    if (downloadButton) {
      downloadButton.disabled = !certificate.is_valid;
      downloadButton.title = certificate.is_valid ? 'Save this certificate as a PDF or print it' : 'Invalid certificates cannot be downloaded';
      downloadButton.addEventListener('click', function () { window.print(); });
    }
  }

  document.addEventListener('DOMContentLoaded', loadCertificate);
})();

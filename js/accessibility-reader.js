/* =============================================
   DIRI - Accessibility / Screen Reader Module
   Uses the Web Speech API for text-to-speech
   + font sizing + high contrast controls
   ============================================= */
'use strict';

(function () {
  // =========================================================================
  // 1. STATE
  // =========================================================================
  const STATE_KEY = 'diri-a11y-state';
  const FONT_SIZE_STEP = 2; // px base increment
  const MAX_FONT_SIZE = 28; // px cap on body text
  const MIN_FONT_SIZE = 12;

  let state = loadState();
  let utterance = null;
  let speechQueue = [];  // array of { text, elements[] }
  let speechIndex = 0;
  let isSpeaking = false;
  let isPaused = false;
  let speechSynth = null;
  let highlightElement = null;

  // DOM refs
  let panel = null;
  let toggleBtn = null;
  let bodyEl = null;
  let skipLink = null;

  // =========================================================================
  // 2. PERSISTENCE
  // =========================================================================
  function loadState() {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          fontSize: parsed.fontSize || 0,
          highContrast: !!parsed.highContrast,
          speechRate: parsed.speechRate || 1,
        };
      }
    } catch (_) { /* ignore */ }
    return { fontSize: 0, highContrast: false, speechRate: 1 };
  }

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (_) { /* ignore */ }
  }

  // =========================================================================
  // 3. SKIP TO CONTENT LINK
  // =========================================================================
  function createSkipLink() {
    skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'diri-skip-link';
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Ensure at least one element has id="main-content" or add one
    if (!document.getElementById('main-content')) {
      const main = document.querySelector('main, [role="main"], .page-content, .hero, .section');
      if (main) {
        main.id = 'main-content';
      }
    }
  }

  // =========================================================================
  // 4. FONT SIZE
  // =========================================================================
  function applyFontSize() {
    if (state.fontSize === 0) {
      document.documentElement.removeAttribute('data-a11y-font-size');
      document.documentElement.style.removeProperty('--a11y-font-size');
      return;
    }
    const base = 16 + state.fontSize * FONT_SIZE_STEP;
    const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, base));
    document.documentElement.setAttribute('data-a11y-font-size', '');
    document.documentElement.style.setProperty('--a11y-font-size', clamped + 'px');
    saveState();
  }

  function increaseFont() {
    if (state.fontSize < 6) {
      state.fontSize++;
      applyFontSize();
      announce('Font size increased');
    } else {
      announce('Maximum font size reached');
    }
  }

  function decreaseFont() {
    if (state.fontSize > -2) {
      state.fontSize--;
      applyFontSize();
      announce('Font size decreased');
    } else {
      announce('Minimum font size reached');
    }
  }

  function resetFont() {
    state.fontSize = 0;
    applyFontSize();
    announce('Font size reset to default');
  }

  // =========================================================================
  // 5. HIGH CONTRAST
  // =========================================================================
  function applyHighContrast() {
    document.documentElement.classList.toggle('diri-high-contrast', state.highContrast);
    saveState();
  }

  function toggleHighContrast() {
    state.highContrast = !state.highContrast;
    applyHighContrast();
    announce(state.highContrast ? 'High contrast mode on' : 'High contrast mode off');
  }

  // =========================================================================
  // 6. TEXT-TO-SPEECH (Screen Reader)
  // =========================================================================
  function getSpeakableContent() {
    // Get the main content area — skip header, footer, toolbar, hidden elements
    const main = document.querySelector(
      'main, [role="main"], #main-content, .page-content, .hero, .section'
    );
    if (!main) return [];

    const blocks = [];
    const walker = document.createTreeWalker(
      main,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function (node) {
          // Skip hidden elements
          if (node.hidden || node.getAttribute('aria-hidden') === 'true') {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip script, style, nav, iframe, svg
          const tag = node.tagName.toLowerCase();
          if (['script', 'style', 'nav', 'iframe', 'svg', 'noscript'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          // Only accept heading, paragraph, li, label, td, th, blockquote, div with text
          const hasText = node.textContent.trim().length > 0;
          if (!hasText) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const seen = new Set();
    while (walker.nextNode()) {
      const el = walker.currentNode;
      const text = el.textContent.trim();
      if (!text || text.length < 3) continue;
      if (seen.has(text)) continue;
      seen.add(text);

      // Check if this is a heading
      const tag = el.tagName.toLowerCase();
      let prefix = '';
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        prefix = 'Heading: ';
      } else if (tag === 'li') {
        prefix = '• ';
      }

      blocks.push({ text: prefix + text, element: el });
    }
    return blocks;
  }

  function speakBlock(block) {
    if (!speechSynth || !block) return;

    // Remove previous highlight
    if (highlightElement) {
      highlightElement.classList.remove('diri-speech-highlight');
    }

    // Highlight current element
    if (block.element) {
      block.element.classList.add('diri-speech-highlight');
      highlightElement = block.element;
      block.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    utterance = new SpeechSynthesisUtterance(block.text);
    utterance.rate = state.speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a good voice
    const voices = speechSynth.getVoices();
    // Prefer a English voice
    const preferred = voices.find(function (v) {
      return v.lang.startsWith('en') && v.localService;
    }) || voices.find(function (v) {
      return v.lang.startsWith('en');
    });
    if (preferred) utterance.voice = preferred;

    utterance.onend = function () {
      speechIndex++;
      if (speechIndex < speechQueue.length) {
        speakBlock(speechQueue[speechIndex]);
      } else {
        finishReading();
      }
    };

    utterance.onerror = function (event) {
      if (event.error !== 'canceled' && event.error !== 'resume') {
        finishReading();
      }
    };

    isSpeaking = true;
    isPaused = false;
    speechSynth.speak(utterance);
    updateToolbarState();
  }

  function startReading() {
    stopReading();
    speechQueue = getSpeakableContent();
    speechIndex = 0;

    if (speechQueue.length === 0) {
      announce('No readable content found on this page.');
      return;
    }

    speechSynth = window.speechSynthesis;
    if (!speechSynth) {
      announce('Text-to-speech is not supported in your browser.');
      return;
    }

    // Chrome needs a small delay for the first speak() call
    if ('chrome' in window) {
      setTimeout(function () { speakBlock(speechQueue[0]); }, 50);
    } else {
      speakBlock(speechQueue[0]);
    }
  }

  function pauseReading() {
    if (speechSynth && isSpeaking && !isPaused) {
      speechSynth.pause();
      isPaused = true;
      updateToolbarState();
      announce('Reading paused');
    }
  }

  function resumeReading() {
    if (speechSynth && isPaused) {
      speechSynth.resume();
      isPaused = false;
      updateToolbarState();
      announce('Reading resumed');
    }
  }

  function stopReading() {
    if (speechSynth) {
      speechSynth.cancel();
    }
    if (highlightElement) {
      highlightElement.classList.remove('diri-speech-highlight');
      highlightElement = null;
    }
    utterance = null;
    isSpeaking = false;
    isPaused = false;
    speechQueue = [];
    speechIndex = 0;
    updateToolbarState();
  }

  function finishReading() {
    if (highlightElement) {
      highlightElement.classList.remove('diri-speech-highlight');
      highlightElement = null;
    }
    utterance = null;
    isSpeaking = false;
    isPaused = false;
    updateToolbarState();
  }

  function toggleReadAloud() {
    if (isSpeaking && !isPaused) {
      pauseReading();
    } else if (isPaused) {
      resumeReading();
    } else {
      startReading();
    }
  }

  function changeSpeed() {
    state.speechRate = state.speechRate === 1 ? 0.8 : 1;
    saveState();

    // If currently speaking, restart current block with new rate
    if (isSpeaking && speechIndex < speechQueue.length) {
      const currentBlock = speechQueue[speechIndex];
      if (speechSynth) speechSynth.cancel();
      utterance = null;
      setTimeout(function () { speakBlock(currentBlock); }, 100);
    }
    announce('Reading speed changed');
  }

  // =========================================================================
  // 7. TOOLBAR UI
  // =========================================================================
  function announce(text) {
    // Use a live region for screen reader announcements
    let announcer = document.getElementById('diri-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'diri-announcer';
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.className = 'diri-announcer';
      document.body.appendChild(announcer);
    }
    announcer.textContent = '';
    // Force reflow
    void announcer.offsetHeight;
    announcer.textContent = text;
  }

  function updateToolbarState() {
    if (!panel) return;
    const readBtn = panel.querySelector('[data-a11y-read]');
    const pauseBtn = panel.querySelector('[data-a11y-pause]');
    const stopBtn = panel.querySelector('[data-a11y-stop]');

    if (readBtn) {
      if (isPaused) {
        readBtn.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Resume';
        readBtn.setAttribute('aria-label', 'Resume reading');
      } else if (isSpeaking) {
        readBtn.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg> Pause';
        readBtn.setAttribute('aria-label', 'Pause reading');
      } else {
        readBtn.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Listen';
        readBtn.setAttribute('aria-label', 'Listen to page content');
      }
    }
    if (pauseBtn) {
      pauseBtn.style.display = isSpeaking ? 'inline-flex' : 'none';
    }
    if (stopBtn) {
      stopBtn.style.display = isSpeaking ? 'inline-flex' : 'none';
    }
  }

  function buildToolbar() {
    // Toggle button (floating)
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'diri-a11y-toggle';
    toggleBtn.setAttribute('aria-label', 'Open accessibility tools');
    toggleBtn.setAttribute('title', 'Accessibility tools');
    toggleBtn.innerHTML =
      '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="10"/>' +
        '<circle cx="12" cy="12" r="4"/>' +
        '<line x1="12" y1="2" x2="12" y2="6"/>' +
        '<line x1="12" y1="18" x2="12" y2="22"/>' +
        '<line x1="2" y1="12" x2="6" y2="12"/>' +
        '<line x1="18" y1="12" x2="22" y2="12"/>' +
      '</svg>';
    document.body.appendChild(toggleBtn);

    // Panel
    panel = document.createElement('div');
    panel.className = 'diri-a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Accessibility tools');
    panel.setAttribute('aria-hidden', 'true');

    panel.innerHTML =
      '<div class="diri-a11y-header">' +
        '<span class="diri-a11y-title">Accessibility Tools</span>' +
        '<button class="diri-a11y-close" data-a11y-close aria-label="Close accessibility tools">&times;</button>' +
      '</div>' +
      '<div class="diri-a11y-body">' +
        // Screen Reader section
        '<div class="diri-a11y-group">' +
          '<span class="diri-a11y-group-title">Screen Reader</span>' +
          '<div class="diri-a11y-row">' +
            '<button class="diri-a11y-btn diri-a11y-btn-primary" data-a11y-read aria-label="Listen to page content">' +
              '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Listen' +
            '</button>' +
            '<button class="diri-a11y-btn" data-a11y-stop aria-label="Stop reading" style="display:none;">' +
              '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Stop' +
            '</button>' +
          '</div>' +
          '<div class="diri-a11y-row" style="margin-top:6px;">' +
            '<button class="diri-a11y-btn diri-a11y-btn-sm" data-a11y-speed aria-label="Change reading speed">' +
              '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' +
              '</svg> Speed' +
            '</button>' +
          '</div>' +
        '</div>' +
        // Display section
        '<div class="diri-a11y-group">' +
          '<span class="diri-a11y-group-title">Display</span>' +
          '<div class="diri-a11y-row">' +
            '<button class="diri-a11y-btn diri-a11y-btn-sm" data-a11y-font-up aria-label="Increase font size">A+</button>' +
            '<button class="diri-a11y-btn diri-a11y-btn-sm" data-a11y-font-down aria-label="Decrease font size">A−</button>' +
            '<button class="diri-a11y-btn diri-a11y-btn-sm" data-a11y-font-reset aria-label="Reset font size">Reset</button>' +
          '</div>' +
          '<div class="diri-a11y-row" style="margin-top:6px;">' +
            '<button class="diri-a11y-btn diri-a11y-btn-sm" data-a11y-contrast aria-label="Toggle high contrast mode">' +
              '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z"/>' +
              '</svg> High Contrast' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    // Events
    toggleBtn.addEventListener('click', function () {
      const isOpen = panel.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      panel.setAttribute('aria-hidden', String(!isOpen));
      if (isOpen) {
        panel.querySelector('[data-a11y-read]').focus();
      }
    });

    panel.querySelector('[data-a11y-close]').addEventListener('click', closePanel);
    panel.querySelector('[data-a11y-read]').addEventListener('click', toggleReadAloud);
    panel.querySelector('[data-a11y-stop]').addEventListener('click', stopReading);
    panel.querySelector('[data-a11y-speed]').addEventListener('click', changeSpeed);
    panel.querySelector('[data-a11y-font-up]').addEventListener('click', increaseFont);
    panel.querySelector('[data-a11y-font-down]').addEventListener('click', decreaseFont);
    panel.querySelector('[data-a11y-font-reset]').addEventListener('click', resetFont);
    panel.querySelector('[data-a11y-contrast]').addEventListener('click', toggleHighContrast);

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) {
        closePanel();
      }
    });

    // Close on click outside
    document.addEventListener('click', function (e) {
      if (panel.classList.contains('open') &&
          !panel.contains(e.target) &&
          e.target !== toggleBtn &&
          !toggleBtn.contains(e.target)) {
        closePanel();
      }
    });
  }

  function closePanel() {
    panel.classList.remove('open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    toggleBtn.focus();
  }

  // =========================================================================
  // 8. INIT
  // =========================================================================
  function init() {
    bodyEl = document.body;

    // Create skip link
    createSkipLink();

    // Build the toolbar
    buildToolbar();

    // Apply persisted state
    applyFontSize();
    applyHighContrast();

    // If a voice needs loading (Chrome loads async)
    if ('speechSynthesis' in window) {
      speechSynth = window.speechSynthesis;
      // Pre-warm voices on Chrome
      if ('chrome' in window) {
        speechSynth.getVoices();
      }
    }

    // Stop reading on page unload
    window.addEventListener('beforeunload', function () {
      if (speechSynth) speechSynth.cancel();
    });
  }

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

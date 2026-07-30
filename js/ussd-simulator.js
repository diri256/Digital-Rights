/* =============================================
   DIRI - Digital Rights
   USSD Simulator (vanilla JS port of UssdSimulator.jsx)
   Dial *456# to explore digital rights resources
   ============================================= */

'use strict';

/* ------------------------------------------------------------------ */
/*  USSD MENU TREE & FAQ DATA                                         */
/* ------------------------------------------------------------------ */

const USSD_CODE = '*456#';

const USSD_LANGUAGES = {
  1: { code: 'en', name: 'English' },
  2: { code: 'nyn', name: 'Runyankole' },
  3: { code: 'lug', name: 'Luganda' },
  4: { code: 'ach', name: 'Acholi' },
};

/* Short USSD wording, reviewed easily in one place. A local-language reviewer
   can refine any phrase without changing the menu logic. */
const USSD_COPY = {
  en: {
    chooseLanguage: 'Choose Language', changeLanguage: '7. Change Language',
    main: ['1. Know Your Rights', '2. Report a Violation', '3. Find Legal Aid', '4. Ask a Question', '5. Check Report Status', '6. Quick Lessons'],
    lessons: ['1. Protect Your Privacy', '2. Share Safely', '3. Spot Scams', '4. Report Harm'],
    lessonContent: [
      ['Protect Your Privacy', 'Use strong, unique passwords and keep codes private.', 'Only share personal data when you trust the reason.'],
      ['Share Safely', 'Pause before posting: online content can spread fast.', "Ask consent before sharing another person's photo or details."],
      ['Spot Scams', 'Urgent messages asking for money or codes may be scams.', 'Verify through an official contact before you act.'],
      ['Report Harm', 'Save screenshots, dates and links as evidence.', 'Report abuse to the platform or seek trusted support.'],
    ],
  },
  nyn: {
    chooseLanguage: 'Komamu Orurimi', changeLanguage: '7. Hindura Orurimi',
    main: ["1. Manya Obugabe Bwawe", "2. Roorera Okutwarizibwa Kubi", "3. Noonya Obuyambi bw'Amateeka", "4. Buuza Ekibuuzo", "5. Kebera Alipoota Yawe", "6. Eby'Okwega by'Obufunze"],
    lessons: ["1. Kinga Ebyama Byawe", "2. Gabana n'Obwegendereza", "3. Manya Obushuma", "4. Roorera Obulabe"],
    lessonContent: [
      ["Kinga Ebyama Byawe", "Koresa ekigambo ky'okukingisa ekihamire kandi otagamba koodi zawe.", "Tanga amakuru gawe agarikukukwataho ahu orikumanya ensonga."],
      ["Gabana n'Obwegendereza", "Banza oteekateeke otaikireho aha mutimbagano.", "Shaba oruhusa otaikireho ekishushani ky'omuntu ondi."],
      ["Manya Obushuma", "Obutumwa oburikusaba sente nari koodi omu bwangu nibubaasa kuba bushuma.", "Banza okakasize aha rurimi rw'omutongore otaakozire."],
      ["Roorera Obulabe", "Hoza ebishushani, ebiro n'obukwate nk'obujurizi.", "Roorera obutwarizibwa kubi aha mutimbagano nari noona obuyambi."],
    ],
  },
  lug: {
    chooseLanguage: 'Londa Olulimi', changeLanguage: '7. Kyusa Olulimi',
    main: ["1. Manya Eddembe Lyo", "2. Loopa Okutulugunyizibwa", "3. Noonya Obuyambi bw'Amateeka", "4. Buuza Ekibuuzo", "5. Kebera Alipoota Yo", "6. Eby'Okuyiga mu Bufunze"],
    lessons: ["1. Kuuma Ebyama Byo", "2. Gabana n'Obwegendereza", "3. Manya Obukumpanya", "4. Loopa Obulabe"],
    lessonContent: [
      ["Kuuma Ebyama Byo", "Kozesa ekigambo eky'ekyama ekizibu era tokoowola koodi zo.", "Gabana ebikukwatako nga weetegedde ensonga yokka."],
      ["Gabana n'Obwegendereza", "Sooka olowooze nga tonnateeka ku mutimbagano.", "Saba olukusa nga tonnateeka kifaananyi oba bikwata ku muntu omulala."],
      ["Manya Obukumpanya", "Obubaka obwangu obusaba ssente oba koodi buyinza kuba bukumpanya.", "Kakasa n'omukutu omutongole nga tonnakola."],
      ["Loopa Obulabe", "Tereka ebifaananyi, ennaku n'enkolagana ng'obujulizi.", "Loopa okutulugunyizibwa ku mukutu oba nooza obuyambi."],
    ],
  },
  ach: {
    chooseLanguage: 'Yer Leb', changeLanguage: '7. Lok Leb',
    main: ["1. Ng'eyo Twero Mii", "2. Ripo Gengo", "3. Yeny Kony me Cik", "4. Penjo", "5. Rot Kit Ripo", "6. Pwony Macok"],
    lessons: ["1. Gwok Wele Mii", "2. Poko Kwek", "3. Ng'eyo Rwod", "4. Ripo Gengo"],
    lessonContent: [
      ['Gwok Wele Mii', 'Tiit ki passwod matek kede i miiy code ni ngat mo.', 'Poko ngec mii keken ka ingeyo gimomiyo.'],
      ['Poko Kwek', 'Pii tam amia i keto gin i intanet.', 'Peny yee ka i mito keto cal pa dano mukene.'],
      ['Ng\'eyo Rwod', 'Kwena ma cito nywako cente onyo code twero bedo rwod.', 'Mok kwena ki kabedo ma kite tye atir ka i pok otimo.'],
      ['Ripo Gengo', 'Gwok cal, nino kede link calo caden.', 'Ripo gengo i platform onyo yeny kony ma igeno.'],
    ],
  },
};

function languageCopy(ctx) {
  return USSD_COPY[(ctx && ctx.language) || 'en'];
}

const SIM_MENU_TREE = {
  root: {
    header: function (ctx) { return languageCopy(ctx).chooseLanguage; },
    body: ['1. English', '2. Runyankole', '3. Luganda', '4. Acholi'],
    options: { 1: 'main_menu', 2: 'main_menu', 3: 'main_menu', 4: 'main_menu' },
    onEnter: function (ctx, key) {
      ctx.language = USSD_LANGUAGES[key].code;
      return ctx;
    },
  },

  main_menu: {
    header: 'DIRI USSD',
    body: function (ctx) { return languageCopy(ctx).main.concat([languageCopy(ctx).changeLanguage]); },
    options: { 1: 'rights', 2: 'report_category', 3: 'legal_region', 4: 'faq_prompt', 5: 'status_prompt', 6: 'quick_lessons', 7: 'root' },
  },

  quick_lessons: {
    header: 'Quick Lessons',
    body: function (ctx) { return languageCopy(ctx).lessons; },
    options: { 1: 'lesson_privacy', 2: 'lesson_sharing', 3: 'lesson_scams', 4: 'lesson_reporting', 0: 'main_menu' },
  },
  lesson_privacy: {
    header: function (ctx) { return languageCopy(ctx).lessonContent[0][0]; },
    body: function (ctx) { return languageCopy(ctx).lessonContent[0].slice(1).concat(['0. Back  00. Main Menu']); },
    options: { 0: 'quick_lessons', '00': 'main_menu' },
  },
  lesson_sharing: {
    header: function (ctx) { return languageCopy(ctx).lessonContent[1][0]; },
    body: function (ctx) { return languageCopy(ctx).lessonContent[1].slice(1).concat(['0. Back  00. Main Menu']); },
    options: { 0: 'quick_lessons', '00': 'main_menu' },
  },
  lesson_scams: {
    header: function (ctx) { return languageCopy(ctx).lessonContent[2][0]; },
    body: function (ctx) { return languageCopy(ctx).lessonContent[2].slice(1).concat(['0. Back  00. Main Menu']); },
    options: { 0: 'quick_lessons', '00': 'main_menu' },
  },
  lesson_reporting: {
    header: function (ctx) { return languageCopy(ctx).lessonContent[3][0]; },
    body: function (ctx) { return languageCopy(ctx).lessonContent[3].slice(1).concat(['0. Back  00. Main Menu']); },
    options: { 0: 'quick_lessons', '00': 'main_menu' },
  },

  rights: {
    header: 'Know Your Rights',
    body: ['1. Freedom of Expression', '2. Right to Assembly', '3. Privacy & Data', '4. Arrest & Detention'],
    options: { 1: 'rights_expression', 2: 'rights_assembly', 3: 'rights_privacy', 4: 'rights_arrest', 0: 'main_menu' },
  },
  rights_expression: {
    header: 'Expression',
    body: [
      'You may speak, publish and post online without prior state approval.',
      'Limits exist only for incitement, defamation or true security threats.',
      '0. Back  00. Main Menu',
    ],
    options: { 0: 'rights', '00': 'main_menu' },
  },
  rights_assembly: {
    header: 'Assembly',
    body: [
      'Peaceful gatherings do not legally require police permission.',
      'Police must show a specific public-safety reason to disperse.',
      '0. Back  00. Main Menu',
    ],
    options: { 0: 'rights', '00': 'main_menu' },
  },
  rights_privacy: {
    header: 'Privacy & Data',
    body: [
      'Your calls, messages and location data are protected.',
      'Access by any party usually requires a court order.',
      '0. Back  00. Main Menu',
    ],
    options: { 0: 'rights', '00': 'main_menu' },
  },
  rights_arrest: {
    header: 'Arrest & Detention',
    body: [
      'Ask the officer\'s name, badge no. and the reason for arrest.',
      'You must be brought before a court within the legal time limit.',
      '0. Back  00. Main Menu',
    ],
    options: { 0: 'rights', '00': 'main_menu' },
  },

  report_category: {
    header: 'Report a Violation',
    body: ['Select category:', '1. Unlawful Arrest', '2. Assembly / Protest', '3. Online Censorship', '4. Other'],
    options: { 1: 'report_details', 2: 'report_details', 3: 'report_details', 4: 'report_details', 0: 'main_menu' },
    onEnter: function (ctx, key) {
      var cats = { 1: 'Unlawful Arrest', 2: 'Assembly / Protest', 3: 'Online Censorship', 4: 'Other' };
      ctx.category = cats[key];
      return ctx;
    },
  },
  report_details: {
    header: 'Describe briefly',
    body: function (ctx) { return ['Category: ' + ctx.category, 'Type a short description below, then press Send.', '(location, date, what happened)']; },
    input: 'text',
    onSubmit: function (ctx, text) {
      var ref = 'HL-' + Math.floor(1000 + Math.random() * 9000);
      var reports = ctx.reports || [];
      reports.push({ ref: ref, category: ctx.category, text: text });
      return { next: 'report_done', ctx: { reports: reports, lastRef: ref } };
    },
  },
  report_done: {
    header: 'Report Received',
    body: function (ctx) { return ['Reference code: ' + ctx.lastRef, 'Save this code to check status later.', 'This is a local demo.', '00. Main Menu']; },
    options: { '00': 'main_menu' },
  },

  legal_region: {
    header: 'Find Legal Aid',
    body: ['Choose your region:', '1. Central', '2. Northern', '3. Eastern', '4. Western'],
    options: { 1: 'legal_list', 2: 'legal_list', 3: 'legal_list', 4: 'legal_list', 0: 'main_menu' },
    onEnter: function (ctx, key) {
      var regions = { 1: 'Central', 2: 'Northern', 3: 'Eastern', 4: 'Western' };
      ctx.region = regions[key];
      return ctx;
    },
  },
  legal_list: {
    header: function (ctx) { return 'Legal Aid \u2014 ' + ctx.region; },
    body: function (ctx) {
      var dirs = {
        Central: ['Rights Clinic Kampala \u2014 0800 100 200', 'Bar Assoc. Legal Aid \u2014 0800 100 210'],
        Northern: ['Gulu Legal Desk \u2014 0800 100 220'],
        Eastern: ['Mbale Justice Centre \u2014 0800 100 230'],
        Western: ['Mbarara Aid Bureau \u2014 0800 100 240'],
      };
      return (dirs[ctx.region] || ['No listings for this region.']).concat(['All calls to 0800 numbers are free.', '0. Back  00. Main Menu']);
    },
    options: { 0: 'legal_region', '00': 'main_menu' },
  },

  faq_prompt: {
    header: 'Ask a Question',
    body: ['Type your question in a few words, then press Send.', 'e.g. "arrested no warrant"'],
    input: 'text',
    onSubmit: function (ctx, text) {
      var answer = answerFaq(text);
      ctx.lastQuery = text;
      ctx.lastAnswer = answer;
      return { next: 'faq_answer', ctx: ctx };
    },
  },
  faq_answer: {
    header: 'Answer',
    body: function (ctx) {
      var lines = [ctx.lastAnswer.text, ''];
      lines.push(ctx.lastAnswer.matched ? '1. Ask another  0. Main Menu' : '1. Ask another  2. Legal Aid  0. Main Menu');
      return lines;
    },
    options: function (ctx) {
      return ctx.lastAnswer.matched ? { 1: 'faq_prompt', 0: 'main_menu' } : { 1: 'faq_prompt', 2: 'legal_region', 0: 'main_menu' };
    },
  },

  status_prompt: {
    header: 'Check Report Status',
    body: ['Enter your reference code (e.g. HL-1234), then press Send.'],
    input: 'text',
    onSubmit: function (ctx, text) {
      var reports = ctx.reports || [];
      var found = reports.filter(function (r) { return r.ref.toLowerCase() === text.trim().toLowerCase(); })[0];
      ctx.statusResult = found || null;
      return { next: 'status_result', ctx: ctx };
    },
  },
  status_result: {
    header: 'Status',
    body: function (ctx) {
      return ctx.statusResult
        ? [ctx.statusResult.ref + ' \u2014 ' + ctx.statusResult.category, 'Status: Under Review', '00. Main Menu']
        : ['No report found for that code.', 'Reports only persist for this session.', '00. Main Menu'];
    },
    options: { '00': 'main_menu' },
  },
};

var SIM_FAQS = [
  { keywords: ['arrest', 'warrant', 'police', 'detain'], text: 'Police can arrest without a warrant only if they witness a crime or have strong reasonable suspicion. Ask for the reason and their badge number.' },
  { keywords: ['protest', 'assembly', 'permit', 'march', 'gathering'], text: 'Peaceful protests need only advance notice, not permission, in most jurisdictions. See Know Your Rights > Assembly for detail.' },
  { keywords: ['post', 'social', 'media', 'online', 'facebook', 'twitter', 'x', 'delete', 'removed'], text: 'Posting online is protected speech. If a platform or authority removed your content without clear legal grounds, log it under Report a Violation > Online Censorship.' },
  { keywords: ['phone', 'tapped', 'surveillance', 'data', 'privacy', 'track'], text: 'Access to your phone or location data by any party normally requires a court order. You can request any organisation disclose what data of yours they hold.' },
  { keywords: ['lawyer', 'afford', 'legal', 'aid', 'free', 'representation'], text: 'Free legal aid is available regionally \u2014 go to Find Legal Aid from the main menu to see contacts near you.' },
  { keywords: ['bail', 'court', 'days', 'held'], text: 'You must be brought before a court within the legal time limit after arrest \u2014 this varies by jurisdiction, ask your legal aid contact for the exact figure.' },
];

function answerFaq(query) {
  var words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  var best = null;
  var bestScore = 0;
  for (var i = 0; i < SIM_FAQS.length; i++) {
    var faq = SIM_FAQS[i];
    var score = 0;
    for (var j = 0; j < faq.keywords.length; j++) {
      var kw = faq.keywords[j];
      if (words.indexOf(kw) !== -1 || query.toLowerCase().indexOf(kw) !== -1) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }
  if (best && bestScore > 0) return { matched: true, text: best.text };
  return { matched: false, text: 'No matching answer on file. Try different words, or use option 2 below to reach Legal Aid directly.' };
}

/* ------------------------------------------------------------------ */
/*  USSD SIMULATOR ENGINE                                             */
/* ------------------------------------------------------------------ */

(function () {
  var container = document.getElementById('ussd-simulator');
  if (!container) return;

  /* --- State --- */
  var dialed = USSD_CODE;
  var sessionOn = false;
  var nodeId = 'root';
  var stack = [];
  var ctx = { reports: [] };
  var input = '';
  var flashMsg = '';
  var entered = true;
  var flashTimer = null;

  /* --- Long-press character map --- */
  var KEY_CHARS = {
    '2': ['A','B','C'], '3': ['D','E','F'],
    '4': ['G','H','I'], '5': ['J','K','L'],
    '6': ['M','N','O'], '7': ['P','Q','R','S'],
    '8': ['T','U','V'], '9': ['W','X','Y','Z'],
    '0': ['+']
  };

  var screenBodyEl, flashEl, inputField, promptEl, leftBtn, rightBtn;
  var charPopupEl = null;
  var longPressTimer = null;

  /* --- Helpers --- */
  function getNode(id) { return SIM_MENU_TREE[id]; }

  function resolve(val, arg) {
    return typeof val === 'function' ? val(arg) : val;
  }

  function showFlash(msg) {
    flashMsg = msg;
    if (flashTimer) clearTimeout(flashTimer);
    updateScreen();
    flashTimer = setTimeout(function () {
      flashMsg = '';
      updateScreen();
    }, 1200);
  }

  function clock() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  /* --- Actions --- */
  function startSession() {
    if (dialed.trim() !== USSD_CODE) {
      showFlash('Invalid USSD code');
      return;
    }
    sessionOn = true;
    nodeId = 'root';
    stack = [];
    ctx = { reports: ctx.reports || [] };
    input = '';
    updateScreen();
  }

  function endSession() {
    sessionOn = false;
    dialed = USSD_CODE;
    input = '';
    stack = [];
    nodeId = 'root';
    updateScreen();
  }

  function goBack() {
    if (!sessionOn) {
      dialed = '';
      updateScreen();
      return;
    }
    if (stack.length > 0) {
      nodeId = stack.pop();
      input = '';
      updateScreen();
    } else {
      endSession();
    }
  }

  function send() {
    if (!sessionOn) { startSession(); return; }
    var val = input.trim();
    if (!val) return;

    var node = getNode(nodeId);
    if (node && node.input === 'text') {
      var result = node.onSubmit(ctx, val);
      stack.push(nodeId);
      ctx = result.ctx;
      nodeId = result.next;
      input = '';
      updateScreen();
      return;
    }

    var opts = resolve(node && node.options, ctx);
    if (opts && opts[val] !== undefined) {
      var next = opts[val];
      if (node && node.onEnter) ctx = node.onEnter(ctx, val);
      stack = next === 'root' ? [] : stack.concat([nodeId]);
      nodeId = next;
      input = '';
      updateScreen();
    } else {
      showFlash('Invalid option');
      input = '';
      updateScreen();
    }
  }

  function keyPress(k) {
    if (!sessionOn) {
      dialed += k;
    } else {
      input += k;
    }
    updateScreen();
  }

  function backspace() {
    if (!sessionOn) {
      dialed = dialed.slice(0, -1);
    } else {
      input = input.slice(0, -1);
    }
    updateScreen();
  }

  /* --- Long-press character popup --- */
  function hideCharPopup() {
    /* Remove existing popup and backdrop */
    var existingBackdrop = document.querySelector('.ussd-char-popup-backdrop');
    if (existingBackdrop) existingBackdrop.remove();
    var existingPopup = document.querySelector('.ussd-char-popup');
    if (existingPopup) existingPopup.remove();
    charPopupEl = null;
  }

  function showCharPopup(keyBtn) {
    hideCharPopup();

    var key = keyBtn.getAttribute('data-key');
    var chars = KEY_CHARS[key];
    if (!chars) return;

    /* Backdrop to catch outside clicks */
    var backdrop = document.createElement('div');
    backdrop.className = 'ussd-char-popup-backdrop';
    backdrop.addEventListener('click', hideCharPopup);
    backdrop.addEventListener('touchstart', hideCharPopup);
    document.body.appendChild(backdrop);

    /* Popup */
    var popup = document.createElement('div');
    popup.className = 'ussd-char-popup';
    for (var i = 0; i < chars.length; i++) {
      (function (ch) {
        var btn = document.createElement('button');
        btn.textContent = ch;
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          insertChar(ch);
        });
        btn.addEventListener('touchend', function (e) {
          e.preventDefault();
          e.stopPropagation();
          insertChar(ch);
        });
        popup.appendChild(btn);
      })(chars[i]);
    }

    /* Position popup above the key using fixed coords */
    var rect = keyBtn.getBoundingClientRect();
    var popupWidth = chars.length * 30 + 12; /* approximate */
    var left = rect.left + (rect.width / 2) - (popupWidth / 2);
    var top = rect.top - 6;

    popup.style.position = 'fixed';
    popup.style.left = Math.max(4, left) + 'px';
    popup.style.top = Math.max(4, top) + 'px';

    document.body.appendChild(popup);
    charPopupEl = popup;
  }

  function insertChar(ch) {
    if (sessionOn) input += ch;
    else dialed += ch;
    updateScreen();
    hideCharPopup();
    if (inputField) inputField.focus();
  }

  /* --- Screen Update --- */
  function updateScreen() {
    if (!screenBodyEl) return;

    var node = getNode(nodeId);
    var headerText = resolve(node && node.header, ctx);
    var bodyLines = resolve(node && node.body, ctx) || [];
    var leftLabel = !sessionOn ? 'Call' : (node && node.input === 'text' ? 'Send' : 'Select');
    var rightLabel = !sessionOn ? 'Clear' : 'Back';

    var html = '';
    if (!sessionOn) {
      html = '<div class="ussd-idle">Enter USSD code and press Call</div>';
    } else {
      html = '<div class="ussd-header"><span class="ussd-dot"></span>' + escapeHtml(headerText) + '</div>';
      html += '<div class="ussd-body">';
      for (var i = 0; i < bodyLines.length; i++) {
        html += '<div>' + escapeHtml(bodyLines[i]) + '</div>';
      }
      html += '</div>';
    }

    screenBodyEl.innerHTML = html;

    /* Flash */
    if (flashEl) {
      flashEl.textContent = flashMsg;
      flashEl.style.display = flashMsg ? 'block' : 'none';
    }

    /* Input */
    if (inputField) {
      inputField.value = sessionOn ? input : dialed;
    }

    /* Prompt */
    if (promptEl) promptEl.textContent = sessionOn ? '\u203A' : '';

    /* Labels */
    if (leftBtn) leftBtn.textContent = leftLabel;
    if (rightBtn) rightBtn.textContent = rightLabel;

    /* Focus input during session */
    if (sessionOn && inputField) inputField.focus();
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* --- Render Phone UI --- */
  function render() {
    container.innerHTML =
      '<div class="ussd-wrapper">' +
        '<div class="ussd-phone">' +
          '<div class="ussd-side-btn ussd-side-btn-top"></div>' +
          '<div class="ussd-side-btn ussd-side-btn-bottom"></div>' +
          '<div class="ussd-side-btn ussd-side-btn-left"></div>' +

          '<div class="ussd-earpiece">' +
            '<span class="ussd-camera"></span>' +
            '<span class="ussd-speaker"></span>' +
          '</div>' +

          '<div class="ussd-screen">' +
            '<div class="ussd-glass"></div>' +
            '<div class="ussd-statusbar">' +
              '<div class="ussd-signal">' +
                '<span class="ussd-bar" style="height:3px"></span>' +
                '<span class="ussd-bar" style="height:5px"></span>' +
                '<span class="ussd-bar" style="height:7px"></span>' +
                '<span class="ussd-bar" style="height:9px"></span>' +
              '</div>' +
              '<span class="ussd-operator">DIRI</span>' +
              '<div class="ussd-battery">' +
                '<span class="ussd-time" id="ussdTime">' + clock() + '</span>' +
                '<svg width="14" height="10" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                  '<rect x="0.5" y="0.5" width="17" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/>' +
                  '<rect x="2.5" y="2.5" width="13" height="9" rx="1" fill="currentColor" opacity="0.6"/>' +
                  '<path d="M19 4.5V9.5C19.8284 9.5 20.5 8.82843 20.5 8V6C20.5 5.17157 19.8284 4.5 19 4.5Z" fill="currentColor" opacity="0.4"/>' +
                '</svg>' +
              '</div>' +
            '</div>' +

            '<div class="ussd-screen-content">' +
              '<div class="ussd-screen-body" id="ussdScreenBody"></div>' +
              '<div class="ussd-flash" id="ussdFlash"></div>' +
              '<div class="ussd-input-line">' +
                '<span class="ussd-prompt"></span>' +
                '<input type="text" class="ussd-input" id="ussdInput" spellcheck="false" autocomplete="off" />' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="ussd-softkeys">' +
            '<button class="ussd-softkey" id="ussdLeftBtn">Call</button>' +
            '<button class="ussd-softkey" id="ussdRightBtn">Clear</button>' +
          '</div>' +

          '<div class="ussd-nav">' +
            '<button class="ussd-nav-btn ussd-nav-call" id="ussdNavCall" aria-label="Call/OK">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" fill="currentColor"/>' +
              '</svg>' +
            '</button>' +
            '<button class="ussd-nav-btn ussd-nav-ok" id="ussdNavOk" aria-label="OK">OK</button>' +
            '<button class="ussd-nav-btn ussd-nav-end" id="ussdNavEnd" aria-label="End call">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M19.53 14.07A16.01 16.01 0 005.47 14.07L2.27 10.87a1 1 0 01-.27-.88C2.21 5.79 6.33 3 11.2 3h1.6c4.87 0 8.99 2.79 9.2 6.99a1 1 0 01-.27.88l-3.2 3.2z" fill="currentColor"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +

          '<div class="ussd-keypad">' +
            '<button class="ussd-key" data-key="1"><span class="ussd-key-digit">1</span></button>' +
            '<button class="ussd-key" data-key="2"><span class="ussd-key-digit">2</span><span class="ussd-key-letters">ABC</span></button>' +
            '<button class="ussd-key" data-key="3"><span class="ussd-key-digit">3</span><span class="ussd-key-letters">DEF</span></button>' +
            '<button class="ussd-key" data-key="4"><span class="ussd-key-digit">4</span><span class="ussd-key-letters">GHI</span></button>' +
            '<button class="ussd-key" data-key="5"><span class="ussd-key-digit">5</span><span class="ussd-key-letters">JKL</span></button>' +
            '<button class="ussd-key" data-key="6"><span class="ussd-key-digit">6</span><span class="ussd-key-letters">MNO</span></button>' +
            '<button class="ussd-key" data-key="7"><span class="ussd-key-digit">7</span><span class="ussd-key-letters">PQRS</span></button>' +
            '<button class="ussd-key" data-key="8"><span class="ussd-key-digit">8</span><span class="ussd-key-letters">TUV</span></button>' +
            '<button class="ussd-key" data-key="9"><span class="ussd-key-digit">9</span><span class="ussd-key-letters">WXYZ</span></button>' +
            '<button class="ussd-key" data-key="*"><span class="ussd-key-digit">*</span></button>' +
            '<button class="ussd-key" data-key="0"><span class="ussd-key-digit">0</span><span class="ussd-key-letters">+</span></button>' +
            '<button class="ussd-key" data-key="#"><span class="ussd-key-digit">#</span></button>' +
          '</div>' +

          '<div class="ussd-clear-row">' +
            '<button class="ussd-clear-btn" id="ussdClearBtn">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" fill="currentColor" opacity="0.7"/>' +
                '<path d="M18 9l-6 6M12 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
              '</svg>' +
              ' Clear' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    /* Cache DOM refs */
    screenBodyEl = document.getElementById('ussdScreenBody');
    flashEl = document.getElementById('ussdFlash');
    inputField = document.getElementById('ussdInput');
    promptEl = document.querySelector('.ussd-prompt');
    leftBtn = document.getElementById('ussdLeftBtn');
    rightBtn = document.getElementById('ussdRightBtn');

    var clockEl = document.getElementById('ussdTime');
    setInterval(function () { if (clockEl) clockEl.textContent = clock(); }, 15000);

    /* Attach events */
    inputField.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
      if (e.key === 'Backspace' && !inputField.value) {
        e.preventDefault();
        backspace();
      }
    });
    inputField.addEventListener('input', function () {
      if (sessionOn) input = inputField.value;
      else dialed = inputField.value;
    });

    leftBtn.addEventListener('click', send);
    rightBtn.addEventListener('click', goBack);

    document.getElementById('ussdNavCall').addEventListener('click', send);
    document.getElementById('ussdNavOk').addEventListener('click', send);
    document.getElementById('ussdNavEnd').addEventListener('click', endSession);
    document.getElementById('ussdClearBtn').addEventListener('click', backspace);

    /* Keypad with long-press support */
    var keys = document.querySelectorAll('.ussd-key');
    for (var i = 0; i < keys.length; i++) {
      (function (btn) {
        var pressTimer = null;
        var isLongPress = false;

        function clearPressTimer() {
          if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        }

        function startPress(e) {
          /* If popup is already open, close it first */
          hideCharPopup();
          isLongPress = false;
          btn.classList.add('ussd-key-pressed');
          e.preventDefault();

          clearPressTimer();
          pressTimer = setTimeout(function () {
            isLongPress = true;
            btn.classList.remove('ussd-key-pressed');
            showCharPopup(btn);
            pressTimer = null;
          }, 500);
        }

        function endPress(e) {
          clearPressTimer();
          btn.classList.remove('ussd-key-pressed');
          if (!isLongPress) {
            keyPress(btn.getAttribute('data-key'));
          }
          isLongPress = false;
        }

        btn.addEventListener('mousedown', startPress);
        btn.addEventListener('mouseup', endPress);
        btn.addEventListener('mouseleave', function (e) {
          clearPressTimer();
          btn.classList.remove('ussd-key-pressed');
        });

        btn.addEventListener('touchstart', startPress, { passive: false });
        btn.addEventListener('touchend', endPress, { passive: false });
        btn.addEventListener('touchcancel', function () {
          clearPressTimer();
          btn.classList.remove('ussd-key-pressed');
          isLongPress = false;
        });
      })(keys[i]);
    }

    updateScreen();
  }

  render();
})();

/* =============================================
   DIRI - Digital Rights
   Main JavaScript
   ============================================= */

'use strict';

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', function () {

  // =============================================
  // 1. MOBILE MENU
  // =============================================
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileOverlay = document.querySelector('.mobile-overlay');
  const body = document.body;

  // Keep the official contact address visible in every full site footer.
  document.querySelectorAll('.footer-column').forEach(function (column) {
    const heading = column.querySelector('h4');
    if (!heading || heading.textContent.trim() !== 'Team Netizens') return;
    if (column.querySelector('a[href=\"mailto:diriuganda@gmail.com\"]')) return;

    const emailLink = document.createElement('a');
    emailLink.href = 'mailto:diriuganda@gmail.com';
    emailLink.textContent = 'diriuganda@gmail.com';
    column.appendChild(emailLink);
  });
  function toggleMenu(open) {
    const isOpen = open !== undefined ? open : !menuToggle.classList.contains('active');
    menuToggle.classList.toggle('active', isOpen);
    mobileNav.classList.toggle('open', isOpen);
    mobileOverlay.classList.toggle('open', isOpen);
    body.style.overflow = isOpen ? 'hidden' : '';
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      toggleMenu();
    });

    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', function () {
        toggleMenu(false);
      });
    }

    // Close on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') toggleMenu(false);
    });
  }

  // Close mobile nav when a link is clicked
  if (mobileNav) {
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggleMenu(false);
      });
    });
  }

  // =============================================
  // 2. HEADER SCROLL EFFECT
  // =============================================
  const header = document.querySelector('.header');
  let lastScroll = 0;

  window.addEventListener('scroll', function () {
    const currentScroll = window.pageYOffset;

    // Add shadow on scroll
    if (currentScroll > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  }, { passive: true });

  // =============================================
  // 3. ACTIVE NAV LINK HIGHLIGHT
  // =============================================
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.header-nav a, .mobile-nav a').forEach(function (link) {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // =============================================
  // 4. SCROLL ANIMATIONS (Intersection Observer)
  // =============================================
  const animateElements = document.querySelectorAll('.animate-in, .stagger-children');

  if (animateElements.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    animateElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show all animated elements immediately
    animateElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // =============================================
  // 5. QUIZ INTERACTION
  // =============================================
  const quizOptions = document.querySelectorAll('.quiz-option');

  quizOptions.forEach(function (option) {
    option.addEventListener('click', function () {
      const parent = this.closest('.quiz-question');
      if (!parent) return;

      // Deselect siblings
      parent.querySelectorAll('.quiz-option').forEach(function (opt) {
        opt.classList.remove('selected');
      });

      // Select this
      this.classList.add('selected');
    });
  });

  // =============================================
  // 6. CHATBOT
  // =============================================
  const chatInput = document.querySelector('.chat-input');
  const chatSendBtn = document.querySelector('.chat-send-btn');
  const chatMessages = document.querySelector('.chat-messages');
  const chatForm = document.querySelector('.chat-window-input');

  if (chatForm && chatMessages) {
    function addMessage(text, sender, delay) {
      delay = delay || 0;

      setTimeout(function () {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message ' + sender;

        const avatar = document.createElement('div');
        avatar.className = 'msg-avatar';
        avatar.textContent = sender === 'bot' ? 'D' : 'U';

        const bubbleWrapper = document.createElement('div');

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = text;

        const time = document.createElement('div');
        time.className = 'msg-time';
        const now = new Date();
        time.textContent = now.getHours().toString().padStart(2, '0') + ':' +
                           now.getMinutes().toString().padStart(2, '0');

        bubbleWrapper.appendChild(bubble);
        bubbleWrapper.appendChild(time);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubbleWrapper);
        chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, delay);
    }

    function handleDemoChatSubmit(e) {
      if (e) e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;

      addMessage(text, 'user');
      chatInput.value = '';

      // Auto-reply after a brief delay
      const botReplies = [
        "Great question! Digital rights protect your freedom and privacy online. In Uganda, the Data Protection and Privacy Act (2019) is a key law to know about. Want me to explain more?",
        "That's an important topic! Online safety starts with strong passwords, two-factor authentication, and being careful about what you share. I can walk you through best practices.",
        "Good one! Cybersecurity is about protecting your devices and data from threats. Think of it as digital self-defense. Would you like specific tips?",
        "That's relevant! Data protection laws give you rights over your personal information — including the right to know what data is collected and to request its deletion.",
        "Interesting topic! Misinformation spreads fast online. Always verify sources, check dates, and look for fact-checking organizations before sharing."
      ];

      const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];
      addMessage(randomReply, 'bot', 800 + Math.random() * 1000);
    }

    const chatHistory = [];

    function cleanChatText(text) {
      return String(text || '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*[-*]\s+/gm, '• ');
    }

    async function reportAiResponse(question, responseText, button) {
      const reason = window.prompt('What seems incorrect or unsafe about this answer?');
      if (reason === null) return;
      if (reason.trim().length < 3) {
        window.alert('Please briefly explain what seems incorrect.');
        return;
      }

      button.disabled = true;
      button.textContent = 'Sending report...';
      const result = await window.diriSupabase.functions.invoke('report-ai-response', {
        body: {
          question: question,
          response: responseText,
          reason: reason.trim(),
          pageUrl: window.location.href,
          website: ''
        }
      });

      if (result.error) {
        button.disabled = false;
        button.textContent = 'Report this answer';
        window.alert('We could not send your report right now. Please try again.');
        return;
      }

      button.textContent = 'Reported — thank you';
      button.classList.add('reported');
    }

    function addLiveMessage(text, sender, extraClass, sources, reportQuestion) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'chat-message ' + sender + (extraClass ? ' ' + extraClass : '');
      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.textContent = sender === 'bot' ? 'D' : 'U';
      const bubbleWrapper = document.createElement('div');
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.textContent = cleanChatText(text);
      if (sender === 'bot' && Array.isArray(sources) && sources.length) {
        const sourceList = document.createElement('div');
        sourceList.className = 'msg-sources';
        const label = document.createElement('span');
        label.textContent = 'Sources: ';
        sourceList.appendChild(label);
        sources.forEach(function (source, index) {
          const link = document.createElement('a');
          link.href = source.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = source.title || ('Source ' + (index + 1));
          sourceList.appendChild(link);
        });
        bubble.appendChild(sourceList);
      }
      const time = document.createElement('div');
      time.className = 'msg-time';
      const now = new Date();
      time.textContent = now.getHours().toString().padStart(2, '0') + ':' +
                         now.getMinutes().toString().padStart(2, '0');
      bubbleWrapper.appendChild(bubble);
      bubbleWrapper.appendChild(time);
      if (sender === 'bot' && reportQuestion && !extraClass) {
        const reportButton = document.createElement('button');
        reportButton.type = 'button';
        reportButton.className = 'msg-report-button';
        reportButton.textContent = 'Report this answer';
        reportButton.addEventListener('click', function () {
          reportAiResponse(reportQuestion, text, reportButton);
        });
        bubbleWrapper.appendChild(reportButton);
      }
      messageDiv.appendChild(avatar);
      messageDiv.appendChild(bubbleWrapper);
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return messageDiv;
    }

    async function handleChatSubmit(e) {
      if (e) e.preventDefault();
      const text = chatInput.value.trim();
      if (!text || chatSendBtn.disabled) return;

      addLiveMessage(text, 'user');
      chatInput.value = '';
      chatSendBtn.disabled = true;
      chatInput.disabled = true;
      const typingMessage = addLiveMessage('Mr. DIRI is thinking...', 'bot', 'typing');

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: chatHistory.slice(-10) })
        });
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || 'Mr. DIRI could not answer right now.');
        typingMessage.remove();
        addLiveMessage(data.reply, 'bot', '', data.sources, text);
        chatHistory.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
        if (chatHistory.length > 10) chatHistory.splice(0, chatHistory.length - 10);
      } catch (error) {
        typingMessage.remove();
        const message = error instanceof TypeError
          ? 'Mr. DIRI could not reach the server. Check your connection and try again.'
          : (error.message || 'Mr. DIRI is temporarily unavailable. Please try again.');
        addLiveMessage(message, 'bot', 'error');
      } finally {
        chatSendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
      }
    }

    chatForm.addEventListener('submit', handleChatSubmit);

    // Enable send on enter key
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleChatSubmit(e);
        }
      });
    }
  }

  // =============================================
  // 7. INTERACTIVE LESSONS
  // =============================================
  const lessonLibrary = {
    privacy: {
      category: 'Privacy',
      title: 'Online Privacy & Data Protection',
      videoTitle: 'A cyber privacy parable',
      video: 'https://www.youtube-nocookie.com/embed/H0I7jQb37bo?rel=0',
      cards: [
        ['Personal data', 'Personal data is information that can identify you directly or indirectly, such as your name, phone number, location, photograph, device ID, or account activity.'],
        ['Responsible data collection', 'Before collecting your data, an organisation should clearly explain what it collects, why it needs it, how it will use it, and who it may share it with.'],
        ['Data minimisation', 'Responsible services collect only the personal information genuinely needed for a stated purpose, rather than collecting everything possible.'],
        ['Protecting your privacy', 'Review app permissions, remove access that is unnecessary, use privacy settings, and avoid posting information that could expose you or others.']
      ]
    },
    cybersecurity: {
      category: 'Security',
      title: 'Cybersecurity Fundamentals',
      videoTitle: 'Cybersecurity 101',
      video: 'https://www.youtube-nocookie.com/embed/sdpxddDzXfE?rel=0',
      cards: [
        ['Strong passwords', 'Use a long, unique passphrase for every account. A password manager can create and store these safely.'],
        ['Two-factor authentication', 'Two-factor authentication adds a second check, so a stolen password alone is usually not enough to enter your account.'],
        ['Recognising phishing', 'Phishing uses a message or website that impersonates a trusted person or organisation to make you reveal information, pay money, or install malware.'],
        ['Essential security habits', 'Update devices, lock screens, back up important files, verify unexpected requests, and never share PINs or one-time codes.']
      ]
    },
    governance: {
      category: 'Governance',
      title: 'Internet Governance',
      videoTitle: 'Understanding internet governance',
      video: 'https://www.youtube-nocookie.com/embed/eKHxgaTtMeA?rel=0',
      cards: [
        ['Internet governance', 'Internet governance covers the shared rules, standards, policies, and decisions that shape how the internet develops and is used.'],
        ['The people involved', 'No single person governs the internet. Governments, companies, civil society, technical bodies, researchers, and users all influence it.'],
        ['The multistakeholder approach', 'Different affected groups participate in discussion and decision-making instead of leaving every choice to one institution.'],
        ['The value of participation', 'Internet policy affects access, affordability, privacy, expression, safety, innovation, and opportunities for education and work in Uganda.']
      ]
    },
    ai: {
      category: 'AI Policy',
      title: 'Artificial Intelligence & Policy',
      videoTitle: 'AI and algorithmic bias',
      video: 'https://www.youtube-nocookie.com/embed/VwAlOUE4K7M?rel=0',
      cards: [
        ['Artificial intelligence', 'AI refers to computer systems designed to perform tasks such as recognising patterns, generating content, making predictions, or supporting decisions.'],
        ['AI and human rights', 'AI can influence privacy, equality, work, education, access to services, and freedom of expression—positively or negatively.'],
        ['Algorithmic bias', 'Algorithmic bias means unfair patterns in an automated system, often caused by biased data, design choices, or unequal conditions in the real world.'],
        ['Responsible AI', 'Responsible AI requires a clear purpose, human oversight, privacy protection, security, testing for harm, transparency, and a way to challenge decisions.']
      ]
    },
    rights: {
      category: 'Rights',
      title: 'Digital Rights & Freedoms',
      videoTitle: 'Digital rights and freedom',
      video: 'https://www.youtube-nocookie.com/embed/0E-cJinCgW8?rel=0',
      cards: [
        ['Digital rights', 'Digital rights are human rights as they apply online, including privacy, expression, information access, participation, equality, and safety.'],
        ['Freedom and responsibility', 'Freedom of expression is not unlimited. Rights come with responsibilities, and lawful limits may protect people from threats, harassment, or serious harm.'],
        ['Meaningful internet access', 'Meaningful access includes reliable and affordable connectivity, suitable devices, digital skills, accessible services, and the freedom to use the internet safely.'],
        ['Defending digital rights', 'Learn your rights, document possible violations safely, support trustworthy civic groups, and take part in public policy discussions.']
      ]
    },
    scams: {
      category: 'Security',
      title: 'Online Scams & Fraud Prevention',
      videoTitle: 'Common online scams',
      video: 'https://www.youtube-nocookie.com/embed/k8UVnkh8i0c?rel=0',
      cards: [
        ['Warning signs of a scam', 'Unexpected urgency is a major warning sign: pressure to act immediately, keep a secret, send money, or provide a code before verifying the story.'],
        ['Verifying payment requests', 'Stop and contact the person or organisation through a trusted number or official channel—not the contact details in the suspicious message.'],
        ['Information you must protect', 'Never share your mobile-money PIN, banking password, full card details, recovery code, or one-time verification code.'],
        ['Responding to a scam attempt', 'Stop contact, save evidence, secure affected accounts, notify the payment provider quickly, and report through appropriate official channels.']
      ]
    },
    identity: {
      category: 'Rights',
      title: 'Digital Identity & Citizenship',
      videoTitle: 'Digital identity explained',
      video: 'https://www.youtube-nocookie.com/embed/Ew-_F-OtDFI?rel=0',
      cards: [
        ['Digital identity', 'Your digital identity includes the information, accounts, identifiers, and activity that represent you when using digital services.'],
        ['Protecting identity documents', 'Images and numbers from IDs can be abused for impersonation, fraudulent registration, account recovery, or social engineering.'],
        ['Your digital footprint', 'A digital footprint is the record created by posts, searches, clicks, accounts, device data, and information that others publish about you.'],
        ['Managing your footprint', 'Search your name occasionally, review old posts and permissions, secure accounts, and think about future audiences before sharing.']
      ]
    },
    'mobile-money': {
      category: 'Privacy',
      title: 'Mobile Money & Financial Privacy',
      videoTitle: 'Understanding mobile money fraud',
      video: 'https://www.youtube-nocookie.com/embed/0twZ6EuLkRM?rel=0',
      cards: [
        ['Protecting your PIN', 'Only you should know your mobile-money PIN. A legitimate agent, telecom employee, bank worker, or support representative should never ask you to reveal it.'],
        ['Checking every transaction', 'Check the recipient name, number, amount, fee, and reason for payment. Read the complete confirmation screen before entering your PIN.'],
        ['SIM-swap fraud', 'In a SIM-swap scam, a criminal takes control of a phone number and may intercept messages or attempt to reset financial and online accounts.'],
        ['Reducing financial risk', 'Lock your phone and SIM, hide transaction messages, use strong account recovery settings, and report a lost phone immediately.']
      ]
    },
    misinformation: {
      category: 'Governance',
      title: 'Misinformation & Media Literacy',
      videoTitle: 'The facts about fact-checking',
      video: 'https://www.youtube-nocookie.com/embed/EZsaA0w_0z0?rel=0',
      cards: [
        ['Misinformation', 'Misinformation is false or misleading information shared regardless of whether the person sharing it intended to deceive anyone.'],
        ['Lateral reading', 'Lateral reading means leaving the original post or website to check what independent, credible sources say about the claim and its publisher.'],
        ['Checks before sharing', 'Inspect the original source, publication date, evidence, full context, author, image origin, and confirmation from reliable independent sources.'],
        ['Emotion and verification', 'Content that causes fear or anger can make people react quickly. Pause before sharing and verify the claim when emotions are high.']
      ]
    }
  };

  const lessonModal = document.querySelector('[data-lesson-modal]');
  if (lessonModal) {
    const lessonTitle = lessonModal.querySelector('[data-lesson-title]');
    const lessonCategory = lessonModal.querySelector('[data-lesson-category]');
    const cardCounter = lessonModal.querySelector('[data-card-counter]');
    const cardProgress = lessonModal.querySelector('[data-card-progress]');
    const cardFront = lessonModal.querySelector('[data-card-front]');
    const cardBack = lessonModal.querySelector('[data-card-back]');
    const cardLabel = lessonModal.querySelector('[data-card-label]');
    const flashcard = lessonModal.querySelector('[data-flashcard]');
    const cardJumpList = lessonModal.querySelector('[data-card-jump-list]');
    const cardStage = lessonModal.querySelector('[data-card-stage]');
    const cardGrid = lessonModal.querySelector('[data-card-grid]');
    const previousCard = lessonModal.querySelector('[data-card-previous]');
    const nextCard = lessonModal.querySelector('[data-card-next]');
    const videoFrame = lessonModal.querySelector('[data-lesson-video]');
    const videoTitle = lessonModal.querySelector('[data-video-title]');
    let activeLesson = null;
    let activeCard = 0;
    let lastLessonTrigger = null;

    function renderFlashcard() {
      const card = activeLesson.cards[activeCard];
      cardFront.textContent = card[0];
      cardBack.textContent = card[1];
      cardLabel.textContent = 'Card ' + (activeCard + 1);
      cardCounter.textContent = 'Card ' + (activeCard + 1) + ' of ' + activeLesson.cards.length;
      cardProgress.style.width = (((activeCard + 1) / activeLesson.cards.length) * 100) + '%';
      previousCard.disabled = activeCard === 0;
      nextCard.textContent = activeCard === activeLesson.cards.length - 1 ? 'Start again' : 'Next →';
      cardJumpList.querySelectorAll('[data-card-jump]').forEach(function (button) {
        const selected = Number(button.dataset.cardJump) === activeCard;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-current', selected ? 'step' : 'false');
      });
    }

    function renderCardJumpList() {
      cardJumpList.textContent = '';
      activeLesson.cards.forEach(function (card, index) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'flashcard-jump-button';
        button.dataset.cardJump = index;
        button.setAttribute('aria-label', 'Go to card ' + (index + 1) + ': ' + card[0]);

        const number = document.createElement('span');
        number.textContent = index + 1;
        const title = document.createElement('h4');
        title.textContent = card[0];
        const content = document.createElement('p');
        content.textContent = card[1];
        button.appendChild(number);
        button.appendChild(title);
        button.appendChild(content);
        button.addEventListener('click', function () {
          activeCard = index;
          renderFlashcard();
          setCardGrid(false);
        });
        cardJumpList.appendChild(button);
      });
    }

    function setCardGrid(showGrid) {
      cardStage.classList.toggle('hidden', showGrid);
      cardGrid.classList.toggle('hidden', !showGrid);
      lessonModal.classList.remove('focus-mode');
      if (showGrid) {
        cardGrid.querySelector('[data-card-jump="' + activeCard + '"]').focus();
      } else {
        flashcard.focus();
      }
    }

    function setFocusMode(enabled) {
      cardGrid.classList.add('hidden');
      cardStage.classList.remove('hidden');
      lessonModal.classList.toggle('focus-mode', enabled);
      if (enabled) {
        lessonModal.querySelector('[data-exit-focus]').focus();
      } else {
        lessonModal.querySelector('[data-enter-focus]').focus();
      }
    }

    function setLessonMode(mode) {
      lessonModal.classList.remove('focus-mode');
      cardStage.classList.remove('hidden');
      cardGrid.classList.add('hidden');
      lessonModal.querySelectorAll('[data-lesson-mode]').forEach(function (button) {
        const selected = button.dataset.lessonMode === mode;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      lessonModal.querySelectorAll('[data-lesson-panel]').forEach(function (panel) {
        panel.classList.toggle('hidden', panel.dataset.lessonPanel !== mode);
      });
      if (mode === 'video' && activeLesson && videoFrame.getAttribute('src') !== activeLesson.video) {
        videoFrame.setAttribute('src', activeLesson.video);
      }
    }

    function openLesson(id, trigger) {
      activeLesson = lessonLibrary[id];
      if (!activeLesson) return;
      activeCard = 0;
      lastLessonTrigger = trigger;
      lessonTitle.textContent = activeLesson.title;
      lessonCategory.textContent = activeLesson.category;
      videoTitle.textContent = activeLesson.videoTitle;
      videoFrame.removeAttribute('src');
      videoFrame.setAttribute('src', activeLesson.video);
      renderCardJumpList();
      renderFlashcard();
      setLessonMode('cards');
      lessonModal.classList.remove('hidden');
      document.body.classList.add('lesson-open');
      lessonModal.querySelector('[data-close-lesson]').focus();
    }

    function closeLesson() {
      lessonModal.classList.remove('focus-mode');
      lessonModal.classList.add('hidden');
      document.body.classList.remove('lesson-open');
      videoFrame.removeAttribute('src');
      if (lastLessonTrigger) lastLessonTrigger.focus();
    }

    document.querySelectorAll('[data-open-lesson]').forEach(function (button) {
      button.addEventListener('click', function () { openLesson(button.dataset.openLesson, button); });
    });
    lessonModal.querySelector('[data-close-lesson]').addEventListener('click', closeLesson);
    lessonModal.querySelector('[data-show-card-grid]').addEventListener('click', function () { setCardGrid(true); });
    lessonModal.querySelector('[data-hide-card-grid]').addEventListener('click', function () { setCardGrid(false); });
    lessonModal.querySelector('[data-enter-focus]').addEventListener('click', function () { setFocusMode(true); });
    lessonModal.querySelector('[data-exit-focus]').addEventListener('click', function () { setFocusMode(false); });
    lessonModal.addEventListener('click', function (event) {
      if (event.target === lessonModal) closeLesson();
    });
    previousCard.addEventListener('click', function () {
      if (activeCard > 0) activeCard--;
      renderFlashcard();
    });
    nextCard.addEventListener('click', function () {
      activeCard = activeCard === activeLesson.cards.length - 1 ? 0 : activeCard + 1;
      renderFlashcard();
    });
    lessonModal.querySelectorAll('[data-lesson-mode]').forEach(function (button) {
      button.addEventListener('click', function () { setLessonMode(button.dataset.lessonMode); });
    });
    document.addEventListener('keydown', function (event) {
      if (lessonModal.classList.contains('hidden')) return;
      if (event.key === 'Escape') {
        if (lessonModal.classList.contains('focus-mode')) {
          setFocusMode(false);
        } else if (!cardGrid.classList.contains('hidden')) {
          setCardGrid(false);
        } else {
          closeLesson();
        }
        return;
      }
      if (event.key === 'ArrowLeft' && activeCard > 0) {
        activeCard--;
        renderFlashcard();
      }
      if (event.key === 'ArrowRight') {
        activeCard = activeCard === activeLesson.cards.length - 1 ? 0 : activeCard + 1;
        renderFlashcard();
      }
    });
  }

  // =============================================
  // 8. LIVE LESSON SEARCH AND FILTERS
  // =============================================
  const filterTabs = document.querySelectorAll('.filter-tab');
  const topicsGrid = document.getElementById('topics-grid');
  const topicSearch = document.querySelector('[data-topic-search]');
  const topicSearchButton = document.querySelector('[data-topic-search-button]');
  const topicSearchStatus = document.querySelector('[data-topic-search-status]');
  const topicPagination = document.querySelector('[data-topic-pagination]');
  const topicPageSize = 3;
  let activeTopicCategory = 'all';
  let activeTopicPage = 1;

  function normaliseSearchText(value) {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function renderTopicPagination(totalPages, resultCount) {
    if (!topicPagination) return;
    const previousButton = topicPagination.querySelector('[data-page-previous]');
    const nextButton = topicPagination.querySelector('[data-page-next]');
    const pageButtons = topicPagination.querySelectorAll('[data-page-number]');

    topicPagination.classList.toggle('hidden', resultCount === 0 || totalPages <= 1);
    previousButton.disabled = activeTopicPage === 1;
    nextButton.disabled = activeTopicPage === totalPages;

    pageButtons.forEach(function (button) {
      const page = Number(button.dataset.pageNumber);
      const isActive = page === activeTopicPage;
      button.hidden = page > totalPages;
      button.classList.toggle('active', isActive);
      if (isActive) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }

  function applyTopicFilters(resetPage) {
    if (!topicsGrid) return;
    if (resetPage) activeTopicPage = 1;
    const query = topicSearch ? normaliseSearchText(topicSearch.value) : '';
    const matchingCards = [];

    topicsGrid.querySelectorAll('.topic-card').forEach(function (card) {
      const category = normaliseSearchText(card.dataset.category || '');
      const searchableText = normaliseSearchText(card.textContent);
      const matchesCategory = activeTopicCategory === 'all' || category === activeTopicCategory;
      const matchesSearch = !query || searchableText.includes(query);
      if (matchesCategory && matchesSearch) matchingCards.push(card);
    });

    const totalPages = Math.max(1, Math.ceil(matchingCards.length / topicPageSize));
    activeTopicPage = Math.min(activeTopicPage, totalPages);
    const firstVisibleIndex = (activeTopicPage - 1) * topicPageSize;
    const visibleCards = matchingCards.slice(firstVisibleIndex, firstVisibleIndex + topicPageSize);

    topicsGrid.querySelectorAll('.topic-card').forEach(function (card) {
      card.hidden = !visibleCards.includes(card);
    });
    renderTopicPagination(totalPages, matchingCards.length);

    if (topicSearchStatus) {
      const isFiltering = query || activeTopicCategory !== 'all';
      topicSearchStatus.classList.toggle('hidden', !isFiltering);
      if (isFiltering) {
        topicSearchStatus.textContent = matchingCards.length
          ? matchingCards.length + (matchingCards.length === 1 ? ' lesson found' : ' lessons found')
          : 'No lessons match your search. Try another word or category.';
      }
    }
  }

  if (topicsGrid) {
    filterTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        filterTabs.forEach(function (item) { item.classList.remove('active'); });
        tab.classList.add('active');
        activeTopicCategory = normaliseSearchText(tab.textContent);
        applyTopicFilters(true);
      });
    });
    if (topicSearch) topicSearch.addEventListener('input', function () { applyTopicFilters(true); });
    if (topicSearchButton) topicSearchButton.addEventListener('click', function () { applyTopicFilters(true); });
    if (topicPagination) {
      topicPagination.addEventListener('click', function (event) {
        const pageButton = event.target.closest('[data-page-number]');
        if (pageButton) activeTopicPage = Number(pageButton.dataset.pageNumber);
        if (event.target.closest('[data-page-previous]') && activeTopicPage > 1) activeTopicPage--;
        if (event.target.closest('[data-page-next]')) activeTopicPage++;
        applyTopicFilters(false);
        topicsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    applyTopicFilters(true);
  }

  // =============================================
  // 8. COUNTER ANIMATION (Stats)
  // =============================================
  const statNumbers = document.querySelectorAll('.stat-number');

  if (statNumbers.length > 0 && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const targetText = el.textContent.trim();
          const hasTeal = el.querySelector('.teal');
          const target = parseInt(targetText.replace(/[^0-9]/g, ''), 10);

          if (!isNaN(target) && target > 0) {
            let current = 0;
            const increment = Math.ceil(target / 40);
            const duration = 1500;
            const stepTime = Math.floor(duration / 40);

            const counter = setInterval(function () {
              current += increment;
              if (current >= target) {
                current = target;
                clearInterval(counter);
              }
              if (hasTeal) {
                el.innerHTML = current.toLocaleString() + '+';
              } else {
                el.textContent = current.toLocaleString();
              }
            }, stepTime);
          }

          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(function (el) {
      counterObserver.observe(el);
    });
  }

  // =============================================
  // 9. PASSWORD TOGGLE (Auth Pages)
  // =============================================
  const passwordToggles = document.querySelectorAll('.password-toggle');

  passwordToggles.forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      const input = this.closest('.form-group').querySelector('.form-input');
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        this.textContent = 'Hide';
      } else {
        input.type = 'password';
        this.textContent = 'Show';
      }
    });
  });

  // =============================================
  // 10. SUPABASE AUTHENTICATION
  // =============================================
  const supabaseClient = window.diriSupabase;

  async function loadHomepagePlatformStats() {
    if (!supabaseClient || !document.querySelector('[data-platform-stat]')) return;
    try {
      const result = await supabaseClient.rpc('get_public_platform_stats').single();
      if (result.error) throw result.error;
      const stats = result.data || {};
      const learnerCount = document.querySelector('[data-platform-stat="active-learners"]');
      const challengeCount = document.querySelector('[data-platform-stat="quiz-challenges"]');
      if (learnerCount) {
        learnerCount.textContent = Number(stats.active_learners || 0).toLocaleString() + '+';
      }
      if (challengeCount) {
        challengeCount.textContent = Number(stats.quiz_challenges || 0).toLocaleString();
      }
    } catch (error) {
      console.warn('Platform statistics are temporarily unavailable:', error.message || error);
    }
  }

  loadHomepagePlatformStats();

  const recoveryForm = document.querySelector('.auth-form');
  const isPasswordRecovery = new URLSearchParams(window.location.search).get('reset') === '1';

  if (recoveryForm && isPasswordRecovery && document.getElementById('email')) {
    const heading = document.querySelector('.auth-card .heading-sm');
    const subtitle = document.querySelector('.auth-card .auth-subtitle');
    if (heading) heading.textContent = 'Choose a new password';
    if (subtitle) subtitle.textContent = 'Enter a new password for your DIRI account';
    recoveryForm.innerHTML =
      '<div class="form-group">' +
        '<label for="new-password">New password</label>' +
        '<input type="password" id="new-password" class="form-input" placeholder="At least 8 characters" required>' +
        '<div class="form-error"></div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="confirm-new-password">Confirm new password</label>' +
        '<input type="password" id="confirm-new-password" class="form-input" placeholder="Repeat your new password" required data-match="new-password">' +
        '<div class="form-error"></div>' +
      '</div>' +
      '<button type="submit" class="btn btn-primary btn-full btn-lg">Update Password</button>';
  }

  const authForms = document.querySelectorAll('.auth-form');

  function getAuthMessage(form) {
    let message = form.querySelector('.auth-message');
    if (!message) {
      message = document.createElement('div');
      message.className = 'auth-message';
      message.setAttribute('role', 'status');
      message.setAttribute('aria-live', 'polite');
      form.prepend(message);
    }
    return message;
  }

  function showAuthMessage(form, text, type) {
    const message = getAuthMessage(form);
    message.textContent = text;
    message.className = 'auth-message ' + (type || 'info');
  }

  function setAuthLoading(form, loading, text) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    if (!submitBtn.dataset.originalText) {
      submitBtn.dataset.originalText = submitBtn.textContent;
    }
    submitBtn.textContent = loading ? (text || 'Processing...') : submitBtn.dataset.originalText;
    submitBtn.disabled = loading;
  }

  function pageUrl(page) {
    const hostname = window.location.hostname.toLowerCase();
    const baseUrl = hostname === 'diri.online' || hostname === 'www.diri.online'
      ? 'https://diri.online/'
      : window.location.href;

    return new URL(page, baseUrl).href;
  }

  function validateAuthForm(form) {
    let isValid = true;
    const requiredInputs = form.querySelectorAll('[required]');

    requiredInputs.forEach(function (input) {
      const formGroup = input.closest('.form-group');
      const errorEl = formGroup ? formGroup.querySelector('.form-error') : null;
      const isEmpty = input.type === 'checkbox' ? !input.checked : !input.value.trim();

      if (isEmpty) {
        input.classList.add('error');
        if (errorEl) errorEl.textContent = input.type === 'checkbox' ? 'Please accept the terms to continue' : 'This field is required';
        isValid = false;
      } else {
        input.classList.remove('error');
        if (errorEl) errorEl.textContent = '';
      }

      if (input.type === 'email' && input.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value.trim())) {
          input.classList.add('error');
          if (errorEl) errorEl.textContent = 'Please enter a valid email';
          isValid = false;
        }
      }

      if ((input.id === 'reg-password' || input.id === 'new-password') && input.value &&
          (input.value.length < 8 || !/[A-Za-z]/.test(input.value) || !/[0-9]/.test(input.value))) {
        input.classList.add('error');
        if (errorEl) errorEl.textContent = 'Use at least 8 characters with a number and a letter';
        isValid = false;
      }

      if (input.getAttribute('data-match')) {
        const matchInput = document.getElementById(input.getAttribute('data-match'));
        if (matchInput && input.value !== matchInput.value) {
          input.classList.add('error');
          if (errorEl) errorEl.textContent = 'Passwords do not match';
          isValid = false;
        }
      }
    });

    return isValid;
  }

  authForms.forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!validateAuthForm(form)) return;
      if (!supabaseClient) {
        showAuthMessage(form, 'Authentication is temporarily unavailable. Please refresh and try again.', 'error');
        return;
      }

      setAuthLoading(form, true);
      showAuthMessage(form, '', 'info');

      try {
        if (document.getElementById('new-password')) {
          const result = await supabaseClient.auth.updateUser({
            password: document.getElementById('new-password').value
          });
          if (result.error) throw result.error;
          showAuthMessage(form, 'Your password has been updated. Redirecting…', 'success');
          setTimeout(function () { window.location.href = 'index.html'; }, 1000);
        } else if (document.getElementById('reg-email')) {
          const email = document.getElementById('reg-email').value.trim();
          const password = document.getElementById('reg-password').value;
          const fullName = document.getElementById('fullname').value.trim();
          const result = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
              data: { full_name: fullName },
              emailRedirectTo: pageUrl('index.html')
            }
          });

          if (result.error) throw result.error;
          if (result.data.session) {
            window.location.href = 'index.html';
          } else {
            form.reset();
            showAuthMessage(form, 'Account created. Check your email to confirm your address, then log in.', 'success');
          }
        } else {
          const email = document.getElementById('email').value.trim();
          const password = document.getElementById('password').value;
          const result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
          if (result.error) throw result.error;
          window.location.href = 'index.html';
        }
      } catch (error) {
        showAuthMessage(form, error.message || 'Authentication failed. Please try again.', 'error');
      } finally {
        setAuthLoading(form, false);
      }
    });

    // Clear error on input
    form.querySelectorAll('.form-input').forEach(function (input) {
      input.addEventListener('input', function () {
        this.classList.remove('error');
        const errorEl = this.closest('.form-group').querySelector('.form-error');
        if (errorEl) errorEl.textContent = '';
      });
    });
  });

  document.querySelectorAll('.google-auth').forEach(function (button) {
    button.addEventListener('click', async function () {
      const card = button.closest('.auth-card');
      const form = card ? card.querySelector('.auth-form') : null;
      if (!form || !supabaseClient) {
        if (form) showAuthMessage(form, 'Google sign-in is temporarily unavailable.', 'error');
        return;
      }

      button.disabled = true;
      try {
        const result = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: pageUrl('index.html'),
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account'
            }
          }
        });
        if (result.error) throw result.error;
      } catch (error) {
        showAuthMessage(form, error.message || 'Google sign-in could not be started.', 'error');
        button.disabled = false;
      }
    });
  });

  const forgotPasswordLink = document.querySelector('[data-forgot-password]');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async function (e) {
      e.preventDefault();
      const form = forgotPasswordLink.closest('.auth-form');
      const emailInput = document.getElementById('email');
      const email = emailInput.value.trim();

      if (!email) {
        emailInput.focus();
        showAuthMessage(form, 'Enter your email address first.', 'error');
        return;
      }

      if (!supabaseClient) {
        showAuthMessage(form, 'Authentication is temporarily unavailable.', 'error');
        return;
      }

      const result = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: pageUrl('login.html?reset=1')
      });
      showAuthMessage(form,
        result.error ? result.error.message : 'Password reset email sent. Check your inbox.',
        result.error ? 'error' : 'success');
    });
  }

  const uiTranslations = {
    en: {
      Home: 'Home', Learn: 'Learn', Updates: 'Updates', 'Weekly Quiz': 'Weekly Quiz',
      Leaderboard: 'Leaderboard', 'Get Started': 'Get Started', 'Log In': 'Log In',
      'Log Out': 'Log Out', Profile: 'Profile', hi: 'Hi', language: 'Language',
      'Welcome back': 'Welcome back', 'Join DIRI': 'Join DIRI', 'Continue with Google': 'Continue with Google',
      'or continue with email': 'or continue with email', 'Email address': 'Email address', Password: 'Password',
      'Forgot password?': 'Forgot password?', 'Create Account': 'Create Account', 'Full name': 'Full name',
      'Confirm password': 'Confirm password', 'My Profile': 'My Profile', Username: 'Username',
      'Change photo': 'Change photo', 'Save Profile': 'Save Profile', 'Your account': 'Your account'
    },
    lg: {
      Home: 'Awaka', Learn: 'Yiga', Updates: 'Ebipya', 'Weekly Quiz': 'Ebibuuzo bya Wiiki',
      Leaderboard: 'Abakulembedde', 'Get Started': 'Tandika', 'Log In': 'Yingira',
      'Log Out': 'Fuluma', Profile: 'Ebikwata ku Ggwe', hi: 'Gyebale', language: 'Olulimi',
      'Welcome back': 'Tukwanirizza nate', 'Join DIRI': 'Wegatte ku DIRI', 'Continue with Google': 'Weyongere ne Google',
      'or continue with email': 'oba weyongere ne email', 'Email address': 'Endagiriro ya email', Password: 'Ekigambo kyama',
      'Forgot password?': 'Weerabidde ekigambo kyama?', 'Create Account': 'Kola Akawunti', 'Full name': 'Amannya gonna',
      'Confirm password': 'Kakasa ekigambo kyama', 'My Profile': 'Ebikwata ku Nze', Username: 'Erinnya ly\'okukozesa',
      'Change photo': 'Kyusa ekifaananyi', 'Save Profile': 'Tereka Ebikwata ku Ggwe', 'Your account': 'Akawunti yo'
    }
  };

  function defaultUsername(user) {
    const metadata = user.user_metadata || {};
    const candidate = metadata.full_name || metadata.name || (user.email || '').split('@')[0] || 'DIRI member';
    return candidate.trim().slice(0, 40);
  }

  async function ensureProfile(user) {
    const existing = await supabaseClient.from('profiles').select('username, avatar_url, language, role').eq('id', user.id).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return existing.data;

    const initial = { id: user.id, username: defaultUsername(user), language: 'en' };
    const created = await supabaseClient.from('profiles').insert(initial).select('username, avatar_url, language, role').single();
    if (created.error) throw created.error;
    return created.data;
  }

  function applyLanguage(language) {
    const selected = uiTranslations[language] ? language : 'en';
    const dictionary = uiTranslations[selected];
    document.documentElement.lang = selected;
    localStorage.setItem('diri-language', selected);

    const navLabels = {
      'index.html': 'Home', 'learn.html': 'Learn', 'updates.html': 'Updates',
      'quiz.html': 'Weekly Quiz', 'leaderboard.html': 'Leaderboard'
    };
    document.querySelectorAll('.header-nav a, .mobile-nav > a').forEach(function (link) {
      const key = navLabels[link.getAttribute('href')];
      if (key) link.textContent = dictionary[key];
    });
    document.querySelectorAll('h1, h2, h3, p, label, button, a, span').forEach(function (element) {
      if (element.children.length > 0) return;
      const original = element.dataset.i18nKey || element.textContent.trim();
      if (!element.dataset.i18nKey && uiTranslations.en[original]) element.dataset.i18nKey = original;
      const key = element.dataset.i18nKey;
      if (key && dictionary[key]) element.textContent = dictionary[key];
    });
    window.dispatchEvent(new CustomEvent('diri-language-change', { detail: { language: selected } }));
  }
  applyLanguage(localStorage.getItem('diri-language') || 'en');

  async function updateAuthNavigation(session) {
    const loginLinks = document.querySelectorAll('.header-actions a[href="login.html"], .mobile-actions a[href="login.html"]');
    const registerLinks = document.querySelectorAll('.header-actions a[href="register.html"], .mobile-actions a[href="register.html"]');
    const guestOnlyElements = document.querySelectorAll('[data-auth-guest]');

    guestOnlyElements.forEach(function (element) {
      element.classList.toggle('hidden', Boolean(session && session.user));
    });

    if (session && session.user) {
      let profile;
      try {
        profile = await ensureProfile(session.user);
      } catch (error) {
        console.error('Unable to load the user profile.', error);
        profile = { username: defaultUsername(session.user), language: localStorage.getItem('diri-language') || 'en' };
      }
      applyLanguage(profile.language || 'en');
      const dictionary = uiTranslations[profile.language] || uiTranslations.en;

      registerLinks.forEach(function (link) { link.classList.add('hidden'); });
      loginLinks.forEach(function (link) {
        link.classList.add('hidden');
      });

      const homeGreeting = document.querySelector('[data-home-greeting]');
      if (homeGreeting) {
        homeGreeting.textContent = dictionary.hi + ', ' + profile.username;
        homeGreeting.classList.remove('hidden');
      }

      document.querySelectorAll('.header-actions, .mobile-actions').forEach(function (container) {
        if (!container.querySelector('a[href="profile.html"]')) {
          const profileLink = document.createElement('a');
          profileLink.href = 'profile.html';
          profileLink.className = 'btn btn-ghost btn-sm';
          profileLink.textContent = dictionary.Profile;
          container.appendChild(profileLink);
        }
      });

      // Add admin link for admins and policymakers
      const navRole = profile.role || 'user';
      if (navRole === 'admin' || navRole === 'policymaker') {
        document.querySelectorAll('.header-nav, .mobile-nav').forEach(function (nav) {
          const existingAdminLink = nav.querySelector('a[href="admin.html"]');
          if (!existingAdminLink) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.textContent = 'Admin';
            // Insert before the last link or at end
            const logoutLink = nav.querySelector('a[href="chatbot.html"]');
            if (logoutLink && logoutLink.parentNode === nav) {
              logoutLink.parentNode.insertBefore(adminLink, logoutLink.nextSibling);
            } else {
              nav.appendChild(adminLink);
            }
          }
        });
      } else {
        document.querySelectorAll('.header-nav a[href="admin.html"], .mobile-nav a[href="admin.html"]').forEach(function (link) {
          link.remove();
        });
      }

      const profileForm = document.querySelector('[data-profile-form]');
      if (profileForm && !profileForm.dataset.ready) {
        profileForm.dataset.ready = 'true';
        const usernameInput = document.getElementById('profile-username');
        const languageInput = document.getElementById('profile-language');
        const avatarInput = document.getElementById('avatar-input');
        const avatar = document.querySelector('[data-profile-avatar]');
        const email = document.querySelector('[data-profile-email]');
        const message = document.querySelector('[data-profile-message]');
        const logoutButton = document.querySelector('[data-profile-logout]');
        const deleteOpenButton = document.querySelector('[data-profile-delete-open]');
        const deleteDialog = document.querySelector('[data-account-delete-dialog]');
        const deleteForm = document.querySelector('[data-account-delete-form]');
        const deleteConfirmation = document.querySelector('[data-account-delete-confirmation]');
        const deleteSubmit = document.querySelector('[data-account-delete-submit]');
        const deleteMessage = document.querySelector('[data-account-delete-message]');
        usernameInput.value = profile.username;
        languageInput.value = profile.language || 'en';
        if (profile.avatar_url) avatar.src = profile.avatar_url;
        if (email) email.textContent = session.user.email || '';

        if (logoutButton) {
          logoutButton.addEventListener('click', async function () {
            logoutButton.disabled = true;
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
          });
        }

        if (deleteOpenButton && deleteDialog && deleteForm && deleteConfirmation && deleteSubmit) {
          deleteOpenButton.addEventListener('click', function () {
            deleteConfirmation.value = '';
            deleteSubmit.disabled = true;
            deleteSubmit.dataset.loading = 'false';
            deleteSubmit.textContent = 'Delete Account Permanently';
            if (deleteMessage) {
              deleteMessage.textContent = '';
              deleteMessage.className = 'auth-message';
            }
            deleteDialog.showModal();
            deleteConfirmation.focus();
          });

          document.querySelectorAll('[data-account-delete-cancel]').forEach(function (button) {
            button.addEventListener('click', function () {
              if (deleteSubmit.dataset.loading === 'true') return;
              deleteDialog.close();
            });
          });

          deleteConfirmation.addEventListener('input', function () {
            deleteSubmit.disabled = deleteConfirmation.value.trim() !== 'DELETE';
          });

          deleteForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            if (deleteConfirmation.value.trim() !== 'DELETE') return;

            deleteSubmit.disabled = true;
            deleteSubmit.dataset.loading = 'true';
            deleteSubmit.textContent = 'Deleting account...';
            if (deleteMessage) {
              deleteMessage.textContent = 'Please wait while we securely delete your account.';
              deleteMessage.className = 'auth-message info';
            }

            const result = await supabaseClient.functions.invoke('delete-account', {
              body: { confirmation: 'DELETE' }
            });

            if (result.error) {
              deleteSubmit.dataset.loading = 'false';
              deleteSubmit.textContent = 'Delete Account Permanently';
              deleteSubmit.disabled = false;
              if (deleteMessage) {
                deleteMessage.textContent = result.error.message || 'We could not delete your account. Please try again.';
                deleteMessage.className = 'auth-message error';
              }
              return;
            }

            await supabaseClient.auth.signOut({ scope: 'local' });
            window.location.href = 'index.html?account=deleted';
          });
        }
        avatarInput.addEventListener('change', async function () {
          const file = avatarInput.files && avatarInput.files[0];
          if (!file) return;
          if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
            message.textContent = 'Choose a JPG, PNG, WEBP or GIF image smaller than 5 MB.';
            message.className = 'auth-message error';
            return;
          }
          const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const path = session.user.id + '/avatar.' + extension;
          message.textContent = 'Uploading photo...';
          message.className = 'auth-message info';
          const upload = await supabaseClient.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
          if (upload.error) {
            message.textContent = upload.error.message;
            message.className = 'auth-message error';
            return;
          }
          const publicUrl = supabaseClient.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
          const saved = await supabaseClient.from('profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', session.user.id);
          if (saved.error) {
            message.textContent = saved.error.message;
            message.className = 'auth-message error';
            return;
          }
          avatar.src = publicUrl;
          message.textContent = 'Profile photo updated.';
          message.className = 'auth-message success';
        });

        profileForm.addEventListener('submit', async function (event) {
          event.preventDefault();
          const username = usernameInput.value.trim();
          if (username.length < 2) return;
          const submit = profileForm.querySelector('button[type="submit"]');
          submit.disabled = true;
          const saved = await supabaseClient.from('profiles').update({
            username: username,
            language: languageInput.value,
            updated_at: new Date().toISOString()
          }).eq('id', session.user.id);
          submit.disabled = false;
          message.textContent = saved.error ? saved.error.message : 'Profile saved.';
          message.className = 'auth-message ' + (saved.error ? 'error' : 'success');
          if (!saved.error) {
            applyLanguage(languageInput.value);
            const homeGreeting = document.querySelector('[data-home-greeting]');
            if (homeGreeting) homeGreeting.textContent = (uiTranslations[languageInput.value] || uiTranslations.en).hi + ', ' + username;
          }
        });
      }
    } else if (document.querySelector('[data-profile-form]')) {
      window.location.href = 'login.html';
    }
  }

  if (supabaseClient) {
    supabaseClient.auth.getSession().then(function (result) {
      updateAuthNavigation(result.data.session);
    });
    supabaseClient.auth.onAuthStateChange(function (_event, session) {
      updateAuthNavigation(session);
    });
  }

  // =============================================
  // 11. LEADERBOARD FILTER
  // =============================================
  const leaderboardTabs = document.querySelectorAll('[data-leaderboard-tab]');

  leaderboardTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const parent = this.closest('.filter-tabs');
      if (parent) {
        parent.querySelectorAll('[data-leaderboard-tab]').forEach(function (t) {
          t.classList.remove('active');
        });
      }
      this.classList.add('active');

      const period = this.getAttribute('data-leaderboard-tab');
      // In production, this would fetch new leaderboard data
      // For prototype, we simulate visually
      const rows = document.querySelectorAll('.leaderboard-row');
      rows.forEach(function (row, index) {
        const score = row.querySelector('.score');
        if (score) {
          const baseScore = parseInt(score.textContent.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(baseScore)) {
            if (period === 'weekly') {
              score.textContent = baseScore;
            } else if (period === 'monthly') {
              score.textContent = Math.floor(baseScore * 3.2);
            } else if (period === 'all-time') {
              score.textContent = Math.floor(baseScore * 8.7);
            }
          }
        }
      });
    });
  });

  // =============================================
  // 12. SMOOTH SCROLL FOR ANCHOR LINKS
  // =============================================
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // =============================================
  // 13. QUIZ TIMER (if present) — static-only guard
  // =============================================
  if (!document.querySelector('.quiz-view')) {
    const quizTimer = document.querySelector('.quiz-timer .timer-value');
    if (quizTimer) {
      let totalSeconds = parseInt(quizTimer.textContent.split(':')[0]) * 60 +
                         parseInt(quizTimer.textContent.split(':')[1]);

      const timerInterval = setInterval(function () {
        totalSeconds--;
        if (totalSeconds <= 0) {
          clearInterval(timerInterval);
          quizTimer.textContent = '00:00';
          alert('Time is up!');
          return;
        }
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const secs = (totalSeconds % 60).toString().padStart(2, '0');
        quizTimer.textContent = mins + ':' + secs;
      }, 1000);
    }
  }

  // =============================================
  // 14. QUIZ PROGRESS BAR (Update on answer) — static-only guard
  // =============================================
  if (!document.querySelector('.quiz-view')) {
    const quizProgress = document.querySelector('.quiz-progress span');
    const quizTotalQuestions = document.querySelectorAll('.quiz-question');

    // For a single question view, show static progress
    if (quizProgress && quizTotalQuestions.length > 0) {
      // If there are multiple questions shown (preview/sample), count answered
      const allQuestions = document.querySelectorAll('.quiz-question');
      const answeredQuestions = document.querySelectorAll('.quiz-option.selected');

      if (allQuestions.length > 0) {
        const updateProgress = function () {
          const answered = document.querySelectorAll('.quiz-option.selected').length;
          quizProgress.textContent = answered + '/' + allQuestions.length;
        };

        document.querySelectorAll('.quiz-option').forEach(function (opt) {
          opt.addEventListener('click', function () {
            setTimeout(updateProgress, 10);
          });
        });

        updateProgress();
      }
    }
  }

  console.log('DIRI - Digital Rights: Website loaded successfully.');
});

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

    function addLiveMessage(text, sender, extraClass, sources) {
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
        addLiveMessage(data.reply, 'bot', '', data.sources);
        chatHistory.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
        if (chatHistory.length > 10) chatHistory.splice(0, chatHistory.length - 10);
      } catch (error) {
        typingMessage.remove();
        addLiveMessage(error.message || 'Mr. DIRI is temporarily unavailable. Please try again.', 'bot', 'error');
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
  // 7. FILTER TABS
  // =============================================
  const filterTabs = document.querySelectorAll('.filter-tab');

  filterTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const parent = this.closest('.filter-tabs');
      if (parent) {
        parent.querySelectorAll('.filter-tab').forEach(function (t) {
          t.classList.remove('active');
        });
      }
      this.classList.add('active');

      // Filter logic (example: toggle cards by category)
      const filterValue = this.textContent.trim().toLowerCase();
      const targetGrid = this.closest('[data-filter-target]');
      if (targetGrid) {
        const gridId = targetGrid.getAttribute('data-filter-target');
        const grid = document.getElementById(gridId);
        if (grid) {
          grid.querySelectorAll('[data-category]').forEach(function (item) {
            const category = item.getAttribute('data-category').toLowerCase();
            if (filterValue === 'all' || category === filterValue) {
              item.style.display = '';
            } else {
              item.style.display = 'none';
            }
          });
        }
      }
    });
  });

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
    return new URL(page, window.location.href).href;
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

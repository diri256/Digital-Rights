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

    function handleChatSubmit(e) {
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

    chatForm.addEventListener('submit', handleChatSubmit);

    if (chatSendBtn) {
      chatSendBtn.addEventListener('click', handleChatSubmit);
    }

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
  // 10. FORM VALIDATION (Auth Pages)
  // =============================================
  const authForms = document.querySelectorAll('.auth-form');

  authForms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      let isValid = true;

      const requiredInputs = form.querySelectorAll('[required]');
      requiredInputs.forEach(function (input) {
        const errorEl = input.closest('.form-group').querySelector('.form-error');
        if (!input.value.trim()) {
          input.classList.add('error');
          if (errorEl) errorEl.textContent = 'This field is required';
          isValid = false;
        } else {
          input.classList.remove('error');
          if (errorEl) errorEl.textContent = '';
        }

        // Email validation
        if (input.type === 'email' && input.value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(input.value.trim())) {
            input.classList.add('error');
            if (errorEl) errorEl.textContent = 'Please enter a valid email';
            isValid = false;
          }
        }

        // Password match
        if (input.getAttribute('data-match')) {
          const matchId = input.getAttribute('data-match');
          const matchInput = document.getElementById(matchId);
          if (matchInput && input.value !== matchInput.value) {
            input.classList.add('error');
            if (errorEl) errorEl.textContent = 'Passwords do not match';
            isValid = false;
          }
        }
      });

      if (isValid) {
        // Simulate submission
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;

        setTimeout(function () {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          // Show success toast or redirect
          window.location.href = 'index.html';
        }, 1500);
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
  // 13. QUIZ TIMER (if present)
  // =============================================
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

  // =============================================
  // 14. QUIZ PROGRESS BAR (Update on answer)
  // =============================================
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

  console.log('DIRI - Digital Rights: Website loaded successfully.');
});

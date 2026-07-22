/* ============================================================
   DIRI — Updates page carousel + rail behaviour
   Vanilla JS, no dependencies. Progressively enhances the
   markup in updates.html; if JS fails to load, the featured
   slides simply stack and the rail still scrolls natively.
============================================================= */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     FEATURED CAROUSEL
  --------------------------------------------------------- */
  function initFeaturedCarousel() {
    var root = document.querySelector("[data-featured-carousel]");
    if (!root) return;

    var track = root.querySelector("[data-featured-track]");
    var slides = Array.prototype.slice.call(track.children);
    var dotsWrap = root.querySelector("[data-featured-dots]");
    var prevBtn = root.querySelector("[data-featured-prev]");
    var nextBtn = root.querySelector("[data-featured-next]");

    if (slides.length === 0) return;

    var current = 0;
    var AUTOPLAY_MS = 6000;
    var timer = null;

    // Build dots
    slides.forEach(function (slide, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", "Show featured update " + (i + 1) + " of " + slides.length);
      dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
      dot.addEventListener("click", function () {
        goTo(i);
        restartAutoplay();
      });
      dotsWrap.appendChild(dot);
    });

    var dots = Array.prototype.slice.call(dotsWrap.children);

    function render() {
      track.style.transform = "translateX(-" + current * 100 + "%)";
      slides.forEach(function (slide, i) {
        slide.setAttribute("aria-hidden", i === current ? "false" : "true");
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("active", i === current);
        dot.setAttribute("aria-selected", i === current ? "true" : "false");
        // restart the fill animation on the active dot
        if (i === current) {
          dot.classList.remove("active");
          // force reflow so the animation restarts
          void dot.offsetWidth;
          dot.classList.add("active");
        }
      });
    }

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      render();
    }

    function next() {
      goTo(current + 1);
    }

    function prev() {
      goTo(current - 1);
    }

    function startAutoplay() {
      if (reduceMotion || slides.length < 2) return;
      stopAutoplay();
      timer = window.setInterval(next, AUTOPLAY_MS);
      root.setAttribute("data-paused", "false");
    }

    function stopAutoplay() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
      root.setAttribute("data-paused", "true");
    }

    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    prevBtn.addEventListener("click", function () {
      prev();
      restartAutoplay();
    });
    nextBtn.addEventListener("click", function () {
      next();
      restartAutoplay();
    });

    // Pause on hover / keyboard focus, resume on leave / blur
    root.addEventListener("mouseenter", stopAutoplay);
    root.addEventListener("mouseleave", startAutoplay);
    root.addEventListener("focusin", stopAutoplay);
    root.addEventListener("focusout", startAutoplay);

    // Keyboard arrows when the carousel (or its children) has focus
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        prev();
        restartAutoplay();
      } else if (e.key === "ArrowRight") {
        next();
        restartAutoplay();
      }
    });

    // Basic touch swipe support
    var touchStartX = null;
    track.addEventListener(
      "touchstart",
      function (e) {
        touchStartX = e.touches[0].clientX;
        stopAutoplay();
      },
      { passive: true }
    );
    track.addEventListener(
      "touchend",
      function (e) {
        if (touchStartX === null) return;
        var deltaX = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(deltaX) > 40) {
          deltaX < 0 ? next() : prev();
        }
        touchStartX = null;
        startAutoplay();
      },
      { passive: true }
    );

    render();
    startAutoplay();
  }

  /* ---------------------------------------------------------
     FILTER TABS -> filters the rail cards below
  --------------------------------------------------------- */
  function initFilterTabs() {
    var tabs = document.querySelectorAll(".filter-tab");
    var cards = document.querySelectorAll(".rail-card");
    var emptyState = document.querySelector("[data-rail-empty]");
    if (!tabs.length || !cards.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");

        var filter = tab.getAttribute("data-filter");
        var visibleCount = 0;

        cards.forEach(function (card) {
          var matches = filter === "all" || card.getAttribute("data-category") === filter;
          card.classList.toggle("is-hidden", !matches);
          if (matches) visibleCount++;
        });

        if (emptyState) {
          emptyState.classList.toggle("is-visible", visibleCount === 0);
        }
      });
    });
  }

  /* ---------------------------------------------------------
     RAIL ARROW SCROLLING
  --------------------------------------------------------- */
  function initRail() {
    var rail = document.querySelector("[data-rail]");
    var prevBtn = document.querySelector("[data-rail-prev]");
    var nextBtn = document.querySelector("[data-rail-next]");
    if (!rail || !prevBtn || !nextBtn) return;

    function scrollAmount() {
      var card = rail.querySelector(".rail-card");
      var cardWidth = card ? card.getBoundingClientRect().width : 320;
      var gap = 20; // matches --space-5 fallback
      return (cardWidth + gap) * 2;
    }

    function updateArrowState() {
      var maxScroll = rail.scrollWidth - rail.clientWidth - 2;
      prevBtn.disabled = rail.scrollLeft <= 0;
      nextBtn.disabled = rail.scrollLeft >= maxScroll;
    }

    prevBtn.addEventListener("click", function () {
      rail.scrollBy({ left: -scrollAmount(), behavior: reduceMotion ? "auto" : "smooth" });
    });
    nextBtn.addEventListener("click", function () {
      rail.scrollBy({ left: scrollAmount(), behavior: reduceMotion ? "auto" : "smooth" });
    });

    rail.addEventListener("scroll", updateArrowState, { passive: true });
    window.addEventListener("resize", updateArrowState);
    updateArrowState();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initFeaturedCarousel();
    initFilterTabs();
    initRail();
  });
})();

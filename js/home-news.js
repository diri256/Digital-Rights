'use strict';

document.addEventListener('DOMContentLoaded', function () {
  const ticker = document.querySelector('[data-hero-news]');
  if (!ticker) return;

  const items = Array.from(ticker.querySelectorAll('[data-hero-news-item]'));
  const controls = ticker.querySelector('[data-hero-news-controls]');
  const previousButton = ticker.querySelector('[data-hero-news-prev]');
  const nextButton = ticker.querySelector('[data-hero-news-next]');
  const count = ticker.querySelector('[data-hero-news-count]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = 0;
  let rotationTimer = null;

  if (items.length < 2 || !controls || !previousButton || !nextButton) return;
  controls.hidden = false;

  function showItem(index) {
    activeIndex = (index + items.length) % items.length;
    items.forEach(function (item, itemIndex) {
      const isActive = itemIndex === activeIndex;
      item.hidden = !isActive;
      item.classList.toggle('is-active', isActive);
    });
    if (count) count.textContent = (activeIndex + 1) + ' / ' + items.length;
  }

  function motionIsAllowed() {
    return !reducedMotion.matches &&
      !document.documentElement.classList.contains('diri-a11y-stop-animations');
  }

  function stopRotation() {
    if (rotationTimer) window.clearInterval(rotationTimer);
    rotationTimer = null;
  }

  function startRotation() {
    stopRotation();
    if (!motionIsAllowed() || document.hidden || ticker.matches(':hover, :focus-within')) return;
    rotationTimer = window.setInterval(function () {
      showItem(activeIndex + 1);
    }, 6000);
  }

  previousButton.addEventListener('click', function () {
    showItem(activeIndex - 1);
    startRotation();
  });

  nextButton.addEventListener('click', function () {
    showItem(activeIndex + 1);
    startRotation();
  });

  ticker.addEventListener('mouseenter', stopRotation);
  ticker.addEventListener('mouseleave', startRotation);
  ticker.addEventListener('focusin', stopRotation);
  ticker.addEventListener('focusout', function () {
    window.setTimeout(startRotation, 0);
  });
  document.addEventListener('visibilitychange', startRotation);
  reducedMotion.addEventListener('change', startRotation);

  new MutationObserver(startRotation).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  showItem(0);
  startRotation();
});

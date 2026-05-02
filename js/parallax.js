/* parallax.js — 视差滚动效果 */

(function() {
  'use strict';

  const parallaxElements = document.querySelectorAll('[data-parallax]');
  if (!parallaxElements.length) return;

  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY;
    parallaxElements.forEach((el) => {
      const speed = parseFloat(el.dataset.parallax || 0.15);
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const offset = (centerY - window.innerHeight / 2) * speed;
      el.style.transform = 'translateY(' + offset + 'px)';
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
})();

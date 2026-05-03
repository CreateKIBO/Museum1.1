/* animations.js — IntersectionObserver 滚动动画系统 */

(function() {
  'use strict';

  const animElements = document.querySelectorAll(
    '.anim-fade, .anim-fade-up, .anim-slide-left, .anim-slide-right, .anim-pop'
  );

  if (!animElements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.dataset.delay || '0', 10);
          setTimeout(() => {
            el.classList.add('visible');
          }, delay);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  animElements.forEach((el) => observer.observe(el));
})();

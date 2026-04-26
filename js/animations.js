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

/* 文字聚焦效果 (legacy — for .focus-text-container elements) */
(function() {
  'use strict';

  const focusContainers = document.querySelectorAll('.focus-text-container');

  focusContainers.forEach(container => {
    const words = container.querySelectorAll('.focus-word');
    let currentIndex = 0;

    function updateFocus() {
      words.forEach((word, index) => {
        if (index === currentIndex) {
          word.classList.remove('blur');
          word.classList.add('active');
        } else {
          word.classList.add('blur');
          word.classList.remove('active');
        }
      });
      currentIndex = (currentIndex + 1) % words.length;
    }

    if (words.length > 0) {
      updateFocus();
      setInterval(updateFocus, 2000);
    }
  });
})();

/* 滚动揭示文字动画 (legacy — for .scroll-reveal-text elements) */
(function() {
  'use strict';

  const revealElements = document.querySelectorAll('.scroll-reveal-text');

  revealElements.forEach(el => {
    const text = el.textContent;
    el.innerHTML = '';

    text.split(/(\s+)/).forEach((word, index) => {
      if (word.match(/^\s+$/)) {
        el.appendChild(document.createTextNode(word));
      } else {
        const span = document.createElement('span');
        span.className = 'scroll-reveal-word';
        span.textContent = word;
        span.style.transitionDelay = `${index * 0.05}s`;
        el.appendChild(span);
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.scroll-reveal-word').forEach(word => {
              word.classList.add('visible');
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
  });
})();

/* scroll-float.js — Scroll-triggered character float animation
 * Pure JS + GSAP implementation
 * Splits text into characters and animates them on scroll
 */

(function() {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('ScrollFloat: GSAP or ScrollTrigger not loaded');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  var elements = document.querySelectorAll('.scroll-float');
  if (!elements.length) return;

  // Check reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach(function(el) {
      el.style.opacity = '1';
      el.querySelectorAll('.sf-char').forEach(function(ch) {
        ch.style.opacity = '1';
        ch.style.transform = 'none';
      });
    });
    return;
  }

  function waitForFonts() {
    if (document.fonts && document.fonts.status === 'loaded') return Promise.resolve();
    if (document.fonts && document.fonts.ready) return document.fonts.ready;
    return Promise.resolve();
  }

  function initElement(el) {
    var text = el.textContent.trim();
    var duration = parseFloat(el.dataset.sfDuration) || 1;
    var ease = el.dataset.sfEase || 'back.inOut(2)';
    var stagger = parseFloat(el.dataset.sfStagger) || 0.03;
    var scrollStart = el.dataset.sfStart || 'center bottom+=50%';
    var scrollEnd = el.dataset.sfEnd || 'bottom bottom-=40%';

    // Split into characters
    el.innerHTML = '';
    var spans = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var span = document.createElement('span');
      span.className = 'sf-char';
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.display = 'inline-block';
      span.style.willChange = 'opacity, transform';
      el.appendChild(span);
      spans.push(span);
    }

    // Set initial state and animate
    gsap.fromTo(spans,
      {
        opacity: 0,
        yPercent: 120,
        scaleY: 2.3,
        scaleX: 0.7,
        transformOrigin: '50% 0%'
      },
      {
        duration: duration,
        ease: ease,
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        stagger: stagger,
        scrollTrigger: {
          trigger: el,
          start: scrollStart,
          end: scrollEnd,
          scrub: true
        }
      }
    );
  }

  waitForFonts().then(function() {
    elements.forEach(initElement);
  });
})();
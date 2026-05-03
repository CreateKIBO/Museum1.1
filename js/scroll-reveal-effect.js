/* scroll-reveal-effect.js — Enhanced scroll-reveal text animation */

(function() {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  var elements = document.querySelectorAll('.scroll-reveal-effect');
  if (!elements.length) return;

  // Check reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach(function(el) {
      el.style.transform = 'none';
      el.querySelectorAll('.sr-word').forEach(function(word) {
        word.style.opacity = '1';
        word.style.filter = 'none';
      });
    });
    return;
  }

  function initElement(el) {
    var text = el.textContent.trim();
    var enableBlur = el.dataset.srBlur !== 'false';
    var baseOpacity = parseFloat(el.dataset.srOpacity) || 0.1;
    var baseRotation = parseFloat(el.dataset.srRotation) || 3;
    var blurStrength = parseFloat(el.dataset.srBlurStrength) || 4;
    var wordAnimationEnd = el.dataset.srWordEnd || 'bottom bottom';

    // Split into words
    el.innerHTML = '';
    var words = text.split(/(\s+)/);
    var wordSpans = [];

    words.forEach(function(word, index) {
      if (word.match(/^\s+$/)) {
        el.appendChild(document.createTextNode(word));
      } else {
        var span = document.createElement('span');
        span.className = 'sr-word';
        span.textContent = word;
        span.style.display = 'inline-block';
        span.style.willChange = 'opacity';
        el.appendChild(span);
        wordSpans.push(span);
      }
    });

    // Container rotation
    gsap.fromTo(el,
      { transformOrigin: '0% 50%', rotate: baseRotation },
      {
        ease: 'none',
        rotate: 0,
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: true
        }
      }
    );

    // Word opacity
    gsap.fromTo(wordSpans,
      { opacity: baseOpacity },
      {
        ease: 'none',
        opacity: 1,
        stagger: 0.05,
        scrollTrigger: {
          trigger: el,
          start: 'top bottom-=20%',
          end: wordAnimationEnd,
          scrub: true
        }
      }
    );

    // Word blur (optional)
    if (enableBlur) {
      gsap.fromTo(wordSpans,
        { filter: 'blur(' + blurStrength + 'px)' },
        {
          ease: 'none',
          filter: 'blur(0px)',
          stagger: 0.05,
          scrollTrigger: {
            trigger: el,
            start: 'top bottom-=20%',
            end: wordAnimationEnd,
            scrub: true
          }
        }
      );
    }
  }

  // Wait for fonts then initialize
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() {
      elements.forEach(initElement);
    });
  } else {
    elements.forEach(initElement);
  }
})();
/* text-type.js — Enhanced typewriter effect with GSAP
 * Replaces the simple setTimeout typewriter with a smoother GSAP-driven version
 * Dependencies: GSAP
 */

(function() {
  'use strict';

  var typingElement = document.getElementById('heroTyping');
  if (!typingElement) return;

  // Check reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typingElement.textContent = '活着的象形文字';
    return;
  }

  var texts = ['活着的象形文字', '人类文明的活化石', '千年文化的传承'];
  var textIndex = 0;
  var charIndex = 0;
  var isDeleting = false;
  var typingSpeed = 100;
  var deletingSpeed = 50;
  var pauseDuration = 2500;
  var initialDelay = 1200;

  // Create cursor element
  var cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  typingElement.appendChild(cursor);

  // Use GSAP for cursor blink if available
  if (typeof gsap !== 'undefined') {
    gsap.to(cursor, {
      opacity: 0,
      duration: 0.6,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut'
    });
  }

  function updateText() {
    var currentText = texts[textIndex];
    var displayText = currentText.substring(0, charIndex);

    // Keep cursor attached
    typingElement.textContent = displayText;
    typingElement.appendChild(cursor);

    if (isDeleting) {
      charIndex--;
      var speed = deletingSpeed + Math.random() * 20; // slight variation
      setTimeout(updateText, speed);
    } else {
      charIndex++;
      var speed = typingSpeed + Math.random() * 40; // human-like variation
      if (charIndex === currentText.length) {
        // Pause before deleting
        setTimeout(function() {
          isDeleting = true;
          updateText();
        }, pauseDuration);
      } else {
        setTimeout(updateText, speed);
      }
    }

    if (isDeleting && charIndex === 0) {
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length;
      setTimeout(updateText, 400);
    }
  }

  // Start with initial delay
  setTimeout(updateText, initialDelay);
})();
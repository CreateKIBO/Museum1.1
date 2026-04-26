/* true-focus.js — Word focus animation with blur and border frame
 * Pure JS + CSS implementation (no React dependency)
 * Used for cultural section titles to create immersive focus effect
 */

(function() {
  'use strict';

  var containers = document.querySelectorAll('.true-focus');
  if (!containers.length) return;

  // Check reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    containers.forEach(function(container) {
      container.querySelectorAll('.focus-word').forEach(function(word) {
        word.style.filter = 'none';
        word.style.opacity = '1';
      });
      var frame = container.querySelector('.focus-frame');
      if (frame) frame.style.display = 'none';
    });
    return;
  }

  containers.forEach(function(container) {
    var words = container.querySelectorAll('.focus-word');
    var frame = container.querySelector('.focus-frame');
    var currentIndex = 0;
    var blurAmount = parseFloat(container.dataset.blur) || 4;
    var borderColor = container.dataset.borderColor || '#C5A55A';
    var glowColor = container.dataset.glowColor || 'rgba(197,165,90,0.6)';
    var animDuration = parseFloat(container.dataset.duration) || 2;
    var pauseDuration = parseFloat(container.dataset.pause) || 1;

    // Set CSS variables
    container.style.setProperty('--border-color', borderColor);
    container.style.setProperty('--glow-color', glowColor);

    // Auto mode: cycle through words
    function updateFocus() {
      words.forEach(function(word, index) {
        if (index === currentIndex) {
          word.style.filter = 'blur(0px)';
          word.style.opacity = '1';
        } else {
          word.style.filter = 'blur(' + blurAmount + 'px)';
          word.style.opacity = '0.5';
        }
        word.style.transition = 'filter ' + animDuration + 's ease, opacity ' + animDuration + 's ease';
      });

      // Update frame position
      if (frame && words[currentIndex]) {
        var parentRect = container.getBoundingClientRect();
        var activeRect = words[currentIndex].getBoundingClientRect();

        var x = activeRect.left - parentRect.left;
        var y = activeRect.top - parentRect.top;
        var w = activeRect.width;
        var h = activeRect.height;

        frame.style.left = x + 'px';
        frame.style.top = y + 'px';
        frame.style.width = w + 'px';
        frame.style.height = h + 'px';
        frame.style.opacity = '1';
        frame.style.transition = 'all ' + animDuration + 's ease';
      }

      currentIndex = (currentIndex + 1) % words.length;
    }

    // Manual mode: hover
    var manualMode = container.dataset.manual === 'true';
    if (!manualMode) {
      updateFocus();
      setInterval(updateFocus, (animDuration + pauseDuration) * 1000);
    } else {
      // Start with all blurred
      words.forEach(function(word) {
        word.style.filter = 'blur(' + blurAmount + 'px)';
        word.style.opacity = '0.5';
      });
      if (frame) frame.style.opacity = '0';

      words.forEach(function(word, index) {
        word.addEventListener('mouseenter', function() {
          currentIndex = index;
          updateFocus();
        });
      });
    }
  });
})();
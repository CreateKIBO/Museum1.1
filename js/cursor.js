/* cursor.js — 自定义光标跟随效果 */

(function() {
  'use strict';

  const cursor = document.getElementById('customCursor');
  if (!cursor) return;

  // Only show custom cursor on non-touch devices
  if ('ontouchstart' in window) {
    cursor.style.display = 'none';
    return;
  }

  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animateCursor() {
    // Smooth follow with delay
    cursorX += (mouseX - cursorX) * 0.12;
    cursorY += (mouseY - cursorY) * 0.12;

    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';

    requestAnimationFrame(animateCursor);
  }

  animateCursor();

  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '0.6';
  });

  // Scale cursor on interactive elements
  const interactives = document.querySelectorAll('a, button, .gallery-item, .template-card');
  interactives.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(1.8)';
      cursor.style.opacity = '0.9';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(1)';
      cursor.style.opacity = '0.6';
    });
  });
})();

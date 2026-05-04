
(function() {
  'use strict';

  const cursor = document.getElementById('customCursor');
  if (!cursor) return;

  // 仅在非触摸设备显示自定义光标
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
    // 平滑跟随，带延迟
    cursorX += (mouseX - cursorX) * 0.12;
    cursorY += (mouseY - cursorY) * 0.12;

    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';

    requestAnimationFrame(animateCursor);
  }

  animateCursor();

  // 鼠标离开窗口时隐藏光标
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '0.6';
  });

  // 交互元素上放大光标
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

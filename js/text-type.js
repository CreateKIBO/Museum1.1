/* text-type.js — 增强打字机效果（GSAP驱动） */
// AI辅助生成：智谱GLM5.0, 2026-04-11 — 打字机动画效果（多词句循环输入删除）

(function() {
  'use strict';

  var typingElement = document.getElementById('heroTyping');
  if (!typingElement) return;

  // 检查是否偏好减少动画
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

  // 创建光标元素
  var cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  typingElement.appendChild(cursor);

  // 若可用则使用GSAP实现光标闪烁
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

    // 保持光标附加
    typingElement.textContent = displayText;
    typingElement.appendChild(cursor);

    if (isDeleting) {
      charIndex--;
      var speed = deletingSpeed + Math.random() * 20; // 轻微随机变化
      setTimeout(updateText, speed);
    } else {
      charIndex++;
      var speed = typingSpeed + Math.random() * 40; // 模拟人类打字的随机变化
      if (charIndex === currentText.length) {
        // 删除前停顿
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

  // 初始延迟后开始
  setTimeout(updateText, initialDelay);
})();
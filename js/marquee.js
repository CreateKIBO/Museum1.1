/* marquee.js — 东巴文无限滚动控制（JS驱动无缝循环） */
// AI辅助生成：智谱GLM5.0, 2026-04-15 — 跑马灯滚动效果（双轨道无缝循环、悬停暂停）

(function() {
  'use strict';

  var section = document.getElementById('dongbaMarquee');
  if (!section) return;

  var tracks = section.querySelectorAll('.marquee-track');
  if (!tracks.length) return;

  tracks.forEach(function(track, idx) {
    // 克隆子元素一次，实现无缝重叠
    var children = Array.from(track.children);
    children.forEach(function(child) {
      track.appendChild(child.cloneNode(true));
    });

    // 现在轨道有4倍原始项（HTML中2倍 + 克隆2倍）
// 只需滚动前半部分的宽度即可循环
    var speed = idx === 0 ? 0.6 : -0.5; // 每帧像素数，负值表示向右
    var pos = 0;
    var halfWidth = 0;
    var paused = false;

    function measure() {
      // 原始项宽度的2倍 = 总宽度的一半
      var total = track.scrollWidth;
      halfWidth = total / 2;
    }

    measure();
    window.addEventListener('resize', measure);

    function step() {
      if (!paused) {
        pos += speed;
        if (speed > 0 && pos >= halfWidth) {
          pos -= halfWidth;
        } else if (speed < 0 && pos <= 0) {
          pos += halfWidth;
        }
        track.style.transform = 'translateX(' + (-pos) + 'px)';
      }
      requestAnimationFrame(step);
    }

    // 从中间位置开始，确保内容立即可见
    pos = halfWidth / 2;
    requestAnimationFrame(step);

    // 悬停暂停
    var row = track.closest('.marquee-row');
    if (row) {
      row.addEventListener('mouseenter', function() { paused = true; });
      row.addEventListener('mouseleave', function() { paused = false; });
    }
  });
})();

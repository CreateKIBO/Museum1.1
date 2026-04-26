/* magnet-lines.js — Decorative magnet lines effect
 * Pure JS + Canvas implementation
 * Lines that subtly respond to mouse proximity
 */

(function() {
  'use strict';

  var container = document.querySelector('.magnet-lines-container');
  if (!container) return;

  // Check reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    container.style.display = 'none';
    return;
  }

  var canvas = document.createElement('canvas');
  container.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var mouseX = -1000;
  var mouseY = -1000;
  var lines = [];
  var lineCount = 24;
  var magnetRadius = 150;

  function resize() {
    var rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createLines(rect.width, rect.height);
  }

  function createLines(w, h) {
    lines = [];
    var spacing = w / (lineCount + 1);
    for (var i = 0; i < lineCount; i++) {
      lines.push({
        baseX: spacing * (i + 1),
        baseY: h * 0.5,
        currentX: spacing * (i + 1),
        currentY: h * 0.5,
        length: h * 0.6 + Math.random() * h * 0.2,
        angle: -90 + (Math.random() - 0.5) * 10 // mostly vertical
      });
    }
  }

  resize();
  window.addEventListener('resize', resize);

  container.addEventListener('mousemove', function(e) {
    var rect = container.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }, { passive: true });

  container.addEventListener('mouseleave', function() {
    mouseX = -1000;
    mouseY = -1000;
  }, { passive: true });

  function draw() {
    var rect = container.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    ctx.clearRect(0, 0, w, h);

    lines.forEach(function(line) {
      // Calculate magnet pull
      var dx = mouseX - line.baseX;
      var dy = mouseY - line.baseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var pull = Math.max(0, 1 - dist / magnetRadius);

      // Smoothly move toward magnet
      var targetX = line.baseX + dx * pull * 0.3;
      var targetY = line.baseY + dy * pull * 0.2;
      line.currentX += (targetX - line.currentX) * 0.08;
      line.currentY += (targetY - line.currentY) * 0.08;

      // Draw line
      var rad = line.angle * Math.PI / 180;
      var halfLen = line.length / 2;
      var x1 = line.currentX - Math.cos(rad) * halfLen;
      var y1 = line.currentY - Math.sin(rad) * halfLen;
      var x2 = line.currentX + Math.cos(rad) * halfLen;
      var y2 = line.currentY + Math.sin(rad) * halfLen;

      var alpha = 0.06 + pull * 0.15;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(197, 165, 90, ' + alpha + ')';
      ctx.lineWidth = 1 + pull * 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Draw small dot at center
      ctx.beginPath();
      ctx.arc(line.currentX, line.currentY, 2 + pull * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(197, 165, 90, ' + (alpha * 1.5) + ')';
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();
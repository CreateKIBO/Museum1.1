/* grid-motion.js — Subtle animated grid background for hero
 * Dependencies: GSAP (optional, falls back to CSS)
 * Creates a canvas-based grid that subtly shifts with mouse/scroll
 */

(function() {
  'use strict';

  var container = document.querySelector('.grid-motion-bg');
  if (!container) return;

  // Check reduced motion preference
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    container.style.display = 'none';
    return;
  }

  var canvas = document.createElement('canvas');
  container.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var mouseX = 0.5;
  var mouseY = 0.5;
  var scrollY = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', function(e) {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
  }, { passive: true });

  window.addEventListener('scroll', function() {
    scrollY = window.scrollY;
  }, { passive: true });

  var gridSpacing = 80;
  var dotSize = 1.2;
  var baseColor = [197, 165, 90]; // gold

  function draw() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    // Fade out as user scrolls
    var heroHeight = document.getElementById('hero') ? document.getElementById('hero').offsetHeight : h;
    var scrollFade = Math.max(0, 1 - scrollY / (heroHeight * 0.8));
    if (scrollFade <= 0) {
      requestAnimationFrame(draw);
      return;
    }

    var offsetX = (mouseX - 0.5) * 30;
    var offsetY = (mouseY - 0.5) * 20 + scrollY * 0.05;

    var cols = Math.ceil(w / gridSpacing) + 2;
    var rows = Math.ceil(h / gridSpacing) + 2;

    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        var x = i * gridSpacing + offsetX;
        var y = j * gridSpacing + offsetY;

        // Distance from mouse for subtle glow
        var dx = (x / w) - mouseX;
        var dy = (y / h) - mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var glow = Math.max(0, 1 - dist * 2.5);

        var alpha = (0.08 + glow * 0.15) * scrollFade;

        ctx.beginPath();
        ctx.arc(x, y, dotSize + glow * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + baseColor[0] + ',' + baseColor[1] + ',' + baseColor[2] + ',' + alpha + ')';
        ctx.fill();
      }
    }

    // Draw subtle connecting lines near mouse
    var centerCol = Math.round(mouseX * cols);
    var centerRow = Math.round(mouseY * rows);

    for (var ci = centerCol - 3; ci <= centerCol + 3; ci++) {
      for (var cj = centerRow - 3; cj <= centerRow + 3; cj++) {
        if (ci < 0 || cj < 0 || ci >= cols || cj >= rows) continue;
        var lx = ci * gridSpacing + offsetX;
        var ly = cj * gridSpacing + offsetY;
        var ldx = (lx / w) - mouseX;
        var ldy = (ly / h) - mouseY;
        var ldist = Math.sqrt(ldx * ldx + ldy * ldy);
        var lalpha = Math.max(0, (0.5 - ldist * 3)) * 0.06 * scrollFade;

        if (lalpha > 0.005) {
          // Horizontal line
          if (ci + 1 < cols) {
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx + gridSpacing, ly);
            ctx.strokeStyle = 'rgba(' + baseColor[0] + ',' + baseColor[1] + ',' + baseColor[2] + ',' + lalpha + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
          // Vertical line
          if (cj + 1 < rows) {
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx, ly + gridSpacing);
            ctx.strokeStyle = 'rgba(' + baseColor[0] + ',' + baseColor[1] + ',' + baseColor[2] + ',' + lalpha + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();

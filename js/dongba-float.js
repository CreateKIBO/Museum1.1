/* dongba-float.js — 东巴文字符浮动装饰动效
 * 在画布上绘制缓慢飘浮的东巴文字符
 * 字符从底部缓缓升起，带有微旋转和透明度变化
 */

(function() {
  'use strict';

  var container = document.querySelector('.dongba-float-container');
  if (!container) return;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    container.style.display = 'none';
    return;
  }

  var canvas = document.createElement('canvas');
  container.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  // 东巴文字符 SVG 路径（精简版，用于绘制）
  var dongbaChars = [
    // 日 (sun)
    { paths: function(s) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      var rays = [[0,-1],[0,1],[-1,0],[1,0],[-0.7,-0.7],[0.7,-0.7],[-0.7,0.7],[0.7,0.7]];
      rays.forEach(function(d) {
        ctx.beginPath();
        ctx.moveTo(s.x + d[0] * s.r * 0.45, s.y + d[1] * s.r * 0.45);
        ctx.lineTo(s.x + d[0] * s.r * 0.65, s.y + d[1] * s.r * 0.65);
        ctx.stroke();
      });
    }},
    // 月 (moon)
    { paths: function(s) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.4, 0.5, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.x + s.r * 0.12, s.y, s.r * 0.3, 0.6, Math.PI * 1.7);
      ctx.stroke();
    }},
    // 山 (mountain)
    { paths: function(s) {
      ctx.beginPath();
      ctx.moveTo(s.x - s.r * 0.6, s.y + s.r * 0.4);
      ctx.lineTo(s.x, s.y - s.r * 0.5);
      ctx.lineTo(s.x + s.r * 0.6, s.y + s.r * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x - s.r * 0.7, s.y + s.r * 0.5);
      ctx.lineTo(s.x + s.r * 0.7, s.y + s.r * 0.5);
      ctx.stroke();
    }},
    // 水 (water)
    { paths: function(s) {
      for (var row = 0; row < 2; row++) {
        ctx.beginPath();
        var yBase = s.y - s.r * 0.2 + row * s.r * 0.4;
        ctx.moveTo(s.x - s.r * 0.6, yBase);
        ctx.quadraticCurveTo(s.x - s.r * 0.2, yBase - s.r * 0.2, s.x, yBase);
        ctx.quadraticCurveTo(s.x + s.r * 0.2, yBase + s.r * 0.2, s.x + s.r * 0.6, yBase);
        ctx.stroke();
      }
    }},
    // 火 (fire)
    { paths: function(s) {
      ctx.beginPath();
      ctx.moveTo(s.x - s.r * 0.3, s.y + s.r * 0.4);
      ctx.quadraticCurveTo(s.x, s.y - s.r * 0.5, s.x + s.r * 0.3, s.y + s.r * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x - s.r * 0.15, s.y + s.r * 0.2);
      ctx.quadraticCurveTo(s.x, s.y - s.r * 0.1, s.x + s.r * 0.15, s.y + s.r * 0.2);
      ctx.stroke();
    }},
    // 木 (tree)
    { paths: function(s) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + s.r * 0.5);
      ctx.lineTo(s.x, s.y - s.r * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.x, s.y - s.r * 0.25, s.r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x - s.r * 0.25, s.y + s.r * 0.15);
      ctx.lineTo(s.x, s.y - s.r * 0.05);
      ctx.lineTo(s.x + s.r * 0.25, s.y + s.r * 0.15);
      ctx.stroke();
    }},
    // 人 (person)
    { paths: function(s) {
      ctx.beginPath();
      ctx.arc(s.x, s.y - s.r * 0.25, s.r * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - s.r * 0.1);
      ctx.lineTo(s.x, s.y + s.r * 0.2);
      ctx.moveTo(s.x - s.r * 0.25, s.y + s.r * 0.05);
      ctx.lineTo(s.x + s.r * 0.25, s.y + s.r * 0.05);
      ctx.moveTo(s.x - s.r * 0.15, s.y + s.r * 0.5);
      ctx.lineTo(s.x, s.y + s.r * 0.2);
      ctx.lineTo(s.x + s.r * 0.15, s.y + s.r * 0.5);
      ctx.stroke();
    }},
    // 手 (hand)
    { paths: function(s) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - s.r * 0.4);
      ctx.lineTo(s.x, s.y + s.r * 0.05);
      ctx.moveTo(s.x - s.r * 0.3, s.y - s.r * 0.15);
      ctx.lineTo(s.x, s.y);
      ctx.lineTo(s.x + s.r * 0.3, s.y - s.r * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + s.r * 0.05);
      ctx.lineTo(s.x - s.r * 0.2, s.y + s.r * 0.45);
      ctx.moveTo(s.x, s.y + s.r * 0.05);
      ctx.lineTo(s.x + s.r * 0.2, s.y + s.r * 0.45);
      ctx.stroke();
    }},
    // 目 (eye)
    { paths: function(s) {
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r * 0.4, s.r * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }},
    // 星 (star)
    { paths: function(s) {
      var pts = 5;
      ctx.beginPath();
      for (var i = 0; i < pts * 2; i++) {
        var angle = (i * Math.PI / pts) - Math.PI / 2;
        var r = i % 2 === 0 ? s.r * 0.4 : s.r * 0.18;
        var px = s.x + Math.cos(angle) * r;
        var py = s.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }}
  ];

  var particles = [];
  var particleCount = 12;

  function resize() {
    var rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticle(w, h) {
    var charIdx = Math.floor(Math.random() * dongbaChars.length);
    return {
      x: Math.random() * w,
      y: h + 20 + Math.random() * 60,
      r: 12 + Math.random() * 16,
      vy: -(0.15 + Math.random() * 0.25),
      vx: (Math.random() - 0.5) * 0.15,
      rotation: (Math.random() - 0.5) * 0.3,
      rotSpeed: (Math.random() - 0.5) * 0.003,
      alpha: 0,
      maxAlpha: 0.08 + Math.random() * 0.12,
      charIdx: charIdx,
      phase: Math.random() * Math.PI * 2,
      w: w,
      h: h
    };
  }

  function initParticles() {
    var rect = container.getBoundingClientRect();
    particles = [];
    for (var i = 0; i < particleCount; i++) {
      var p = createParticle(rect.width, rect.height);
      // Stagger initial positions
      p.y = Math.random() * rect.height;
      p.alpha = p.maxAlpha * Math.random();
      particles.push(p);
    }
  }

  resize();
  initParticles();
  window.addEventListener('resize', function() {
    resize();
    initParticles();
  });

  function draw() {
    var rect = container.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    ctx.clearRect(0, 0, w, h);

    particles.forEach(function(p) {
      // Update position
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.phase) * 0.05;
      p.phase += 0.008;
      p.rotation += p.rotSpeed;

      // Fade in/out
      var progress = 1 - (p.y / h);
      if (progress < 0.15) {
        p.alpha = p.maxAlpha * (progress / 0.15);
      } else if (progress > 0.85) {
        p.alpha = p.maxAlpha * ((1 - progress) / 0.15);
      } else {
        p.alpha = p.maxAlpha;
      }

      // Reset when off screen
      if (p.y < -30) {
        var newP = createParticle(w, h);
        p.x = newP.x;
        p.y = newP.y;
        p.r = newP.r;
        p.vy = newP.vy;
        p.vx = newP.vx;
        p.rotation = newP.rotation;
        p.rotSpeed = newP.rotSpeed;
        p.alpha = 0;
        p.maxAlpha = newP.maxAlpha;
        p.charIdx = newP.charIdx;
        p.phase = newP.phase;
      }

      // Draw character
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.strokeStyle = 'rgba(197, 165, 90, ' + p.alpha + ')';
      ctx.fillStyle = 'rgba(197, 165, 90, ' + p.alpha + ')';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      var s = { x: 0, y: 0, r: p.r };
      dongbaChars[p.charIdx].paths(s);

      ctx.restore();
    });

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();

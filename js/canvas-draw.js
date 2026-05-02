/* canvas-draw.js — 东巴文互动书写画布 */

(function() {
  'use strict';

  var canvas = document.getElementById('dongbaCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var isDrawing = false;
  var lastX = 0;
  var lastY = 0;
  var brushSize = 3;
  var inkColor = '#1A1A18';
  var isEraser = false;

  // High-DPI support
  var drawingData = null;
  function resizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    if (canvas.width > 0 && canvas.height > 0) {
      try { drawingData = canvas.toDataURL(); } catch(e) {}
    }
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (drawingData) {
      var img = new Image();
      img.onload = function() { ctx.drawImage(img, 0, 0, rect.width, rect.height); };
      img.src = drawingData;
    }
  }

  resizeCanvas();
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 200);
  });

  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  function startDraw(e) {
    e.preventDefault();
    isDrawing = true;
    var pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    var pos = getPos(e);

    if (isEraser) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.lineWidth = brushSize * 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
      // Refill background under erased area
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      if (brushSize > 4) {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.lineWidth = brushSize * 2;
        ctx.globalAlpha = 0.05;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDraw() {
    isDrawing = false;
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  // Update cursor based on mode
  function updateCursor() {
    canvas.style.cursor = isEraser ? 'cell' : 'crosshair';
  }

  // Clear button
  var clearBtn = document.getElementById('canvasClear');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
  }

  // Eraser toggle
  var eraserBtn = document.getElementById('canvasEraser');
  if (eraserBtn) {
    eraserBtn.addEventListener('click', function() {
      isEraser = !isEraser;
      eraserBtn.classList.toggle('active', isEraser);
      updateCursor();
    });
  }

  // Brush size
  var brushBtns = document.querySelectorAll('.brush-btn');
  brushBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      brushBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      brushSize = parseInt(btn.dataset.size, 10);
    });
  });

  // Ink color
  var inkBtns = document.querySelectorAll('.ink-btn');
  inkBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      inkBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      inkColor = btn.dataset.color;
      if (isEraser) {
        isEraser = false;
        if (eraserBtn) eraserBtn.classList.remove('active');
        updateCursor();
      }
    });
  });
})();

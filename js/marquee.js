/* marquee.js — 东巴文无限滚动控制（JS驱动无缝循环） */

(function() {
  'use strict';

  var section = document.getElementById('dongbaMarquee');
  if (!section) return;

  var tracks = section.querySelectorAll('.marquee-track');
  if (!tracks.length) return;

  tracks.forEach(function(track, idx) {
    // Clone children once more for seamless overlap
    var children = Array.from(track.children);
    children.forEach(function(child) {
      track.appendChild(child.cloneNode(true));
    });

    // Now the track has 4x the original items (original*2 from HTML + cloned*2)
    // We only need to scroll by the width of the first half-set
    var speed = idx === 0 ? 0.6 : -0.5; // px per frame, negative = right
    var pos = 0;
    var halfWidth = 0;
    var paused = false;

    function measure() {
      // Width of the first quarter (original items) × 2 = half of total
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

    // Start at a mid-point so content is visible immediately
    pos = halfWidth / 2;
    requestAnimationFrame(step);

    // Pause on hover
    var row = track.closest('.marquee-row');
    if (row) {
      row.addEventListener('mouseenter', function() { paused = true; });
      row.addEventListener('mouseleave', function() { paused = false; });
    }
  });
})();

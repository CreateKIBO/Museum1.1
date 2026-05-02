(function() {
  'use strict';

  var lightbox = document.getElementById('lightbox');
  var lightboxImage = document.getElementById('lightboxImage');
  var lightboxTitle = document.getElementById('lightboxTitle');
  var lightboxDesc = document.getElementById('lightboxDesc');
  var lightboxClose = document.getElementById('lightboxClose');
  var lightboxPrev = document.getElementById('lightboxPrev');
  var lightboxNext = document.getElementById('lightboxNext');
  var lightboxCategory = document.getElementById('lightboxCategory');
  var lightboxCounter = document.getElementById('lightboxCounter');
  var lightboxThumbnails = document.getElementById('lightboxThumbnails');
  var lightboxLike = document.getElementById('lightboxLike');
  var lightboxShare = document.getElementById('lightboxShare');
  var grid = document.getElementById('galleryGrid');

  if (!lightbox || !grid) return;

  var currentIndex = 0;
  var visibleItems = [];
  var likedItems = {};

  var categoryNames = {
    'all': '全部展品',
    'dongba': '东巴文献',
    'craft': '传统技艺',
    'arch': '建筑服饰'
  };

  function getVisibleItems() {
    return Array.from(grid.querySelectorAll('.gallery-item')).filter(function(el) {
      return el.style.display !== 'none';
    });
  }

  function renderThumbnails() {
    if (!lightboxThumbnails) return;
    lightboxThumbnails.innerHTML = '';
    visibleItems.forEach(function(item, index) {
      var placeholder = item.querySelector('.placeholder');
      var thumb = document.createElement('div');
      thumb.className = 'lightbox-thumb' + (index === currentIndex ? ' active' : '');
      thumb.innerHTML = '<div class="lightbox-thumb-img"></div>';

      var thumbImg = thumb.querySelector('.lightbox-thumb-img');
      if (placeholder) {
        var bg = window.getComputedStyle(placeholder);
        thumbImg.style.backgroundImage = bg.backgroundImage;
        thumbImg.style.backgroundSize = 'cover';
        thumbImg.style.backgroundPosition = 'center';
      }

      thumb.addEventListener('click', function(e) {
        e.stopPropagation();
        currentIndex = index;
        updateLightbox();
      });
      lightboxThumbnails.appendChild(thumb);
    });
  }

  function updateLightbox() {
    var item = visibleItems[currentIndex];
    if (!item) return;

    var placeholder = item.querySelector('.placeholder');
    var title = item.getAttribute('data-title') || '';
    var desc = item.getAttribute('data-desc') || '';
    var category = item.getAttribute('data-category') || '';

    // Set image as background of lb-image
    if (placeholder) {
      var bg = window.getComputedStyle(placeholder);
      lightboxImage.style.backgroundImage = bg.backgroundImage;
      lightboxImage.style.backgroundSize = 'cover';
      lightboxImage.style.backgroundPosition = 'center';
      lightboxImage.style.backgroundColor = bg.backgroundColor;
    }

    lightboxTitle.textContent = title;
    lightboxDesc.textContent = desc;
    if (lightboxCategory) lightboxCategory.textContent = categoryNames[category] || category;
    if (lightboxCounter) lightboxCounter.textContent = (currentIndex + 1) + ' / ' + visibleItems.length;

    // Update like button
    if (lightboxLike) {
      if (likedItems[currentIndex]) {
        lightboxLike.classList.add('liked');
        lightboxLike.querySelector('span').textContent = '已收藏';
      } else {
        lightboxLike.classList.remove('liked');
        lightboxLike.querySelector('span').textContent = '收藏';
      }
    }

    renderThumbnails();
  }

  function openLightbox(items, index) {
    visibleItems = items;
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showPrev() {
    if (visibleItems.length === 0) return;
    currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
    updateLightbox();
  }

  function showNext() {
    if (visibleItems.length === 0) return;
    currentIndex = (currentIndex + 1) % visibleItems.length;
    updateLightbox();
  }

  grid.addEventListener('click', function(e) {
    var item = e.target.closest('.gallery-item');
    if (!item) return;
    var items = getVisibleItems();
    var index = items.indexOf(item);
    if (index >= 0) openLightbox(items, index);
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', function(e) { e.stopPropagation(); showPrev(); });
  if (lightboxNext) lightboxNext.addEventListener('click', function(e) { e.stopPropagation(); showNext(); });

  if (lightboxLike) {
    lightboxLike.addEventListener('click', function(e) {
      e.stopPropagation();
      likedItems[currentIndex] = !likedItems[currentIndex];
      if (likedItems[currentIndex]) {
        lightboxLike.classList.add('liked');
        lightboxLike.querySelector('span').textContent = '已收藏';
      } else {
        lightboxLike.classList.remove('liked');
        lightboxLike.querySelector('span').textContent = '收藏';
      }
    });
  }

  if (lightboxShare) {
    lightboxShare.addEventListener('click', function(e) {
      e.stopPropagation();
      var title = visibleItems[currentIndex] ? visibleItems[currentIndex].getAttribute('data-title') : '';
      if (navigator.share) {
        navigator.share({ title: '纳西文化博物馆 — ' + title, url: window.location.href });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(function() {
          lightboxShare.querySelector('span').textContent = '已复制';
          setTimeout(function() { lightboxShare.querySelector('span').textContent = '分享'; }, 1500);
        });
      }
    });
  }

  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function(e) {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  });

  // === Gallery Filter Tabs ===
  var filterBtns = document.querySelectorAll('.filter-btn');
  if (filterBtns.length) {
    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        filterBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var filter = btn.getAttribute('data-filter');
        var allItems = grid.querySelectorAll('.gallery-item');
        allItems.forEach(function(item) {
          if (filter === 'all' || item.getAttribute('data-category') === filter) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });
  }

  // === Arc gallery perspective scroll effect ===
  var track = grid;
  if (track && track.classList.contains('arc-gallery-track')) {
    track.addEventListener('scroll', function() {
      var items = track.querySelectorAll('.gallery-item');
      var trackRect = track.getBoundingClientRect();
      var centerX = trackRect.left + trackRect.width / 2;

      items.forEach(function(item) {
        var rect = item.getBoundingClientRect();
        var itemCenterX = rect.left + rect.width / 2;
        var dist = (itemCenterX - centerX) / centerX; // -1 to 1

        var rotateY = dist * -8;
        var scale = 1 - Math.abs(dist) * 0.08;
        var opacity = 1 - Math.abs(dist) * 0.25;

        item.style.transform = 'perspective(800px) rotateY(' + rotateY + 'deg) scale(' + scale + ')';
        item.style.opacity = Math.max(0.5, opacity);
      });
    });

    // Initial trigger
    track.dispatchEvent(new Event('scroll'));
  }
})();

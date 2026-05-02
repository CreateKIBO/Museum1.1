/* main.js — 初始化入口 + 页面加载动画 */

(function() {
  'use strict';

  // === Scroll Progress Bar (throttled) ===
  const progressBar = document.getElementById('scrollProgress');
  if (progressBar) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
          progressBar.style.width = progress + '%';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // === Navbar scroll behavior (throttled) ===
  const navbar = document.getElementById('navbar');
  if (navbar) {
    let navTicking = false;
    window.addEventListener('scroll', () => {
      if (!navTicking) {
        requestAnimationFrame(() => {
          const currentScroll = window.scrollY;
          if (currentScroll > 80) {
            navbar.classList.add('scrolled');
          } else {
            navbar.classList.remove('scrolled');
          }
          navTicking = false;
        });
        navTicking = true;
      }
    }, { passive: true });
  }

  // === Mobile menu toggle ===
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (navToggle && mobileMenu) {
    function closeMobileMenu() {
      mobileMenu.classList.remove('active');
      document.body.style.overflow = '';
      const spans = navToggle.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }

    navToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
      const isOpen = mobileMenu.classList.contains('active');
      document.body.style.overflow = isOpen ? 'hidden' : '';
      const spans = navToggle.querySelectorAll('span');
      if (isOpen) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    });

    // Close mobile menu on link click
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    // Close mobile menu on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
        closeMobileMenu();
      }
    });
  }

  // === Music play button ===
  const musicPlayBtn = document.getElementById('musicPlayBtn');
  const musicVisualizer = document.getElementById('musicVisualizer');
  const bgMusic = document.getElementById('bgMusic');
  if (musicPlayBtn && musicVisualizer) {
    let isPlaying = false;
    musicPlayBtn.addEventListener('click', () => {
      isPlaying = !isPlaying;
      if (isPlaying) {
        musicVisualizer.classList.add('playing');
        musicPlayBtn.querySelector('span').textContent = '暂停播放';
        if (bgMusic) bgMusic.play();
      } else {
        musicVisualizer.classList.remove('playing');
        musicPlayBtn.querySelector('span').textContent = '聆听古乐';
        if (bgMusic) bgMusic.pause();
      }
    });
  }

  // === Page load animation (Hero elements) ===
  window.addEventListener('load', () => {
    const heroAnims = document.querySelectorAll('.hero .anim-fade');
    heroAnims.forEach((el) => {
      const delay = parseInt(el.dataset.delay || '0', 10);
      setTimeout(() => {
        el.classList.add('visible');
      }, 200 + delay);
    });
  });

  // === Smooth scroll for anchor links ===
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = navbar ? navbar.offsetHeight : 0;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });

})();

/* split-text.js — 纯JS版SplitText动画 */

(function() {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // 等待字体加载完成
  function waitForFonts() {
    if (document.fonts && document.fonts.status === 'loaded') {
      return Promise.resolve();
    }
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready;
    }
    return Promise.resolve();
  }

  // 将文字拆分为单字span
  function splitIntoChars(el) {
    var text = el.textContent;
    var html = el.innerHTML;

    // 保留<br>和<span>等标签，只拆分纯文本节点
    var words = [];
    var currentWord = [];

    // 用TreeWalker遍历文本节点
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var nodesToProcess = [];
    while (walker.nextNode()) {
      nodesToProcess.push(walker.currentNode);
    }

    if (nodesToProcess.length === 0) return [];

    var allSpans = [];

    nodesToProcess.forEach(function(textNode) {
      var text = textNode.textContent;
      var fragment = document.createDocumentFragment();
      var chars = [];

      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (ch === ' ' || ch === '\n' || ch === '\t') {
          var space = document.createTextNode(ch);
          fragment.appendChild(space);
          if (chars.length > 0) {
            allSpans = allSpans.concat(chars);
            chars = [];
          }
          continue;
        }
        var span = document.createElement('span');
        span.className = 'split-char';
        span.textContent = ch;
        span.style.display = 'inline-block';
        span.style.willChange = 'transform, opacity';
        fragment.appendChild(span);
        chars.push(span);
      }
      if (chars.length > 0) {
        allSpans = allSpans.concat(chars);
      }

      textNode.parentNode.replaceChild(fragment, textNode);
    });

    return allSpans;
  }

  // 初始化单个元素的SplitText动画
  function initSplitText(el) {
    var delay = parseFloat(el.dataset.splitDelay) || 50;
    var duration = parseFloat(el.dataset.splitDuration) || 0.8;
    var ease = el.dataset.splitEase || 'power3.out';
    var threshold = parseFloat(el.dataset.splitThreshold) || 0.15;
    var rootMargin = el.dataset.splitMargin || '-50px';

    var startY = parseFloat(el.dataset.splitY) || 30;
    var startX = parseFloat(el.dataset.splitX) || 0;

    // 拆分字符
    var spans = splitIntoChars(el);
    if (spans.length === 0) return;

    // 设置初始状态
    gsap.set(spans, {
      opacity: 0,
      y: startY,
      x: startX
    });

    // 计算ScrollTrigger start
    var startPct = ((1 - threshold) * 100).toFixed(0);

    // 创建动画
    gsap.to(spans, {
      opacity: 1,
      y: 0,
      x: 0,
      duration: duration,
      ease: ease,
      stagger: delay / 1000,
      scrollTrigger: {
        trigger: el,
        start: 'top ' + startPct + '%',
        once: true,
        fastScrollEnd: true
      }
    });
  }

  // 主初始化
  function init() {
    waitForFonts().then(function() {
      // 查找所有标记了data-split属性的元素
      var elements = document.querySelectorAll('[data-split]');
      elements.forEach(function(el) {
        initSplitText(el);
      });
    });
  }

  // DOM ready后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

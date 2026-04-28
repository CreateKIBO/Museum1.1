/* ai-assistant.js — AI助手常驻模块
 * 状态机：idle → greeting → speaking → idle
 *                    ↓
 *              thinking → waiting_result → correct/wrong → idle
 * 跨页面通过 sessionStorage 保持状态
 */

(function(global) {
  'use strict';

  // ======== GIF 路径 ========
  var GIFS = {
    hello:     '素材/ai_animation/hello.gif',
    relax:     '素材/ai_animation/relax.gif',
    introduce: '素材/ai_animation/introduce.gif',
    think:     '素材/ai_animation/think.gif',
    correct:   '素材/ai_animation/correct.gif',
    wrong:     '素材/ai_animation/wrong.gif'
  };

  // ======== 讲解文案 ========
  var SCRIPTS = {
    'index.html': {
      '#about':       { text: '纳西族世代居住在玉龙雪山脚下，创造了灿烂的东巴文化。让我带你走进他们的世界吧！', gif: 'hello' },
      '#dongba':      { text: '东巴文是世界上唯一仍在使用的象形文字体系，一千四百余个字符，形意兼备，是人类文字的活化石！', gif: 'introduce' },
      '#gallery':     { text: '这些珍贵的文化展品，每一件都承载着纳西族千年的记忆与智慧。', gif: 'introduce' },
      '#music':       { text: '纳西古乐被誉为"中国音乐的活化石"，融合了道教与唐宋音乐传统，已传承五百余年。', gif: 'introduce' },
      '#interactive': { text: '试试在这里书写东巴文字吧！写好后点击AI猜字，让我来猜猜你写了什么～', gif: 'think' },
      '#stories':     { text: '每一册经书都是民族的记忆，每一幅画卷都是文明的见证。', gif: 'introduce' },
      '#explore-nav': { text: '准备好踏入千年时光了吗？点击下方卡片，开启你的探索之旅！', gif: 'hello' }
    },
    'dictionary.html': {
      '.converter':       { text: '在这里输入中文，就能转换为东巴象形文字！试试输入"山"或"水"看看效果。', gif: 'introduce' },
      '.cat-browser':     { text: '这是完整的东巴文字符对照表，按类别浏览，点击任意字符可查看详情。', gif: 'introduce' },
      '.dict-canvas-section': { text: '试试手写东巴文字，写好后点击AI猜字，让我来猜猜你写的是什么！', gif: 'think' }
    },
    'gallery.html': {
      '.gallery-filters': { text: '可以按类别筛选展品哦！有东巴文献、传统技艺和建筑服饰三个分类。', gif: 'introduce' },
      '.gallery-grid':    { text: '点击任意展品卡片可以查看大图和详细介绍，用键盘左右箭头还能切换展品。', gif: 'introduce' }
    },
    'painting.html': {
      '.painting-intro': { text: '东巴画以矿物颜料绘制，色彩历经数百年仍鲜艳如初，堪称绘画奇迹！', gif: 'introduce' },
      '.painting-feature': { text: '神路图是东巴画中最震撼的作品——十余米长卷展现地狱、人间、天堂三界！', gif: 'hello' },
      '.painting-showcase-section': { text: '卷轴画、神路图、木牌画——三种画型各有千秋，点击卡片了解更多。', gif: 'introduce' },
      '.painting-timeline-section': { text: '从远古岩画到当代非遗，东巴画千年传承不息。', gif: 'introduce' }
    },
    'music.html': {
      '.music-intro':    { text: '纳西古乐融合了道教法事音乐与儒教典礼音乐，被誉为"中国音乐活化石"。', gif: 'introduce' },
      '.music-visualizer':   { text: '点击播放，聆听穿越千年的声音。每一首曲子都有数百年的历史。', gif: 'hello' },
      '.instruments-section': { text: '这些古老乐器形制独特——苏古笃、曲项琵琶、竹笛，音色悠远而神秘。', gif: 'introduce' },
      '.music-timeline-section': { text: '从唐宋遗音到当代传承，纳西古乐历经千年，薪火相传。', gif: 'introduce' }
    },
    'explore.html': {
      '.story-block:nth-of-type(1)': { text: '《创世纪》是东巴经书的开篇之作，讲述了纳西族对天地起源的理解。', gif: 'introduce' },
      '.story-block:nth-of-type(2)': { text: '木氏土司统治丽江长达470年，留下了丰富的文化遗产与建筑瑰宝。', gif: 'introduce' },
      '.heritage-timeline-section': { text: '从远古祭祀到世界遗产，纳西文化在保护与传承中焕发新生。', gif: 'hello' }
    }
  };

  // ======== 状态 ========
  var SESSION_KEY = '__aiAssistantState';
  var POS_KEY = '__aiAssistantPos';
  var state = {
    greeted: false,
    shownSections: [],
    currentGif: 'relax',
    recognizeResults: null,
    recognizeIndex: 0
  };

  // ======== 拖拽 ========
  var isMobile = window.innerWidth <= 600;
  var drag = {
    active: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    moved: false
  };

  function getDefaultPos() {
    var avatarSize = isMobile ? 64 : 100;
    var margin = isMobile ? 12 : 24;
    return {
      top: window.innerHeight - avatarSize - margin,
      left: window.innerWidth - avatarSize - margin
    };
  }

  function applyPos(top, left) {
    if (!el) return;
    el.style.top = top + 'px';
    el.style.left = left + 'px';
    el.style.bottom = 'auto';
    el.style.right = 'auto';
  }

  function loadPos() {
    try {
      var saved = sessionStorage.getItem(POS_KEY);
      if (saved) {
        var p = JSON.parse(saved);
        applyPos(p.top, p.left);
        return true;
      }
    } catch(e) {}
    return false;
  }

  function savePos() {
    if (!el) return;
    try {
      sessionStorage.setItem(POS_KEY, JSON.stringify({
        top: parseInt(el.style.top) || 0,
        left: parseInt(el.style.left) || 0
      }));
    } catch(e) {}
  }

  function clampPos(top, left) {
    var avatarSize = isMobile ? 64 : 100;
    var maxX = window.innerWidth - avatarSize - 10;
    var maxY = window.innerHeight - avatarSize - 10;
    return {
      top: Math.max(10, Math.min(top, maxY)),
      left: Math.max(10, Math.min(left, maxX))
    };
  }

  function onDragStart(e) {
    if (!avatar) return;
    var point = e.touches ? e.touches[0] : e;
    drag.active = true;
    drag.startX = point.clientX;
    drag.startY = point.clientY;
    drag.offsetX = point.clientX - el.offsetLeft;
    drag.offsetY = point.clientY - el.offsetTop;
    drag.moved = false;
    avatar.classList.add('dragging');
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!drag.active) return;
    var point = e.touches ? e.touches[0] : e;
    var dx = point.clientX - drag.startX;
    var dy = point.clientY - drag.startY;

    if (!drag.moved && (Math.abs(dx) > (isMobile ? 10 : 4) || Math.abs(dy) > (isMobile ? 10 : 4))) {
      drag.moved = true;
    }

    if (drag.moved) {
      var pos = clampPos(
        point.clientY - drag.offsetY,
        point.clientX - drag.offsetX
      );
      applyPos(pos.top, pos.left);
      adjustBubbleDirection();
    }
    e.preventDefault();
  }

  function onDragEnd(e) {
    if (!drag.active) return;
    drag.active = false;
    avatar.classList.remove('dragging');
    if (drag.moved) {
      savePos();
    }
  }

  function loadState() {
    try {
      var saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        state.greeted = parsed.greeted || false;
        state.shownSections = parsed.shownSections || [];
      }
    } catch(e) {}
  }

  function saveState() {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        greeted: state.greeted,
        shownSections: state.shownSections
      }));
    } catch(e) {}
  }

  // ======== DOM 引用 ========
  var el, bubble, bubbleText, bubbleActions, btnCorrect, btnWrong, bubbleClose, avatar, gifImg;

  function findElements() {
    el = document.getElementById('aiAssistant');
    if (!el) return false;
    bubble = document.getElementById('aiBubble');
    bubbleText = document.getElementById('aiBubbleText');
    bubbleActions = document.getElementById('aiBubbleActions');
    btnCorrect = document.getElementById('aiBtnCorrect');
    btnWrong = document.getElementById('aiBtnWrong');
    bubbleClose = document.getElementById('aiBubbleClose');
    avatar = document.getElementById('aiAvatar');
    gifImg = document.getElementById('aiGif');
    return true;
  }

  // ======== GIF 切换 ========
  function setGif(name) {
    if (!gifImg) return;
    state.currentGif = name;
    var newSrc = GIFS[name] || GIFS.relax;
    // Force GIF replay by appending timestamp when switching to same name
    if (gifImg.src.replace(/[?].*/, '') === newSrc) {
      gifImg.src = newSrc + '?t=' + Date.now();
    } else {
      gifImg.src = newSrc;
    }
  }

  // ======== 气泡控制 ========
  var bubbleTimer = null;

  function adjustBubbleDirection() {
    if (!el || !bubble) return;
    if (isMobile) return; // 移动端气泡始终上方居左，CSS已处理

    var rect = el.getBoundingClientRect();
    var bubbleH = bubble.offsetHeight || 120;
    var bubbleW = bubble.offsetWidth || 280;

    // 上下方向：上方空间不够则放下方
    var showBelow = rect.top < bubbleH + 20;
    bubble.classList.toggle('below', showBelow);

    // 左右方向：右侧空间不够则左对齐
    var showLeft = rect.right < bubbleW + 20;
    bubble.classList.toggle('left', showLeft);
  }

  function showBubble(html, duration, actions) {
    if (!bubble || !bubbleText) return;

    clearTimeout(bubbleTimer);

    bubbleText.innerHTML = html;

    if (actions) {
      bubbleActions.style.display = 'flex';
    } else {
      bubbleActions.style.display = 'none';
    }

    bubble.classList.add('visible');
    adjustBubbleDirection();

    if (duration && duration > 0) {
      bubbleTimer = setTimeout(function() {
        hideBubble();
        setGif('relax');
      }, duration);
    }
  }

  function hideBubble() {
    if (bubble) bubble.classList.remove('visible');
    clearTimeout(bubbleTimer);
  }

  // ======== 讲解逻辑 ========
  function getCurrentPage() {
    var path = window.location.pathname;
    // Extract just the filename (works for any subdirectory)
    var page = path.substring(path.lastIndexOf('/') + 1);
    return page || 'index.html';
  }

  function speak(text, duration, gif) {
    setGif(gif || 'introduce');
    showBubble(text, duration || 6000);
  }

  function greet() {
    if (state.greeted) return;
    state.greeted = true;
    saveState();

    setGif('hello');
    showBubble('你好呀！我是东巴文化小助手，很高兴见到你！有什么想了解的，跟着我一起探索吧～', 5000);

    setTimeout(function() {
      if (state.currentGif === 'hello') {
        setGif('relax');
      }
    }, 5500);
  }

  function setupSectionObserver() {
    var page = getCurrentPage();
    var pageScripts = SCRIPTS[page];
    if (!pageScripts) return;

    var selectors = Object.keys(pageScripts);

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;

        var selector = null;
        var text = null;
        var gif = null;
        for (var i = 0; i < selectors.length; i++) {
          if (entry.target.matches && entry.target.matches(selectors[i])) {
            selector = selectors[i];
            var item = pageScripts[selector];
            if (typeof item === 'object') {
              text = item.text;
              gif = item.gif;
            } else {
              text = item;
            }
            break;
          }
        }

        if (!selector || !text) return;

        var key = page + '|' + selector;
        if (state.shownSections.indexOf(key) >= 0) return;

        state.shownSections.push(key);
        saveState();

        speak(text, 7000, gif);
      });
    }, { threshold: 0.35 });

    selectors.forEach(function(sel) {
      var nodes = document.querySelectorAll(sel);
      nodes.forEach(function(node) { observer.observe(node); });
    });
  }

  // ======== AI 猜字集成 ========
  function showRecognizeResult(results) {
    if (!results || results.length === 0) {
      setGif('wrong');
      showBubble('嗯...我没认出来，可以再写清楚一些试试哦～', 5000);
      setTimeout(function() { setGif('relax'); }, 5500);
      return;
    }

    state.recognizeResults = results;
    state.recognizeIndex = 0;
    showCurrentResult();
  }

  function showCurrentResult() {
    var results = state.recognizeResults;
    var idx = state.recognizeIndex;

    if (!results || idx >= results.length) {
      setGif('relax');
      showBubble('可以再试试哦，写大一点、清楚一点效果更好！', 5000);
      return;
    }

    var r = results[idx];
    setGif('introduce');

    var html = '我觉得你写的是：<br>' +
      '<div class="ai-char-row">' +
        '<svg class="ai-char-svg" viewBox="0 0 100 100">' + r.svg + '</svg>' +
        '<div class="ai-char-detail">' +
          '<strong class="ai-char-name">' + r.cn + '</strong>' +
          '<span class="ai-char-pinyin">' + (r.pinyin || '') + '</span>' +
          (r.en ? '<span class="ai-char-en">' + r.en + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<span class="ai-char-confidence">置信度：' + Math.round(r.confidence * 100) + '%</span>';

    showBubble(html, 0, true);
  }

  function onCorrect() {
    setGif('correct');
    var r = state.recognizeResults[state.recognizeIndex];
    showBubble('太棒了！就是「' + r.cn + '」！你写得很棒哦～', 4000);
    state.recognizeResults = null;
    setTimeout(function() { setGif('relax'); }, 4500);
  }

  function onWrong() {
    setGif('wrong');
    state.recognizeIndex++;

    if (state.recognizeIndex >= (state.recognizeResults || []).length) {
      showBubble('抱歉没猜对...可以再写一次试试哦！', 4000);
      state.recognizeResults = null;
      setTimeout(function() { setGif('relax'); }, 4500);
    } else {
      showBubble('让我再想想...', 2000);
      setTimeout(function() {
        setGif('think');
        setTimeout(function() {
          showCurrentResult();
        }, 1200);
      }, 2200);
    }
  }

  // ======== 初始化 ========
  function init() {
    if (!findElements()) return;

    loadState();

    // 设置初始位置
    if (!loadPos()) {
      var def = getDefaultPos();
      applyPos(def.top, def.left);
    }

    // 拖拽事件
    avatar.addEventListener('mousedown', onDragStart);
    avatar.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);

    // 头像点击切换气泡（区分拖拽和点击）
    avatar.addEventListener('click', function() {
      if (drag.moved) {
        drag.moved = false;
        return; // 拖拽结束不触发点击
      }
      if (bubble.classList.contains('visible')) {
        hideBubble();
        setGif('relax');
      } else {
        setGif('hello');
        showBubble('有什么想了解的吗？继续浏览页面，我会为你讲解哦～', 5000);
        setTimeout(function() { if (state.currentGif === 'hello') setGif('relax'); }, 5500);
      }
    });

    // 关闭气泡
    bubbleClose.addEventListener('click', function() {
      hideBubble();
      setGif('relax');
    });

    // 猜字对/错按钮
    btnCorrect.addEventListener('click', function(e) {
      e.stopPropagation();
      onCorrect();
    });

    btnWrong.addEventListener('click', function(e) {
      e.stopPropagation();
      onWrong();
    });

    // 打招呼
    setTimeout(function() {
      greet();
    }, 1500);

    // 监听板块进入视口
    setupSectionObserver();

    // 拦截AI猜字按钮
    interceptRecognizeButton();

    // 窗口resize时防止超出屏幕
    window.addEventListener('resize', function() {
      if (!el) return;
      var pos = clampPos(parseInt(el.style.top) || 0, parseInt(el.style.left) || 0);
      applyPos(pos.top, pos.left);
      savePos();
    });
  }

  function interceptRecognizeButton() {
    var btn = document.getElementById('canvasRecognize');
    if (!btn) return;

    btn.addEventListener('click', function() {
      setGif('think');
      showBubble('让我看看你写了什么...', 0);
    }, true);
  }

  // ======== 导出 ========
  global.AiAssistant = {
    init: init,
    showRecognizeResult: showRecognizeResult,
    speak: speak,
    setGif: setGif,
    showBubble: showBubble,
    hideBubble: hideBubble
  };

  // 自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : global);

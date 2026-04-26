/* dongba-symbols.js — 东巴象形文字SVG符号生成器
 * 提供东巴文风格的装饰性SVG图标
 */

var DongbaSymbols = (function() {
  'use strict';

  // 东巴象形文字风格SVG路径 — 灵感来自真实东巴文字
  var symbols = {
    // 太阳 — 圆形+放射线
    sun: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="20" cy="20" r="7"/><line x1="20" y1="2" x2="20" y2="9"/><line x1="20" y1="31" x2="20" y2="38"/><line x1="2" y1="20" x2="9" y2="20"/><line x1="31" y1="20" x2="38" y2="20"/><line x1="7.3" y1="7.3" x2="12.2" y2="12.2"/><line x1="27.8" y1="27.8" x2="32.7" y2="32.7"/><line x1="32.7" y1="7.3" x2="27.8" y2="12.2"/><line x1="12.2" y1="27.8" x2="7.3" y2="32.7"/></svg>',

    // 月亮 — 弯月
    moon: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M24 6C16 6 10 12.3 10 20s6 14 14 14c-4.5-3-7-8-7-14s2.5-11 7-14z"/></svg>',

    // 山 — 三角山峰
    mountain: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,36 14,12 20,22 26,8 38,36"/><line x1="1" y1="36" x2="39" y2="36"/></svg>',

    // 水 — 波浪
    water: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 14c4-4 8 4 12 0s8 4 12 0s8 4 12 0"/><path d="M4 22c4-4 8 4 12 0s8 4 12 0s8 4 12 0"/><path d="M4 30c4-4 8 4 12 0s8 4 12 0s8 4 12 0"/></svg>',

    // 树 — 树干+树冠
    tree: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="20" y1="38" x2="20" y2="18"/><circle cx="20" cy="13" r="9"/><line x1="14" y1="26" x2="20" y2="20"/><line x1="26" y1="26" x2="20" y2="20"/></svg>',

    // 人 — 简笔人形
    person: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="20" cy="10" r="5"/><line x1="20" y1="15" x2="20" y2="28"/><line x1="12" y1="20" x2="28" y2="20"/><line x1="20" y1="28" x2="13" y2="37"/><line x1="20" y1="28" x2="27" y2="37"/></svg>',

    // 鸟 — 飞鸟
    bird: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c4-8 12-8 16 0c4-8 12-8 16 0"/><circle cx="20" cy="20" r="3"/><path d="M20 23l-3 8"/><path d="M20 23l3 8"/></svg>',

    // 火 — 火焰
    fire: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 4c-2 6-10 10-10 18c0 6 4 12 10 14c6-2 10-8 10-14c0-8-8-12-10-18z"/><path d="M20 22c-1 3-4 5-4 8c0 2 2 4 4 4c2 0 4-2 4-4c0-3-3-5-4-8z"/></svg>',

    // 花 — 花朵
    flower: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="20" cy="14" r="4"/><circle cx="14" cy="18" r="4"/><circle cx="26" cy="18" r="4"/><circle cx="16" cy="24" r="4"/><circle cx="24" cy="24" r="4"/><circle cx="20" cy="19" r="2.5" fill="currentColor"/><line x1="20" y1="24" x2="20" y2="38"/></svg>',

    // 鱼 — 鱼形
    fish: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><ellipse cx="20" cy="20" rx="14" ry="8"/><path d="M34 20l6-6v12l-6-6z"/><circle cx="13" cy="18" r="1.5" fill="currentColor"/><path d="M18 16c2 2 2 6 0 8"/></svg>',

    // 云 — 云朵
    cloud: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 28c-3 0-5-2-5-5s2-5 5-5c0-4 4-8 9-8c4 0 7 2 8 5c1-0.5 2-1 3-1c3 0 6 3 6 6c2 0 4 2 4 4s-2 4-4 4H8z"/></svg>',

    // 星 — 星形
    star: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="20,4 24,15 36,15 26,22 30,34 20,26 10,34 14,22 4,15 16,15"/></svg>',

    // 眼 — 眼睛（东巴文"看"）
    eye: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20c6-10 12-14 16-14s10 4 16 14c-6 10-12 14-16 14S10 30 4 20z"/><circle cx="20" cy="20" r="5"/><circle cx="20" cy="20" r="2" fill="currentColor"/></svg>',

    // 手 — 手掌
    hand: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 20V8c0-2 1-3 2-3s2 1 2 3v10"/><path d="M18 17V6c0-2 1-3 2-3s2 1 2 3v11"/><path d="M22 17V6c0-2 1-3 2-3s2 1 2 3v12"/><path d="M26 20V10c0-2 1-3 2-3s2 1 2 3v12"/><path d="M8 22c0 8 5 14 12 14s12-6 12-14v-4c0-2-1-3-2-3s-2 1-2 3"/></svg>',

    // 鼓 — 东巴法鼓
    drum: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><ellipse cx="20" cy="14" rx="12" ry="5"/><line x1="8" y1="14" x2="8" y2="28"/><line x1="32" y1="14" x2="32" y2="28"/><ellipse cx="20" cy="28" rx="12" ry="5"/><line x1="20" y1="33" x2="20" y2="38"/><line x1="14" y1="14" x2="14" y2="28"/><line x1="26" y1="14" x2="26" y2="28"/></svg>'
  };

  // 按页面主题推荐的符号组合
  var presets = {
    dictionary: ['sun', 'eye', 'hand', 'fire', 'tree', 'water', 'moon'],
    gallery:    ['mountain', 'flower', 'bird', 'cloud', 'star', 'fish', 'tree'],
    music:      ['drum', 'moon', 'cloud', 'bird', 'fire', 'water', 'star'],
    explore:    ['mountain', 'water', 'sun', 'person', 'tree', 'bird', 'fire']
  };

  var labels = {
    sun: '日', moon: '月', mountain: '山', water: '水', tree: '木',
    person: '人', bird: '鸟', fire: '火', flower: '花', fish: '鱼',
    cloud: '云', star: '星', eye: '目', hand: '手', drum: '鼓'
  };

  /**
   * 生成东巴文装饰分隔带HTML
   * @param {string} preset - 预设名称 (dictionary/gallery/music/explore)
   * @param {object} [opts] - 可选配置
   * @param {boolean} [opts.dark=false] - 深色背景变体
   * @returns {string} HTML字符串
   */
  function render(preset, opts) {
    opts = opts || {};
    var names = presets[preset] || presets.dictionary;
    var cls = 'dongba-divider' + (opts.dark ? ' dongba-divider--dark' : '');

    var html = '<div class="' + cls + '"><div class="dongba-divider-track">';
    for (var i = 0; i < names.length; i++) {
      if (i > 0) {
        html += '<span class="dongba-divider-dot"></span>';
      }
      var name = names[i];
      html += '<span class="dongba-divider-symbol">';
      html += symbols[name] || '';
      html += '<span class="dongba-divider-label">' + (labels[name] || '') + '</span>';
      html += '</span>';
    }
    html += '</div></div>';
    return html;
  }

  return { render: render, symbols: symbols, labels: labels, presets: presets };
})();

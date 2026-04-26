/* circular-gallery.js — 纯JS版CircularGallery (WebGL弧形画廊)
 * 依赖: ogl (通过CDN加载)
 * 将React版CircularGallery转换为vanilla JS，适配静态HTML项目
 */

(function() {
  'use strict';

  // 检查ogl是否已加载
  if (typeof OGL === 'undefined') {
    console.warn('CircularGallery: ogl库未加载');
    return;
  }

  var Camera = OGL.Camera;
  var Mesh = OGL.Mesh;
  var Plane = OGL.Plane;
  var Program = OGL.Program;
  var Renderer = OGL.Renderer;
  var Texture = OGL.Texture;
  var Transform = OGL.Transform;

  // ======== 工具函数 ========

  function debounce(func, wait) {
    var timeout;
    return function() {
      var args = arguments;
      var ctx = this;
      clearTimeout(timeout);
      timeout = setTimeout(function() { func.apply(ctx, args); }, wait);
    };
  }

  function lerp(p1, p2, t) {
    return p1 + (p2 - p1) * t;
  }

  function autoBind(instance) {
    var proto = Object.getPrototypeOf(instance);
    Object.getOwnPropertyNames(proto).forEach(function(key) {
      if (key !== 'constructor' && typeof instance[key] === 'function') {
        instance[key] = instance[key].bind(instance);
      }
    });
  }

  function createTextTexture(gl, text, font, color) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = font;
    var metrics = context.measureText(text);
    var textWidth = Math.ceil(metrics.width);
    var textHeight = Math.ceil(parseInt(font, 10) * 1.2);
    canvas.width = textWidth + 20;
    canvas.height = textHeight + 20;
    context.font = font;
    context.fillStyle = color;
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    var texture = new Texture(gl, { generateMipmaps: false });
    texture.image = canvas;
    return { texture: texture, width: canvas.width, height: canvas.height };
  }

  // ======== Title 类 ========

  function Title(opts) {
    this.gl = opts.gl;
    this.plane = opts.plane;
    this.renderer = opts.renderer;
    this.text = opts.text;
    this.textColor = opts.textColor || '#ffffff';
    this.font = opts.font || 'bold 24px "Noto Sans SC", sans-serif';
    autoBind(this);
    this.createMesh();
  }

  Title.prototype.createMesh = function() {
    var result = createTextTexture(this.gl, this.text, this.font, this.textColor);
    var texture = result.texture;
    var width = result.width;
    var height = result.height;

    var geometry = new Plane(this.gl);
    var program = new Program(this.gl, {
      vertex: [
        'attribute vec3 position;',
        'attribute vec2 uv;',
        'uniform mat4 modelViewMatrix;',
        'uniform mat4 projectionMatrix;',
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = uv;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragment: [
        'precision highp float;',
        'uniform sampler2D tMap;',
        'varying vec2 vUv;',
        'void main() {',
        '  vec4 color = texture2D(tMap, vUv);',
        '  if (color.a < 0.1) discard;',
        '  gl_FragColor = color;',
        '}'
      ].join('\n'),
      uniforms: { tMap: { value: texture } },
      transparent: true
    });

    this.mesh = new Mesh(this.gl, { geometry: geometry, program: program });
    var aspect = width / height;
    var textHeight = this.plane.scale.y * 0.12;
    var textWidth = textHeight * aspect;
    this.mesh.scale.set(textWidth, textHeight, 1);
    this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    this.mesh.setParent(this.plane);
  };

  // ======== Media 类 ========

  function Media(opts) {
    this.extra = 0;
    this.geometry = opts.geometry;
    this.gl = opts.gl;
    this.image = opts.image;
    this.index = opts.index;
    this.length = opts.length;
    this.renderer = opts.renderer;
    this.scene = opts.scene;
    this.screen = opts.screen;
    this.text = opts.text;
    this.viewport = opts.viewport;
    this.bend = opts.bend;
    this.textColor = opts.textColor;
    this.borderRadius = opts.borderRadius || 0;
    this.font = opts.font;

    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }

  Media.prototype.createShader = function() {
    var self = this;
    var texture = new Texture(this.gl, { generateMipmaps: true });

    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: [
        'precision highp float;',
        'attribute vec3 position;',
        'attribute vec2 uv;',
        'uniform mat4 modelViewMatrix;',
        'uniform mat4 projectionMatrix;',
        'uniform float uTime;',
        'uniform float uSpeed;',
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = uv;',
        '  vec3 p = position;',
        '  p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
        '}'
      ].join('\n'),
      fragment: [
        'precision highp float;',
        'uniform vec2 uImageSizes;',
        'uniform vec2 uPlaneSizes;',
        'uniform sampler2D tMap;',
        'uniform float uBorderRadius;',
        'varying vec2 vUv;',
        '',
        'float roundedBoxSDF(vec2 p, vec2 b, float r) {',
        '  vec2 d = abs(p) - b;',
        '  return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;',
        '}',
        '',
        'void main() {',
        '  vec2 ratio = vec2(',
        '    min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),',
        '    min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)',
        '  );',
        '  vec2 uv = vec2(',
        '    vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,',
        '    vUv.y * ratio.y + (1.0 - ratio.y) * 0.5',
        '  );',
        '  vec4 color = texture2D(tMap, uv);',
        '  float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);',
        '  float edgeSmooth = 0.002;',
        '  float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);',
        '  gl_FragColor = vec4(color.rgb, alpha);',
        '}'
      ].join('\n'),
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius }
      },
      transparent: true
    });

    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = function() {
      texture.image = img;
      self.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  };

  Media.prototype.createMesh = function() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    });
    this.plane.setParent(this.scene);
  };

  Media.prototype.createTitle = function() {
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.text,
      textColor: this.textColor,
      font: this.font
    });
  };

  Media.prototype.update = function(scroll, direction) {
    this.plane.position.x = this.x - scroll.current - this.extra;

    var x = this.plane.position.x;
    var H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      var B_abs = Math.abs(this.bend);
      var R = (H * H + B_abs * B_abs) / (2 * B_abs);
      var effectiveX = Math.min(Math.abs(x), H);
      var arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    var planeOffset = this.plane.scale.x / 2;
    var viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === 'right' && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === 'left' && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  };

  Media.prototype.onResize = function(opts) {
    if (opts && opts.screen) this.screen = opts.screen;
    if (opts && opts.viewport) {
      this.viewport = opts.viewport;
    }

    this.scale = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (900 * this.scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (700 * this.scale)) / this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  };

  // ======== CircularGalleryApp 主类 ========

  function CircularGalleryApp(container, opts) {
    opts = opts || {};
    document.documentElement.classList.remove('no-js');

    this.container = container;
    this.scrollSpeed = opts.scrollSpeed || 2;
    this.scroll = { ease: opts.scrollEase || 0.05, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(this.onCheck, 200);

    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(
      opts.items,
      opts.bend,
      opts.textColor,
      opts.borderRadius,
      opts.font
    );
    this.update();
    this.addEventListeners();
  }

  CircularGalleryApp.prototype.createRenderer = function() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);
  };

  CircularGalleryApp.prototype.createCamera = function() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  };

  CircularGalleryApp.prototype.createScene = function() {
    this.scene = new Transform();
  };

  CircularGalleryApp.prototype.createGeometry = function() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100
    });
  };

  CircularGalleryApp.prototype.createMedias = function(items, bend, textColor, borderRadius, font) {
    bend = typeof bend !== 'undefined' ? bend : 3;
    textColor = textColor || '#ffffff';
    borderRadius = borderRadius || 0.05;
    font = font || 'bold 28px "Noto Sans SC", sans-serif';

    var defaultItems = [
      { image: 'https://picsum.photos/seed/1/800/600?grayscale', text: 'Bridge' },
      { image: 'https://picsum.photos/seed/2/800/600?grayscale', text: 'Desk Setup' },
      { image: 'https://picsum.photos/seed/3/800/600?grayscale', text: 'Waterfall' },
      { image: 'https://picsum.photos/seed/4/800/600?grayscale', text: 'Strawberries' },
      { image: 'https://picsum.photos/seed/5/800/600?grayscale', text: 'Deep Diving' },
      { image: 'https://picsum.photos/seed/16/800/600?grayscale', text: 'Train Track' }
    ];

    var galleryItems = (items && items.length) ? items : defaultItems;
    this.mediasImages = galleryItems.concat(galleryItems);

    var self = this;
    this.medias = this.mediasImages.map(function(data, index) {
      return new Media({
        geometry: self.planeGeometry,
        gl: self.gl,
        image: data.image,
        index: index,
        length: self.mediasImages.length,
        renderer: self.renderer,
        scene: self.scene,
        screen: self.screen,
        text: data.text,
        viewport: self.viewport,
        bend: bend,
        textColor: textColor,
        borderRadius: borderRadius,
        font: font
      });
    });
  };

  CircularGalleryApp.prototype.onTouchDown = function(e) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = e.touches ? e.touches[0].clientX : e.clientX;
  };

  CircularGalleryApp.prototype.onTouchMove = function(e) {
    if (!this.isDown) return;
    var x = e.touches ? e.touches[0].clientX : e.clientX;
    var distance = (this.start - x) * (this.scrollSpeed * 0.025);
    this.scroll.target = this.scroll.position + distance;
  };

  CircularGalleryApp.prototype.onTouchUp = function() {
    this.isDown = false;
    this.onCheck();
  };

  CircularGalleryApp.prototype.onWheel = function(e) {
    var delta = e.deltaY || e.wheelDelta || e.detail;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
  };

  CircularGalleryApp.prototype.onCheck = function() {
    if (!this.medias || !this.medias[0]) return;
    var width = this.medias[0].width;
    var itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    var item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  };

  CircularGalleryApp.prototype.onResize = function() {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.screen.width / this.screen.height
    });
    var fov = (this.camera.fov * Math.PI) / 180;
    var height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    var width = height * this.camera.aspect;
    this.viewport = { width: width, height: height };

    if (this.medias) {
      this.medias.forEach(function(media) {
        media.onResize({ screen: this.screen, viewport: this.viewport });
      }.bind(this));
    }
  };

  CircularGalleryApp.prototype.update = function() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    var direction = this.scroll.current > this.scroll.last ? 'right' : 'left';

    if (this.medias) {
      this.medias.forEach(function(media) {
        media.update(this.scroll, direction);
      }.bind(this));
    }

    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(this.update.bind(this));
  };

  CircularGalleryApp.prototype.addEventListeners = function() {
    this.boundOnResize = this.onResize.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnTouchDown = this.onTouchDown.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchUp = this.onTouchUp.bind(this);

    window.addEventListener('resize', this.boundOnResize);
    window.addEventListener('mousewheel', this.boundOnWheel);
    window.addEventListener('wheel', this.boundOnWheel);
    window.addEventListener('mousedown', this.boundOnTouchDown);
    window.addEventListener('mousemove', this.boundOnTouchMove);
    window.addEventListener('mouseup', this.boundOnTouchUp);
    window.addEventListener('touchstart', this.boundOnTouchDown);
    window.addEventListener('touchmove', this.boundOnTouchMove);
    window.addEventListener('touchend', this.boundOnTouchUp);
  };

  CircularGalleryApp.prototype.destroy = function() {
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.boundOnResize);
    window.removeEventListener('mousewheel', this.boundOnWheel);
    window.removeEventListener('wheel', this.boundOnWheel);
    window.removeEventListener('mousedown', this.boundOnTouchDown);
    window.removeEventListener('mousemove', this.boundOnTouchMove);
    window.removeEventListener('mouseup', this.boundOnTouchUp);
    window.removeEventListener('touchstart', this.boundOnTouchDown);
    window.removeEventListener('touchmove', this.boundOnTouchMove);
    window.removeEventListener('touchend', this.boundOnTouchUp);
    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas.parentNode) {
      this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas);
    }
  };

  // ======== 导出 ========
  window.CircularGalleryApp = CircularGalleryApp;

})();

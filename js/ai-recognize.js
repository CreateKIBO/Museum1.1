/* ai-recognize.js — AI东巴文字识别模块
 * 将用户绘制和参考SVG统一渲染为像素，在同一特征空间内做相似度比对
 * 优化：距离变换匹配、结构特征、多尺度网格、骨架归一化、轮廓特征
 */

(function(global) {
  'use strict';

  var GRID_SIZE = 8;
  var NORM_SIZE = 96;
  var CACHE_KEY = '__dongbaRenderCache';

  // ======== 图像预处理 ========

  function getBinaryMatrix(imageData, w, h) {
    var mat = new Uint8Array(w * h);
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = (y * w + x) * 4;
        var brightness = imageData[idx] * 0.299 + imageData[idx+1] * 0.587 + imageData[idx+2] * 0.114;
        if (brightness < 200) {
          mat[y * w + x] = 1;
          if (x < minX) minX = x;
        if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return {
      mat: mat, w: w, h: h,
      bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
    };
  }

  // 裁剪并缩放到标准尺寸，居中保持比例
  function normalizeBinary(binary) {
    var bb = binary.bbox;
    if (bb.w <= 0 || bb.h <= 0) return null;

    var pad = Math.max(4, Math.max(bb.w, bb.h) * 0.08);
    var sx = Math.max(0, bb.x - pad);
    var sy = Math.max(0, bb.y - pad);
    var sw = Math.min(binary.w - sx, bb.w + pad * 2);
    var sh = Math.min(binary.h - sy, bb.h + pad * 2);

    var margin = 8;
    var scale = Math.min((NORM_SIZE - margin * 2) / sw, (NORM_SIZE - margin * 2) / sh);
    var dw = sw * scale;
    var dh = sh * scale;
    var dx = (NORM_SIZE - dw) / 2;
    var dy = (NORM_SIZE - dh) / 2;

    var srcMat = binary.mat;
    var srcW = binary.w;
    var normMat = new Uint8Array(NORM_SIZE * NORM_SIZE);

    for (var ny = 0; ny < NORM_SIZE; ny++) {
      for (var nx = 0; nx < NORM_SIZE; nx++) {
        var srcXf = sx + (nx - dx) / scale;
        var srcYf = sy + (ny - dy) / scale;
        // 5x5 supersampling for better quality
        var count = 0;
        var samples = 0;
        for (var sy2 = -0.5; sy2 <= 0.5; sy2 += 0.25) {
          for (var sx2 = -0.5; sx2 <= 0.5; sx2 += 0.25) {
            var sxi = Math.floor(srcXf + sx2);
            var syi = Math.floor(srcYf + sy2);
            samples++;
            if (sxi >= 0 && sxi < binary.w && syi >= 0 && syi < binary.h) {
              if (srcMat[syi * srcW + sxi]) count++;
            }
          }
        }
        if (count >= samples * 0.3) normMat[ny * NORM_SIZE + nx] = 1;
      }
    }
    return normMat;
  }

  // 形态学腐蚀（3x3）
  function erode(mat) {
    var out = new Uint8Array(NORM_SIZE * NORM_SIZE);
    for (var y = 1; y < NORM_SIZE - 1; y++) {
      for (var x = 1; x < NORM_SIZE - 1; x++) {
        if (mat[y * NORM_SIZE + x]) {
          var neighbors = 0;
          for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              if (mat[(y+dy) * NORM_SIZE + (x+dx)]) neighbors++;
            }
          }
          if (neighbors >= 5) out[y * NORM_SIZE + x] = 1;
        }
      }
    }
    return out;
  }

  // 形态学膨胀（3x3）
  function dilate(mat) {
    var out = new Uint8Array(NORM_SIZE * NORM_SIZE);
    for (var y = 1; y < NORM_SIZE - 1; y++) {
      for (var x = 1; x < NORM_SIZE - 1; x++) {
        if (mat[y * NORM_SIZE + x]) {
          for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              out[(y+dy) * NORM_SIZE + (x+dx)] = 1;
            }
          }
        }
      }
    }
    return out;
  }

  // 骨架化（Zhang-Suen迭代细化）
  function skeletonize(mat) {
    var current = new Uint8Array(mat);
    var changed = true;
    var iterations = 0;
    var maxIter = 30;

    while (changed && iterations < maxIter) {
      changed = false;
      iterations++;
      var next = new Uint8Array(current);

      for (var y = 1; y < NORM_SIZE - 1; y++) {
        for (var x = 1; x < NORM_SIZE - 1; x++) {
          if (!current[y * NORM_SIZE + x]) continue;

          var p2 = current[(y-1) * NORM_SIZE + x];
          var p3 = current[(y-1) * NORM_SIZE + (x+1)];
          var p4 = current[y * NORM_SIZE + (x+1)];
          var p5 = current[(y+1) * NORM_SIZE + (x+1)];
          var p6 = current[(y+1) * NORM_SIZE + x];
          var p7 = current[(y+1) * NORM_SIZE + (x-1)];
          var p8 = current[y * NORM_SIZE + (x-1)];
          var p9 = current[(y-1) * NORM_SIZE + (x-1)];

          var B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;

          var transitions = 0;
          var seq = [p2,p3,p4,p5,p6,p7,p8,p9,p2];
          for (var i = 0; i < 8; i++) {
            if (!seq[i] && seq[i+1]) transitions++;
          }
          if (transitions !== 1) continue;

          if (iterations % 2 === 1) {
            if (p2 && p4 && p6) continue;
            if (p4 && p6 && p8) continue;
          } else {
            if (p2 && p4 && p8) continue;
            if (p2 && p6 && p8) continue;
          }

          next[y * NORM_SIZE + x] = 0;
          changed = true;
        }
      }
      current = next;
    }
    return current;
  }

  // 距离变换
  function distanceTransform(mat) {
    var dist = new Float32Array(NORM_SIZE * NORM_SIZE);
    var INF = NORM_SIZE * 2;

    for (var i = 0; i < NORM_SIZE * NORM_SIZE; i++) {
      dist[i] = mat[i] ? 0 : INF;
    }

    for (var y = 0; y < NORM_SIZE; y++) {
      for (var x = 0; x < NORM_SIZE; x++) {
        var idx = y * NORM_SIZE + x;
        if (y > 0) dist[idx] = Math.min(dist[idx], dist[(y-1)*NORM_SIZE+x] + 1);
        if (x > 0) dist[idx] = Math.min(dist[idx], dist[y*NORM_SIZE+(x-1)] + 1);
        if (y > 0 && x > 0) dist[idx] = Math.min(dist[idx], dist[(y-1)*NORM_SIZE+(x-1)] + 1.41);
        if (y > 0 && x < NORM_SIZE-1) dist[idx] = Math.min(dist[idx], dist[(y-1)*NORM_SIZE+(x+1)] + 1.41);
      }
    }

    for (var y = NORM_SIZE - 1; y >= 0; y--) {
      for (var x = NORM_SIZE - 1; x >= 0; x--) {
        var idx = y * NORM_SIZE + x;
        if (y < NORM_SIZE-1) dist[idx] = Math.min(dist[idx], dist[(y+1)*NORM_SIZE+x] + 1);
        if (x < NORM_SIZE-1) dist[idx] = Math.min(dist[idx], dist[y*NORM_SIZE+(x+1)] + 1);
        if (y < NORM_SIZE-1 && x < NORM_SIZE-1) dist[idx] = Math.min(dist[idx], dist[(y+1)*NORM_SIZE+(x+1)] + 1.41);
        if (y < NORM_SIZE-1 && x > 0) dist[idx] = Math.min(dist[idx], dist[(y+1)*NORM_SIZE+(x-1)] + 1.41);
      }
    }

    return dist;
  }

  // ======== SVG 渲染 ========

  function renderSvgToBinary(svgStr) {
    var processedSvg = svgStr.replace(/currentColor/g, '#1A1A18');
    var fullSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="' + NORM_SIZE + '" height="' + NORM_SIZE + '">' + processedSvg + '</svg>';
    var blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    var cv = document.createElement('canvas');
    cv.width = NORM_SIZE;
    cv.height = NORM_SIZE;
    var ctx = cv.getContext('2d');

    return new Promise(function(resolve) {
      var img = new Image();
      img.onload = function() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, NORM_SIZE, NORM_SIZE);
        ctx.drawImage(img, 0, 0, NORM_SIZE, NORM_SIZE);
        URL.revokeObjectURL(url);
        var imgData = ctx.getImageData(0, 0, NORM_SIZE, NORM_SIZE).data;
        var binary = getBinaryMatrix(imgData, NORM_SIZE, NORM_SIZE);
        resolve(normalizeBinary(binary));
      };
      img.onerror = function() {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  // 预渲染所有字符（带缓存）
  function ensureCache() {
    if (global[CACHE_KEY] && global[CACHE_KEY]._ready) {
      return Promise.resolve(global[CACHE_KEY]);
    }
    if (!global.DONGBA_DB) return Promise.resolve(null);

    var seen = {};
    var unique = global.DONGBA_DB.filter(function(d) {
      if (seen[d.cn]) return false;
      seen[d.cn] = true;
      return true;
    });

    var cache = { _ready: false, data: {} };
    global[CACHE_KEY] = cache;

    var promises = unique.map(function(char) {
      return renderSvgToBinary(char.svg).then(function(binary) {
        if (binary) {
          var skeleton = skeletonize(binary);
          var distMap = distanceTransform(binary);
          var features = extractFeatures(binary, skeleton);
          cache.data[char.cn] = {
            binary: binary,
            skeleton: skeleton,
            distMap: distMap,
            features: features,
            char: char
          };
        }
      });
    });

    return Promise.all(promises).then(function() {
      cache._ready = true;
      return cache;
    });
  }

  // ======== 特征提取 ========

  function extractFeatures(normMat, skelPrecomputed) {
    if (!normMat) return null;

    var features = {
      density: new Float32Array(GRID_SIZE * GRID_SIZE),
      density16: new Float32Array(16 * 16),
      density32: new Float32Array(32 * 32),
      hProj: new Float32Array(NORM_SIZE),
      vProj: new Float32Array(NORM_SIZE),
      radial: new Float32Array(6),
      quadrants: new Float32Array(4),
      totalDensity: 0,
      aspectRatio: 1,
      cx: 0.5, cy: 0.5,
      endpoints: 0,
      junctions: 0,
      crossings: 0,
      contourLen: 0,
      hCross: new Float32Array(NORM_SIZE),
      vCross: new Float32Array(NORM_SIZE)
    };

    var cellW = NORM_SIZE / GRID_SIZE;
    var cellH = NORM_SIZE / GRID_SIZE;
    var cellW16 = NORM_SIZE / 16;
    var cellH16 = NORM_SIZE / 16;
    var cellW32 = NORM_SIZE / 32;
    var cellH32 = NORM_SIZE / 32;
    var centerX = NORM_SIZE / 2, centerY = NORM_SIZE / 2;
    var maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    var sumX = 0, sumY = 0, totalCount = 0;
    var bx0 = NORM_SIZE, by0 = NORM_SIZE, bx1 = 0, by1 = 0;

    var skel = skelPrecomputed || skeletonize(normMat);

    for (var y = 0; y < NORM_SIZE; y++) {
      for (var x = 0; x < NORM_SIZE; x++) {
        var v = normMat[y * NORM_SIZE + x];
        if (!v) continue;

        totalCount++;
        sumX += x; sumY += y;
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;

        // 8x8 density grid
        var gx = Math.min(GRID_SIZE - 1, (x / cellW) | 0);
        var gy = Math.min(GRID_SIZE - 1, (y / cellH) | 0);
        features.density[gy * GRID_SIZE + gx] += 1;

        // 16x16 density grid
        var gx16 = Math.min(15, (x / cellW16) | 0);
        var gy16 = Math.min(15, (y / cellH16) | 0);
        features.density16[gy16 * 16 + gx16] += 1;

        // 32x32 density grid
        var gx32 = Math.min(31, (x / cellW32) | 0);
        var gy32 = Math.min(31, (y / cellH32) | 0);
        features.density32[gy32 * 32 + gx32] += 1;

        var dx = x - centerX, dy = y - centerY;
        var dist = Math.sqrt(dx * dx + dy * dy) / maxRadius;
        var ring = Math.min(5, (dist * 6) | 0);
        features.radial[ring] += 1;

        var qi = (y < centerY ? 0 : 2) + (x < centerX ? 0 : 1);
        features.quadrants[qi] += 1;

        features.hProj[y] += 1;
        features.vProj[x] += 1;

        // Contour detection (border pixels)
        if (x === 0 || x === NORM_SIZE-1 || y === 0 || y === NORM_SIZE-1 ||
            !normMat[(y-1)*NORM_SIZE+x] || !normMat[(y+1)*NORM_SIZE+x] ||
            !normMat[y*NORM_SIZE+(x-1)] || !normMat[y*NORM_SIZE+(x+1)]) {
          features.contourLen++;
        }

        // Horizontal/vertical crossing counts
        if (x > 0 && !normMat[y * NORM_SIZE + (x-1)] && v) {
          features.hCross[y]++;
        }
        if (y > 0 && !normMat[(y-1) * NORM_SIZE + x] && v) {
          features.vCross[x]++;
        }

        // Structural: analyze skeleton neighbors
        if (skel[y * NORM_SIZE + x] && y > 0 && y < NORM_SIZE-1 && x > 0 && x < NORM_SIZE-1) {
          var neighbors = 0;
          if (skel[(y-1)*NORM_SIZE+x]) neighbors++;
          if (skel[(y+1)*NORM_SIZE+x]) neighbors++;
          if (skel[y*NORM_SIZE+(x-1)]) neighbors++;
          if (skel[y*NORM_SIZE+(x+1)]) neighbors++;
          if (neighbors === 1) features.endpoints++;
          else if (neighbors >= 3) features.junctions++;
        }
      }
    }

    if (totalCount === 0) return null;

    // Normalize
    var cellArea = cellW * cellH;
    var cellArea16 = cellW16 * cellH16;
    var cellArea32 = cellW32 * cellH32;
    for (var i = 0; i < features.density.length; i++) features.density[i] /= cellArea;
    for (var i = 0; i < features.density16.length; i++) features.density16[i] /= cellArea16;
    for (var i = 0; i < features.density32.length; i++) features.density32[i] /= cellArea32;
    for (var i = 0; i < features.hProj.length; i++) features.hProj[i] /= NORM_SIZE;
    for (var i = 0; i < features.vProj.length; i++) features.vProj[i] /= NORM_SIZE;
    for (var i = 0; i < features.radial.length; i++) features.radial[i] /= totalCount;
    for (var i = 0; i < features.quadrants.length; i++) features.quadrants[i] /= totalCount;

    features.totalDensity = totalCount / (NORM_SIZE * NORM_SIZE);
    features.cx = sumX / totalCount / NORM_SIZE;
    features.cy = sumY / totalCount / NORM_SIZE;

    var bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
    features.aspectRatio = bh > 0 ? bw / bh : 1;

    return features;
  }

  // ======== 相似度计算 ========

  function cosineSim(a, b) {
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    var denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom > 0 ? dot / denom : 0;
  }

  function crossCorrelate(a, b) {
    var len = a.length;
    var meanA = 0, meanB = 0;
    for (var i = 0; i < len; i++) { meanA += a[i]; meanB += b[i]; }
    meanA /= len; meanB /= len;

    var num = 0, da = 0, db = 0;
    for (var i = 0; i < len; i++) {
      var va = a[i] - meanA;
      var vb = b[i] - meanB;
      num += va * vb;
      da += va * va;
      db += vb * vb;
    }
    var denom = Math.sqrt(da) * Math.sqrt(db);
    return denom > 0 ? num / denom : 0;
  }

  function computeSimilarity(fDraw, fRef) {
    var densitySim = cosineSim(fDraw.density, fRef.density);
    var density16Sim = cosineSim(fDraw.density16, fRef.density16);
    var density32Sim = cosineSim(fDraw.density32, fRef.density32);
    var hProjSim = crossCorrelate(fDraw.hProj, fRef.hProj);
    var vProjSim = crossCorrelate(fDraw.vProj, fRef.vProj);
    var radialSim = cosineSim(fDraw.radial, fRef.radial);
    var quadSim = cosineSim(fDraw.quadrants, fRef.quadrants);

    var cDist = Math.sqrt(Math.pow(fDraw.cx - fRef.cx, 2) + Math.pow(fDraw.cy - fRef.cy, 2));
    var centroidSim = Math.max(0, 1 - cDist * 2);

    var densDiff = Math.abs(fDraw.totalDensity - fRef.totalDensity);
    var densSim = Math.max(0, 1 - densDiff * 4);

    var arDiff = Math.abs(fDraw.aspectRatio - fRef.aspectRatio);
    var arSim = Math.max(0, 1 - arDiff * 0.8);

    // Structural similarity
    var epSim = 1;
    if (fRef.endpoints > 0 || fDraw.endpoints > 0) {
      var epMax = Math.max(fDraw.endpoints, fRef.endpoints, 1);
      epSim = 1 - Math.abs(fDraw.endpoints - fRef.endpoints) / epMax;
    }
    var jnSim = 1;
    if (fRef.junctions > 0 || fDraw.junctions > 0) {
      var jnMax = Math.max(fDraw.junctions, fRef.junctions, 1);
      jnSim = 1 - Math.abs(fDraw.junctions - fRef.junctions) / jnMax;
    }

    // Crossing pattern similarity
    var hCrossSim = crossCorrelate(fDraw.hCross, fRef.hCross);
    var vCrossSim = crossCorrelate(fDraw.vCross, fRef.vCross);

    // Contour length similarity
    var contMax = Math.max(fDraw.contourLen, fRef.contourLen, 1);
    var contSim = 1 - Math.abs(fDraw.contourLen - fRef.contourLen) / contMax;

    var score =
      densitySim   * 0.08 +
      density16Sim * 0.10 +
      density32Sim * 0.12 +
      hProjSim     * 0.06 +
      vProjSim     * 0.06 +
      radialSim    * 0.04 +
      quadSim      * 0.03 +
      centroidSim  * 0.03 +
      densSim      * 0.03 +
      arSim        * 0.03 +
      epSim        * 0.03 +
      jnSim        * 0.03 +
      hCrossSim    * 0.04 +
      vCrossSim    * 0.04 +
      contSim      * 0.02;

    return score;
  }

  // ======== 距离变换匹配 ========

  function dtSimilarity(matA, distMapB) {
    var totalDist = 0;
    var countA = 0;
    for (var i = 0; i < NORM_SIZE * NORM_SIZE; i++) {
      if (matA[i]) {
        totalDist += distMapB[i];
        countA++;
      }
    }
    if (countA === 0) return 0;

    var avgDist = totalDist / countA;
    // Adaptive normalization based on character size
    var normFactor = NORM_SIZE * 0.15;
    var sim = Math.max(0, 1 - avgDist / normFactor);
    return sim;
  }

  function bidirectionalDtSim(matA, distMapA, matB, distMapB) {
    var simAB = dtSimilarity(matA, distMapB);
    var simBA = dtSimilarity(matB, distMapA);
    return (simAB + simBA) / 2;
  }

  // ======== 主识别函数 ========

  function recognizeDrawing(canvas) {
    if (!canvas || !global.DONGBA_DB) return Promise.resolve([]);

    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var imgData;
    try {
      imgData = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      return Promise.resolve([]);
    }

    var binary = getBinaryMatrix(imgData, w, h);
    if (binary.bbox.w <= 0 || binary.bbox.h <= 0) return Promise.resolve([]);

    var normMat = normalizeBinary(binary);
    if (!normMat) return Promise.resolve([]);

    // Pre-compute drawing features once
    var drawSkel = skeletonize(normMat);
    var drawFeatures = extractFeatures(normMat, drawSkel);
    if (!drawFeatures) return Promise.resolve([]);

    var drawDistMap = distanceTransform(normMat);

    return ensureCache().then(function(cache) {
      if (!cache) return [];

      var results = [];
      var keys = Object.keys(cache.data);

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var entry = cache.data[key];
        if (!entry.binary) continue;

        // Use pre-computed features from cache
        var refFeatures = entry.features;
        if (!refFeatures) continue;

        // 1. Feature-level similarity
        var featureSim = computeSimilarity(drawFeatures, refFeatures);

        // 2. Bidirectional distance transform matching
        var dtSim = bidirectionalDtSim(normMat, drawDistMap, entry.binary, entry.distMap);

        // 3. Skeleton overlap
        var skelMatch = 0, skelTotal = 0;
        for (var j = 0; j < NORM_SIZE * NORM_SIZE; j++) {
          if (drawSkel[j] || entry.skeleton[j]) {
            skelTotal++;
            if (drawSkel[j] && entry.skeleton[j]) skelMatch++;
          }
        }
        var skelSim = skelTotal > 0 ? skelMatch / skelTotal : 0;

        // Combined score — DT matching has highest weight
        var confidence = featureSim * 0.25 + dtSim * 0.45 + skelSim * 0.30;

        if (confidence > 0.10) {
          results.push({
            cn: entry.char.cn,
            pinyin: entry.char.pinyin,
            en: entry.char.en,
            svg: entry.char.svg,
            confidence: confidence,
            cat: entry.char.cat
          });
        }
      }

      results.sort(function(a, b) {
        return b.confidence - a.confidence;
      });

      return results.slice(0, 5);
    });
  }

  // ======== 导出 ========

  global.RecognizeDongba = {
    recognize: recognizeDrawing,
    ensureCache: ensureCache
  };

})(typeof window !== 'undefined' ? window : global);

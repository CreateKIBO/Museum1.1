(function(global) {
  'use strict';

  var GRID_SIZE = 8;
  var NORM_SIZE = 96;
  var NORM_AREA = NORM_SIZE * NORM_SIZE;
  var CACHE_KEY = '__dongbaRenderCache';

  //图像预处理

  function getBinaryMatrix(imageData, w, h) {
    var mat = new Uint8Array(w * h);
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y++) {
      var rowOff = y * w;
      for (var x = 0; x < w; x++) {
        var idx = (rowOff + x) * 4;
        var brightness = imageData[idx] * 0.299 + imageData[idx+1] * 0.587 + imageData[idx+2] * 0.114;
        if (brightness < 200) {
          mat[rowOff + x] = 1;
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
    var invScale = 1 / scale;
    var dw = sw * scale;
    var dh = sh * scale;
    var dx = (NORM_SIZE - dw) / 2;
    var dy = (NORM_SIZE - dh) / 2;

    var srcMat = binary.mat;
    var srcW = binary.w;
    var srcH = binary.h;
    var normMat = new Uint8Array(NORM_AREA);

    // 3x3 supersampling (9 samples) — sufficient quality, 2.8x faster than 5x5
    var offsets = [-0.375, 0, 0.375];

    for (var ny = 0; ny < NORM_SIZE; ny++) {
      var srcYfBase = sy + (ny - dy) * invScale;
      for (var nx = 0; nx < NORM_SIZE; nx++) {
        var srcXfBase = sx + (nx - dx) * invScale;
        var count = 0;
        for (var si = 0; si < 3; si++) {
          var syi = Math.floor(srcYfBase + offsets[si]);
          if (syi < 0 || syi >= srcH) continue;
          var rowOff = syi * srcW;
          for (var sj = 0; sj < 3; sj++) {
            var sxi = Math.floor(srcXfBase + offsets[sj]);
            if (sxi >= 0 && sxi < srcW) {
              if (srcMat[rowOff + sxi]) count++;
            }
          }
        }
        if (count >= 3) normMat[ny * NORM_SIZE + nx] = 1;
      }
    }
    return normMat;
  }

  // 形态学腐蚀（3x3）— optimized with early exit
  function erode(mat) {
    var out = new Uint8Array(NORM_AREA);
    for (var y = 1; y < NORM_SIZE - 1; y++) {
      var rowOff = y * NORM_SIZE;
      for (var x = 1; x < NORM_SIZE - 1; x++) {
        if (!mat[rowOff + x]) continue;
        var neighbors = 0;
        if (mat[(rowOff - NORM_SIZE) + x - 1]) neighbors++;
        if (mat[(rowOff - NORM_SIZE) + x]) neighbors++;
        if (mat[(rowOff - NORM_SIZE) + x + 1]) neighbors++;
        if (mat[rowOff + x - 1]) neighbors++;
        if (mat[rowOff + x + 1]) neighbors++;
        if (mat[(rowOff + NORM_SIZE) + x - 1]) neighbors++;
        if (mat[(rowOff + NORM_SIZE) + x]) neighbors++;
        if (mat[(rowOff + NORM_SIZE) + x + 1]) neighbors++;
        if (neighbors >= 4) out[rowOff + x] = 1; // self always =1, so neighbors>=4 means total>=5
      }
    }
    return out;
  }

  // 形态学膨胀（3x3）— optimized
  function dilate(mat) {
    var out = new Uint8Array(NORM_AREA);
    for (var y = 1; y < NORM_SIZE - 1; y++) {
      var rowOff = y * NORM_SIZE;
      for (var x = 1; x < NORM_SIZE - 1; x++) {
        if (!mat[rowOff + x]) continue;
        out[(rowOff - NORM_SIZE) + x - 1] = 1;
        out[(rowOff - NORM_SIZE) + x] = 1;
        out[(rowOff - NORM_SIZE) + x + 1] = 1;
        out[rowOff + x - 1] = 1;
        out[rowOff + x] = 1;
        out[rowOff + x + 1] = 1;
        out[(rowOff + NORM_SIZE) + x - 1] = 1;
        out[(rowOff + NORM_SIZE) + x] = 1;
        out[(rowOff + NORM_SIZE) + x + 1] = 1;
      }
    }
    return out;
  }

  // 骨架化（Zhang-Suen迭代细化）— optimized
  function skeletonize(mat) {
    var current = new Uint8Array(mat);
    var changed = true;
    var iterations = 0;
    var maxIter = 30;

    while (changed && iterations < maxIter) {
      changed = false;
      iterations++;
      var next = new Uint8Array(current);
      var isOdd = iterations & 1;

      for (var y = 1; y < NORM_SIZE - 1; y++) {
        var rowOff = y * NORM_SIZE;
        for (var x = 1; x < NORM_SIZE - 1; x++) {
          if (!current[rowOff + x]) continue;

          var p2 = current[(rowOff - NORM_SIZE) + x];
          var p3 = current[(rowOff - NORM_SIZE) + x + 1];
          var p4 = current[rowOff + x + 1];
          var p5 = current[(rowOff + NORM_SIZE) + x + 1];
          var p6 = current[(rowOff + NORM_SIZE) + x];
          var p7 = current[(rowOff + NORM_SIZE) + x - 1];
          var p8 = current[rowOff + x - 1];
          var p9 = current[(rowOff - NORM_SIZE) + x - 1];

          var B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;

          var transitions = 0;
          if (!p2 && p3) transitions++;
          if (!p3 && p4) transitions++;
          if (!p4 && p5) transitions++;
          if (!p5 && p6) transitions++;
          if (!p6 && p7) transitions++;
          if (!p7 && p8) transitions++;
          if (!p8 && p9) transitions++;
          if (!p9 && p2) transitions++;
          if (transitions !== 1) continue;

          if (isOdd) {
            if (p2 && p4 && p6) continue;
            if (p4 && p6 && p8) continue;
          } else {
            if (p2 && p4 && p8) continue;
            if (p2 && p6 && p8) continue;
          }

          next[rowOff + x] = 0;
          changed = true;
        }
      }
      current = next;
    }
    return current;
  }

  // 距离变换 — optimized with precomputed offsets
  function distanceTransform(mat) {
    var dist = new Float32Array(NORM_AREA);
    var INF = NORM_SIZE * 2;

    for (var i = 0; i < NORM_AREA; i++) {
      dist[i] = mat[i] ? 0 : INF;
    }

    // Forward pass
    for (var y = 0; y < NORM_SIZE; y++) {
      var rowOff = y * NORM_SIZE;
      for (var x = 0; x < NORM_SIZE; x++) {
        var idx = rowOff + x;
        var d = dist[idx];
        if (y > 0) {
          var v = dist[(rowOff - NORM_SIZE) + x] + 1;
          if (v < d) d = v;
        }
        if (x > 0) {
          var v = dist[idx - 1] + 1;
          if (v < d) d = v;
        }
        if (y > 0 && x > 0) {
          var v = dist[(rowOff - NORM_SIZE) + x - 1] + 1.41;
          if (v < d) d = v;
        }
        if (y > 0 && x < NORM_SIZE - 1) {
          var v = dist[(rowOff - NORM_SIZE) + x + 1] + 1.41;
          if (v < d) d = v;
        }
        dist[idx] = d;
      }
    }

    // Backward pass
    for (var y = NORM_SIZE - 1; y >= 0; y--) {
      var rowOff = y * NORM_SIZE;
      for (var x = NORM_SIZE - 1; x >= 0; x--) {
        var idx = rowOff + x;
        var d = dist[idx];
        if (y < NORM_SIZE - 1) {
          var v = dist[(rowOff + NORM_SIZE) + x] + 1;
          if (v < d) d = v;
        }
        if (x < NORM_SIZE - 1) {
          var v = dist[idx + 1] + 1;
          if (v < d) d = v;
        }
        if (y < NORM_SIZE - 1 && x < NORM_SIZE - 1) {
          var v = dist[(rowOff + NORM_SIZE) + x + 1] + 1.41;
          if (v < d) d = v;
        }
        if (y < NORM_SIZE - 1 && x > 0) {
          var v = dist[(rowOff + NORM_SIZE) + x - 1] + 1.41;
          if (v < d) d = v;
        }
        dist[idx] = d;
      }
    }

    return dist;
  }

  //SVG 渲染

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
        var normMat = normalizeBinary(binary);
        if (normMat) {
          var cleaned = dilate(normMat);
          cleaned = erode(cleaned);
          resolve(cleaned);
        } else {
          resolve(normMat);
        }
      };
      img.onerror = function() {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  // 预渲染所有字符（带缓存）— optimized with parallel batch processing
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

    // Process in batches to avoid overwhelming the browser
    var BATCH_SIZE = 20;
    var index = 0;

    function processBatch() {
      var batch = [];
      for (var b = 0; b < BATCH_SIZE && index < unique.length; b++, index++) {
        batch.push(unique[index]);
      }
      if (batch.length === 0) {
        cache._ready = true;
        return Promise.resolve(cache);
      }

      return Promise.all(batch.map(function(char) {
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
      })).then(processBatch);
    }

    return processBatch();
  }

  //特征提取

  function computeHuMoments(mat) {
    var m00 = 0, m10 = 0, m01 = 0;
    for (var y = 0; y < NORM_SIZE; y++) {
      var rowOff = y * NORM_SIZE;
      for (var x = 0; x < NORM_SIZE; x++) {
        if (mat[rowOff + x]) {
          m00 += 1; m10 += x; m01 += y;
        }
      }
    }
    if (m00 === 0) return new Float32Array(7);
    var cx = m10 / m00, cy = m01 / m00;

    var mu20 = 0, mu11 = 0, mu02 = 0;
    var mu30 = 0, mu21 = 0, mu12 = 0, mu03 = 0;
    for (var y = 0; y < NORM_SIZE; y++) {
      var rowOff = y * NORM_SIZE;
      var dy = y - cy;
      var dy2 = dy * dy;
      for (var x = 0; x < NORM_SIZE; x++) {
        if (mat[rowOff + x]) {
          var dx = x - cx;
          var dx2 = dx * dx;
          mu20 += dx2; mu11 += dx * dy; mu02 += dy2;
          mu30 += dx2 * dx; mu21 += dx2 * dy;
          mu12 += dx * dy2; mu03 += dy2 * dy;
        }
      }
    }

    var m00sq = m00 * m00;
    var e20 = mu20 / m00sq;
    var e11 = mu11 / m00sq;
    var e02 = mu02 / m00sq;
    var m00cb = m00 * m00sq;
    var e30 = mu30 / m00cb;
    var e21 = mu21 / m00cb;
    var e12 = mu12 / m00cb;
    var e03 = mu03 / m00cb;

    var hu = new Float32Array(7);
    hu[0] = e20 + e02;
    hu[1] = (e20 - e02) * (e20 - e02) + 4 * e11 * e11;
    hu[2] = (e30 - 3 * e12) * (e30 - 3 * e12) + (3 * e21 - e03) * (3 * e21 - e03);
    hu[3] = (e30 + e12) * (e30 + e12) + (e21 + e03) * (e21 + e03);
    hu[4] = (e30 - 3 * e12) * (e30 + e12) * ((e30 + e12) * (e30 + e12) - 3 * (e21 + e03) * (e21 + e03))
          + (3 * e21 - e03) * (e21 + e03) * (3 * (e30 + e12) * (e30 + e12) - (e21 + e03) * (e21 + e03));
    hu[5] = (e20 - e02) * ((e30 + e12) * (e30 + e12) - (e21 + e03) * (e21 + e03))
          + 4 * e11 * (e30 + e12) * (e21 + e03);
    hu[6] = (3 * e21 - e03) * (e30 + e12) * ((e30 + e12) * (e30 + e12) - 3 * (e21 + e03) * (e21 + e03))
          - (e30 - 3 * e12) * (e21 + e03) * (3 * (e30 + e12) * (e30 + e12) - (e21 + e03) * (e21 + e03));

    for (var i = 0; i < 7; i++) {
      if (hu[i] !== 0) hu[i] = Math.sign(hu[i]) * Math.log(Math.abs(hu[i]) + 1e-20);
    }
    return hu;
  }

  function estimateStrokeWidth(mat, skel) {
    // Use distance transform for efficient stroke width estimation
    var distMap = distanceTransform(mat);
    var totalDist = 0, count = 0;
    for (var y = 2; y < NORM_SIZE - 2; y++) {
      var rowOff = y * NORM_SIZE;
      for (var x = 2; x < NORM_SIZE - 2; x++) {
        if (skel[rowOff + x]) {
          totalDist += distMap[rowOff + x];
          count++;
        }
      }
    }
    return count > 0 ? totalDist / count * 2 : 2;
  }

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
      vCross: new Float32Array(NORM_SIZE),
      hu: null
    };

    var cellW = NORM_SIZE / GRID_SIZE;
    var cellH = NORM_SIZE / GRID_SIZE;
    var cellW16 = NORM_SIZE / 16;
    var cellH16 = NORM_SIZE / 16;
    var cellW32 = NORM_SIZE / 32;
    var cellH32 = NORM_SIZE / 32;
    var centerX = NORM_SIZE / 2, centerY = NORM_SIZE / 2;
    var maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    var invMaxRadius = 1 / maxRadius;
    var sumX = 0, sumY = 0, totalCount = 0;
    var bx0 = NORM_SIZE, by0 = NORM_SIZE, bx1 = 0, by1 = 0;

    var skel = skelPrecomputed || skeletonize(normMat);

    for (var y = 0; y < NORM_SIZE; y++) {
      var rowOff = y * NORM_SIZE;
      for (var x = 0; x < NORM_SIZE; x++) {
        var v = normMat[rowOff + x];
        if (!v) continue;

        totalCount++;
        sumX += x; sumY += y;
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;

        var gx = Math.min(GRID_SIZE - 1, (x / cellW) | 0);
        var gy = Math.min(GRID_SIZE - 1, (y / cellH) | 0);
        features.density[gy * GRID_SIZE + gx] += 1;

        var gx16 = Math.min(15, (x / cellW16) | 0);
        var gy16 = Math.min(15, (y / cellH16) | 0);
        features.density16[gy16 * 16 + gx16] += 1;

        var gx32 = Math.min(31, (x / cellW32) | 0);
        var gy32 = Math.min(31, (y / cellH32) | 0);
        features.density32[gy32 * 32 + gx32] += 1;

        var dx = x - centerX, dy = y - centerY;
        var dist = Math.sqrt(dx * dx + dy * dy) * invMaxRadius;
        var ring = Math.min(5, (dist * 6) | 0);
        features.radial[ring] += 1;

        var qi = (y < centerY ? 0 : 2) + (x < centerX ? 0 : 1);
        features.quadrants[qi] += 1;

        features.hProj[y] += 1;
        features.vProj[x] += 1;

        if (x === 0 || x === NORM_SIZE-1 || y === 0 || y === NORM_SIZE-1 ||
            !normMat[(rowOff - NORM_SIZE) + x] || !normMat[(rowOff + NORM_SIZE) + x] ||
            !normMat[rowOff + x - 1] || !normMat[rowOff + x + 1]) {
          features.contourLen++;
        }

        if (x > 0 && !normMat[rowOff + x - 1]) {
          features.hCross[y]++;
        }
        if (y > 0 && !normMat[(rowOff - NORM_SIZE) + x]) {
          features.vCross[x]++;
        }

        if (skel[rowOff + x] && y > 0 && y < NORM_SIZE-1 && x > 0 && x < NORM_SIZE-1) {
          var neighbors = 0;
          if (skel[(rowOff - NORM_SIZE) + x]) neighbors++;
          if (skel[(rowOff + NORM_SIZE) + x]) neighbors++;
          if (skel[rowOff + x - 1]) neighbors++;
          if (skel[rowOff + x + 1]) neighbors++;
          if (neighbors === 1) features.endpoints++;
          else if (neighbors >= 3) features.junctions++;
        }
      }
    }

    if (totalCount === 0) return null;

    var cellArea = cellW * cellH;
    var cellArea16 = cellW16 * cellH16;
    var cellArea32 = cellW32 * cellH32;
    var invCellArea = 1 / cellArea;
    var invCellArea16 = 1 / cellArea16;
    var invCellArea32 = 1 / cellArea32;
    var invNormSize = 1 / NORM_SIZE;
    var invTotalCount = 1 / totalCount;

    for (var i = 0; i < features.density.length; i++) features.density[i] *= invCellArea;
    for (var i = 0; i < features.density16.length; i++) features.density16[i] *= invCellArea16;
    for (var i = 0; i < features.density32.length; i++) features.density32[i] *= invCellArea32;
    for (var i = 0; i < features.hProj.length; i++) features.hProj[i] *= invNormSize;
    for (var i = 0; i < features.vProj.length; i++) features.vProj[i] *= invNormSize;
    for (var i = 0; i < features.radial.length; i++) features.radial[i] *= invTotalCount;
    for (var i = 0; i < features.quadrants.length; i++) features.quadrants[i] *= invTotalCount;

    features.totalDensity = totalCount / NORM_AREA;
    features.cx = sumX * invTotalCount * invNormSize;
    features.cy = sumY * invTotalCount * invNormSize;

    var bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
    features.aspectRatio = bh > 0 ? bw / bh : 1;

    features.hu = computeHuMoments(normMat);

    return features;
  }

  //相似度计算

  function cosineSim(a, b) {
    var dot = 0, na = 0, nb = 0;
    for (var i = 0, len = a.length; i < len; i++) {
      var va = a[i], vb = b[i];
      dot += va * vb;
      na += va * va;
      nb += vb * vb;
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

  function crossCorrelateShifted(a, b, shift) {
    var len = a.length;
    var meanA = 0, meanB = 0, count = 0;
    for (var i = 0; i < len; i++) {
      var j = i + shift;
      if (j >= 0 && j < len) { meanA += a[i]; meanB += b[j]; count++; }
    }
    if (count === 0) return 0;
    var invCount = 1 / count;
    meanA *= invCount; meanB *= invCount;
    var num = 0, da = 0, db = 0;
    for (var i = 0; i < len; i++) {
      var j = i + shift;
      if (j >= 0 && j < len) {
        var va = a[i] - meanA;
        var vb = b[j] - meanB;
        num += va * vb;
        da += va * va;
        db += vb * vb;
      }
    }
    var denom = Math.sqrt(da) * Math.sqrt(db);
    return denom > 0 ? num / denom : 0;
  }

  function shiftTolerantCorrelate(a, b, maxShift) {
    maxShift = maxShift || 4;
    var bestSim = -1;
    for (var shift = -maxShift; shift <= maxShift; shift++) {
      var sim = crossCorrelateShifted(a, b, shift);
      if (sim > bestSim) bestSim = sim;
    }
    return bestSim;
  }

  function computeSimilarity(fDraw, fRef) {
    var densitySim = cosineSim(fDraw.density, fRef.density);
    var density16Sim = cosineSim(fDraw.density16, fRef.density16);
    var density32Sim = cosineSim(fDraw.density32, fRef.density32);
    var hProjSim = shiftTolerantCorrelate(fDraw.hProj, fRef.hProj, 4);
    var vProjSim = shiftTolerantCorrelate(fDraw.vProj, fRef.vProj, 4);
    var radialSim = cosineSim(fDraw.radial, fRef.radial);
    var quadSim = cosineSim(fDraw.quadrants, fRef.quadrants);

    var cDist = Math.sqrt((fDraw.cx - fRef.cx) * (fDraw.cx - fRef.cx) + (fDraw.cy - fRef.cy) * (fDraw.cy - fRef.cy));
    var centroidSim = Math.max(0, 1 - cDist * 2);

    var densDiff = Math.abs(fDraw.totalDensity - fRef.totalDensity);
    var densSim = Math.max(0, 1 - densDiff * 4);

    var arDiff = Math.abs(fDraw.aspectRatio - fRef.aspectRatio);
    var arSim = Math.max(0, 1 - arDiff * 0.8);

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

    var hCrossSim = crossCorrelate(fDraw.hCross, fRef.hCross);
    var vCrossSim = crossCorrelate(fDraw.vCross, fRef.vCross);

    var contMax = Math.max(fDraw.contourLen, fRef.contourLen, 1);
    var contSim = 1 - Math.abs(fDraw.contourLen - fRef.contourLen) / contMax;

    var huSim = 0;
    if (fDraw.hu && fRef.hu) huSim = cosineSim(fDraw.hu, fRef.hu);

    // Rebalanced weights: increased Hu moments and crossing counts (strong discriminators)
    var score =
      densitySim   * 0.05 +
      density16Sim * 0.07 +
      density32Sim * 0.06 +
      hProjSim     * 0.05 +
      vProjSim     * 0.05 +
      radialSim    * 0.04 +
      quadSim      * 0.03 +
      centroidSim  * 0.03 +
      densSim      * 0.02 +
      arSim        * 0.04 +
      epSim        * 0.05 +
      jnSim        * 0.05 +
      hCrossSim    * 0.08 +
      vCrossSim    * 0.08 +
      contSim      * 0.04 +
      huSim        * 0.08;

    return score;
  }

  //距离变换匹配

  function dtSimilarity(matA, distMapB, densityA) {
    var totalDist = 0;
    var countA = 0;
    for (var i = 0; i < NORM_AREA; i++) {
      if (matA[i]) {
        totalDist += distMapB[i];
        countA++;
      }
    }
    if (countA === 0) return 0;

    var avgDist = totalDist / countA;
    var normFactor = NORM_SIZE * (0.12 + (densityA || 0.1) * 0.3);
    return Math.max(0, 1 - avgDist / normFactor);
  }

  function bidirectionalDtSim(matA, distMapA, matB, distMapB, densityA, densityB) {
    var simAB = dtSimilarity(matA, distMapB, densityA);
    var simBA = dtSimilarity(matB, distMapA, densityB);
    return (simAB + simBA) * 0.5;
  }

  //主识别函数

  function chamferSkeletonSim(skelA, distMapB) {
    var totalDist = 0, countA = 0;
    for (var i = 0; i < NORM_AREA; i++) {
      if (skelA[i]) {
        totalDist += distMapB[i];
        countA++;
      }
    }
    if (countA === 0) return 0;
    var avgDist = totalDist / countA;
    var normFactor = NORM_SIZE * 0.12;
    return Math.max(0, 1 - avgDist / normFactor);
  }

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

    var origSkel = skeletonize(normMat);
    var strokeWidth = estimateStrokeWidth(normMat, origSkel);
    var targetWidth = 12;
    var dilatePasses = Math.max(0, Math.min(5, Math.round((targetWidth - strokeWidth) / 2)));
    var dilated = new Uint8Array(normMat);
    for (var p = 0; p < dilatePasses; p++) {
      dilated = dilate(dilated);
    }

    var drawSkel = skeletonize(dilated);
    var drawFeatures = extractFeatures(dilated, drawSkel);
    if (!drawFeatures) return Promise.resolve([]);

    var drawDistMap = distanceTransform(dilated);
    var origDistMap = distanceTransform(normMat);

    return ensureCache().then(function(cache) {
      if (!cache) return [];

      var results = [];
      var keys = Object.keys(cache.data);

      var drawAR = drawFeatures.aspectRatio;
      var drawDensity = drawFeatures.totalDensity;
      var drawEP = drawFeatures.endpoints;
      var drawJN = drawFeatures.junctions;
      var drawRadial = drawFeatures.radial;
      var drawQuadrants = drawFeatures.quadrants;

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var entry = cache.data[key];
        if (!entry.binary) continue;

        var refFeatures = entry.features;
        if (!refFeatures) continue;

        // Enhanced coarse pre-filter with radial and quadrant
        if (Math.abs(drawAR - refFeatures.aspectRatio) > 0.55) continue;
        if (Math.abs(drawDensity - refFeatures.totalDensity) > 0.14) continue;
        if (Math.abs(drawEP - refFeatures.endpoints) > 3) continue;
        if (Math.abs(drawJN - refFeatures.junctions) > 3) continue;

        // Radial density pre-filter (fast structural check)
        var radialDiff = 0;
        for (var r = 0; r < 6; r++) {
          radialDiff += Math.abs(drawRadial[r] - refFeatures.radial[r]);
        }
        if (radialDiff > 0.5) continue;

        // Quadrant density pre-filter
        var quadDiff = 0;
        for (var q = 0; q < 4; q++) {
          quadDiff += Math.abs(drawQuadrants[q] - refFeatures.quadrants[q]);
        }
        if (quadDiff > 0.5) continue;

        var featureSim = computeSimilarity(drawFeatures, refFeatures);

        var dtSim = bidirectionalDtSim(
          dilated, drawDistMap, entry.binary, entry.distMap,
          drawFeatures.totalDensity, refFeatures.totalDensity
        );

        var skelSimAB = chamferSkeletonSim(origSkel, entry.distMap);
        var skelSimBA = chamferSkeletonSim(entry.skeleton, origDistMap);
        var skelSim = (skelSimAB + skelSimBA) * 0.5;

        // Rebalanced: DT matching most reliable, skeleton second, features third
        var confidence = featureSim * 0.25 + dtSim * 0.40 + skelSim * 0.35;

        if (confidence > 0.25) {
          results.push({
            cn: entry.char.cn,
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

  //导出

  global.RecognizeDongba = {
    recognize: recognizeDrawing
  };

})(typeof window !== 'undefined' ? window : global);

/* Food tracking — reads nutrition labels on the device with Tesseract (open-source OCR, no AI service).
   Loaded only when a label is scanned; files are cached for offline use after the first scan. */
(function () {
  'use strict';
  var base = new URL('vendor/tesseract/', location.href).href;
  var workerP = null;

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      if (window.Tesseract) return ok();
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { fail(new Error('Could not load the label reader')); };
      document.head.appendChild(s);
    });
  }
  function getWorker(onProgress) {
    if (workerP) workerP.onProgress = onProgress;
    if (!workerP) {
      workerP = loadScript(base + 'tesseract.min.js').then(function () {
        return window.Tesseract.createWorker(['spa', 'eng'], 1, {
          workerPath: base + 'worker.min.js',
          corePath: base + 'core',
          langPath: base + 'lang',
          gzip: true,
          logger: function (m) { if (workerP && workerP.onProgress && m && m.status) workerP.onProgress(m); }
        }).then(function (w) { return w.setParameters({ tessedit_pageseg_mode: '11' }).then(function () { return w; }); });
      }).catch(function (e) { workerP = null; throw e; });
    }
    return workerP;
  }
  function loadImage(file) {
    return new Promise(function (ok, fail) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { ok({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error('Could not open that image')); };
      img.src = url;
    });
  }
  // grayscale + adaptive black & white (Bradley), optionally rotated: copes with coloured packs and shadows
  function prepare(img, rot) {
    var long = Math.max(img.width, img.height), sc = long < 1600 ? 1600 / long : Math.min(1, 3200 / long);
    var w0 = Math.round(img.width * sc), h0 = Math.round(img.height * sc);
    var side = rot % 180 !== 0, w = side ? h0 : w0, h = side ? w0 : h0;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.translate(w / 2, h / 2); ctx.rotate(rot * Math.PI / 180); ctx.drawImage(img, -w0 / 2, -h0 / 2, w0, h0);
    var d = ctx.getImageData(0, 0, w, h), px = d.data, g = new Float32Array(w * h);
    for (var i = 0, j = 0; i < px.length; i += 4, j++) g[j] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    var I = new Float64Array((w + 1) * (h + 1));
    for (var y = 0; y < h; y++) { var row = 0; for (var x = 0; x < w; x++) { row += g[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
    var r = Math.max(8, Math.round(w / 48)), t = 0.15;
    for (var yy = 0; yy < h; yy++) {
      var y0 = Math.max(0, yy - r), y1 = Math.min(h, yy + r + 1);
      for (var xx = 0; xx < w; xx++) {
        var x0 = Math.max(0, xx - r), x1 = Math.min(w, xx + r + 1);
        var sum = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
        var v = g[yy * w + xx] * (y1 - y0) * (x1 - x0) <= sum * (1 - t) ? 0 : 255, k = (yy * w + xx) * 4;
        px[k] = px[k + 1] = px[k + 2] = v;
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.putImageData(d, 0, 0);
    return cv;
  }
  function thumbOf(img) {
    var tc = document.createElement('canvas'), ts = Math.min(1, 1400 / Math.max(img.width, img.height));
    tc.width = Math.round(img.width * ts); tc.height = Math.round(img.height * ts);
    tc.getContext('2d').drawImage(img, 0, 0, tc.width, tc.height);
    return tc.toDataURL('image/jpeg', 0.85);
  }
  function score(v) { return v.found * 10 + (v.consistent ? 5 : 0); }
  // rebuild the visual rows of the table from word positions (label on the left, numbers on the right)
  function rowsText(blocks) {
    var words = [], slopes = [];
    (blocks || []).forEach(function (b) { (b.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(function (l) {
      var bl = l.baseline; if (bl && bl.x1 - bl.x0 > 80) slopes.push((bl.y1 - bl.y0) / (bl.x1 - bl.x0));
      (l.words || []).forEach(function (w) { words.push(w); });
    }); }); });
    if (!words.length) return '';
    // undo the tilt of the photo before grouping words into rows
    slopes.sort(function (a, b) { return a - b; });
    var slope = slopes.length ? slopes[Math.floor(slopes.length / 2)] : 0;
    words.forEach(function (w) { var cx = (w.bbox.x0 + w.bbox.x1) / 2; w._cy = (w.bbox.y0 + w.bbox.y1) / 2 - slope * cx; });
    var hs = words.map(function (w) { return w.bbox.y1 - w.bbox.y0; }).sort(function (a, b) { return a - b; });
    var mh = hs[Math.floor(hs.length / 2)] || 20, rows = [];
    words.sort(function (a, b) { return a._cy - b._cy; });
    words.forEach(function (w) {
      var cy = w._cy, r = null;
      for (var i = 0; i < rows.length; i++) if (Math.abs(rows[i].cy - cy) < mh * 0.6) { r = rows[i]; break; }
      if (!r) { r = { cy: cy, ws: [] }; rows.push(r); }
      r.ws.push(w); r.cy = (r.cy * (r.ws.length - 1) + cy) / r.ws.length;
    });
    return rows.sort(function (a, b) { return a.cy - b.cy; }).map(function (r) {
      return r.ws.sort(function (a, b) { return a.bbox.x0 - b.bbox.x0; }).map(function (w) { return w.text; }).join(' ');
    }).join('\n');
  }
  // reads the photo; if little is found, tries it turned sideways (labels on round pots are often photographed rotated)
  function readLabel(file, onProgress) {
    var L, worker;
    return loadImage(file).then(function (x) { L = x; return getWorker(onProgress); }).then(function (w) {
      worker = w;
      var best = null, rots = [0, 90, 270];
      function attempt(i) {
        if (i >= rots.length || (best && best.found === 4 && best.consistent)) return best;
        return worker.recognize(prepare(L.img, rots[i]), {}, { blocks: true, text: true }).then(function (r) {
          var text = rowsText(r.data.blocks) || r.data.text || '';
          var v = window.FT_CORE.parseLabel(text); v.text = text;
          if (!best || score(v) > score(best)) best = v;
          if (i === 0 && best.found >= 3) return best;
          return attempt(i + 1);
        });
      }
      return attempt(0);
    }).then(function (v) { v.thumb = thumbOf(L.img); URL.revokeObjectURL(L.url); return v; });
  }
  window.FT_OCR = { readLabel: readLabel };
})();

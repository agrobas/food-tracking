/* Food tracking — reads nutrition labels on the iPhone with PaddleOCR (open-source, runs on the device, no AI service).
   The reader (~40 MB) downloads the first time it is used and is then cached for offline use. */
(function () {
  'use strict';
  var base = new URL('vendor/paddle/', location.href).href;
  var ocrP = null;

  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { fail(new Error('Could not load the label reader. Check your connection.')); };
      document.head.appendChild(s);
    });
  }
  function getOcr(onProgress) {
    if (!ocrP) {
      if (onProgress) onProgress({ status: 'loading' });
      ocrP = (window.ort ? Promise.resolve() : loadScript(base + 'ort.min.js'))
        .then(function () { return window.PaddleOcr ? null : loadScript(base + 'paddle-ocr.min.js'); })
        .then(function () {
          window.ort.env.wasm.wasmPaths = base;
          window.ort.env.wasm.numThreads = 1;
          return window.PaddleOcr.create({ models: { detectionPath: base + 'ch_PP-OCRv4_det_infer.onnx', recognitionPath: base + 'ch_PP-OCRv4_rec_infer.onnx', dictionaryPath: base + 'ppocr_keys_v1.txt' } });
        }).catch(function (e) { ocrP = null; throw e; });
    }
    return ocrP;
  }
  function loadImage(file) {
    return new Promise(function (ok, fail) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { ok({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error('Could not open that image')); };
      img.src = url;
    });
  }
  function canvasFor(img, rot) {
    var long = Math.max(img.width, img.height), sc = Math.min(1, 2000 / long);
    var w0 = Math.round(img.width * sc), h0 = Math.round(img.height * sc);
    var side = rot % 180 !== 0, w = side ? h0 : w0, h = side ? w0 : h0;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2); ctx.rotate(rot * Math.PI / 180); ctx.drawImage(img, -w0 / 2, -h0 / 2, w0, h0);
    return cv;
  }
  function blobUrl(cv) {
    return new Promise(function (ok) { cv.toBlob(function (b) { ok(URL.createObjectURL(b)); }, 'image/jpeg', 0.92); });
  }
  // put the detected text boxes back into the rows of the table (undoing the tilt of the photo)
  function rowsFromBoxes(T) {
    var items = [], slopes = [];
    (T || []).forEach(function (t) {
      var b = t.box; if (!b || !t.text) return;
      var cx = (b[0][0] + b[1][0] + b[2][0] + b[3][0]) / 4, cy = (b[0][1] + b[1][1] + b[2][1] + b[3][1]) / 4;
      var w = Math.hypot(b[1][0] - b[0][0], b[1][1] - b[0][1]), h = Math.hypot(b[3][0] - b[0][0], b[3][1] - b[0][1]);
      if (w > h * 2 && b[1][0] !== b[0][0]) slopes.push((b[1][1] - b[0][1]) / (b[1][0] - b[0][0]));
      items.push({ text: t.text, cx: cx, cy: cy, x: Math.min(b[0][0], b[3][0]), h: h });
    });
    if (!items.length) return '';
    slopes.sort(function (a, c) { return a - c; });
    var sl = slopes.length ? slopes[Math.floor(slopes.length / 2)] : 0;
    items.forEach(function (i) { i.y = i.cy - sl * i.cx; i.xx = i.x + sl * i.cy; });
    var hs = items.map(function (i) { return i.h; }).sort(function (a, c) { return a - c; });
    var mh = hs[Math.floor(hs.length / 2)] || 20, rows = [];
    items.sort(function (a, c) { return a.y - c.y; });
    items.forEach(function (i) {
      var row = null;
      for (var k = 0; k < rows.length; k++) if (Math.abs(rows[k].y - i.y) < mh * 0.55) { row = rows[k]; break; }
      if (!row) { row = { y: i.y, ws: [] }; rows.push(row); }
      row.ws.push(i); row.y = (row.y * (row.ws.length - 1) + i.y) / row.ws.length;
    });
    return rows.sort(function (a, c) { return a.y - c.y; }).map(function (r) {
      return r.ws.sort(function (a, c) { return a.xx - c.xx; }).map(function (w) { return w.text; }).join(' ');
    }).join('\n');
  }
  function thumbOf(img) {
    var tc = document.createElement('canvas'), ts = Math.min(1, 1400 / Math.max(img.width, img.height));
    tc.width = Math.round(img.width * ts); tc.height = Math.round(img.height * ts);
    tc.getContext('2d').drawImage(img, 0, 0, tc.width, tc.height);
    return tc.toDataURL('image/jpeg', 0.85);
  }
  function score(v) { return v.found * 10 + (v.consistent ? 5 : 0); }
  // reads one photo; if little is found, tries it turned sideways (labels on round pots are often photographed rotated)
  function readLabel(file, onProgress) {
    var L, ocr;
    return loadImage(file).then(function (x) { L = x; return getOcr(onProgress); }).then(function (o) {
      ocr = o;
      if (onProgress) onProgress({ status: 'reading' });
      var best = null, rots = [0, 90, 270];
      function attempt(i) {
        if (i >= rots.length || (best && best.found === 4 && best.consistent)) return best;
        return blobUrl(canvasFor(L.img, rots[i])).then(function (u) {
          return ocr.detect(u).then(function (r) {
            URL.revokeObjectURL(u);
            var text = rowsFromBoxes(r.texts || r);
            var v = window.FT_CORE.parseLabel(text); v.text = text;
            if (!best || score(v) > score(best)) best = v;
            if (i === 0 && best.found >= 3) return best;
            return attempt(i + 1);
          });
        });
      }
      return attempt(0);
    }).then(function (v) { v.thumb = thumbOf(L.img); URL.revokeObjectURL(L.url); return v; });
  }
  window.FT_OCR = { readLabel: readLabel, rowsFromBoxes: rowsFromBoxes };
})();

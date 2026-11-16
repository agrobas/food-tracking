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
        }).then(function (w) { return w.setParameters({ tessedit_pageseg_mode: '4' }).then(function () { return w; }); });
      }).catch(function (e) { workerP = null; throw e; });
    }
    return workerP;
  }
  // grayscale, upscale small photos, black & white: helps on phone photos
  function prepare(file) {
    return new Promise(function (ok, fail) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var long = Math.max(img.width, img.height), sc = long < 1600 ? 1600 / long : Math.min(1, 2400 / long);
        var w = Math.round(img.width * sc), h = Math.round(img.height * sc);
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
        var d = ctx.getImageData(0, 0, w, h), px = d.data, sum = 0, n = px.length / 4;
        for (var i = 0; i < px.length; i += 4) { var g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; px[i] = g; sum += g; }
        var thr = (sum / n) * 0.8;
        for (var j = 0; j < px.length; j += 4) { var v = px[j] > thr ? 255 : 0; px[j] = px[j + 1] = px[j + 2] = v; }
        ctx.putImageData(d, 0, 0);
        // small thumbnail of the label for the review list
        var tc = document.createElement('canvas'), ts = 160 / Math.max(img.width, img.height);
        tc.width = Math.round(img.width * ts); tc.height = Math.round(img.height * ts);
        tc.getContext('2d').drawImage(img, 0, 0, tc.width, tc.height);
        URL.revokeObjectURL(url);
        ok({ canvas: cv, thumb: tc.toDataURL('image/jpeg', 0.7) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error('Could not open that image')); };
      img.src = url;
    });
  }
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
  function readLabel(file, onProgress) {
    var prep;
    return prepare(file).then(function (p) { prep = p; return getWorker(onProgress); })
      .then(function (w) { return w.recognize(prep.canvas, { rotateAuto: true }, { blocks: true, text: true }); })
      .then(function (r) {
        var text = rowsText(r.data.blocks) || r.data.text || '';
        var v = window.FT_CORE.parseLabel(text);
        v.text = text; v.thumb = prep.thumb;
        return v;
      });
  }
  window.FT_OCR = { readLabel: readLabel };
})();

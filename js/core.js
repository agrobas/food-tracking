/* Food tracking — core logic shared by the app and the tests:
   text normalisation, amounts, nutrition and the quick-entry parser (no AI). */
(function (root) {
  'use strict';

  var TYPE_GRAMS = { slice: 30, tbsp: 15, tsp: 5, cup: 240, glass: 250, handful: 30, can: 330, scoop: 30, serving: 150, bowl: 250, clove: 3, square: 10, fillet: 150, strip: 8, unit: 100 };

  // ---------- text ----------
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/½/g, ' 0.5 ').replace(/¼/g, ' 0.25 ').replace(/¾/g, ' 0.75 ')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/(\d),(\d)/g, '$1.$2')
      .replace(/(\d)([a-z])/g, '$1 $2')
      .replace(/[^a-z0-9./\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  var EQUIV = { my: 'mi', yoghurt: 'yogur', yogurt: 'yogur', yogurth: 'yogur', yoghourt: 'yogur', cafe: 'cafe', coffe: 'coffee' };
  function stem(w) {
    w = EQUIV[w] || w;
    if (w.length > 4 && /ces$/.test(w)) w = w.slice(0, -3) + 'z';
    else if (w.length > 4 && /ies$/.test(w)) w = w.slice(0, -3) + 'y';
    else if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) w = w.slice(0, -1);
    if (w.length > 4 && /e$/.test(w)) w = w.slice(0, -1);
    return EQUIV[w] || w;
  }
  function tokens(s) { return norm(s).split(' ').filter(Boolean); }

  // ---------- amounts & nutrition ----------
  function shortName(food) { return food.name.split(',')[0].trim().toLowerCase(); }
  function singular(w) {
    if (/(us|ss)$/.test(w)) return w;
    if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (/oes$/.test(w)) return w.slice(0, -2);
    if (/s$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function fmtNum(n, d) {
    if (n == null || isNaN(n)) return '';
    var p = Math.pow(10, d == null ? 1 : d);
    var r = Math.round(n * p) / p;
    return String(r);
  }
  function fmtQty(q) {
    var whole = Math.floor(q + 1e-9), frac = q - whole;
    var map = [[0.25, '¼'], [0.5, '½'], [0.75, '¾'], [1 / 3, '⅓'], [2 / 3, '⅔']];
    for (var i = 0; i < map.length; i++) {
      if (Math.abs(frac - map[i][0]) < 0.02) return (whole ? whole : '') + map[i][1];
    }
    return fmtNum(q, 2);
  }
  function plural(word, q) {
    if (q <= 1 || /^(tbsp|tsp)$/.test(word) || /\(/.test(word)) return word;
    if (/(ch|sh|x|ss)$/.test(word) || /(tomat|potat)o$/.test(word)) return word + 'es';
    if (/s$/.test(word)) return word;
    if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies';
    return word + 's';
  }
  function gramsOf(food, a) {
    if (!a) return null;
    if (a.mode === 'grams') return a.grams;
    if (a.mode === 'portion') { var p = food.portions && food.portions[a.pi]; return p ? p.g * a.qty : null; }
    if (a.mode === 'units') return food.unitG ? food.unitG * a.qty : null;
    return null;
  }
  function factor(food, a) {
    if (food.basis === 'unit') {
      if (a.mode === 'units') return a.qty;
      if (a.mode === 'grams' && food.unitG) return a.grams / food.unitG;
      if (a.mode === 'portion') { var p = food.portions && food.portions[a.pi]; return p && food.unitG ? (p.g * a.qty) / food.unitG : a.qty; }
      return 0;
    }
    var g = gramsOf(food, a);
    return (g || 0) / 100;
  }
  function nutrition(food, a) {
    var k = factor(food, a);
    return { kcal: (food.kcal || 0) * k, p: (food.p || 0) * k, c: (food.c || 0) * k, f: (food.f || 0) * k };
  }
  function unitWord(food) { return food.liquid ? 'ml' : 'g'; }
  function amountLabel(food, a) {
    var g = gramsOf(food, a);
    var gTxt = g != null ? fmtNum(g, 0) + ' ' + unitWord(food) : '';
    if (a.mode === 'grams') return gTxt;
    if (a.mode === 'units') {
      var un = food.unitName || 'unit';
      return fmtQty(a.qty) + ' ' + plural(un, a.qty) + (gTxt ? ' · ' + gTxt : '');
    }
    var p = food.portions[a.pi];
    var word = p.type === 'unit' ? singular(shortName(food)) : (p.label || p.type);
    return fmtQty(a.qty) + ' ' + plural(word, a.qty) + (gTxt ? ' · ' + gTxt : '');
  }
  function portionLabel(food, p) {
    if (p.type === 'unit') return '1 ' + singular(shortName(food)) + (p.label ? ' (' + p.label + ')' : '');
    return '1 ' + (p.label || p.type);
  }
  function defaultAmount(food) {
    if (food.basis === 'unit') return { mode: 'units', qty: 1 };
    if (food.portions && food.portions.length) return { mode: 'portion', pi: 0, qty: 1 };
    return { mode: 'grams', grams: 100 };
  }

  // ---------- parser ----------
  var NUM_WORDS = {
    un: 1, una: 1, uno: 1, a: 1, an: 1, one: 1,
    dos: 2, two: 2, tres: 3, three: 3, cuatro: 4, four: 4, cinco: 5, five: 5, seis: 6, six: 6,
    siete: 7, seven: 7, ocho: 8, eight: 8, nueve: 9, nine: 9, diez: 10, ten: 10,
    medio: 0.5, media: 0.5, half: 0.5, cuarto: 0.25, quarter: 0.25, tercio: 1 / 3, third: 1 / 3,
    par: 2, couple: 2, doble: 2, double: 2
  };
  var GRAM_UNITS = { g: 1, gr: 1, grs: 1, gramo: 1, gramos: 1, gram: 1, grams: 1, kg: 1000, kilo: 1000, kilos: 1000, ml: 1, mililitros: 1, cl: 10, l: 1000, litro: 1000, litros: 1000 };
  var TYPE_WORDS = {
    unidad: 'unit', unidades: 'unit', unit: 'unit', units: 'unit', pieza: 'unit', piezas: 'unit', piece: 'unit', pieces: 'unit',
    rebanada: 'slice', rebanadas: 'slice', loncha: 'slice', lonchas: 'slice', rodaja: 'slice', rodajas: 'slice', tajada: 'slice', tajadas: 'slice', trozo: 'slice', trozos: 'slice', slice: 'slice', slices: 'slice',
    cucharada: 'tbsp', cucharadas: 'tbsp', cda: 'tbsp', tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
    cucharadita: 'tsp', cucharaditas: 'tsp', cdta: 'tsp', tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
    taza: 'cup', tazas: 'cup', cup: 'cup', cups: 'cup',
    vaso: 'glass', vasos: 'glass', copa: 'glass', copas: 'glass', glass: 'glass', glasses: 'glass',
    punado: 'handful', punados: 'handful', handful: 'handful', handfuls: 'handful',
    lata: 'can', latas: 'can', can: 'can', cans: 'can',
    cacito: 'scoop', cacitos: 'scoop', bola: 'scoop', bolas: 'scoop', scoop: 'scoop', scoops: 'scoop', medida: 'scoop', medidas: 'scoop',
    racion: 'serving', raciones: 'serving', plato: 'serving', platos: 'serving', serving: 'serving', servings: 'serving', porcion: 'serving', porciones: 'serving', portion: 'serving',
    bol: 'bowl', bols: 'bowl', bowl: 'bowl', bowls: 'bowl', cuenco: 'bowl',
    diente: 'clove', dientes: 'clove', clove: 'clove', cloves: 'clove',
    onza: 'square', onzas: 'square', square: 'square', squares: 'square',
    filete: 'fillet', filetes: 'fillet', fillet: 'fillet', fillets: 'fillet',
    tira: 'strip', tiras: 'strip', strip: 'strip', strips: 'strip'
  };
  var SOFT = { grande: 1, grandes: 1, pequeno: 1, pequena: 1, pequenos: 1, pequenas: 1, mediano: 1, mediana: 1, big: 1, small: 1, large: 1, medium: 1, maduro: 1, madura: 1, fresco: 1, fresca: 1, frio: 1, fria: 1, caliente: 1, hot: 1, cold: 1, fresh: 1, entero: 1, entera: 1, whole: 1, mas: 1, more: 1, otro: 1, otra: 1, another: 1 };
  var VAGUE = { poco: 1, poquito: 1, bit: 1, little: 1, algo: 1, something: 1, bastante: 1, mucho: 1, mucha: 1, lot: 1, lots: 1 };
  var FILLER = { de: 1, del: 1, of: 1, the: 1, el: 1, la: 1, los: 1, las: 1, some: 1, unos: 1, unas: 1, about: 1, aprox: 1, aproximadamente: 1, como: 1, he: 1, comido: 1, tomado: 1, bebido: 1, i: 1, had: 1, ate: 1, drank: 1, con: 1, with: 1, para: 1 };

  function buildIndex(foods) {
    var idx = [];
    foods.forEach(function (food) {
      var names = [food.name].concat(food.es ? String(food.es).split('/') : []);
      names.forEach(function (n) {
        var t = tokens(n).map(stem);
        if (t.length) idx.push({ food: food, stems: t });
      });
    });
    return idx;
  }

  function splitSegments(text) {
    var t = String(text || '').replace(/(\d),(\d)/g, '$1.$2');
    return t.split(/\s*(?:,|;|\n|\+|&|\.\s|\s+y\s+|\s+e\s+|\s+and\s+|\s+plus\s+)\s*/i)
      .map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function matchFood(segStems, idx) {
    var best = null;
    idx.forEach(function (e) {
      var n = e.stems.length;
      for (var i = 0; i + n <= segStems.length; i++) {
        var ok = true;
        for (var j = 0; j < n; j++) if (segStems[i + j] !== e.stems[j]) { ok = false; break; }
        if (!ok) continue;
        var score = n * 10 + (e.food.type === 'custom' ? 5 : 0) + (n === segStems.length ? 1 : 0);
        if (!best || score > best.score) best = { food: e.food, start: i, len: n, score: score };
      }
    });
    return best;
  }

  function parseSegment(seg, idx) {
    var raw = tokens(seg);
    var stems = raw.map(stem);
    var m = matchFood(stems, idx);
    if (!m) return { text: seg, food: null };
    var food = m.food;
    var rest = raw.filter(function (_, i) { return i < m.start || i >= m.start + m.len; });

    var qty = null, gramsVal = null, type = null, unsure = false, labelPi = null, labels = {};
    (food.portions || []).forEach(function (p, k) {
      if (p.label && p.type !== 'unit') tokens(p.label).forEach(function (t) { var s2 = stem(t); if (labels[s2] == null && !FILLER[t]) labels[s2] = k; });
    });
    for (var i = 0; i < rest.length; i++) {
      var w = rest[i];
      if (labels[stem(w)] != null && !/^\d/.test(w)) { labelPi = labels[stem(w)]; continue; }
      if (FILLER[w] || SOFT[w]) continue;
      if (VAGUE[w]) { unsure = true; continue; }
      var num = null;
      if (/^\d+(\.\d+)?$/.test(w)) num = parseFloat(w);
      else if (/^\d+\/\d+$/.test(w)) { var fr = w.split('/'); num = parseFloat(fr[0]) / parseFloat(fr[1]); }
      if (num != null) {
        var next = rest[i + 1];
        if (next && GRAM_UNITS[next] != null) { gramsVal = (gramsVal || 0) + num * GRAM_UNITS[next]; i++; continue; }
        if (qty == null) qty = num; else if (num < 1) qty += num;
        continue;
      }
      if (NUM_WORDS[w] != null) {
        var v = NUM_WORDS[w];
        if ((w === 'medio' || w === 'media' || w === 'half') && qty != null && qty >= 1) qty += 0.5;
        else if ((w === 'cuarto' || w === 'quarter' || w === 'tercio' || w === 'third') && qty === 1) qty = v;
        else if (qty == null) qty = v;
        else if (v < 1) qty = qty * v;
        continue;
      }
      if (TYPE_WORDS[w]) { type = TYPE_WORDS[w]; continue; }
      if (GRAM_UNITS[w] != null) continue;
      unsure = true; // a word we don't understand (e.g. "bocadillo"): ask the user to check
    }

    var amount, assumed = false;
    if (labelPi != null && gramsVal == null) {
      amount = { mode: 'portion', pi: labelPi, qty: qty || 1 };
    } else if (gramsVal != null) {
      if (food.basis === 'unit') {
        if (food.unitG) amount = { mode: 'grams', grams: gramsVal };
        else { amount = { mode: 'units', qty: qty || 1 }; assumed = true; }
      } else amount = { mode: 'grams', grams: gramsVal };
    } else if (food.basis === 'unit') {
      amount = { mode: 'units', qty: qty || 1 };
    } else if (type) {
      var pi = -1;
      (food.portions || []).forEach(function (p, k) { if (pi < 0 && p.type === type) pi = k; });
      if (pi >= 0) amount = { mode: 'portion', pi: pi, qty: qty || 1 };
      else { amount = { mode: 'grams', grams: (qty || 1) * (TYPE_GRAMS[type] || 100) }; assumed = true; }
    } else if (food.portions && food.portions.length) {
      amount = { mode: 'portion', pi: 0, qty: qty || 1 };
    } else {
      amount = { mode: 'grams', grams: (qty || 1) * 100 };
      assumed = true;
    }
    return { text: seg, food: food, amount: amount, assumed: assumed, unsure: unsure };
  }

  function parse(text, foods) {
    var idx = buildIndex(foods);
    var segs = splitSegments(text);
    var out = [];
    segs.forEach(function (s) {
      var km = norm(s).match(/^(.*?)\s*~?\s*(\d+(?:\.\d+)?)\s*(kcal|calorias|calories|cal)\b\s*(.*)$/);
      if (km) {
        var nm = (km[1] + ' ' + km[4]).replace(/\b(de|aprox|aproximadamente|unas|unos|about|around)\b/g, ' ').replace(/\s+/g, ' ').trim();
        out.push({ text: s, food: null, estimate: { kcal: parseFloat(km[2]), name: nm ? nm.charAt(0).toUpperCase() + nm.slice(1) : 'Unknown' } });
        return;
      }
      var r = parseSegment(s, idx);
      // "un plátano y medio": a lone fraction joins the previous item
      if (!r.food && out.length && /^(y\s+)?(medio|media|half|1\/2|0\.5)$/i.test(norm(s)) && out[out.length - 1].food) {
        var prev = out[out.length - 1];
        if (prev.amount.mode === 'portion' || prev.amount.mode === 'units') { prev.amount.qty += 0.5; return; }
      }
      out.push(r);
    });
    return out;
  }

  // ---------- nutrition labels (OCR text) ----------
  // OCR often reads the unit "g" as a 9 ("3,0 g" -> "3,09"): undo that when no "g" follows
  function labelNum(seg) {
    var m = String(seg).match(/<?\s*(\d+(?:[.,]\d+)?)(\s*g\b|g)?/);
    if (!m) return null;
    var raw = m[1], hasG = !!m[2];
    if (!hasG && /[.,]\d{2,}$/.test(raw) && /9$/.test(raw)) raw = raw.slice(0, -1);
    var v = parseFloat(raw.replace(',', '.'));
    if (!hasG && v > 100 && /9$/.test(raw) && raw.indexOf(',') < 0 && raw.indexOf('.') < 0) v = parseFloat(raw.slice(0, -1));
    return isNaN(v) ? null : v;
  }
  function parseLabel(text) {
    var t = String(text || '').replace(/\bO(?=[.,]\d)/g, '0');
    var lines = t.split(/\n+/).map(function (l) { return l.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }).filter(Boolean);
    var flat = lines.join('\n').replace(/(\d)\s*,\s*(\d)/g, '$1.$2');
    var res = { kcal: null, p: null, c: null, f: null };
    var km = flat.match(/(\d+(?:\.\d+)?)[^\d\n]{0,12}?k\s*c\s*a\s*l/);
    var kj = flat.match(/(\d+(?:\.\d+)?)\s*k\s*[j)]/);
    var fromKj = kj ? parseFloat(kj[1]) / 4.184 : null;
    if (km) res.kcal = parseFloat(km[1]);
    if (res.kcal != null && fromKj != null && Math.abs(res.kcal - fromKj) > fromKj * 0.15) {
      var cut = Math.floor(res.kcal / 10); // an extra digit read from the next column
      res.kcal = Math.abs(cut - fromKj) <= fromKj * 0.15 ? cut : Math.round(fromKj);
    }
    if (res.kcal == null && fromKj != null) res.kcal = Math.round(fromKj);
    var KEYS = /(grasa|lipido|\bfat\b|hidratos|carbohidrat|carbohydrat|glucido|protein|azucar|sugar|saturad|saturat|fibra|fibre|fiber|sal\b|salt|sodio|sodium|energ)/;
    function numericOnly(l) { return !!l && /\d/.test(l) && !/[a-z]{3,}/.test(l.replace(/kcal|kj|\bg\b/g, '')); }
    // a tilted photo can put a row's numbers just above or below its name: find which, for the whole label
    var up = 0, down = 0;
    lines.forEach(function (l, i) {
      if (!KEYS.test(l) || /\d/.test(l)) return;
      var a = numericOnly(lines[i - 1]), b = numericOnly(lines[i + 1]);
      if (a && !b) up++; if (b && !a) down++;
    });
    var order = up > down ? [-1, 1] : [1, -1];
    function grab(re, not) {
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i]; if (!re.test(l) || (not && not.test(l))) continue;
        var v = labelNum(l.replace(re, ''));
        for (var o = 0; o < 2 && v == null; o++) if (numericOnly(lines[i + order[o]])) v = labelNum(lines[i + order[o]]);
        if (v != null) return v;
      }
      return null;
    }
    res.f = grab(/^.*?(grasas?|materia grasa|lipidos|\bfa?t)\b[^0-9<]*/, /saturad|satur|monoinsat|poliinsat|trans/);
    res.c = grab(/^.*?(hidratos de carbono|carbohidratos|carbohydrates?|glucidos)\b[^0-9<]*/, /azucar|sugar/);
    res.p = grab(/^.*?(proteinas?|proteins?)\b[^0-9<]*/);
    ['p', 'c', 'f'].forEach(function (key) {
      if (res[key] != null && res[key] > 100) res[key] = null;
      // "3,0 g" read as "30g": the macro alone can't have more calories than the whole food
      var kpg = key === 'f' ? 9 : 4;
      if (res[key] != null && res.kcal && res[key] * kpg > res.kcal * 1.1 && (res[key] / 10) * kpg <= res.kcal * 1.1) res[key] = res[key] / 10;
    });
    res.found = ['kcal', 'p', 'c', 'f'].filter(function (key) { return res[key] != null; }).length;
    // do the numbers add up? (4 kcal/g protein & carbs, 9 kcal/g fat)
    if (res.found === 4 && res.kcal) { var est = 4 * res.p + 4 * res.c + 9 * res.f; res.consistent = Math.abs(est - res.kcal) <= Math.max(25, res.kcal * 0.25); }
    return res;
  }
  // "~800 kcal", "Calories: 750–850", a ChatGPT answer with a Total line...
  function parseEstimate(text) {
    var lines = String(text || '').split(/\n+/).map(function (l) {
      return l.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/(\d)[.,](\d{3})\b/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
    });
    function val(l, re) {
      var m = l.match(re); if (!m) return null;
      var a = parseFloat(m[1]), b = m[2] ? parseFloat(m[2]) : null;
      return b != null && b > a ? (a + b) / 2 : a;
    }
    var R = '(\\d+(?:\\.\\d+)?)(?:\\s*(?:-|–|—|a|to)\\s*(\\d+(?:\\.\\d+)?))?';
    var reK = [new RegExp('~?\\s*' + R + '\\s*(?:kcal|calorias|calories|cal)\\b'), new RegExp('(?:kcal|calorias|calories|energia|energy)[^0-9]{0,20}' + R)];
    var reP = new RegExp('(?:proteinas?|proteins?)[^0-9]{0,20}' + R), reP2 = new RegExp(R + '\\s*g\\s*(?:de\\s*)?(?:proteinas?|proteins?)');
    var reC = new RegExp('(?:hidratos(?: de carbono)?|carbohidratos|carbs|carbohydrates?)[^0-9]{0,20}' + R), reC2 = new RegExp(R + '\\s*g\\s*(?:de\\s*)?(?:hidratos|carbohidratos|carbs)');
    var reF = new RegExp('(?:grasas?|fat)[^0-9]{0,20}' + R), reF2 = new RegExp(R + '\\s*g\\s*(?:de\\s*)?(?:grasas?|fat)');
    function pick(res1, res2) {
      var total = null, all = [];
      lines.forEach(function (l) {
        var v = null;
        res1.concat(res2 || []).forEach(function (re) { if (v == null) v = val(l, re); });
        if (v == null) return;
        all.push(v);
        if (/total|en total|aprox|estimad|overall/.test(l)) total = v;
      });
      if (total != null) return total;
      if (!all.length) return null;
      return Math.max.apply(null, all);
    }
    var out = { kcal: pick(reK), p: pick([reP], [reP2]), c: pick([reC], [reC2]), f: pick([reF], [reF2]) };
    return out;
  }

  // ---------- search ----------
  function search(q, foods) {
    var qt = tokens(q).map(stem);
    if (!qt.length) return [];
    var res = [];
    foods.forEach(function (food) {
      var hay = tokens(food.name + ' ' + (food.es || '').replace(/\//g, ' ')).map(stem);
      var score = 0, all = true;
      qt.forEach(function (t) {
        var hit = hay.some(function (h) { return h === t; }) ? 3 : hay.some(function (h) { return h.indexOf(t) === 0; }) ? 2 : hay.some(function (h) { return h.indexOf(t) >= 0; }) ? 1 : 0;
        if (!hit) all = false; score += hit;
      });
      if (!all) return;
      var qn = norm(q), bonus = 0;
      [food.name].concat((food.es || '').split('/')).forEach(function (n) {
        var nn = norm(n);
        if (nn === qn) bonus = Math.max(bonus, 6);
        else if (nn.indexOf(qn) === 0) bonus = Math.max(bonus, 3);
      });
      res.push({ food: food, score: score + bonus + (food.type === 'custom' ? 2 : 0) - food.name.length / 100 });
    });
    res.sort(function (a, b) { return b.score - a.score; });
    return res.map(function (r) { return r.food; });
  }

  var api = {
    norm: norm, stem: stem, tokens: tokens, fmtQty: fmtQty, fmtNum: fmtNum, gramsOf: gramsOf,
    nutrition: nutrition, amountLabel: amountLabel, portionLabel: portionLabel, defaultAmount: defaultAmount,
    parse: parse, search: search, parseLabel: parseLabel, parseEstimate: parseEstimate, shortName: shortName, unitWord: unitWord
  };
  root.FT_CORE = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

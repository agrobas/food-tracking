/* Food tracking — app (vanilla JS, no build step). Data lives on this device (localStorage). */
(function () {
  'use strict';
  var C = window.FT_CORE;
  var BUILTIN = window.FT_FOODS;
  var KEY = 'ft-data-v1';
  var VERSION = '1.4.1';

  var MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['snack', 'Afternoon snack'], ['dinner', 'Dinner'], ['extra', 'Extra']];
  var MEAL_NAME = {}; MEALS.forEach(function (m) { MEAL_NAME[m[0]] = m[1]; });

  // ---------- icons ----------
  function svg(d, size, sw, extra) {
    var fill = /fill=/.test(extra || '') ? '' : ' fill="none"';
    return '<svg aria-hidden="true" width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24"' + fill + ' stroke="currentColor" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</svg>';
  }
  var I = {
    left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    leaf: '<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
    plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
    down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>',
    restore: '<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/>', scan: '<path d="M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3"/><path d="M8 10h8M8 14h5"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.01"/>', bowl: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 7c1-1.5 5-1.5 6 0"/>'
  };

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ds(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pd(s) { var a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function today() { return ds(new Date()); }
  function addDays(s, n) { var d = pd(s); d.setDate(d.getDate() + n); return ds(d); }
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function longDate(s) { var d = pd(s); return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function dayLabel(s) { var t = today(); if (s === t) return 'Today'; if (s === addDays(t, -1)) return 'Yesterday'; if (s === addDays(t, 1)) return 'Tomorrow'; return DAYS[pd(s).getDay()]; }
  function k(n) { return Math.round(n).toLocaleString('en-US'); }
  function g1(n) { return C.fmtNum(n, n >= 10 ? 0 : 1); }
  function defaultMeal() { var h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner'; }
  function num(v) { if (v == null || v === '') return null; var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }

  // ---------- data ----------
  var data;
  function blank() { return { version: 1, goals: { kcal: 1800, p: 110, c: 200, f: 60 }, foods: {}, hidden: {}, favs: {}, entries: [], meals: [] }; }
  function load() {
    try { data = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { data = blank(); }
    var b = blank(); Object.keys(b).forEach(function (key) { if (data[key] == null) data[key] = b[key]; });
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { toast('Could not save: storage is full. Remove some photos or back up.'); }
  }
  function allFoods() {
    var out = [];
    BUILTIN.forEach(function (f) { if (data.hidden[f.id]) return; out.push(data.foods[f.id] || f); });
    Object.keys(data.foods).forEach(function (id) { if (!/^std-/.test(id) || !BUILTIN.some(function (b) { return b.id === id; })) out.push(data.foods[id]); });
    return out;
  }
  function getFood(id) {
    if (id === 'unknown') return null;
    if (data.foods[id]) return data.foods[id];
    for (var i = 0; i < BUILTIN.length; i++) if (BUILTIN[i].id === id) return BUILTIN[i];
    return null;
  }
  function makeEntry(food, amount, date, meal) {
    var n = C.nutrition(food, amount);
    return { id: uid(), date: date, meal: meal, foodId: food.id, name: food.name, amount: amount, label: C.amountLabel(food, amount), kcal: n.kcal, p: n.p, c: n.c, f: n.f, t: Date.now() };
  }
  function makeItem(food, amount) {
    var n = C.nutrition(food, amount);
    return { foodId: food.id, name: food.name, amount: amount, label: C.amountLabel(food, amount), kcal: n.kcal, p: n.p, c: n.c, f: n.f };
  }
  function entriesOn(date) { return data.entries.filter(function (e) { return e.date === date; }); }
  function totals(list) { var t = { kcal: 0, p: 0, c: 0, f: 0 }; list.forEach(function (e) { t.kcal += e.kcal; t.p += e.p; t.c += e.c; t.f += e.f; }); return t; }
  function dayTotals() { var m = {}; data.entries.forEach(function (e) { m[e.date] = (m[e.date] || 0) + e.kcal; }); return m; }
  function recentFoods() {
    var seen = {}, out = [];
    data.entries.slice().sort(function (a, b) { return b.t - a.t; }).forEach(function (e) {
      if (seen[e.foodId] || out.length >= 8) return; seen[e.foodId] = 1;
      var f = getFood(e.foodId); if (f && !data.hidden[f.id]) out.push(f);
    });
    return out;
  }
  function perText(f) {
    if (f.basis === 'unit') return k(f.kcal) + ' kcal / ' + (f.unitName || 'unit');
    return k(f.kcal) + ' kcal / 100 ' + C.unitWord(f);
  }
  function thumb(f, cls) {
    if (f === 'unknown') return '<span class="thumb std">' + svg(I.question, 22, 1.6) + '</span>';
    if (f && f.photo) return '<span class="thumb photo ' + (cls || '') + '"><img alt="" src="' + f.photo + '"></span>';
    if (f && f.type === 'custom') return '<span class="thumb photo">' + svg(I.bowl, 22, 1.6) + '</span>';
    return '<span class="thumb std">' + svg(I.leaf, 20, 1.6) + '</span>';
  }

  function starBtn(f) {
    var on = !!data.favs[f.id];
    return '<button class="plus" data-act="fav-toggle" data-id="' + esc(f.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove ' : 'Add ') + esc(f.name) + (on ? ' from' : ' to') + ' favorites">' + svg(I.star, 20, 1.5, on ? ' fill="currentColor"' : '') + '</button>';
  }

  // ---------- UI plumbing ----------
  var app = document.getElementById('app');
  var memo = { quick: null, mealDraft: null, scroll: {} };
  function toast(msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  function back(fallback) { if (history.length > 1 && memo.navCount > 0) history.back(); else go(fallback || '#/log'); }
  function route() {
    var h = location.hash.replace(/^#/, '') || '/log';
    var qi = h.indexOf('?'); var path = qi >= 0 ? h.slice(0, qi) : h; var q = {};
    if (qi >= 0) h.slice(qi + 1).split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); q[decodeURIComponent(kv[0])] = decodeURIComponent(kv.slice(1).join('=') || ''); });
    return { path: path, q: q };
  }
  function qs(o) { var parts = []; Object.keys(o).forEach(function (key) { if (o[key] != null && o[key] !== '') parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(o[key])); }); return parts.length ? '?' + parts.join('&') : ''; }
  function tabs(active) {
    function t(href, icon, label, key) { return '<a href="' + href + '" class="' + (active === key ? 'on' : '') + '">' + svg(icon, 24, 1.7) + label + '</a>'; }
    return '<nav class="tabs" aria-label="Main">' + t('#/log', I.plate, 'Log', 'log') + t('#/foods', I.book, 'Foods', 'foods') + t('#/history', I.cal, 'History', 'history') + t('#/settings', I.sliders, 'Settings', 'settings') + '</nav>';
  }
  function header(title, backAct) {
    return '<header class="head"><button class="iconbtn back" data-act="back" data-fb="' + esc(backAct || '#/log') + '" aria-label="Back">' + svg(I.left) + '</button><h1 class="sub grow">' + esc(title) + '</h1></header>';
  }
  function mealPills(sel) {
    return '<div class="pills" role="radiogroup" aria-label="Meal">' + MEALS.map(function (m) {
      return '<button class="pill' + (m[0] === sel ? ' on' : '') + '" data-act="meal" data-v="' + m[0] + '" role="radio" aria-checked="' + (m[0] === sel) + '">' + m[1] + '</button>';
    }).join('') + '</div>';
  }
  function modal(html, onMount) {
    var root = document.getElementById('modal-root');
    root.innerHTML = '<div class="overlay" data-close="1"><div class="sheet" role="dialog" aria-modal="true">' + html + '</div></div>';
    var ov = root.firstChild;
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('[data-close-btn]')) closeModal(); });
    if (onMount) onMount(ov.firstChild);
  }
  function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
  function confirmBox(text, okLabel, cb) {
    modal('<h2>' + esc(text) + '</h2><button class="btn" data-ok>' + esc(okLabel) + '</button><button class="btn ghost" data-close-btn>Cancel</button>', function (el) {
      el.querySelector('[data-ok]').onclick = function () { closeModal(); cb(); };
    });
  }
  function promptBox(title, value, okLabel, cb) {
    modal('<h2>' + esc(title) + '</h2><input class="input" data-in value="' + esc(value || '') + '"><button class="btn" data-ok>' + esc(okLabel) + '</button><button class="btn ghost" data-close-btn>Cancel</button>', function (el) {
      var inp = el.querySelector('[data-in]'); setTimeout(function () { inp.focus(); }, 50);
      el.querySelector('[data-ok]').onclick = function () { var v = inp.value.trim(); if (!v) return; closeModal(); cb(v); };
    });
  }
  function chooseMeal(title, cb) {
    modal('<h2>' + esc(title) + '</h2>' + mealPills(defaultMeal()) + '<button class="btn" data-ok>Add</button><button class="btn ghost" data-close-btn>Cancel</button>', function (el) {
      var sel = defaultMeal();
      el.querySelectorAll('.pill').forEach(function (b) { b.onclick = function () { sel = b.dataset.v; el.querySelectorAll('.pill').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      el.querySelector('[data-ok]').onclick = function () { closeModal(); cb(sel); };
    });
  }

  // ---------- screens ----------
  var screens = {};
  var actions = {};
  var current = null;

  // LOG
  screens['/log'] = function (q) {
    var d = q.d || today();
    var list = entriesOn(d), tot = totals(list), G = data.goals;
    var left = G.kcal - tot.kcal, pct = G.kcal ? Math.min(100, tot.kcal / G.kcal * 100) : 0;
    function mac(lbl, v, goal) { return '<div><div class="muted small">' + lbl + '</div><div style="font-size:15px;font-weight:700">' + g1(v) + ' <span class="muted" style="font-weight:400">/ ' + k(goal) + ' g</span></div><div class="bar"><div style="width:' + (goal ? Math.min(100, v / goal * 100) : 0) + '%"></div></div></div>'; }
    var h = '<div class="screen tabbed">' +
      '<header style="display:flex;flex-direction:column;gap:6px"><h1>Food tracking</h1>' +
      '<div class="datebar"><button class="iconbtn" data-act="day" data-n="-1" aria-label="Previous day">' + svg(I.left) + '</button>' +
      '<label class="datebtn"><div style="font-size:17px;font-weight:700">' + dayLabel(d) + '</div><div class="muted" style="font-size:14px">' + longDate(d) + '</div><input type="date" data-in="jump" value="' + d + '" aria-label="Choose a date"></label>' +
      '<button class="iconbtn" data-act="day" data-n="1" aria-label="Next day">' + svg(I.right) + '</button></div></header>' +
      '<section class="card" style="padding:18px;display:flex;flex-direction:column;gap:14px">' +
      '<div class="between" style="align-items:flex-end"><div><div class="muted" style="font-size:14px">Eaten</div><div style="font-size:36px;font-weight:700;line-height:1.1">' + k(tot.kcal) + ' <span style="font-size:16px;font-weight:400">kcal</span></div></div>' +
      '<div style="text-align:right"><div class="muted" style="font-size:14px">Goal ' + k(G.kcal) + ' kcal</div><div style="font-size:18px;font-weight:700">' + (left >= 0 ? k(left) + ' left' : k(-left) + ' over') + '</div></div></div>' +
      '<div class="bar big' + (left < 0 ? ' over' : '') + '"><div style="width:' + pct + '%"></div></div>' +
      '<div class="macros">' + mac('Protein', tot.p, G.p) + mac('Carbs', tot.c, G.c) + mac('Fat', tot.f, G.f) + '</div></section>' +
      '<a href="#/quick' + qs({ d: d }) + '" class="card" style="display:flex;align-items:center;gap:10px;padding:6px 6px 6px 16px;min-height:52px"><span class="muted grow" style="font-size:16px">Type or dictate what you ate…</span><span aria-hidden="true" style="width:40px;height:40px;border-radius:12px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center">' + svg(I.mic, 20) + '</span></a>';
    MEALS.forEach(function (m) {
      var es = list.filter(function (e) { return e.meal === m[0]; }), mt = totals(es);
      h += '<section class="card clip"><div class="mealhead"><h2>' + m[1] + '</h2><span style="font-size:15px;font-weight:700"' + (es.length ? '' : ' class="muted"') + '>' + k(mt.kcal) + ' kcal</span></div>';
      if (es.length) h += '<div style="border-top:1px solid var(--line2)">' + es.map(function (e) {
        var f = getFood(e.foodId);
        return '<button class="item" data-act="edit-entry" data-id="' + e.id + '">' + thumb(e.foodId === 'unknown' ? 'unknown' : f) + '<span class="grow"><span class="nm">' + esc(e.name) + '</span><span class="sb">' + esc(e.label) + (f && f.type === 'custom' ? ' · Custom' : '') + '</span></span><span style="font-size:15px">' + k(e.kcal) + '</span></button>';
      }).join('') + '</div>';
      h += '<div class="mealfoot"><a class="linkbtn" href="#/add' + qs({ d: d, m: m[0] }) + '">' + svg(I.plus, 18) + 'Add food</a>' +
        (es.length ? '<button class="linkbtn light" data-act="save-meal" data-m="' + m[0] + '">Save as my meal</button>' : '') + '</div></section>';
    });
    h += '</div>' + tabs('log');
    return h;
  };
  actions.day = function (el) { var r = route(); go('#/log' + qs({ d: addDays(r.q.d || today(), +el.dataset.n) })); };
  actions['edit-entry'] = function (el) {
    var e = data.entries.filter(function (x) { return x.id === el.dataset.id; })[0];
    go((e && e.foodId === 'unknown' ? '#/unknown' : '#/amount') + qs({ entry: el.dataset.id }));
  };
  actions['save-meal'] = function (el) {
    var r = route(), d = r.q.d || today();
    var es = entriesOn(d).filter(function (e) { return e.meal === el.dataset.m; });
    promptBox('Name this meal', MEAL_NAME[el.dataset.m], 'Save to My meals', function (name) {
      data.meals.push({ id: uid(), name: name, items: es.map(function (e) { return { foodId: e.foodId, name: e.name, amount: e.amount, label: e.label, kcal: e.kcal, p: e.p, c: e.c, f: e.f }; }) });
      save(); toast('Saved to My meals');
    });
  };

  // ADD
  screens['/add'] = function (q) {
    var ctx = q.ctx || 'log', m = q.m || defaultMeal();
    var title = ctx === 'meal' ? 'Add to my meal' : ctx === 'quick' ? 'Choose food' : 'Add to ' + MEAL_NAME[m];
    return '<div class="screen">' + header(title, ctx === 'meal' ? '#/meal' : ctx === 'quick' ? '#/quick' + qs({ d: q.d }) : '#/log' + qs({ d: q.d })) +
      '<div class="card search">' + svg(I.search, 20) + '<input data-in="search" type="search" placeholder="Search standard and custom foods" aria-label="Search foods" value="' + esc(q.q || '') + '" autocomplete="off"></div>' +
      (ctx === 'log' ? '<a class="card item" style="border-top:1px solid var(--line)" href="#/unknown' + qs({ d: q.d, m: m }) + '">' + thumb('unknown') + '<span class="grow"><span class="nm">Unknown / estimate</span><span class="sb">Restaurant or anything without values, e.g. ~800 kcal</span></span>' + svg(I.right, 18) + '</a>' : '') +
      '<div data-results></div></div>';
  };
  function addResults(q) {
    var term = (document.querySelector('[data-in="search"]') || {}).value || '';
    var ctx = q.ctx || 'log';
    function row(f) {
      return '<div class="item" style="padding-right:6px">' + thumb(f) + '<button class="grow" style="border:none;background:transparent;text-align:left;padding:0;cursor:pointer" data-act="pick" data-id="' + esc(f.id) + '"><span class="nm">' + esc(f.name) + '</span><span class="sb">' + (f.type === 'custom' ? 'Custom' : 'Standard') + ' · ' + perText(f) + '</span></button>' +
        starBtn(f) + '<button class="plus" data-act="quickadd" data-id="' + esc(f.id) + '" aria-label="Add ' + esc(f.name) + '">' + svg(I.plus, 20) + '</button></div>';
    }
    var h = '';
    if (term.trim()) {
      var res = C.search(term, allFoods()).slice(0, 40);
      h += res.length ? '<section class="card clip">' + res.map(row).join('') + '</section>' : '<div class="empty">No foods found.</div>';
      h += '<button class="dashed" data-act="create-from-search">' + svg(I.plus, 18) + 'Create “' + esc(term.trim()) + '” as custom food</button>';
    } else {
      var favs = allFoods().filter(function (f) { return data.favs[f.id]; });
      h += '<h2 class="sec">Favorites</h2>' + (favs.length ? '<section class="card clip">' + favs.map(row).join('') + '</section>' : '<div class="empty card">Tap the star next to a food to add it here.</div>');
      if (ctx === 'log') {
        h += '<h2 class="sec">My meals</h2>' + (data.meals.length ? '<section class="card clip">' + data.meals.map(function (ml) {
          var t = totals(ml.items);
          return '<div class="item" style="padding-right:6px">' + (ml.photo ? '<span class="thumb photo"><img alt="" src="' + ml.photo + '"></span>' : '') + '<button class="grow" style="border:none;background:transparent;text-align:left;padding:0;cursor:pointer" data-act="add-mymeal" data-id="' + ml.id + '"><span class="nm">' + esc(ml.name) + '</span><span class="sb">' + esc(ml.items.map(function (i) { return i.name; }).join(', ')) + ' · ' + k(t.kcal) + ' kcal</span></button><button class="plus" data-act="add-mymeal" data-id="' + ml.id + '" aria-label="Add ' + esc(ml.name) + '">' + svg(I.plus, 20) + '</button></div>';
        }).join('') + '</section>' : '<div class="empty card">Use “Save as my meal” on the Log screen, or create one in Foods.</div>');
      }
      var rec = recentFoods();
      if (rec.length) h += '<h2 class="sec">Recent</h2><section class="card clip">' + rec.map(row).join('') + '</section>';
    }
    var box = document.querySelector('[data-results]'); if (box) box.innerHTML = h;
  }
  screens['/add'].mount = function (q) { addResults(q); };
  function amountParams(id) { var q = route().q; return qs({ food: id, d: q.d, m: q.m, ctx: q.ctx, seg: q.seg }); }
  actions['fav-toggle'] = function (el) {
    var id = el.dataset.id, on = !data.favs[id];
    if (on) data.favs[id] = true; else delete data.favs[id];
    save(); toast(on ? 'Added to favorites' : 'Removed from favorites');
    if (current === '/add') addResults(route().q); else if (current === '/foods') renderFoodList();
  };
  actions.pick = function (el) { go('#/amount' + amountParams(el.dataset.id)); };
  actions.quickadd = function (el) {
    var q = route().q, f = getFood(el.dataset.id); if (!f) return;
    commitAmount(f, C.defaultAmount(f), q, q.m || defaultMeal());
  };
  actions['create-from-search'] = function () {
    var term = document.querySelector('[data-in="search"]').value.trim();
    go('#/food/new' + qs({ type: 'custom', name: term }));
  };
  actions['add-mymeal'] = function (el) {
    var q = route().q, ml = data.meals.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!ml) return;
    addMyMeal(ml, q.d || today(), q.m || defaultMeal());
    go('#/log' + qs({ d: q.d }));
  };
  function addMyMeal(ml, d, meal) {
    ml.items.forEach(function (it) {
      var f = getFood(it.foodId);
      var e = f ? makeEntry(f, it.amount, d, meal) : { id: uid(), date: d, meal: meal, foodId: it.foodId, name: it.name, amount: it.amount, label: it.label, kcal: it.kcal, p: it.p, c: it.c, f: it.f, t: Date.now() };
      data.entries.push(e);
    });
    save(); toast(ml.name + ' added to ' + MEAL_NAME[meal]);
  }

  // AMOUNT
  var amt = null; // working state for the amount screen
  function commitAmount(food, amount, q, meal) {
    var ctx = q.ctx || 'log';
    if (ctx === 'meal') {
      if (!memo.mealDraft) memo.mealDraft = { id: null, name: '', items: [] };
      memo.mealDraft.items.push(makeItem(food, amount));
      go('#/meal'); return;
    }
    if (ctx === 'quick') {
      if (!memo.quick) memo.quick = { text: '', removed: {}, extra: [], meal: meal };
      memo.quick.extra.push({ foodId: food.id, amount: amount });
      if (q.seg != null && q.seg !== '') memo.quick.removed[q.seg] = true;
      go('#/quick' + qs({ d: q.d })); return;
    }
    var d = q.d || today();
    data.entries.push(makeEntry(food, amount, d, meal)); save();
    toast(food.name + ' added to ' + MEAL_NAME[meal]);
    go('#/log' + qs({ d: d }));
  }
  screens['/amount'] = function (q) {
    var entry = null, food;
    if (q.entry) { entry = data.entries.filter(function (e) { return e.id === q.entry; })[0]; if (!entry) return notFound(); food = getFood(entry.foodId); if (!food) return missingFood(entry); }
    else food = getFood(q.food);
    if (!food) return notFound();
    if (!amt || amt.key !== location.hash) {
      var a = entry ? JSON.parse(JSON.stringify(entry.amount)) : C.defaultAmount(food);
      amt = { key: location.hash, food: food, a: a, meal: entry ? entry.meal : (q.m || defaultMeal()), entry: entry };
    }
    return renderAmount(q);
  };
  function canPortion(f) { return f.basis === 'unit' || (f.portions && f.portions.length); }
  function canGrams(f) { return f.basis !== 'unit' || !!f.unitG; }
  function renderAmount(q) {
    var f = amt.food, a = amt.a, ctx = q.ctx || 'log';
    var n = C.nutrition(f, a);
    var per = f.basis === 'unit'
      ? 'Per ' + (f.unitName || 'unit') + (f.unitG ? ' (' + f.unitG + ' g)' : '') + ': ' + k(f.kcal) + ' kcal · P ' + g1(f.p) + ' g · C ' + g1(f.c) + ' g · F ' + g1(f.f) + ' g'
      : 'Per 100 ' + C.unitWord(f) + ': ' + k(f.kcal) + ' kcal · P ' + g1(f.p) + ' g · C ' + g1(f.c) + ' g · F ' + g1(f.f) + ' g';
    var fav = !!data.favs[f.id];
    var h = '<div class="screen">' +
      '<header class="head"><button class="iconbtn back" data-act="back" aria-label="Back">' + svg(I.left) + '</button><h1 class="sub grow">' + esc(f.name) + '</h1>' +
      '<button class="iconbtn" data-act="fav" aria-label="' + (fav ? 'Remove from favorites' : 'Add to favorites') + '" aria-pressed="' + fav + '">' + svg(I.star, 22, 1.5, fav ? ' fill="currentColor"' : '') + '</button></header>';
    if (f.photo) h += '<div class="row"><span class="photo-edit has" style="width:96px;height:96px"><img alt="" src="' + f.photo + '"></span><div><div class="sec" style="margin:0">' + (f.type === 'custom' ? 'Custom' : 'Standard') + '</div><div style="font-size:15px">' + esc(per) + '</div></div></div>';
    else h += '<div class="muted" style="font-size:14px;margin-top:-8px">' + (f.type === 'custom' ? 'Custom' : 'Standard') + ' · ' + esc(per) + '</div>';
    if (canPortion(f) && canGrams(f)) {
      var isG = a.mode === 'grams';
      h += '<div class="seg"><button class="' + (!isG ? 'on' : '') + '" data-act="mode" data-v="portion">Portion</button><button class="' + (isG ? 'on' : '') + '" data-act="mode" data-v="grams">' + (f.liquid ? 'Millilitres' : 'Grams') + '</button></div>';
    }
    if (a.mode === 'grams') {
      h += '<div class="field"><label for="grams">Amount in ' + (f.liquid ? 'millilitres' : 'grams') + '</label><div class="card row" style="padding:0 16px;min-height:56px"><input id="grams" data-in="grams" inputmode="decimal" value="' + C.fmtNum(a.grams, 1) + '" style="flex:1;border:none;outline:none;font-size:24px;font-weight:700;background:transparent;min-width:0"><span class="muted" style="font-size:17px">' + C.unitWord(f) + '</span></div></div>';
    } else {
      if (a.mode === 'portion') {
        h += '<section class="card clip">' + f.portions.map(function (p, i) {
          return '<button class="opt" data-act="portion" data-i="' + i + '"><span class="radio' + (a.pi === i ? ' on' : '') + '"></span><span class="grow">' + esc(C.portionLabel(f, p)) + '</span><span class="muted" style="font-size:14px">' + C.fmtNum(p.g, 1) + ' ' + C.unitWord(f) + '</span></button>';
        }).join('') + '</section>';
      } else {
        h += '<section class="card clip"><div class="opt" style="cursor:default"><span class="radio on"></span><span class="grow">1 ' + esc(f.unitName || 'unit') + '</span>' + (f.unitG ? '<span class="muted" style="font-size:14px">' + f.unitG + ' g</span>' : '') + '</div></section>';
      }
      h += '<div class="between"><div style="font-size:16px">Quantity</div><div class="row" style="gap:14px"><button class="step" data-act="qty" data-n="-1" aria-label="Less">' + svg(I.minus, 18, 2) + '</button><div style="font-size:20px;font-weight:700;min-width:34px;text-align:center" aria-live="polite">' + C.fmtQty(a.qty) + '</div><button class="step" data-act="qty" data-n="1" aria-label="More">' + svg(I.plus, 18, 2) + '</button></div></div>';
    }
    h += '<section class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px"><div class="between" style="align-items:baseline"><div class="muted" style="font-size:14px">This amount</div><div style="font-size:28px;font-weight:700"><span data-out="kcal">' + k(n.kcal) + '</span> <span style="font-size:15px;font-weight:400">kcal</span></div></div>' +
      '<div class="macrobox"><div><div class="muted small">Protein</div><div style="font-size:16px;font-weight:700"><span data-out="p">' + g1(n.p) + '</span> g</div></div><div><div class="muted small">Carbs</div><div style="font-size:16px;font-weight:700"><span data-out="c">' + g1(n.c) + '</span> g</div></div><div><div class="muted small">Fat</div><div style="font-size:16px;font-weight:700"><span data-out="f">' + g1(n.f) + '</span> g</div></div></div></section>';
    if (ctx === 'log' || amt.entry) h += '<div class="field"><div class="lbl">Meal</div>' + mealPills(amt.meal) + '</div>';
    var label = amt.entry ? 'Save changes' : ctx === 'meal' ? 'Add to my meal' : ctx === 'quick' ? 'Add to list' : 'Add to ' + MEAL_NAME[amt.meal];
    h += '</div><div class="bottombar"><div><button class="btn" data-act="commit">' + esc(label) + '</button>' + (amt.entry ? '<button class="btn danger" data-act="delete-entry">Delete from log</button>' : '') + '</div></div>';
    return h;
  }
  function updateAmountOutputs() {
    var n = C.nutrition(amt.food, amt.a);
    var set = function (key, v) { var el = document.querySelector('[data-out="' + key + '"]'); if (el) el.textContent = v; };
    set('kcal', k(n.kcal)); set('p', g1(n.p)); set('c', g1(n.c)); set('f', g1(n.f));
  }
  actions.mode = function (el) {
    var f = amt.food, a = amt.a, g = C.gramsOf(f, a);
    if (el.dataset.v === 'grams') amt.a = { mode: 'grams', grams: g != null ? Math.round(g) : (f.unitG || 100) };
    else amt.a = f.basis === 'unit' ? { mode: 'units', qty: f.unitG && a.grams ? Math.max(0.25, Math.round(a.grams / f.unitG * 4) / 4) : 1 } : { mode: 'portion', pi: 0, qty: 1 };
    rerender();
  };
  actions.portion = function (el) { amt.a.pi = +el.dataset.i; rerender(); };
  actions.qty = function (el) {
    var q = amt.a.qty;
    if (+el.dataset.n > 0) q = q < 0.5 ? 0.5 : q + 0.5; else q = q > 0.5 ? q - 0.5 : 0.25;
    amt.a.qty = q; rerender();
  };
  actions.meal = function (el) {
    if (current === '/unknown') { est.meal = el.dataset.v; rerender(); return; }
    if (current === '/quick') { memo.quick.meal = el.dataset.v; rerender(); return; }
    if (amt) { amt.meal = el.dataset.v; rerender(); }
  };
  actions.fav = function () { var id = amt.food.id; if (data.favs[id]) delete data.favs[id]; else data.favs[id] = true; save(); rerender(); };
  actions.commit = function () {
    var q = route().q, f = amt.food, a = amt.a;
    if (a.mode === 'grams' && !(a.grams > 0)) { toast('Enter an amount'); return; }
    if (amt.entry) {
      var e = amt.entry, n = C.nutrition(f, a);
      e.amount = a; e.meal = amt.meal; e.label = C.amountLabel(f, a); e.kcal = n.kcal; e.p = n.p; e.c = n.c; e.f = n.f; e.name = f.name;
      save(); toast('Saved'); amt = null; go('#/log' + qs({ d: e.date })); return;
    }
    var meal = amt.meal; amt = null; commitAmount(f, a, q, meal);
  };
  actions['delete-entry'] = function () {
    var e = amt.entry;
    confirmBox('Delete ' + e.name + ' from ' + MEAL_NAME[e.meal] + '?', 'Delete', function () {
      data.entries = data.entries.filter(function (x) { return x.id !== e.id; }); save(); amt = null; toast('Deleted'); go('#/log' + qs({ d: e.date }));
    });
  };
  function notFound() { return '<div class="screen">' + header('Not found') + '<div class="empty">This item no longer exists.</div></div>'; }
  function missingFood(entry) {
    return '<div class="screen">' + header(entry.name) + '<div class="card" style="padding:16px">' + esc(entry.label) + ' · ' + k(entry.kcal) + ' kcal<div class="muted small" style="margin-top:6px">This food was deleted from your foods, so the amount can’t be changed.</div></div></div><div class="bottombar"><div><button class="btn danger" data-act="delete-orphan" data-id="' + entry.id + '">Delete from log</button></div></div>';
  }
  actions['delete-orphan'] = function (el) { var e = data.entries.filter(function (x) { return x.id === el.dataset.id; })[0]; data.entries = data.entries.filter(function (x) { return x.id !== el.dataset.id; }); save(); go('#/log' + qs({ d: e && e.date })); };

  // QUICK ENTRY
  screens['/quick'] = function (q) {
    if (!memo.quick) memo.quick = { text: '', removed: {}, extra: [], meal: q.m || defaultMeal() };
    var hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    return '<div class="screen">' + header('Quick entry', '#/log' + qs({ d: q.d })) +
      '<div class="field"><label for="qe">What did you eat?</label><div class="card row" style="align-items:flex-start;padding:12px 8px 12px 16px">' +
      '<textarea id="qe" data-in="quick" rows="3" style="flex:1;border:none;outline:none;resize:none;font-size:17px;background:transparent;min-width:0;line-height:1.35" placeholder="e.g. medio aguacate, mi yogur y 2 huevos">' + esc(memo.quick.text) + '</textarea>' +
      (hasSR ? '<button class="iconbtn" data-act="dictate" aria-label="Dictate" style="background:var(--ink);color:#fff;width:40px;height:40px">' + svg(I.mic, 20) + '</button>' : '') + '</div>' +
      (hasSR ? '' : '<div class="muted small">Tip: tap the microphone on your keyboard to dictate.</div>') + '</div>' +
      '<div class="field"><div class="lbl">Meal</div>' + mealPills(memo.quick.meal) + '</div>' +
      '<div data-quick></div></div><div class="bottombar"><div><button class="btn" data-act="quick-add" data-count>Add</button></div></div>';
  };
  function quickItems() {
    var Q = memo.quick, foods = allFoods();
    var parsed = C.parse(Q.text, foods);
    var items = [], unrec = [];
    parsed.forEach(function (r, i) {
      if (Q.removed[i]) return;
      if (r.estimate) items.push({ seg: i, estimate: r.estimate, text: r.text });
      else if (r.food) items.push({ seg: i, food: r.food, amount: r.amount, unsure: r.unsure || r.assumed, text: r.text });
      else unrec.push({ seg: i, text: r.text });
    });
    Q.extra.forEach(function (x, j) { var f = getFood(x.foodId); if (f) items.push({ extra: j, food: f, amount: x.amount }); });
    return { items: items, unrec: unrec };
  }
  function renderQuickResults() {
    var box = document.querySelector('[data-quick]'); if (!box) return;
    var R = quickItems(), total = 0, h = '';
    if (R.items.length) {
      R.items.forEach(function (it) { it.n = it.estimate ? { kcal: it.estimate.kcal } : C.nutrition(it.food, it.amount); total += it.n.kcal; });
      h += '<section class="card clip"><div class="mealhead"><h2 style="font-size:17px">Recognised</h2><span style="font-size:15px;font-weight:700">' + k(total) + ' kcal</span></div><div style="border-top:1px solid var(--line2)">' +
        R.items.map(function (it) {
          var key = it.extra != null ? 'x' + it.extra : 's' + it.seg;
          return '<div class="item" style="cursor:default;padding-right:6px">' + (it.unsure ? '<span class="warn" aria-label="Check this">?</span>' : '<span class="ok" aria-hidden="true">' + svg(I.check, 14, 2.4) + '</span>') +
            '<span class="grow"><span class="nm">' + esc(it.estimate ? it.estimate.name : it.food.name) + '</span><span class="sb">' + esc(it.estimate ? 'Estimate' : C.amountLabel(it.food, it.amount)) + (it.unsure ? ' · check: “' + esc(it.text) + '”' : '') + '</span></span><span style="font-size:15px">' + k(it.n.kcal) + '</span>' +
            (it.unsure ? '<button class="xbtn" data-act="quick-change" data-seg="' + it.seg + '" aria-label="Change">' + svg(I.search, 18) + '</button>' : '') +
            '<button class="xbtn" data-act="quick-remove" data-key="' + key + '" aria-label="Remove">' + svg(I.x, 18) + '</button></div>';
        }).join('') + '</div></section>';
    }
    R.unrec.forEach(function (u) {
      h += '<section class="card unrec"><div class="row" style="align-items:flex-start">' + svg(I.alert, 22, 1.7, ' style="flex:none"') + '<div><div style="font-size:16px;font-weight:700">Not recognised: “' + esc(u.text) + '”</div><div class="muted" style="font-size:14px">Pick the food and amount.</div></div></div>' +
        '<div class="row" style="gap:8px"><button class="btn ghost" data-act="quick-change" data-seg="' + u.seg + '">Choose food</button><button class="btn ghost" data-act="quick-remove" data-key="s' + u.seg + '">Ignore</button></div></section>';
    });
    if (!R.items.length && !R.unrec.length) h = '<div class="empty">Write or dictate what you ate, separated by commas or “y”.<br>For example: <em>2 huevos, una tostada integral y un café con leche</em>.</div>';
    box.innerHTML = h;
    var btn = document.querySelector('[data-count]');
    if (btn) { btn.textContent = R.items.length ? 'Add ' + R.items.length + ' item' + (R.items.length > 1 ? 's' : '') + ' to ' + MEAL_NAME[memo.quick.meal] : 'Add'; btn.disabled = !R.items.length; }
  }
  screens['/quick'].mount = function () { renderQuickResults(); };
  actions['quick-remove'] = function (el) {
    var key = el.dataset.key;
    if (key[0] === 'x') memo.quick.extra.splice(+key.slice(1), 1); else memo.quick.removed[key.slice(1)] = true;
    renderQuickResults();
  };
  actions['quick-change'] = function (el) {
    var seg = el.dataset.seg, parsed = C.parse(memo.quick.text, allFoods())[seg];
    var term = parsed ? parsed.text.replace(/\d+([.,]\d+)?\s*(g|gr|gramos|ml)?/gi, '').replace(/\b(un|una|uno|medio|media|dos|tres|de|del|a|an|half)\b/gi, '').trim() : '';
    go('#/add' + qs({ ctx: 'quick', seg: seg, d: route().q.d, m: memo.quick.meal, q: term }));
  };
  actions['quick-add'] = function () {
    var q = route().q, d = q.d || today(), R = quickItems();
    if (!R.items.length) return;
    R.items.forEach(function (it) {
      if (it.estimate) data.entries.push({ id: uid(), date: d, meal: memo.quick.meal, foodId: 'unknown', name: it.estimate.name, amount: { mode: 'estimate' }, label: 'Estimate', kcal: it.estimate.kcal, p: 0, c: 0, f: 0, t: Date.now() });
      else data.entries.push(makeEntry(it.food, it.amount, d, memo.quick.meal));
    });
    save(); toast(R.items.length + ' item' + (R.items.length > 1 ? 's' : '') + ' added to ' + MEAL_NAME[memo.quick.meal]);
    memo.quick = null; go('#/log' + qs({ d: d }));
  };
  var recog = null;
  actions.dictate = function (el) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    if (recog) { recog.stop(); return; }
    var ta = document.querySelector('[data-in="quick"]'), base = ta.value ? ta.value.replace(/\s*$/, '') + ', ' : '';
    recog = new SR(); recog.lang = 'es-ES'; recog.interimResults = true; recog.continuous = false;
    el.style.background = '#8A2D1E';
    recog.onresult = function (ev) {
      var txt = ''; for (var i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      ta.value = base + txt; memo.quick.text = ta.value; memo.quick.removed = {}; renderQuickResults();
    };
    recog.onend = recog.onerror = function () { recog = null; el.style.background = ''; };
    try { recog.start(); } catch (e) { recog = null; el.style.background = ''; toast('Dictation is not available here. Use the keyboard microphone.'); }
  };

  // FOODS
  screens['/foods'] = function (q) {
    var tab = q.tab === 'meals' ? 'meals' : 'foods';
    var h = '<div class="screen tabbed"><h1>Foods</h1>' +
      '<div class="card search">' + svg(I.search, 20) + '<input data-in="foodsearch" type="search" placeholder="Search" aria-label="Search" value="' + esc(memo.foodsTerm || '') + '" autocomplete="off"></div>' +
      '<div class="seg">' + [['foods', 'Foods'], ['meals', 'My meals']].map(function (t) { return '<button class="' + (tab === t[0] ? 'on' : '') + '" data-act="foodtab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div data-foodlist></div></div>' + tabs('foods');
    return h;
  };
  function renderFoodList() {
    var q = route().q, tab = q.tab || 'custom', term = (memo.foodsTerm || '').trim();
    var box = document.querySelector('[data-foodlist]'); if (!box) return;
    var h = '';
    if (tab === 'meals') {
      h += '<button class="dashed" data-act="new-mymeal">' + svg(I.plus, 18) + 'New meal</button>';
      var ms = data.meals.filter(function (m) { return !term || C.norm(m.name).indexOf(C.norm(term)) >= 0; });
      if (!ms.length) h += '<div class="empty">No meals yet. Build one here, or use “Save as my meal” on the Log screen.</div>';
      ms.forEach(function (m) {
        var t = totals(m.items);
        h += '<section class="card clip">' + (m.photo ? '<div style="background:#fff;border-bottom:1px solid var(--line2);display:flex;justify-content:center"><img alt="" src="' + m.photo + '" style="height:160px;width:160px;object-fit:contain"></div>' : '') + '<div class="mealhead" style="padding-bottom:6px"><h2>' + esc(m.name) + '</h2><span style="font-size:16px;font-weight:700">' + k(t.kcal) + ' kcal</span></div>' +
          m.items.map(function (it) { return '<div class="between" style="padding:6px 16px;font-size:15px"><span>' + esc(it.name) + ' · ' + esc(it.label) + '</span><span class="muted">' + k(it.kcal) + '</span></div>'; }).join('') +
          '<div class="row" style="gap:8px;padding:10px 12px 12px;border-top:1px solid var(--line2);margin-top:6px"><button class="btn ghost" data-act="edit-mymeal" data-id="' + m.id + '">Edit</button><button class="btn" style="min-height:44px;font-size:15px" data-act="mymeal-today" data-id="' + m.id + '">Add to day</button></div></section>';
      });
    } else {
      var list = allFoods();
      if (term) list = C.search(term, list);
      else list.sort(function (x, y) { return x.name.localeCompare(y.name); });
      h += '<div class="row" style="gap:10px"><button class="dashed" data-act="new-food" data-type="custom">' + svg(I.plus, 18) + 'New food</button><a class="dashed" href="#/scan">' + svg(I.scan, 18, 1.7) + 'Scan labels</a></div>';
      h += '<div class="muted small">' + list.length + ' foods · values per 100 g (or per unit) · protein · carbs · fat</div>';
      h += list.length ? '<section class="card clip">' + list.map(function (f) {
        var per = f.basis === 'unit' ? ' / ' + (f.unitName || 'unit') : f.liquid ? ' / 100 ml' : '';
        return '<div class="item" style="padding-right:4px">' + thumb(f) + '<button class="grow" data-act="open-food" data-id="' + esc(f.id) + '" style="border:none;background:transparent;text-align:left;padding:0;cursor:pointer;display:flex;align-items:center;gap:8px"><span class="grow"><span class="nm">' + esc(f.name) + '</span><span class="sb">' + (f.type === 'custom' ? 'Custom · ' : '') + 'P ' + g1(f.p) + ' g · C ' + g1(f.c) + ' g · F ' + g1(f.f) + ' g</span></span><span style="font-size:15px;font-weight:700;text-align:right">' + k(f.kcal) + '<span class="muted" style="display:block;font-size:11px;font-weight:400">kcal' + esc(per) + '</span></span></button>' + starBtn(f) + '</div>';
      }).join('') + '</section>' : '<div class="empty">No foods found. <button class="linkbtn" data-act="create-from-foods">Create “' + esc(term) + '”</button></div>';
    }
    box.innerHTML = h;
  }
  screens['/foods'].mount = function () { renderFoodList(); };
  actions['create-from-foods'] = function () { go('#/food/new' + qs({ type: 'custom', name: memo.foodsTerm || '' })); };
  actions.foodtab = function (el) { go('#/foods' + qs({ tab: el.dataset.v })); };
  actions['new-food'] = function (el) { go('#/food/new' + qs({ type: el.dataset.type })); };
  actions['open-food'] = function (el) { go('#/food/edit' + qs({ id: el.dataset.id })); };
  actions['new-mymeal'] = function () { memo.mealDraft = { id: null, name: '', items: [] }; go('#/meal'); };
  actions['edit-mymeal'] = function (el) { var m = data.meals.filter(function (x) { return x.id === el.dataset.id; })[0]; memo.mealDraft = JSON.parse(JSON.stringify(m)); go('#/meal'); };
  actions['mymeal-today'] = function (el) {
    var m = data.meals.filter(function (x) { return x.id === el.dataset.id; })[0];
    chooseMeal('Add “' + m.name + '” to today', function (meal) { addMyMeal(m, today(), meal); });
  };

  // FOOD FORM
  var form = null;
  screens['/food/new'] = screens['/food/edit'] = function (q) {
    if (!form || form.key !== location.hash) {
      var src = q.id ? getFood(q.id) : null;
      if (q.id && !src) return notFound();
      form = { key: location.hash, isNew: !src, id: src ? src.id : null, builtin: !!(src && src.builtin) || (src && BUILTIN.some(function (b) { return b.id === src.id; })),
        f: src ? JSON.parse(JSON.stringify(src)) : { type: q.type || 'custom', name: q.name || '', basis: '100g', kcal: null, p: null, c: null, f: null, portions: [], photo: null, unitName: '', unitG: null } };
      form.fav = form.id ? !!data.favs[form.id] : false;
    }
    var F = form.f, isUnit = F.basis === 'unit';
    var title = form.isNew ? 'New ' + F.type + ' food' : 'Edit food';
    var h = '<div class="screen">' + header(title, '#/foods') +
      '<label class="btn outline" style="position:relative">' + svg(I.scan, 20, 1.7) + (form.scanning ? 'Reading label…' : 'Scan nutrition label') + '<input type="file" accept="image/*" data-in="labelone" style="position:absolute;inset:0;opacity:0;cursor:pointer"' + (form.scanning ? ' disabled' : '') + '></label>' +
      '<div class="muted small" style="text-align:center;margin-top:-6px">Reads the values per 100 g for you to check · <button class="linkbtn light" style="min-height:0;padding:0;display:inline;text-decoration:underline" data-act="form-paste-label">or paste the label text</button></div>' +
      (form.builtin ? '<div class="muted small" style="margin-top:-6px">Standard food. Your changes replace the reference values on this device.</div>' : '') +
      '<section class="row" style="gap:14px">' +
      '<span class="photo-edit' + (F.photo ? ' has' : '') + '">' + (F.photo ? '<img alt="Food photo" src="' + F.photo + '">' : svg(I.camera, 30, 1.5) + '<span style="font-size:13px">Photo</span>') + '</span>' +
      '<div class="grow" style="display:flex;flex-direction:column;gap:8px">' +
      '<label class="btn ghost" style="position:relative">' + (F.photo ? 'Change photo' : 'Add photo') + '<input type="file" accept="image/*" data-in="photo" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>' +
      (F.photo ? '<button class="btn ghost" data-act="photo-remove">Remove photo</button>' : '') +
      '<div class="muted small">Placed on a white background. For a clean cut-out, use “Remove Background” in Photos first.</div></div></section>' +
      '<div class="field"><label for="fname">Name</label><input id="fname" class="input" data-f="name" value="' + esc(F.name) + '" placeholder="e.g. My yogurt" autocomplete="off"></div>' +
      '<div class="field"><div class="lbl">Values per</div><div class="seg"><button class="' + (!isUnit && !F.liquid ? 'on' : '') + '" data-act="basis" data-v="100g">100 g</button><button class="' + (!isUnit && F.liquid ? 'on' : '') + '" data-act="basis" data-v="100ml">100 ml</button><button class="' + (isUnit ? 'on' : '') + '" data-act="basis" data-v="unit">1 unit</button></div></div>';
    if (isUnit) h += '<section class="card clip"><div class="numrow"><label for="un">Unit name</label><input id="un" data-f="unitName" value="' + esc(F.unitName || '') + '" placeholder="unit" style="width:140px"></div><div class="numrow"><label for="ug">Unit weight (optional)</label><input id="ug" data-f="unitG" inputmode="decimal" value="' + (F.unitG == null ? '' : F.unitG) + '" placeholder="–"><span class="u">g</span></div></section>';
    function nr(id, label, key, u) { return '<div class="numrow"><label for="' + id + '">' + label + '</label><input id="' + id + '" data-f="' + key + '" inputmode="decimal" value="' + (F[key] == null ? '' : F[key]) + '" placeholder="0"><span class="u">' + u + '</span></div>'; }
    h += '<section class="card clip">' + nr('fk', 'Calories', 'kcal', 'kcal') + nr('fp', 'Protein', 'p', 'g') + nr('fc', 'Carbs', 'c', 'g') + nr('ff', 'Fat', 'f', 'g') + '</section>';
    if (!isUnit) {
      h += '<h2 class="sec">Portions</h2><section class="card clip">' + (F.portions || []).map(function (p, i) {
        return '<div class="numrow"><span class="grow" style="font-size:16px">' + esc(p.type === 'unit' ? '1 ' + (p.label || 'unit') : '1 ' + (p.label || p.type)) + '</span><span class="muted" style="font-size:15px">' + C.fmtNum(p.g, 1) + ' g</span><button class="xbtn" data-act="portion-remove" data-i="' + i + '" aria-label="Remove portion">' + svg(I.x, 18) + '</button></div>';
      }).join('') +
        '<div class="numrow" style="gap:8px"><input data-pn placeholder="Portion, e.g. glass" aria-label="Portion name" style="flex:1;text-align:left;width:auto"><input data-pg inputmode="decimal" placeholder="g" aria-label="Portion grams" style="width:60px"><button class="linkbtn" data-act="portion-add">' + svg(I.plus, 16, 2) + 'Add</button></div></section>';
    }
    h += '<label class="row" style="min-height:44px;font-size:16px"><input type="checkbox" data-act-change="fav-form"' + (form.fav ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:#2B2A28;margin:0">Add to favorites</label>';
    if (!form.isNew) h += '<button class="btn danger" data-act="delete-food">' + (form.builtin ? 'Remove from standard foods' : 'Delete food') + '</button>';
    h += '</div><div class="bottombar"><div><button class="btn" data-act="save-food">Save food</button></div></div>';
    return h;
  };
  actions.basis = function (el) {
    var v = el.dataset.v;
    form.f.basis = v === 'unit' ? 'unit' : '100g'; form.f.liquid = v === '100ml'; rerender();
  };
  function fillFormFromLabel(v) {
    form.f.basis = '100g'; form.f.liquid = !!v.liquid;
    ['kcal', 'p', 'c', 'f'].forEach(function (key) { if (v[key] != null) form.f[key] = v[key]; });
    if (v.perServing && v.serving) {
      form.f.portions = form.f.portions || [];
      if (!form.f.portions.some(function (p) { return p.label === 'serving'; })) form.f.portions.push({ type: 'portion', g: v.serving.g, label: 'serving' });
    }
    rerender();
    toast(v.found >= 4 ? (v.perServing ? 'Converted from per serving (' + v.serving.g + ' ' + v.serving.unit + '): check the values' : 'Values read from the label: check them') : 'Some values found: check and complete');
  }
  actions['form-paste-label'] = function () {
    readClipboard(function (t) {
      var v = C.parseLabel(t);
      if (!v.found) { toast('No nutrition values found in the copied text'); return; }
      fillFormFromLabel(v);
    });
  };
  function readClipboard(cb) {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) { if (t && t.trim()) cb(t); else pasteBox(cb); }).catch(function () { pasteBox(cb); });
    } else pasteBox(cb);
  }
  function pasteBox(cb) {
    modal('<h2>Paste the text</h2><textarea class="input" data-in-modal rows="6" placeholder="Paste here"></textarea><button class="btn" data-ok>Use this text</button><button class="btn ghost" data-close-btn>Cancel</button>', function (el) {
      var ta = el.querySelector('[data-in-modal]'); setTimeout(function () { ta.focus(); }, 50);
      el.querySelector('[data-ok]').onclick = function () { var v = ta.value; closeModal(); if (v.trim()) cb(v); };
    });
  }
  actions['portion-add'] = function () {
    var n = document.querySelector('[data-pn]').value.trim(), g = num(document.querySelector('[data-pg]').value);
    if (!n || !(g > 0)) { toast('Write a portion name and its grams'); return; }
    form.f.portions = form.f.portions || [];
    form.f.portions.push({ type: 'portion', g: g, label: n }); rerender();
  };
  actions['portion-remove'] = function (el) { form.f.portions.splice(+el.dataset.i, 1); rerender(); };
  actions['photo-remove'] = function () { form.f.photo = null; rerender(); };
  actions['save-food'] = function () {
    var F = form.f;
    F.name = (F.name || '').trim();
    if (!F.name) { toast('Add a name'); return; }
    if (F.kcal == null || isNaN(F.kcal)) { toast('Add the calories'); return; }
    ['p', 'c', 'f'].forEach(function (key) { if (F[key] == null || isNaN(F[key])) F[key] = 0; });
    if (F.basis === 'unit') { F.portions = []; F.liquid = false; if (!F.unitName) F.unitName = 'unit'; } else { delete F.unitName; F.unitG = null; }
    if (!form.id) form.id = (F.type === 'custom' ? 'cus-' : 'usr-') + uid();
    F.id = form.id; F.builtin = false;
    data.foods[F.id] = F;
    if (form.fav) data.favs[F.id] = true; else delete data.favs[F.id];
    save(); toast('Saved'); var t = F.type; form = null; go('#/foods');
  };
  actions['delete-food'] = function () {
    var F = form.f;
    confirmBox('Delete “' + F.name + '”?', 'Delete', function () {
      if (form.builtin) data.hidden[form.id] = true;
      delete data.foods[form.id]; delete data.favs[form.id];
      save(); toast('Deleted'); var t = F.type; form = null; go('#/foods');
    });
  };
  function processPhoto(file, target) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var S = 480, pad = 24, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      var ctx = cv.getContext('2d'); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, S, S);
      var sc = Math.min((S - pad * 2) / img.width, (S - pad * 2) / img.height);
      var w = img.width * sc, h = img.height * sc;
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      var data64 = cv.toDataURL('image/jpeg', 0.85); URL.revokeObjectURL(url);
      if (target === 'meal') { if (memo.mealDraft) memo.mealDraft.photo = data64; } else form.f.photo = data64;
      rerender();
    };
    img.onerror = function () { toast('Could not read that image'); };
    img.src = url;
  }

  // MY MEAL EDITOR
  screens['/meal'] = function () {
    if (!memo.mealDraft) memo.mealDraft = { id: null, name: '', items: [] };
    var M = memo.mealDraft, t = totals(M.items);
    var h = '<div class="screen">' + header(M.id ? 'Edit meal' : 'New meal', '#/foods?tab=meals') +
      '<section class="row" style="gap:14px">' +
      '<span class="photo-edit' + (M.photo ? ' has' : '') + '">' + (M.photo ? '<img alt="Meal photo" src="' + M.photo + '">' : svg(I.camera, 30, 1.5) + '<span style="font-size:13px">Photo</span>') + '</span>' +
      '<div class="grow" style="display:flex;flex-direction:column;gap:8px">' +
      '<label class="btn ghost" style="position:relative">' + (M.photo ? 'Change photo' : 'Add photo') + '<input type="file" accept="image/*" data-in="mealphoto" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>' +
      (M.photo ? '<button class="btn ghost" data-act="meal-photo-remove">Remove photo</button>' : '') + '</div></section>' +
      '<div class="field"><label for="mname">Name</label><input id="mname" class="input" data-in="mealname" value="' + esc(M.name) + '" placeholder="e.g. Usual breakfast"></div>' +
      '<section class="card clip"><div class="mealhead"><h2 style="font-size:17px">Foods</h2><span style="font-size:15px;font-weight:700">' + k(t.kcal) + ' kcal</span></div>' +
      (M.items.length ? '<div style="border-top:1px solid var(--line2)">' + M.items.map(function (it, i) {
        return '<div class="item" style="cursor:default;padding-right:6px">' + thumb(getFood(it.foodId)) + '<span class="grow"><span class="nm">' + esc(it.name) + '</span><span class="sb">' + esc(it.label) + '</span></span><span style="font-size:15px">' + k(it.kcal) + '</span><button class="xbtn" data-act="meal-item-remove" data-i="' + i + '" aria-label="Remove">' + svg(I.x, 18) + '</button></div>';
      }).join('') + '</div>' : '') +
      '<div class="mealfoot"><a class="linkbtn" href="#/add?ctx=meal">' + svg(I.plus, 18) + 'Add food</a></div></section>' +
      (M.id ? '<button class="btn danger" data-act="meal-delete">Delete meal</button>' : '') +
      '</div><div class="bottombar"><div><button class="btn" data-act="meal-save">Save meal</button></div></div>';
    return h;
  };
  actions['meal-photo-remove'] = function () { memo.mealDraft.photo = null; rerender(); };
  actions['meal-item-remove'] = function (el) { memo.mealDraft.items.splice(+el.dataset.i, 1); rerender(); };
  actions['meal-save'] = function () {
    var M = memo.mealDraft; M.name = (M.name || '').trim();
    if (!M.name) { toast('Add a name'); return; }
    if (!M.items.length) { toast('Add at least one food'); return; }
    if (M.id) data.meals = data.meals.map(function (x) { return x.id === M.id ? M : x; }); else { M.id = uid(); data.meals.push(M); }
    save(); memo.mealDraft = null; toast('Meal saved'); go('#/foods?tab=meals');
  };
  actions['meal-delete'] = function () {
    var M = memo.mealDraft;
    confirmBox('Delete “' + M.name + '”?', 'Delete', function () { data.meals = data.meals.filter(function (x) { return x.id !== M.id; }); save(); memo.mealDraft = null; go('#/foods?tab=meals'); });
  };

  // HISTORY
  function weekStart(s) { var d = pd(s), wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return ds(d); }
  function chart(cols, maxV, goal, onIdx) {
    var plot = 160, max = Math.max(maxV, goal * 1.15, 1);
    var gy = Math.round(goal / max * plot) + 22;
    return '<div class="chart"><div class="goal" style="bottom:' + gy + 'px"></div><div class="goaltxt" style="bottom:' + (gy + 3) + 'px">Goal ' + k(goal) + '</div>' +
      '<div class="cols" style="grid-template-columns:repeat(' + cols.length + ',minmax(0,1fr))">' + cols.map(function (c, i) {
        return '<button class="col" data-act="' + onIdx + '" data-v="' + esc(c.v) + '" aria-label="' + esc(c.aria) + '"><span class="b' + (c.cur ? ' cur' : '') + '" style="height:' + Math.round(c.val / max * plot) + 'px"></span><span class="cl">' + c.lbl + '</span></button>';
      }).join('') + '</div></div>';
  }
  screens['/history'] = function (q) {
    var v = q.v || 'week', d = q.d || today(), T = dayTotals(), G = data.goals, h = '';
    h += '<div class="screen tabbed"><h1>History</h1><div class="seg">' + [['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(function (t) { return '<button class="' + (v === t[0] ? 'on' : '') + '" data-act="hview" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    function nav(title, n) { return '<div class="datebar"><button class="iconbtn" data-act="hnav" data-n="-' + n + '" aria-label="Previous">' + svg(I.left) + '</button><h2 style="font-size:19px">' + title + '</h2><button class="iconbtn" data-act="hnav" data-n="' + n + '" aria-label="Next">' + svg(I.right) + '</button></div>'; }
    function stats(total, logged) { return '<div class="stats3"><div class="card stat"><div class="muted small">Total</div><div class="v">' + k(total) + ' kcal</div></div><div class="card stat"><div class="muted small">Daily average</div><div class="v">' + (logged ? k(total / logged) : '–') + ' kcal</div></div><div class="card stat"><div class="muted small">Days logged</div><div class="v">' + logged + '</div></div></div>'; }
    if (v === 'week') {
      var ws = weekStart(d), days = [], tot = 0, logged = 0, mx = 0;
      for (var i = 0; i < 7; i++) { var dd = addDays(ws, i), val = T[dd] || 0; if (val) { tot += val; logged++; } mx = Math.max(mx, val); days.push({ d: dd, val: val }); }
      var a = pd(ws), b = pd(addDays(ws, 6));
      var title = a.getMonth() === b.getMonth() ? a.getDate() + ' – ' + b.getDate() + ' ' + MONTHS[b.getMonth()] + ' ' + b.getFullYear() : a.getDate() + ' ' + MONTHS[a.getMonth()].slice(0, 3) + ' – ' + b.getDate() + ' ' + MONTHS[b.getMonth()].slice(0, 3) + ' ' + b.getFullYear();
      h += nav(title, 7) + stats(tot, logged) +
        '<section class="card" style="padding:14px 14px 10px;display:flex;flex-direction:column;gap:10px"><div class="between"><h2 style="font-size:16px">Calories per day</h2><span class="muted small">kcal</span></div>' +
        chart(days.map(function (x) { var dt = pd(x.d); return { v: x.d, val: x.val, lbl: DAYS[dt.getDay()].slice(0, 3), cur: x.d === today(), aria: longDate(x.d) + ': ' + k(x.val) + ' kcal' }; }), mx, G.kcal, 'open-day') + '</section>' +
        '<section class="card clip">' + days.map(function (x) { var dt = pd(x.d); return '<button class="drow" data-act="open-day" data-v="' + x.d + '"' + (x.d === today() ? ' style="font-weight:700"' : '') + '><span>' + DAYS[dt.getDay()] + ' ' + dt.getDate() + '</span><span' + (x.val ? '' : ' class="muted"') + '>' + (x.val ? k(x.val) + ' kcal' : '–') + '</span></button>'; }).join('') + '</section>';
    } else if (v === 'month') {
      var md = pd(d), y = md.getFullYear(), mo = md.getMonth(), first = new Date(y, mo, 1), nd = new Date(y, mo + 1, 0).getDate();
      var off = (first.getDay() + 6) % 7, mt = 0, ml = 0, sel = q.sel || (ds(md).slice(0, 7) === today().slice(0, 7) ? today() : null);
      var cells = '';
      for (var j = 0; j < off; j++) cells += '<span></span>';
      for (var dn = 1; dn <= nd; dn++) {
        var key = y + '-' + pad(mo + 1) + '-' + pad(dn), kv = T[key] || 0; if (kv) { mt += kv; ml++; }
        cells += '<button class="cell' + (kv ? ' has' : '') + (key === sel ? ' sel' : '') + (key === today() ? ' today' : '') + '" data-act="pick-day" data-v="' + key + '" aria-label="' + longDate(key) + (kv ? ': ' + k(kv) + ' kcal' : '') + '"><span class="d">' + dn + '</span><span class="k">' + (kv ? k(kv) : '') + '</span></button>';
      }
      h += nav(MONTHS[mo] + ' ' + y, 'm') + stats(mt, ml) +
        '<section class="card" style="padding:12px"><div class="cal" style="margin-bottom:6px">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (x) { return '<div class="dow">' + x + '</div>'; }).join('') + '</div><div class="cal">' + cells + '</div></section>';
      if (sel) {
        var list = entriesOn(sel), st = totals(list);
        h += '<section class="card clip"><div class="mealhead"><div><h2 style="font-size:17px">' + DAYS[pd(sel).getDay()] + ', ' + pd(sel).getDate() + ' ' + MONTHS[pd(sel).getMonth()] + '</h2><div class="muted small">Goal ' + k(G.kcal) + ' kcal</div></div><div style="font-size:18px;font-weight:700">' + k(st.kcal) + ' kcal</div></div>' +
          MEALS.map(function (m) { var mk = totals(list.filter(function (e) { return e.meal === m[0]; })).kcal; return '<div class="between" style="padding:10px 16px;border-top:1px solid var(--line2);font-size:15px"><span>' + m[1] + '</span><span' + (mk ? '' : ' class="muted"') + '>' + (mk ? k(mk) : '–') + '</span></div>'; }).join('') +
          '<button class="drow" style="justify-content:center;font-weight:700" data-act="open-day" data-v="' + sel + '">Open day</button></section>';
      }
    } else {
      var yy = pd(d).getFullYear(), cols = [], rows = '', mxv = 0;
      for (var m = 0; m < 12; m++) {
        var sum = 0, cnt = 0, pre = yy + '-' + pad(m + 1) + '-';
        Object.keys(T).forEach(function (key) { if (key.indexOf(pre) === 0 && T[key]) { sum += T[key]; cnt++; } });
        var avg = cnt ? sum / cnt : 0; mxv = Math.max(mxv, avg);
        cols.push({ v: pre + '01', val: avg, lbl: MONTHS[m][0], cur: today().indexOf(pre) === 0, aria: MONTHS[m] + ': ' + (cnt ? k(avg) + ' kcal per day' : 'no data') });
        if (cnt) rows = '<button class="drow" data-act="open-month" data-v="' + pre + '01"><span>' + MONTHS[m] + '</span><span>' + k(avg) + ' <span class="muted small">· ' + cnt + ' days</span></span></button>' + rows;
      }
      var yt = 0, yl = 0; Object.keys(T).forEach(function (key) { if (key.indexOf(yy + '-') === 0 && T[key]) { yt += T[key]; yl++; } });
      h += nav(String(yy), 'y') + stats(yt, yl) +
        '<section class="card" style="padding:14px 14px 10px;display:flex;flex-direction:column;gap:10px"><div class="between"><h2 style="font-size:16px">Daily average per month</h2><span class="muted small">kcal</span></div>' + chart(cols, mxv, G.kcal, 'open-month') + '</section>' +
        (rows ? '<section class="card clip"><div class="between" style="padding:10px 16px"><span class="muted small">Month</span><span class="muted small">Daily average</span></div>' + rows + '</section>' : '<div class="empty">No days logged in ' + yy + ' yet.</div>');
    }
    h += '</div>' + tabs('history');
    return h;
  };
  actions.hview = function (el) { var q = route().q; go('#/history' + qs({ v: el.dataset.v, d: q.d })); };
  actions.hnav = function (el) {
    var q = route().q, v = q.v || 'week', d = q.d || today(), n = el.dataset.n, dt = pd(d);
    if (v === 'week') d = addDays(d, +n);
    else if (v === 'month') { dt = new Date(dt.getFullYear(), dt.getMonth() + (n[0] === '-' ? -1 : 1), 1); d = ds(dt); }
    else { dt = new Date(dt.getFullYear() + (n[0] === '-' ? -1 : 1), 0, 1); d = ds(dt); }
    go('#/history' + qs({ v: v, d: d }));
  };
  actions['open-day'] = function (el) { go('#/log' + qs({ d: el.dataset.v })); };
  actions['pick-day'] = function (el) { var q = route().q; go('#/history' + qs({ v: 'month', d: q.d || today(), sel: el.dataset.v })); };
  actions['open-month'] = function (el) { go('#/history' + qs({ v: 'month', d: el.dataset.v })); };

  // UNKNOWN / ESTIMATE
  var est = null;
  screens['/unknown'] = function (q) {
    if (!est || est.key !== location.hash) {
      var e = q.entry ? data.entries.filter(function (x) { return x.id === q.entry; })[0] : null;
      est = { key: location.hash, entry: e, name: e ? e.name : '', kcal: e ? Math.round(e.kcal) : null, p: e && e.p ? g1(e.p) : null, c: e && e.c ? g1(e.c) : null, f: e && e.f ? g1(e.f) : null, meal: e ? e.meal : (q.m || defaultMeal()) };
    }
    function nr(id, label, key, u) { return '<div class="numrow"><label for="' + id + '">' + label + '</label><input id="' + id + '" data-est="' + key + '" inputmode="decimal" value="' + (est[key] == null ? '' : est[key]) + '" placeholder="' + (key === 'kcal' ? '0' : 'optional') + '"><span class="u">' + u + '</span></div>'; }
    return '<div class="screen">' + header(est.entry ? 'Edit estimate' : 'Unknown / estimate', '#/log' + qs({ d: q.d })) +
      '<div class="muted" style="font-size:14px;margin-top:-6px">For a restaurant meal or anything without values. Write your estimate, or paste the answer you got (e.g. from ChatGPT).</div>' +
      '<div class="field"><label for="en">Name</label><input id="en" class="input" data-est="name" value="' + esc(est.name) + '" placeholder="e.g. Restaurant lunch"></div>' +
      '<section class="card clip">' + nr('ek', 'Calories', 'kcal', 'kcal') + nr('ep', 'Protein', 'p', 'g') + nr('ec', 'Carbs', 'c', 'g') + nr('ef', 'Fat', 'f', 'g') + '</section>' +
      '<button class="btn ghost" data-act="est-paste">Paste estimate</button>' +
      '<div class="field"><label for="et">…or paste the text here</label><textarea id="et" class="input" data-in="esttext" placeholder="Total: ~800 kcal · Protein 35 g · Carbs 80 g · Fat 38 g"></textarea></div>' +
      '<div class="field"><div class="lbl">Meal</div>' + mealPills(est.meal) + '</div>' +
      (est.entry ? '<button class="btn danger" data-act="est-delete">Delete from log</button>' : '') +
      '</div><div class="bottombar"><div><button class="btn" data-act="est-save">' + (est.entry ? 'Save changes' : 'Add to ' + MEAL_NAME[est.meal]) + '</button></div></div>';
  };
  function applyEstimate(txt) {
    var r = C.parseEstimate(txt);
    if (r.kcal == null) { toast('No calories found in that text'); return false; }
    est.kcal = Math.round(r.kcal); ['p', 'c', 'f'].forEach(function (key) { if (r[key] != null) est[key] = Math.round(r[key]); });
    rerender(); toast('Estimate filled in: ' + k(est.kcal) + ' kcal'); return true;
  }
  actions['est-paste'] = function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) { toast('Paste the text in the box below'); return; }
    navigator.clipboard.readText().then(function (t) { if (t) applyEstimate(t); else toast('The clipboard is empty'); }).catch(function () { toast('Paste the text in the box below'); });
  };
  actions['est-save'] = function () {
    var kc = num(est.kcal);
    if (!(kc > 0)) { toast('Add the calories'); return; }
    var q = route().q, d = est.entry ? est.entry.date : (q.d || today());
    var e = est.entry || { id: uid(), date: d, foodId: 'unknown', amount: { mode: 'estimate' }, t: Date.now() };
    e.name = (est.name || '').trim() || 'Unknown'; e.label = 'Estimate'; e.meal = est.meal;
    e.kcal = kc; e.p = num(est.p) || 0; e.c = num(est.c) || 0; e.f = num(est.f) || 0;
    if (!est.entry) data.entries.push(e);
    save(); toast(est.entry ? 'Saved' : e.name + ' added to ' + MEAL_NAME[e.meal]); est = null; go('#/log' + qs({ d: d }));
  };
  actions['est-delete'] = function () {
    var e = est.entry;
    confirmBox('Delete ' + e.name + '?', 'Delete', function () { data.entries = data.entries.filter(function (x) { return x.id !== e.id; }); save(); est = null; go('#/log' + qs({ d: e.date })); });
  };

  // SCAN LABELS (bulk)
  screens['/scan'] = function () {
    if (!memo.scan) memo.scan = { drafts: [], busy: false, msg: '' };
    var S = memo.scan;
    var h = '<div class="screen">' + header('Scan labels', '#/foods') +
      '<div class="muted" style="font-size:15px;line-height:1.4;margin-top:-6px">Add the nutrition tables of your products, one or many at a time. Then give each a name, check the numbers and save them one by one or all together.</div>' +
      '<section class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px">' +
      '<div><div style="font-size:16px;font-weight:700">Recommended: iPhone text recognition</div><div class="muted small" style="line-height:1.4">Pick as many label photos as you like; the iPhone reads them and you come back here to paste them all at once. Needs the “Food labels” shortcut (set up once). <button class="linkbtn light" style="min-height:0;padding:0;display:inline;text-decoration:underline" data-act="shortcut-help">How to set it up</button></div></div>' +
      '<button class="btn" data-act="run-shortcut"' + (S.busy ? ' disabled' : '') + '>' + svg(I.scan, 20, 1.7) + '1 · Choose photos</button>' +
      '<button class="btn' + (S.awaitPaste ? '' : ' outline') + '" data-act="paste-labels"' + (S.busy ? ' disabled' : '') + '>2 · Paste labels</button>' +
      (S.awaitPaste ? '<div class="small" style="text-align:center;font-weight:700">Back from the shortcut? Tap “Paste labels”.</div>' : '') + '</section>' +
      '<section class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px">' +
      '<div><div style="font-size:16px;font-weight:700">Without the shortcut: read the photos in the app</div><div class="muted small" style="line-height:1.4">Also in bulk and offline, but much less accurate with real packaging: check every number.</div></div>' +
      '<label class="btn outline" style="position:relative">' + svg(I.camera, 20, 1.6) + '<span data-scanmsg>' + (S.busy ? esc(S.msg || 'Reading…') : 'Choose label photos') + '</span>' +
      '<input type="file" accept="image/*" multiple data-in="labels" style="position:absolute;inset:0;opacity:0;cursor:pointer"' + (S.busy ? ' disabled' : '') + '></label></section>';
    if (S.drafts.length) h += '<h2 class="sec">To review (' + S.drafts.length + ')</h2>';
    S.drafts.forEach(function (d, i) {
      var u = d.liquid ? 'ml' : 'g';
      function nf(key, label, un) { return '<label style="display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--muted);flex:1;min-width:0">' + label + '<span class="row" style="gap:3px"><input data-draft="' + i + '" data-key="' + key + '" inputmode="decimal" value="' + (d[key] == null ? '' : d[key]) + '" style="width:100%;min-width:0;border:1px solid var(--line);border-radius:8px;padding:7px 6px;font-size:16px;background:#fff' + (d[key] == null ? ';border-color:#B9B3A9;background:#FBF8F3' : '') + '"><span>' + un + '</span></span></label>'; }
      var status = d.found >= 4 ? (d.consistent === false ? 'Numbers don’t add up · check them' : 'All values found') : d.found ? 'Some values missing · check the label' : 'Could not read this label · fill in by hand';
      if (d.perServing && d.serving) status += ' · converted from per serving (' + C.fmtNum(d.serving.g, 1) + ' ' + d.serving.unit + ')';
      h += '<section class="card" style="padding:12px;display:flex;flex-direction:column;gap:10px">' +
        '<div class="row" style="align-items:flex-start">' + (d.thumb ? '<button data-act="draft-photo" data-i="' + i + '" style="border:none;padding:0;background:none;cursor:zoom-in;flex:none" aria-label="See the label photo"><img alt="" src="' + d.thumb + '" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line);display:block"></button>' : '') +
        '<div class="grow" style="display:flex;flex-direction:column;gap:6px"><input class="input" style="min-height:44px;font-size:16px" data-draft="' + i + '" data-key="name" value="' + esc(d.name || '') + '" placeholder="Name (required)" aria-label="Food name">' +
        '<div class="muted small">' + esc(status) + '</div></div>' +
        '<button class="xbtn" data-act="draft-remove" data-i="' + i + '" aria-label="Remove">' + svg(I.x, 18) + '</button></div>' +
        '<div class="seg" style="padding:3px"><button style="min-height:34px;font-size:14px" class="' + (!d.liquid ? 'on' : '') + '" data-act="draft-unit" data-i="' + i + '" data-v="g">Per 100 g</button><button style="min-height:34px;font-size:14px" class="' + (d.liquid ? 'on' : '') + '" data-act="draft-unit" data-i="' + i + '" data-v="ml">Per 100 ml</button></div>' +
        '<div class="row" style="gap:8px">' + nf('kcal', 'Calories', 'kcal') + nf('p', 'Protein', 'g') + nf('c', 'Carbs', 'g') + nf('f', 'Fat', 'g') + '</div>' +
        '<button class="btn ghost" data-act="draft-save" data-i="' + i + '">Save this one</button></section>';
    });
    h += '</div>';
    if (S.drafts.length > 1) h += '<div class="bottombar"><div><button class="btn" data-act="drafts-save"' + (S.busy ? ' disabled' : '') + '>Save all ' + S.drafts.length + '</button></div></div>';
    return h;
  };
  actions['draft-photo'] = function (el) {
    var d = memo.scan.drafts[+el.dataset.i];
    modal('<img alt="Label photo" src="' + d.thumb + '" style="width:100%;border-radius:12px;background:#fff"><button class="btn ghost" data-close-btn>Close</button>');
  };
  actions['shortcut-help'] = function () {
    modal('<h2>“Food labels” shortcut</h2><div style="font-size:15px;line-height:1.45;max-height:62vh;overflow:auto">' +
      '<p style="margin:0 0 8px">Set it up once in the <b>Shortcuts</b> app: tap <b>+</b>, name it exactly <b>Food labels</b> and add these actions (search them at the bottom):</p><ol style="margin:0;padding-left:20px">' +
      '<li><b>Select Photos</b> (Seleccionar fotos): tap the arrow and turn on <i>Select Multiple</i>.</li>' +
      '<li><b>Repeat with Each</b> (Repetir con cada): item in <i>Photos</i>.</li>' +
      '<li><b>Extract Text from Image</b> (Extraer texto de la imagen): drop it <u>inside</u> the repeat; it should say <i>Repeat Item</i>.</li>' +
      '<li>Below <i>End Repeat</i>: <b>Combine Text</b> (Combinar texto) with <i>Repeat Results</i>; change the separator to <i>Custom</i> and type <code>=====</code></li>' +
      '<li><b>Copy to Clipboard</b> (Copiar al portapapeles).</li></ol>' +
      '<p style="margin:8px 0 0">Then here: <b>1 · Choose photos</b> → pick all your labels → come back with ◀ at the top left → <b>2 · Paste labels</b>.</p></div>' +
      '<button class="btn ghost" data-close-btn>Close</button>');
  };
  function loadOcr() {
    if (window.FT_OCR) return Promise.resolve();
    return new Promise(function (ok, fail) { var s = document.createElement('script'); s.src = 'js/ocr.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
  }
  function scanFiles(files) {
    var S = memo.scan; S.busy = true; var list = Array.prototype.slice.call(files), i = 0;
    function progress(m) { if (/recogniz/.test(m.status)) S.msg = 'Reading label ' + (i + 1) + ' of ' + list.length + '… ' + Math.round((m.progress || 0) * 100) + '%'; else S.msg = 'Preparing the label reader…'; var b = document.querySelector('[data-scanmsg]'); if (b) b.textContent = S.msg; }
    S.msg = 'Preparing the label reader…'; if (current === '/scan') rerender();
    function next() {
      if (i >= list.length) { S.busy = false; S.msg = ''; if (current === '/scan') rerender(); return; }
      window.FT_OCR.readLabel(list[i], progress).then(function (v) {
        S.drafts.push(draftFrom(v));
      }).catch(function (e) { toast(e.message || 'Could not read a photo'); })
        .then(function () { i++; if (current === '/scan') rerender(); next(); });
    }
    loadOcr().then(next).catch(function () { S.busy = false; toast('Could not load the label reader. Check your connection.'); rerender(); });
  }
  function draftFrom(v) {
    return { name: '', kcal: v.kcal, p: v.p, c: v.c, f: v.f, found: v.found, consistent: v.consistent, thumb: v.thumb || null, liquid: !!v.liquid, perServing: !!v.perServing, serving: v.serving || null };
  }
  actions['run-shortcut'] = function () {
    memo.scan.awaitPaste = true; rerender();
    window.location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent('Food labels');
  };
  actions['paste-labels'] = function () {
    memo.scan.awaitPaste = false;
    readClipboard(function (t) {
      var parts = C.splitLabels(t), added = 0;
      parts.forEach(function (part) { var v = C.parseLabel(part); if (v.found) { memo.scan.drafts.push(draftFrom(v)); added++; } });
      if (!added) toast('No nutrition values found in the copied text');
      else { toast(added + ' label' + (added > 1 ? 's' : '') + ' added: add the names'); rerender(); }
    });
  };
  actions['draft-unit'] = function (el) { var d = memo.scan.drafts[+el.dataset.i]; d.liquid = el.dataset.v === 'ml'; rerender(); };
  actions['draft-save'] = function (el) {
    var i = +el.dataset.i, d = memo.scan.drafts[i];
    if (!saveDraft(d, i)) return;
    memo.scan.drafts.splice(i, 1); save(); toast('“' + d.name.trim() + '” saved'); rerender();
  };
  function saveDraft(d, i) {
    if (!(d.name || '').trim()) { toast('Add a name'); var inp = document.querySelector('[data-draft="' + i + '"][data-key="name"]'); if (inp) inp.focus(); return false; }
    if (d.kcal == null) { toast('Add the calories of “' + d.name + '”'); return false; }
    var id = 'cus-' + uid();
    data.foods[id] = { id: id, type: 'custom', name: d.name.trim(), basis: '100g', liquid: !!d.liquid, kcal: d.kcal, p: d.p || 0, c: d.c || 0, f: d.f || 0,
      portions: d.serving && d.perServing ? [{ type: 'portion', g: d.serving.g, label: 'serving' }] : d.liquid ? [{ type: 'portion', g: 250, label: 'glass' }] : [], photo: null, builtin: false };
    return true;
  }
  actions['draft-remove'] = function (el) { memo.scan.drafts.splice(+el.dataset.i, 1); rerender(); };
  actions['drafts-save'] = function () {
    var D = memo.scan.drafts;
    for (var i = 0; i < D.length; i++) {
      if (!(D[i].name || '').trim()) { toast('Add a name to every food'); var inp = document.querySelector('[data-draft="' + i + '"][data-key="name"]'); if (inp) inp.focus(); return; }
      if (D[i].kcal == null) { toast('Add the calories of “' + D[i].name + '”'); return; }
    }
    D.forEach(function (d, i) { saveDraft(d, i); });
    var n = D.length; save(); toast(n + ' food' + (n > 1 ? 's' : '') + ' saved'); memo.scan = null; go('#/foods');
  };

  // SETTINGS
  screens['/settings'] = function () {
    var G = data.goals;
    function gr(id, label, key, u) { return '<div class="numrow"><label for="' + id + '">' + label + '</label><input id="' + id + '" data-goal="' + key + '" inputmode="numeric" value="' + G[key] + '"><span class="u">' + u + '</span></div>'; }
    return '<div class="screen tabbed"><h1>Settings</h1>' +
      '<h2 class="sec">Daily goals</h2><section class="card clip">' + gr('gk', 'Calories', 'kcal', 'kcal') + gr('gp', 'Protein', 'p', 'g') + gr('gc', 'Carbs', 'c', 'g') + gr('gf', 'Fat', 'f', 'g') + '</section>' +
      '<h2 class="sec">Data</h2><section class="card clip">' +
      '<button class="setrow" data-act="export">' + svg(I.down, 20, 1.7) + '<span class="grow">Export to Excel</span>' + svg(I.right, 18) + '</button>' +
      '<button class="setrow" data-act="backup">' + svg(I.cloud, 20, 1.7) + '<span class="grow">Back up (save to Files / iCloud Drive)</span><span class="muted small">' + (data.lastBackup ? esc(data.lastBackup) : '') + '</span></button>' +
      '<label class="setrow" style="position:relative">' + svg(I.restore, 20, 1.7) + '<span class="grow">Restore from backup</span><input type="file" accept="application/json,.json" data-in="restore" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></section>' +
      '<div class="muted small" style="line-height:1.4">Your data is stored only on this iPhone. Back up regularly so you don’t lose it. Standard food values are approximate reference values (per 100 g).</div>' +
      '<div class="muted small">Food tracking ' + VERSION + ' · ' + data.entries.length + ' entries · ' + Object.keys(data.foods).length + ' own foods</div>' +
      '</div>' + tabs('settings');
  };
  actions.export = function () {
    var y = today().slice(0, 4), m = today().slice(0, 7);
    modal('<h2>Export to Excel</h2><div class="pills" data-per>' + [['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'], ['all', 'Everything']].map(function (p, i) { return '<button class="pill' + (i === 0 ? ' on' : '') + '" data-v="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
      '<div class="muted small">Two sheets: daily totals (with your goals) and every food logged.</div><button class="btn" data-ok>Export</button><button class="btn ghost" data-close-btn>Cancel</button>', function (el) {
      var per = 'month';
      el.querySelectorAll('[data-per] .pill').forEach(function (b) { b.onclick = function () { per = b.dataset.v; el.querySelectorAll('[data-per] .pill').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
      el.querySelector('[data-ok]').onclick = function () {
        var from = '0000', to = '9999', label = 'all';
        if (per === 'month') { from = m + '-01'; to = m + '-31'; label = m; }
        if (per === 'lastmonth') { var d = pd(m + '-01'); d.setMonth(d.getMonth() - 1); var lm = ds(d).slice(0, 7); from = lm + '-01'; to = lm + '-31'; label = lm; }
        if (per === 'year') { from = y + '-01-01'; to = y + '-12-31'; label = y; }
        closeModal(); exportExcel(from, to, label);
      };
    });
  };
  function exportExcel(from, to, label) {
    var list = data.entries.filter(function (e) { return e.date >= from && e.date <= to; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : MEALS.findIndex(function (x) { return x[0] === a.meal; }) - MEALS.findIndex(function (x) { return x[0] === b.meal; }); });
    if (!list.length) { toast('Nothing logged in that period'); return; }
    function r1(n) { return Math.round(n * 10) / 10; }
    var G = data.goals, days = {};
    list.forEach(function (e) { var d = days[e.date] || (days[e.date] = { kcal: 0, p: 0, c: 0, f: 0 }); d.kcal += e.kcal; d.p += e.p; d.c += e.c; d.f += e.f; });
    var daily = [['Date', 'Day', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Calorie goal', 'Difference']];
    Object.keys(days).sort().forEach(function (d) { var t = days[d]; daily.push([d, DAYS[pd(d).getDay()], Math.round(t.kcal), r1(t.p), r1(t.c), r1(t.f), G.kcal, Math.round(t.kcal - G.kcal)]); });
    var rows = [['Date', 'Meal', 'Food', 'Amount', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)']];
    list.forEach(function (e) { rows.push([e.date, MEAL_NAME[e.meal], e.name, e.label, Math.round(e.kcal), r1(e.p), r1(e.c), r1(e.f)]); });
    function go2() {
      var X = window.XLSX, wb = X.utils.book_new();
      var s1 = X.utils.aoa_to_sheet(daily); s1['!cols'] = [{ wch: 11 }, { wch: 10 }, { wch: 14 }, { wch: 11 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 11 }];
      var s2 = X.utils.aoa_to_sheet(rows); s2['!cols'] = [{ wch: 11 }, { wch: 15 }, { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 11 }, { wch: 10 }, { wch: 8 }];
      X.utils.book_append_sheet(wb, s1, 'Daily totals'); X.utils.book_append_sheet(wb, s2, 'Foods logged');
      var out = X.write(wb, { bookType: 'xlsx', type: 'array' });
      shareFile(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'food-tracking-' + label + '.xlsx');
    }
    if (window.XLSX) go2();
    else { var sc = document.createElement('script'); sc.src = 'vendor/xlsx/xlsx.mini.min.js'; sc.onload = go2; sc.onerror = function () { toast('Could not load the Excel exporter. Check your connection.'); }; document.head.appendChild(sc); }
  }
  function shareFile(blob, name, done) {
    var file; try { file = new File([blob], name, { type: blob.type }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).then(function () { if (done) done(); }).catch(function () {});
    } else {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); if (done) done();
    }
  }
  actions.backup = function () {
    var name = 'food-tracking-backup-' + today() + '.json';
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var file; try { file = new File([blob], name, { type: 'application/json' }); } catch (e) { file = null; }
    function done() { data.lastBackup = today(); save(); rerender(); }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).then(done).catch(function () {});
    } else {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); done();
    }
  };
  function restoreFile(file) {
    var r = new FileReader();
    r.onload = function () {
      var d; try { d = JSON.parse(r.result); } catch (e) { toast('That file is not a valid backup'); return; }
      if (!d || !Array.isArray(d.entries) || !d.goals) { toast('That file is not a valid backup'); return; }
      confirmBox('Replace all data on this iPhone with this backup (' + d.entries.length + ' entries)?', 'Restore', function () { data = d; load2(); save(); toast('Backup restored'); rerender(); });
    };
    r.readAsText(file);
  }
  function load2() { var b = blank(); Object.keys(b).forEach(function (key) { if (data[key] == null) data[key] = b[key]; }); }

  // ---------- events ----------
  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el || !app.contains(el)) return;
    var a = el.dataset.act;
    if (a === 'back') { e.preventDefault(); back(el.dataset.fb); return; }
    if (actions[a]) { e.preventDefault(); actions[a](el); }
  });
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.in === 'search') { clearTimeout(addResults._t); addResults._t = setTimeout(function () { addResults(route().q); }, 120); }
    else if (t.dataset.in === 'foodsearch') { memo.foodsTerm = t.value; clearTimeout(renderFoodList._t); renderFoodList._t = setTimeout(renderFoodList, 120); }
    else if (t.dataset.in === 'quick') { memo.quick.text = t.value; memo.quick.removed = {}; clearTimeout(renderQuickResults._t); renderQuickResults._t = setTimeout(renderQuickResults, 200); }
    else if (t.dataset.in === 'grams') { amt.a.grams = num(t.value) || 0; updateAmountOutputs(); }
    else if (t.dataset.in === 'mealname') { memo.mealDraft.name = t.value; }
    else if (t.dataset.est && est) { est[t.dataset.est] = t.value; }
    else if (t.dataset.in === 'esttext') { clearTimeout(applyEstimate._t); var v = t.value; applyEstimate._t = setTimeout(function () { if (C.parseEstimate(v).kcal != null) applyEstimate(v); }, 700); }
    else if (t.dataset.draft != null && memo.scan) { var dr = memo.scan.drafts[+t.dataset.draft]; if (dr) dr[t.dataset.key] = t.dataset.key === 'name' ? t.value : num(t.value); }
    else if (t.dataset.f && form) {
      var key = t.dataset.f, v = t.value;
      form.f[key] = (key === 'name' || key === 'unitName') ? v : num(v);
    }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.in === 'jump' && t.value) go('#/log' + qs({ d: t.value }));
    else if (t.dataset.in === 'photo' && t.files && t.files[0]) processPhoto(t.files[0]);
    else if (t.dataset.in === 'mealphoto' && t.files && t.files[0]) processPhoto(t.files[0], 'meal');
    else if (t.dataset.in === 'labels' && t.files && t.files.length) { scanFiles(t.files); t.value = ''; }
    else if (t.dataset.in === 'labelone' && t.files && t.files[0]) {
      var file = t.files[0]; form.scanning = true; rerender();
      loadOcr().then(function () { return window.FT_OCR.readLabel(file); }).then(function (v) {
        form.scanning = false;
        if (!v.found) { toast('Could not read the label. Try a sharper, straight photo.'); rerender(); return; }
        fillFormFromLabel(v);
      }).catch(function () { form.scanning = false; rerender(); toast('Could not load the label reader. Check your connection.'); });
    }
    else if (t.dataset.in === 'restore' && t.files && t.files[0]) { restoreFile(t.files[0]); t.value = ''; }
    else if (t.dataset.actChange === 'fav-form') form.fav = t.checked;
    else if (t.dataset.goal) { var v = num(t.value); if (v != null && v >= 0) { data.goals[t.dataset.goal] = Math.round(v); save(); toast('Goal saved'); } }
  });

  // ---------- render ----------
  function render() {
    var r = route(), fn = screens[r.path];
    if (!fn) { go('#/log'); return; }
    if (r.path !== '/amount') amt = null;
    if (r.path !== '/unknown') est = null;
    if (r.path !== '/food/new' && r.path !== '/food/edit') form = null;
    if (r.path !== '/foods' && current === '/foods') memo.foodsTerm = '';
    current = r.path;
    closeModal();
    app.innerHTML = fn(r.q);
    if (fn.mount) fn.mount(r.q);
  }
  function rerender() {
    var y = window.scrollY, r = route(), fn = screens[r.path];
    app.innerHTML = fn(r.q); if (fn.mount) fn.mount(r.q); window.scrollTo(0, y);
  }
  memo.navCount = 0;
  window.addEventListener('hashchange', function () { memo.navCount++; render(); window.scrollTo(0, 0); });

  load();
  render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  window.FT_APP = { data: function () { return data; }, reset: function () { data = blank(); save(); render(); } };
})();

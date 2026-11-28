/* Expenses — personal expense tracker. Data lives in Supabase, reached only through token-checked functions. */
(function () {
  'use strict';

  var SB = 'https://cxwgpmnmohlvnzumvneo.supabase.co';
  var KEY = 'sb_publishable_pTFm52fuqLOYSC3QbRs5dQ_fZyNZWPj';
  var VERSION = '1.3.0';
  var CATS = ['Food out', 'Supermarket', 'Coffee', 'Drinks', 'Tobacco', 'Shopping', 'Beauty', 'Workout', 'Health', 'Car', 'Rent', 'Internet', 'Laundry', 'Work', 'Other'];
  var CURS = ['QAR', 'AED', 'USD', 'EUR', 'SAR', 'GBP', 'BHD', 'OMR', 'KWD'];
  var RATES = { QAR: 1, AED: 0.99115, USD: 3.64, SAR: 0.970667, BHD: 9.68, OMR: 9.4545, KWD: 11.85, EUR: 4.2, GBP: 4.9 };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // ---------- storage ----------
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('exp_' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('exp_' + k, JSON.stringify(v)); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem('exp_' + k); } catch (e) { } }
  };
  var token = store.get('token');
  var km = location.hash.match(/k=([a-f0-9]{20,})/i);
  if (km) { token = km[1]; store.set('token', token); history.replaceState(null, '', location.pathname + '#/period'); }

  var now = new Date();
  var state = { y: now.getFullYear(), m: now.getMonth(), year: now.getFullYear(), offline: false, selDay: null };

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return iso(new Date()); }
  function parseISO(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function monthRange(y, m) { return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))]; }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmt0(n) { return Math.round(n || 0).toLocaleString('en-US'); }
  function compact(n) { n = n || 0; if (n >= 10000) return Math.round(n / 1000) + 'k'; if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k'; return String(Math.round(n)); }
  function personal(e) { return e.status === 'done' && e.category !== 'Work'; }
  function sum(list, f) { return list.reduce(function (a, e) { return a + (f ? f(e) : num(e.qar)); }, 0); }
  function shortDate(s) { var d = parseISO(s); return DAYS[d.getDay()].slice(0, 3) + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }
  function longDate(s) { var d = parseISO(s); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function timeOf(at) { if (!at) return ''; var d = new Date(at); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function money(e) { return fmt(e.amount) + ' ' + e.currency; }
  function toQar(a, c) { return r2(a * (RATES[c] || 1)); }

  var I = {
    period: '<path d="M4 6h16M4 12h16M4 18h10" stroke-linecap="round"/>',
    month: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    year: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    left: '<path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/>',
    right: '<path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/>',
    down: '<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>',
    pin: '<path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/>'
  };
  function svg(p, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 22) + '" height="' + (w || 22) + '" fill="none" stroke="currentColor" stroke-width="1.8">' + p + '</svg>'; }

  function toast(msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  function modal(html, onMount) {
    var root = document.getElementById('modal-root');
    root.innerHTML = '<div class="overlay"><div class="sheet" role="dialog" aria-modal="true">' + html + '</div></div>';
    var ov = root.firstChild;
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('[data-close-btn]')) closeModal(); });
    if (onMount) onMount(ov.firstChild);
  }
  function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

  // ---------- API ----------
  function rpc(fn, args, cacheKey) {
    var body = { p_token: token };
    for (var k in (args || {})) body[k] = args[k];
    return fetch(SB + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: { 'apikey': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { var e = new Error(j.message || ('Error ' + r.status)); e.status = r.status; throw e; });
      return r.json();
    }).then(function (j) {
      if (cacheKey) { store.set('c_' + cacheKey, j); state.offline = false; }
      return j;
    }, function (e) {
      if (cacheKey && e.status === undefined) { var c = store.get('c_' + cacheKey); if (c) { state.offline = true; return c; } }
      throw e;
    });
  }
  function fail(e) { toast(e && e.status === undefined ? 'No connection. Try again.' : (e && e.message === 'not allowed' ? 'Key not valid. Check Settings.' : 'Something went wrong: ' + (e && e.message))); }

  // look up what is at the payment's location (OpenStreetMap): the shop's name and, if no category was guessed, a proposal from the kind of place
  var looked = {};
  var KIND = [
    [/^(restaurant|fast_food|food_court|ice_cream|biergarten)$/, 'Food out'], [/^(cafe|coffee)$/, 'Coffee'], [/^(bar|pub|nightclub|alcohol|wine|beverages)$/, 'Drinks'],
    [/^(supermarket|convenience|greengrocer|butcher|bakery|deli|grocery|general|kiosk|seafood|dairy)$/, 'Supermarket'], [/^(tobacco|e-cigarette)$/, 'Tobacco'],
    [/^(pharmacy|chemist|clinic|hospital|doctors|dentist|optician|medical_supply)$/, 'Health'], [/^(hairdresser|beauty|cosmetics|perfumery|massage|nail_salon)$/, 'Beauty'],
    [/^(fitness_centre|sports_centre|sports|gym|swimming_pool|pitch)$/, 'Workout'], [/^(fuel|parking|car_wash|car_repair|car|tyres|car_parts|taxi|charging_station)$/, 'Car'],
    [/^(mobile_phone|telecommunication)$/, 'Internet'], [/^(laundry|dry_cleaning)$/, 'Laundry'],
    [/^(mall|department_store|clothes|shoes|electronics|jewelry|furniture|gift|toys|books|bag|boutique|houseware|doityourself|hardware|variety_store|sports_goods)$/, 'Shopping']
  ];
  function kindHint(j) {
    var a = j.address || {}, t = [j.type, a.shop, a.amenity, a.leisure].filter(Boolean);
    for (var i = 0; i < t.length; i++) for (var k = 0; k < KIND.length; k++) if (KIND[k][0].test(t[i])) return KIND[k][1];
    return null;
  }
  function lookupPlaces(list) {
    list.filter(function (e) { return e.lat != null && e.lng != null && (!e.place || !e.category) && !looked[e.id]; }).slice(0, 3).forEach(function (e, i) {
      looked[e.id] = 1;
      setTimeout(function () {
        fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=' + e.lat + '&lon=' + e.lng)
          .then(function (r) { return r.json(); }).then(function (j) {
            var a = j.address || {};
            var name = j.name || a.shop || a.amenity || a.building || '';
            var addr = [a.road, a.neighbourhood || a.suburb || a.quarter, a.city || a.town || a.state].filter(Boolean).join(', ');
            var hint = e.category ? null : kindHint(j);
            if (!name && !addr && !hint) return;
            return rpc('set_place_hint', { p_id: e.id, p_place: e.place ? null : (name || null), p_address: e.address ? null : addr, p_hint: hint })
              .then(function () { refresh(); });
          }).catch(function () { });
      }, i * 1100);
    });
  }

  // ---------- data ----------
  var cache = { pending: null, month: null, monthKey: '', year: null, yearKey: '' };
  function loadPending() { return rpc('list_pending', {}, 'pending').then(function (j) { cache.pending = j; lookupPlaces(j); return j; }); }
  function loadMonth(y, m) {
    var r = monthRange(y, m), key = y + '-' + m;
    return rpc('list_range', { p_from: r[0], p_to: r[1] }, 'm' + key).then(function (j) { cache.month = j; cache.monthKey = key; return j; });
  }
  function loadYear(y) {
    return rpc('list_range', { p_from: y + '-01-01', p_to: y + '-12-31' }, 'y' + y).then(function (j) { cache.year = j; cache.yearKey = String(y); return j; });
  }

  // ---------- shared pieces ----------
  function monthBar() {
    return '<div class="monthbar"><button class="iconbtn" data-act="mprev" aria-label="Previous month">' + svg(I.left) + '</button>' +
      '<div class="t">' + MONTHS[state.m] + ' ' + state.y + '</div>' +
      '<button class="iconbtn" data-act="mnext" aria-label="Next month">' + svg(I.right) + '</button></div>';
  }
  function byCategory(list) {
    var t = {};
    list.filter(function (e) { return e.status === 'done'; }).forEach(function (e) { t[e.category || 'Other'] = (t[e.category || 'Other'] || 0) + num(e.qar); });
    return Object.keys(t).map(function (c) { return { c: c, v: t[c] }; }).sort(function (a, b) {
      if ((a.c === 'Work') !== (b.c === 'Work')) return a.c === 'Work' ? 1 : -1; return b.v - a.v;
    });
  }
  function catList(list, scope) {
    var rows = byCategory(list);
    if (!rows.length) return '<div class="card"><div class="empty">Nothing classified yet.</div></div>';
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; })), pers = sum(list.filter(personal));
    return '<div class="card clip">' + rows.map(function (r) {
      var pct = r.c === 'Work' || !pers ? '' : ' <span class="muted small">' + Math.round(r.v / pers * 100) + '%</span>';
      return '<button class="catrow' + (r.c === 'Work' ? ' work' : '') + '" data-act="cat" data-c="' + esc(r.c) + '" data-scope="' + scope + '"><span>' + esc(r.c) + (r.c === 'Work' ? '<span class="tag">not in total</span>' : '') + pct + '</span><span class="amt">' + fmt(r.v) + '</span>' +
        '<div class="bar"><div style="width:' + (max ? r.v / max * 100 : 0) + '%"></div></div></button>';
    }).join('') + '</div>';
  }
  function expRow(e) {
    var tags = (e.status === 'pending' ? '<span class="tag p">pending</span>' : '') + (e.category === 'Work' ? '<span class="tag">work</span>' : '');
    var sub = [e.status === 'pending' ? (e.category ? e.category + '?' : 'No category') : e.category, e.place && e.place !== e.merchant ? e.place : '', e.currency !== 'QAR' ? money(e) : ''].filter(Boolean).join(' · ');
    return '<button class="item" data-act="edit" data-id="' + e.id + '"><span class="grow"><span class="nm">' + esc(e.merchant || e.category || 'Expense') + tags + '</span><span class="sb">' + esc(sub) + '</span></span><b>' + fmt(e.qar) + '</b></button>';
  }
  function findExp(id) {
    var all = [].concat(cache.pending || [], cache.month || [], cache.year || []);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function offlineNote() { return state.offline ? '<div class="offline">Offline — showing the last saved data</div>' : ''; }

  // ---------- screens ----------
  var screens = {}, route = '/period';

  screens['/period'] = function () {
    var pend = cache.pending, list = cache.monthKey === state.y + '-' + state.m ? cache.month : null;
    var h = '<div class="screen tabbed"><div class="between"><h1>Expenses</h1><button class="iconbtn" data-act="reload" aria-label="Refresh">' + svg(I.refresh) + '</button></div>' + monthBar() + offlineNote();
    h += '<div class="sec">Pending classification' + (pend && pend.length ? '<span class="count">' + pend.length + '</span>' : '') + '</div>';
    if (!pend) h += '<div class="card"><div class="empty">Loading…</div></div>';
    else if (!pend.length) h += '<div class="card"><div class="empty">All classified ✓</div></div>';
    else h += '<div class="card clip">' + pend.map(function (e) {
      var where = [e.place && e.place !== e.merchant ? e.place : '', e.address].filter(Boolean).join(' · ');
      return '<div class="pend"><div><div class="nm">' + esc(e.merchant || 'Payment') + '</div><div class="sb">' + esc([shortDate(e.date) + (e.source === 'applepay' ? ', ' + timeOf(e.at) : ''), where].filter(Boolean).join(' · ')) + '</div></div>' +
        '<div class="chips"><button class="chip amt" data-act="edit" data-id="' + e.id + '"><b>' + money(e) + '</b>' + (e.currency !== 'QAR' ? '<small>' + fmt(e.qar) + ' QAR</small>' : '') + '</button>' +
        '<button class="chip' + (e.category ? ' guess' : ' none') + '" data-act="pick" data-id="' + e.id + '">' + (e.category ? '<span class="cl"><small>Suggested</small>' + esc(e.category) + '</span>' : 'Choose category') + svg(I.down, 14) + '</button>' +
        '<button class="okbtn" data-act="confirm" data-id="' + e.id + '" aria-label="Confirm"' + (e.category ? '' : ' disabled') + '>' + svg(I.check, 20) + '</button></div></div>';
    }).join('') + '</div>';
    h += '<button class="dashed" data-act="add">' + svg(I.plus, 20) + 'Add extra</button>';
    if (!list) { h += '<div class="card"><div class="empty">Loading…</div></div></div>'; return h; }
    var pers = sum(list.filter(personal)), work = sum(list.filter(function (e) { return e.status === 'done' && e.category === 'Work'; }));
    var np = list.filter(function (e) { return e.status === 'pending'; }).length;
    h += '<div class="card totcard"><div class="muted small">Total · personal</div><div class="big">' + fmt(pers) + '<span class="cur">QAR</span></div>' +
      (work || np ? '<div class="muted small">' + [work ? 'Work ' + fmt(work) + ' QAR (not included)' : '', np ? np + ' pending not counted yet' : ''].filter(Boolean).join(' · ') + '</div>' : '') + '</div>';
    h += '<div class="sec">Total by category</div>' + catList(list, 'month');
    return h + '</div>';
  };

  screens['/month'] = function () {
    var list = cache.monthKey === state.y + '-' + state.m ? cache.month : null;
    var h = '<div class="screen tabbed"><h1>Monthly view</h1>' + monthBar() + offlineNote();
    if (!list) return h + '<div class="card"><div class="empty">Loading…</div></div></div>';
    var days = {}, pendDays = {};
    list.forEach(function (e) { if (personal(e)) days[e.date] = (days[e.date] || 0) + num(e.qar); if (e.status === 'pending') pendDays[e.date] = 1; });
    var pers = sum(list.filter(personal)), first = new Date(state.y, state.m, 1), nd = new Date(state.y, state.m + 1, 0).getDate();
    var isCur = state.y === now.getFullYear() && state.m === now.getMonth(), elapsed = isCur ? now.getDate() : nd;
    var maxDay = Object.keys(days).reduce(function (a, d) { return days[d] > (days[a] || 0) ? d : a; }, '');
    h += '<div class="stats3"><div class="card stat"><div class="muted small">Total</div><div class="v">' + fmt0(pers) + '</div></div>' +
      '<div class="card stat"><div class="muted small">Per day</div><div class="v">' + fmt0(elapsed ? pers / elapsed : 0) + '</div></div>' +
      '<div class="card stat"><div class="muted small">Top day</div><div class="v">' + (maxDay ? parseISO(maxDay).getDate() + ' · ' + compact(days[maxDay]) : '–') + '</div></div></div>';
    h += '<div class="card" style="padding:12px 10px"><div class="cal">' + DOW.map(function (d) { return '<div class="dow">' + d + '</div>'; }).join('');
    var lead = (first.getDay() + 6) % 7;
    for (var i = 0; i < lead; i++) h += '<div class="cell out"></div>';
    var td = today();
    for (var d = 1; d <= nd; d++) {
      var ds = iso(new Date(state.y, state.m, d)), v = days[ds] || 0;
      h += '<button class="cell' + (v ? ' has ' + (v >= 300 ? 'l3' : v >= 100 ? 'l2' : 'l1') : ' zero') + (ds === td ? ' today' : '') + (ds === state.selDay ? ' sel' : '') + '" data-act="day" data-d="' + ds + '"><span class="d">' + d + '</span>' +
        (v ? '<span class="k">' + compact(v) + '</span>' : '') + (pendDays[ds] ? '<span class="p"></span>' : '') + '</button>';
    }
    h += '</div></div>';
    var keys = Object.keys(days).sort().reverse();
    h += '<div class="sec">Day by day · QAR</div>';
    h += keys.length ? '<div class="card clip">' + keys.map(function (k) {
      return '<button class="drow" data-act="day" data-d="' + k + '"><span>' + shortDate(k) + '</span><b>' + fmt(days[k]) + '</b></button>';
    }).join('') + '</div>' : '<div class="card"><div class="empty">No personal expenses this month.</div></div>';
    h += '<div class="muted small" style="text-align:center">Personal only: Work and pending are not counted. A dot marks days with pending payments.</div>';
    return h + '</div>';
  };

  screens['/year'] = function () {
    var list = cache.yearKey === String(state.year) ? cache.year : null;
    var h = '<div class="screen tabbed"><h1>Yearly view</h1><div class="monthbar"><button class="iconbtn" data-act="yprev" aria-label="Previous year">' + svg(I.left) + '</button><div class="t">' + state.year + '</div><button class="iconbtn" data-act="ynext" aria-label="Next year">' + svg(I.right) + '</button></div>' + offlineNote();
    if (!list) return h + '<div class="card"><div class="empty">Loading…</div></div></div>';
    var mt = []; for (var i = 0; i < 12; i++) mt.push(0);
    list.forEach(function (e) { if (personal(e)) mt[parseISO(e.date).getMonth()] += num(e.qar); });
    var tot = mt.reduce(function (a, b) { return a + b; }, 0), max = Math.max.apply(null, mt);
    var months = state.year < now.getFullYear() ? 12 : state.year > now.getFullYear() ? 0 : now.getMonth() + 1;
    h += '<div class="stats3"><div class="card stat"><div class="muted small">Total</div><div class="v">' + fmt0(tot) + '</div></div>' +
      '<div class="card stat"><div class="muted small">Per month</div><div class="v">' + fmt0(months ? tot / months : 0) + '</div></div>' +
      '<div class="card stat"><div class="muted small">Per day</div><div class="v">' + fmt0(months ? tot / Math.max(1, dayOfYear(months)) : 0) + '</div></div></div>';
    h += '<div class="months">' + mt.map(function (v, m) {
      var cur = state.year === now.getFullYear() && m === now.getMonth(), fut = state.year > now.getFullYear() || (state.year === now.getFullYear() && m > now.getMonth());
      return '<button class="mcard' + (cur ? ' cur' : '') + (fut ? ' future' : '') + '" data-act="gomonth" data-m="' + m + '"><span class="mn">' + MONTHS[m] + '</span><span class="mv">' + (v ? fmt0(v) : '–') + '</span><div class="bar"><div style="width:' + (max ? v / max * 100 : 0) + '%"></div></div></button>';
    }).join('') + '</div>';
    h += '<div class="sec">By category · ' + state.year + '</div>' + catList(list, 'year');
    return h + '</div>';
  };
  function dayOfYear(months) {
    if (state.year < now.getFullYear()) return ((state.year % 4 === 0 && state.year % 100 !== 0) || state.year % 400 === 0) ? 366 : 365;
    var s = new Date(state.year, 0, 1); return Math.floor((now - s) / 864e5) + 1;
  }

  screens['/settings'] = function () {
    var ingest = SB + '/rest/v1/rpc/ingest_payment', quick = SB + '/rest/v1/rpc/classify_quick';
    function cp(label, val, show) { return '<div class="copyrow"><div class="grow"><div>' + label + '</div><div class="v">' + esc(show || val) + '</div></div><button class="chip" data-act="copy" data-v="' + esc(val) + '">Copy</button></div>'; }
    var h = '<div class="screen tabbed"><h1>Settings</h1>';
    h += '<div class="sec">Your key</div><div class="card clip">' + cp('Private key', token || '', token ? token.slice(0, 6) + '…' + token.slice(-4) : 'Not set') +
      '<div class="copyrow"><input class="input" data-newkey placeholder="Paste a key to change it"><button class="chip" data-act="setkey">Save</button></div></div>';
    h += '<div class="sec">Apple Pay shortcut</div><div class="card" style="padding:16px"><ol class="steps">' +
      '<li>Shortcuts → <b>Automation</b> → <b>+</b> → <b>Transaction</b>. Pick your cards, leave all categories, choose <b>Run Immediately</b>. Tap <b>Next</b> → <b>New Blank Automation</b>.</li>' +
      '<li>Add <b>Get Current Location</b>.</li>' +
      '<li>Add <b>Get Contents of URL</b> with the <i>Payment URL</i> below. Method <b>POST</b>. Headers: <code>apikey</code> = <i>API key</i>, <code>Content-Type</code> = <code>application/json</code>. Request Body <b>JSON</b> with text fields:<br>' +
      '<code>p_token</code> = your <i>private key</i><br><code>p_merchant</code> = Shortcut Input → <b>Merchant</b><br><code>p_amount</code> = Shortcut Input → <b>Amount</b><br><code>p_card</code> = Shortcut Input → <b>Card or Pass</b><br>' +
      '<code>p_lat</code> = Current Location → <b>Latitude</b><br><code>p_lng</code> = Current Location → <b>Longitude</b><br><code>p_address</code> = Current Location → <b>Street</b></li>' +
      '<li>Add <b>Get Dictionary Value</b>: <code>choices</code> from Contents of URL. Then <b>Split Text</b> by <b>New Lines</b>.</li>' +
      '<li>Add <b>Choose from List</b> (the split text). Tap <i>Prompt</i> and use another <b>Get Dictionary Value</b> → <code>label</code>.</li>' +
      '<li>Add a second <b>Get Contents of URL</b> with the <i>Classify URL</i>, same headers, JSON body: <code>p_token</code> = private key, <code>p_id</code> = Dictionary Value <code>id</code> from the first request, <code>p_category</code> = <b>Chosen Item</b>.</li>' +
      '</ol><p class="muted small" style="margin:12px 0 0">The payment is saved before the question. If you ignore it or pick <b>Later</b>, it waits in Pending classification.</p></div>';
    h += '<div class="card clip">' + cp('Payment URL', ingest) + cp('Classify URL', quick) + cp('API key', KEY) + '</div>';
    h += '<div class="sec">About</div><div class="card" style="padding:14px 16px" ><div class="small muted">Expenses ' + VERSION + ' · amounts shown in QAR. AED, USD, SAR, BHD, OMR and KWD are pegged to the dollar, so they convert at a fixed rate; EUR and GBP use an approximate rate.</div></div>';
    return h + '</div>';
  };

  function setupScreen() {
    return '<div class="screen"><h1>Expenses</h1><p class="muted">Open the setup link once, or paste your private key here.</p>' +
      '<input class="input" data-newkey placeholder="Private key"><button class="btn" data-act="setkey">Continue</button></div>';
  }

  // ---------- sheets ----------
  function catPills(sel) {
    return '<div class="pills">' + CATS.map(function (c) { return '<button class="pill' + (c === sel ? ' on' : '') + '" data-c="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
  }
  function wirePills(el, onPick) {
    el.querySelectorAll('.pills .pill').forEach(function (b) {
      b.onclick = function () { el.querySelectorAll('.pills .pill').forEach(function (x) { x.classList.toggle('on', x === b); }); onPick(b.dataset.c); };
    });
  }
  function curSelect(sel, attr) {
    return '<select class="sel" ' + attr + '>' + CURS.map(function (c) { return '<option' + (c === sel ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>';
  }
  function placeBox(e) {
    if (!e.place && !e.address && e.lat == null) return '';
    var q = e.lat != null ? 'https://maps.apple.com/?ll=' + e.lat + ',' + e.lng + '&q=' + encodeURIComponent(e.place || e.merchant || 'Payment') : 'https://maps.apple.com/?q=' + encodeURIComponent([e.place, e.address].filter(Boolean).join(', '));
    return '<div class="place">' + svg(I.pin, 18) + '<div class="grow">' + esc([e.place, e.address].filter(Boolean).join(' · ') || 'Location saved') +
      '<br><a href="' + esc(q) + '" target="_blank" rel="noopener">Open in Maps</a>' + (e.card ? ' · <span class="muted">' + esc(e.card) + '</span>' : '') + '</div></div>';
  }

  // one-tap category, then OK
  function pickSheet(e) {
    var sel = e.category;
    modal('<h2>' + esc(e.merchant || 'Payment') + '</h2><div class="muted">' + money(e) + (e.currency !== 'QAR' ? ' · ' + fmt(e.qar) + ' QAR' : '') + '</div>' + catPills(sel) +
      '<button class="btn" data-ok' + (sel ? '' : ' disabled') + '>OK</button><button class="btn ghost" data-split>Split or change amount</button>', function (el) {
        var ok = el.querySelector('[data-ok]');
        wirePills(el, function (c) { sel = c; ok.disabled = false; });
        ok.onclick = function () { ok.disabled = true; saveParts(e, e.date, e.merchant, e.currency, [{ category: sel, amount: num(e.amount) }]); };
        el.querySelector('[data-split]').onclick = function () { editSheet(Object.assign({}, e, { category: sel }), true); };
      });
  }

  // full editor: amount, date, merchant, split with automatic rest
  function editSheet(e, startSplit) {
    var total = num(e.amount), cur = e.currency, cat = e.category || '';
    var parts = startSplit ? [{ c: cat, a: '' }, { c: '' }] : null; // last part is always the rest
    var confirmDel = false;
    function restVal() { if (!parts) return 0; var s = 0; for (var i = 0; i < parts.length - 1; i++) s += num(parts[i].a); return r2(total - s); }
    function draw() {
      var h = '<div class="between"><h2>' + (e.status === 'pending' ? 'Classify payment' : 'Edit expense') + '</h2><button class="xbtn" data-close-btn aria-label="Close">' + svg(I.x, 20) + '</button></div>' + placeBox(e) +
        '<div class="field"><label>Shop / note</label><input class="input" data-mer value="' + esc(e.merchant || '') + '" placeholder="Optional"></div>' +
        '<div class="field"><label>Date</label><input class="input" type="date" data-date value="' + esc(e.date) + '"></div>' +
        '<div class="field"><label>Amount</label><div class="amtrow"><input class="input" data-total inputmode="decimal" value="' + (total || '') + '">' + curSelect(cur, 'data-cur') + '</div>' +
        (cur !== 'QAR' ? '<div class="muted small">≈ ' + fmt(toQar(total, cur)) + ' QAR</div>' : '') + '</div>';
      if (!parts) {
        h += '<div class="field"><label>Category</label>' + catPills(cat) + '</div><button class="linkbtn" data-split>' + svg(I.plus, 18) + 'Split into categories</button>';
      } else {
        var rest = restVal();
        h += '<div class="field"><label>Split · the last line is calculated for you</label>' + parts.map(function (p, i) {
          var last = i === parts.length - 1;
          return '<div class="part"><select class="sel" data-pc="' + i + '"><option value="">Category…</option>' + CATS.map(function (c) { return '<option' + (c === p.c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
            (last ? '<div class="rest' + (rest <= 0 ? ' bad' : '') + '" data-rest>' + fmt(rest) + '<small>rest</small></div>' : '<input class="amtin" data-pa="' + i + '" inputmode="decimal" placeholder="0.00" value="' + esc(p.a) + '">') +
            (parts.length > 2 ? '<button class="xbtn" data-rm="' + i + '" aria-label="Remove">' + svg(I.x, 18) + '</button>' : '') + '</div>';
        }).join('') + '</div><button class="linkbtn" data-addpart>' + svg(I.plus, 18) + 'Add another category</button>';
      }
      h += '<div class="err" data-err></div><button class="btn" data-save>OK</button>' +
        '<button class="btn danger" data-del>' + (confirmDel ? 'Tap again to delete' : 'Delete') + '</button>';
      return h;
    }
    modal('', function () { });
    var sheet = document.querySelector('#modal-root .sheet');
    function render(focusSel) {
      sheet.innerHTML = draw();
      var q = function (s) { return sheet.querySelector(s); };
      q('[data-total]').oninput = function () { total = num(this.value); updRest(); };
      q('[data-cur]').onchange = function () { cur = this.value; keep(); render(); };
      if (!parts) {
        wirePills(sheet, function (c) { cat = c; });
        q('[data-split]').onclick = function () { keep(); parts = [{ c: cat, a: '' }, { c: '' }]; render('[data-pa="0"]'); };
      } else {
        sheet.querySelectorAll('[data-pc]').forEach(function (s) { s.onchange = function () { parts[+s.dataset.pc].c = s.value; }; });
        sheet.querySelectorAll('[data-pa]').forEach(function (inp) { inp.oninput = function () { parts[+inp.dataset.pa].a = inp.value; updRest(); }; });
        sheet.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { keep(); parts.splice(+b.dataset.rm, 1); render(); }; });
        q('[data-addpart]').onclick = function () { keep(); parts.splice(parts.length - 1, 0, { c: '', a: '' }); render('[data-pa="' + (parts.length - 2) + '"]'); };
      }
      q('[data-save]').onclick = save;
      q('[data-del]').onclick = function () {
        if (!confirmDel) { confirmDel = true; keep(); render(); return; }
        rpc('delete_expense', { p_id: e.id }).then(function () { closeModal(); toast('Deleted'); refresh(); }, fail);
      };
      if (focusSel) { var f = q(focusSel); if (f) setTimeout(function () { f.focus(); }, 60); }
    }
    function keep() {
      var m = sheet.querySelector('[data-mer]'), d = sheet.querySelector('[data-date]');
      if (m) e = Object.assign({}, e, { merchant: m.value, date: d.value || e.date });
    }
    function updRest() {
      var r = sheet.querySelector('[data-rest]'); if (!r) return;
      var v = restVal(); r.innerHTML = fmt(v) + '<small>rest</small>'; r.classList.toggle('bad', v <= 0);
    }
    function save() {
      keep();
      var err = sheet.querySelector('[data-err]'), out;
      if (!(total > 0)) { err.textContent = 'Enter the amount.'; return; }
      if (!parts) {
        if (!cat) { err.textContent = 'Choose a category.'; return; }
        out = [{ category: cat, amount: r2(total) }];
      } else {
        var rest = restVal();
        out = parts.map(function (p, i) { return { category: p.c, amount: i === parts.length - 1 ? rest : r2(num(p.a)) }; });
        if (out.some(function (p) { return !p.category; })) { err.textContent = 'Choose a category for every line.'; return; }
        if (out.some(function (p) { return !(p.amount > 0); })) { err.textContent = rest <= 0 ? 'The parts add up to more than the total.' : 'Every line needs an amount.'; return; }
      }
      sheet.querySelector('[data-save]').disabled = true;
      saveParts(e, e.date, e.merchant, cur, out);
    }
    render(startSplit ? '[data-pa="0"]' : null);
  }

  function saveParts(e, date, merchant, cur, parts) {
    rpc('save_expense', { p_id: e.id, p_date: date, p_merchant: merchant || null, p_currency: cur, p_parts: parts })
      .then(function () { closeModal(); toast(parts.length > 1 ? 'Split into ' + parts.length : 'Saved · ' + parts[0].category); refresh(); },
        function (err) { fail(err); var b = document.querySelector('#modal-root [data-save], #modal-root [data-ok]'); if (b) b.disabled = false; });
  }

  function addSheet() {
    var isCur = state.y === now.getFullYear() && state.m === now.getMonth();
    var d0 = isCur ? today() : iso(new Date(state.y, state.m, 1)), cat = '';
    modal('<div class="between"><h2>Add extra</h2><button class="xbtn" data-close-btn aria-label="Close">' + svg(I.x, 20) + '</button></div>' +
      '<div class="field"><label>Date</label><input class="input" type="date" data-date value="' + d0 + '"></div>' +
      '<div class="field"><label>Category</label>' + catPills('') + '</div>' +
      '<div class="field"><label>Amount</label><div class="amtrow"><input class="input" data-amt inputmode="decimal" placeholder="0.00">' + curSelect('QAR', 'data-cur') + '</div></div>' +
      '<div class="field"><label>Note</label><input class="input" data-note placeholder="Optional, e.g. Rent December"></div>' +
      '<div class="err" data-err></div><button class="btn" data-ok>Save</button>', function (el) {
        wirePills(el, function (c) { cat = c; });
        el.querySelector('[data-ok]').onclick = function () {
          var a = num(el.querySelector('[data-amt]').value), err = el.querySelector('[data-err]');
          if (!cat) { err.textContent = 'Choose a category.'; return; }
          if (!(a > 0)) { err.textContent = 'Enter the amount.'; return; }
          this.disabled = true;
          rpc('add_manual', { p_date: el.querySelector('[data-date]').value || d0, p_category: cat, p_amount: a, p_currency: el.querySelector('[data-cur]').value, p_note: el.querySelector('[data-note]').value || null })
            .then(function () { closeModal(); toast('Added · ' + cat); refresh(); }, function (er) { fail(er); el.querySelector('[data-ok]').disabled = false; });
        };
      });
  }

  function listSheet(title, sub, list) {
    modal('<div class="between"><h2>' + esc(title) + '</h2><button class="xbtn" data-close-btn aria-label="Close">' + svg(I.x, 20) + '</button></div>' +
      '<div class="muted">' + sub + '</div>' +
      (list.length ? '<div class="card clip">' + list.map(expRow).join('') + '</div>' : '<div class="card"><div class="empty">No expenses.</div></div>'), function (el) {
        el.querySelectorAll('[data-act="edit"]').forEach(function (b) { b.onclick = function () { var x = findExp(b.dataset.id); if (x) editSheet(x); }; });
      });
  }
  function daySheet(ds) {
    var list = (cache.month || []).filter(function (e) { return e.date === ds; });
    var pers = sum(list.filter(personal)), work = sum(list.filter(function (e) { return e.status === 'done' && e.category === 'Work'; }));
    listSheet(longDate(ds), '<b style="color:var(--ink)">' + fmt(pers) + ' QAR</b> personal' + (work ? ' · Work ' + fmt(work) : ''), list.slice().reverse());
  }

  // ---------- actions ----------
  var actions = {
    mprev: function () { state.m--; if (state.m < 0) { state.m = 11; state.y--; } state.selDay = null; refresh(); },
    mnext: function () { state.m++; if (state.m > 11) { state.m = 0; state.y++; } state.selDay = null; refresh(); },
    yprev: function () { state.year--; refresh(); },
    ynext: function () { state.year++; refresh(); },
    gomonth: function (b) { state.y = state.year; state.m = +b.dataset.m; location.hash = '#/month'; },
    reload: function () { refresh(); toast('Updated'); },
    add: addSheet,
    pick: function (b) { var e = findExp(b.dataset.id); if (e) pickSheet(e); },
    edit: function (b) { var e = findExp(b.dataset.id); if (e) editSheet(e); },
    confirm: function (b) { var e = findExp(b.dataset.id); if (e && e.category) { b.disabled = true; saveParts(e, e.date, e.merchant, e.currency, [{ category: e.category, amount: num(e.amount) }]); } },
    day: function (b) { state.selDay = b.dataset.d; render(); daySheet(b.dataset.d); },
    cat: function (b) {
      var src = b.dataset.scope === 'year' ? cache.year : cache.month, c = b.dataset.c;
      var list = (src || []).filter(function (e) { return e.status === 'done' && (e.category || 'Other') === c; }).sort(function (a, z) { return a.date < z.date ? 1 : -1; });
      listSheet(c, '<b style="color:var(--ink)">' + fmt(sum(list)) + ' QAR</b> · ' + (b.dataset.scope === 'year' ? state.year : MONTHS[state.m] + ' ' + state.y), list);
    },
    copy: function (b) { (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.v) : Promise.reject()).then(function () { toast('Copied'); }, function () { toast('Could not copy'); }); },
    setkey: function () {
      var v = (document.querySelector('[data-newkey]').value || '').trim();
      if (!v) return;
      var old = token; token = v;
      rpc('verify', {}).then(function () { store.set('token', v); toast('Key saved'); location.hash = '#/period'; refresh(); },
        function (e) { token = old; fail(e); });
    }
  };

  // ---------- render / routing ----------
  function tabs() {
    var t = [['/period', 'Period', I.period], ['/month', 'Month', I.month], ['/year', 'Year', I.year], ['/settings', 'Settings', I.settings]];
    return '<nav class="tabs">' + t.map(function (x) { return '<a href="#' + x[0] + '" class="' + (route === x[0] ? 'on' : '') + '">' + svg(x[2], 24) + x[1] + '</a>'; }).join('') + '</nav>';
  }
  function render() {
    var app = document.getElementById('app'), y = window.scrollY;
    if (!token) { app.innerHTML = setupScreen(); return; }
    app.innerHTML = (screens[route] || screens['/period'])() + tabs();
    window.scrollTo(0, y);
  }
  function refresh() {
    render();
    if (!token) return;
    var jobs = [];
    if (route === '/period') jobs.push(loadPending(), loadMonth(state.y, state.m));
    else if (route === '/month') jobs.push(loadMonth(state.y, state.m));
    else if (route === '/year') jobs.push(loadYear(state.year));
    if (jobs.length) Promise.all(jobs).then(render, function (e) { fail(e); render(); });
  }
  function onRoute() {
    var r = (location.hash.replace(/^#/, '').split('?')[0]) || '/period';
    if (!screens[r]) r = '/period';
    var changed = r !== route; route = r;
    if (changed) { window.scrollTo(0, 0); closeModal(); }
    refresh();
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || b.closest('#modal-root')) return;
    var f = actions[b.dataset.act];
    if (f) { ev.preventDefault(); f(b); }
  });
  window.addEventListener('hashchange', onRoute);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { now = new Date(); refresh(); } });

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
  onRoute();
})();

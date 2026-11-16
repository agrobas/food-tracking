// The 5 labels pasted one after another with no separator (what the Shortcut gives without =====)
const C = require('../js/core.js');
const src = require('fs').readFileSync(__dirname + '/labels.test.js', 'utf8');
const texts = [...src.matchAll(/(\w+): \[`([\s\S]*?)`/g)].filter(m => m[1] !== 'quakerColumns').map(m => m[2]);
const joined = texts.join('\n');
const parts = C.splitLabels(joined);
console.log('parts', parts.length);
parts.forEach(p => { const v = C.parseLabel(p); console.log(JSON.stringify({ kcal: v.kcal, p: v.p, c: v.c, f: v.f, ml: v.liquid })); });

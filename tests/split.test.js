// The 5 labels pasted one after another with no separator (what the Shortcut gives without =====)
const C = require('../js/core.js');
const src = require('fs').readFileSync(__dirname + '/labels.test.js', 'utf8');
const texts = [...src.matchAll(/(\w+): \[`([\s\S]*?)`/g)].filter(m => m[1] !== 'quakerColumns').map(m => m[2]);
const joined = texts.join('\n');
const parts = C.splitLabels(joined);
console.log('parts', parts.length);
parts.forEach(p => { const v = C.parseLabel(p); console.log(JSON.stringify({ kcal: v.kcal, p: v.p, c: v.c, f: v.f, ml: v.liquid })); });
const gpt = `Here you go:
=====
**Name:** Early Riser Seed Granola
Per: 100 g
Energy: 503 kcal
Fat: 32.3 g
Carbohydrate: 45.2 g
Protein: 15.5 g
=====
Name: Baladna Skimmed Milk
Per: 100 ml
Energy: 32 kcal
Fat: 0 g
Carbohydrate: 4.8 g
Protein: 3 g`;
C.splitLabels(gpt).forEach(p => { const v = C.parseLabel(p); console.log('gpt', JSON.stringify({ name: v.name, kcal: v.kcal, p: v.p, c: v.c, f: v.f, ml: v.liquid })); });

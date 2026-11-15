const foods = require('../js/foods.js');
const C = require('../js/core.js');
const custom = [
  { id: 'c1', type: 'custom', name: 'My yogurt', basis: 'unit', kcal: 95, p: 4.5, c: 12, f: 3, portions: [] },
  { id: 'c2', type: 'custom', name: 'Mi batido verde', basis: 'unit', unitName: 'glass', kcal: 210, p: 8, c: 34, f: 5, portions: [] }
];
const all = foods.concat(custom);
const cases = [
  'medio aguacate, mi yogur y 2 huevos',
  'half avocado, my yogurt, 2 eggs and a bit of cheese',
  '150 g de pechuga de pollo',
  'una cucharada de aceite de oliva',
  'un café con leche y una tostada integral',
  'un plátano y medio',
  '30g almendras',
  'una rebanada de pan integral',
  'dos vasos de leche semidesnatada',
  'un puñado de nueces',
  'mi batido verde',
  'una lata de coca cola zero',
  'un cuarto de sandia',
  '2 lonchas de jamón serrano y 1,5 tazas de arroz',
  'tomates cherry',
  'un bocadillo de jamón',
  'un poco de queso',
  'lentejas'
];
for (const t of cases) {
  const r = C.parse(t, all);
  console.log('> ' + t);
  r.forEach(x => {
    if (!x.food) return console.log('   ✗ ' + x.text);
    const n = C.nutrition(x.food, x.amount);
    console.log('   ✓ ' + x.food.name + ' — ' + C.amountLabel(x.food, x.amount) + ' — ' + Math.round(n.kcal) + ' kcal' + (x.assumed ? ' (assumed)' : '') + (x.unsure ? ' [CHECK]' : ''));
  });
}
console.log('search "yog":', C.search('yog', all).map(f => f.name).slice(0, 5));
console.log('search "pollo":', C.search('pollo', all).map(f => f.name).slice(0, 5));
console.log('search "aguac":', C.search('aguac', all).map(f => f.name).slice(0, 5));
const c3 = { id: 'c3', type: 'custom', name: 'Mi zumo verde', basis: '100g', kcal: 40, p: 1, c: 9, f: 0, portions: [{ type: 'portion', g: 300, label: 'vaso' }, { type: 'portion', g: 500, label: 'botella' }] };
for (const t of ['2 vasos de mi zumo verde', 'una botella de mi zumo verde', 'mi zumo verde']) {
  const r = C.parse(t, all.concat([c3]))[0];
  console.log('> ' + t + ' → ' + C.amountLabel(r.food, r.amount) + ' ' + Math.round(C.nutrition(r.food, r.amount).kcal) + ' kcal' + (r.unsure ? ' [CHECK]' : ''));
}

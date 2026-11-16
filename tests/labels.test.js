// Label texts as Apple's text recognition (Live Text / Shortcuts "Extract Text") returns them.
const C = require('../js/core.js');
const cases = {
granola: [`Nutrition Facts حقائق غذائية
servings per pack 8
Serving size 1/3 cup (31g)
Amount per serving
Calories 156
% Daily Value*
Total Fat 10g 14%
Saturated Fat 6g 33%
Trans Fat 0g 0%
Cholesterol 0mg 0%
Sodium 2mg 0%
Total Carbohydrate 14g 5%
Dietary Fiber 7g 5%
Total Sugars 4g
Added Sugars 1g 2%
Protein 4.8g 10%
Calcium 20mg 1%
Iron 1mg 7%`, { kcal: 503, p: 15.5, c: 45.2, f: 32.3 }],
quaker: [`INGREDIENTS: Quaker Wholegrain Rolled Oats (85%), Soy Protein (15%), Emulsifier (Soy Lecithin).
TYPICAL NUTRITION INFORMATION
Per 100g Per 37.7g Per 37.7g1(%*)
Energy 1617 kJ 610 kJ 1007 kJ
380 kcal 143 kcal 238 kcal (12%*)
Fat 7.6 g 2.9 g 6.3 g (9%*)
of which Saturates 1.1 g 0.4 g 2.5 g (13%*)
Carbohydrate 53 g 20 g 29 g
of which Sugars 1.2 g 0.4 g 9.6 g (11%*)
Fibre 7.2 g 2.7 g 2.7 g
Protein 22 g 8.1 g 15 g
Salt 0.20 g 0.08 g 0.27 g (5%*)`, { kcal: 380, p: 22, c: 53, f: 7.6 }],
quakerColumns: [`TYPICAL NUTRITION INFORMATION
Per 100g
Energy
Fat
of which Saturates
Carbohydrate
of which Sugars
Fibre
Protein
Salt
1617 kJ
380 kcal
7.6 g
1.1 g
53 g
1.2 g
7.2 g
22 g
0.20 g`, { kcal: 380, p: 22, c: 53, f: 7.6 }],
almond: [`Nutritional Breakdown Per 100g Per 15g
Energy (kJ) 2688 406
Energy (kcal) 650 98
Fat (g) 56 8.4
of which saturates (g) 4.4 0.7
Carbohydrate (g) 6.5 1.0
of which sugars (g) 4.0 0.6
Fibre (g) 12 1.8
Protein (g) 25 3.8
Salt (g) 0 0`, { kcal: 650, p: 25, c: 6.5, f: 56 }],
yogurt: [`Greek Style Fat-Free Plain Yoghurt From Pasteurized & Homogenized Cow's Milk, Max 0.5% Fat, Min 8.5% Milk Solids Non-Fat.
Nutrition Facts
Amount per 100 g serving size
Energy Value 59 Kcal
Total Fat 0.3 g
of which Saturated Fat 0.2 g
of which Trans Fat 0 g
Total Carbohydrates 4 g
of which Added Sugars 0 g
Protein 10 g
Sodium 38 mg`, { kcal: 59, p: 10, c: 4, f: 0.3 }],
milk: [`Long Life Skimmed Milk Homogenized and UHT treated from 100% Fresh Milk, Max 0.5% Fat, Min 8.5% Milk Solids Non-Fat.
Nutrition Facts
Amount per 100 ml serving size
Energy Value 32 Kcal
Total Fat 0 g
of which Saturated Fat 0 g
of which Trans Fat 0 g
Total Carbohydrates 4.8 g
of which Added Sugars 0 g
Protein 3 g
Sodium 35 mg`, { kcal: 32, p: 3, c: 4.8, f: 0, liquid: true }]
};
let fails = 0;
for (const [n, [t, exp]] of Object.entries(cases)) {
  const r = C.parseLabel(t);
  const bad = Object.keys(exp).filter(k => r[k] !== exp[k]);
  if (bad.length) fails++;
  console.log((bad.length ? '✗ ' : '✓ ') + n, JSON.stringify({ kcal: r.kcal, p: r.p, c: r.c, f: r.f, liquid: r.liquid, perServing: r.perServing, serving: r.serving, ok: r.consistent }), bad.length ? 'expected ' + JSON.stringify(exp) : '');
}
console.log(C.splitLabels('a\n=====\nb\n=====\nc').length === 3 ? '✓ split' : '✗ split');
process.exit(fails ? 1 : 0);

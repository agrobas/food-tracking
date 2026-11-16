const C = require('../js/core.js');
const gpt = `Estimación aproximada:
- Hamburguesa con queso: 650–750 kcal (proteína 35 g, hidratos 45 g, grasa 40 g)
- Patatas fritas (ración mediana): 350 kcal
**Total: ~1.050 kcal** · Proteína ~40 g · Hidratos ~95 g · Grasa ~58 g`;
console.log(C.parseEstimate(gpt));
console.log(C.parseEstimate('Around 800 kcal'));
console.log(C.parseEstimate('Calories: 750-850\nProtein: 30 g\nCarbs: 90 g\nFat: 35 g'));
const label = `Información nutricional  Por 100 g  Por ración (125 g)
Valor energético 318 kJ / 76 kcal  398 kJ / 95 kcal
Grasas 3,0 g  3,8 g
de las cuales saturadas 2,0 g 2,5 g
Hidratos de carbono 9,6 g 12 g
de los cuales azúcares 9,6 g 12 g
Proteínas 3,6 g 4,5 g
Sal 0,12 g 0,15 g`;
console.log(C.parseLabel(label));
const foods = require('../js/foods.js');
console.log(JSON.stringify(C.parse('restaurante 800 kcal, medio aguacate', foods).map(r => r.estimate || (r.food && r.food.name))));
console.log(C.parseLabel(`Información nutricional
Por 100g Por ración
318 kJ 398 kJ
Valor energético
76 kcal 95 kcal
Zi lar —
3,09 3,89
Grasas
de las cuales saturadas 2,09 2.59
Hidratos de carbono 9,69 12 g
de los cuales azucares 9,69 12g
Proteínas 3,69 4.59
0,129 0,159
Sal`));
console.log(C.parseLabel(`Nutrition information
Per 100 g Per 45 g
Energy
1960 kj / 468 XtbIkcal
Fat
19g 8.609
of which Saturates
4.1g 1.8g
Carbohydrate
61g 27 g
of which sugars
18 g 8.1g
Fibre
7.5g 34g
Protein
10g 4.59`));
console.log(C.parseLabel(`Información nutricional
Por 100 9 Por ración
318 kJ 398 kJ
Valor energético
76 kcal 95 kcal
= 30g 3,89
Grasas
de las cuales saturadas 2,09 259
Hidratos de carbono 9,69 12g
de los cuales azúcares 9,69 12g
3,69 4,59
Proteínas
0,129 0,159
Sal`));
console.log(C.parseLabel(`Nutrition information
Per 100 g Per 45 g
Energy —. i1960k)/4682tblkcal
Ft 199  B69
of which saturates 4.19 1.89
Carbohydrate 61g 27g
of which sugars 18g 81g
Fibre 7.59 349
Protein 10g 4.59`));

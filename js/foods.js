/* Food tracking — standard food database.
   Reference values per 100 g (or 100 ml for drinks): kcal, protein, carbs, fat.
   Approximate averages from public nutrition tables (USDA / BEDCA); brands vary.
   Row: [name, spanish names "a/b", kcal, protein, carbs, fat, portions, liquid]
   Portions: comma list of type+grams[:label]. Types:
   u unit, sl slice, tbsp, tsp, cup, gl glass, h handful, can, sc scoop, sv serving,
   bw bowl, cl clove, sq square, fi fillet, st strip */
(function (root) {
  var R = [
    // Fruit
    ['Apple', 'manzana', 52, 0.3, 14, 0.2, 'u180:medium'],
    ['Banana', 'platano/banana', 89, 1.1, 23, 0.3, 'u120:medium'],
    ['Orange', 'naranja', 47, 0.9, 12, 0.1, 'u160:medium'],
    ['Mandarin', 'mandarina/clementina', 53, 0.8, 13, 0.3, 'u80'],
    ['Pear', 'pera', 57, 0.4, 15, 0.1, 'u170:medium'],
    ['Peach', 'melocoton', 39, 0.9, 10, 0.3, 'u150:medium'],
    ['Nectarine', 'nectarina', 44, 1.1, 11, 0.3, 'u140'],
    ['Apricot', 'albaricoque', 48, 1.4, 11, 0.4, 'u35'],
    ['Plum', 'ciruela', 46, 0.7, 11, 0.3, 'u65'],
    ['Cherries', 'cerezas/cereza', 63, 1.1, 16, 0.2, 'cup140,h80'],
    ['Grapes', 'uvas/uva', 69, 0.7, 18, 0.2, 'cup150,h80'],
    ['Strawberries', 'fresas/fresa', 32, 0.7, 7.7, 0.3, 'cup150,u12'],
    ['Blueberries', 'arandanos/arandano', 57, 0.7, 14, 0.3, 'cup145,h60'],
    ['Raspberries', 'frambuesas/frambuesa', 52, 1.2, 12, 0.7, 'cup125,h60'],
    ['Kiwi', 'kiwi', 61, 1.1, 15, 0.5, 'u75'],
    ['Mango', 'mango', 60, 0.8, 15, 0.4, 'u200:medium (flesh)'],
    ['Pineapple', 'pina', 50, 0.5, 13, 0.1, 'sl80'],
    ['Watermelon', 'sandia', 30, 0.6, 7.6, 0.2, 'sl280'],
    ['Melon', 'melon', 34, 0.8, 8.2, 0.2, 'sl200'],
    ['Papaya', 'papaya', 43, 0.5, 11, 0.3, 'cup145'],
    ['Pomegranate', 'granada', 83, 1.7, 19, 1.2, 'u180:medium (seeds)'],
    ['Fig', 'higo/higos', 74, 0.8, 19, 0.3, 'u50'],
    ['Medjool dates', 'datiles/datil', 277, 1.8, 75, 0.2, 'u24'],
    ['Avocado', 'aguacate', 160, 2, 8.5, 14.7, 'u150'],
    ['Lemon', 'limon', 29, 1.1, 9, 0.3, 'u60'],
    ['Raisins', 'pasas/uvas pasas', 299, 3.1, 79, 0.5, 'tbsp10,h30'],
    ['Dried apricots', 'orejones/albaricoques secos', 241, 3.4, 63, 0.5, 'u8'],

    // Vegetables
    ['Tomato', 'tomate', 18, 0.9, 3.9, 0.2, 'u120:medium'],
    ['Cherry tomatoes', 'tomates cherry/tomate cherry', 18, 0.9, 3.9, 0.2, 'u15,cup150'],
    ['Cucumber', 'pepino', 15, 0.7, 3.6, 0.1, 'u200'],
    ['Lettuce', 'lechuga', 15, 1.4, 2.9, 0.2, 'cup50,bw80'],
    ['Mixed salad', 'ensalada/ensalada mixta/mezclum', 17, 1.2, 3.3, 0.2, 'bw80'],
    ['Spinach', 'espinacas/espinaca', 23, 2.9, 3.6, 0.4, 'cup30,sv150:serving cooked'],
    ['Arugula', 'rucula', 25, 2.6, 3.7, 0.7, 'cup20'],
    ['Kale', 'kale/col rizada', 35, 2.9, 4.4, 1.5, 'cup20'],
    ['Carrot', 'zanahoria', 41, 0.9, 10, 0.2, 'u60:medium'],
    ['Onion', 'cebolla', 40, 1.1, 9.3, 0.1, 'u110:medium'],
    ['Garlic', 'ajo', 149, 6.4, 33, 0.5, 'cl3'],
    ['Red bell pepper', 'pimiento rojo/pimiento', 31, 1, 6, 0.3, 'u150'],
    ['Green bell pepper', 'pimiento verde', 20, 0.9, 4.6, 0.2, 'u120'],
    ['Zucchini', 'calabacin', 17, 1.2, 3.1, 0.3, 'u200'],
    ['Eggplant', 'berenjena', 25, 1, 6, 0.2, 'u300'],
    ['Broccoli', 'brocoli', 34, 2.8, 6.6, 0.4, 'cup90,sv150'],
    ['Cauliflower', 'coliflor', 25, 1.9, 5, 0.3, 'cup100,sv150'],
    ['Green beans', 'judias verdes/judia verde', 31, 1.8, 7, 0.2, 'sv150'],
    ['Peas', 'guisantes', 81, 5.4, 14, 0.4, 'cup145,sv100'],
    ['Sweet corn', 'maiz', 86, 3.3, 19, 1.4, 'cup150,can140,tbsp15'],
    ['Mushrooms', 'champinones/setas/champinon', 22, 3.1, 3.3, 0.3, 'cup70,sv150'],
    ['Potato, boiled', 'patata/patata cocida/patatas', 87, 1.9, 20, 0.1, 'u170:medium'],
    ['Sweet potato, baked', 'boniato/batata', 90, 2, 21, 0.2, 'u150:medium'],
    ['French fries', 'patatas fritas/papas fritas', 312, 3.4, 41, 15, 'sv120'],
    ['Asparagus', 'esparragos/esparrago', 20, 2.2, 3.9, 0.1, 'u16:spear'],
    ['Cabbage', 'repollo/col', 25, 1.3, 5.8, 0.1, 'cup90'],
    ['Beetroot, cooked', 'remolacha', 44, 1.7, 10, 0.2, 'u80'],
    ['Celery', 'apio', 16, 0.7, 3, 0.2, 'u40:stalk'],
    ['Leek', 'puerro', 61, 1.5, 14, 0.3, 'u90'],
    ['Artichoke', 'alcachofa/alcachofas', 47, 3.3, 11, 0.2, 'u120'],
    ['Pumpkin', 'calabaza', 26, 1, 6.5, 0.1, 'cup120'],
    ['Green olives', 'aceitunas/aceituna/olivas', 145, 1, 3.8, 15, 'u4'],
    ['Gazpacho', 'gazpacho', 40, 0.9, 4, 2.5, 'gl250', 1],

    // Legumes & soy
    ['Lentils, cooked', 'lentejas', 116, 9, 20, 0.4, 'sv200'],
    ['Chickpeas, cooked', 'garbanzos', 164, 8.9, 27, 2.6, 'sv200'],
    ['Black beans, cooked', 'alubias negras/frijoles negros/frijoles', 132, 8.9, 24, 0.5, 'sv200'],
    ['White beans, cooked', 'alubias blancas/alubias/judias blancas', 139, 9.7, 25, 0.4, 'sv200'],
    ['Kidney beans, cooked', 'alubias rojas', 127, 8.7, 23, 0.5, 'sv200'],
    ['Hummus', 'hummus/humus', 166, 7.9, 14, 9.6, 'tbsp15'],
    ['Edamame', 'edamame', 121, 12, 9, 5, 'cup155'],
    ['Tofu, firm', 'tofu', 144, 15.8, 2.8, 8.7, 'sv100'],
    ['Tempeh', 'tempeh', 192, 20, 7.6, 11, 'sv100'],

    // Grains, bread & cereals
    ['White rice, cooked', 'arroz/arroz blanco/arroz cocido', 130, 2.7, 28, 0.3, 'cup160,sv150'],
    ['Brown rice, cooked', 'arroz integral', 123, 2.7, 26, 1, 'cup160,sv150'],
    ['Pasta, cooked', 'pasta/macarrones/espaguetis/spaghetti', 158, 5.8, 31, 0.9, 'sv200'],
    ['Pasta, dry', 'pasta cruda/pasta seca', 371, 13, 75, 1.5, 'sv80'],
    ['Wholegrain pasta, cooked', 'pasta integral', 149, 6, 30, 1.7, 'sv200'],
    ['Quinoa, cooked', 'quinoa', 120, 4.4, 21, 1.9, 'cup185,sv150'],
    ['Couscous, cooked', 'cuscus', 112, 3.8, 23, 0.2, 'cup160,sv150'],
    ['Oats', 'avena/copos de avena', 379, 13.2, 67.7, 6.5, 'sv40,tbsp10'],
    ['White bread', 'pan/pan blanco/pan de molde', 265, 9, 49, 3.2, 'sl30'],
    ['Wholegrain bread', 'pan integral/tostada integral', 247, 13, 41, 3.4, 'sl35'],
    ['Baguette', 'barra de pan/baguette/pan de barra', 277, 9, 56, 1.6, 'u60:piece'],
    ['Wheat tortilla', 'tortilla de trigo/wrap', 312, 8.3, 52, 8, 'u45'],
    ['Corn tortilla', 'tortilla de maiz', 218, 5.7, 45, 2.9, 'u26'],
    ['Bagel', 'bagel', 257, 10, 50, 1.6, 'u100'],
    ['Croissant', 'croissant/cruasan', 406, 8.2, 46, 21, 'u60'],
    ['Rice cakes', 'tortitas de arroz/tortita de arroz', 387, 8.2, 81, 2.8, 'u9'],
    ['Crackers', 'galletas saladas/crackers', 430, 9, 71, 12, 'u5'],
    ['Corn flakes', 'cereales/copos de maiz/corn flakes', 357, 7.5, 84, 0.4, 'sv30'],
    ['Granola', 'granola', 471, 10, 64, 20, 'sv45'],
    ['Muesli', 'muesli', 368, 10, 66, 6, 'sv45'],
    ['Pancakes', 'tortitas/pancakes', 227, 6.4, 28, 9.7, 'u40'],

    // Eggs & dairy
    ['Egg', 'huevo/huevos/huevo cocido', 155, 13, 1.1, 11, 'u55:medium'],
    ['Egg white', 'clara/claras/clara de huevo', 52, 11, 0.7, 0.2, 'u33'],
    ['Fried egg', 'huevo frito', 196, 13.6, 0.8, 15, 'u46'],
    ['Omelette', 'tortilla francesa', 154, 10.6, 0.6, 11.7, 'u120:2 eggs'],
    ['Scrambled eggs', 'huevos revueltos/revuelto', 148, 10, 1.6, 11, 'sv120'],
    ['Whole milk', 'leche/leche entera', 61, 3.2, 4.8, 3.3, 'gl250,cup200', 1],
    ['Semi-skimmed milk', 'leche semidesnatada', 46, 3.4, 4.8, 1.6, 'gl250,cup200', 1],
    ['Skimmed milk', 'leche desnatada', 34, 3.4, 5, 0.1, 'gl250,cup200', 1],
    ['Plain yogurt', 'yogur/yogur natural/yogurt', 61, 3.5, 4.7, 3.3, 'u125'],
    ['Greek yogurt', 'yogur griego', 97, 9, 4, 5, 'u125'],
    ['Greek yogurt 0%', 'yogur griego desnatado/yogur 0', 59, 10, 3.6, 0.4, 'u125'],
    ['Skyr', 'skyr', 63, 11, 4, 0.2, 'u150'],
    ['Kefir', 'kefir', 41, 3.6, 4.5, 1, 'gl250', 1],
    ['Cottage cheese', 'queso cottage/requeson', 98, 11, 3.4, 4.3, 'sv100'],
    ['Mozzarella', 'mozzarella', 280, 20, 2, 21, 'u125:ball,sl20'],
    ['Cheddar', 'queso cheddar/cheddar', 403, 25, 1.3, 33, 'sl20'],
    ['Cured cheese', 'queso curado/manchego/queso/cheese', 410, 28, 0.5, 33, 'sl15'],
    ['Parmesan', 'parmesano/queso parmesano', 431, 38, 4, 29, 'tbsp5'],
    ['Feta', 'feta/queso feta', 264, 14, 4, 21, 'sv30'],
    ['Brie', 'brie/queso brie', 334, 21, 0.5, 28, 'sl25'],
    ['Goat cheese', 'queso de cabra/rulo de cabra', 364, 22, 0, 30, 'sl20'],
    ['Cream cheese', 'queso crema/philadelphia', 342, 6, 4, 34, 'tbsp15'],
    ['Butter', 'mantequilla', 717, 0.9, 0.1, 81, 'tsp5,tbsp14'],
    ['Cream', 'nata', 340, 2.8, 2.7, 36, 'tbsp15'],
    ['Vanilla ice cream', 'helado/helado de vainilla', 207, 3.5, 24, 11, 'sc65'],

    // Meat & charcuterie
    ['Chicken breast, grilled', 'pechuga de pollo/pollo/pechuga', 165, 31, 0, 3.6, 'fi150'],
    ['Chicken breast, raw', 'pechuga de pollo cruda', 120, 22.5, 0, 2.6, 'fi150'],
    ['Chicken thigh, cooked', 'muslo de pollo/contramuslo', 209, 26, 0, 10.9, 'u100'],
    ['Turkey breast, sliced', 'pechuga de pavo/pavo/fiambre de pavo', 104, 17, 4.2, 1.7, 'sl20'],
    ['Cooked ham', 'jamon york/jamon cocido', 115, 18, 1.5, 4, 'sl15'],
    ['Serrano ham', 'jamon serrano/jamon iberico/jamon', 241, 31, 0.3, 13, 'sl15'],
    ['Chorizo', 'chorizo', 455, 24, 2, 38, 'sl10'],
    ['Salami', 'salami/salchichon', 336, 22, 1.2, 26, 'sl10'],
    ['Bacon, cooked', 'bacon/beicon/panceta', 541, 37, 1.4, 42, 'st8'],
    ['Pork loin, cooked', 'lomo de cerdo/lomo/cerdo', 196, 27, 0, 9, 'fi150'],
    ['Beef steak, cooked', 'filete de ternera/ternera/bistec/entrecot', 206, 29, 0, 9.5, 'fi150'],
    ['Ground beef, cooked', 'carne picada', 250, 26, 0, 15, 'sv100'],
    ['Beef burger patty', 'hamburguesa/carne de hamburguesa', 250, 24, 0, 17, 'u100'],
    ['Lamb, cooked', 'cordero', 294, 25, 0, 21, 'sv150'],
    ['Pork sausage, cooked', 'salchicha/salchichas', 300, 14, 2, 26, 'u50'],

    // Fish & seafood
    ['Salmon, cooked', 'salmon', 206, 22, 0, 12, 'fi150'],
    ['Smoked salmon', 'salmon ahumado', 117, 18, 0, 4.3, 'sl20'],
    ['Tuna in water, canned', 'atun al natural/atun', 116, 26, 0, 0.8, 'can56'],
    ['Tuna in oil, drained', 'atun en aceite', 198, 29, 0, 8.2, 'can56'],
    ['Tuna steak, cooked', 'atun fresco', 130, 29, 0, 1.3, 'fi150'],
    ['Hake, cooked', 'merluza/pescado blanco', 90, 19, 0, 1.3, 'fi150'],
    ['Cod, cooked', 'bacalao', 105, 23, 0, 0.9, 'fi150'],
    ['Sea bass, cooked', 'lubina/dorada', 124, 24, 0, 2.6, 'fi150'],
    ['Sardines, in oil', 'sardinas/sardina', 208, 25, 0, 11, 'u25'],
    ['Shrimp, cooked', 'gambas/langostinos/gamba', 99, 24, 0.2, 0.3, 'sv100'],
    ['Mussels, cooked', 'mejillones', 172, 24, 7.4, 4.5, 'sv100'],
    ['Squid, grilled', 'calamar/calamares/sepia', 92, 15.6, 3.1, 1.4, 'sv150'],
    ['Octopus, cooked', 'pulpo', 164, 30, 4.4, 2.1, 'sv150'],

    // Nuts, seeds, fats & spreads
    ['Almonds', 'almendras/almendra', 579, 21, 22, 50, 'h30,u1.2'],
    ['Walnuts', 'nueces/nuez', 654, 15, 14, 65, 'h30,u5'],
    ['Peanuts', 'cacahuetes/cacahuete/mani', 567, 26, 16, 49, 'h30'],
    ['Cashews', 'anacardos', 553, 18, 30, 44, 'h30'],
    ['Pistachios', 'pistachos', 560, 20, 28, 45, 'h30'],
    ['Hazelnuts', 'avellanas', 628, 15, 17, 61, 'h30'],
    ['Sunflower seeds', 'pipas/semillas de girasol', 584, 21, 20, 51, 'tbsp10,h30'],
    ['Chia seeds', 'chia/semillas de chia', 486, 17, 42, 31, 'tbsp12'],
    ['Flax seeds', 'lino/semillas de lino/linaza', 534, 18, 29, 42, 'tbsp10'],
    ['Peanut butter', 'crema de cacahuete/mantequilla de cacahuete', 588, 25, 20, 50, 'tbsp16'],
    ['Olive oil', 'aceite de oliva/aceite/aove', 884, 0, 0, 100, 'tbsp13,tsp4.5'],
    ['Sunflower oil', 'aceite de girasol', 884, 0, 0, 100, 'tbsp13,tsp4.5'],
    ['Mayonnaise', 'mayonesa', 680, 1, 0.6, 75, 'tbsp14'],
    ['Ketchup', 'ketchup/catchup', 101, 1, 27, 0.1, 'tbsp17'],
    ['Mustard', 'mostaza', 66, 4, 5.8, 3.3, 'tsp5'],
    ['Fried tomato sauce', 'tomate frito/salsa de tomate', 75, 1.4, 9, 3.6, 'tbsp15'],
    ['Sugar', 'azucar', 387, 0, 100, 0, 'tsp4'],
    ['Honey', 'miel', 304, 0.3, 82, 0, 'tsp7,tbsp21'],
    ['Jam', 'mermelada/confitura', 250, 0.4, 62, 0.1, 'tbsp20'],
    ['Dark chocolate 70%', 'chocolate negro', 598, 7.8, 46, 43, 'sq10'],
    ['Milk chocolate', 'chocolate con leche/chocolate', 535, 7.7, 59, 30, 'sq10'],
    ['Chocolate hazelnut spread', 'nutella/nocilla/crema de cacao', 539, 6.3, 57.5, 31, 'tbsp15'],

    // Drinks
    ['Coffee, black', 'cafe/cafe solo/espresso/americano', 2, 0.1, 0, 0, 'cup30:espresso,u200:mug', 1],
    ['Coffee with milk', 'cafe con leche/cortado/capuchino/latte', 32, 1.7, 2.5, 1.6, 'cup200', 1],
    ['Tea', 'te/infusion', 1, 0, 0.3, 0, 'cup250', 1],
    ['Orange juice', 'zumo de naranja/zumo', 45, 0.7, 10, 0.2, 'gl200', 1],
    ['Apple juice', 'zumo de manzana', 46, 0.1, 11, 0.1, 'gl200', 1],
    ['Cola', 'coca cola/cola/refresco', 42, 0, 10.6, 0, 'can330', 1],
    ['Cola zero', 'coca cola zero/cola zero/refresco zero/light', 0.3, 0, 0, 0, 'can330', 1],
    ['Beer', 'cerveza/cana', 43, 0.5, 3.6, 0, 'can330,gl200:small glass (caña)', 1],
    ['Red wine', 'vino tinto/vino', 85, 0.1, 2.6, 0, 'gl150', 1],
    ['White wine', 'vino blanco', 82, 0.1, 2.6, 0, 'gl150', 1],
    ['Soy milk', 'bebida de soja/leche de soja', 33, 2.9, 1.7, 1.6, 'gl250', 1],
    ['Almond milk, unsweetened', 'bebida de almendras/leche de almendras', 15, 0.6, 0.3, 1.2, 'gl250', 1],
    ['Oat milk', 'bebida de avena/leche de avena', 46, 1, 6.7, 1.5, 'gl250', 1],
    ['Whey protein powder', 'proteina/whey/batido de proteina', 400, 78, 8, 6, 'sc30'],

    // Dishes & snacks
    ['Spanish omelette', 'tortilla de patatas/tortilla espanola/tortilla', 165, 6.5, 12, 10, 'sl120:slice (pincho)'],
    ['Paella', 'paella/arroz con pollo', 150, 7, 20, 5, 'sv300'],
    ['Ham croquette', 'croquetas/croqueta', 230, 8, 22, 12, 'u30'],
    ['Pizza margherita', 'pizza', 266, 11, 33, 10, 'sl110'],
    ['Hamburger (bun + patty)', 'hamburguesa completa/burger', 254, 13, 30, 9, 'u220'],
    ['Lasagna', 'lasana', 135, 8, 13, 5, 'sv300'],
    ['Sushi roll', 'sushi/maki/nigiri', 150, 6, 24, 3, 'u30:piece'],
    ['Potato chips', 'patatas fritas de bolsa/chips', 536, 7, 53, 35, 'sv30:small bag'],
    ['Popcorn', 'palomitas', 387, 13, 78, 4.5, 'cup8,bw30'],
    ['Maria biscuits', 'galletas maria/galletas/galleta', 440, 7, 74, 12, 'u6'],
    ['Digestive biscuits', 'galletas digestive', 471, 7, 63, 21, 'u15'],
    ['Muffin', 'magdalena/muffin', 377, 5, 53, 16, 'u60'],
    ['Doughnut', 'donut/rosquilla', 421, 5, 50, 23, 'u60']
  ];

  var TYPES = {
    u: 'unit', sl: 'slice', tbsp: 'tbsp', tsp: 'tsp', cup: 'cup', gl: 'glass', h: 'handful',
    can: 'can', sc: 'scoop', sv: 'serving', bw: 'bowl', cl: 'clove', sq: 'square', fi: 'fillet', st: 'strip'
  };

  function slug(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  var foods = R.map(function (r) {
    var portions = (r[6] || '').split(',').filter(Boolean).map(function (p) {
      var m = p.match(/^([a-z]+)([\d.]+)(?::(.+))?$/);
      return { type: TYPES[m[1]], g: parseFloat(m[2]), label: m[3] || '' };
    });
    return {
      id: 'std-' + slug(r[0]),
      type: 'standard',
      name: r[0],
      es: r[1],
      basis: '100g',
      kcal: r[2], p: r[3], c: r[4], f: r[5],
      portions: portions,
      liquid: !!r[7],
      builtin: true
    };
  });

  root.FT_FOODS = foods;
  if (typeof module !== 'undefined') module.exports = foods;
})(typeof window !== 'undefined' ? window : globalThis);

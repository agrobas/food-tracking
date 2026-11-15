# Food tracking

Personal calorie and macro tracker for iPhone. It is a web app you add to the Home Screen: it works offline and keeps all data on the phone (Settings → Back up saves a copy to Files / iCloud Drive).

- **Log**: five meals (Breakfast, Lunch, Afternoon snack, Dinner, Extra), daily goal and macros, previous/next day.
- **Quick entry**: type or dictate (“medio aguacate, mi yogur y 2 huevos”) and the app finds the foods and amounts. No AI needed; anything it is unsure about is marked for you to check.
- **Foods**: ~190 standard foods (kcal, protein, carbs, fat per 100 g, with portions), your custom foods (per 100 g or per unit, with photo on a white background) and *My meals*.
- **History**: week, month and year.

Standard values are approximate reference values from public nutrition tables.

## Install on iPhone
1. Open https://agrobas.github.io/food-tracking/ in Safari.
2. Share → **Add to Home Screen**.

## Develop
Plain HTML/CSS/JS, no build step. `node tests/parser.test.js` runs the quick-entry examples.
When you change files, bump `CACHE` in `sw.js` so phones pick up the new version.

# Food tracking

Personal calorie and macro tracker for iPhone. It is a web app you add to the Home Screen: it works offline and keeps all data on the phone (Settings → Back up saves a copy to Files / iCloud Drive).

- **Log**: five meals (Breakfast, Lunch, Afternoon snack, Dinner, Extra), daily goal and macros, previous/next day.
- **Quick entry**: type or dictate (“medio aguacate, mi yogur y 2 huevos”) and the app finds the foods and amounts. No AI needed; anything it is unsure about is marked for you to check.
- **Foods**: ~190 standard foods (kcal, protein, carbs, fat per 100 g, with portions), your custom foods (per 100 g or per unit, with photo on a white background) and *My meals*.
- **Unknown / estimate**: log a restaurant meal as ~800 kcal, or paste an answer (e.g. from ChatGPT) and the calories and macros are filled in. In Quick entry, “restaurante 800 kcal” works too.
- **Scan labels**: in Foods → Scan labels, choose one or many photos of nutrition tables; the app reads them on the phone with PaddleOCR (open source, offline after a ~40 MB first download). It handles per 100 g / 100 ml and US "per serving" labels. You can also paste an answer from ChatGPT (the app gives you the prompt). Review, name and save them one by one or all together.
- **Favorites**: tap the star next to any food.
- **Log with Siri** (Settings → Siri): an “Apunta comida” shortcut sends what you dictate to a private ntfy.sh topic; the app picks it up when opened and logs it with the time and meal you said it. Anything unclear waits on the Log screen to review.
- **My meals** with their own photo.
- **Export to Excel** (Settings): daily totals and every food logged, for this month, last month, this year or everything.
- **History**: week, month and year.

Standard values are approximate reference values from public nutrition tables.

## Install on iPhone
1. Open https://agrobas.github.io/food-tracking/ in Safari.
2. Share → **Add to Home Screen**.

## Develop
Plain HTML/CSS/JS, no build step. `node tests/parser.test.js` runs the quick-entry examples.
When you change files, bump `CACHE` in `sw.js` so phones pick up the new version.

## Expenses (in `expenses/`)
A second app in this repo: personal expense tracker in QAR. Open https://agrobas.github.io/food-tracking/expenses/ with the setup link (it carries your private key), then Share → **Add to Home Screen**.

- **Period**: pending payments from Apple Pay (change amount, category, split; the last part is calculated for you), **Add extra** for rent, transfers or cash, total and total by category for the month. Work is shown apart and left out of the personal total.
- **Month**: calendar with the daily spend; tap a day to see its expenses.
- **Year**: January–December totals and the year by category.
- **Apple Pay**: a Shortcuts automation (Transaction trigger) sends each payment with your location and asks for the category; steps in Settings.

Data lives in a free Supabase project, reachable only through functions that check the private key (the key is not in this repo). Bump `CACHE` in `expenses/sw.js` when you change files.

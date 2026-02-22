# Gilded Age Tycoon

A browser-based clicker/progression game themed around 1890s industrial growth.

## Run Locally

1. Open the project folder.
2. Double-click `index.html` to run it in your browser.

Optional (local server):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Features

- Click to earn cash.
- Buy businesses for passive income:
  - Newsstand
  - Textile Mill
  - Steelworks
  - Rail Line
  - Oil Refinery
  - Bank/Trust
- Purchase quantity options for businesses: `1x`, `10x`, `100x`, and `Max`.
- Business prices scale by 13% per purchase.
- Custom themed icons for each business and each upgrade.
- Upgrades unlock at ownership thresholds and apply multipliers.
- Expanded upgrade tech trees: each business branch has 5 chained upgrades with threshold + prerequisite requirements.
- Secret steampunk module:
  - After the first 26 baseline upgrades are purchased, a hidden ultra-expensive upgrade appears.
  - Purchasing it unlocks 5 steampunk businesses and 25 steampunk upgrades.
  - Steampunk businesses and upgrades are significantly higher-cost and higher-income than the base game.
- Upgrade panel now renders as a visual tree view grouped by business branch with tier progression cards.
- Tree branches are collapsed by default to show only the current upgrade and immediate next upgrade; use each branch toggle to expand full history/future tiers.
- Built-in analytics charts:
  - Income rate over time (line chart)
  - Income source allocation by business type (pie chart + legend)
- Prestige system: at $1,000,000 cash you can **Incorporate**:
  - Resets cash, businesses, and upgrades
  - Grants permanent **Influence** based on cash at incorporation time
  - Influence gives a permanent global income bonus (+3% per Influence)
  - Can be done multiple times; incorporation threshold increases after each incorporation
- Displays Cash, Income/sec, and Net Worth.
- Large-number formatting (K, M, B, etc.).
- Auto-save to `localStorage` every 5 seconds and on key actions.
- Save safety tools:
  - Reset Save
  - Export Save (JSON)
  - Import Save (JSON)

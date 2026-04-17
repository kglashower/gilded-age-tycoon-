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

Note: PWA/offline mode requires serving over `http://localhost` (for local development) or `https` (for deployed builds). It will not work from `file://`.

## iOS Offline PWA

1. Serve the game from `http://localhost` or an `https` URL.
2. Open the game in Safari on iOS.
3. Tap Share -> Add to Home Screen.
4. Launch from the home screen icon for standalone/offline behavior.

## Features

### Core Progression

- Click to earn cash.
- Passive income from owned businesses.
- Buy quantity modes: `1x`, `10x`, `100x`, `Max`.
- Dynamic ROI shown per business card using marginal gain from the next purchase.
- Business prices use a two-phase exponential curve:
  - Early game (`0-68` owned): `13%` growth per purchase.
  - Post-softcap (`69+` owned): `6.5%` growth per purchase.
- Price reduction systems stack multiplicatively:
  - Permanent achievement discounts (persist across Incorporation).
  - Run-based Tier 4/5 upgrade discounts per business branch.
- Owned businesses gain an efficiency bonus that scales with holdings, helping earlier tiers remain relevant in later stages.

### Businesses

- Base businesses:
  - Newsstand
  - Textile Mill
  - Steelworks
  - Rail Line
  - Oil Refinery
  - Bank/Trust
- Secret steampunk businesses (unlock later):
  - Aether Foundry
  - Clockwork Automata Works
  - Zeppelin Dockyard
  - Tesla Exchange
  - Chronometer Vault

### Upgrades

- Tech-tree upgrades with prerequisites (5 tiers per branch).
- Upgrade pacing rebalanced:
  - Higher ownership thresholds.
  - More moderate multipliers.
  - Higher upgrade cost factors.
- Visual tree grouped by business.
- Branches are collapsed by default to show current + next upgrade.
- On mobile, the entire Upgrades section can be collapsed via Show/Hide button.
- When collapsed on mobile, an indicator shows how many upgrades are currently available (unlocked + affordable).
- Tier 4 and Tier 5 upgrades also reduce future purchase cost for that business type.

### Secret Steampunk Module

- After the first 26 baseline upgrades are purchased, a hidden upgrade appears.
- This secret upgrade is priced at least an order of magnitude above the most expensive of those 26.
- Purchasing it unlocks:
  - 5 steampunk businesses
  - 25 steampunk upgrades (5 per steampunk business)
- Steampunk progression has been rebalanced to avoid runaway scaling:
  - Higher base business costs.
  - Lower income-to-cost efficiency.
  - Slower, more expensive upgrade ramp.

### Achievements

- Achievement panel is hidden until the first achievement is unlocked.
- Achievements unlock automatically.
- For each business type, achievements unlock at doubling milestones starting at `100`:
  - `100`, `200`, `400`, `800`, `1,600`, ... up to `1,000,000`
- Each unlocked achievement gives a permanent `10%` purchase-price reduction for that business type.
- Achievement benefits persist through Incorporations.

### Incorporation (Prestige)

- Incorporation can be repeated multiple times.
- Incorporation cost increases exponentially after each Incorporation.
- Influence gain is based on the square root of surplus cash after subtracting the current incorporation cost.
- Incorporating resets run progression (cash, businesses, upgrades), but keeps long-term progression systems.
- Influence provides a permanent global income bonus (`+3%` per Influence).
- Incorporation thresholds continue to scale upward each time.

### Analytics

- Income Rate line chart (10-minute window).
- Income Allocation pie chart by business type with legend.

### Mobile Experience

- Mobile browser detection with dedicated mobile layout mode.
- Mobile flow order:
  - Ledger
  - Businesses
  - Upgrades
  - Incorporation
  - Analytics
  - Achievements
  - Save Tools
- Floating cash box appears in mobile mode when Ledger is off-screen.

### Save / Data Safety

- Auto-save every 5 seconds and on key actions.
- Save compatibility includes rebalance fields (business-level run price multipliers are reconstructed from purchased upgrades on load).
- Save tools:
  - Reset Save
  - Export Save (JSON)
  - Import Save (JSON)

### Number Formatting

- Compact formatting supports large values through Novemdecillion (`10^60`).

### PWA / Offline

- Web app manifest and service worker included.
- Offline-capable when served over `http://localhost` or `https`.
- On launch, the app checks for a fresh service worker version.
- If the server cannot be reached quickly, navigation falls back to the most recently cached build instead of blocking startup.
- Home-screen icon support configured for Android and iOS:
  - Manifest icons (`192x192`, `512x512`, including maskable purpose).
  - Apple touch icon (`180x180`) and mobile web app metadata.
- If icon changes are not visible on iOS, remove the existing home-screen app and add it again (Safari aggressively caches icons/metadata).

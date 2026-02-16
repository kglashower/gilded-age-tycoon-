"use strict";

const SAVE_KEY = "gildedAgeTycoonSaveV1";
const AUTO_SAVE_MS = 5000;
const PRICE_GROWTH = 1.13;
const PRESTIGE_THRESHOLD = 1000000;
const INCORPORATION_THRESHOLD_GROWTH = 3;
const INFLUENCE_BONUS_PER_POINT = 0.03;
const BUY_MODES = ["1", "10", "100", "max"];
const ANALYTICS_SAMPLE_SECONDS = 1;
const ANALYTICS_MAX_POINTS = 600;
const ANALYTICS_DRAW_INTERVAL_MS = 250;
const BUSINESS_COLORS = {
  newsstand: "#6f4e2a",
  textile: "#90703f",
  steel: "#5e676d",
  rail: "#8a5f2a",
  oil: "#2e2e2e",
  bank: "#b08a3c"
};

const BUSINESS_DEFS = [
  { id: "newsstand", name: "Newsstand", basePrice: 12, baseIncome: 0.14, icon: "assets/icons/newsstand.svg" },
  { id: "textile", name: "Textile Mill", basePrice: 95, baseIncome: 0.95, icon: "assets/icons/textile.svg" },
  { id: "steel", name: "Steelworks", basePrice: 720, baseIncome: 7.2, icon: "assets/icons/steel.svg" },
  { id: "rail", name: "Rail Line", basePrice: 5200, baseIncome: 52, icon: "assets/icons/rail.svg" },
  { id: "oil", name: "Oil Refinery", basePrice: 36000, baseIncome: 300, icon: "assets/icons/oil.svg" },
  { id: "bank", name: "Bank/Trust", basePrice: 220000, baseIncome: 1850, icon: "assets/icons/bank.svg" }
];

const TECH_TREE_TIER_DEFS = [
  { key: "mechanization", name: "Mechanized Works", threshold: 5, multiplier: 1.35, costFactor: 14 },
  { key: "telegraph", name: "Telegraph Dispatch", threshold: 14, multiplier: 1.6, costFactor: 60 },
  { key: "trusts", name: "Vertical Trust Charters", threshold: 28, multiplier: 1.9, costFactor: 240 },
  { key: "electrification", name: "Urban Electrification", threshold: 46, multiplier: 2.3, costFactor: 920 },
  { key: "continental", name: "Continental Syndicate", threshold: 70, multiplier: 2.8, costFactor: 3600 }
];

const BUSINESS_UPGRADE_NAMES = {
  newsstand: [
    "Street-Corner Broadsheets",
    "Telegraph Bulletin Feed",
    "Sunday Edition Network",
    "Rotary Press Fleet",
    "National News Syndicate"
  ],
  textile: [
    "Power Loom Arrays",
    "Cotton Exchange Contracts",
    "Dyeworks Standardization",
    "Automated Spindle Floors",
    "Continental Cloth Combine"
  ],
  steel: [
    "Open-Hearth Furnaces",
    "Rail Beam Rolling Mill",
    "Ore Freight Agreements",
    "Pneumatic Converter Lines",
    "National Steel Trust"
  ],
  rail: [
    "Standard Gauge Overhaul",
    "Timed Junction Dispatch",
    "Freight Corridor Rights",
    "Sleeping Car Expansion",
    "Transcontinental Merger"
  ],
  oil: [
    "Kerosene Fraction Towers",
    "Pipeline Easement Rights",
    "Barrel Depot Network",
    "Thermal Cracking Yards",
    "National Refining Cartel"
  ],
  bank: [
    "Clearing House Accords",
    "Municipal Bond Desk",
    "Industrial Loan Pool",
    "Interstate Credit Bureau",
    "Federal Trust Consolidation"
  ]
};

function createBusinessTechTreeUpgrades() {
  const upgrades = [];

  for (const business of BUSINESS_DEFS) {
    for (let tierIndex = 0; tierIndex < TECH_TREE_TIER_DEFS.length; tierIndex += 1) {
      const tier = TECH_TREE_TIER_DEFS[tierIndex];
      const previousTier = TECH_TREE_TIER_DEFS[tierIndex - 1];
      const businessTierNames = BUSINESS_UPGRADE_NAMES[business.id] || [];
      const tierName = businessTierNames[tierIndex] || `${business.name} ${tier.name}`;
      const id = `${business.id}_${tier.key}`;
      const cost = Math.round(business.basePrice * tier.costFactor);
      const roundedMultiplier = Number(tier.multiplier.toFixed(2));

      upgrades.push({
        id,
        name: tierName,
        desc: `${business.name} output is multiplied by ${roundedMultiplier}x.`,
        businessId: business.id,
        threshold: tier.threshold,
        multiplier: roundedMultiplier,
        cost,
        prerequisiteId: previousTier ? `${business.id}_${previousTier.key}` : null,
        icon: business.icon
      });
    }
  }

  return upgrades;
}

const UPGRADE_DEFS = [
  ...createBusinessTechTreeUpgrades(),
  {
    id: "city_marketing",
    name: "Citywide Campaign",
    desc: "Manual clicks are 3x stronger.",
    businessId: null,
    threshold: 16,
    multiplier: 3,
    cost: 6000,
    clickUpgrade: true,
    prerequisiteId: null,
    icon: "assets/icons/upgrade-campaign.svg"
  }
];
const UPGRADE_BY_ID = Object.fromEntries(UPGRADE_DEFS.map((upgrade) => [upgrade.id, upgrade]));
const SPECIAL_UPGRADES = UPGRADE_DEFS.filter((upgrade) => !upgrade.businessId);

const state = {
  cash: 0,
  businesses: {},
  upgrades: {},
  clickPower: 1,
  influence: 0,
  incorporations: 0,
  lifetimeEarnings: 0,
  incomePerSec: 0,
  netWorth: 0,
  buyMode: "1",
  analytics: {
    incomeHistory: [],
    sampleAccumulator: 0,
    lastDrawAt: 0
  },
  lastSavedAt: Date.now(),
  lastTickTime: performance.now()
};

const els = {
  cashValue: document.getElementById("cashValue"),
  incomeValue: document.getElementById("incomeValue"),
  netWorthValue: document.getElementById("netWorthValue"),
  clickValue: document.getElementById("clickValue"),
  influenceValue: document.getElementById("influenceValue"),
  lifetimeValue: document.getElementById("lifetimeValue"),
  prestigeBonusValue: document.getElementById("prestigeBonusValue"),
  incorporateThresholdText: document.getElementById("incorporateThresholdText"),
  incorporateGain: document.getElementById("incorporateGain"),
  incorporateButton: document.getElementById("incorporateButton"),
  earnButton: document.getElementById("earnButton"),
  businessList: document.getElementById("businessList"),
  upgradeList: document.getElementById("upgradeList"),
  exportButton: document.getElementById("exportButton"),
  importButton: document.getElementById("importButton"),
  resetButton: document.getElementById("resetButton"),
  saveData: document.getElementById("saveData"),
  awayNotice: document.getElementById("awayNotice"),
  buyModeButtons: Array.from(document.querySelectorAll(".buy-mode-button")),
  incomeLineChart: document.getElementById("incomeLineChart"),
  incomePieChart: document.getElementById("incomePieChart"),
  incomeAllocationLegend: document.getElementById("incomeAllocationLegend")
};

const ui = {
  businessCards: {},
  upgradeCards: {},
  upgradeBranches: {}
};

function isLikelyMobileBrowser() {
  const ua = navigator.userAgent || "";
  const mobileUa = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(ua);
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrowViewport = window.matchMedia("(max-width: 920px)").matches;
  return mobileUa || (coarsePointer && narrowViewport);
}

function applyMobileBrowserMode() {
  document.body.classList.toggle("mobile-browser", isLikelyMobileBrowser());
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const abs = Math.abs(value);
  if (abs < 1000) {
    return value.toFixed(abs >= 100 ? 0 : 1).replace(/\.0$/, "");
  }

  const units = ["K", "M", "B", "T", "Qa", "Qi"];
  let scaled = abs;
  let unitIndex = -1;

  while (scaled >= 1000 && unitIndex < units.length - 1) {
    scaled /= 1000;
    unitIndex += 1;
  }

  const sign = value < 0 ? "-" : "";
  return `${sign}${scaled.toFixed(scaled >= 100 ? 0 : 1).replace(/\.0$/, "")}${units[unitIndex]}`;
}

function formatMoney(value) {
  return `$${formatNumber(value)}`;
}

function formatRatio(value) {
  if (!Number.isFinite(value) || value === 0) {
    return "0.00";
  }

  const abs = Math.abs(value);
  if (abs >= 100) {
    return value.toFixed(1);
  }
  if (abs >= 1) {
    return value.toFixed(2);
  }
  return value.toPrecision(2);
}

function calcBusinessPrice(basePrice, owned) {
  return basePrice * Math.pow(PRICE_GROWTH, owned);
}

function calcBusinessIncome(def, owned, multiplier) {
  return def.baseIncome * owned * multiplier;
}

function calcBulkBusinessCost(basePrice, owned, quantity) {
  if (quantity <= 0) {
    return 0;
  }

  const firstPrice = calcBusinessPrice(basePrice, owned);
  if (PRICE_GROWTH === 1) {
    return firstPrice * quantity;
  }

  return firstPrice * ((Math.pow(PRICE_GROWTH, quantity) - 1) / (PRICE_GROWTH - 1));
}

function calcMaxAffordableQuantity(basePrice, owned, cash) {
  if (cash <= 0) {
    return 0;
  }

  const firstPrice = calcBusinessPrice(basePrice, owned);
  if (firstPrice > cash) {
    return 0;
  }

  if (PRICE_GROWTH === 1) {
    return Math.floor(cash / firstPrice);
  }

  const scaled = (cash * (PRICE_GROWTH - 1)) / firstPrice;
  const raw = Math.log(1 + scaled) / Math.log(PRICE_GROWTH);
  return Math.max(0, Math.floor(raw));
}

function getBusinessPurchasePlan(def, mode = state.buyMode) {
  const owned = state.businesses[def.id].owned;
  let quantity = 0;

  if (mode === "max") {
    quantity = calcMaxAffordableQuantity(def.basePrice, owned, state.cash);
  } else {
    quantity = Number.parseInt(mode, 10);
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { quantity: 0, totalCost: 0, modeLabel: mode === "max" ? "Max" : `${mode}x` };
  }

  const totalCost = calcBulkBusinessCost(def.basePrice, owned, quantity);
  const modeLabel = mode === "max" ? `Max (${quantity}x)` : `${quantity}x`;
  return { quantity, totalCost, modeLabel };
}

function getInfluenceMultiplier() {
  return 1 + state.influence * INFLUENCE_BONUS_PER_POINT;
}

function getEffectiveClickPower() {
  return state.clickPower * getInfluenceMultiplier();
}

function getIncomeByBusiness() {
  const globalMultiplier = getInfluenceMultiplier();
  return BUSINESS_DEFS.map((def) => {
    const owned = state.businesses[def.id].owned;
    const multiplier = state.businesses[def.id].multiplier;
    const income = calcBusinessIncome(def, owned, multiplier) * globalMultiplier;
    return {
      id: def.id,
      name: def.name,
      income,
      color: BUSINESS_COLORS[def.id] || "#7b6a4e"
    };
  });
}

function addCash(amount) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }
  state.cash += amount;
  state.lifetimeEarnings += amount;
}

function getCurrentIncorporationThreshold() {
  return PRESTIGE_THRESHOLD * Math.pow(INCORPORATION_THRESHOLD_GROWTH, state.incorporations);
}

function calcInfluenceGain() {
  const threshold = getCurrentIncorporationThreshold();
  if (state.cash < threshold) {
    return 0;
  }

  // At threshold the player gains 1 influence; gains scale upward with excess cash.
  return Math.max(1, Math.floor(Math.sqrt(state.cash / threshold)));
}

function canIncorporate() {
  return state.cash >= getCurrentIncorporationThreshold();
}

function resetRunProgress() {
  state.cash = 0;
  state.upgrades = {};
  state.clickPower = 1;
  state.analytics.incomeHistory = [];
  state.analytics.sampleAccumulator = 0;

  for (const def of BUSINESS_DEFS) {
    state.businesses[def.id] = { owned: 0, multiplier: 1 };
  }

  for (const upgrade of UPGRADE_DEFS) {
    state.upgrades[upgrade.id] = false;
  }
}

function recalcEconomy() {
  let income = 0;
  let assetValue = state.cash;
  const globalMultiplier = getInfluenceMultiplier();

  for (const def of BUSINESS_DEFS) {
    const owned = state.businesses[def.id].owned;
    const mult = state.businesses[def.id].multiplier;
    income += calcBusinessIncome(def, owned, mult) * globalMultiplier;

    for (let i = 0; i < owned; i += 1) {
      assetValue += calcBusinessPrice(def.basePrice, i);
    }
  }

  state.incomePerSec = income;
  state.netWorth = assetValue;
}

function getUnlockCountForUpgrade(upgrade) {
  if (upgrade.clickUpgrade) {
    return state.businesses.newsstand.owned;
  }
  if (!upgrade.businessId) {
    return 0;
  }
  return state.businesses[upgrade.businessId].owned;
}

function hasUpgradePrerequisite(upgrade) {
  if (!upgrade.prerequisiteId) {
    return true;
  }
  return Boolean(state.upgrades[upgrade.prerequisiteId]);
}

function isUpgradeUnlocked(upgrade) {
  return getUnlockCountForUpgrade(upgrade) >= upgrade.threshold && hasUpgradePrerequisite(upgrade);
}

function canBuyBusiness(def) {
  const plan = getBusinessPurchasePlan(def);
  return plan.quantity > 0 && state.cash >= plan.totalCost;
}

function calcBusinessRoiRatio(def) {
  const owned = state.businesses[def.id].owned;
  const nextCost = calcBusinessPrice(def.basePrice, owned);
  if (nextCost <= 0) {
    return 0;
  }
  const oneMoreIncome = calcBusinessIncome(def, 1, state.businesses[def.id].multiplier) * getInfluenceMultiplier();
  return oneMoreIncome / nextCost;
}

function canBuyUpgrade(upgrade) {
  if (state.upgrades[upgrade.id]) {
    return false;
  }
  return isUpgradeUnlocked(upgrade) && state.cash >= upgrade.cost;
}

function buyBusiness(businessId) {
  const def = BUSINESS_DEFS.find((entry) => entry.id === businessId);
  if (!def) {
    return;
  }

  const plan = getBusinessPurchasePlan(def);
  if (plan.quantity <= 0 || state.cash < plan.totalCost) {
    return;
  }

  state.cash -= plan.totalCost;
  state.businesses[businessId].owned += plan.quantity;
  recalcEconomy();
  saveGame();
  render();
}

function buyUpgrade(upgradeId) {
  const upgrade = UPGRADE_BY_ID[upgradeId];
  if (!upgrade || state.upgrades[upgrade.id]) {
    return;
  }

  if (!isUpgradeUnlocked(upgrade) || state.cash < upgrade.cost) {
    return;
  }

  state.cash -= upgrade.cost;
  state.upgrades[upgrade.id] = true;

  if (upgrade.clickUpgrade) {
    state.clickPower *= upgrade.multiplier;
  } else {
    state.businesses[upgrade.businessId].multiplier *= upgrade.multiplier;
  }

  recalcEconomy();
  saveGame();
  render();
}

function earnClick() {
  addCash(getEffectiveClickPower());
  recalcEconomy();
  render();
}

function createBusinessCard(def) {
  const card = document.createElement("div");
  card.className = "item";

  const header = document.createElement("div");
  header.className = "item-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "item-title-wrap";

  const icon = document.createElement("img");
  icon.className = "item-icon";
  icon.src = def.icon;
  icon.alt = `${def.name} icon`;

  const title = document.createElement("span");
  title.className = "item-title";
  title.textContent = def.name;

  titleWrap.appendChild(icon);
  titleWrap.appendChild(title);

  const owned = document.createElement("span");
  owned.className = "item-meta";
  owned.textContent = "Owned: 0";

  const roiLine = document.createElement("span");
  roiLine.className = "item-meta roi-meta";
  roiLine.textContent = "ROI: 0.00 /sec per $";

  const sideMeta = document.createElement("div");
  sideMeta.className = "item-side-meta";
  sideMeta.appendChild(owned);
  sideMeta.appendChild(roiLine);

  header.appendChild(titleWrap);
  header.appendChild(sideMeta);

  const meta = document.createElement("div");
  meta.className = "item-meta";
  meta.textContent = "Income: $0/sec each";

  const costLine = document.createElement("div");
  costLine.className = "item-meta";
  costLine.textContent = "Cost: $0";

  const button = document.createElement("button");
  button.textContent = "Purchase 1x";
  button.addEventListener("click", () => buyBusiness(def.id));

  card.appendChild(header);
  card.appendChild(meta);
  card.appendChild(costLine);
  card.appendChild(button);

  ui.businessCards[def.id] = { owned, meta, roiLine, costLine, button };

  return card;
}

function updateBusinessCard(def) {
  const refs = ui.businessCards[def.id];
  if (!refs) {
    return;
  }

  const current = state.businesses[def.id];
  const plan = getBusinessPurchasePlan(def);
  const roi = calcBusinessRoiRatio(def);
  refs.owned.textContent = `Owned: ${current.owned}`;
  refs.meta.textContent = `Income: ${formatMoney(calcBusinessIncome(def, 1, current.multiplier) * getInfluenceMultiplier())}/sec each`;
  refs.roiLine.textContent = `ROI: ${formatRatio(roi)} /sec per $`;
  refs.costLine.textContent = `Cost (${plan.modeLabel}): ${formatMoney(plan.totalCost)}`;
  refs.button.textContent = `Purchase ${plan.modeLabel}`;
  refs.button.disabled = plan.quantity <= 0 || state.cash < plan.totalCost;
}

function createUpgradeCard(upgrade) {
  const card = document.createElement("div");
  card.className = "item";

  const header = document.createElement("div");
  header.className = "item-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "item-title-wrap";

  const icon = document.createElement("img");
  icon.className = "item-icon";
  icon.src = upgrade.icon;
  icon.alt = `${upgrade.name} icon`;

  const title = document.createElement("span");
  title.className = "item-title";
  title.textContent = upgrade.name;

  titleWrap.appendChild(icon);
  titleWrap.appendChild(title);

  const status = document.createElement("span");
  status.className = "item-meta";
  status.textContent = `Unlock at ${upgrade.threshold}`;

  header.appendChild(titleWrap);
  header.appendChild(status);

  const desc = document.createElement("div");
  desc.className = "item-meta";
  desc.textContent = upgrade.desc;

  const costLine = document.createElement("div");
  costLine.className = "item-meta";
  costLine.textContent = `Cost: ${formatMoney(upgrade.cost)}`;

  const button = document.createElement("button");
  button.textContent = "Acquire Upgrade";
  button.addEventListener("click", () => buyUpgrade(upgrade.id));

  card.appendChild(header);
  card.appendChild(desc);
  card.appendChild(costLine);
  card.appendChild(button);

  ui.upgradeCards[upgrade.id] = { status, button };

  return card;
}

function getCollapsedVisibleUpgradeIds(upgrades) {
  if (upgrades.length === 0) {
    return new Set();
  }

  const purchasedIndexes = upgrades
    .map((upgrade, index) => ({ id: upgrade.id, index }))
    .filter((entry) => state.upgrades[entry.id])
    .map((entry) => entry.index);

  let currentIndex;
  if (purchasedIndexes.length === 0) {
    currentIndex = 0;
  } else {
    currentIndex = Math.max(...purchasedIndexes);
  }

  const nextIndex = currentIndex + 1 < upgrades.length ? currentIndex + 1 : -1;
  const visible = new Set([upgrades[currentIndex].id]);
  if (nextIndex >= 0) {
    visible.add(upgrades[nextIndex].id);
  }
  return visible;
}

function updateUpgradeBranch(branchId) {
  const branchRefs = ui.upgradeBranches[branchId];
  if (!branchRefs) {
    return;
  }

  const { toggleButton, upgrades } = branchRefs;
  const expanded = branchRefs.expanded;
  toggleButton.textContent = expanded ? "Hide Tree" : "Show Tree";
  toggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");

  const collapsedVisibleIds = getCollapsedVisibleUpgradeIds(upgrades);
  for (const upgrade of upgrades) {
    const node = branchRefs.nodes[upgrade.id];
    if (!node) {
      continue;
    }
    const showNode = expanded || collapsedVisibleIds.has(upgrade.id);
    node.classList.toggle("tech-node-hidden", !showNode);
  }
}

function createUpgradeBranch(branchId, title, iconPath, upgrades) {
  const branch = document.createElement("section");
  branch.className = "upgrade-branch";

  const header = document.createElement("div");
  header.className = "upgrade-branch-header";

  if (iconPath) {
    const icon = document.createElement("img");
    icon.className = "upgrade-branch-icon";
    icon.src = iconPath;
    icon.alt = `${title} icon`;
    header.appendChild(icon);
  }

  const heading = document.createElement("h3");
  heading.className = "upgrade-branch-title";
  heading.textContent = title;
  header.appendChild(heading);

  const toggleButton = document.createElement("button");
  toggleButton.className = "upgrade-branch-toggle";
  toggleButton.type = "button";
  toggleButton.textContent = "Show Tree";
  toggleButton.addEventListener("click", () => {
    ui.upgradeBranches[branchId].expanded = !ui.upgradeBranches[branchId].expanded;
    updateUpgradeBranch(branchId);
  });
  header.appendChild(toggleButton);

  const track = document.createElement("div");
  track.className = "upgrade-track";

  const nodes = {};
  for (const upgrade of upgrades) {
    const card = createUpgradeCard(upgrade);
    card.classList.add("tech-node");
    nodes[upgrade.id] = card;
    track.appendChild(card);
  }

  branch.appendChild(header);
  branch.appendChild(track);

  ui.upgradeBranches[branchId] = {
    expanded: false,
    toggleButton,
    upgrades,
    nodes
  };

  return branch;
}

function updateUpgradeCard(upgrade) {
  const refs = ui.upgradeCards[upgrade.id];
  if (!refs) {
    return;
  }

  const purchased = state.upgrades[upgrade.id];
  const owned = getUnlockCountForUpgrade(upgrade);
  const prereqMet = hasUpgradePrerequisite(upgrade);
  let statusText = "Unlocked";

  if (purchased) {
    statusText = "Purchased";
  } else if (owned < upgrade.threshold) {
    statusText = `Requires ${upgrade.threshold} owned`;
  } else if (!prereqMet) {
    const prereqName = UPGRADE_BY_ID[upgrade.prerequisiteId]?.name || "prior research";
    statusText = `Requires ${prereqName}`;
  }

  refs.status.textContent = statusText;
  refs.button.textContent = purchased ? "Purchased" : "Acquire Upgrade";
  refs.button.disabled = purchased || !canBuyUpgrade(upgrade);
}

function renderBusinesses() {
  if (els.businessList.childElementCount === 0) {
    for (const def of BUSINESS_DEFS) {
      els.businessList.appendChild(createBusinessCard(def));
    }
  }

  for (const def of BUSINESS_DEFS) {
    updateBusinessCard(def);
  }
}

function renderUpgrades() {
  if (els.upgradeList.childElementCount === 0) {
    els.upgradeList.classList.add("upgrade-tree");

    for (const business of BUSINESS_DEFS) {
      const upgrades = UPGRADE_DEFS
        .filter((upgrade) => upgrade.businessId === business.id)
        .sort((a, b) => a.threshold - b.threshold);

      if (upgrades.length > 0) {
        els.upgradeList.appendChild(createUpgradeBranch(business.id, business.name, business.icon, upgrades));
      }
    }

    if (SPECIAL_UPGRADES.length > 0) {
      const civicUpgrades = [...SPECIAL_UPGRADES].sort((a, b) => a.threshold - b.threshold);
      els.upgradeList.appendChild(createUpgradeBranch("civic", "Civic Initiatives", "assets/icons/upgrade-campaign.svg", civicUpgrades));
    }
  }

  for (const upgrade of UPGRADE_DEFS) {
    updateUpgradeCard(upgrade);
  }

  for (const branchId of Object.keys(ui.upgradeBranches)) {
    updateUpgradeBranch(branchId);
  }
}

function prepareCanvasContext(canvas) {
  if (!canvas) {
    return null;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const pixelRatio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  const targetWidth = Math.max(1, Math.floor(width * pixelRatio));
  const targetHeight = Math.max(1, Math.floor(height * pixelRatio));

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { ctx, width, height };
}

function drawIncomeLineChart() {
  const canvasInfo = prepareCanvasContext(els.incomeLineChart);
  if (!canvasInfo) {
    return;
  }

  const { ctx, width, height } = canvasInfo;
  const points = state.analytics.incomeHistory;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(246, 233, 207, 0.9)";
  ctx.fillRect(0, 0, width, height);

  const margin = { left: 38, right: 10, top: 12, bottom: 22 };
  const graphW = width - margin.left - margin.right;
  const graphH = height - margin.top - margin.bottom;
  if (graphW <= 0 || graphH <= 0) {
    return;
  }

  ctx.strokeStyle = "rgba(94, 71, 42, 0.35)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + (graphH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
  }

  if (points.length < 2) {
    ctx.fillStyle = "#5f472a";
    ctx.font = '12px "Palatino Linotype", serif';
    ctx.fillText("Collect income to populate chart", margin.left + 8, margin.top + graphH / 2);
    return;
  }

  const maxIncome = Math.max(1, ...points);
  const minIncome = Math.min(0, ...points);
  const incomeRange = Math.max(1, maxIncome - minIncome);

  ctx.strokeStyle = "#7a5420";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const x = margin.left + (i / (points.length - 1)) * graphW;
    const y = margin.top + graphH - ((points[i] - minIncome) / incomeRange) * graphH;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  ctx.fillStyle = "#4d3518";
  ctx.font = '11px "Palatino Linotype", serif';
  ctx.fillText(formatMoney(maxIncome), 4, margin.top + 10);
  ctx.fillText(formatMoney(minIncome), 4, margin.top + graphH);
  ctx.fillText("10m ago", margin.left, height - 5);
  ctx.fillText("now", width - margin.right - 24, height - 5);
}

function drawIncomePieChart() {
  const canvasInfo = prepareCanvasContext(els.incomePieChart);
  if (!canvasInfo) {
    return;
  }

  const { ctx, width, height } = canvasInfo;
  const allocations = getIncomeByBusiness();
  const totalIncome = allocations.reduce((sum, entry) => sum + entry.income, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(246, 233, 207, 0.9)";
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;

  if (totalIncome <= 0) {
    ctx.fillStyle = "#5f472a";
    ctx.font = '12px "Palatino Linotype", serif';
    ctx.fillText("No passive income yet", cx - 58, cy + 4);
    return;
  }

  let start = -Math.PI / 2;
  for (const entry of allocations) {
    const slice = (entry.income / totalIncome) * Math.PI * 2;
    if (slice <= 0) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = entry.color;
    ctx.fill();
    start += slice;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(246, 233, 207, 0.95)";
  ctx.fill();
  ctx.fillStyle = "#4d3518";
  ctx.font = '11px "Palatino Linotype", serif';
  ctx.textAlign = "center";
  ctx.fillText("Income/sec", cx, cy - 4);
  ctx.fillText(formatMoney(totalIncome), cx, cy + 12);
}

function renderIncomeAllocationLegend() {
  if (!els.incomeAllocationLegend) {
    return;
  }

  const allocations = getIncomeByBusiness();
  const total = allocations.reduce((sum, entry) => sum + entry.income, 0);
  els.incomeAllocationLegend.textContent = "";

  for (const entry of allocations) {
    const row = document.createElement("div");
    row.className = "chart-legend-row";

    const label = document.createElement("span");
    label.className = "chart-legend-label";

    const dot = document.createElement("span");
    dot.className = "chart-color-dot";
    dot.style.backgroundColor = entry.color;

    const text = document.createElement("span");
    text.textContent = entry.name;

    label.appendChild(dot);
    label.appendChild(text);

    const value = document.createElement("span");
    const percent = total > 0 ? (entry.income / total) * 100 : 0;
    value.textContent = `${formatMoney(entry.income)} (${percent.toFixed(1)}%)`;

    row.appendChild(label);
    row.appendChild(value);
    els.incomeAllocationLegend.appendChild(row);
  }
}

function sampleIncomeHistory(deltaSeconds) {
  state.analytics.sampleAccumulator += deltaSeconds;
  while (state.analytics.sampleAccumulator >= ANALYTICS_SAMPLE_SECONDS) {
    state.analytics.incomeHistory.push(state.incomePerSec);
    if (state.analytics.incomeHistory.length > ANALYTICS_MAX_POINTS) {
      state.analytics.incomeHistory.shift();
    }
    state.analytics.sampleAccumulator -= ANALYTICS_SAMPLE_SECONDS;
  }
}

function renderAnalytics(now) {
  if (!els.incomeLineChart || !els.incomePieChart) {
    return;
  }

  if (now - state.analytics.lastDrawAt < ANALYTICS_DRAW_INTERVAL_MS) {
    return;
  }
  state.analytics.lastDrawAt = now;

  drawIncomeLineChart();
  drawIncomePieChart();
  renderIncomeAllocationLegend();
}

function render() {
  els.cashValue.textContent = formatMoney(state.cash);
  els.incomeValue.textContent = `${formatMoney(state.incomePerSec)}`;
  els.netWorthValue.textContent = formatMoney(state.netWorth);
  els.clickValue.textContent = formatMoney(getEffectiveClickPower());
  els.influenceValue.textContent = formatNumber(state.influence);
  els.lifetimeValue.textContent = formatMoney(state.lifetimeEarnings);
  els.prestigeBonusValue.textContent = `+${formatNumber((getInfluenceMultiplier() - 1) * 100)}%`;
  els.incorporateThresholdText.textContent = `Reach ${formatMoney(getCurrentIncorporationThreshold())} cash to Incorporate.`;
  els.incorporateGain.textContent = `+${formatNumber(calcInfluenceGain())}`;
  els.incorporateButton.disabled = !canIncorporate();
  for (const button of els.buyModeButtons) {
    button.classList.toggle("active", button.dataset.buyMode === state.buyMode);
  }

  renderBusinesses();
  renderUpgrades();
  renderAnalytics(performance.now());
}

function toSaveData() {
  return {
    cash: state.cash,
    businesses: state.businesses,
    upgrades: state.upgrades,
    clickPower: state.clickPower,
    influence: state.influence,
    incorporations: state.incorporations,
    lifetimeEarnings: state.lifetimeEarnings,
    buyMode: state.buyMode,
    lastSavedAt: Date.now()
  };
}

function applySaveData(data) {
  if (!data || typeof data !== "object") {
    return false;
  }

  if (typeof data.cash !== "number" || !Number.isFinite(data.cash)) {
    return false;
  }

  state.cash = Math.max(0, data.cash);

  for (const def of BUSINESS_DEFS) {
    const incoming = data.businesses?.[def.id];
    const owned = Number.isFinite(incoming?.owned) ? Math.max(0, Math.floor(incoming.owned)) : 0;
    const multiplier = Number.isFinite(incoming?.multiplier) ? Math.max(0.01, incoming.multiplier) : 1;
    state.businesses[def.id] = { owned, multiplier };
  }

  state.upgrades = {};
  for (const upgrade of UPGRADE_DEFS) {
    state.upgrades[upgrade.id] = Boolean(data.upgrades?.[upgrade.id]);
  }

  state.clickPower = Number.isFinite(data.clickPower) ? Math.max(0.1, data.clickPower) : 1;
  state.influence = Number.isFinite(data.influence) ? Math.max(0, Math.floor(data.influence)) : 0;
  state.incorporations = Number.isFinite(data.incorporations) ? Math.max(0, Math.floor(data.incorporations)) : 0;
  state.lifetimeEarnings = Number.isFinite(data.lifetimeEarnings) ? Math.max(0, data.lifetimeEarnings) : state.cash;
  state.buyMode = BUY_MODES.includes(data.buyMode) ? data.buyMode : "1";
  state.lastSavedAt = Number.isFinite(data.lastSavedAt) ? data.lastSavedAt : Date.now();

  recalcEconomy();
  return true;
}

function saveGame() {
  state.lastSavedAt = Date.now();
  const payload = JSON.stringify(toSaveData());
  localStorage.setItem(SAVE_KEY, payload);
}

function applyOfflineIncome(lastSavedAt) {
  if (!Number.isFinite(lastSavedAt)) {
    return { earned: 0, seconds: 0 };
  }

  const now = Date.now();
  const elapsedSeconds = Math.max(0, (now - lastSavedAt) / 1000);
  if (elapsedSeconds <= 0 || state.incomePerSec <= 0) {
    return { earned: 0, seconds: 0 };
  }

  const earned = state.incomePerSec * elapsedSeconds;
  addCash(earned);
  recalcEconomy();

  return { earned, seconds: elapsedSeconds };
}

function showAwayNotice(earned, seconds) {
  if (!els.awayNotice) {
    return;
  }

  if (earned <= 0 || seconds < 1) {
    els.awayNotice.classList.add("hidden");
    els.awayNotice.textContent = "";
    return;
  }

  const timeLabel = formatElapsedTime(seconds);
  els.awayNotice.textContent = `While you were away (${timeLabel}), your businesses earned ${formatMoney(earned)}.`;
  els.awayNotice.classList.remove("hidden");
}

function formatElapsedTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return { earned: 0, seconds: 0 };
  }

  try {
    const parsed = JSON.parse(raw);
    const previousSavedAt = Number.isFinite(parsed?.lastSavedAt) ? parsed.lastSavedAt : Date.now();
    const valid = applySaveData(parsed);
    if (!valid) {
      console.warn("Save data invalid, ignored.");
      return { earned: 0, seconds: 0 };
    }
    return applyOfflineIncome(previousSavedAt);
  } catch (error) {
    console.warn("Failed to parse save data.", error);
    return { earned: 0, seconds: 0 };
  }
}

function resetGame() {
  resetRunProgress();
  state.influence = 0;
  state.incorporations = 0;
  state.lifetimeEarnings = 0;
  state.buyMode = "1";
  state.lastSavedAt = Date.now();

  recalcEconomy();
  showAwayNotice(0, 0);
  saveGame();
  render();
}

function incorporate() {
  const threshold = getCurrentIncorporationThreshold();
  const gain = calcInfluenceGain();
  if (state.cash < threshold || gain < 1) {
    return;
  }

  const confirmed = confirm(`Incorporate now for +${gain} Influence at ${formatMoney(threshold)}? This resets cash, businesses, and upgrades.`);
  if (!confirmed) {
    return;
  }

  state.influence += gain;
  state.incorporations += 1;
  resetRunProgress();
  recalcEconomy();
  showAwayNotice(0, 0);
  saveGame();
  render();
}

function exportSave() {
  els.saveData.value = JSON.stringify(toSaveData(), null, 2);
}

function importSave() {
  const raw = els.saveData.value.trim();
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const valid = applySaveData(parsed);
    if (!valid) {
      alert("Invalid save format.");
      return;
    }

    const previousSavedAt = Number.isFinite(parsed.lastSavedAt) ? parsed.lastSavedAt : Date.now();
    const offlineResult = applyOfflineIncome(previousSavedAt);
    showAwayNotice(offlineResult.earned, offlineResult.seconds);
    saveGame();
    render();
  } catch (error) {
    alert("Could not parse JSON save data.");
  }
}

function tick(now) {
  // Delta time keeps passive income consistent even when frame rate fluctuates.
  const deltaSeconds = Math.max(0, (now - state.lastTickTime) / 1000);
  state.lastTickTime = now;

  addCash(state.incomePerSec * deltaSeconds);
  recalcEconomy();
  sampleIncomeHistory(deltaSeconds);
  render();

  requestAnimationFrame(tick);
}

function initState() {
  for (const def of BUSINESS_DEFS) {
    state.businesses[def.id] = { owned: 0, multiplier: 1 };
  }

  for (const upgrade of UPGRADE_DEFS) {
    state.upgrades[upgrade.id] = false;
  }
}

function wireEvents() {
  els.earnButton.addEventListener("click", () => {
    earnClick();
    saveGame();
  });

  els.exportButton.addEventListener("click", exportSave);
  els.importButton.addEventListener("click", importSave);

  els.resetButton.addEventListener("click", () => {
    const confirmed = confirm("Reset all progress? This cannot be undone.");
    if (confirmed) {
      resetGame();
    }
  });
  els.incorporateButton.addEventListener("click", incorporate);
  for (const button of els.buyModeButtons) {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.buyMode;
      if (!BUY_MODES.includes(nextMode)) {
        return;
      }
      state.buyMode = nextMode;
      render();
    });
  }

  window.addEventListener("beforeunload", saveGame);
  window.addEventListener("resize", applyMobileBrowserMode);
  window.addEventListener("orientationchange", applyMobileBrowserMode);
  setInterval(saveGame, AUTO_SAVE_MS);
}

function boot() {
  applyMobileBrowserMode();
  initState();
  const offlineResult = loadGame();
  recalcEconomy();
  state.analytics.incomeHistory.push(state.incomePerSec);
  showAwayNotice(offlineResult.earned, offlineResult.seconds);
  // Persist the new session timestamp immediately so offline rewards are not re-applied.
  saveGame();
  render();
  wireEvents();

  state.lastTickTime = performance.now();
  requestAnimationFrame(tick);
}

boot();

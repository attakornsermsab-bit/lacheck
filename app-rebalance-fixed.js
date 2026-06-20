const state = {
  timer: null,
  portfolioData: null,
  targetWeights: loadStoredJson("portfolioTargetWeights", {
    Cash: 5,
    Bonds: 30,
    Stocks: 45,
    "Alternative Investment": 20,
  }),
  customWatchlist: loadStoredJson("portfolioCustomWatchlist", []),
};

const targetPresets = {
  original: {
    Cash: 5,
    Bonds: 30,
    Stocks: 45,
    "Alternative Investment": 20,
  },
  defensive: {
    Cash: 10,
    Bonds: 40,
    Stocks: 35,
    "Alternative Investment": 15,
  },
  growth: {
    Cash: 3,
    Bonds: 20,
    Stocks: 60,
    "Alternative Investment": 17,
  },
  income: {
    Cash: 7,
    Bonds: 45,
    Stocks: 30,
    "Alternative Investment": 18,
  },
};

const baseWatchlist = [
  {
    symbol: "NVDA",
    name: "NVIDIA",
    market: "US",
    theme: "AI compute",
    fit: "Core growth",
    note: "Track AI capex demand, margin durability, and valuation after rallies.",
  },
  {
    symbol: "AVGO",
    name: "Broadcom",
    market: "US",
    theme: "AI infrastructure",
    fit: "Core growth",
    note: "Semiconductor plus infrastructure software exposure; watch AI networking orders.",
  },
  {
    symbol: "TSM",
    name: "TSMC",
    market: "US ADR",
    theme: "Foundry",
    fit: "Semiconductor core",
    note: "Key AI/advanced-node supplier; watch Taiwan risk and capex cycle.",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    market: "US",
    theme: "Cloud AI",
    fit: "Quality compounder",
    note: "Azure and enterprise AI adoption can balance portfolio beta.",
  },
  {
    symbol: "LLY",
    name: "Eli Lilly",
    market: "US",
    theme: "Healthcare growth",
    fit: "Diversifier",
    note: "Useful counterweight to semis; watch obesity drug supply and pricing.",
  },
  {
    symbol: "ADVANC.BK",
    name: "Advanced Info Service",
    market: "TH",
    theme: "Dividend/defensive",
    fit: "Thailand quality",
    note: "Potential local defensive sleeve; watch ARPU, competition, and dividend yield.",
  },
  {
    symbol: "CPALL.BK",
    name: "CP ALL",
    market: "TH",
    theme: "Domestic consumption",
    fit: "Thailand recovery",
    note: "Tracks consumption and tourism recovery; watch margins and debt reduction.",
  },
  {
    symbol: "BBL.BK",
    name: "Bangkok Bank",
    market: "TH",
    theme: "Rates/value",
    fit: "Value/income",
    note: "Banking value candidate; watch asset quality and NIM direction.",
  },
];

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const compactTHB = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  notation: "compact",
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 4,
});

const percent = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 2,
});

function byId(id) {
  return document.getElementById(id);
}

function loadStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures so the monitor remains usable in locked-down browsers.
  }
}

function signedClass(value) {
  return value >= 0 ? "positive" : "negative";
}

function signedTHB(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${thb.format(value)}`;
}

function signedPercent(value) {
  if (value == null || Number.isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${percent.format(value)}%`;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

function formatPrice(value, currency) {
  if (value == null || Number.isNaN(value)) return "-";
  if (currency === "USD") return `USD ${number.format(value)}`;
  if (currency === "THB") return `THB ${number.format(value)}`;
  return number.format(value);
}

function validationLabel(status) {
  return {
    match: "ตรง",
    mismatch: "ไม่ตรง",
    manual: "Manual",
    error: "เช็กไม่ได้",
  }[status] || status;
}

function renderSummary(data) {
  byId("buyDate").textContent = formatDate(data.buyDate);
  byId("currentValue").textContent = compactTHB.format(data.summary.currentValueTHB);
  byId("gainLoss").textContent = signedTHB(data.summary.gainLossTHB);
  byId("gainLoss").className = signedClass(data.summary.gainLossTHB);
  byId("portfolioReturn").textContent = signedPercent(data.summary.returnPct);
  byId("portfolioReturn").className = signedClass(data.summary.returnPct);
  byId("fxRate").textContent = `${number.format(data.fx.latest.price)} THB/USD`;
  byId("fxNote").textContent = `FX ซื้อ ${number.format(data.fx.reference.price)} | ล่าสุด ${number.format(
    data.fx.latest.price
  )} (${formatDate(data.fx.latest.date)})`;
  const snapshotTime = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(data.generatedAt));
  const checkedTime = new Intl.DateTimeFormat("th-TH", {
    timeStyle: "short",
  }).format(new Date(data.checkedAt || Date.now()));
  byId("lastUpdated").textContent = data.isStaticSnapshot
    ? `Snapshot ${snapshotTime} | checked ${checkedTime}`
    : `Updated ${snapshotTime}`;
}

function renderAllocation(data) {
  const maxWeight = Math.max(...data.allocation.map((item) => item.currentWeight), 1);
  byId("allocationBars").innerHTML = data.allocation
    .map((item) => {
      const width = (item.currentWeight / maxWeight) * 100;
      return `
        <div class="bar-row">
          <div class="bar-label">${item.assetClass}</div>
          <div class="bar-track"><div class="bar-fill" style="width: ${width}%"></div></div>
          <div class="bar-value">${percent.format(item.currentWeight)}% | ${signedPercent(item.returnPct)}</div>
        </div>
      `;
    })
    .join("");
}

function checkNote(row) {
  if (row.validation.status === "match") {
    return `ในรูป ${formatPrice(row.validation.enteredPrice, row.currency)} ตรงกับ ${formatDate(
      row.validation.officialDate
    )}`;
  }

  if (row.validation.status === "manual") {
    return "ถือเป็นเงินสด/ฝากคงที่";
  }

  if (row.validation.status === "mismatch") {
    return `ในรูป ${formatPrice(row.validation.enteredPrice, row.currency)} (${formatDate(
      row.validation.enteredDate
    )}) แต่ปิด 12 Jun คือ ${formatPrice(row.validation.officialPrice, row.currency)}`;
  }

  return row.validation.note || "-";
}

function renderHoldings(data) {
  byId("holdingsBody").innerHTML = data.holdings
    .map((row) => {
      const validationStatus = row.validation.status;
      return `
        <tr>
          <td>
            <div class="asset-name">${row.name}</div>
            <div class="asset-meta">${row.assetClass} / ${row.subAsset}</div>
          </td>
          <td>
            ${compactTHB.format(row.investmentTHB)}
            <div class="small">${percent.format(row.ratio * 100)}% initial</div>
          </td>
          <td>
            ${formatPrice(row.imagePrice, row.currency)}
            <div class="small">${formatDate(row.imageDate)}</div>
          </td>
          <td>
            ${formatPrice(row.reference?.price, row.currency)}
            <div class="small">${formatDate(row.reference?.date)}</div>
          </td>
          <td>
            ${formatPrice(row.latest?.price, row.currency)}
            <div class="small">${formatDate(row.latest?.date)} | ${row.latest?.source || "-"}</div>
          </td>
          <td>
            ${thb.format(row.currentValueTHB)}
            <div class="small">${percent.format(row.currentWeight)}% current</div>
          </td>
          <td class="${signedClass(row.gainLossTHB)}">${signedTHB(row.gainLossTHB)}</td>
          <td class="${signedClass(row.returnPct)}">
            ${signedPercent(row.returnPct)}
            <div class="small">${row.currency === "USD" ? `asset ${signedPercent(row.priceReturnPct)}` : ""}</div>
          </td>
          <td>
            <span class="pill ${validationStatus}">${validationLabel(validationStatus)}</span>
            <div class="check-note">${checkNote(row)}</div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderNotes(data) {
  const notes = [...data.sourceNotes];
  if (data.isStaticSnapshot) {
    notes.push("GitHub Pages uses the latest published api/portfolio.json snapshot. Use the local app or a Cloudflare backend for true live refresh.");
  }
  byId("sourceNotes").innerHTML = notes.map((note) => `<li>${note}</li>`).join("");
}

function renderRebalance(data) {
  const controls = byId("rebalanceControls");
  const body = byId("rebalanceBody");
  const totalNode = byId("targetTotal");
  const status = totalNode?.closest(".rebalance-status");
  if (!controls || !body || !totalNode || !status) return;

  const assetClasses = data.allocation.map((item) => item.assetClass);
  assetClasses.forEach((assetClass) => {
    if (!Number.isFinite(state.targetWeights[assetClass])) {
      state.targetWeights[assetClass] = 0;
    }
  });

  controls.innerHTML = assetClasses
    .map((assetClass) => {
      const value = Number(state.targetWeights[assetClass] || 0);
      return `
        <div class="target-control">
          <label>
            <span>${assetClass}</span>
            <strong>${percent.format(value)}%</strong>
          </label>
          <input type="range" min="0" max="100" step="0.5" value="${value}" data-target-asset="${assetClass}" />
        </div>
      `;
    })
    .join("");

  const targetTotal = assetClasses.reduce((sum, assetClass) => sum + Number(state.targetWeights[assetClass] || 0), 0);
  totalNode.textContent = `${percent.format(targetTotal)}%`;
  status.classList.toggle("warning", Math.abs(targetTotal - 100) > 0.01);

  const totalValue = data.summary.currentValueTHB;
  body.innerHTML = data.allocation
    .map((item) => {
      const targetWeight = Number(state.targetWeights[item.assetClass] || 0);
      const targetValue = totalValue * (targetWeight / 100);
      const trade = targetValue - item.currentValueTHB;
      const gap = targetWeight - item.currentWeight;
      const tradeLabel = trade > 0 ? "Buy" : trade < 0 ? "Sell" : "Hold";
      return `
        <tr>
          <td>
            <div class="asset-name">${item.assetClass}</div>
            <div class="asset-meta">${signedPercent(item.returnPct)} since reference date</div>
          </td>
          <td>
            ${compactTHB.format(item.currentValueTHB)}
            <div class="small">${percent.format(item.currentWeight)}%</div>
          </td>
          <td>
            ${compactTHB.format(targetValue)}
            <div class="small">${percent.format(targetWeight)}%</div>
          </td>
          <td class="${signedClass(gap)}">${signedPercent(gap)}</td>
          <td class="${signedClass(trade)}">
            ${tradeLabel} ${compactTHB.format(Math.abs(trade))}
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderWatchlist() {
  const grid = byId("watchlistGrid");
  if (!grid) return;

  const custom = state.customWatchlist.map((item, index) => ({
    ...item,
    customIndex: index,
    fit: item.fit || "Custom idea",
    market: item.market || "Watch",
  }));
  const items = [...baseWatchlist, ...custom];

  grid.innerHTML = items
    .map((item) => {
      const removeButton =
        item.customIndex == null
          ? ""
          : `<button type="button" class="remove-watch" data-remove-watch="${item.customIndex}">Remove</button>`;
      return `
        <article class="watch-card">
          <header>
            <div>
              <div class="watch-symbol">${item.symbol}</div>
              <div class="small">${item.name || item.market}</div>
            </div>
            ${removeButton}
          </header>
          <div class="watch-theme">${item.theme || "Custom"}</div>
          <p>${item.note || "Add a reason to watch this name."}</p>
          <div class="watch-meta">
            <span class="tag">${item.market}</span>
            <span class="tag">${item.fit}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function setLoading(isLoading) {
  byId("refreshButton").disabled = isLoading;
  byId("refreshButton").textContent = isLoading ? "Loading" : isGithubPages() ? "Refresh snapshot" : "Refresh";
}

async function loadPortfolio() {
  setLoading(true);

  try {
    const data = await fetchPortfolioData();
    state.portfolioData = data;

    renderSummary(data);
    renderAllocation(data);
    renderRebalance(data);
    renderHoldings(data);
    renderWatchlist();
    renderNotes(data);
  } catch (error) {
    byId("holdingsBody").innerHTML = `<tr><td colspan="9" class="error-line">${error.message}</td></tr>`;
    byId("lastUpdated").textContent = "โหลดข้อมูลไม่สำเร็จ";
  } finally {
    setLoading(false);
  }
}

async function fetchPortfolioData() {
  const cacheBuster = `ts=${Date.now()}`;
  const staticSnapshot = isGithubPages();
  const sources = staticSnapshot
    ? [`api/portfolio.json?${cacheBuster}`]
    : [`/api/portfolio?${cacheBuster}`, `api/portfolio.json?${cacheBuster}`];

  let lastError = null;
  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load portfolio");
      data.checkedAt = new Date().toISOString();
      data.isStaticSnapshot = staticSnapshot;
      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Could not load portfolio");
}

function isGithubPages() {
  return window.location.hostname.endsWith("github.io");
}

document.addEventListener("input", (event) => {
  const input = event.target.closest?.("[data-target-asset]");
  if (!input) return;

  const assetClass = input.dataset.targetAsset;
  state.targetWeights[assetClass] = Number(input.value);
  saveStoredJson("portfolioTargetWeights", state.targetWeights);
  if (state.portfolioData) renderRebalance(state.portfolioData);
});

document.addEventListener("click", (event) => {
  const presetButton = event.target.closest?.("[data-preset]");
  if (presetButton) {
    const preset = targetPresets[presetButton.dataset.preset];
    if (preset) {
      state.targetWeights = { ...preset };
      saveStoredJson("portfolioTargetWeights", state.targetWeights);
      if (state.portfolioData) renderRebalance(state.portfolioData);
    }
    return;
  }

  const removeButton = event.target.closest?.("[data-remove-watch]");
  if (removeButton) {
    const index = Number(removeButton.dataset.removeWatch);
    state.customWatchlist.splice(index, 1);
    saveStoredJson("portfolioCustomWatchlist", state.customWatchlist);
    renderWatchlist();
  }
});

byId("addWatchButton")?.addEventListener("click", () => {
  const symbolInput = byId("watchSymbol");
  const themeInput = byId("watchTheme");
  const noteInput = byId("watchNote");
  const symbol = symbolInput?.value.trim().toUpperCase();
  if (!symbol) return;

  state.customWatchlist.push({
    symbol,
    name: symbol,
    market: symbol.endsWith(".BK") ? "TH" : "Watch",
    theme: themeInput?.value.trim() || "Custom idea",
    fit: "User added",
    note: noteInput?.value.trim() || "User-added watch item.",
  });
  saveStoredJson("portfolioCustomWatchlist", state.customWatchlist);
  if (symbolInput) symbolInput.value = "";
  if (themeInput) themeInput.value = "";
  if (noteInput) noteInput.value = "";
  renderWatchlist();
});

byId("resetWatchButton")?.addEventListener("click", () => {
  state.customWatchlist = [];
  saveStoredJson("portfolioCustomWatchlist", state.customWatchlist);
  renderWatchlist();
});

byId("refreshButton").addEventListener("click", loadPortfolio);
loadPortfolio();
state.timer = setInterval(loadPortfolio, 5 * 60 * 1000);

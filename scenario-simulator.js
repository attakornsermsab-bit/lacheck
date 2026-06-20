(() => {
  if (document.querySelector(".scenario-panel")) return;

  const STORAGE_KEY = "portfolioScenario";
  const TARGET_KEY = "portfolioTargetWeights";
  const defaultTargets = {
    Cash: 5,
    Bonds: 30,
    Stocks: 45,
    "Alternative Investment": 20,
  };
  const defaultScenario = {
    symbol: "SPACEX",
    assetClass: "Stocks",
    amountTHB: 5_000_000,
    funding: "newMoney",
    returnPct: 0,
  };

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
  const percent = new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  });

  let portfolioData = null;
  let scenario = readStoredJson(STORAGE_KEY, defaultScenario);

  function byId(id) {
    return document.getElementById(id);
  }

  function readStoredJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
    } catch {
      return { ...fallback };
    }
  }

  function saveStoredJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be blocked in some browsers; keep the simulator usable.
    }
  }

  function cleanNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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

  function getTargets() {
    return readStoredJson(TARGET_KEY, defaultTargets);
  }

  function installStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .scenario-panel .scenario-form {
        display: grid;
        grid-template-columns: minmax(150px, 1.2fr) minmax(150px, 1fr) minmax(150px, 1fr) minmax(170px, 1fr) minmax(150px, 1fr);
        gap: 12px;
        margin-bottom: 14px;
      }
      .scenario-panel .scenario-form label {
        display: grid;
        gap: 7px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .scenario-panel input,
      .scenario-panel select {
        border: 1px solid var(--line);
        border-radius: 8px;
        min-height: 40px;
        padding: 0 12px;
        color: var(--ink);
        background: #fff;
        font: inherit;
        width: 100%;
      }
      .scenario-metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 12px;
      }
      .scenario-metrics article {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fbfcfd;
        padding: 12px;
        min-height: 76px;
      }
      .scenario-metrics span {
        display: block;
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 7px;
      }
      .scenario-metrics strong {
        display: block;
        color: var(--ink);
        font-size: 16px;
        line-height: 1.25;
      }
      .scenario-metrics strong.positive { color: var(--green); }
      .scenario-metrics strong.negative { color: var(--red); }
      .scenario-note {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.45;
        margin: 0 0 12px;
      }
      @media (max-width: 960px) {
        .scenario-panel .scenario-form,
        .scenario-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 560px) {
        .scenario-panel .scenario-form,
        .scenario-metrics {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function insertPanel() {
    const anchor = document.querySelector(".rebalance-panel") || document.querySelector("main .panel");
    if (!anchor) return false;

    anchor.insertAdjacentHTML(
      "afterend",
      `
        <section class="panel scenario-panel">
          <div class="panel-heading">
            <h2>Scenario Simulator</h2>
            <p>Test a new position before changing the real portfolio.</p>
          </div>
          <div class="preset-row" aria-label="Scenario presets">
            <button type="button" class="ghost-button" data-scenario-sim-preset="spacex-new">SpaceX 5M new money</button>
            <button type="button" class="ghost-button" data-scenario-sim-preset="spacex-cash">SpaceX 5M from cash</button>
            <button type="button" class="ghost-button" data-scenario-sim-preset="spacex-sell">SpaceX 10M sell pro-rata</button>
            <button type="button" class="ghost-button" data-scenario-sim-preset="clear">Clear</button>
          </div>
          <div class="scenario-form">
            <label>
              <span>Asset</span>
              <input id="scenarioSymbol" type="text" data-scenario-sim="symbol" placeholder="SPACEX" />
            </label>
            <label>
              <span>Asset class</span>
              <select id="scenarioAssetClass" data-scenario-sim="assetClass">
                <option value="Stocks">Stocks</option>
                <option value="Cash">Cash</option>
                <option value="Bonds">Bonds</option>
                <option value="Alternative Investment">Alternative Investment</option>
              </select>
            </label>
            <label>
              <span>Amount THB</span>
              <input id="scenarioAmount" type="number" min="0" step="100000" data-scenario-sim="amountTHB" />
            </label>
            <label>
              <span>Funding</span>
              <select id="scenarioFunding" data-scenario-sim="funding">
                <option value="newMoney">New money</option>
                <option value="cash">Use cash first</option>
                <option value="proRata">Sell existing pro-rata</option>
              </select>
            </label>
            <label>
              <span>Return assumption</span>
              <input id="scenarioReturn" type="number" step="0.5" data-scenario-sim="returnPct" />
            </label>
          </div>
          <div class="scenario-metrics">
            <article>
              <span>Portfolio after</span>
              <strong id="scenarioTotal">-</strong>
            </article>
            <article>
              <span>New position weight</span>
              <strong id="scenarioWeight">-</strong>
            </article>
            <article>
              <span>Scenario P/L</span>
              <strong id="scenarioPnL">-</strong>
            </article>
            <article>
              <span>Funding action</span>
              <strong id="scenarioFundingText">-</strong>
            </article>
          </div>
          <p id="scenarioNote" class="scenario-note">-</p>
          <div class="table-wrap compact-table">
            <table>
              <thead>
                <tr>
                  <th>Asset class</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Change</th>
                  <th>Target drift</th>
                </tr>
              </thead>
              <tbody id="scenarioBody">
                <tr>
                  <td colspan="5" class="loading">Loading scenario...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      `
    );
    return true;
  }

  function syncInputs() {
    if (byId("scenarioSymbol")) byId("scenarioSymbol").value = scenario.symbol || "";
    if (byId("scenarioAssetClass")) byId("scenarioAssetClass").value = scenario.assetClass || "Stocks";
    if (byId("scenarioAmount")) byId("scenarioAmount").value = cleanNumber(scenario.amountTHB, 0);
    if (byId("scenarioFunding")) byId("scenarioFunding").value = scenario.funding || "newMoney";
    if (byId("scenarioReturn")) byId("scenarioReturn").value = cleanNumber(scenario.returnPct, 0);
  }

  async function loadPortfolioData() {
    const cacheBuster = `ts=${Date.now()}`;
    const sources = location.hostname.endsWith("github.io")
      ? [`api/portfolio.json?${cacheBuster}`]
      : [`/api/portfolio?${cacheBuster}`, `api/portfolio.json?${cacheBuster}`];

    let lastError = null;
    for (const source of sources) {
      try {
        const response = await fetch(source, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load portfolio");
        portfolioData = data;
        renderScenario();
        return;
      } catch (error) {
        lastError = error;
      }
    }

    const body = byId("scenarioBody");
    if (body) {
      body.innerHTML = `<tr><td colspan="5" class="error-line">${lastError?.message || "Could not load portfolio"}</td></tr>`;
    }
  }

  function calculateScenario(data) {
    const amountTHB = Math.max(0, cleanNumber(scenario.amountTHB, 0));
    const returnPct = cleanNumber(scenario.returnPct, 0);
    const newPositionValue = amountTHB * (1 + returnPct / 100);
    const totalBefore = data.summary.currentValueTHB;
    const beforeByClass = new Map(data.allocation.map((item) => [item.assetClass, item.currentValueTHB]));
    const afterByClass = new Map(beforeByClass);
    const assetClass = scenario.assetClass || "Stocks";
    let cashUsed = 0;
    let sellAmount = 0;
    let newMoney = 0;

    if (scenario.funding === "cash") {
      const availableCash = Math.max(0, beforeByClass.get("Cash") || 0);
      cashUsed = Math.min(amountTHB, availableCash);
      newMoney = Math.max(0, amountTHB - cashUsed);
      afterByClass.set("Cash", availableCash - cashUsed);
    } else if (scenario.funding === "proRata") {
      sellAmount = Math.min(amountTHB, totalBefore);
      newMoney = Math.max(0, amountTHB - sellAmount);
      const sellRatio = totalBefore > 0 ? sellAmount / totalBefore : 0;
      for (const [key, value] of afterByClass.entries()) {
        afterByClass.set(key, Math.max(0, value * (1 - sellRatio)));
      }
    } else {
      newMoney = amountTHB;
    }

    afterByClass.set(assetClass, (afterByClass.get(assetClass) || 0) + newPositionValue);

    const targets = getTargets();
    const classOrder = data.allocation.map((item) => item.assetClass);
    if (!classOrder.includes(assetClass)) classOrder.push(assetClass);
    const totalAfter = Array.from(afterByClass.values()).reduce((sum, value) => sum + value, 0);

    return {
      amountTHB,
      returnPct,
      newPositionValue,
      simulatedPnL: newPositionValue - amountTHB,
      totalAfter,
      newPositionWeight: totalAfter > 0 ? (newPositionValue / totalAfter) * 100 : 0,
      cashUsed,
      sellAmount,
      newMoney,
      rows: classOrder.map((key) => {
        const beforeValue = beforeByClass.get(key) || 0;
        const afterValue = afterByClass.get(key) || 0;
        const beforeWeight = totalBefore > 0 ? (beforeValue / totalBefore) * 100 : 0;
        const afterWeight = totalAfter > 0 ? (afterValue / totalAfter) * 100 : 0;
        const targetWeight = cleanNumber(targets[key], null);

        return {
          assetClass: key,
          beforeValue,
          afterValue,
          beforeWeight,
          afterWeight,
          changeWeight: afterWeight - beforeWeight,
          targetDrift: targetWeight == null ? null : afterWeight - targetWeight,
        };
      }),
    };
  }

  function fundingText(result) {
    const parts = [];
    if (result.cashUsed > 0) parts.push(`Cash ${compactTHB.format(result.cashUsed)}`);
    if (result.sellAmount > 0) parts.push(`Sell ${compactTHB.format(result.sellAmount)}`);
    if (result.newMoney > 0) parts.push(`New ${compactTHB.format(result.newMoney)}`);
    return parts.length ? parts.join(" + ") : "No funding needed";
  }

  function renderScenario() {
    if (!portfolioData || !byId("scenarioBody")) return;

    const result = calculateScenario(portfolioData);
    const symbol = (scenario.symbol || "New asset").trim() || "New asset";
    byId("scenarioTotal").textContent = compactTHB.format(result.totalAfter);
    byId("scenarioWeight").textContent = `${percent.format(result.newPositionWeight)}%`;
    byId("scenarioPnL").textContent = signedTHB(result.simulatedPnL);
    byId("scenarioPnL").className = signedClass(result.simulatedPnL);
    byId("scenarioFundingText").textContent = fundingText(result);

    const notes = [];
    if (symbol.toUpperCase().includes("SPACEX")) {
      notes.push("SpaceX is private, so this uses manual assumptions instead of live market prices.");
    }
    if (scenario.funding === "cash" && result.newMoney > 0) {
      notes.push(`Cash is not enough; add ${compactTHB.format(result.newMoney)} as new money.`);
    }
    if (Math.abs(result.returnPct) > 0.01) {
      notes.push(`${symbol} return assumption is ${signedPercent(result.returnPct)} from entry cost.`);
    }
    byId("scenarioNote").textContent = notes.length ? notes.join(" ") : `${symbol} scenario uses current portfolio values as the base.`;

    byId("scenarioBody").innerHTML = result.rows
      .map((row) => {
        const drift = row.targetDrift == null ? "-" : signedPercent(row.targetDrift);
        const driftClass = row.targetDrift == null ? "" : signedClass(row.targetDrift);
        return `
          <tr>
            <td>
              <div class="asset-name">${row.assetClass}</div>
              <div class="asset-meta">Before ${percent.format(row.beforeWeight)}% | After ${percent.format(row.afterWeight)}%</div>
            </td>
            <td>${compactTHB.format(row.beforeValue)}</td>
            <td>${compactTHB.format(row.afterValue)}</td>
            <td class="${signedClass(row.changeWeight)}">${signedPercent(row.changeWeight)}</td>
            <td class="${driftClass}">${drift}</td>
          </tr>
        `;
      })
      .join("");
  }

  function updateFromControl(control) {
    const key = control.dataset.scenarioSim;
    if (!key) return;

    if (key === "amountTHB") {
      scenario[key] = Math.max(0, cleanNumber(control.value, 0));
    } else if (key === "returnPct") {
      scenario[key] = cleanNumber(control.value, 0);
    } else if (key === "symbol") {
      scenario[key] = control.value.trim().toUpperCase();
    } else {
      scenario[key] = control.value;
    }

    saveStoredJson(STORAGE_KEY, scenario);
    renderScenario();
  }

  function applyPreset(name) {
    if (name === "spacex-new") {
      scenario = { symbol: "SPACEX", assetClass: "Stocks", amountTHB: 5_000_000, funding: "newMoney", returnPct: 0 };
    } else if (name === "spacex-cash") {
      scenario = { symbol: "SPACEX", assetClass: "Stocks", amountTHB: 5_000_000, funding: "cash", returnPct: 0 };
    } else if (name === "spacex-sell") {
      scenario = { symbol: "SPACEX", assetClass: "Stocks", amountTHB: 10_000_000, funding: "proRata", returnPct: 0 };
    } else if (name === "clear") {
      scenario = { ...defaultScenario, symbol: "", amountTHB: 0 };
    }

    saveStoredJson(STORAGE_KEY, scenario);
    syncInputs();
    renderScenario();
  }

  installStyles();
  if (!insertPanel()) return;
  syncInputs();

  document.addEventListener("input", (event) => {
    const scenarioControl = event.target.closest?.("[data-scenario-sim]");
    if (scenarioControl) updateFromControl(scenarioControl);

    if (event.target.closest?.("[data-target-asset]")) {
      setTimeout(renderScenario, 0);
    }
  });

  document.addEventListener("change", (event) => {
    const scenarioControl = event.target.closest?.("[data-scenario-sim]");
    if (scenarioControl) updateFromControl(scenarioControl);
  });

  document.addEventListener("click", (event) => {
    const preset = event.target.closest?.("[data-scenario-sim-preset]");
    if (preset) {
      applyPreset(preset.dataset.scenarioSimPreset);
      return;
    }

    if (event.target.closest?.("#refreshButton")) {
      setTimeout(loadPortfolioData, 500);
    }
  });

  loadPortfolioData();
  setInterval(loadPortfolioData, 5 * 60 * 1000);
})();

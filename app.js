const state = {
  timer: null,
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

const number = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 4,
});

const percent = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 2,
});

function byId(id) {
  return document.getElementById(id);
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
  byId("lastUpdated").textContent = `อัปเดต ${new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(data.generatedAt))}`;
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
  byId("sourceNotes").innerHTML = data.sourceNotes.map((note) => `<li>${note}</li>`).join("");
}

function setLoading(isLoading) {
  byId("refreshButton").disabled = isLoading;
  byId("refreshButton").textContent = isLoading ? "Loading" : "Refresh";
}

async function loadPortfolio() {
  setLoading(true);

  try {
    const data = await fetchPortfolioData();

    renderSummary(data);
    renderAllocation(data);
    renderHoldings(data);
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
  const isGithubPages = window.location.hostname.endsWith("github.io");
  const sources = isGithubPages
    ? [`api/portfolio.json?${cacheBuster}`]
    : [`/api/portfolio?${cacheBuster}`, `api/portfolio.json?${cacheBuster}`];

  let lastError = null;
  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load portfolio");
      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Could not load portfolio");
}

byId("refreshButton").addEventListener("click", loadPortfolio);
loadPortfolio();
state.timer = setInterval(loadPortfolio, 5 * 60 * 1000);
const state = {
  timer: null,
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

const number = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 4,
});

const percent = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 2,
});

function byId(id) {
  return document.getElementById(id);
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
  byId("lastUpdated").textContent = `อัปเดต ${new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(data.generatedAt))}`;
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
  byId("sourceNotes").innerHTML = data.sourceNotes.map((note) => `<li>${note}</li>`).join("");
}

function setLoading(isLoading) {
  byId("refreshButton").disabled = isLoading;
  byId("refreshButton").textContent = isLoading ? "Loading" : "Refresh";
}

async function loadPortfolio() {
  setLoading(true);

  try {
    const response = await fetch(`/api/portfolio?ts=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load portfolio");

    renderSummary(data);
    renderAllocation(data);
    renderHoldings(data);
    renderNotes(data);
  } catch (error) {
    byId("holdingsBody").innerHTML = `<tr><td colspan="9" class="error-line">${error.message}</td></tr>`;
    byId("lastUpdated").textContent = "โหลดข้อมูลไม่สำเร็จ";
  } finally {
    setLoading(false);
  }
}

byId("refreshButton").addEventListener("click", loadPortfolio);
loadPortfolio();
state.timer = setInterval(loadPortfolio, 5 * 60 * 1000);

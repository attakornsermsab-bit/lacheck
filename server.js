const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const START_PORT = Number(process.env.PORT || 8787);
const BUY_DATE = "2026-06-12";
const FINNOMENA_BASE = "https://www.finnomena.com/fn3/api/fund/v2/public";

const holdings = [
  {
    id: "kkp-savvy",
    assetClass: "Cash",
    subAsset: "Fixed Deposit Account",
    name: "KKP SAVVY",
    source: "cash",
    currency: "THB",
    investmentTHB: 5_000_000,
    ratio: 0.05,
    imagePrice: 5_000_000,
    imageDate: "2026-06-12",
  },
  {
    id: "kasf",
    assetClass: "Bonds",
    subAsset: "Short-term",
    name: "KASF",
    source: "finnomena",
    finnomenaCode: "KASF",
    currency: "THB",
    investmentTHB: 15_000_000,
    ratio: 0.15,
    imagePrice: 17.1474,
    imageDate: "2026-06-12",
  },
  {
    id: "ktfixplus-x",
    assetClass: "Bonds",
    subAsset: "Long-term",
    name: "KTFIXPLUS-X",
    source: "finnomena",
    finnomenaCode: "KTFIXPLUS-X",
    currency: "THB",
    investmentTHB: 15_000_000,
    ratio: 0.15,
    imagePrice: 14.1943,
    imageDate: "2026-06-12",
  },
  {
    id: "gulf",
    assetClass: "Stocks",
    subAsset: "TH",
    name: "GULF",
    source: "yahoo",
    yahooSymbol: "GULF.BK",
    currency: "THB",
    investmentTHB: 5_000_000,
    ratio: 0.05,
    imagePrice: 64,
    imageDate: "2026-06-12",
  },
  {
    id: "nvda",
    assetClass: "Stocks",
    subAsset: "US",
    name: "NVDA",
    source: "yahoo",
    yahooSymbol: "NVDA",
    currency: "USD",
    investmentTHB: 10_000_000,
    ratio: 0.1,
    imagePrice: 205.19,
    imageDate: "2026-06-12",
  },
  {
    id: "sndk",
    assetClass: "Stocks",
    subAsset: "US",
    name: "SNDK",
    source: "yahoo",
    yahooSymbol: "SNDK",
    currency: "USD",
    investmentTHB: 10_000_000,
    ratio: 0.1,
    imagePrice: 1980.1,
    imageDate: "2026-06-12",
  },
  {
    id: "lly",
    assetClass: "Stocks",
    subAsset: "US",
    name: "LLY",
    source: "yahoo",
    yahooSymbol: "LLY",
    currency: "USD",
    investmentTHB: 10_000_000,
    ratio: 0.1,
    imagePrice: 1133,
    imageDate: "2026-06-12",
  },
  {
    id: "mu",
    assetClass: "Stocks",
    subAsset: "US",
    name: "MU",
    source: "yahoo",
    yahooSymbol: "MU",
    currency: "USD",
    investmentTHB: 10_000_000,
    ratio: 0.1,
    imagePrice: 981.61,
    imageDate: "2026-06-12",
  },
  {
    id: "scbgold",
    assetClass: "Alternative Investment",
    subAsset: "Gold",
    name: "SCBGOLD",
    source: "finnomena",
    finnomenaCode: "SCBGOLD",
    currency: "THB",
    investmentTHB: 10_000_000,
    ratio: 0.1,
    imagePrice: 22.5862,
    imageDate: "2026-06-12",
  },
  {
    id: "scboil",
    assetClass: "Alternative Investment",
    subAsset: "Oil",
    name: "SCBOIL",
    source: "finnomena",
    finnomenaCode: "SCBOIL",
    currency: "THB",
    investmentTHB: 10_000_000,
    ratio: 0.1,
    imagePrice: 8.0491,
    imageDate: "2026-06-11",
  },
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function unixFor(date, dayOffset = 0) {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000) + dayOffset * 86400;
}

function dateFromUnix(seconds) {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function percent(value) {
  return Number.isFinite(value) ? value * 100 : null;
}

async function fetchJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "PortfolioMonitor/1.0 (+local dashboard)",
      },
    });

    if (!response.ok) {
      throw new Error(`${label} returned ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function rowsFromYahooResult(result) {
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};

  return timestamps
    .map((timestamp, index) => ({
      timestamp,
      date: dateFromUnix(timestamp),
      open: quote.open?.[index] ?? null,
      high: quote.high?.[index] ?? null,
      low: quote.low?.[index] ?? null,
      close: quote.close?.[index] ?? null,
      volume: quote.volume?.[index] ?? null,
    }))
    .filter((row) => Number.isFinite(row.close));
}

async function yahooChart(symbol, query) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`;
  const json = await fetchJson(url, `Yahoo ${symbol}`);
  const error = json.chart?.error;
  if (error) {
    throw new Error(error.description || `Yahoo ${symbol} error`);
  }

  const result = json.chart?.result?.[0];
  if (!result) {
    throw new Error(`Yahoo ${symbol} has no chart data`);
  }

  return result;
}

async function yahooLatest(symbol) {
  const result = await yahooChart(symbol, "range=10d&interval=1d&includePrePost=false");
  const rows = rowsFromYahooResult(result);
  const last = rows.at(-1);
  const meta = result.meta || {};
  const price = Number(meta.regularMarketPrice ?? last?.close);

  if (!Number.isFinite(price)) {
    throw new Error(`Yahoo ${symbol} has no latest price`);
  }

  return {
    price,
    date: meta.regularMarketTime ? dateFromUnix(meta.regularMarketTime) : last?.date,
    currency: meta.currency || null,
    source: "Yahoo Finance",
  };
}

async function yahooClose(symbol, date) {
  const period1 = unixFor(date, -7);
  const period2 = unixFor(date, 2);
  const result = await yahooChart(symbol, `period1=${period1}&period2=${period2}&interval=1d&events=history`);
  const rows = rowsFromYahooResult(result);
  const exact = rows.find((row) => row.date === date);
  const fallback = rows.filter((row) => row.date <= date).at(-1);
  const row = exact || fallback;

  if (!row) {
    throw new Error(`Yahoo ${symbol} has no close near ${date}`);
  }

  return {
    price: row.close,
    date: row.date,
    exact: Boolean(exact),
    currency: result.meta?.currency || null,
    source: "Yahoo Finance",
  };
}

async function fundLatest(code) {
  const json = await fetchJson(`${FINNOMENA_BASE}/funds/${encodeURIComponent(code)}/latest`, `Finnomena ${code}`);
  const data = json.data;

  if (!json.status || !data || !Number.isFinite(Number(data.value))) {
    throw new Error(`Finnomena ${code} has no latest NAV`);
  }

  return {
    price: Number(data.value),
    date: String(data.date).slice(0, 10),
    currency: "THB",
    source: "Finnomena",
  };
}

async function fundClose(code, date) {
  for (const range of ["1Y", "MAX"]) {
    const json = await fetchJson(
      `${FINNOMENA_BASE}/funds/${encodeURIComponent(code)}/nav/q?range=${range}`,
      `Finnomena ${code} NAV`
    );
    const navs = json.data?.navs || [];
    const rows = navs
      .map((row) => ({
        date: String(row.date).slice(0, 10),
        price: Number(row.value),
      }))
      .filter((row) => Number.isFinite(row.price));
    const exact = rows.find((row) => row.date === date);
    const fallback = rows.filter((row) => row.date <= date).at(-1);
    const row = exact || fallback;

    if (row) {
      return {
        price: row.price,
        date: row.date,
        exact: Boolean(exact),
        currency: "THB",
        source: "Finnomena",
      };
    }
  }

  throw new Error(`Finnomena ${code} has no NAV near ${date}`);
}

function validatePrice(holding, reference) {
  if (holding.source === "cash") {
    return {
      status: "manual",
      enteredPrice: holding.imagePrice,
      officialPrice: holding.imagePrice,
      officialDate: BUY_DATE,
      difference: 0,
      differencePct: 0,
      note: "Cash balance treated as unchanged unless edited.",
    };
  }

  const entered = Number(holding.imagePrice);
  const official = Number(reference.price);
  const difference = official - entered;
  const tolerance = Math.max(Math.abs(official) * 0.00001, holding.currency === "USD" ? 0.01 : 0.0001);
  const matches = Math.abs(difference) <= tolerance;

  return {
    status: matches ? "match" : "mismatch",
    enteredPrice: entered,
    enteredDate: holding.imageDate,
    officialPrice: official,
    officialDate: reference.date,
    difference,
    differencePct: official ? difference / official : null,
    note: matches ? "Entered price matches the 12 Jun 2026 close." : "Entered price differs from the 12 Jun 2026 close.",
  };
}

async function resolveMarketPrice(holding) {
  if (holding.source === "cash") {
    return {
      reference: {
        price: holding.imagePrice,
        date: BUY_DATE,
        exact: true,
        currency: "THB",
        source: "Manual cash balance",
      },
      latest: {
        price: holding.imagePrice,
        date: new Date().toISOString().slice(0, 10),
        currency: "THB",
        source: "Manual cash balance",
      },
    };
  }

  if (holding.source === "yahoo") {
    const [reference, latest] = await Promise.all([
      yahooClose(holding.yahooSymbol, BUY_DATE),
      yahooLatest(holding.yahooSymbol),
    ]);
    return { reference, latest };
  }

  if (holding.source === "finnomena") {
    const [reference, latest] = await Promise.all([
      fundClose(holding.finnomenaCode, BUY_DATE),
      fundLatest(holding.finnomenaCode),
    ]);
    return { reference, latest };
  }

  throw new Error(`Unknown source for ${holding.name}`);
}

function buildHolding(holding, market, fxReference, fxLatest) {
  const fxAtBuy = holding.currency === "USD" ? fxReference.price : 1;
  const fxNow = holding.currency === "USD" ? fxLatest.price : 1;
  const referencePrice = market.reference.price;
  const latestPrice = market.latest.price;
  const units = holding.source === "cash" ? 1 : holding.investmentTHB / (referencePrice * fxAtBuy);
  const currentValueTHB = holding.source === "cash" ? holding.investmentTHB : units * latestPrice * fxNow;
  const gainLossTHB = currentValueTHB - holding.investmentTHB;
  const returnPct = gainLossTHB / holding.investmentTHB;
  const priceReturnPct = latestPrice / referencePrice - 1;

  return {
    ...holding,
    reference: market.reference,
    latest: market.latest,
    units,
    fxAtBuy,
    fxNow,
    currentValueTHB,
    gainLossTHB,
    returnPct: percent(returnPct),
    priceReturnPct: percent(priceReturnPct),
    currentWeight: null,
    validation: validatePrice(holding, market.reference),
  };
}

async function portfolioSnapshot() {
  const [fxReference, fxLatest] = await Promise.all([
    yahooClose("USDTHB=X", BUY_DATE),
    yahooLatest("USDTHB=X"),
  ]);

  const settled = await Promise.allSettled(
    holdings.map(async (holding) => {
      const market = await resolveMarketPrice(holding);
      return buildHolding(holding, market, fxReference, fxLatest);
    })
  );

  const rows = settled.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const holding = holdings[index];
    return {
      ...holding,
      error: result.reason?.message || String(result.reason),
      reference: null,
      latest: null,
      units: null,
      fxAtBuy: holding.currency === "USD" ? fxReference.price : 1,
      fxNow: holding.currency === "USD" ? fxLatest.price : 1,
      currentValueTHB: holding.investmentTHB,
      gainLossTHB: 0,
      returnPct: 0,
      priceReturnPct: 0,
      currentWeight: null,
      validation: {
        status: "error",
        enteredPrice: holding.imagePrice,
        officialPrice: null,
        officialDate: null,
        difference: null,
        differencePct: null,
        note: "Could not verify this price.",
      },
    };
  });

  const totalInvestedTHB = holdings.reduce((sum, holding) => sum + holding.investmentTHB, 0);
  const currentValueTHB = rows.reduce((sum, row) => sum + row.currentValueTHB, 0);
  const gainLossTHB = currentValueTHB - totalInvestedTHB;
  const returnPct = gainLossTHB / totalInvestedTHB;

  rows.forEach((row) => {
    row.currentWeight = currentValueTHB ? percent(row.currentValueTHB / currentValueTHB) : null;
  });

  const allocation = Object.values(
    rows.reduce((groups, row) => {
      groups[row.assetClass] ||= {
        assetClass: row.assetClass,
        investmentTHB: 0,
        currentValueTHB: 0,
        gainLossTHB: 0,
        returnPct: 0,
        currentWeight: 0,
      };
      groups[row.assetClass].investmentTHB += row.investmentTHB;
      groups[row.assetClass].currentValueTHB += row.currentValueTHB;
      groups[row.assetClass].gainLossTHB += row.gainLossTHB;
      return groups;
    }, {})
  ).map((group) => ({
    ...group,
    returnPct: percent(group.gainLossTHB / group.investmentTHB),
    currentWeight: currentValueTHB ? percent(group.currentValueTHB / currentValueTHB) : 0,
  }));

  return {
    buyDate: BUY_DATE,
    generatedAt: new Date().toISOString(),
    summary: {
      totalInvestedTHB,
      currentValueTHB,
      gainLossTHB,
      returnPct: percent(returnPct),
    },
    fx: {
      reference: fxReference,
      latest: fxLatest,
    },
    allocation,
    holdings: rows,
    sourceNotes: [
      "US stocks, GULF.BK, and USD/THB use Yahoo Finance chart data.",
      "Thai mutual funds use Finnomena public fund NAV data.",
      "KKP SAVVY is treated as cash/fixed deposit because no NAV feed is available in the image.",
    ],
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const decoded = decodeURIComponent(pathname);
  const target = path.normalize(path.join(ROOT, decoded));

  if (!target.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(target, (error, content) => {
    if (error) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": mimeTypes[path.extname(target)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === "/api/portfolio") {
    try {
      const snapshot = await portfolioSnapshot();
      sendJson(response, 200, snapshot);
    } catch (error) {
      sendJson(response, 500, {
        error: error.message || String(error),
        generatedAt: new Date().toISOString(),
      });
    }
    return;
  }

  serveStatic(request, response);
});

function listen(port) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && port < START_PORT + 20) {
      listen(port + 1);
      return;
    }
    throw error;
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    fs.writeFileSync(path.join(ROOT, "monitor-url.txt"), url, "utf8");
    console.log(`Portfolio monitor running at ${url}`);
  });
}

listen(START_PORT);

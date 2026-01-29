
import axios from "axios";

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const TWELVE_DATA_BASE = "https://api.twelvedata.com";

// Example symbols for watchlist
const WATCHLIST = ["AAPL", "TSLA", "BTC/USD"];

export async function getMarketNews(req, res) {
  // TODO: Integrate Finnhub/FMP for real news
  res.json([
    {
      id: "news_89342",
      headline: "US CPI comes in higher than expected",
      source: "Reuters",
      time: "2026-01-29T12:30:00Z",
      impact: "HIGH",
      assets: ["USD", "EUR"],
      url: "https://reuters.com/news/89342"
    }
  ]);
}

export async function getMarketPrices(req, res) {
  try {
    const symbols = req.query.symbols || WATCHLIST.join(",");
    const url = `${TWELVE_DATA_BASE}/price?symbol=${symbols}&apikey=${TWELVE_DATA_API_KEY}`;
    const { data } = await axios.get(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch prices", details: err.message });
  }
}

export async function getMarketChart(req, res) {
  try {
    const symbol = req.query.symbol || "AAPL";
    const interval = req.query.interval || "1min";
    const url = `${TWELVE_DATA_BASE}/time_series?symbol=${symbol}&interval=${interval}&outputsize=30&apikey=${TWELVE_DATA_API_KEY}`;
    const { data } = await axios.get(url);
    // Normalize for frontend
    const candles = (data.values || []).map(c => ({
      time: c.datetime,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseFloat(c.volume)
    }));
    res.json({ symbol, interval, candles });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chart", details: err.message });
  }
}

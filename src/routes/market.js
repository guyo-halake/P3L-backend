// backend/src/routes/market.js
import express from "express";
import { getMarketNews, getMarketPrices, getMarketChart } from "../controllers/marketController.js";

const router = express.Router();

router.get("/news", getMarketNews);
router.get("/prices", getMarketPrices);
router.get("/chart", getMarketChart);

export default router;

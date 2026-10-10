/**
 * server/services/salesAnalytics.js (Batch 6)
 * Logic for sales summaries, top recipes, hourly distribution, and trends.
 */

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (value) => {
  const date = value ? new Date(value) : null;
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
};

const sameDayKey = (date) => {
  return date.toISOString().slice(0, 10);
};

export const buildSalesSummary = ({ sales, now = new Date() }) => {
  const last7dCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30dCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const summary = {
    totalSalesEvents: sales.length,
    totalQuantitySold: 0,
    salesLast7d: 0,
    salesLast30d: 0,
    quantityLast7d: 0,
    quantityLast30d: 0,
  };

  sales.forEach((sale) => {
    const qty = safeNumber(sale.quantitySold || sale.quantity);
    const createdAt = normalizeDate(sale.createdAt || sale.timestamp);

    summary.totalQuantitySold += qty;

    if (createdAt && createdAt >= last7dCutoff) {
      summary.salesLast7d += 1;
      summary.quantityLast7d += qty;
    }

    if (createdAt && createdAt >= last30dCutoff) {
      summary.salesLast30d += 1;
      summary.quantityLast30d += qty;
    }
  });

  return summary;
};

export const buildTopSellingRecipes = ({ sales, limit = 5 }) => {
  const recipeMap = new Map();

  sales.forEach((sale) => {
    const recipeId = sale.recipeId || "unknown";
    const recipeName = sale.recipeName || sale.menuItemName || "Unknown recipe";
    const qty = safeNumber(sale.quantitySold || sale.quantity);

    if (!recipeMap.has(recipeId)) {
      recipeMap.set(recipeId, {
        recipeId,
        recipeName,
        totalSalesEvents: 0,
        totalQuantitySold: 0,
      });
    }

    const entry = recipeMap.get(recipeId);
    entry.totalSalesEvents += 1;
    entry.totalQuantitySold += qty;
  });

  return Array.from(recipeMap.values())
    .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
    .slice(0, limit);
};

export const buildHourlySalesDistribution = ({ sales }) => {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    salesEvents: 0,
    quantitySold: 0,
  }));

  sales.forEach((sale) => {
    const qty = safeNumber(sale.quantitySold || sale.quantity);
    const createdAt = normalizeDate(sale.createdAt || sale.timestamp);
    if (!createdAt) return;

    const hour = createdAt.getHours();
    hours[hour].salesEvents += 1;
    hours[hour].quantitySold += qty;
  });

  return hours;
};

export const buildDailySalesTrend = ({ sales, days = 7, now = new Date() }) => {
  const trend = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    const key = sameDayKey(date);

    trend.push({
      date: key,
      salesEvents: 0,
      quantitySold: 0,
    });
  }

  const trendMap = new Map(trend.map((entry) => [entry.date, entry]));

  sales.forEach((sale) => {
    const qty = safeNumber(sale.quantitySold || sale.quantity);
    const createdAt = normalizeDate(sale.createdAt || sale.timestamp);
    if (!createdAt) return;

    const key = sameDayKey(createdAt);
    const entry = trendMap.get(key);
    if (!entry) return;

    entry.salesEvents += 1;
    entry.quantitySold += qty;
  });

  return trend;
};

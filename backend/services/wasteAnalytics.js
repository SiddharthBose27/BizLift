/**
 * server/services/wasteAnalytics.js (Batch 7)
 * Logic for waste summaries, item-level/reason-level aggregation, and cost impact calculation.
 */

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (value) => {
  const date = value ? new Date(value) : null;
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
};

const roundValue = (value, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};

export const buildWasteSummary = ({ wasteEvents, now = new Date() }) => {
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const summary = {
    totalWasteEvents: wasteEvents.length,
    totalWasteQty: 0,
    totalWasteCost: 0,
    wasteEvents7d: 0,
    wasteEvents30d: 0,
    wasteQty7d: 0,
    wasteQty30d: 0,
    wasteCost7d: 0,
    wasteCost30d: 0,
  };

  wasteEvents.forEach((event) => {
    const qty = safeNumber(event.quantity);
    const unitCost = safeNumber(event.unitCost);
    const createdAt = normalizeDate(event.createdAt);
    const cost = roundValue(qty * unitCost);

    summary.totalWasteQty += qty;
    summary.totalWasteCost += cost;

    if (createdAt && createdAt >= cutoff7d) {
      summary.wasteEvents7d += 1;
      summary.wasteQty7d += qty;
      summary.wasteCost7d += cost;
    }

    if (createdAt && createdAt >= cutoff30d) {
      summary.wasteEvents30d += 1;
      summary.wasteQty30d += qty;
      summary.wasteCost30d += cost;
    }
  });

  summary.totalWasteQty = roundValue(summary.totalWasteQty);
  summary.totalWasteCost = roundValue(summary.totalWasteCost);
  summary.wasteQty7d = roundValue(summary.wasteQty7d);
  summary.wasteQty30d = roundValue(summary.wasteQty30d);
  summary.wasteCost7d = roundValue(summary.wasteCost7d);
  summary.wasteCost30d = roundValue(summary.wasteCost30d);

  return summary;
};

export const buildWasteByItem = ({ wasteEvents, limit = 10 }) => {
  const itemMap = new Map();

  wasteEvents.forEach((event) => {
    const key = String(
      event.inventoryItemId || event.inventoryItemName || "unknown",
    );
    if (!itemMap.has(key)) {
      itemMap.set(key, {
        inventoryItemId: event.inventoryItemId || null,
        inventoryItemName: event.inventoryItemName || "Unknown item",
        unit: event.unit || "",
        totalWasteEvents: 0,
        totalWasteQty: 0,
        totalWasteCost: 0,
      });
    }

    const entry = itemMap.get(key);
    const qty = safeNumber(event.quantity);
    const cost = roundValue(qty * safeNumber(event.unitCost));

    entry.totalWasteEvents += 1;
    entry.totalWasteQty += qty;
    entry.totalWasteCost += cost;
  });

  return Array.from(itemMap.values())
    .map((entry) => ({
      ...entry,
      totalWasteQty: roundValue(entry.totalWasteQty),
      totalWasteCost: roundValue(entry.totalWasteCost),
    }))
    .sort((a, b) => b.totalWasteCost - a.totalWasteCost)
    .slice(0, limit);
};

export const buildWasteByReason = ({ wasteEvents }) => {
  const reasonMap = new Map();

  wasteEvents.forEach((event) => {
    const reason = event.reason || "unspecified";
    if (!reasonMap.has(reason)) {
      reasonMap.set(reason, {
        reason,
        totalWasteEvents: 0,
        totalWasteQty: 0,
        totalWasteCost: 0,
      });
    }

    const entry = reasonMap.get(reason);
    const qty = safeNumber(event.quantity);
    const cost = roundValue(qty * safeNumber(event.unitCost));

    entry.totalWasteEvents += 1;
    entry.totalWasteQty += qty;
    entry.totalWasteCost += cost;
  });

  return Array.from(reasonMap.values())
    .map((entry) => ({
      ...entry,
      totalWasteQty: roundValue(entry.totalWasteQty),
      totalWasteCost: roundValue(entry.totalWasteCost),
    }))
    .sort((a, b) => b.totalWasteCost - a.totalWasteCost);
};

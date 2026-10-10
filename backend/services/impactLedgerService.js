import { getWorkspaceStore } from "./workspaceService.js";

const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const round = (v) => Number(n(v).toFixed(2));

export const buildImpactLedger = ({ officeId, vendorId }) => {
  const store = getWorkspaceStore({ officeId, vendorId });
  const rows = Array.isArray(store.recommendationOutcomes) ? store.recommendationOutcomes : [];
  const completed = rows.filter(x => ["completed","measured","approved"].includes(String(x.status).toLowerCase()));
  const measured = rows.filter(x => Number.isFinite(Number(x.realizedImpact)) && Number(x.realizedImpact) !== 0);
  const expected = completed.reduce((s,x) => s + n(x.expectedImpact), 0);
  const realized = measured.reduce((s,x) => s + n(x.realizedImpact), 0);
  const accuracyRows = measured.filter(x => n(x.expectedImpact) !== 0).map(x => ({ ...x, accuracy: round((n(x.realizedImpact) / n(x.expectedImpact)) * 100) }));
  const accuracy = accuracyRows.length ? accuracyRows.reduce((s,x) => s + x.accuracy, 0) / accuracyRows.length : null;
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRecommendations: rows.length,
      actedOn: completed.length,
      measured: measured.length,
      expectedValue: round(expected),
      realizedValue: round(realized),
      valueDelta: round(realized - expected),
      predictionAccuracy: accuracy === null ? null : round(accuracy),
      successRate: completed.length ? round((measured.filter(x => n(x.realizedImpact) >= n(x.expectedImpact)).length / Math.max(1, measured.length)) * 100) : 0
    },
    recent: rows.slice(0, 12).map(x => ({
      id:x.id,title:x.title,type:x.type,status:x.status,expectedImpact:n(x.expectedImpact),realizedImpact:n(x.realizedImpact),
      accuracy:n(x.expectedImpact) ? round((n(x.realizedImpact)/n(x.expectedImpact))*100) : null,createdAt:x.createdAt,updatedAt:x.updatedAt,notes:x.notes
    }))
  };
};

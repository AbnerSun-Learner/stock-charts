export interface GridPrefill { etfCode: string | null; etfName: string | null; latestPrice: number | null }
type QueryReader = { get(name: string): string | null };

export function buildGridStrategyHref(prefill: { etfCode: string; etfName: string; latestPrice: number | null }): string {
  const params = new URLSearchParams({ etfCode: prefill.etfCode, etfName: prefill.etfName });
  if (prefill.latestPrice != null && Number.isFinite(prefill.latestPrice) && prefill.latestPrice > 0) params.set('price', String(prefill.latestPrice));
  return `/view/grid?${params.toString()}`;
}

export function parseGridPrefill(query: QueryReader): GridPrefill {
  const code = query.get('etfCode');
  const name = query.get('etfName')?.trim().slice(0, 80) || null;
  const price = Number(query.get('price'));
  return {
    etfCode: code && /^\d{6}$/.test(code) ? code : null,
    etfName: name,
    latestPrice: Number.isFinite(price) && price > 0 ? price : null,
  };
}

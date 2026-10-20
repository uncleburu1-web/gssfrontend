/**
 * The promotion evaluator. MUST stay identical to the server's promotions/engine.py; both are
 * tested against the same cases (gss promotions/test_vectors.json = test/promotion_vectors.json).
 * The same file is used by the web and Android apps (src/utils/promotions.js there).
 *
 *   bestDiscounts(lines, promotions, now) -> [{ discount, promotion_id }]
 *
 * lines: [{ product_id, category, quantity, unit_price }]. One promotion per line, the one that saves
 * the most; never stacked. Money is worked in kobo and rounds half up, like the server.
 */
const kobo = (v) => Math.round(Number(v || 0) * 100);

export function isLive(p, now = new Date()) {
  if (p.is_active === false || p.is_deleted) return false;
  const t = now.getTime();
  if (p.starts_at && t < Date.parse(p.starts_at)) return false;
  if (p.ends_at && t >= Date.parse(p.ends_at)) return false;
  return true;
}

export function matches(p, line) {
  if (p.applies_to === 'all') return true;
  if (p.applies_to === 'category') return Boolean(p.category) && p.category === line.category;
  return Boolean(line.product_id) && String(p.item_id) === String(line.product_id);
}

/**
 * Discount in kobo. Quantities may be kg (3 decimals) for weighed products: % off and amount-off-each
 * (per kg) apply to the exact weight; buy-X-get-Y counts whole units only. Grams keep it exact.
 */
function discountKobo(p, line) {
  const grams = Math.round((Number(line.quantity) || 0) * 1000);
  const price = kobo(line.unit_price);
  if (grams <= 0 || price <= 0) return 0;
  const gross = Math.round((price * grams) / 1000);
  if (p.kind === 'buy_x_get_y') {
    const buy = Number(p.buy_quantity) || 0;
    const get = Number(p.get_quantity) || 0;
    if (buy <= 0 || get <= 0) return 0;
    const units = Math.floor(grams / 1000);
    return Math.min(gross, price * Math.floor(units / (buy + get)) * get);
  }
  if (grams < (Number(p.min_quantity) || 1) * 1000) return 0;
  const value = Number(p.value) || 0;
  if (p.kind === 'percent_off') return Math.round((gross * Math.min(Math.max(value, 0), 100)) / 100);
  if (p.kind === 'amount_off') return Math.min(gross, Math.round((kobo(Math.max(value, 0)) * grams) / 1000));
  return 0;
}

export function bestDiscounts(lines, promotions, now = new Date()) {
  const live = (promotions || []).filter((p) => isLive(p, now));
  return lines.map((line) => {
    let best = 0;
    let id = null;
    for (const p of live) {
      if (!matches(p, line)) continue;
      const d = discountKobo(p, line);
      if (d > best) { best = d; id = String(p.id); }
    }
    return { discount: best / 100, promotion_id: id };
  });
}

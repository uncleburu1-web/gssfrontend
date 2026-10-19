/*
 * Real browser -> real Django server end-to-end check (the kind of test that would have caught the
 * Idempotency-Key CORS outage: unit tests never cross an origin).
 *
 *   1. Postgres DB "benchline_e2e":  DATABASE_URL=... python manage.py migrate && python manage.py shell < e2e/seed.py
 *   2. Backend:  DATABASE_URL=... daphne -b 127.0.0.1 -p 8000 benchline.asgi:application
 *   3. Web:      VITE_API_URL=http://localhost:8000/api npx vite build && npx vite preview --port 5173
 *   4. Run:      node e2e/real-server.e2e.cjs      (needs Playwright + Chromium)
 *
 * Covers: sign-in, seller-only sales, a cross-origin sale POST with Idempotency-Key + X-Device-ID
 * (preflight + replay), damage with a reason, owner stock count, audit log, the subscription-ended
 * card for owner and seller (no grace), 402 readable cross-origin, and renewal reopening the app.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { execSync } = require('child_process');
const WEB = process.env.E2E_WEB || 'http://localhost:5173';
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
// Runs SQL against the E2E database (default: local Postgres as the postgres user).
const sql = (q) => execSync(`${process.env.E2E_PSQL || 'su postgres -c "psql -d benchline_e2e -tAc'} \\"${q}\\""`).toString().trim();

async function session(browser, username) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const problems = [];
  page.on('requestfailed', (r) => {
    const err = r.failure()?.errorText || '';
    // Only our own app and API count. ERR_ABORTED = a request cancelled by navigating away; external
    // fonts are blocked by this sandbox's network, not by the app.
    if (!/localhost/.test(r.url()) || err === 'net::ERR_ABORTED') return;
    problems.push(`request failed: ${r.method()} ${r.url()} ${err}`);
  });
  page.on('console', (m) => { if (m.type() === 'error' && /CORS|blocked|Access-Control/i.test(m.text())) problems.push(`console: ${m.text()}`); });
  await page.goto(`${WEB}/login`);
  await page.fill('input[autocomplete="username"]', username);
  await page.fill('input[type="password"]', 'pass12345');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app', { timeout: 15000 });
  return { page, context, problems };
}

(async () => {
  sql("UPDATE subscriptions_subscription SET status = 'trial', current_period_end = now() + interval '30 days'"); // start from a live trial
  const browser = await chromium.launch();
  try {
    // ---- seller ----
    const s = await session(browser, 'sade');
    check('seller signs in through the real browser', true);
    await s.page.goto(`${WEB}/app/sales`);
    await s.page.click('button.subtab:has-text("Completed")');
    await s.page.waitForSelector('text=only the ones you made', { timeout: 10000 });
    check('seller sales list is labelled own-only', true);

    // A real cross-origin POST with the Idempotency-Key and X-Device-ID headers (the CORS outage class).
    const preflight = await s.page.evaluate(async () => {
      const token = localStorage.getItem('access_token');
      const body = { customer_name: 'Walk-in', payment_method: 'cash', status: 'completed', amount_paid: 2500,
        items: [{ item_name: 'Palm Oil 1L', quantity: 1, unit_price: 2500 }] };
      const key = crypto.randomUUID();
      const send = () => fetch('http://localhost:8000/api/sales/', { method: 'POST', headers: {
        'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': key, 'X-Device-ID': crypto.randomUUID() },
        body: JSON.stringify(body) });
      const a = await send(); const b = await send();
      return { a: a.status, b: b.status, replay: b.headers.get('Idempotent-Replay') };
    });
    check('sale POST with Idempotency-Key passes CORS preflight', preflight.a === 201, JSON.stringify(preflight));
    check('retried sale is replayed, not charged twice', preflight.b === 201 && preflight.replay === 'true');

    await s.page.goto(`${WEB}/app/inventory`);
    await s.page.click('text=Palm Oil 1L');
    await s.page.click('button:has-text("Record damage")');
    await s.page.fill('.modal input[type="number"]', '2');
    await s.page.fill('.modal input:not([type])', 'Bottles cracked in delivery');
    const [damageRes] = await Promise.all([
      s.page.waitForResponse((r) => r.url().includes('/damage/')),
      s.page.click('.modal button[type="submit"]'),
    ]);
    check('seller records damage with a reason from the browser', damageRes.status() === 201, `status ${damageRes.status()}`);
    await s.page.waitForSelector('text=Bottles cracked in delivery', { timeout: 10000 });
    check('the damage shows in the item stock history', true);
    const countBtn = await s.page.$('button:has-text("Stock count")');
    check('seller has no Stock count button', countBtn === null);
    const auditNav = await s.page.$('a:has-text("Audit log")');
    check('seller has no Audit log page', auditNav === null);
    check('no CORS / network failures for the seller', s.problems.length === 0, s.problems.join(' | '));

    // ---- owner ----
    const o = await session(browser, 'ceo');
    await o.page.goto(`${WEB}/app/sales`);
    await o.page.click('button.subtab:has-text("Completed")');
    await o.page.waitForSelector('text=Completed sales', { timeout: 10000 });
    check('owner sales list is not labelled own-only', !(await o.page.isVisible('text=only the ones you made')));
    await o.page.goto(`${WEB}/app/audit`);
    await o.page.waitForSelector('text=Wrote off 2 x Palm Oil 1L as damaged', { timeout: 10000 });
    check('owner sees the damage in the audit log, with who and why', await o.page.isVisible('text=Bottles cracked in delivery'));
    await o.page.goto(`${WEB}/app/shifts`);
    await o.page.waitForLoadState('networkidle');
    check('shifts page loads', !(await o.page.isVisible('text=Could not')));
    await o.page.goto(`${WEB}/app/inventory`);
    await o.page.click('text=Palm Oil 1L');
    await o.page.click('button:has-text("Stock count")');
    await o.page.fill('.modal input[type="number"]', '15');
    await o.page.fill('.modal input:not([type])', 'Month-end count');
    const [countRes] = await Promise.all([
      o.page.waitForResponse((r) => r.url().includes('/stock-count/')),
      o.page.click('.modal button[type="submit"]'),
    ]);
    check('owner stock count works from the browser', countRes.status() === 201, `status ${countRes.status()}`);
    check('no CORS / network failures for the owner', o.problems.length === 0, o.problems.join(' | '));

    // ---- subscription ends: no grace ----
    sql("UPDATE subscriptions_subscription SET status = 'trial', current_period_end = now() - interval '1 second'");
    await o.page.goto(`${WEB}/app`);
    await o.page.waitForSelector('text=Your free trial has ended', { timeout: 10000 });
    check('owner sees the small trial-ended card right after expiry', true);
    check('owner card offers Subscribe', Boolean(await o.page.waitForSelector('a:has-text("Subscribe")', { timeout: 5000 }).catch(() => null)));
    await o.page.click('a:has-text("Subscribe")');
    await o.page.waitForURL('**/app/billing');
    await o.page.waitForLoadState('networkidle');
    check('billing stays reachable to pay', await o.page.isVisible('text=Choose a plan below'));

    await s.page.goto(`${WEB}/app/sales`);
    await s.page.waitForSelector('text=Ask the business owner to subscribe', { timeout: 10000 });
    check('seller sees ask-the-owner card, no Subscribe button', !(await s.page.isVisible('a:has-text("Subscribe")')));
    const blocked = await s.page.evaluate(async () => (await fetch('http://localhost:8000/api/sales/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } })).status);
    check('the API itself refuses with 402 (readable cross-origin)', blocked === 402, `status ${blocked}`);

    sql("UPDATE subscriptions_subscription SET current_period_end = now() + interval '30 days', status = 'active'");
    await s.page.goto(`${WEB}/app/sales`);
    await s.page.click('button.subtab:has-text("Completed")');
    await s.page.waitForSelector('text=Completed sales', { timeout: 10000 });
    check('renewing reopens the app at once', true);
  } catch (err) {
    check(`unexpected: ${err.message.split('\n')[0]}`, false);
  } finally {
    await browser.close();
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
  }
})();

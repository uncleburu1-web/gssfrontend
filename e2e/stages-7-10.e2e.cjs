/*
 * Real browser -> real server checks for stages 7-10 (same setup as real-server.e2e.cjs, plus a
 * second branch "E2E Lekki" in the same business). Covers: owner creates a promotion; the seller's
 * checkout applies it and is paid by mobile money; the owner takes a return; the CEO moves stock to
 * the other branch; the audit log shows before -> after for a price change.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { execSync } = require('child_process');
const WEB = process.env.E2E_WEB || 'http://localhost:5173';
const sql = (q) => execSync(`${process.env.E2E_PSQL || 'su postgres -c "psql -d benchline_e2e -tAc'} \\"${q}\\""`).toString().trim();
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };

async function session(browser, username) {
  const context = await browser.newContext();
  await context.addInitScript(() => { window.open = () => null; window.print = () => {}; }); // receipts: no popups in tests
  const page = await context.newPage();
  const problems = [];
  page.on('requestfailed', (r) => {
    const err = r.failure()?.errorText || '';
    if (!/localhost/.test(r.url()) || err === 'net::ERR_ABORTED') return;
    problems.push(`${r.method()} ${r.url()} ${err}`);
  });
  await page.goto(`${WEB}/login`);
  await page.fill('input[autocomplete="username"]', username);
  await page.fill('input[type="password"]', 'pass12345');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app', { timeout: 15000 });
  return { page, problems };
}

(async () => {
  sql("UPDATE subscriptions_subscription SET status = 'trial', current_period_end = now() + interval '30 days'");
  sql("UPDATE promotions_promotion SET is_deleted = true");
  const browser = await chromium.launch();
  try {
    const o = await session(browser, 'ceo');
    // A CEO with several branches works in one branch at a time (the sidebar's branch switcher).
    const storeId = sql("SELECT id FROM core_shop WHERE name = 'E2E Store'");
    await o.page.evaluate((id) => localStorage.setItem('current_branch_id', id), storeId);
    // ---- promotion ----
    await o.page.goto(`${WEB}/app/promotions`);
    await o.page.click('button:has-text("New promotion")');
    await o.page.fill('.modal input[placeholder^="e.g. Malt"]', 'Palm 10% off');
    await o.page.fill('.modal input[type="number"][max="100"]', '10');
    const productSelect = o.page.locator('.modal select').nth(2);
    await productSelect.selectOption({ label: 'Palm Oil 1L' });
    const [created] = await Promise.all([o.page.waitForResponse((r) => r.url().endsWith('/api/promotions/') && r.request().method() === 'POST'), o.page.click('.modal button[type="submit"]')]);
    check('owner creates a promotion in the browser', created.status() === 201, `status ${created.status()}`);
    await o.page.waitForSelector('text=10% off Palm Oil 1L');

    // ---- seller checkout: promotion applied, mobile money ----
    const s = await session(browser, 'sade');
    await s.page.goto(`${WEB}/app/sales`);
    await s.page.click('button.pos-tile:has-text("Palm Oil 1L")');
    await s.page.waitForSelector('text=Palm 10% off');
    check('checkout shows the promotion on the line', await s.page.isVisible('.cart-totals-row:has-text("Promotions")'));
    await s.page.click('button.pay-method:has-text("Mobile money")');
    const [sale] = await Promise.all([s.page.waitForResponse((r) => r.url().endsWith('/api/sales/') && r.request().method() === 'POST'), s.page.click('.charge-btn')]);
    const body = await sale.json();
    check('the sale is charged at the promoted price', sale.status() === 201 && Number(body.total) === 2250, `total ${body.total}`);
    check('the sale line records the promotion', Boolean(body.items[0].promotion) && Number(body.items[0].discount) === 250);
    check('it was paid by mobile money', sql(`SELECT method FROM sales_salepayment WHERE sale_id = '${body.id}'`) === 'mobile');

    // ---- owner takes a return ----
    await o.page.goto(`${WEB}/app/sales`);
    await o.page.click('button.subtab:has-text("Completed")');
    await o.page.waitForSelector('button:has-text("Return")');
    await o.page.locator('button:has-text("Return")').first().click();
    await o.page.locator('.modal input[type="number"]').first().fill('1');
    await o.page.fill('.modal input[placeholder^="e.g. Wrong size"]', 'Bottle leaking');
    const [ret] = await Promise.all([o.page.waitForResponse((r) => r.url().includes('/return/')), o.page.click('.modal button[type="submit"]')]);
    check('owner takes a return from the browser', ret.status() === 201, `status ${ret.status()}`);
    await o.page.goto(`${WEB}/app/audit`);
    await o.page.waitForSelector('text=Bottle leaking', { timeout: 10000 });
    check('the return is in the audit log with its reason', true);

    // ---- CEO moves stock ----
    const palmBefore = Number(sql("SELECT SUM(b.quantity_remaining) FROM inventory_stockbatch b JOIN inventory_inventoryitem i ON i.id = b.item_id JOIN core_shop s ON s.id = i.shop_id WHERE i.name = 'Palm Oil 1L' AND s.name = 'E2E Store' AND b.is_deleted = false"));
    await o.page.goto(`${WEB}/app/transfers`);
    const selects = o.page.locator('main select');
    await selects.nth(0).selectOption({ label: 'E2E Store' });
    await selects.nth(1).selectOption({ label: 'E2E Lekki' });
    await o.page.click('button:has-text("+ Palm Oil 1L")');
    await o.page.locator('table input[type="number"]').first().fill('2');
    const [moved] = await Promise.all([o.page.waitForResponse((r) => r.url().includes('/inventory/transfers/') && r.request().method() === 'POST'), o.page.click('button[type="submit"]:has-text("Move stock")')]);
    check('CEO moves stock to the other branch', moved.status() === 201, `status ${moved.status()}`);
    const palmAfter = Number(sql("SELECT SUM(b.quantity_remaining) FROM inventory_stockbatch b JOIN inventory_inventoryitem i ON i.id = b.item_id JOIN core_shop s ON s.id = i.shop_id WHERE i.name = 'Palm Oil 1L' AND s.name = 'E2E Store' AND b.is_deleted = false"));
    const lekki = Number(sql("SELECT COALESCE(SUM(b.quantity_remaining),0) FROM inventory_stockbatch b JOIN inventory_inventoryitem i ON i.id = b.item_id JOIN core_shop s ON s.id = i.shop_id WHERE i.name = 'Palm Oil 1L' AND s.name = 'E2E Lekki' AND b.is_deleted = false"));
    check('it left one branch and arrived at the other', palmBefore - palmAfter === 2 && lekki >= 2, `${palmBefore}->${palmAfter}, Lekki ${lekki}`);
    await o.page.waitForSelector('text=Moved to E2E Lekki');

    // ---- price change: before -> after in the audit log ----
    const itemId = sql("SELECT i.id FROM inventory_inventoryitem i JOIN core_shop s ON s.id = i.shop_id WHERE i.name = 'Palm Oil 1L' AND s.name = 'E2E Store'");
    const patched = await o.page.evaluate(async (id) => (await fetch(`http://localhost:8000/api/inventory/items/${id}/`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      body: JSON.stringify({ sell_price: '2600.00' }) })).status, itemId);
    await o.page.goto(`${WEB}/app/audit`);
    await o.page.waitForSelector('s:has-text("2500.00")', { timeout: 10000 });
    check('a price change shows before -> after in the audit log', patched === 200 && await o.page.isVisible('strong:has-text("2600.00")'));
    sql(`UPDATE inventory_inventoryitem SET sell_price = 2500 WHERE id = '${itemId}'`);

    check('no CORS / network failures', o.problems.length + s.problems.length === 0, [...o.problems, ...s.problems].join(' | '));
  } catch (err) {
    check(`unexpected: ${err.message.split('\n')[0]}`, false);
  } finally {
    await browser.close();
    const bad = results.filter((r) => !r).length;
    console.log(`\n${results.length - bad}/${results.length} passed`);
    process.exit(bad ? 1 : 0);
  }
})();

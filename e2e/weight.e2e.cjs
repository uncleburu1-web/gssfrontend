/*
 * Stage 11 in a real browser against a real server: a product sold by weight ("Beans (loose)",
 * 10 kg at 1500/kg, see seed.py) is weighed at checkout and charged per kg; stock drops by the exact
 * weight; the Inventory screen shows kg; a whole-unit product still refuses fractions.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { execSync } = require('child_process');
const WEB = process.env.E2E_WEB || 'http://localhost:5173';
const sql = (q) => execSync(`${process.env.E2E_PSQL || 'su postgres -c "psql -d benchline_e2e -tAc'} \\"${q}\\""`).toString().trim();
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const beans = () => Number(sql("SELECT SUM(quantity_remaining) FROM inventory_stockbatch b JOIN inventory_inventoryitem i ON i.id = b.item_id WHERE i.name = 'Beans (loose)' AND b.is_deleted = false"));

(async () => {
  sql("UPDATE subscriptions_subscription SET status = 'trial', current_period_end = now() + interval '30 days'");
  sql("UPDATE promotions_promotion SET is_deleted = true");
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => { window.open = () => null; window.print = () => {}; });
    const page = await ctx.newPage();
    await page.goto(`${WEB}/login`);
    await page.fill('input[autocomplete="username"]', 'sade');
    await page.fill('input[type="password"]', 'pass12345');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app');
    const before = beans();

    await page.goto(`${WEB}/app/sales`);
    await page.click('button.pos-tile:has-text("Beans (loose)")');
    await page.waitForSelector('text=Weigh — Beans (loose)');
    check('tapping a weighed product asks for the weight', true);
    await page.fill('.modal input[type="number"]', '1.25');
    check('the dialog prices the weight', await page.isVisible('text=1.250 kg ='));
    await page.click('.modal button[type="submit"]');
    check('the cart line shows kg and price per kg', await page.isVisible('.cart-line:has-text("per kg")'));
    const [sale] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/sales/') && r.request().method() === 'POST'), page.click('.charge-btn')]);
    const body = await sale.json();
    check('charged per kg: 1.25 kg x 1500 = 1875', sale.status() === 201 && Number(body.total) === 1875, `status ${sale.status()} total ${body.total}`);
    check('the sale line holds 1.25 (a number)', body.items[0].quantity === 1.25 && body.items[0].sold_by_weight === true);
    check('stock dropped by exactly 1.25 kg', Math.abs(before - beans() - 1.25) < 1e-9, `${before} -> ${beans()}`);

    await page.goto(`${WEB}/app/inventory`);
    await page.waitForSelector('text=Beans (loose)');
    check('Inventory shows the stock in kg', await page.isVisible(`text=${beans().toFixed(3)} kg`));

    const refused = await page.evaluate(async () => {
      const token = localStorage.getItem('access_token');
      const items = (await (await fetch('http://localhost:8000/api/inventory/items/?search=Palm', { headers: { Authorization: `Bearer ${token}` } })).json());
      const palm = (items.results || items)[0];
      const r = await fetch('http://localhost:8000/api/sales/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customer_name: 'x', payment_method: 'cash', status: 'completed', items: [{ item: palm.id, item_name: palm.name, quantity: 1.5, unit_price: palm.sell_price }] }) });
      return r.status;
    });
    check('a whole-unit product still refuses 1.5', refused === 400, `status ${refused}`);
  } catch (err) {
    check(`unexpected: ${err.message.split('\n')[0]}`, false);
  } finally {
    await browser.close();
    const bad = results.filter((r) => !r).length;
    console.log(`\n${results.length - bad}/${results.length} passed`);
    process.exit(bad ? 1 : 0);
  }
})();

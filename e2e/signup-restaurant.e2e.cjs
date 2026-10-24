/*
 * Real browser -> real server: a new owner signs up as a restaurant (owner's decision 13: a
 * restaurant is a kind of shop, picked like gadgets or pharmacy).
 *
 *   - the sign-up form offers "Restaurant & food" and says what it gives;
 *   - after the emailed code (read from the database here), the business and its first branch are a
 *     restaurant with the restaurant and retail modules, and no repairs;
 *   - the sidebar is the restaurant's own (Menu, Tables, Kitchen, Taxes & charges, Hub till; no
 *     Sales, Service or Promotions), the dashboard lists the four set-up steps, and a step opens its page.
 *
 *   PLAYWRIGHT_MODULE=<playwright-core> E2E_CHROMIUM=<chrome> E2E_WEB=http://localhost:5173 \
 *   E2E_PSQL='su postgres -c "psql -d <db> -tAc' node e2e/signup-restaurant.e2e.cjs
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const WEB = process.env.E2E_WEB || 'http://localhost:5173';
const SHOTS = process.env.E2E_SHOTS || os.tmpdir();
const sql = (q) => execSync(`${process.env.E2E_PSQL || 'su postgres -c "psql -d benchline_e2e -tAc'} \\"${q}\\""`).toString().trim();
let fails = 0;
const check = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function eventually(fn, ms = 8000) {
  const until = Date.now() + ms;
  for (;;) { try { if (await fn()) return true; } catch {} if (Date.now() > until) return false; await sleep(150); }
}

(async () => {
  const tag = Date.now().toString(36);
  const username = `amaka-${tag}`;
  const email = `amaka-${tag}@example.com`;
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined });
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.setDefaultTimeout(10000);
  try {
    await page.goto(`${WEB}/signup`);
    const options = await page.$$eval('select[aria-label="Kind of shop"] option', (os) => os.map((o) => o.value));
    check('sign-up offers the five kinds of shop, restaurant included', options.join(',') === 'gadgets,clothing,pharmacy,restaurant,general', options.join(','));
    await page.fill('input[placeholder^="e.g. Chidi"]', "Amaka's Kitchen");
    await page.selectOption('select[aria-label="Kind of shop"]', 'restaurant');
    check('…and says what a restaurant gets', (await page.textContent('.lp-auth-card')).includes('Menu, tables, kitchen tickets'));
    await page.fill('input[placeholder^="Optional"]', 'Amaka Obi');
    await page.fill('input[autocomplete="username"]', username);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'a-long-password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/verify-email', { timeout: 15000 });
    const code = sql(`SELECT o.code FROM core_emailotp o JOIN auth_user u ON u.id = o.user_id WHERE u.username = '${username}' ORDER BY o.id DESC LIMIT 1`);
    check('the server sent a 6-digit code', /^\d{6}$/.test(code));
    await page.fill('input[inputmode="numeric"]', code);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app/**', { timeout: 15000 });

    const shop = sql(`SELECT s.shop_type || '/' || o.business_type FROM core_shop s JOIN core_organization o ON o.id = s.organization_id JOIN auth_user u ON u.id = o.owner_id WHERE u.username = '${username}'`);
    check('the business and its first branch are a restaurant', shop === 'restaurant/restaurant', shop);
    const mods = sql(`SELECT string_agg(m.module, ',' ORDER BY m.module) FROM core_branchmodule m JOIN core_shop s ON s.id = m.shop_id JOIN core_organization o ON o.id = s.organization_id JOIN auth_user u ON u.id = o.owner_id WHERE u.username = '${username}' AND m.enabled`);
    check('…with the restaurant and retail modules, and no repairs', mods === 'restaurant,retail', mods);

    await page.goto(`${WEB}/app`);
    const nav = async () => (await page.$$eval('.sidebar .navitem', (as) => as.map((a) => a.textContent.trim()))).join(',');
    check('the sidebar is the restaurant\'s own, with no shop selling, repairs or promotions', await eventually(async () => {
      const n = await nav();
      return n.startsWith('Dashboard,Menu,Tables,Kitchen,Stock,Reports,Taxes & charges,Hub till,') && !/Sales|Service|Promotions|Restaurant/.test(n);
    }), await nav());
    check('the dashboard lists the four set-up steps, none done', await eventually(async () => {
      const t = await page.textContent('[data-restaurant-start]');
      return ['Add your menu', 'Add your tables', 'Set up the kitchen', 'Choose the hub till'].every((x) => t.includes(x))
        && (await page.$$('[data-restaurant-start] a:has-text("Start")')).length === 4;
    }));
    await page.screenshot({ path: path.join(SHOTS, 'web-signup-restaurant.png'), fullPage: true });
    await page.click('[data-restaurant-start] a:has-text("Start") >> nth=1');
    check('"Add your tables" opens the Tables page', await eventually(async () => page.url().endsWith('/app/tables') && (await page.textContent('.page-title')) === 'Tables')
      && await page.isVisible('button:has-text("+ Add area")'));
    check('no script errors in the page', errors.length === 0, errors.join(' | ').slice(0, 300));
  } catch (e) {
    fails++;
    console.log('FAIL  stopped:', e.message.split('\n')[0]);
    console.log('      page text:', (await page.textContent('body').catch(() => '')).replace(/\s+/g, ' ').slice(0, 500));
    await page.screenshot({ path: path.join(SHOTS, 'web-signup-fail.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

/*
 * Real browser -> real server: setting up a restaurant on the web (REST-12), and its reports.
 * Run after gssdesktop/e2e/restaurant-hub.cjs on the same freshly seeded database: that test makes
 * "E2E Store" a restaurant through the API and uploads a real closed order from a hub till.
 *
 * Here the CEO, in the browser:
 *   - switches the restaurant on for the second branch, "E2E Lekki", in Settings;
 *   - builds its whole set-up through the forms: stations, categories, items, a required choice
 *     linked to an item, an area and tables, the service charge, VAT activated with the safeguards,
 *     a second tax refused as overlapping until confirmed, and the hub till;
 *   - checks the cloud stored exactly that;
 *   - opens E2E Store's restaurant reports and finds the order the hub uploaded.
 *
 *   PLAYWRIGHT_MODULE=<playwright-core> E2E_CHROMIUM=<chrome> E2E_WEB=http://localhost:5173 \
 *   E2E_PSQL='su postgres -c "psql -d <db> -tAc' node e2e/restaurant.e2e.cjs
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
  const lekki = sql("SELECT id FROM core_shop WHERE name = 'E2E Lekki'");
  const store = sql("SELECT id FROM core_shop WHERE name = 'E2E Store'");
  // A till already signed in at Lekki, so there is something to choose as the hub.
  sql(`INSERT INTO devices_device (id, shop_id, created_at, updated_at, is_deleted, device_type, name, app_version, pending_ops, failed_ops)
       VALUES ('7a7a7a7a-0000-4000-8000-000000000001', '${lekki}', now(), now(), false, 'desktop', 'Lekki counter PC', '1.0.23', 0, 0) ON CONFLICT DO NOTHING`);
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined });
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  page.setDefaultTimeout(10000);
  try {
    await page.goto(`${WEB}/login`);
    await page.fill('input[autocomplete="username"]', 'ceo');
    await page.fill('input[type="password"]', 'pass12345');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app', { timeout: 15000 });
    await page.evaluate((id) => localStorage.setItem('current_branch_id', id), lekki);

    // ---- switch the restaurant on for Lekki ---------------------------------------------------
    await page.goto(`${WEB}/app/settings`);
    const box = 'input[aria-label="Restaurant at E2E Lekki"]';
    check('Settings lists what each branch does', await eventually(() => page.isVisible(box)));
    check('Lekki starts as a supermarket only', !(await page.isChecked(box)) && await page.isChecked('input[aria-label="Supermarket / shop at E2E Lekki"]'));
    check('the menu has no Restaurant while viewing Lekki (Store is a restaurant, Lekki is not)', !(await page.isVisible('a[href="/app/restaurant"]')));
    await page.click(box); // the switch is disabled while it saves, then shows the new state
    check('the restaurant is switched on for Lekki, and the menu shows Restaurant', await eventually(async () => (await page.isChecked(box)) && page.isVisible('a[href="/app/restaurant"]')));
    check('the cloud has Lekki as restaurant + retail', sql(`SELECT string_agg(module, ',' ORDER BY module) FROM core_branchmodule WHERE shop_id = '${lekki}' AND enabled`) === 'restaurant,retail');

    // ---- kitchen stations --------------------------------------------------------------------
    await page.click('a[href="/app/restaurant"]');
    await page.click('.tab:has-text("Kitchen")');
    for (const [name, screen] of [['Kitchen', true], ['Bar', false]]) {
      await page.click('button:has-text("+ Add station")');
      await page.fill('.modal input[aria-label="Name"]', name);
      if (screen) await page.check('.modal label:has-text("kitchen screen") input');
      await page.click('.modal button:has-text("Save")');
      await page.waitForSelector(`td:has-text("${name}")`);
    }
    check('stations Kitchen (printer + screen) and Bar (printer)', (await page.textContent('table')).includes('Printer + Screen'));
    check('the page names the branch being set up (Lekki), not the CEO\'s own branch', (await page.textContent('.page-sub')).includes('E2E Lekki'));

    // ---- menu --------------------------------------------------------------------------------------
    await page.click('.tab:has-text("Menu")');
    for (const [name, station] of [['Mains', 'Kitchen'], ['Drinks', 'Bar']]) {
      await page.click('button:has-text("+ Add category")');
      await page.fill('.modal input[aria-label="Name"]', name);
      await page.selectOption('.modal select[aria-label="Made at"]', { label: station });
      await page.click('.modal button:has-text("Save")');
      await page.waitForSelector(`td:has-text("${name}")`);
    }
    for (const [name, category, price, taxClass] of [['Jollof rice', 'Mains', '3500', 'food'], ['Chapman', 'Drinks', '1500', 'drink']]) {
      await page.click('button:has-text("+ Add item")');
      await page.selectOption('.modal select[aria-label="Category"]', { label: category });
      await page.fill('.modal input[aria-label="Name"]', name);
      await page.fill('.modal input[aria-label="Price (₦)"]', price);
      await page.fill('.modal input[aria-label="Tax class"]', taxClass);
      await page.click('.modal button:has-text("Save")');
      await page.waitForSelector(`td:has-text("${name}")`);
    }
    await page.click('button:has-text("+ Add choice group")');
    await page.fill('.modal input[aria-label="Name"]', 'Size');
    await page.fill('.modal input[aria-label="Must choose at least"]', '1');
    await page.click('.modal button:has-text("Save")');
    await page.waitForSelector('td:has-text("Choose 1")');
    for (const [name, add] of [['Regular', '0'], ['Large', '500']]) {
      await page.click('button:text-is("+ Add choice")');
      await page.selectOption('.modal select[aria-label="Group"]', { label: 'Size' });
      await page.fill('.modal input[aria-label="Name"]', name);
      await page.fill('.modal input[aria-label="Adds to the price (₦)"]', add);
      await page.click('.modal button:has-text("Save")');
      await page.waitForSelector(`td:has-text("${name}")`);
    }
    await page.click('tr:has-text("Jollof rice") button:has-text("Choices")');
    await page.click('.modal label:has-text("Size") input'); // saved, then shown ticked once the cloud answers
    check('the Size choice is linked to Jollof rice', await eventually(() => page.isChecked('.modal label:has-text("Size") input')));
    await page.click('.modal button:has-text("Done")');
    check('Jollof rice has the Size choice; items go to their category\'s station', await eventually(async () => {
      const row = await page.textContent('tr:has-text("Jollof rice")');
      return row.includes('Size') && row.includes('Kitchen') && row.includes('3,500');
    }), (await page.textContent('tr:has-text("Jollof rice")')).replace(/\s+/g, ' '));
    await page.screenshot({ path: path.join(SHOTS, 'web-1-menu.png'), fullPage: true });

    // ---- tables --------------------------------------------------------------------------------------
    await page.click('.tab:has-text("Tables")');
    await page.click('button:has-text("+ Add area")');
    await page.fill('.modal input[aria-label="Name"]', 'Hall');
    await page.click('.modal button:has-text("Save")');
    await page.waitForSelector('td:has-text("Hall")');
    for (const t of ['T1', 'T2']) {
      await page.click('button:has-text("+ Add table")');
      await page.selectOption('.modal select[aria-label="Area"]', { label: 'Hall' });
      await page.fill('.modal input[aria-label="Table"]', t);
      await page.click('.modal button:has-text("Save")');
      await page.waitForSelector(`td:has-text("${t}")`);
    }
    await page.click('button:has-text("+ Add table")');
    await page.selectOption('.modal select[aria-label="Area"]', { label: 'Hall' });
    await page.fill('.modal input[aria-label="Table"]', 'T1');
    await page.click('.modal button:has-text("Save")');
    check('a second table called T1 is refused in plain words', await eventually(async () => (await page.textContent('.modal .form-error')).length > 5), await page.textContent('.modal .form-error').catch(() => ''));
    await page.click('.modal button:has-text("Cancel")');

    // ---- service charge and taxes --------------------------------------------------------------------
    await page.click('.tab:has-text("Taxes")');
    await page.fill('input[aria-label="Service charge"]', '10');
    await page.click('.section:has-text("Service charge and orders") button:has-text("Save")');
    check('service charge saved as typed (10%)', await eventually(() => page.isVisible('text=Orders opened from now on use it'))
      && await eventually(() => sql(`SELECT service_charge_rate FROM restaurant_restaurantsettings WHERE shop_id = '${lekki}'`) === '10.0000'));
    for (const [name, rate] of [['VAT', '7.5'], ['Lagos consumption tax', '5']]) {
      await page.click('button:has-text("+ Add tax")');
      await page.fill('.modal input[aria-label="Name"]', name);
      await page.fill('.modal input[aria-label="Rate (%)"]', rate);
      await page.fill('.modal input[aria-label="From"]', '2026-01-01');
      await page.click('.modal button:has-text("Save")');
      await page.waitForSelector(`td:has-text("${name}")`);
    }
    check('new taxes start switched off', sql(`SELECT COUNT(*) FROM restaurant_taxrule WHERE shop_id = '${lekki}' AND is_active`) === '0');
    await page.click('tr:has(td:text-is("VAT")) button:has-text("Activate")');
    check('activation is refused until state, VAT registration and the check are given', await page.isDisabled('.modal button:has-text("Start charging it")'));
    await page.selectOption('.modal select[aria-label="State"]', 'Lagos');
    await page.click('.modal button:has-text("Yes")');
    await page.check('.modal input[type="checkbox"]');
    await page.click('.modal button:has-text("Start charging it")');
    check('VAT is active, with the state and registration recorded', await eventually(async () => (await page.textContent('tr:has(td:text-is("VAT"))')).includes('Switch off'))
      && sql(`SELECT tax_state || '/' || vat_registered FROM restaurant_restaurantsettings WHERE shop_id = '${lekki}'`) === 'Lagos/true');
    await page.click('tr:has-text("Lagos consumption tax") button:has-text("Activate")');
    await page.selectOption('.modal select[aria-label="State"]', 'Lagos');
    await page.click('.modal button:has-text("Yes")');
    await page.check('.modal label:has-text("accountant") input');
    await page.click('.modal button:has-text("Start charging it")');
    check('a second tax on the same items is refused as overlapping', await eventually(() => page.isVisible('.modal >> text=Confirm that both legally apply')));
    await page.check('.modal label:has-text("Both legally apply") input');
    await page.click('.modal button:has-text("Start charging it")');
    check('…and activated once the owner confirms both apply (recorded)', await eventually(async () => sql(`SELECT COUNT(*) FROM restaurant_taxrule WHERE shop_id = '${lekki}' AND is_active AND overlap_confirmed`) === '1'));
    await page.screenshot({ path: path.join(SHOTS, 'web-2-taxes.png'), fullPage: true });

    // ---- hub till ------------------------------------------------------------------------------------
    await page.click('.tab:has-text("Hub till")');
    await page.click('tr:has-text("Lekki counter PC") button:has-text("Make this the hub")');
    check('the Lekki till is the hub', await eventually(async () => (await page.textContent('tr:has-text("Lekki counter PC")')).includes('Hub'))
      && sql(`SELECT hub_device_id FROM restaurant_restaurantsettings WHERE shop_id = '${lekki}'`) === '7a7a7a7a-0000-4000-8000-000000000001');

    // ---- the cloud holds exactly that set-up -----------------------------------------------------
    const counts = sql(`SELECT (SELECT COUNT(*) FROM restaurant_kitchenstation WHERE shop_id = '${lekki}') || ',' || (SELECT COUNT(*) FROM restaurant_menuitem WHERE shop_id = '${lekki}')
      || ',' || (SELECT COUNT(*) FROM restaurant_modifieroption WHERE shop_id = '${lekki}') || ',' || (SELECT COUNT(*) FROM restaurant_restauranttable WHERE shop_id = '${lekki}')
      || ',' || (SELECT service_charge_rate FROM restaurant_restaurantsettings WHERE shop_id = '${lekki}')`);
    check('stored in the cloud: 2 stations, 2 items, 2 choices, 2 tables, 10% service', counts === '2,2,2,2,10.0000', counts);
    check('nothing of Lekki\'s set-up leaked into E2E Store', sql(`SELECT COUNT(*) FROM restaurant_menuitem WHERE shop_id = '${store}' AND name = 'Chapman'`) === '1'
      && sql(`SELECT COUNT(*) FROM restaurant_kitchenstation WHERE shop_id = '${store}'`) === '2');

    // ---- E2E Store's reports: the order the hub uploaded -----------------------------------------
    const day = sql(`SELECT business_date FROM restaurant_order WHERE shop_id = '${store}' AND status = 'closed' LIMIT 1`);
    if (!day) {
      check('E2E Store has an uploaded order (run gssdesktop e2e/restaurant-hub.cjs first)', false);
    } else {
      await page.evaluate((id) => localStorage.setItem('current_branch_id', id), store);
      await page.goto(`${WEB}/app/restaurant`);
      await page.click('.tab:has-text("Reports")');
      await page.fill('input[type="date"] >> nth=0', day);
      await page.fill('input[type="date"] >> nth=1', day);
      check('E2E Store\'s takings show the order the hub uploaded', await eventually(async () => (await page.textContent('[data-takings]')).includes('11,162.50')),
        await page.textContent('[data-takings]').catch(() => ''));
      check('…with service charge and VAT from the frozen bill', await eventually(async () => {
        const t = await page.textContent('.section:has-text("Service charge and taxes")');
        return t.includes('950.00') && t.includes('VAT 7.5%') && t.includes('712.50');
      }));
      await page.click('tbody tr >> nth=0');
      check('the order opens with its items, bill and payment', await eventually(async () => {
        const t = await page.textContent('.modal');
        return t.includes('Jollof rice') && t.includes('Total') && t.includes('Cash');
      }));
      await page.screenshot({ path: path.join(SHOTS, 'web-3-reports.png'), fullPage: true });
      await page.click('.modal button:has-text("Close")');
    }
    check('no script errors in the page', errors.length === 0, errors.join(' | ').slice(0, 300));
  } catch (e) {
    fails++;
    console.log('FAIL  stopped:', e.message.split('\n')[0]);
    console.log('      page text:', (await page.textContent('body').catch(() => '')).replace(/\s+/g, ' ').slice(0, 500));
    await page.screenshot({ path: path.join(SHOTS, 'web-fail.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

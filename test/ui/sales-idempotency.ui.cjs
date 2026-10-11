// Optional dev check (not part of a build): needs `playwright` (with a browser), `esbuild`, `react`, `react-dom`
// resolvable from NODE_PATH.   node test/ui/sales-idempotency.ui.cjs
// Runs the REAL Sales.jsx (src/pages/Sales.jsx) in headless Chromium against a simulated
// server that implements Idempotency-Key semantics, to check the client's key lifecycle end to end.
const path = require('path'); const fs = require('fs'); const os = require('os');
const assert = require('node:assert/strict');
const { chromium } = require('playwright'); const esbuild = require('esbuild');
const SRC = path.resolve(__dirname, '../../src');

const MOCKS = {
  '../api/endpoints': `
    const items = [{ id: 'i1', name: 'Cola', category: 'drinks', sell_price: '100.00', cost_price: '40.00', quantity: 50, has_variants: false, variants: [], barcode: null, unit: 'PIECE', min_stock: 1 }];
    window.__creates = []; window.__serverSales = new Map(); window.__loseNextReply = false;
    const netErr = () => { const e = new Error('Network Error'); e.response = undefined; return e; };
    export const inventory = { list: async () => ({ data: items }), byBarcode: async () => ({ data: items[0] }) };
    export const sales = {
      list: async () => ({ data: [] }),
      create: async (payload, config) => {
        const key = config && config.headers && config.headers['Idempotency-Key'];
        window.__creates.push({ key, lines: payload.items.reduce((n, l) => n + l.quantity, 0) });
        let sale = key ? window.__serverSales.get(key) : null;                         // the server's idempotency
        if (!sale) {
          sale = { id: 'sale-' + (window.__serverSales.size + 1 + (key ? 0 : 1000)), invoice_number: window.__serverSales.size + 1, items: payload.items.map((i) => ({ ...i, total: i.quantity * i.unit_price })), total: payload.items.reduce((t, i) => t + i.quantity * i.unit_price, 0), status: 'completed', date: new Date().toISOString(), customer_name: 'Walk-in', payment_method: 'cash', amount_paid: 0, balance_due: 0 };
          window.__serverSales.set(key || sale.id, sale);
        }
        if (window.__loseNextReply) { window.__loseNextReply = false; throw netErr(); }  // the sale was recorded; the reply never arrives
        return { data: sale };
      },
      addPayment: async () => ({ data: {} }),
    };`,
  '../context/LiveContext': `export const useLive = () => ({ versions: {} });`,
  '../context/AuthContext': `export const useAuth = () => ({ user: { shop_name: 'Test Shop' }, capabilities: {} });`,
  '../utils/receipt': `window.__receipts = []; export const printSaleReceipt = (sale) => { window.__receipts.push(sale.id); };`,
  '../utils/barcodeScanner': `export const startContinuousScan = async () => {}; export const stopContinuousScan = async () => {};`,
};
const mockPlugin = { name: 'mocks', setup(b) {
  b.onResolve({ filter: /^\.\.\/(api\/endpoints|context\/(LiveContext|AuthContext)|utils\/(receipt|barcodeScanner))$/ }, (a) => ({ path: a.path, namespace: 'mock' }));
  b.onLoad({ filter: /.*/, namespace: 'mock' }, (a) => ({ contents: MOCKS[a.path], loader: 'js' }));
} };

(async () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-and-'));
  fs.writeFileSync(path.join(work, 'entry.jsx'), `import { createRoot } from 'react-dom/client';\nimport Sales from '${SRC}/pages/Sales.jsx';\ncreateRoot(document.getElementById('root')).render(<Sales />);`);
  await esbuild.build({ entryPoints: [path.join(work, 'entry.jsx')], bundle: true, outfile: path.join(work, 'b.js'), jsx: 'automatic', loader: { '.jsx': 'jsx', '.js': 'jsx' }, plugins: [mockPlugin], define: { 'process.env.NODE_ENV': '"development"' }, nodePaths: (process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean), logLevel: 'error' });
  fs.writeFileSync(path.join(work, 'i.html'), '<!doctype html><html><body><div id="root"></div><script src="b.js"></script></body></html>');
  const browser = await chromium.launch(); const page = await browser.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto('file://' + path.join(work, 'i.html'));
  const step = (m) => console.log('  ✓ ' + m);
  const creates = () => page.evaluate(() => window.__creates); const serverCount = () => page.evaluate(() => window.__serverSales.size);
  const newSale = () => page.getByRole('button', { name: 'New sale', exact: true }).click();   // after a sale the app shows 'Completed'
  const addCola = () => page.locator('.pos-tile:has-text("Cola"), .pos-item:has-text("Cola"), button:has-text("Cola")').first().click();
  await page.waitForSelector('text=Cola');

  // 1. The reply is lost after the server recorded the sale.
  await addCola(); await page.evaluate(() => { window.__loseNextReply = true; });
  await page.locator('.charge-btn').click();
  await page.waitForSelector('text=it will not ring the customer up twice');
  assert.equal(await serverCount(), 1, 'the server did record the sale'); assert.match((await creates())[0].key, /^[A-Za-z0-9_-]{8,64}$/);
  step('reply lost: the cashier sees "tap Charge again: it will not ring the customer up twice", and the cart is still there');

  // 2. Tapping Charge again must reuse the SAME key.
  await page.locator('.charge-btn').click();
  await page.waitForFunction(() => window.__receipts.length === 1);
  const c = await creates(); assert.equal(c.length, 2); assert.equal(c[1].key, c[0].key);
  assert.equal(await serverCount(), 1, 'the retry must NOT create a second sale');
  step('retry sends the same Idempotency-Key and gets the original sale back: still exactly 1 sale on the server');

  // 3. The next customer gets a fresh key.
  await newSale(); await addCola(); await page.locator('.charge-btn').click();
  await page.waitForFunction(() => window.__receipts.length === 2);
  const c2 = await creates(); assert.notEqual(c2[2].key, c2[0].key); assert.equal(await serverCount(), 2);
  step('the next customer\'s sale uses a NEW key (2 sales on the server, as it should be)');

  // 4. Changing the cart after a failed attempt is a different sale and must not reuse the key.
  await newSale(); await addCola(); await page.evaluate(() => { window.__loseNextReply = true; });
  await page.locator('.charge-btn').click(); await page.waitForSelector('text=it will not ring the customer up twice');
  const failedKey = (await creates()).at(-1).key;
  await addCola();                                              // cart changed: 2 colas now
  await page.locator('.charge-btn').click();
  await page.waitForFunction(() => window.__receipts.length === 3);
  const last = (await creates()).at(-1);
  assert.notEqual(last.key, failedKey); assert.equal(last.lines, 2);
  step('editing the cart after a failed attempt gets a new key (the server would otherwise refuse a reused key with a different body)');

  assert.deepEqual(errors, [], 'console errors/warnings: ' + errors.join(' | '));
  step('no React errors or warnings (hooks added to Sales.jsx are well-formed)');
  await browser.close(); fs.rmSync(work, { recursive: true, force: true });
  console.log('\nAndroid Sales idempotency check: ALL PASSED');
})().catch((e) => { console.error('\nCHECK FAILED:', e.message); process.exit(1); });

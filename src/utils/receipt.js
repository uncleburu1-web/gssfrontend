import { money } from './format';

// Falls back to these only if the caller doesn't pass real shop info —
// callers (Sales.jsx) pass the logged-in user's own shop details instead,
// so every business sees ITS OWN name/address here, not a hardcoded one.
const DEFAULT_SHOP = {
  name: 'My Shop',
  addressLines: [],
  phones: [],
  email: '',
  logoUrl: '',
  footerNote: '',
};

const SOFTWARE_CREDIT = 'Software by Gavin\'s Software Solutions (GSS)';
const SOFTWARE_CREDIT_CONTACT = 'ogbejoshua42@gmail.com · 0806 377 3201';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Prints a sale receipt in a new window/tab and triggers window.print().
 *
 * Deliberately the same compact 80mm-thermal-style layout as the desktop
 * app's Receipt.jsx (shop header -> invoice meta -> items -> totals ->
 * "attended by"/thank-you -> software-credit footer) and mobile's ESC/POS
 * receipt (utils/escpos.js) — all three platforms print an identical
 * receipt now, just through different mechanisms (this one via the
 * browser's print dialog, since a web page can't drive a thermal printer
 * directly the way the Android app's Bluetooth Serial plugin does).
 */
export function printSaleReceipt(sale, shopInput = {}) {
  const SHOP = {
    name: shopInput.name || DEFAULT_SHOP.name,
    addressLines: shopInput.addressLines || (shopInput.address ? [shopInput.address] : DEFAULT_SHOP.addressLines),
    phones: shopInput.phones || (shopInput.phone ? [shopInput.phone] : DEFAULT_SHOP.phones),
    email: shopInput.email || DEFAULT_SHOP.email,
    logoUrl: shopInput.logoUrl || DEFAULT_SHOP.logoUrl,
    footerNote: shopInput.footerNote || DEFAULT_SHOP.footerNote,
  };

  const isCash = sale.payment_method === 'cash';
  const paymentLabel = sale.payment_method === 'pos'
    ? 'POS/Card'
    : (sale.payment_method || 'cash')[0].toUpperCase() + (sale.payment_method || 'cash').slice(1);

  const items = sale.items && sale.items.length ? sale.items : [
    { quantity: sale.quantity, item_name: sale.item_name, unit_price: sale.unit_price, total: sale.total },
  ];
  const itemsSubtotal = items.reduce((s, i) => s + (i.subtotal ?? i.total ?? 0), 0);
  const itemsDiscount = items.reduce((s, i) => s + Number(i.discount || 0), 0);
  const invoiceNo = sale.invoice_number ? `#${sale.invoice_number}` : `#${String(sale.id || '—').slice(0, 8).toUpperCase()}`;
  const dateStr = new Date(sale.date || Date.now()).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const itemRows = items.map((item) => `
    <div class="receipt-item">
      <div class="receipt-row"><span>${escapeHtml(item.item_name)}</span><span>${money(item.total)}</span></div>
      <div class="receipt-row receipt-item-sub"><span>${item.quantity} Units x ${money(item.unit_price)} / Units</span></div>
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Receipt ${invoiceNo}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 10px; background: #fff; }
  .receipt {
    width: 280px; margin: 0 auto;
    font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; color: #000;
  }
  .receipt-center { text-align: center; }
  .receipt-logo { display: block; max-width: 160px; max-height: 56px; margin: 0 auto 6px auto; object-fit: contain; filter: grayscale(1); }
  .receipt-shop { font-size: 15px; font-weight: 700; }
  .receipt-sub { font-size: 10.5px; color: #444; margin: 2px 0 6px; }
  .receipt-divider { border-top: 1px dashed #000; margin: 6px 0; }
  .receipt-row { display: flex; justify-content: space-between; gap: 8px; padding: 1.5px 0; }
  .receipt-item-sub { font-size: 10.5px; color: #333; }
  .receipt-total { font-size: 14px; font-weight: 700; }
  @media print {
    body { padding: 0; }
    @page { margin: 6mm; size: 80mm auto; }
  }
</style>
</head>
<body>
  <div class="receipt">
    ${SHOP.logoUrl ? `<img src="${escapeHtml(SHOP.logoUrl)}" alt="" class="receipt-logo" onerror="this.style.display='none'" />` : ''}
    <div class="receipt-center receipt-shop">${escapeHtml(SHOP.name)}</div>
    ${SHOP.addressLines.map((l) => `<div class="receipt-center receipt-sub">${escapeHtml(l)}</div>`).join('')}
    ${SHOP.phones.map((p) => `<div class="receipt-center receipt-sub">Tel: ${escapeHtml(p)}</div>`).join('')}
    ${SHOP.email ? `<div class="receipt-center receipt-sub">${escapeHtml(SHOP.email)}</div>` : ''}

    <div class="receipt-divider"></div>
    <div class="receipt-row"><span>Invoice</span><span>${invoiceNo}</span></div>
    <div class="receipt-row"><span>Date</span><span>${dateStr}</span></div>
    <div class="receipt-row"><span>Customer</span><span>${escapeHtml(sale.customer_name || 'Walk-in')}</span></div>

    <div class="receipt-divider"></div>
    ${itemRows}

    <div class="receipt-divider"></div>
    <div class="receipt-row receipt-total"><span>GRAND TOTAL</span><span>${money(itemsSubtotal)}</span></div>
    <div class="receipt-row"><span>Discount Amount</span><span>${money(itemsDiscount)}</span></div>
    <div class="receipt-row receipt-total"><span>Total Invoice Amount</span><span>${money(sale.total)}</span></div>

    <div class="receipt-divider"></div>
    <div class="receipt-row"><span>Payment (${paymentLabel})</span><span>${money(sale.total)}</span></div>
    ${isCash && sale.cash_received != null ? `
    <div class="receipt-row"><span>Received</span><span>${money(sale.cash_received)}</span></div>
    <div class="receipt-row"><span>Change</span><span>${money(sale.change)}</span></div>` : ''}
    ${sale.status === 'outstanding' ? `
    <div class="receipt-row receipt-total"><span>Balance due</span><span>${money(sale.balance_due)}</span></div>` : ''}

    <div class="receipt-divider"></div>
    <div class="receipt-center receipt-sub">Attended by ${escapeHtml(sale.staff_name || '—')}</div>
    <div class="receipt-center receipt-sub">${escapeHtml(SHOP.footerNote) || 'Thanks for your patronage!!!'}</div>
    <div class="receipt-center receipt-sub">Goods received in good condition.</div>

    <div class="receipt-divider"></div>
    <div class="receipt-center receipt-sub">${SOFTWARE_CREDIT}</div>
    <div class="receipt-center receipt-sub">${SOFTWARE_CREDIT_CONTACT}</div>
  </div>
  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=360,height=700');
  if (!win) {
    alert('Please allow pop-ups for this site to print the receipt.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

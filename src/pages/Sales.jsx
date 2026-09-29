import { useEffect, useMemo, useRef, useState } from 'react';
import { sales, inventory } from '../api/endpoints';
import { useLive } from '../context/LiveContext';
import { useAuth } from '../context/AuthContext';
import { money, fmtDate, apiErrorMessage } from '../utils/format';
import { printSaleReceipt } from '../utils/receipt';
import { Icons } from '../components/Icons';
import Amount from '../components/Amount';

function newLine(item, variant) {
  return {
    key: item ? (variant ? `stock-${item.id}-${variant.id}` : `stock-${item.id}`) : `custom-${Date.now()}-${Math.random()}`,
    item: item ? item.id : null,
    variant: variant ? variant.id : null,
    item_name: item ? item.name : '',
    variant_label: variant ? variant.label : '',
    category: item ? item.category : '',
    quantity: 1,
    unit_price: item ? Number(item.sell_price) : 0,
    unit_cost: item ? Number(item.cost_price) : 0,
    maxQty: variant ? variant.quantity : (item ? item.quantity : null),
  };
}

function shopInfoFrom(user) {
  return {
    name: user?.shop_name,
    address: user?.shop_address,
    phone: user?.shop_phone,
    email: user?.shop_email,
    logoUrl: user?.shop_logo_url,
    footerNote: user?.shop_receipt_footer_note,
  };
}

export default function Sales() {
  const [view, setView] = useState('pos'); // 'pos' | 'completed' | 'outstanding'

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Sales</div>
          <div className="page-sub">Ring up sales and manage installment balances</div>
        </div>
        <div className="subtabs">
          <button className={`subtab ${view === 'pos' ? 'active' : ''}`} onClick={() => setView('pos')}>New sale</button>
          <button className={`subtab ${view === 'completed' ? 'active' : ''}`} onClick={() => setView('completed')}>Completed</button>
          <button className={`subtab ${view === 'outstanding' ? 'active' : ''}`} onClick={() => setView('outstanding')}>Outstanding</button>
        </div>
      </div>

      {view === 'pos' ? <PosScreen onDone={() => setView('completed')} /> : <SalesHistory tab={view} />}
    </>
  );
}

function PosScreen({ onDone }) {
  const { user } = useAuth();
  const shopInfo = shopInfoFrom(user);
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [installment, setInstallment] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function loadCatalog() {
    inventory.list().then(({ data }) => {
      setCatalog(data.results || data);
      setLoadingCatalog(false);
    });
  }

  const { versions } = useLive();

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A product added/restocked from Inventory, the CEO's session, or a
  // desktop sync — the cashier should be able to sell it (or see updated
  // stock) without navigating away and back.
  useEffect(() => {
    if (versions.inventoryitem || versions.stockbatch) loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions.inventoryitem, versions.stockbatch]);

  const categories = useMemo(() => {
    const set = new Set(catalog.map((i) => i.category).filter(Boolean));
    return Array.from(set);
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((i) => {
      if (category !== 'all' && i.category !== category) return false;
      if (q && !`${i.name} ${i.short_code || ''} ${i.barcode || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog, category, search]);

  const subtotal = cart.reduce((sum, l) => sum + l.quantity * Number(l.unit_price || 0), 0);
  const cartCount = cart.reduce((n, l) => n + l.quantity, 0);

  function addItem(item, variant) {
    const key = variant ? `stock-${item.id}-${variant.id}` : `stock-${item.id}`;
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.key === key);
      if (idx >= 0) {
        const existing = prev[idx];
        if (existing.maxQty != null && existing.quantity >= existing.maxQty) return prev;
        const copy = [...prev];
        copy[idx] = { ...existing, quantity: existing.quantity + 1 };
        return copy;
      }
      return [...prev, newLine(item, variant)];
    });
  }

  // Items with sizes/colors can't just be tapped straight into the cart —
  // stock is tracked per variant (see inventory.ItemVariant on the
  // backend), so which one is being sold has to be picked first. The
  // list view's `has_variants` flag is enough to gate on; the actual
  // variants + their own stock only come from the item's detail endpoint.
  const [variantPicker, setVariantPicker] = useState(null); // { item, variants } | null
  const [variantPickerLoading, setVariantPickerLoading] = useState(false);

  function handleProductTap(item) {
    if (!item.has_variants) {
      addItem(item);
      return;
    }
    setVariantPickerLoading(true);
    inventory.get(item.id).then(({ data }) => {
      setVariantPicker({ item, variants: data.variants || [] });
      setVariantPickerLoading(false);
    });
  }

  function pickVariant(variant) {
    addItem(variantPicker.item, variant);
    setVariantPicker(null);
  }

  // A barcode scanner is just a keyboard that types fast and hits Enter —
  // "powerful" here means: exact match adds instantly and clears the box
  // for the next scan without breaking stride, a genuine no-match gives
  // clear feedback instead of silently doing nothing, and the input stays
  // focused throughout so a corded/wireless scanner gun can fire off scan
  // after scan with zero clicks in between.
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'ok' | 'error', message }
  const searchRef = useRef(null);

  useEffect(() => {
    if (!scanFeedback) return;
    const t = setTimeout(() => setScanFeedback(null), 1500);
    return () => clearTimeout(t);
  }, [scanFeedback]);

  function handleSearchKeyDown(e) {
    if (e.key !== 'Enter') return;
    const code = search.trim();
    if (!code) return;
    processScannedCode(code);
    setSearch('');
  }

  // The single source of truth for "a barcode was read, now do something
  // with it" — shared by the keyboard-wedge path above (a hardware
  // scanner types the code and hits Enter) and any future scan input.
  // Looked up via the backend's exact-match endpoint rather than
  // searched for in the in-memory `catalog`, which only holds this
  // shop's first page of products — a scan for anything past that page
  // would otherwise report "no such product" even though it exists.
  async function processScannedCode(code) {
    try {
      const { data: hit } = await inventory.byBarcode(code);
      handleProductTap(hit);
      setScanFeedback({ type: 'ok', message: hit.has_variants ? `Pick a size/color for ${hit.name}` : `Added ${hit.name}` });
    } catch (err) {
      setScanFeedback({ type: 'error', message: `No product with barcode "${code}"` });
    } finally {
      searchRef.current?.focus();
    }
  }

  function addCustom() {
    if (!customName.trim() || customPrice === '') return;
    setCart((prev) => [...prev, { ...newLine(null), item_name: customName.trim(), unit_price: Number(customPrice) }]);
    setCustomName('');
    setCustomPrice('');
    setCustomOpen(false);
  }

  function updateQty(key, delta) {
    setCart((prev) => prev
      .map((l) => {
        if (l.key !== key) return l;
        const next = l.quantity + delta;
        if (next <= 0) return null;
        if (l.maxQty != null && next > l.maxQty) return l;
        return { ...l, quantity: next };
      })
      .filter(Boolean));
  }

  function updatePrice(key, value) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, unit_price: value } : l)));
  }

  function removeLine(key) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  async function charge() {
    if (cart.length === 0 || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        customer_name: customerName || 'Walk-in',
        payment_method: paymentMethod,
        status: installment ? 'outstanding' : 'completed',
        items: cart.map((l) => ({
          item: l.item,
          variant: l.variant,
          variant_label: l.variant_label,
          item_name: l.item_name,
          category: l.category,
          quantity: l.quantity,
          unit_price: l.unit_price,
          unit_cost: l.unit_cost || 0,
        })),
      };
      if (installment) payload.amount_paid = amountPaid || 0;
      const { data } = await sales.create(payload);
      printSaleReceipt(data, shopInfo);
      setCart([]);
      setCustomerName('');
      setInstallment(false);
      setAmountPaid('');
      loadCatalog();
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not complete this sale — check stock and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pos-layout">
      <div className="pos-catalog">
        <div className="pos-search">
          <input
            ref={searchRef}
            placeholder="Search products, or scan a barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        {scanFeedback && (
          <div className={`banner ${scanFeedback.type === 'ok' ? 'good' : 'danger'}`} style={{ marginBottom: 12 }}>
            {scanFeedback.message}
          </div>
        )}
        <div className="pos-chips">
          <button className={`pos-chip ${category === 'all' ? 'active' : ''}`} onClick={() => setCategory('all')}>All</button>
          {categories.map((c) => (
            <button key={c} className={`pos-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="pos-grid">
          <button className="pos-tile custom" onClick={() => setCustomOpen(true)}>
            {Icons.plus}
            <span style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4 }}>Custom item / service</span>
          </button>
          {loadingCatalog ? (
            <div className="empty">Loading…</div>
          ) : filtered.map((item) => {
            const inCartQty = cart.filter((l) => l.item === item.id).reduce((s, l) => s + l.quantity, 0);
            // A variant item's real availability is per size/color, not
            // this total — so it's never disabled here; the picker below
            // shows (and enforces) each variant's own stock instead.
            const outOfStock = !item.has_variants && item.quantity <= 0;
            const atLimit = !item.has_variants && item.quantity != null && inCartQty >= item.quantity;
            return (
              <button
                key={item.id}
                className={`pos-tile ${item.is_low_stock ? 'pos-tile-low' : ''}`}
                disabled={outOfStock || atLimit}
                onClick={() => handleProductTap(item)}
              >
                {item.image_url && (
                  <img className="pos-tile-img" src={item.image_url} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                )}
                <div className="pos-tile-name">{item.short_code || item.name}</div>
                <div className="pos-tile-stock">
                  {item.has_variants ? `${item.quantity} in stock (sizes/colors)` : outOfStock ? 'Out of stock' : `${item.quantity} in stock`}
                  {inCartQty ? ` · ${inCartQty} in cart` : ''}
                </div>
                <div className="pos-tile-price num">{money(item.sell_price)}</div>
              </button>
            );
          })}
          {!loadingCatalog && filtered.length === 0 && (
            <div className="empty" style={{ gridColumn: '1 / -1' }}>No products match — try a custom item instead.</div>
          )}
        </div>
      </div>

      <div className="cart-panel">
        <div className="cart-head">
          <h3>Cart ({cartCount})</h3>
          {cart.length > 0 && <button className="btn ghost small" onClick={() => setCart([])}>Clear</button>}
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">Tap a product to add it to the cart.</div>
          ) : cart.map((l) => (
            <div className="cart-line" key={l.key}>
              <div className="cart-line-info">
                <div className="cart-line-name" title={l.item_name}>
                  {l.item_name}{l.variant_label ? ` — ${l.variant_label}` : ''}
                </div>
                <div className="cart-line-price">
                  ₦<input type="number" value={l.unit_price} onChange={(e) => updatePrice(l.key, e.target.value)} /> each
                </div>
              </div>
              <div className="qty-stepper">
                <button type="button" onClick={() => updateQty(l.key, -1)}>{Icons.minus}</button>
                <span>{l.quantity}</span>
                <button type="button" onClick={() => updateQty(l.key, 1)}>{Icons.plus}</button>
              </div>
              <div className="cart-line-total num">{money(l.quantity * l.unit_price)}</div>
              <button className="cart-line-remove" onClick={() => removeLine(l.key)} aria-label="Remove">{Icons.x}</button>
            </div>
          ))}
        </div>
        <div className="cart-foot">
          <div className="customer-row">
            <input placeholder="Customer (optional — Walk-in)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="pay-methods">
            {['cash', 'transfer', 'pos'].map((m) => (
              <button key={m} type="button" className={`pay-method ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>
                {m === 'pos' ? 'POS/Card' : m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <label className="installment-toggle">
            <input type="checkbox" checked={installment} onChange={(e) => setInstallment(e.target.checked)} />
            Customer is paying in installments
          </label>
          {installment && (
            <div className="field" style={{ marginBottom: 4 }}>
              <label>Amount paid now (₦)</label>
              <input type="number" min="0" max={subtotal} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" />
            </div>
          )}
          <div className="cart-totals-row grand">
            <span>Total</span><span className="num">{money(subtotal)}</span>
          </div>
          <button className="charge-btn" disabled={cart.length === 0 || submitting} onClick={charge} style={{ marginTop: 10 }}>
            {submitting ? 'Charging…' : `Charge ${money(subtotal)}`}
          </button>
        </div>
      </div>

      {customOpen && (
        <div className="modal-backdrop" onClick={() => setCustomOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Custom item / service</h3>
            <div className="field">
              <label>Name</label>
              <input autoFocus value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Screen repair labour" />
            </div>
            <div className="field">
              <label>Price (₦)</label>
              <input type="number" min="0" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setCustomOpen(false)}>Cancel</button>
              <button type="button" className="btn" onClick={addCustom}>Add to cart</button>
            </div>
          </div>
        </div>
      )}

      {(variantPicker || variantPickerLoading) && (
        <div className="modal-backdrop" onClick={() => setVariantPicker(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{variantPicker ? `Which one? — ${variantPicker.item.short_code || variantPicker.item.name}` : 'Loading…'}</h3>
            {variantPickerLoading ? (
              <div className="empty">Loading sizes/colors…</div>
            ) : variantPicker.variants.length === 0 ? (
              <div className="empty">This item has no variants set up yet.</div>
            ) : (
              <div className="pos-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {variantPicker.variants.map((v) => {
                  const out = v.quantity <= 0;
                  const inCartQty = cart.find((l) => l.key === `stock-${variantPicker.item.id}-${v.id}`)?.quantity || 0;
                  return (
                    <button
                      key={v.id}
                      className={`pos-tile ${v.is_low_stock ? 'pos-tile-low' : ''}`}
                      disabled={out || inCartQty >= v.quantity}
                      onClick={() => pickVariant(v)}
                    >
                      <div className="pos-tile-name">{v.label}</div>
                      <div className="pos-tile-stock">
                        {out ? 'Out of stock' : `${v.quantity} in stock`}
                        {inCartQty ? ` · ${inCartQty} in cart` : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setVariantPicker(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemsSummary({ items }) {
  if (!items || items.length === 0) return '—';
  const first = items[0];
  const label = `${first.quantity}× ${first.item_name}`;
  return items.length > 1 ? `${label} +${items.length - 1} more` : label;
}

function SalesHistory({ tab }) {
  const { user, capabilities } = useAuth();
  const shopInfo = shopInfoFrom(user);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const [replaceModal, setReplaceModal] = useState(null);
  const [replaceLine, setReplaceLine] = useState('');
  const [replaceForm, setReplaceForm] = useState({ item: '', variant: '', item_name: '', quantity: 1, unit_price: 0, unit_cost: 0 });
  const [replaceVariants, setReplaceVariants] = useState([]);
  const [replaceError, setReplaceError] = useState('');
  const [replaceResult, setReplaceResult] = useState(null);
  const [catalog, setCatalog] = useState([]);

  async function load() {
    setLoading(true);
    const params = { status: tab };
    if (search) params.search = search;
    const { data } = await sales.list(params);
    setRows(data.results || data);
    setLoading(false);
  }

  const { versions } = useLive();

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // A sale from any source (this tab, another tab, the CEO, the
    // desktop) shows up here live — same debounced load as a search
    // keystroke, so a multi-item sale's several events still cost one
    // fetch, not several.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tab, versions.sale, versions.saleitem]);

  async function handleDelete(id) {
    if (!confirm('Delete this sale record? Linked stock will be restored.')) return;
    await sales.remove(id);
    load();
  }

  function openPay(sale) {
    setPayModal(sale);
    setPayAmount('');
  }

  async function handlePaySubmit(e) {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    await sales.addPayment(payModal.id, amt);
    setPayModal(null);
    load();
  }

  function openReplace(sale) {
    setReplaceModal(sale);
    setReplaceLine(sale.items.length === 1 ? sale.items[0].id : '');
    setReplaceForm({ item: '', variant: '', item_name: '', quantity: 1, unit_price: 0, unit_cost: 0 });
    setReplaceVariants([]);
    setReplaceError('');
    setReplaceResult(null);
    inventory.list().then(({ data }) => setCatalog(data.results || data));
  }

  function handleReplacePickItem(id) {
    const item = catalog.find((i) => String(i.id) === String(id));
    if (item) {
      setReplaceForm({ ...replaceForm, item: id, variant: '', item_name: item.name, unit_price: item.sell_price, unit_cost: item.cost_price });
      if (item.has_variants) {
        inventory.get(id).then(({ data }) => setReplaceVariants(data.variants || []));
      } else {
        setReplaceVariants([]);
      }
    } else {
      setReplaceForm({ ...replaceForm, item: '', variant: '' });
      setReplaceVariants([]);
    }
  }

  async function handleReplaceSubmit(e) {
    e.preventDefault();
    setReplaceError('');
    if (!replaceLine) {
      setReplaceError('Pick which item in the cart is being replaced.');
      return;
    }
    try {
      const payload = { ...replaceForm, item: replaceForm.item || null, variant: replaceForm.variant || null, sale_item: replaceLine };
      const { data } = await sales.replaceItem(replaceModal.id, payload);
      setReplaceResult({ old_total: data.old_total, new_total: data.new_total, balance: data.balance });
      load();
    } catch (err) {
      setReplaceError(apiErrorMessage(err, 'Could not replace this item — check stock and try again.'));
    }
  }

  return (
    <div className="section">
      <div className="section-head">
        <div className="page-sub" style={{ margin: 0 }}>
          {tab === 'completed' ? 'Completed sales' : 'Outstanding (installment) sales'}
        </div>
      </div>
      <div className="section-body">
        <div className="searchbar" style={{ marginTop: 12 }}>
          <input placeholder="Search item or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="empty">
            {tab === 'completed'
              ? 'No completed sales yet. Use "New sale" to ring one up.'
              : 'No outstanding (installment) sales. Nice — nobody owes you anything right now.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Items</th><th>Customer</th><th>Total</th>
                  {tab === 'outstanding' ? <><th>Paid</th><th>Balance</th></> : <th>Profit</th>}
                  <th>Staff</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="mono" style={{ fontSize: 12.5 }}>{fmtDate(s.date)}</td>
                    <td><ItemsSummary items={s.items} /></td>
                    <td>{s.customer_name || 'Walk-in'}</td>
                    <td className="num">{money(s.total)}</td>
                    {tab === 'outstanding' ? (
                      <>
                        <td className="num">{money(s.amount_paid)}</td>
                        <td className="num" style={{ color: 'var(--warn)' }}>{money(s.balance_due)}</td>
                      </>
                    ) : (
                      <td className="num" style={{ color: 'var(--good)' }}>{money(s.profit)}</td>
                    )}
                    <td>{s.staff_name || s.worker_name || '—'}</td>
                    <td className="row-actions">
                      <button className="btn ghost small" onClick={() => printSaleReceipt(s, shopInfo)} title="Print receipt">{Icons.print}</button>
                      {capabilities.edit_sale && (
                        <button className="btn ghost small" onClick={() => openReplace(s)} title="Replace an item">{Icons.edit}</button>
                      )}
                      {tab === 'outstanding' && (
                        <button className="btn small" onClick={() => openPay(s)}>Pay</button>
                      )}
                      {capabilities.delete_sale && (
                        <button className="btn ghost small" onClick={() => handleDelete(s.id)} title="Delete">{Icons.trash}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payModal && (
        <div className="modal-backdrop" onClick={() => setPayModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Record a payment</h3>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: -8 }}>
              {payModal.customer_name || 'Walk-in'} owes <span className="num" style={{ color: 'var(--warn)' }}>{money(payModal.balance_due)}</span>.
            </p>
            <form onSubmit={handlePaySubmit}>
              <div className="field">
                <label>Payment amount (₦)</label>
                <input required autoFocus type="number" min="1" max={payModal.balance_due} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setPayModal(null)}>Cancel</button>
                <button type="submit" className="btn">Record payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {replaceModal && (
        <div className="modal-backdrop" onClick={() => setReplaceModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Replace an item</h3>
            {replaceError && <div className="form-error">{replaceError}</div>}

            {replaceResult ? (
              <div>
                <div className="stat-grid cols-2" style={{ marginBottom: 14 }}>
                  <div className="stat-card"><div className="stat-label">Old total</div><Amount className="stat-value mono" value={replaceResult.old_total} /></div>
                  <div className="stat-card"><div className="stat-label">New total</div><Amount className="stat-value mono" value={replaceResult.new_total} /></div>
                </div>
                {replaceResult.balance === 0 ? (
                  <div className="form-error" style={{ background: 'rgba(95,191,143,.12)', borderColor: 'var(--good)', color: 'var(--good)' }}>
                    Even swap — no balance owed either way.
                  </div>
                ) : replaceResult.balance > 0 ? (
                  <div className="form-error" style={{ background: 'rgba(232,162,60,.12)', borderColor: 'var(--warn)', color: 'var(--warn)' }}>
                    Customer should pay <strong>{money(replaceResult.balance)}</strong> more.
                  </div>
                ) : (
                  <div className="form-error" style={{ background: 'rgba(79,163,227,.12)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                    Refund the customer <strong>{money(Math.abs(replaceResult.balance))}</strong>.
                  </div>
                )}
                <div className="modal-actions">
                  <button type="button" className="btn" onClick={() => setReplaceModal(null)}>Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReplaceSubmit}>
                {replaceModal.items.length > 1 && (
                  <div className="field">
                    <label>Which item is being swapped?</label>
                    <select required value={replaceLine} onChange={(e) => setReplaceLine(e.target.value)}>
                      <option value="">— Select —</option>
                      {replaceModal.items.map((it) => (
                        <option key={it.id} value={it.id}>{it.quantity}× {it.item_name} ({money(it.total)})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>New stock item (optional)</label>
                  <select value={replaceForm.item} onChange={(e) => handleReplacePickItem(e.target.value)}>
                    <option value="">— Custom / service (not from stock) —</option>
                    {catalog.map((i) => (
                      <option key={i.id} value={i.id}>{i.short_code || i.name} ({i.quantity} in stock)</option>
                    ))}
                  </select>
                </div>
                {replaceVariants.length > 0 && (
                  <div className="field">
                    <label>Variant (size/color)</label>
                    <select required value={replaceForm.variant} onChange={(e) => setReplaceForm({ ...replaceForm, variant: e.target.value })}>
                      <option value="" disabled>Select which one…</option>
                      {replaceVariants.map((v) => (
                        <option key={v.id} value={v.id}>{v.label} ({v.quantity} in stock)</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Item / service name</label>
                  <input required value={replaceForm.item_name} onChange={(e) => setReplaceForm({ ...replaceForm, item_name: e.target.value })} />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Quantity</label>
                    <input required type="number" min="1" value={replaceForm.quantity} onChange={(e) => setReplaceForm({ ...replaceForm, quantity: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Unit price (₦)</label>
                    <input required type="number" min="0" value={replaceForm.unit_price} onChange={(e) => setReplaceForm({ ...replaceForm, unit_price: e.target.value })} />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn ghost" onClick={() => setReplaceModal(null)}>Cancel</button>
                  <button type="submit" className="btn">Replace &amp; calculate balance</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
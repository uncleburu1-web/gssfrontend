import { useEffect, useState } from 'react';
import { restaurant } from '../../api/endpoints';
import { apiErrorMessage, fmtDateTime } from '../../utils/format';

const naira = (v) => '₦' + Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SERVICE = { dine_in: 'Dine-in', takeaway: 'Takeaway', counter: 'Counter' };
const METHOD = { cash: 'Cash', transfer: 'Transfer', pos: 'POS/Card', mobile: 'Mobile money' };
const lagosToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());

/** Finished orders as the hub uploaded them: takings, service charge, taxes, voids, kitchen times. */
export default function ReportsTab() {
  const [from, setFrom] = useState(lagosToday());
  const [to, setTo] = useState(lagosToday());
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setError('');
    Promise.all([restaurant.summary({ from, to }), restaurant.orders({ from, to })])
      .then(([s, o]) => { setSummary(s.data); setOrders(o.data.results); })
      .catch((err) => { setSummary(null); setOrders([]); setError(apiErrorMessage(err, 'Could not load the report.')); });
  }, [from, to]);

  const s = summary;
  return (
    <div>
      <div className="searchbar" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ margin: 0 }}><label>From</label><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="field" style={{ margin: 0 }}><label>To</label><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="field-hint" style={{ paddingBottom: 10 }}>Business days: an order at 01:00 counts for the evening before. Orders appear once the hub uploads them.</div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {s && (
        <>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-label">Takings</div><div className="stat-value" data-takings>{naira(s.takings)}</div></div>
            <div className="stat-card"><div className="stat-label">Orders</div><div className="stat-value">{s.orders}</div><div className="field-hint">{s.cancelled} cancelled</div></div>
            <div className="stat-card"><div className="stat-label">Covers</div><div className="stat-value">{s.covers}</div></div>
            <div className="stat-card"><div className="stat-label">Average bill</div><div className="stat-value">{naira(s.average_bill)}</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            <Card title="By service">
              {Object.entries(s.by_service_type).map(([k, v]) => <Row key={k} left={`${SERVICE[k] || k} (${v.orders})`} right={naira(v.takings)} />)}
              {Object.keys(s.by_service_type).length === 0 && <div className="empty">No orders.</div>}
            </Card>
            <Card title="Paid by">
              {Object.entries(s.by_payment_method).map(([k, v]) => <Row key={k} left={METHOD[k] || k} right={naira(v)} />)}
              <Row left="Tips (outside the bill)" right={naira(s.tips)} dim />
            </Card>
            <Card title="Service charge and taxes">
              <Row left="Service charge" right={naira(s.service_charge)} />
              {s.taxes.map((t) => <Row key={`${t.name}${t.rate}`} left={`${t.name} ${Number(t.rate)}%${t.inclusive ? ' (in prices)' : ''} on ${naira(t.base)}`} right={naira(t.amount)} />)}
              <Row left="Discounts given" right={naira(s.discounts)} dim />
            </Card>
            <Card title="Voids and kitchen">
              <Row left={`Voided (${s.voids.lines} lines, ${Number(s.voids.quantity)} items)`} right="" />
              <Row left={`Waste (${s.voids.waste_lines} lines)`} right={naira(s.voids.waste_value)} />
              {Object.entries(s.kitchen_minutes).map(([k, v]) => <Row key={k} left={`${k}: average from order to ready`} right={`${v.average} min`} />)}
            </Card>
            <Card title="Top items">
              {s.top_items.map((t) => <Row key={t.name} left={`${Number(t.quantity)} × ${t.name}`} right={naira(t.amount)} />)}
              {s.top_items.length === 0 && <div className="empty">No items sold.</div>}
            </Card>
          </div>
        </>
      )}
      <div className="section" style={{ marginTop: 16 }}>
        <div className="section-head"><h3>Orders</h3></div>
        <div className="section-body">
          {orders === null ? <div className="empty">Loading…</div> : orders.length === 0 ? <div className="empty">No finished orders in these days.</div> : (
            <table>
              <thead><tr><th>Order</th><th>Where</th><th>Waiter</th><th>Closed</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => restaurant.order(o.id).then(({ data }) => setOpen(data)).catch(() => {})}>
                    <td className="mono">{o.number}</td>
                    <td>{o.table ? `Table ${o.table}` : SERVICE[o.service_type]}</td>
                    <td>{o.waiter}</td>
                    <td>{o.closed_at ? fmtDateTime(o.closed_at) : '—'}</td>
                    <td className="num">{o.total ? naira(o.total) : '—'}</td>
                    <td>{o.status === 'closed' ? <span className="badge good">Paid</span> : <span className="badge muted">Cancelled</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {open && <OrderDetail order={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Card({ title, children }) {
  return <div className="section" style={{ margin: 0 }}><div className="section-head"><h3>{title}</h3></div><div className="section-body">{children}</div></div>;
}

function Row({ left, right, dim }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5, color: dim ? 'var(--text-dim)' : undefined }}><span>{left}</span><span className="num">{right}</span></div>;
}

function OrderDetail({ order, onClose }) {
  const b = order.bill;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h3>Order {order.number} · {order.table ? `Table ${order.table}` : SERVICE[order.service_type]}</h3>
        <div className="field-hint" style={{ marginBottom: 10 }}>{order.waiter} · {order.guests ? `${order.guests} guests · ` : ''}opened {fmtDateTime(order.opened_at)}{order.closed_at ? ` · closed ${fmtDateTime(order.closed_at)}` : ''}{order.cancel_reason ? ` · cancelled: ${order.cancel_reason}` : ''}</div>
        {order.items.map((i) => (
          <Row key={i.id} left={<span>{Number(i.quantity) - Number(i.voided_quantity)} × {i.name}{i.modifiers.length ? ` (${i.modifiers.map((m) => m.name).join(', ')})` : ''}
            {Number(i.voided_quantity) > 0 && <span style={{ color: 'var(--danger)' }}> · {Number(i.voided_quantity)} voided{i.void_reason ? `: ${i.void_reason}` : ''}{i.waste ? ' (waste)' : ''}</span>}</span>}
            right={naira((Number(i.unit_price) + Number(i.modifiers_price)) * (Number(i.quantity) - Number(i.voided_quantity)))} />
        ))}
        {b && (
          <div style={{ marginTop: 8 }}>
            <Row left="Subtotal" right={naira(b.subtotal)} dim />
            {Number(b.discount) > 0 && <Row left={`Discount${b.discount_reason ? ` (${b.discount_reason})` : ''}`} right={`-${naira(b.discount)}`} dim />}
            {b.charges.map((c) => <Row key={c.name} left={`${c.name} ${Number(c.rate)}%${c.inclusive ? ' (in prices)' : ''}`} right={naira(c.amount)} dim />)}
            <Row left={<b>Total</b>} right={<b>{naira(b.total)}</b>} />
            {b.payments.map((p, n) => <Row key={n} left={`${METHOD[p.method] || p.method} · ${p.received_by}`} right={naira(p.amount)} dim />)}
          </div>
        )}
        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

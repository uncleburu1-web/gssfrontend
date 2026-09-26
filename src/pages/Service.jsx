import { useEffect, useState } from 'react';
import { service, workers as workersApi, inventory as inventoryApi } from '../api/endpoints';
import { money, fmtDate, fmtDateTime, apiErrorMessage } from '../utils/format';
import { Icons } from '../components/Icons';
import Amount from '../components/Amount';

const STATUS_ORDER = ['received', 'diagnosing', 'in_repair', 'ready', 'collected'];
const STATUS_LABEL = {
  received: 'Received',
  diagnosing: 'Diagnosing',
  in_repair: 'In service',
  ready: 'Ready for pickup',
  collected: 'Collected',
};
const PRIORITY_ORDER = ['low', 'normal', 'urgent'];
const PRIORITY_LABEL = { low: 'Low', normal: 'Normal', urgent: 'Urgent' };

const emptyForm = {
  customer_name: '', customer_phone: '', device: '', issue: '', status: 'received',
  priority: 'normal', technician: '', estimated_ready: '', warranty_days: 0,
  cost: 0, payment_status: 'installment', amount_paid: 0, notes: '',
};

export default function Service() {
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [partForm, setPartForm] = useState({ item: '', quantity: 1 });
  const [partError, setPartError] = useState('');

  async function load() {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (statusFilter !== 'all') params.status = statusFilter;
    const { data } = await service.list(params);
    setTickets(data.results || data);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  useEffect(() => {
    // Technicians and inventory items only need loading once — they don't
    // change based on the search/filter above, and both selects need them
    // ready before the "New ticket" modal opens.
    workersApi.list().then(({ data }) => setTechnicians(data.results || data)).catch(() => {});
    inventoryApi.list({ page_size: 500 }).then(({ data }) => setItems(data.results || data)).catch(() => {});
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(ticket) {
    setEditing(ticket);
    setForm({
      ...ticket,
      technician: ticket.technician || '',
      estimated_ready: ticket.estimated_ready ? ticket.estimated_ready.slice(0, 16) : '',
    });
    setError('');
    setPartForm({ item: '', quantity: 1 });
    setPartError('');
    setModalOpen(true);
  }

  async function refreshEditing(id) {
    // After adding/removing a part, re-pull just this ticket so the parts
    // list, parts_cost, and the underlying tickets table all stay in sync
    // without a full reload flicker.
    const { data } = await service.list({});
    const list = data.results || data;
    setTickets(list);
    const fresh = list.find((t) => t.id === id);
    if (fresh) setEditing(fresh);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      if (payload.payment_status === 'paid') delete payload.amount_paid; // backend sets it to cost
      payload.technician = payload.technician || null;
      payload.estimated_ready = payload.estimated_ready || null;
      if (editing) {
        const { data } = await service.update(editing.id, payload);
        setEditing(data);
      } else {
        await service.create(payload);
        setModalOpen(false);
      }
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this ticket — check the fields and try again.'));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this ticket?')) return;
    await service.remove(id);
    load();
  }

  async function handleStatusChange(ticket, status) {
    await service.update(ticket.id, { status });
    load();
  }

  function openPay(ticket) {
    setPayModal(ticket);
    setPayAmount('');
  }

  async function handlePaySubmit(e) {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    await service.addPayment(payModal.id, amt);
    setPayModal(null);
    load();
  }

  async function handleAddPart(e) {
    e.preventDefault();
    setPartError('');
    if (!partForm.item) return;
    try {
      await service.addPart(editing.id, partForm.item, Number(partForm.quantity) || 1);
      setPartForm({ item: '', quantity: 1 });
      refreshEditing(editing.id);
    } catch (err) {
      setPartError(apiErrorMessage(err, 'Could not add that part — check stock on hand.'));
    }
  }

  async function handleRemovePart(partId) {
    await service.removePart(editing.id, partId);
    refreshEditing(editing.id);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Service tickets</div>
          <div className="page-sub">Track jobs from drop-off to pickup — technician, parts used, and what's been paid</div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h3>Tickets ({tickets.length})</h3>
          <button className="btn" onClick={openAdd}>{Icons.plus} New ticket</button>
        </div>
        <div className="section-body">
          <div className="searchbar" style={{ marginTop: 12 }}>
            <input placeholder="Search customer, device, or ticket #…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="empty">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="empty">No matching tickets. Click "New ticket" to log a device drop-off.</div>
          ) : (
            <div className="ticket-grid">
              {tickets.map((r) => (
                <div className="ticket" key={r.id} onClick={() => openEdit(r)} style={{ cursor: 'pointer' }}>
                  <div className="ticket-top">
                    <span className="ticket-id">{r.ticket_no}</span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      {r.priority === 'urgent' && <span className="badge diagnosing"><span className="ledot" />Urgent</span>}
                      <span className={`badge ${r.status}`}><span className="ledot" />{STATUS_LABEL[r.status]}</span>
                    </span>
                  </div>
                  <div className="ticket-perf" />
                  <div className="ticket-bottom">
                    <div className="ticket-device">{r.device}</div>
                    <div className="ticket-issue">{r.issue}</div>
                    <div className="ticket-meta">
                      <span>{r.customer_name}{r.customer_phone ? ' · ' + r.customer_phone : ''}</span>
                      <span className="mono">{fmtDate(r.date_in)}</span>
                    </div>
                    {r.technician_name && (
                      <div className="ticket-meta"><span>Technician</span><span>{r.technician_name}</span></div>
                    )}
                    {r.estimated_ready && (
                      <div className="ticket-meta"><span>Est. ready</span><span className="mono">{fmtDateTime(r.estimated_ready)}</span></div>
                    )}
                    {Number(r.parts_cost) > 0 && (
                      <div className="ticket-meta"><span>Parts used</span><Amount className="num" value={r.parts_cost} /></div>
                    )}
                    {Number(r.cost) > 0 && (
                      <>
                        <div className="ticket-meta"><span>Quoted</span><Amount className="num" value={r.cost} /></div>
                        <div className="ticket-meta" style={{ alignItems: 'center' }}>
                          <span className={`badge ${r.is_paid ? 'ready' : 'diagnosing'}`}>
                            <span className="ledot" />{r.is_paid ? 'Paid in full' : 'Installment'}
                          </span>
                          {!r.is_paid && <span className="num" style={{ color: 'var(--warn)', fontWeight: 700 }}>{money(r.balance_due)} owed</span>}
                        </div>
                      </>
                    )}
                    <div className="ticket-actions" onClick={(e) => e.stopPropagation()}>
                      {r.status !== 'collected' && (
                        <select
                          className="btn small ghost"
                          style={{ padding: '5px 8px' }}
                          value={r.status}
                          onChange={(e) => handleStatusChange(r, e.target.value)}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                      )}
                      {Number(r.cost) > 0 && !r.is_paid && (
                        <button className="btn small ghost" onClick={() => openPay(r)}>+ Payment</button>
                      )}
                      <button className="btn small ghost" onClick={() => openEdit(r)}>{Icons.edit}</button>
                      <button className="btn small danger" onClick={() => handleDelete(r.id)}>{Icons.trash}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h3>{editing ? `Ticket ${editing.ticket_no}` : 'New service ticket'}</h3>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field-row">
                <div className="field">
                  <label>Customer name</label>
                  <input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Device</label>
                <input required value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} placeholder="e.g. Dell Inspiron 15, screen cracked" />
              </div>
              <div className="field">
                <label>Issue reported</label>
                <textarea required rows="3" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITY_ORDER.map((p) => (
                      <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Technician</label>
                  <select value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })}>
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Estimated ready</label>
                  <input type="datetime-local" value={form.estimated_ready} onChange={(e) => setForm({ ...form, estimated_ready: e.target.value })} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Quoted cost (₦)</label>
                  <input type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
                </div>
                <div className="field">
                  <label>Warranty (days)</label>
                  <input type="number" min="0" value={form.warranty_days} onChange={(e) => setForm({ ...form, warranty_days: e.target.value })} placeholder="0 = none" />
                </div>
              </div>

              <div className="field">
                <label>Payment</label>
                <div className="tabs" style={{ display: 'inline-flex' }}>
                  <button
                    type="button"
                    className={`tab ${form.payment_status === 'paid' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, payment_status: 'paid' })}
                  >
                    ✓ Paid
                  </button>
                  <button
                    type="button"
                    className={`tab ${form.payment_status === 'installment' ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, payment_status: 'installment' })}
                  >
                    Installment
                  </button>
                </div>
              </div>

              {form.payment_status === 'installment' && (
                <div className="field">
                  <label>Amount paid so far (₦)</label>
                  <input type="number" min="0" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} placeholder="0" />
                </div>
              )}
              {form.payment_status === 'paid' && Number(form.cost) > 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: -6, marginBottom: 12 }}>
                  Will be recorded as fully paid — {money(form.cost)} collected.
                </div>
              )}

              <div className="field">
                <label>Notes</label>
                <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Diagnosis details…" />
              </div>

              {editing && (
                <div className="field">
                  <label>Parts used {Number(editing.parts_cost) > 0 && <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>— {money(editing.parts_cost)} in stock cost</span>}</label>
                  {partError && <div className="form-error" style={{ marginBottom: 8 }}>{partError}</div>}
                  {(editing.parts_used || []).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {editing.parts_used.map((p) => (
                        <div key={p.id} className="ticket-meta" style={{ alignItems: 'center' }}>
                          <span>{p.quantity}× {p.item_name}</span>
                          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className="num">{money(p.total_cost)}</span>
                            <button type="button" className="btn small danger" onClick={() => handleRemovePart(p.id)}>{Icons.trash}</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="field-row" style={{ alignItems: 'flex-end' }}>
                    <div className="field" style={{ flex: 2 }}>
                      <select value={partForm.item} onChange={(e) => setPartForm({ ...partForm, item: e.target.value })}>
                        <option value="">Choose a stock item…</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id} disabled={it.quantity <= 0}>
                            {it.name} ({it.quantity} in stock)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ flex: 1 }}>
                      <input type="number" min="1" value={partForm.quantity} onChange={(e) => setPartForm({ ...partForm, quantity: e.target.value })} />
                    </div>
                    <button type="button" className="btn ghost" style={{ marginBottom: 4 }} onClick={handleAddPart}>Add part</button>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setModalOpen(false)}>Close</button>
                <button type="submit" className="btn">{editing ? 'Save changes' : 'Create ticket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payModal && (
        <div className="modal-backdrop" onClick={() => setPayModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Record a payment</h3>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: -8 }}>
              {payModal.customer_name} owes <span className="num" style={{ color: 'var(--warn)' }}>{money(payModal.balance_due)}</span> on {payModal.ticket_no} ({payModal.device}).
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
    </>
  );
}

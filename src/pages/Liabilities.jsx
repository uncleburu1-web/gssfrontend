import { useEffect, useState } from 'react';
import { liabilities, liabilityPayments, reports } from '../api/endpoints';
import { money, fmtDate, apiErrorMessage } from '../utils/format';
import { Icons } from '../components/Icons';
import Amount from '../components/Amount';

const CATEGORY_LABEL = {
  rent: 'Shop rent', loan: 'Loan', utility: 'Utility bill',
  salary: 'Staff salary owed', supplier_credit: 'Supplier credit', other: 'Other',
};

const STATUS_LABEL = { unpaid: 'Unpaid', partially_paid: 'Partially paid', cleared: 'Cleared' };
const STATUS_BADGE = { unpaid: 'warn', partially_paid: 'muted', cleared: 'good' };

const PAYMENT_METHOD_LABEL = { cash: 'Cash', transfer: 'Transfer', pos: 'POS/Card' };

const emptyForm = { name: '', category: 'rent', owed_to: '', amount: '', due_date: '', notes: '' };
const emptyPayment = { amount: '', payment_method: 'cash', notes: '' };

export default function Liabilities() {
  const [rows, setRows] = useState([]);
  const [netWorth, setNetWorth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [payModal, setPayModal] = useState(null); // the liability being paid
  const [payForm, setPayForm] = useState(emptyPayment);
  const [payError, setPayError] = useState('');
  const [expanded, setExpanded] = useState(null); // liability id whose payment history is open
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    setLoading(true);
    const [liabRes, nwRes] = await Promise.all([
      liabilities.list(statusFilter ? { status: statusFilter } : undefined),
      reports.netWorth(),
    ]);
    setRows(liabRes.data.results || liabRes.data);
    setNetWorth(nwRes.data);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [statusFilter]);

  function openAdd() {
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await liabilities.create(form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this liability — check the fields and try again.'));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this liability record? Its payment history goes with it.')) return;
    await liabilities.remove(id);
    load();
  }

  function openPay(liability) {
    setPayForm({ ...emptyPayment, amount: liability.outstanding });
    setPayError('');
    setPayModal(liability);
  }

  async function handlePaySubmit(e) {
    e.preventDefault();
    setPayError('');
    try {
      await liabilityPayments.create({ liability: payModal.id, ...payForm });
      setPayModal(null);
      load();
    } catch (err) {
      setPayError(apiErrorMessage(err, 'Could not record that payment.'));
    }
  }

  async function handleDeletePayment(paymentId) {
    if (!confirm('Remove this payment? The liability will reopen for the amount removed.')) return;
    await liabilityPayments.remove(paymentId);
    load();
  }

  const riskRatio = netWorth && netWorth.assets > 0 ? netWorth.liabilities / netWorth.assets : (netWorth?.liabilities > 0 ? 1 : 0);
  const riskLevel = riskRatio >= 0.7 ? 'high' : riskRatio >= 0.4 ? 'moderate' : 'low';
  const riskLabel = riskLevel === 'high' ? 'High risk' : riskLevel === 'moderate' ? 'Moderate risk' : 'Low risk';
  const riskColor = riskLevel === 'high' ? 'var(--danger)' : riskLevel === 'moderate' ? 'var(--warn)' : 'var(--good)';

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Liabilities</div>
          <div className="page-sub">What you owe, and the full payment history behind every balance</div>
        </div>
      </div>

      {netWorth && (
        <div className="section">
          <div className="section-head"><h3>Net worth & risk</h3></div>
          <div className="section-body" style={{ paddingTop: 16 }}>
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-label">Assets (stock + receivables)</div><Amount className="stat-value mono" value={netWorth.assets} /></div>
              <div className="stat-card"><div className="stat-label">Liabilities (outstanding)</div><Amount className="stat-value mono warn" value={netWorth.liabilities} /></div>
              <div className="stat-card">
                <div className="stat-label">Net worth</div>
                <Amount
                  className={`stat-value mono ${netWorth.net_worth >= 0 ? 'good' : ''}`}
                  style={netWorth.net_worth < 0 ? { color: 'var(--danger)' } : undefined}
                  value={netWorth.net_worth}
                />
              </div>
              <div className="stat-card">
                <div className="stat-label">Risk level</div>
                <span className={`risk-label ${riskLevel}`}>{riskLabel}</span>
              </div>
            </div>
            <div style={{ marginTop: 4 }}>
              <div className="risk-meter">
                <div className="risk-meter-fill" style={{ width: `${Math.min(100, riskRatio * 100)}%`, background: riskColor }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6 }}>
                Liabilities are {Math.round(riskRatio * 100)}% of assets. Above 70% is high risk — the shop owes nearly as much as (or more than) it's worth.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-head">
          <h3>Liabilities ({rows.length})</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="btn" onClick={openAdd}>{Icons.plus} Add liability</button>
          </div>
        </div>
        <div className="section-body">
          {loading ? (
            <div className="empty">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="empty">No liabilities recorded — rent, loans, salaries owed, or supplier bills you add here will show up against your net worth.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Name</th><th>Owed to</th><th>Category</th><th>Amount</th><th>Paid</th><th>Outstanding</th><th>Due</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {rows.map((l) => (
                    <>
                      <tr key={l.id}>
                        <td>
                          <button className="link-button" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                            {expanded === l.id ? '▾' : '▸'} {l.name}
                          </button>
                        </td>
                        <td>{l.owed_to || '—'}</td>
                        <td>{CATEGORY_LABEL[l.category] || l.category}</td>
                        <td className="num">{money(l.amount)}</td>
                        <td className="num">{money(l.amount_paid)}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{money(l.outstanding)}</td>
                        <td className="mono">{fmtDate(l.due_date)}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[l.status]}`}>
                            <span className="ledot" />{STATUS_LABEL[l.status] || l.status}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            {l.status !== 'cleared' && (
                              <button className="btn small" onClick={() => openPay(l)}>Record payment</button>
                            )}
                            <button className="btn small ghost" onClick={() => handleDelete(l.id)}>{Icons.trash}</button>
                          </div>
                        </td>
                      </tr>
                      {expanded === l.id && (
                        <tr>
                          <td colSpan={9} style={{ background: 'var(--surface-2, rgba(255,255,255,0.03))' }}>
                            {l.notes && <div style={{ fontSize: 12.5, marginBottom: 8, opacity: 0.8 }}>{l.notes}</div>}
                            {(!l.payments || l.payments.length === 0) ? (
                              <div style={{ fontSize: 12.5, opacity: 0.6, padding: '6px 0' }}>No payments recorded yet.</div>
                            ) : (
                              <table style={{ width: '100%' }}>
                                <thead>
                                  <tr><th>Date</th><th>Amount</th><th>Method</th><th>Recorded by</th><th>Notes</th><th></th></tr>
                                </thead>
                                <tbody>
                                  {l.payments.map((p) => (
                                    <tr key={p.id}>
                                      <td className="mono">{fmtDate(p.paid_at)}</td>
                                      <td className="num">{money(p.amount)}</td>
                                      <td>{PAYMENT_METHOD_LABEL[p.payment_method] || p.payment_method}</td>
                                      <td>{p.recorded_by_name || '—'}</td>
                                      <td style={{ fontSize: 12 }}>{p.notes || '—'}</td>
                                      <td><button className="btn ghost small" onClick={() => handleDeletePayment(p.id)}>{Icons.trash}</button></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add a liability</h3>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shop rent — August" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {Object.entries(CATEGORY_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Amount (₦)</label>
                  <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Owed to</label>
                <input value={form.owed_to} onChange={(e) => setForm({ ...form, owed_to: e.target.value })} placeholder="Person or company" />
              </div>
              <div className="field">
                <label>Due date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn">Add liability</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payModal && (
        <div className="modal-backdrop" onClick={() => setPayModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Record a payment — {payModal.name}</h3>
            <div style={{ fontSize: 12.5, opacity: 0.75, marginBottom: 10 }}>
              Outstanding: {money(payModal.outstanding)}
            </div>
            {payError && <div className="form-error">{payError}</div>}
            <form onSubmit={handlePaySubmit}>
              <div className="field-row">
                <div className="field">
                  <label>Amount (₦)</label>
                  <input
                    required type="number" min="0.01" step="0.01" max={payModal.outstanding}
                    value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Payment method</label>
                  <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>
                    {Object.entries(PAYMENT_METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Optional" />
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

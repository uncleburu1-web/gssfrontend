import { useEffect, useRef, useState } from 'react';
import { expenses as expensesApi, expenseCategories } from '../api/endpoints';
import { money, fmtDate, apiErrorMessage } from '../utils/format';
import { Icons } from '../components/Icons';

const PAYMENT_METHOD_LABEL = { cash: 'Cash', transfer: 'Transfer', pos: 'POS/Card' };

const emptyForm = {
  category: '', amount: '', description: '', payment_method: 'cash',
  date: new Date().toISOString().slice(0, 10), notes: '',
};

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const fileInputs = useRef({});

  async function load() {
    setLoading(true);
    const [expRes, catRes] = await Promise.all([
      expensesApi.list(categoryFilter ? { category: categoryFilter } : undefined),
      expenseCategories.list(),
    ]);
    setRows(expRes.data.results || expRes.data);
    setCategories(catRes.data.results || catRes.data);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [categoryFilter]);

  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, category: categories[0]?.id || '' });
    setError('');
    setModalOpen(true);
  }

  function openEdit(expense) {
    setEditing(expense);
    setForm({
      category: expense.category, amount: expense.amount, description: expense.description || '',
      payment_method: expense.payment_method, date: expense.date, notes: expense.notes || '',
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await expensesApi.update(editing.id, form);
      } else {
        await expensesApi.create(form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this expense — check the fields and try again.'));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this expense record?')) return;
    await expensesApi.remove(id);
    load();
  }

  async function handleReceiptPick(expense, file) {
    if (!file) return;
    setError('');
    try {
      await expensesApi.uploadReceipt(expense.id, file);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not upload that receipt.'));
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await expenseCategories.create({ name: newCategory.trim() });
      setNewCategory('');
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add that category.'));
    }
  }

  async function handleRemoveCategory(id) {
    if (!confirm('Remove this category? Existing expenses keep showing it, but it won\u2019t be selectable for new ones.')) return;
    try {
      await expenseCategories.remove(id);
      load();
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not remove that category.'));
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Expenses</div>
          <div className="page-sub">Every cost that actually left the business — fuel, rent, repairs, and more</div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h3>{rows.length} expense{rows.length === 1 ? '' : 's'} — {money(total)} total</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn ghost" onClick={() => setCategoryModalOpen(true)}>Categories</button>
            <button className="btn" onClick={openAdd}>{Icons.plus} Add expense</button>
          </div>
        </div>
        <div className="section-body">
          {error && <div className="form-error">{error}</div>}
          {loading ? (
            <div className="empty">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="empty">No expenses recorded yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Method</th><th>Recorded by</th><th>Receipt</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{fmtDate(r.date)}</td>
                      <td>{r.category_name}</td>
                      <td>{r.description || '—'}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{money(r.amount)}</td>
                      <td>{PAYMENT_METHOD_LABEL[r.payment_method] || r.payment_method}</td>
                      <td>{r.recorded_by_name || '—'}</td>
                      <td>
                        {r.receipt_url ? (
                          <a href={r.receipt_url} target="_blank" rel="noreferrer">View</a>
                        ) : (
                          <button className="btn ghost small" onClick={() => fileInputs.current[r.id]?.click()}>Attach</button>
                        )}
                        <input
                          ref={(el) => { fileInputs.current[r.id] = el; }}
                          type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={(e) => handleReceiptPick(r, e.target.files?.[0])}
                        />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn ghost small" onClick={() => openEdit(r)}>{Icons.edit}</button>
                          <button className="btn ghost small" onClick={() => handleDelete(r.id)}>{Icons.trash}</button>
                        </div>
                      </td>
                    </tr>
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
            <h3>{editing ? 'Edit expense' : 'Add an expense'}</h3>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field-row">
                <div className="field">
                  <label>Category</label>
                  <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="" disabled>Choose one</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Amount (₦)</label>
                  <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Fuel for delivery bike" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Payment method</label>
                  <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                    {Object.entries(PAYMENT_METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Date</label>
                  <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn">{editing ? 'Save changes' : 'Add expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categoryModalOpen && (
        <div className="modal-backdrop" onClick={() => setCategoryModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Expense categories</h3>
            <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
              {categories.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{c.name}</span>
                  <button className="btn ghost small" onClick={() => handleRemoveCategory(c.id)}>{Icons.trash}</button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 8 }}>
              <input style={{ flex: 1 }} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
              <button type="submit" className="btn">Add</button>
            </form>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setCategoryModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

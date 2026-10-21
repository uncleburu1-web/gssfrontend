import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';
import { branches as branchesApi, transfers as transfersApi } from '../api/endpoints';
import { fmtDateTime, apiErrorMessage } from '../utils/format';

/**
 * Move stock between branches (the business owner only). Units leave the source branch earliest
 * expiry first and arrive at the destination as batches with the same cost and expiry. The
 * destination product is matched by barcode or name, or created if that branch doesn't stock it.
 */
export default function Transfers() {
  const [branchList, setBranchList] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState([]); // [{item, variant, label, quantity, max}]
  const [note, setNote] = useState('');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);

  function loadHistory() {
    transfersApi.list().then(({ data }) => setHistory(data)).catch(() => {});
  }
  useEffect(() => {
    branchesApi.list().then(({ data }) => setBranchList(data.results || data)).catch(() => {});
    loadHistory();
  }, []);

  useEffect(() => {
    setLines([]);
    setItems([]);
    if (!from) return;
    // This one request is for the source branch, whatever branch the rest of the app is showing.
    client.get('/inventory/items/', { headers: { 'X-Branch-ID': from }, params: { page_size: 1000 } })
      .then(({ data }) => setItems((data.results || data).filter((i) => i.quantity > 0)))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load that branch\'s stock.')));
  }, [from]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => !q || i.name.toLowerCase().includes(q) || (i.barcode || '').includes(q)).slice(0, 30);
  }, [items, search]);

  async function addItem(item) {
    setError('');
    if (item.has_variants) {
      const { data } = await client.get(`/inventory/items/${item.id}/`, { headers: { 'X-Branch-ID': from } });
      const add = data.variants.filter((v) => v.quantity > 0 && !lines.some((l) => l.variant === v.id))
        .map((v) => ({ item: item.id, variant: v.id, label: `${item.name} — ${v.label}`, quantity: '', max: v.quantity }));
      setLines([...lines, ...add]);
    } else if (!lines.some((l) => l.item === item.id)) {
      setLines([...lines, { item: item.id, variant: null, label: item.sold_by_weight ? `${item.name} (kg)` : item.name, quantity: '', max: item.quantity, by_weight: item.sold_by_weight }]);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setDone('');
    try {
      await transfersApi.create({
        from_branch: from, to_branch: to, note,
        lines: lines.filter((l) => Number(l.quantity) > 0).map((l) => ({ item: l.item, variant: l.variant, quantity: Number(l.quantity) })),
      });
      const names = (id) => branchList.find((b) => String(b.id) === String(id))?.name;
      setDone(`Moved to ${names(to)}.`);
      setLines([]); setNote('');
      const { data } = await client.get('/inventory/items/', { headers: { 'X-Branch-ID': from }, params: { page_size: 1000 } });
      setItems((data.results || data).filter((i) => i.quantity > 0));
      loadHistory();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not move the stock.'));
    } finally {
      setBusy(false);
    }
  }

  const ready = from && to && from !== to && lines.some((l) => Number(l.quantity) > 0);
  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Move stock</div>
          <div className="page-sub">Send stock from one branch to another — it leaves one and arrives at the other at once</div>
        </div>
      </div>

      {branchList.length < 2 ? (
        <div className="section"><div className="section-body"><div className="empty">You need at least two branches to move stock between them.</div></div></div>
      ) : (
        <form className="section" onSubmit={submit}>
          <div className="section-body">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="field" style={{ minWidth: 200 }}>
                <label>From branch</label>
                <select value={from} onChange={(e) => setFrom(e.target.value)} required>
                  <option value="">Choose…</option>
                  {branchList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ minWidth: 200 }}>
                <label>To branch</label>
                <select value={to} onChange={(e) => setTo(e.target.value)} required>
                  <option value="">Choose…</option>
                  {branchList.filter((b) => String(b.id) !== String(from)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {from && (
              <>
                <div className="searchbar" style={{ marginTop: 8 }}>
                  <input placeholder="Search products at this branch…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
                  {shown.map((i) => (
                    <button type="button" key={i.id} className="btn ghost small" onClick={() => addItem(i)}>+ {i.name} ({i.quantity})</button>
                  ))}
                </div>
              </>
            )}

            {lines.length > 0 && (
              <table>
                <thead><tr><th>Product</th><th>Available</th><th>Move</th><th></th></tr></thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={`${l.item}-${l.variant || ''}`}>
                      <td>{l.label}</td>
                      <td className="num">{l.max}</td>
                      <td><input type="number" min={l.by_weight ? '0.001' : '1'} max={l.max} step={l.by_weight ? '0.001' : '1'} style={{ width: 80 }} value={l.quantity}
                        onChange={(e) => setLines(lines.map((x, j) => (j === idx ? { ...x, quantity: e.target.value } : x)))} /></td>
                      <td><button type="button" className="btn ghost small" onClick={() => setLines(lines.filter((_, j) => j !== idx))}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="field" style={{ marginTop: 10 }}>
              <label>Note (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Weekend top-up for Lekki" />
            </div>
            {error && <div className="form-error">{error}</div>}
            {done && <div className="banner good" style={{ marginBottom: 10 }}>{done}</div>}
            <button type="submit" className="btn" disabled={!ready || busy}>{busy ? 'Moving…' : 'Move stock'}</button>
          </div>
        </form>
      )}

      <div className="section">
        <div className="section-head"><div className="page-sub" style={{ margin: 0 }}>Past moves</div></div>
        <div className="section-body">
          {history.length === 0 ? <div className="empty">Nothing moved yet.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>When</th><th>From → To</th><th>What</th><th>By</th><th>Note</th></tr></thead>
                <tbody>
                  {history.map((t) => (
                    <tr key={t.id}>
                      <td className="mono">{fmtDateTime(t.created_at)}</td>
                      <td>{t.from_branch} → {t.to_branch}</td>
                      <td>{t.lines.map((l) => `${l.quantity} x ${l.item_name}${l.variant ? ` (${l.variant})` : ''}`).join(', ')}</td>
                      <td>{t.actor_name || '—'}</td>
                      <td>{t.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

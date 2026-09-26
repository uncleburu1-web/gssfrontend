import { useEffect, useState } from 'react';
import { inventory, batches as batchApi, variants as variantApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { money, fmtDate, apiErrorMessage } from '../utils/format';
import { Icons } from '../components/Icons';

// Full label map for every category code that has ever existed (matches
// inventory/models.py CATEGORY_CHOICES) — used only as a display fallback
// for items whose stored category isn't in this org's current picker (a
// mixed catalog, or an item saved before the shop switched business type).
// The picker itself never uses this list directly — see availableCategories
// below, which the backend already scopes to this org's business_type.
const FALLBACK_LABEL = {
  laptop: 'Laptop', part: 'Part', accessory: 'Accessory', consumable: 'Consumable',
  medicine: 'Medicine / Drug', tablet_capsule: 'Tablet / Capsule', syrup_liquid: 'Syrup / Liquid',
  injection: 'Injection', medical_supply: 'Medical supply', equipment: 'Equipment',
  apparel_top: 'Top / Shirt', apparel_bottom: 'Trousers / Skirt', footwear: 'Footwear',
  outerwear: 'Outerwear', clothing_accessory: 'Bag / Fashion accessory',
  grocery: 'Grocery', household: 'Household item', stationery: 'Stationery', beverage: 'Beverage',
  other: 'Other',
};

// Just a hint text in an empty input — shown before the org's actual
// business_type-scoped categories (above) even load, so it's a plain
// lookup rather than derived from availableCategories.
const NAME_PLACEHOLDER = {
  gadgets: 'e.g. HP EliteBook 840 G5',
  pharmacy: 'e.g. Paracetamol 500',
  clothing: "e.g. Men's Polo Shirt, size M",
  general: 'e.g. Indomie Noodles (carton)',
};

const emptyItemForm = { name: '', short_code: '', barcode: '', category: 'other', brand: '', unit: 'PIECE', spec: '', min_stock: 2, prescription_required: false };
const emptyBatchForm = { batch_number: '', quantity_received: '', cost_price: '', selling_price: '', expiry_date: '', supplier_name: '', variant: '' };
const emptyVariantForm = { size: '', color: '', sku: '' };

export default function Inventory() {
  const { isOwner, pharmacyEnabled, businessType, availableCategories } = useAuth();
  // Backend already scopes this to the org's business_type — e.g. a
  // clothing shop only gets Top/Bottom/Footwear/... + Other, a gadgets
  // shop only gets Laptop/Part/Accessory/Consumable + Other. Falls back
  // to just "Other" if the field is ever missing (older cached session).
  const categoryOptions = availableCategories.length ? availableCategories : [{ value: 'other', label: 'Other' }];
  const { versions } = useLive();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const [batchModalItem, setBatchModalItem] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);
  const [noExpiry, setNoExpiry] = useState(false);

  const [variantModalItem, setVariantModalItem] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantForm, setVariantForm] = useState(emptyVariantForm);

  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);

  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await inventory.list(search ? { search } : undefined);
    setItems(data.results || data);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // Live product/stock changes — from a REST call in another tab, the
    // CEO's session, or a desktop sale/restock synced up — refetch the
    // same debounced way a search keystroke would, so a burst of several
    // events (e.g. a multi-item sale) coalesces into one fetch, not one
    // per event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, versions.inventoryitem, versions.stockbatch]);

  function openAddItem() {
    setEditingItem(null);
    setItemForm({ ...emptyItemForm, category: categoryOptions[0]?.value || 'other' });
    setError('');
    setItemModalOpen(true);
  }

  function openEditItem(item) {
    setEditingItem(item);
    setItemForm({ ...item });
    setError('');
    setItemModalOpen(true);
  }

  async function handleItemSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingItem) {
        await inventory.update(editingItem.id, itemForm);
      } else {
        await inventory.create(itemForm);
      }
      setItemModalOpen(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this item — check the fields and try again.'));
    }
  }

  async function handleDeleteItem(id) {
    if (!confirm('Remove this item and all its batch history?')) return;
    await inventory.remove(id);
    setExpandedId(null);
    load();
  }

  async function toggleExpand(item) {
    if (expandedId === item.id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(item.id);
    const { data } = await inventory.get(item.id);
    setExpandedDetail(data);
  }

  async function refreshExpanded(id) {
    const { data } = await inventory.get(id);
    setExpandedDetail(data);
    load();
  }

  function openAddBatch(item) {
    setBatchModalItem(item);
    setEditingBatch(null);
    // Default to the item's first variant when it has any — a variant
    // item's batches are expected to name one (see StockBatchSerializer
    // .validate on the backend), so this is the field that actually
    // needs a sensible default, not just a convenience.
    const firstVariant = expandedDetail?.variants?.[0];
    setBatchForm({ ...emptyBatchForm, variant: firstVariant ? firstVariant.id : '' });
    setNoExpiry(false);
    setError('');
  }

  function openEditBatch(item, batch) {
    setBatchModalItem(item);
    setEditingBatch(batch);
    setBatchForm({
      batch_number: batch.batch_number,
      quantity_received: batch.quantity_received,
      cost_price: batch.cost_price,
      selling_price: batch.selling_price,
      expiry_date: batch.expiry_date || '',
      supplier_name: batch.supplier_name || '',
      variant: batch.variant || '',
    });
    setNoExpiry(!batch.expiry_date);
    setError('');
  }

  async function handleBatchSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = { ...batchForm, expiry_date: noExpiry ? '' : batchForm.expiry_date };
    try {
      const itemId = batchModalItem.id;
      if (editingBatch) {
        await batchApi.update(editingBatch.id, payload);
      } else {
        await inventory.addBatch(itemId, payload);
      }
      setBatchModalItem(null);
      setEditingBatch(null);
      if (expandedId === itemId) refreshExpanded(itemId);
      else load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this batch — check the fields and try again.'));
    }
  }

  async function handleDeleteBatch(batchId, itemId) {
    if (!confirm('Remove this batch record?')) return;
    await batchApi.remove(batchId);
    refreshExpanded(itemId);
  }

  function openAddVariant(item) {
    setVariantModalItem(item);
    setEditingVariant(null);
    setVariantForm(emptyVariantForm);
    setError('');
  }

  function openEditVariant(item, variant) {
    setVariantModalItem(item);
    setEditingVariant(variant);
    setVariantForm({ size: variant.size, color: variant.color, sku: variant.sku });
    setError('');
  }

  async function handleVariantSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingVariant) {
        await variantApi.update(editingVariant.id, variantForm);
      } else {
        await inventory.addVariant(variantModalItem.id, variantForm);
      }
      const itemId = variantModalItem.id;
      setVariantModalItem(null);
      setEditingVariant(null);
      refreshExpanded(itemId);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save this variant — check the fields and try again.'));
    }
  }

  async function handleDeleteVariant(variantId, itemId) {
    if (!confirm('Remove this variant? Its stock batches stop being tracked separately.')) return;
    await variantApi.remove(variantId);
    refreshExpanded(itemId);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Inventory</div>
          <div className="page-sub">Stock, batches, and reorder levels</div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h3>Items ({items.length})</h3>
          {isOwner && <button className="btn" onClick={openAddItem}>{Icons.plus} Add item</button>}
        </div>
        <div className="section-body">
          <div className="searchbar" style={{ marginTop: 12 }}>
            <input placeholder="Search by name, code, or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="empty">Loading…</div>
          ) : items.length === 0 ? (
            <div className="empty">No stock items yet.{isOwner && ' Click "Add item" to log your first one.'}</div>
          ) : (
            <div className="stock-list">
              {items.map((i) => (
                <div className="stock-card" key={i.id}>
                  <div className="stock-card-main" onClick={() => toggleExpand(i)}>
                    <div>
                      <div className="stock-card-title">
                        {i.short_code || i.name}
                        {i.is_low_stock && <span className="badge diagnosing" style={{ marginLeft: 8 }}><span className="ledot" />Low stock</span>}
                      </div>
                      <div className="stock-card-sub mono">
                        {i.name}{i.spec ? ` · ${i.spec}` : ''} · {FALLBACK_LABEL[i.category] || i.category}
                        {i.prescription_required && <span style={{ marginLeft: 6 }}>℞</span>}
                      </div>
                    </div>
                    <div className="stock-card-figures">
                      <div>
                        <div className="num" style={{ fontWeight: 700, fontSize: 16 }}>{i.quantity}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>units left</div>
                      </div>
                      <div>
                        <div className="num" style={{ fontWeight: 700, fontSize: 16 }}>{money(i.sell_price)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>/ {i.unit.toLowerCase()}</div>
                      </div>
                      <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                        Reorder at {i.min_stock} · {i.batch_count} batch{i.batch_count === 1 ? '' : 'es'}
                      </div>
                    </div>
                  </div>

                  {expandedId === i.id && expandedDetail && (
                    <div className="stock-card-detail">
                      <div className="stock-card-detail-head">
                        <span>Variants (sizes/colors)</span>
                        {isOwner && (
                          <button className="btn small ghost" onClick={() => openAddVariant(i)}>{Icons.plus} Add variant</button>
                        )}
                      </div>
                      {expandedDetail.variants.length === 0 ? (
                        <div className="empty" style={{ marginBottom: 16 }}>No variants — stock for this item is tracked as one whole.</div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                          {expandedDetail.variants.map((v) => (
                            <span key={v.id} className={`badge ${v.is_low_stock ? 'warn' : 'good'}`}>
                              {v.label} · {v.quantity} left
                              {isOwner && (
                                <>
                                  <button className="btn small ghost" style={{ padding: '0 4px' }} onClick={() => openEditVariant(i, v)}>{Icons.edit}</button>
                                  <button className="btn small ghost" style={{ padding: '0 4px' }} onClick={() => handleDeleteVariant(v.id, i.id)}>{Icons.trash}</button>
                                </>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="stock-card-detail-head">
                        <span>Batch history</span>
                        {isOwner && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn small ghost" onClick={() => openAddBatch(i)}>{Icons.plus} Add stock batch</button>
                            <button className="btn small ghost" onClick={() => openEditItem(i)}>{Icons.edit} Edit item</button>
                            <button className="btn small danger" onClick={() => handleDeleteItem(i.id)}>{Icons.trash}</button>
                          </div>
                        )}
                      </div>
                      {expandedDetail.batches.length === 0 ? (
                        <div className="empty">No batches recorded yet.</div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table>
                            <thead>
                              <tr>
                                <th>Batch #</th>
                                {expandedDetail.variants.length > 0 && <th>Variant</th>}
                                <th>Received</th><th>Left</th><th>Cost</th><th>Sell</th><th>Expiry</th><th>Supplier</th>{isOwner && <th></th>}
                              </tr>
                            </thead>
                            <tbody>
                              {expandedDetail.batches.map((b) => (
                                <tr key={b.id}>
                                  <td className="mono">{b.batch_number}</td>
                                  {expandedDetail.variants.length > 0 && <td>{b.variant_label || '—'}</td>}
                                  <td className="num">{b.quantity_received}</td>
                                  <td className="num">{b.quantity_remaining}</td>
                                  <td className="num">{money(b.cost_price)}</td>
                                  <td className="num">{money(b.selling_price)}</td>
                                  <td className="mono" style={{ color: b.is_expired ? 'var(--danger)' : b.is_expiring_soon ? 'var(--warn)' : b.expiry_date ? undefined : 'var(--text-dim)' }}>
                                    {b.expiry_date ? fmtDate(b.expiry_date) : 'No expiry date'}
                                  </td>
                                  <td>{b.supplier_display || '—'}</td>
                                  {isOwner && (
                                    <td>
                                      <div className="row-actions">
                                        <button className="btn small ghost" onClick={() => openEditBatch(i, b)}>{Icons.edit}</button>
                                        <button className="btn small danger" onClick={() => handleDeleteBatch(b.id, i.id)}>{Icons.trash}</button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {itemModalOpen && (
        <div className="modal-backdrop" onClick={() => setItemModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingItem ? 'Edit item' : 'Add stock item'}</h3>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleItemSubmit}>
              <div className="field">
                <label>Item name</label>
                <input required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder={NAME_PLACEHOLDER[businessType] || NAME_PLACEHOLDER.general} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Short code (label)</label>
                  <input value={itemForm.short_code} onChange={(e) => setItemForm({ ...itemForm, short_code: e.target.value })} placeholder="e.g. Para500" />
                </div>
                <div className="field">
                  <label>Barcode</label>
                  <input value={itemForm.barcode || ''} onChange={(e) => setItemForm({ ...itemForm, barcode: e.target.value })} placeholder="Scan or type — leave blank if it has none" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Spec</label>
                  <input value={itemForm.spec} onChange={(e) => setItemForm({ ...itemForm, spec: e.target.value })} placeholder="e.g. 200mg, 15.6-inch" />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}>
                    {categoryOptions.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Unit</label>
                  <input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="TABLET, PIECE, BOX…" />
                </div>
                <div className="field">
                  <label>Brand</label>
                  <input value={itemForm.brand} onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })} />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Reorder at (units)</label>
                  <input required type="number" min="0" value={itemForm.min_stock} onChange={(e) => setItemForm({ ...itemForm, min_stock: e.target.value })} />
                </div>
              </div>
              {pharmacyEnabled && (
                <div className="field">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!itemForm.prescription_required}
                      onChange={(e) => setItemForm({ ...itemForm, prescription_required: e.target.checked })}
                    />
                    Prescription required (℞) — can't be sold without one
                  </label>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setItemModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn">{editingItem ? 'Save changes' : 'Add item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {batchModalItem && (
        <div className="modal-backdrop" onClick={() => { setBatchModalItem(null); setEditingBatch(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingBatch ? 'Edit batch' : 'Add stock batch'} — {batchModalItem.short_code || batchModalItem.name}</h3>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleBatchSubmit}>
              <div className="field">
                <label>Batch number</label>
                <input required value={batchForm.batch_number} onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })} />
              </div>
              {expandedDetail?.variants?.length > 0 && (
                <div className="field">
                  <label>Variant (size/color)</label>
                  <select required value={batchForm.variant} onChange={(e) => setBatchForm({ ...batchForm, variant: e.target.value })}>
                    <option value="" disabled>Select which one…</option>
                    {expandedDetail.variants.map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field-row">
                <div className="field">
                  <label>Quantity received</label>
                  <input required type="number" min="1" value={batchForm.quantity_received} onChange={(e) => setBatchForm({ ...batchForm, quantity_received: e.target.value })} />
                  {editingBatch && (
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>
                      {editingBatch.quantity_received - editingBatch.quantity_remaining} already sold from this batch
                    </div>
                  )}
                </div>
                <div className="field">
                  <label>Expiry date</label>
                  <input type="date" disabled={noExpiry} value={batchForm.expiry_date} onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, textTransform: 'none', fontSize: 12.5, color: 'var(--text)' }}>
                    <input
                      type="checkbox" style={{ width: 'auto' }} checked={noExpiry}
                      onChange={(e) => { setNoExpiry(e.target.checked); if (e.target.checked) setBatchForm({ ...batchForm, expiry_date: '' }); }}
                    />
                    No expiring date
                  </label>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Cost price (₦)</label>
                  <input required type="number" min="0" value={batchForm.cost_price} onChange={(e) => setBatchForm({ ...batchForm, cost_price: e.target.value })} />
                </div>
                <div className="field">
                  <label>Selling price (₦)</label>
                  <input required type="number" min="0" value={batchForm.selling_price} onChange={(e) => setBatchForm({ ...batchForm, selling_price: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Supplier name</label>
                <input value={batchForm.supplier_name} onChange={(e) => setBatchForm({ ...batchForm, supplier_name: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => { setBatchModalItem(null); setEditingBatch(null); }}>Cancel</button>
                <button type="submit" className="btn">{editingBatch ? 'Save changes' : 'Add batch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {variantModalItem && (
        <div className="modal-backdrop" onClick={() => { setVariantModalItem(null); setEditingVariant(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingVariant ? 'Edit variant' : 'Add variant'} — {variantModalItem.short_code || variantModalItem.name}</h3>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={handleVariantSubmit}>
              <div className="field-row">
                <div className="field">
                  <label>Size</label>
                  <input value={variantForm.size} onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })} placeholder="e.g. Medium" />
                </div>
                <div className="field">
                  <label>Color</label>
                  <input value={variantForm.color} onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })} placeholder="e.g. Blue" />
                </div>
              </div>
              <div className="field">
                <label>SKU (optional)</label>
                <input value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} placeholder="For its own barcode label, if it has one" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => { setVariantModalItem(null); setEditingVariant(null); }}>Cancel</button>
                <button type="submit" className="btn">{editingVariant ? 'Save changes' : 'Add variant'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

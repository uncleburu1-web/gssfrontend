import { useState } from 'react';
import { restaurant } from '../../api/endpoints';
import { money, apiErrorMessage } from '../../utils/format';
import ConfigList from './ConfigList';
import { useLists } from './useLists';

const nameOf = (rows, id) => (rows || []).find((r) => r.id === id)?.name || '—';

/** Categories, items with their price and kitchen station, and choices (sizes, extras). */
export default function MenuTab() {
  const [lists, reload, error] = useLists(['categories', 'items', 'stations', 'modifierGroups', 'modifierOptions', 'itemModifierGroups']);
  const { categories, items, stations, modifierGroups, modifierOptions, itemModifierGroups } = lists;
  const [choicesFor, setChoicesFor] = useState(null);
  const stationOptions = (stations || []).filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.name }));
  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <ConfigList title="Categories" rows={categories} api={restaurant.categories} onChanged={reload} addLabel="+ Add category"
        hint="Items go to their category's station unless the item names its own."
        fields={[
          { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Mains, Drinks' },
          { key: 'station', label: 'Made at', type: 'select', options: stationOptions, none: 'No kitchen (e.g. bottled water)' },
          { key: 'sort', label: 'Order on the menu', type: 'number', min: 0 },
        ]}
        defaults={{ sort: 0 }}
        columns={[{ label: 'Category', key: 'name' }, { label: 'Made at', render: (r) => (r.station ? nameOf(stations, r.station) : 'No kitchen') }]} />

      <ConfigList title="Items" rows={items} api={restaurant.items} onChanged={reload} addLabel="+ Add item"
        hint="Prices include everything the customer pays for the dish; service charge and taxes are added on the bill as set under Taxes & charges."
        fields={[
          { key: 'category', label: 'Category', type: 'select', required: true, options: (categories || []).filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name })) },
          { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Jollof rice' },
          { key: 'price', label: 'Price (₦)', type: 'money', required: true, min: 0 },
          { key: 'tax_class', label: 'Tax class', required: true, placeholder: 'food or drink', hint: 'Used to decide which taxes apply, e.g. food, drink.' },
          { key: 'station', label: 'Made at (if not the category\'s station)', type: 'select', options: stationOptions, none: 'Same as its category' },
          { key: 'description', label: 'Description (optional)' },
          { key: 'is_available', label: 'On the menu', type: 'checkbox' },
          { key: 'sort', label: 'Order in the category', type: 'number', min: 0 },
        ]}
        defaults={{ tax_class: 'food', is_available: true, sort: 0 }}
        toBody={(b) => ({ ...b, station: b.station || null, description: b.description || '' })}
        columns={[
          { label: 'Item', key: 'name' }, { label: 'Category', render: (r) => nameOf(categories, r.category) },
          { label: 'Price', render: (r) => money(r.price), num: true },
          { label: 'Made at', render: (r) => (r.effective_station ? nameOf(stations, r.effective_station) : 'No kitchen') },
          { label: 'Choices', render: (r) => (r.modifier_groups || []).map((g) => nameOf(modifierGroups, g)).join(', ') || '—' },
        ]}
        extraActions={(r) => <button className="btn ghost small" onClick={() => setChoicesFor(r)}>Choices</button>} />

      <ConfigList title="Choice groups" rows={modifierGroups} api={restaurant.modifierGroups} onChanged={reload} addLabel="+ Add choice group"
        hint="e.g. Size (choose exactly 1), Extras (up to 3). Link groups to items with the Choices button on an item."
        fields={[
          { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Size' },
          { key: 'min_select', label: 'Must choose at least', type: 'number', min: 0, required: true },
          { key: 'max_select', label: 'May choose at most', type: 'number', min: 1, required: true },
        ]}
        defaults={{ min_select: 0, max_select: 1 }}
        columns={[{ label: 'Group', key: 'name' }, { label: 'Rule', render: (r) => (r.min_select ? `Choose ${r.min_select === r.max_select ? r.min_select : `${r.min_select}–${r.max_select}`}` : `Optional, up to ${r.max_select}`) }]} />

      <ConfigList title="Choices" rows={modifierOptions} api={restaurant.modifierOptions} onChanged={reload} addLabel="+ Add choice"
        fields={[
          { key: 'group', label: 'Group', type: 'select', required: true, options: (modifierGroups || []).map((g) => ({ value: g.id, label: g.name })) },
          { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Large' },
          { key: 'price_delta', label: 'Adds to the price (₦)', type: 'money', min: 0, required: true },
          { key: 'is_available', label: 'Available', type: 'checkbox' },
        ]}
        defaults={{ price_delta: '0', is_available: true }}
        columns={[{ label: 'Choice', key: 'name' }, { label: 'Group', render: (r) => nameOf(modifierGroups, r.group) }, { label: 'Adds', render: (r) => (Number(r.price_delta) ? money(r.price_delta) : '—'), num: true }]} />

      {choicesFor && (
        <ItemChoices item={choicesFor} groups={modifierGroups || []} links={(itemModifierGroups || []).filter((l) => l.menu_item === choicesFor.id)}
          onClose={() => setChoicesFor(null)} onChanged={reload} />
      )}
    </div>
  );
}

function ItemChoices({ item, groups, links, onClose, onChanged }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function toggle(group) {
    setBusy(true); setError('');
    const link = links.find((l) => l.group === group.id);
    try {
      if (link) await restaurant.itemModifierGroups.remove(link.id);
      else await restaurant.itemModifierGroups.create({ menu_item: item.id, group: group.id, sort: links.length });
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the choices.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <h3>Choices for {item.name}</h3>
        {error && <div className="form-error">{error}</div>}
        {groups.length === 0 && <div className="empty">No choice groups yet. Add one under Choice groups.</div>}
        {groups.map((g) => (
          <label key={g.id} style={{ display: 'flex', gap: 8, alignItems: 'center', textTransform: 'none', fontSize: 14, color: 'var(--text)', letterSpacing: 0, padding: '6px 0' }}>
            <input type="checkbox" style={{ width: 'auto' }} disabled={busy} checked={links.some((l) => l.group === g.id)} onChange={() => toggle(g)} /> {g.name}
          </label>
        ))}
        <div className="modal-actions"><button className="btn" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { restaurant, branches } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import ConfigList from './ConfigList';
import MenuTab from './MenuTab';
import TaxesTab from './TaxesTab';
import HubTab from './HubTab';
import ReportsTab from './ReportsTab';
import { useLists } from './useLists';

const TABS = [['menu', 'Menu'], ['tables', 'Tables'], ['kitchen', 'Kitchen'], ['taxes', 'Taxes & charges'], ['hub', 'Hub till'], ['reports', 'Reports']];

/**
 * Setting up a restaurant branch (REST-12). Everything here is saved in the cloud and reaches the
 * branch's hub till on its next pull (within seconds when it is online). Orders themselves are taken
 * on the hub; finished ones come back here for the reports.
 */
export default function Restaurant() {
  const { restaurantEnabled, shopName, allBranchesView, viewingBranchId } = useAuth();
  // The branch being set up: a CEO may be viewing another branch than their own (shopName).
  const [branchName, setBranchName] = useState(viewingBranchId ? '' : shopName);
  useEffect(() => {
    if (!viewingBranchId) { setBranchName(shopName); return; }
    branches.get(viewingBranchId).then(({ data }) => setBranchName(data.name)).catch(() => setBranchName('this branch'));
  }, [viewingBranchId, shopName]);
  // ?tab=hub (from the dashboard's set-up list) opens that tab; otherwise the last one used.
  const [params] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const asked = params.get('tab');
    if (TABS.some(([id]) => id === asked)) return asked;
    try { return localStorage.getItem('restaurant_tab') || 'menu'; } catch { return 'menu'; }
  });
  const choose = (t) => { setTab(t); try { localStorage.setItem('restaurant_tab', t); } catch { /* fine */ } };

  if (allBranchesView) {
    return (
      <div className="section" style={{ maxWidth: 640 }}>
        <div className="section-body" style={{ padding: 22 }}>
          <h3 style={{ marginTop: 0 }}>Choose a branch</h3>
          <p style={{ color: 'var(--text-dim)' }}>Each restaurant branch has its own menu, tables and kitchen. Pick the branch in the switcher at the top of the menu.</p>
        </div>
      </div>
    );
  }
  if (!restaurantEnabled) {
    return (
      <div className="section" style={{ maxWidth: 640 }}>
        <div className="section-body" style={{ padding: 22 }}>
          <h3 style={{ marginTop: 0 }}>This branch does not use the restaurant</h3>
          <p style={{ color: 'var(--text-dim)' }}>Switch the restaurant on for {branchName || 'this branch'} in <Link to="/app/settings">Settings → What this branch does</Link>. The supermarket side keeps working as it is.</p>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Restaurant</div>
          <div className="page-sub">Set up {branchName ? `${branchName}'s` : 'the'} menu, tables, kitchen and taxes. The hub till picks up every change by itself.</div>
        </div>
      </div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map(([id, label]) => <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => choose(id)}>{label}</button>)}
      </div>
      {tab === 'menu' && <MenuTab />}
      {tab === 'tables' && <TablesTab />}
      {tab === 'kitchen' && <KitchenTab />}
      {tab === 'taxes' && <TaxesTab />}
      {tab === 'hub' && <HubTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}

const nameOf = (rows, id) => (rows || []).find((r) => r.id === id)?.name || (rows || []).find((r) => r.id === id)?.label || '—';

function TablesTab() {
  const [{ areas, tables }, reload, error] = useLists(['areas', 'tables']);
  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <ConfigList title="Areas" hint="Parts of the floor, e.g. Hall, Terrace, VIP." rows={areas} api={restaurant.areas} onChanged={reload} addLabel="+ Add area"
        fields={[{ key: 'name', label: 'Name', required: true, placeholder: 'e.g. Hall' }, { key: 'sort', label: 'Order on the floor', type: 'number', min: 0 }]}
        defaults={{ sort: 0 }} columns={[{ label: 'Area', key: 'name' }]} empty="Add an area first, then its tables." />
      <ConfigList title="Tables" hint="One open order per table at a time; the hub shows them on its floor." rows={tables} api={restaurant.tables} onChanged={reload} addLabel="+ Add table"
        fields={[
          { key: 'area', label: 'Area', type: 'select', required: true, options: (areas || []).filter((a) => a.is_active).map((a) => ({ value: a.id, label: a.name })) },
          { key: 'label', label: 'Table', required: true, placeholder: 'e.g. T1' },
          { key: 'seats', label: 'Seats', type: 'number', min: 1, required: true },
          { key: 'sort', label: 'Order in the area', type: 'number', min: 0 },
        ]}
        defaults={{ seats: 4, sort: 0 }}
        columns={[{ label: 'Table', key: 'label' }, { label: 'Area', render: (r) => nameOf(areas, r.area) }, { label: 'Seats', key: 'seats', num: true }]} />
    </div>
  );
}

function KitchenTab() {
  const [{ stations }, reload, error] = useLists(['stations']);
  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <ConfigList title="Stations" rows={stations} api={restaurant.stations} onChanged={reload} addLabel="+ Add station"
        hint="Where food and drink are made. A station can print tickets, show them on a kitchen screen, or both. Which printer it uses is chosen on the hub till."
        fields={[
          { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Kitchen, Bar, Grill' },
          { key: 'prints', label: 'Prints tickets on a kitchen printer', type: 'checkbox' },
          { key: 'shows_on_screen', label: 'Shows tickets on a kitchen screen', type: 'checkbox', hint: 'Then cooks mark food ready on the screen. Without a screen, waiters serve straight from the pass.' },
          { key: 'sort', label: 'Order', type: 'number', min: 0 },
        ]}
        defaults={{ prints: true, shows_on_screen: false, sort: 0 }}
        columns={[{ label: 'Station', key: 'name' }, { label: 'Tickets', render: (r) => [r.prints && 'Printer', r.shows_on_screen && 'Screen'].filter(Boolean).join(' + ') || 'Neither' }]}
        empty="Add at least one station so orders reach the kitchen." />
    </div>
  );
}

import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { useTheme } from '../context/ThemeContext';
import { subscription, branches as branchesApi } from '../api/endpoints';
import { Icons } from './Icons';
import SubscriptionEndedCard from './SubscriptionEndedCard';

const BASE_NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', mobileLabel: 'Home', icon: Icons.dashboard, end: true },
  { to: '/app/inventory', label: 'Inventory', mobileLabel: 'Stock', icon: Icons.inventory },
];

const SERVICE_NAV_ITEM = { to: '/app/service', label: 'Service', mobileLabel: 'Service', icon: Icons.service };

const LIVE_STATUS_LABEL = {
  open: 'Live',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  offline: 'Offline',
  closed: 'Reconnecting…',
};

const LIVE_STATUS_TITLE = {
  open: 'Live — sales and stock changes appear instantly',
  connecting: 'Connecting to live updates…',
  reconnecting: 'Connection dropped — retrying now',
  // The web and Android apps have no offline queue (only the desktop till does): a sale attempted
  // here while offline simply fails. The old text promised otherwise, which is how a sale gets lost.
  offline: "Offline — this screen needs internet to save anything. The desktop till keeps selling offline and syncs later.",
  closed: 'Reconnecting…',
};

const SALES_NAV_ITEM = { to: '/app/sales', label: 'Sales', mobileLabel: 'Sales', icon: Icons.sales };
const ATTENDANCE_NAV_ITEM = { to: '/app/attendance', label: 'Attendance', mobileLabel: 'Attend', icon: Icons.workers };
const SHIFTS_NAV_ITEM = { to: '/app/shifts', label: 'Shifts', mobileLabel: 'Shifts', icon: Icons.reports };

// Workers/Settings: full access within your own branch only — an owner OR
// a branch manager (see core.permissions.is_owner on the backend, and
// MeView's is_owner_flag which mirrors it). Reports/Liabilities/Expenses
// are different: a CEO can also delegate any one of them to a specific
// trusted role via the Control Center (core.capabilities), so those use
// a capability check instead of the flat isOwner below, in getNavItems.
const OWNER_ONLY_NAV_ITEMS = [
  { to: '/app/workers', label: 'Workers', mobileLabel: 'Workers', icon: Icons.workers },
];
const SETTINGS_NAV_ITEM = { to: '/app/settings', label: 'Settings', mobileLabel: 'Settings', icon: Icons.settings };

// Billing is organization-wide (one subscription per Organization, shared
// by every branch — see subscriptions.models.Subscription) — a branch
// manager's "owner within my branch" authority deliberately doesn't
// extend to it, so this is CEO-only, not owner-only.
const CEO_NAV_ITEMS = [
  { to: '/app/transfers', label: 'Move stock', mobileLabel: 'Move', icon: Icons.inventory },
  { to: '/app/billing', label: 'Billing', mobileLabel: 'Billing', icon: Icons.billing },
];

const STAFF_ROLE_LABEL = {
  owner: 'Owner', branch_manager: 'Branch manager', seller: 'Seller',
  reception: 'Receptionist', technician: 'Service technician',
  attendant: 'Shop attendant', other: 'Other',
};

export default function Layout() {
  const { user, logout, isOwner, isCeo, canPay, capabilities, shopName, serviceEnabled, restaurantEnabled, allBranchesView, anyRestaurant } = useAuth();
  const { status: liveStatus, versions } = useLive();
  const { theme, toggleTheme } = useTheme();
  // Service (device repair/servicing) only makes sense for businesses that
  // actually fix devices — a clothing or general retail shop never sees
  // the tab at all, rather than seeing an empty/irrelevant section. Driven
  // entirely by what the owner picked at signup (Organization.business_type
  // on the backend).
  const coreItems = serviceEnabled
    ? [...BASE_NAV_ITEMS, SERVICE_NAV_ITEM, SALES_NAV_ITEM, SHIFTS_NAV_ITEM, ATTENDANCE_NAV_ITEM]
    : [...BASE_NAV_ITEMS, SALES_NAV_ITEM, SHIFTS_NAV_ITEM, ATTENDANCE_NAV_ITEM];
  const items = [
    ...coreItems,
    // Restaurant branches: menu, tables, kitchen, taxes, hub and restaurant reports (owners).
    ...((restaurantEnabled || (allBranchesView && anyRestaurant)) && isOwner ? [{ to: '/app/restaurant', label: 'Restaurant', mobileLabel: 'Restaurant', icon: Icons.store }] : []),
    // isOwner already implies every one of these capabilities too (see
    // core.capabilities.has_capability's owner/branch-manager bypass) —
    // the capability check alone would be enough, but keeping `isOwner ||`
    // explicit here avoids a network round trip's worth of doubt about
    // ordering before `capabilities` has loaded for the common case.
    ...(isOwner || capabilities.view_financial_reports ? [{ to: '/app/reports', label: 'Reports', mobileLabel: 'Reports', icon: Icons.reports }] : []),
    ...(isOwner || capabilities.manage_liabilities ? [{ to: '/app/liabilities', label: 'Liabilities', mobileLabel: 'Owe', icon: Icons.liabilities }] : []),
    ...(isOwner || capabilities.manage_expenses ? [{ to: '/app/expenses', label: 'Expenses', mobileLabel: 'Expenses', icon: Icons.billing }] : []),
    ...(isOwner ? OWNER_ONLY_NAV_ITEMS : []),
    ...(isOwner ? [{ to: '/app/audit', label: 'Audit log', mobileLabel: 'Audit', icon: Icons.reports }] : []),
    ...(isOwner ? [{ to: '/app/promotions', label: 'Promotions', mobileLabel: 'Promos', icon: Icons.billing }] : []),
    ...(isCeo ? CEO_NAV_ITEMS : canPay ? CEO_NAV_ITEMS.filter((i) => /billing/.test(i.to)) : []),
    ...(isOwner ? [SETTINGS_NAV_ITEM] : []),
  ];

  const [sub, setSub] = useState(null);
  const [subCheck, setSubCheck] = useState(0);
  useEffect(() => {
    subscription.status().then(({ data }) => setSub(data)).catch(() => {});
  }, [versions.subscription, subCheck]);
  // Any request refused with 402 (the subscription ended mid-session) re-checks the status at once.
  useEffect(() => {
    const recheck = () => setSubCheck((n) => n + 1);
    window.addEventListener('benchline:subscription-ended', recheck);
    return () => window.removeEventListener('benchline:subscription-ended', recheck);
  }, []);
  const location = useLocation();
  const subscriptionEnded = Boolean(sub && !sub.cloud_services_enabled);
  const onBilling = location.pathname.startsWith('/app/billing');

  // Only relevant for a CEO running more than one branch — everyone else
  // has exactly one branch and the backend scopes every request to it
  // automatically, so there's nothing to switch. See api/client.js's
  // X-Branch-ID header and backend core.utils.get_shops_for_user.
  const [branchList, setBranchList] = useState(null);
  const [currentBranch, setCurrentBranch] = useState(localStorage.getItem('current_branch_id') || '');
  useEffect(() => {
    if (!isCeo) return;
    branchesApi.list().then(({ data }) => setBranchList(data.results || data)).catch(() => {});
  }, [isCeo]);

  function switchBranch(id) {
    if (id) localStorage.setItem('current_branch_id', id);
    else localStorage.removeItem('current_branch_id');
    setCurrentBranch(id);
    window.location.reload(); // simplest way to make every already-fetched page re-scope to the new branch
  }

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="brand"><span className="dot" />{shopName}</div>
        {isCeo && branchList && branchList.length > 1 && (
          <select
            className="branch-switcher"
            value={currentBranch}
            onChange={(e) => switchBranch(e.target.value)}
            title="Switch which branch you're viewing"
          >
            <option value="">All branches</option>
            {branchList.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}
          >
            {item.icon}<span>{item.label}</span>
          </NavLink>
        ))}
        <div className="nav-footer mono">
          {user?.full_name || user?.username}
          <div style={{ opacity: 0.6, fontSize: 10.5, marginTop: 2, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            {STAFF_ROLE_LABEL[user?.role] || (isOwner ? 'Owner' : 'Seller')}
          </div>
          <div className={`live-indicator ${liveStatus === 'open' ? 'live' : ''}`} title={LIVE_STATUS_TITLE[liveStatus] || LIVE_STATUS_TITLE.closed}>
            <span className="dot" />
            {LIVE_STATUS_LABEL[liveStatus] || LIVE_STATUS_LABEL.closed}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {/* Subscribe sits beside Log out for whoever can pay (the CEO/owner of the business),
                whenever they are on the free trial or the subscription has ended. */}
            {canPay && sub && (sub.effective_status === 'trial' || !sub.cloud_services_enabled) && (
              <Link to="/app/billing" className="btn small" style={{ flex: 1, justifyContent: 'center', whiteSpace: 'nowrap', textDecoration: 'none' }}>
                Subscribe
              </Link>
            )}
            <button
              className="btn ghost small"
              style={{ flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' }}
              onClick={logout}
            >
              {Icons.logout} Log out
            </button>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? Icons.sun : Icons.moon}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </div>

      <main className="content">
        {sub && sub.effective_status === 'trial' && sub.current_period_end && (() => {
          const daysLeft = Math.ceil((new Date(sub.current_period_end) - new Date()) / (1000 * 60 * 60 * 24));
          // Only nags in the final week of the trial — showing this from
          // day one would just be noise; a week out is when it's actually
          // actionable. Every login re-triggers this fetch, so the count
          // is always current, e.g. "ends in 5 days" the way it was asked
          // for, not a one-time dismissible toast that could go stale.
          if (daysLeft > 7) return null;
          return (
            <div className="banner warn" style={{ marginBottom: 18 }}>
              {daysLeft <= 0 ? 'Your free trial ends today.' : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`}
              {canPay && <Link to="/app/billing" style={{ marginLeft: 'auto', fontWeight: 700 }}>Choose a plan →</Link>}
            </div>
          );
        })()}
        {subscriptionEnded && canPay && onBilling && (
          <div className="banner warn" style={{ marginBottom: 18 }}>
            {sub.status === 'trial' ? 'Your free trial has ended.' : 'Your subscription has ended.'} Choose a plan below to turn Benchline online back on.
          </div>
        )}
        {subscriptionEnded && !(canPay && onBilling)
          ? <SubscriptionEndedCard sub={sub} isCeo={canPay} onLogout={logout} />
          : <Outlet />}
      </main>

      <button className="theme-toggle-fab" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? Icons.sun : Icons.moon}
      </button>

      <div className="bottomnav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {item.icon}<span>{item.mobileLabel}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

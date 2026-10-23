import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    auth
      .me()
      .then(({ data }) => setUser(data))
      .catch((error) => {
        // Only a REJECTED session (a 401 that survived the client's own refresh attempt) means
        // "signed out". A network blip or a 5xx while the page loads must not throw away a
        // perfectly good session and force everyone to type their password again.
        if (error?.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const { data } = await auth.login(username, password);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    const me = await auth.me();
    setUser(me.data);
  }

  async function register(payload) {
    // Does NOT log the person in — RegisterView creates the account
    // inactive and emails a 6-digit code instead of returning tokens (see
    // core.views.RegisterView). The caller (Signup.jsx) sends them to
    // /verify-email next; completeVerification below is what actually
    // logs them in, once the code is confirmed.
    const { data } = await auth.register(payload);
    return data;
  }

  async function verifyOtp(email, code) {
    const { data } = await auth.verifyOtp(email, code);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    const me = await auth.me();
    setUser(me.data);
  }

  async function resendOtp(email) {
    const { data } = await auth.resendOtp(email);
    return data;
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_branch_id');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, verifyOtp, resendOtp, logout,
      isOwner: !!user?.is_owner,
      isCeo: !!user?.is_ceo,
      // Who may pay for the subscription: the business's registered owner, or any worker with the
      // owner role (the server's checkout accepts both). Branch managers and staff cannot.
      canPay: !!user?.is_ceo || user?.role === 'owner',
      // The worker's actual role string — 'owner' | 'branch_manager' |
      // 'seller' | 'reception' | 'technician' | 'attendant' | 'other'.
      // Prefer a `capabilities.xyz` check over comparing this directly
      // where one exists (see below) — it already accounts for whatever
      // an owner/CEO has configured in the Control Center, not just the
      // role's built-in default.
      role: user?.role || null,
      // { delete_sale, edit_sale, mark_attendance, view_attendance, ... }
      // — always all-true for an owner/branch manager/CEO. See
      // core.capabilities on the backend for the full registry; this is
      // what every capability-gated button/nav item in the app checks
      // instead of re-deriving role logic client-side. Never used as the
      // actual security boundary (the backend enforces that regardless
      // of what the UI shows) — only to decide what to show.
      capabilities: user?.capabilities || {},
      shopId: user?.shop_id || null,
      shopName: user?.shop_name || 'My Shop',
      shopLogoUrl: user?.shop_logo_url || '',
      // The branch being VIEWED: its kind of shop, its modules (retail / restaurant / service) and what
      // follows from them (repairs, pharmacy screens, stock categories). See branchView below.
      ...branchView(user),
      features: user?.features || [],
      refreshUser: async () => { const me = await auth.me(); setUser(me.data); },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Each branch is its own kind of shop (gss ADR-025): a CEO can run a gadget shop and a restaurant.
 * /me's own fields describe the user's OWN branch; a CEO who switched branches (Layout's switcher,
 * which reloads the page) is shown that branch instead, from /me's `branch_modules`, `branch_types`
 * and `shop_types`. On "All branches" the menus show what any branch has. Older servers send none
 * of the three: everything falls back to /me's own fields, exactly as before.
 */
function branchView(user) {
  let viewing = '';
  try { viewing = localStorage.getItem('current_branch_id') || ''; } catch { viewing = ''; }
  const map = user?.branch_modules || {};
  const types = user?.branch_types || {};
  const typeInfo = Object.fromEntries((user?.shop_types || []).map((t) => [t.value, t]));
  const viewedModules = viewing ? map[viewing] : undefined;
  const viewedType = viewing ? types[viewing] : undefined;
  const modules = viewedModules || user?.modules || [];
  const businessType = viewedType || user?.business_type || 'general';
  const allBranchesView = Boolean(user?.is_ceo && !viewing && Object.keys(map).length > 1);
  return {
    viewingBranchId: viewing,
    modules,
    businessType,
    businessTypeLabel: typeInfo[businessType]?.label || user?.business_type_label || '',
    // What the business signed up as: the default kind for a new branch.
    organizationBusinessType: user?.organization_business_type || user?.business_type || 'general',
    serviceEnabled: viewedModules ? viewedModules.includes('service')
      : (!!user?.service_enabled || (allBranchesView && Object.values(map).some((m) => m.includes('service')))),
    pharmacyEnabled: viewedType ? viewedType === 'pharmacy'
      : (!!user?.pharmacy_enabled || (allBranchesView && Object.values(types).includes('pharmacy'))),
    // [{ value, label }, ...] for the stock category picker, for this kind of shop
    // (InventoryItem.category_choices_for on the server).
    availableCategories: (viewedType && typeInfo[viewedType]?.categories) || user?.available_categories || [],
    restaurantEnabled: modules.includes('restaurant'),
    // A CEO on "All branches" works in no single branch: restaurant set-up needs one picked first.
    allBranchesView,
    anyRestaurant: Object.values(map).some((m) => m.includes('restaurant')) || (user?.modules || []).includes('restaurant'),
  };
}

export function useAuth() {
  return useContext(AuthContext);
}
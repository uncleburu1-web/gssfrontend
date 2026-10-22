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
      serviceEnabled: !!user?.service_enabled,
      // Branch modules (retail / restaurant / service) of the branch being VIEWED, and the features of
      // the business's package (gss core/modules.py). /me's `modules` are the user's own branch; a CEO
      // switching branches (Layout's switcher, which reloads the page) needs that branch's entry in
      // `branch_modules`. Older servers send neither: no restaurant.
      ...branchView(user),
      features: user?.features || [],
      pharmacyEnabled: !!user?.pharmacy_enabled,
      businessType: user?.business_type || 'general',
      // [{ value, label }, ...] already scoped to this org's business_type
      // by the backend (InventoryItem.category_choices_for) — Inventory
      // reads this instead of hard-coding which categories belong to
      // which shop type.
      availableCategories: user?.available_categories || [],
      refreshUser: async () => { const me = await auth.me(); setUser(me.data); },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function branchView(user) {
  let viewing = '';
  try { viewing = localStorage.getItem('current_branch_id') || ''; } catch { viewing = ''; }
  const map = user?.branch_modules || {};
  const modules = (viewing && map[viewing]) || user?.modules || [];
  return {
    viewingBranchId: viewing,
    modules,
    restaurantEnabled: modules.includes('restaurant'),
    // A CEO on "All branches" works in no single branch: restaurant set-up needs one picked first.
    allBranchesView: Boolean(user?.is_ceo && !viewing && Object.keys(map).length > 1),
    anyRestaurant: Object.values(map).some((m) => m.includes('restaurant')) || (user?.modules || []).includes('restaurant'),
  };
}

export function useAuth() {
  return useContext(AuthContext);
}
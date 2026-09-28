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
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
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

export function useAuth() {
  return useContext(AuthContext);
}
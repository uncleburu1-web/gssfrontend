import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Unlike RequireOwner/RequireCeo (a fixed role check), this gates on a
 * named capability from core.capabilities on the backend — always true
 * for an owner/branch manager/CEO, otherwise whatever the Control Center
 * (Settings) has granted that role. Use this for anything a CEO might
 * reasonably delegate to a specific trusted staff member without making
 * them a full owner — Expenses, Liabilities, financial reports.
 */
export default function RequireCapability({ capability, children }) {
  const { loading, capabilities } = useAuth();

  if (loading) return <div className="empty" style={{ padding: 40 }}>Loading…</div>;
  if (!capabilities[capability]) return <Navigate to="/app" replace />;
  return children;
}

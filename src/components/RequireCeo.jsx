import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireCeo({ children }) {
  const { loading, isCeo } = useAuth();

  if (loading) return <div className="empty" style={{ padding: 40 }}>Loading…</div>;
  if (!isCeo) return <Navigate to="/app/settings" replace />;
  return children;
}

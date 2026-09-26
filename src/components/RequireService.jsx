import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireService({ children }) {
  const { loading, serviceEnabled } = useAuth();

  if (loading) return <div className="empty" style={{ padding: 40 }}>Loading…</div>;
  if (!serviceEnabled) return <Navigate to="/app" replace />;
  return children;
}

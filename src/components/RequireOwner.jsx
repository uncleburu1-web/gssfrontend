import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireOwner({ children }) {
  const { loading, isOwner } = useAuth();

  if (loading) return <div className="empty" style={{ padding: 40 }}>Loading…</div>;
  if (!isOwner) return <Navigate to="/app" replace />;
  return children;
}

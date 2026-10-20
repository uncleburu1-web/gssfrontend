import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Billing: the registered business owner, or any worker with the owner role (see AuthContext.canPay). */
export default function RequireCanPay({ children }) {
  const { loading, canPay } = useAuth();
  if (loading) return null;
  if (!canPay) return <Navigate to="/app" replace />;
  return children;
}

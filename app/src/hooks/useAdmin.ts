import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../services/admin';

export function useAdmin() {
  const { currentUser } = useAuth();

  const isAdmin = currentUser ? isAdminEmail(currentUser.email) : false;

  return { isAdmin };
}

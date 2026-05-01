import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../services/auth';

export function ProtectedRoute() {
  if (!authService.isAuthenticated()) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them back to that page after they login,
    // which is a nicer user experience than dropping them off on the home page.
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

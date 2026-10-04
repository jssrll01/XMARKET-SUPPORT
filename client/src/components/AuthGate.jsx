import { useAuth } from '../context/AuthContext';
import LoginPage from './LoginPage';

export default function AuthGate({ children }) {
  const { authed, ready } = useAuth();

  // Prevent flash of login page while checking localStorage
  if (!ready) return null;

  if (!authed) return <LoginPage />;

  return children;
}

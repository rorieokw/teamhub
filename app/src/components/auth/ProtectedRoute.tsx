import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../services/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, loading, isApproved, isPendingApproval, isRejected, userProfile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Show pending approval screen
  if (isPendingApproval) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Pending Approval</h1>
          <p className="text-gray-400 mb-6">
            Your account is waiting for admin approval. You'll be able to access TeamHub once an administrator approves your request.
          </p>
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Signed in as</p>
            <p className="text-white font-medium">{userProfile?.displayName || currentUser.email}</p>
            <p className="text-gray-400 text-sm">{currentUser.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Show rejected screen
  if (isRejected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            Your access request has been denied. If you believe this is a mistake, please contact an administrator.
          </p>
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Signed in as</p>
            <p className="text-white font-medium">{userProfile?.displayName || currentUser.email}</p>
            <p className="text-gray-400 text-sm">{currentUser.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // User is not approved (no status set yet, but whitelist is enabled)
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-12a4 4 0 00-8 0v4h8V5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Access Restricted</h1>
          <p className="text-gray-400 mb-6">
            This application requires admin approval. Please wait for an administrator to review your account.
          </p>
          <button
            onClick={() => signOut()}
            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

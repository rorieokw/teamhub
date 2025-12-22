import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import type { User, AppSettings } from '../types';
import { subscribeToUserProfile } from '../services/auth';
import { setupPresenceTracking } from '../services/presence';
import { subscribeToAppSettings } from '../services/settings';
import { isAdminEmail } from '../services/admin';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  appSettings: AppSettings | null;
  isApproved: boolean; // Whether user can access the app
  isPendingApproval: boolean; // Whether user is waiting for approval
  isRejected: boolean; // Whether user was rejected
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  appSettings: null,
  isApproved: false,
  isPendingApproval: false,
  isRejected: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const presenceCleanupRef = useRef<(() => void) | null>(null);
  const profileUnsubscribeRef = useRef<(() => void) | null>(null);
  const settingsUnsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to app settings
  useEffect(() => {
    settingsUnsubscribeRef.current = subscribeToAppSettings(setAppSettings);
    return () => {
      if (settingsUnsubscribeRef.current) {
        settingsUnsubscribeRef.current();
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      // Cleanup previous presence tracking
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
        presenceCleanupRef.current = null;
      }

      // Cleanup previous profile subscription
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }

      if (user) {
        // Subscribe to real-time profile updates
        profileUnsubscribeRef.current = subscribeToUserProfile(user.uid, (profile) => {
          setUserProfile(profile);
          setLoading(false);
        });

        // Setup presence tracking for the logged-in user
        presenceCleanupRef.current = setupPresenceTracking(user.uid);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
      }
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
      }
    };
  }, []);

  // Compute approval status
  const isAdmin = isAdminEmail(currentUser?.email);
  const whitelistEnabled = appSettings?.whitelistEnabled ?? false;
  const approvalStatus = userProfile?.approvalStatus;

  // User is approved if:
  // 1. They're an admin, OR
  // 2. Whitelist is disabled, OR
  // 3. Whitelist is enabled AND they have approvalStatus === 'approved'
  // Note: Users without approvalStatus are treated as needing approval when whitelist is enabled
  const isApproved = isAdmin || !whitelistEnabled || approvalStatus === 'approved';

  // User is pending if whitelist enabled, not admin, and either:
  // - explicitly pending, OR
  // - no approval status set (legacy users need to be approved)
  const isPendingApproval = whitelistEnabled && !isAdmin && (approvalStatus === 'pending' || !approvalStatus);
  const isRejected = whitelistEnabled && !isAdmin && approvalStatus === 'rejected';

  const value = {
    currentUser,
    userProfile,
    loading,
    appSettings,
    isApproved,
    isPendingApproval,
    isRejected,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

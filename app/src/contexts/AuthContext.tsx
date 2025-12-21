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
import type { User } from '../types';
import { subscribeToUserProfile } from '../services/auth';
import { setupPresenceTracking } from '../services/presence';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
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
  const presenceCleanupRef = useRef<(() => void) | null>(null);
  const profileUnsubscribeRef = useRef<(() => void) | null>(null);

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

  const value = {
    currentUser,
    userProfile,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

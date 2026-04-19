import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'buyer';
  displayName: string;
  photoURL: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        
        if (firebaseUser) {
          // Fetch from Postgres via API
          const response = await fetch(`/api/users/${firebaseUser.uid}`);
          let pgUser = null;
          
          if (response.ok) {
            pgUser = await response.json();
          }
          
          const ownerEmail = 'aprimuhamadtoha@gmail.com';
          const currentUserEmail = firebaseUser.email?.toLowerCase().trim();
          const isOwnerEmail = currentUserEmail === ownerEmail;

          if (pgUser) {
            const normalizedProfile: UserProfile = {
              uid: pgUser.id,
              email: pgUser.email,
              role: pgUser.role,
              displayName: pgUser.display_name || 'User',
              photoURL: pgUser.photo_url || ''
            };
            setProfile(normalizedProfile);
            
            // Sync role if owner
            if (isOwnerEmail && pgUser.role !== 'admin') {
              await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  role: 'admin'
                })
              });
              setProfile({ ...normalizedProfile, role: 'admin' });
            }
          } else {
            // Create user in Postgres
            const newProfileData = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              role: isOwnerEmail ? 'admin' : 'buyer'
            };
            await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newProfileData)
            });
            
            setProfile({
              uid: newProfileData.id,
              email: newProfileData.email,
              displayName: newProfileData.displayName,
              role: newProfileData.role as 'admin' | 'buyer',
              photoURL: firebaseUser.photoURL || ''
            });
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth synchronization error:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' || user?.email?.toLowerCase().trim() === 'aprimuhamadtoha@gmail.com',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

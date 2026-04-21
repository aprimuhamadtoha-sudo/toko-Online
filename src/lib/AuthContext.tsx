import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserProfile {
  id: string;
  uid: string;
  email: string;
  role: 'admin' | 'buyer';
  name: string;
  displayName: string;
  image: string;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] onAuthStateChanged:", !!user);
      if (user) {
        let role = 'buyer';
        try {
          // fetch role from firestore
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            role = userDoc.data().role || 'buyer';
          } else {
            if (user.email === 'aprimuhamadtoha@gmail.com') role = 'admin';
            await setDoc(userRef, {
              id: user.uid,
              email: user.email,
              name: user.displayName,
              image: user.photoURL,
              role
            }, { merge: true });
          }
        } catch (err) {
          console.error("[AuthContext] Failed to get user role:", err);
          if (user.email === 'aprimuhamadtoha@gmail.com') role = 'admin';
        }
        
        setSession({
          user: {
            id: user.uid,
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            image: user.photoURL,
            role
          }
        });
      } else {
        setSession(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log("Starting Firebase signInWithPopup...");
      await signInWithPopup(auth, provider);
      console.log("Firebase popup success.");
    } catch (error: any) {
      console.error('SignIn Process Error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const profile: UserProfile | null = session?.user ? {
    id: session.user.id,
    uid: session.user.id,
    email: session.user.email,
    name: session.user.name || 'User',
    displayName: session.user.name || 'User',
    image: session.user.image || '',
    role: session.user.role || 'buyer'
  } : null;

  const value = {
    user: session?.user || null,
    profile,
    loading,
    isAdmin: profile?.role === 'admin' || profile?.email?.toLowerCase().trim() === 'aprimuhamadtoha@gmail.com',
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

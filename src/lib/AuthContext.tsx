import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

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

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setSession(data && data.user ? data : null);
        } catch (e) {
          console.error("Non-JSON session response:", text);
          setSession(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch session', err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const getCsrfToken = async () => {
    try {
      const res = await fetch('/api/auth/csrf', { credentials: 'include' });
      const text = await res.text();
      try {
        const { csrfToken } = JSON.parse(text);
        return csrfToken;
      } catch (err) {
        console.error("Non-JSON CSRF response:", text);
        if (text.includes("<!DOCTYPE") || text.includes("<html")) {
          throw new Error("Sistem keamanan diblokir oleh browser (Iframe Policy). Silakan buka aplikasi di Tab Baru (ikon kotak panah di pojok kanan atas preview).");
        }
        throw new Error("Gagal sistem keamanan (CSRF Parser). Silakan refresh halaman.");
      }
    } catch (err: any) {
      console.error("CSRF Fetch Failure:", err);
      if (err.message === "Failed to fetch") {
        throw new Error("Koneksi ke server terputus. Pastikan server sudah berjalan atau buka aplikasi di Tab Baru.");
      }
      throw err;
    }
  };

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log("Starting Firebase signInWithPopup...");
      const result = await signInWithPopup(auth, provider);
      console.log("Firebase popup success. Getting ID token...");
      const idToken = await result.user.getIdToken();
      
      console.log("Fetching CSRF token...");
      const csrfToken = await getCsrfToken();
      console.log("CSRF Token obtained:", !!csrfToken);

      if (!csrfToken) {
        throw new Error("Cookie diblokir oleh browser (CSRF Error). Silakan klik tombol 'Buka di Tab Baru' di pojok kanan atas preview aplikasi untuk login.");
      }

      // Sign in via Auth.js credentials provider
      console.log("Submitting to Auth.js (/api/auth/callback/firebase)...");
      const res = await fetch('/api/auth/callback/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          idToken,
          csrfToken,
          json: 'true',
        }),
        credentials: 'include'
      });

      console.log("Auth.js status:", res.status);
      if (res.ok) {
        console.log("Auth.js success logic");
        await fetchSession();
      } else {
        const errorText = await res.text();
        console.error("Auth.js signin error:", errorText);
        if (res.status === 403) {
          throw new Error("Cookie diblokir oleh browser. Silakan klik tombol 'Buka di Tab Baru' di pojok kanan atas preview.");
        }
        throw new Error(`Gagal verifikasi di server: ${res.status}`);
      }
    } catch (error: any) {
      console.error('SignIn Process Error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const csrfToken = await getCsrfToken();
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken }),
      });
      await auth.signOut();
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

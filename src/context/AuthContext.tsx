import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  signInAnonymously,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (data: {
    fullName: string;
    preferredCurrency: string;
    country: string;
    timezone: string;
    dateFormat: string;
    monthlyBudget?: number;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(currentUser.isAnonymous);
        try {
          const profileDocRef = doc(db, 'users', currentUser.uid, 'profile', 'settings');
          const docSnap = await getDoc(profileDocRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // New user initial baseline
            const initialProfile: UserProfile = {
              uid: currentUser.uid,
              fullName: currentUser.displayName || (currentUser.isAnonymous ? 'Guest Member' : 'Hub Member'),
              email: currentUser.email || 'guest@mylifehub.local',
              preferredCurrency: 'INR',
              country: 'India',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
              dateFormat: 'YYYY-MM-DD',
              monthlyBudget: 50000,
              theme: 'dark',
              isOnboarded: false,
              createdAt: new Date().toISOString(),
            };
            await setDoc(profileDocRef, initialProfile, { merge: true });
            setProfile(initialProfile);
          }
        } catch (err) {
          console.error('Failed to load profile from Firestore:', err);
          // Fallback profile in memory
          setProfile({
            uid: currentUser.uid,
            fullName: currentUser.displayName || 'Member',
            email: currentUser.email || '',
            preferredCurrency: 'INR',
            country: 'India',
            timezone: 'Asia/Kolkata',
            dateFormat: 'YYYY-MM-DD',
            monthlyBudget: 50000,
            theme: 'dark',
            isOnboarded: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setProfile(null);
        setIsGuest(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const initialProfile: UserProfile = {
      uid: cred.user.uid,
      fullName: name,
      email: cred.user.email || email,
      preferredCurrency: 'INR',
      country: 'India',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      dateFormat: 'YYYY-MM-DD',
      monthlyBudget: 50000,
      theme: 'dark',
      isOnboarded: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', cred.user.uid, 'profile', 'settings'), initialProfile);
    setProfile(initialProfile);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginAsGuest = async () => {
    await signInAnonymously(auth);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = {
      ...(profile || {}),
      ...data,
      updatedAt: new Date().toISOString(),
    } as UserProfile;

    try {
      await setDoc(doc(db, 'users', user.uid, 'profile', 'settings'), updated, { merge: true });
    } catch (err) {
      console.warn('Could not save profile to firestore:', err);
    }
    setProfile(updated);
  };

  const completeOnboarding = async (data: {
    fullName: string;
    preferredCurrency: string;
    country: string;
    timezone: string;
    dateFormat: string;
    monthlyBudget?: number;
  }) => {
    await updateProfileData({
      ...data,
      isOnboarded: true,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isGuest,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginAsGuest,
        logout,
        resetPassword,
        updateProfileData,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData({ id: userDoc.id, ...userDoc.data() });
          } else {
            setUserData(null);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (userDoc.exists()) {
      const data = { id: userDoc.id, ...userDoc.data() };
      setUserData(data);
      return data;
    }
    throw new Error('User profile not found in database');
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserData(null);
  };

  const value = {
    currentUser,
    userData,
    loading,
    login,
    logout,
    isOwner: userData?.role === 'owner',
    isEmployee: userData?.role === 'employee',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

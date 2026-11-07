// Мой ритм: модуль синхронизации. Не активируется до настройки Firebase и правил Firestore.
// Не добавляйте сюда приватные ключи или service account.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

export function createDiaryCloud(firebaseConfig, onState = () => {}) {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  let user = null;
  onAuthStateChanged(auth, next => { user = next; onState(next ? 'authenticated' : 'signed-out'); });
  const ref = () => {
    if (!user) throw Error('Войдите в Google');
    return doc(db, 'users', user.uid, 'private', 'diary');
  };
  return {
    signIn: async () => {
      try { await signInWithPopup(auth, provider); }
      catch (e) { if (e.code === 'auth/popup-blocked') await signInWithRedirect(auth, provider); else throw e; }
    },
    finishRedirect: () => getRedirectResult(auth),
    signOut: () => signOut(auth),
    load: async () => { const snapshot = await getDoc(ref()); return snapshot.exists() ? snapshot.data().payload : null; },
    save: async payload => {
      if (!payload || typeof payload !== 'object') throw Error('Некорректные данные');
      await setDoc(ref(), { payload, updatedAt: serverTimestamp() });
      onState('saved');
    }
  };
}

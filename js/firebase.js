import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let firebaseConfig = null;
let app = null;
let auth = null;
let db = null;

async function initFirebase() {
  try {
    const res = await fetch('../keys.json');
    const keys = await res.json();
    firebaseConfig = keys.firebase;
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    return { auth, db };
  } catch (e) {
    console.error('Firebase init failed:', e);
    return null;
  }
}

async function registerUser(email, password, callsign) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, 'users', user.uid), {
      email,
      callsign,
      emailVerified: false,
      msfCode: null,
      avatar: null,
      karbogreyd: 0,
      points: 0,
      minus: 0,
      corpsRoles: [],
      history: [],
      createdAt: new Date().toISOString()
    });
    await sendEmailVerification(user);
    return { success: true, user };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      return { success: false, error: 'Почта не подтверждена. Проверьте email и перейдите по ссылке.' };
    }
    return { success: true, user: userCredential.user };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) return { success: true, data: snap.data() };
    return { success: false, error: 'Пользователь не найден' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function updateUserProfile(uid, data) {
  try {
    await updateDoc(doc(db, 'users', uid), data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getAllUsers() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users = [];
    snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    return { success: true, users };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function addPoints(uid, amount, reason, adminUid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { success: false, error: 'Пользователь не найден' };
    const data = userSnap.data();
    const newPoints = (data.points || 0) + amount;
    const entry = { type: amount > 0 ? 'plus' : 'minus', amount: Math.abs(amount), reason, adminUid, date: new Date().toISOString() };
    await updateDoc(userRef, { points: newPoints, history: arrayUnion(entry) });
    return { success: true, newPoints };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function assignCorpsRole(uid, role, adminUid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { success: false, error: 'Пользователь не найден' };
    const data = userSnap.data();
    const corpsRoles = data.corpsRoles || [];
    if (corpsRoles.find(r => r.role === role)) return { success: false, error: 'Роль уже назначена' };
    corpsRoles.push({ role, points: 0, assignedAt: new Date().toISOString(), assignedBy: adminUid });
    await updateDoc(userRef, { corpsRoles });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function promoteCorpsRole(uid, role, newRole, adminUid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { success: false, error: 'Пользователь не найден' };
    const data = userSnap.data();
    const corpsRoles = data.corpsRoles || [];
    const idx = corpsRoles.findIndex(r => r.role === role);
    if (idx === -1) return { success: false, error: 'Роль не найдена' };
    corpsRoles[idx].role = newRole;
    corpsRoles[idx].promotedAt = new Date().toISOString();
    corpsRoles[idx].promotedBy = adminUid;
    await updateDoc(userRef, { corpsRoles });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function assignUnitCommander(uid, unit, adminUid) {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      [`unitRoles.${unit}`]: 'commander',
      [`unitRolesAssignedBy.${unit}`]: adminUid,
      [`unitRolesAssignedAt.${unit}`]: new Date().toISOString()
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function assignUnitMemberRole(uid, unit, subRole, commanderUid) {
  try {
    const commanderRef = doc(db, 'users', commanderUid);
    const commanderSnap = await getDoc(commanderRef);
    if (!commanderSnap.exists()) return { success: false, error: 'Командир не найден' };
    const cData = commanderSnap.data();
    const unitRoles = cData.unitRoles || {};
    if (unitRoles[unit] !== 'commander') return { success: false, error: 'Вы не командир этого подразделения' };
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      [`unitRoles.${unit}`]: subRole,
      [`unitRolesAssignedBy.${unit}`]: commanderUid,
      [`unitRolesAssignedAt.${unit}`]: new Date().toISOString()
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export {
  initFirebase, registerUser, loginUser, logoutUser, getUserProfile, updateUserProfile,
  getAllUsers, addPoints, assignCorpsRole, promoteCorpsRole, assignUnitCommander,
  assignUnitMemberRole, auth, db
};
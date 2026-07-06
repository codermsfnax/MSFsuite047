import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, setDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

let db, auth, currentUid, bell, dropdown, badge;

export async function initNotifications() {
  const res = await fetch('../keys.json');
  const keys = await res.json();
  const app = initializeApp(keys.firebase);
  auth = getAuth(app);
  db = getFirestore(app);

  bell = document.getElementById('notifBell');
  dropdown = document.getElementById('notifDropdown');
  badge = document.getElementById('notifBadge');

  if (!bell || !dropdown) return;

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
    if (dropdown.classList.contains('active')) loadNotifications();
  });

  document.addEventListener('click', (e) => {
    if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  onAuthStateChanged(auth, (user) => {
    currentUid = user?.uid || null;
    if (user) loadNotificationCount();
  });
}

async function loadNotificationCount() {
  if (!currentUid || !badge) return;
  const q = query(collection(db, 'notifications'), where('forUid', '==', currentUid), where('read', '==', false));
  const snap = await getDocs(q);
  const count = snap.size;
  badge.textContent = count || '';
  badge.style.display = count > 0 ? 'block' : 'none';
}

async function loadNotifications() {
  if (!currentUid || !dropdown) return;

  const q = query(collection(db, 'notifications'), where('forUid', '==', currentUid));
  const snap = await getDocs(q);
  const all = [];
  snap.forEach(d => all.push({ id: d.id, ...d.data() }));

  all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!all.length) {
    dropdown.innerHTML = '<div class="notif-empty">Нет уведомлений</div>';
    return;
  }

  dropdown.innerHTML = all.map(n => {
    const date = new Date(n.createdAt).toLocaleString('ru-RU');
    const isRequest = n.type === 'unit_request' && n.status === 'pending';

    return `<div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
      <div class="notif-dot ${n.read ? 'read' : ''}"></div>
      <div class="notif-content">
        ${n.message}
        <div class="notif-time">${date}</div>
        ${isRequest ? `
        <div class="notif-actions">
          <button class="notif-btn approve" data-action="approve" data-nid="${n.id}">Одобрить</button>
          <button class="notif-btn reject" data-action="reject" data-nid="${n.id}">Отказать</button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');

  dropdown.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', async () => {
      const id = item.dataset.id;
      await updateDoc(doc(db, 'notifications', id), { read: true });
      loadNotifications();
      loadNotificationCount();
    });
  });

  dropdown.querySelectorAll('.notif-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const nid = btn.dataset.nid;
      const action = btn.dataset.action;
      const notifRef = doc(db, 'notifications', nid);
      const notifSnap = await getDoc(notifRef);
      if (!notifSnap.exists()) return;
      const notif = notifSnap.data();

      if (action === 'approve' && notif.data) {
        const { targetUid, unit, role } = notif.data;
        const userRef = doc(db, 'users', targetUid);
        const userSnap = await getDoc(userRef);
        const unitRoles = userSnap.data().unitRoles || {};
        unitRoles[unit] = role;
        await updateDoc(userRef, { unitRoles });
        await updateDoc(notifRef, { status: 'approved', read: true });
        await sendNotification(targetUid, `Ваша заявка на должность "${role === 'deputy' ? 'Зам. командира' : role === 'junior' ? 'Мл. командир' : 'Штатный'}" в ${unit.toUpperCase()} одобрена!`, 'success');
        showToast('Заявка одобрена', 'success');
      } else if (action === 'reject') {
        await updateDoc(notifRef, { status: 'rejected', read: true });
        if (notif.data) {
          await sendNotification(notif.data.targetUid, `Ваша заявка на должность в ${notif.data.unit?.toUpperCase()} отклонена.`, 'info');
        }
        showToast('Заявка отклонена', 'info');
      }
      loadNotifications();
      loadNotificationCount();
    });
  });
}

export async function sendNotification(forUid, message, type = 'info', data = null) {
  if (!db) return;
  const ref = doc(collection(db, 'notifications'));
  await setDoc(ref, {
    forUid, message, type, data,
    read: false, status: data ? 'pending' : 'info',
    createdAt: new Date().toISOString()
  });
}

function showToast(msg, type) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:var(--bg-elevated);border:1px solid var(--border);padding:0.6rem 1.2rem;font-family:var(--font-mono);font-size:0.6rem;z-index:99999;opacity:0;transition:opacity 0.3s ease;';
  if (type === 'success') t.style.borderColor = '#4caf84';
  if (type === 'error') t.style.borderColor = '#cc5555';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.style.opacity = '1');
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}
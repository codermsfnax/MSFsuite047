import { initFirebase, registerUser, loginUser, logoutUser, getUserProfile, auth } from './firebase.js';

let currentUser = null;
let userProfile = null;

async function initAuth() {
  const fb = await initFirebase();
  if (!fb) return;

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      const profile = await getUserProfile(user.uid);
      if (profile.success) userProfile = profile.data;
      updateUIForLoggedInUser();
    } else {
      currentUser = null;
      userProfile = null;
      updateUIForLoggedOutUser();
    }
  });

  setupAuthButtons();
}

function setupAuthButtons() {
  const authBtn = document.getElementById('authBtn');
  const authModal = document.getElementById('authModal');
  const authClose = document.getElementById('authClose');

  if (authBtn && authModal) {
    authBtn.addEventListener('click', () => {
      if (currentUser) {
        window.location.href = 'pages/profile.html';
      } else {
        authModal.classList.add('active');
      }
    });
  }

  if (authModal && authClose) {
    authClose.addEventListener('click', () => authModal.classList.remove('active'));
    authModal.addEventListener('click', (e) => { if (e.target === authModal) authModal.classList.remove('active'); });
  }

  const authTabs = document.querySelectorAll('.auth-tab');
  const authForms = document.querySelectorAll('.auth-form');
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      authTabs.forEach(t => t.classList.remove('active'));
      authForms.forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target === 'login' ? 'loginForm' : 'regForm').classList.add('active');
    });
  });

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const result = await loginUser(email, password);
      if (result.success) {
        authModal.classList.remove('active');
        showToast('Вход выполнен', 'success');
      } else {
        showToast(result.error, 'error');
      }
    });
  }

  const regForm = document.getElementById('regForm');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPassword').value;
      const callsign = document.getElementById('regCallsign').value;
      if (!callsign || callsign.length < 2) {
        showToast('Позывной должен быть от 2 символов', 'error');
        return;
      }
      const result = await registerUser(email, password, callsign);
      if (result.success) {
        authModal.classList.remove('active');
        showToast('Письмо с подтверждением отправлено на почту. Проверьте email.', 'success');
      } else {
        showToast(result.error, 'error');
      }
    });
  }

  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await logoutUser();
      window.location.href = '../index.html';
    });
  }
}

function updateUIForLoggedInUser() {
  const authBtn = document.getElementById('authBtn');
  if (authBtn) {
    authBtn.textContent = userProfile?.callsign || 'Профиль';
    authBtn.classList.add('logged-in');
  }
}

function updateUIForLoggedOutUser() {
  const authBtn = document.getElementById('authBtn');
  if (authBtn) {
    authBtn.textContent = 'Войти';
    authBtn.classList.remove('logged-in');
  }
}

function showToast(message, type) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
}

export { initAuth, currentUser, userProfile };
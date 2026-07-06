class ReportMain {
  constructor() {
    this.currentAccessLevel = 'delta';
    this.currentReportType = null;
    this.modules = {};
    this.keys = {};
    this.init();
  }

  async init() {
    await this.loadKeys();
    this.setupEventListeners();
    this.setupAccessControl();
    await this.initModules();
  }

  async loadKeys() {
    try {
      const res = await fetch('keys.json');
      if (res.ok) {
        this.keys = await res.json();
      }
    } catch (e) {
      console.warn('Keys file not loaded');
    }
  }

  async initModules() {
    this.modules.prom = new PromReportModule();
    this.modules.disc = new DiscReportModule();
    this.modules.abs = new AbsReportModule();
    this.modules.leave = new LeaveReportModule();
    this.modules.operation = new OperationReportModule();
    window.promModule = this.modules.prom;
    window.discModule = this.modules.disc;
    window.absModule = this.modules.abs;
    window.leaveModule = this.modules.leave;
    window.operationModule = this.modules.operation;
  }

  setupEventListeners() {
    document.querySelectorAll('input[name="reportType"]').forEach(radio => {
      radio.addEventListener('change', (e) => this.handleReportTypeChange(e.target.value));
    });
    document.getElementById('copyBtn')?.addEventListener('click', () => this.copyPreview());
    document.getElementById('sendBtn')?.addEventListener('click', () => this.sendToWebhook());
    document.getElementById('accessInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleAccessCode(e.target.value.trim());
        e.target.value = '';
      }
    });
  }

  setupAccessControl() {
    const badge = document.getElementById('accessLevel');
    if (badge) { badge.textContent = 'Δ-DELTA'; badge.className = 'access-badge delta'; }
  }

  handleAccessCode(code) {
    let newLevel = 'delta', label = 'Δ-DELTA', cls = 'delta';

    if (code === this.keys.gamma) { newLevel = 'gamma'; label = 'Γ-GAMMA'; cls = 'gamma'; }
    else if (code === this.keys.beta) { newLevel = 'beta'; label = 'Β-BETA'; cls = 'beta'; }
    else if (code === this.keys.alpha) { newLevel = 'alpha'; label = 'Α-ALPHA'; cls = 'alpha'; }

    this.currentAccessLevel = newLevel;
    const badge = document.getElementById('accessLevel');
    if (badge) { badge.textContent = label; badge.className = 'access-badge ' + cls; }
    this.showNotification('Уровень доступа: ' + label, 'success');
    if (this.currentReportType) this.checkAccessAndReset();
  }

  checkAccessAndReset() {
    const hasGamma = ['gamma', 'beta', 'alpha'].includes(this.currentAccessLevel);
    if (!hasGamma && ['promotion', 'discipline', 'operation'].includes(this.currentReportType)) {
      this.showNotification('Недостаточно прав для данного типа рапорта', 'warning');
      document.querySelectorAll('input[name="reportType"]').forEach(r => r.checked = false);
      document.getElementById('formContainer')?.classList.add('hidden');
      this.currentReportType = null;
    }
  }

  async handleReportTypeChange(type) {
    const hasGamma = ['gamma', 'beta', 'alpha'].includes(this.currentAccessLevel);
    const hasDelta = ['delta', 'gamma', 'beta', 'alpha'].includes(this.currentAccessLevel);
    if (['promotion', 'discipline', 'operation'].includes(type) && !hasGamma) {
      this.showNotification('Доступ запрещён. Требуется Gamma+.', 'error');
      const radio = document.querySelector('input[value="' + type + '"]');
      if (radio) radio.checked = false;
      return;
    }
    if (['absence', 'leave'].includes(type) && !hasDelta) {
      this.showNotification('Доступ запрещён. Требуется Delta+.', 'error');
      const radio = document.querySelector('input[value="' + type + '"]');
      if (radio) radio.checked = false;
      return;
    }
    this.currentReportType = type;
    document.getElementById('formContainer')?.classList.remove('hidden');
    await window.templateLoader.loadForm(type, 'formColumn');
    const mod = this.getModule(type);
    if (mod?.setupListeners) { mod.setupListeners(); setTimeout(() => mod.updatePreview(), 50); }
  }

  getModule(type) {
    const map = { promotion: this.modules.prom, discipline: this.modules.disc, absence: this.modules.abs, leave: this.modules.leave, operation: this.modules.operation };
    return map[type];
  }

  copyPreview() {
    const text = document.getElementById('preview')?.innerText || '';
    if (!text || text === 'Выберите тип рапорта и заполните форму') { this.showNotification('Нет данных', 'warning'); return; }
    navigator.clipboard.writeText(text).then(() => this.showNotification('Скопировано', 'success')).catch(() => this.showNotification('Ошибка копирования', 'error'));
  }

  sendToWebhook() {
    const text = document.getElementById('preview')?.innerText || '';
    if (!text || text === 'Выберите тип рапорта и заполните форму') { this.showNotification('Нет данных', 'warning'); return; }
    const titles = {
      promotion: 'РАПОРТ О ПОВЫШЕНИИ | 05-REP-PROM',
      discipline: 'РАПОРТ О ВЗЫСКАНИИ | 05-REP-DISC',
      absence: 'РАПОРТ ОБ ОТСУТСТВИИ | 05-REP-ABS',
      leave: 'РАПОРТ ОБ ОТПУСКЕ | 05-REP-LVE',
      operation: 'РАПОРТ О РЕЗУЛЬТАТЕ ОПЕРАЦИИ | 05-REP-OPR'
    };
    const payload = {
      content: null,
      embeds: [{
        title: titles[this.currentReportType] || 'РАПОРТ MSF',
        description: text.substring(0, 4000),
        color: 0x9B59B6,
        footer: { text: 'MSF-043 Reporting System | ' + new Date().toLocaleString('ru-RU') },
        timestamp: new Date().toISOString()
      }]
    };
    this.showNotification('Отправка...', 'info');
    fetch(this.keys.webhook || '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(r => { if (r.ok) this.showNotification('Рапорт отправлен', 'success'); else throw new Error('Ошибка ' + r.status); })
    .catch(e => this.showNotification('Ошибка: ' + e.message, 'error'));
  }

  showNotification(msg, type = 'info') {
    const el = document.getElementById('notification');
    if (!el) return;
    el.textContent = msg; el.className = 'notification ' + type;
    el.style.opacity = '1'; el.style.transform = 'translateX(0)';
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', () => { window.reportMain = new ReportMain(); });
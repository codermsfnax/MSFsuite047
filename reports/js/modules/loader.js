class TemplateLoader {
  constructor() {
    this.cache = {};
  }

  async load(templateName) {
    if (this.cache[templateName]) {
      return this.cache[templateName];
    }

    try {
      const response = await fetch('js/modules/templates/' + templateName + '.html');
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      const html = await response.text();
      this.cache[templateName] = html;
      return html;
    } catch (error) {
      console.error('Ошибка загрузки шаблона ' + templateName + ':', error);
      return '<div class="form-group"><label>ОШИБКА ЗАГРУЗКИ</label><p>Не удалось загрузить форму. Проверьте подключение.</p></div>';
    }
  }

  async loadForm(reportType, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Контейнер ' + containerId + ' не найден');
      return;
    }

    const mapping = {
      'promotion': 'prom',
      'discipline': 'disc',
      'absence': 'abs',
      'leave': 'leave',
      'operation': 'operation'
    };

    const templateName = mapping[reportType] || reportType;
    const html = await this.load(templateName);
    container.innerHTML = html;

    setTimeout(() => {
      const moduleMap = {
        'promotion': window.promModule,
        'discipline': window.discModule,
        'absence': window.absModule,
        'leave': window.leaveModule,
        'operation': window.operationModule
      };

      const mod = moduleMap[reportType];
      if (mod && typeof mod.setupListeners === 'function') {
        mod.setupListeners();
        if (typeof mod.updatePreview === 'function') {
          mod.updatePreview();
        }
      } else {
        console.warn('Модуль для ' + reportType + ' не найден или не имеет setupListeners');
      }
    }, 100);

    return html;
  }
}

window.templateLoader = new TemplateLoader();
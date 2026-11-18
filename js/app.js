/**
 * BusCFTLA - Lógica de la Aplicación Principal
 * Manejo de Estado, Modales, Roles, Hojas Desplegables, Cuenta Regresiva y Denuncias
 */

class BusCFTLAApp {
  constructor() {
    this.mapInstance = null;
    this.currentRole = 'student'; // 'student' | 'teacher'
    this.currentTheme = 'auto'; // 'auto' | 'blue' | 'amber' | 'dark' | 'light'
    this.selectedStop = null;
    this.countdownInterval = null;
    this.complaints = [];
    this.settings = {
      proximityAlerts: true,
      soundEnabled: true,
      refreshRate: 15,
      saveData: false,
      autoCenterOnSelect: true
    };
    this.deferredPrompt = null;
  }

  init() {
    this.loadState();
    try {
      this.initMap();
    } catch (err) {
      console.error('Error inicializando el mapa:', err);
    }
    this.setupEventListeners();
    this.applyTheme();
    this.renderUserProfile();
    this.renderHelpCards();
    this.renderComplaintsHistory();
    this.startGlobalCountdown();
    this.setupPWAInstall();
    this.setupServiceWorker();

    // Si es la primera visita, abrir selector de rol
    if (!localStorage.getItem('buscftla_role_selected')) {
      this.openRoleModal();
    } else {
      // Seleccionar por defecto la entrada CFTLA
      setTimeout(() => {
        if (this.mapInstance) {
          this.mapInstance.selectStop('stop-cftla');
        }
      }, 600);
    }
  }

  /**
   * Cargar estado persistente de localStorage
   */
  loadState() {
    const savedRole = localStorage.getItem('buscftla_current_role');
    if (savedRole && (savedRole === 'student' || savedRole === 'teacher')) {
      this.currentRole = savedRole;
    }

    const savedTheme = localStorage.getItem('buscftla_current_theme');
    if (savedTheme) {
      this.currentTheme = savedTheme;
    }

    const savedSettings = localStorage.getItem('buscftla_settings');
    if (savedSettings) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      } catch (e) {
        console.error('Error cargando ajustes:', e);
      }
    }

    const savedComplaints = localStorage.getItem('buscftla_complaints');
    if (savedComplaints) {
      try {
        this.complaints = JSON.parse(savedComplaints);
      } catch (e) {
        this.complaints = [...BUSCFTLA_DATA.initialComplaints];
      }
    } else {
      this.complaints = [...BUSCFTLA_DATA.initialComplaints];
      this.saveComplaints();
    }
  }

  /**
   * Inicializar el mapa
   */
  initMap() {
    this.mapInstance = new BusCFTLAMap();
    this.mapInstance.init('map-container');
    window.busMap = this.mapInstance;
  }

  /**
   * Asignar listeners a la interfaz
   */
  setupEventListeners() {
    // Abrir Modal de Perfil/Pestañas
    const profileBtn = document.getElementById('user-profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => this.openProfileModal('tab-profile'));
    }

    // Modal de selección de roles
    const switchRoleBtn = document.getElementById('btn-switch-role');
    if (switchRoleBtn) {
      switchRoleBtn.addEventListener('click', () => {
        this.closeModal('profile-modal');
        this.openRoleModal();
      });
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Formulario de inicio de sesión institucional
    const loginForm = document.getElementById('institutional-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleInstitutionalLogin(e));
    }

    // Botón mostrar/ocultar contraseña
    const togglePassBtn = document.getElementById('btn-toggle-password');
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', () => {
        const passInput = document.getElementById('login-password');
        if (passInput) {
          passInput.type = passInput.type === 'password' ? 'text' : 'password';
        }
      });
    }

    // Botón usuario esperando en paradero
    const toggleWaitingBtn = document.getElementById('btn-toggle-waiting');
    if (toggleWaitingBtn) {
      toggleWaitingBtn.addEventListener('click', () => this.toggleUserWaiting());
    }

    // Selector de rol en modal de login
    const studentCard = document.getElementById('role-select-student');
    const teacherCard = document.getElementById('role-select-teacher');
    if (studentCard) {
      studentCard.addEventListener('click', () => this.selectRole('student'));
    }
    if (teacherCard) {
      teacherCard.addEventListener('click', () => this.selectRole('teacher'));
    }

    // Pestañas del modal de perfil
    const tabButtons = document.querySelectorAll('.modal-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Cerrar modales con botones de cruz y fondos
    const closeButtons = document.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.getAttribute('data-close-modal');
        this.closeModal(modalId);
      });
    });

    // Filtros de líneas en leyenda
    const lineCheckboxes = document.querySelectorAll('.line-toggle-input');
    lineCheckboxes.forEach(input => {
      input.addEventListener('change', (e) => {
        const lineId = input.getAttribute('data-line-id');
        this.mapInstance.toggleLineVisibility(lineId, input.checked);
      });
    });

    // Sheet de detalle de paradero: botones de acción
    const sheetCloseBtn = document.getElementById('sheet-close-btn');
    if (sheetCloseBtn) {
      sheetCloseBtn.addEventListener('click', () => this.hideStopDetails());
    }

    const centerStopBtn = document.getElementById('btn-center-stop');
    if (centerStopBtn) {
      centerStopBtn.addEventListener('click', () => {
        if (this.selectedStop && this.mapInstance) {
          this.mapInstance.map.flyTo(this.selectedStop.coords, 17, { duration: 0.8 });
        }
      });
    }

    const reportStopBtn = document.getElementById('btn-report-stop');
    if (reportStopBtn) {
      reportStopBtn.addEventListener('click', () => {
        this.openComplaintForSelectedStop();
      });
    }

    // Botones rápidos del header
    const centerCftlaBtn = document.getElementById('btn-center-cftla');
    if (centerCftlaBtn) {
      centerCftlaBtn.addEventListener('click', () => {
        if (this.mapInstance) this.mapInstance.centerOnCFTLA();
      });
    }

    const locateMeBtn = document.getElementById('btn-locate-me');
    if (locateMeBtn) {
      locateMeBtn.addEventListener('click', () => {
        if (this.mapInstance) this.mapInstance.locateUser();
      });
    }

    // Buscador / Selector rápido de paraderos
    const stopSearchSelect = document.getElementById('quick-stop-select');
    if (stopSearchSelect) {
      stopSearchSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val && this.mapInstance) {
          this.mapInstance.selectStop(val);
        }
      });
    }

    // Formulario de Denuncias
    const complaintForm = document.getElementById('complaint-form');
    if (complaintForm) {
      complaintForm.addEventListener('submit', (e) => this.handleComplaintSubmit(e));
    }

    // Contador de caracteres en motivo de denuncia (0/500)
    const reasonInput = document.getElementById('complaint-reason');
    const reasonCounter = document.getElementById('reason-char-counter');
    if (reasonInput && reasonCounter) {
      reasonInput.addEventListener('input', () => {
        const length = reasonInput.value.length;
        reasonCounter.textContent = `${length}/500`;
        if (length > 450) {
          reasonCounter.style.color = '#EF4444';
        } else {
          reasonCounter.style.color = '';
        }
      });
    }

    // Formateador de patente chilena (ej. BCDF-12 o CJ-8941)
    const plateInput = document.getElementById('complaint-plate');
    if (plateInput) {
      plateInput.addEventListener('input', (e) => {
        let val = plateInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length > 4) {
          val = val.substring(0, 4) + '-' + val.substring(4, 6);
        }
        plateInput.value = val;
      });
    }

    // Patentes sugeridas rápidas
    const quickPlateChips = document.querySelectorAll('.quick-plate-btn');
    quickPlateChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const plate = chip.getAttribute('data-plate');
        if (plateInput) {
          plateInput.value = plate;
          plateInput.focus();
        }
      });
    });

    // Ajustes: Theme selector
    const themeSelect = document.getElementById('setting-theme-select');
    if (themeSelect) {
      themeSelect.value = this.currentTheme;
      themeSelect.addEventListener('change', (e) => {
        this.currentTheme = e.target.value;
        localStorage.setItem('buscftla_current_theme', this.currentTheme);
        this.applyTheme();
        this.showToast('Tema visual actualizado.');
      });
    }

    // Ajustes: Toggles
    const alertToggle = document.getElementById('setting-proximity-alerts');
    if (alertToggle) {
      alertToggle.checked = this.settings.proximityAlerts;
      alertToggle.addEventListener('change', (e) => {
        this.settings.proximityAlerts = e.target.checked;
        this.saveSettings();
      });
    }

    const soundToggle = document.getElementById('setting-sound');
    if (soundToggle) {
      soundToggle.checked = this.settings.soundEnabled;
      soundToggle.addEventListener('change', (e) => {
        this.settings.soundEnabled = e.target.checked;
        this.saveSettings();
        if (this.settings.soundEnabled) this.playFeedbackSound('pop');
      });
    }

    const refreshSelect = document.getElementById('setting-refresh-rate');
    if (refreshSelect) {
      refreshSelect.value = this.settings.refreshRate.toString();
      refreshSelect.addEventListener('change', (e) => {
        this.settings.refreshRate = parseInt(e.target.value, 10);
        this.saveSettings();
        this.showToast(`Actualización configurada cada ${this.settings.refreshRate}s.`);
      });
    }

    // Botón de restablecer ajustes
    const resetSettingsBtn = document.getElementById('btn-reset-settings');
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', () => {
        this.settings = {
          proximityAlerts: true,
          soundEnabled: true,
          refreshRate: 15,
          saveData: false,
          autoCenterOnSelect: true
        };
        this.currentTheme = 'auto';
        this.saveSettings();
        localStorage.setItem('buscftla_current_theme', 'auto');
        if (themeSelect) themeSelect.value = 'auto';
        if (alertToggle) alertToggle.checked = true;
        if (soundToggle) soundToggle.checked = true;
        if (refreshSelect) refreshSelect.value = '15';
        this.applyTheme();
        this.showToast('Ajustes restablecidos por defecto.');
      });
    }

    // Arrastre táctil en el Bottom Sheet para móviles
    this.setupBottomSheetGestures();
  }

  /**
   * Gestos táctiles de deslizamiento para el Bottom Sheet
   */
  setupBottomSheetGestures() {
    const sheet = document.getElementById('stop-detail-sheet');
    const handle = document.getElementById('sheet-drag-handle');
    if (!sheet || !handle) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    handle.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
      sheet.style.transition = 'none';
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        sheet.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    handle.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      sheet.style.transition = '';
      const deltaY = currentY - startY;
      if (deltaY > 90) {
        this.hideStopDetails();
      } else {
        sheet.style.transform = '';
      }
    });
  }

  /**
   * Aplicar tema dinámico según rol y preferencia
   */
  applyTheme() {
    const root = document.documentElement;
    root.classList.remove('theme-student', 'theme-teacher', 'theme-dark', 'theme-light');

    if (this.currentTheme === 'auto') {
      if (this.currentRole === 'teacher') {
        root.classList.add('theme-teacher');
      } else {
        root.classList.add('theme-student');
      }
    } else if (this.currentTheme === 'amber' || this.currentTheme === 'teacher') {
      root.classList.add('theme-teacher');
    } else if (this.currentTheme === 'blue' || this.currentTheme === 'student') {
      root.classList.add('theme-student');
    } else if (this.currentTheme === 'dark') {
      root.classList.add('theme-dark');
    } else if (this.currentTheme === 'light') {
      root.classList.add('theme-light');
    }

    // Actualizar azulejos del mapa si es oscuro
    if (this.mapInstance) {
      const isDark = root.classList.contains('theme-dark') ||
        (root.classList.contains('theme-teacher') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      this.mapInstance.setTileLayer(isDark ? 'dark' : 'standard');
    }
  }

  /**
   * Guardar ajustes
   */
  saveSettings() {
    localStorage.setItem('buscftla_settings', JSON.stringify(this.settings));
  }

  /**
   * Callback cuando se selecciona un paradero en el mapa
   */
  onStopSelected(stop) {
    if (!stop) return;
    this.selectedStop = stop;
    this.renderStopDetails(stop);
    this.showStopDetails();
    if (this.settings.soundEnabled) {
      this.playFeedbackSound('pop');
    }
  }

  /**
   * Renderizar la hoja de detalle del paradero
   */
  renderStopDetails(stop) {
    const nameEl = document.getElementById('sheet-stop-name');
    const badgeEl = document.getElementById('sheet-stop-badge');
    const descEl = document.getElementById('sheet-stop-desc');
    const freqEl = document.getElementById('sheet-stop-frequency');
    const timeToCftlaEl = document.getElementById('sheet-stop-time-cftla');
    const nextBusLineEl = document.getElementById('sheet-next-bus-line');
    const nextBusPlateEl = document.getElementById('sheet-next-bus-plate');
    const linesContainer = document.getElementById('sheet-lines-container');

    if (nameEl) nameEl.textContent = stop.name;
    if (descEl) descEl.textContent = stop.description;
    if (freqEl) freqEl.textContent = stop.frequency;

    // Distintivo de paradero vs CFTLA
    if (badgeEl) {
      if (stop.isCFTLA) {
        badgeEl.className = 'status-badge badge-cftla';
        badgeEl.innerHTML = '<span class="pulse-dot"></span> Sede Central CFTLA';
      } else {
        badgeEl.className = 'status-badge badge-standard';
        badgeEl.innerHTML = '<span class="dot"></span> Paradero Autorizado';
      }
    }

    // Tiempo estimado hasta CFTLA
    if (timeToCftlaEl) {
      if (stop.isCFTLA) {
        timeToCftlaEl.innerHTML = `
          <span class="highlight-arrival arrival-here">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            ¡Estás aquí!
          </span>
        `;
      } else {
        timeToCftlaEl.innerHTML = `
          <span class="highlight-arrival">
            <svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ${stop.timeToCFTLA} de viaje
          </span>
        `;
      }
    }

    // Próximo bus y placa
    if (nextBusLineEl) nextBusLineEl.textContent = stop.nextBusLine;
    if (nextBusPlateEl) nextBusPlateEl.textContent = stop.nextBusPlate;

    // Líneas que pasan
    if (linesContainer) {
      linesContainer.innerHTML = '';
      stop.lines.forEach(lineName => {
        const lineMeta = BUSCFTLA_DATA.lines.find(l => l.name === lineName);
        const tag = document.createElement('span');
        tag.className = 'line-pill';
        if (lineMeta) {
          tag.style.setProperty('--line-col', lineMeta.color);
          tag.style.setProperty('--line-bg', lineMeta.bgColor);
        }
        tag.innerHTML = `<strong>${lineName}</strong>`;
        linesContainer.appendChild(tag);
      });
    }

    // Actualizar sección de usuarios esperando en paradero
    const waitingTextEl = document.getElementById('sheet-waiting-users-text');
    const toggleWaitingBtn = document.getElementById('btn-toggle-waiting');

    if (waitingTextEl) {
      const count = stop.waitingUsersCount || 1;
      const otherCount = stop.isUserWaiting ? Math.max(0, count - 1) : count;
      if (stop.isUserWaiting) {
        waitingTextEl.innerHTML = `👥 <strong>Tú</strong> y otros <strong>${otherCount}</strong> usuario${otherCount === 1 ? '' : 's'} esperando aquí`;
      } else {
        waitingTextEl.innerHTML = `👥 <strong>${count}</strong> usuario${count === 1 ? '' : 's'} esperando este paradero en este momento`;
      }
    }

    if (toggleWaitingBtn) {
      if (stop.isUserWaiting) {
        toggleWaitingBtn.textContent = '✓ Anotado (Esperando aquí)';
        toggleWaitingBtn.style.background = 'var(--primary-color)';
        toggleWaitingBtn.style.color = '#FFFFFF';
        toggleWaitingBtn.style.borderColor = 'var(--primary-color)';
      } else {
        toggleWaitingBtn.textContent = '✋ ¡Estoy esperando aquí!';
        toggleWaitingBtn.style.background = '';
        toggleWaitingBtn.style.color = '';
        toggleWaitingBtn.style.borderColor = '';
      }
    }

    // Actualizar contador
    this.updateStopCountdownDisplay();
  }

  /**
   * Mostrar el Bottom Sheet
   */
  showStopDetails() {
    const sheet = document.getElementById('stop-detail-sheet');
    if (sheet) {
      sheet.classList.add('is-visible');
      sheet.style.transform = '';
    }
  }

  /**
   * Ocultar el Bottom Sheet
   */
  hideStopDetails() {
    const sheet = document.getElementById('stop-detail-sheet');
    if (sheet) {
      sheet.classList.remove('is-visible');
    }
  }

  /**
   * Motor de cuenta regresiva en vivo segundo a segundo
   */
  startGlobalCountdown() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      // Disminuir segundos en paraderos
      BUSCFTLA_DATA.stops.forEach(stop => {
        if (stop.nextBusSeconds > 0) {
          stop.nextBusSeconds--;
        } else {
          // Reiniciar ciclo de frecuencia (entre 8 y 20 min)
          stop.nextBusSeconds = Math.floor(Math.random() * (1200 - 480 + 1)) + 480;
        }
      });

      this.updateStopCountdownDisplay();
    }, 1000);
  }

  /**
   * Actualizar visual del contador
   */
  updateStopCountdownDisplay() {
    if (!this.selectedStop) return;
    const countdownEl = document.getElementById('sheet-countdown-timer');
    const etaTextEl = document.getElementById('sheet-eta-text');
    if (!countdownEl) return;

    const totalSeconds = this.selectedStop.nextBusSeconds;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    countdownEl.innerHTML = `
      <span class="time-block"><strong class="num">${minutes}</strong> <span class="unit">min</span></span>
      <span class="colon">:</span>
      <span class="time-block"><strong class="num">${seconds < 10 ? '0' + seconds : seconds}</strong> <span class="unit">seg</span></span>
    `;

    if (etaTextEl) {
      if (minutes <= 3) {
        etaTextEl.innerHTML = `<span style="color:#EF4444;font-weight:700">● ¡Próximo bus llegando ahora!</span>`;
      } else if (minutes <= 7) {
        etaTextEl.innerHTML = `<span style="color:#F59E0B;font-weight:600">● En aproximación cercana</span>`;
      } else {
        etaTextEl.innerHTML = `<span style="color:#10B981">● En horario regular</span>`;
      }
    }
  }

  /**
   * Renderizar datos del perfil de usuario activo
   */
  renderUserProfile() {
    const profile = BUSCFTLA_DATA.profiles[this.currentRole];
    if (!profile) return;

    // Header avatar y etiquetas
    const avatarBadge = document.getElementById('user-avatar-initials');
    const headerRoleBadge = document.getElementById('header-user-role-badge');
    const headerUserName = document.getElementById('header-user-name');

    if (avatarBadge) avatarBadge.textContent = profile.avatarInitial;
    if (headerRoleBadge) headerRoleBadge.textContent = profile.role;
    if (headerUserName) headerUserName.textContent = profile.name.split(' ')[0];

    // Credencial institucional en la pestaña Perfil
    const credAvatar = document.getElementById('cred-avatar');
    const credName = document.getElementById('cred-name');
    const credRole = document.getElementById('cred-role');
    const credCode = document.getElementById('cred-code');
    const credInstitution = document.getElementById('cred-institution');
    const credModule = document.getElementById('cred-module');

    if (credAvatar) credAvatar.textContent = profile.avatarInitial;
    if (credName) credName.textContent = profile.name;
    if (credRole) credRole.textContent = profile.role;
    if (credCode) credCode.textContent = profile.code;
    if (credInstitution) credInstitution.textContent = profile.institution;
    if (credModule) credModule.textContent = profile.module;

    // Métricas en la pestaña Perfil
    const metricRoutes = document.getElementById('metric-routes');
    const metricTrips = document.getElementById('metric-trips');
    const metricAlerts = document.getElementById('metric-alerts');

    if (metricRoutes) metricRoutes.textContent = profile.metrics.routes;
    if (metricTrips) metricTrips.textContent = profile.metrics.trips;
    if (metricAlerts) metricAlerts.textContent = profile.metrics.alerts;

    // Estilo de badge del carnet
    const credBadgeEl = document.getElementById('cred-role-badge');
    if (credBadgeEl) {
      credBadgeEl.className = `cred-badge cred-${profile.roleKey}`;
      credBadgeEl.textContent = profile.role.toUpperCase();
    }
  }

  /**
   * Renderizar tarjetas de la pestaña Ayuda
   */
  renderHelpCards() {
    const container = document.getElementById('help-cards-list');
    if (!container) return;

    container.innerHTML = '';
    BUSCFTLA_DATA.helpCards.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'help-card-item';
      cardEl.innerHTML = `
        <div class="help-card-icon-wrapper">
          ${this.getHelpIconSvg(card.icon)}
        </div>
        <div class="help-card-body">
          <h4 class="help-card-title">${card.title}</h4>
          <p class="help-card-desc">${card.description}</p>
        </div>
      `;
      container.appendChild(cardEl);
    });
  }

  /**
   * Generar iconos SVG limpios para las tarjetas de ayuda
   */
  getHelpIconSvg(iconName) {
    switch (iconName) {
      case 'map':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`;
      case 'marker':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
      case 'clock':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
      case 'navigation':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`;
      case 'user':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      case 'alert-triangle':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
  }

  /**
   * Manejo de selección de rol
   */
  selectRole(role) {
    this.currentRole = role;
    const studentBtn = document.getElementById('role-select-student');
    const teacherBtn = document.getElementById('role-select-teacher');
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    const profile = BUSCFTLA_DATA.profiles[role];

    if (studentBtn && teacherBtn) {
      if (role === 'student') {
        studentBtn.style.borderColor = 'var(--primary-color)';
        studentBtn.style.background = 'var(--primary-surface)';
        teacherBtn.style.borderColor = 'var(--border-color)';
        teacherBtn.style.background = 'var(--bg-card-subtle)';
      } else {
        teacherBtn.style.borderColor = 'var(--primary-color)';
        teacherBtn.style.background = 'var(--primary-surface)';
        studentBtn.style.borderColor = 'var(--border-color)';
        studentBtn.style.background = 'var(--bg-card-subtle)';
      }
    }

    if (emailInput && profile) {
      emailInput.value = profile.email || '';
    }
    if (passInput && profile) {
      passInput.value = profile.defaultPassword || '';
    }

    const errorAlert = document.getElementById('login-error-alert');
    if (errorAlert) errorAlert.classList.add('is-hidden');
  }

  /**
   * Manejo de inicio de sesión institucional con correo y contraseña
   */
  handleInstitutionalLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    const errorAlert = document.getElementById('login-error-alert');
    const errorText = document.getElementById('login-error-text');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';
    const profile = BUSCFTLA_DATA.profiles[this.currentRole];

    if (!email || !password) {
      if (errorAlert && errorText) {
        errorText.textContent = 'Por favor ingresa tu correo y contraseña institucional.';
        errorAlert.classList.remove('is-hidden');
      }
      return;
    }

    if (password.length < 4) {
      if (errorAlert && errorText) {
        errorText.textContent = 'La contraseña institucional debe tener al menos 4 caracteres.';
        errorAlert.classList.remove('is-hidden');
      }
      return;
    }

    localStorage.setItem('buscftla_role_selected', 'true');
    localStorage.setItem('buscftla_current_role', this.currentRole);
    localStorage.setItem('buscftla_user_email', email);

    this.closeModal('role-modal');
    this.applyTheme();
    this.renderUserProfile();
    this.showToast(`¡Sesión iniciada como ${profile.name}!`);
    if (this.settings.soundEnabled) {
      this.playFeedbackSound('success');
    }

    setTimeout(() => {
      if (this.mapInstance) {
        this.mapInstance.selectStop('stop-cftla');
      }
    }, 500);
  }

  /**
   * Registrar / cancelar usuario esperando en un paradero
   */
  toggleUserWaiting() {
    if (!this.selectedStop) return;
    const stop = this.selectedStop;
    stop.isUserWaiting = !stop.isUserWaiting;

    if (stop.isUserWaiting) {
      stop.waitingUsersCount = (stop.waitingUsersCount || 0) + 1;
      this.showToast(`Te has registrado esperando en ${stop.shortName}.`);
    } else {
      stop.waitingUsersCount = Math.max(0, (stop.waitingUsersCount || 1) - 1);
      this.showToast(`Has cancelado tu aviso de espera en ${stop.shortName}.`);
    }

    this.renderStopDetails(stop);
    if (this.settings.soundEnabled) {
      this.playFeedbackSound('pop');
    }
  }

  /**
   * Cerrar sesión / reiniciar rol
   */
  handleLogout() {
    if (confirm('¿Deseas cerrar tu sesión institucional en BusCFTLA?')) {
      localStorage.removeItem('buscftla_role_selected');
      localStorage.removeItem('buscftla_user_email');
      this.closeModal('profile-modal');
      this.openRoleModal();
      this.showToast('Sesión cerrada correctamente.');
    }
  }

  /**
   * Abrir modal de selección de roles
   */
  openRoleModal() {
    this.openModal('role-modal');
  }

  /**
   * Abrir modal de perfil con pestaña preseleccionada
   */
  openProfileModal(defaultTab = 'tab-profile') {
    this.switchTab(defaultTab);
    this.openModal('profile-modal');
  }

  /**
   * Abrir modal por ID
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('is-open');
      document.body.classList.add('modal-active');
    }
  }

  /**
   * Cerrar modal por ID
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('is-open');
      // Si no quedan otros modales abiertos, remover clase del body
      if (!document.querySelector('.app-modal.is-open')) {
        document.body.classList.remove('modal-active');
      }
    }
  }

  /**
   * Cambiar pestaña en el modal de perfil
   */
  switchTab(tabId) {
    // Actualizar botones de pestaña
    const tabButtons = document.querySelectorAll('.modal-tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === tabId);
    });

    // Actualizar paneles de contenido
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
      pane.classList.toggle('is-active', pane.id === tabId);
    });
  }

  /**
   * Abrir denuncia pre-rellenada con paradero seleccionado
   */
  openComplaintForSelectedStop() {
    this.openProfileModal('tab-complaint');
    if (this.selectedStop) {
      const plateInput = document.getElementById('complaint-plate');
      const lineSelect = document.getElementById('complaint-line');
      if (plateInput && this.selectedStop.nextBusPlate) {
        plateInput.value = this.selectedStop.nextBusPlate;
      }
      if (lineSelect && this.selectedStop.nextBusLine) {
        lineSelect.value = this.selectedStop.nextBusLine;
      }
    }
  }

  /**
   * Enviar formulario de denuncia
   */
  handleComplaintSubmit(event) {
    event.preventDefault();

    const plateInput = document.getElementById('complaint-plate');
    const categorySelect = document.getElementById('complaint-category');
    const lineSelect = document.getElementById('complaint-line');
    const reasonInput = document.getElementById('complaint-reason');

    const plate = plateInput ? plateInput.value.trim().toUpperCase() : '';
    const reason = reasonInput ? reasonInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : 'Infracción de tránsito';
    const line = lineSelect ? lineSelect.value : 'Línea A';

    // Validaciones
    if (!plate || plate.length < 5) {
      alert('Por favor, ingresa una matrícula de vehículo válida (ej: BCDF-12).');
      if (plateInput) plateInput.focus();
      return;
    }

    if (!reason || reason.length < 10) {
      alert('Por favor, describe detalladamente el motivo de la denuncia (mínimo 10 caracteres).');
      if (reasonInput) reasonInput.focus();
      return;
    }

    // Generar nuevo folio de denuncia
    const randomTicket = Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const userProfile = BUSCFTLA_DATA.profiles[this.currentRole];

    const newComplaint = {
      id: `DEN-${now.getFullYear()}-${randomTicket}`,
      date: formattedDate,
      plate: plate,
      line: line,
      category: category,
      reason: reason,
      status: "En revisión",
      reporter: `${userProfile.name} (${userProfile.role})`
    };

    // Guardar
    this.complaints.unshift(newComplaint);
    this.saveComplaints();
    this.renderComplaintsHistory();

    // Limpiar formulario
    event.target.reset();
    const counter = document.getElementById('reason-char-counter');
    if (counter) counter.textContent = '0/500';

    // Mostrar modal o alerta de éxito
    if (this.settings.soundEnabled) this.playFeedbackSound('success');
    this.showConfirmationModal(newComplaint);
  }

  /**
   * Guardar denuncias en LocalStorage
   */
  saveComplaints() {
    localStorage.setItem('buscftla_complaints', JSON.stringify(this.complaints));
  }

  /**
   * Renderizar historial de denuncias
   */
  renderComplaintsHistory() {
    const listContainer = document.getElementById('complaints-history-list');
    if (!listContainer) return;

    if (this.complaints.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-card">
          <p>No tienes denuncias reportadas actualmente.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    this.complaints.forEach(item => {
      const card = document.createElement('div');
      card.className = 'complaint-history-item';
      card.innerHTML = `
        <div class="complaint-card-header">
          <span class="complaint-id">${item.id}</span>
          <span class="complaint-status-pill status-${item.status.includes('Aceptada') ? 'accepted' : 'review'}">${item.status}</span>
        </div>
        <div class="complaint-card-details">
          <div><strong>Patente:</strong> <code class="plate-tag">${item.plate}</code> · <strong>${item.line}</strong></div>
          <div><strong>Categoría:</strong> ${item.category}</div>
          <p class="complaint-reason-text">"${item.reason}"</p>
          <div class="complaint-timestamp">Fecha: ${item.date}</div>
        </div>
      `;
      listContainer.appendChild(card);
    });
  }

  /**
   * Modal de confirmación de denuncia enviada
   */
  showConfirmationModal(complaint) {
    const ticketSpan = document.getElementById('conf-ticket-id');
    const plateSpan = document.getElementById('conf-plate-id');
    if (ticketSpan) ticketSpan.textContent = complaint.id;
    if (plateSpan) plateSpan.textContent = complaint.plate;

    this.openModal('complaint-confirm-modal');
  }

  /**
   * Notificación Toast flotante
   */
  showToast(message, duration = 3000) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-active');

    setTimeout(() => {
      toast.classList.remove('is-active');
    }, duration);
  }

  /**
   * Sonidos sintéticos con Web Audio API (Offline y sin descargas)
   */
  playFeedbackSound(type = 'pop') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // Audio no disponible o silenciado
    }
  }

  /**
   * Soporte para instalación de PWA
   */
  setupPWAInstall() {
    const installBtn = document.getElementById('btn-install-pwa');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (installBtn) {
        installBtn.classList.remove('is-hidden');
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!this.deferredPrompt) {
          alert('Para instalar BusCFTLA, abre las opciones de tu navegador y selecciona "Agregar a la pantalla principal".');
          return;
        }
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          installBtn.classList.add('is-hidden');
        }
        this.deferredPrompt = null;
      });
    }

    window.addEventListener('appinstalled', () => {
      this.showToast('¡BusCFTLA instalada con éxito en tu dispositivo!');
      if (installBtn) installBtn.classList.add('is-hidden');
    });
  }

  /**
   * Registro del Service Worker
   */
  setupServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('ServiceWorker de BusCFTLA registrado:', reg.scope);
          })
          .catch((err) => {
            console.warn('Error registrando ServiceWorker:', err);
          });
      });
    }
  }
}

// Exportar clase para disponibilidad global
if (typeof window !== 'undefined') {
  window.BusCFTLAApp = BusCFTLAApp;
}

// Iniciar aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
  window.busApp = new BusCFTLAApp();
  window.busApp.init();
});

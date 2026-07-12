/**
 * core.js - Clase principal GuitarStudioApp: constructor, navegación SPA,
 * tema, sistema de perfiles/PIN, bindEvents() y helpers compartidos.
 * Los demás archivos (i18n.js, alphatabPlayer.js, bibliotecaProfesor.js,
 * tableroProfesor.js, miEstudioPractica.js) extienden GuitarStudioApp.prototype
 * y deben cargarse DESPUÉS de este. bootstrap.js instancia la app y debe
 * cargarse último de todos.
 */
// ==========================================================================
// ResizeObserver Harmless Error Suppression (Popups)
// ==========================================================================
// AlphaTab's print() opens a new tab by default. 
// We intercept window.open to force it to use an invisible iframe instead.
// This prevents opening a new tab and avoids the ResizeObserver console error on close.
const originalWindowOpen = window.open;
window.open = function(url, target, features) {
    if (!url || url === 'about:blank' || url === '') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '800px'; // Approx A4 width
        iframe.style.height = '1122px'; // Approx A4 height
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        const win = iframe.contentWindow;
        
        // Suppress any ResizeObserver or render errors inside the iframe (using capture phase)
        // suppressResizeObserverError is defined globally in index.html <head>
        if (typeof suppressResizeObserverError !== 'undefined') {
            win.addEventListener('error', suppressResizeObserverError, true);
        }
        
        // Intercept alphaTab calling win.print() when it finishes rendering
        const originalPrint = win.print;
        win.print = function() {
            originalPrint.call(win);
            // After the print dialog closes, destroy the iframe to free memory
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 1000);
        };
        
        return win;
    }
    return originalWindowOpen.apply(this, arguments);
};

// ==========================================================================
// 4. Controlador de la Aplicación (Clase Principal)
// ==========================================================================
class GuitarStudioApp {
    constructor() {
        this.lang = "es";
        this.streak = 0;
        this.lastPracticedDate = "";
        this.history = [];
        // 3 categorías: 0=technique, 1=reading, 2=repertoire
        this.completedSteps = [false, false, false];

        // DataService y metrónomo
        this.data = new DataService();
        this.metronome = new Metronome();

        // Perfil activo (alumno o null = modo profesor)
        this.activeProfile = null; // { id, name, color } o null
        this.isProfessorMode = false;
        this._currentClaseId = null; // clase abierta en el tablero
        this._dashActiveTab = 'clase'; // tab activo de creación: 'clase' | 'grupo' | 'plantilla'
        this._libSearch = '';        // búsqueda en biblioteca col 3
        this._libCatFilter = 'todos'; // filtro categoría biblioteca col 3
        this._calMode = 'mes';       // pestaña Calendario: 'mes' | 'semana'
        this._calMonthOffset = 0;    // meses respecto al mes actual (0 = este mes)
        this._calWeekOffset = 0;     // semanas lun–dom respecto a la actual (0 = esta semana)
        this._calFilterStudent = 'todos'; // filtro del calendario por alumno (profileId | 'todos')
        this._calFilterGroup = 'todos';   // filtro del calendario por curso/grupo (groupId | 'todos')
        this._gcalEvents = [];       // placeholder — Google Calendar OAuth integration, a implementar en etapa futura

        // Biblioteca Pro (v2)
        this._bibState = 'main';
        this._bibSidebarTab = 'alumnos';
        this._bibSelectedProfileId = null;
        this._bibSelectedGroupId = null;
        this._bibSearch = '';
        this._bibColFilters = { type: [], category: [], level: [], style: [] };
        this._bibBuilding = null;
        this._bibDetailItemId = null;
        this._bibLibCatFilter = 'todos';
        this._bibCatModalData = null;
        this._bibCatModalValues = { category: null };
        this._bibNuevaContext = null;
        this._bibSortCol = null;
        this._bibSortAsc = true;
        this._bibMainTab = 'general'; // 'general' (biblioteca ya no incluye 'cargas', se movió al Tablero)

        // Tablero de Control del Docente
        this._teacherBoardMainTab = 'control'; // 'control' | 'cargas' | 'consultas'
        this._teacherBoardExpandedId = null;
        this._tbSearch = '';
        this._tbGroupFilter = 'todos';
        this._tbStatusFilter = 'todos';
        this._tbSort = 'nombre';
        this._tbFocusProfileId = null;
        this._tbConsultasSearch = '';
        this._tbConsultasFilter = 'todos'; // 'todos' | 'pendientes' | 'respondidas'

        // Búsqueda y filtros de la biblioteca del alumno
        this._myLibSearch = '';
        this._myLibColFilters = { type: [], category: [], level: [], style: [] };
        this._myLibViewMode = 'clases';
        this._studioClassTab = 'next';
        this._studioHistoryOpenClaseId = null; // clase del historial actualmente expandida (repaso, no afecta la Rutina Diaria)

        // Estado de práctica: player activo
        this.playerActiveItemId = null; // ID del ítem de biblioteca activo en el player

        // AlphaTab Player
        this.atApi = null;
        this.atIsPlaying = false;
        this.userInterrupted = false;
        this.isResettingLoop = false;

        // Auto BPM Increment per loop
        this.bpmAutoIncrEnabled = false;
        this.bpmAutoIncrStep = 1;
        this.bpmAutoIncrTarget = 120;

        // Timer único de práctica (Fase B) — se usa el slot 0; el array queda por compat de forma
        this.timerSeconds = [0, 0, 0];
        this.timerIntervals = [null, null, null];
        this.activeTimerStep = null;

        // Visor PDF
        this._pdfBlobUrl = null;
        this._pdfViewerOpen = false;
    }

    async init() {
        // Inicializar DataService (IndexedDB)
        await this.data.init();

        // Ejecutar migración de plantillas a formato v2 (idempotente)
        this.data.migrateTemplatesFormat();

        // Cargar idioma
        this.lang = this.data.getLang();

        // Enlazar eventos de la UI
        this.bindEvents();

        // Cargar tema visual guardado
        this.loadSavedTheme();

        // Inicializar traducción
        this.updateLanguageUI();

        // Mostrar selector de perfiles al inicio
        await this.showProfileSelector();
    }

    // Carga datos del perfil activo y renderiza la UI completa
    async loadProfileData() {
        const pid = this.activeProfile ? this.activeProfile.id : null;

        if (pid) {
            this.streak = this.data.getProfileStreak(pid);
            this.lastPracticedDate = this.data.getProfileLastPracticed(pid);
            this.history = this.data.getProfileHistory(pid);

            const todayStr = this.getTodayString();
            const lastReset = this.data.getProfileLastResetCheck(pid);
            if (lastReset !== todayStr) {
                this.completedSteps = [false, false, false];
                this.timerSeconds = [0, 0, 0];
                this.data.setProfileCompletedSteps(pid, this.completedSteps);
                this.data.setProfileLastResetCheck(pid, todayStr);
            } else {
                this.completedSteps = this.data.getProfileCompletedSteps(pid);
                await this.restoreTodayTimers();
            }
        } else {
            // Modo profesor — usar datos globales legacy
            this.streak = this.data.getStreak();
            this.lastPracticedDate = this.data.getLastPracticedDate();
            this.history = this.data.getHistory();
            const todayStr = this.getTodayString();
            const lastReset = this.data.getLastResetCheck();
            if (lastReset !== todayStr) {
                this.completedSteps = [false, false, false];
                this.timerSeconds = [0, 0, 0];
                this.data.setCompletedSteps(this.completedSteps);
                this.data.setLastResetCheck(todayStr);
            } else {
                this.completedSteps = this.data.getCompletedSteps();
                await this.restoreTodayTimers();
            }
        }

        this.updateStreakUI();
        this.updateProgressUI();
        this.renderHeatmap();
        await this.renderPracticeView();
        await this.renderStudioSelectorAndDetails();
        this.renderMotivationalPhrase();
        this.updateProfileChip();
        this.checkStreakValidity();
    }

    /**
     * Restaura el tiempo de práctica del día actual desde IndexedDB.
     * Timer único (Fase B): suma las entradas del log, incluidas las viejas por categoría.
     */
    async restoreTodayTimers() {
        try {
            const log = await this.data.getPracticeLog(this.getTodayString());
            if (log && log.entries) {
                this.timerSeconds[0] = log.entries.reduce((sum, e) => sum + (e.seconds || 0), 0);
            }
        } catch (e) {
            console.warn('Could not restore today timers:', e);
        }
    }

    getTodayString() {
        return this._formatDateString(new Date());
    }

    _formatDateString(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Lunes (YYYY-MM-DD) de la semana calendario que contiene dateStr
    getMondayString(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        const dow = d.getDay(); // 0=domingo, 1=lunes...
        const diffToMonday = dow === 0 ? 6 : dow - 1;
        d.setDate(d.getDate() - diffToMonday);
        return this._formatDateString(d);
    }

    addDaysToDateString(dateStr, n) {
        const d = new Date(dateStr + 'T12:00:00');
        d.setDate(d.getDate() + n);
        return this._formatDateString(d);
    }

    /**
     * Regla de racha (Fase B, acordada 2026-07-10): un día sin practicar la CONGELA
     * (no crece pero sigue viva); dos días seguidos sin practicar la vuelven a 0.
     * El historial de días practicados queda asentado siempre, pase lo que pase.
     */
    checkStreakValidity() {
        if (!this.lastPracticedDate) {
            this.streak = 0;
            this.saveStreak();
            return;
        }

        const todayStr = this.getTodayString();
        const daysSince = Math.round(
            (new Date(todayStr + 'T12:00') - new Date(this.lastPracticedDate + 'T12:00')) / 86400000
        );

        // 0 = practicó hoy · 1 = practicó ayer · 2 = un día salteado (congelada, todavía puede salvarla hoy)
        // 3+ = dos o más días seguidos sin práctica → la racha vuelve a 0
        if (daysSince >= 3) {
            this.streak = 0;
            this.saveStreak();
        }
    }

    // ==========================================================================
    // Sistema de Perfiles
    // ==========================================================================

    async showProfileSelector() {
        const overlay = document.getElementById("profile-selector-overlay");
        if (!overlay) return;
        overlay.style.display = "flex";

        const grid = document.getElementById("profile-selector-grid");
        const profiles = await this.data.getProfiles();
        grid.innerHTML = "";

        profiles.forEach(p => {
            const act = this._profileActivityInfo(p.id);
            const card = document.createElement("button");
            card.className = `profile-card${act.cls === 'today' ? ' practiced-today' : ''}`;
            card.style.setProperty("--pcolor", p.color || "#6c63ff");
            card.innerHTML = `
                <div class="profile-card-avatar">${p.avatarChar || p.name.charAt(0).toUpperCase()}</div>
                <span class="profile-card-name">${this._escapeHtml(p.name)}</span>
                <span class="profile-card-activity ${act.cls}">${act.label}</span>
            `;
            card.addEventListener("click", () => this.selectProfile(p));
            grid.appendChild(card);
        });

        // Slot "Agregar" punteado, visualmente distinto de un alumno real (propuesta 7a)
        const addCard = document.createElement("button");
        addCard.className = "profile-card profile-card-add";
        addCard.innerHTML = `
            <div class="profile-card-add-circle">+</div>
            <span class="profile-card-name">Agregar</span>
        `;
        addCard.addEventListener("click", () => this.openProfilesModal());
        grid.appendChild(addCard);

        if (profiles.length === 0) {
            grid.insertAdjacentHTML('afterbegin', `<p class="text-muted" style="grid-column:1/-1;text-align:center">No hay alumnos creados aún.<br>El profesor puede agregar perfiles abajo.</p>`);
        }
    }

    // Última actividad de un perfil para el selector "¿Quién practica hoy?" (propuesta 7a)
    _profileActivityInfo(profileId) {
        const last = this.data.getProfileLastPracticed(profileId);
        if (!last) return { label: 'sin actividad', cls: 'idle' };
        const today = this.getTodayString();
        const days = Math.round((new Date(today + 'T12:00') - new Date(last + 'T12:00')) / 86400000);
        if (days <= 0) return { label: '● hoy', cls: 'today' };
        if (days === 1) return { label: 'ayer', cls: 'recent' };
        return { label: `hace ${days} días`, cls: days > 6 ? 'idle' : 'recent' };
    }

    async selectProfile(profile) {
        this.activeProfile = profile;
        this.isProfessorMode = false;
        this.data.setActiveProfileId(profile.id);

        const overlay = document.getElementById("profile-selector-overlay");
        if (overlay) overlay.style.display = "none";

        // Aplicar el tema del perfil seleccionado
        this.applyTheme(profile.tema || 'default');

        await this.loadProfileData();
        this.updateSidebarForMode();
        this.updateNotificationBell();
        this.navigateToView('studio');
    }

    // Foto de perfil por defecto para un tema, cuando el alumno no eligio avatar ni foto propia.
    _defaultThemeAvatarPhoto(profile) {
        if (profile && profile.tema === 'tango' && !profile.avatarPhoto && !profile.avatarChar) {
            return 'assets/avatar-default-tango.png';
        }
        return null;
    }

    updateProfileChip() {
        const avatar = document.getElementById("profile-chip-avatar");
        const name = document.getElementById("profile-chip-name");
        if (this.isProfessorMode) {
            if (avatar) { avatar.style.backgroundImage = 'none'; avatar.textContent = "P"; }
            if (name) name.textContent = "Profesor";
            document.getElementById("btn-profile-chip").style.setProperty("--pcolor", "#e84393");
        } else if (this.activeProfile) {
            if (avatar) {
                const themeDefault = this._defaultThemeAvatarPhoto(this.activeProfile);
                if (this.activeProfile.avatarPhoto) {
                    avatar.textContent = '';
                    avatar.style.backgroundImage = `url(${this.activeProfile.avatarPhoto})`;
                } else if (themeDefault) {
                    avatar.textContent = '';
                    avatar.style.backgroundImage = `url(${themeDefault})`;
                } else {
                    avatar.style.backgroundImage = 'none';
                    avatar.textContent = this.activeProfile.avatarChar || this.activeProfile.name.charAt(0).toUpperCase();
                }
                avatar.style.backgroundColor = this.activeProfile.color || "#6c63ff";
            }
            if (name) name.textContent = this.activeProfile.name;
            const chipBtn = document.getElementById("btn-profile-chip");
            if (chipBtn) chipBtn.style.setProperty("--pcolor", this.activeProfile.color || "#6c63ff");
        } else {
            if (avatar) { avatar.style.backgroundImage = 'none'; avatar.textContent = "?"; }
            if (name) name.textContent = "Sin perfil";
        }
    }

    // ==========================================================================
    // Notificaciones — compartido entre modo profesor y perfil de alumno.
    // audience:'teacher' (default, compat con notificaciones viejas sin el campo)
    // audience:'student' + studentId = destinatario puntual.
    // ==========================================================================

    _myNotifications() {
        const all = this.data.getNotifications();
        if (this.isProfessorMode) return all.filter(n => n.audience !== 'student');
        if (this.activeProfile) return all.filter(n => n.audience === 'student' && n.studentId === this.activeProfile.id);
        return [];
    }

    notifyTeacher({ type, claseId, itemId, itemTitle, studentId, studentName }) {
        this.data.addNotification({
            id: this.data.generateId('notif'),
            audience: 'teacher',
            type, claseId, itemId, itemTitle, studentId, studentName,
            read: false,
            timestamp: Date.now()
        });
        this.updateNotificationBell();
    }

    notifyStudents(studentIds, { type, claseId, itemId, itemTitle }) {
        (studentIds || []).forEach(studentId => {
            this.data.addNotification({
                id: this.data.generateId('notif'),
                audience: 'student',
                studentId,
                type, claseId, itemId, itemTitle,
                read: false,
                timestamp: Date.now()
            });
        });
        this.updateNotificationBell();
    }

    updateNotificationBell() {
        const badge = document.getElementById('notif-badge');
        const bell = document.getElementById('btn-notif-bell');
        if (!badge || !bell) return;
        const canSee = this.isProfessorMode || !!this.activeProfile;
        bell.style.display = canSee ? '' : 'none';
        const unread = canSee ? this._myNotifications().filter(n => !n.read).length : 0;
        badge.textContent = unread > 9 ? '9+' : String(unread);
        badge.style.display = unread > 0 ? 'flex' : 'none';
        const panel = document.getElementById('notif-panel');
        if (panel && panel.style.display !== 'none') this.renderNotificationsPanel();
    }

    toggleNotificationsPanel() {
        const panel = document.getElementById('notif-panel');
        if (!panel) return;
        const opening = panel.style.display === 'none' || !panel.style.display;
        panel.style.display = opening ? 'flex' : 'none';
        if (opening) this.renderNotificationsPanel();
    }

    closeNotificationsPanel() {
        const panel = document.getElementById('notif-panel');
        if (panel) panel.style.display = 'none';
    }

    async renderNotificationsPanel() {
        const panel = document.getElementById('notif-panel');
        if (!panel) return;
        const items = this._myNotifications().slice().sort((a, b) => b.timestamp - a.timestamp);
        // Sección de alertas del profesor: estado calculado en vivo, no son eventos (punto 6)
        const alertsHtml = (this.isProfessorMode && this._renderNotifAlertsSection)
            ? await this._renderNotifAlertsSection() : '';
        panel.innerHTML = `
            <div class="notif-panel-header">
                <span>Notificaciones</span>
                ${items.length ? '<button onclick="app.markAllNotificationsRead()">Marcar todas como leídas</button>' : ''}
            </div>
            ${alertsHtml}
            ${items.length
                ? `<div class="notif-panel-list">${items.map(n => this._renderNotifItem(n)).join('')}</div>`
                : '<div class="notif-panel-empty">No tenés notificaciones.</div>'}
        `;
    }

    _renderNotifItem(n) {
        const icon = n.type === 'duda_alumno' ? '💬' : '📤';
        const label = n.type === 'duda_alumno'
            ? `<strong>${this._escapeHtml(n.studentName || 'Un alumno')}</strong> mandó una consulta`
            : n.audience === 'student'
                ? `Tu profesor cargó <strong>"${this._escapeHtml(n.itemTitle || '')}"</strong>`
                : `<strong>${this._escapeHtml(n.studentName || 'Un alumno')}</strong> cargó "${this._escapeHtml(n.itemTitle || '')}"`;
        return `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="app.handleNotificationClick('${n.id}')">
                <span class="notif-item-icon">${icon}</span>
                <span class="notif-item-text">${label}</span>
                <span class="notif-item-time">${this._relativeTime(n.timestamp)}</span>
            </div>`;
    }

    _relativeTime(ts) {
        const diffMin = Math.round((Date.now() - ts) / 60000);
        if (diffMin < 1) return 'ahora';
        if (diffMin < 60) return `hace ${diffMin} min`;
        const diffH = Math.round(diffMin / 60);
        if (diffH < 24) return `hace ${diffH} h`;
        const diffD = Math.round(diffH / 24);
        return `hace ${diffD} d`;
    }

    handleNotificationClick(notifId) {
        const notifications = this.data.getNotifications();
        const notif = notifications.find(n => n.id === notifId);
        if (!notif) return;
        notif.read = true;
        this.data.saveNotifications(notifications);
        this.updateNotificationBell();
        this.closeNotificationsPanel();

        if (notif.audience === 'student') {
            this.navigateToView('studio');
            return;
        }
        if (notif.type === 'duda_alumno') {
            this.navigateToView('dashboard');
            this._teacherBoardMainTab = 'consultas';
            if (this.renderTeacherBoardView) this.renderTeacherBoardView();
            return;
        }
        this.navigateToView('dashboard');
        if (notif.claseId) this._currentClaseId = notif.claseId;
        this.renderDashboardView();
    }

    markAllNotificationsRead() {
        const mine = new Set(this._myNotifications().map(n => n.id));
        const all = this.data.getNotifications();
        all.forEach(n => { if (mine.has(n.id)) n.read = true; });
        this.data.saveNotifications(all);
        this.updateNotificationBell();
    }

    handleProfessorModeClick() {
        const pin = this.data.getProfessorPin();
        if (!pin) {
            // Primera vez — setup del PIN
            this._pinCallback = (enteredPin) => {
                this.data.setProfessorPin(enteredPin);
                this.enterProfessorMode();
            };
            this._pinSetup = true;
            document.getElementById("pin-modal-desc").textContent = "Creá un PIN para el modo profesor (mínimo 4 dígitos).";
            this.openPinModal();
        } else {
            this._pinCallback = (enteredPin) => {
                if (enteredPin === pin) {
                    this.enterProfessorMode();
                } else {
                    alert("PIN incorrecto.");
                }
            };
            this._pinSetup = false;
            document.getElementById("pin-modal-desc").textContent = "Ingresá el PIN para acceder al modo profesor.";
            this.openPinModal();
        }
    }

    enterProfessorMode() {
        this.activeProfile = null;
        this.isProfessorMode = true;
        this.data.setActiveProfileId(null);
        this.updateSidebarForMode();

        const overlay = document.getElementById("profile-selector-overlay");
        if (overlay) overlay.style.display = "none";

        this.loadProfileData();
        this.updateProfileChip();
        this.updateSidebarForMode();
        this.updateNotificationBell();
        this.navigateToView('studio');
    }

    openPinModal() {
        document.getElementById("pin-input").value = "";
        document.getElementById("pin-modal-overlay").style.display = "flex";
        setTimeout(() => document.getElementById("pin-input").focus(), 100);
    }

    closePinModal() {
        document.getElementById("pin-modal-overlay").style.display = "none";
        this._pinCallback = null;
    }

    confirmPin() {
        const val = document.getElementById("pin-input").value.trim();
        if (val.length < 4) { alert("El PIN debe tener al menos 4 dígitos."); return; }
        // closePinModal() resetea _pinCallback: capturarlo antes de cerrar
        const cb = this._pinCallback;
        this.closePinModal();
        if (cb) cb(val);
    }

    requestProfessorPin(callback) {
        const pin = this.data.getProfessorPin();
        if (!pin) { callback(); return; } // Sin PIN configurado, acceso libre
        this._pinCallback = (entered) => {
            if (entered === pin) { callback(); }
            else { alert("PIN incorrecto. Acceso denegado."); this.navigateToView('studio'); }
        };
        this._pinSetup = false;
        document.getElementById("pin-modal-desc").textContent = "Ingresá el PIN del profesor para acceder al Cuaderno.";
        this.openPinModal();
    }

    openProfilesModal() {
        document.getElementById("profiles-modal-overlay").style.display = "flex";
        this.switchProfileModalTab('switch');
        this.renderProfilesModalList();
        const configTab = document.getElementById("tab-profiles-config");
        if (configTab) {
            if (this.activeProfile) {
                configTab.removeAttribute("disabled");
                configTab.style.color = "var(--tb-text-primary)";
                configTab.style.cursor = "pointer";
            } else {
                configTab.setAttribute("disabled", "true");
                configTab.style.color = "var(--tb-text-muted)";
                configTab.style.cursor = "not-allowed";
            }
        }
    }

    closeProfilesModal() {
        document.getElementById("profiles-modal-overlay").style.display = "none";
        this.showProfileSelector();
    }

    switchProfileModalTab(tab) {
        const switchTabBtn = document.getElementById("tab-profiles-switch");
        const configTabBtn = document.getElementById("tab-profiles-config");
        const switchContent = document.getElementById("profiles-tab-content-switch");
        const configContent = document.getElementById("profiles-tab-content-config");
        const saveBtn = document.getElementById("btn-profiles-modal-save");

        if (!switchTabBtn || !configTabBtn || !switchContent || !configContent) return;

        if (tab === 'switch') {
            switchTabBtn.classList.add("active");
            switchTabBtn.style.borderBottomColor = "var(--tb-accent)";
            switchTabBtn.style.color = "var(--tb-text-primary)";
            
            configTabBtn.classList.remove("active");
            configTabBtn.style.borderBottomColor = "transparent";
            configTabBtn.style.color = this.activeProfile ? "var(--tb-text-primary)" : "var(--tb-text-muted)";

            switchContent.style.display = "block";
            configContent.style.display = "none";
            if (saveBtn) saveBtn.style.display = "none";
        } else if (tab === 'config' && this.activeProfile) {
            configTabBtn.classList.add("active");
            configTabBtn.style.borderBottomColor = "var(--tb-accent)";
            configTabBtn.style.color = "var(--tb-text-primary)";
            
            switchTabBtn.classList.remove("active");
            switchTabBtn.style.borderBottomColor = "transparent";
            switchTabBtn.style.color = "var(--tb-text-muted)";

            switchContent.style.display = "none";
            configContent.style.display = "block";
            if (saveBtn) saveBtn.style.display = "block";

            this.renderProfileConfigFields();
        }
    }

    async renderProfilesModalList() {
        const profiles = await this.data.getProfiles();
        const container = document.getElementById("profiles-modal-list");
        if (!container) return;
        container.innerHTML = "";
        if (profiles.length === 0) {
            container.innerHTML = `<p class="text-muted" style="padding: 12px; text-align: center;">No hay perfiles creados.</p>`;
            return;
        }
        profiles.forEach(p => {
            const row = document.createElement("div");
            row.className = "profiles-modal-row";
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.padding = "10px 12px";
            row.style.borderRadius = "8px";
            row.style.marginBottom = "8px";
            row.style.border = "1px solid var(--tb-border)";
            row.style.background = "var(--tb-bg-secondary)";
            row.style.cursor = "pointer";
            
            // Destacar el perfil activo
            const isActive = this.activeProfile && this.activeProfile.id === p.id;
            if (isActive) {
                row.style.borderColor = "var(--tb-accent)";
                row.style.background = "rgba(108,99,255,0.05)";
            }

            const avatarText = p.avatarChar || p.name.charAt(0).toUpperCase();

            row.innerHTML = `
                <div style="flex: 1; display: flex; align-items: center; gap: 12px;" onclick="app.selectProfileFromModal('${p.id}')">
                    <span class="profiles-modal-avatar" style="background:${p.color || '#6c63ff'}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 14px;">${avatarText}</span>
                    <span class="profiles-modal-name" style="font-weight: 500; color: var(--tb-text-primary);">${this._escapeHtml(p.name)}</span>
                    ${isActive ? '<span style="font-size: 10px; background: var(--tb-accent); color: #fff; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Activo</span>' : ''}
                </div>
                <button class="btn btn-danger btn-sm" onclick="app.deleteProfile('${p.id}')" style="flex-shrink: 0; padding: 4px 8px; font-size: 11px;">Eliminar</button>
            `;
            container.appendChild(row);
        });
    }

    async selectProfileFromModal(profileId) {
        const profiles = await this.data.getProfiles();
        const p = profiles.find(x => x.id === profileId);
        if (!p) return;
        await this.selectProfile(p);
        this.renderProfilesModalList();
        
        const configTab = document.getElementById("tab-profiles-config");
        if (configTab) {
            configTab.removeAttribute("disabled");
            configTab.style.color = "var(--tb-text-primary)";
            configTab.style.cursor = "pointer";
        }
        
        // Cambiar automáticamente a la pestaña de configuración al elegir el alumno
        this.switchProfileModalTab('config');
    }

    renderProfileConfigFields() {
        if (!this.activeProfile) return;
        const p = this.activeProfile;
        
        // Gmail
        const gmailInput = document.getElementById("profile-config-gmail");
        if (gmailInput) gmailInput.value = p.gmail || '';
        
        // Tema (select oculto + tarjetas visuales 7d)
        const themeSelect = document.getElementById("profile-config-theme");
        if (themeSelect) themeSelect.value = p.tema || 'default';

        // Avatar (inputs ocultos que alimentan el preview 7c)
        const avatarCharInput = document.getElementById("profile-config-avatar-char");
        if (avatarCharInput) avatarCharInput.value = p.avatarChar || p.name.charAt(0).toUpperCase();

        const avatarColorInput = document.getElementById("profile-config-avatar-color");
        if (avatarColorInput) avatarColorInput.value = p.color || '#6c63ff';

        // Foto de perfil: arranca en lo que ya está guardado (staging separado hasta Guardar)
        this._pendingAvatarPhoto = p.avatarPhoto || null;
        this._pendingAvatarPhotoRemoved = false;
        this._pendingAvatarCharTouched = false;

        // El swatch "inicial" muestra la letra real del alumno
        const initialSwatch = document.getElementById("profile-avatar-initial-swatch");
        if (initialSwatch) initialSwatch.textContent = p.name.charAt(0).toUpperCase();

        this._syncProfileConfigSwatches();
        this.profileConfigSetSection(this._profileConfigSection || 'cuenta');

        // Render Ficha dynamic fields
        const fields = this.data.getFichaFields();
        const fichaValues = p.fichaValues || {};
        const container = document.getElementById("profiles-config-ficha-container");
        if (!container) return;
        container.innerHTML = "";

        fields.forEach(f => {
            const val = fichaValues[f] || "";
            const formGroup = document.createElement("div");
            formGroup.style.display = "flex";
            formGroup.style.flexDirection = "column";
            formGroup.style.gap = "4px";

            const isAge = f.toLowerCase().includes("edad");
            const isTextarea = f.length > 20 && !isAge;

            let inputHtml = "";
            if (isAge) {
                inputHtml = `<input type="number" class="form-input ficha-field-input" data-field="${this._escapeHtml(f)}" value="${this._escapeHtml(val)}" style="width: 100%;">`;
            } else if (isTextarea) {
                inputHtml = `<textarea class="form-input ficha-field-input" data-field="${this._escapeHtml(f)}" rows="2" style="width: 100%; resize: vertical;">${this._escapeHtml(val)}</textarea>`;
            } else {
                inputHtml = `<input type="text" class="form-input ficha-field-input" data-field="${this._escapeHtml(f)}" value="${this._escapeHtml(val)}" style="width: 100%;">`;
            }

            formGroup.innerHTML = `
                <label class="form-label" style="font-weight: 500; font-size: 12px; color: var(--tb-text-secondary); margin-bottom: 2px;">${this._escapeHtml(f)}</label>
                ${inputHtml}
            `;
            container.appendChild(formGroup);
        });
    }

    handleProfileThemeChange(theme) {
        this.applyTheme(theme);
    }

    // ── Configuración de perfil: sub-tabs verticales + avatar/tema visuales (7b, 7c, 7d) ──

    profileConfigSetSection(section) {
        this._profileConfigSection = section;
        ['cuenta', 'avatar', 'tema', 'ficha'].forEach(s => {
            const btn = document.getElementById(`pconf-nav-${s}`);
            const panel = document.getElementById(`pconf-panel-${s}`);
            if (btn) btn.classList.toggle('active', s === section);
            if (panel) panel.style.display = s === section ? 'block' : 'none';
        });
    }

    profileConfigSetAvatarChar(ch) {
        const input = document.getElementById("profile-config-avatar-char");
        if (!input) return;
        // '' = usar la inicial del nombre (saveProfileConfig ya tiene ese fallback)
        input.value = ch || (this.activeProfile ? this.activeProfile.name.charAt(0).toUpperCase() : '');
        this._pendingAvatarCharTouched = true; // eligio un avatar explicitamente en esta sesion de edicion
        this._syncProfileConfigSwatches();
    }

    profileConfigSetAvatarColor(color) {
        const input = document.getElementById("profile-config-avatar-color");
        if (!input) return;
        input.value = color;
        this._syncProfileConfigSwatches();
    }

    async handleAvatarPhotoUpload(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try {
            this._pendingAvatarPhoto = await this._resizeImageToDataUrl(file, 200, 200, 0.85);
            this._pendingAvatarPhotoRemoved = false;
            this._syncProfileConfigSwatches();
        } catch (e) {
            this.showToast('No se pudo procesar la imagen', '⚠️');
        } finally {
            event.target.value = '';
        }
    }

    clearAvatarPhoto() {
        this._pendingAvatarPhoto = null;
        this._pendingAvatarPhotoRemoved = true;
        this._syncProfileConfigSwatches();
    }

    _resizeImageToDataUrl(file, maxW, maxH, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error);
            reader.onload = (e) => {
                const img = new Image();
                img.onerror = reject;
                img.onload = () => {
                    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    profileConfigSetTheme(theme) {
        const select = document.getElementById("profile-config-theme");
        if (select) select.value = theme;
        this.applyTheme(theme); // preview inmediato; se persiste al Guardar
        this._syncProfileConfigSwatches();
    }

    // Refleja los valores actuales en el preview del avatar y el estado activo de swatches/tarjetas
    _syncProfileConfigSwatches() {
        const char = document.getElementById("profile-config-avatar-char")?.value || '';
        const color = document.getElementById("profile-config-avatar-color")?.value || '#6c63ff';
        const theme = document.getElementById("profile-config-theme")?.value || 'default';
        const initial = this.activeProfile ? this.activeProfile.name.charAt(0).toUpperCase() : '';

        const preview = document.getElementById("profile-avatar-preview");
        if (preview) {
            preview.style.backgroundColor = color;
            const persistedAvatarChar = this.activeProfile ? this.activeProfile.avatarChar : null;
            const showThemeDefault = theme === 'tango' && !this._pendingAvatarPhoto && !persistedAvatarChar && !this._pendingAvatarCharTouched;
            if (this._pendingAvatarPhoto) {
                preview.textContent = '';
                preview.style.backgroundImage = `url(${this._pendingAvatarPhoto})`;
            } else if (showThemeDefault) {
                preview.textContent = '';
                preview.style.backgroundImage = `url(assets/avatar-default-tango.png)`;
            } else {
                preview.style.backgroundImage = 'none';
                preview.textContent = char || initial || '?';
            }
        }
        const removeBtn = document.getElementById('btn-avatar-photo-remove');
        if (removeBtn) removeBtn.style.display = this._pendingAvatarPhoto ? '' : 'none';

        document.querySelectorAll('#profile-avatar-emoji-presets .pconf-emoji-swatch').forEach(btn => {
            const c = btn.getAttribute('data-char');
            btn.classList.toggle('active', c === char || (c === '' && char === initial));
        });
        document.querySelectorAll('#profile-avatar-color-presets .pconf-color-swatch').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-color').toLowerCase() === color.toLowerCase());
        });
        document.querySelectorAll('#profile-theme-cards .pconf-theme-card').forEach(cardBtn => {
            cardBtn.classList.toggle('active', cardBtn.getAttribute('data-theme') === theme);
        });
    }

    async saveProfileConfig() {
        if (!this.activeProfile) return;
        const p = this.activeProfile;

        const gmailEl = document.getElementById("profile-config-gmail");
        const themeEl = document.getElementById("profile-config-theme");
        const avatarCharEl = document.getElementById("profile-config-avatar-char");
        const avatarColorEl = document.getElementById("profile-config-avatar-color");

        if (gmailEl) p.gmail = gmailEl.value.trim();
        if (themeEl) p.tema = themeEl.value;
        if (avatarCharEl) p.avatarChar = avatarCharEl.value.trim() || p.name.charAt(0).toUpperCase();
        if (avatarColorEl) p.color = avatarColorEl.value;
        if (this._pendingAvatarPhotoRemoved) p.avatarPhoto = null;
        else if (this._pendingAvatarPhoto) p.avatarPhoto = this._pendingAvatarPhoto;

        // Ficha fields
        p.fichaValues = p.fichaValues || {};
        const inputs = document.querySelectorAll(".ficha-field-input");
        inputs.forEach(input => {
            const f = input.getAttribute("data-field");
            p.fichaValues[f] = input.value.trim();
        });

        await this.data.saveProfile(p);
        this.activeProfile = p; // actualizar cache local

        this.applyTheme(p.tema);
        this.updateProfileChip();
        this.showToast("Configuración guardada", "✓");
        
        // Re-renderizar estudio
        if (document.getElementById("view-studio").classList.contains("active")) {
            this.renderStudioSelectorAndDetails();
        }
    }

    async addNewProfile() {
        const nameInput = document.getElementById("new-profile-name");
        const colorInput = document.getElementById("new-profile-color");
        const name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        const profile = {
            id: this.data.generateId("profile"),
            name,
            color: colorInput.value,
            createdAt: new Date().toISOString(),
            avatarChar: name.charAt(0).toUpperCase(),
            gmail: '',
            tema: 'default',
            fichaValues: {},
            nivel: 'Inicial',
            observaciones: ''
        };
        await this.data.saveProfile(profile);
        nameInput.value = "";
        this.renderProfilesModalList();
    }

    async deleteProfile(id) {
        if (!confirm("¿Eliminar este perfil? Se borrarán todos sus datos.")) return;
        await this.data.deleteProfile(id);
        // Borrar profileWeeks de este perfil
        const allPw = await this.data.getAllProfileWeeks();
        for (const pw of allPw.filter(pw => pw.profileId === id)) {
            await this.data.deleteProfileWeek(pw.id);
        }
        if (this.activeProfile && this.activeProfile.id === id) {
            this.activeProfile = null;
            this.data.setActiveProfileId(null);
            this.updateProfileChip();
        }
        this.renderProfilesModalList();
        
        const configTab = document.getElementById("tab-profiles-config");
        if (configTab && !this.activeProfile) {
            configTab.setAttribute("disabled", "true");
            configTab.style.color = "var(--tb-text-muted)";
            configTab.style.cursor = "not-allowed";
        }
    }

    async renameProfileByTeacher(id) {
        const profiles = await this.data.getProfiles();
        const p = profiles.find(x => x.id === id);
        if (!p) return;
        
        const currentAlias = p.displayName || p.name;
        const val = prompt("Renombrar alumno (solo visible para el profesor):", currentAlias);
        if (val === null) return;
        
        p.displayName = val.trim() || null;
        await this.data.saveProfile(p);
        
        this.showToast('Nombre de alumno actualizado', '✓');
        await this.renderBibliotecaView();
    }

    // ==========================================================================
    // Próxima Clase — vista del alumno en Mi Estudio
    // ==========================================================================

    // La "próxima clase" entre TODOS los grupos del alumno (particular + cursos): la que está
    // en curso ahora mismo, o si no hay ninguna, la pendiente más próxima en fecha.

    // Arma el cuerpo (header + contenido por categoría + nota del profesor) de una clase,
    // reusado tanto para la "Próxima Clase" como para el detalle de una clase del historial.


    // ── Historial de clases (repaso, colapsable — no afecta la Rutina Diaria) ──












    // Duda referida a un ítem puntual (ejercicio/partitura/video), no a la sesión en general





    bindEvents() {
        // Navegación de la barra lateral
        const navItems = document.querySelectorAll(".nav-item");
        navItems.forEach(item => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const view = item.getAttribute("data-view");
                this.navigateToView(view);
            });
        });

        // Selectores de Idioma
        document.getElementById("btn-lang-es").addEventListener("click", () => this.changeLanguage("es"));
        document.getElementById("btn-lang-en").addEventListener("click", () => this.changeLanguage("en"));

        // Botón "← Ejercicios" (volver del player)
        const backBtn = document.getElementById("btn-back-to-exercises");
        if (backBtn) backBtn.addEventListener("click", () => this.exitPlayer());

        // Botón "Volver" del visor PDF
        document.getElementById("btn-pdf-close")?.addEventListener("click", () => this.closePDFViewer());

        // Botón "Volver" del visor YouTube
        document.getElementById("btn-yt-close")?.addEventListener("click", () => this.closeYouTubeViewer());

        // Chip de perfil (abrir configuraciones)
        const profileChip = document.getElementById("btn-profile-chip");
        if (profileChip) profileChip.addEventListener("click", () => this.openProfilesModal());

        // Cerrar el panel de notificaciones al clickear afuera
        document.addEventListener("click", (e) => {
            if (!e.target.closest("#notif-panel, #btn-notif-bell")) this.closeNotificationsPanel();
        });

        // Overlay selector de perfiles
        document.getElementById("btn-professor-mode")?.addEventListener("click", () => this.handleProfessorModeClick());
        document.getElementById("btn-manage-profiles")?.addEventListener("click", () => this.openProfilesModal());

        // Modal PIN
        document.getElementById("btn-pin-cancel")?.addEventListener("click", () => this.closePinModal());
        document.getElementById("btn-pin-confirm")?.addEventListener("click", () => this.confirmPin());
        document.getElementById("pin-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") this.confirmPin(); });

        // Modal gestión perfiles
        document.getElementById("btn-profiles-modal-close")?.addEventListener("click", () => this.closeProfilesModal());
        document.getElementById("btn-add-profile")?.addEventListener("click", () => this.addNewProfile());

        // Toggle de la barra lateral colapsable
        const sidebarToggle = document.getElementById("btn-sidebar-toggle");
        if (sidebarToggle) {
            sidebarToggle.addEventListener("click", () => {
                const sidebar = document.querySelector(".sidebar");
                const mainContent = document.querySelector(".main-content");
                const atViewport = document.querySelector(".at-viewport");
                
                const isPlayerActive = !!this.playerActiveItemId && this.atApi;
                
                if (isPlayerActive && atViewport) {
                    // Lock the viewport width to prevent alphaTab intermediate resizes
                    const currentWidth = atViewport.clientWidth;
                    atViewport.style.width = `${currentWidth}px`;
                    atViewport.style.right = "auto";
                }
                
                sidebar.classList.toggle("collapsed");
                
                // Wait for CSS transition to finish before re-rendering alphaTab
                // This prevents the flicker caused by alphaTab recalculating layout mid-transition
                const onTransitionDone = () => {
                    mainContent.removeEventListener("transitionend", onTransitionDone);
                    
                    if (isPlayerActive && atViewport) {
                        // Unlock width and let alphaTab resize/render once at the final size
                        atViewport.style.width = "";
                        atViewport.style.right = "";
                        this.atApi.render();
                    } else if (isPlayerActive) {
                        this.atApi.render();
                    }
                };
                if (mainContent) {
                    mainContent.addEventListener("transitionend", onTransitionDone);
                }
            });
        }
    }

    resetMetronomeVisuals() {
        const indicators = document.querySelectorAll(".beat-indicator");
        indicators.forEach(ind => ind.classList.remove("active"));
    }

    // ==========================================================================
    // Toast de Notificación
    // ==========================================================================
    showToast(message, icon, duration) {
        icon = icon || '✓';
        duration = duration || 4000;
        const toast = document.createElement('div');
        toast.className = 'gs-toast';
        toast.innerHTML = '<span class="gs-toast-icon">' + icon + '</span><span class="gs-toast-msg">' + message + '</span>';
        document.body.appendChild(toast);
        setTimeout(function() {
            toast.classList.add('toast-exit');
            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 320);
        }, duration);
    }

    // ==========================================================================
    // Grupos de Clase
    // ==========================================================================
    _genGroupId() { return 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }


    async sendMeetWhatsApp(groupId) {
        const group = this.data.getAllGroups().find(function(g) { return g.id === groupId; });
        if (!group) return;
        const dayTime = [group.day, group.time].filter(Boolean).join(' a las ');
        // El grupo personal se llama igual que el alumno: no repetir el nombre al escribirle.
        const groupPart = (group.name && !group._personal) ? ' de ' + group.name : '';
        // Sin link de Meet cargado igual se abre WhatsApp para coordinar (sin la línea del link).
        const msg = encodeURIComponent(
            (group.meetLink ? '¡Hola! Te comparto el link para la clase' : '¡Hola! Te escribo por la clase') +
            groupPart +
            (dayTime ? ' (' + dayTime + ')' : '') +
            (group.meetLink ? ':\n' + group.meetLink : '.')
        );

        // Contacto guardado: el del grupo, o el de la Ficha del alumno si es clase individual
        let contact = (group.whatsapp || '').trim();
        if (!contact && (group.memberIds || []).length === 1) {
            const profiles = await this.data.getProfiles();
            const p = profiles.find(x => x.id === group.memberIds[0]);
            contact = ((p && p.whatsapp) || '').trim();
        }

        if (/chat\.whatsapp\.com/.test(contact)) {
            // Link a chat de grupo: WhatsApp no permite prefijar texto ahí, se abre el chat directo
            window.open(/^https?:/.test(contact) ? contact : 'https://' + contact, '_blank');
            return;
        }
        const phone = contact.replace(/[^\d]/g, '');
        window.open('https://wa.me/' + (phone.length >= 8 ? phone : '') + '?text=' + msg, '_blank');
    }

    // ==========================================================================
    // Sistema de Temas Visuales
    // ==========================================================================

    /**
     * Aplica un tema visual al app: tango | folklore | jazz (default/Neutral = sin atributo)
     * Persiste la elección en localStorage.
     */
    applyTheme(theme) {
        if (!['tango', 'folklore', 'jazz'].includes(theme)) {
            document.documentElement.removeAttribute('data-theme');
            return;
        }
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('gs-theme', theme);
        // Marcar swatch activo
        document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
        const active = document.getElementById(`btn-theme-${theme}`);
        if (active) active.classList.add('active');
    }

    /**
     * Carga el tema guardado en localStorage, o Neutral (default) si no hay ninguno.
     */
    loadSavedTheme() {
        const saved = localStorage.getItem('gs-theme') || '';
        this.applyTheme(saved);
    }

    navigateToView(viewId) {
        this._currentView = viewId;
        // Cerrar visores si están abiertos
        if (this._pdfViewerOpen) this.closePDFViewer();
        if (document.getElementById('yt-viewer-panel')?.style.display === 'flex') this.closeYouTubeViewer();



        // Pausar timer activo si salimos de práctica
        if (viewId !== 'practice' && this.activeTimerStep !== null) {
            this.pauseStepTimer(this.activeTimerStep);
        }

        const PROFESSOR_VIEWS = ['dashboard', 'biblioteca', 'teacher-board'];
        const labels = {
            studio: 'Mi Estudio', practice: 'Práctica Diaria',
            'my-library': 'Mi Biblioteca', dashboard: 'Clases',
            biblioteca: 'Biblioteca',
            'teacher-board': 'Clases'
        };
        const labelEl = document.getElementById("header-view-label");

        // Vistas del profesor requieren PIN si el alumno intenta acceder
        if (PROFESSOR_VIEWS.includes(viewId) && !this.isProfessorMode) {
            this.requestProfessorPin(() => {
                this.isProfessorMode = true;
                this.updateSidebarForMode();
                this.navigateToView(viewId);
            });
            return;
        }

        // Ocultar vistas activas
        document.querySelectorAll(".app-view").forEach(view => {
            view.classList.remove("active");
        });
        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.remove("active");
        });

        // Activar vista seleccionada
        // teacher-board vive como tab interna de "Clases": resalta el mismo ítem de nav
        const targetView = document.getElementById(`view-${viewId}`);
        const navViewId = viewId === 'teacher-board' ? 'dashboard' : viewId;
        const targetLink = document.querySelector(`.nav-item[data-view="${navViewId}"]`);

        if (targetView) targetView.classList.add("active");
        if (targetLink) targetLink.classList.add("active");

        if (labelEl) labelEl.textContent = labels[viewId] || '';

        // Mostrar/ocultar tabs de práctica
        const practiceTabs = document.getElementById("practice-cat-tabs");
        if (practiceTabs) practiceTabs.style.display = viewId === 'practice' ? 'flex' : 'none';

        if (viewId === 'practice') {
            this.renderPracticeView();
            // Scroll al acordeón de la semana elegida desde Mi Estudio
            if (this._practiceTargetWeek) {
                const _tid = this._practiceTargetWeek;
                this._practiceTargetWeek = null;
                setTimeout(() => {
                    const el = document.querySelector('[data-week-id="' + _tid + '"]');
                    const container = document.getElementById('practice-content-area');
                    if (el && container) {
                        container.scrollTop = el.offsetTop - 16;
                        const hdr = el.querySelector('.practice-week-header');
                        if (hdr && el.classList.contains('collapsed')) hdr.click();
                    }
                }, 200);
            }
        } else if (viewId === 'studio') {
            this.renderStudioSelectorAndDetails();
        } else if (viewId === 'biblioteca') {
            this.renderBibliotecaView();
        } else if (viewId === 'my-library') {
            this.renderMyLibraryView();
        } else if (viewId === 'dashboard') {
            this.renderDashboardView();
        } else if (viewId === 'teacher-board') {
            this.renderTeacherBoardView();
        }
    }

    updateSidebarForMode() {
        const profSection = document.getElementById('nav-section-professor');
        const studSection = document.getElementById('nav-section-student');
        const profLink = document.getElementById('btn-sidebar-professor');
        if (!profSection || !studSection) return;

        if (this.isProfessorMode) {
            profSection.style.display = '';
            profSection.classList.remove('nav-section-locked');
            studSection.classList.add('nav-section-dimmed');
            if (profLink) profLink.style.display = 'none';
        } else {
            // Con alumno activo la sección Docente se oculta por completo;
            // el acceso queda en el link discreto del pie del sidebar.
            profSection.style.display = 'none';
            studSection.classList.remove('nav-section-dimmed');
            if (profLink) profLink.style.display = 'flex';
        }
    }

    // Selecciona una categoría de práctica

    // Renderiza el área de práctica según la categoría actual

    // ==========================================================================
    // Modo Práctica — nuevos métodos
    // ==========================================================================

    // Última clase finalizada de CADA grupo del alumno activo (particular + cursos) — feed combinado






    _escapeHtml(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ==========================================================================
    // 6. Temporizadores de Práctica
    // ==========================================================================
    /**
     * Inicia el timer ascendente para un paso. Pausa el paso anterior si hay uno activo.
     * Se llama automáticamente al entrar a un paso del wizard.
     */






    /**
     * Guarda el progreso de práctica del día actual en IndexedDB.
     */

    /**
     * Devuelve el tiempo total practicado hoy en segundos.
     */


    // ==========================================================================
    // 7. Registro de Práctica, Compleción y Racha
    // ==========================================================================

    // Mantener alias por compatibilidad con posibles llamadas externas
    // ==========================================================================
    // 10. Biblioteca de Ejercicios (Visualización y Asignación)
    // ==========================================================================




    // =========================================================================
    // Gestión de Clases
    // =========================================================================














    async seedDemoData() {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);
        const lastWeek = new Date(today); lastWeek.setDate(today.getDate() - 7);
        const lastWeekStr = lastWeek.toISOString().slice(0, 10);
        const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const todayName = dayNames[today.getDay()];
        const tomorrowName = dayNames[tomorrow.getDay()];

        // Alumnos — marcados con _isDemo para poder borrarlos después
        for (const p of [
            { id: 'p-demo-1', name: 'Santiago García',   color: '#27ae60', _isDemo: true, createdAt: Date.now() },
            { id: 'p-demo-2', name: 'Valentina López',   color: '#3b82f6', _isDemo: true, createdAt: Date.now() },
            { id: 'p-demo-3', name: 'Matías Herrera',    color: '#8b5cf6', _isDemo: true, createdAt: Date.now() },
            { id: 'p-demo-4', name: 'Lucía Fernández',   color: '#f59e0b', _isDemo: true, createdAt: Date.now() },
        ]) await this.data.saveProfile(p);

        // Grupos — marcados con _isDemo, se suman a los existentes
        const existingGroups = this.data.getAllGroups().filter(g => !g._isDemo);
        this.data.saveGroups([
            ...existingGroups,
            { id: 'grp-demo-1', name: 'Técnica Grupal',     day: todayName,    time: '17:00', meetLink: 'meet.google.com/abc-defg-hij', memberIds: ['p-demo-1','p-demo-2','p-demo-3'], _isDemo: true, createdAt: Date.now() },
            { id: 'grp-demo-2', name: 'Individual — Lucía', day: tomorrowName, time: '16:00', meetLink: '', memberIds: ['p-demo-4'], _isDemo: true, createdAt: Date.now() },
            { id: 'grp-demo-3', name: 'Jazz y Repertorio',  day: 'Miércoles',  time: '18:30', meetLink: 'meet.google.com/xyz-uvwx-yz1', memberIds: ['p-demo-1','p-demo-4'], _isDemo: true, createdAt: Date.now() },
        ]);

        // Clases — marcadas con _isDemo
        this.data.saveClase({
            id: 'clase-demo-0', groupId: 'grp-demo-1', title: 'Técnica Grupal', _isDemo: true,
            date: lastWeekStr, status: 'finalizada', finalizadaAt: Date.now() - 7 * 86400000,
            attendance: { 'p-demo-1': 'presente', 'p-demo-2': 'presente', 'p-demo-3': 'ausente' },
            content: [
                { id: 'ci-d-1', title: 'Escala pentatónica menor', cat: 'Técnica', type: 'text' },
                { id: 'ci-d-2', title: 'Sultans of Swing — intro', cat: 'Repertorio', type: 'text' },
            ],
            categories: ['Técnica','Lectura','Repertorio','Cont. Complementario'],
            objetivos: [
                { id: 'obj-d-1', text: 'Practicar escala pentatónica 10 min/día con metrónomo a 80 BPM' },
                { id: 'obj-d-2', text: 'Memorizar los primeros 8 compases del intro de Sultans of Swing' },
            ],
            resumenProfesor: 'Buena clase. Santiago avanza bien con la pentatónica. Valentina necesita trabajar el tempo. Matías faltó — llamar antes de la próxima clase.',
            resumen: 'Buena clase. Santiago avanza bien con la pentatónica. Valentina necesita trabajar el tempo.',
        });
        this.data.saveClase({
            id: 'clase-demo-1', groupId: 'grp-demo-1', title: 'Técnica Grupal', _isDemo: true,
            date: todayStr, status: 'pendiente',
            attendance: {}, content: [],
            categories: ['Técnica','Lectura','Repertorio','Cont. Complementario'],
            objetivos: [], resumenProfesor: '', resumen: '',
        });
        this.data.saveClase({
            id: 'clase-demo-2', groupId: 'grp-demo-2', title: 'Individual — Lucía', _isDemo: true,
            date: tomorrowStr, status: 'pendiente',
            attendance: {}, content: [],
            categories: ['Técnica','Lectura','Repertorio','Cont. Complementario'],
            objetivos: [], resumenProfesor: '', resumen: '',
        });

        this._currentClaseId = 'clase-demo-1';
        this.showToast('Datos de demo cargados', '✓', 2500);
        this.renderDashboardView();
    }

    async clearDemoData() {
        // Borrar grupos demo
        this.data.saveGroups(this.data.getAllGroups().filter(g => !g._isDemo));
        // Borrar clases demo
        this.data._saveClasesRaw(this.data._getClasesRaw().filter(c => !c._isDemo));
        // Borrar perfiles demo de IndexedDB
        const profiles = await this.data.getProfiles();
        for (const p of profiles.filter(p => p._isDemo)) await this.data.deleteProfile(p.id);
        // Limpiar selección si era demo
        if (this._currentClaseId && this._currentClaseId.startsWith('clase-demo-')) {
            this._currentClaseId = null;
        }
        this.showToast('Datos de demo eliminados', '✓', 2500);
        this.renderDashboardView();
    }






    async renderAssignMatrix() {
        const container = document.getElementById("assign-matrix-container");
        if (!container) return;

        const [weeks, profiles, allProfileWeeks] = await Promise.all([
            this.data.getWeeks(),
            this.data.getProfiles(),
            this.data.getAllProfileWeeks()
        ]);

        if (weeks.length === 0 || profiles.length === 0) {
            container.innerHTML = `<p class="text-muted" style="font-size:13px">${
                weeks.length === 0 ? 'Creá al menos una semana para asignar.' :
                'No hay alumnos creados todavía. Agregá perfiles desde el selector de inicio.'
            }</p>`;
            return;
        }

        const profileHeaders = profiles.map(p => {
            const displayName = p.displayName || p.name || '?';
            return `<th class="assign-matrix-th">
                <span class="assign-matrix-avatar" style="background:${p.color}">${displayName.charAt(0).toUpperCase()}</span>
                <span class="assign-matrix-pname">${this._escapeHtml(displayName)}</span>
            </th>`;
        }).join('');

        const rows = weeks.map(week => {
            const cells = profiles.map(profile => {
                const isAssigned = allProfileWeeks.some(pw => pw.weekId === week.id && pw.profileId === profile.id);
                return `<td class="assign-matrix-cell">
                    <input type="checkbox" class="assign-checkbox"
                        data-week-id="${week.id}" data-profile-id="${profile.id}"
                        ${isAssigned ? 'checked' : ''}>
                </td>`;
            }).join('');
            return `<tr><td class="assign-matrix-week">${this._escapeHtml(week.title)}</td>${cells}</tr>`;
        }).join('');

        container.innerHTML = `
            <div class="assign-matrix-wrap">
                <table class="assign-matrix">
                    <thead><tr>
                        <th class="assign-matrix-th assign-matrix-th-first">Semana</th>
                        ${profileHeaders}
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <p class="assign-save-hint">Los cambios se guardan automáticamente al tildar.</p>
        `;

        container.querySelectorAll('.assign-checkbox').forEach(cb => {
            cb.addEventListener('change', async () => {
                const weekId = cb.getAttribute('data-week-id');
                const profileId = cb.getAttribute('data-profile-id');
                if (cb.checked) {
                    await this.data.saveProfileWeek({
                        id: this.data.generateId('pw'),
                        profileId, weekId,
                        assignedAt: new Date().toISOString()
                    });
                } else {
                    const all = await this.data.getAllProfileWeeks();
                    const match = all.find(pw => pw.weekId === weekId && pw.profileId === profileId);
                    if (match) await this.data.deleteProfileWeek(match.id);
                }
            });
        });
    }

    // ==========================================================================
    // Pantalla de Clases — handlers 3 columnas
    // ==========================================================================
















    // TODO(biblioteca): Los chips de categoría de la biblioteca y el proceso de subida rápida
    // deben rediseñarse cuando se desarrolle el sistema de Biblioteca completo. Los campos
    // musicalStyle/type de los items no coinciden con las categorías de clase (Técnica/Lectura/etc.).
    // Ver también: filterBiblioteca y _uploadLibFile.









    async _handleLibDrop(event) {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        if (!file) return;
        await this._uploadLibFile(file);
    }

    async _handleLibFileInput(event) {
        const file = event.target?.files?.[0];
        if (!file) return;
        await this._uploadLibFile(file);
    }

    async _uploadLibFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const fileType = ['gp','gp4','gp5','gpx'].includes(ext) ? 'score' : 'pdf';
        const buf = await file.arrayBuffer();
        const item = {
            id: this.data.generateId('lib'),
            title: file.name.replace(/\.[^.]+$/,''),
            name: file.name,
            fileType,
            type: fileType,
            fileData: buf,
            bytes: buf,
            createdAt: Date.now()
        };
        await this.data.saveLibraryItem(item);
        this.showToast(`"${item.title}" guardado en biblioteca`, '✓');
        this._renderBibliotecaPanel();
    }

    async _detectLibLink() {
        const input = document.getElementById('bib3-link-input');
        if (!input) return;
        const url = input.value.trim();
        if (!url) return;
        const isYt = url.includes('youtube.com') || url.includes('youtu.be');
        const isSp = url.includes('spotify.com');
        if (!isYt && !isSp) { this.showToast('URL no reconocida', '⚠️'); return; }
        const fileType = isYt ? 'youtube' : 'spotify';
        const title = url.split('/').filter(Boolean).pop()?.split('?')[0] || url;
        const item = {
            id: this.data.generateId('lib'),
            title,
            name: title,
            fileType,
            type: fileType,
            url,
            createdAt: Date.now()
        };
        await this.data.saveLibraryItem(item);
        input.value = '';
        this.showToast(`Link guardado en biblioteca`, '✓');
        this._renderBibliotecaPanel();
    }





    // ==========================================================================
    // Tablero de Control del Docente
    // ==========================================================================



    // Semáforo de atención (alertStatus) — distinto del agrupamiento por actividad (activityBucket).
    // Un alumno puede estar en "Practicó hoy" y aun así tener alertStatus amarillo (ej. consulta pendiente de otra clase).



















    async renderBibliotecaView() {
        const container = document.getElementById('biblioteca-content');
        if (!container) return;
        // Sin "Cargando..." intermedio: pisaba el contenido por milisegundos y parpadeaba al cambiar de pestaña
        const [profiles, items] = await Promise.all([this.data.getProfiles(), this.data.getLibraryItems()]);
        const groups = this.data.getAllGroups();

        const contentHtml = this._bibRenderMain(profiles, groups, items);

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; overflow:hidden">
                <div style="flex:1; overflow:hidden">
                    ${contentHtml}
                </div>
            </div>
        `;

        this._bibBindMainEvents();
    }





    async promoteStudentUploadToGeneral(itemId) {
        const item = await this.data.getLibraryItem(itemId);
        if (!item) return;
        this._bibCatModalData = {
            promotingItemId: item.id,
            type: item.type,
            url: item.url,
            fileData: item.fileData
        };
        this._bibCatModalValues = { category: null };
        const titleEl = document.getElementById('bib-cat-title');
        const infoEl  = document.getElementById('bib-cat-file-info');
        if (titleEl) titleEl.value = item.title;
        if (infoEl)  infoEl.textContent = `Promoviendo carga de alumno · ${item.title}`;
        
        this._toggleCategorizeModalFields(false);
        
        document.getElementById('bib-categorize-modal').style.display = 'flex';
    }

    async deleteStudentUploadByTeacher(itemId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este contenido?')) return;
        const notifications = this.data.getNotifications().filter(n => n.itemId !== itemId);
        this.data.saveNotifications(notifications);
        
        await this.data.deleteLibraryItem(itemId);
        this.showToast('Contenido eliminado', '✓');
        await this._refreshCargasHostView();
    }












    // "Cargas de Alumnos" ahora vive en el Tablero (view-teacher-board), no en Biblioteca.
    // Este helper refresca la vista activa entre ambas, ya que comparten los mismos métodos de render.
    _refreshCargasHostView() {
        const teacherBoardActive = document.getElementById('view-teacher-board')?.classList.contains('active');
        if (teacherBoardActive) return this.renderTeacherBoardView();
        return this.renderBibliotecaView();
    }














    async openLibraryItemById(itemId) {
        const item = await this.data.getLibraryItem(itemId);
        if (!item) return;
        if (item.type === 'score' || item.type === 'gp' || item.type === 'gpx') this.openPlayerForItem(itemId);
        else if (item.type === 'pdf') this.openPDF(itemId);
        else if (item.type === 'youtube') this.openYouTube(itemId);
        else if (item.type === 'spotify') this.openSpotify(itemId);
    }

    // ── Upload / categorización de ítems ──



    _toggleCategorizeModalFields(isStudent) {
        const titleEl = document.getElementById('bib-categorize-title');
        const saveBtn = document.getElementById('bib-cat-save-btn');
        const obsRow = document.getElementById('bib-cat-obs-row');
        const catRow = document.getElementById('bib-cat-category-row');
        const levelRow = document.getElementById('bib-cat-level-row');
        const styleRow = document.getElementById('bib-cat-style-row');

        // Reset values
        const obsInput = document.getElementById('bib-cat-observation');
        if (obsInput) obsInput.value = '';
        this._bibFillCatModalCategories(null);

        const levelGroup = document.getElementById('bib-level-radio-group');
        if (levelGroup) {
            const lvls = this.data.getDefaultLevels();
            levelGroup.innerHTML = lvls.map(lvl => 
                `<label class="bib-radio-opt"><input type="radio" name="bib-level" value="${this._escapeHtml(lvl.toLowerCase())}"> ${this._escapeHtml(lvl)}</label>`
            ).join('');
        }

        const styleGroup = document.getElementById('bib-style-radio-group');
        if (styleGroup) {
            const styles = this.data.getDefaultStyles();
            styleGroup.innerHTML = styles.map(st => 
                `<label class="bib-radio-opt"><input type="radio" name="bib-style" value="${this._escapeHtml(st.toLowerCase())}"> ${this._escapeHtml(st)}</label>`
            ).join('');
        }

        document.querySelectorAll('input[name="bib-level"], input[name="bib-style"]').forEach(r => r.checked = false);

        if (isStudent) {
            if (titleEl) titleEl.textContent = 'Subir Consulta / Material';
            if (saveBtn) saveBtn.textContent = 'Guardar y Enviar';
            if (obsRow) obsRow.style.display = 'block';
            if (catRow) catRow.style.display = 'none';
            if (levelRow) levelRow.style.display = 'none';
            if (styleRow) styleRow.style.display = 'none';
        } else {
            if (titleEl) titleEl.textContent = 'Categorizar ítem';
            if (saveBtn) saveBtn.textContent = 'Guardar en Biblioteca';
            if (obsRow) obsRow.style.display = 'none';
            if (catRow) catRow.style.display = 'block';
            if (levelRow) levelRow.style.display = 'block';
            if (styleRow) styleRow.style.display = 'block';
        }
    }






    // ── Plantillas (editor funcional) ──









    // ── Editor de categorías (global / por alumno / por curso) ──






    // ── Crear Alumno / Curso (self-contained, funcionan desde Biblioteca) ──







    adjustQuickToolsLocation() {
        const quickTools = document.querySelector('.quick-tools-box');
        if (!quickTools) return;
        
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            const mobileContainer = document.getElementById('mobile-quick-tools-container');
            if (mobileContainer && quickTools.parentElement !== mobileContainer) {
                mobileContainer.appendChild(quickTools);
            }
        } else {
            const sidebar = document.querySelector('.sidebar');
            const sidebarFooter = document.querySelector('.sidebar-footer');
            if (sidebar && sidebarFooter && quickTools.parentElement !== sidebar) {
                sidebar.insertBefore(quickTools, sidebarFooter);
            }
        }
    }

    // ==========================================================================
    // Ficha de Alumno - Profesor Modals & Lógica de Asistencia/Reprogramar
    // ==========================================================================
    switchTeacherFichaTab(tab) {
        // 4 pestañas (Pieza 8): un solo panel visible a la vez
        const keys = ['ficha', 'respuestas', 'stats', 'fields'];
        if (!keys.includes(tab)) tab = 'ficha';
        const saveBtn = document.getElementById("btn-tf-ficha-save");

        keys.forEach(k => {
            const btn = document.getElementById(`tf-tab-${k}`);
            const content = document.getElementById(`tf-tab-content-${k}`);
            if (btn) btn.classList.toggle('active', k === tab);
            if (content) content.style.display = k === tab ? 'flex' : 'none';
        });
        // Guardar aplica a los tabs con campos editables
        if (saveBtn) saveBtn.style.display = (tab === 'ficha' || tab === 'respuestas') ? '' : 'none';

        if (tab === 'respuestas') this.renderTeacherFichaFields();
        else if (tab === 'stats') this.renderTeacherFichaStats();
        else if (tab === 'fields') this.renderTeacherFichaFieldsConfig();
    }

    // Nombre con el que el profesor ve al alumno en SUS listas (punto 4): alias privado si existe.
    // El alumno nunca ve este alias — sus vistas siguen usando displayName/name.
    _teacherDisplayName(p) {
        const alias = (p.teacherAlias || '').trim();
        return alias || p.displayName || p.name || '?';
    }

    async openTeacherFichaModal(studentId) {
        const profiles = await this.data.getProfiles();
        const p = profiles.find(x => x.id === studentId);
        if (!p) return;

        this._tfSelectedProfileId = studentId;
        document.getElementById("teacher-ficha-title").textContent = `Ficha de Alumno: ${p.name}`;

        document.getElementById("tf-ficha-gmail").value = p.gmail || '';
        document.getElementById("tf-ficha-name").value = p.name || '';
        document.getElementById("tf-ficha-whatsapp").value = p.whatsapp || '';
        document.getElementById("tf-ficha-nivel").value = p.nivel || 'Inicial';
        document.getElementById("tf-ficha-alias").value = p.teacherAlias || '';
        document.getElementById("tf-ficha-observaciones").value = p.observaciones || '';

        // Chip informativo de grupo(s) y horario
        const gruposEl = document.getElementById("tf-ficha-grupos");
        if (gruposEl) {
            const grupos = this.data.getAllGroups().filter(g => !g._personal && (g.memberIds || []).includes(studentId));
            gruposEl.innerHTML = grupos.length
                ? grupos.map(g => `
                    <div class="tf3-grupo-chip">
                        <span class="tf3-grupo-nombre">${this._escapeHtml(g.name)}</span>
                        ${g.day ? `<span class="tf3-grupo-horario">· ${this._escapeHtml(g.day)}${g.time ? ' ' + this._escapeHtml(g.time.slice(0, 5)) : ''}</span>` : ''}
                    </div>`).join('')
                : '<div class="tf3-grupo-chip"><span class="tf3-grupo-horario">Sin grupo asignado</span></div>';
        }

        // Pre-render de respuestas para que el guardado global las incluya aunque no se visite el tab
        this.renderTeacherFichaFields();
        this.switchTeacherFichaTab('ficha');
        document.getElementById("teacher-ficha-modal-overlay").style.display = "flex";
    }

    closeTeacherFichaModal() {
        document.getElementById("teacher-ficha-modal-overlay").style.display = "none";
        this._tfSelectedProfileId = null;
    }

    async renderTeacherFichaFields() {
        const pid = this._tfSelectedProfileId;
        if (!pid) return;
        const profiles = await this.data.getProfiles();
        const p = profiles.find(x => x.id === pid);
        if (!p) return;

        // Campos 100% data-driven desde "Configurar Campos" (Pieza 8): textareas de 3 filas
        // para respuestas largas; los campos cortos (Edad, País…) se emparejan en filas de 2
        const fields = this.data.getFichaFields();
        const fichaValues = p.fichaValues || {};
        const container = document.getElementById("tf-ficha-dynamic-fields");
        if (!container) return;

        const isShort = f => f.length <= 20 || f.toLowerCase().includes('edad');
        let html = '';
        let shortBuf = [];
        const flushShorts = () => {
            if (!shortBuf.length) return;
            html += `<div style="display:flex; gap:14px;">${shortBuf.join('')}</div>`;
            shortBuf = [];
        };
        fields.forEach(f => {
            const val = fichaValues[f] || "";
            const label = `<label class="dgf-label">${this._escapeHtml(f)}</label>`;
            if (isShort(f)) {
                const type = f.toLowerCase().includes('edad') ? 'number' : 'text';
                shortBuf.push(`<div style="flex:1; min-width:0;">${label}<input type="${type}" class="dgf-input tf-ficha-field-input" data-field="${this._escapeHtml(f)}" value="${this._escapeHtml(val)}"></div>`);
                if (shortBuf.length === 2) flushShorts();
            } else {
                flushShorts();
                html += `<div>${label}<textarea class="dgf-input tf-ficha-field-input" data-field="${this._escapeHtml(f)}" rows="3" style="resize:vertical; line-height:1.5;">${this._escapeHtml(val)}</textarea></div>`;
            }
        });
        flushShorts();
        container.innerHTML = html || '<p class="text-muted" style="font-size:12.5px; font-style:italic; margin:0;">Sin campos configurados. Agregalos en la pestaña "Configurar Campos".</p>';
    }

    async saveTeacherFichaModal() {
        const pid = this._tfSelectedProfileId;
        if (!pid) return;
        const profiles = await this.data.getProfiles();
        const p = profiles.find(x => x.id === pid);
        if (!p) return;

        p.gmail = document.getElementById("tf-ficha-gmail").value.trim();
        p.name = document.getElementById("tf-ficha-name").value.trim();
        p.whatsapp = document.getElementById("tf-ficha-whatsapp").value.trim();
        p.nivel = document.getElementById("tf-ficha-nivel").value;
        p.teacherAlias = document.getElementById("tf-ficha-alias").value.trim();
        p.observaciones = document.getElementById("tf-ficha-observaciones").value.trim();

        // Guardar valores dinámicos de los campos de Ficha
        p.fichaValues = p.fichaValues || {};
        const inputs = document.querySelectorAll(".tf-ficha-field-input");
        inputs.forEach(input => {
            const f = input.getAttribute("data-field");
            p.fichaValues[f] = input.value.trim();
        });

        await this.data.saveProfile(p);
        this.showToast("Ficha del alumno guardada", "✓");
        this.closeTeacherFichaModal();
        this.renderDashboardView();
    }

    async renderTeacherFichaStats() {
        // Solo 3 stat-cards + heatmap (Pieza 8): consultas y archivos viven en "Consultas y Cargas"
        const pid = this._tfSelectedProfileId;
        if (!pid) return;
        const profiles = await this.data.getProfiles();
        const p = profiles.find(x => x.id === pid);
        if (!p) return;

        const streak = this.data.getProfileStreak(pid);
        document.getElementById("tf-stat-streak").textContent = `${streak} día${streak !== 1 ? 's' : ''}`;

        const history = this.data.getProfileHistory(pid);
        const totalMinutes = history.length * 15; // Estimación rápida: 15 mins por día completado
        document.getElementById("tf-stat-time").textContent = totalMinutes >= 60
            ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 ? (totalMinutes % 60) + 'm' : ''}`.trim()
            : `${totalMinutes} min`;

        const clases = this.data.getAllClases();
        const attended = clases.filter(c => (c.attendance || {})[pid] === 'presente').length;
        const absent = clases.filter(c => (c.attendance || {})[pid] === 'ausente').length;
        document.getElementById("tf-stat-attendance").textContent = (attended + absent) > 0 ? `${attended} de ${attended + absent}` : '—';

        this.renderFichaHeatmapGrid(p);
    }

    renderFichaHeatmapGrid(profile) {
        const grid = document.getElementById("tf-ficha-heatmap-grid");
        if (!grid) return;
        grid.innerHTML = "";
        
        const history = this.data.getProfileHistory(profile.id);
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const day = new Date();
            day.setDate(today.getDate() - i);
            
            const year = day.getFullYear();
            const month = String(day.getMonth() + 1).padStart(2, '0');
            const date = String(day.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${date}`;
            
            const dayEl = document.createElement("div");
            dayEl.className = "heatmap-day";
            
            if (history.includes(dateStr)) {
                dayEl.classList.add("completed");
            }
            if (dateStr === this.getTodayString()) {
                dayEl.classList.add("today");
            }
            
            dayEl.title = `${day.toLocaleDateString('es-AR')} - ${history.includes(dateStr) ? 'Practicado' : 'No practicado'}`;
            grid.appendChild(dayEl);
        }
    }

    renderTeacherFichaFieldsConfig() {
        const container = document.getElementById("tf-custom-fields-list");
        if (!container) return;
        const fields = this.data.getFichaFields();
        container.innerHTML = fields.map(f => `
            <div class="row3">
                <span class="row3-name" style="font-weight:500;">${this._escapeHtml(f)}</span>
                <button class="row3-btn danger" onclick="app.deleteCustomFichaField('${this._escapeHtml(f)}')" title="Eliminar campo"><svg width="13" height="13"><use href="#icon-borrar"/></svg></button>
            </div>`).join('') || '<p class="text-muted" style="font-size:12.5px; font-style:italic; margin:0;">No hay campos configurados.</p>';
    }

    addCustomFichaField() {
        const input = document.getElementById("tf-new-field-name");
        if (!input) return;
        const val = input.value.trim();
        if (!val) return;

        const fields = this.data.getFichaFields();
        if (fields.includes(val)) {
            alert("Este campo ya existe.");
            return;
        }

        fields.push(val);
        this.data.setFichaFields(fields);
        input.value = "";
        this.renderTeacherFichaFieldsConfig();
        this.showToast("Campo agregado", "✓");
    }

    deleteCustomFichaField(fieldName) {
        if (!confirm(`¿Eliminar el campo "${fieldName}"? Esto no borrará las respuestas guardadas de los alumnos pero ya no se mostrará el campo.`)) return;
        let fields = this.data.getFichaFields();
        fields = fields.filter(f => f !== fieldName);
        this.data.setFichaFields(fields);
        this.renderTeacherFichaFieldsConfig();
        this.showToast("Campo eliminado", "✓");
    }

}

/**
 * app.js - Lógica principal de Guitar Studio.
 * Controla navegación SPA, internacionalización (ES/EN), temporizadores,
 * metrónomo de UI, persistencia de racha (LocalStorage), base de datos (IndexedDB)
 * para Guitar Pro y la biblioteca de ejercicios.
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
        this.categoryIds = ['technique', 'reading', 'repertoire'];

        // DataService y metrónomo
        this.data = new DataService();
        this.metronome = new Metronome();

        // Perfil activo (alumno o null = modo profesor)
        this.activeProfile = null; // { id, name, color } o null
        this.isProfessorMode = false;
        this._currentClaseId = null; // clase abierta en el tablero
        this._timelineTab = 'hoy';   // tab activo del timeline: 'hoy' | 'manana' | 'semana'
        this._dashActiveTab = 'clase'; // tab activo de creación: 'clase' | 'grupo' | 'plantilla'
        this._libSearch = '';        // búsqueda en biblioteca col 3
        this._libCatFilter = 'todos'; // filtro categoría biblioteca col 3
        this._weekOffset = 0;        // semana relativa al hoy (0 = esta semana, -1 = anterior)
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

        // Estado de práctica: categoría activa y player
        this.currentCategory = 'technique';
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

        // Timer ascendente por categoría (0=technique, 1=reading, 2=repertoire)
        this.timerSeconds = [0, 0, 0];
        this.timerIntervals = [null, null, null];
        this.activeTimerStep = null;
        this.stepCategories = ['technique', 'reading', 'repertoire'];

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
        this.loadTeacherNotesUI();
        await this.renderPracticeView();
        await this.renderStudioSelectorAndDetails();
        this.renderMotivationalPhrase();
        this.updateProfileChip();
        this.checkStreakValidity();
    }

    /**
     * Restaura los tiempos de práctica del día actual desde IndexedDB.
     */
    async restoreTodayTimers() {
        try {
            const log = await this.data.getPracticeLog(this.getTodayString());
            if (log && log.entries) {
                log.entries.forEach(entry => {
                    const catIdx = this.categoryIds.indexOf(entry.category);
                    if (catIdx >= 0) {
                        this.timerSeconds[catIdx] = entry.seconds || 0;
                    }
                });
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
     * Evalúa si la racha sigue vigente según la cadencia semanal que definió el profesor
     * (en vez de exigir práctica todos los días). La racha solo se resetea si, al cerrarse
     * una semana calendario (lunes-domingo), el alumno no llegó a la cantidad de días
     * pactada — o si hubo una semana entera sin ninguna práctica.
     */
    checkStreakValidity() {
        if (!this.lastPracticedDate) {
            this.streak = 0;
            this.saveStreak();
            return;
        }

        const pid = this.activeProfile ? this.activeProfile.id : null;
        const cadence = pid ? this.data.getStreakCadence(pid) : 7;

        const todayStr = this.getTodayString();
        const currentMonday = this.getMondayString(todayStr);
        const lastPracticedMonday = this.getMondayString(this.lastPracticedDate);

        if (lastPracticedMonday === currentMonday) return; // seguimos en la misma semana, nada que evaluar todavía

        const weeksGap = Math.round(
            (new Date(currentMonday) - new Date(lastPracticedMonday)) / (7 * 24 * 60 * 60 * 1000)
        );

        const weekEnd = this.addDaysToDateString(lastPracticedMonday, 6);
        const practicedDaysInLastWeek = this.history.filter(d => d >= lastPracticedMonday && d <= weekEnd).length;
        const metCadence = practicedDaysInLastWeek >= cadence;

        // weeksGap > 1 implica al menos una semana calendario completa sin ninguna práctica registrada
        if (weeksGap > 1 || !metCadence) {
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
            const card = document.createElement("button");
            card.className = "profile-card";
            card.style.setProperty("--pcolor", p.color || "#6c63ff");
            card.innerHTML = `
                <div class="profile-card-avatar">${p.name.charAt(0).toUpperCase()}</div>
                <span class="profile-card-name">${p.name}</span>
            `;
            card.addEventListener("click", () => this.selectProfile(p));
            grid.appendChild(card);
        });

        if (profiles.length === 0) {
            grid.innerHTML = `<p class="text-muted" style="grid-column:1/-1;text-align:center">No hay alumnos creados aún.<br>El profesor puede agregar perfiles abajo.</p>`;
        }
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
        this.navigateToView('studio');
    }

    updateProfileChip() {
        const avatar = document.getElementById("profile-chip-avatar");
        const name = document.getElementById("profile-chip-name");
        if (this.isProfessorMode) {
            if (avatar) avatar.textContent = "P";
            if (name) name.textContent = "Profesor";
            document.getElementById("btn-profile-chip").style.setProperty("--pcolor", "#e84393");
        } else if (this.activeProfile) {
            if (avatar) {
                avatar.textContent = this.activeProfile.avatarChar || this.activeProfile.name.charAt(0).toUpperCase();
                avatar.style.backgroundColor = this.activeProfile.color || "#6c63ff";
            }
            if (name) name.textContent = this.activeProfile.name;
            const chipBtn = document.getElementById("btn-profile-chip");
            if (chipBtn) chipBtn.style.setProperty("--pcolor", this.activeProfile.color || "#6c63ff");
        } else {
            if (avatar) avatar.textContent = "?";
            if (name) name.textContent = "Sin perfil";
        }
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
        this.closePinModal();
        if (this._pinCallback) this._pinCallback(val);
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
        
        // Tema
        const themeSelect = document.getElementById("profile-config-theme");
        if (themeSelect) themeSelect.value = p.tema || 'default';
        
        // Avatar
        const avatarCharInput = document.getElementById("profile-config-avatar-char");
        if (avatarCharInput) avatarCharInput.value = p.avatarChar || p.name.charAt(0).toUpperCase();
        
        const avatarColorInput = document.getElementById("profile-config-avatar-color");
        if (avatarColorInput) avatarColorInput.value = p.color || '#6c63ff';

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
    _getNextClaseForStudent(groups, allClases) {
        const myClases = allClases.filter(c => groups.some(g => g.id === c.groupId));
        const enCurso = myClases.filter(c => c.status === 'en-curso').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        if (enCurso.length) return enCurso[0];
        const pendientes = myClases
            .filter(c => c.status !== 'finalizada' && c.status !== 'en-curso')
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        return pendientes[0] || null;
    }

    // Arma el cuerpo (header + contenido por categoría + nota del profesor) de una clase,
    // reusado tanto para la "Próxima Clase" como para el detalle de una clase del historial.
    async _buildClaseCardBodyHtml(clase, group, opts) {
        opts = opts || {};
        const label = opts.label || 'Próxima Clase';

        const dateLabel = clase.date ? new Date(clase.date + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
        const capDate = dateLabel ? dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1) : '';
        const timePart = group.time ? ' · ' + group.time.slice(0, 5) : '';

        const meetHref = /^https?:/.test(group.meetLink || '') ? group.meetLink : 'https://' + (group.meetLink || '');
        const meetEl = (!opts.readonly && group.meetLink) ? `
            <div class="proxima-meet" style="margin-top: 8px">
                <a href="${this._escapeHtml(meetHref)}" target="_blank" class="btn-pill btn-meet-pill">
                    <svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                    Entrar al Meet
                </a>
            </div>` : '';

        const catConfig = [
            { key: 0, label: 'Técnica',        color: '#a29bfe', borderColor: 'rgba(162,155,254,.2)' },
            { key: 1, label: 'Lectura Musical', color: '#55efc4', borderColor: 'rgba(85,239,196,.2)'  },
            { key: 2, label: 'Repertorio',      color: '#fdcb6e', borderColor: 'rgba(253,203,110,.2)' },
        ];
        const libraryItems = await this.data.getLibraryItems();
        const contentByCat = catConfig.map(cfg => {
            const catMap = { 'Técnica': 0, 'Lectura': 1, 'Lectura Musical': 1, 'Repertorio': 2 };
            const items = (clase.content || []).filter(c => {
                let catVal = c.cat;
                if (typeof catVal === 'string') catVal = catMap[catVal];
                if (catVal === undefined || catVal === null) catVal = 0;
                return catVal === cfg.key;
            });
            if (!items.length) return '';
            const itemsHtml = items.map(c => {
                const libItem = libraryItems.find(it => it.id === c.id) || {};
                const title = libItem.title || c.title || c.name || 'Sin título';
                const fileType = libItem.type || c.fileType || 'gp';

                const iconSvg = fileType === 'youtube'
                    ? `<svg viewBox="0 0 16 16" fill="none" style="width:13px;height:13px;flex-shrink:0;color:#FF0000" stroke="currentColor" stroke-width="1.2"><rect x="2" y="4" width="12" height="9" rx="1.5"/><path d="M6.5 7.5l4 2-4 2V7.5z" fill="currentColor" stroke="none"/></svg>`
                    : `<svg viewBox="0 0 16 16" fill="none" style="width:13px;height:13px;flex-shrink:0" stroke="${cfg.color}" stroke-width="1.5"><path d="M8 2v12M4 6l4-4 4 4"/></svg>`;
                const doubtBtn = opts.readonly ? '' : `<button onclick="event.stopPropagation(); app.sendItemDoubt('${clase.id}','${c.id}')" title="¿Duda con esto?" style="background:none; border:none; cursor:pointer; opacity:.5; font-size:12px; padding:2px; flex-shrink:0" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=.5">💬</button>`;
                return `<div class="pc-item" style="display:flex; align-items:center; justify-content:space-between; gap:6px">
                    <span onclick="app.openLibraryItemById('${c.id}')" style="display:flex; align-items:center; gap:6px; flex:1; min-width:0; cursor:pointer">${iconSvg}${this._escapeHtml(title)}</span>
                    ${doubtBtn}
                </div>`;
            }).join('');
            return `<div class="proxima-cat">
                <div class="pc-label" style="color:${cfg.color}">
                    <div style="width:8px;height:8px;border-radius:50%;background:${cfg.color};flex-shrink:0"></div>
                    ${cfg.label}
                </div>
                <div class="pc-items" style="border-color:${cfg.borderColor}">${itemsHtml}</div>
            </div>`;
        }).join('');

        const notaAlumno = clase.notaAlumno ? `
            <div class="proxima-nota-prof">
                <div class="proxima-nota-label">Nota del Profesor</div>
                <p class="proxima-nota-text">"${this._escapeHtml(clase.notaAlumno)}"</p>
            </div>` : '';

        const hasContent = contentByCat || notaAlumno;

        return `
            <div class="proxima-header">
                <div>
                    <div class="proxima-label">${label}</div>
                    <div class="proxima-title" style="font-size:16px; margin: 2px 0">${this._escapeHtml(group.name || clase.title || 'Clase')}</div>
                    <div class="proxima-meta">${capDate}${timePart}</div>
                </div>
                ${meetEl}
            </div>
            <div class="proxima-body">
                ${contentByCat}
                ${notaAlumno}
                ${!hasContent ? '<p class="text-muted" style="font:italic 13px var(--font-heading,serif); margin:0; padding: 8px 0">El profesor no asignó contenido específico en esta clase.</p>' : ''}
            </div>
        `;
    }

    async renderStudioSelectorAndDetails() {
        const detailsContainer = document.getElementById('studio-class-details-container');
        if (!detailsContainer) return;
        if (!this.activeProfile) return;

        const practiceBtn = `<button class="btn btn-primary" onclick="app.navigateToPractice()" style="width:100%; padding:14px; font-size:15px; font-weight:700; border-radius:10px; background:linear-gradient(135deg, var(--tb-accent), var(--tb-accent-hover)); border:none; box-shadow:0 4px 15px rgba(108,99,255,0.25); display:flex; align-items:center; justify-content:center; gap:8px">
            🚀 Comenzar Práctica Diaria
        </button>`;

        // 1. Obtener TODOS los grupos del alumno (particular + cursos)
        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
        if (groups.length === 0) {
            detailsContainer.innerHTML = '<p class="text-muted" style="padding:16px; text-align:center">No estás asignado a ningún grupo o curso aún.</p>';
            const timeValEl = document.getElementById("studio-total-time-value");
            if (timeValEl) timeValEl.textContent = "0 min";
            this.renderStudioHistoryList();
            return;
        }

        // 2. Calcular la próxima clase entre todos los espacios del alumno
        const allClases = this.data.getAllClases();
        const clase = this._getNextClaseForStudent(groups, allClases);

        if (!clase) {
            detailsContainer.innerHTML = `
                <div class="card proxima-card" style="margin-bottom:0">
                    <div class="proxima-label">Próxima Clase</div>
                    <p class="text-muted" style="padding:8px 0 0 0; margin:0">No tenés ninguna clase programada por ahora. Mientras tanto, seguí con tu Rutina Diaria.</p>
                </div>
                ${practiceBtn}
            `;
            const timeValEl = document.getElementById("studio-total-time-value");
            if (timeValEl) timeValEl.textContent = "0 min";
            this.renderStudioHistoryList();
            return;
        }

        const group = groups.find(g => g.id === clase.groupId) || {};

        // 3. Tiempo total de estudio para esta clase
        const totalPracticeSeconds = await this.getPracticeTimeForClass(clase);
        const totalMinutes = Math.round(totalPracticeSeconds / 60);
        const timeValEl = document.getElementById("studio-total-time-value");
        if (timeValEl) timeValEl.textContent = `${totalMinutes} min`;

        // 4. Renderizar la próxima clase (automática, sin selección manual)
        const bodyHtml = await this._buildClaseCardBodyHtml(clase, group, { label: 'Próxima Clase' });
        detailsContainer.innerHTML = `
            <div class="card proxima-card" style="margin-bottom:0">${bodyHtml}</div>
            ${practiceBtn}
        `;

        this.renderStudioHistoryList();
    }

    // ── Historial de clases (repaso, colapsable — no afecta la Rutina Diaria) ──
    toggleStudioHistory() {
        const listEl = document.getElementById('studio-history-list');
        const chevron = document.getElementById('studio-history-chevron');
        if (!listEl) return;
        const opening = listEl.style.display === 'none';
        listEl.style.display = opening ? 'block' : 'none';
        if (chevron) chevron.style.transform = opening ? 'rotate(180deg)' : '';
        if (opening) this.renderStudioHistoryList();
    }

    toggleStudioHistoryClase(claseId) {
        this._studioHistoryOpenClaseId = this._studioHistoryOpenClaseId === claseId ? null : claseId;
        this.renderStudioHistoryList();
    }

    async renderStudioHistoryList() {
        const listEl = document.getElementById('studio-history-list');
        if (!listEl || !this.activeProfile) return;
        if (listEl.style.display === 'none') return; // colapsado: no hace falta renderizar

        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
        const groupById = {};
        groups.forEach(g => { groupById[g.id] = g; });

        const finalizadas = this.data.getAllClases()
            .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
            .sort((a, b) => (b.finalizadaAt || 0) - (a.finalizadaAt || 0));

        if (!finalizadas.length) {
            listEl.innerHTML = '<p class="text-muted" style="font-size:12px; padding:8px 0; margin:0">Todavía no hay clases finalizadas para repasar.</p>';
            return;
        }

        const itemsHtml = await Promise.all(finalizadas.map(async c => {
            const group = groupById[c.groupId] || {};
            const dateLabel = c.date ? new Date(c.date + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : 'Clase';
            const isOpen = this._studioHistoryOpenClaseId === c.id;
            const detailHtml = isOpen ? await this._buildClaseCardBodyHtml(c, group, { label: 'Repaso', readonly: true }) : '';
            return `<div class="studio-history-item" style="margin-top:6px">
                <button onclick="app.toggleStudioHistoryClase('${c.id}')" style="width:100%; display:flex; justify-content:space-between; align-items:center; gap:8px; background:var(--tb-bg-primary); border:1px solid var(--tb-border); border-radius:8px; padding:8px 12px; cursor:pointer; font-size:12px; color:var(--tb-text-primary)">
                    <span>${this._escapeHtml(group.name || 'Clase')} — ${dateLabel}</span>
                    <span style="opacity:.5; flex-shrink:0">${isOpen ? '▲' : '▼'}</span>
                </button>
                ${isOpen ? `<div class="card" style="margin-top:6px; padding:12px">${detailHtml}</div>` : ''}
            </div>`;
        }));
        listEl.innerHTML = itemsHtml.join('');
    }

    async getPracticeTimeForClass(clase) {
        if (!clase || !this.activeProfile) return 0;
        
        const groupId = clase.groupId;
        const claseAnterior = this.data.getClaseAnterior(groupId, clase.date);
        
        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
        const allClases = this.data.getAllClases();
        const myClases = allClases
            .filter(c => c.groupId === groupId && c.status === 'finalizada')
            .sort((a, b) => {
                const ta = b.finalizadaAt || b.date || '';
                const tb = a.finalizadaAt || a.date || '';
                return tb.localeCompare(ta);
            });
            
        const isLatest = myClases.length > 0 && myClases[0].id === clase.id;
        
        const startDate = claseAnterior ? claseAnterior.date : '1970-01-01';
        const endDate = isLatest ? this.getTodayString() : clase.date;
        
        try {
            const logs = await this.data.getPracticeLogsInRange(startDate, endDate);
            const myLogs = logs.filter(log => log.profileId === this.activeProfile.id || !log.profileId);
            
            let totalSecs = 0;
            myLogs.forEach(log => {
                if (claseAnterior && log.date === claseAnterior.date) return;
                totalSecs += log.totalSeconds || 0;
            });
            
            if (isLatest) {
                const todayStr = this.getTodayString();
                const alreadyLoggedToday = myLogs.find(l => l.date === todayStr);
                if (!alreadyLoggedToday) {
                    const currentSessionSeconds = this.timerSeconds.reduce((a, b) => a + b, 0);
                    totalSecs += currentSessionSeconds;
                }
            }
            
            return totalSecs;
        } catch(e) {
            console.warn("Error calculando tiempo total de estudio:", e);
            return 0;
        }
    }

    async handleDirectUpload(input, type, claseId) {
        const file = input.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const buffer = e.target.result;
            const itemId = this.data.generateId('lib');
            const item = {
                id: itemId,
                title: file.name.replace(/\.[^.]+$/, ''),
                filename: file.name,
                bytes: buffer,
                type: type,
                uploadedAt: Date.now(),
                uploadedBy: this.activeProfile.id,
                claseId: claseId,
                category: 'Técnica', // default
                level: 'inicial',
                style: 'otro'
            };
            
            await this.data.saveLibraryItem(item);
            
            // Add a notification for the teacher
            this.data.addNotification({
                id: this.data.generateId('notif'),
                claseId: claseId,
                studentId: this.activeProfile.id,
                studentName: this.activeProfile.name,
                itemId: itemId,
                itemTitle: item.title,
                type: 'carga_alumno',
                read: false,
                timestamp: new Date().toISOString()
            });
            
            this.showToast('Archivo subido correctamente', '✓');
            input.value = '';
            await this.renderStudioSelectorAndDetails();
        };
        
        reader.readAsArrayBuffer(file);
    }

    showDirectLinkModal(claseId) {
        const url = prompt("Pegá la URL del video de YouTube o canción de Spotify:");
        if (!url) return;
        
        const isYT = url.includes('youtube') || url.includes('youtu.be');
        const isSpotify = url.includes('spotify');
        
        if (!isYT && !isSpotify) {
            alert("Por favor ingresá un link válido de YouTube o Spotify.");
            return;
        }
        
        const type = isYT ? 'youtube' : 'spotify';
        const itemId = this.data.generateId('lib');
        const item = {
            id: itemId,
            title: type === 'youtube' ? 'Video de YouTube (Alumno)' : 'Canción de Spotify (Alumno)',
            url: url.trim(),
            type: type,
            uploadedAt: Date.now(),
            uploadedBy: this.activeProfile.id,
            claseId: claseId,
            category: 'Técnica',
            level: 'inicial',
            style: 'otro'
        };
        
        const title = prompt("Título para este link:", item.title);
        if (title !== null) {
            if (title.trim()) item.title = title.trim();
        }
        
        this.data.saveLibraryItem(item).then(() => {
            this.data.addNotification({
                id: this.data.generateId('notif'),
                claseId: claseId,
                studentId: this.activeProfile.id,
                studentName: this.activeProfile.name,
                itemId: itemId,
                itemTitle: item.title,
                type: 'carga_alumno',
                read: false,
                timestamp: new Date().toISOString()
            });
            this.showToast('Enlace agregado', '✓');
            this.renderStudioSelectorAndDetails();
        });
    }

    async deleteStudentUploadFromClass(claseId, itemId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este contenido?')) return;
        const notifications = this.data.getNotifications().filter(n => n.itemId !== itemId);
        this.data.saveNotifications(notifications);

        await this.data.deleteLibraryItem(itemId);
        this.showToast('Contenido eliminado', '✓');
        await this.renderStudioSelectorAndDetails();
    }

    toggleObjetivo(claseId, objId) {
        if (!this.activeProfile) return;
        const completados = this.data.getObjetivosCompletados(this.activeProfile.id);
        const key = `${claseId}__${objId}`;
        const done = !completados[key];
        this.data.setObjetivoCompletado(this.activeProfile.id, claseId, objId, done);
        const rows = document.querySelectorAll(`.obj-check-row[onclick*="${objId}"]`);
        rows.forEach(row => {
            row.classList.toggle('done', done);
            const cb = row.querySelector('.obj-checkbox');
            if (cb) {
                cb.classList.toggle('checked', done);
                cb.innerHTML = done ? `<svg viewBox="0 0 10 10" fill="none" style="width:9px;height:9px"><path d="M2 5l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
            }
        });
    }

    navigateToPractice() {
        this.navigateToView('practice');
    }



    async sendPracticeDoubt() {
        const txtEl = document.getElementById('practice-doubt-textarea');
        if (!txtEl || !txtEl.value.trim()) return;
        
        if (!this.activeProfile) {
            alert("Iniciá sesión como alumno para enviar consultas.");
            return;
        }
        
        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
        if (groups.length === 0) return;
        const allClases = this.data.getAllClases();
        const myClases = allClases
            .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
            .sort((a, b) => {
                const ta = b.finalizadaAt || b.date || '';
                const tb = a.finalizadaAt || a.date || '';
                return tb.localeCompare(ta);
            });
            
        if (myClases.length === 0) {
            alert("No hay una clase activa donde registrar tu consulta.");
            return;
        }
        
        const clase = myClases[0];
        const text = txtEl.value.trim();
        
        const preg = {
            id: this.data.generateId('preg'),
            text: text,
            date: new Date().toISOString(),
            author: this.activeProfile.name,
            replies: []
        };
        
        this.data.savePreguntaAlumno(this.activeProfile.id, clase.id, preg);
        txtEl.value = '';
        this.showToast('Pregunta enviada al canal de la clase', '✓');
        await this.renderPracticeView();
    }

    // Duda referida a un ítem puntual (ejercicio/partitura/video), no a la sesión en general
    async sendItemDoubt(claseId, itemId) {
        if (!this.activeProfile) {
            alert("Iniciá sesión como alumno para enviar consultas.");
            return;
        }
        const libItems = await this.data.getLibraryItems();
        const item = libItems.find(i => i.id === itemId);
        const itemTitle = item ? item.title : 'este ejercicio';
        const text = prompt(`¿Cuál es tu duda sobre "${itemTitle}"?`);
        if (!text || !text.trim()) return;

        const preg = {
            id: this.data.generateId('preg'),
            text: text.trim(),
            date: new Date().toISOString(),
            author: this.activeProfile.name,
            itemId: itemId,
            itemTitle: itemTitle,
            replies: []
        };
        this.data.savePreguntaAlumno(this.activeProfile.id, claseId, preg);
        this.showToast('Consulta enviada sobre este ejercicio', '✓');
    }

    renderMotivationalPhrase() {
        const phrases = [
            { text: "La práctica no hace la perfección. La práctica consciente hace la perfección.", author: "Vince Lombardi" },
            { text: "Cada nota que tocas hoy es una nota que mañana saldrá sola.", author: "Anónimo" },
            { text: "No practiques hasta que lo hagas bien. Practica hasta que no puedas hacerlo mal.", author: "Harold Craxton" },
            { text: "La música es la aritmética de los sonidos, como la óptica es la geometría de la luz.", author: "Claude Debussy" },
            { text: "Dime y lo olvido. Enséñame y lo recuerdo. Involúcrame y lo aprendo.", author: "Benjamin Franklin" },
            { text: "El talento es más barato que la sal de mesa. Lo que separa al talentoso del exitoso es el trabajo duro.", author: "Stephen King" },
            { text: "Un guitarrista sin disciplina es como una guitarra sin cuerdas.", author: "Anónimo" },
            { text: "La perseverancia es la madre de la buena suerte.", author: "Benjamin Franklin" },
        ];
        const idx = Math.floor(Date.now() / 86400000) % phrases.length; // Cambia cada día
        const p = phrases[idx];
        const textEl = document.getElementById("studio-phrase-text");
        const authorEl = document.getElementById("studio-phrase-author");
        if (textEl) textEl.textContent = `"${p.text}"`;
        if (authorEl) authorEl.textContent = `— ${p.author}`;
    }

    saveStreak() {
        const pid = this.activeProfile ? this.activeProfile.id : null;
        if (pid) {
            this.data.setProfileStreak(pid, this.streak);
            this.data.setProfileLastPracticed(pid, this.lastPracticedDate);
            if (this.lastPracticedDate === this.getTodayString()) {
                this.data.setProfileLastPracticedTime(pid, new Date().toISOString());
            }
            this.data.setProfileHistory(pid, this.history);
        } else {
            this.data.saveStreakData(this.streak, this.lastPracticedDate, this.history);
        }
        this.updateStreakUI();
    }

    updateStreakUI() {
        const countEls = document.querySelectorAll("#streak-count");
        countEls.forEach(el => el.textContent = this.streak);

        const pid = this.activeProfile ? this.activeProfile.id : null;
        const cadence = pid ? this.data.getStreakCadence(pid) : 7;
        const isDaily = cadence >= 7;

        const unitEls = document.querySelectorAll(".studio-streak-unit-b");
        unitEls.forEach(el => el.textContent = isDaily ? "días seguidos" : `días (plan: ${cadence}/sem)`);

        const practicedToday = this.lastPracticedDate === this.getTodayString();
        const descEl = document.getElementById("studio-streak-desc");
        if (descEl) {
            if (practicedToday) {
                descEl.textContent = "¡Excelente trabajo! Ya practicaste hoy. Nos vemos pronto. 🎸";
            } else if (this.streak > 0) {
                descEl.textContent = isDaily
                    ? `Llevas ${this.streak} ${this.streak === 1 ? 'día' : 'días'} seguidos. ¡No pares!`
                    : `Llevas ${this.streak} ${this.streak === 1 ? 'día' : 'días'} practicados cumpliendo tu plan (${cadence}/semana). ¡Seguí así!`;
            } else {
                descEl.textContent = isDaily
                    ? "Toca 15 minutos para encender el fuego de la constancia."
                    : `Tu plan es practicar ${cadence} ${cadence === 1 ? 'día' : 'días'} por semana. ¡Arrancá hoy!`;
            }
        }
    }

    updateProgressUI() {
        const completedCount = this.completedSteps.filter(Boolean).length;
        const percentage = Math.round((completedCount / 3) * 100);

        const pctEl = document.getElementById("progress-percentage");
        if (pctEl) pctEl.textContent = `${percentage}%`;

        const barEl = document.getElementById("studio-progress-bar");
        if (barEl) barEl.style.width = `${percentage}%`;

        this.categoryIds.forEach((cat, i) => {
            const summaryEl = document.getElementById(`summary-cat-${cat}`);
            if (this.completedSteps[i]) {
                if (summaryEl) summaryEl.classList.add("completed");
            } else {
                if (summaryEl) summaryEl.classList.remove("completed");
            }
        });
    }

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

        // Tabs de categoría dentro de la vista práctica (incluye supplementary)
        [...this.categoryIds, 'supplementary'].forEach(cat => {
            const tab = document.getElementById(`pcat-${cat}`);
            if (tab) {
                tab.addEventListener("click", () => this.selectCategory(cat));
            }
        });

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

        // Modal metadatos de biblioteca
        document.getElementById("btn-lib-metadata-save")?.addEventListener("click", () => this.saveLibItemMetadata());
        document.getElementById("btn-lib-metadata-cancel")?.addEventListener("click", () => {
            document.getElementById('lib-metadata-modal').style.display = 'none';
        });

        // Guardar anotaciones del cuaderno
        document.getElementById("btn-save-notes")?.addEventListener("click", () => this.saveTeacherNotes());

        // GP file input (Drag & Drop + browse)
        const dropzone = document.getElementById("upload-dropzone");
        const fileInput = document.getElementById("gp-file-input");
        const btnBrowse = document.getElementById("btn-browse-file");

        if (btnBrowse) btnBrowse.addEventListener("click", () => fileInput.click());
        if (fileInput) {
            fileInput.addEventListener("change", (e) => {
                Array.from(e.target.files).forEach(f => this.handleGPUploadToLibrary(f));
                fileInput.value = "";
            });
        }
        if (dropzone) {
            dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
            dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
            dropzone.addEventListener("drop", (e) => {
                e.preventDefault();
                dropzone.classList.remove("dragover");
                Array.from(e.dataTransfer.files).filter(f => /\.(gp\d?|gpx)$/i.test(f.name))
                    .forEach(f => this.handleGPUploadToLibrary(f));
            });
        }

        // PDF file input
        const pdfDropzone = document.getElementById("upload-pdf-dropzone");
        const pdfInput = document.getElementById("pdf-file-input");
        const btnBrowsePdf = document.getElementById("btn-browse-pdf");

        if (btnBrowsePdf) btnBrowsePdf.addEventListener("click", () => pdfInput.click());
        if (pdfInput) {
            pdfInput.addEventListener("change", (e) => {
                Array.from(e.target.files).forEach(f => this.handlePDFUploadToLibrary(f));
                pdfInput.value = "";
            });
        }
        if (pdfDropzone) {
            pdfDropzone.addEventListener("dragover", (e) => { e.preventDefault(); pdfDropzone.classList.add("dragover"); });
            pdfDropzone.addEventListener("dragleave", () => pdfDropzone.classList.remove("dragover"));
            pdfDropzone.addEventListener("drop", (e) => {
                e.preventDefault();
                pdfDropzone.classList.remove("dragover");
                Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.pdf'))
                    .forEach(f => this.handlePDFUploadToLibrary(f));
            });
        }

        // YouTube URL
        const btnAddYt = document.getElementById("btn-add-youtube");
        if (btnAddYt) btnAddYt.addEventListener("click", () => this.handleAddYouTube());

        // Spotify URL
        const btnAddSpotify = document.getElementById("btn-add-spotify");
        if (btnAddSpotify) btnAddSpotify.addEventListener("click", () => this.handleAddSpotify());

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

    async renderGroupsInNotebook() {
        const container = document.getElementById('groups-list-notebook');
        if (!container) return;
        const groups = this.data.getAllGroups();
        const profiles = await this.data.getProfiles();

        if (groups.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay grupos creados aún.</p>';
            return;
        }
        const self = this;
        container.innerHTML = groups.map(function(g) {
            const members = profiles.filter(function(p) { return (g.memberIds || []).includes(p.id); });
            const avatars = members.slice(0,5).map(function(p) {
                return '<div class="group-member-avatar" style="background:' + (p.color||'#6366f1') + '" title="' + self._escapeHtml(p.name) + '">' + ((p.name||'?')[0].toUpperCase()) + '</div>';
            }).join('');
            const extra = members.length > 5 ? '<div class="group-member-avatar group-member-more">+' + (members.length-5) + '</div>' : '';
            const dayTime = [g.day, g.time].filter(Boolean).join(' · ') || 'Sin horario';
            const meetShort = g.meetLink ? g.meetLink.replace(/^https?:\/\//, '').slice(0,36) + (g.meetLink.length > 40 ? '…' : '') : '';
            const waBtnSvg = '<svg viewBox="0 0 24 24" fill="currentColor" style="width:12px;height:12px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>';
            return '<div class="group-card" data-group-id="' + g.id + '">' +
                '<div class="group-card-top">' +
                  '<div class="group-card-info">' +
                    '<div class="group-card-name">' + self._escapeHtml(g.name) + '</div>' +
                    '<div class="group-card-meta">' + dayTime + ' · ' + members.length + ' alumno' + (members.length !== 1 ? 's' : '') + '</div>' +
                  '</div>' +
                  '<div class="group-card-actions">' +
                    '<button class="btn btn-outline btn-sm" onclick="app.showEditGroupForm(\'' + g.id + '\')">Editar</button>' +
                    '<button class="btn btn-outline btn-sm btn-danger-outline" onclick="app.deleteGroup(\'' + g.id + '\')">Eliminar</button>' +
                  '</div>' +
                '</div>' +
                '<div class="group-card-members">' + avatars + extra +
                  (members.length === 0 ? '<span class="text-muted" style="font-size:12px">Sin alumnos asignados</span>' : '') +
                '</div>' +
                (g.meetLink ? '<div class="group-meet-bar">' +
                  '<span class="group-meet-url">' + self._escapeHtml(meetShort) + '</span>' +
                  '<div class="group-meet-btns">' +
                    '<button class="btn btn-outline btn-sm" onclick="app.copyMeetLink(\'' + g.id + '\')">Copiar link</button>' +
                    '<button class="btn btn-sm group-whatsapp-btn" onclick="app.sendMeetWhatsApp(\'' + g.id + '\')">' + waBtnSvg + ' WhatsApp</button>' +
                  '</div></div>' : '') +
                '</div>';
        }).join('');
    }

    async showNewGroupForm() { await this._showGroupForm(null); }
    async showEditGroupForm(groupId) { await this._showGroupForm(groupId); }

    async _showGroupForm(groupId) {
        const groups = this.data.getAllGroups();
        const existing = groupId ? groups.find(function(g) { return g.id === groupId; }) : null;
        const profiles = await this.data.getProfiles();
        const container = document.getElementById('groups-list-notebook');
        if (!container) return;
        const self = this;

        const dayOptions = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(function(d) {
            return '<option value="' + d + '"' + (existing && existing.day === d ? ' selected' : '') + '>' + d + '</option>';
        }).join('');

        const memberChecks = profiles.map(function(p) {
            const checked = existing && (existing.memberIds||[]).includes(p.id) ? ' checked' : '';
            const displayName = p.displayName || p.name || '?';
            return '<label class="group-member-check">' +
                '<input type="checkbox" name="member" value="' + p.id + '"' + checked + '>' +
                '<div class="group-member-avatar sm" style="background:' + (p.color||'#6366f1') + '">' + (displayName[0].toUpperCase()) + '</div>' +
                '<span>' + self._escapeHtml(displayName) + '</span></label>';
        }).join('');

        container.innerHTML = '<div class="group-form card" id="group-form-card">' +
            '<h4 class="group-form-title">' + (existing ? 'Editar Grupo' : 'Nuevo Grupo') + '</h4>' +
            '<div class="form-group"><label class="form-label">Nombre del grupo</label>' +
            '<input class="form-control" id="gf-name" value="' + self._escapeHtml(existing ? existing.name : '') + '" placeholder="Ej. Folklore Miércoles"></div>' +
            '<div class="group-form-row">' +
            '<div class="form-group" style="flex:1"><label class="form-label">Día</label>' +
            '<select class="form-control" id="gf-day"><option value="">Sin definir</option>' + dayOptions + '</select></div>' +
            '<div class="form-group" style="flex:1"><label class="form-label">Horario</label>' +
            '<input class="form-control" id="gf-time" type="time" value="' + (existing && existing.time ? existing.time : '') + '"></div></div>' +
            '<div class="form-group"><label class="form-label">Link de Google Meet</label>' +
            '<input class="form-control" id="gf-meet" value="' + self._escapeHtml(existing ? (existing.meetLink||'') : '') + '" placeholder="https://meet.google.com/..."></div>' +
            '<div class="form-group"><label class="form-label">Alumnos</label>' +
            '<div class="group-members-grid" id="gf-members">' + (memberChecks || '<p class="text-muted" style="font-size:12px">No hay alumnos creados aún.</p>') + '</div></div>' +
            '<div class="group-form-actions">' +
            '<button class="btn btn-primary" onclick="app._saveGroupForm(\'' + (groupId||'') + '\')">Guardar</button>' +
            '<button class="btn btn-outline" onclick="app.renderGroupsInNotebook()">Cancelar</button>' +
            '</div></div>';

        const nameInput = document.getElementById('gf-name');
        if (nameInput) nameInput.focus();
    }

    async _saveGroupForm(groupId) {
        const name = document.getElementById('gf-name').value.trim();
        if (!name) { this.showToast('Ingresá un nombre para el grupo.', '⚠️', 3000); return; }
        const day      = document.getElementById('gf-day').value;
        const time     = document.getElementById('gf-time').value;
        const meetLink = document.getElementById('gf-meet').value.trim();
        const memberIds = Array.from(document.querySelectorAll('#gf-members input[name="member"]:checked')).map(function(el) { return el.value; });
        const groups = this.data.getAllGroups();
        if (groupId) {
            const idx = groups.findIndex(function(g) { return g.id === groupId; });
            if (idx > -1) groups[idx] = Object.assign({}, groups[idx], { name, day, time, meetLink, memberIds });
        } else {
            groups.push({ id: this._genGroupId(), name, day, time, meetLink, memberIds, createdAt: Date.now() });
        }
        this.data.saveGroups(groups);
        this.showToast(groupId ? 'Grupo actualizado.' : '¡Grupo creado!', '✓');
        await this.renderGroupsInNotebook();
    }

    async deleteGroup(groupId) {
        if (!confirm('¿Eliminar este grupo?')) return;
        this.data.saveGroups(this.data.getAllGroups().filter(function(g) { return g.id !== groupId; }));
        await this.renderGroupsInNotebook();
        this.showToast('Grupo eliminado.', '✓');
    }

    copyMeetLink(groupId) {
        const group = this.data.getAllGroups().find(function(g) { return g.id === groupId; });
        if (!group || !group.meetLink) return;
        const self = this;
        navigator.clipboard.writeText(group.meetLink)
            .then(function() { self.showToast('Link copiado al portapapeles.', '📋'); })
            .catch(function() { self.showToast('Copiá manualmente: ' + group.meetLink, '⚠️', 6000); });
    }

    sendMeetWhatsApp(groupId) {
        const group = this.data.getAllGroups().find(function(g) { return g.id === groupId; });
        if (!group || !group.meetLink) return;
        const dayTime = [group.day, group.time].filter(Boolean).join(' a las ');
        const msg = encodeURIComponent(
            '¡Hola! Te comparto el link para la clase' +
            (group.name ? ' de ' + group.name : '') +
            (dayTime ? ' (' + dayTime + ')' : '') +
            ':\n' + group.meetLink
        );
        window.open('https://wa.me/?text=' + msg, '_blank');
    }

    // ==========================================================================
    // Sistema de Temas Visuales
    // ==========================================================================

    /**
     * Aplica un tema visual al app: tango | folklore | partitura
     * Persiste la elección en localStorage.
     */
    applyTheme(theme) {
        if (!['folklore', 'partitura'].includes(theme)) {
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
     * Carga el tema guardado en localStorage, o aplica tango por defecto.
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

        const PROFESSOR_VIEWS = ['dashboard', 'library', 'biblioteca', 'teacher-board'];
        const labels = {
            studio: 'Mi Estudio', practice: 'Práctica Diaria',
            'my-library': 'Mi Biblioteca', dashboard: 'Clases',
            library: 'Contenido', biblioteca: 'Biblioteca',
            'teacher-board': 'Tablero'
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
        const targetView = document.getElementById(`view-${viewId}`);
        const targetLink = document.querySelector(`.nav-item[data-view="${viewId}"]`);

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
        } else if (viewId === 'library') {
            this.renderLibraryView();
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
        if (!profSection || !studSection) return;

        if (this.isProfessorMode) {
            profSection.classList.remove('nav-section-locked');
            studSection.classList.add('nav-section-dimmed');
        } else {
            profSection.classList.add('nav-section-locked');
            studSection.classList.remove('nav-section-dimmed');
        }
    }

    // Selecciona una categoría de práctica
    selectCategory(cat) {
        const allCats = [...this.categoryIds, 'supplementary'];
        if (!allCats.includes(cat)) return;
        this.currentCategory = cat;

        // Actualizar tabs dentro de la vista práctica
        allCats.forEach(c => {
            const tab = document.getElementById(`pcat-${c}`);
            if (tab) tab.classList.toggle("active", c === cat);
        });

        // Solo arrancar el timer para categorías que cuentan
        if (cat !== 'supplementary') {
            const catIdx = this.categoryIds.indexOf(cat) + 1;
            this.startStepTimer(catIdx);
        }
        this.renderPracticeView();
    }

    // Renderiza el área de práctica según la categoría actual
    async renderPracticeView() {
        const area = document.getElementById("practice-content-area");
        const playerView = document.getElementById("step-view-4");
        if (!area) return;

        // Si el player está activo, no renderizar el área de contenido
        if (this.playerActiveItemId) {
            area.style.display = "none";
            if (playerView) playerView.style.display = "flex";
            return;
        }

        area.style.display = "block";
        if (playerView) playerView.style.display = "none";

        // Sincronizar tabs de categoría (incluye supplementary)
        [...this.categoryIds, 'supplementary'].forEach(c => {
            const tab = document.getElementById(`pcat-${c}`);
            if (tab) tab.classList.toggle("active", c === this.currentCategory);
        });

        const cat = this.currentCategory;
        const isSupplementary = cat === 'supplementary';
        const catIdx = this.categoryIds.indexOf(cat);
        const t = (key) => TRANSLATIONS[this.lang][key] || key;

        let html = '';

        if (isSupplementary) {
            // Cabecera sin timer ni botón de completar
            html = `<div class="practice-category-header practice-supplementary-header">
                <div class="supplementary-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Material opcional — no cuenta en tus estadísticas
                </div>
            </div>`;
        } else {
            const timerSecs = this.timerSeconds[catIdx] || 0;
            // Ring timer setup
            const goalsKey = `gs-pgoals-${this.activeProfile?.id||'def'}`;
            const goals = JSON.parse(localStorage.getItem(goalsKey)||'[15,10,20]');
            const goalMins = goals[catIdx];
            const goalSecs = goalMins * 60;
            
            const remainingSecs = Math.max(0, goalSecs - timerSecs);
            const mm = String(Math.floor(remainingSecs / 60)).padStart(2, '0');
            const ss = String(remainingSecs % 60).padStart(2, '0');
            
            const isCompleted = this.completedSteps[catIdx];
            const isTimerRunning = !!this.timerIntervals[catIdx];
            const goalReached = timerSecs >= goalSecs;
            const r = 80; const circ = +(2*Math.PI*r).toFixed(1);
            const dashOffset = +(circ*(1-Math.min(timerSecs/Math.max(goalSecs,1),1))).toFixed(1);
            const catAccents = ['#a29bfe','#55efc4','#fdcb6e'];
            const accent = catAccents[catIdx] || 'var(--tb-accent)';
            const activeCatsKey = `gs-acats-${this.activeProfile?.id||'def'}`;
            const activeCats = JSON.parse(localStorage.getItem(activeCatsKey)||'[true,true,true]');
            const catLbls = ['Técnica','Lectura','Repertorio'];
            const objHtml = await this._renderPracticeObjectives();
            html = `<div class="practice-split-layout">
              <div class="practice-timer-panel">
                <div class="practice-ring-wrap${isTimerRunning?' ring-running':''}">
                  <svg viewBox="0 0 180 180" style="width:180px;height:180px">
                    <circle cx="90" cy="90" r="${r}" fill="none" stroke="var(--tb-border)" stroke-width="8"/>
                    <circle cx="90" cy="90" r="${r}" fill="none" stroke="${accent}" stroke-width="8"
                      stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}"
                      style="transform:rotate(-90deg);transform-origin:50% 50%;transition:stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)"/>
                  </svg>
                  <div class="practice-ring-center">
                    <div class="practice-ring-time" style="color:${accent}">${mm}:${ss}</div>
                    <div class="practice-ring-label" style="color:${accent}">${goalReached?'¡Meta!':'meta '+goalMins+' min'}</div>
                  </div>
                </div>
                <div style="display:flex;gap:8px;width:100%">
                  <button class="btn btn-primary" id="btn-cat-timer-toggle" style="background:${accent};border-color:${accent};flex:1">
                    ${isTimerRunning ? '⏸ Pausar' : (timerSecs > 0 ? '▶ Continuar' : '▶ Iniciar')}
                  </button>
                  <button class="btn btn-outline btn-sm" id="btn-timer-reset" title="Reiniciar">↺</button>
                </div>
                <div class="practice-goal-row">
                  <span>Meta:</span><span>${goalMins} min</span>
                  <button onclick="app.editPracticeGoal(${catIdx})" class="btn-goal-edit" title="Editar meta">✎</button>
                </div>
                <button class="btn ${isCompleted?'btn-outline':'btn-primary'} practice-complete-btn" id="btn-complete-cat"
                  ${isCompleted?'disabled':''}
                  style="${goalReached&&!isCompleted?'background:rgba(52,199,89,.1);border-color:rgba(52,199,89,.35);color:#34c759;':''}">
                  ${isCompleted ? '✓ Completada' : goalReached ? '🎯 ¡Meta! Completar' : t('btn-complete-category')}
                </button>
                <div style="display:flex;gap:5px;width:100%">
                  ${this.categoryIds.map((c,i)=>`<div style="flex:1;height:4px;border-radius:2px;background:${this.completedSteps[i]?'rgba(52,199,89,.6)':'var(--tb-border)'}"></div>`).join('')}
                </div>
                <div style="font:400 10px Inter,sans-serif;color:var(--tb-text-muted);text-align:center;margin-bottom:12px">${this.completedSteps.filter(Boolean).length}/3 categorías</div>
                
                <!-- Espacio para escribir dudas -->
                <div class="card practice-doubt-card" style="width:100%; border:1px solid var(--tb-border); padding:12px; border-radius:8px; background:var(--tb-bg-secondary); box-sizing:border-box">
                    <h4 style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--tb-text-muted); margin:0 0 6px 0; text-align:left">¿Tenés dudas?</h4>
                    <textarea id="practice-doubt-textarea" placeholder="Escribí tu consulta aquí..." rows="2" style="width:100%; background:var(--tb-bg-primary); border:1px solid var(--tb-border); border-radius:6px; color:var(--tb-text-primary); padding:6px; font-size:12px; font-family:var(--font-primary); resize:vertical; box-sizing:border-box; outline:none"></textarea>
                    <button class="btn btn-primary btn-sm" onclick="app.sendPracticeDoubt()" style="width:100%; margin-top:8px; font-size:11px; padding:6px; background:${accent}; border-color:${accent}">Enviar Consulta</button>
                </div>
              </div>
              <div class="practice-content-right">
                ${objHtml}
                <div class="practice-cats-config-bar">
                  <span>Activas:</span>
                  ${catLbls.map((l,i)=>`<button class="practice-cat-toggle${activeCats[i]?' active':''}" onclick="app.togglePracticeCat(${i})">${l}</button>`).join('')}
                </div>`;
        }

        // Cargar los ítems a practicar para esta categoría
        let resolvedItems = [];
        if (isSupplementary) {
            try {
                const allLib = await this.data.getLibraryItems();
                resolvedItems = allLib.filter(item => item.category === 'supplementary');
            } catch(e) { console.warn(e); }
        } else {
            // Rutina Diaria = feed combinado: última clase finalizada de CADA espacio del alumno (particular + cursos)
            const entries = this._getLatestFinalizedClasesPerGroup();
            const multiGroup = entries.length > 1;
            const catMap = { 'Técnica': 0, 'Lectura': 1, 'Lectura Musical': 1, 'Repertorio': 2 };
            const catItemsTagged = [];
            entries.forEach(({ group, clase }) => {
                (clase.content || []).forEach(item => {
                    let catVal = item.cat;
                    if (typeof catVal === 'string') catVal = catMap[catVal];
                    if (catVal === undefined || catVal === null) catVal = 0;
                    if (catVal === catIdx) catItemsTagged.push({ cItem: item, groupName: group.name, claseId: clase.id });
                });
            });
            try {
                const allLib = await this.data.getLibraryItems();
                resolvedItems = catItemsTagged
                    .map(({ cItem, groupName, claseId }) => {
                        const li = allLib.find(l => l.id === cItem.id);
                        return li ? { ...li, _origin: multiGroup ? groupName : null, _claseId: claseId } : null;
                    })
                    .filter(Boolean);
            } catch(e) { console.warn(e); }
        }

        if (resolvedItems.length === 0) {
            const emptyMsg = isSupplementary
                ? (this.lang === 'es'
                    ? 'No hay material complementario asignado todavía.'
                    : 'No supplementary material assigned yet.')
                : t('practice-empty-state');
            html += `<div class="practice-empty-state">
                <p class="text-muted">${emptyMsg}</p>
            </div>`;
        } else {
            const typeGroups = [
                { key: 'score',   label: 'Partituras',  icon: 'fa-guitar',    color: 'var(--tb-accent)',  action: (id) => `app.openPlayerForItem('${id}')` },
                { key: 'pdf',     label: 'PDFs',        icon: 'fa-file-pdf',  color: '#e53e3e',           action: (id) => `app.openPDF('${id}')` },
                { key: 'youtube', label: 'Videos',      icon: 'fa-youtube',   color: '#FF0000',           action: (id) => `app.openYouTube('${id}')` },
                { key: 'spotify', label: 'Spotify',     icon: 'fa-spotify',   color: '#1DB954',           action: (id) => `app.openSpotify('${id}')` },
            ];

            html += `<div class="practice-items-card" style="background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:16px">`;
            
            typeGroups.forEach(({ key, label, icon, color, action }) => {
                const group = resolvedItems.filter(i => i.type === key);
                if (group.length === 0) return;

                html += `<div class="week-type-section" style="margin:0">
                    <div class="week-type-header" style="font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--tb-text-muted); display:flex; align-items:center; gap:8px; margin-bottom:8px">
                        <i class="fas ${icon}" style="color:${color}"></i>
                        <span>${label}</span>
                    </div>
                    <ul class="week-type-list" style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:6px">`;

                group.forEach(item => {
                    const originBadge = item._origin ? `<span class="week-type-item-origin" style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.03em; color:var(--tb-text-muted); margin-right:8px">${this._escapeHtml(item._origin)}</span>` : '';
                    const doubtBtn = item._claseId ? `<button onclick="event.stopPropagation(); app.sendItemDoubt('${item._claseId}','${item.id}')" title="¿Duda con esto?" style="background:none; border:none; cursor:pointer; opacity:.5; font-size:13px; padding:2px; flex-shrink:0" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=.5">💬</button>` : '';
                    html += `<li class="week-type-item" onclick="${action(item.id)}" style="background:var(--tb-bg-primary); border:1px solid var(--tb-border); border-radius:8px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:pointer; transition:transform .2s">
                        <span class="week-type-item-title" style="font-weight:500; font-size:13px">${originBadge}${this._escapeHtml(item.title)}</span>
                        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0">
                            ${doubtBtn}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;opacity:.4"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    </li>`;
                });

                html += `</ul></div>`;
            });
            
            html += `</div>`;
        }

        if (!isSupplementary) html += '</div></div>'; // close practice-content-right + practice-split-layout
        area.innerHTML = html;

        // Supplementary: sin timer ni complete button
        if (isSupplementary) return;

        // Bind timer toggle
        const timerBtn = document.getElementById("btn-cat-timer-toggle");
        if (timerBtn) timerBtn.addEventListener("click", () => this.toggleTimer(catIdx + 1));
        // Bind reset
        const resetBtn = document.getElementById("btn-timer-reset");
        if (resetBtn) resetBtn.addEventListener("click", () => {
            this.timerSeconds[catIdx] = 0;
            this.renderPracticeView();
        });

        // Bind complete button
        const isCompleted = this.completedSteps[catIdx];
        const completeBtn = document.getElementById("btn-complete-cat");
        if (completeBtn && !isCompleted) {
            completeBtn.addEventListener("click", () => this.completeCategory(catIdx));
        }
    }

    // ==========================================================================
    // Modo Práctica — nuevos métodos
    // ==========================================================================

    // Última clase finalizada de CADA grupo del alumno activo (particular + cursos) — feed combinado
    _getLatestFinalizedClasesPerGroup() {
        if (!this.activeProfile) return [];
        const groups = this.data.getAllGroups().filter(g => (g.memberIds||[]).includes(this.activeProfile.id));
        const allClases = this.data.getAllClases();
        return groups.map(group => {
            const clases = allClases
                .filter(c => c.groupId === group.id && c.status === 'finalizada')
                .sort((a,b) => (b.finalizadaAt||0) - (a.finalizadaAt||0));
            return clases.length ? { group, clase: clases[0] } : null;
        }).filter(Boolean);
    }

    async _renderPracticeObjectives() {
        if (!this.activeProfile || this.isProfessorMode) return '';
        const entries = this._getLatestFinalizedClasesPerGroup();
        if (!entries.length) return '';
        const multiGroup = entries.length > 1;
        const completados = this.data.getObjetivosCompletados(this.activeProfile.id);

        let totalObjetivos = 0, totalDone = 0, itemsHtml = '';
        entries.forEach(({ group, clase }) => {
            const objetivos = clase.objetivos || [];
            objetivos.forEach(o => {
                totalObjetivos++;
                const key = `${clase.id}__${o.id}`;
                const isDone = !!completados[key];
                if (isDone) totalDone++;
                const originBadge = multiGroup ? `<span class="obj-origin" style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.03em; color:var(--tb-text-muted); margin-right:8px">${this._escapeHtml(group.name)}</span>` : '';
                itemsHtml += `<div class="obj-check-row${isDone?' done':''}" onclick="app.toggleObjetivo('${clase.id}','${o.id}')">
                    <div class="obj-checkbox${isDone?' checked':''}">
                        ${isDone?'<svg viewBox="0 0 10 10" fill="none" style="width:9px;height:9px"><path d="M2 5l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>':''}
                    </div>
                    <span class="obj-text">${originBadge}${this._escapeHtml(o.text)}</span>
                </div>`;
            });
        });
        if (!totalObjetivos) return '';

        return `<div class="practice-objectives-card">
            <div class="practice-objectives-header">
                <span>Objetivos del profesor</span>
                <span>${totalDone}/${totalObjetivos} completados</span>
            </div>
            <div class="practice-objectives-list">${itemsHtml}</div>
        </div>`;
    }

    editPracticeGoal(catIdx) {
        const key = `gs-pgoals-${this.activeProfile?.id||'def'}`;
        const goals = JSON.parse(localStorage.getItem(key)||'[15,10,20]');
        const val = prompt(`Meta para esta categoría (minutos):`, goals[catIdx]);
        if (!val) return;
        goals[catIdx] = Math.max(1, Math.min(120, parseInt(val, 10)||15));
        localStorage.setItem(key, JSON.stringify(goals));
        this.renderPracticeView();
    }

    togglePracticeCat(idx) {
        const key = `gs-acats-${this.activeProfile?.id||'def'}`;
        const cats = JSON.parse(localStorage.getItem(key)||'[true,true,true]');
        cats[idx] = !cats[idx];
        localStorage.setItem(key, JSON.stringify(cats));
        this.renderPracticeView();
    }



    _escapeHtml(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Abre el player AlphaTab para un ítem de la biblioteca
    async openPlayerForItem(libraryItemId) {
        this.closePDFViewer();
        const item = await this.data.getLibraryItem(libraryItemId);
        if (!item || (item.type !== 'score' && item.type !== 'gp' && item.type !== 'gpx')) return;

        this.playerActiveItemId = libraryItemId;

        // Mostrar back button, ocultar category tabs de práctica
        const backBtn = document.getElementById("btn-back-to-exercises");
        if (backBtn) backBtn.style.display = "flex";
        document.querySelectorAll(".pcat-tab").forEach(t => t.style.display = "none");

        // Cambiar a step-view-4
        const contentArea = document.getElementById("practice-content-area");
        const playerView = document.getElementById("step-view-4");
        if (contentArea) contentArea.style.display = "none";
        if (playerView) {
            playerView.style.display = "flex";
            playerView.classList.add("active");
        }

        // Inicializar y cargar
        await this.initAlphaTabPlayerIfNeeded(item);
        if (this.atApi && this.atCurrentItemId !== libraryItemId) {
            const bytes = item.bytes || item.fileData || item.data;
            this.atApi.load(new Uint8Array(bytes));
            this.atCurrentItemId = libraryItemId;
        }

        // Render si ya estaba inicializado
        if (this.atApi) {
            setTimeout(() => this.atApi.render(), 100);
        }
    }

    // Vuelve de la vista del player a la lista de ejercicios
    exitPlayer() {
        this.playerActiveItemId = null;

        const backBtn = document.getElementById("btn-back-to-exercises");
        if (backBtn) backBtn.style.display = "none";
        document.querySelectorAll(".pcat-tab").forEach(t => t.style.display = "");

        const playerView = document.getElementById("step-view-4");
        if (playerView) {
            playerView.style.display = "none";
            playerView.classList.remove("active");
        }

        const contentArea = document.getElementById("practice-content-area");
        if (contentArea) contentArea.style.display = "block";

        if (this.atApi) this.atApi.stop();

        this.renderPracticeView();
    }

    // Abre un PDF en nueva pestaña (e integra el visor)
    async openPDF(libraryItemId) {
        if (this.playerActiveItemId) this.exitPlayer();
        const item = await this.data.getLibraryItem(libraryItemId);
        const bytes = item ? (item.bytes || item.fileData || item.data) : null;
        if (!item || !bytes) return;

        // Revocar el blob URL anterior antes de crear uno nuevo
        if (this._pdfBlobUrl) {
            try {
                URL.revokeObjectURL(this._pdfBlobUrl);
            } catch(e) { console.warn(e); }
        }

        // Convertir bytes a Blob de forma ultra resiliente
        let blob = null;
        if (bytes instanceof Blob) {
            blob = bytes;
        } else if (bytes instanceof ArrayBuffer) {
            blob = new Blob([bytes], { type: 'application/pdf' });
        } else if (ArrayBuffer.isView(bytes)) {
            blob = new Blob([bytes], { type: 'application/pdf' });
        } else if (typeof bytes === 'string') {
            let base64 = bytes;
            if (base64.startsWith('data:')) {
                const parts = base64.split(',');
                base64 = parts[1] || '';
            }
            try {
                const binStr = atob(base64);
                const len = binStr.length;
                const arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    arr[i] = binStr.charCodeAt(i);
                }
                blob = new Blob([arr], { type: 'application/pdf' });
            } catch (e) {
                console.error("Error al decodificar PDF en formato base64", e);
            }
        } else if (bytes && typeof bytes === 'object') {
            if (bytes.type === 'Buffer' && Array.isArray(bytes.data)) {
                blob = new Blob([new Uint8Array(bytes.data)], { type: 'application/pdf' });
            } else if (Array.isArray(bytes)) {
                blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
            } else {
                try {
                    const vals = Object.keys(bytes)
                        .filter(k => !isNaN(k))
                        .sort((a,b) => Number(a) - Number(b))
                        .map(k => bytes[k]);
                    if (vals.length > 0) {
                        blob = new Blob([new Uint8Array(vals)], { type: 'application/pdf' });
                    }
                } catch (e) {
                    console.error("Error al procesar objeto de bytes del PDF", e);
                }
            }
        }

        if (!blob) {
            alert("No se pudo previsualizar el PDF: el formato del archivo es inválido o está corrupto.");
            return;
        }

        this._pdfBlobUrl = URL.createObjectURL(blob);

        const iframe = document.getElementById('pdf-iframe');
        const fallback = document.getElementById('pdf-mobile-fallback');
        const pdfViewerEnabled = navigator.pdfViewerEnabled || false;

        if (pdfViewerEnabled) {
            if (iframe) {
                iframe.style.display = 'block';
                iframe.src = this._pdfBlobUrl;
            }
            if (fallback) fallback.style.display = 'none';
        } else {
            if (iframe) {
                iframe.style.display = 'none';
                iframe.src = '';
            }
            if (fallback) {
                fallback.style.display = 'flex';
                const fallbackBtn = document.getElementById('btn-pdf-fallback-open');
                if (fallbackBtn) {
                    fallbackBtn.onclick = () => window.open(this._pdfBlobUrl, '_blank');
                }
            } else {
                window.open(this._pdfBlobUrl, '_blank');
                return;
            }
        }

        const titleEl = document.getElementById('pdf-viewer-title');
        if (titleEl) titleEl.textContent = item.title || 'Documento';

        // Enlazar botón de apertura en nueva pestaña
        const openTabBtn = document.getElementById('btn-pdf-open-tab');
        if (openTabBtn) {
            openTabBtn.onclick = () => window.open(this._pdfBlobUrl, '_blank');
        }

        const panel = document.getElementById('pdf-viewer-panel');
        if (panel) panel.style.display = 'flex';
        this._pdfViewerOpen = true;
    }

    closePDFViewer() {
        const panel = document.getElementById('pdf-viewer-panel');
        if (panel) panel.style.display = 'none';
        const iframe = document.getElementById('pdf-iframe');
        if (iframe) iframe.src = '';
        this._pdfViewerOpen = false;
        // NOTA: No revocamos URL.revokeObjectURL(this._pdfBlobUrl) inmediatamente
        // para permitir que siga cargada si el usuario la abrió en una pestaña externa.
        // Será revocada al abrir el siguiente PDF.
    }

    async openYouTube(libraryItemId) {
        const item = await this.data.getLibraryItem(libraryItemId);
        if (!item || !item.url) return;
        window.open(item.url, '_blank');
    }

    _buildYouTubeEmbedUrl(url) {
        try {
            const u = new URL(url);
            const origin = encodeURIComponent(location.origin);

            // Playlist sin video específico
            const listId = u.searchParams.get('list');
            const videoId = u.searchParams.get('v')
                || url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)?.[1]
                || url.match(/\/shorts\/([A-Za-z0-9_-]{11})/)?.[1]
                || url.match(/\/embed\/([A-Za-z0-9_-]{11})/)?.[1];

            if (videoId && listId) {
                return `https://www.youtube.com/embed/${videoId}?list=${listId}&autoplay=1&origin=${origin}`;
            }
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&origin=${origin}`;
            }
            if (listId) {
                return `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1&origin=${origin}`;
            }
            return null;
        } catch {
            return null;
        }
    }

    closeYouTubeViewer() {
        document.getElementById('yt-viewer-panel').style.display = 'none';
        document.getElementById('yt-player-wrap').innerHTML = '';
        document.getElementById('yt-embed-error').style.display = 'none';
    }

    // Abre Spotify en nueva pestaña
    async openSpotify(libraryItemId) {
        const item = await this.data.getLibraryItem(libraryItemId);
        if (!item || !item.url) return;
        window.open(item.url, '_blank');
    }

    // Renderiza la biblioteca en el Cuaderno
    async renderLibraryInNotebook() {
        const container = document.getElementById("library-items-list");
        if (!container) return;
        const t = (key) => TRANSLATIONS[this.lang][key] || key;

        const [items, weeks, allWeekItems] = await Promise.all([
            this.data.getLibraryItems(),
            this.data.getWeeks(),
            this.data.getAllWeekItems()
        ]);

        if (items.length === 0) {
            container.innerHTML = `<p class="text-muted">${t('no-library-items')}</p>`;
            return;
        }

        const typeIcon = { score: 'fa-guitar', pdf: 'fa-file-pdf', youtube: 'fa-youtube', spotify: 'fa-spotify' };
        const typeColor = { score: 'var(--tb-accent)', pdf: '#e53e3e', youtube: '#FF0000', spotify: '#1DB954' };

        const levelLabel = { inicial: 'Inicial', intermedio: 'Intermedio', avanzado: 'Avanzado' };
        const exTypeLabel = { tecnica: 'Técnica', lectura: 'Lectura', repertorio: 'Repertorio', teoria: 'Teoría', improvisacion: 'Improvisación' };
        const styleLabel = { tango: 'Tango', folklore: 'Folklore', jazz: 'Jazz', clasico: 'Clásico', rock: 'Rock', pop: 'Pop', bossa: 'Bossa Nova', flamenco: 'Flamenco', otro: 'Otro' };

        container.innerHTML = items.map(item => {
            const weekOptions = weeks.map(w => {
                const assigned = allWeekItems.find(wi => wi.libraryItemId === item.id && wi.weekId === w.id);
                return `<option value="${w.id}" ${assigned ? 'selected' : ''}>${this._escapeHtml(w.title)}</option>`;
            }).join('');

            const catLabels = {
                technique: t('cat-technique'), reading: t('cat-reading'),
                repertoire: t('cat-repertoire'), supplementary: 'Complementario'
            };
            const wi = allWeekItems.find(wi => wi.libraryItemId === item.id);
            const catOptions = [...this.categoryIds, 'supplementary'].map(cat => {
                return `<option value="${cat}" ${wi && wi.category === cat ? 'selected' : ''}>${catLabels[cat] || cat}</option>`;
            }).join('');

            const isMedia = item.type === 'youtube' || item.type === 'spotify';
            const metaTags = [
                item.level ? `<span class="lib-meta-tag lib-meta-level">${levelLabel[item.level] || item.level}</span>` : '',
                !isMedia && item.exerciseType ? `<span class="lib-meta-tag lib-meta-extype">${exTypeLabel[item.exerciseType] || item.exerciseType}</span>` : '',
                isMedia && item.musicalStyle ? `<span class="lib-meta-tag lib-meta-style">${styleLabel[item.musicalStyle] || item.musicalStyle}</span>` : '',
            ].filter(Boolean).join('');

            return `<div class="library-item-row${wi ? ' assigned' : ''}" data-item-id="${item.id}" data-assigned="${wi ? 'true' : 'false'}">
                <div class="library-item-icon" style="color:${typeColor[item.type] || 'var(--tb-text-secondary)'}">
                    <i class="fas ${typeIcon[item.type] || 'fa-file'}"></i>
                </div>
                <div class="library-item-info">
                    <span class="library-item-title">${this._escapeHtml(item.title)}</span>
                    <div class="lib-meta-tags">${metaTags || '<span class="lib-meta-empty">Sin clasificar</span>'}</div>
                </div>
                <div class="library-item-assign">
                    <select class="form-select-sm lib-week-select" data-item-id="${item.id}">
                        <option value="">— ${t('lbl-week-assign')} —</option>
                        ${weekOptions}
                    </select>
                    <select class="form-select-sm lib-cat-select" data-item-id="${item.id}">
                        ${catOptions}
                    </select>
                    <button class="btn btn-outline btn-sm lib-assign-btn" data-item-id="${item.id}">Asignar</button>
                </div>
                <button class="btn btn-outline btn-sm" onclick="app.editLibraryItem('${item.id}')" title="Editar detalles">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn btn-text btn-sm" onclick="app.deleteLibraryItem('${item.id}')" style="color:var(--tb-accent)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
        }).join('');

        // Bind assign buttons
        container.querySelectorAll('.lib-assign-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.getAttribute('data-item-id');
                const row = btn.closest('.library-item-row');
                const weekId = row.querySelector('.lib-week-select').value;
                const category = row.querySelector('.lib-cat-select').value;
                if (!weekId) { alert(this.lang === 'es' ? 'Seleccioná una semana primero.' : 'Select a week first.'); return; }
                // Remove existing weekItem for this library item in this week
                const existing = allWeekItems.find(wi => wi.libraryItemId === itemId && wi.weekId === weekId);
                if (existing) await this.data.deleteWeekItem(existing.id);
                // Create new weekItem
                await this.data.saveWeekItem({
                    id: this.data.generateId('wi'),
                    weekId, libraryItemId: itemId, category, addedAt: Date.now()
                });
                this.renderLibraryInNotebook();
                this.renderPracticeView();
            });
        });
    }

    async deleteLibraryItem(itemId) {
        const t = (key) => TRANSLATIONS[this.lang][key] || key;
        if (!confirm(t('confirm-delete-library-item'))) return;
        // Also remove all weekItems referencing this item
        const allWI = await this.data.getAllWeekItems();
        await Promise.all(allWI.filter(wi => wi.libraryItemId === itemId).map(wi => this.data.deleteWeekItem(wi.id)));
        await this.data.deleteLibraryItem(itemId);
        this.renderLibraryInNotebook();
        this.renderPracticeView();
    }

    // Sube un archivo GP a la biblioteca
    async handleGPUploadToLibrary(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const item = {
                id: this.data.generateId('lib'),
                type: 'score',
                title: file.name.replace(/\.[^.]+$/, ''),
                filename: file.name,
                bytes: e.target.result,
                uploadedAt: Date.now(),
                categories: ['repertoire']
            };
            await this.data.saveLibraryItem(item);
            this.renderLibraryInNotebook();
            this.showLibItemMetadataModal(item, true);
        };
        reader.readAsArrayBuffer(file);
    }

    // Sube un PDF a la biblioteca
    async handlePDFUploadToLibrary(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const item = {
                id: this.data.generateId('lib'),
                type: 'pdf',
                title: file.name.replace(/\.pdf$/i, ''),
                filename: file.name,
                bytes: e.target.result,
                uploadedAt: Date.now(),
                categories: []
            };
            await this.data.saveLibraryItem(item);
            this.renderLibraryInNotebook();
            this.showLibItemMetadataModal(item, true);
        };
        reader.readAsArrayBuffer(file);
    }

    // Agrega una URL de YouTube a la biblioteca
    async handleAddYouTube() {
        const input = document.getElementById("yt-url-input");
        const url = (input ? input.value.trim() : '');
        if (!url) return;
        const item = {
            id: this.data.generateId('lib'),
            type: 'youtube',
            title: url,
            url,
            uploadedAt: Date.now(),
            categories: []
        };
        await this.data.saveLibraryItem(item);
        if (input) input.value = '';
        this.showLibItemMetadataModal(item, true);
    }

    // Agrega una URL de Spotify a la biblioteca
    async handleAddSpotify() {
        const input = document.getElementById("spotify-url-input");
        const url = (input ? input.value.trim() : '');
        if (!url) return;
        const item = {
            id: this.data.generateId('lib'),
            type: 'spotify',
            title: url,
            url,
            uploadedAt: Date.now(),
            categories: []
        };
        await this.data.saveLibraryItem(item);
        if (input) input.value = '';
        this.showLibItemMetadataModal(item, true);
    }

    showLibItemMetadataModal(item, isNew = false) {
        const modal = document.getElementById('lib-metadata-modal');
        if (!modal) return;

        document.getElementById('lib-metadata-modal-title').textContent = isNew ? 'Completar detalles' : 'Editar detalles';
        document.getElementById('lib-metadata-item-id').value = item.id;
        document.getElementById('lib-metadata-title').value = item.title || '';
        document.getElementById('lib-metadata-level').value = item.level || '';
        document.getElementById('lib-metadata-exerciseType').value = item.exerciseType || '';
        document.getElementById('lib-metadata-musicalStyle').value = item.musicalStyle || '';

        // Mostrar filas según tipo
        const isMedia = item.type === 'youtube' || item.type === 'spotify';
        document.getElementById('lib-metadata-row-exerciseType').style.display = isMedia ? 'none' : 'flex';
        document.getElementById('lib-metadata-row-musicalStyle').style.display = isMedia ? 'flex' : 'none';

        modal.style.display = 'flex';
        document.getElementById('lib-metadata-title').focus();
    }

    async saveLibItemMetadata() {
        const itemId = document.getElementById('lib-metadata-item-id').value;
        const item = await this.data.getLibraryItem(itemId);
        if (!item) return;

        item.title = document.getElementById('lib-metadata-title').value.trim() || item.title;
        item.level = document.getElementById('lib-metadata-level').value;
        item.exerciseType = document.getElementById('lib-metadata-exerciseType').value;
        item.musicalStyle = document.getElementById('lib-metadata-musicalStyle').value;

        await this.data.saveLibraryItem(item);
        document.getElementById('lib-metadata-modal').style.display = 'none';
        this.renderLibraryInNotebook();
        this.renderLibraryView();
    }

    // showWizardStep mantiene compatibilidad pero ya no se usa en el flujo principal
    showWizardStep(stepNum) {
        if (stepNum === 4) { /* player activado vía card */ return; }
        const catMap = { 1: 'technique', 2: 'technique', 3: 'reading' };
        const cat = catMap[stepNum] || 'technique';
        this.selectCategory(cat);
    }

    // ==========================================================================
    // 6. Temporizadores de Práctica
    // ==========================================================================
    /**
     * Inicia el timer ascendente para un paso. Pausa el paso anterior si hay uno activo.
     * Se llama automáticamente al entrar a un paso del wizard.
     */
    startStepTimer(stepIndex) {
        if (this.activeTimerStep !== null && this.activeTimerStep !== stepIndex) {
            this.pauseStepTimer(this.activeTimerStep);
        }

        const timerId = stepIndex - 1;
        if (this.timerIntervals[timerId]) return;

        this.activeTimerStep = stepIndex;

        this.timerIntervals[timerId] = setInterval(() => {
            // Obtener meta de tiempo
            const goalsKey = `gs-pgoals-${this.activeProfile?.id||'def'}`;
            const goals = JSON.parse(localStorage.getItem(goalsKey)||'[15,10,20]');
            const goalMins = goals[timerId] || 15;
            const goalSecs = goalMins * 60;

            if (this.timerSeconds[timerId] < goalSecs) {
                this.timerSeconds[timerId]++;
                this.updateTimerDisplay(stepIndex);
                
                if (this.timerSeconds[timerId] >= goalSecs) {
                    this.autoCompleteStep(stepIndex);
                    this.pauseStepTimer(stepIndex);
                }
            } else {
                this.pauseStepTimer(stepIndex);
            }

            if (this.timerSeconds[timerId] % 30 === 0) {
                this.savePracticeProgress();
            }
        }, 1000);

        const btn = document.getElementById("btn-cat-timer-toggle");
        if (btn) btn.textContent = '⏸ Pausar';
    }

    pauseStepTimer(stepIndex) {
        const timerId = stepIndex - 1;
        if (this.timerIntervals[timerId]) {
            clearInterval(this.timerIntervals[timerId]);
            this.timerIntervals[timerId] = null;
        }
        if (this.activeTimerStep === stepIndex) {
            this.activeTimerStep = null;
        }

        const btn = document.getElementById("btn-cat-timer-toggle");
        if (btn) {
            const timerSecs = this.timerSeconds[timerId] || 0;
            btn.textContent = timerSecs > 0 ? '▶ Continuar' : '▶ Iniciar';
        }

        this.savePracticeProgress();
    }

    toggleTimer(stepIndex) {
        const timerId = stepIndex - 1;
        if (this.timerIntervals[timerId]) {
            this.pauseStepTimer(stepIndex);
        } else {
            this.startStepTimer(stepIndex);
        }
    }

    resetTimer(stepIndex) {
        const timerId = stepIndex - 1;
        this.pauseStepTimer(stepIndex);
        this.timerSeconds[timerId] = 0;
        this.updateTimerDisplay(stepIndex);
    }

    updateTimerDisplay(stepIndex) {
        const timerId = stepIndex - 1;
        const totalSecs = this.timerSeconds[timerId];
        
        const goalsKey = `gs-pgoals-${this.activeProfile?.id||'def'}`;
        const goals = JSON.parse(localStorage.getItem(goalsKey)||'[15,10,20]');
        const goalMins = goals[timerId] || 15;
        const goalSecs = goalMins * 60;
        
        const remainingSecs = Math.max(0, goalSecs - totalSecs);
        const minutes = Math.floor(remainingSecs / 60);
        const seconds = remainingSecs % 60;
        
        const displayStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const practiceDisplay = document.querySelector(".practice-ring-time");
        const accent = ['#a29bfe','#55efc4','#fdcb6e'][timerId] || 'var(--tb-accent)';
        if (practiceDisplay && this.categoryIds[timerId] === this.currentCategory) {
            practiceDisplay.textContent = displayStr;
            
            const circle = document.querySelector(".practice-ring-wrap svg circle:nth-child(2)");
            if (circle) {
                const r = 80;
                const circ = +(2*Math.PI*r).toFixed(1);
                const dashOffset = +(circ * (1 - Math.min(totalSecs / goalSecs, 1))).toFixed(1);
                circle.setAttribute("stroke-dashoffset", dashOffset);
            }
            
            const label = document.querySelector(".practice-ring-label");
            if (label) {
                const goalReached = totalSecs >= goalSecs;
                label.textContent = goalReached ? '¡Meta!' : 'meta ' + goalMins + ' min';
            }
            
            const timerBtn = document.getElementById("btn-cat-timer-toggle");
            const isTimerRunning = !!this.timerIntervals[timerId];
            if (timerBtn) {
                timerBtn.textContent = isTimerRunning ? '⏸ Pausar' : (totalSecs > 0 ? '▶ Continuar' : '▶ Iniciar');
            }
            
            const completeBtn = document.getElementById("btn-complete-cat");
            const isCompleted = this.completedSteps[timerId];
            if (completeBtn) {
                if (isCompleted) {
                    completeBtn.textContent = '✓ Completada';
                    completeBtn.disabled = true;
                    completeBtn.style.background = '';
                    completeBtn.style.color = '';
                    completeBtn.style.borderColor = '';
                } else if (goalReached) {
                    completeBtn.textContent = '🎯 ¡Meta! Completar';
                    completeBtn.disabled = false;
                    completeBtn.style.background = 'rgba(52,199,89,.1)';
                    completeBtn.style.borderColor = 'rgba(52,199,89,.35)';
                    completeBtn.style.color = '#34c759';
                } else {
                    completeBtn.textContent = this.lang === 'es' ? 'Marcar Completado' : 'Mark Completed';
                    completeBtn.disabled = false;
                    completeBtn.style.background = '';
                    completeBtn.style.color = '';
                    completeBtn.style.borderColor = '';
                }
            }
        }
        
        const el = document.getElementById(`timer-display-${stepIndex}`);
        if (el) el.textContent = displayStr;
    }

    autoCompleteStep(stepIndex) {
        const catIdx = stepIndex - 1;
        if (catIdx < 0 || catIdx >= 3) return;
        this.completedSteps[catIdx] = true;
        this.data.setCompletedSteps(this.completedSteps);
        this.updateProgressUI();
        this.playTimerAlert();
        this.renderPracticeView();
    }

    /**
     * Guarda el progreso de práctica del día actual en IndexedDB.
     */
    async savePracticeProgress() {
        const todayStr = this.getTodayString();
        const entries = [];
        let totalSeconds = 0;

        for (let i = 0; i < 3; i++) {
            if (this.timerSeconds[i] > 0) {
                entries.push({
                    category: this.stepCategories[i],
                    seconds: this.timerSeconds[i]
                });
                totalSeconds += this.timerSeconds[i];
            }
        }

        if (entries.length > 0) {
            try {
                const logData = { entries, totalSeconds };
                if (this.activeProfile) {
                    logData.profileId = this.activeProfile.id;
                }
                await this.data.savePracticeLog(todayStr, logData);
            } catch (e) {
                console.warn('Error saving practice log:', e);
            }
        }
    }

    /**
     * Devuelve el tiempo total practicado hoy en segundos.
     */
    getTodayTotalSeconds() {
        return this.timerSeconds.reduce((sum, s) => sum + s, 0);
    }

    playTimerAlert() {
        const alertAudio = document.getElementById("audio-tick");
        if (alertAudio) {
            alertAudio.play().catch(() => {});
        }
    }

    // ==========================================================================
    // 7. Registro de Práctica, Compleción y Racha
    // ==========================================================================
    completeCategory(catIndex) {
        this.completedSteps[catIndex] = true;
        this.data.setCompletedSteps(this.completedSteps);
        this.updateProgressUI();
        this.renderPracticeView();

        if (this.completedSteps.every(Boolean)) {
            this.finalizeDailyPractice();
        }
    }

    // Mantener alias por compatibilidad con posibles llamadas externas
    completeStep(stepNum) {
        this.completeCategory(stepNum - 1);
    }

    finalizeDailyPractice() {
        const todayStr = this.getTodayString();

        for (let i = 1; i <= 3; i++) {
            this.pauseStepTimer(i);
        }
        this.savePracticeProgress();
        
        if (this.lastPracticedDate !== todayStr) {
            this.streak++;
            this.lastPracticedDate = todayStr;
            
            // Añadir al historial si no existe
            if (!this.history.includes(todayStr)) {
                this.history.push(todayStr);
            }
            
            this.saveStreak();
            this.renderHeatmap();
            
            // Celebración con toast
            this.showToast(TRANSLATIONS[this.lang]["practice-complete-congrats"], '🔥');
        } else {
            this.showToast(
                this.lang === "es"
                    ? "¡Rutina completada de nuevo! Ya habías registrado tu práctica de hoy."
                    : "Routine completed again! You already registered your practice today.",
                '✓'
            );
        }
        
        this.navigateToView("studio");
    }

    renderHeatmap() {
        const grid = document.getElementById("heatmap-grid");
        if (!grid) return;
        grid.innerHTML = "";
        
        const today = new Date();
        // Mostrar los últimos 30 días
        for (let i = 29; i >= 0; i--) {
            const day = new Date();
            day.setDate(today.getDate() - i);
            
            const year = day.getFullYear();
            const month = String(day.getMonth() + 1).padStart(2, '0');
            const date = String(day.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${date}`;
            
            const dayEl = document.createElement("div");
            dayEl.className = "heatmap-day";
            
            if (this.history.includes(dateStr)) {
                dayEl.classList.add("completed");
            }
            if (dateStr === this.getTodayString()) {
                dayEl.classList.add("today");
            }
            
            // Tooltip sencillo para el usuario
            dayEl.title = `${day.toLocaleDateString(this.lang === "es" ? "es-ES" : "en-US")} - ${this.history.includes(dateStr) ? 'Practicado' : 'No practicado'}`;
            
            grid.appendChild(dayEl);
        }
    }

    // ==========================================================================
    // 8. Cuaderno del Profesor (Formulario y Notas)
    // ==========================================================================
    saveTeacherNotes() {
        const name = document.getElementById("notes-teacher-name").value;
        const focus = document.getElementById("notes-focus-task").value;
        const corrections = document.getElementById("notes-corrections").value;
        
        const notesObj = { teacher: name, focus: focus, corrections: corrections };
        this.data.setTeacherNotes(notesObj);
        
        // Actualizar UI
        this.loadTeacherNotesUI();
        
        // Animación de éxito
        const msg = document.getElementById("save-status-msg");
        msg.textContent = TRANSLATIONS[this.lang]["note-saved-success"];
        msg.classList.add("show");
        setTimeout(() => msg.classList.remove("show"), 3000);
    }

    loadTeacherNotesUI() {
        const notes = this.data.getTeacherNotes();
        const container = document.getElementById("teacher-notes-preview");
        
        const teacherInput = document.getElementById("notes-teacher-name");
        const focusInput = document.getElementById("notes-focus-task");
        const correctionsInput = document.getElementById("notes-corrections");
        
        if (notes) {
            if (teacherInput) teacherInput.value = notes.teacher || "";
            if (focusInput) focusInput.value = notes.focus || "";
            if (correctionsInput) correctionsInput.value = notes.corrections || "";
            
            if (container) {
                container.innerHTML = "";
                
                if (notes.focus) {
                    const item = document.createElement("div");
                    item.className = "preview-item";
                    item.innerHTML = `<div class="preview-label">${this.lang === 'es' ? 'Enfoque Semanal' : 'Weekly Focus'} ${notes.teacher ? `(Prof. ${notes.teacher})` : ''}</div>
                                      <p>${notes.focus.replace(/\n/g, '<br>')}</p>`;
                    container.appendChild(item);
                }
                
                if (notes.corrections) {
                    const item = document.createElement("div");
                    item.className = "preview-item";
                    item.innerHTML = `<div class="preview-label">${this.lang === 'es' ? 'Correcciones a recordar' : 'Corrections to remember'}</div>
                                      <p>${notes.corrections.replace(/\n/g, '<br>')}</p>`;
                    container.appendChild(item);
                }
                
                if (!notes.focus && !notes.corrections) {
                    container.innerHTML = `<p class="text-muted">${TRANSLATIONS[this.lang]["no-notes-yet"]}</p>`;
                }
            }
        } else {
            if (container) {
                container.innerHTML = `<p class="text-muted">${TRANSLATIONS[this.lang]["no-notes-yet"]}</p>`;
            }
        }
    }

    // ==========================================================================
    // 10. Biblioteca de Ejercicios (Visualización y Asignación)
    // ==========================================================================
    renderLibraryExercises() {
        // Vista Biblioteca ahora se renderiza por renderLibraryView
        this.renderLibraryView();
    }

    _renderLibraryExercisesLegacy() {
        const grid = document.getElementById("library-exercises-grid-REMOVED");
        if (!grid) return;
        grid.innerHTML = "";
        
        EXERCISES_DATABASE.forEach(ex => {
            const card = document.createElement("div");
            card.className = `card library-card filter-${ex.category}`;
            
            const name = this.lang === "es" ? ex.nameEs : ex.nameEn;
            const desc = this.lang === "es" ? ex.descEs : ex.descEn;
            
            card.innerHTML = `
                <div class="library-card-header">
                    <span class="difficulty-badge difficulty-${ex.difficulty}">${ex.difficulty}</span>
                </div>
                <h4 class="exercise-name">${name}</h4>
                <p class="library-card-desc">${desc}</p>
                <button class="btn btn-outline btn-sm btn-load-ex" data-id="${ex.id}" style="margin-top: auto; width: 100%;">
                    ${TRANSLATIONS[this.lang]["add-routine-btn"]}
                </button>
            `;
            
            grid.appendChild(card);
        });

        // Eventos para botones de la biblioteca estática (vista Library)
        grid.querySelectorAll(".btn-load-ex").forEach(btn => {
            btn.addEventListener("click", () => {
                // En el nuevo modelo la biblioteca estática sirve de referencia
                // Los ejercicios reales se asignan desde el Cuaderno
                const exId = btn.getAttribute("data-id");
                const ex = EXERCISES_DATABASE.find(e => e.id === exId);
                if (ex) alert(this.lang === 'es'
                    ? `Para asignar "${ex.nameEs || ex.nameEn}" a la práctica, súbelo como archivo GP desde el Cuaderno.`
                    : `To assign "${ex.nameEn || ex.nameEs}" to practice, upload it as a GP file from the Notebook.`);
            });
        });

        // Configurar filtros en la biblioteca
        const filterTabs = document.querySelectorAll(".filter-tab");
        filterTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                filterTabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                
                const filter = tab.getAttribute("data-filter");
                const cards = grid.querySelectorAll(".library-card");
                
                cards.forEach(card => {
                    if (filter === "all" || card.classList.contains(`filter-${filter}`)) {
                        card.style.display = "flex";
                    } else {
                        card.style.display = "none";
                    }
                });
            });
        });
    }



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
    async renderMyLibraryView() {
        const container = document.getElementById("view-my-library");
        if (!container) return;

        try {
            if (!this.activeProfile) {
                container.innerHTML = `<p class="text-muted" style="padding:24px">Seleccioná un perfil de alumno para ver tu biblioteca.</p>`;
                return;
            }

        const [allItems, allWeekItems, profileWeeks] = await Promise.all([
            this.data.getLibraryItems(),
            this.data.getAllWeekItems(),
            this.data.getProfileWeeks(this.activeProfile.id),
        ]);

        // 1. Obtener ítems asignados por semanas de práctica
        const assignedWeekIds = new Set(profileWeeks.map(pw => pw.weekId));
        const assignedItemIds = new Set(
            allWeekItems.filter(wi => assignedWeekIds.has(wi.weekId)).map(wi => wi.libraryItemId)
        );

        // 2. Obtener ítems asignados a través de clases/sesiones del alumno (personales o de cursos)
        const studentGroupIds = new Set(
            this.data.getAllGroups()
                .filter(g => (g.memberIds || []).includes(this.activeProfile.id))
                .map(g => g.id)
        );

        const assignedClasses = this.data.getAllClases().filter(clase => {
            if (clase.memberOverride != null) {
                return clase.memberOverride.includes(this.activeProfile.id);
            }
            return clase.groupId === `grp-personal-${this.activeProfile.id}` || studentGroupIds.has(clase.groupId);
        });

        const classItemIds = new Set();
        assignedClasses.forEach(clase => {
            (clase.content || []).forEach(item => {
                if (item.id) classItemIds.add(item.id);
            });
        });

        // 3. Unir ambos conjuntos de IDs asignados
        const allAssignedIds = new Set([...assignedItemIds, ...classItemIds]);

        const assignedItems = allItems.filter(i => allAssignedIds.has(i.id) && !i.uploadedBy);
        const myUploadedItems = allItems.filter(i => i.uploadedBy === this.activeProfile.id);

        const searchVal = (this._myLibSearch || '').toLowerCase().trim();
        const matchesSearch = (item) => {
            if (!searchVal) return true;
            return String(item.title || '').toLowerCase().includes(searchVal) ||
                   String(item.category || '').toLowerCase().includes(searchVal) ||
                   String(item.level || '').toLowerCase().includes(searchVal) ||
                   String(item.style || '').toLowerCase().includes(searchVal);
        };

        const generalAssignedItems = assignedItems.filter(it => !classItemIds.has(it.id));
        const filteredGeneralAssigned = generalAssignedItems.filter(matchesSearch);

        // Separar cargas del alumno por clase
        const uploadsByClass = {};
        myUploadedItems.forEach(it => {
            if (it.claseId) {
                if (!uploadsByClass[it.claseId]) uploadsByClass[it.claseId] = [];
                uploadsByClass[it.claseId].push(it);
            }
        });
        const generalUploads = myUploadedItems.filter(it => !it.claseId);

        // Clases con contenido
        const classesWithContent = assignedClasses
            .filter(c => (c.content && c.content.length > 0) || (uploadsByClass[c.id] && uploadsByClass[c.id].length > 0))
            .sort((a, b) => {
                const da = b.finalizadaAt || b.date || '';
                const db = a.finalizadaAt || a.date || '';
                return da.localeCompare(db);
            });

        // Generar HTML de las clases
        const classesHtml = classesWithContent.map(clase => {
            const resolvedTeacherItems = (clase.content || []).map(c => {
                const libItem = allItems.find(it => it.id === c.id);
                if (!libItem) return null;
                return { ...libItem, category: c.cat || libItem.category };
            }).filter(Boolean);
            const filteredTeacher = resolvedTeacherItems.filter(matchesSearch);
            const filteredStudent = (uploadsByClass[clase.id] || []).filter(matchesSearch);

            // Si hay búsqueda y no coincide nada, no mostrar la clase
            if (searchVal && !filteredTeacher.length && !filteredStudent.length) {
                return '';
            }

            const teacherItemsHtml = filteredTeacher.map(it => {
                const color = this._bibCatColor(it.category || '');
                return `
                    <div onclick="app.openLibraryItemById('${it.id}')" style="cursor:pointer; display:flex; align-items:center; gap:8px; background:var(--tb-bg-primary); border:1px solid var(--tb-border); padding:8px 12px; border-radius:6px; transition: border-color 0.1s" onmouseover="this.style.borderColor='var(--tb-border-hover)'" onmouseout="this.style.borderColor='var(--tb-border)'">
                        <span class="bib-type-icon" style="background:${color}1f; width:20px; height:20px; font-size:10px">${this._bibTypeIcon(it.type)}</span>
                        <span style="font-size:13px; font-weight:500; color:var(--tb-text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap">${this._escapeHtml(it.title)}</span>
                        <span style="font-size:10px; color:var(--tb-text-muted); background:rgba(0,0,0,0.1); padding:2px 6px; border-radius:4px; margin-left:auto; flex-shrink:0">${this._escapeHtml(it.category || 'Material')}</span>
                    </div>
                `;
            }).join('') || '<p style="font-size:12px; color:var(--tb-text-muted); margin:0; font-style:italic">Sin material asignado por el docente.</p>';

            const studentItemsHtml = filteredStudent.map(it => {
                const color = this._bibCatColor(it.category || '');
                return `
                    <div onclick="app.openLibraryItemById('${it.id}')" style="cursor:pointer; display:flex; align-items:center; gap:8px; background:var(--tb-bg-primary); border:1px solid var(--tb-border); padding:8px 12px; border-radius:6px; transition: border-color 0.1s" onmouseover="this.style.borderColor='var(--tb-border-hover)'" onmouseout="this.style.borderColor='var(--tb-border)'">
                        <span class="bib-type-icon" style="background:${color}1f; width:20px; height:20px; font-size:10px">${this._bibTypeIcon(it.type)}</span>
                        <div style="flex:1; min-width:0">
                            <div style="font-size:13px; font-weight:500; color:var(--tb-text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap">${this._escapeHtml(it.title)}</div>
                            ${it.observation ? `<div style="font-size:11px; color:var(--tb-text-secondary); margin-top:2px; font-style:italic; text-overflow:ellipsis; overflow:hidden; white-space:nowrap">"${this._escapeHtml(it.observation)}"</div>` : ''}
                        </div>
                        <button onclick="event.stopPropagation(); app.deleteStudentUpload('${it.id}')" style="background:none; border:none; color:var(--tb-accent); cursor:pointer; font-size:16px; font-weight:bold; padding:0 4px; line-height:1" title="Eliminar">×</button>
                    </div>
                `;
            }).join('') || '<p style="font-size:12px; color:var(--tb-text-muted); margin:0; font-style:italic">Sin consultas subidas.</p>';

            return `
                <div style="background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:10px; padding:16px; margin-bottom:16px">
                    <div style="font-weight:600; font-size:14px; color:var(--tb-text-primary); border-bottom:1px solid var(--tb-border); padding-bottom:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center">
                        <span>📚 Clase: ${this._escapeHtml(clase.title || 'Clase')}</span>
                        <span style="font-size:11px; font-weight:normal; color:var(--tb-text-muted)">${clase.date}</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px">
                        <div>
                            <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--tb-text-muted); margin-bottom:8px">Asignado por el Docente</div>
                            <div style="display:flex; flex-direction:column; gap:6px">${teacherItemsHtml}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--tb-text-muted); margin-bottom:8px">Mis subidas / Consultas</div>
                            <div style="display:flex; flex-direction:column; gap:6px">${studentItemsHtml}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        let generalUploadsCardHtml = '';
        const filteredGeneralUploads = generalUploads.filter(matchesSearch);
        if (filteredGeneralUploads.length > 0 || (generalUploads.length > 0 && !searchVal)) {
            const generalStudentItemsHtml = filteredGeneralUploads.map(it => {
                const color = this._bibCatColor(it.category || '');
                return `
                    <div onclick="app.openLibraryItemById('${it.id}')" style="cursor:pointer; display:flex; align-items:center; gap:8px; background:var(--tb-bg-primary); border:1px solid var(--tb-border); padding:8px 12px; border-radius:6px; transition: border-color 0.1s" onmouseover="this.style.borderColor='var(--tb-border-hover)'" onmouseout="this.style.borderColor='var(--tb-border)'">
                        <span class="bib-type-icon" style="background:${color}1f; width:20px; height:20px; font-size:10px">${this._bibTypeIcon(it.type)}</span>
                        <div style="flex:1; min-width:0">
                            <div style="font-size:13px; font-weight:500; color:var(--tb-text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap">${this._escapeHtml(it.title)}</div>
                            ${it.observation ? `<div style="font-size:11px; color:var(--tb-text-secondary); margin-top:2px; font-style:italic; text-overflow:ellipsis; overflow:hidden; white-space:nowrap">"${this._escapeHtml(it.observation)}"</div>` : ''}
                        </div>
                        <button onclick="event.stopPropagation(); app.deleteStudentUpload('${it.id}')" style="background:none; border:none; color:var(--tb-accent); cursor:pointer; font-size:16px; font-weight:bold; padding:0 4px; line-height:1" title="Eliminar">×</button>
                    </div>
                `;
            }).join('') || '<p style="font-size:12px; color:var(--tb-text-muted); margin:0; font-style:italic">Sin consultas generales.</p>';

            generalUploadsCardHtml = `
                <div style="background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:10px; padding:16px; margin-bottom:16px">
                    <div style="font-weight:600; font-size:14px; color:var(--tb-text-primary); border-bottom:1px solid var(--tb-border); padding-bottom:8px; margin-bottom:12px">
                        <span>💬 Consultas fuera de clase / Generales</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px">${generalStudentItemsHtml}</div>
                </div>
            `;
        }

        let switcherHtml = `
            <div class="my-lib-view-switcher" style="display:flex; gap:8px; align-items:center">
                <button class="btn ${this._myLibViewMode === 'clases' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="app.myLibSetViewMode('clases')" style="font-size:12px; padding:6px 12px; font-weight:600; font-family:var(--font-primary)">📅 Vista por Clases</button>
                <button class="btn ${this._myLibViewMode === 'catalogo' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="app.myLibSetViewMode('catalogo')" style="font-size:12px; padding:6px 12px; font-weight:600; font-family:var(--font-primary)">🗂 Vista de Catálogo</button>
            </div>
        `;

        let leftColHtml = '';
        if (this._myLibViewMode === 'catalogo') {
            leftColHtml = `
                <!-- Sector 1: Contenido Asignado por el Docente -->
                <div style="margin-bottom:28px">
                    <div class="bib-zone-header" style="font-size:14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center">
                        <span>Material asignado por el docente</span>
                        <span class="bib-item-count" style="font-size:12px; font-weight:normal; color:var(--tb-text-muted)">${assignedItems.length} ítem${assignedItems.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="bib-table-wrap">
                        ${this._bibRenderTable(this._bibFilterItems(assignedItems, true), allItems, true)}
                    </div>
                </div>

                <!-- Sector 2: Mis Subidas / Consultas -->
                <div>
                    <div class="bib-zone-header" style="font-size:14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center">
                        <span>Mis subidas / Consultas</span>
                        <span class="bib-item-count" style="font-size:12px; font-weight:normal; color:var(--tb-text-muted)">${myUploadedItems.length} ítem${myUploadedItems.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="bib-table-wrap">
                        ${this._renderStudentUploadsTable(myUploadedItems)}
                    </div>
                </div>
            `;
        } else {
            leftColHtml = `
                <!-- Sector 1: Material General (Práctica Semanal) -->
                ${filteredGeneralAssigned.length > 0 || (generalAssignedItems.length > 0 && !searchVal) ? `
                <div style="margin-bottom:24px">
                    <div class="bib-zone-header" style="font-size:14px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center">
                        <span>Material General de Práctica</span>
                    </div>
                    <div class="bib-table-wrap">
                        ${this._bibRenderTable(filteredGeneralAssigned, allItems, true)}
                    </div>
                </div>
                ` : ''}

                <!-- Sector 2: Contenido Organizado por Clases -->
                <div>
                    <div class="bib-zone-header" style="font-size:14px; margin-bottom:10px">Mi Contenido por Clases</div>
                    ${classesHtml || generalUploadsCardHtml ? `
                        <div>
                            ${classesHtml}
                            ${generalUploadsCardHtml}
                        </div>
                    ` : `
                        <div style="padding:32px; text-align:center; color:var(--tb-text-muted); border:1px dashed var(--tb-border); border-radius:8px; font-size:13px">
                            No hay clases con material asignado o consultas cargadas.
                        </div>
                    `}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="bib-layout">
                <div class="bib-main-area" style="overflow-y:auto; padding:24px 32px 40px 32px; height:100%">
                    
                    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px">
                        <!-- Switcher de Vista -->
                        ${switcherHtml}

                        <!-- Buscador -->
                        <div class="bib-toolbar" style="margin-bottom:0; max-width:320px">
                            <div class="bib-search-wrap" style="width: 100%">
                                <svg class="bib-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                <input type="text" class="bib-search-input" id="my-lib-search-input" placeholder="Buscar material o consultas..." value="${this._myLibSearch.replace(/"/g, '&quot;')}">
                            </div>
                        </div>
                    </div>

                    <!-- Layout de Dos Columnas -->
                    <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:24px">
                        
                        <!-- Columna Izquierda: Alternada por vista -->
                        <div>
                            ${leftColHtml}
                        </div>

                        <!-- Columna Derecha: Zona de Subida de Contenido -->
                        <div>
                            <div class="bib-zone-header" style="font-size:14px; margin-bottom:10px">Subir Consulta / Material</div>
                            <div class="bib-bottom-zone" style="display:block; border-top:none">
                                ${this._bibRenderUploadZone(true)}
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        `;
            this._myLibBindEvents();
        } catch (error) {
            console.error("Error en renderMyLibraryView:", error);
            container.innerHTML = `
                <div style="padding: 24px; color: var(--tb-accent); background: rgba(229, 62, 62, 0.1); border: 1px solid var(--tb-accent); border-radius: 8px; margin: 20px">
                    <h3>⚠️ Error en la Biblioteca del Alumno</h3>
                    <p style="font-family: monospace; font-size: 13px; white-space: pre-wrap">${error.stack || error.message || error}</p>
                </div>
            `;
        }
    }

    myLibSetViewMode(mode) {
        this._myLibViewMode = mode;
        this.renderMyLibraryView();
    }

    _renderStudentUploadsTable(items) {
        if (!items.length) {
            return `<div style="padding:20px; text-align:center; color:var(--tb-text-muted); font-size:13px; border:1px dashed var(--tb-border); border-radius:8px">
                No has subido consultas aún. Utilizá la zona de la derecha para cargar.
            </div>`;
        }

        const rows = items.map(it => {
            const color = this._bibCatColor(it.category || '');
            const clickAction = `app.openLibraryItemById('${it.id}')`;
            const dateStr = new Date(it.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
            return `<tr class="bib-row" onclick="${clickAction}">
  <td class="bib-td bib-td-title"><span class="bib-type-icon" style="background:${color}1f">${this._bibTypeIcon(it.type)}</span>${this._escapeHtml(it.title || 'Sin título')}</td>
  <td class="bib-td">${this._bibTypeLabel(it.type)}</td>
  <td class="bib-td" style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-style:italic; color:var(--tb-text-secondary)" title="${this._escapeHtml(it.observation || '')}">${it.observation ? this._escapeHtml(it.observation) : '—'}</td>
  <td class="bib-td">${dateStr}</td>
  <td class="bib-td" style="text-align:right; width:48px; padding-right:12px" onclick="event.stopPropagation()">
    <button class="btn btn-outline btn-sm" style="color:var(--tb-accent); padding:2px 6px; border-color:var(--tb-accent)" onclick="app.deleteStudentUpload('${it.id}')" title="Eliminar">×</button>
  </td>
</tr>`;
        }).join('');

        return `<table class="bib-table">
  <thead>
    <tr>
      <th class="bib-th">Título</th>
      <th class="bib-th">Tipo</th>
      <th class="bib-th">Observación</th>
      <th class="bib-th">Fecha</th>
      <th class="bib-th" style="text-align:right; padding-right:12px">Acción</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
    }

    _myLibBindEvents() {
        const si = document.getElementById('my-lib-search-input');
        if (si && !si.dataset.bound) {
            si.dataset.bound = 'true';
            si.addEventListener('input', e => {
                this._myLibSearch = e.target.value;
                this.renderMyLibraryView();
            });
        }
        const da = document.getElementById('my-bib-droparea');
        if (da && !da.dataset.bound) {
            da.dataset.bound = 'true';
            da.addEventListener('dragover', e => { e.preventDefault(); da.classList.add('bib-drag-over'); });
            da.addEventListener('dragleave', () => da.classList.remove('bib-drag-over'));
            da.addEventListener('drop', e => {
                e.preventDefault();
                da.classList.remove('bib-drag-over');
                Array.from(e.dataTransfer.files).forEach(f => this.bibHandleFileDrop(f, true));
            });
        }
        const fi = document.getElementById('my-bib-file-input');
        if (fi && !fi.dataset.bound) {
            fi.dataset.bound = 'true';
            fi.addEventListener('change', e => {
                Array.from(e.target.files).forEach(f => this.bibHandleFileDrop(f, true));
                fi.value = '';
            });
        }
    }

    myLibToggleColFilter(col, val) {
        const arr = this._myLibColFilters[col];
        const idx = arr.indexOf(val);
        if (idx === -1) arr.push(val); else arr.splice(idx, 1);
        this.renderMyLibraryView();
    }

    async deleteStudentUpload(itemId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este contenido?')) return;
        const notifications = this.data.getNotifications().filter(n => n.itemId !== itemId);
        this.data.saveNotifications(notifications);

        await this.data.deleteLibraryItem(itemId);
        this.showToast('Contenido eliminado', '✓');
        await this.renderMyLibraryView();
    }

    async renderLibraryView() {
        const content = document.getElementById("lib-view-content");
        if (!content) return;

        const [allItems, weeks, allWeekItems] = await Promise.all([
            this.data.getLibraryItems(),
            this.data.getWeeks(),
            this.data.getAllWeekItems()
        ]);

        let visibleItems = allItems;
        if (this.activeProfile && !this.isProfessorMode) {
            const profileWeeks = await this.data.getProfileWeeks(this.activeProfile.id);
            const assignedWeekIds = new Set(profileWeeks.map(pw => pw.weekId));
            const assignedItemIds = new Set(
                allWeekItems.filter(wi => assignedWeekIds.has(wi.weekId)).map(wi => wi.libraryItemId)
            );
            visibleItems = allItems.filter(it => assignedItemIds.has(it.id));
        }

        this._libAllItems = visibleItems;
        this._libWeeks = weeks;
        this._libAllWeekItems = allWeekItems;

        this._renderLibraryContent(visibleItems, weeks, allWeekItems);
        this._bindLibrarySearch();
        this._bindLibraryFilters();
    }

    _getActiveLibFilters() {
        return {
            fileType: document.querySelector('#lib-filter-chips .lib-chip.active')?.dataset.filter || 'all',
            level:    document.querySelector('#lib-filter-chips-level .lib-chip.active')?.dataset.filter || 'all',
            exerciseType: document.querySelector('#lib-filter-chips-extype .lib-chip.active')?.dataset.filter || 'all',
            musicalStyle: document.querySelector('#lib-filter-chips-style .lib-chip.active')?.dataset.filter || 'all',
        };
    }

    _renderLibraryContent(items, weeks, allWeekItems, searchQuery = '', filters = {}) {
        const content = document.getElementById("lib-view-content");
        if (!content) return;

        if (typeof filters === 'string') filters = { fileType: filters };
        const { fileType = 'all', level = 'all', exerciseType = 'all', musicalStyle = 'all' } = filters;

        const isProfessor = this.isProfessorMode;
        const typeIcon = { score: 'fa-guitar', pdf: 'fa-file-pdf', youtube: 'fa-youtube', spotify: 'fa-spotify' };
        const typeColor = { score: 'var(--tb-accent)', pdf: '#e53e3e', youtube: '#FF0000', spotify: '#1DB954' };
        const catLabel = { technique: 'Técnica', reading: 'Lectura', repertoire: 'Repertorio', supplementary: 'Complementario' };

        let filtered = items.filter(item => {
            if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (fileType !== 'all' && item.type !== fileType) return false;
            if (level !== 'all' && item.level !== level) return false;
            const isMedia = item.type === 'youtube' || item.type === 'spotify';
            if (exerciseType !== 'all' && (isMedia || item.exerciseType !== exerciseType)) return false;
            if (musicalStyle !== 'all' && (!isMedia || item.musicalStyle !== musicalStyle)) return false;
            return true;
        });

        if (filtered.length === 0) {
            content.innerHTML = `<div class="lib-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.3"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <p>${searchQuery ? 'Sin resultados para "' + this._escapeHtml(searchQuery) + '"' : isProfessor ? 'No hay ítems todavía. Subí contenido desde el Cuaderno.' : 'El profesor no te ha asignado contenido todavía.'}</p>
            </div>`;
            return;
        }

        let html = '';

        if (isProfessor) {
            const byWeek = new Map();
            const unassigned = [];
            filtered.forEach(item => {
                const wi = allWeekItems.find(w => w.libraryItemId === item.id);
                if (wi) {
                    if (!byWeek.has(wi.weekId)) byWeek.set(wi.weekId, []);
                    byWeek.get(wi.weekId).push({ item, wi });
                } else {
                    unassigned.push(item);
                }
            });

            weeks.forEach(week => {
                const group = byWeek.get(week.id);
                if (!group) return;
                html += `<div class="lib-week-group">
                    <div class="lib-week-group-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>${this._escapeHtml(week.title)}</span>
                        <span class="lib-week-count">${group.length} ítem${group.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="lib-items-list">
                        ${group.map(({ item, wi }) => this._libItemRowHtml(item, wi, typeIcon, typeColor, catLabel, true)).join('')}
                    </div>
                </div>`;
            });

            if (unassigned.length > 0) {
                html += `<div class="lib-week-group lib-week-unassigned">
                    <div class="lib-week-group-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;flex-shrink:0;opacity:.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span style="opacity:.7">Sin asignar a semana</span>
                        <span class="lib-week-count">${unassigned.length}</span>
                    </div>
                    <div class="lib-items-list">
                        ${unassigned.map(item => this._libItemRowHtml(item, null, typeIcon, typeColor, catLabel, true)).join('')}
                    </div>
                </div>`;
            }
        } else {
            const profileWeekMap = new Map();
            filtered.forEach(item => {
                const wi = allWeekItems.find(w => w.libraryItemId === item.id);
                if (!wi) return;
                const week = weeks.find(w => w.id === wi.weekId);
                const weekTitle = week ? week.title : 'Semana';
                if (!profileWeekMap.has(wi.weekId)) profileWeekMap.set(wi.weekId, { weekTitle, items: [] });
                profileWeekMap.get(wi.weekId).items.push({ item, wi });
            });
            profileWeekMap.forEach(({ weekTitle, items: group }) => {
                html += `<div class="lib-week-group">
                    <div class="lib-week-group-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>${this._escapeHtml(weekTitle)}</span>
                    </div>
                    <div class="lib-items-list">
                        ${group.map(({ item, wi }) => this._libItemRowHtml(item, wi, typeIcon, typeColor, catLabel, false)).join('')}
                    </div>
                </div>`;
            });
        }

        content.innerHTML = html || '<div class="lib-empty-state"><p>Sin resultados.</p></div>';

        content.querySelectorAll('[data-open-item]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-open-item');
                const type = btn.getAttribute('data-type');
                if (type === 'score') this.openPlayerForItem(id);
                else if (type === 'pdf') this.openPDF(id);
                else if (type === 'youtube') this.openYouTube(id);
                else if (type === 'spotify') this.openSpotify(id);
            });
        });
    }

    async editLibraryItem(itemId) {
        const item = await this.data.getLibraryItem(itemId);
        if (item) this.showLibItemMetadataModal(item, false);
    }

    _libItemRowHtml(item, wi, typeIcon, typeColor, catLabel, showDelete) {
        const isMedia = item.type === 'youtube' || item.type === 'spotify';
        const levelLabel = { inicial: 'Inicial', intermedio: 'Intermedio', avanzado: 'Avanzado' };
        const exTypeLabel = { tecnica: 'Técnica', lectura: 'Lectura', repertorio: 'Repertorio', teoria: 'Teoría', improvisacion: 'Improvisación' };
        const styleLabel = { tango: 'Tango', folklore: 'Folklore', jazz: 'Jazz', clasico: 'Clásico', rock: 'Rock', pop: 'Pop', bossa: 'Bossa Nova', flamenco: 'Flamenco', otro: 'Otro' };

        const catBadge = wi && wi.category
            ? `<span class="lib-cat-badge lib-cat-${wi.category}">${catLabel[wi.category] || wi.category}</span>`
            : '';
        const metaTags = [
            item.level ? `<span class="lib-meta-tag lib-meta-level">${levelLabel[item.level] || item.level}</span>` : '',
            !isMedia && item.exerciseType ? `<span class="lib-meta-tag lib-meta-extype">${exTypeLabel[item.exerciseType] || item.exerciseType}</span>` : '',
            isMedia && item.musicalStyle ? `<span class="lib-meta-tag lib-meta-style">${styleLabel[item.musicalStyle] || item.musicalStyle}</span>` : '',
        ].filter(Boolean).join('');

        const deleteBtn = showDelete
            ? `<button class="lib-action-btn lib-delete-btn" onclick="app.deleteLibraryItem('${item.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>`
            : '';
        const editBtn = showDelete
            ? `<button class="lib-action-btn" onclick="app.editLibraryItem('${item.id}')" title="Editar"><i class="fas fa-pen"></i></button>`
            : '';
        const iconClass = typeIcon[item.type] || 'fa-file';
        const color = typeColor[item.type] || 'var(--tb-text-secondary)';
        return `<div class="lib-item-row" data-item-id="${item.id}">
            <div class="lib-item-icon" style="color:${color}"><i class="fas ${iconClass}"></i></div>
            <div class="lib-item-info">
                <span class="lib-item-title">${this._escapeHtml(item.title)}</span>
                <div class="lib-item-meta">${catBadge}${metaTags}</div>
            </div>
            <div class="lib-item-actions">
                <button class="lib-action-btn lib-open-btn" data-open-item="${item.id}" data-type="${item.type}" title="Abrir">
                    <i class="fas fa-play"></i>
                </button>
                ${editBtn}
                ${deleteBtn}
            </div>
        </div>`;
    }

    _bindLibrarySearch() {
        const input = document.getElementById("lib-search-input");
        if (!input) return;
        if (this._libSearchHandler) input.removeEventListener('input', this._libSearchHandler);
        this._libSearchHandler = () => {
            this._renderLibraryContent(this._libAllItems, this._libWeeks, this._libAllWeekItems, input.value, this._getActiveLibFilters());
        };
        input.addEventListener('input', this._libSearchHandler);
    }

    _bindLibraryFilters() {
        ['lib-filter-chips', 'lib-filter-chips-level', 'lib-filter-chips-extype', 'lib-filter-chips-style'].forEach(groupId => {
            const group = document.getElementById(groupId);
            if (!group) return;
            group.querySelectorAll('.lib-chip').forEach(chip => {
                chip.onclick = () => {
                    group.querySelectorAll('.lib-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    const q = document.getElementById("lib-search-input")?.value || '';
                    this._renderLibraryContent(this._libAllItems, this._libWeeks, this._libAllWeekItems, q, this._getActiveLibFilters());
                };
            });
        });
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
        container.innerHTML = '<div style="padding:24px;color:var(--tb-text-secondary)">Cargando...</div>';
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
        const tabFicha = document.getElementById("tf-tab-ficha");
        const tabStats = document.getElementById("tf-tab-stats");
        const tabFields = document.getElementById("tf-tab-fields");

        const contentFicha = document.getElementById("tf-tab-content-ficha");
        const contentStats = document.getElementById("tf-tab-content-stats");
        const contentFields = document.getElementById("tf-tab-content-fields");
        const saveBtn = document.getElementById("btn-tf-ficha-save");

        if (!tabFicha || !tabStats || !tabFields || !contentFicha || !contentStats || !contentFields) return;

        // Reset active states
        [tabFicha, tabStats, tabFields].forEach(t => {
            t.classList.remove("active");
            t.style.borderBottomColor = "transparent";
            t.style.color = "var(--tb-text-muted)";
            t.style.borderBottom = "2px solid transparent";
        });

        [contentFicha, contentStats, contentFields].forEach(c => c.style.display = "none");
        if (saveBtn) saveBtn.style.display = "none";

        const activeTab = tab === 'ficha' ? tabFicha : tab === 'stats' ? tabStats : tabFields;
        const activeContent = tab === 'ficha' ? contentFicha : tab === 'stats' ? contentStats : contentFields;

        activeTab.classList.add("active");
        activeTab.style.borderBottom = "2px solid var(--tb-accent)";
        activeTab.style.color = "var(--tb-text-primary)";
        activeContent.style.display = "block";

        if (tab === 'ficha') {
            if (saveBtn) saveBtn.style.display = "block";
            this.renderTeacherFichaFields();
        } else if (tab === 'stats') {
            this.renderTeacherFichaStats();
        } else if (tab === 'fields') {
            this.renderTeacherFichaFieldsConfig();
        }
    }

    async openTeacherFichaModal(studentId) {
        const profiles = await this.data.getProfiles();
        const p = profiles.find(x => x.id === studentId);
        if (!p) return;

        this._tfSelectedProfileId = studentId;
        document.getElementById("teacher-ficha-title").textContent = `Ficha de Alumno: ${p.name}`;
        
        // Gmail y Nombre
        document.getElementById("tf-ficha-gmail").value = p.gmail || '';
        document.getElementById("tf-ficha-name").value = p.name || '';
        document.getElementById("tf-ficha-nivel").value = p.nivel || 'Inicial';
        document.getElementById("tf-ficha-observaciones").value = p.observaciones || '';
        document.getElementById("tf-ficha-streak-cadence").value = String(this.data.getStreakCadence(studentId));

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

        const fields = this.data.getFichaFields();
        const fichaValues = p.fichaValues || {};
        const container = document.getElementById("tf-ficha-dynamic-fields");
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
                inputHtml = `<input type="number" class="form-input tf-ficha-field-input" data-field="${this._escapeHtml(f)}" value="${this._escapeHtml(val)}" style="width: 100%;">`;
            } else if (isTextarea) {
                inputHtml = `<textarea class="form-input tf-ficha-field-input" data-field="${this._escapeHtml(f)}" rows="2" style="width: 100%; resize: vertical;">${this._escapeHtml(val)}</textarea>`;
            } else {
                inputHtml = `<input type="text" class="form-input tf-ficha-field-input" data-field="${this._escapeHtml(f)}" value="${this._escapeHtml(val)}" style="width: 100%;">`;
            }

            formGroup.innerHTML = `
                <label class="form-label" style="font-weight: 500; font-size: 12px; color: var(--tb-text-secondary); margin-bottom: 2px;">${this._escapeHtml(f)}</label>
                ${inputHtml}
            `;
            container.appendChild(formGroup);
        });
    }

    async saveTeacherFichaModal() {
        const pid = this._tfSelectedProfileId;
        if (!pid) return;
        const profiles = await this.data.getProfiles();
        const p = profiles.find(x => x.id === pid);
        if (!p) return;

        p.gmail = document.getElementById("tf-ficha-gmail").value.trim();
        p.name = document.getElementById("tf-ficha-name").value.trim();
        p.nivel = document.getElementById("tf-ficha-nivel").value;
        p.observaciones = document.getElementById("tf-ficha-observaciones").value.trim();

        const cadenceVal = parseInt(document.getElementById("tf-ficha-streak-cadence").value, 10) || 7;
        this.data.setStreakCadence(pid, cadenceVal);
        if (this.activeProfile && this.activeProfile.id === pid) this.updateStreakUI();

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
        const pid = this._tfSelectedProfileId;
        if (!pid) return;
        const profiles = await this.data.getProfiles();
        const p = profiles.find(x => x.id === pid);
        if (!p) return;

        // Racha y tiempo de práctica
        const streak = this.data.getProfileStreak(pid);
        document.getElementById("tf-stat-streak").textContent = `${streak} día${streak !== 1 ? 's' : ''}`;

        // Calcular tiempo acumulado
        const history = this.data.getProfileHistory(pid);
        const totalMinutes = history.length * 15; // Estimación rápida: 15 mins por día completado
        document.getElementById("tf-stat-time").textContent = `${totalMinutes} min`;

        // Asistencia histórica
        const clases = this.data.getAllClases();
        const attended = clases.filter(c => (c.attendance || {})[pid] === 'presente').length;
        const absent = clases.filter(c => (c.attendance || {})[pid] === 'ausente').length;
        document.getElementById("tf-stat-attendance").textContent = `${attended} Pres. / ${absent} Aus.`;

        // Renderizar heatmap de práctica del alumno
        this.renderFichaHeatmapGrid(p);

        // Consultas realizadas
        const queriesContainer = document.getElementById("tf-ficha-consultas-list");
        if (queriesContainer) {
            queriesContainer.innerHTML = "";
            const allClasesIds = clases.map(c => c.id);
            const questions = [];
            allClasesIds.forEach(cid => {
                const pregs = this.data.getPreguntasAlumno(pid, cid);
                pregs.forEach(pr => questions.push({ ...pr, claseId: cid }));
            });
            questions.sort((a,b)=>b.timestamp-a.timestamp);
            
            if (questions.length === 0) {
                queriesContainer.innerHTML = '<p class="text-muted" style="font-size:12px;font-style:italic">Sin consultas registradas.</p>';
            } else {
                questions.forEach(q => {
                    const c = clases.find(cl => cl.id === q.claseId) || {};
                    const cDate = c.date ? new Date(c.date+'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'}) : 'Clase';
                    const el = document.createElement("div");
                    el.style.fontSize = "12px";
                    el.style.padding = "6px";
                    el.style.border = "1px solid var(--tb-border)";
                    el.style.borderRadius = "6px";
                    el.style.background = "var(--tb-bg-primary)";
                    const itemBadge = q.itemId ? `<span class="duda-item-badge" style="display:inline-block; font-size:9px; font-weight:600; text-transform:uppercase; color:var(--tb-accent); background:rgba(108,99,255,.12); border-radius:4px; padding:1px 5px; margin-right:4px">${this._escapeHtml(q.itemTitle || 'ítem')}</span>` : '';
                    el.innerHTML = `<strong>${cDate}:</strong> ${itemBadge}"${this._escapeHtml(q.text)}"`;
                    queriesContainer.appendChild(el);
                });
            }
        }

        // Archivos subidos por el alumno
        const cargasContainer = document.getElementById("tf-ficha-cargas-list");
        if (cargasContainer) {
            cargasContainer.innerHTML = "";
            const libraryItems = await this.data.getLibraryItems();
            const studentUploads = libraryItems.filter(item => item.uploadedBy === pid);
            if (studentUploads.length === 0) {
                cargasContainer.innerHTML = '<p class="text-muted" style="font-size:12px;font-style:italic">Sin archivos cargados.</p>';
            } else {
                studentUploads.forEach(item => {
                    const el = document.createElement("div");
                    el.style.fontSize = "12px";
                    el.style.padding = "6px";
                    el.style.border = "1px solid var(--tb-border)";
                    el.style.borderRadius = "6px";
                    el.style.background = "var(--tb-bg-primary)";
                    el.innerHTML = `🎵 ${this._escapeHtml(item.title)} (${this._escapeHtml(item.type.toUpperCase())})`;
                    cargasContainer.appendChild(el);
                });
            }
        }
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
        container.innerHTML = "";

        const fields = this.data.getFichaFields();
        fields.forEach(f => {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.justifyContent = "space-between";
            row.style.padding = "8px 12px";
            row.style.border = "1px solid var(--tb-border)";
            row.style.borderRadius = "6px";
            row.style.background = "var(--tb-bg-secondary)";

            row.innerHTML = `
                <span style="font-size: 13px; font-weight: 500; color: var(--tb-text-primary);">${this._escapeHtml(f)}</span>
                <button class="btn btn-danger btn-sm" onclick="app.deleteCustomFichaField('${this._escapeHtml(f)}')" style="padding: 2px 6px; font-size:11px;">Eliminar</button>
            `;
            container.appendChild(row);
        });
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

// Inicializar la aplicación al cargar el DOM
window.app = new GuitarStudioApp();
document.addEventListener("DOMContentLoaded", () => {
    window.app.init().catch(err => {
        console.error("Error initializing app:", err);
    });

    // Test automation query helper
    if (window.location.search.includes("test=true")) {
        console.log("TEST AUTOMATION STARTING");
        setTimeout(() => {
            try {
                console.log("Navigating to Practice View...");
                window.app.navigateToView('practice');
                
                // Test Step 1
                console.log("Testing Step 1...");
                window.app.showWizardStep(1);
                
                setTimeout(() => {
                    // Test Step 2
                    console.log("Testing Step 2...");
                    window.app.showWizardStep(2);
                    
                    setTimeout(() => {
                        // Test Step 3
                        console.log("Testing Step 3...");
                        window.app.showWizardStep(3);
                        
                        setTimeout(() => {
                            // Test Step 4
                            console.log("Testing Step 4...");
                            window.app.showWizardStep(4);
                        }, 1000);
                    }, 1000);
                }, 1000);
            } catch (e) {
                console.error("Test automation crashed: " + e.message, e);
            }
        }, 1500);
    }
});

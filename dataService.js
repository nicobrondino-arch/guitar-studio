/**
 * dataService.js - Capa de abstracción de datos para Guitar Studio.
 * Centraliza TODOS los accesos a localStorage e IndexedDB.
 * 
 * Cuando se migre a Firebase, solo hay que modificar esta clase.
 * El resto de la aplicación no necesita cambios.
 */

class DataService {
    constructor() {
        this._tabDb = new TabDatabase();
    }

    async init() {
        await this._tabDb.init();
    }

    // ==========================================================================
    // Idioma
    // ==========================================================================
    getLang() {
        return localStorage.getItem("studio-lang") || "es";
    }

    setLang(lang) {
        localStorage.setItem("studio-lang", lang);
    }

    // ==========================================================================
    // Racha (Streak)
    // ==========================================================================
    getStreak() {
        return parseInt(localStorage.getItem("studio-streak") || "0", 10);
    }

    setStreak(val) {
        localStorage.setItem("studio-streak", String(val));
    }

    getLastPracticedDate() {
        return localStorage.getItem("studio-last-practiced") || "";
    }

    setLastPracticedDate(dateStr) {
        localStorage.setItem("studio-last-practiced", dateStr);
    }

    // ==========================================================================
    // Historial de práctica (fechas)
    // ==========================================================================
    getHistory() {
        return JSON.parse(localStorage.getItem("studio-history") || "[]");
    }

    setHistory(arr) {
        localStorage.setItem("studio-history", JSON.stringify(arr));
    }

    addHistoryDate(dateStr) {
        const history = this.getHistory();
        if (!history.includes(dateStr)) {
            history.push(dateStr);
            this.setHistory(history);
        }
        return history;
    }

    // ==========================================================================
    // Categorías completadas (diario) — 3 categorías: technique, reading, repertoire
    // ==========================================================================
    getCompletedSteps() {
        return JSON.parse(localStorage.getItem("completed-steps") || "[false, false, false]");
    }

    setCompletedSteps(arr) {
        localStorage.setItem("completed-steps", JSON.stringify(arr));
    }

    getLastResetCheck() {
        return localStorage.getItem("studio-last-reset-check") || "";
    }

    setLastResetCheck(dateStr) {
        localStorage.setItem("studio-last-reset-check", dateStr);
    }

    // ==========================================================================
    // Ejercicios activos (personalizados desde la biblioteca)
    // ==========================================================================
    getActiveExercise(type) {
        // type: "left", "right", "reading"
        return JSON.parse(localStorage.getItem(`studio-active-${type}`) || "null");
    }

    setActiveExercise(type, exercise) {
        localStorage.setItem(`studio-active-${type}`, JSON.stringify(exercise));
    }

    // ==========================================================================
    // Notas del profesor
    // ==========================================================================
    getTeacherNotes() {
        const raw = localStorage.getItem("studio-teacher-notes");
        return raw ? JSON.parse(raw) : null;
    }

    setTeacherNotes(notesObj) {
        localStorage.setItem("studio-teacher-notes", JSON.stringify(notesObj));
    }

    // ==========================================================================
    // Modo nocturno (player)
    // ==========================================================================
    getNightMode() {
        return localStorage.getItem("gp-night-mode") === "true";
    }

    setNightMode(active) {
        localStorage.setItem("gp-night-mode", String(active));
    }

    // ==========================================================================
    // Configuración del profesor (metas, mínimos)
    // ==========================================================================
    getWeeklyConfig() {
        const raw = localStorage.getItem("studio-weekly-config");
        return raw ? JSON.parse(raw) : {
            minMinutesPerStep: 5,
            weeklyGoalMinutes: 300,  // 5 horas por defecto
            teacherName: ""
        };
    }

    setWeeklyConfig(config) {
        localStorage.setItem("studio-weekly-config", JSON.stringify(config));
    }

    // ==========================================================================
    // Tracking de tiempo de práctica (IndexedDB)
    // ==========================================================================

    /**
     * Guarda o actualiza el registro de práctica de un día.
     * @param {string} dateStr - Fecha "YYYY-MM-DD"
     * @param {object} log - { entries: [...], totalSeconds: N }
     */
    async savePracticeLog(dateStr, log) {
        return new Promise((resolve, reject) => {
            const tx = this._tabDb.db.transaction("practiceLogs", "readwrite");
            const store = tx.objectStore("practiceLogs");
            store.put({ date: dateStr, ...log });
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    }

    /**
     * Obtiene el registro de práctica de un día.
     * @param {string} dateStr - Fecha "YYYY-MM-DD"
     * @returns {object|null}
     */
    async getPracticeLog(dateStr) {
        return new Promise((resolve, reject) => {
            const tx = this._tabDb.db.transaction("practiceLogs", "readonly");
            const store = tx.objectStore("practiceLogs");
            const req = store.get(dateStr);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = (e) => reject(e);
        });
    }

    /**
     * Obtiene los registros de práctica en un rango de fechas.
     * @param {string} startDate - "YYYY-MM-DD"
     * @param {string} endDate - "YYYY-MM-DD"
     * @returns {Array}
     */
    async getPracticeLogsInRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const tx = this._tabDb.db.transaction("practiceLogs", "readonly");
            const store = tx.objectStore("practiceLogs");
            const range = IDBKeyRange.bound(startDate, endDate);
            const req = store.getAll(range);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => reject(e);
        });
    }

    // ==========================================================================
    // Guitar Pro legacy (delegado a TabDatabase — solo para compatibilidad)
    // ==========================================================================
    async saveScore(fileName, arrayBuffer) {
        return this._tabDb.saveScore(fileName, arrayBuffer);
    }

    async getScore() {
        return this._tabDb.getScore();
    }

    async deleteScore() {
        return this._tabDb.deleteScore();
    }

    // ==========================================================================
    // Biblioteca de contenido
    // ==========================================================================
    async getLibraryItems() {
        return this._tabDb.getAllLibraryItems();
    }

    async getLibraryItem(id) {
        return this._tabDb.getLibraryItem(id);
    }

    async saveLibraryItem(item) {
        return this._tabDb.saveLibraryItem(item);
    }

    async deleteLibraryItem(id) {
        return this._tabDb.deleteLibraryItem(id);
    }

    // ==========================================================================
    // Semanas
    // ==========================================================================
    async getWeeks() {
        return this._tabDb.getAllWeeks();
    }

    async saveWeek(week) {
        return this._tabDb.saveWeek(week);
    }

    async deleteWeek(id) {
        return this._tabDb.deleteWeek(id);
    }

    // ==========================================================================
    // Ítems de semana (relación semana ↔ biblioteca)
    // ==========================================================================
    async getWeekItems(weekId) {
        return this._tabDb.getWeekItemsForWeek(weekId);
    }

    async getAllWeekItems() {
        return this._tabDb.getAllWeekItems();
    }

    async saveWeekItem(item) {
        return this._tabDb.saveWeekItem(item);
    }

    async deleteWeekItem(id) {
        return this._tabDb.deleteWeekItem(id);
    }

    // ==========================================================================
    // Guardar/cargar toda la racha de una vez (helper para saveStreak)
    // ==========================================================================
    saveStreakData(streak, lastPracticedDate, history) {
        this.setStreak(streak);
        this.setLastPracticedDate(lastPracticedDate);
        this.setHistory(history);
    }

    // ==========================================================================
    // Perfiles de alumno
    // ==========================================================================
    async getProfiles() {
        return this._tabDb.getAllProfiles();
    }

    async saveProfile(profile) {
        return this._tabDb.saveProfile(profile);
    }

    async deleteProfile(id) {
        return this._tabDb.deleteProfile(id);
    }

    // ==========================================================================
    // Asignación de semanas a perfiles
    // ==========================================================================
    async getProfileWeeks(profileId) {
        return this._tabDb.getProfileWeeksForProfile(profileId);
    }

    async getAllProfileWeeks() {
        return this._tabDb.getAllProfileWeeks();
    }

    async saveProfileWeek(pw) {
        return this._tabDb.saveProfileWeek(pw);
    }

    async deleteProfileWeek(id) {
        return this._tabDb.deleteProfileWeek(id);
    }

    // ==========================================================================
    // Datos por perfil (localStorage con namespace)
    // ==========================================================================
    _profileKey(profileId, key) {
        return `${key}-${profileId}`;
    }

    getProfileStreak(profileId) {
        return parseInt(localStorage.getItem(this._profileKey(profileId, 'studio-streak')) || '0', 10);
    }
    setProfileStreak(profileId, val) {
        localStorage.setItem(this._profileKey(profileId, 'studio-streak'), String(val));
    }

    getProfileLastPracticed(profileId) {
        return localStorage.getItem(this._profileKey(profileId, 'studio-last-practiced')) || '';
    }
    setProfileLastPracticed(profileId, dateStr) {
        localStorage.setItem(this._profileKey(profileId, 'studio-last-practiced'), dateStr);
    }

    getProfileHistory(profileId) {
        return JSON.parse(localStorage.getItem(this._profileKey(profileId, 'studio-history')) || '[]');
    }
    setProfileHistory(profileId, arr) {
        localStorage.setItem(this._profileKey(profileId, 'studio-history'), JSON.stringify(arr));
    }

    getProfileCompletedSteps(profileId) {
        return JSON.parse(localStorage.getItem(this._profileKey(profileId, 'completed-steps')) || '[false,false,false]');
    }
    setProfileCompletedSteps(profileId, arr) {
        localStorage.setItem(this._profileKey(profileId, 'completed-steps'), JSON.stringify(arr));
    }

    getProfileLastResetCheck(profileId) {
        return localStorage.getItem(this._profileKey(profileId, 'studio-last-reset-check')) || '';
    }
    setProfileLastResetCheck(profileId, dateStr) {
        localStorage.setItem(this._profileKey(profileId, 'studio-last-reset-check'), dateStr);
    }

    // Perfil activo
    getActiveProfileId() {
        return localStorage.getItem('studio-active-profile') || null;
    }
    setActiveProfileId(id) {
        if (id) localStorage.setItem('studio-active-profile', id);
        else localStorage.removeItem('studio-active-profile');
    }

    // PIN del profesor
    getProfessorPin() {
        return localStorage.getItem('studio-professor-pin') || null;
    }
    setProfessorPin(pin) {
        if (pin) localStorage.setItem('studio-professor-pin', pin);
        else localStorage.removeItem('studio-professor-pin');
    }

    // ==========================================================================
    // Clases (sesiones de clase) — localStorage gs-clases
    // ==========================================================================
    _getClasesRaw() {
        try { return JSON.parse(localStorage.getItem('gs-clases') || '[]'); } catch { return []; }
    }
    _saveClasesRaw(arr) { localStorage.setItem('gs-clases', JSON.stringify(arr)); }

    getAllClases() { return this._getClasesRaw(); }
    getClase(id) { return this._getClasesRaw().find(c => c.id === id) || null; }
    saveClase(clase) {
        const arr = this._getClasesRaw().filter(c => c.id !== clase.id);
        arr.push(clase);
        this._saveClasesRaw(arr);
    }
    deleteClase(id) { this._saveClasesRaw(this._getClasesRaw().filter(c => c.id !== id)); }

    // ==========================================================================
    // Objetivos completados por alumno — localStorage gs-obj-{profileId}
    // ==========================================================================
    getObjetivosCompletados(profileId) {
        try { return JSON.parse(localStorage.getItem(`gs-obj-${profileId}`) || '{}'); } catch { return {}; }
    }
    setObjetivoCompletado(profileId, claseId, objId, done) {
        const key = `${claseId}__${objId}`;
        const data = this.getObjetivosCompletados(profileId);
        if (done) data[key] = true; else delete data[key];
        localStorage.setItem(`gs-obj-${profileId}`, JSON.stringify(data));
    }

    // ==========================================================================
    // Plantillas de clase — localStorage gs-templates
    // ==========================================================================
    getTemplates() {
        try { return JSON.parse(localStorage.getItem('gs-templates') || '[]'); } catch { return []; }
    }
    saveTemplate(tpl) {
        const arr = this.getTemplates().filter(t => t.id !== tpl.id);
        arr.push(tpl);
        localStorage.setItem('gs-templates', JSON.stringify(arr));
    }
    deleteTemplate(id) {
        localStorage.setItem('gs-templates', JSON.stringify(this.getTemplates().filter(t => t.id !== id)));
    }

    // ==========================================================================
    // Helper para generar IDs únicos
    // ==========================================================================
    generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
}

/**
 * dataService.js - Capa de abstracción de datos para Guitar Studio.
 * Centraliza TODOS los accesos a localStorage e IndexedDB.
 * 
 * Cuando se migre a Firebase, solo hay que modificar esta clase.
 * El resto de la aplicación no necesita cambios.
 */

// ==========================================================================
// 2. Base de Datos IndexedDB (Para archivos de Guitar Pro)
// ==========================================================================
class TabDatabase {
    constructor() {
        this.dbName = "GuitarStudioDB";
        this.dbVersion = 4; // v4: profiles, profileWeeks stores
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const tx = e.target.transaction;
                const oldVersion = e.oldVersion;

                if (!db.objectStoreNames.contains("scores")) {
                    db.createObjectStore("scores", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("practiceLogs")) {
                    db.createObjectStore("practiceLogs", { keyPath: "date" });
                }
                if (!db.objectStoreNames.contains("library")) {
                    db.createObjectStore("library", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("weeks")) {
                    db.createObjectStore("weeks", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("weekItems")) {
                    db.createObjectStore("weekItems", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("profiles")) {
                    db.createObjectStore("profiles", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("profileWeeks")) {
                    db.createObjectStore("profileWeeks", { keyPath: "id" });
                }

                // Migration: convert existing "weekly-score" → library + week + weekItem
                if (oldVersion > 0 && oldVersion < 3) {
                    const getReq = tx.objectStore("scores").get("weekly-score");
                    getReq.onsuccess = () => {
                        const score = getReq.result;
                        if (!score) return;
                        const now = Date.now();
                        tx.objectStore("library").put({
                            id: "lib-migrated", type: "score",
                            title: score.name, filename: score.name,
                            bytes: score.bytes, uploadedAt: score.uploadedAt || now,
                            categories: ["repertoire"]
                        });
                        tx.objectStore("weeks").put({
                            id: "week-migrated", title: "Semana 1",
                            createdAt: now, order: 0, isActive: true
                        });
                        tx.objectStore("weekItems").put({
                            id: "wi-migrated", weekId: "week-migrated",
                            libraryItemId: "lib-migrated",
                            category: "repertoire", addedAt: now
                        });
                    };
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };

            request.onerror = (e) => {
                console.error("IndexedDB error:", e);
                reject(e);
            };
        });
    }

    saveScore(name, arrayBuffer) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(["scores"], "readwrite");
            const req = tx.objectStore("scores").put({
                id: "weekly-score", name, bytes: arrayBuffer,
                uploadedAt: Date.now()
            });
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    getScore() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(["scores"], "readonly");
            const req = tx.objectStore("scores").get("weekly-score");
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e);
        });
    }

    deleteScore() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(["scores"], "readwrite");
            const req = tx.objectStore("scores").delete("weekly-score");
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    // Library CRUD
    getAllLibraryItems() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("library", "readonly");
            const req = tx.objectStore("library").getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => reject(e);
        });
    }

    getLibraryItem(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("library", "readonly");
            const req = tx.objectStore("library").get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = (e) => reject(e);
        });
    }

    saveLibraryItem(item) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("library", "readwrite");
            const req = tx.objectStore("library").put(item);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    deleteLibraryItem(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("library", "readwrite");
            const req = tx.objectStore("library").delete(id);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    // Weeks CRUD
    getAllWeeks() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("weeks", "readonly");
            const req = tx.objectStore("weeks").getAll();
            req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.order - a.order));
            req.onerror = (e) => reject(e);
        });
    }

    saveWeek(week) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("weeks", "readwrite");
            const req = tx.objectStore("weeks").put(week);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    deleteWeek(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(["weeks", "weekItems"], "readwrite");
            tx.objectStore("weeks").delete(id);
            const allReq = tx.objectStore("weekItems").getAll();
            allReq.onsuccess = () => {
                (allReq.result || []).filter(i => i.weekId === id)
                    .forEach(i => tx.objectStore("weekItems").delete(i.id));
            };
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    }

    // WeekItems CRUD
    getWeekItemsForWeek(weekId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("weekItems", "readonly");
            const req = tx.objectStore("weekItems").getAll();
            req.onsuccess = () => resolve((req.result || []).filter(i => i.weekId === weekId));
            req.onerror = (e) => reject(e);
        });
    }

    getAllWeekItems() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("weekItems", "readonly");
            const req = tx.objectStore("weekItems").getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => reject(e);
        });
    }

    saveWeekItem(item) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("weekItems", "readwrite");
            const req = tx.objectStore("weekItems").put(item);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    deleteWeekItem(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("weekItems", "readwrite");
            const req = tx.objectStore("weekItems").delete(id);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    // Profiles CRUD
    getAllProfiles() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("profiles", "readonly");
            const req = tx.objectStore("profiles").getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => reject(e);
        });
    }

    saveProfile(profile) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("profiles", "readwrite");
            const req = tx.objectStore("profiles").put(profile);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    deleteProfile(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(["profiles", "profileWeeks"], "readwrite");
            tx.objectStore("profiles").delete(id);
            const allReq = tx.objectStore("profileWeeks").getAll();
            allReq.onsuccess = () => {
                (allReq.result || []).filter(pw => pw.profileId === id)
                    .forEach(pw => tx.objectStore("profileWeeks").delete(pw.id));
            };
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    }

    // ProfileWeeks CRUD
    getProfileWeeksForProfile(profileId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("profileWeeks", "readonly");
            const req = tx.objectStore("profileWeeks").getAll();
            req.onsuccess = () => resolve((req.result || []).filter(pw => pw.profileId === profileId));
            req.onerror = (e) => reject(e);
        });
    }

    getAllProfileWeeks() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("profileWeeks", "readonly");
            const req = tx.objectStore("profileWeeks").getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => reject(e);
        });
    }

    saveProfileWeek(pw) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("profileWeeks", "readwrite");
            const req = tx.objectStore("profileWeeks").put(pw);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }

    deleteProfileWeek(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("profileWeeks", "readwrite");
            const req = tx.objectStore("profileWeeks").delete(id);
            req.onsuccess = () => resolve();
            req.onerror = (e) => reject(e);
        });
    }
}

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

    getProfileLastPracticedTime(profileId) {
        return localStorage.getItem(this._profileKey(profileId, 'studio-last-practiced-time')) || '';
    }
    setProfileLastPracticedTime(profileId, isoTimestamp) {
        localStorage.setItem(this._profileKey(profileId, 'studio-last-practiced-time'), isoTimestamp);
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

    // Cadencia de racha: cuántos días por semana espera el profesor que practique este alumno (1-7, default 7 = diaria)
    getStreakCadence(profileId) {
        return parseInt(localStorage.getItem(this._profileKey(profileId, 'streak-cadence')) || '7', 10);
    }
    setStreakCadence(profileId, daysPerWeek) {
        localStorage.setItem(this._profileKey(profileId, 'streak-cadence'), String(daysPerWeek));
    }

    // Semana calendario (lunes) ya evaluada para la racha semanal — evita re-evaluar la misma semana dos veces
    getStreakWeekChecked(profileId) {
        return localStorage.getItem(this._profileKey(profileId, 'streak-week-checked')) || '';
    }
    setStreakWeekChecked(profileId, mondayStr) {
        localStorage.setItem(this._profileKey(profileId, 'streak-week-checked'), mondayStr);
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
    // Categorías por defecto — localStorage gs-default-categories
    // ==========================================================================
    getDefaultCategories() {
        try {
            const raw = JSON.parse(localStorage.getItem('gs-default-categories'));
            return Array.isArray(raw) && raw.length ? raw : ['Técnica', 'Lectura', 'Repertorio', 'Cont. Complementario'];
        } catch {
            return ['Técnica', 'Lectura', 'Repertorio', 'Cont. Complementario'];
        }
    }
    setDefaultCategories(arr) {
        localStorage.setItem('gs-default-categories', JSON.stringify(arr));
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

    // ==========================================================================
    // Preguntas del alumno para una clase — localStorage gs-preg-{profileId}-{claseId}
    // ==========================================================================
    _pregKey(profileId, claseId) { return `gs-preg-${profileId}-${claseId}`; }

    getPreguntasAlumno(profileId, claseId) {
        try { return JSON.parse(localStorage.getItem(this._pregKey(profileId, claseId)) || '[]'); } catch { return []; }
    }

    savePreguntaAlumno(profileId, claseId, preg) {
        const arr = this.getPreguntasAlumno(profileId, claseId).filter(p => p.id !== preg.id);
        arr.push(preg);
        localStorage.setItem(this._pregKey(profileId, claseId), JSON.stringify(arr));
    }

    deletePreguntaAlumno(profileId, claseId, pregId) {
        const arr = this.getPreguntasAlumno(profileId, claseId).filter(p => p.id !== pregId);
        localStorage.setItem(this._pregKey(profileId, claseId), JSON.stringify(arr));
    }

    getAllPreguntasForClase(claseId, profileIds) {
        return profileIds.flatMap(pid =>
            this.getPreguntasAlumno(pid, claseId).map(p => ({ ...p, profileId: pid }))
        );
    }

    getClaseAnterior(groupId, currentDate) {
        if (!groupId || !currentDate) return null;
        const all = this._getClasesRaw()
            .filter(c => c.groupId === groupId && c.date < currentDate)
            .sort((a, b) => b.date.localeCompare(a.date));
        return all[0] || null;
    }

    // ==========================================================================
    // Notificaciones del profesor
    // ==========================================================================
    getNotifications() {
        try {
            return JSON.parse(localStorage.getItem("gs-notifications") || "[]");
        } catch {
            return [];
        }
    }

    saveNotifications(notifications) {
        localStorage.setItem("gs-notifications", JSON.stringify(notifications));
    }

    addNotification(notif) {
        const arr = this.getNotifications();
        arr.push(notif);
        this.saveNotifications(arr);
    }

    clearNotifications() {
        this.saveNotifications([]);
    }

    async getLibraryItemsByProfile(profileId) {
        const all = await this.getLibraryItems();
        return all.filter(item => item.uploadedBy === profileId);
    }

    async getLibraryItemsForClase(claseId) {
        const all = await this.getLibraryItems();
        return all.filter(item => item.claseId === claseId);
    }

    getDefaultLevels() {
        try {
            const raw = JSON.parse(localStorage.getItem('gs-default-levels'));
            return Array.isArray(raw) && raw.length ? raw : ['Inicial', 'Intermedio', 'Avanzado'];
        } catch {
            return ['Inicial', 'Intermedio', 'Avanzado'];
        }
    }
    setDefaultLevels(arr) {
        localStorage.setItem('gs-default-levels', JSON.stringify(arr));
    }

    getDefaultStyles() {
        try {
            const raw = JSON.parse(localStorage.getItem('gs-default-styles'));
            return Array.isArray(raw) && raw.length ? raw : ['Tango', 'Folklore', 'Clásico', 'Jazz'];
        } catch {
            return ['Tango', 'Folklore', 'Clásico', 'Jazz'];
        }
    }
    setDefaultStyles(arr) {
        localStorage.setItem('gs-default-styles', JSON.stringify(arr));
    }

    // ==========================================================================
    // Configuración de campos de la Ficha del Alumno
    // ==========================================================================
    getFichaFields() {
        try {
            const raw = JSON.parse(localStorage.getItem('gs-ficha-fields'));
            return Array.isArray(raw) && raw.length ? raw : [
                'Estudios/Conocimientos previos',
                'Gustos musicales / Intereses',
                'Repertorio/Canciones que ya sabe',
                'País / Localidad',
                'Edad'
            ];
        } catch {
            return [
                'Estudios/Conocimientos previos',
                'Gustos musicales / Intereses',
                'Repertorio/Canciones que ya sabe',
                'País / Localidad',
                'Edad'
            ];
        }
    }
    setFichaFields(arr) {
        localStorage.setItem('gs-ficha-fields', JSON.stringify(arr));
    }

    // ==========================================================================
    // Grupos/Cursos — localStorage gs-groups
    // ==========================================================================
    _getGroupsRaw() {
        try { return JSON.parse(localStorage.getItem('gs-groups') || '[]'); } catch { return []; }
    }
    _saveGroupsRaw(arr) {
        localStorage.setItem('gs-groups', JSON.stringify(arr));
    }
    saveGroups(arr) {
        this._saveGroupsRaw(arr);
    }
    getAllGroups() {
        return this._getGroupsRaw();
    }
    getGroup(id) {
        return this._getGroupsRaw().find(g => g.id === id) || null;
    }
    saveGroup(group) {
        const arr = this._getGroupsRaw().filter(g => g.id !== group.id);
        arr.push(group);
        this._saveGroupsRaw(arr);
    }
    // ==========================================================================
    // Migración de Plantillas de clase a esquema unificado v2 (items:[{libraryItemId,cat}])
    // ==========================================================================
    migrateTemplatesFormat() {
        const rawTemplates = localStorage.getItem('gs-templates');
        if (!rawTemplates) return;

        let templates = [];
        try {
            templates = JSON.parse(rawTemplates);
        } catch {
            return;
        }

        if (!Array.isArray(templates) || templates.length === 0) return;

        // Validar si es necesario migrar (si al menos una tiene la estructura vieja "content")
        const needsMigration = templates.some(t => t.content && (t.content.technique || t.content.reading || t.content.repertoire));
        if (!needsMigration) return;

        // 1. Crear backup en gs-templates-backup si no existe ya
        if (!localStorage.getItem('gs-templates-backup')) {
            localStorage.setItem('gs-templates-backup', rawTemplates);
        }

        // 2. Ejecutar la migración de forma no-destructiva e idempotente
        const migrated = templates.map(t => {
            if (!t.content) return t;
            
            const newItems = t.items ? [...t.items] : [];
            const cats = {
                technique: 'Técnica',
                reading: 'Lectura',
                repertoire: 'Repertorio'
            };

            for (const [oldCat, newCat] of Object.entries(cats)) {
                const oldList = t.content[oldCat];
                if (Array.isArray(oldList)) {
                    oldList.forEach(itemId => {
                        // Idempotencia: Verificar que no esté duplicado
                        const exists = newItems.some(ti => ti.libraryItemId === itemId && ti.cat === newCat);
                        if (!exists) {
                            newItems.push({ libraryItemId: itemId, cat: newCat });
                        }
                    });
                }
            }

            t.items = newItems;
            // No borramos t.content viejo, se conserva no-destructivamente
            return t;
        });

        localStorage.setItem('gs-templates', JSON.stringify(migrated));
    }
}


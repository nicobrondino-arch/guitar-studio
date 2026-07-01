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
    deleteGroup(id) {
        this._saveGroupsRaw(this._getGroupsRaw().filter(g => g.id !== id));
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


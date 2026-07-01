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
// 1. Diccionario de Traducción (ES / EN)
// ==========================================================================
const TRANSLATIONS = {
    es: {
        "app-title": "Guitar Studio - Racha y Rutina de Práctica",
        "nav-studio": "Mi Estudio",
        "nav-practice": "Práctica Diaria",
        "nav-notebook": "Cuaderno",
        "nav-library": "Biblioteca",
        "header-welcome": "Hola, Guitarrista",
        "streak-label": "Días",
        "feat-badge-text": "CONSTANCIA",
        "studio-streak-title": "¡Inicia tu racha de hoy!",
        "studio-streak-desc": "Toca 15 minutos para mantener encendido tu fuego de práctica.",
        "btn-start-practice": "Comenzar Práctica",
        "card-progress-title": "Progreso de Hoy",
        "card-teacher-title": "Cuaderno del Profesor",
        "btn-edit": "Ver Completo",
        "no-notes-yet": "No hay anotaciones registradas para esta semana. Ve al Cuaderno.",
        "card-heatmap-title": "Consistencia Mensual",
        "card-heatmap-subtitle": "Tus días practicados en el último mes",
        "practice-session-title": "Mi Sesión",
        "mod-left-hand": "Mano Izquierda",
        "mod-right-hand": "Mano Derecha",
        "mod-sight-reading": "Lectura A Primera Vista",
        "mod-weekly-focus": "Enfoque Semanal",
        "quick-tools-title": "Herramientas Rápidas",
        "metro-title": "Metrónomo",
        "btn-play": "Iniciar",
        "btn-stop": "Detener",
        "left-hand-routine-title": "Rutina de Mano Izquierda",
        "right-hand-routine-title": "Rutina de Mano Derecha",
        "sight-reading-title": "Lectura a Primera Vista",
        "sight-reading-ex-title": "Descifrado Rápido de Notas",
        "sight-reading-ex-desc": "Abre una partitura al azar en la biblioteca o de tus libros de estudio. Toca directamente la línea melódica sin ensayar antes, prestando atención al pulso y fluidez.",
        "sight-reading-tip-box": "<strong>💡 Consejo del Día:</strong> Lee un compás adelante de lo que tus dedos están tocando en ese momento. Eso te dará tiempo para anticipar los cambios de posición.",
        "btn-timer-start": "Iniciar Reloj",
        "btn-timer-reset": "Reiniciar",
        "btn-complete-step": "Marcar como Completado",
        "guitar-pro-viewer-title": "Visor Guitar Pro",
        "gp-no-file": "No hay ningún archivo de Guitar Pro (.gp, .gp5) cargado para esta semana.",
        "btn-go-upload": "Subir archivo GP",
        "gp-speed": "Velocidad:",
        "gp-tracks": "Pista activa:",
        "btn-complete-session": "Finalizar Práctica Diaria",
        "notebook-title": "Cuaderno del Profesor",
        "notebook-subtitle": "Registra las correcciones del profesor y carga partituras de Guitar Pro",
        "card-class-notes": "Anotaciones de la Clase",
        "lbl-teacher": "Nombre del Profesor",
        "lbl-focus": "Enfoque de la Semana (Tareas del Módulo 4)",
        "lbl-corrections": "Correcciones Técnicas a Recordar",
        "btn-save-notebook": "Guardar Anotaciones",
        "card-gp-upload": "Subida de Guitar Pro",
        "gp-uploader-subtitle": "Sube el archivo de tu clase para reproducirlo en la Práctica Diaria.",
        "dropzone-text": "Arrastra y suelta tu archivo .gp, .gp5 o .gpx aquí",
        "dropzone-or": "o",
        "btn-browse": "Explorar Archivos",
        "current-file-title": "Archivo Cargado Actualmente",
        "no-file-loaded": "Ningún archivo cargado",
        "btn-delete": "Eliminar",
        "library-title": "Biblioteca de Estudio",
        "library-subtitle": "Selecciona ejercicios de guitarra estructurados para enriquecer tus rutinas",
        "filter-all": "Todos",
        "filter-left": "Mano Izquierda",
        "filter-right": "Mano Derecha",
        "filter-reading": "Lectura",
        "add-routine-btn": "Cargar Ejercicio",
        "note-saved-success": "¡Anotaciones guardadas correctamente!",
        "practice-complete-congrats": "¡Felicidades! Completaste tu práctica de hoy. Tu racha aumentó. 🔥",
        "left-hand-default-name": "La Araña Dinámica (Digitación)",
        "left-hand-default-desc": "Toca en el traste 5 en adelante, cuerda por cuerda, alternando dedos 1-2-3-4. Mantén la mano relajada y el pulgar alineado en el centro del mástil.",
        "right-hand-default-name": "Patrón de Arpegios Giuliani (P-I-M-A)",
        "right-hand-default-desc": "Toca cuerdas al aire en patrón de arpegio: Pulgar en los bajos (6ª, 5ª o 4ª), Índice en 3ª, Medio en 2ª y Anular en 1ª cuerda. Uniformidad y regularidad.",
        "nav-playground": "Editor AlphaTex",
        "playground-title": "Editor Interactivo (Playground)",
        "playground-subtitle": "Escribe, edita y reproduce tablaturas en formato de texto AlphaTex",
        "playground-editor-title": "Código AlphaTex",
        "btn-load-example": "Cargar Ejemplo",
        "btn-copy-code": "Copiar Código",
        "btn-clear-code": "Limpiar",
        "btn-convert-playground": "Convertir y Editar en Playground",
        "code-copied-success": "¡Código copiado al portapapeles!",
        "example-loaded-success": "¡Ejemplo cargado!",
        "gp-loading": "Cargando partitura...",
        "gp-bar-label": "Compás",
        "gp-loop-section-lbl": "Repetir Sección",
        "gp-loop-section-select-opt": "- Ninguna -",
        "gp-loop-from-lbl": "De:",
        "gp-loop-to-lbl": "A:",
        "gp-loop-apply-btn": "OK",
        "gp-autobpm-lbl": "Auto BPM",
        "gp-autobpm-step-lbl": "+BPM/rep",
        "gp-autobpm-target-lbl": "Meta",
        "gp-autobpm-on": "ON",
        "gp-autobpm-off": "OFF",
        "cat-technique": "Técnica",
        "cat-reading": "Lectura Musical",
        "cat-repertoire": "Enfoque Semanal",
        "btn-back-exercises": "Ejercicios",
        "btn-complete-category": "Marcar Completado",
        "card-weeks-title": "Semanas de Trabajo",
        "btn-new-week": "+ Nueva Semana",
        "no-weeks-yet": "No hay semanas creadas aún.",
        "card-library-title": "Biblioteca de Contenido",
        "no-library-items": "La biblioteca está vacía. Sube archivos o agrega URLs arriba.",
        "uploader-gp-title": "Archivo Guitar Pro",
        "uploader-pdf-title": "Archivo PDF",
        "uploader-yt-title": "Video de YouTube",
        "uploader-spotify-title": "Spotify",
        "dropzone-gp-text": ".gp, .gp5, .gpx",
        "dropzone-pdf-text": ".pdf",
        "btn-add-url": "Agregar",
        "lbl-week-assign": "Asignar a semana",
        "lbl-categories": "Categorías",
        "practice-empty-state": "No hay ejercicios asignados a esta categoría para ninguna semana.",
        "practice-empty-go-notebook": "Ir al Cuaderno para agregar contenido",
        "btn-open-player": "Abrir en Player",
        "btn-open-pdf": "Abrir PDF",
        "week-new-title-placeholder": "Ej. Semana 3 - Escalas mayores",
        "week-title-label": "Título de la semana",
        "btn-create-week": "Crear Semana",
        "btn-cancel": "Cancelar",
        "confirm-delete-week": "¿Eliminar esta semana y todos sus ejercicios asignados?",
        "confirm-delete-library-item": "¿Eliminar este ítem de la biblioteca?",
        "notebook-subtitle": "Anotaciones, semanas de trabajo y biblioteca de contenido",
        "timer-label": "Tiempo en esta categoría",
        "lbl-focus": "Enfoque de la Semana"
    },
    en: {
        "app-title": "Guitar Studio - Streak and Practice Routine",
        "nav-studio": "My Studio",
        "nav-practice": "Daily Practice",
        "nav-notebook": "Notebook",
        "nav-library": "Library",
        "header-welcome": "Hello, Guitarist",
        "streak-label": "Days",
        "feat-badge-text": "CONSISTENCY",
        "studio-streak-title": "Start your streak today!",
        "studio-streak-desc": "Play for 15 minutes to keep your practice fire burning.",
        "btn-start-practice": "Start Practice",
        "card-progress-title": "Today's Progress",
        "card-teacher-title": "Teacher's Notebook",
        "btn-edit": "View Full",
        "no-notes-yet": "No corrections logged for this week. Go to the Notebook.",
        "card-heatmap-title": "Monthly Consistency",
        "card-heatmap-subtitle": "Your practiced days in the last month",
        "practice-session-title": "My Session",
        "mod-left-hand": "Left Hand",
        "mod-right-hand": "Right Hand",
        "mod-sight-reading": "Sight Reading",
        "mod-weekly-focus": "Weekly Focus",
        "quick-tools-title": "Quick Tools",
        "metro-title": "Metronome",
        "btn-play": "Start",
        "btn-stop": "Stop",
        "left-hand-routine-title": "Left Hand Routine",
        "right-hand-routine-title": "Right Hand Routine",
        "sight-reading-title": "Sight Reading",
        "sight-reading-ex-title": "Quick Note Decoding",
        "sight-reading-ex-desc": "Open a random score in the library or from your books. Directly play the melodic line without practicing beforehand, focusing purely on pulse and flow.",
        "sight-reading-tip-box": "<strong>💡 Tip of the Day:</strong> Read one bar ahead of what your fingers are currently playing. This gives you time to anticipate position shifts.",
        "btn-timer-start": "Start Clock",
        "btn-timer-reset": "Reset",
        "btn-complete-step": "Mark as Completed",
        "guitar-pro-viewer-title": "Guitar Pro Viewer",
        "gp-no-file": "No Guitar Pro file (.gp, .gp5) loaded for this week.",
        "btn-go-upload": "Upload GP File",
        "gp-speed": "Speed:",
        "gp-tracks": "Active Track:",
        "btn-complete-session": "Finish Daily Practice",
        "notebook-title": "Teacher's Notebook",
        "notebook-subtitle": "Record weekly corrections and upload Guitar Pro scores",
        "card-class-notes": "Class Annotations",
        "lbl-teacher": "Teacher's Name",
        "lbl-focus": "Weekly Focus (Module 4 Tasks)",
        "lbl-corrections": "Technical Corrections to Remember",
        "btn-save-notebook": "Save Annotations",
        "card-gp-upload": "Guitar Pro Upload",
        "gp-uploader-subtitle": "Upload your class file to play it inside the Daily Practice.",
        "dropzone-text": "Drag and drop your .gp, .gp5 or .gpx file here",
        "dropzone-or": "or",
        "btn-browse": "Browse Files",
        "current-file-title": "Currently Loaded File",
        "no-file-loaded": "No file loaded",
        "btn-delete": "Delete",
        "library-title": "Study Library",
        "library-subtitle": "Select structured guitar exercises to enrich your routines",
        "filter-all": "All",
        "filter-left": "Left Hand",
        "filter-right": "Right Hand",
        "filter-reading": "Sight Reading",
        "add-routine-btn": "Load Exercise",
        "note-saved-success": "Annotations saved successfully!",
        "practice-complete-congrats": "Congratulations! You finished today's practice. Your streak increased. 🔥",
        "left-hand-default-name": "The Dynamic Spider (Fingering)",
        "left-hand-default-desc": "Play fret 5 and up, string by string, alternating fingers 1-2-3-4. Keep the hand relaxed and the thumb aligned in the center of the neck.",
        "right-hand-default-name": "Giuliani Arpeggio Pattern (P-I-M-A)",
        "right-hand-default-desc": "Play open strings in an arpeggio pattern: Thumb on bass strings, Index on 3rd, Middle on 2nd, Ring on 1st. Regularity and volume control.",
        "nav-playground": "AlphaTex Editor",
        "playground-title": "Interactive Editor (Playground)",
        "playground-subtitle": "Write, edit, and play tablature in AlphaTex text format",
        "playground-editor-title": "AlphaTex Code",
        "btn-load-example": "Load Example",
        "btn-copy-code": "Copy Code",
        "btn-clear-code": "Clear",
        "btn-convert-playground": "Convert and Edit in Playground",
        "code-copied-success": "Code copied to clipboard!",
        "example-loaded-success": "Example loaded!",
        "gp-loading": "Loading score...",
        "gp-bar-label": "Bar",
        "gp-loop-section-lbl": "Repeat Section",
        "gp-loop-section-select-opt": "- None -",
        "gp-loop-from-lbl": "From:",
        "gp-loop-to-lbl": "To:",
        "gp-loop-apply-btn": "OK",
        "gp-autobpm-lbl": "Auto BPM",
        "gp-autobpm-step-lbl": "+BPM/loop",
        "gp-autobpm-target-lbl": "Target",
        "gp-autobpm-on": "ON",
        "gp-autobpm-off": "OFF",
        "cat-technique": "Technique",
        "cat-reading": "Music Reading",
        "cat-repertoire": "Weekly Focus",
        "btn-back-exercises": "Exercises",
        "btn-complete-category": "Mark Completed",
        "card-weeks-title": "Work Weeks",
        "btn-new-week": "+ New Week",
        "no-weeks-yet": "No weeks created yet.",
        "card-library-title": "Content Library",
        "no-library-items": "Library is empty. Upload files or add URLs above.",
        "uploader-gp-title": "Guitar Pro File",
        "uploader-pdf-title": "PDF File",
        "uploader-yt-title": "YouTube Video",
        "uploader-spotify-title": "Spotify",
        "dropzone-gp-text": ".gp, .gp5, .gpx",
        "dropzone-pdf-text": ".pdf",
        "btn-add-url": "Add",
        "lbl-week-assign": "Assign to week",
        "lbl-categories": "Categories",
        "practice-empty-state": "No exercises assigned to this category for any week.",
        "practice-empty-go-notebook": "Go to Notebook to add content",
        "btn-open-player": "Open in Player",
        "btn-open-pdf": "Open PDF",
        "week-new-title-placeholder": "E.g. Week 3 - Major Scales",
        "week-title-label": "Week title",
        "btn-create-week": "Create Week",
        "btn-cancel": "Cancel",
        "confirm-delete-week": "Delete this week and all its assigned exercises?",
        "confirm-delete-library-item": "Delete this library item?",
        "notebook-subtitle": "Annotations, work weeks and content library",
        "timer-label": "Time in this category",
        "lbl-focus": "Weekly Focus"
    }
};

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

// ==========================================================================
// 3. Biblioteca de Ejercicios Preestablecidos
// ==========================================================================
const EXERCISES_DATABASE = [
    {
        id: "ex-left-1",
        category: "left",
        difficulty: "easy",
        nameEs: "1. Ligados Ascendentes (Hammer-on)",
        nameEn: "1. Ascending Slurs (Hammer-on)",
        descEs: "Alterna dedos 1 y 2 en el traste 5 y 6. Pulsa la primera nota con la púa y golpea la segunda nota fuertemente con el dedo 2 sin pulsar de nuevo.",
        descEn: "Alternate fingers 1 and 2 on frets 5 and 6. Pick the first note and strike the second note firmly with finger 2 without picking again.",
        alphaTex: "\\title \"Hammer-on\" . :g :8 5.1 6.1 5.1 6.1 5.1 6.1 5.1 6.1"
    },
    {
        id: "ex-left-2",
        category: "left",
        difficulty: "medium",
        nameEs: "2. Independencia de Dedos (1-3-2-4)",
        nameEn: "2. Finger Independence (1-3-2-4)",
        descEs: "Digitación salteada para entrenar la independencia cerebral de los dedos de la mano izquierda en cuerdas altas. Mantén velocidad lenta.",
        descEn: "Skipped fingering pattern to train cognitive independence of left hand fingers on high strings. Keep a slow tempo.",
        alphaTex: "\\title \"1-3-2-4\" . :g :8 5.1 7.1 6.1 8.1 5.2 7.2 6.2 8.2"
    },
    {
        id: "ex-right-1",
        category: "right",
        difficulty: "easy",
        nameEs: "1. Trémolo Básico (P-I-M-A alternado)",
        nameEn: "1. Basic Tremolo (Alternated P-I-M-A)",
        descEs: "Toque continuo y rápido de una sola cuerda (ej. 1ª cuerda) alternando dedos anular-medio-índice, precedido por el pulgar en el bajo.",
        descEn: "Continuous, fast plucking of a single string (e.g. 1st string) alternating ring-middle-index fingers, preceded by thumb on bass.",
        alphaTex: "\\title \"Trémolo PIMA\" . :g :8 0.6 :16 0.1 0.1 0.1 :8 0.6 :16 0.1 0.1 0.1"
    },
    {
        id: "ex-right-2",
        category: "right",
        difficulty: "hard",
        nameEs: "2. Sweep Picking de 3 Cuerdas",
        nameEn: "2. 3-String Sweep Picking",
        descEs: "Desliza la púa hacia abajo a través de 3 cuerdas en un solo movimiento fluido (barrido), y luego hacia arriba. Sincroniza con la mano izquierda.",
        descEn: "Slide the pick downward across 3 strings in a single fluid sweeping motion, then upward. Synchronize with the left hand.",
        alphaTex: "\\title \"Sweep Picking\" . :g :8 14.3 13.2 12.1 15.1 12.1 13.2 14.3"
    },
    {
        id: "ex-reading-1",
        category: "reading",
        difficulty: "medium",
        nameEs: "1. Lectura en Primera Posición (Do Mayor)",
        nameEn: "1. First Position Reading (C Major)",
        descEs: "Lee notas limitándote a los primeros 4 trastes. Memoriza la ubicación de Do, Re, Mi, Fa, Sol, La, Si en pentagrama y mástil.",
        descEn: "Read notes restricted to the first 4 frets. Memorize the locations of C, D, E, F, G, A, B on both staff and fretboard.",
        alphaTex: "\\title \"Do Mayor\" . :g :4 3.5 0.4 2.4 3.4 0.3 2.3 0.2 1.2 3.2 0.1"
    }
];

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
        this._tbAllWeeksCache = [];
        this._tbConsultasSearch = '';
        this._tbConsultasFilter = 'todos'; // 'todos' | 'pendientes' | 'respondidas'

        // Búsqueda y filtros de la biblioteca del alumno
        this._myLibSearch = '';
        this._myLibColFilters = { type: [], category: [], level: [], style: [] };
        this._myLibViewMode = 'clases';
        this._studioClassTab = 'next';
        this._studioSelectedGroupId = null;
        this._studioSelectedClaseId = null;

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
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    checkStreakValidity() {
        if (!this.lastPracticedDate) {
            this.streak = 0;
            this.saveStreak();
            return;
        }

        const today = new Date(this.getTodayString());
        const lastPracticed = new Date(this.lastPracticedDate);

        const diffTime = Math.abs(today - lastPracticed);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
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
    async renderStudioSelectorAndDetails() {
        const groupSelect = document.getElementById('studio-group-selector');
        const classSelect = document.getElementById('studio-class-selector');
        const detailsContainer = document.getElementById('studio-class-details-container');
        
        if (!groupSelect || !classSelect || !detailsContainer) return;
        if (!this.activeProfile) return;

        // 1. Obtener grupos del alumno
        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
        if (groups.length === 0) {
            groupSelect.innerHTML = '<option value="">Sin cursos asignados</option>';
            classSelect.innerHTML = '<option value="">Sin clases</option>';
            detailsContainer.innerHTML = '<p class="text-muted" style="padding:16px; text-align:center">No estás asignado a ningún grupo o curso aún.</p>';
            
            // Actualizar tiempo de estudio a 0
            const timeValEl = document.getElementById("studio-total-time-value");
            if (timeValEl) timeValEl.textContent = "0 min";
            return;
        }

        // 2. Poblar selector de grupos si es necesario o si cambió
        if (!this._studioSelectedGroupId || !groups.some(g => g.id === this._studioSelectedGroupId)) {
            this._studioSelectedGroupId = groups[0].id;
        }
        
        const groupOptions = groups.map(g => `<option value="${g.id}" ${g.id === this._studioSelectedGroupId ? 'selected' : ''}>${this._escapeHtml(g.name)}</option>`).join('');
        groupSelect.innerHTML = groupOptions;

        const selectedGroupId = this._studioSelectedGroupId;
        const selectedGroup = groups.find(g => g.id === selectedGroupId) || {};

        // 3. Obtener clases finalizadas del grupo seleccionado
        const allClases = this.data.getAllClases();
        const myClases = allClases
            .filter(c => c.groupId === selectedGroupId && c.status === 'finalizada')
            .sort((a, b) => {
                const ta = b.finalizadaAt || b.date || '';
                const tb = a.finalizadaAt || a.date || '';
                return tb.localeCompare(ta); // Más reciente primero (la clase activa actual al inicio)
            });

        if (myClases.length === 0) {
            classSelect.innerHTML = '<option value="">Sin clases finalizadas</option>';
            detailsContainer.innerHTML = '<p class="text-muted" style="padding:16px; text-align:center">No hay clases registradas para este curso.</p>';
            
            // Actualizar tiempo de estudio a 0
            const timeValEl = document.getElementById("studio-total-time-value");
            if (timeValEl) timeValEl.textContent = "0 min";
            return;
        }

        // Poblar selector de clases
        if (!this._studioSelectedClaseId || !myClases.some(c => c.id === this._studioSelectedClaseId)) {
            this._studioSelectedClaseId = myClases[0].id;
        }

        const classOptions = myClases.map((c, idx) => {
            const dateLabel = c.date ? new Date(c.date + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : 'Clase';
            const label = idx === 0 ? `Clase Activa (${dateLabel})` : `Clase del ${dateLabel}`;
            return `<option value="${c.id}" ${c.id === this._studioSelectedClaseId ? 'selected' : ''}>${label}</option>`;
        }).join('');
        classSelect.innerHTML = classOptions;

        const selectedClaseId = this._studioSelectedClaseId;
        const clase = myClases.find(c => c.id === selectedClaseId) || myClases[0];

        // 4. Calcular y actualizar Tiempo Total de Estudio para esta clase
        const totalPracticeSeconds = await this.getPracticeTimeForClass(clase);
        const totalMinutes = Math.round(totalPracticeSeconds / 60);
        const timeValEl = document.getElementById("studio-total-time-value");
        if (timeValEl) timeValEl.textContent = `${totalMinutes} min`;

        // 5. Renderizar detalles de la clase seleccionada
        const dateLabel = clase.date ? new Date(clase.date + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
        const capDate = dateLabel ? dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1) : '';
        const timePart = selectedGroup.time ? ' · ' + selectedGroup.time.slice(0, 5) : '';

        const meetHref = /^https?:/.test(selectedGroup.meetLink || '') ? selectedGroup.meetLink : 'https://' + (selectedGroup.meetLink || '');
        const meetEl = selectedGroup.meetLink ? `
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
                return `<div class="pc-item" onclick="app.openLibraryItemById('${c.id}')" style="cursor:pointer">${iconSvg}${this._escapeHtml(title)}</div>`;
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

        detailsContainer.innerHTML = `
            <div class="card proxima-card" style="margin-bottom:0">
                <div class="proxima-header">
                    <div>
                        <div class="proxima-label">Detalles de la Clase</div>
                        <div class="proxima-title" style="font-size:16px; margin: 2px 0">${this._escapeHtml(selectedGroup.name || clase.title || 'Clase')}</div>
                        <div class="proxima-meta">${capDate}${timePart}</div>
                    </div>
                    ${meetEl}
                </div>
                <div class="proxima-body">
                    ${contentByCat}
                    ${notaAlumno}
                    ${!hasContent ? '<p class="text-muted" style="font:italic 13px var(--font-heading,serif); margin:0; padding: 8px 0">El profesor no asignó contenido específico en esta clase.</p>' : ''}
                </div>
            </div>
            
            <button class="btn btn-primary" onclick="app.navigateToPractice()" style="width:100%; padding:14px; font-size:15px; font-weight:700; border-radius:10px; background:linear-gradient(135deg, var(--tb-accent), var(--tb-accent-hover)); border:none; box-shadow:0 4px 15px rgba(108,99,255,0.25); display:flex; align-items:center; justify-content:center; gap:8px">
                🚀 Comenzar Práctica Diaria
            </button>
        `;
    }

    handleStudioGroupChange(groupId) {
        this._studioSelectedGroupId = groupId;
        this._studioSelectedClaseId = null;
        this.renderStudioSelectorAndDetails();
    }

    handleStudioClassChange(claseId) {
        this._studioSelectedClaseId = claseId;
        this.renderStudioSelectorAndDetails();
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

        const practicedToday = this.lastPracticedDate === this.getTodayString();
        const descEl = document.getElementById("studio-streak-desc");
        if (descEl) {
            descEl.textContent = practicedToday
                ? "¡Excelente trabajo! Ya practicaste hoy. Nos vemos mañana. 🎸"
                : this.streak > 0
                    ? `Llevas ${this.streak} ${this.streak === 1 ? 'día' : 'días'} seguidos. ¡No pares!`
                    : "Toca 15 minutos para encender el fuego de la constancia.";
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
        document.getElementById("btn-save-notes").addEventListener("click", () => this.saveTeacherNotes());

        // Botón Nueva Semana
        const btnNewWeek = document.getElementById("btn-new-week");
        if (btnNewWeek) btnNewWeek.addEventListener("click", () => this.showNewWeekForm());

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
            // Obtener clase activa/seleccionada
            const groups = this.data.getAllGroups().filter(g => (g.memberIds||[]).includes(this.activeProfile?.id));
            let clase = null;
            if (this._studioSelectedClaseId) {
                clase = this.data.getAllClases().find(c => c.id === this._studioSelectedClaseId);
            }
            if (!clase && groups.length > 0) {
                const clases = this.data.getAllClases()
                    .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
                    .sort((a,b) => (b.finalizadaAt||0) - (a.finalizadaAt||0));
                if (clases.length > 0) clase = clases[0];
            }
            
            if (clase) {
                const catMap = { 'Técnica': 0, 'Lectura': 1, 'Lectura Musical': 1, 'Repertorio': 2 };
                const catItems = (clase.content || []).filter(item => {
                    let catVal = item.cat;
                    if (typeof catVal === 'string') catVal = catMap[catVal];
                    if (catVal === undefined || catVal === null) catVal = 0;
                    return catVal === catIdx;
                });
                try {
                    const allLib = await this.data.getLibraryItems();
                    resolvedItems = catItems.map(cItem => allLib.find(li => li.id === cItem.id)).filter(Boolean);
                } catch(e) { console.warn(e); }
            }
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
                    html += `<li class="week-type-item" onclick="${action(item.id)}" style="background:var(--tb-bg-primary); border:1px solid var(--tb-border); border-radius:8px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; transition:transform .2s">
                        <span class="week-type-item-title" style="font-weight:500; font-size:13px">${this._escapeHtml(item.title)}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;opacity:.4"><polyline points="9 18 15 12 9 6"/></svg>
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
    async _renderPracticeObjectives() {
        if (!this.activeProfile || this.isProfessorMode) return '';
        const groups = this.data.getAllGroups().filter(g => (g.memberIds||[]).includes(this.activeProfile.id));
        if (!groups.length) return '';
        let clase = null;
        if (this._studioSelectedClaseId) {
            clase = this.data.getAllClases().find(c => c.id === this._studioSelectedClaseId);
        }
        if (!clase) {
            const clases = this.data.getAllClases()
                .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
                .sort((a,b) => (b.finalizadaAt||0) - (a.finalizadaAt||0));
            if (!clases.length) return '';
            clase = clases[0];
        }
        const objetivos = clase.objetivos || [];
        if (!objetivos.length) return '';
        const completados = this.data.getObjetivosCompletados(this.activeProfile.id);
        const done = objetivos.filter(o => completados[`${clase.id}__${o.id}`]).length;
        const items = objetivos.map(o => {
            const key = `${clase.id}__${o.id}`;
            const isDone = !!completados[key];
            return `<div class="obj-check-row${isDone?' done':''}" onclick="app.toggleObjetivo('${clase.id}','${o.id}')">
                <div class="obj-checkbox${isDone?' checked':''}">
                    ${isDone?'<svg viewBox="0 0 10 10" fill="none" style="width:9px;height:9px"><path d="M2 5l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>':''}
                </div>
                <span class="obj-text">${this._escapeHtml(o.text)}</span>
            </div>`;
        }).join('');
        return `<div class="practice-objectives-card">
            <div class="practice-objectives-header">
                <span>Objetivos del profesor</span>
                <span>${done}/${objetivos.length} completados</span>
            </div>
            <div class="practice-objectives-list">${items}</div>
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

    // ==========================================================================
    // Cuaderno — Plantillas
    // ==========================================================================
    renderTemplatesInNotebook() {
        const list = document.getElementById('nb-template-list');
        if (!list) return;
        const tpls = this.data.getTemplates();
        if (!tpls.length) {
            list.innerHTML = '<p class="text-muted" style="padding:12px;font-size:12px">Sin plantillas. Creá una para empezar.</p>';
            return;
        }
        list.innerHTML = tpls.map(t => {
            const isActive = t.id === this._activeTplId;
            const cntT = (t.content?.technique||[]).length;
            const cntL = (t.content?.reading||[]).length;
            return `<div class="nb-tpl-card${isActive?' active':''}" onclick="app.selectTemplate('${t.id}')">
                <div class="nb-tpl-dot" style="background:${isActive?'var(--tb-accent)':'var(--tb-border)'}"></div>
                <div class="nb-tpl-name">${this._escapeHtml(t.name)}</div>
                <div class="nb-tpl-meta">${this._escapeHtml(t.meta||'')}</div>
                <div class="nb-tpl-cats">
                    <div class="nb-tpl-cat-row"><span style="color:#a29bfe">Técnica</span><span>${cntT?cntT+' ítem'+(cntT!==1?'s':''):'—'}</span></div>
                    <div class="nb-tpl-cat-row"><span style="color:#55efc4">Lectura</span><span>${cntL?cntL+' ítem'+(cntL!==1?'s':''):'—'}</span></div>
                    <div class="nb-tpl-cat-row"><span style="color:#fdcb6e">Repertorio</span><em style="color:var(--tb-border);font-size:10px">vacío — en clase</em></div>
                </div>
                <button onclick="event.stopPropagation();app.deleteTemplate('${t.id}')" class="nb-tpl-del">×</button>
            </div>`;
        }).join('');
    }

    selectTemplate(id) {
        this._activeTplId = id === this._activeTplId ? null : id;
        this.renderTemplatesInNotebook();
        this.renderLibraryTable();
    }

    async newTemplate() {
        const name = prompt('Nombre de la plantilla:');
        if (!name?.trim()) return;
        const tpl = {
            id: this.data.generateId('tpl'),
            name: name.trim(),
            meta: '',
            content: { technique:[], reading:[], repertoire:[] },
            createdAt: Date.now()
        };
        this.data.saveTemplate(tpl);
        this._activeTplId = tpl.id;
        this.renderTemplatesInNotebook();
        this.renderLibraryTable();
    }

    deleteTemplate(id) {
        if (!confirm('¿Eliminar esta plantilla?')) return;
        this.data.deleteTemplate(id);
        if (this._activeTplId === id) this._activeTplId = null;
        this.renderTemplatesInNotebook();
        this.renderLibraryTable();
    }

    async toggleItemInTemplate(itemId) {
        if (!this._activeTplId) { this.showToast('Seleccioná una plantilla primero.', '⚠️'); return; }
        const tpl = this.data.getTemplates().find(t => t.id === this._activeTplId);
        if (!tpl) return;
        const item = await this.data.getLibraryItem(itemId);
        if (!item) return;
        const cat = item.category || 'technique';
        if (cat === 'repertoire') { this.showToast('El repertorio no va en plantillas — se asigna durante la clase.', 'ℹ️'); return; }
        const arr = [...(tpl.content[cat]||[])];
        const idx = arr.indexOf(itemId);
        if (idx > -1) arr.splice(idx, 1); else arr.push(itemId);
        tpl.content[cat] = arr;
        this.data.saveTemplate(tpl);
        this.renderLibraryTable();
    }

    _libFilterType = 'all';
    _libFilterCat  = 'all';
    _libFilterTpl  = false;
    _libSearch     = '';
    _activeTplId   = null;

    async renderLibraryTable() {
        const tbody = document.getElementById('nb-library-table');
        if (!tbody) return;
        const items = await this.data.getLibraryItems();
        const tpl = this._activeTplId ? this.data.getTemplates().find(t=>t.id===this._activeTplId) : null;
        const tplIds = tpl ? [...(tpl.content.technique||[]),...(tpl.content.reading||[])] : [];
        const catMap = { technique:'Técnica', reading:'Lectura', repertoire:'Repertorio', supplementary:'Compl.' };
        const catColor = { technique:'#a29bfe', reading:'#55efc4', repertoire:'#fdcb6e', supplementary:'#9e8a8e' };
        const typeLabel = { gp:'Guitar Pro', score:'Guitar Pro', pdf:'PDF', youtube:'YouTube', spotify:'Spotify' };
        const q = (this._libSearch||'').toLowerCase();
        const filtered = items.filter(it => {
            const title = (it.title||it.name||'').toLowerCase();
            if (q && !title.includes(q)) return false;
            const ftype = it.fileType || it.type || '';
            if (this._libFilterType !== 'all' && ftype !== this._libFilterType) return false;
            if (this._libFilterCat  !== 'all' && it.category !== this._libFilterCat) return false;
            if (this._libFilterTpl  && !tplIds.includes(it.id)) return false;
            return true;
        });
        if (!filtered.length) {
            tbody.innerHTML = '<div style="padding:24px;text-align:center"><p class="text-muted">Sin resultados</p></div>';
            return;
        }
        tbody.innerHTML = filtered.map(it => {
            const inTpl = tplIds.includes(it.id);
            const cat = it.category || '';
            const ftype = it.fileType || it.type || '';
            return `<div class="nb-table-row${inTpl?' in-tpl':''}">
                <div class="nb-row-type-dot" style="background:${cat==='technique'?'#a29bfe':cat==='reading'?'#55efc4':'#fdcb6e'}"></div>
                <span class="nb-row-title">${this._escapeHtml(it.title||it.name||'')}</span>
                <span class="nb-row-meta">${typeLabel[ftype]||ftype||'—'}</span>
                <span class="nb-cat-badge" style="color:${catColor[cat]||'#9e8a8e'}">${catMap[cat]||'—'}</span>
                <span class="nb-row-meta">${this._escapeHtml(it.level||'—')}</span>
                <span class="nb-row-meta">${this._escapeHtml(it.musicalStyle||'—')}</span>
                <div class="nb-tpl-toggle" onclick="app.toggleItemInTemplate('${it.id}')" title="${inTpl?'Quitar de plantilla':'Agregar a plantilla'}">
                    ${inTpl
                        ? '<svg viewBox="0 0 10 10" fill="none" style="width:11px;height:11px"><path d="M2 5l2 2 4-4" stroke="var(--tb-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                        : '<span style="color:var(--tb-border)">—</span>'}
                </div>
                <button class="nb-row-edit" onclick="app.showLibItemMetadataModal({id:'${it.id}'})">···</button>
            </div>`;
        }).join('');
    }

    filterLibrary(q) {
        this._libSearch = q;
        this.renderLibraryTable();
    }

    setLibFilter(val, btn) {
        document.querySelectorAll('.nb-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const types = ['gp','score','pdf','youtube','spotify'];
        const cats  = ['technique','reading','repertoire','supplementary'];
        if (val === 'all') { this._libFilterType='all'; this._libFilterCat='all'; }
        else if (types.includes(val)) { this._libFilterType=val; this._libFilterCat='all'; }
        else if (cats.includes(val))  { this._libFilterCat=val; this._libFilterType='all'; }
        this.renderLibraryTable();
    }

    toggleInTplFilter(btn) {
        this._libFilterTpl = !this._libFilterTpl;
        btn.classList.toggle('nb-chip-tpl-active', this._libFilterTpl);
        this.renderLibraryTable();
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

    // Muestra el formulario de nueva semana en el Cuaderno
    showNewWeekForm() {
        const container = document.getElementById("weeks-list-notebook");
        if (!container) return;
        const t = (key) => TRANSLATIONS[this.lang][key] || key;

        // Evitar duplicados
        if (document.getElementById("new-week-form")) return;

        const form = document.createElement("div");
        form.id = "new-week-form";
        form.className = "new-week-form";
        form.innerHTML = `
            <input type="text" class="form-control" id="new-week-title-input" placeholder="${t('week-new-title-placeholder')}" style="margin-bottom:8px;">
            <div style="display:flex;gap:8px;">
                <button class="btn btn-primary btn-sm" id="btn-confirm-new-week">${t('btn-create-week')}</button>
                <button class="btn btn-outline btn-sm" id="btn-cancel-new-week">${t('btn-cancel')}</button>
            </div>
        `;
        container.prepend(form);

        document.getElementById("btn-cancel-new-week").onclick = () => form.remove();
        document.getElementById("btn-confirm-new-week").onclick = async () => {
            const title = document.getElementById("new-week-title-input").value.trim();
            if (!title) return;
            const weeks = await this.data.getWeeks();
            const maxOrder = weeks.length > 0 ? Math.max(...weeks.map(w => w.order)) + 1 : 0;
            const week = {
                id: this.data.generateId('week'),
                title,
                createdAt: Date.now(),
                order: maxOrder,
                isActive: true
            };
            await this.data.saveWeek(week);
            form.remove();
            this.renderWeeksInNotebook();
        };
        document.getElementById("new-week-title-input").focus();
    }

    // Renderiza la lista de semanas en el Cuaderno
    async renderWeeksInNotebook() {
        const container = document.getElementById("weeks-list-notebook");
        if (!container) return;
        const t = (key) => TRANSLATIONS[this.lang][key] || key;

        const weeks = await this.data.getWeeks();
        if (weeks.length === 0) {
            container.innerHTML = `<p class="text-muted">${t('no-weeks-yet')}</p>`;
            return;
        }

        container.innerHTML = weeks.map(w => `
            <div class="week-list-item" data-week-id="${w.id}">
                <span class="week-list-title">${this._escapeHtml(w.title)}</span>
                <div class="week-list-actions">
                    <button class="btn btn-text btn-sm" onclick="app.renameWeek('${w.id}', this)" style="color:var(--tb-text-secondary)">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn btn-text btn-sm" onclick="app.deleteWeek('${w.id}')" style="color:var(--tb-accent)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async renameWeek(weekId, btn) {
        const item = btn.closest('.week-list-item');
        const titleEl = item.querySelector('.week-list-title');
        const currentTitle = titleEl.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.value = currentTitle;
        input.style.cssText = 'display:inline-block;width:auto;height:28px;font-size:13px;';
        titleEl.replaceWith(input);
        input.focus();
        input.select();
        const save = async () => {
            const newTitle = input.value.trim() || currentTitle;
            const weeks = await this.data.getWeeks();
            const week = weeks.find(w => w.id === weekId);
            if (week) { week.title = newTitle; await this.data.saveWeek(week); }
            this.renderWeeksInNotebook();
        };
        input.onblur = save;
        input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = currentTitle; input.blur(); } };
    }

    async deleteWeek(weekId) {
        const t = (key) => TRANSLATIONS[this.lang][key] || key;
        if (!confirm(t('confirm-delete-week'))) return;
        await this.data.deleteWeek(weekId);
        this.renderWeeksInNotebook();
        this.renderPracticeView();
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
    // 5. Multiidioma y Traducciones
    // ==========================================================================
    changeLanguage(lang) {
        if (this.lang === lang) return;
        this.lang = lang;
        this.data.setLang(lang);
        this.updateLanguageUI();
        this.updateStreakUI();
        this.renderLibraryExercises();
        this.loadTeacherNotesUI();
        this.renderPracticeView();
        this.renderWeeksInNotebook();
        this.renderLibraryInNotebook();
    }

    updateLanguageUI() {
        // Alternar botones activos de idioma
        if (this.lang === "es") {
            document.getElementById("btn-lang-es").classList.add("active");
            document.getElementById("btn-lang-en").classList.remove("active");
        } else {
            document.getElementById("btn-lang-es").classList.remove("active");
            document.getElementById("btn-lang-en").classList.add("active");
        }

        // Traducir todos los elementos marcados con data-i18n
        const translatables = document.querySelectorAll("[data-i18n]");
        translatables.forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (TRANSLATIONS[this.lang][key]) {
                // Comprobar si es un input para cambiar placeholder
                if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                    el.setAttribute("placeholder", TRANSLATIONS[this.lang][key]);
                } else {
                    el.innerHTML = TRANSLATIONS[this.lang][key];
                }
            }
        });
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
    // ==========================================================================
    // 9. AlphaTab Player
    // ==========================================================================
    async initAlphaTabPlayerIfNeeded(libraryItem) {
        // Si ya está inicializado, solo cargar el score si es diferente
        if (this.atApi) {
            if (libraryItem && this.atCurrentItemId !== libraryItem.id) {
                const bytes = libraryItem.bytes || libraryItem.fileData || libraryItem.data;
                this.atApi.load(new Uint8Array(bytes));
                this.atCurrentItemId = libraryItem.id;
            }
            return;
        }

        // Necesitamos bytes para inicializar
        const score = libraryItem || await this.data.getScore();
        if (!score) return;

        const getSectionName = (mb) => {
            const sObj = mb.section || mb.marker;
            if (!sObj) return null;
            if (typeof sObj === 'string') return sObj;
            const marker = sObj.marker !== undefined ? sObj.marker : '';
            const text = sObj.text !== undefined ? sObj.text : '';
            const parts = [];
            if (marker) parts.push(marker);
            if (text) parts.push(text);
            return parts.join(' - ');
        };

        const getBarEndTick = (s, barIndex) => {
            if (barIndex + 1 < s.masterBars.length) {
                return s.masterBars[barIndex + 1].start;
            }
            let maxTick = s.masterBars[barIndex].start;
            s.tracks.forEach(track => {
                track.staves.forEach(staff => {
                    if (staff.bars && staff.bars[barIndex]) {
                        const bar = staff.bars[barIndex];
                        bar.voices.forEach(voice => {
                            if (voice.beats && voice.beats.length > 0) {
                                const lastBeat = voice.beats[voice.beats.length - 1];
                                const beatEnd = lastBeat.absolutePosition + lastBeat.duration;
                                if (beatEnd > maxTick) {
                                    maxTick = beatEnd;
                                }
                            }
                        });
                    }
                });
            });
            return maxTick;
        };

        const getCurrentBarIndex = (score, tick) => {
            let activeIndex = 0;
            for (let i = 0; i < score.masterBars.length; i++) {
                if (score.masterBars[i].start <= tick) {
                    activeIndex = i;
                } else {
                    break;
                }
            }
            return activeIndex;
        };

        // Comprobar si la librería de AlphaTab está cargada
        if (typeof alphaTab === 'undefined') {
            console.warn("AlphaTab library not loaded yet.");
            return;
        }

        const wrapper = document.querySelector(".at-wrap");
        if (!wrapper) return;
        const main = wrapper.querySelector(".at-main");
        if (!main) return;
        wrapper.style.display = "flex";

        try {
            // Inicializar AlphaTab API v1.8.1 según el tutorial
            const settings = {
                core: {
                    fontDirectory: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.1/dist/font/',
                    enableLazyLoading: true
                },
                player: {
                    enablePlayer: true,
                    soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.8.1/dist/soundfont/sonivox.sf2',
                    scrollElement: wrapper.querySelector('.at-viewport')
                },
                display: {
                    layoutMode: alphaTab.LayoutMode.Page,
                    padding: [10, 10, 10, 10]
                },
                notation: {
                    elements: {
                        scoreTitle: false,
                        scoreArtist: false,
                        trackNames: true
                    }
                }
            };
            this.atApi = new alphaTab.AlphaTabApi(main, settings);

            // Overlay Logic
            const overlay = wrapper.querySelector(".at-overlay");
            this.atApi.renderStarted.on(() => {
                if (overlay) overlay.style.display = "flex";
            });
            this.atApi.renderFinished.on(() => {
                if (overlay) overlay.style.display = "none";
            });

            // Track Selector Logic
            const createTrackItem = (track) => {
                const trackItem = document
                    .querySelector("#at-track-template")
                    .content.cloneNode(true).firstElementChild;
                trackItem.querySelector(".at-track-name").innerText = track.name || `Pista ${track.index + 1}`;
                trackItem.track = track;
                
                // Main track click selection
                trackItem.addEventListener('click', (e) => {
                    // Only select track if we didn't click inside control buttons or volume slider
                    if (e.target.closest('.at-track-controls') || e.target.closest('.at-track-volume-wrapper')) {
                        return;
                    }
                    console.log("Track selected: " + (track.name || `Pista ${track.index + 1}`) + " [Index: " + track.index + "]");
                    e.stopPropagation();
                    this.atApi.renderTracks([track]);
                });

                // Mute button logic
                const muteBtn = trackItem.querySelector('.btn-track-mute');
                if (muteBtn) {
                    muteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        muteBtn.classList.toggle('active');
                        const isMuted = muteBtn.classList.contains('active');
                        this.atApi.changeTrackMute([track], isMuted);
                    });
                }

                // Solo button logic
                const soloBtn = trackItem.querySelector('.btn-track-solo');
                if (soloBtn) {
                    soloBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        soloBtn.classList.toggle('active');
                        const isSolo = soloBtn.classList.contains('active');
                        this.atApi.changeTrackSolo([track], isSolo);
                    });
                }

                // Volume slider logic
                const volumeSlider = trackItem.querySelector('.at-track-volume-slider');
                if (volumeSlider) {
                    volumeSlider.addEventListener('input', (e) => {
                        const vol = parseFloat(e.target.value);
                        this.atApi.changeTrackVolume([track], vol);
                    });
                    volumeSlider.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                }

                return trackItem;
            };

            const trackList = wrapper.querySelector(".at-track-list");
            this.atApi.scoreLoaded.on((s) => {
                if (trackList) {
                    // Clear items
                    trackList.innerHTML = "";
                    // Generate a track item for all tracks of the score
                    s.tracks.forEach((track) => {
                        trackList.appendChild(createTrackItem(track));
                    });
                }
                
                // Song Info in Controls
                const titleEl = wrapper.querySelector(".at-song-title");
                const artistEl = wrapper.querySelector(".at-song-artist");
                if (titleEl) titleEl.innerText = s.title || "Sin Título";
                if (artistEl) artistEl.innerText = s.artist || "Desconocido";

                // Update total measures and inputs
                const barTotal = wrapper.querySelector(".at-bar-total");
                if (barTotal) barTotal.innerText = `/ ${s.masterBars.length}`;
                const barInput = wrapper.querySelector(".at-bar-input");
                if (barInput) {
                    barInput.max = s.masterBars.length;
                    barInput.value = 1;
                }
                const loopStartInput = wrapper.querySelector(".at-loop-start-bar");
                if (loopStartInput) {
                    loopStartInput.max = s.masterBars.length;
                    loopStartInput.value = 1;
                }
                const loopEndInput = wrapper.querySelector(".at-loop-end-bar");
                if (loopEndInput) {
                    loopEndInput.max = s.masterBars.length;
                    loopEndInput.value = s.masterBars.length;
                }
                
                // Initialize BPM input value and badge to score tempo
                const bpmInput = wrapper.querySelector(".at-speed-bpm-input");
                const bpmBadgeInit = wrapper.querySelector(".at-bpm-badge");
                if (bpmInput) {
                    bpmInput.value = s.tempo || 120;
                }
                if (bpmBadgeInit) {
                    bpmBadgeInit.textContent = s.tempo || 120;
                }

                // Initialize Auto BPM target to score tempo
                const autoBpmTargetInit = wrapper.querySelector(".at-autobpm-target");
                if (autoBpmTargetInit) {
                    autoBpmTargetInit.value = s.tempo || 120;
                    this.bpmAutoIncrTarget = s.tempo || 120;
                }

                // Populate section dropdown
                const sectionSelect = wrapper.querySelector(".at-loop-section-select");
                if (sectionSelect) {
                    sectionSelect.innerHTML = "";
                    const noneOpt = document.createElement("option");
                    noneOpt.value = "";
                    noneOpt.setAttribute("data-i18n", "gp-loop-section-select-opt");
                    noneOpt.textContent = this.lang === "es" ? "- Ninguna -" : "- None -";
                    sectionSelect.appendChild(noneOpt);

                    const uniqueSections = [];
                    s.masterBars.forEach((mb) => {
                        const sName = getSectionName(mb);
                        if (sName) {
                            uniqueSections.push({
                                name: sName,
                                startBarIndex: mb.index,
                                endBarIndex: s.masterBars.length - 1
                            });
                        }
                    });

                    // Adjust endBarIndex for each section based on the next one
                    for (let i = 0; i < uniqueSections.length - 1; i++) {
                        uniqueSections[i].endBarIndex = uniqueSections[i+1].startBarIndex - 1;
                    }

                    uniqueSections.forEach((sec, idx) => {
                        const opt = document.createElement("option");
                        opt.value = idx;
                        opt.textContent = sec.name;
                        sectionSelect.appendChild(opt);
                    });

                    this.uniqueSections = uniqueSections;
                }

                // Dynamically update speed options based on song tempo
                const tempo = s.tempo || 120;
                const speedSelect = wrapper.querySelector("#at-speed-select");
                if (speedSelect) {
                    Array.from(speedSelect.options).forEach((option) => {
                        const pct = parseFloat(option.value);
                        const calculatedBpm = Math.round(tempo * pct);
                        option.text = `${Math.round(pct * 100)}% (${calculatedBpm} BPM)`;
                    });
                }
            });

            this.atApi.renderStarted.on(() => {
                if (!trackList) return;
                // Collect tracks being rendered
                const tracks = new Map();
                this.atApi.tracks.forEach((t) => {
                    tracks.set(t.index, t);
                });
                // Mark the item as active or not
                const trackItems = trackList.querySelectorAll(".at-track");
                trackItems.forEach((trackItem) => {
                    if (tracks.has(trackItem.track.index)) {
                        trackItem.classList.add("active");
                    } else {
                        trackItem.classList.remove("active");
                    }
                });
            });

            // Controls Bindings
            const loop = wrapper.querySelector(".at-loop");
            const countIn = wrapper.querySelector('.at-count-in');
            const metroContainer = wrapper.querySelector(".at-metronome-container");
            const metroSlider = metroContainer ? metroContainer.querySelector(".at-metronome-volume-slider") : null;
            
            let currentMetroVolume = 0.8;
            
            // Initialize countInVolume based on whether the button is active initially
            if (countIn) {
                const countInActive = countIn.classList.contains('active');
                this.atApi.countInVolume = countInActive ? currentMetroVolume : 0.0;
                
                countIn.onclick = (e) => {
                    e.stopPropagation();
                    countIn.classList.toggle('active');
                    const countInActive = countIn.classList.contains('active');
                    if (countInActive) {
                        this.atApi.countInVolume = currentMetroVolume;
                    } else {
                        this.atApi.countInVolume = 0.0;
                    }
                    
                    // If loop is active, update alphaTab's isLooping state
                    // (disabled when count-in or auto BPM is active — manual looping takes over)
                    const loopActive = loop && loop.classList.contains("active");
                    this.atApi.isLooping = loopActive && !countInActive && !this.bpmAutoIncrEnabled;
                };
            }
            
            if (metroSlider) {
                metroSlider.value = currentMetroVolume;
                
                metroSlider.addEventListener("input", (e) => {
                    currentMetroVolume = parseFloat(e.target.value);
                    if (metroContainer && metroContainer.classList.contains("active")) {
                        this.atApi.metronomeVolume = currentMetroVolume;
                    }
                    if (countIn && countIn.classList.contains("active")) {
                        this.atApi.countInVolume = currentMetroVolume;
                    }
                });
                
                metroSlider.addEventListener("click", (e) => {
                    e.stopPropagation();
                });
            }

            if (metroContainer) {
                metroContainer.onclick = (e) => {
                    if (e.target.closest('.at-metronome-volume-wrapper') || e.target.closest('.at-metronome-volume-slider')) {
                        return;
                    }
                    e.stopPropagation();
                    metroContainer.classList.toggle("active");
                    if (metroContainer.classList.contains("active")) {
                        this.atApi.metronomeVolume = currentMetroVolume;
                    } else {
                        this.atApi.metronomeVolume = 0.0;
                    }
                };
            }

            // Bar Input navigation
            const barInput = wrapper.querySelector(".at-bar-input");
            if (barInput) {
                barInput.onkeydown = (e) => {
                    if (e.key === "Enter") {
                        let val = parseInt(barInput.value, 10);
                        if (isNaN(val) || val < 1) val = 1;
                        if (this.atApi.score && val > this.atApi.score.masterBars.length) {
                            val = this.atApi.score.masterBars.length;
                        }
                        barInput.value = val;
                        
                        if (this.atApi.score && this.atApi.score.masterBars[val - 1]) {
                            this.atApi.tickPosition = this.atApi.score.masterBars[val - 1].start;
                        }
                        barInput.blur();
                    }
                };
            }

            // Loop control button binding
            if (loop) {
                loop.onclick = (e) => {
                    e.stopPropagation();
                    loop.classList.toggle("active");
                    const active = loop.classList.contains("active");
                    
                    const countInActive = countIn && countIn.classList.contains("active");
                    this.atApi.isLooping = active && !countInActive && !this.bpmAutoIncrEnabled;

                    if (!active) {
                        this.atApi.playbackRange = null;
                        const sectionSelect = wrapper.querySelector(".at-loop-section-select");
                        if (sectionSelect) sectionSelect.value = "";
                        const startInput = wrapper.querySelector(".at-loop-start-bar");
                        const endInput = wrapper.querySelector(".at-loop-end-bar");
                        if (startInput) startInput.value = 1;
                        if (endInput && this.atApi.score) endInput.value = this.atApi.score.masterBars.length;
                    }
                };
            }

            // Section dropdown loop binding
            const sectionSelect = wrapper.querySelector(".at-loop-section-select");
            if (sectionSelect) {
                sectionSelect.onchange = () => {
                    const val = sectionSelect.value;
                    if (val === "") {
                        this.atApi.playbackRange = null;
                        const startInput = wrapper.querySelector(".at-loop-start-bar");
                        const endInput = wrapper.querySelector(".at-loop-end-bar");
                        if (startInput) startInput.value = 1;
                        if (endInput && this.atApi.score) endInput.value = this.atApi.score.masterBars.length;
                        return;
                    }
                    
                    const sec = this.uniqueSections[parseInt(val, 10)];
                    if (sec && this.atApi.score) {
                        const startBar = sec.startBarIndex;
                        const endBar = sec.endBarIndex;
                        
                        const startTick = this.atApi.score.masterBars[startBar].start;
                        const endTick = getBarEndTick(this.atApi.score, endBar);
                        
                        this.atApi.playbackRange = {
                            startTick: startTick,
                            endTick: endTick
                        };
                        
                        const startInput = wrapper.querySelector(".at-loop-start-bar");
                        const endInput = wrapper.querySelector(".at-loop-end-bar");
                        if (startInput) startInput.value = startBar + 1;
                        if (endInput) endInput.value = endBar + 1;
                        
                        this.atApi.tickPosition = startTick;
                        
                        if (loop && !loop.classList.contains("active")) {
                            loop.classList.add("active");
                        }
                        const countInActive = countIn && countIn.classList.contains("active");
                        this.atApi.isLooping = !countInActive && !this.bpmAutoIncrEnabled;
                    }
                };
            }

            // Range apply button loop binding
            const rangeApplyBtn = wrapper.querySelector(".at-loop-range-apply");
            if (rangeApplyBtn) {
                rangeApplyBtn.onclick = (e) => {
                    e.stopPropagation();
                    const startInput = wrapper.querySelector(".at-loop-start-bar");
                    const endInput = wrapper.querySelector(".at-loop-end-bar");
                    if (!startInput || !endInput || !this.atApi.score) return;
                    
                    let startBar = parseInt(startInput.value, 10) - 1;
                    let endBar = parseInt(endInput.value, 10) - 1;
                    const totalBars = this.atApi.score.masterBars.length;
                    
                    if (isNaN(startBar) || startBar < 0) startBar = 0;
                    if (startBar >= totalBars) startBar = totalBars - 1;
                    if (isNaN(endBar) || endBar < 0) endBar = 0;
                    if (endBar >= totalBars) endBar = totalBars - 1;
                    
                    if (startBar > endBar) {
                        const temp = startBar;
                        startBar = endBar;
                        endBar = temp;
                    }
                    
                    startInput.value = startBar + 1;
                    endInput.value = endBar + 1;
                    
                    const startTick = this.atApi.score.masterBars[startBar].start;
                    const endTick = getBarEndTick(this.atApi.score, endBar);
                    
                    this.atApi.playbackRange = {
                        startTick: startTick,
                        endTick: endTick
                    };
                    
                    if (sectionSelect) sectionSelect.value = "";
                    this.atApi.tickPosition = startTick;
                    
                    if (loop && !loop.classList.contains("active")) {
                        loop.classList.add("active");
                    }
                    const countInActive = countIn && countIn.classList.contains("active");
                    this.atApi.isLooping = !countInActive && !this.bpmAutoIncrEnabled;
                };
            }

            // --- Auto BPM Increment Controls ---
            const autoBpmToggle = wrapper.querySelector(".at-autobpm-toggle");
            const autoBpmStep  = wrapper.querySelector(".at-autobpm-step");
            const autoBpmTarget = wrapper.querySelector(".at-autobpm-target");

            if (autoBpmStep) {
                autoBpmStep.onchange = () => {
                    let val = parseInt(autoBpmStep.value, 10);
                    if (isNaN(val) || val < 1) val = 1;
                    if (val > 50) val = 50;
                    autoBpmStep.value = val;
                    this.bpmAutoIncrStep = val;
                };
            }

            if (autoBpmTarget) {
                autoBpmTarget.onchange = () => {
                    let val = parseInt(autoBpmTarget.value, 10);
                    if (isNaN(val) || val < 20) val = 20;
                    if (val > 300) val = 300;
                    autoBpmTarget.value = val;
                    this.bpmAutoIncrTarget = val;
                };
            }

            if (autoBpmToggle) {
                autoBpmToggle.onclick = () => {
                    this.bpmAutoIncrEnabled = !this.bpmAutoIncrEnabled;

                    // Sync step and target values at the moment of activation
                    if (autoBpmStep) {
                        let val = parseInt(autoBpmStep.value, 10);
                        if (isNaN(val) || val < 1) val = 1;
                        this.bpmAutoIncrStep = val;
                    }
                    if (autoBpmTarget) {
                        let val = parseInt(autoBpmTarget.value, 10);
                        if (isNaN(val) || val < 20) val = 20;
                        this.bpmAutoIncrTarget = val;
                    }

                    autoBpmToggle.classList.toggle("active", this.bpmAutoIncrEnabled);
                    autoBpmToggle.textContent = this.bpmAutoIncrEnabled ? "ON" : "OFF";

                    // Update isLooping to disable native looping when auto-BPM is active
                    if (this.atApi) {
                        const loopActive    = loop && loop.classList.contains("active");
                        const countInActive = countIn && countIn.classList.contains("active");
                        this.atApi.isLooping = loopActive && !countInActive && !this.bpmAutoIncrEnabled;
                    }
                };
            }

            const printBtn = wrapper.querySelector(".at-print");
            if (printBtn) {
                printBtn.onclick = () => {
                    this.atApi.print();
                };
            }

            const zoom = wrapper.querySelector(".at-zoom select");
            if (zoom) {
                zoom.onchange = () => {
                    const zoomLevel = parseInt(zoom.value) / 100;
                    this.atApi.settings.display.scale = zoomLevel;
                    this.atApi.updateSettings();
                    this.atApi.render();
                };
            }

            const speedSelect = wrapper.querySelector("#at-speed-select");
            const bpmInput = wrapper.querySelector(".at-speed-bpm-input");
            const bpmBadge = wrapper.querySelector(".at-bpm-badge");

            // Helper: keep the always-visible BPM badge in sync
            const updateBpmBadge = (bpm) => {
                if (bpmBadge) bpmBadge.textContent = bpm;
            };

            if (speedSelect) {
                speedSelect.onchange = () => {
                    const speed = parseFloat(speedSelect.value);
                    this.atApi.playbackSpeed = speed;

                    if (this.atApi.score && bpmInput) {
                        const tempo = this.atApi.score.tempo || 120;
                        const newBpm = Math.round(tempo * speed);
                        bpmInput.value = newBpm;
                        updateBpmBadge(newBpm);
                    }
                };
            }

            if (bpmInput) {
                const applyBpm = () => {
                    let bpm = parseInt(bpmInput.value, 10);
                    if (isNaN(bpm) || bpm < 20) bpm = 20;
                    if (bpm > 300) bpm = 300;
                    bpmInput.value = bpm;
                    updateBpmBadge(bpm);

                    if (this.atApi.score) {
                        const tempo = this.atApi.score.tempo || 120;
                        const speed = bpm / tempo;
                        this.atApi.playbackSpeed = speed;

                        // Set select option to closest value if available
                        if (speedSelect) {
                            const closest = [0.25, 0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2].find(v => Math.abs(v - speed) < 0.02);
                            if (closest) {
                                speedSelect.value = closest;
                            } else {
                                speedSelect.value = "";
                            }
                        }
                    }
                };

                bpmInput.onkeydown = (e) => {
                    if (e.key === "Enter") {
                        applyBpm();
                        bpmInput.blur();
                    }
                };

                bpmInput.onblur = () => {
                    applyBpm();
                };
            }

            const layout = wrapper.querySelector(".at-layout select");
            if (layout) {
                layout.onchange = () => {
                    switch (layout.value) {
                        case "horizontal":
                            this.atApi.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                            break;
                        case "page":
                            this.atApi.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                            break;
                    }
                    this.atApi.updateSettings();
                    this.atApi.render();
                };
            }

            const btnStaveScore = wrapper.querySelector(".at-stave-score");
            const btnStaveTab = wrapper.querySelector(".at-stave-tab");
            
            const updateStaveProfile = () => {
                const scoreActive = btnStaveScore.classList.contains("active");
                const tabActive = btnStaveTab.classList.contains("active");
                
                if (scoreActive && tabActive) {
                    this.atApi.settings.display.staveProfile = alphaTab.StaveProfile.ScoreTab;
                } else if (scoreActive) {
                    this.atApi.settings.display.staveProfile = alphaTab.StaveProfile.Score;
                } else if (tabActive) {
                    this.atApi.settings.display.staveProfile = alphaTab.StaveProfile.Tab;
                }
                
                this.atApi.updateSettings();
                this.atApi.render();
            };

            if (btnStaveScore && btnStaveTab) {
                btnStaveScore.onclick = () => {
                    if (btnStaveScore.classList.contains("active") && !btnStaveTab.classList.contains("active")) {
                        return; // Prevent hiding both
                    }
                    btnStaveScore.classList.toggle("active");
                    updateStaveProfile();
                };
                
                btnStaveTab.onclick = () => {
                    if (btnStaveTab.classList.contains("active") && !btnStaveScore.classList.contains("active")) {
                        return; // Prevent hiding both
                    }
                    btnStaveTab.classList.toggle("active");
                    updateStaveProfile();
                };
            }

            // Night Mode Toggle (Inverts score colors and updates icon between moon and sun)
            const nightModeBtn = wrapper.querySelector(".at-night-mode");
            if (nightModeBtn) {
                const icon = nightModeBtn.querySelector("i");
                const isNightMode = this.data.getNightMode();
                if (isNightMode) {
                    nightModeBtn.classList.add("active");
                    wrapper.classList.add("at-dark-mode");
                    if (icon) icon.className = "fas fa-sun";
                } else {
                    if (icon) icon.className = "fas fa-moon";
                }
                nightModeBtn.onclick = (e) => {
                    e.stopPropagation();
                    nightModeBtn.classList.toggle("active");
                    const active = nightModeBtn.classList.contains("active");
                    if (active) {
                        wrapper.classList.add("at-dark-mode");
                        if (icon) icon.className = "fas fa-sun";
                    } else {
                        wrapper.classList.remove("at-dark-mode");
                        if (icon) icon.className = "fas fa-moon";
                    }
                    this.data.setNightMode(active);
                };
            }

            // SoundFont Loading Progress
            const playerIndicator = wrapper.querySelector(".at-player-progress");
            this.atApi.soundFontLoad.on((e) => {
                const percentage = Math.floor((e.loaded / e.total) * 100);
                if (playerIndicator) {
                    playerIndicator.style.display = "inline";
                    playerIndicator.innerText = percentage + "%";
                }
            });
            this.atApi.playerReady.on(() => {
                if (playerIndicator) playerIndicator.style.display = 'none';
            });

            // Play / Pause / Stop State Controls
            const playPause = wrapper.querySelector(".at-player-play-pause");
            const stop = wrapper.querySelector(".at-player-stop");

            if (playPause) {
                playPause.onclick = (e) => {
                    if (playPause.classList.contains("disabled")) {
                        return;
                    }
                    this.userInterrupted = true; // User manually toggled play/pause
                    this.isResettingLoop = false;
                    // Resume contexts to comply with browser audio policies
                    if (this.atApi.player && this.atApi.player.audioContext) this.atApi.player.audioContext.resume();
                    if (this.atApi.player && this.atApi.player.synth && this.atApi.player.synth.audioContext) this.atApi.player.synth.audioContext.resume();
                    this.atApi.playPause();
                };
            }

            if (stop) {
                stop.onclick = (e) => {
                    if (stop.classList.contains("disabled")) {
                        return;
                    }
                    this.userInterrupted = true; // User manually stopped
                    this.isResettingLoop = false;
                    this.atApi.stop();
                };
            }

            this.atApi.playerReady.on(() => {
                if (playPause) playPause.classList.remove("disabled");
                if (stop) stop.classList.remove("disabled");
            });

            let lastTick = 0;
            this.atApi.playerStateChanged.on((e) => {
                if (!playPause) return;
                const icon = playPause.querySelector("i.fas");
                if (icon) {
                    if (e.state === alphaTab.synth.PlayerState.Playing) {
                        icon.classList.remove("fa-play");
                        icon.classList.add("fa-pause");
                        this.atIsPlaying = true;
                        this.userInterrupted = false; // Reset it now that we are playing!
                    } else {
                        icon.classList.remove("fa-pause");
                        icon.classList.add("fa-play");
                        this.atIsPlaying = false;
                        
                        // Custom looping when count-in is active is now handled in playerFinished
                        
                        // Reset user interruption flag after state transition is handled
                        this.userInterrupted = false;
                    }
                }
            });
            
            this.atApi.playerFinished.on(() => {
                const loopActive = loop && loop.classList.contains("active");
                const countInActive = countIn && countIn.classList.contains("active");

                // Manual loop is needed when count-in is active, OR auto BPM increment is active
                const needsManualLoop = loopActive && !this.userInterrupted && this.atApi.score &&
                    (countInActive || this.bpmAutoIncrEnabled);

                if (needsManualLoop) {
                    // --- Auto BPM Increment logic ---
                    if (this.bpmAutoIncrEnabled) {
                        const tempo = this.atApi.score.tempo || 120;
                        const currentBpm = Math.round(this.atApi.playbackSpeed * tempo);
                        const nextBpm = currentBpm + this.bpmAutoIncrStep;

                        if (nextBpm > this.bpmAutoIncrTarget) {
                            // Target reached: reset BPM to 100% and stop
                            this.userInterrupted = true;
                            this.atApi.playbackSpeed = 1;
                            updateBpmBadge(tempo);
                            if (bpmInput) {
                                bpmInput.value = tempo;
                                // Flash green to signal completion
                                bpmInput.style.transition = "background-color 0.3s ease";
                                bpmInput.style.backgroundColor = "var(--tb-accent, #4ade80)";
                                bpmInput.style.color = "#fff";
                                setTimeout(() => {
                                    bpmInput.style.backgroundColor = "";
                                    bpmInput.style.color = "";
                                }, 1500);
                            }
                            if (speedSelect) speedSelect.value = "1";
                            return; // Don't restart loop
                        }

                        // Apply incremented BPM
                        const newSpeed = nextBpm / tempo;
                        this.atApi.playbackSpeed = newSpeed;
                        if (bpmInput) bpmInput.value = nextBpm;
                        updateBpmBadge(nextBpm);
                        if (speedSelect) {
                            const closest = [0.25, 0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2].find(v => Math.abs(v - newSpeed) < 0.02);
                            speedSelect.value = closest !== undefined ? closest : "";
                        }
                    }

                    // Restart loop from startTick
                    const startTick = this.atApi.playbackRange ? this.atApi.playbackRange.startTick : 0;
                    this.isResettingLoop = true;

                    // Allow audio context to fully settle before restarting
                    setTimeout(() => {
                        this.atApi.tickPosition = startTick;
                        this.isResettingLoop = false;
                        this.atApi.play();
                    }, 150);
                }
            });

            // Formatting duration for position counter
            const formatDuration = (milliseconds) => {
                let seconds = milliseconds / 1000;
                const minutes = (seconds / 60) | 0;
                seconds = (seconds - minutes * 60) | 0;
                return (
                    String(minutes).padStart(2, "0") +
                    ":" +
                    String(seconds).padStart(2, "0")
                );
            };

            const songPosition = wrapper.querySelector(".at-song-position");
            let previousTime = -1;
            this.atApi.playerPositionChanged.on((e) => {
                lastTick = e.tickPosition !== undefined ? e.tickPosition : (e.currentTick !== undefined ? e.currentTick : 0);
                
                const currentSeconds = (e.currentTime / 1000) | 0;
                if (currentSeconds == previousTime) {
                    return;
                }
                previousTime = currentSeconds;
                if (songPosition) {
                    songPosition.innerText =
                        formatDuration(e.currentTime) + " / " + formatDuration(e.endTime);
                }

                // Update current measure input and section badge
                if (this.atApi.score) {
                    const currentTick = e.tickPosition !== undefined ? e.tickPosition : (e.currentTick !== undefined ? e.currentTick : 0);
                    const barIdx = getCurrentBarIndex(this.atApi.score, currentTick);
                    const currentBar1Based = barIdx + 1;
                    
                    const barInput = wrapper.querySelector(".at-bar-input");
                    if (barInput && document.activeElement !== barInput) {
                        barInput.value = currentBar1Based;
                    }
                    
                    const sectionBadge = wrapper.querySelector(".at-section-badge");
                    if (sectionBadge) {
                        let activeSec = null;
                        for (let i = barIdx; i >= 0; i--) {
                            const mb = this.atApi.score.masterBars[i];
                            const sName = getSectionName(mb);
                            if (sName) {
                                activeSec = sName;
                                break;
                            }
                        }
                        if (activeSec) {
                            sectionBadge.innerText = activeSec;
                            sectionBadge.style.display = "inline-block";
                        } else {
                            sectionBadge.style.display = "none";
                        }
                    }
                }
            });

            // Cargar los bytes del ítem proporcionado
            if (libraryItem) {
                const bytes = libraryItem.bytes || libraryItem.fileData || libraryItem.data;
                this.atApi.load(new Uint8Array(bytes));
                this.atCurrentItemId = libraryItem.id;
            } else if (score && (score.bytes || score.fileData || score.data)) {
                this.atApi.load(new Uint8Array(score.bytes || score.fileData || score.data));
            }

        } catch (error) {
            console.error("AlphaTab error during initialization:", error);
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

    async renderDashboardView() {
        const content = document.getElementById("dashboard-content");
        if (!content) return;

        const profiles = await this.data.getProfiles();

        if (profiles.length === 0) {
            content.innerHTML = `<div class="dashboard-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.3;margin-bottom:12px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <p>Todavía no hay alumnos.<br>Creá perfiles desde el selector de perfiles.</p>
            </div>`;
            return;
        }

        const todayStr = this.getTodayString();
        const tomorrowStr = new Date(new Date(todayStr+'T12:00').getTime() + 86400000).toISOString().slice(0,10);
        const allClases = this.data.getAllClases();
        const groups = this.data.getAllGroups();
        const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const todayName = dayNames[new Date(todayStr+'T12:00').getDay()];
        const tomorrowName = dayNames[new Date(tomorrowStr+'T12:00').getDay()];

        const tab = this._timelineTab;
        const targetDate = tab === 'manana' ? tomorrowStr : todayStr;
        const targetDayName = tab === 'manana' ? tomorrowName : todayName;

        const buildTlItems = (dateStr, dayName) => {
            const now = new Date();
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const existing = allClases.filter(c => c.date === dateStr);
            const existingGroupIds = new Set(existing.map(c => c.groupId));
            const items = [];
            existing.forEach(c => {
                const g = groups.find(x => x.id === c.groupId) || {};
                // Auto-start: si la fecha es hoy, la hora ya pasó y la clase no está finalizada ni en-curso
                if (dateStr === todayStr && c.status !== 'finalizada' && c.status !== 'en-curso') {
                    const [h, m] = (g.time || c.time || '').split(':').map(Number);
                    if (!isNaN(h) && !isNaN(m) && nowMins >= h * 60 + m) {
                        c.status = 'en-curso';
                        this.data.saveClase(c);
                    }
                }
                const st = c.status === 'finalizada' ? 'finalizada' : c.status === 'en-curso' ? 'iniciada' : 'pendiente';
                const count = (g.memberIds||[]).length;
                items.push({ claseId:c.id, click:`app.openClase('${c.id}')`, time:(g.time||c.time||'').slice(0,5)||'—', name:g.name||c.title||'Clase', count, type:count>1?'Grupal':'Individual', status:st, sel:c.id===this._currentClaseId, isNew:false });
            });
            groups.filter(g => g.day === dayName && !existingGroupIds.has(g.id)).forEach(g => {
                const count = (g.memberIds||[]).length;
                items.push({ claseId:null, click:`app.createClase('${g.id}')`, time:(g.time||'').slice(0,5)||'—', name:g.name, count, type:count>1?'Grupal':'Individual', status:'pendiente', sel:false, isNew:true });
            });
            items.sort((a,b) => String(a.time).localeCompare(String(b.time)));
            return items;
        };

        const tlItems = tab === 'semana' ? [] : buildTlItems(targetDate, targetDayName);

        const semHtml = tab === 'semana' ? this._renderSemanaCols(allClases, groups, todayStr) : '';

        const tlHtml = tab === 'semana'
            ? semHtml
            : tlItems.length
                ? tlItems.map(it => `
                    <div class="tl3-item ${it.sel?'selected':''} ${it.status}" onclick="${it.click}">
                        <div class="tl3-time-col">
                            <span class="tl3-time ${it.status==='iniciada'?'active':''}">${it.time}</span>
                            <div class="tl3-dot ${it.status} ${it.status==='iniciada'?'pulse':''}"></div>
                            <div class="tl3-line"></div>
                        </div>
                        <div class="tl3-info">
                            <div class="tl3-group">${this._escapeHtml(it.name)}</div>
                            <div class="tl3-meta">${it.type} · ${it.count} alumno${it.count!==1?'s':''}</div>
                            <span class="tl3-pill ${it.isNew?'new':it.status}">${it.isNew?'+ Crear clase':it.status==='iniciada'?'En curso':it.status==='finalizada'?'Finalizada':'Pendiente'}</span>
                        </div>
                    </div>`).join('')
                : `<div class="dash-tl-empty">No hay clases ${tab==='manana'?'mañana':'hoy'}.<br><span>Asigná un día a tus grupos en el Cuaderno.</span></div>`;

        const notifications = this.data.getNotifications().filter(n => !n.read);
        let notifHtml = '';
        if (notifications.length > 0) {
            notifHtml = `
                <div class="studio-notification-banner" style="background:var(--tb-accent); color:#fff; border-radius:10px; padding:12px; margin-bottom:12px; font-size:12px; display:flex; flex-direction:column; gap:6px">
                    <div style="font-weight:600; display:flex; justify-content:space-between; align-items:center">
                        <span>🔔 Consultas Nuevas (${notifications.length})</span>
                        <button onclick="app.clearAllTeacherNotifications()" style="background:none; border:none; color:#fff; font-weight:normal; cursor:pointer; text-decoration:underline; font-size:10px; padding:0">Limpiar todas</button>
                    </div>
                    <div style="max-height:120px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; margin-top:4px">
                        ${notifications.map(n => `
                            <div onclick="app.handleNotificationClick('${n.id}', '${n.claseId}')" style="cursor:pointer; background:rgba(255,255,255,0.1); border-radius:6px; padding:6px 8px; display:flex; justify-content:space-between; align-items:center">
                                <span><strong>${this._escapeHtml(n.studentName)}</strong> cargó "${this._escapeHtml(n.itemTitle)}"</span>
                                <span style="font-size:10px; opacity:0.8">Ver →</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        content.innerHTML = `
            <div class="prof-layout-3col">

                <!-- COL 1: TIMELINE -->
                <div class="tl3-col">
                    ${notifHtml}
                    <div class="tl3-tabs">
                        <button class="tl3-tab ${tab==='hoy'?'active':''}" onclick="app.switchTimelineTab('hoy')">Hoy</button>
                        <button class="tl3-tab ${tab==='manana'?'active':''}" onclick="app.switchTimelineTab('manana')">Mañana</button>
                        <button class="tl3-tab ${tab==='semana'?'active':''}" onclick="app.switchTimelineTab('semana')">Semana</button>
                    </div>
                    <div class="tl3-list">
                        <button class="btn-demo-seed" onclick="app.seedDemoData()">Cargar datos de ejemplo</button>
                        ${tlHtml}
                    </div>
                    ${groups.some(g => g._isDemo) ? `<button class="btn-demo-clear" onclick="app.clearDemoData()">× Borrar datos de prueba</button>` : ''}
                </div>

                <!-- COL 2: PANEL DE CLASE -->
                <div class="clase3-col" id="dash-class-panel">
                    ${this._currentClaseId ? '' : `
                    <div class="empty-hint">
                        <svg viewBox="0 0 48 48" fill="none" style="width:56px;height:56px;display:block;margin:0 auto 14px" stroke="var(--tb-accent)" stroke-width="1"><circle cx="24" cy="24" r="20"/><path d="M24 14v10l6 4"/></svg>
                        <p>Seleccioná una clase del panel izquierdo</p>
                    </div>`}
                </div>

                <!-- COL 3: BIBLIOTECA -->
                <div class="bib3-col" id="dash-bib-panel">
                    <div class="bib3-header">Biblioteca</div>
                    <div class="bib3-body" id="dash-bib-body">
                        <div class="bib3-loading">Cargando…</div>
                    </div>
                </div>

            </div>`;

        const libRender = this._renderBibliotecaPanel();
        if (this._currentClaseId) await this._renderClaseDetail(this._currentClaseId);
        await libRender;
    }

    handleNotificationClick(notifId, claseId) {
        const notifications = this.data.getNotifications();
        const notif = notifications.find(n => n.id === notifId);
        if (notif) {
            notif.read = true;
            this.data.saveNotifications(notifications);
        }
        if (claseId) {
            this._currentClaseId = claseId;
        }
        this.renderDashboardView();
    }

    clearAllTeacherNotifications() {
        const notifications = this.data.getNotifications();
        notifications.forEach(n => n.read = true);
        this.data.saveNotifications(notifications);
        this.renderDashboardView();
    }
    // =========================================================================
    // Gestión de Clases
    // =========================================================================

    createClase(groupId) {
        const group = this.data.getGroup(groupId);
        if (!group) return;
        const today = new Date().toISOString().slice(0, 10);
        const clase = {
            id: this.data.generateId('clase'),
            groupId,
            title: `Clase ${new Date().toLocaleDateString('es-AR', { day:'numeric', month:'short' })}`,
            date: today,
            status: 'programada',
            attendance: {},
            content: [],
            objetivos: [],
            resumen: ''
        };
        this.data.saveClase(clase);
        this.openClase(clase.id);
    }

    openClase(claseId) {
        this._currentClaseId = claseId;
        this.renderDashboardView();
    }

    closeClasetDetail() {
        this._currentClaseId = null;
        this.renderDashboardView();
    }

    async _renderClaseDetail(claseId) {
        const panel = document.getElementById('dash-class-panel');
        if (!panel) return;

        const clase = this.data.getClase(claseId);
        if (!clase) { this.closeClasetDetail(); return; }

        const group = this.data.getGroup(clase.groupId) || {};
        const [profiles, libraryItems] = await Promise.all([
            this.data.getProfiles(),
            this.data.getLibraryItems()
        ]);
        const memberIds = (clase.memberOverride != null) ? clase.memberOverride : (group.memberIds || []);
        const members = profiles.filter(p => memberIds.includes(p.id));
        const type = members.length > 1 ? 'Grupal' : 'Individual';
        const timeLabel = (group.time||'').slice(0,5) || '—';
        const status = clase.status === 'finalizada' ? 'finalizada' : clase.status === 'en-curso' ? 'iniciada' : 'pendiente';
        const todayStr = this.getTodayString();

        // Migración backward compat: cat numérico → string
        const catNumToStr = { 0:'Técnica', 1:'Lectura', 2:'Repertorio' };
        (clase.content||[]).forEach(c => {
            if (typeof c.cat === 'number') c.cat = catNumToStr[c.cat] || 'Técnica';
        });

        // Categorías activas de la clase (con defaults)
        if (!clase.categories || !clase.categories.length) {
            clase.categories = ['Técnica','Lectura','Repertorio','Cont. Complementario'];
        }

        // ── A) HEADER ──
        const meetUrl = clase.meetUrl || group.meetLink || '';
        const meetHref = meetUrl ? (/^https?:/.test(meetUrl) ? meetUrl : 'https://'+meetUrl) : '';
        const meetBarHtml = meetUrl ? `
            <div class="h3-meet-bar">
                <span class="h3-meet-icon">▣</span>
                <span class="h3-meet-url">${this._escapeHtml(meetUrl)}</span>
                <a href="${this._escapeHtml(meetHref)}" target="_blank" class="h3-btn h3-btn-meet">Entrar</a>
                <button class="h3-btn h3-btn-wa" onclick="app.sendMeetWhatsApp('${group.id}')">W</button>
            </div>` : `<div class="h3-meet-bar h3-meet-empty"></div>`;

        // ── B) RESUMEN CLASE ANTERIOR ──
        const claseAnt = this.data.getClaseAnterior(clase.groupId, clase.date);
        const resumenAntHtml = (claseAnt && claseAnt.resumenProfesor) ? `
            <div class="sec3-resumen-ant">
                <div class="sec3-resumen-ant-title">${this._escapeHtml(group.name||'Clase')} · Clase del ${new Date(claseAnt.date+'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</div>
                <div class="sec3-resumen-ant-body">${this._escapeHtml(claseAnt.resumenProfesor)}</div>
            </div>` : '';

        // ── C) TABLERO DE CONTROL ──
        const buildAttGroup = (label, colorKey, mlist) => {
            if (!mlist.length) return '';
            const cards = mlist.map(m => {
                const streak = this.data.getProfileStreak(m.id);
                const lastReset = this.data.getProfileLastResetCheck(m.id);
                const raw = this.data.getProfileCompletedSteps(m.id);
                const steps = lastReset === todayStr ? (raw||[false,false,false]) : [false,false,false];
                const done = steps.filter(Boolean).length;
                const pracDot = done === 3 ? 'full' : done > 0 ? 'partial' : 'none';

                const claseAntAtt = claseAnt ? (claseAnt.attendance||{})[m.id] : null;
                const claseAntAttLabel = claseAntAtt === 'presente' ? 'Asistió' : claseAntAtt === 'ausente' ? 'Faltó' : '—';
                const claseAntAttDot = claseAntAtt === 'presente' ? 'present' : claseAntAtt === 'ausente' ? 'absent' : '';

                const dudas = claseAnt ? this.data.getPreguntasAlumno(m.id, claseAnt.id) : [];
                const lastDuda = dudas.sort((a,b)=>b.timestamp-a.timestamp)[0];
                const dudaHtml = lastDuda ? `
                    <div class="hc-duda">
                        <div class="hc-duda-label">💬 Duda pendiente</div>
                        <div class="hc-duda-text">"${this._escapeHtml(lastDuda.text)}"</div>
                    </div>` : '';

                const hoverCard = `
                    <div class="hc-card" id="hc-${m.id}">
                        <div class="hc-meta-row">
                            <div class="hc-prac-dot ${pracDot}"></div>
                            <span class="hc-prac-label ${pracDot}">${pracDot==='full'?'Completo':pracDot==='partial'?'Parcial':'Sin práctica'}</span>
                            <span class="hc-sep">·</span>
                            <span class="hc-streak">${streak>0?'🔥 '+streak+'d':'—'}</span>
                            <span class="hc-sep">·</span>
                            <div class="hc-att-dot ${claseAntAttDot}"></div>
                            <span class="hc-att-label">${claseAntAttLabel}</span>
                        </div>
                        ${dudaHtml}
                    </div>`;

                const nameColor = pracDot === 'full' ? '#34c759' : pracDot === 'partial' ? '#f5a623' : '#c0392b';
                const firstName = (m.name||'').split(' ')[0];

                const avatarChar = m.avatarChar || (m.name||'?')[0].toUpperCase();
                
                let actionHtml = '';
                if (label === 'Ausentes') {
                    actionHtml = `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); app.rescheduleClassForAbsentStudent('${claseId}', '${m.id}')" style="margin-top: 6px; font-size: 11px; padding: 4px 8px; width: 100%; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; border-color: var(--tb-border); color: var(--tb-text-primary);">📅 Reprogramar</button>`;
                }

                return `<div class="stu3-card-wrapper" style="display: flex; flex-direction: column; gap: 4px; align-items: stretch; flex-shrink: 0; min-width: 70px;">
                    <div class="stu3-card" id="stu3-${m.id}"
                            onclick="app.cycleAttendance('${claseId}','${m.id}')"
                            onmouseenter="app._showHoverCard('${m.id}')"
                            onmouseleave="app._hideHoverCard('${m.id}')"
                            style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 10px 7px;">
                        <div class="stu3-av" style="background:${m.color||'#6366f1'}">${avatarChar}</div>
                        <span class="stu3-cname" style="color:${nameColor}">${this._escapeHtml(firstName)}</span>
                        <button onclick="event.stopPropagation(); app.openTeacherFichaModal('${m.id}')" title="Ver Ficha" style="background:none; border:none; cursor:pointer; font-size:12px; padding:2px; display:flex; align-items:center; justify-content:center; opacity: 0.6; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.6">🗂️</button>
                        ${hoverCard}
                    </div>
                    ${actionHtml}
                </div>`;
            }).join('');
            return `<div class="tab3-group">
                <div class="tab3-group-header ${colorKey}">${label} — ${mlist.length}</div>
                <div class="tab3-group-body tab3-cards">${cards}</div>
            </div>`;
        };

        const presentes = members.filter(m => (clase.attendance||{})[m.id] === 'presente');
        const ausentes  = members.filter(m => (clase.attendance||{})[m.id] === 'ausente');
        const sinMarcar = members.filter(m => !(clase.attendance||{})[m.id]);

        const tableroHtml = [
            buildAttGroup('Presentes', 'green', presentes),
            buildAttGroup('Ausentes', 'red', ausentes),
            buildAttGroup('Sin marcar', 'gray', sinMarcar),
        ].join('') || '<p class="text3-muted">Sin alumnos en este grupo</p>';

        // ── E) CONTENIDO ──
        const catChips = clase.categories.map(cat => `
            <div class="cat3-chip">
                <span>${this._escapeHtml(cat)}</span>
                <span class="cat3-rm" onclick="app.removeCategory('${claseId}','${this._escapeHtml(cat)}')">×</span>
            </div>`).join('');

        const iconFor = ft => (ft==='gp'||ft==='gpx'||ft==='score')?'🎸':ft==='pdf'?'📄':ft==='audio'?'🎵':ft==='youtube'?'▶️':'📎';
        const contentItems = (clase.content||[]).map(c => {
            const libItem = libraryItems.find(it => it.id === c.id) || {};
            const title = libItem.title || c.title || c.name || 'Sin título';
            const fileType = libItem.type || c.fileType || 'gp';
            return `<div class="ci3-item">
                <div class="ci3-ico">${iconFor(fileType)}</div>
                <span class="ci3-title">${this._escapeHtml(title)}</span>
                <span class="ci3-cat">${this._escapeHtml(c.cat||'')}</span>
                <span class="ci3-rm" onclick="app.removeContentFromClase('${claseId}','${c.id}')">×</span>
            </div>`;
        }).join('') || '<p class="text3-muted">Sin contenido. Agregá desde la Biblioteca →</p>';

        // ── G) OBJETIVOS ──
        const objItems = (clase.objetivos||[]).map(o => `
            <div class="obj3-item">
                <div class="obj3-box"></div>
                <span class="obj3-text">${this._escapeHtml(o.text)}</span>
                <span class="obj3-rm" onclick="app.removeObjetivoFromClase('${claseId}','${o.id}')">×</span>
            </div>`).join('');

        // ── DUDAS Y CONSULTAS DEL ALUMNO ──
        const currentPreguntas = this.data.getAllPreguntasForClase(claseId, memberIds);
        const classUploadedItems = await this.data.getLibraryItemsForClase(claseId);

        const textDudasHtml = currentPreguntas.map(p => {
            const m = members.find(student => student.id === p.profileId) || {};
            const timeStr = new Date(p.timestamp).toLocaleString('es-AR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
            return `
                <div style="background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:8px; padding:10px; margin-bottom:8px">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px; color:var(--tb-text-muted)">
                        <strong>${this._escapeHtml(m.name || 'Alumno')}</strong>
                        <span>${timeStr}</span>
                    </div>
                    <p style="margin:0; font-size:13px; color:var(--tb-text-primary)">"${this._escapeHtml(p.text)}"</p>
                </div>
            `;
        }).join('');

        const fileDudasHtml = classUploadedItems.map(item => {
            const m = members.find(student => student.id === item.uploadedBy) || {};
            const color = this._bibCatColor(item.category || '');
            const fileIcon = iconFor(item.type);
            return `
                <div onclick="app.openLibraryItemById('${item.id}')" style="cursor:pointer; background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:8px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center">
                    <div>
                        <div style="font-size:13px; font-weight:500; display:flex; align-items:center; gap:6px; color:var(--tb-text-primary)">
                            <span>${fileIcon}</span>
                            <span>${this._escapeHtml(item.title)}</span>
                        </div>
                        <div style="font-size:11px; color:var(--tb-text-muted); margin-top:2px">
                            Subido por <strong>${this._escapeHtml(m.name || 'Alumno')}</strong> · ${this._escapeHtml(item.category || '')} · ${this._bibLevelLabel(item.level)}
                        </div>
                    </div>
                    <span style="font-size:11px; color:var(--tb-text-muted)">Hacé clic para abrir ↗</span>
                </div>
            `;
        }).join('');

        const hasAnyDudas = currentPreguntas.length > 0 || classUploadedItems.length > 0;
        const dudasSectionHtml = `
            <div class="sec3-block" style="border-top:1px solid var(--tb-border); padding-top:20px; margin-top:20px">
                <div class="sec3-label" style="display:flex; align-items:center; gap:6px">
                    <span>💬 Consultas / Dudas del Alumno</span>
                    ${hasAnyDudas ? `<span class="bib-tab-badge" style="background:var(--tb-accent); color:#fff; font-size:10px; padding:2px 6px">${currentPreguntas.length + classUploadedItems.length}</span>` : ''}
                </div>
                ${!hasAnyDudas ? `
                    <p class="text3-muted" style="font-style:italic; font-size:13px">No hay consultas de los alumnos cargadas para esta clase aún.</p>
                ` : `
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:16px; margin-top:10px">
                        <div>
                            <div style="font-size:12px; font-weight:600; color:var(--tb-text-muted); margin-bottom:8px">Preguntas por texto</div>
                            ${textDudasHtml || '<p class="text3-muted" style="font-size:12px; font-style:italic">Sin preguntas escritas.</p>'}
                        </div>
                        <div>
                            <div style="font-size:12px; font-weight:600; color:var(--tb-text-muted); margin-bottom:8px">Archivos y videos adjuntos</div>
                            ${fileDudasHtml || '<p class="text3-muted" style="font-size:12px; font-style:italic">Sin archivos de consulta.</p>'}
                        </div>
                    </div>
                `}
            </div>
        `;

        panel.className = 'clase3-col';
        panel.innerHTML = `
            <div class="clase3-scroll">

                <!-- A: HEADER -->
                <div class="h3-header">
                    <div class="h3-title-block">
                        <div class="h3-title">${this._escapeHtml(group.name||clase.title||'Clase')}</div>
                        <div class="h3-sub">${timeLabel} · ${type} · ${members.length} alumno${members.length!==1?'s':''}</div>
                    </div>
                    ${meetBarHtml}
                    <button class="h3-btn h3-btn-edit" onclick="app._openEditClaseModal('${claseId}')">Editar</button>
                </div>

                ${resumenAntHtml}

                <!-- C: TABLERO -->
                <div class="sec3-block">
                    <div class="sec3-label">C — Tablero de control</div>
                    <div class="tab3-wrap" id="tablero-${claseId}">
                        ${tableroHtml}
                    </div>
                    <div class="prac-legend">
                        <div class="hc-prac-dot full"></div><span>Completo</span>
                        <div class="hc-prac-dot partial"></div><span>Parcial</span>
                        <div class="hc-prac-dot none"></div><span>Sin práctica</span>
                    </div>
                </div>

                <!-- E: CONTENIDO -->
                <div class="sec3-block">
                    <div class="sec3-label">E — Contenido de la clase <span class="sec3-hint">agregá desde Biblioteca →</span></div>
                    <div class="cat3-chips" id="cat3-chips-${claseId}">
                        ${catChips}
                        <div class="cat3-add" onclick="app.bibOpenCatEditor('clase:${claseId}')" title="Configurar categorías para esta clase"><span>⚙️</span> Categorías</div>
                    </div>
                    <div class="ci3-list" id="ci3-list-${claseId}">${contentItems}</div>
                </div>

                <!-- F+G: RESUMEN + OBJETIVOS -->
                <div class="sec3-fg-grid">
                    <div class="sec3-block">
                        <div class="sec3-label">F — Resumen privado</div>
                        <textarea class="sec3-ta" id="resumen-prof-${claseId}" placeholder="¿Qué se trabajó hoy?…" rows="4" onblur="app.saveResumenProfesor('${claseId}',this.value)">${this._escapeHtml(clase.resumenProfesor||clase.resumen||'')}</textarea>
                    </div>
                    <div class="sec3-block">
                        <div class="sec3-label">G — Objetivos <span class="sec3-hint">el alumno los ve</span></div>
                        <div class="obj3-list" id="obj3-list-${claseId}">${objItems||'<p class="text3-muted">Sin objetivos</p>'}</div>
                        <div class="obj3-add-row">
                            <input type="text" class="obj3-input" id="new-obj-${claseId}" placeholder="Nuevo objetivo…" onkeydown="if(event.key==='Enter')app.addObjetivoToClase('${claseId}')">
                            <button class="h3-btn h3-btn-pri" onclick="app.addObjetivoToClase('${claseId}')">+ Agregar</button>
                        </div>
                    </div>
                </div>

                ${dudasSectionHtml}

                <!-- H: FINALIZAR -->
                <div class="finalizar3-bar">
                    <span class="finalizar3-hint">${status==='finalizada'?`Publicada para <strong>${members.length} alumno${members.length!==1?'s':''}</strong> · podés actualizar cuando quieras`:`Disponible para <strong>${members.length} alumno${members.length!==1?'s':''}</strong> al publicar`}</span>
                    <button class="finalizar3-btn ${status==='finalizada'?'done':''}" onclick="app.finalizarClase('${claseId}')">${status==='finalizada'?'↑ Actualizar publicación':'✓ Publicar clase'}</button>
                </div>

            </div>`;
    }

    toggleAttendance(claseId, profileId) {
        this.cycleAttendance(claseId, profileId);
    }

    async removeContentFromClase(claseId, itemId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.content = (clase.content||[]).filter(c => c.id !== itemId);
        this.data.saveClase(clase);
        
        const libraryItems = await this.data.getLibraryItems();
        const iconFor = ft => (ft==='gp'||ft==='gpx'||ft==='score')?'🎸':ft==='pdf'?'📄':ft==='audio'?'🎵':ft==='youtube'?'▶️':'📎';
        const listEl = document.getElementById(`ci3-list-${claseId}`);
        if (listEl) {
            listEl.innerHTML = clase.content.length
                ? clase.content.map(c => {
                    const libItem = libraryItems.find(it => it.id === c.id) || {};
                    const title = libItem.title || c.title || c.name || 'Sin título';
                    const fileType = libItem.type || c.fileType || 'gp';
                    return `
                    <div class="ci3-item">
                        <div class="ci3-ico">${iconFor(fileType)}</div>
                        <span class="ci3-title">${this._escapeHtml(title)}</span>
                        <span class="ci3-cat">${this._escapeHtml(c.cat||'')}</span>
                        <span class="ci3-rm" onclick="app.removeContentFromClase('${claseId}','${c.id}')">×</span>
                    </div>`;
                }).join('')
                : '<p class="text3-muted">Sin contenido. Agregá desde la Biblioteca →</p>';
        }
        this._renderBibliotecaPanel();
    }

    addObjetivoToClase(claseId) {
        const input = document.getElementById(`new-obj-${claseId}`);
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.objetivos = clase.objetivos || [];
        const obj = { id: this.data.generateId('obj'), text };
        clase.objetivos.push(obj);
        this.data.saveClase(clase);
        input.value = '';
        const listEl = document.getElementById(`obj3-list-${claseId}`);
        if (listEl) {
            if (listEl.querySelector('.text3-muted')) listEl.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'obj3-item';
            div.innerHTML = `<div class="obj3-box"></div><span class="obj3-text">${this._escapeHtml(text)}</span><span class="obj3-rm" onclick="app.removeObjetivoFromClase('${claseId}','${obj.id}')">×</span>`;
            listEl.appendChild(div);
        }
    }

    removeObjetivoFromClase(claseId, objId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.objetivos = (clase.objetivos||[]).filter(o => o.id !== objId);
        this.data.saveClase(clase);
        const listEl = document.getElementById(`obj3-list-${claseId}`);
        if (listEl) {
            const item = listEl.querySelector(`[onclick*="${objId}"]`)?.closest('.obj3-item');
            if (item) item.remove();
            if (!listEl.children.length) listEl.innerHTML = '<p class="text3-muted">Sin objetivos</p>';
        }
    }

    saveResumenClase(claseId, text) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.resumen = text;
        this.data.saveClase(clase);
    }

    saveClaseTitle(claseId, text) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.title = text.trim() || clase.title;
        this.data.saveClase(clase);
    }

    saveClaseDate(claseId, date) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.date = date;
        this.data.saveClase(clase);
    }

    iniciarClase(claseId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.status = 'en-curso';
        this.data.saveClase(clase);
        this.showToast('Clase iniciada', '▶️');
        this.renderDashboardView();
    }

    finalizarClase(claseId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.status = 'finalizada';
        clase.finalizadaAt = Date.now();
        this.data.saveClase(clase);
        this.showToast('Clase publicada ✓', '✅');
        this.renderDashboardView();
    }

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
            return (item.title || '').toLowerCase().includes(searchVal) ||
                   (item.category || '').toLowerCase().includes(searchVal) ||
                   (item.level || '').toLowerCase().includes(searchVal) ||
                   (item.style || '').toLowerCase().includes(searchVal);
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
                        <span>Material General de Práctica (Semanas)</span>
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

    switchTimelineTab(tab) {
        this._timelineTab = tab;
        this.renderDashboardView();
    }

    shiftWeek(delta) {
        this._weekOffset += delta;
        this.renderDashboardView();
    }

    _getWeekDates(offset) {
        const today = new Date();
        // Lunes de la semana actual
        const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=Lun…7=Dom
        const mon = new Date(today);
        mon.setDate(today.getDate() - (dayOfWeek - 1) + offset * 7);
        return [0,1,2,3,4].map(i => {
            const d = new Date(mon);
            d.setDate(mon.getDate() + i);
            return d.toISOString().slice(0,10);
        });
    }

    _renderSemanaCols(allClases, groups, todayStr) {
        const weekDates = this._getWeekDates(this._weekOffset);
        const dayAbbr = ['L','M','X','J','V'];
        const weekLabel = (() => {
            const d0 = weekDates[0], d4 = weekDates[4];
            const fmt = d => new Date(d+'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'});
            return `${fmt(d0)} – ${fmt(d4)}`;
        })();

        const cols = weekDates.map((dateStr, idx) => {
            const dayNum = parseInt(dateStr.slice(8), 10);
            const isToday = dateStr === todayStr;
            const dayClases = allClases.filter(c => c.date === dateStr).sort((a,b) => {
                const ga = groups.find(g=>g.id===a.groupId)||{};
                const gb = groups.find(g=>g.id===b.groupId)||{};
                return (ga.time||'').localeCompare(gb.time||'');
            });
            const cards = dayClases.map(c => {
                const g = groups.find(x=>x.id===c.groupId)||{};
                const st = c.status==='finalizada'?'finalizada':c.status==='en-curso'?'iniciada':'pendiente';
                const dotCls = c.status==='finalizada'?'finalizada':c.status==='en-curso'?'iniciada':'pendiente';
                return `<div class="sem3-card ${st} ${c.id===this._currentClaseId?'selected':''}" onclick="app.openClase('${c.id}')">
                    <div class="sem3-card-time">${(g.time||c.time||'').slice(0,5)||'—'}</div>
                    <div class="sem3-card-name">${this._escapeHtml(g.name||c.title||'Clase')}</div>
                    <div class="sem3-dot ${dotCls}"></div>
                </div>`;
            }).join('');

            // Grupos programados para ese día sin clase creada
            const existingGroupIds = new Set(dayClases.map(c=>c.groupId));
            const groupDayName = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date(dateStr+'T12:00').getDay()];
            const newCards = groups.filter(g=>g.day===groupDayName && !existingGroupIds.has(g.id)).map(g => `
                <div class="sem3-card new" onclick="app.createClase('${g.id}')">
                    <div class="sem3-card-time">${(g.time||'').slice(0,5)||'—'}</div>
                    <div class="sem3-card-name">${this._escapeHtml(g.name)}</div>
                    <div class="sem3-dot new"></div>
                </div>`).join('');

            return `<div class="sem3-col ${isToday?'today':''}">
                <div class="sem3-col-header">
                    <span class="sem3-day-name">${dayAbbr[idx]}</span>
                    <span class="sem3-day-num ${isToday?'today':''}">${dayNum}</span>
                </div>
                ${cards}${newCards}
            </div>`;
        }).join('');

        // Placeholder para Google Calendar — integración futura vía OAuth
        const gcalHint = `<div class="sem3-gcal-hint">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Conectar Google Calendar (próximamente)
        </div>`;

        return `<div class="sem3-wrap">
            <div class="sem3-nav">
                <button class="sem3-nav-btn" onclick="app.shiftWeek(-1)">‹</button>
                <span class="sem3-nav-label">${weekLabel}</span>
                <button class="sem3-nav-btn" onclick="app.shiftWeek(1)">›</button>
            </div>
            <div class="sem3-grid">${cols}</div>
            ${gcalHint}
        </div>`;
    }

    cycleAttendance(claseId, profileId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.attendance = clase.attendance || {};
        const cur = clase.attendance[profileId] || null;
        clase.attendance[profileId] = cur === null ? 'presente' : cur === 'presente' ? 'ausente' : null;
        this.data.saveClase(clase);
        this._moveAttCard(claseId, profileId, clase.attendance[profileId]);
    }

    _moveAttCard(claseId, profileId, newStatus) {
        const tablero = document.getElementById(`tablero-${claseId}`);
        const card    = document.getElementById(`stu3-${profileId}`);
        if (!tablero || !card) { this._renderClaseDetail(claseId); return; }

        const ORDER  = ['Presentes', 'Ausentes', 'Sin marcar'];
        const COLORS = { 'Presentes': 'green', 'Ausentes': 'red', 'Sin marcar': 'gray' };
        const targetLabel = newStatus === 'presente' ? 'Presentes' : newStatus === 'ausente' ? 'Ausentes' : 'Sin marcar';

        // Buscar o crear el grupo destino
        const allGroups = () => Array.from(tablero.querySelectorAll(':scope > .tab3-group'));
        let targetGroup = allGroups().find(g =>
            g.querySelector('.tab3-group-header')?.textContent.trimStart().startsWith(targetLabel)
        );
        if (!targetGroup) {
            targetGroup = document.createElement('div');
            targetGroup.className = 'tab3-group';
            targetGroup.innerHTML = `
                <div class="tab3-group-header ${COLORS[targetLabel]}">${targetLabel} — 0</div>
                <div class="tab3-group-body tab3-cards"></div>`;
            const targetIdx = ORDER.indexOf(targetLabel);
            let inserted = false;
            for (const g of allGroups()) {
                const txt = g.querySelector('.tab3-group-header')?.textContent.trimStart() || '';
                if (ORDER.indexOf(ORDER.find(l => txt.startsWith(l))) > targetIdx) {
                    tablero.insertBefore(targetGroup, g); inserted = true; break;
                }
            }
            if (!inserted) tablero.appendChild(targetGroup);
        }

        const sourceGroup = card.closest('.tab3-group');
        targetGroup.querySelector('.tab3-group-body').appendChild(card);

        const refreshHeader = g => {
            const hdr   = g.querySelector('.tab3-group-header');
            const count = g.querySelectorAll('.stu3-card').length;
            if (!count) { g.remove(); return; }
            const label = ORDER.find(l => hdr?.textContent.trimStart().startsWith(l)) || '';
            if (hdr) hdr.textContent = `${label} — ${count}`;
        };
        if (sourceGroup && sourceGroup !== targetGroup) refreshHeader(sourceGroup);
        refreshHeader(targetGroup);
    }

    removeCategory(claseId, cat) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.categories = (clase.categories||[]).filter(c => c !== cat);
        this.data.saveClase(clase);
        const chipsEl = document.getElementById(`cat3-chips-${claseId}`);
        if (chipsEl) {
            const chip = [...chipsEl.querySelectorAll('.cat3-chip')].find(el => el.querySelector('span')?.textContent === cat);
            if (chip) chip.remove();
        }
    }

    _promptAddCategory(claseId) {
        const cat = prompt('Nombre de la categoría:');
        if (!cat || !cat.trim()) return;
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.categories = clase.categories || [];
        if (clase.categories.includes(cat.trim())) return;
        clase.categories.push(cat.trim());
        this.data.saveClase(clase);
        const chipsEl = document.getElementById(`cat3-chips-${claseId}`);
        if (chipsEl) {
            const addBtn = chipsEl.querySelector('.cat3-add');
            const chip = document.createElement('div');
            chip.className = 'cat3-chip';
            chip.innerHTML = `<span>${this._escapeHtml(cat.trim())}</span><span class="cat3-rm" onclick="app.removeCategory('${claseId}','${this._escapeHtml(cat.trim())}')">×</span>`;
            chipsEl.insertBefore(chip, addBtn);
        }
    }

    saveResumenProfesor(claseId, text) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.resumenProfesor = text;
        clase.resumen = text; // backward compat
        this.data.saveClase(clase);
    }

    _showHoverCard(profileId) {
        const card = document.getElementById(`hc-${profileId}`);
        if (card) card.classList.add('visible');
    }

    _hideHoverCard(profileId) {
        const card = document.getElementById(`hc-${profileId}`);
        if (card) card.classList.remove('visible');
    }

    // TODO(biblioteca): Los chips de categoría de la biblioteca y el proceso de subida rápida
    // deben rediseñarse cuando se desarrolle el sistema de Biblioteca completo. Los campos
    // musicalStyle/type de los items no coinciden con las categorías de clase (Técnica/Lectura/etc.).
    // Ver también: filterBiblioteca y _uploadLibFile.
    async _renderBibliotecaPanel() {
        const body = document.getElementById('dash-bib-body');
        if (!body) return;

        const allItems = await this.data.getLibraryItems();
        const claseId = this._currentClaseId;
        const clase = claseId ? this.data.getClase(claseId) : null;
        const addedIds = new Set((clase?.content||[]).map(c => c.id));

        const q = (this._libSearch||'').toLowerCase().trim();
        const catF = this._libCatFilter || 'todos';

        let items = allItems;
        if (q) items = items.filter(it => (it.title||it.name||'').toLowerCase().includes(q));
        if (catF !== 'todos') {
            items = items.filter(it => (it.category||it.exerciseType||'') === catF);
        }

        const iconFor = ft => (ft==='gp'||ft==='gpx'||ft==='score')?'🎸':ft==='pdf'?'📄':ft==='audio'?'🎵':ft==='youtube'?'▶️':'📎';

        const panelCats = (clase && clase.categories && clase.categories.length) ? clase.categories : this.data.getDefaultCategories();
        const catChips = ['todos', ...panelCats].map(c =>
            `<div class="bib3-chip ${catF===c?'active':''}" onclick="app.filterBiblioteca('${this._escapeHtml(c)}')">${c==='todos'?'Todos':this._escapeHtml(c)}</div>`
        ).join('');

        const listHtml = items.length
            ? items.map(it => {
                const added = addedIds.has(it.id);
                return `<div class="bib3-item ${added?'added':''}">
                    <div class="bib3-ico">${iconFor(it.fileType||it.type)}</div>
                    <span class="bib3-title">${this._escapeHtml(it.title||it.name)}</span>
                    ${added
                        ? `<div class="bib3-check">✓</div>`
                        : `<div class="bib3-add" onclick="app.addContentFromBib('${it.id}')">+</div>`}
                </div>`;
              }).join('')
            : '<p class="text3-muted" style="padding:10px 0">Sin resultados</p>';

        body.innerHTML = `
            <div class="bib3-search-wrap">
                <span class="bib3-search-icon">🔍</span>
                <input type="text" class="bib3-search" placeholder="Buscar en biblioteca…" value="${this._escapeHtml(q)}" oninput="app.searchBiblioteca(this.value)">
            </div>
            <div class="bib3-chips">${catChips}</div>
            <div class="bib3-list">${listHtml}</div>
            <div class="bib3-upload">
                <div class="bib3-upload-title">Subir nuevo</div>
                <div class="bib3-dz" ondragover="event.preventDefault()" ondrop="app._handleLibDrop(event)">
                    <div class="bib3-dz-icon">📁</div>
                    <div class="bib3-dz-label">Arrastrá .gp · .pdf · .gpx</div>
                    <div class="bib3-dz-sub">o <label style="color:var(--tb-accent);cursor:pointer"><input type="file" style="display:none" accept=".gp,.gp4,.gp5,.gpx,.pdf" onchange="app._handleLibFileInput(event)">elegir archivo</label></div>
                </div>
                <div class="bib3-link-row">
                    <input type="text" class="bib3-link-input" id="bib3-link-input" placeholder="Link YouTube / Spotify…">
                    <button class="h3-btn" onclick="app._detectLibLink()">Detectar</button>
                </div>
            </div>`;
    }

    filterBiblioteca(cat) {
        this._libCatFilter = cat;
        this._renderBibliotecaPanel();
    }

    searchBiblioteca(q) {
        this._libSearch = q;
        this._renderBibliotecaPanel();
    }

    async addContentFromBib(libItemId) {
        if (!this._currentClaseId) { this.showToast('Seleccioná una clase primero', '⚠️'); return; }
        const claseId = this._currentClaseId;
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        if ((clase.content||[]).some(c => c.id === libItemId)) return;
        const item = await this.data.getLibraryItem(libItemId);
        if (!item) return;
        const cats = clase.categories || this.data.getDefaultCategories();
        const cat = (item.category && cats.includes(item.category)) ? item.category : (cats[0] || 'Técnica');
        clase.content = clase.content || [];
        clase.content.push({ id: item.id, cat });
        this.data.saveClase(clase);
        
        // Cargar biblioteca para resolver dinámicamente títulos/iconos
        const libraryItems = await this.data.getLibraryItems();
        const iconFor = ft => (ft==='gp'||ft==='gpx'||ft==='score')?'🎸':ft==='pdf'?'📄':ft==='audio'?'🎵':ft==='youtube'?'▶️':'📎';
        const listEl = document.getElementById(`ci3-list-${claseId}`);
        if (listEl) {
            listEl.innerHTML = clase.content.map(c => {
                const libItem = libraryItems.find(it => it.id === c.id) || {};
                const title = libItem.title || c.title || c.name || 'Sin título';
                const fileType = libItem.type || c.fileType || 'gp';
                return `
                <div class="ci3-item">
                    <div class="ci3-ico">${iconFor(fileType)}</div>
                    <span class="ci3-title">${this._escapeHtml(title)}</span>
                    <span class="ci3-cat">${this._escapeHtml(c.cat||'')}</span>
                    <span class="ci3-rm" onclick="app.removeContentFromClase('${claseId}','${c.id}')">×</span>
                </div>`;
            }).join('');
        }
        this._renderBibliotecaPanel();
        this.showToast('Contenido agregado', '📎');
    }

    async _openEditClaseModal(claseId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        const overlay = document.getElementById('modal-edit-clase');
        if (!overlay) return;

        const group = this.data.getGroup(clase.groupId) || {};
        const allProfiles = await this.data.getProfiles();
        const groupMemberIds = group.memberIds || [];
        const override = clase.memberOverride; // null | [profileId, ...]
        const activeIds = new Set(override !== null && override !== undefined ? override : groupMemberIds);

        // Populate date, time, meetUrl
        document.getElementById('modal-edit-date').value = clase.date || '';
        document.getElementById('modal-edit-time').value = clase.time || group.time || '';
        document.getElementById('modal-edit-meeturl').value = clase.meetUrl || '';

        // Populate student list — muestra TODOS los perfiles, pre-marca los activos
        const stuList = document.getElementById('modal-edit-students');
        if (allProfiles.length === 0) {
            stuList.innerHTML = '<div class="modal-students-empty">No hay alumnos creados aún.</div>';
        } else {
            const renderRow = p => {
                const checked = activeIds.has(p.id);
                const initial = (p.name||'?')[0].toUpperCase();
                const color = p.color || '#c0392b';
                return `<div class="modal-stu-row ${checked?'checked':''}" data-pid="${p.id}" onclick="app._toggleModalStu(this)">
                    <div class="modal-stu-cb">${checked?'✓':''}</div>
                    <div class="modal-stu-av" style="background:${color}">${initial}</div>
                    <span class="modal-stu-name">${this._escapeHtml(p.name||p.id)}</span>
                </div>`;
            };
            // Checked → "Del grupo", unchecked → "Otros alumnos"
            const checked   = allProfiles.filter(p => activeIds.has(p.id));
            const unchecked = allProfiles.filter(p => !activeIds.has(p.id));
            stuList.innerHTML = `
                <div class="modal-stu-section" id="ms-in-label" ${!checked.length ? 'style="display:none"' : ''}>Del grupo</div>
                <div id="ms-in">${checked.map(renderRow).join('')}</div>
                <div class="modal-stu-section" id="ms-out-label" ${!unchecked.length ? 'style="display:none"' : ''}>Otros alumnos</div>
                <div id="ms-out">${unchecked.map(renderRow).join('')}</div>`;
        }

        overlay.dataset.claseId = claseId;
        overlay.style.display = 'flex';
    }

    _toggleModalStu(row) {
        row.classList.toggle('checked');
        const cb = row.querySelector('.modal-stu-cb');
        const isChecked = row.classList.contains('checked');
        if (cb) cb.textContent = isChecked ? '✓' : '';

        const inContainer  = document.getElementById('ms-in');
        const outContainer = document.getElementById('ms-out');
        const inLabel      = document.getElementById('ms-in-label');
        const outLabel     = document.getElementById('ms-out-label');
        if (!inContainer || !outContainer) return;

        if (isChecked) {
            inContainer.appendChild(row);
        } else {
            outContainer.appendChild(row);
        }
        if (inLabel)  inLabel.style.display  = inContainer.children.length  ? '' : 'none';
        if (outLabel) outLabel.style.display = outContainer.children.length ? '' : 'none';
    }

    closeEditClaseModal() {
        const overlay = document.getElementById('modal-edit-clase');
        if (overlay) overlay.style.display = 'none';
    }

    saveEditClase() {
        const overlay = document.getElementById('modal-edit-clase');
        if (!overlay) return;
        const claseId = overlay.dataset.claseId;
        const clase = this.data.getClase(claseId);
        if (!clase) return;

        const newDate = document.getElementById('modal-edit-date').value;
        const newMeet = document.getElementById('modal-edit-meeturl').value.trim();
        const checkedRows = overlay.querySelectorAll('.modal-stu-row.checked');
        const checkedIds = Array.from(checkedRows).map(r => r.dataset.pid).filter(Boolean);

        const group = this.data.getGroup(clase.groupId) || {};
        const groupMemberIds = group.memberIds || [];
        // Si la selección coincide exactamente con los miembros del grupo, limpiamos el override
        const sameAsGroup = checkedIds.length === groupMemberIds.length &&
            checkedIds.every(id => groupMemberIds.includes(id));

        const newTime = document.getElementById('modal-edit-time').value;
        if (newDate) clase.date = newDate;
        if (newTime) clase.time = newTime;
        clase.meetUrl = newMeet || null;
        clase.memberOverride = sameAsGroup ? null : checkedIds;

        this.data.saveClase(clase);
        this.closeEditClaseModal();
        this.renderDashboardView();
        this.showToast('Clase actualizada.', '✓');
    }

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

    saveNotaAlumnoClase(claseId, text) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.notaAlumno = text;
        this.data.saveClase(clase);
    }

    _canalPreguntasHtml(claseId, preguntas) {
        const prevHtml = preguntas.map(p => {
            const timeStr = new Date(p.timestamp).toLocaleString('es-AR', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
            return `<div class="duda-item">
                <p class="duda-text">"${this._escapeHtml(p.text)}"</p>
                <div class="duda-meta">
                    <svg viewBox="0 0 16 16" fill="none" style="width:12px;height:12px" stroke="var(--tb-success)" stroke-width="1.5"><path d="M3 8l3 3 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span>Enviada · ${timeStr}</span>
                    <button class="duda-delete" onclick="app.deletePreguntaAlumno('${claseId}','${p.id}')">×</button>
                </div>
            </div>`;
        }).join('');
        return prevHtml + `<div class="canal-form">
            <textarea id="preg-alumno-input" class="canal-ta" rows="2" placeholder="¿Qué no quedó claro? ¿Algo que quieras repasar la próxima clase?…"></textarea>
            <div class="canal-form-actions">
                <button class="btn-pill btn-meet-pill" onclick="app.sendPreguntaAlumno('${claseId}')">
                    <svg viewBox="0 0 16 16" fill="none" style="width:11px;height:11px" stroke="currentColor" stroke-width="1.5"><path d="M14 2L2 7l5 2 2 5 5-12z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Enviar pregunta
                </button>
            </div>
        </div>`;
    }

    sendPreguntaAlumno(claseId) {
        if (!this.activeProfile) return;
        const ta = document.getElementById('preg-alumno-input');
        if (!ta) return;
        const text = ta.value.trim();
        if (!text) return;
        const preg = { id: this.data.generateId('preg'), text, timestamp: Date.now() };
        this.data.savePreguntaAlumno(this.activeProfile.id, claseId, preg);
        ta.value = '';
        const container = document.getElementById(`canal-preg-${claseId}`);
        if (container) {
            const preguntas = this.data.getPreguntasAlumno(this.activeProfile.id, claseId);
            container.innerHTML = this._canalPreguntasHtml(claseId, preguntas);
        }
        this.showToast('Pregunta enviada', '✓');
    }

    deletePreguntaAlumno(claseId, pregId) {
        if (!this.activeProfile) return;
        this.data.deletePreguntaAlumno(this.activeProfile.id, claseId, pregId);
        const container = document.getElementById(`canal-preg-${claseId}`);
        if (container) {
            const preguntas = this.data.getPreguntasAlumno(this.activeProfile.id, claseId);
            container.innerHTML = this._canalPreguntasHtml(claseId, preguntas);
        }
    }

    // ============================================================
    // BIBLIOTECA DEL PROFESOR (v2)
    // ============================================================

    // --- Categorías (strings libres, color por nombre) ---
    _bibCatColor(name) {
        const n = (name || '').toLowerCase().trim();
        const map = {
            'técnica': '#a29bfe', 'tecnica': '#a29bfe',
            'lectura': '#55efc4',
            'repertorio': '#fdcb6e',
            'cont. complementario': '#74b9ff', 'complementario': '#74b9ff', 'contenido complementario': '#74b9ff'
        };
        if (map[n]) return map[n];
        const palette = ['#e17055', '#0984e3', '#00b894', '#6c5ce7', '#e84393', '#00cec9', '#fab1a0', '#81ecec'];
        let h = 0;
        for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
        return palette[h % palette.length];
    }
    _bibCategoriesFor({ profile, group }) {
        if (group && Array.isArray(group.categories) && group.categories.length) return group.categories.slice();
        if (profile && Array.isArray(profile.categories) && profile.categories.length) return profile.categories.slice();
        return this.data.getDefaultCategories();
    }
    _bibEnsurePersonalGroup(profile) {
        const id = 'grp-personal-' + profile.id;
        const groups = this.data.getAllGroups();
        let g = groups.find(x => x.id === id);
        if (!g) {
            g = { id, name: profile.name, memberIds: [profile.id], _personal: true, createdAt: Date.now() };
            groups.push(g);
            this.data.saveGroups(groups);
        }
        return g;
    }
    // Cursos visibles = grupos que NO son el grupo personal de un alumno
    _bibCursos() { return this.data.getAllGroups().filter(g => !g._personal); }

    _bibLevelLabel(lvl) {
        const map = { beginner: 'Inicial', intermediate: 'Intermedio', advanced: 'Avanzado',
                      inicial: 'Inicial', intermedio: 'Intermedio', avanzado: 'Avanzado' };
        return map[lvl] || lvl || '—';
    }
    _bibStyleLabel(s) {
        const map = { tango: 'Tango', folklore: 'Folklore', classic: 'Clásico', clasico: 'Clásico',
                      jazz: 'Jazz', bossa: 'Bossa Nova', flamenco: 'Flamenco', rock: 'Rock', pop: 'Pop' };
        return map[s] || s || '—';
    }
    _bibTypeLabel(t) {
        const map = { gp: 'Guitar Pro', gpx: 'GPX', pdf: 'PDF', youtube: 'YouTube', spotify: 'Spotify', score: 'Guitar Pro' };
        return map[t] || t || '-';
    }
    _bibTypeIcon(t) {
        if (t === 'youtube') return '▶';
        if (t === 'spotify') return '♫';
        if (t === 'pdf') return '📄';
        return '🎵';
    }
    _bibValueLabel(col, val) {
        if (col === 'level') return this._bibLevelLabel(val);
        if (col === 'style') return this._bibStyleLabel(val);
        if (col === 'type')  return this._bibTypeLabel(val);
        return val; // category = string tal cual
    }
    _bibFilterItems(items, isReadOnly = false) {
        let result = items;
        const q = (isReadOnly ? this._myLibSearch : this._bibSearch).toLowerCase().trim();
        if (q) result = result.filter(it => (it.title || '').toLowerCase().includes(q));
        const filters = isReadOnly ? this._myLibColFilters : this._bibColFilters;
        const { type, category, level, style } = filters;
        if (type.length)     result = result.filter(it => type.includes(it.type));
        if (category.length) result = result.filter(it => category.includes(it.category || it.exerciseType));
        if (level.length)    result = result.filter(it => level.includes(it.level));
        if (style.length)    result = result.filter(it => style.includes(it.style || it.musicalStyle));
        return result;
    }
    _bibFilterPanel2(items) {
        let result = items;
        if (this._bibLibCatFilter !== 'todos')
            result = result.filter(it => (it.category || it.exerciseType) === this._bibLibCatFilter);
        const q = this._bibSearch.toLowerCase().trim();
        if (q) result = result.filter(it => (it.title || '').toLowerCase().includes(q));
        return result;
    }

    // ==========================================================================
    // Tablero de Control del Docente
    // ==========================================================================

    teacherBoardSetMainTab(tab) {
        this._teacherBoardMainTab = tab;
        this._bibSelectedStudentCargaId = null;
        this.renderTeacherBoardView();
    }

    _tbActivityBucket(profileId) {
        const lastDate = this.data.getProfileLastPracticed(profileId);
        if (!lastDate) return { bucket: 'inactivo', daysSince: Infinity };
        const todayStr = this.getTodayString();
        const yesterdayStr = new Date(new Date(todayStr + 'T12:00').getTime() - 86400000).toISOString().slice(0, 10);
        const daysSince = Math.round((new Date(todayStr + 'T12:00') - new Date(lastDate + 'T12:00')) / 86400000);
        if (lastDate === todayStr) return { bucket: 'hoy', daysSince: 0 };
        if (lastDate === yesterdayStr) return { bucket: 'ayer', daysSince: 1 };
        return { bucket: 'inactivo', daysSince };
    }

    // Semáforo de atención (alertStatus) — distinto del agrupamiento por actividad (activityBucket).
    // Un alumno puede estar en "Practicó hoy" y aun así tener alertStatus amarillo (ej. consulta pendiente de otra clase).
    _tbAlertStatus(profileId, { daysSince, pendingQuestions, objetivosPct, hasObjetivos }) {
        if (daysSince === Infinity || daysSince > 7) {
            return { level: 'red', reason: daysSince === Infinity ? 'Sin historial de práctica' : `Inactivo hace ${daysSince} días` };
        }
        if (pendingQuestions > 0) {
            return { level: 'yellow', reason: `${pendingQuestions} consulta${pendingQuestions !== 1 ? 's' : ''} sin responder` };
        }
        if (daysSince > 3) {
            return { level: 'yellow', reason: `Sin practicar hace ${daysSince} días` };
        }
        if (hasObjetivos && objetivosPct < 50) {
            return { level: 'yellow', reason: `Objetivos de la última clase: ${objetivosPct}% completados` };
        }
        return { level: 'green', reason: 'Al día' };
    }

    async _tbGetStudentData(profile, allClases, allProfileWeeks, weeks) {
        const pid = profile.id;
        const { bucket, daysSince } = this._tbActivityBucket(pid);
        const streak = this.data.getProfileStreak(pid);
        const completedSteps = this.data.getProfileCompletedSteps(pid) || [false, false, false];
        const lastPracticedTime = this.data.getProfileLastPracticedTime(pid);

        // Mostrar los casilleros de su última práctica registrada
        const stepsToday = completedSteps;

        // Calcular minutos de práctica reales leyendo de IndexedDB
        let minutesToday = 0;
        const lastDate = this.data.getProfileLastPracticed(pid);
        if (lastDate) {
            try {
                const log = await this.data.getPracticeLog(lastDate);
                if (log && (log.profileId === pid || !log.profileId)) {
                    minutesToday = Math.round((log.totalSeconds || 0) / 60);
                }
            } catch (e) {
                console.warn('Error reading practice log for teacher board:', e);
            }
        }
        if (minutesToday === 0) {
            // Fallback
            minutesToday = completedSteps.filter(Boolean).length * 15;
        }

        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(pid));
        const groupLabel = groups.length ? groups.map(g => g.name).join(' · ') : (this.lang === 'es' ? 'Individual' : 'Individual');

        // Consultas pendientes: iterar clases de los grupos del alumno (evita escanear localStorage por prefijo)
        const myClaseIds = allClases.filter(c => groups.some(g => g.id === c.groupId)).map(c => c.id);
        let pendingQuestions = 0;
        myClaseIds.forEach(claseId => {
            const preguntas = this.data.getPreguntasAlumno(pid, claseId);
            pendingQuestions += preguntas.filter(p => !p.resolved).length;
        });

        // Objetivos de la última clase finalizada
        const finalizadas = allClases
            .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
            .sort((a, b) => (b.finalizadaAt || 0) - (a.finalizadaAt || 0));
        const lastClase = finalizadas[0] || null;
        const objetivos = lastClase ? (lastClase.objetivos || []) : [];
        const hasObjetivos = objetivos.length > 0;
        let objetivosPct = 100;
        if (hasObjetivos) {
            const completados = this.data.getObjetivosCompletados(pid);
            const done = objetivos.filter(o => completados[`${lastClase.id}__${o.id}`]).length;
            objetivosPct = Math.round((done / objetivos.length) * 100);
        }

        const alertStatus = this._tbAlertStatus(pid, { daysSince, pendingQuestions, objetivosPct, hasObjetivos });

        // Próxima clase: próximo grupo por día de la semana entre los grupos del alumno
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const now = new Date();
        let nextClase = null;
        groups.forEach(g => {
            const targetDay = dayNames.indexOf(g.day);
            if (targetDay < 0) return;
            let diff = (targetDay - now.getDay() + 7) % 7;
            const candidateDate = new Date(now);
            candidateDate.setDate(now.getDate() + diff);
            const candidateStr = candidateDate.toISOString().slice(0, 10);
            const existingClase = allClases.find(c => c.groupId === g.id && c.date === candidateStr);
            const info = { groupId: g.id, groupName: g.name, date: candidateStr, time: g.time, daysAway: diff, claseId: existingClase ? existingClase.id : null, meetLink: g.meetLink };
            if (!nextClase || info.daysAway < nextClase.daysAway) nextClase = info;
        });

        // Rutinas asignadas
        const myProfileWeeks = allProfileWeeks.filter(pw => pw.profileId === pid);
        const assignedWeeks = myProfileWeeks.map(pw => {
            const w = weeks.find(w => w.id === pw.weekId);
            return { pwId: pw.id, weekId: pw.weekId, title: w ? w.title : '?' };
        }).filter(w => w.title !== '?' || true);

        return {
            profile, groupLabel, streak, stepsToday, lastPracticedTime,
            bucket, daysSince, pendingQuestions, objetivosPct, hasObjetivos,
            alertStatus, nextClase, assignedWeeks, minutesToday
        };
    }

    async renderTeacherBoardView() {
        const container = document.getElementById('teacher-board-content');
        if (!container) return;
        container.innerHTML = '<div style="padding:24px;color:var(--tb-text-secondary)">Cargando...</div>';

        const [profiles, items, weeks, allProfileWeeks] = await Promise.all([
            this.data.getProfiles(), this.data.getLibraryItems(), this.data.getWeeks(), this.data.getAllProfileWeeks()
        ]);
        const allClases = this.data.getAllClases();

        let tabHeaderHtml = `
            <div class="bib-main-tabs" style="display:flex; border-bottom:1px solid var(--tb-border); background:var(--tb-bg-secondary); padding:0 16px; flex-shrink:0">
                <button class="bib-main-tab ${this._teacherBoardMainTab === 'control' ? 'active' : ''}" onclick="app.teacherBoardSetMainTab('control')" style="padding:12px 18px; border:none; background:transparent; font-weight:600; font-size:13px; border-bottom:2px solid ${this._teacherBoardMainTab === 'control' ? 'var(--tb-accent)' : 'transparent'}; color:${this._teacherBoardMainTab === 'control' ? 'var(--tb-text-primary)' : 'var(--tb-text-secondary)'}; cursor:pointer; font-family:var(--font-primary)">Control de Alumnos</button>
                <button class="bib-main-tab ${this._teacherBoardMainTab === 'cargas' ? 'active' : ''}" onclick="app.teacherBoardSetMainTab('cargas')" style="padding:12px 18px; border:none; background:transparent; font-weight:600; font-size:13px; border-bottom:2px solid ${this._teacherBoardMainTab === 'cargas' ? 'var(--tb-accent)' : 'transparent'}; color:${this._teacherBoardMainTab === 'cargas' ? 'var(--tb-text-primary)' : 'var(--tb-text-secondary)'}; cursor:pointer; font-family:var(--font-primary)">Cargas de Alumnos</button>
                <button class="bib-main-tab ${this._teacherBoardMainTab === 'consultas' ? 'active' : ''}" onclick="app.teacherBoardSetMainTab('consultas')" style="padding:12px 18px; border:none; background:transparent; font-weight:600; font-size:13px; border-bottom:2px solid ${this._teacherBoardMainTab === 'consultas' ? 'var(--tb-accent)' : 'transparent'}; color:${this._teacherBoardMainTab === 'consultas' ? 'var(--tb-text-primary)' : 'var(--tb-text-secondary)'}; cursor:pointer; font-family:var(--font-primary)">Consultas</button>
            </div>
        `;

        let contentHtml = '';
        if (this._teacherBoardMainTab === 'cargas') {
            contentHtml = this._bibRenderCargasAlumnosMain(profiles, items);
        } else if (this._teacherBoardMainTab === 'consultas') {
            contentHtml = this._tbRenderConsultasTab(profiles, allClases);
        } else {
            this._tbAllWeeksCache = weeks;
            if (!profiles.length) {
                contentHtml = `<div style="padding:24px;color:var(--tb-text-secondary)">Todavía no hay alumnos.</div>`;
            } else {
                const studentsData = await Promise.all(profiles.map(p => this._tbGetStudentData(p, allClases, allProfileWeeks, weeks)));
                contentHtml = this._tbRenderControlTab(studentsData, allClases);
            }
        }

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; height:100%; overflow:hidden">
                ${tabHeaderHtml}
                <div style="flex:1; overflow:hidden">${contentHtml}</div>
            </div>
        `;

        if (this._teacherBoardMainTab === 'control') this._tbBindToolbarEvents();
        if (this._teacherBoardMainTab === 'consultas') this._tbBindConsultasEvents();
    }

    _tbFormatDateEs(dateStr) {
        const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
        const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const d = new Date(dateStr + 'T12:00');
        return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
    }

    _tbRenderControlTab(studentsData, allClases) {
        const todayStr = this.getTodayString();
        const headerDate = this._tbFormatDateEs(todayStr);
        const practicedToday = studentsData.filter(s => s.bucket === 'hoy').length;

        const filtered = studentsData.filter(s => {
            const q = (this._tbSearch || '').toLowerCase().trim();
            if (q && !((s.profile.displayName || s.profile.name || '').toLowerCase().includes(q))) return false;
            if (this._tbGroupFilter && this._tbGroupFilter !== 'todos' && s.groupLabel !== this._tbGroupFilter) return false;
            if (this._tbStatusFilter && this._tbStatusFilter !== 'todos' && s.alertStatus.level !== this._tbStatusFilter) return false;
            if (this._tbFocusProfileId && s.profile.id !== this._tbFocusProfileId) return false;
            return true;
        });

        const sortKey = this._tbSort || 'nombre';
        filtered.sort((a, b) => {
            if (sortKey === 'racha') return b.streak - a.streak;
            if (sortKey === 'actividad') return a.daysSince - b.daysSince;
            if (sortKey === 'clase') {
                const da = a.nextClase ? a.nextClase.daysAway : Infinity;
                const db = b.nextClase ? b.nextClase.daysAway : Infinity;
                return da - db;
            }
            return (a.profile.displayName || a.profile.name || '').localeCompare(b.profile.displayName || b.profile.name || '');
        });

        const buckets = [
            { key: 'hoy', label: 'PRACTICARON HOY', color: 'var(--tb-success)' },
            { key: 'ayer', label: 'PRACTICARON AYER', color: '#f5a623' },
            { key: 'inactivo', label: 'INACTIVOS 2+ DÍAS', color: 'var(--tb-text-muted)' }
        ];

        const listHtml = buckets.map(b => {
            const group = filtered.filter(s => s.bucket === b.key);
            if (!group.length) return '';
            const rows = group.map(s => this._tbRenderStudentRow(s)).join('');
            return `<div class="tb-bucket">
                <div class="tb-bucket-header"><span class="tb-bucket-dot" style="background:${b.color}"></span>${b.label} (${group.length})</div>
                <div class="tb-bucket-rows">${rows}</div>
            </div>`;
        }).join('') || `<div style="padding:24px;color:var(--tb-text-secondary)">Ningún alumno coincide con los filtros.</div>`;

        const groupLabels = [...new Set(studentsData.map(s => s.groupLabel))];

        return `<div class="teacher-board-layout horizontal-layout">
            <div class="tb-main-area">
                ${this._tbRenderHeaderStrip(studentsData, headerDate, practicedToday)}
                <div class="tb-toolbar">
                    <div class="bib-search-wrap">
                        <svg class="bib-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" class="bib-search-input" id="tb-search-input" placeholder="Buscar por nombre..." value="${(this._tbSearch || '').replace(/"/g, '&quot;')}">
                    </div>
                    <select class="form-control" id="tb-group-filter" style="max-width:180px">
                        <option value="todos">Todos los grupos</option>
                        ${groupLabels.map(g => `<option value="${this._escapeHtml(g)}" ${this._tbGroupFilter === g ? 'selected' : ''}>${this._escapeHtml(g)}</option>`).join('')}
                    </select>
                    <select class="form-control" id="tb-status-filter" style="max-width:160px">
                        <option value="todos">Todos los estados</option>
                        <option value="green" ${this._tbStatusFilter === 'green' ? 'selected' : ''}>Va bien</option>
                        <option value="yellow" ${this._tbStatusFilter === 'yellow' ? 'selected' : ''}>Necesita atención</option>
                        <option value="red" ${this._tbStatusFilter === 'red' ? 'selected' : ''}>Inactivo</option>
                    </select>
                    <select class="form-control" id="tb-sort" style="max-width:160px">
                        <option value="nombre" ${this._tbSort === 'nombre' ? 'selected' : ''}>Ordenar: Nombre</option>
                        <option value="racha" ${this._tbSort === 'racha' ? 'selected' : ''}>Ordenar: Racha</option>
                        <option value="actividad" ${this._tbSort === 'actividad' ? 'selected' : ''}>Ordenar: Actividad</option>
                        <option value="clase" ${this._tbSort === 'clase' ? 'selected' : ''}>Ordenar: Próxima clase</option>
                    </select>
                    ${this._tbFocusProfileId ? `<button class="btn btn-outline btn-sm" onclick="app.tbClearFocus()">Quitar filtro de alerta</button>` : ''}
                </div>
                <div class="tb-list-scroll">${listHtml}</div>
                ${this._tbRenderProximasClases(allClases)}
            </div>
        </div>`;
    }

    _tbRenderHeaderStrip(studentsData, headerDate, practicedToday) {
        const total = studentsData.length;
        const red = studentsData.filter(s => s.alertStatus.level === 'red').length;
        const yellow = studentsData.filter(s => s.alertStatus.level === 'yellow').length;
        const green = total - red - yellow;

        const inactiveAlerts = studentsData.filter(s => s.alertStatus.level === 'red')
            .map(s => `<div class="tb-alert-item horizontal" onclick="app.tbFocusStudent('${s.profile.id}')">🔴 ${this._escapeHtml(s.profile.displayName || s.profile.name)} — ${s.alertStatus.reason}</div>`).join('');
        const questionAlerts = studentsData.filter(s => s.pendingQuestions > 0)
            .map(s => `<div class="tb-alert-item horizontal" onclick="app.tbFocusStudent('${s.profile.id}')">💬 ${this._escapeHtml(s.profile.displayName || s.profile.name)} — ${s.pendingQuestions} duda${s.pendingQuestions !== 1 ? 's' : ''}</div>`).join('');
        const noObjAlerts = studentsData.filter(s => s.hasObjetivos && s.objetivosPct < 50)
            .map(s => `<div class="tb-alert-item horizontal" onclick="app.tbFocusStudent('${s.profile.id}')">🎯 ${this._escapeHtml(s.profile.displayName || s.profile.name)} — objetivos ${s.objetivosPct}%</div>`).join('');

        const alertsHtml = [inactiveAlerts, questionAlerts, noObjAlerts].filter(Boolean).join('');

        return `<div class="tb-header-strip">
            <div class="tb-header-main-row">
                <div class="tb-header-title-wrap">
                    <h2 class="tb-header-title">${headerDate.charAt(0).toUpperCase() + headerDate.slice(1)}</h2>
                    <div class="tb-header-subtitle">${practicedToday} de ${total} practicaron hoy</div>
                </div>
                <div class="tb-header-badges">
                    <span class="tb-header-badge status-green">● ${green} al día</span>
                    <span class="tb-header-badge status-yellow">● ${yellow} ayer / atención</span>
                    <span class="tb-header-badge status-red">● ${red} inactivos</span>
                </div>
            </div>
            ${alertsHtml ? `
            <div class="tb-header-alerts-container">
                <div class="tb-alerts-strip-title">Alertas Rápidas:</div>
                <div class="tb-alerts-strip">${alertsHtml}</div>
            </div>` : ''}
        </div>`;
    }

    _tbRenderStudentRow(s) {
        const p = s.profile;
        const displayName = p.displayName || p.name || '?';
        const expanded = this._teacherBoardExpandedId === p.id;
        const statusColor = s.alertStatus.level === 'green' ? 'var(--tb-success)' : s.alertStatus.level === 'yellow' ? '#f5a623' : 'var(--tb-accent)';

        const stepsHtml = s.stepsToday.map(done => `<span class="tb-step-check${done ? ' done' : ''}">${done ? '✓' : ''}</span>`).join('');

        let activityLabel = '—';
        let activityClass = 'inactive';
        if (s.bucket === 'hoy') {
            activityLabel = s.lastPracticedTime && !isNaN(new Date(s.lastPracticedTime))
                ? new Date(s.lastPracticedTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                : 'Hoy';
            activityClass = 'today';
        } else if (s.bucket === 'ayer') {
            activityLabel = 'Ayer';
            activityClass = 'yesterday';
        } else if (s.daysSince !== Infinity) {
            activityLabel = `Hace ${s.daysSince} días`;
            activityClass = 'inactive';
        } else {
            activityLabel = 'Sin actividad';
            activityClass = 'inactive';
        }

        const minutesToday = s.minutesToday;

        const routineBadges = s.assignedWeeks.map(w => `
            <span class="tb-routine-badge">${this._escapeHtml(w.title)} <button onclick="event.stopPropagation();app.tbRemoveRoutine('${w.pwId}','${p.id}')">×</button></span>
        `).join('') || '<span class="tb-routine-empty">Sin rutinas asignadas</span>';

        const weekOptions = (this._tbAllWeeksCache || []).map(w =>
            `<option value="${w.id}">${this._escapeHtml(w.title)}</option>`).join('');

        const nextClaseHtml = s.nextClase
            ? `<div class="tb-nextclase">
                <span>${s.nextClase.daysAway === 0 ? 'Hoy' : s.nextClase.daysAway === 1 ? 'Mañana' : `En ${s.nextClase.daysAway} días`} · ${s.nextClase.groupName} ${s.nextClase.time ? '· ' + s.nextClase.time : ''}</span>
                ${s.nextClase.claseId ? `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();app.tbGoToClase('${s.nextClase.claseId}')">Ver clase</button>` : ''}
              </div>`
            : `<div class="tb-nextclase tb-nextclase-empty">Sin próxima clase programada</div>`;

        const questionsPanel = expanded ? this._tbRenderQuestionsAccordion(p.id) : '';

        return `<div class="tb-student-row${expanded ? ' expanded' : ''}" data-profile-id="${p.id}">
            <div class="tb-row-header" onclick="app.tbToggleExpand('${p.id}')">
                <div class="tb-avatar" style="background:${p.color || 'var(--tb-accent)'}">${displayName.charAt(0).toUpperCase()}</div>
                <div class="tb-identity">
                    <div class="tb-name">${this._escapeHtml(displayName)}</div>
                    <div class="tb-group">${this._escapeHtml(s.groupLabel)}</div>
                </div>
                <div class="tb-steps" title="Pasos diarios de hoy">${stepsHtml}</div>
                <div class="tb-minutes">${minutesToday} min</div>
                <div class="tb-streak">${s.streak > 0 ? `🔥 ${s.streak} d` : '— racha'}</div>
                <div class="tb-status-dot-wrap" title="${this._escapeHtml(s.alertStatus.reason)}">
                    <span class="tb-status-dot tb-status-${s.alertStatus.level}" style="background:${statusColor}"></span>
                </div>
                <div class="tb-activity ${activityClass}">${activityLabel}</div>
            </div>
            ${expanded ? `<div class="tb-row-expanded">
                <div class="tb-expanded-actions">
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();app.openTeacherFichaModal('${p.id}')">🗂️ Ficha</button>
                </div>
                ${nextClaseHtml}
                <div class="tb-routines-block">
                    <div class="tb-routines-badges">${routineBadges}</div>
                    <select class="form-control tb-assign-select" onchange="if(this.value){app.tbAssignRoutine('${p.id}',this.value);this.value='';}">
                        <option value="">+ Asignar rutina...</option>
                        ${weekOptions}
                    </select>
                </div>
                ${questionsPanel}
            </div>` : ''}
        </div>`;
    }

    _tbRenderQuestionsAccordion(profileId) {
        const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(profileId));
        const allClases = this.data.getAllClases().filter(c => groups.some(g => g.id === c.groupId));
        const allPreguntas = [];
        allClases.forEach(c => {
            this.data.getPreguntasAlumno(profileId, c.id).forEach(preg => allPreguntas.push({ ...preg, claseId: c.id, claseTitle: c.title || (this.data.getGroup(c.groupId) || {}).name || 'Clase' }));
        });

        if (!allPreguntas.length) {
            return `<div class="tb-questions-block"><p class="tb-questions-empty">Sin consultas registradas.</p></div>`;
        }

        const rows = allPreguntas.map(preg => `
            <div class="tb-question-row${preg.resolved ? ' resolved' : ''}">
                <div class="tb-question-text"><strong>${this._escapeHtml(preg.claseTitle)}:</strong> ${this._escapeHtml(preg.text || preg.pregunta || '')}</div>
                ${preg.reply ? `<div class="tb-question-reply">Tu respuesta: ${this._escapeHtml(preg.reply)}</div>` : `
                <div class="tb-question-reply-form">
                    <input type="text" class="form-control" id="tb-reply-input-${preg.id}" placeholder="Escribir respuesta...">
                    <button class="btn btn-primary btn-sm" onclick="app.tbReplyQuestion('${profileId}','${preg.claseId}','${preg.id}')">Responder</button>
                </div>`}
            </div>
        `).join('');

        return `<div class="tb-questions-block"><div class="tb-zone-header">Consultas</div>${rows}</div>`;
    }

    _tbRenderProximasClases(allClases) {
        const todayStr = this.getTodayString();
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const now = new Date();
        const groups = this.data.getAllGroups();
        const upcoming = groups.map(g => {
            const targetDay = dayNames.indexOf(g.day);
            if (targetDay < 0) return null;
            const diff = (targetDay - now.getDay() + 7) % 7;
            const candidateDate = new Date(now);
            candidateDate.setDate(now.getDate() + diff);
            const candidateStr = candidateDate.toISOString().slice(0, 10);
            return { groupId: g.id, name: g.name, date: candidateStr, time: g.time, daysAway: diff, meetLink: g.meetLink, count: (g.memberIds || []).length };
        }).filter(Boolean).sort((a, b) => a.daysAway - b.daysAway).slice(0, 8);

        if (!upcoming.length) return '';

        const cards = upcoming.map(u => `
            <div class="tb-class-card">
                <div class="tb-class-when">${u.daysAway === 0 ? 'Hoy' : u.daysAway === 1 ? 'Mañana' : `En ${u.daysAway} días`}</div>
                <div class="tb-class-name">${this._escapeHtml(u.name)}</div>
                <div class="tb-class-meta">${u.time || ''} · ${u.count} alumno${u.count !== 1 ? 's' : ''}</div>
                <div class="tb-class-actions">
                    <button class="btn btn-outline btn-sm" onclick="app.copyMeetLink('${u.groupId}')">Copiar link</button>
                    <button class="btn btn-sm group-whatsapp-btn" onclick="app.sendMeetWhatsApp('${u.groupId}')">WhatsApp</button>
                </div>
            </div>
        `).join('');

        return `<div class="tb-proximas-clases">
            <div class="tb-zone-header">Próximas clases</div>
            <div class="tb-classes-grid">${cards}</div>
        </div>`;
    }

    tbToggleExpand(profileId) {
        this._teacherBoardExpandedId = this._teacherBoardExpandedId === profileId ? null : profileId;
        this.renderTeacherBoardView();
    }

    tbFocusStudent(profileId) {
        this._tbFocusProfileId = profileId;
        this._teacherBoardExpandedId = profileId;
        this.renderTeacherBoardView();
    }

    tbClearFocus() {
        this._tbFocusProfileId = null;
        this.renderTeacherBoardView();
    }

    tbGoToClase(claseId) {
        this.navigateToView('dashboard');
        this.openClase(claseId);
    }

    async tbAssignRoutine(profileId, weekId) {
        await this.data.saveProfileWeek({
            id: this.data.generateId('pw'),
            profileId, weekId,
            assignedAt: new Date().toISOString()
        });
        this.showToast('Rutina asignada', '✓');
        await this.renderTeacherBoardView();
    }

    async tbRemoveRoutine(profileWeekId, profileId) {
        await this.data.deleteProfileWeek(profileWeekId);
        this.showToast('Rutina desasignada', '✓');
        await this.renderTeacherBoardView();
    }

    tbReplyQuestion(profileId, claseId, pregId) {
        const input = document.getElementById(`tb-reply-input-${pregId}`);
        const reply = input ? input.value.trim() : '';
        if (!reply) return;
        const preguntas = this.data.getPreguntasAlumno(profileId, claseId);
        const preg = preguntas.find(p => p.id === pregId);
        if (!preg) return;
        preg.reply = reply;
        preg.resolved = true;
        this.data.savePreguntaAlumno(profileId, claseId, preg);
        this.showToast('Respuesta enviada', '✓');
        this.renderTeacherBoardView();
    }

    _tbBindToolbarEvents() {
        const si = document.getElementById('tb-search-input');
        if (si) si.addEventListener('input', e => { this._tbSearch = e.target.value; this.renderTeacherBoardView(); });
        const gf = document.getElementById('tb-group-filter');
        if (gf) gf.addEventListener('change', e => { this._tbGroupFilter = e.target.value; this.renderTeacherBoardView(); });
        const sf = document.getElementById('tb-status-filter');
        if (sf) sf.addEventListener('change', e => { this._tbStatusFilter = e.target.value; this.renderTeacherBoardView(); });
        const so = document.getElementById('tb-sort');
        if (so) so.addEventListener('change', e => { this._tbSort = e.target.value; this.renderTeacherBoardView(); });
    }

    _tbRenderConsultasTab(profiles, allClases) {
        const allPreguntas = [];
        profiles.forEach(p => {
            const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(p.id));
            const classes = allClases.filter(c => groups.some(g => g.id === c.groupId));
            classes.forEach(c => {
                const pregs = this.data.getPreguntasAlumno(p.id, c.id);
                pregs.forEach(preg => {
                    allPreguntas.push({
                        ...preg,
                        profile: p,
                        claseId: c.id,
                        claseTitle: c.title || (this.data.getGroup(c.groupId) || {}).name || 'Clase',
                        claseDate: c.date
                    });
                });
            });
        });

        // Filtrar consultas
        const filtered = allPreguntas.filter(preg => {
            const q = (this._tbConsultasSearch || '').toLowerCase().trim();
            if (q) {
                const nameMatch = (preg.profile.displayName || preg.profile.name || '').toLowerCase().includes(q);
                const textMatch = (preg.text || preg.pregunta || '').toLowerCase().includes(q);
                if (!nameMatch && !textMatch) return false;
            }
            if (this._tbConsultasFilter === 'pendientes' && preg.resolved) return false;
            if (this._tbConsultasFilter === 'respondidas' && !preg.resolved) return false;
            return true;
        });

        // Ordenar consultas por fecha descendente
        filtered.sort((a, b) => (b.claseDate || '').localeCompare(a.claseDate || ''));

        const cardsHtml = filtered.map(preg => {
            const p = preg.profile;
            const displayName = p.displayName || p.name || '?';
            return `
                <div class="tb-question-row${preg.resolved ? ' resolved' : ''}" style="margin-bottom:12px; padding:16px; background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:10px">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px">
                        <div class="tb-avatar" style="background:${p.color || 'var(--tb-accent)'}; width:30px; height:30px; font-size:12px">${displayName.charAt(0).toUpperCase()}</div>
                        <div style="flex:1; min-width:0">
                            <div style="font-weight:600; font-size:13px; color:var(--tb-text-primary)">${this._escapeHtml(displayName)}</div>
                            <div style="font-size:11px; color:var(--tb-text-secondary)">${this._escapeHtml(preg.claseTitle)} · ${preg.claseDate || 'Sin fecha'}</div>
                        </div>
                    </div>
                    <div class="tb-question-text" style="font-size:13px; color:var(--tb-text-primary); line-height:1.4">${this._escapeHtml(preg.text || preg.pregunta || '')}</div>
                    
                    ${preg.resolved ? `
                        <div class="tb-question-reply" style="margin-top:12px; font-size:12px; color:var(--tb-success); background:var(--tb-bg-elevated); padding:10px; border-radius:6px">
                            <strong>Tu respuesta:</strong> ${this._escapeHtml(preg.reply)}
                            <div style="margin-top:8px">
                                <button class="btn btn-outline btn-sm" onclick="app.tbEditReplyConsultasTab('${p.id}','${preg.claseId}','${preg.id}')" style="padding:2px 8px; font-size:10px">Editar respuesta</button>
                            </div>
                        </div>
                    ` : `
                        <div class="tb-question-reply-form" style="margin-top:12px">
                            <textarea class="form-input" id="tb-consultas-reply-input-${preg.id}" placeholder="Escribir respuesta..." rows="2" style="width:100%; margin-bottom:8px; background:var(--tb-bg-primary); border:1px solid var(--tb-border); color:var(--tb-text-primary); border-radius:6px; padding:8px; font-family:inherit; font-size:12px"></textarea>
                            <button class="btn btn-primary btn-sm" onclick="app.tbReplyConsultasTab('${p.id}','${preg.claseId}','${preg.id}')">Responder</button>
                        </div>
                    `}
                </div>
            `;
        }).join('') || `<div style="padding:24px;color:var(--tb-text-secondary)">No hay consultas que coincidan con los filtros.</div>`;

        return `<div class="teacher-board-layout horizontal-layout">
            <div class="tb-main-area">
                <div class="tb-toolbar">
                    <div class="bib-search-wrap">
                        <svg class="bib-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" class="bib-search-input" id="tb-consultas-search" placeholder="Buscar por alumno o consulta..." value="${(this._tbConsultasSearch || '').replace(/"/g, '&quot;')}">
                    </div>
                    <select class="form-control" id="tb-consultas-filter" style="max-width:180px">
                        <option value="todos" ${this._tbConsultasFilter === 'todos' ? 'selected' : ''}>Todas las consultas</option>
                        <option value="pendientes" ${this._tbConsultasFilter === 'pendientes' ? 'selected' : ''}>Pendientes</option>
                        <option value="respondidas" ${this._tbConsultasFilter === 'respondidas' ? 'selected' : ''}>Respondidas</option>
                    </select>
                </div>
                <div class="tb-list-scroll" style="padding:20px">${cardsHtml}</div>
            </div>
        </div>`;
    }

    _tbBindConsultasEvents() {
        const si = document.getElementById('tb-consultas-search');
        if (si) si.addEventListener('input', e => { this._tbConsultasSearch = e.target.value; this.renderTeacherBoardView(); });
        const fl = document.getElementById('tb-consultas-filter');
        if (fl) fl.addEventListener('change', e => { this._tbConsultasFilter = e.target.value; this.renderTeacherBoardView(); });
    }

    tbReplyConsultasTab(profileId, claseId, pregId) {
        const input = document.getElementById(`tb-consultas-reply-input-${pregId}`);
        const reply = input ? input.value.trim() : '';
        if (!reply) return;
        const preguntas = this.data.getPreguntasAlumno(profileId, claseId);
        const preg = preguntas.find(p => p.id === pregId);
        if (!preg) return;
        preg.reply = reply;
        preg.resolved = true;
        this.data.savePreguntaAlumno(profileId, claseId, preg);
        this.showToast('Respuesta enviada', '✓');
        this.renderTeacherBoardView();
    }

    tbEditReplyConsultasTab(profileId, claseId, pregId) {
        const preguntas = this.data.getPreguntasAlumno(profileId, claseId);
        const preg = preguntas.find(p => p.id === pregId);
        if (!preg) return;
        preg.resolved = false;
        preg.reply = '';
        this.data.savePreguntaAlumno(profileId, claseId, preg);
        this.renderTeacherBoardView();
    }

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

    _bibRenderMain(profiles, groups, items, isReadOnly = false) {
        const filtered = this._bibFilterItems(items, isReadOnly);
        return `<div class="bib-layout">
  <div class="bib-main-area">
    <div class="bib-toolbar">
      <div class="bib-search-wrap">
        <svg class="bib-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="bib-search-input" id="${isReadOnly ? 'my-lib-search-input' : 'bib-search-input'}" placeholder="Buscar por título..." value="${(isReadOnly ? this._myLibSearch : this._bibSearch).replace(/"/g, '&quot;')}">
      </div>
      <span class="bib-item-count">${filtered.length} ítem${filtered.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="bib-table-wrap">${this._bibRenderTable(filtered, items, isReadOnly)}</div>
    ${isReadOnly ? '' : `
    <div class="bib-bottom-zone">
      ${this._bibRenderUploadZone()}
      ${this._bibRenderTemplatesZone()}
    </div>`}
  </div>
</div>`;
    }

    _bibRenderSidebarMain(profiles, groups, items = []) {
        const tab = this._bibSidebarTab;
        const cursos = groups.filter(g => !g._personal);
        let listHtml = '';
        if (tab === 'alumnos') {
            listHtml = !profiles.length ? '<p class="bib-empty-list">No hay alumnos creados.</p>' :
                profiles.map(p => {
                    const lastP = this.data.getProfileLastPracticed(p.id) || 'Sin actividad';
                    const streak = this.data.getProfileStreak(p.id);
                    const displayName = p.displayName || p.name || '?';
                    return `<div class="bib-sidebar-item" onclick="app.bibSelectAlumno('${p.id}')">
  <div class="bib-avatar" style="background:${p.color || 'var(--tb-accent)'}">${displayName[0].toUpperCase()}</div>
  <div class="bib-item-info"><div class="bib-item-name">${this._escapeHtml(displayName)}</div><div class="bib-item-sub">${lastP}${streak ? ' · ' + streak + '🔥' : ''}</div></div>
  <svg class="bib-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
</div>`;
                }).join('');
        } else if (tab === 'cursos') {
            listHtml = !cursos.length ? '<p class="bib-empty-list">No hay cursos creados.</p>' :
                cursos.map(g => {
                    const mc = (g.memberIds || []).length;
                    const sc = this.data.getAllClases().filter(c => c.groupId === g.id).length;
                    return `<div class="bib-sidebar-item" onclick="app.bibSelectCurso('${g.id}')">
  <div class="bib-avatar bib-avatar-group">${(g.name||'?')[0].toUpperCase()}</div>
  <div class="bib-item-info"><div class="bib-item-name">${this._escapeHtml(g.name)}</div><div class="bib-item-sub">${mc} alumno${mc !== 1 ? 's' : ''} · ${sc} sesión${sc !== 1 ? 'es' : ''}</div></div>
  <svg class="bib-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
</div>`;
                }).join('');
        }
        return `<div class="bib-sidebar">
  <div class="bib-sidebar-tabs">
    <button class="bib-tab ${tab === 'alumnos' ? 'active' : ''}" onclick="app.bibSetSidebarTab('alumnos')">Alumnos <span class="bib-tab-badge">${profiles.length}</span></button>
    <button class="bib-tab ${tab === 'cursos' ? 'active' : ''}" onclick="app.bibSetSidebarTab('cursos')">Cursos <span class="bib-tab-badge">${cursos.length}</span></button>
  </div>
  <div class="bib-sidebar-list">${listHtml}</div>
  <button class="bib-sidebar-add-btn" onclick="app.bibSidebarAdd()">+ ${tab === 'alumnos' ? 'Nuevo alumno' : 'Nuevo curso'}</button>
</div>`;
    }

    _bibRenderSidebarCargas(profiles, items) {
        const studentIds = [...new Set(items.filter(it => it.isStudentUpload).map(it => it.uploadedBy).filter(Boolean))];
        const studentProfiles = profiles.filter(p => studentIds.includes(p.id));
        
        const allActive = !this._bibSelectedStudentCargaId ? ' active' : '';
        const allItemHtml = `<div class="bib-sidebar-item${allActive}" onclick="app.bibSelectStudentCarga(null)">
            <div class="bib-avatar" style="background:var(--tb-border)">👥</div>
            <div class="bib-item-info"><div class="bib-item-name">Todos los Alumnos</div><div class="bib-item-sub">Ver todas las cargas</div></div>
        </div>`;

        const listHtml = allItemHtml + (!studentProfiles.length ? '<p class="bib-empty-list" style="padding:10px 14px">No hay cargas pendientes.</p>' :
            studentProfiles.map(p => {
                const count = items.filter(it => it.isStudentUpload && it.uploadedBy === p.id).length;
                const active = this._bibSelectedStudentCargaId === p.id ? ' active' : '';
                const displayName = p.displayName || p.name || '?';
                return `<div class="bib-sidebar-item${active}" onclick="app.bibSelectStudentCarga('${p.id}')">
  <div class="bib-avatar" style="background:${p.color || 'var(--tb-accent)'}">${displayName[0].toUpperCase()}</div>
  <div class="bib-item-info"><div class="bib-item-name">${this._escapeHtml(displayName)}</div><div class="bib-item-sub">${count} carga${count !== 1 ? 's' : ''} pendiente${count !== 1 ? 's' : ''}</div></div>
  <svg class="bib-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
</div>`;
            }).join(''));

        return `<div class="bib-sidebar">
  <div class="bib-zone-header" style="padding: 14px 14px 6px 14px; margin-bottom: 0">Alumnos con Cargas</div>
  <div class="bib-sidebar-list">${listHtml}</div>
</div>`;
    }

    _bibRenderCargasAlumnosMain(profiles, items) {
        let uploads = items.filter(it => it.isStudentUpload);
        if (this._bibSelectedStudentCargaId) {
            uploads = uploads.filter(it => it.uploadedBy === this._bibSelectedStudentCargaId);
        }

        if (!uploads.length) {
            return `<div class="bib-layout">
  ${this._bibRenderSidebarCargas(profiles, items)}
  <div class="bib-main-area" style="padding:24px; display:flex; flex-direction:column; justify-content:center; align-items:center; color:var(--tb-text-secondary); text-align:center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.3;margin-bottom:12px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <p style="font-size:14px">No hay contenido subido por los alumnos aún.</p>
  </div>
</div>`;
        }

        const studentIds = [...new Set(uploads.map(it => it.uploadedBy).filter(Boolean))];
        const studentBlocks = studentIds.map(studentId => {
            const studentProfile = profiles.find(p => p.id === studentId) || { name: 'Alumno Desconocido', color: 'var(--tb-accent)' };
            const studentItems = uploads.filter(it => it.uploadedBy === studentId);
            
            const types = ['score', 'gp', 'gpx', 'pdf', 'youtube', 'spotify'];
            const typeLabels = { score: 'Guitar Pro', gp: 'Guitar Pro', gpx: 'GPX', pdf: 'Documentos PDF', youtube: 'Videos de YouTube', spotify: 'Canciones de Spotify' };
            const typeIcons = { score: '🎸', gp: '🎸', gpx: '🎸', pdf: '📄', youtube: '▶️', spotify: '🎵' };
            const typeColors = { score: '#a29bfe', gp: '#a29bfe', gpx: '#a29bfe', pdf: '#55efc4', youtube: '#fdcb6e', spotify: '#74b9ff' };
            
            const typeBlocks = types.map(type => {
                const typeItems = studentItems.filter(it => it.type === type);
                if (!typeItems.length) return '';
                
                const rows = typeItems.map(it => {
                    const timeStr = new Date(it.createdAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                    return `
                        <div style="background:var(--tb-bg-primary); border:1px solid var(--tb-border); border-radius:8px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:16px">
                            <div style="flex:1; min-width:0">
                                <div style="font-size:13px; font-weight:600; color:var(--tb-text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap">${this._escapeHtml(it.title)}</div>
                                ${it.observation ? `<div style="font-size:12px; color:var(--tb-text-secondary); margin-top:4px; font-style:italic">"${this._escapeHtml(it.observation)}"</div>` : ''}
                                <div style="font-size:10px; color:var(--tb-text-muted); margin-top:4px">Cargado: ${timeStr}</div>
                            </div>
                            <div style="display:flex; gap:8px; flex-shrink:0">
                                <button class="btn btn-outline btn-sm" onclick="app.openLibraryItemById('${it.id}')" style="padding:4px 8px; font-size:11px">Abrir ↗</button>
                                <button class="btn btn-primary btn-sm" onclick="app.promoteStudentUploadToGeneral('${it.id}')" style="padding:4px 8px; font-size:11px">Subir a Biblioteca General</button>
                                <button class="btn btn-outline btn-sm" onclick="app.deleteStudentUploadByTeacher('${it.id}')" style="color:var(--tb-accent); border-color:var(--tb-accent); padding:4px 8px; font-size:11px">Eliminar</button>
                            </div>
                        </div>
                    `;
                }).join('');
                
                return `
                    <div style="margin-top:12px">
                        <div style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--tb-text-muted); margin-bottom:6px; display:flex; align-items:center; gap:6px">
                            <span class="bib-type-icon" style="background:${typeColors[type]}1f; width:20px; height:20px; font-size:10px">${typeIcons[type]}</span>
                            <span>${typeLabels[type]}</span>
                        </div>
                        <div>${rows}</div>
                    </div>
                `;
            }).join('');
            
            return `
                <div style="background:var(--tb-bg-secondary); border:1px solid var(--tb-border); border-radius:12px; padding:16px; margin-bottom:16px">
                    <div style="display:flex; align-items:center; gap:10px; border-bottom:1px solid var(--tb-border); padding-bottom:10px">
                        <div class="bib-avatar" style="background:${studentProfile.color || 'var(--tb-accent)'}">${((studentProfile.displayName || studentProfile.name || '?')[0]).toUpperCase()}</div>
                        <div style="font-size:15px; font-weight:600; color:var(--tb-text-primary)">${this._escapeHtml(studentProfile.displayName || studentProfile.name)}</div>
                    </div>
                    <div>${typeBlocks}</div>
                </div>
            `;
        }).join('');

        return `<div class="bib-layout">
    ${this._bibRenderSidebarCargas(profiles, items)}
    <div class="bib-main-area" style="overflow-y:auto; padding:24px 32px">
        <div class="bib-zone-header" style="font-size:18px; margin-bottom:16px">Contenido subido por los Alumnos</div>
        <div>${studentBlocks}</div>
    </div>
  </div>`;
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

    _bibRenderTable(filtered, allItems, isReadOnly = false) {
        const cols = ['type', 'category', 'level', 'style'];
        const colLabels = { type: 'Tipo', category: 'Categoría', level: 'Nivel', style: 'Estilo' };
        const colValues = {
            type:     [...new Set(allItems.map(it => it.type).filter(Boolean))],
            category: [...new Set(allItems.map(it => it.category || it.exerciseType).filter(Boolean))],
            level:    [...new Set(allItems.map(it => it.level).filter(Boolean))],
            style:    [...new Set(allItems.map(it => it.style || it.musicalStyle).filter(Boolean))]
        };
        const activeFilters = isReadOnly ? this._myLibColFilters : this._bibColFilters;
        
        // Ordenar en base a la columna seleccionada
        if (this._bibSortCol) {
            const col = this._bibSortCol;
            const asc = this._bibSortAsc;
            filtered.sort((a, b) => {
                let va = a[col] || '';
                let vb = b[col] || '';
                if (col === 'category') {
                    va = a.category || a.exerciseType || '';
                    vb = b.category || b.exerciseType || '';
                } else if (col === 'style') {
                    va = a.style || a.musicalStyle || '';
                    vb = b.style || b.musicalStyle || '';
                }
                va = String(va).toLowerCase();
                vb = String(vb).toLowerCase();
                if (va < vb) return asc ? -1 : 1;
                if (va > vb) return asc ? 1 : -1;
                return 0;
            });
        }

        const titleSorted = this._bibSortCol === 'title';
        const titleSortIndicator = titleSorted ? (this._bibSortAsc ? ' ▲' : ' ▼') : '';
        const titleClickAction = `app.bibChangeSort('title')`;
        const titleHeader = `<th class="bib-th" style="cursor:pointer; user-select:none" onclick="${titleClickAction}">Título${titleSortIndicator}</th>`;

        const headers = cols.map(col => {
            const hasFilter = activeFilters[col].length > 0;
            const opts = colValues[col].map(v => {
                const chk = activeFilters[col].includes(v) ? 'checked' : '';
                const changeAction = isReadOnly 
                    ? `app.myLibToggleColFilter('${col}','${v}')` 
                    : `app.bibToggleColFilter('${col}','${v}')`;
                return `<label class="bib-filter-opt"><input type="checkbox" ${chk} onchange="${changeAction}"> ${this._bibValueLabel(col, v)}</label>`;
            }).join('');

            const isSorted = this._bibSortCol === col;
            const sortIndicator = isSorted ? (this._bibSortAsc ? ' ▲' : ' ▼') : '';
            const clickHeaderAction = `app.bibChangeSort('${col}')`;

            let configIcon = '';
            if (!isReadOnly) {
                if (col === 'category') {
                    let target = 'global';
                    configIcon = `<span class="bib-cat-config-icon" onclick="event.stopPropagation(); app.bibOpenCatEditor('${target}')" title="Configurar categorías">⚙️</span>`;
                } else if (col === 'level') {
                    configIcon = `<span class="bib-cat-config-icon" onclick="event.stopPropagation(); app.bibOpenCatEditor('level')" title="Configurar niveles">⚙️</span>`;
                } else if (col === 'style') {
                    configIcon = `<span class="bib-cat-config-icon" onclick="event.stopPropagation(); app.bibOpenCatEditor('style')" title="Configurar estilos">⚙️</span>`;
                } else if (col === 'type') {
                    configIcon = `<span class="bib-cat-config-icon" onclick="event.stopPropagation(); app.bibOpenCatEditor('type')" title="Ver tipos de contenido">⚙️</span>`;
                }
            }

            return `<th class="bib-th${hasFilter ? ' has-filter' : ''}">
                <div class="bib-th-inner">
                    <span onclick="${clickHeaderAction}" style="cursor:pointer; user-select:none; flex:1; display:inline-flex; align-items:center">${colLabels[col]}${sortIndicator}${configIcon}</span>
                    <div class="bib-dropdown-wrap">
                        <span class="bib-filter-arrow">▾</span>
                    </div>
                    <div class="bib-col-dropdown">${opts || '<span class="bib-empty-opts">Sin datos</span>'}</div>
                    ${hasFilter ? '<span class="bib-filter-dot"></span>' : ''}
                </div>
            </th>`;
        });

        const rows = filtered.map(it => {
            const cat = it.category || it.exerciseType || '';
            const style = it.style || it.musicalStyle || '';
            const color = this._bibCatColor(cat);
            const sel = (!isReadOnly && this._bibDetailItemId === it.id) ? ' selected' : '';
            const clickAction = isReadOnly 
                ? `app.openLibraryItemById('${it.id}')` 
                : `app.bibSelectItem('${it.id}')`;
            const titleHtml = isReadOnly 
                ? this._escapeHtml(it.title || 'Sin título')
                : `<span class="bib-title-link" onclick="event.stopPropagation(); app.openLibraryItemById('${it.id}')">${this._escapeHtml(it.title || 'Sin título')}</span>`;
            return `<tr class="bib-row${sel}" onclick="${clickAction}">
  <td class="bib-td bib-td-title"><span class="bib-type-icon" style="background:${color}1f">${this._bibTypeIcon(it.type)}</span>${titleHtml}</td>
  <td class="bib-td">${this._bibTypeLabel(it.type)}</td>
  <td class="bib-td">${cat ? `<span class="bib-cat-dot" style="background:${color}"></span>${this._escapeHtml(cat)}` : '—'}</td>
  <td class="bib-td">${this._bibLevelLabel(it.level)}</td>
  <td class="bib-td">${this._bibStyleLabel(style)}</td>
</tr>`;
        }).join('');

        const emptyMsg = isReadOnly 
            ? 'No hay contenido asignado todavía con los filtros seleccionados.' 
            : 'La biblioteca está vacía. Subí archivos o añadí URLs abajo.';

        return `<table class="bib-table">
  <thead><tr>${titleHeader}${headers.join('')}</tr></thead>
  <tbody>${filtered.length ? rows : `<tr><td colspan="5" class="bib-empty-row">${emptyMsg}</td></tr>`}</tbody>
</table>`;
    }

    _bibRenderUploadZone(isStudent = false) {
        const prefix = isStudent ? 'my-bib-' : 'bib-';
        return `<div class="bib-upload-zone">
  <div class="bib-zone-header">Subir contenido</div>
  <div class="bib-droparea" id="${prefix}droparea">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="bib-drop-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    <div><p class="bib-drop-text">Arrastrá archivos aquí<br><span class="bib-drop-hint">.gp · .pdf · .gpx</span></p>
      <button class="btn btn-outline btn-sm" style="margin-top:6px" onclick="document.getElementById('${prefix}file-input').click()">Examinar</button>
    </div>
    <input type="file" id="${prefix}file-input" accept=".gp,.pdf,.gpx,.gp4,.gp5" style="display:none" multiple>
  </div>
  <div class="bib-link-row">
    <input type="text" class="form-input bib-link-input" id="${prefix}link-input" placeholder="YouTube · Spotify (URL)">
    <button class="btn btn-outline btn-sm" onclick="app.bibDetectLink(${isStudent})">Detectar</button>
  </div>
</div>`;
    }

    _bibRenderTemplatesZone() {
        const templates = this.data.getTemplates();
        const cards = templates.map(t => {
            const items = t.items || [];
            // Agrupar por categoría para mostrar conteo
            const byCat = {};
            items.forEach(it => {
                const cat = it.cat || 'Sin categoría';
                byCat[cat] = (byCat[cat] || 0) + 1;
            });
            const catRows = Object.entries(byCat).map(([cat, count]) => {
                const color = this._bibCatColor(cat);
                return `<div class="nb-tpl-cat-row"><span style="color:${color}">${this._escapeHtml(cat)}</span><span>${count} ítem${count !== 1 ? 's' : ''}</span></div>`;
            }).join('');
            const emptyMsg = items.length === 0 ? `<div class="nb-tpl-cat-row"><em style="color:var(--tb-text-muted);font-size:10px">Sin ítems — editá para agregar</em></div>` : '';
            return `<div class="nb-tpl-card" onclick="app.bibEditTemplate('${t.id}')">
  <div class="nb-tpl-dot" style="background:var(--tb-accent)"></div>
  <div class="nb-tpl-name">${this._escapeHtml(t.name)}</div>
  <div class="nb-tpl-meta">${items.length} ítem${items.length !== 1 ? 's' : ''} en total</div>
  <div class="nb-tpl-cats">${catRows}${emptyMsg}</div>
  <button onclick="event.stopPropagation();app.bibDeleteTemplate('${t.id}')" class="nb-tpl-del" title="Eliminar plantilla">×</button>
</div>`;
        }).join('');
        const newCard = `<div class="nb-tpl-card nb-tpl-card-new" onclick="app.bibNewTemplate()">
  <div class="nb-tpl-dot" style="background:var(--tb-border)"></div>
  <div class="nb-tpl-name" style="color:var(--tb-text-muted)">+ Nueva plantilla</div>
  <div class="nb-tpl-meta" style="color:var(--tb-text-muted)">Crea un set reutilizable</div>
</div>`;
        return `<div class="bib-templates-zone">
  <div class="bib-zone-header">Plantillas</div>
  <p class="bib-tpl-desc">Pre-armá conjuntos de ejercicios para reutilizar al crear clases y sesiones</p>
  <div class="bib-tpl-cards">${cards}${newCard}</div>
</div>`;
    }






    _bibBindMainEvents() {
        const si = document.getElementById('bib-search-input');
        if (si) si.addEventListener('input', e => { this._bibSearch = e.target.value; this.renderBibliotecaView(); });
        const da = document.getElementById('bib-droparea');
        if (da) {
            da.addEventListener('dragover', e => { e.preventDefault(); da.classList.add('bib-drag-over'); });
            da.addEventListener('dragleave', () => da.classList.remove('bib-drag-over'));
            da.addEventListener('drop', e => { e.preventDefault(); da.classList.remove('bib-drag-over'); Array.from(e.dataTransfer.files).forEach(f => this.bibHandleFileDrop(f)); });
        }
        const fi = document.getElementById('bib-file-input');
        if (fi) fi.addEventListener('change', e => { Array.from(e.target.files).forEach(f => this.bibHandleFileDrop(f)); fi.value = ''; });
    }


    // "Cargas de Alumnos" ahora vive en el Tablero (view-teacher-board), no en Biblioteca.
    // Este helper refresca la vista activa entre ambas, ya que comparten los mismos métodos de render.
    _refreshCargasHostView() {
        const teacherBoardActive = document.getElementById('view-teacher-board')?.classList.contains('active');
        if (teacherBoardActive) return this.renderTeacherBoardView();
        return this.renderBibliotecaView();
    }

    bibSelectStudentCarga(studentId) {
        this._bibSelectedStudentCargaId = studentId;
        this._refreshCargasHostView();
    }



    bibSelectItem(itemId) { this._bibDetailItemId = itemId; this.renderBibliotecaView(); }

    bibChangeSort(col) {
        if (this._bibSortCol === col) {
            this._bibSortAsc = !this._bibSortAsc;
        } else {
            this._bibSortCol = col;
            this._bibSortAsc = true;
        }
        
        const isStudent = document.getElementById('view-my-library')?.classList.contains('active');
        if (isStudent) {
            this.renderMyLibraryView();
        } else {
            this.renderBibliotecaView();
        }
    }







    bibToggleColFilter(col, val) {
        const arr = this._bibColFilters[col];
        const idx = arr.indexOf(val);
        if (idx === -1) arr.push(val); else arr.splice(idx, 1);
        this.renderBibliotecaView();
    }

    myLibToggleColFilter(col, val) {
        const arr = this._myLibColFilters[col];
        const idx = arr.indexOf(val);
        if (idx === -1) arr.push(val); else arr.splice(idx, 1);
        this.renderMyLibraryView();
    }

    _myLibBindEvents() {
        const si = document.getElementById('my-lib-search-input');
        if (si) {
            // Reemplazar event listener clonando el nodo para evitar múltiples listeners acumulados
            const newSi = si.cloneNode(true);
            si.parentNode.replaceChild(newSi, si);
            newSi.focus();
            // Poner el cursor al final del texto
            const val = newSi.value;
            newSi.value = '';
            newSi.value = val;
            newSi.addEventListener('input', e => {
                this._myLibSearch = e.target.value;
                this.renderMyLibraryView();
            });
        }
        const da = document.getElementById('my-bib-droparea');
        if (da) {
            da.addEventListener('dragover', e => { e.preventDefault(); da.classList.add('bib-drag-over'); });
            da.addEventListener('dragleave', () => da.classList.remove('bib-drag-over'));
            da.addEventListener('drop', e => { e.preventDefault(); da.classList.remove('bib-drag-over'); Array.from(e.dataTransfer.files).forEach(f => this.bibHandleFileDrop(f, true)); });
        }
        const fi = document.getElementById('my-bib-file-input');
        if (fi) fi.addEventListener('change', e => { Array.from(e.target.files).forEach(f => this.bibHandleFileDrop(f, true)); fi.value = ''; });
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
    _bibFillCatModalCategories(selected) {
        const cont = document.getElementById('bib-cat-category');
        if (!cont) return;
        const cats = this.data.getDefaultCategories();
        cont.innerHTML = cats.map(c =>
            `<button class="bib-toggle${selected === c ? ' active' : ''}" data-val="${this._escapeHtml(c)}" onclick="app.bibCatToggle('category', this.dataset.val)">${this._escapeHtml(c)}</button>`
        ).join('');
    }

    bibHandleFileDrop(file, isStudent = false) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const type = ext === 'pdf' ? 'pdf' : (ext === 'gpx' ? 'gpx' : 'gp');
        this._bibCatModalData = { file, type };
        this._bibCatModalValues = { category: null };
        const titleEl = document.getElementById('bib-cat-title');
        const infoEl  = document.getElementById('bib-cat-file-info');
        if (titleEl) titleEl.value = file.name.replace(/\.[^.]+$/, '');
        if (infoEl)  infoEl.textContent = `${file.name}  ·  ${type.toUpperCase()}`;
        
        const activeIsStudent = isStudent || document.getElementById('view-my-library')?.classList.contains('active');
        this._toggleCategorizeModalFields(activeIsStudent);
        
        document.getElementById('bib-categorize-modal').style.display = 'flex';
    }

    bibDetectLink(isStudent = false) {
        const prefix = isStudent ? 'my-bib-' : 'bib-';
        const url = (document.getElementById(`${prefix}link-input`)?.value || '').trim();
        if (!url) return;
        const isYT = url.includes('youtube') || url.includes('youtu.be');
        const isSP = url.includes('spotify');
        if (!isYT && !isSP) { alert('URL no reconocida. Usá un link de YouTube o Spotify.'); return; }
        const type = isYT ? 'youtube' : 'spotify';
        this._bibCatModalData = { url, type };
        this._bibCatModalValues = { category: null };
        const titleEl = document.getElementById('bib-cat-title');
        const infoEl  = document.getElementById('bib-cat-file-info');
        if (titleEl) titleEl.value = isYT ? 'Video de YouTube' : 'Canción de Spotify';
        if (infoEl)  infoEl.textContent = `${isYT ? 'YouTube' : 'Spotify'}  ·  ${url.slice(0, 60)}`;
        
        const activeIsStudent = isStudent || document.getElementById('view-my-library')?.classList.contains('active');
        this._toggleCategorizeModalFields(activeIsStudent);
        
        document.getElementById('bib-categorize-modal').style.display = 'flex';
    }

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

    bibCatToggle(field, val) {
        this._bibCatModalValues[field] = val;
        document.querySelectorAll(`#bib-cat-${field} .bib-toggle`).forEach(b => b.classList.toggle('active', b.dataset.val === val));
    }

    bibCloseCatModal() {
        document.getElementById('bib-categorize-modal').style.display = 'none';
        this._bibCatModalData = null;
    }

    async bibSaveLibItem() {
        const title    = document.getElementById('bib-cat-title')?.value?.trim();
        const category = this._bibCatModalValues.category;
        const level    = document.querySelector('input[name="bib-level"]:checked')?.value;
        const style    = document.querySelector('input[name="bib-style"]:checked')?.value;
        const observation = document.getElementById('bib-cat-observation')?.value?.trim() || '';

        if (!title)    { alert('El título es obligatorio.'); return; }
        
        const isStudent = document.getElementById('view-my-library')?.classList.contains('active');
        const d = this._bibCatModalData;

        // Si es docente y no estamos promoviendo, requerir categorización
        if (!isStudent && (!d || !d.promotingItemId)) {
            if (!category) { alert('Seleccioná una categoría.'); return; }
            if (!level)    { alert('Seleccioná un nivel.'); return; }
            if (!style)    { alert('Seleccioná un estilo.'); return; }
        }

        if (d && d.promotingItemId) {
            // Promoción por parte del docente
            if (!category) { alert('Seleccioná una categoría.'); return; }
            if (!level)    { alert('Seleccioná un nivel.'); return; }
            if (!style)    { alert('Seleccioná un estilo.'); return; }

            const item = await this.data.getLibraryItem(d.promotingItemId);
            if (item) {
                item.title = title;
                item.category = category;
                item.level = level;
                item.style = style;
                // Remover campos específicos del alumno
                delete item.isStudentUpload;
                delete item.uploadedBy;
                delete item.claseId;
                delete item.observation;

                await this.data.saveLibraryItem(item);
                this.showToast('Contenido promovido a Biblioteca General', '✓');
            }
        } else if (isStudent && this.activeProfile) {
            // Carga inicial por parte del alumno
            const isGP = d.type === 'gp' || d.type === 'gpx';
            const item = { 
                id: this.data.generateId('lib'), 
                title, 
                type: isGP ? 'score' : d.type, 
                category: 'Consultas', 
                level: '', 
                style: '', 
                observation,
                createdAt: new Date().toISOString(),
                uploadedBy: this.activeProfile.id,
                isStudentUpload: true
            };
            if (d.url)  item.url = d.url;
            if (d.file) {
                const buf = await d.file.arrayBuffer();
                item.fileData = buf;
                item.bytes = buf;
            }

            const groups = this.data.getAllGroups().filter(g => (g.memberIds || []).includes(this.activeProfile.id));
            const allClases = this.data.getAllClases();
            const myClases = allClases
                .filter(c => groups.some(g => g.id === c.groupId) && c.status === 'finalizada')
                .sort((a, b) => {
                    const ta = b.finalizadaAt || b.date || 0;
                    const tb = a.finalizadaAt || a.date || 0;
                    return ta > tb ? 1 : ta < tb ? -1 : 0;
                }).reverse();
            
            const nextClase = myClases[0];
            if (nextClase) {
                item.claseId = nextClase.id;
            }

            await this.data.saveLibraryItem(item);

            const notif = {
                id: this.data.generateId('notif'),
                studentId: this.activeProfile.id,
                studentName: this.activeProfile.name,
                itemId: item.id,
                itemTitle: item.title,
                claseId: nextClase ? nextClase.id : null,
                timestamp: Date.now(),
                read: false
            };
            this.data.addNotification(notif);

            this.showToast('Contenido cargado para tu próxima clase y notificado al docente', '✓');
        } else {
            // Carga normal del docente
            const isGP = d.type === 'gp' || d.type === 'gpx';
            const item = { id: this.data.generateId('lib'), title, type: isGP ? 'score' : d.type, category, level, style, createdAt: new Date().toISOString() };
            if (d.url)  item.url = d.url;
            if (d.file) {
                const buf = await d.file.arrayBuffer();
                item.fileData = buf;
                item.bytes = buf;
            }
            await this.data.saveLibraryItem(item);
        }

        document.getElementById('bib-categorize-modal').style.display = 'none';
        this._bibCatModalData = null;

        const linkInput = document.getElementById('bib-link-input');
        if (linkInput) linkInput.value = '';
        const myLinkInput = document.getElementById('my-bib-link-input');
        if (myLinkInput) myLinkInput.value = '';

        if (isStudent) {
            await this.renderMyLibraryView();
        } else {
            await this._refreshCargasHostView();
        }
    }



    // ── Plantillas (editor funcional) ──
    bibNewTemplate() {
        this._bibTplDraft = { id: this.data.generateId('tpl'), name: '', items: [], createdAt: new Date().toISOString(), _new: true };
        this._bibOpenTplEditor();
    }

    bibEditTemplate(tplId) {
        const tpl = this.data.getTemplates().find(t => t.id === tplId);
        if (!tpl) return;
        this._bibTplDraft = JSON.parse(JSON.stringify(tpl));
        this._bibTplDraft.items = this._bibTplDraft.items || [];
        this._bibOpenTplEditor();
    }

    async _bibOpenTplEditor() {
        const nameEl = document.getElementById('bib-tpl-name');
        if (nameEl) nameEl.value = this._bibTplDraft.name || '';
        // poblar selector de ítems
        const items = await this.data.getLibraryItems();
        const sel = document.getElementById('bib-tpl-item-select');
        if (sel) sel.innerHTML = '<option value="">— Elegir ítem —</option>' + items.map(it => `<option value="${it.id}">${this._escapeHtml(it.title || 'Sin título')}</option>`).join('');
        const catSel = document.getElementById('bib-tpl-cat-select');
        if (catSel) catSel.innerHTML = this.data.getDefaultCategories().map(c => `<option value="${this._escapeHtml(c)}">${this._escapeHtml(c)}</option>`).join('');
        this._bibRenderTplItems();
        const delBtn = document.getElementById('bib-tpl-delete-btn');
        if (delBtn) delBtn.style.display = this._bibTplDraft._new ? 'none' : 'inline-flex';
        document.getElementById('bib-tpl-editor-modal').style.display = 'flex';
    }

    async _bibRenderTplItems() {
        const cont = document.getElementById('bib-tpl-items-list');
        if (!cont) return;
        const items = await this.data.getLibraryItems();
        const list = this._bibTplDraft.items || [];
        cont.innerHTML = list.length ? list.map((ti, idx) => {
            const it = items.find(x => x.id === ti.libraryItemId);
            const title = it ? (it.title || 'Sin título') : '(ítem borrado)';
            const color = this._bibCatColor(ti.cat);
            return `<div class="bib-tpl-item-row"><span class="bib-cat-dot" style="background:${color}"></span><span class="bib-tpl-item-title">${this._escapeHtml(title)}</span><span class="bib-tpl-item-cat">${this._escapeHtml(ti.cat || '')}</span><button class="bib-build-remove" onclick="app.bibTplRemoveItem(${idx})">×</button></div>`;
        }).join('') : '<p class="bib-empty-list" style="padding:8px">Sin ítems. Agregá desde abajo.</p>';
    }

    bibTplAddItem() {
        const libItemId = document.getElementById('bib-tpl-item-select')?.value;
        const cat = document.getElementById('bib-tpl-cat-select')?.value;
        if (!libItemId) { this.showToast('Elegí un ítem', '⚠️'); return; }
        this._bibTplDraft.items = this._bibTplDraft.items || [];
        if (this._bibTplDraft.items.some(ti => ti.libraryItemId === libItemId && ti.cat === cat)) return;
        this._bibTplDraft.items.push({ libraryItemId: libItemId, cat });
        this._bibRenderTplItems();
    }

    bibTplRemoveItem(idx) {
        this._bibTplDraft.items.splice(idx, 1);
        this._bibRenderTplItems();
    }

    bibSaveTemplate() {
        const name = document.getElementById('bib-tpl-name')?.value?.trim();
        if (!name) { alert('Poné un nombre a la plantilla.'); return; }
        this._bibTplDraft.name = name;
        delete this._bibTplDraft._new;
        this.data.saveTemplate(this._bibTplDraft);
        document.getElementById('bib-tpl-editor-modal').style.display = 'none';
        this._bibTplDraft = null;
        this.renderBibliotecaView();
    }

    bibDeleteTemplate() {
        if (!this._bibTplDraft || this._bibTplDraft._new) return;
        if (!confirm('¿Eliminar esta plantilla?')) return;
        this.data.deleteTemplate(this._bibTplDraft.id);
        document.getElementById('bib-tpl-editor-modal').style.display = 'none';
        this._bibTplDraft = null;
        this.renderBibliotecaView();
    }

    bibCloseTplEditor() {
        document.getElementById('bib-tpl-editor-modal').style.display = 'none';
        this._bibTplDraft = null;
    }

    // ── Editor de categorías (global / por alumno / por curso) ──
    async bibOpenCatEditor(target) {
        this._bibCatEditorTarget = target;
        let list = [], label = '';
        if (target === 'global') {
            list = this.data.getDefaultCategories();
            label = 'Categorías por defecto (todos los alumnos y cursos nuevos)';
        } else if (target === 'level') {
            list = this.data.getDefaultLevels();
            label = 'Editar niveles de dificultad';
        } else if (target === 'style') {
            list = this.data.getDefaultStyles();
            label = 'Editar estilos musicales';
        } else if (target === 'type') {
            list = ['Guitar Pro', 'PDF', 'YouTube', 'Spotify'];
            label = 'Tipos de contenido (Solo Lectura)';
        } else if (target.startsWith('profile:')) {
            const id = target.slice(8);
            const profiles = await this.data.getProfiles();
            const p = profiles.find(x => x.id === id);
            list = (p && p.categories) ? p.categories : this.data.getDefaultCategories();
            label = `Categorías de ${p ? (p.displayName || p.name) : 'alumno'}`;
        } else if (target.startsWith('clase:')) {
            const id = target.slice(6);
            const clase = this.data.getClase(id);
            list = (clase && clase.categories) ? clase.categories : this.data.getDefaultCategories();
            label = `Categorías de esta clase`;
        } else {
            const id = target.slice(6);
            const groups = this.data.getAllGroups();
            const g = groups.find(x => x.id === id);
            list = (g && g.categories) ? g.categories : this.data.getDefaultCategories();
            label = `Categorías de ${g ? g.name : 'curso'}`;
        }
        this._bibCatEditorList = list.slice();
        const lblEl = document.getElementById('bib-cat-editor-label');
        if (lblEl) lblEl.textContent = label;
        this._bibRenderCatEditor();
        document.getElementById('bib-cat-editor-modal').style.display = 'flex';
    }

    _bibRenderCatEditor() {
        const cont = document.getElementById('bib-cat-editor-list');
        if (!cont) return;
        const isType = this._bibCatEditorTarget === 'type';
        cont.innerHTML = this._bibCatEditorList.map((c, idx) =>
            `<div class="bib-cat-edit-chip" style="border-color:${this._bibCatColor(c)}"><span class="bib-cat-dot" style="background:${this._bibCatColor(c)}"></span><span>${this._escapeHtml(c)}</span>${isType ? '' : `<button onclick="app.bibCatEditorRemove(${idx})">×</button>`}</div>`
        ).join('') || '<p class="bib-empty-list" style="padding:6px">Sin elementos.</p>';
        
        const addRow = document.querySelector('#bib-cat-editor-modal .modal-form-row');
        if (addRow) {
            addRow.style.display = isType ? 'none' : 'flex';
        }
    }

    bibCatEditorAdd() {
        const input = document.getElementById('bib-cat-editor-input');
        const val = (input?.value || '').trim();
        if (!val) return;
        if (this._bibCatEditorList.includes(val)) { input.value = ''; return; }
        this._bibCatEditorList.push(val);
        input.value = '';
        this._bibRenderCatEditor();
    }

    bibCatEditorRemove(idx) {
        this._bibCatEditorList.splice(idx, 1);
        this._bibRenderCatEditor();
    }

    async bibCatEditorSave() {
        const target = this._bibCatEditorTarget;
        const list = this._bibCatEditorList.slice();
        if (!list.length && target !== 'type') { alert('Dejá al menos una categoría.'); return; }
        if (target === 'global') {
            this.data.setDefaultCategories(list);
        } else if (target === 'level') {
            this.data.setDefaultLevels(list);
        } else if (target === 'style') {
            this.data.setDefaultStyles(list);
        } else if (target === 'type') {
            // Do nothing for system types
        } else if (target.startsWith('profile:')) {
            const id = target.slice(8);
            const profiles = await this.data.getProfiles();
            const p = profiles.find(x => x.id === id);
            if (p) { p.categories = list; await this.data.saveProfile(p); }
        } else if (target.startsWith('clase:')) {
            const id = target.slice(6);
            const clase = this.data.getClase(id);
            if (clase) {
                clase.categories = list;
                this.data.saveClase(clase);
            }
        } else if (target.startsWith('group:')) {
            const id = target.slice(6);
            const groups = this.data.getAllGroups();
            const g = groups.find(x => x.id === id);
            if (g) { g.categories = list; this.data.saveGroups(groups); }
        }
        document.getElementById('bib-cat-editor-modal').style.display = 'none';
        
        if (target.startsWith('clase:')) {
            const id = target.slice(6);
            this._renderClaseDetail(id);
        }
        await this.renderBibliotecaView();
    }

    bibCloseCatEditor() { document.getElementById('bib-cat-editor-modal').style.display = 'none'; }

    // ── Crear Alumno / Curso (self-contained, funcionan desde Biblioteca) ──
    bibSidebarAdd() {
        if (this._bibSidebarTab === 'alumnos') this.bibOpenAlumnoModal();
        else this.bibOpenCursoModal();
    }

    bibOpenAlumnoModal() {
        const nameEl = document.getElementById('bib-alumno-name');
        const colorEl = document.getElementById('bib-alumno-color');
        if (nameEl) nameEl.value = '';
        if (colorEl) colorEl.value = '#6366f1';
        document.getElementById('bib-alumno-modal').style.display = 'flex';
        if (nameEl) setTimeout(() => nameEl.focus(), 50);
    }

    bibCloseAlumnoModal() { document.getElementById('bib-alumno-modal').style.display = 'none'; }

    async bibSaveAlumno() {
        const name = document.getElementById('bib-alumno-name')?.value?.trim();
        const color = document.getElementById('bib-alumno-color')?.value || '#6366f1';
        if (!name) { alert('Poné un nombre.'); return; }
        await this.data.saveProfile({ id: this.data.generateId('profile'), name, color, createdAt: new Date().toISOString() });
        document.getElementById('bib-alumno-modal').style.display = 'none';
        this._bibSidebarTab = 'alumnos';
        await this.renderBibliotecaView();
    }

    async bibOpenCursoModal() {
        const profiles = await this.data.getProfiles();
        const cont = document.getElementById('bib-curso-members');
        if (cont) cont.innerHTML = profiles.length
            ? profiles.map(p => {
                const displayName = p.displayName || p.name || '?';
                return `<label class="bib-member-check"><input type="checkbox" value="${p.id}"><span class="bib-avatar bib-avatar-xs" style="background:${p.color||'#6366f1'}">${displayName[0].toUpperCase()}</span> ${this._escapeHtml(displayName)}</label>`;
            }).join('')
            : '<p class="bib-empty-list">No hay alumnos. Creá alumnos primero.</p>';
        ['bib-curso-name','bib-curso-time','bib-curso-meet'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const daySel = document.getElementById('bib-curso-day');
        if (daySel) daySel.value = '';
        document.getElementById('bib-curso-modal').style.display = 'flex';
    }

    bibCloseCursoModal() { document.getElementById('bib-curso-modal').style.display = 'none'; }

    bibSaveCurso() {
        const name = document.getElementById('bib-curso-name')?.value?.trim();
        if (!name) { alert('Poné un nombre al curso.'); return; }
        const day = document.getElementById('bib-curso-day')?.value || '';
        const time = document.getElementById('bib-curso-time')?.value || '';
        const meetLink = document.getElementById('bib-curso-meet')?.value?.trim() || '';
        const memberIds = [...document.querySelectorAll('#bib-curso-members input:checked')].map(c => c.value);
        const groups = this.data.getAllGroups();
        groups.push({ id: this.data.generateId('group'), name, day, time, meetLink, memberIds, createdAt: Date.now() });
        this.data.saveGroups(groups);
        document.getElementById('bib-curso-modal').style.display = 'none';
        this._bibSidebarTab = 'cursos';
        this.renderBibliotecaView();
    }

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
                    el.innerHTML = `<strong>${cDate}:</strong> "${this._escapeHtml(q.text)}"`;
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

    rescheduleClassForAbsentStudent(claseId, studentId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        
        // Cargar alumnos y buscar nombre
        this.data.getProfiles().then(profiles => {
            const p = profiles.find(x => x.id === studentId);
            const studentName = p ? p.name : 'Alumno';
            
            // Sugerir fecha dentro de 7 días
            const curDate = new Date(clase.date + 'T12:00');
            const reschedDateObj = new Date(curDate.getTime() + 7 * 86400000);
            const defaultDate = reschedDateObj.toISOString().slice(0, 10);
            
            const newDate = prompt(`Fecha para reprogramar clase individual con ${studentName} (AAAA-MM-DD):`, defaultDate);
            if (!newDate) return;
            
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(newDate)) {
                alert("Formato de fecha inválido. Usá AAAA-MM-DD.");
                return;
            }

            const newClase = {
                id: this.data.generateId('clase'),
                groupId: clase.groupId,
                title: `Reprog. - ${studentName}`,
                date: newDate,
                status: 'programada',
                attendance: {},
                content: JSON.parse(JSON.stringify(clase.content || [])), // clonar contenido
                objetivos: JSON.parse(JSON.stringify(clase.objetivos || [])), // clonar objetivos
                resumenProfesor: `Reprogramación por ausencia en la clase del ${clase.date}.`,
                resumen: `Reprogramación por ausencia en la clase del ${clase.date}.`,
                memberOverride: [studentId] // Override para que sea clase individual
            };
            
            this.data.saveClase(newClase);
            this.showToast(`Clase reprogramada para el ${newDate}`, "✓");
            this.renderDashboardView();
        });
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

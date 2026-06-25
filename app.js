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
        "nav-practice": "Modo Práctica",
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
        "gp-uploader-subtitle": "Sube el archivo de tu clase para reproducirlo en el Modo Práctica.",
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
        "nav-practice": "Practice Mode",
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
        "gp-uploader-subtitle": "Upload your class file to play it inside the Practice Mode.",
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

        // Estado de clases (Phase 6)
        this._currentClaseId = null;
        this._currentClaseTab = 0; // 0=técnica, 1=lectura, 2=repertorio

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
    }

    async init() {
        // Inicializar DataService (IndexedDB)
        await this.data.init();

        // Cargar idioma
        this.lang = this.data.getLang();

        // Enlazar eventos de la UI
        this.bindEvents();

        // Cargar tema visual guardado
        this.loadSavedTheme();

        // Reubicar metrónomo según resolución
        this.adjustQuickToolsLocation();
        window.addEventListener("resize", () => this.adjustQuickToolsLocation());

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
        await this.renderStudioPendingWeeks();
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
            if (avatar) avatar.textContent = this.activeProfile.name.charAt(0).toUpperCase();
            if (name) name.textContent = this.activeProfile.name;
            document.getElementById("btn-profile-chip").style.setProperty("--pcolor", this.activeProfile.color || "#6c63ff");
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
        this.renderProfilesModalList();
    }

    closeProfilesModal() {
        document.getElementById("profiles-modal-overlay").style.display = "none";
        // Refrescar el selector
        this.showProfileSelector();
    }

    async renderProfilesModalList() {
        const profiles = await this.data.getProfiles();
        const container = document.getElementById("profiles-modal-list");
        container.innerHTML = "";
        if (profiles.length === 0) {
            container.innerHTML = `<p class="text-muted">No hay perfiles creados.</p>`;
            return;
        }
        profiles.forEach(p => {
            const row = document.createElement("div");
            row.className = "profiles-modal-row";
            row.innerHTML = `
                <span class="profiles-modal-avatar" style="background:${p.color}">${p.name.charAt(0).toUpperCase()}</span>
                <span class="profiles-modal-name">${p.name}</span>
                <button class="btn btn-danger btn-sm" onclick="app.deleteProfile('${p.id}')">Eliminar</button>
            `;
            container.appendChild(row);
        });
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
            createdAt: new Date().toISOString()
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
        this.renderProfilesModalList();
    }

    async renderStudioPendingWeeks() {
        const container = document.getElementById("studio-pending-weeks");
        if (!container) return;

        let weeks = [];
        if (this.activeProfile) {
            const pws = await this.data.getProfileWeeks(this.activeProfile.id);
            const weekIds = pws.map(pw => pw.weekId);
            const allWeeks = await this.data.getWeeks();
            weeks = allWeeks.filter(w => weekIds.includes(w.id));
        } else if (this.isProfessorMode) {
            weeks = await this.data.getWeeks();
        }

        if (weeks.length === 0) {
            container.innerHTML = `<p class="text-muted">${this.isProfessorMode ? 'Asigná semanas a los alumnos desde el Cuaderno.' : 'El profesor no te ha asignado semanas todavía.'}</p>`;
            return;
        }

        container.innerHTML = weeks.map(w => `
            <div class="studio-week-pill" onclick="app._practiceTargetWeek='${w.id}'; app.navigateToView('practice');">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>${w.name}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;margin-left:auto;opacity:.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
        `).join('');
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

        // Metrónomo UI independiente
        const bpmSlider = document.getElementById("metro-bpm-slider");
        const bpmText = document.getElementById("metro-bpm-text");
        const metroToggle = document.getElementById("btn-metro-toggle");
        const metroDec = document.getElementById("btn-metro-decrement");
        const metroInc = document.getElementById("btn-metro-increment");

        bpmSlider.addEventListener("input", (e) => {
            const bpm = parseInt(e.target.value, 10);
            bpmText.textContent = bpm;
            this.metronome.setBpm(bpm);
        });

        // Control de volumen del metrónomo
        const metroVolSlider = document.getElementById("metro-volume-slider");
        metroVolSlider.addEventListener("input", (e) => {
            const vol = parseInt(e.target.value, 10) / 100.0;
            this.metronome.volume = vol;
        });

        metroDec.addEventListener("click", () => {
            let bpm = parseInt(bpmSlider.value, 10) - 4;
            bpm = Math.max(40, bpm);
            bpmSlider.value = bpm;
            bpmText.textContent = bpm;
            this.metronome.setBpm(bpm);
        });

        metroInc.addEventListener("click", () => {
            let bpm = parseInt(bpmSlider.value, 10) + 4;
            bpm = Math.min(250, bpm);
            bpmSlider.value = bpm;
            bpmText.textContent = bpm;
            this.metronome.setBpm(bpm);
        });

        metroToggle.addEventListener("click", () => {
            const isPlaying = this.metronome.toggle();
            if (isPlaying) {
                metroToggle.querySelector("span").setAttribute("data-i18n", "btn-stop");
                metroToggle.querySelector("span").textContent = this.lang === "es" ? "Detener" : "Stop";
                metroToggle.classList.add("btn-outline");
                metroToggle.classList.remove("btn-primary");
            } else {
                metroToggle.querySelector("span").setAttribute("data-i18n", "btn-play");
                metroToggle.querySelector("span").textContent = this.lang === "es" ? "Iniciar" : "Start";
                metroToggle.classList.add("btn-primary");
                metroToggle.classList.remove("btn-outline");
                // Apagar visuales del metrónomo
                this.resetMetronomeVisuals();
            }
        });

        // Configurar callback del pulso del metrónomo
        const indicators = document.querySelectorAll(".beat-indicator");
        if (typeof this.metronome.onBeat === 'function') {
            this.metronome.onBeat((beatNumber) => {
                indicators.forEach((ind, index) => {
                    if (index === beatNumber) {
                        ind.classList.add("active");
                    } else {
                        ind.classList.remove("active");
                    }
                });
            });
        }

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

        // Chip de perfil (abrir selector)
        const profileChip = document.getElementById("btn-profile-chip");
        if (profileChip) profileChip.addEventListener("click", () => this.showProfileSelector());

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
    _getGroups() {
        try { return JSON.parse(localStorage.getItem('gs-groups') || '[]'); } catch(e) { return []; }
    }
    _saveGroups(groups) { localStorage.setItem('gs-groups', JSON.stringify(groups)); }
    _genGroupId() { return 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }

    async renderGroupsInNotebook() {
        const container = document.getElementById('groups-list-notebook');
        if (!container) return;
        const groups = this._getGroups();
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
        const groups = this._getGroups();
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
            return '<label class="group-member-check">' +
                '<input type="checkbox" name="member" value="' + p.id + '"' + checked + '>' +
                '<div class="group-member-avatar sm" style="background:' + (p.color||'#6366f1') + '">' + ((p.name||'?')[0].toUpperCase()) + '</div>' +
                '<span>' + self._escapeHtml(p.name) + '</span></label>';
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
        const groups = this._getGroups();
        if (groupId) {
            const idx = groups.findIndex(function(g) { return g.id === groupId; });
            if (idx > -1) groups[idx] = Object.assign({}, groups[idx], { name, day, time, meetLink, memberIds });
        } else {
            groups.push({ id: this._genGroupId(), name, day, time, meetLink, memberIds, createdAt: Date.now() });
        }
        this._saveGroups(groups);
        this.showToast(groupId ? 'Grupo actualizado.' : '¡Grupo creado!', '✓');
        await this.renderGroupsInNotebook();
    }

    async deleteGroup(groupId) {
        if (!confirm('¿Eliminar este grupo?')) return;
        this._saveGroups(this._getGroups().filter(function(g) { return g.id !== groupId; }));
        await this.renderGroupsInNotebook();
        this.showToast('Grupo eliminado.', '✓');
    }

    copyMeetLink(groupId) {
        const group = this._getGroups().find(function(g) { return g.id === groupId; });
        if (!group || !group.meetLink) return;
        const self = this;
        navigator.clipboard.writeText(group.meetLink)
            .then(function() { self.showToast('Link copiado al portapapeles.', '📋'); })
            .catch(function() { self.showToast('Copiá manualmente: ' + group.meetLink, '⚠️', 6000); });
    }

    sendMeetWhatsApp(groupId) {
        const group = this._getGroups().find(function(g) { return g.id === groupId; });
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
        if (!['tango', 'folklore', 'partitura'].includes(theme)) return;
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
        const saved = localStorage.getItem('gs-theme') || 'tango';
        this.applyTheme(saved);
    }

    navigateToView(viewId) {
        // Cerrar visores si están abiertos
        if (this._pdfBlobUrl) this.closePDFViewer();
        if (document.getElementById('yt-viewer-panel')?.style.display === 'flex') this.closeYouTubeViewer();

        // Pausar metrónomo si cambiamos de vista
        if (this.metronome.isPlaying && viewId !== 'practice') {
            document.getElementById("btn-metro-toggle").click();
        }

        // Pausar timer activo si salimos de práctica
        if (viewId !== 'practice' && this.activeTimerStep !== null) {
            this.pauseStepTimer(this.activeTimerStep);
        }

        const PROFESSOR_VIEWS = ['dashboard', 'notebook', 'library'];
        const labels = {
            studio: 'Mi Estudio', practice: 'Modo Práctica',
            'my-library': 'Mi Biblioteca', dashboard: 'Tablero de Control',
            notebook: 'Cuaderno', library: 'Biblioteca Principal'
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
        } else if (viewId === 'notebook') {
            this.renderWeeksInNotebook();
            this.renderGroupsInNotebook();
            this.renderLibraryInNotebook();
            this.renderAssignMatrix();
        } else if (viewId === 'studio') {
            this.renderStudioPendingWeeks();
        } else if (viewId === 'library') {
            this.renderLibraryView();
        } else if (viewId === 'my-library') {
            this.renderMyLibraryView();
        } else if (viewId === 'dashboard') {
            this.renderDashboardView();
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
            // Timer y botón completar para la categoría activa
            const timerSecs = this.timerSeconds[catIdx] || 0;
            const mm = String(Math.floor(timerSecs / 60)).padStart(2, '0');
            const ss = String(timerSecs % 60).padStart(2, '0');
            const isCompleted = this.completedSteps[catIdx];
            const isTimerRunning = !!this.timerIntervals[catIdx];

            html = `<div class="practice-category-header">
                <div class="practice-timer-block">
                    <span class="practice-timer-display" id="practice-timer-display">${mm}:${ss}</span>
                    <button class="btn btn-outline btn-sm" id="btn-cat-timer-toggle">
                        ${isTimerRunning ? (this.lang === 'es' ? '⏸ Pausar' : '⏸ Pause') : (timerSecs > 0 ? (this.lang === 'es' ? '▶ Continuar' : '▶ Resume') : (this.lang === 'es' ? '▶ Iniciar' : '▶ Start'))}
                    </button>
                </div>
                <button class="btn ${isCompleted ? 'btn-outline' : 'btn-primary'} btn-sm" id="btn-complete-cat" ${isCompleted ? 'disabled' : ''}>
                    ${isCompleted ? '✓ ' : ''}${t('btn-complete-category')}
                </button>
            </div>`;
        }

        // Cargar semanas y sus ítems para esta categoría
        let weeks = [], allWeekItems = [];
        try {
            weeks = await this.data.getWeeks();
            allWeekItems = await this.data.getAllWeekItems();
        } catch(e) { console.warn(e); }

        // Filtrar weekItems: para supplementary mostramos todos los que no tienen categoría
        // asignada a technique/reading/repertoire, o la categoría específica
        const catItems = isSupplementary
            ? allWeekItems.filter(wi => wi.category === 'supplementary')
            : allWeekItems.filter(wi => wi.category === cat);

        // Filtrar por semanas del perfil activo si es alumno
        let allowedWeekIds = null;
        if (this.activeProfile && !this.isProfessorMode) {
            const pws = await this.data.getProfileWeeks(this.activeProfile.id);
            allowedWeekIds = new Set(pws.map(pw => pw.weekId));
        }

        // Agrupar por semana — más reciente primero (semana actual al tope)
        const weeksWithItems = weeks.map(w => ({
            week: w,
            items: catItems.filter(wi => wi.weekId === w.id)
        })).filter(({ week, items }) => items.length > 0 && (!allowedWeekIds || allowedWeekIds.has(week.id)))
          .sort((a, b) => (b.week.createdAt || 0) - (a.week.createdAt || 0));

        if (weeksWithItems.length === 0) {
            const emptyMsg = isSupplementary
                ? (this.lang === 'es'
                    ? 'No hay material complementario asignado todavía. El profesor puede agregar ítems como "Complementario" desde el Cuaderno.'
                    : 'No supplementary material assigned yet.')
                : t('practice-empty-state');
            html += `<div class="practice-empty-state">
                <p class="text-muted">${emptyMsg}</p>
                ${!isSupplementary && this.isProfessorMode ? `<button class="btn btn-outline btn-sm" onclick="app.navigateToView('notebook')">${t('practice-empty-go-notebook')}</button>` : ''}
            </div>`;
        } else {
            // Cargar todos los library items necesarios
            let libraryCache = {};
            try {
                const allLib = await this.data.getLibraryItems();
                allLib.forEach(item => { libraryCache[item.id] = item; });
            } catch(e) { console.warn(e); }

            const typeGroups = [
                { key: 'score',   label: 'Partituras',  icon: 'fa-guitar',    color: 'var(--tb-accent)',  action: (id) => `app.openPlayerForItem('${id}')` },
                { key: 'pdf',     label: 'PDFs',        icon: 'fa-file-pdf',  color: '#e53e3e',           action: (id) => `app.openPDF('${id}')` },
                { key: 'youtube', label: 'Videos',      icon: 'fa-youtube',   color: '#FF0000',           action: (id) => `app.openYouTube('${id}')` },
                { key: 'spotify', label: 'Spotify',     icon: 'fa-spotify',   color: '#1DB954',           action: (id) => `app.openSpotify('${id}')` },
            ];

            html += `<div class="weeks-accordion">`;
            weeksWithItems.forEach(({ week, items }, wIdx) => {
                const resolvedItems = items.map(wi => libraryCache[wi.libraryItemId]).filter(Boolean);
                const isOpen = wIdx === 0;
                html += `<div class="week-accordion-item ${isOpen ? 'open' : ''}">
                    <div class="week-accordion-header" onclick="this.parentElement.classList.toggle('open')">
                        <span class="week-accordion-title">${this._escapeHtml(week.title)}</span>
                        <svg class="week-accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                    <div class="week-accordion-body">`;

                typeGroups.forEach(({ key, label, icon, color, action }) => {
                    const group = resolvedItems.filter(i => i.type === key);
                    if (group.length === 0) return;

                    html += `<div class="week-type-section">
                        <div class="week-type-header">
                            <i class="fas ${icon}" style="color:${color}"></i>
                            <span>${label}</span>
                        </div>
                        <ul class="week-type-list">`;

                    group.forEach(item => {
                        html += `<li class="week-type-item" onclick="${action(item.id)}">
                            <span class="week-type-item-title">${this._escapeHtml(item.title)}</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;opacity:.4"><polyline points="9 18 15 12 9 6"/></svg>
                        </li>`;
                    });

                    html += `</ul></div>`;
                });

                html += `</div></div>`;
            });
            html += `</div>`; // close weeks-accordion
        }

        area.innerHTML = html;

        // Supplementary: sin timer ni complete button
        if (isSupplementary) return;

        // Bind timer toggle
        const timerBtn = document.getElementById("btn-cat-timer-toggle");
        if (timerBtn) {
            timerBtn.addEventListener("click", () => this.toggleTimer(catIdx + 1));
        }

        // Bind complete button
        const isCompleted = this.completedSteps[catIdx];
        const completeBtn = document.getElementById("btn-complete-cat");
        if (completeBtn && !isCompleted) {
            completeBtn.addEventListener("click", () => this.completeCategory(catIdx));
        }
    }

    _escapeHtml(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Abre el player AlphaTab para un ítem de la biblioteca
    async openPlayerForItem(libraryItemId) {
        const item = await this.data.getLibraryItem(libraryItemId);
        if (!item || item.type !== 'score') return;

        this.playerActiveItemId = libraryItemId;

        // Mostrar back button, ocultar category tabs de práctica
        const backBtn = document.getElementById("btn-back-to-exercises");
        if (backBtn) backBtn.style.display = "flex";
        document.querySelectorAll(".pcat-tab").forEach(t => t.style.display = "none");

        // Cambiar a step-view-4
        const contentArea = document.getElementById("practice-content-area");
        const playerView = document.getElementById("step-view-4");
        if (contentArea) contentArea.style.display = "none";
        if (playerView) playerView.style.display = "flex";

        // Inicializar y cargar
        await this.initAlphaTabPlayerIfNeeded(item);
        if (this.atApi && this.atCurrentItemId !== libraryItemId) {
            this.atApi.load(new Uint8Array(item.bytes));
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
        if (playerView) playerView.style.display = "none";

        if (this.atApi) this.atApi.stop();

        this.renderPracticeView();
    }

    // Abre un PDF en nueva pestaña
    async openPDF(libraryItemId) {
        const item = await this.data.getLibraryItem(libraryItemId);
        if (!item || !item.bytes) return;

        if (this._pdfBlobUrl) URL.revokeObjectURL(this._pdfBlobUrl);
        this._pdfBlobUrl = URL.createObjectURL(new Blob([item.bytes], { type: 'application/pdf' }));

        document.getElementById('pdf-iframe').src = this._pdfBlobUrl;
        document.getElementById('pdf-viewer-title').textContent = item.title || 'Documento';
        document.getElementById('pdf-viewer-panel').style.display = 'flex';
    }

    closePDFViewer() {
        document.getElementById('pdf-viewer-panel').style.display = 'none';
        document.getElementById('pdf-iframe').src = '';
        if (this._pdfBlobUrl) {
            URL.revokeObjectURL(this._pdfBlobUrl);
            this._pdfBlobUrl = null;
        }
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
        // Si ya hay un timer activo en otro paso, pausarlo
        if (this.activeTimerStep !== null && this.activeTimerStep !== stepIndex) {
            this.pauseStepTimer(this.activeTimerStep);
        }

        const timerId = stepIndex - 1;
        // No iniciar si ya está corriendo
        if (this.timerIntervals[timerId]) return;

        this.activeTimerStep = stepIndex;

        this.timerIntervals[timerId] = setInterval(() => {
            this.timerSeconds[timerId]++;
            this.updateTimerDisplay(stepIndex);

            // Verificar si superó el mínimo para auto-completar
            const config = this.data.getWeeklyConfig();
            const minSeconds = (config.minMinutesPerStep || 5) * 60;
            if (!this.completedSteps[timerId] && this.timerSeconds[timerId] >= minSeconds) {
                this.autoCompleteStep(stepIndex);
            }

            // Persistir cada 30 segundos para no perder datos si se cierra el browser
            if (this.timerSeconds[timerId] % 30 === 0) {
                this.savePracticeProgress();
            }
        }, 1000);

        // Actualizar UI del botón
        const btn = document.getElementById(`btn-timer-start-${stepIndex}`);
        if (btn) btn.textContent = this.lang === "es" ? "⏸ Pausar" : "⏸ Pause";
    }

    /**
     * Pausa el timer de un paso específico.
     */
    pauseStepTimer(stepIndex) {
        const timerId = stepIndex - 1;
        if (this.timerIntervals[timerId]) {
            clearInterval(this.timerIntervals[timerId]);
            this.timerIntervals[timerId] = null;
        }
        if (this.activeTimerStep === stepIndex) {
            this.activeTimerStep = null;
        }

        const btn = document.getElementById(`btn-timer-start-${stepIndex}`);
        if (btn) btn.textContent = this.lang === "es" ? "▶ Continuar" : "▶ Resume";

        // Guardar progreso al pausar
        this.savePracticeProgress();
    }

    /**
     * Toggle timer: inicia si está pausado, pausa si está corriendo.
     */
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
        
        const btn = document.getElementById(`btn-timer-start-${stepIndex}`);
        if (btn) btn.textContent = this.lang === "es" ? "▶ Iniciar" : "▶ Start";
    }

    updateTimerDisplay(stepIndex) {
        const timerId = stepIndex - 1;
        const totalSecs = this.timerSeconds[timerId];
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;

        const displayStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Display en el área de práctica (nuevo flujo)
        const practiceDisplay = document.getElementById("practice-timer-display");
        if (practiceDisplay && this.categoryIds[timerId] === this.currentCategory) {
            practiceDisplay.textContent = displayStr;
        }

        // Display legacy (por compatibilidad)
        const el = document.getElementById(`timer-display-${stepIndex}`);
        if (el) el.textContent = displayStr;

        // Actualizar indicador de progreso hacia el mínimo
        const config = this.data.getWeeklyConfig();
        const minSeconds = (config.minMinutesPerStep || 5) * 60;
        const progressEl = document.getElementById(`timer-progress-${stepIndex}`);
        if (progressEl) {
            const pct = Math.min(100, Math.round((totalSecs / minSeconds) * 100));
            progressEl.style.width = `${pct}%`;
            if (pct >= 100) {
                progressEl.classList.add('complete');
            }
        }
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
                await this.data.savePracticeLog(todayStr, { entries, totalSeconds });
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
        
        if (notes) {
            
            // Poblar campos del formulario por si edita
            document.getElementById("notes-teacher-name").value = notes.teacher || "";
            document.getElementById("notes-focus-task").value = notes.focus || "";
            document.getElementById("notes-corrections").value = notes.corrections || "";
            
            // Actualizar vista previa del Dashboard
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
        } else {
            container.innerHTML = `<p class="text-muted">${TRANSLATIONS[this.lang]["no-notes-yet"]}</p>`;
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
                this.atApi.load(new Uint8Array(libraryItem.bytes));
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
                this.atApi.load(new Uint8Array(libraryItem.bytes));
                this.atCurrentItemId = libraryItem.id;
            } else if (score && score.bytes) {
                this.atApi.load(new Uint8Array(score.bytes));
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

        // Si hay una clase abierta, mostrar detalle (Carga view)
        if (this._currentClaseId) {
            await this._renderClaseDetail(this._currentClaseId);
            return;
        }

        const [profiles, weeks, allProfileWeeks] = await Promise.all([
            this.data.getProfiles(),
            this.data.getWeeks(),
            this.data.getAllProfileWeeks(),
        ]);

        const todayStr = this.getTodayString();
        const yDate = new Date(); yDate.setDate(yDate.getDate() - 1);
        const yesterdayStr = yDate.toISOString().split('T')[0];

        // Datos de práctica por perfil
        const profileData = profiles.map(p => {
            const streak = this.data.getProfileStreak(p.id);
            const lastPracticed = this.data.getProfileLastPracticed(p.id);
            const lastReset = this.data.getProfileLastResetCheck ? this.data.getProfileLastResetCheck(p.id) : null;
            const rawSteps = this.data.getProfileCompletedSteps ? this.data.getProfileCompletedSteps(p.id) : [false,false,false];
            const todaySteps = lastReset === todayStr ? (rawSteps || [false,false,false]) : [false,false,false];
            let status = 'inactive', lastLabel = 'Nunca';
            if (lastPracticed) {
                const lastDate = new Date(lastPracticed).toISOString().split('T')[0];
                if (lastDate === todayStr) { status = 'today'; lastLabel = new Date(lastPracticed).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' }); }
                else if (lastDate === yesterdayStr) { status = 'yesterday'; lastLabel = 'Ayer'; }
                else { const days = Math.max(1, Math.round((Date.now() - lastPracticed) / 86400000)); lastLabel = `Hace ${days} día${days!==1?'s':''}`; }
            }
            return { ...p, streak, lastPracticed, todaySteps, status, lastLabel };
        });

        // Grupos y clases
        const groups = this._getGroups();
        const allClases = this.data.getAllClases();
        const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const todayDayName = dayNames[new Date().getDay()];

        // Clases de hoy: grupos cuyo día coincide con hoy
        const todayGroups = groups.filter(g => g.day === todayDayName);
        // Clases registradas hoy (por fecha)
        const clasesHoy = allClases.filter(c => c.date === todayStr);
        // Todas las demás clases (futuras), ordenadas por fecha
        const clasesFuturas = allClases
            .filter(c => c.date > todayStr)
            .sort((a,b) => a.date.localeCompare(b.date))
            .slice(0, 10);
        // Clases anteriores
        const clasesAnteriores = allClases
            .filter(c => c.date < todayStr)
            .sort((a,b) => b.date.localeCompare(a.date))
            .slice(0, 5);

        // Construir lista de items para el timeline lateral
        const timelineItems = [];

        // Agregar grupos de hoy como items (con clase existente o botón crear)
        todayGroups.forEach(g => {
            const claseExistente = clasesHoy.find(c => c.groupId === g.id);
            if (claseExistente) {
                timelineItems.push({ type:'clase', clase:claseExistente, group:g });
            } else {
                timelineItems.push({ type:'grupo-hoy', group:g });
            }
        });

        // Agregar clases de hoy de grupos que no coinciden por día (creadas manualmente)
        clasesHoy.forEach(c => {
            const g = groups.find(gr => gr.id === c.groupId);
            if (g && !todayGroups.find(tg => tg.id === g.id)) {
                timelineItems.push({ type:'clase', clase:c, group:g });
            }
        });

        // Clases futuras
        clasesFuturas.forEach(c => {
            const g = groups.find(gr => gr.id === c.groupId);
            if (g) timelineItems.push({ type:'futura', clase:c, group:g });
        });

        // Clases anteriores
        clasesAnteriores.forEach(c => {
            const g = groups.find(gr => gr.id === c.groupId);
            if (g) timelineItems.push({ type:'anterior', clase:c, group:g });
        });

        const statusColors = { programada:'#ff9500', iniciada:'#C8304A', finalizada:'#34c759' };
        const statusLabels = { programada:'Pendiente', iniciada:'En curso', finalizada:'Finalizada' };

        const renderTimelineItem = (item) => {
            if (item.type === 'grupo-hoy') {
                const g = item.group;
                const members = profiles.filter(p => (g.memberIds||[]).includes(p.id));
                return `<div class="tl-item tl-item-new" onclick="app.createClase('${g.id}')">
                    <div class="tl-dot-col">
                        <span class="tl-time">${g.time ? g.time.slice(0,5) : '—'}</span>
                        <div class="tl-dot" style="background:#2e1620;border-color:#4e3040"></div>
                        <div class="tl-line"></div>
                    </div>
                    <div class="tl-info">
                        <div class="tl-group">${this._escapeHtml(g.name)}</div>
                        <div class="tl-meta">${members.length} alumno${members.length!==1?'s':''}</div>
                        <span class="tl-badge" style="background:rgba(78,48,64,.4);color:#8a6a6e">+ Iniciar clase</span>
                    </div>
                </div>`;
            }
            const { clase, group: g } = item;
            const members = profiles.filter(p => (g.memberIds||[]).includes(p.id));
            const color = statusColors[clase.status] || '#8a6a6e';
            const label = statusLabels[clase.status] || clase.status;
            const dateStr = item.type !== 'clase'
                ? new Date(clase.date+'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'})
                : '';
            const att = clase.attendance ? Object.values(clase.attendance).filter(v=>v==='presente').length : 0;
            return `<div class="tl-item${item.type==='anterior'?' tl-item-past':''}" onclick="app.openClase('${clase.id}')">
                <div class="tl-dot-col">
                    <span class="tl-time">${g.time ? g.time.slice(0,5) : dateStr}</span>
                    <div class="tl-dot" style="background:${color};border-color:${color};${clase.status==='iniciada'?'animation:tlPulse 2s infinite':''}"></div>
                    <div class="tl-line"></div>
                </div>
                <div class="tl-info">
                    <div class="tl-group">${this._escapeHtml(g.name)}</div>
                    <div class="tl-meta">${members.length} alumno${members.length!==1?'s':''} · ${att} presente${att!==1?'s':''}</div>
                    <span class="tl-badge" style="background:${color}22;color:${color}">${label}</span>
                </div>
            </div>`;
        };

        const dateLabel = new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' });

        // Panel de actividad de alumnos (derecho cuando no hay clase seleccionada)
        const todayPract = profileData.filter(p=>p.status==='today');
        const yesterdayPract = profileData.filter(p=>p.status==='yesterday');
        const inactivePract = profileData.filter(p=>p.status==='inactive');

        const renderMiniProfile = (p) => {
            const color = p.status==='today' ? '#34c759' : p.status==='yesterday' ? '#ff9500' : '#5e3a42';
            return `<div class="dash-mini-row" onclick="app.selectProfileById('${p.id}')">
                <div class="dash-avatar" style="background:${p.color||'#6366f1'}">${(p.name||'?')[0].toUpperCase()}</div>
                <div style="flex:1;min-width:0">
                    <div class="dash-name">${this._escapeHtml(p.name)}</div>
                    <div style="font:400 10px Inter;color:#5e3a42">${p.lastLabel}</div>
                </div>
                ${p.streak>0 ? `<span style="font:600 11px Inter;color:#C8304A">🔥${p.streak}</span>` : ''}
                <div style="display:flex;gap:3px">${p.todaySteps.map((d,i)=>`<div style="width:8px;height:8px;border-radius:2px;background:${d?['#a29bfe','#55efc4','#fdcb6e'][i]:'#2e1620'}"></div>`).join('')}</div>
                <div style="font:500 10px Inter;color:${color};min-width:42px;text-align:right">${p.lastLabel}</div>
            </div>`;
        };

        const hasTimeline = timelineItems.length > 0 || groups.length > 0;

        content.innerHTML = `
        <div class="dash-shell">
            <!-- SIDEBAR: Timeline de clases -->
            <div class="dash-timeline-sidebar">
                <div class="dash-tl-header">
                    <div class="dash-tl-date">${dateLabel.charAt(0).toUpperCase()+dateLabel.slice(1)}</div>
                    <button class="btn btn-primary btn-sm" onclick="app._showNewClaseDialog()" style="font-size:10px;padding:4px 10px">+ Nueva clase</button>
                </div>
                ${groups.length === 0
                    ? `<div style="padding:20px 12px;text-align:center">
                        <p style="font:400 12px Inter;color:#5e3a42;line-height:1.5">Creá grupos en Biblioteca para ver las clases acá</p>
                        <button class="btn btn-ghost btn-sm" style="margin-top:8px;font-size:11px" onclick="app.navigateToView('library')">Ir a Biblioteca →</button>
                       </div>`
                    : timelineItems.length === 0
                    ? `<div style="padding:20px 12px;text-align:center">
                        <p style="font:400 12px Inter;color:#5e3a42">Sin clases registradas</p>
                       </div>`
                    : timelineItems.map(renderTimelineItem).join('')
                }
            </div>

            <!-- MAIN: Panel vacío o clase seleccionada -->
            <div class="dash-main-panel" id="dash-main-panel">
                <div class="dash-empty-state">
                    <div style="text-align:center;margin-bottom:28px">
                        <svg viewBox="0 0 48 48" fill="none" style="width:56px;height:56px;opacity:.2;margin-bottom:12px" stroke="#C8304A" stroke-width="1"><circle cx="24" cy="24" r="20"/><path d="M24 14v10l6 4"/></svg>
                        <p style="font:400 italic 14px 'Playfair Display',serif;color:#5e3a42">Seleccioná una clase del panel izquierdo</p>
                        <p style="font:400 11px Inter;color:#3e2030;margin-top:4px">o creá una nueva con "+ Nueva clase"</p>
                    </div>

                    <!-- Actividad de alumnos -->
                    ${profiles.length > 0 ? `
                    <div class="dash-activity-panel">
                        <div style="font:700 9px Inter;color:#5e3a42;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px">
                            Actividad de alumnos · ${todayPract.length}/${profiles.length} practicaron hoy
                        </div>
                        <div style="display:flex;flex-direction:column;gap:4px">
                            ${[...todayPract,...yesterdayPract,...inactivePract].map(renderMiniProfile).join('')}
                        </div>
                    </div>` : `
                    <div class="dash-activity-panel" style="text-align:center;padding:20px">
                        <p style="font:400 12px Inter;color:#5e3a42">No hay alumnos todavía.<br>Creá perfiles desde el selector de perfiles.</p>
                    </div>`}
                </div>
            </div>
        </div>`;
    }

    _renderClasesSection(profiles) {
        const groups = this._getGroups();
        if (groups.length === 0) return '';
        const allClases = this.data.getAllClases();
        const dayOrder = { 'Lunes':0,'Martes':1,'Miércoles':2,'Jueves':3,'Viernes':4,'Sábado':5,'Domingo':6 };
        const today = new Date().getDay();
        const sorted = [...groups].sort((a, b) => {
            const da = ((dayOrder[a.day]??7) - (today===0?6:today-1) + 7) % 7;
            const db = ((dayOrder[b.day]??7) - (today===0?6:today-1) + 7) % 7;
            return da - db;
        });
        const statusDot = s => s==='finalizada'
            ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#34c759;flex-shrink:0"></span>`
            : s==='iniciada'
            ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#C8304A;flex-shrink:0"></span>`
            : `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff9500;flex-shrink:0"></span>`;

        const cards = sorted.map(g => {
            const members = profiles.filter(p => (g.memberIds||[]).includes(p.id));
            const dayTime = [g.day, g.time ? g.time.slice(0,5):''].filter(Boolean).join(' · ');
            const groupClases = allClases.filter(c=>c.groupId===g.id)
                .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
            const claseItems = groupClases.slice(0,5).map(c => {
                const dateLabel = new Date(c.date+'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'});
                const att = c.attendance ? Object.values(c.attendance).filter(v=>v==='presente').length : 0;
                return `<div class="clase-tl-item" onclick="app.openClase('${c.id}')">
                    ${statusDot(c.status)}
                    <span class="clase-tl-date">${dateLabel}</span>
                    <span class="clase-tl-title">${this._escapeHtml(c.title||'Clase')}</span>
                    <span class="clase-tl-att">${att}/${members.length}</span>
                </div>`;
            }).join('');
            return `<div class="dash-group-card">
                <div class="dash-group-card-header">
                    <div>
                        <div class="dash-class-name">${this._escapeHtml(g.name)}</div>
                        <div class="dash-class-meta">${dayTime}${dayTime&&members.length?' · ':''}${members.length} alumno${members.length!==1?'s':''}</div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="app.createClase('${g.id}')">+ Nueva clase</button>
                </div>
                <div class="clase-timeline">${claseItems||'<p class="text-muted" style="font-size:12px;padding:6px 0">Sin clases registradas</p>'}</div>
            </div>`;
        }).join('');

        return `<div class="dash-section" style="border-top:1px solid var(--tb-border);margin-top:12px;padding-top:16px">
            <div class="dash-section-header">
                <span class="dash-section-title" style="color:var(--tb-text-secondary)">Clases por Grupo</span>
            </div>
            <div class="dash-groups-grid">${cards}</div>
        </div>`;
    }

    // =========================================================================
    // Gestión de Clases — Phase 6
    // =========================================================================

    createClase(groupId) {
        const group = this._getGroups().find(g => g.id === groupId);
        if (!group) return;
        const today = new Date().toISOString().slice(0,10);
        const clase = {
            id: this.data.generateId('clase'),
            groupId,
            title: `Clase ${new Date().toLocaleDateString('es-AR',{day:'numeric',month:'short'})}`,
            date: today,
            status: 'programada',
            attendance: {},
            content: [],   // [{id, title, type, cat}]  cat: 0=técnica,1=lectura,2=repertorio
            objetivos: [],
            resumen: '',
            notaAlumno: ''
        };
        this.data.saveClase(clase);
        this.openClase(clase.id);
    }

    openClase(claseId) {
        this._currentClaseId = claseId;
        this._currentClaseTab = 0;
        this.renderDashboardView();
    }

    closeClasetDetail() {
        this._currentClaseId = null;
        this.renderDashboardView();
    }

    _showNewClaseDialog() {
        const groups = this._getGroups();
        if (groups.length === 0) {
            alert('Creá un grupo en Biblioteca primero.');
            return;
        }
        const opts = groups.map(g => `<option value="${g.id}">${this._escapeHtml(g.name)}</option>`).join('');
        const todayStr = new Date().toISOString().slice(0,10);
        const dlg = document.createElement('div');
        dlg.className = 'modal-overlay';
        dlg.innerHTML = `<div class="modal-box" style="max-width:340px">
            <h3 style="margin:0 0 16px;font:700 16px 'Playfair Display',serif;color:var(--tb-text)">Nueva clase</h3>
            <label style="font:600 11px Inter;color:#5e3a42;text-transform:uppercase;letter-spacing:.08em">Grupo</label>
            <select id="dlg-group-sel" class="input-field" style="margin-bottom:12px">${opts}</select>
            <label style="font:600 11px Inter;color:#5e3a42;text-transform:uppercase;letter-spacing:.08em">Fecha</label>
            <input type="date" id="dlg-clase-date" class="input-field" value="${todayStr}" style="margin-bottom:20px">
            <div style="display:flex;gap:8px;justify-content:flex-end">
                <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="app._confirmNewClase(this)">Crear</button>
            </div>
        </div>`;
        document.body.appendChild(dlg);
        dlg.addEventListener('click', e => { if (e.target === dlg) dlg.remove(); });
    }

    _confirmNewClase(btn) {
        const dlg = btn.closest('.modal-overlay');
        const groupId = dlg.querySelector('#dlg-group-sel').value;
        const date = dlg.querySelector('#dlg-clase-date').value;
        if (!groupId) return;
        const clase = {
            id: this.data.generateId('clase'),
            groupId,
            title: `Clase ${new Date(date+'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'})}`,
            date,
            status: 'programada',
            attendance: {},
            content: [],
            objetivos: [],
            resumen: '',
            notaAlumno: ''
        };
        this.data.saveClase(clase);
        dlg.remove();
        this.openClase(clase.id);
    }

    async _renderClaseDetail(claseId) {
        const content = document.getElementById('dashboard-content');
        if (!content) return;
        const clase = this.data.getClase(claseId);
        if (!clase) { this.closeClasetDetail(); return; }

        const group = this._getGroups().find(g=>g.id===clase.groupId) || {};
        const profiles = await this.data.getProfiles();
        const members = profiles.filter(p=>(group.memberIds||[]).includes(p.id));

        // Status
        const statusLabels = { programada:'Programada', iniciada:'En curso', finalizada:'Finalizada' };
        const statusColors = { programada:'#ff9500', iniciada:'#C8304A', finalizada:'#34c759' };
        const statusLabel = statusLabels[clase.status] || clase.status;
        const statusColor = statusColors[clase.status] || 'var(--tb-text-muted)';

        // Action button
        let actionBtn = '';
        if (clase.status === 'programada') {
            actionBtn = `<button class="btn btn-primary" onclick="app.iniciarClase('${claseId}')">▶ Iniciar clase</button>`;
        } else if (clase.status === 'iniciada') {
            actionBtn = `<button class="btn btn-success" onclick="app.finalizarClase('${claseId}')">✓ Finalizar y publicar</button>`;
        } else {
            actionBtn = `<span style="font:400 italic 12px 'Playfair Display',serif;color:#34c759">✓ Clase finalizada</span>`;
        }

        // Attendance chips
        const attChips = members.length ? members.map(m => {
            const state = clase.attendance[m.id] || 'sin-marcar';
            const cfg = {
                'presente':   { bg:'rgba(52,199,89,.1)',  border:'rgba(52,199,89,.3)',  dot:'#34c759', nameColor:'#34c759' },
                'ausente':    { bg:'rgba(200,48,74,.1)',  border:'rgba(200,48,74,.25)', dot:'#C8304A', nameColor:'#C8304A' },
                'sin-marcar': { bg:'#150a0e',             border:'#2e1620',             dot:'#3a3a40', nameColor:'#9e8a8e' }
            }[state];
            return `<div onclick="app.toggleAttendance('${claseId}','${m.id}')"
                style="display:flex;align-items:center;gap:6px;padding:5px 10px 5px 5px;border-radius:20px;border:1px solid ${cfg.border};background:${cfg.bg};cursor:pointer;user-select:none;transition:all .15s">
                <div style="width:22px;height:22px;border-radius:50%;background:${m.color||'#888'};display:flex;align-items:center;justify-content:center;font:700 10px Inter;color:#fff;flex-shrink:0">${(m.name||'?')[0].toUpperCase()}</div>
                <span style="font:500 11px Inter;color:${cfg.nameColor};white-space:nowrap">${this._escapeHtml(m.name)}</span>
                <div style="width:6px;height:6px;border-radius:50%;background:${cfg.dot};flex-shrink:0"></div>
            </div>`;
        }).join('') : '<p class="text-muted" style="font-size:12px">Sin alumnos en este grupo</p>';

        // Content tabs
        const catNames = ['Técnica','Lectura','Repertorio'];
        const catTabs = catNames.map((name,i) =>
            `<button class="ctab${this._currentClaseTab===i?' active':''}" onclick="app.setClaseTab('${claseId}',${i})">${name}</button>`
        ).join('');
        const tabContent = (clase.content||[]).filter(c=>c.cat===this._currentClaseTab).map(c => {
            const icons = { gp:'🎸', pdf:'📄', audio:'🎵', youtube:'▶', spotify:'🎵' };
            return `<div class="content-item">
                <span style="font-size:14px">${icons[c.type]||'📎'}</span>
                <span class="ci-title">${this._escapeHtml(c.title||c.name||'')}</span>
                <button class="ci-rm" onclick="app.removeContentFromClase('${claseId}','${c.id}')" title="Quitar">×</button>
            </div>`;
        }).join('') || `<p class="text-muted" style="font-size:12px;padding:6px 0">Sin contenido en esta categoría</p>`;

        // Objetivos
        const objItems = (clase.objetivos||[]).map(o =>
            `<div style="display:flex;align-items:center;gap:7px;padding:6px 10px;background:#150a0e;border:1px solid #2e1620;border-radius:7px;margin-bottom:3px">
                <div style="width:14px;height:14px;border-radius:4px;border:1.5px solid #2e1620;flex-shrink:0"></div>
                <span style="flex:1;font:400 12px Inter;color:#c8a0a4">${this._escapeHtml(o.text)}</span>
                <button onclick="app.removeObjetivoFromClase('${claseId}','${o.id}')" style="background:transparent;border:none;cursor:pointer;color:#3e2030;padding:2px;font-size:14px">×</button>
            </div>`
        ).join('') || `<p style="padding:8px 10px;font:400 italic 11px 'Playfair Display',serif;color:#3e2030;border:1px dashed #2e1620;border-radius:7px">Agregá objetivos para que el alumno practique…</p>`;

        // Meet bar
        const meetBar = group.meetLink ? `
            <div style="display:flex;align-items:center;gap:6px;background:#150a0e;border:1px solid #2e1620;border-radius:8px;padding:5px 6px 5px 10px;margin-bottom:16px">
                <svg viewBox="0 0 24 24" fill="none" style="width:11px;height:11px;flex-shrink:0" stroke="#4a9eff" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                <span style="font:400 10px 'Courier New',monospace;color:#5e3a42;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escapeHtml(group.meetLink)}</span>
                <a href="${this._escapeHtml(group.meetLink)}" target="_blank" class="btn-meet-sm">Entrar</a>
                <button onclick="app.sendMeetWhatsApp('${group.id}')" class="btn-wa-sm" title="WhatsApp">
                    <svg viewBox="0 0 24 24" fill="#25d366" style="width:11px;height:11px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                </button>
            </div>` : '';

        content.innerHTML = `
        <div class="clase-detail-layout">
            <!-- Panel izquierdo -->
            <div class="clase-detail-left">
                <button class="btn btn-ghost btn-sm" onclick="app.closeClasetDetail()" style="align-self:flex-start;margin-bottom:4px">← Volver</button>
                <div>
                    <div style="font:700 9px Inter;color:${statusColor};text-transform:uppercase;letter-spacing:.14em;margin-bottom:4px">${statusLabel}</div>
                    <h2 class="clase-detail-title" contenteditable="true" onblur="app.saveClaseTitle('${claseId}',this.textContent.trim())">${this._escapeHtml(clase.title)}</h2>
                    <div style="font:400 12px Inter;color:#8a6a6e;margin-top:4px">
                        ${this._escapeHtml(group.name||'')} ·
                        <input type="date" value="${clase.date}" onchange="app.saveClaseDate('${claseId}',this.value)" style="background:transparent;border:none;color:#8a6a6e;font:400 12px Inter;cursor:pointer;outline:none">
                    </div>
                </div>

                ${meetBar}

                <div class="clase-section">
                    <div class="clase-section-title">Asistencia
                        <span style="font:400 10px Inter;color:#3e2030;font-weight:400;text-transform:none;letter-spacing:0;margin-left:8px">click = presente · doble = ausente</span>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">${attChips}</div>
                </div>

                <div class="clase-section">
                    <div class="clase-section-title">Contenido de esta clase</div>
                    <div class="content-tabs" style="display:flex;gap:4px;margin:8px 0">${catTabs}</div>
                    <div class="content-list">${tabContent}</div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                    <div class="clase-section">
                        <label class="clase-section-title">Resumen
                            <span style="font:400 9px Inter;color:#3e2030;background:#1a0c10;border:1px solid #2e1620;padding:1px 6px;border-radius:4px;font-weight:400;text-transform:none;letter-spacing:0;margin-left:4px">Solo el profesor</span>
                        </label>
                        <textarea class="form-input" style="resize:none;min-height:90px;width:100%;margin-top:6px;font-size:12px" placeholder="¿Qué se trabajó hoy?…" onchange="app.saveResumenClase('${claseId}',this.value)">${this._escapeHtml(clase.resumen||'')}</textarea>
                    </div>
                    <div class="clase-section">
                        <label class="clase-section-title" style="color:var(--tb-accent)">Objetivos para ${this._escapeHtml(group.name||'el alumno')}
                            <span style="font:400 9px Inter;color:var(--tb-accent);background:rgba(200,48,74,.06);border:1px solid rgba(200,48,74,.18);padding:1px 6px;border-radius:4px;font-weight:400;text-transform:none;letter-spacing:0;margin-left:4px">El alumno los ve</span>
                        </label>
                        <div style="margin-top:6px">${objItems}</div>
                        <div style="display:flex;gap:5px;margin-top:6px">
                            <input class="form-input" id="new-obj-${claseId}" style="flex:1;font-size:11px;padding:6px 10px" placeholder="+ Nuevo objetivo…" onkeydown="if(event.key==='Enter'){event.preventDefault();app.addObjetivoToClase('${claseId}')}">
                            <button onclick="app.addObjetivoToClase('${claseId}')" style="padding:6px 12px;border-radius:7px;background:rgba(200,48,74,.12);border:1px solid rgba(200,48,74,.25);color:var(--tb-accent);font:600 11px Inter;cursor:pointer;white-space:nowrap">Agregar</button>
                        </div>
                    </div>
                </div>

                <div style="padding-top:4px;margin-top:auto;display:flex;justify-content:flex-end">
                    ${actionBtn}
                </div>
            </div>

            <!-- Panel derecho: biblioteca + subir -->
            <div class="clase-detail-right">
                <div style="font:600 14px 'Playfair Display',serif;color:#f2e6e8;margin-bottom:10px">Agregar contenido</div>
                <div class="lib-search" style="display:flex;align-items:center;gap:8px;background:#0d0709;border:1px solid #2e1620;border-radius:8px;padding:7px 11px;margin-bottom:8px">
                    <svg viewBox="0 0 16 16" fill="none" style="width:12px;height:12px;flex-shrink:0" stroke="#5e3a42" stroke-width="1.5"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3" stroke-linecap="round"/></svg>
                    <input placeholder="Buscar en biblioteca…" oninput="app._renderClaseLibPanel('${claseId}',this.value)" style="flex:1;background:transparent;border:none;outline:none;font:400 12px Inter;color:#f2e6e8" id="clase-lib-search">
                </div>
                <div style="display:flex;gap:4px;margin-bottom:8px">
                    ${['Todos','Técnica','Lectura','Repertorio'].map((l,i)=>`<button class="lcat${i===0?' active':''}" onclick="app._filterClaseLib('${claseId}',${i-1},this)">${l}</button>`).join('')}
                </div>
                <div class="clase-lib-results" id="clase-lib-results" style="flex:1;overflow-y:auto"></div>

                <!-- Subir nuevo (fijo al fondo) -->
                <div style="border-top:1px solid #2e1620;padding-top:10px;margin-top:10px">
                    <div class="clase-section-title" style="margin-bottom:8px">Subir nuevo</div>
                    <div id="clase-upload-area-${claseId}">
                        <div class="dropzone" onclick="app._pickFile('${claseId}')" style="padding:14px;margin-bottom:8px;cursor:pointer">
                            <svg viewBox="0 0 40 40" fill="none" style="width:28px;height:28px" stroke="var(--tb-accent)" stroke-width="1.3"><path d="M20 8v18M12 16l8-8 8 8"/><path d="M8 28v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4"/></svg>
                            <div style="font:500 12px Inter;color:#8a6a6e;margin-top:6px">Arrastrá un archivo acá</div>
                            <div style="font:400 10px Inter;color:#3e2030">.gp · .gp5 · .gpx · .pdf</div>
                        </div>
                        <div style="display:flex;gap:6px">
                            <input class="form-input" id="clase-url-input-${claseId}" style="flex:1;font-size:11px" placeholder="O pegá link YouTube / Spotify…" oninput="app._onUrlInput('${claseId}',this.value)">
                            <button id="clase-url-detect-${claseId}" onclick="app._detectUrl('${claseId}')" style="display:none;padding:6px 9px;border-radius:7px;background:#1a0c10;border:1px solid #2e1620;color:#8a6a6e;font:500 10px Inter;cursor:pointer">Detectar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        this._renderClaseLibPanel(claseId, '', -1);
    }

    setClaseTab(claseId, tabIdx) {
        this._currentClaseTab = tabIdx;
        // Re-render solo el panel izquierdo
        const tabs = document.querySelectorAll('.ctab');
        tabs.forEach((t,i) => t.classList.toggle('active', i===tabIdx));
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        const catContent = (clase.content||[]).filter(c=>c.cat===tabIdx);
        const icons = { gp:'🎸', pdf:'📄', audio:'🎵', youtube:'▶', spotify:'🎵' };
        const listEl = document.querySelector('.content-list');
        if (listEl) {
            listEl.innerHTML = catContent.map(c =>
                `<div class="content-item">
                    <span style="font-size:14px">${icons[c.type]||'📎'}</span>
                    <span class="ci-title">${this._escapeHtml(c.title||c.name||'')}</span>
                    <button class="ci-rm" onclick="app.removeContentFromClase('${claseId}','${c.id}')" title="Quitar">×</button>
                </div>`
            ).join('') || `<p class="text-muted" style="font-size:12px;padding:6px 0">Sin contenido en esta categoría</p>`;
        }
    }

    async _renderClaseLibPanel(claseId, query, catFilter) {
        const container = document.getElementById('clase-lib-results');
        if (!container) return;
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        const items = await this.data.getLibraryItems();
        const q = (query||'').toLowerCase();
        const filtered = items.filter(it => {
            if (q && !(it.title||it.name||'').toLowerCase().includes(q)) return false;
            if (catFilter >= 0) {
                const catMap = { technique:0, reading:1, repertoire:2 };
                if (catMap[it.category] !== catFilter) return false;
            }
            return true;
        });
        if (!filtered.length) {
            container.innerHTML = '<p class="text-muted" style="font-size:12px;padding:8px">Sin resultados</p>';
            return;
        }
        const addedIds = new Set((clase.content||[]).map(c=>c.id));
        const icons = { gp:'🎸', pdf:'📄', audio:'🎵', youtube:'▶', spotify:'🎵' };
        container.innerHTML = filtered.map(it => {
            const inClass = addedIds.has(it.id);
            return `<div class="lib-item${inClass?' in-class':''}" onclick="${inClass?'':'`app.addContentToClase(\''+claseId+'\',\''+it.id+'\')`'}">
                <span style="font-size:13px">${icons[it.fileType]||'📎'}</span>
                <span class="li-title">${this._escapeHtml(it.title||it.name||'')}</span>
                ${inClass
                    ? `<div class="li-check"><svg viewBox="0 0 10 10" fill="none" style="width:9px;height:9px"><path d="M2 5l2 2 4-4" stroke="#34c759" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
                    : `<div class="li-add"><svg viewBox="0 0 10 10" fill="none" style="width:9px;height:9px"><path d="M5 2v6M2 5h6" stroke="var(--tb-accent)" stroke-width="1.5" stroke-linecap="round"/></svg></div>`}
            </div>`;
        }).join('');
    }

    _filterClaseLib(claseId, catFilter, btn) {
        document.querySelectorAll('.lcat').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const q = document.getElementById('clase-lib-search')?.value||'';
        this._renderClaseLibPanel(claseId, q, catFilter);
    }

    _onUrlInput(claseId, val) {
        const detectBtn = document.getElementById(`clase-url-detect-${claseId}`);
        if (detectBtn) detectBtn.style.display = val.length > 5 ? 'block' : 'none';
    }

    _detectUrl(claseId) {
        const input = document.getElementById(`clase-url-input-${claseId}`);
        if (!input) return;
        const url = input.value.toLowerCase();
        const type = url.includes('spotify') ? 'spotify' : 'youtube';
        const catMap = { youtube:2, spotify:2 };
        const cat = catMap[type];
        const title = type==='youtube' ? 'Video de referencia' : 'Playlist de referencia';
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.content = clase.content||[];
        const item = { id:this.data.generateId('url'), title, type, cat, url:input.value };
        clase.content.push(item);
        this.data.saveClase(clase);
        input.value = '';
        const detectBtn = document.getElementById(`clase-url-detect-${claseId}`);
        if (detectBtn) detectBtn.style.display = 'none';
        this._renderClaseLibPanel(claseId,'', -1);
        this.setClaseTab(claseId, cat);
        this.showToast('Contenido agregado', '🔗');
    }

    _pickFile(claseId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gp,.gp5,.gpx,.pdf,.mp3,.mp4,.m4a';
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            const ext = file.name.split('.').pop().toLowerCase();
            const typeMap = { gp:'gp', gp5:'gp', gpx:'gp', pdf:'pdf', mp3:'audio', mp4:'audio', m4a:'audio' };
            const type = typeMap[ext]||'pdf';
            const catDefault = type==='gp'?0 : type==='pdf'?1 : 2;
            const clase = this.data.getClase(claseId);
            if (!clase) return;
            const item = { id:this.data.generateId('file'), title:file.name.replace(/\.[^.]+$/, ''), type, cat:catDefault, name:file.name };
            clase.content = clase.content||[];
            clase.content.push(item);
            this.data.saveClase(clase);
            this._renderClaseLibPanel(claseId,'', -1);
            this.setClaseTab(claseId, catDefault);
            this.showToast('Archivo agregado', '📎');
        };
        input.click();
    }

    iniciarClase(claseId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.status = 'iniciada';
        this.data.saveClase(clase);
        this._renderClaseDetail(claseId);
    }

    finalizarClase(claseId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.status = 'finalizada';
        this.data.saveClase(clase);
        this.showToast('Clase finalizada y publicada', '✅');
        this._renderClaseDetail(claseId);
    }

    toggleAttendance(claseId, profileId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        const cycle = { 'sin-marcar':'presente', 'presente':'ausente', 'ausente':'sin-marcar' };
        const cur = clase.attendance[profileId] || 'sin-marcar';
        clase.attendance[profileId] = cycle[cur];
        this.data.saveClase(clase);
        // Re-render solo el bloque de asistencia
        const chips = document.querySelectorAll('[onclick*="toggleAttendance"]');
        if (chips.length) {
            this._renderClaseDetail(claseId);
        }
    }

    async addContentToClase(claseId, libItemId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        if ((clase.content||[]).some(c=>c.id===libItemId)) return;
        const item = await this.data.getLibraryItem(libItemId);
        if (!item) return;
        const catMap = { technique:0, reading:1, repertoire:2 };
        const cat = catMap[item.category] ?? this._currentClaseTab;
        clase.content = clase.content||[];
        clase.content.push({ id:item.id, title:item.title||item.name, type:item.fileType, cat, name:item.name });
        this.data.saveClase(clase);
        this._currentClaseTab = cat;
        const q = document.getElementById('clase-lib-search')?.value||'';
        const activeLcat = document.querySelector('.lcat.active');
        const catFilter = activeLcat ? parseInt(activeLcat.dataset.cat??'-1') : -1;
        this._renderClaseLibPanel(claseId, q, catFilter);
        this.setClaseTab(claseId, cat);
        this.showToast('Contenido agregado', '📎');
    }

    removeContentFromClase(claseId, itemId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.content = (clase.content||[]).filter(c=>c.id!==itemId);
        this.data.saveClase(clase);
        this.setClaseTab(claseId, this._currentClaseTab);
        const q = document.getElementById('clase-lib-search')?.value||'';
        this._renderClaseLibPanel(claseId, q, -1);
    }

    addObjetivoToClase(claseId) {
        const input = document.getElementById(`new-obj-${claseId}`);
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.objetivos = clase.objetivos||[];
        clase.objetivos.push({ id:this.data.generateId('obj'), text });
        this.data.saveClase(clase);
        input.value = '';
        this._renderClaseDetail(claseId);
    }

    removeObjetivoFromClase(claseId, objId) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.objetivos = (clase.objetivos||[]).filter(o=>o.id!==objId);
        this.data.saveClase(clase);
        this._renderClaseDetail(claseId);
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
        clase.title = text || clase.title;
        this.data.saveClase(clase);
    }

    saveClaseDate(claseId, date) {
        const clase = this.data.getClase(claseId);
        if (!clase) return;
        clase.date = date;
        this.data.saveClase(clase);
    }

    async renderMyLibraryView() {
        const content = document.getElementById("my-lib-view-content");
        if (!content) return;

        if (!this.activeProfile) {
            content.innerHTML = `<p class="text-muted" style="padding:24px">Seleccioná un perfil de alumno para ver tu biblioteca.</p>`;
            return;
        }

        const [allItems, allWeekItems, profileWeeks] = await Promise.all([
            this.data.getLibraryItems(),
            this.data.getAllWeekItems(),
            this.data.getProfileWeeks(this.activeProfile.id),
        ]);

        const assignedWeekIds = new Set(profileWeeks.map(pw => pw.weekId));
        const assignedItemIds = new Set(
            allWeekItems.filter(wi => assignedWeekIds.has(wi.weekId)).map(wi => wi.libraryItemId)
        );

        let items = allItems.filter(i => assignedItemIds.has(i.id));

        // Filtro por tipo
        const activeChip = document.querySelector('#my-lib-filter-chips .lib-chip.active');
        const filterVal = activeChip?.dataset.filter || 'all';
        if (filterVal !== 'all') items = items.filter(i => i.type === filterVal);

        // Filtro por búsqueda
        const searchVal = (document.getElementById('my-lib-search-input')?.value || '').toLowerCase().trim();
        if (searchVal) items = items.filter(i => i.title?.toLowerCase().includes(searchVal));

        if (items.length === 0) {
            content.innerHTML = `<p class="text-muted" style="padding:24px">No hay contenido asignado todavía.</p>`;
            return;
        }

        const typeGroups = [
            { key: 'score',   label: 'Partituras', icon: 'fa-guitar',   color: 'var(--tb-accent)',  action: id => `app.openPlayerForItem('${id}')` },
            { key: 'pdf',     label: 'PDFs',       icon: 'fa-file-pdf', color: '#e53e3e',           action: id => `app.openPDF('${id}')` },
            { key: 'youtube', label: 'Videos',     icon: 'fa-youtube',  color: '#FF0000',           action: id => `app.openYouTube('${id}')` },
            { key: 'spotify', label: 'Spotify',    icon: 'fa-spotify',  color: '#1DB954',           action: id => `app.openSpotify('${id}')` },
        ];

        let html = '';
        typeGroups.forEach(({ key, label, icon, color, action }) => {
            const group = items.filter(i => i.type === key);
            if (group.length === 0) return;
            html += `<div class="week-type-section" style="margin-bottom:24px">
                <div class="week-type-header">
                    <i class="fas ${icon}" style="color:${color}"></i>
                    <span>${label}</span>
                </div>
                <ul class="week-type-list">
                    ${group.map(item => `<li class="week-type-item" onclick="${action(item.id)}">
                        <span class="week-type-item-title">${this._escapeHtml(item.title)}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;opacity:.4"><polyline points="9 18 15 12 9 6"/></svg>
                    </li>`).join('')}
                </ul>
            </div>`;
        });
        content.innerHTML = html;

        // Bind search + chips
        document.getElementById('my-lib-search-input')?.addEventListener('input', () => this.renderMyLibraryView());
        document.querySelectorAll('#my-lib-filter-chips .lib-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('#my-lib-filter-chips .lib-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.renderMyLibraryView();
            });
        });
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

        const profileHeaders = profiles.map(p =>
            `<th class="assign-matrix-th">
                <span class="assign-matrix-avatar" style="background:${p.color}">${p.name.charAt(0).toUpperCase()}</span>
                <span class="assign-matrix-pname">${this._escapeHtml(p.name)}</span>
            </th>`
        ).join('');

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

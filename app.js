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
        "gp-autobpm-off": "OFF"
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
        "gp-autobpm-off": "OFF"
    }
};

// ==========================================================================
// 2. Base de Datos IndexedDB (Para archivos de Guitar Pro)
// ==========================================================================
class TabDatabase {
    constructor() {
        this.dbName = "GuitarStudioDB";
        this.dbVersion = 2; // v2: added practiceLogs store
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("scores")) {
                    db.createObjectStore("scores", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("practiceLogs")) {
                    db.createObjectStore("practiceLogs", { keyPath: "date" });
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
            const transaction = this.db.transaction(["scores"], "readwrite");
            const store = transaction.objectStore("scores");
            
            const data = {
                id: "weekly-score",
                name: name,
                bytes: arrayBuffer,
                uploadedAt: new Date().getTime()
            };
            
            const request = store.put(data);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }

    getScore() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["scores"], "readonly");
            const store = transaction.objectStore("scores");
            const request = store.get("weekly-score");
            
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e);
        });
    }

    deleteScore() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(["scores"], "readwrite");
            const store = transaction.objectStore("scores");
            const request = store.delete("weekly-score");
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
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
        this.history = []; // Fechas ("YYYY-MM-DD") de prácticas completadas
        this.completedSteps = [false, false, false, false];
        
        // Rutinas activas de práctica (modificables desde la biblioteca)
        this.activeLeftHandEx = null;
        this.activeRightHandEx = null;
        this.activeReadingEx = null;

        // DataService (capa de abstracción de datos)
        this.data = new DataService();
        this.metronome = new Metronome();
        
        // AlphaTab Player
        this.atApi = null;
        this.atIsPlaying = false;
        this.userInterrupted = false;
        this.isResettingLoop = false;

        // Auto BPM Increment per loop
        this.bpmAutoIncrEnabled = false;
        this.bpmAutoIncrStep = 1;
        this.bpmAutoIncrTarget = 120;

        // Timer ascendente por paso (cuenta hacia arriba)
        this.timerSeconds = [0, 0, 0, 0]; // Segundos acumulados por paso (1-4)
        this.timerIntervals = [null, null, null, null];
        this.activeTimerStep = null; // Paso actualmente siendo cronometrado
        this.stepCategories = ['technique-left', 'technique-right', 'sight-reading', 'repertoire'];
    }

    async init() {
        // Inicializar DataService (IndexedDB)
        await this.data.init();

        // Cargar configuración guardada via DataService
        this.lang = this.data.getLang();
        this.streak = this.data.getStreak();
        this.lastPracticedDate = this.data.getLastPracticedDate();
        this.history = this.data.getHistory();
        
        // Cargar rutinas personalizadas de la biblioteca si existen
        this.activeLeftHandEx = this.data.getActiveExercise('left');
        this.activeRightHandEx = this.data.getActiveExercise('right');
        this.activeReadingEx = this.data.getActiveExercise('reading');

        // Cargar estado de compleción diaria
        const todayStr = this.getTodayString();
        const lastReset = this.data.getLastResetCheck();
        if (lastReset !== todayStr) {
            // Es un nuevo día, resetear los pasos completados y timers
            this.completedSteps = [false, false, false, false];
            this.timerSeconds = [0, 0, 0, 0];
            this.data.setCompletedSteps(this.completedSteps);
            this.data.setLastResetCheck(todayStr);
        } else {
            this.completedSteps = this.data.getCompletedSteps();
            // Restaurar tiempos acumulados del día si existen
            await this.restoreTodayTimers();
        }

        // Enlazar eventos de la UI
        this.bindEvents();
        
        // Reubicar metrónomo según resolución
        this.adjustQuickToolsLocation();
        window.addEventListener("resize", () => this.adjustQuickToolsLocation());
        
        // Inicializar vistas, traducción e idioma
        this.updateLanguageUI();
        this.updateStreakUI();
        this.updateProgressUI();
        this.renderHeatmap();
        this.loadTeacherNotesUI();
        this.renderLibraryExercises();
        this.updatePracticeExercisesUI();

        // Comprobar la racha diaria en base a las fechas
        this.checkStreakValidity();

        // Cargar archivo Guitar Pro si existe en DB
        this.loadWeeklyGPFile();
    }

    /**
     * Restaura los tiempos de práctica del día actual desde IndexedDB.
     */
    async restoreTodayTimers() {
        try {
            const log = await this.data.getPracticeLog(this.getTodayString());
            if (log && log.entries) {
                log.entries.forEach(entry => {
                    const stepIdx = entry.step - 1;
                    if (stepIdx >= 0 && stepIdx < 4) {
                        this.timerSeconds[stepIdx] = entry.seconds || 0;
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
        
        // Diferencia en días
        const diffTime = Math.abs(today - lastPracticed);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            // Pasó más de un día sin practicar, la racha se rompe
            this.streak = 0;
            this.saveStreak();
        }
    }

    saveStreak() {
        this.data.saveStreakData(this.streak, this.lastPracticedDate, this.history);
        this.updateStreakUI();
    }

    updateStreakUI() {
        const countEls = document.querySelectorAll("#streak-count");
        countEls.forEach(el => el.textContent = this.streak);
        
        const badge = document.getElementById("streak-badge");
        if (this.streak > 0) {
            badge.classList.add("active");
        } else {
            badge.classList.remove("active");
        }

        // Título del Dashboard principal
        const titleEl = document.getElementById("studio-streak-title");
        const descEl = document.getElementById("studio-streak-desc");
        
        const practicedToday = this.lastPracticedDate === this.getTodayString();

        if (this.lang === "es") {
            titleEl.textContent = practicedToday 
                ? `¡Racha al día de ${this.streak} ${this.streak === 1 ? 'día' : 'días'}! 🔥`
                : this.streak > 0 
                    ? `¡Mantén tu racha de ${this.streak} ${this.streak === 1 ? 'día' : 'días'} activa!` 
                    : "¡Inicia tu racha de hoy!";
            descEl.textContent = practicedToday
                ? "¡Excelente trabajo! Has completado tu rutina técnica hoy. Nos vemos mañana."
                : "Toca y completa tus 4 módulos diarios para encender el fuego de la constancia.";
        } else {
            titleEl.textContent = practicedToday 
                ? `Streak active for ${this.streak} ${this.streak === 1 ? 'day' : 'days'}! 🔥`
                : this.streak > 0 
                    ? `Keep your ${this.streak}-${this.streak === 1 ? 'day' : 'days'} streak alive!` 
                    : "Start your streak today!";
            descEl.textContent = practicedToday
                ? "Excellent job! You completed your technical routine today. See you tomorrow."
                : "Play and complete your 4 daily modules to light the fire of consistency.";
        }
    }

    updateProgressUI() {
        const completedCount = this.completedSteps.filter(Boolean).length;
        const percentage = Math.round((completedCount / 4) * 100);
        
        // Actualizar círculo de progreso
        const circle = document.getElementById("progress-ring-circle");
        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius; // Aprox 314.16
        
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        document.getElementById("progress-percentage").textContent = `${percentage}%`;

        // Actualizar elementos de lista en el Dashboard y la cabecera
        for (let i = 1; i <= 4; i++) {
            const summaryItem = document.getElementById(`summary-step-${i}`);
            const headerItem = document.querySelector(`.header-step-item[data-step="${i}"]`);
            
            if (this.completedSteps[i - 1]) {
                summaryItem.classList.add("completed");
                if (headerItem) headerItem.classList.add("completed");
            } else {
                summaryItem.classList.remove("completed");
                if (headerItem) headerItem.classList.remove("completed");
            }
        }
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
        this.metronome.onBeat((beatNumber) => {
            indicators.forEach((ind, index) => {
                if (index === beatNumber) {
                    ind.classList.add("active");
                } else {
                    ind.classList.remove("active");
                }
            });
        });

        // Paso del Asistente - Navegación horizontal en cabecera
        const headerStepItems = document.querySelectorAll(".header-step-item");
        headerStepItems.forEach(item => {
            item.addEventListener("click", () => {
                const step = parseInt(item.getAttribute("data-step"), 10);
                this.navigateToView('practice');
                this.showWizardStep(step);
            });
        });

        // Timers del Modo Práctica
        for (let i = 1; i <= 3; i++) {
            const btnStart = document.getElementById(`btn-timer-start-${i}`);
            const btnReset = document.getElementById(`btn-timer-reset-${i}`);
            
            btnStart.addEventListener("click", () => this.toggleTimer(i));
            btnReset.addEventListener("click", () => this.resetTimer(i));
        }

        // Guardar anotaciones del cuaderno
        document.getElementById("btn-save-notes").addEventListener("click", () => this.saveTeacherNotes());

        // Manejo de Carga de Archivo Guitar Pro (Drag & Drop)
        const dropzone = document.getElementById("upload-dropzone");
        const fileInput = document.getElementById("gp-file-input");
        const btnBrowse = document.getElementById("btn-browse-file");

        btnBrowse.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                this.handleGPUpload(e.target.files[0]);
            }
        });

        dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzone.classList.add("dragover");
        });

        dropzone.addEventListener("dragleave", () => {
            dropzone.classList.remove("dragover");
        });

        dropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropzone.classList.remove("dragover");
            if (e.dataTransfer.files.length > 0) {
                this.handleGPUpload(e.dataTransfer.files[0]);
            }
        });

        // Eliminar Guitar Pro File
        document.getElementById("btn-delete-gp-file").addEventListener("click", () => this.deleteGPFile());

        // Toggle de la barra lateral colapsable
        const sidebarToggle = document.getElementById("btn-sidebar-toggle");
        if (sidebarToggle) {
            sidebarToggle.addEventListener("click", () => {
                const sidebar = document.querySelector(".sidebar");
                const mainContent = document.querySelector(".main-content");
                const atViewport = document.querySelector(".at-viewport");
                
                const activeStepEl = document.querySelector(".header-step-item.active");
                const isPlayerActive = activeStepEl && parseInt(activeStepEl.getAttribute("data-step"), 10) === 4 && this.atApi;
                
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

    navigateToView(viewId) {
        // Pausar metrónomo si cambiamos de vista
        if (this.metronome.isPlaying && viewId !== 'practice') {
            document.getElementById("btn-metro-toggle").click();
        }

        // Pausar timer activo si salimos de práctica
        if (viewId !== 'practice' && this.activeTimerStep !== null) {
            this.pauseStepTimer(this.activeTimerStep);
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
        
        if (targetView && targetLink) {
            targetView.classList.add("active");
            targetLink.classList.add("active");
        }

        // Si entramos al Modo Práctica, renderizar el paso activo
        if (viewId === 'practice') {
            const activeStep = document.querySelector(".header-step-item.active");
            if (activeStep) {
                const step = parseInt(activeStep.getAttribute("data-step"), 10);
                this.showWizardStep(step);
            }
        }
        this.updateHeaderCompleteButtonVisibility();
    }

    showWizardStep(stepNum) {
        // Ocultar pasos
        document.querySelectorAll(".wizard-step-view").forEach(view => {
            view.classList.remove("active");
        });
        document.querySelectorAll(".header-step-item").forEach(item => {
            item.classList.remove("active");
        });

        // Mostrar paso activo
        document.getElementById(`step-view-${stepNum}`).classList.add("active");
        const activeHeaderItem = document.querySelector(`.header-step-item[data-step="${stepNum}"]`);
        if (activeHeaderItem) activeHeaderItem.classList.add("active");

        // Auto-iniciar timer del paso activo (pausa el anterior automáticamente)
        this.startStepTimer(stepNum);
        this.updateTimerDisplay(stepNum);

        // Gatillar renderizado de alphaTab con un pequeño retardo para asegurar visibilidad en el DOM
        setTimeout(() => {
            if (stepNum === 4) {
                this.initAlphaTabPlayerIfNeeded();
                if (this.atApi) {
                    this.atApi.render();
                }
            }
        }, 100);
        this.updateHeaderCompleteButtonVisibility();
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
        this.updatePracticeExercisesUI();
        this.loadTeacherNotesUI();
        this.updateHeaderCompleteButtonVisibility();
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

    /**
     * Marca un paso como completado automáticamente al superar el mínimo de tiempo.
     */
    autoCompleteStep(stepIndex) {
        this.completedSteps[stepIndex - 1] = true;
        this.data.setCompletedSteps(this.completedSteps);
        this.updateProgressUI();
        this.playTimerAlert();

        // Feedback visual
        const stepHeader = document.querySelector(`.header-step-item[data-step="${stepIndex}"]`);
        if (stepHeader) stepHeader.classList.add('completed');
    }

    /**
     * Guarda el progreso de práctica del día actual en IndexedDB.
     */
    async savePracticeProgress() {
        const todayStr = this.getTodayString();
        const entries = [];
        let totalSeconds = 0;

        for (let i = 0; i < 4; i++) {
            if (this.timerSeconds[i] > 0) {
                const exerciseNames = [
                    this.activeLeftHandEx ? (this.lang === 'es' ? this.activeLeftHandEx.nameEs : this.activeLeftHandEx.nameEn) : 'Default',
                    this.activeRightHandEx ? (this.lang === 'es' ? this.activeRightHandEx.nameEs : this.activeRightHandEx.nameEn) : 'Default',
                    this.activeReadingEx ? (this.lang === 'es' ? this.activeReadingEx.nameEs : this.activeReadingEx.nameEn) : 'Default',
                    'Repertorio / Guitar Pro'
                ];
                entries.push({
                    step: i + 1,
                    category: this.stepCategories[i],
                    seconds: this.timerSeconds[i],
                    exercise: exerciseNames[i]
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
    completeStep(stepNum) {
        this.completedSteps[stepNum - 1] = true;
        this.data.setCompletedSteps(this.completedSteps);
        this.updateProgressUI();

        // Si se han completado los 4 pasos, finalizar práctica del día
        if (this.completedSteps.every(Boolean)) {
            this.finalizeDailyPractice();
        } else {
            // Avanzar al siguiente paso del asistente si existe
            if (stepNum < 4) {
                this.showWizardStep(stepNum + 1);
            }
        }
    }

    finalizeDailyPractice() {
        const todayStr = this.getTodayString();

        // Pausar todos los timers y guardar progreso final
        for (let i = 1; i <= 4; i++) {
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
            
            // Efecto fuego y alerta
            alert(TRANSLATIONS[this.lang]["practice-complete-congrats"]);
        } else {
            alert(this.lang === "es" 
                ? "¡Rutina completada de nuevo! Ya habías registrado tu práctica de hoy." 
                : "Routine completed again! You already registered your practice today.");
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
    // 9. Carga y Procesamiento de Guitar Pro (AlphaTab)
    // ==========================================================================
    async handleGPUpload(file) {
        try {
            // Leer archivo en ArrayBuffer
            const reader = new FileReader();
            reader.onload = async (e) => {
                const arrayBuffer = e.target.result;
                
                // Guardar en la IndexedDB local
                await this.data.saveScore(file.name, arrayBuffer);
                
                // Actualizar interfaz
                this.loadWeeklyGPFile();
                
                alert(this.lang === "es" 
                    ? `¡Archivo ${file.name} guardado correctamente en tu navegador!` 
                    : `File ${file.name} saved successfully in your browser!`);
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error("Error uploading GP file:", error);
            alert("Error al procesar el archivo.");
        }
    }

    async loadWeeklyGPFile() {
        const score = await this.data.getScore();
        const fileLoadedName = document.getElementById("file-loaded-name");
        const btnDelete = document.getElementById("btn-delete-gp-file");
        const fileExportRow = document.getElementById("file-export-row");
        const wrapper = document.querySelector(".at-wrap");
        const placeholder = document.getElementById("alphatab-placeholder");
        
        if (score) {
            if (fileLoadedName) {
                fileLoadedName.textContent = score.name;
                fileLoadedName.style.color = "var(--tb-text-primary)";
            }
            if (btnDelete) btnDelete.style.display = "block";
            if (fileExportRow) {
                fileExportRow.style.display = "block";
            }
            
            // Ocultar placeholder y mostrar visor
            if (placeholder) placeholder.style.display = "none";
            if (wrapper) wrapper.style.display = "flex";
            
            // Si estamos en la vista de práctica y el paso 4 está activo, inicializar/cargar
            const practiceViewActive = document.getElementById("view-practice").classList.contains("active");
            const step4El = document.querySelector(".header-step-item[data-step='4']");
            const step4Active = step4El ? step4El.classList.contains("active") : false;
            if (practiceViewActive && step4Active) {
                this.initAlphaTabPlayerIfNeeded();
            }
        } else {
            if (fileLoadedName) {
                fileLoadedName.textContent = TRANSLATIONS[this.lang]["no-file-loaded"];
                fileLoadedName.style.color = "var(--tb-text-muted)";
            }
            if (btnDelete) btnDelete.style.display = "none";
            if (fileExportRow) {
                fileExportRow.style.display = "none";
            }
            
            if (placeholder) placeholder.style.display = "flex";
            if (wrapper) wrapper.style.display = "none";
            
            // Destruir reproductor si existe
            if (this.atApi) {
                this.atApi.destroy();
                this.atApi = null;
            }
        }
        this.updateHeaderCompleteButtonVisibility();
    }

    updateHeaderCompleteButtonVisibility() {
        const btn = document.getElementById("btn-complete-practice-header");
        if (!btn) return;
        
        const practiceViewActive = document.getElementById("view-practice").classList.contains("active");
        const step4El = document.querySelector(".header-step-item[data-step='4']");
        const step4Active = step4El ? step4El.classList.contains("active") : false;
        
        this.data.getScore().then(score => {
            if (practiceViewActive && step4Active && score) {
                btn.style.display = "inline-flex";
            } else {
                btn.style.display = "none";
            }
        }).catch(() => {
            btn.style.display = "none";
        });
    }

    async deleteGPFile() {
        if (confirm(this.lang === "es" ? "¿Seguro que quieres eliminar la partitura?" : "Are you sure you want to delete the score?")) {
            await this.data.deleteScore();
            this.loadWeeklyGPFile();
        }
    }

    async initAlphaTabPlayerIfNeeded() {
        const score = await this.data.getScore();
        if (!score) return;
        
        // Si ya está inicializado, no hacer nada
        if (this.atApi) return;

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
        const placeholder = document.getElementById("alphatab-placeholder");
        
        // Asegurar visibilidad del elemento antes de inicializar
        if (placeholder) placeholder.style.display = "none";
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

            // Cargar los bytes guardados en la BD
            this.atApi.load(new Uint8Array(score.bytes));

        } catch (error) {
            console.error("AlphaTab error during initialization:", error);
        }
    }

    // ==========================================================================
    // 10. Biblioteca de Ejercicios (Visualización y Asignación)
    // ==========================================================================
    renderLibraryExercises() {
        const grid = document.getElementById("library-exercises-grid");
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

        // Eventos para botones de agregar
        grid.querySelectorAll(".btn-load-ex").forEach(btn => {
            btn.addEventListener("click", () => {
                const exId = btn.getAttribute("data-id");
                this.loadExerciseIntoRoutine(exId);
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

    loadExerciseIntoRoutine(exId) {
        const ex = EXERCISES_DATABASE.find(item => item.id === exId);
        if (!ex) return;

        if (ex.category === "left") {
            this.activeLeftHandEx = ex;
            this.data.setActiveExercise('left', ex);
            alert(this.lang === "es" 
                ? "Ejercicio cargado en tu rutina de Mano Izquierda." 
                : "Exercise loaded into your Left Hand routine.");
        } else if (ex.category === "right") {
            this.activeRightHandEx = ex;
            this.data.setActiveExercise('right', ex);
            alert(this.lang === "es" 
                ? "Ejercicio cargado en tu rutina de Mano Derecha." 
                : "Exercise loaded into your Right Hand routine.");
        } else if (ex.category === "reading") {
            this.activeReadingEx = ex;
            this.data.setActiveExercise('reading', ex);
            alert(this.lang === "es" 
                ? "Ejercicio cargado en tu rutina de Lectura." 
                : "Exercise loaded into your Sight Reading routine.");
        }

        this.updatePracticeExercisesUI();
    }

    updatePracticeExercisesUI() {
        // Mano Izquierda
        const leftNameEl = document.getElementById("left-hand-ex-name");
        const leftDescEl = document.getElementById("left-hand-ex-desc");
        
        if (this.activeLeftHandEx) {
            if (leftNameEl) leftNameEl.textContent = this.lang === "es" ? this.activeLeftHandEx.nameEs : this.activeLeftHandEx.nameEn;
            if (leftDescEl) leftDescEl.textContent = this.lang === "es" ? this.activeLeftHandEx.descEs : this.activeLeftHandEx.descEn;
        } else {
            if (leftNameEl) leftNameEl.textContent = TRANSLATIONS[this.lang]["left-hand-default-name"];
            if (leftDescEl) leftDescEl.textContent = TRANSLATIONS[this.lang]["left-hand-default-desc"];
        }

        // Mano Derecha
        const rightNameEl = document.getElementById("right-hand-ex-name");
        const rightDescEl = document.getElementById("right-hand-ex-desc");
        
        if (this.activeRightHandEx) {
            if (rightNameEl) rightNameEl.textContent = this.lang === "es" ? this.activeRightHandEx.nameEs : this.activeRightHandEx.nameEn;
            if (rightDescEl) rightDescEl.textContent = this.lang === "es" ? this.activeRightHandEx.descEs : this.activeRightHandEx.descEn;
        } else {
            if (rightNameEl) rightNameEl.textContent = TRANSLATIONS[this.lang]["right-hand-default-name"];
            if (rightDescEl) rightDescEl.textContent = TRANSLATIONS[this.lang]["right-hand-default-desc"];
        }

        // Lectura
        const readingNameEl = document.getElementById("reading-ex-name");
        const readingDescEl = document.getElementById("reading-ex-desc");
        
        if (this.activeReadingEx) {
            if (readingNameEl) readingNameEl.textContent = this.lang === "es" ? this.activeReadingEx.nameEs : this.activeReadingEx.nameEn;
            if (readingDescEl) readingDescEl.textContent = this.lang === "es" ? this.activeReadingEx.descEs : this.activeReadingEx.descEn;
        } else {
            if (readingNameEl) readingNameEl.textContent = this.lang === "es" ? "Descifrado Rápido de Notas" : "Quick Note Decoding";
            if (readingDescEl) readingDescEl.textContent = this.lang === "es"
                ? "Abre una partitura al azar en la biblioteca o de tus libros de estudio. Toca directamente la línea melódica sin ensayar antes, prestando atención exclusiva al ritmo y la fluidez del pulso, no importa si erras algunas notas."
                : "Open a random score in the library or from your books. Directly play the melodic line without practicing beforehand, focusing purely on pulse and flow.";
        }


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

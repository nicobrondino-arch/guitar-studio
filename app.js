/**
 * app.js - Lógica principal de Guitar Studio.
 * Controla navegación SPA, internacionalización (ES/EN), temporizadores,
 * metrónomo de UI, persistencia de racha (LocalStorage), base de datos (IndexedDB)
 * para Guitar Pro y la biblioteca de ejercicios.
 */

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
        "right-hand-default-desc": "Toca cuerdas al aire en patrón de arpegio: Pulgar en los bajos (6ª, 5ª o 4ª), Índice en 3ª, Medio en 2ª y Anular en 1ª cuerda. Uniformidad y regularidad."
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
        "right-hand-default-desc": "Play open strings in an arpeggio pattern: Thumb on bass strings, Index on 3rd, Middle on 2nd, Ring on 1st. Regularity and volume control."
    }
};

// ==========================================================================
// 2. Base de Datos IndexedDB (Para archivos de Guitar Pro)
// ==========================================================================
class TabDatabase {
    constructor() {
        this.dbName = "GuitarStudioDB";
        this.dbVersion = 1;
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
        snippet: "E |---5h6---5h6---5h6------------------|"
    },
    {
        id: "ex-left-2",
        category: "left",
        difficulty: "medium",
        nameEs: "2. Independencia de Dedos (1-3-2-4)",
        nameEn: "2. Finger Independence (1-3-2-4)",
        descEs: "Digitación salteada para entrenar la independencia cerebral de los dedos de la mano izquierda en cuerdas altas. Mantén velocidad lenta.",
        descEn: "Skipped fingering pattern to train cognitive independence of left hand fingers on high strings. Keep a slow tempo.",
        snippet: "E |---5---7---6---8--------------------|"
    },
    {
        id: "ex-right-1",
        category: "right",
        difficulty: "easy",
        nameEs: "1. Trémolo Básico (P-I-M-A alternado)",
        nameEn: "1. Basic Tremolo (Alternated P-I-M-A)",
        descEs: "Toque continuo y rápido de una sola cuerda (ej. 1ª cuerda) alternando dedos anular-medio-índice, precedido por el pulgar en el bajo.",
        descEn: "Continuous, fast plucking of a single string (e.g. 1st string) alternating ring-middle-index fingers, preceded by thumb on bass.",
        snippet: "E |-------0-0-0-------0-0-0------------|\nB |------------------------------------|\nG |------------------------------------|\nD |---0-----------0--------------------|"
    },
    {
        id: "ex-right-2",
        category: "right",
        difficulty: "hard",
        nameEs: "2. Sweep Picking de 3 Cuerdas",
        nameEn: "2. 3-String Sweep Picking",
        descEs: "Desliza la púa hacia abajo a través de 3 cuerdas en un solo movimiento fluido (barrido), y luego hacia arriba. Sincroniza con la mano izquierda.",
        descEn: "Slide the pick downward across 3 strings in a single fluid sweeping motion, then upward. Synchronize with the left hand.",
        snippet: "E |---------12-15-12-------------------|\nB |-------13---------13----------------|\nG |-----14-------------14--------------|"
    },
    {
        id: "ex-reading-1",
        category: "reading",
        difficulty: "medium",
        nameEs: "1. Lectura en Primera Posición (Do Mayor)",
        nameEn: "1. First Position Reading (C Major)",
        descEs: "Lee notas limitándote a los primeros 4 trastes. Memoriza la ubicación de Do, Re, Mi, Fa, Sol, La, Si en pentagrama y mástil.",
        descEn: "Read notes restricted to the first 4 frets. Memorize the locations of C, D, E, F, G, A, B on both staff and fretboard.",
        snippet: "Notas: C (5ªC tr.3), D (4ªC al aire), E (4ªC tr.2)"
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

        // Base de datos y metrónomo
        this.db = new TabDatabase();
        this.metronome = new Metronome();
        
        // AlphaTab Player
        this.atApi = null;
        this.atIsPlaying = false;
        
        // Intervalos de temporizadores del Modo Práctica
        this.timers = [null, null, null]; // Para pasos 1, 2 y 3
        this.timerTimes = [300, 300, 300]; // 5 minutos en segundos
        this.timerIntervals = [null, null, null];
    }

    async init() {
        // Cargar configuración guardada
        this.lang = localStorage.getItem("studio-lang") || "es";
        this.streak = parseInt(localStorage.getItem("studio-streak") || "0", 10);
        this.lastPracticedDate = localStorage.getItem("studio-last-practiced") || "";
        this.history = JSON.parse(localStorage.getItem("studio-history") || "[]");
        
        // Cargar rutinas personalizadas de la biblioteca si existen
        this.activeLeftHandEx = JSON.parse(localStorage.getItem("studio-active-left") || "null");
        this.activeRightHandEx = JSON.parse(localStorage.getItem("studio-active-right") || "null");

        // Cargar estado de compleción diaria
        const todayStr = this.getTodayString();
        const lastReset = localStorage.getItem("studio-last-reset-check") || "";
        if (lastReset !== todayStr) {
            // Es un nuevo día, resetear los pasos completados
            this.completedSteps = [false, false, false, false];
            localStorage.setItem("completed-steps", JSON.stringify(this.completedSteps));
            localStorage.setItem("studio-last-reset-check", todayStr);
        } else {
            this.completedSteps = JSON.parse(localStorage.getItem("completed-steps") || "[false, false, false, false]");
        }

        // Inicializar Base de Datos
        await this.db.init();

        // Enlazar eventos de la UI
        this.bindEvents();
        
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
        localStorage.setItem("studio-streak", this.streak);
        localStorage.setItem("studio-last-practiced", this.lastPracticedDate);
        localStorage.setItem("studio-history", JSON.stringify(this.history));
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

        // Botones e interfaz del visor de Guitar Pro (AlphaTab)
        document.getElementById("btn-gp-play").addEventListener("click", () => this.toggleGPPlayer());
        document.getElementById("btn-gp-stop").addEventListener("click", () => this.stopGPPlayer());
        
        const speedSlider = document.getElementById("gp-speed-slider");
        speedSlider.addEventListener("input", (e) => {
            const speed = parseInt(e.target.value, 10);
            document.getElementById("gp-speed-text").textContent = `${speed}%`;
            if (this.atApi) {
                this.atApi.playbackSpeed = speed / 100.0;
            }
        });

        // Control de Zoom de Guitar Pro
        let currentZoom = 100;
        const zoomText = document.getElementById("gp-zoom-text");
        
        document.getElementById("btn-gp-zoom-in").addEventListener("click", () => {
            if (currentZoom < 200) {
                currentZoom += 10;
                zoomText.textContent = `${currentZoom}%`;
                if (this.atApi) {
                    this.atApi.updateSettings({
                        display: {
                            scale: currentZoom / 100.0
                        }
                    });
                    this.atApi.render();
                }
            }
        });

        document.getElementById("btn-gp-zoom-out").addEventListener("click", () => {
            if (currentZoom > 50) {
                currentZoom -= 10;
                zoomText.textContent = `${currentZoom}%`;
                if (this.atApi) {
                    this.atApi.updateSettings({
                        display: {
                            scale: currentZoom / 100.0
                        }
                    });
                    this.atApi.render();
                }
            }
        });

        document.getElementById("btn-gp-loop").addEventListener("click", (e) => {
            e.target.classList.toggle("active");
            if (this.atApi) {
                this.atApi.isLooping = e.target.classList.contains("active");
            }
        });

        document.getElementById("btn-gp-metro").addEventListener("click", (e) => {
            e.target.classList.toggle("active");
            if (this.atApi) {
                const vol = e.target.classList.contains("active") 
                    ? (parseInt(document.getElementById("gp-metro-volume").value, 10) / 100.0) 
                    : 0.0;
                this.atApi.metronomeVolume = vol;
            }
        });

        // Control de volumen del metrónomo de Guitar Pro
        const gpMetroVolSlider = document.getElementById("gp-metro-volume");
        gpMetroVolSlider.addEventListener("input", (e) => {
            const vol = parseInt(e.target.value, 10) / 100.0;
            if (this.atApi) {
                const isMetroActive = document.getElementById("btn-gp-metro").classList.contains("active");
                if (isMetroActive) {
                    this.atApi.metronomeVolume = vol;
                }
            }
        });

        document.getElementById("gp-track-select").addEventListener("change", (e) => {
            const trackIndex = parseInt(e.target.value, 10);
            if (this.atApi && this.atApi.score && this.atApi.score.tracks[trackIndex]) {
                this.atApi.renderTracks([this.atApi.score.tracks[trackIndex]]);
            }
        });
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

        // Gestión de la cabecera dinámica
        const titleBox = document.getElementById("header-page-title-box");
        const stepsList = document.getElementById("header-steps-list");
        const titleEl = document.getElementById("header-title");

        if (viewId === 'practice') {
            titleBox.style.display = "none";
            stepsList.style.display = "flex";
            
            // Si entramos al Modo Práctica y el paso 4 está seleccionado, inicializar
            const activeStep = document.querySelector(".header-step-item.active");
            if (activeStep && activeStep.getAttribute("data-step") === "4") {
                this.initAlphaTabPlayerIfNeeded();
            }
        } else {
            titleBox.style.display = "block";
            stepsList.style.display = "none";
            
            // Cambiar título según la vista activa
            if (viewId === 'studio') {
                titleEl.textContent = this.lang === 'es' ? 'Mi Estudio' : 'My Studio';
                titleEl.setAttribute('data-i18n', 'nav-studio');
            } else if (viewId === 'notebook') {
                titleEl.textContent = this.lang === 'es' ? 'Cuaderno del Profesor' : "Teacher's Notebook";
                titleEl.setAttribute('data-i18n', 'notebook-title');
            } else if (viewId === 'library') {
                titleEl.textContent = this.lang === 'es' ? 'Biblioteca de Estudio' : 'Study Library';
                titleEl.setAttribute('data-i18n', 'library-title');
            }
        }
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

        // Si entramos al paso 4 (Guitar Pro), asegurar que se inicialice o re-renderice
        if (stepNum === 4) {
            // Dar tiempo al navegador para que aplique el display y haga visible el contenedor
            setTimeout(() => {
                this.initAlphaTabPlayerIfNeeded();
                if (this.atApi) {
                    this.atApi.render();
                }
            }, 100);
        }
    }

    // ==========================================================================
    // 5. Multiidioma y Traducciones
    // ==========================================================================
    changeLanguage(lang) {
        if (this.lang === lang) return;
        this.lang = lang;
        localStorage.setItem("studio-lang", lang);
        this.updateLanguageUI();
        this.updateStreakUI();
        this.renderLibraryExercises();
        this.updatePracticeExercisesUI();
        this.loadTeacherNotesUI();
    }

    updateLanguageUI() {
        // Alternar botones activos de idioma
        if (this.lang === "es") {
            document.getElementById("btn-lang-es").classList.add("active");
            document.getElementById("btn-lang-en").classList.remove("active");
            document.getElementById("header-title").textContent = "Hola, Guitarrista";
            
            // Fecha en Español
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById("header-date").textContent = new Date().toLocaleDateString('es-ES', options);
        } else {
            document.getElementById("btn-lang-es").classList.remove("active");
            document.getElementById("btn-lang-en").classList.add("active");
            document.getElementById("header-title").textContent = "Hello, Guitarist";
            
            // Fecha en Inglés
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById("header-date").textContent = new Date().toLocaleDateString('en-US', options);
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
    toggleTimer(stepIndex) {
        const timerId = stepIndex - 1;
        const btn = document.getElementById(`btn-timer-start-${stepIndex}`);
        
        if (this.timerIntervals[timerId]) {
            // Pausar
            clearInterval(this.timerIntervals[timerId]);
            this.timerIntervals[timerId] = null;
            btn.textContent = this.lang === "es" ? "Iniciar Reloj" : "Start Clock";
        } else {
            // Iniciar
            this.timerIntervals[timerId] = setInterval(() => {
                this.timerTimes[timerId]--;
                this.updateTimerDisplay(stepIndex);
                
                if (this.timerTimes[timerId] <= 0) {
                    clearInterval(this.timerIntervals[timerId]);
                    this.timerIntervals[timerId] = null;
                    btn.textContent = this.lang === "es" ? "Completado" : "Completed";
                    this.playTimerAlert();
                }
            }, 1000);
            
            btn.textContent = this.lang === "es" ? "Pausar" : "Pause";
        }
    }

    resetTimer(stepIndex) {
        const timerId = stepIndex - 1;
        if (this.timerIntervals[timerId]) {
            clearInterval(this.timerIntervals[timerId]);
            this.timerIntervals[timerId] = null;
        }
        this.timerTimes[timerId] = 300; // Reset a 5 minutos
        this.updateTimerDisplay(stepIndex);
        
        const btn = document.getElementById(`btn-timer-start-${stepIndex}`);
        btn.textContent = this.lang === "es" ? "Iniciar Reloj" : "Start Clock";
    }

    updateTimerDisplay(stepIndex) {
        const timerId = stepIndex - 1;
        const minutes = Math.floor(this.timerTimes[timerId] / 60);
        const seconds = this.timerTimes[timerId] % 60;
        
        const displayStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById(`timer-display-${stepIndex}`).textContent = displayStr;
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
        localStorage.setItem("completed-steps", JSON.stringify(this.completedSteps));
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
        localStorage.setItem("studio-teacher-notes", JSON.stringify(notesObj));
        
        // Actualizar UI
        this.loadTeacherNotesUI();
        
        // Animación de éxito
        const msg = document.getElementById("save-status-msg");
        msg.textContent = TRANSLATIONS[this.lang]["note-saved-success"];
        msg.classList.add("show");
        setTimeout(() => msg.classList.remove("show"), 3000);
    }

    loadTeacherNotesUI() {
        const notesRaw = localStorage.getItem("studio-teacher-notes");
        const container = document.getElementById("teacher-notes-preview");
        const wizardFocusName = document.getElementById("wizard-gp-step").querySelector(".step-label");
        
        if (notesRaw) {
            const notes = JSON.parse(notesRaw);
            
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
                await this.db.saveScore(file.name, arrayBuffer);
                
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
        const score = await this.db.getScore();
        const fileLoadedName = document.getElementById("file-loaded-name");
        const btnDelete = document.getElementById("btn-delete-gp-file");
        
        if (score) {
            fileLoadedName.textContent = score.name;
            fileLoadedName.style.color = "var(--tb-text-primary)";
            btnDelete.style.display = "block";
            
            // Ocultar placeholder del visor en Modo Práctica
            document.getElementById("alphatab-placeholder").style.display = "none";
            document.getElementById("alphaTab").style.display = "block";
            document.getElementById("alphatab-controls").style.display = "flex";
            
            // Si estamos en la vista de práctica y el paso 4 está activo, inicializar/cargar
            const practiceViewActive = document.getElementById("view-practice").classList.contains("active");
            const step4Active = document.querySelector(".wizard-step-item[data-step='4']").classList.contains("active");
            if (practiceViewActive && step4Active) {
                this.initAlphaTabPlayerIfNeeded();
            }
        } else {
            fileLoadedName.textContent = TRANSLATIONS[this.lang]["no-file-loaded"];
            fileLoadedName.style.color = "var(--tb-text-muted)";
            btnDelete.style.display = "none";
            
            document.getElementById("alphatab-placeholder").style.display = "flex";
            document.getElementById("alphaTab").style.display = "none";
            document.getElementById("alphatab-controls").style.display = "none";
            
            // Destruir reproductor si existe
            if (this.atApi) {
                this.atApi.destroy();
                this.atApi = null;
            }
        }
    }

    async deleteGPFile() {
        if (confirm(this.lang === "es" ? "¿Seguro que quieres eliminar la partitura?" : "Are you sure you want to delete the score?")) {
            await this.db.deleteScore();
            this.loadWeeklyGPFile();
        }
    }

    async initAlphaTabPlayerIfNeeded() {
        const score = await this.db.getScore();
        if (!score) return;
        
        // Si ya está inicializado, no hacer nada
        if (this.atApi) return;

        // Comprobar si la librería de AlphaTab está cargada
        if (typeof alphaTab === 'undefined') {
            console.warn("AlphaTab library not loaded yet.");
            return;
        }

        const element = document.getElementById("alphaTab");
        
        // Asegurar visibilidad del elemento antes de inicializar
        element.style.display = "block";
        document.getElementById("alphatab-placeholder").style.display = "none";
        document.getElementById("alphatab-controls").style.display = "flex";
        
        try {
            // Inicializar AlphaTab API con diseño de alta visibilidad en papel (estilo Soundslice)
            this.atApi = new alphaTab.AlphaTabApi(element, {
                player: {
                    enablePlayer: true,
                    soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.3.0/dist/soundfont/sonivox.sf2',
                    enableBackingTracks: true,
                    scrollElement: document.querySelector('.alphatab-wrapper') // Comportamiento de scroll tipo Soundslice
                },
                display: {
                    layoutMode: 'page', // Forzar diseño de página vertical (no horizontal)
                    width: -1, // Autoajuste dinámico al contenedor
                    resources: {
                        // Carga la fuente de notación desde el CDN de AlphaTab
                        musicFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.3.0/dist/font/alphaTab.woff',
                        // Paleta clásica de partituras de alta visibilidad (fondo blanco papel)
                        staffLineColor: '#dddddd',
                        barSeparatorColor: '#cccccc',
                        mainGlyphColor: '#111111',
                        secondaryGlyphColor: '#111111',
                        scoreInfoColor: '#111111',
                        barNumberColor: '#888888',
                    }
                }
            });

            // Enlazar cargado de pistas
            this.atApi.scoreLoaded.on((s) => {
                const trackSelect = document.getElementById("gp-track-select");
                trackSelect.innerHTML = "";
                
                s.tracks.forEach((track, index) => {
                    const option = document.createElement("option");
                    option.value = index;
                    option.textContent = track.name;
                    trackSelect.appendChild(option);
                });
                
                // Renderizar la primera pista
                if (s.tracks.length > 0) {
                    this.atApi.renderTracks([s.tracks[0]]);
                }
            });

            this.atApi.playerReady.on(() => {
                console.log("AlphaTab Player is ready.");
            });

            // Cargar los bytes guardados en la BD
            this.atApi.load(new Uint8Array(score.bytes));
            
        } catch (error) {
            console.error("AlphaTab error during initialization:", error);
        }
    }

    toggleGPPlayer() {
        if (!this.atApi) return;
        
        const btnPlay = document.getElementById("btn-gp-play");
        
        if (this.atIsPlaying) {
            this.atApi.pause();
            btnPlay.querySelector("span").textContent = this.lang === "es" ? "Reproducir" : "Play";
            this.atIsPlaying = false;
        } else {
            // Reanudar contexto si hace falta
            if (this.metronome.audioContext) {
                this.metronome.audioContext.resume();
            }
            
            this.atApi.play();
            btnPlay.querySelector("span").textContent = this.lang === "es" ? "Pausar" : "Pause";
            this.atIsPlaying = true;
        }
    }

    stopGPPlayer() {
        if (!this.atApi) return;
        this.atApi.stop();
        document.getElementById("btn-gp-play").querySelector("span").textContent = this.lang === "es" ? "Reproducir" : "Play";
        this.atIsPlaying = false;
    }

    // ==========================================================================
    // 10. Biblioteca de Ejercicios (Visualización y Asignación)
    // ==========================================================================
    renderLibraryExercises() {
        const grid = document.getElementById("library-exercises-grid");
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
                <div class="library-card-ill" style="white-space: pre; font-family: monospace;">${ex.snippet}</div>
                <button class="btn btn-outline btn-sm btn-load-ex" data-id="${ex.id}" style="margin-top: 10px; width: 100%;">
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
            localStorage.setItem("studio-active-left", JSON.stringify(ex));
            alert(this.lang === "es" 
                ? "Ejercicio cargado en tu rutina de Mano Izquierda." 
                : "Exercise loaded into your Left Hand routine.");
        } else if (ex.category === "right") {
            this.activeRightHandEx = ex;
            localStorage.setItem("studio-active-right", JSON.stringify(ex));
            alert(this.lang === "es" 
                ? "Ejercicio cargado en tu rutina de Mano Derecha." 
                : "Exercise loaded into your Right Hand routine.");
        } else if (ex.category === "reading") {
            alert(this.lang === "es"
                ? "Para lectura, la biblioteca sirve de guía. Recuerda practicar la partitura correspondiente en el paso 3."
                : "For reading, the library serves as a guide. Remember to practice your score in step 3.");
        }

        this.updatePracticeExercisesUI();
    }

    updatePracticeExercisesUI() {
        // Mano Izquierda
        const leftNameEl = document.getElementById("left-hand-ex-name");
        const leftDescEl = document.getElementById("left-hand-ex-desc");
        const leftSnippet = document.querySelector("#left-hand-ex-ill .tab-snippet");
        
        if (this.activeLeftHandEx) {
            leftNameEl.textContent = this.lang === "es" ? this.activeLeftHandEx.nameEs : this.activeLeftHandEx.nameEn;
            leftDescEl.textContent = this.lang === "es" ? this.activeLeftHandEx.descEs : this.activeLeftHandEx.descEn;
            leftSnippet.innerHTML = `<span class="tab-string">${this.activeLeftHandEx.snippet.replace(/\n/g, '<br>')}</span>`;
        } else {
            leftNameEl.textContent = TRANSLATIONS[this.lang]["left-hand-default-name"];
            leftDescEl.textContent = TRANSLATIONS[this.lang]["left-hand-default-desc"];
            leftSnippet.innerHTML = `<span class="tab-string">E |---1---2---3---4-------------------|</span><br><span class="tab-string">B |-------------------1---2---3---4---|</span>`;
        }

        // Mano Derecha
        const rightNameEl = document.getElementById("right-hand-ex-name");
        const rightDescEl = document.getElementById("right-hand-ex-desc");
        const rightSnippet = document.querySelector("#right-hand-ex-ill .tab-snippet");
        
        if (this.activeRightHandEx) {
            rightNameEl.textContent = this.lang === "es" ? this.activeRightHandEx.nameEs : this.activeRightHandEx.nameEn;
            rightDescEl.textContent = this.lang === "es" ? this.activeRightHandEx.descEs : this.activeRightHandEx.descEn;
            rightSnippet.innerHTML = `<span class="tab-string">${this.activeRightHandEx.snippet.replace(/\n/g, '<br>')}</span>`;
        } else {
            rightNameEl.textContent = TRANSLATIONS[this.lang]["right-hand-default-name"];
            rightDescEl.textContent = TRANSLATIONS[this.lang]["right-hand-default-desc"];
            rightSnippet.innerHTML = `<span class="tab-string">E |-----------0-----------------------|</span><br><span class="tab-string">B |-------0-------0-------------------|</span><br><span class="tab-string">G |---0---------------0---------------|</span><br><span class="tab-string">E |-0---------------------------------|</span>`;
        }
    }
}

// Inicializar la aplicación al cargar el DOM
window.app = new GuitarStudioApp();
document.addEventListener("DOMContentLoaded", () => {
    window.app.init().catch(err => {
        console.error("Error initializing app:", err);
    });
});

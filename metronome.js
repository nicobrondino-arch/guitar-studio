/**
 * metronome.js - Un metrónomo de alta precisión temporal utilizando Web Audio API.
 * Sigue la técnica de "dos relojes" (lookahead scheduling) para evitar retrasos
 * en el hilo principal de Javascript.
 */
class Metronome {
    constructor(bpm = 120) {
        this.audioContext = null;
        this.isPlaying = false;
        this.bpm = bpm;
        this.volume = 0.8; // Volumen inicial del metrónomo (0.0 a 1.0)
        
        this.currentBeat = 0;
        this.beatsPerMeasure = 4;
        
        // Intervalos de control del planificador
        this.lookahead = 25.0; // Milisegundos entre llamadas del planificador
        this.scheduleAheadTime = 0.1; // Segundos a planificar en el futuro
        this.nextNoteTime = 0.0; // Cuándo debe sonar la próxima nota (tiempo del AudioContext)
        this.intervalId = null;
        
        // Callbacks de evento para animar la interfaz
        this.onBeatCallback = null;
    }

    initAudio() {
        if (!this.audioContext) {
            // Inicializar el contexto de audio (soportando navegadores antiguos)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    start() {
        this.initAudio();
        
        // Si el contexto está en pausa (restricción del navegador), reanudarlo
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.isPlaying = true;
        this.currentBeat = 0;
        this.nextNoteTime = this.audioContext.currentTime + 0.05;
        
        // Iniciar el bucle de planificación
        this.intervalId = setInterval(() => this.scheduler(), this.lookahead);
    }

    stop() {
        this.isPlaying = false;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
        return this.isPlaying;
    }

    setBpm(bpm) {
        this.bpm = Math.max(40, Math.min(250, bpm));
    }

    // Planificador de notas: comprueba si hay notas que deban sonar pronto
    scheduler() {
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeat, this.nextNoteTime);
            this.nextBeat();
        }
    }

    // Avanzar al siguiente pulso
    nextBeat() {
        const secondsPerBeat = 60.0 / this.bpm;
        this.nextNoteTime += secondsPerBeat; // Añadir la duración de un pulso al tiempo de inicio
        
        // Incrementar y ciclar el compás
        this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
    }

    // Programar el oscilador para producir el sonido de "beep"
    scheduleNote(beatNumber, time) {
        // Crear oscilador y ganancia
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Frecuencia del beep: Primer pulso del compás es más agudo
        if (beatNumber === 0) {
            osc.frequency.setValueAtTime(1000, time); // Pulso principal (1000 Hz)
        } else {
            osc.frequency.setValueAtTime(600, time);  // Pulsos débiles (600 Hz)
        }
        
        // Programar volumen (ataque corto, decaimiento rápido para un sonido nítido "clic")
        gainNode.gain.setValueAtTime(this.volume, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08); // Decae en 80ms
        
        // Programar reproducción del oscilador
        osc.start(time);
        osc.stop(time + 0.1);
        
        // Invocar el callback en el hilo principal para actualizar la UI en sincronía
        if (this.onBeatCallback) {
            // Calculamos el retraso en milisegundos desde el tiempo actual de JS para sincronizar visualmente
            const delay = (time - this.audioContext.currentTime) * 1000;
            setTimeout(() => {
                if (this.isPlaying) {
                    this.onBeatCallback(beatNumber);
                }
            }, Math.max(0, delay));
        }
    }

    onBeat(callback) {
        this.onBeatCallback = callback;
    }
}

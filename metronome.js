/**
 * metronome.js — stub para preview en desarrollo.
 * El metronome real vive en el proyecto local del usuario.
 */
class Metronome {
    constructor() {
        this.bpm = 80;
        this.beatsPerMeasure = 4;
        this.isPlaying = false;
    }
    start() {}
    stop() {}
    setBpm(bpm) { this.bpm = bpm; }
    setBeatsPerMeasure(n) { this.beatsPerMeasure = n; }
    toggle() { this.isPlaying = !this.isPlaying; }
    onBeat(cb) { this._beatCb = cb; }
    destroy() {}
}

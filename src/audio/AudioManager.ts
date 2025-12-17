
export class AudioManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private bgmGain: GainNode | null = null;

    // Settings
    private isMuted: boolean = false;
    private volMaster: number = 0.5;
    private volSfx: number = 0.8;
    private volBgm: number = 0.4;

    // BGM State
    private isPlayingBgm: boolean = false;
    // private bgmOscillators: OscillatorNode[] = [];
    // private bgmTimer: number = 0;
    // private nextNoteTime: number = 0;
    // private noteIndex: number = 0;
    // private bpm: number = 180; // Fast-ish 8-bit style

    constructor() {
        // Init happens on user interaction usually, but we can setup structure
    }

    public async init() {
        if (this.ctx) return;

        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.sfxGain = this.ctx.createGain();
            this.bgmGain = this.ctx.createGain();

            this.masterGain.connect(this.ctx.destination);
            this.sfxGain.connect(this.masterGain);
            this.bgmGain.connect(this.masterGain);

            this.updateVolumes();
        } catch (e) {
            console.error("Audio init failed", e);
        }
    }

    private updateVolumes() {
        if (!this.masterGain || !this.sfxGain || !this.bgmGain || !this.ctx) return;

        const now = this.ctx.currentTime;
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volMaster, now);
        this.sfxGain.gain.setValueAtTime(this.volSfx, now);
        this.bgmGain.gain.setValueAtTime(this.volBgm, now);
    }

    public setMute(mute: boolean) {
        this.isMuted = mute;
        this.updateVolumes();
    }

    // --- SFX ---

    public playSelect() {
        if (!this.ctx || !this.sfxGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square'; // 8-bit style
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    public playDrop() {
        if (!this.ctx || !this.sfxGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle'; // Thud
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    public playClear() {
        if (!this.ctx || !this.sfxGain) return;

        // Arpeggio up
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C

        notes.forEach((freq, i) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);

            gain.gain.setValueAtTime(0.1, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.1);

            osc.connect(gain);
            // safe check
            if (this.sfxGain) gain.connect(this.sfxGain);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.1);
        });
    }

    public playGameOver(win: boolean) {
        if (!this.ctx || !this.sfxGain) return;

        if (win) {
            // Happy
            this.playClear(); // Re-use clear for simple win now, maybe elaborate
        } else {
            // Sad slide
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.5);
        }
    }

    // --- BGM (Procedural) ---
    private bgmNodes: { osc: OscillatorNode, gain: GainNode }[] = [];
    private bgmTimeout: number | null = null;

    public toggleBgm() {
        if (this.isMuted) {
            this.setMute(false);
            if (!this.isPlayingBgm) {
                this.startBgm();
            }
        } else {
            this.setMute(true);
        }
    }

    public isBgmPlaying() {
        return !this.isMuted;
    }

    public startBgm() {
        if (!this.ctx) return;
        if (this.isPlayingBgm) return;

        this.isPlayingBgm = true;
        this.playBGMLoop();
    }

    private playBGMLoop() {
        if (!this.isPlayingBgm || !this.ctx || !this.bgmGain) return;

        const bpm = 128;
        const beatDuration = 60 / bpm; // ~0.46s
        const now = this.ctx.currentTime;

        // 1. Bass Line (Disabled per user request)
        /*
        const bassNotes = [55, 55, 73, 55, 55, 55, 73, 82]; // A1...
        bassNotes.forEach((freq, i) => {
            if (!this.ctx || !this.bgmGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.value = freq;

            const startTime = now + i * beatDuration;
            const duration = beatDuration;

            // Envelope
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 0.9);

            osc.connect(gain);
            gain.connect(this.bgmGain);

            osc.start(startTime);
            osc.stop(startTime + duration);

            this.bgmNodes.push({ osc, gain });
        });
        */

        // 2. Chords (Pads)
        const chordNotes = [220, 277, 330]; // A3, C#4, E4 (A Major)
        chordNotes.forEach(freq => {
            if (!this.ctx || !this.bgmGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0.05, now);
            // Sustain for almost full 8 beats
            gain.gain.linearRampToValueAtTime(0.05, now + beatDuration * 7);
            gain.gain.linearRampToValueAtTime(0, now + beatDuration * 8);

            osc.connect(gain);
            gain.connect(this.bgmGain);

            osc.start(now);
            osc.stop(now + beatDuration * 8);

            this.bgmNodes.push({ osc, gain });
        });

        // 3. Arpeggios
        const arpNotes = [440, 523, 659, 784, 659, 523, 440, 392];
        arpNotes.forEach((freq, i) => {
            if (!this.ctx || !this.bgmGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = now + i * beatDuration;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + beatDuration * 0.5);

            osc.connect(gain);
            gain.connect(this.bgmGain);

            osc.start(startTime);
            osc.stop(startTime + beatDuration * 0.6);

            this.bgmNodes.push({ osc, gain });
        });

        // Schedule Next Loop
        const loopDurationMs = beatDuration * 8 * 1000;

        // Cleanup old nodes occasionally or rely on stop() garbage collection?
        // JS WebAudio nodes are heavy. We should clear references after stop.
        // But for this simple loop, we just push new ones.
        // We need to clear `this.bgmNodes` references for finished notes eventually.
        // For simplicity: clear the array when stopping, or filter?
        // Actually, just pushing is dangerous for memory if we run forever?
        // The arrays grow.
        // Let's optimize: clear the array before starting new loop? 
        // No, current loop notes are playing.
        // Let's just track them. 
        // Ideally we filter out stopped nodes.
        // For now, let's just clear the array in `stopBgm` and not worry about per-loop cleanup 
        // (nodes disconnect themselves after stop? No, they stay connected until GC).
        // Best practice: onended event. 
        // Let's keep it simple: We only need `bgmNodes` for forceful stopping.
        // If we don't stop forcefully, they stop automatically.
        // So we can clear `bgmNodes` at start of loop if we are sure no overlap.
        // Arps and Bass don't overlap loops. Chords end at 8.
        // So safe to clear.
        this.bgmNodes = [];

        this.bgmTimeout = window.setTimeout(() => {
            if (this.isPlayingBgm) {
                this.playBGMLoop();
            }
        }, loopDurationMs - 50); // slight overlap/anticipation? logic says -50 to sync
    }

    public stopBgm() {
        this.isPlayingBgm = false;
        if (this.bgmTimeout !== null) {
            clearTimeout(this.bgmTimeout);
            this.bgmTimeout = null;
        }

        // Stop all currently playing nodes
        this.bgmNodes.forEach(node => {
            try {
                node.osc.stop();
                node.osc.disconnect();
                node.gain.disconnect();
            } catch (e) {
                // Ignore if already stopped
            }
        });
        this.bgmNodes = [];
    }
}

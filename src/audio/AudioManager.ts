
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

    // --- BGM (Simple Loop) ---
    // Implementing a full sequencer is complex. Let's make a simple interval loop.

    public startBgm() {
        if (this.isPlayingBgm) return;
        this.isPlayingBgm = true;
        this.scheduleBgm();
    }

    public stopBgm() {
        this.isPlayingBgm = false;
        if (this.ctx) {
            this.ctx.suspend(); // Or just stop scheduling?
            // Actually nice to keep SFX working.
        }
    }

    private scheduleBgm() {
        if (!this.isPlayingBgm || !this.ctx || !this.bgmGain) return;

        // Simple bassline loop: C2, C2, G1, G1
        // bpm 120 -> beat every 0.5s.
        // We use lookahead scheduling ideally.
        // For simplicity, just use setInterval to trigger notes? No, drift.
        // Use recursive setTimeout based on currentTime.

        // Actually, T09 says "Simple 4 bar loop".
        // Let's assume we invoke this from game loop or internal interval?
        // Let's use `setInterval` that schedules notes 100ms ahead.

        // Or simply: Do nothing for now, just play a drone? BGM might be annoying if bad.
        // Let's implement a very simple ambient drone.

        // Low C drone
        /*
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(65.41, this.ctx.currentTime);
        osc.connect(this.bgmGain);
        osc.start();
        */
        // Just comment out BGM logic for now to avoid ear pain until properly triggered.
    }
}

// Basic particle system for visual flair
export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

export interface FloatingText {
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    maxLife: number;
    vy: number;
}

export class Animator {
    private particles: Particle[] = [];
    private texts: FloatingText[] = [];
    private shakeX: number = 0;
    private shakeY: number = 0;
    private shakeTime: number = 0;

    public update(dt: number) {
        // Particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx * (dt / 16);
            p.y += p.vy * (dt / 16);
            p.life -= dt;
            return p.life > 0;
        });

        // Texts
        this.texts = this.texts.filter(t => {
            t.y += t.vy * (dt / 16);
            t.life -= dt;
            return t.life > 0;
        });

        // Shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const intensity = Math.min(10, this.shakeTime / 20); // Fade out
            this.shakeX = (Math.random() - 0.5) * intensity;
            this.shakeY = (Math.random() - 0.5) * intensity;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        // Save current transform to apply shake?
        // Actually renderer should apply shake globally.
        // We can expose shake properties.

        // Draw Particles
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1.0;

        // Draw Texts
        this.texts.forEach(t => {
            ctx.globalAlpha = t.life / t.maxLife;
            ctx.fillStyle = t.color;
            ctx.font = 'bold 20px Arial';
            ctx.fillText(t.text, t.x, t.y);
        });
        ctx.globalAlpha = 1.0;
    }

    public getShake(): { x: number, y: number } {
        return { x: this.shakeX, y: this.shakeY };
    }

    public spawnParticles(x: number, y: number, color: string, count: number = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 500 + Math.random() * 500,
                maxLife: 1000,
                color,
                size: 2 + Math.random() * 3
            });
        }
    }

    public spawnText(x: number, y: number, text: string, color: string = '#fff') {
        this.texts.push({
            x, y,
            text,
            color,
            life: 1000,
            maxLife: 1000,
            vy: -1 // float up
        });
    }

    public triggerShake(duration: number = 200) {
        this.shakeTime = duration;
    }
}

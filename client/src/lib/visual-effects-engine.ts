// Visual Effects Engine
// Adds professional visual effects: particles, overlays, filters, transitions

export interface ParticleConfig {
  type: 'health-icons' | 'sparkles' | 'floating-shapes' | 'medical-symbols';
  count: number;
  color: string;
  size: number;
  speed: number;
  opacity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  type: string;
  lifespan: number;
  age: number;
}

export interface OverlayEffect {
  type: 'light-leak' | 'vignette' | 'film-grain' | 'lens-flare' | 'bokeh';
  intensity: number;
  color?: string;
}

export interface ColorGradingPreset {
  name: string;
  contrast: number;
  brightness: number;
  saturation: number;
  temperature: number; // -100 to 100 (cool to warm)
  tint: number; // -100 to 100 (green to magenta)
}

export class VisualEffectsEngine {
  private particles: Particle[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Initialize particles for animation
   */
  initializeParticles(config: ParticleConfig): void {
    this.particles = [];

    for (let i = 0; i < config.count; i++) {
      this.particles.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        vx: (Math.random() - 0.5) * config.speed,
        vy: (Math.random() - 0.5) * config.speed,
        size: config.size * (0.5 + Math.random() * 0.5),
        opacity: config.opacity * (0.5 + Math.random() * 0.5),
        color: config.color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        type: config.type,
        lifespan: 300 + Math.random() * 300, // frames
        age: 0
      });
    }
  }

  /**
   * Update particles position
   */
  updateParticles(): void {
    this.particles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.rotationSpeed;
      particle.age++;

      // Wrap around edges
      if (particle.x < 0) particle.x = this.canvasWidth;
      if (particle.x > this.canvasWidth) particle.x = 0;
      if (particle.y < 0) particle.y = this.canvasHeight;
      if (particle.y > this.canvasHeight) particle.y = 0;

      // Fade out near end of lifespan
      if (particle.age > particle.lifespan * 0.8) {
        const fadeProgress = (particle.age - particle.lifespan * 0.8) / (particle.lifespan * 0.2);
        particle.opacity *= (1 - fadeProgress);
      }
    });

    // Remove dead particles
    this.particles = this.particles.filter(p => p.age < p.lifespan);
  }

  /**
   * Render particles on canvas
   */
  renderParticles(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach(particle => {
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);

      switch (particle.type) {
        case 'health-icons':
          this.drawHealthIcon(ctx, particle);
          break;
        case 'sparkles':
          this.drawSparkle(ctx, particle);
          break;
        case 'floating-shapes':
          this.drawFloatingShape(ctx, particle);
          break;
        case 'medical-symbols':
          this.drawMedicalSymbol(ctx, particle);
          break;
      }

      ctx.restore();
    });
  }

  /**
   * Draw health icon (leaf, heart, plus)
   */
  private drawHealthIcon(ctx: CanvasRenderingContext2D, particle: Particle): void {
    const icons = ['leaf', 'heart', 'plus'];
    const icon = icons[Math.floor(particle.age) % icons.length];

    ctx.fillStyle = particle.color;
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = 2;

    switch (icon) {
      case 'leaf':
        // Simple leaf shape
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size, particle.size * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-particle.size / 2, -particle.size);
        ctx.lineTo(particle.size / 2, particle.size);
        ctx.stroke();
        break;

      case 'heart':
        // Heart shape
        ctx.beginPath();
        ctx.moveTo(0, particle.size / 4);
        ctx.bezierCurveTo(-particle.size / 2, -particle.size / 4, -particle.size, particle.size / 4, 0, particle.size);
        ctx.bezierCurveTo(particle.size, particle.size / 4, particle.size / 2, -particle.size / 4, 0, particle.size / 4);
        ctx.fill();
        break;

      case 'plus':
        // Plus sign
        ctx.fillRect(-particle.size / 6, -particle.size / 2, particle.size / 3, particle.size);
        ctx.fillRect(-particle.size / 2, -particle.size / 6, particle.size, particle.size / 3);
        break;
    }
  }

  /**
   * Draw sparkle effect
   */
  private drawSparkle(ctx: CanvasRenderingContext2D, particle: Particle): void {
    ctx.fillStyle = particle.color;

    // Four-pointed star
    const points = 4;
    const innerRadius = particle.size / 3;
    const outerRadius = particle.size;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI / points) * i;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();

    // Add glow
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = particle.size;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  /**
   * Draw floating shape (circle, square, triangle)
   */
  private drawFloatingShape(ctx: CanvasRenderingContext2D, particle: Particle): void {
    const shapes = ['circle', 'square', 'triangle'];
    const shape = shapes[Math.floor(particle.age) % shapes.length];

    ctx.fillStyle = particle.color;

    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'square':
        ctx.fillRect(-particle.size, -particle.size, particle.size * 2, particle.size * 2);
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -particle.size);
        ctx.lineTo(particle.size, particle.size);
        ctx.lineTo(-particle.size, particle.size);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  /**
   * Draw medical symbol
   */
  private drawMedicalSymbol(ctx: CanvasRenderingContext2D, particle: Particle): void {
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = 2;

    // Medical cross or DNA helix
    const symbol = Math.floor(particle.age) % 2 === 0 ? 'cross' : 'dna';

    if (symbol === 'cross') {
      // Red cross
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size / 4, -particle.size, particle.size / 2, particle.size * 2);
      ctx.fillRect(-particle.size, -particle.size / 4, particle.size * 2, particle.size / 2);
    } else {
      // Simple DNA helix
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const y = (i / 10) * particle.size * 2 - particle.size;
        const x = Math.sin(i * 0.5) * particle.size / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }

  /**
   * Apply overlay effect to canvas
   */
  applyOverlay(ctx: CanvasRenderingContext2D, effect: OverlayEffect): void {
    switch (effect.type) {
      case 'vignette':
        this.applyVignette(ctx, effect.intensity);
        break;
      case 'film-grain':
        this.applyFilmGrain(ctx, effect.intensity);
        break;
      case 'light-leak':
        this.applyLightLeak(ctx, effect.intensity, effect.color || '#ffa500');
        break;
      case 'lens-flare':
        this.applyLensFlare(ctx, effect.intensity);
        break;
      case 'bokeh':
        this.applyBokeh(ctx, effect.intensity);
        break;
    }
  }

  /**
   * Apply vignette effect (darkened corners)
   */
  private applyVignette(ctx: CanvasRenderingContext2D, intensity: number): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const maxRadius = Math.sqrt(centerX ** 2 + centerY ** 2);

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, maxRadius
    );

    gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
    gradient.addColorStop(0.6, `rgba(0, 0, 0, 0)`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity * 0.7})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  /**
   * Apply film grain effect
   */
  private applyFilmGrain(ctx: CanvasRenderingContext2D, intensity: number): void {
    const imageData = ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const noise = (Math.random() - 0.5) * intensity * 255;
      pixels[i] += noise;     // R
      pixels[i + 1] += noise; // G
      pixels[i + 2] += noise; // B
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Apply light leak effect
   */
  private applyLightLeak(ctx: CanvasRenderingContext2D, intensity: number, color: string): void {
    const gradient = ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);

    // Parse color (simplified - assumes hex format)
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensity * 0.3})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${intensity * 0.2})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  /**
   * Apply lens flare effect
   */
  private applyLensFlare(ctx: CanvasRenderingContext2D, intensity: number): void {
    const x = this.canvasWidth * 0.7;
    const y = this.canvasHeight * 0.3;

    // Main flare
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 200);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.5})`);
    gradient.addColorStop(0.3, `rgba(255, 255, 200, ${intensity * 0.2})`);
    gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  /**
   * Apply bokeh effect (subtle circular highlights)
   */
  private applyBokeh(ctx: CanvasRenderingContext2D, intensity: number): void {
    const bokehCount = 20;
    ctx.globalAlpha = intensity * 0.3;

    for (let i = 0; i < bokehCount; i++) {
      const x = Math.random() * this.canvasWidth;
      const y = Math.random() * this.canvasHeight;
      const radius = 20 + Math.random() * 40;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Apply color grading preset
   */
  applyColorGrading(ctx: CanvasRenderingContext2D, preset: ColorGradingPreset): void {
    const imageData = ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i];
      let g = pixels[i + 1];
      let b = pixels[i + 2];

      // Brightness
      const brightnessFactor = 1 + (preset.brightness / 100);
      r *= brightnessFactor;
      g *= brightnessFactor;
      b *= brightnessFactor;

      // Contrast
      const contrastFactor = (259 * (preset.contrast + 255)) / (255 * (259 - preset.contrast));
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;

      // Saturation
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      const saturationFactor = 1 + (preset.saturation / 100);
      r = gray + (r - gray) * saturationFactor;
      g = gray + (g - gray) * saturationFactor;
      b = gray + (b - gray) * saturationFactor;

      // Temperature (warm/cool)
      r += preset.temperature * 0.5;
      b -= preset.temperature * 0.5;

      // Tint (green/magenta)
      g += preset.tint * 0.5;

      // Clamp values
      pixels[i] = Math.max(0, Math.min(255, r));
      pixels[i + 1] = Math.max(0, Math.min(255, g));
      pixels[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Get predefined color grading presets
   */
  static getColorGradingPresets(): Record<string, ColorGradingPreset> {
    return {
      natural: {
        name: 'Natural',
        contrast: 0,
        brightness: 0,
        saturation: 0,
        temperature: 0,
        tint: 0
      },
      cinematic: {
        name: 'Cinematic',
        contrast: 20,
        brightness: -5,
        saturation: -10,
        temperature: 10,
        tint: -5
      },
      vibrant: {
        name: 'Vibrant',
        contrast: 15,
        brightness: 5,
        saturation: 30,
        temperature: 5,
        tint: 0
      },
      medical: {
        name: 'Medical',
        contrast: 10,
        brightness: 10,
        saturation: -20,
        temperature: 0,
        tint: 5
      },
      warm: {
        name: 'Warm',
        contrast: 10,
        brightness: 5,
        saturation: 10,
        temperature: 30,
        tint: 0
      },
      cool: {
        name: 'Cool',
        contrast: 10,
        brightness: 0,
        saturation: 0,
        temperature: -30,
        tint: 0
      }
    };
  }

  /**
   * Clean up particles
   */
  clearParticles(): void {
    this.particles = [];
  }
}

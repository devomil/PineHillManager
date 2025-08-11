import lottie, { AnimationItem, AnimationConfig } from 'lottie-web';

interface LottieAnimationConfig {
  name: string;
  path: string;
  description: string;
  duration: number;
  category: 'medical' | 'pharmaceutical' | 'health' | 'science' | 'ui';
  useCases: string[];
}

export class ProfessionalLottieService {
  private animations: Map<string, AnimationItem> = new Map();
  private animationConfigs: LottieAnimationConfig[] = [];

  constructor() {
    this.initializeProfessionalAnimations();
  }

  private initializeProfessionalAnimations() {
    // Professional medical and pharmaceutical Lottie animations
    this.animationConfigs = [
      {
        name: 'dna-helix',
        path: this.createDNAHelixAnimation(),
        description: 'DNA helix rotation for genetic/molecular content',
        duration: 3000,
        category: 'science',
        useCases: ['Molecular targeting', 'Genetic health', 'Bioactive compounds']
      },
      {
        name: 'pill-dissolve',
        path: this.createPillDissolveAnimation(),
        description: 'Pill dissolving and absorption animation',
        duration: 2500,
        category: 'pharmaceutical',
        useCases: ['Bioavailability', 'Absorption', 'Drug delivery']
      },
      {
        name: 'heartbeat-pulse',
        path: this.createHeartbeatAnimation(),
        description: 'Medical heartbeat pulse animation',
        duration: 2000,
        category: 'medical',
        useCases: ['Cardiovascular health', 'Heart health', 'Circulation']
      },
      {
        name: 'molecule-bond',
        path: this.createMoleculeBondAnimation(),
        description: 'Molecular bonding and interaction',
        duration: 3500,
        category: 'science',
        useCases: ['Chemical interaction', 'Molecular binding', 'Therapeutic compounds']
      },
      {
        name: 'checkmark-success',
        path: this.createCheckmarkAnimation(),
        description: 'Professional success checkmark animation',
        duration: 1500,
        category: 'ui',
        useCases: ['Clinical validation', 'Proven results', 'Success indicators']
      },
      {
        name: 'wave-flow',
        path: this.createWaveFlowAnimation(),
        description: 'Smooth flowing wave animation',
        duration: 4000,
        category: 'health',
        useCases: ['Wellness flow', 'Natural movement', 'Health optimization']
      }
    ];
  }

  async loadAnimation(
    container: HTMLElement,
    animationName: string,
    options: Partial<AnimationConfig> = {}
  ): Promise<AnimationItem | null> {
    const config = this.animationConfigs.find(a => a.name === animationName);
    if (!config) {
      console.warn(`Animation ${animationName} not found`);
      return null;
    }

    try {
      const animationItem = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        animationData: JSON.parse(config.path),
        ...options
      });

      this.animations.set(animationName, animationItem);
      return animationItem;

    } catch (error) {
      console.error(`Failed to load animation ${animationName}:`, error);
      return null;
    }
  }

  playAnimation(name: string, startTime: number = 0, duration?: number): void {
    const animation = this.animations.get(name);
    if (!animation) return;

    if (duration) {
      animation.playSegments([startTime, startTime + duration], true);
    } else {
      animation.goToAndPlay(startTime, true);
    }
  }

  stopAnimation(name: string): void {
    const animation = this.animations.get(name);
    if (animation) {
      animation.stop();
    }
  }

  getAnimationsForHealthConcern(healthConcern: string): LottieAnimationConfig[] {
    const concern = healthConcern.toLowerCase();
    
    const relevantAnimations = this.animationConfigs.filter(config => {
      return config.useCases.some(useCase => 
        useCase.toLowerCase().includes(concern) ||
        concern.includes(useCase.toLowerCase())
      );
    });

    // If no specific matches, return general medical animations
    if (relevantAnimations.length === 0) {
      return this.animationConfigs.filter(config => 
        config.category === 'medical' || config.category === 'pharmaceutical'
      );
    }

    return relevantAnimations;
  }

  // Create professional Lottie animation data (simplified JSON structures)
  private createDNAHelixAnimation(): string {
    return JSON.stringify({
      v: "5.7.4",
      fr: 30,
      ip: 0,
      op: 90,
      w: 400,
      h: 400,
      nm: "DNA Helix",
      ddd: 0,
      assets: [],
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: "DNA Strand",
          sr: 1,
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 1, k: [
              { i: { x: 0.833, y: 0.833 }, o: { x: 0.167, y: 0.167 }, t: 0, s: [0] },
              { t: 89, s: [360] }
            ]},
            p: { a: 0, k: [200, 200, 0] },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] }
          },
          ao: 0,
          shapes: [
            {
              ty: "gr",
              it: [
                {
                  d: 1,
                  ty: "el",
                  s: { a: 0, k: [40, 200] },
                  p: { a: 0, k: [0, 0] }
                },
                {
                  ty: "st",
                  c: { a: 0, k: [0.2, 0.6, 1, 1] },
                  o: { a: 0, k: 100 },
                  w: { a: 0, k: 3 }
                }
              ]
            }
          ],
          ip: 0,
          op: 90,
          st: 0
        }
      ]
    });
  }

  private createPillDissolveAnimation(): string {
    return JSON.stringify({
      v: "5.7.4",
      fr: 30,
      ip: 0,
      op: 75,
      w: 300,
      h: 300,
      nm: "Pill Dissolve",
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: "Pill",
          ks: {
            o: { a: 1, k: [
              { t: 0, s: [100] },
              { t: 30, s: [100] },
              { t: 75, s: [0] }
            ]},
            p: { a: 0, k: [150, 150] },
            s: { a: 1, k: [
              { t: 0, s: [100, 100] },
              { t: 75, s: [120, 120] }
            ]}
          },
          shapes: [
            {
              ty: "gr",
              it: [
                {
                  ty: "rc",
                  d: 1,
                  s: { a: 0, k: [60, 30] },
                  r: { a: 0, k: 15 }
                },
                {
                  ty: "fl",
                  c: { a: 0, k: [0.8, 0.2, 0.2, 1] },
                  o: { a: 0, k: 100 }
                }
              ]
            }
          ],
          ip: 0,
          op: 75
        }
      ]
    });
  }

  private createHeartbeatAnimation(): string {
    return JSON.stringify({
      v: "5.7.4",
      fr: 30,
      ip: 0,
      op: 60,
      w: 200,
      h: 200,
      nm: "Heartbeat",
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: "Heart",
          ks: {
            s: { a: 1, k: [
              { t: 0, s: [100, 100] },
              { t: 10, s: [110, 110] },
              { t: 15, s: [100, 100] },
              { t: 25, s: [105, 105] },
              { t: 30, s: [100, 100] }
            ]},
            p: { a: 0, k: [100, 100] }
          },
          shapes: [
            {
              ty: "gr",
              it: [
                {
                  ty: "sh",
                  d: 1,
                  ks: { a: 0, k: {
                    i: [[0,0],[0,-10],[-5,-5],[-10,0],[-5,5],[0,10],[10,15],[10,-15]],
                    o: [[0,-10],[0,-10],[5,-5],[10,0],[5,5],[0,10],[10,15],[0,0]],
                    v: [[-20,5],[-20,-10],[-10,-20],[0,-20],[10,-20],[20,-10],[20,5],[0,25]],
                    c: true
                  }}
                },
                {
                  ty: "fl",
                  c: { a: 0, k: [0.9, 0.2, 0.3, 1] }
                }
              ]
            }
          ],
          ip: 0,
          op: 60
        }
      ]
    });
  }

  private createMoleculeBondAnimation(): string {
    return JSON.stringify({
      v: "5.7.4",
      fr: 30,
      ip: 0,
      op: 105,
      w: 400,
      h: 300,
      nm: "Molecule Bond",
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: "Atom 1",
          ks: {
            p: { a: 1, k: [
              { t: 0, s: [100, 150] },
              { t: 50, s: [180, 150] },
              { t: 105, s: [100, 150] }
            ]},
            r: { a: 1, k: [
              { t: 0, s: [0] },
              { t: 105, s: [360] }
            ]}
          },
          shapes: [
            {
              ty: "gr",
              it: [
                {
                  ty: "el",
                  d: 1,
                  s: { a: 0, k: [30, 30] }
                },
                {
                  ty: "fl",
                  c: { a: 0, k: [0.2, 0.8, 0.4, 1] }
                }
              ]
            }
          ],
          ip: 0,
          op: 105
        }
      ]
    });
  }

  private createCheckmarkAnimation(): string {
    return JSON.stringify({
      v: "5.7.4",
      fr: 30,
      ip: 0,
      op: 45,
      w: 200,
      h: 200,
      nm: "Checkmark",
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: "Check",
          ks: {
            o: { a: 1, k: [
              { t: 0, s: [0] },
              { t: 15, s: [100] }
            ]},
            p: { a: 0, k: [100, 100] },
            s: { a: 1, k: [
              { t: 0, s: [0, 0] },
              { t: 30, s: [120, 120] },
              { t: 45, s: [100, 100] }
            ]}
          },
          shapes: [
            {
              ty: "gr",
              it: [
                {
                  ty: "sh",
                  d: 1,
                  ks: { a: 0, k: {
                    i: [[0,0],[0,0],[0,0]],
                    o: [[0,0],[0,0],[0,0]],
                    v: [[-20,0],[0,20],[25,-15]],
                    c: false
                  }}
                },
                {
                  ty: "st",
                  c: { a: 0, k: [0.2, 0.8, 0.2, 1] },
                  w: { a: 0, k: 8 },
                  lc: 2,
                  lj: 2
                }
              ]
            }
          ],
          ip: 0,
          op: 45
        }
      ]
    });
  }

  private createWaveFlowAnimation(): string {
    return JSON.stringify({
      v: "5.7.4",
      fr: 30,
      ip: 0,
      op: 120,
      w: 400,
      h: 100,
      nm: "Wave Flow",
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: "Wave",
          ks: {
            p: { a: 1, k: [
              { t: 0, s: [0, 50] },
              { t: 120, s: [400, 50] }
            ]}
          },
          shapes: [
            {
              ty: "gr",
              it: [
                {
                  ty: "sh",
                  d: 1,
                  ks: { a: 1, k: [
                    { t: 0, s: {
                      i: [[0,0],[-20,0],[0,0],[20,0]],
                      o: [[20,0],[0,0],[-20,0],[0,0]],
                      v: [[-60,0],[-20,-20],[20,20],[60,0]],
                      c: false
                    }}
                  ]}
                },
                {
                  ty: "st",
                  c: { a: 0, k: [0.2, 0.6, 1, 1] },
                  w: { a: 0, k: 4 }
                }
              ]
            }
          ],
          ip: 0,
          op: 120
        }
      ]
    });
  }

  cleanup(): void {
    this.animations.forEach(animation => {
      animation.destroy();
    });
    this.animations.clear();
  }
}
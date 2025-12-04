# Sample Parsed Script: Weight Loss Video

This document shows exactly what the Weight Loss patient education script should look like when parsed into the universal `VideoProject` schema. Use this as a reference for implementing the script parser and as test data for the Remotion compositions.

---

## Original Script (Input)

```
Opening Scene: Have you been doing everything "right" but still struggling to lose weight? Counting calories, hitting the gym, but the scale won't budge? Here's what most people miss: your body can't heal what it's too busy defending against.

Scene 1: WHOLE BODY HEALING: True weight loss isn't just about calories in versus calories out. It's about whole body healing. When your body is overwhelmed by toxins, pathogens, and mold, it goes into survival mode. Your metabolism slows down. Inflammation increases. And your body literally holds onto weight as a protective mechanism.
Think of it like trying to renovate a house while it's on fire. First, you need to put out the fire

Scene 2: True weight loss isn't just about calories in versus calories out. It's about whole body healing. When your body is overwhelmed by toxins, pathogens, and mold, it goes into survival mode. Your metabolism slows down. Inflammation increases. And your body literally holds onto weight as a protective mechanism.
Think of it like trying to renovate a house while it's on fire. First, you need to put out the fire

Scene 3: PARALLEL HEALING APPROACH -This is why parallel healing works. Instead of just restricting calories, we:
Support your body's natural detox pathways – giving your liver, kidneys, and lymphatic system what they need to clear the backlog
Address the root causes – identifying and eliminating toxin exposure, treating underlying infections, and removing mold from your environment
Make sustainable diet and lifestyle changes – eating nutrient-dense foods that nourish rather than deplete, managing stress, prioritizing sleep, and moving in ways that support lymphatic drainage
When you heal the foundation, weight loss becomes a natural byproduct – not a constant battle.

Scene 4: THE PINE HILL APPROACH -At Pine Hill Farm, our weight-loss approach is rooted in Whole Body Healing, helping you achieve long-lasting results without side effects while supporting your overall health along the way.
Here's what makes us different:
We use FDA-approved BioScan technology to identify underlying imbalances in your body – no guessing, no one-size-fits-all protocols. This advanced scan determines which supplements are most compatible with your unique biology for optimal results.
We also include a Functional Lab Test to take a deeper look at your hormones, ensuring you receive the personalized support you need – and only what your body truly requires.

Closing Scene: Your body wants to heal. It wants to release excess weight. But it needs the right environment and the right support to do so.
At Pine Hill Farm, we don't just help you lose weight – we help you heal from the inside out.

Ready to start your whole body healing journey?
```

---

## Parsed VideoProject (Output)

```json
{
  "id": "proj_weight_loss_2024_001",
  "type": "script-based",

  "title": "Whole Body Healing Weight Loss",
  "description": "Patient education video explaining Pine Hill Farm's holistic approach to weight loss through whole body healing",
  "targetAudience": "Adults 35-65 struggling with weight loss despite traditional diet and exercise",

  "totalDuration": 210,
  "fps": 30,

  "outputFormat": {
    "aspectRatio": "16:9",
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "platform": "youtube"
  },

  "brand": {
    "name": "Pine Hill Farm",
    "logoUrl": "/assets/pine-hill-farm-logo.png",
    "watermarkPosition": "bottom-right",
    "watermarkOpacity": 0.3,
    "colors": {
      "primary": "#1a4480",
      "secondary": "#f5f0e6",
      "accent": "#c9a227",
      "text": "#1a1a1a",
      "textLight": "#ffffff"
    },
    "fonts": {
      "heading": "Inter",
      "body": "Inter",
      "weight": {
        "heading": 700,
        "body": 400
      }
    }
  },

  "scenes": [
    {
      "id": "scene_001_hook",
      "order": 1,
      "type": "hook",
      "duration": 18,

      "narration": "Have you been doing everything right but still struggling to lose weight? Counting calories, hitting the gym, but the scale won't budge? Here's what most people miss: your body can't heal what it's too busy defending against.",

      "textOverlays": [
        {
          "id": "text_001_question",
          "text": "Doing Everything \"Right\"?",
          "style": "title",
          "position": {
            "vertical": "center",
            "horizontal": "center",
            "padding": 60
          },
          "timing": {
            "startAt": 0,
            "duration": 4
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.5
          }
        },
        {
          "id": "text_001_subtitle",
          "text": "But Still Struggling to Lose Weight?",
          "style": "subtitle",
          "position": {
            "vertical": "center",
            "horizontal": "center",
            "padding": 60
          },
          "timing": {
            "startAt": 4,
            "duration": 4
          },
          "animation": {
            "enter": "slide-up",
            "exit": "fade",
            "duration": 0.4
          }
        },
        {
          "id": "text_001_key",
          "text": "Your body can't heal what it's too busy defending against",
          "style": "headline",
          "position": {
            "vertical": "lower-third",
            "horizontal": "center",
            "padding": 40
          },
          "timing": {
            "startAt": 12,
            "duration": 6
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.5
          }
        }
      ],

      "background": {
        "type": "image",
        "source": "Frustrated person standing on bathroom scale, soft morning light, modern clean bathroom, muted colors, health and wellness photography style, cinematic",
        "effect": {
          "type": "ken-burns",
          "intensity": "subtle",
          "direction": "in"
        },
        "overlay": {
          "type": "gradient",
          "color": "#000000",
          "opacity": 0.4
        }
      },

      "transitionIn": {
        "type": "fade",
        "duration": 1,
        "easing": "ease-in"
      },
      "transitionOut": {
        "type": "crossfade",
        "duration": 0.5,
        "easing": "ease-in-out"
      }
    },

    {
      "id": "scene_002_whole_body",
      "order": 2,
      "type": "explanation",
      "duration": 35,

      "narration": "True weight loss isn't just about calories in versus calories out. It's about whole body healing. When your body is overwhelmed by toxins, pathogens, and mold, it goes into survival mode. Your metabolism slows down. Inflammation increases. And your body literally holds onto weight as a protective mechanism. Think of it like trying to renovate a house while it's on fire. First, you need to put out the fire.",

      "textOverlays": [
        {
          "id": "text_002_title",
          "text": "WHOLE BODY HEALING",
          "style": "title",
          "position": {
            "vertical": "top",
            "horizontal": "center",
            "padding": 80
          },
          "timing": {
            "startAt": 0,
            "duration": 6
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.5
          }
        },
        {
          "id": "text_002_point1",
          "text": "Toxins • Pathogens • Mold",
          "style": "subtitle",
          "position": {
            "vertical": "lower-third",
            "horizontal": "center",
            "padding": 40
          },
          "timing": {
            "startAt": 10,
            "duration": 5
          },
          "animation": {
            "enter": "slide-up",
            "exit": "fade",
            "duration": 0.4
          }
        },
        {
          "id": "text_002_survival",
          "text": "Survival Mode",
          "style": "headline",
          "position": {
            "vertical": "center",
            "horizontal": "center",
            "padding": 60
          },
          "timing": {
            "startAt": 16,
            "duration": 4
          },
          "animation": {
            "enter": "scale",
            "exit": "fade",
            "duration": 0.5
          }
        },
        {
          "id": "text_002_metaphor",
          "text": "Like renovating a house while it's on fire",
          "style": "quote",
          "position": {
            "vertical": "lower-third",
            "horizontal": "center",
            "padding": 40
          },
          "timing": {
            "startAt": 27,
            "duration": 7
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.6
          }
        }
      ],

      "background": {
        "type": "image",
        "source": "Abstract visualization of human body with glowing internal systems, soft blue and green tones, medical illustration style, clean modern aesthetic, representing detoxification and healing, 4K quality",
        "effect": {
          "type": "ken-burns",
          "intensity": "subtle",
          "direction": "out"
        },
        "overlay": {
          "type": "gradient",
          "color": "#1a4480",
          "opacity": 0.3
        }
      },

      "transitionIn": {
        "type": "crossfade",
        "duration": 0.5,
        "easing": "ease-in-out"
      },
      "transitionOut": {
        "type": "crossfade",
        "duration": 0.5,
        "easing": "ease-in-out"
      }
    },

    {
      "id": "scene_003_parallel",
      "order": 3,
      "type": "process",
      "duration": 55,

      "narration": "This is why parallel healing works. Instead of just restricting calories, we support your body's natural detox pathways, giving your liver, kidneys, and lymphatic system what they need to clear the backlog. We address the root causes, identifying and eliminating toxin exposure, treating underlying infections, and removing mold from your environment. And we make sustainable diet and lifestyle changes, eating nutrient-dense foods that nourish rather than deplete, managing stress, prioritizing sleep, and moving in ways that support lymphatic drainage. When you heal the foundation, weight loss becomes a natural byproduct, not a constant battle.",

      "textOverlays": [
        {
          "id": "text_003_title",
          "text": "PARALLEL HEALING APPROACH",
          "style": "title",
          "position": {
            "vertical": "top",
            "horizontal": "center",
            "padding": 80
          },
          "timing": {
            "startAt": 0,
            "duration": 8
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.5
          }
        },
        {
          "id": "text_003_step1",
          "text": "1. Support Natural Detox Pathways",
          "style": "bullet",
          "position": {
            "vertical": "center",
            "horizontal": "left",
            "padding": 80
          },
          "timing": {
            "startAt": 8,
            "duration": 12
          },
          "animation": {
            "enter": "slide-up",
            "exit": "fade",
            "duration": 0.4
          }
        },
        {
          "id": "text_003_step2",
          "text": "2. Address Root Causes",
          "style": "bullet",
          "position": {
            "vertical": "center",
            "horizontal": "left",
            "padding": 80
          },
          "timing": {
            "startAt": 20,
            "duration": 12
          },
          "animation": {
            "enter": "slide-up",
            "exit": "fade",
            "duration": 0.4
          }
        },
        {
          "id": "text_003_step3",
          "text": "3. Sustainable Lifestyle Changes",
          "style": "bullet",
          "position": {
            "vertical": "center",
            "horizontal": "left",
            "padding": 80
          },
          "timing": {
            "startAt": 32,
            "duration": 14
          },
          "animation": {
            "enter": "slide-up",
            "exit": "fade",
            "duration": 0.4
          }
        },
        {
          "id": "text_003_result",
          "text": "Weight loss becomes a natural byproduct",
          "style": "headline",
          "position": {
            "vertical": "lower-third",
            "horizontal": "center",
            "padding": 40
          },
          "timing": {
            "startAt": 48,
            "duration": 7
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.5
          }
        }
      ],

      "background": {
        "type": "video",
        "source": "nature healing wellness forest light",
        "effect": {
          "type": "none",
          "intensity": "subtle"
        },
        "overlay": {
          "type": "gradient",
          "color": "#000000",
          "opacity": 0.5
        }
      },

      "transitionIn": {
        "type": "crossfade",
        "duration": 0.5,
        "easing": "ease-in-out"
      },
      "transitionOut": {
        "type": "crossfade",
        "duration": 0.5,
        "easing": "ease-in-out"
      }
    },

    {
      "id": "scene_004_pine_hill",
      "order": 4,
      "type": "brand",
      "duration": 50,

      "narration": "At Pine Hill Farm, our weight-loss approach is rooted in Whole Body Healing, helping you achieve long-lasting results without side effects while supporting your overall health along the way. Here's what makes us different: We use FDA-approved BioScan technology to identify underlying imbalances in your body. No guessing, no one-size-fits-all protocols. This advanced scan determines which supplements are most compatible with your unique biology for optimal results. We also include a Functional Lab Test to take a deeper look at your hormones, ensuring you receive the personalized support you need, and only what your body truly requires.",

      "textOverlays": [
        {
          "id": "text_004_title",
          "text": "THE PINE HILL APPROACH",
          "style": "title",
          "position": {
            "vertical": "top",
            "horizontal": "center",
            "padding": 80
          },
          "timing": {
            "startAt": 0,
            "duration": 8
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.5
          }
        },
        {
          "id": "text_004_diff1",
          "text": "FDA-Approved BioScan Technology",
          "style": "subtitle",
          "position": {
            "vertical": "lower-third",
            "horizontal": "center",
            "padding": 40
          },
          "timing": {
            "startAt": 15,
            "duration": 10
          },
          "animation": {
            "enter": "slide-up",
            "exit": "fade",
            "duration": 0.4
          }
        },
        {
          "id": "text_004_diff1_sub",
          "text": "No guessing. No one-size-fits-all.",
          "style": "caption",
          "position": {
            "vertical": "bottom",
            "horizontal": "center",
            "padding": 60
          },
          "timing": {
            "startAt": 18,
            "duration": 7
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.3
          }
        },
        {
          "id": "text_004_diff2",
          "text": "Functional Lab Testing",
          "style": "subtitle",
          "position": {
            "vertical": "lower-third",
            "horizontal": "center",
            "padding": 40
          },
          "timing": {
            "startAt": 35,
            "duration": 10
          },
          "animation": {
            "enter": "slide-up",
            "exit": "fade",
            "duration": 0.4
          }
        },
        {
          "id": "text_004_diff2_sub",
          "text": "Personalized hormone support",
          "style": "caption",
          "position": {
            "vertical": "bottom",
            "horizontal": "center",
            "padding": 60
          },
          "timing": {
            "startAt": 38,
            "duration": 7
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.3
          }
        }
      ],

      "background": {
        "type": "image",
        "source": "Modern holistic health clinic interior, warm natural lighting, professional medical equipment, plants and natural elements, clean and welcoming atmosphere, health and wellness facility, 4K professional photography",
        "effect": {
          "type": "ken-burns",
          "intensity": "subtle",
          "direction": "in"
        },
        "overlay": {
          "type": "vignette",
          "color": "#1a4480",
          "opacity": 0.2
        }
      },

      "transitionIn": {
        "type": "crossfade",
        "duration": 0.5,
        "easing": "ease-in-out"
      },
      "transitionOut": {
        "type": "crossfade",
        "duration": 0.5,
        "easing": "ease-in-out"
      }
    },

    {
      "id": "scene_005_cta",
      "order": 5,
      "type": "cta",
      "duration": 27,

      "narration": "Your body wants to heal. It wants to release excess weight. But it needs the right environment and the right support to do so. At Pine Hill Farm, we don't just help you lose weight. We help you heal from the inside out. Ready to start your whole body healing journey?",

      "textOverlays": [
        {
          "id": "text_005_emotional",
          "text": "Your Body Wants to Heal",
          "style": "title",
          "position": {
            "vertical": "center",
            "horizontal": "center",
            "padding": 60
          },
          "timing": {
            "startAt": 0,
            "duration": 6
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.6
          }
        },
        {
          "id": "text_005_tagline",
          "text": "Heal From the Inside Out",
          "style": "headline",
          "position": {
            "vertical": "center",
            "horizontal": "center",
            "padding": 60
          },
          "timing": {
            "startAt": 12,
            "duration": 6
          },
          "animation": {
            "enter": "scale",
            "exit": "fade",
            "duration": 0.5
          }
        },
        {
          "id": "text_005_cta_button",
          "text": "Start Your Healing Journey",
          "style": "cta",
          "position": {
            "vertical": "center",
            "horizontal": "center",
            "padding": 60
          },
          "timing": {
            "startAt": 19,
            "duration": 8
          },
          "animation": {
            "enter": "scale",
            "exit": "fade",
            "duration": 0.4
          }
        },
        {
          "id": "text_005_contact",
          "text": "PineHillFarm.com",
          "style": "caption",
          "position": {
            "vertical": "bottom",
            "horizontal": "center",
            "padding": 80
          },
          "timing": {
            "startAt": 20,
            "duration": 7
          },
          "animation": {
            "enter": "fade",
            "exit": "fade",
            "duration": 0.3
          }
        }
      ],

      "background": {
        "type": "image",
        "source": "Serene sunrise over rolling green hills with morning mist, warm golden light, peaceful natural landscape, hope and new beginnings, cinematic wide shot, 4K nature photography",
        "effect": {
          "type": "ken-burns",
          "intensity": "medium",
          "direction": "out"
        },
        "overlay": {
          "type": "gradient",
          "color": "#1a4480",
          "opacity": 0.35
        }
      },

      "transitionIn": {
        "type": "crossfade",
        "duration": 0.5,
        "easing": "ease-in-out"
      },
      "transitionOut": {
        "type": "fade",
        "duration": 1.5,
        "easing": "ease-out"
      }
    }
  ],

  "assets": {
    "voiceover": {
      "fullTrackUrl": "",
      "duration": 0,
      "perScene": []
    },
    "music": {
      "url": "",
      "duration": 210,
      "volume": 0.18
    },
    "images": [],
    "videos": []
  },

  "status": "draft",
  "progress": {
    "currentStep": "idle",
    "steps": {
      "script": { "status": "complete", "progress": 100, "message": "Script parsed into 5 scenes" },
      "voiceover": { "status": "pending", "progress": 0 },
      "images": { "status": "pending", "progress": 0 },
      "videos": { "status": "pending", "progress": 0 },
      "music": { "status": "pending", "progress": 0 },
      "assembly": { "status": "pending", "progress": 0 },
      "rendering": { "status": "pending", "progress": 0 }
    },
    "overallPercent": 14,
    "errors": []
  }
}
```

---

## Scene Timing Breakdown

| Scene | Type | Duration | Cumulative | Content |
|-------|------|----------|------------|---------|
| 1 | Hook | 18s | 0:18 | Attention-grabbing questions |
| 2 | Explanation | 35s | 0:53 | Whole body healing concept |
| 3 | Process | 55s | 1:48 | Three-pillar approach |
| 4 | Brand | 50s | 2:38 | Pine Hill differentiators |
| 5 | CTA | 27s | 3:05 | Emotional close + call to action |

**Total Duration: 3 minutes 5 seconds (185 seconds)**

*Note: Original calculation was 210s but adjusted based on natural speaking pace of ~150 words/minute*

---

## Visual Direction Prompts (for fal.ai)

These are the exact prompts that should be sent to fal.ai FLUX Pro:

### Scene 1 (Hook)
```
Frustrated person standing on bathroom scale, soft morning light, modern clean bathroom, muted colors, health and wellness photography style, cinematic, professional photography, warm natural lighting, health and wellness aesthetic, clean composition, 4K ultra detailed, soft color palette, documentary style
```

### Scene 2 (Whole Body Healing)
```
Abstract visualization of human body with glowing internal systems, soft blue and green tones, medical illustration style, clean modern aesthetic, representing detoxification and healing, 4K quality, professional photography, warm natural lighting, health and wellness aesthetic, clean composition, 4K ultra detailed, soft color palette, documentary style
```

### Scene 3 (Parallel Healing) - Uses B-Roll Video
```
Search Pexels for: "nature healing wellness forest light"
Fallback image prompt: Peaceful forest path with dappled sunlight filtering through trees, morning mist, serene natural environment, wellness and healing atmosphere, cinematic wide shot, 4K nature photography
```

### Scene 4 (Pine Hill Approach)
```
Modern holistic health clinic interior, warm natural lighting, professional medical equipment, plants and natural elements, clean and welcoming atmosphere, health and wellness facility, 4K professional photography, professional photography, warm natural lighting, health and wellness aesthetic, clean composition, 4K ultra detailed, soft color palette, documentary style
```

### Scene 5 (CTA)
```
Serene sunrise over rolling green hills with morning mist, warm golden light, peaceful natural landscape, hope and new beginnings, cinematic wide shot, 4K nature photography, professional photography, warm natural lighting, health and wellness aesthetic, clean composition, 4K ultra detailed, soft color palette, documentary style
```

---

## Music Recommendation

For this video style, search for or generate:

**Style:** Ambient, hopeful, slightly emotional
**Tempo:** 70-90 BPM
**Instruments:** Soft piano, gentle strings, subtle pads
**Mood:** Inspirational, warm, trustworthy
**Duration:** 3:30 (with natural loop point or fade)

**Search terms for royalty-free libraries:**
- "hopeful ambient wellness"
- "inspirational healthcare documentary"
- "gentle motivational background"

---

## ElevenLabs Voice Settings

**Recommended Voice:** Rachel (warm, trustworthy female voice) or custom clone

**Settings:**
```json
{
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "stability": 0.5,
  "similarity_boost": 0.75,
  "style": 0.3,
  "use_speaker_boost": true
}
```

**Speaking Rate:** Natural (~150 words per minute)

---

## After Asset Generation (Expected State)

Once all assets are generated, the `assets` object should look like:

```json
{
  "assets": {
    "voiceover": {
      "fullTrackUrl": "https://storage.example.com/voiceover_full_abc123.mp3",
      "duration": 185,
      "perScene": [
        { "sceneId": "scene_001_hook", "url": "...", "duration": 18 },
        { "sceneId": "scene_002_whole_body", "url": "...", "duration": 35 },
        { "sceneId": "scene_003_parallel", "url": "...", "duration": 55 },
        { "sceneId": "scene_004_pine_hill", "url": "...", "duration": 50 },
        { "sceneId": "scene_005_cta", "url": "...", "duration": 27 }
      ]
    },
    "music": {
      "url": "https://storage.example.com/ambient_wellness_track.mp3",
      "duration": 210,
      "volume": 0.18
    },
    "images": [
      {
        "sceneId": "scene_001_hook",
        "url": "https://fal.ai/outputs/image_001.png",
        "prompt": "Frustrated person standing on bathroom scale..."
      },
      {
        "sceneId": "scene_002_whole_body",
        "url": "https://fal.ai/outputs/image_002.png",
        "prompt": "Abstract visualization of human body..."
      },
      {
        "sceneId": "scene_004_pine_hill",
        "url": "https://fal.ai/outputs/image_004.png",
        "prompt": "Modern holistic health clinic interior..."
      },
      {
        "sceneId": "scene_005_cta",
        "url": "https://fal.ai/outputs/image_005.png",
        "prompt": "Serene sunrise over rolling green hills..."
      }
    ],
    "videos": [
      {
        "sceneId": "scene_003_parallel",
        "url": "https://videos.pexels.com/video-files/12345/forest_light.mp4",
        "source": "pexels"
      }
    ]
  },

  "status": "ready",
  "progress": {
    "currentStep": "assembly",
    "steps": {
      "script": { "status": "complete", "progress": 100 },
      "voiceover": { "status": "complete", "progress": 100 },
      "images": { "status": "complete", "progress": 100 },
      "videos": { "status": "complete", "progress": 100 },
      "music": { "status": "complete", "progress": 100 },
      "assembly": { "status": "in-progress", "progress": 50 },
      "rendering": { "status": "pending", "progress": 0 }
    },
    "overallPercent": 85,
    "errors": []
  }
}
```

---

## Quality Checklist for This Video

Before final render, verify:

- [ ] Voiceover is clear and matches script exactly
- [ ] All 5 images generated successfully (no fallbacks needed)
- [ ] B-roll video for Scene 3 is HD quality and relevant
- [ ] Music volume doesn't overpower voiceover
- [ ] Text overlays are readable against backgrounds
- [ ] Ken Burns effects are smooth (no jerky movement)
- [ ] Transitions between scenes are seamless
- [ ] Pine Hill Farm logo watermark visible but subtle
- [ ] Total duration matches voiceover length
- [ ] No audio clipping or distortion
- [ ] Final render exports at 1080p 30fps

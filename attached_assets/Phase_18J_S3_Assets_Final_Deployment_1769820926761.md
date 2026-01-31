# Phase 18J: S3 Assets & Final Deployment

## Priority: MEDIUM
## Dependency: Phase 18I (Node.js 22 Upgrade)
## Estimated Time: 1-2 hours

---

## Purpose

Upload sound effects to S3, configure CORS, and verify the complete rendering pipeline is production-ready.

---

## Task 1: Create S3 Bucket (if not exists)

```bash
# Create bucket for renders and assets
aws s3api create-bucket \
  --bucket pinehillfarm-renders \
  --region us-east-2 \
  --create-bucket-configuration LocationConstraint=us-east-2

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket pinehillfarm-renders \
  --versioning-configuration Status=Enabled
```

---

## Task 2: Configure CORS for S3

```bash
# Create CORS configuration
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag", "Content-Length"],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket pinehillfarm-renders \
  --cors-configuration file:///tmp/cors.json
```

---

## Task 3: Create Sound Effects Directory Structure

```bash
# Create directory structure
aws s3api put-object --bucket pinehillfarm-renders --key audio/sfx/
aws s3api put-object --bucket pinehillfarm-renders --key renders/
```

---

## Task 4: Upload Sound Effects

You need these sound effect files. Sources:
- Create using audio tools (Audacity, Logic Pro)
- License from audio libraries (Epidemic Sound, Artlist)
- Use royalty-free from Freesound.org

Required files:

| File | Duration | Description |
|------|----------|-------------|
| `whoosh-soft.mp3` | 0.5s | Soft transition whoosh |
| `whoosh-medium.mp3` | 0.6s | Medium transition whoosh |
| `swipe.mp3` | 0.4s | Quick swipe sound |
| `logo-impact.mp3` | 1.0s | Logo reveal impact |
| `rise-swell.mp3` | 3.0s | Rising sound before CTA |
| `room-tone-warm.mp3` | 30s | Ambient room tone (loops) |

Upload them:

```bash
# Upload sound effects
aws s3 cp ./audio/sfx/whoosh-soft.mp3 s3://pinehillfarm-renders/audio/sfx/
aws s3 cp ./audio/sfx/whoosh-medium.mp3 s3://pinehillfarm-renders/audio/sfx/
aws s3 cp ./audio/sfx/swipe.mp3 s3://pinehillfarm-renders/audio/sfx/
aws s3 cp ./audio/sfx/logo-impact.mp3 s3://pinehillfarm-renders/audio/sfx/
aws s3 cp ./audio/sfx/rise-swell.mp3 s3://pinehillfarm-renders/audio/sfx/
aws s3 cp ./audio/sfx/room-tone-warm.mp3 s3://pinehillfarm-renders/audio/sfx/

# Verify uploads
aws s3 ls s3://pinehillfarm-renders/audio/sfx/
```

---

## Task 5: Set Environment Variables

Update in Replit Secrets:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Remotion Configuration
REMOTION_FUNCTION_NAME=remotion-render-mem10240mb-disk10240mb-900sec
REMOTION_SERVE_URL=https://remotionlambda-useast2-xxx.s3.us-east-2.amazonaws.com/sites/pinehillfarm-video/index.html
REMOTION_S3_BUCKET=pinehillfarm-renders
REMOTION_AWS_REGION=us-east-2

# Sound Effects URL
SOUND_EFFECTS_URL=https://pinehillfarm-renders.s3.us-east-2.amazonaws.com/audio/sfx
```

---

## Task 6: Create Lifecycle Rules (Cost Optimization)

```bash
# Delete old renders after 30 days
cat > /tmp/lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "ID": "CleanupOldRenders",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "renders/"
      },
      "Expiration": {
        "Days": 30
      }
    },
    {
      "ID": "CleanupPreviewRenders",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "renders/preview/"
      },
      "Expiration": {
        "Days": 7
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket pinehillfarm-renders \
  --lifecycle-configuration file:///tmp/lifecycle.json
```

---

## Task 7: Full System Test

### Test 1: Health Check
```bash
curl https://your-app.replit.dev/api/render/health
# Should return: { "status": "healthy", ... }
```

### Test 2: Preview Render
```bash
curl -X POST https://your-app.replit.dev/api/render/start \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 123,
    "preset": "preview"
  }'
# Should return: { "success": true, "renderId": "..." }
```

### Test 3: Full Broadcast Render
```bash
curl -X POST https://your-app.replit.dev/api/render/start \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": 123,
    "preset": "broadcast-1080p",
    "includeFilmTreatment": true,
    "includeSoundDesign": true
  }'
```

### Test 4: Check Render Progress
```bash
curl https://your-app.replit.dev/api/render/progress/{renderId}
# Should show progress percentage and eventually video URL
```

---

## Task 8: Verify Final Output Quality

Watch the rendered video and check:

### Visual Quality
- [ ] Film grain visible (subtle organic texture)
- [ ] Color grading applied (warm/cinematic feel)
- [ ] Vignette focuses attention to center
- [ ] Transitions are smooth (not hard cuts)
- [ ] Logo intro animates correctly
- [ ] Watermark visible in corner
- [ ] CTA displays website/phone
- [ ] End card has animated elements

### Audio Quality
- [ ] Music plays throughout
- [ ] Voiceover is clear
- [ ] Music ducks under voiceover
- [ ] Transition sounds play at scene changes
- [ ] Rise/swell before CTA
- [ ] No audio clipping or distortion

### Technical Quality
- [ ] Resolution is 1920x1080 (or selected preset)
- [ ] Frame rate is 30fps
- [ ] File size reasonable (~50-150MB for 30s)
- [ ] Video plays smoothly (no stuttering)
- [ ] Video URL is publicly accessible

---

## Task 9: Monitor First Production Renders

Watch CloudWatch logs for issues:

```bash
# Tail Lambda logs
aws logs tail /aws/lambda/remotion-render-mem10240mb-disk10240mb-900sec --follow --region us-east-2
```

Watch for:
- `Error loading image` → URL resolution issue (Phase 18A)
- `Timeout exceeded` → Increase timeout or reduce quality
- `Out of memory` → Increase Lambda memory
- `Function not found` → Redeploy Lambda

---

## Production Readiness Checklist

### Infrastructure
- [ ] Lambda deployed with Node.js 22.x
- [ ] S3 bucket created with CORS
- [ ] Sound effects uploaded
- [ ] Environment variables set

### Quality
- [ ] Film treatment visible
- [ ] Brand elements render correctly
- [ ] Sound design working
- [ ] No error messages in logs

### Cost Control
- [ ] Lifecycle rules configured
- [ ] Preview preset for drafts
- [ ] ARM64 architecture (40% savings)

### Monitoring
- [ ] Health check endpoint working
- [ ] CloudWatch logs enabled
- [ ] Error alerts configured (optional)

---

## Success Criteria

Phase 18 is COMPLETE when:

- [ ] Health check returns `healthy`
- [ ] Preview render completes in ~2 minutes
- [ ] Broadcast render completes in ~5-8 minutes
- [ ] Rendered video shows:
  - Logo intro animation
  - Watermark in corner
  - CTA with contact info
  - End card with animations
  - Film grain and color grading
  - Transition sounds
  - Audio ducking
- [ ] Video URL is publicly accessible
- [ ] No errors in CloudWatch logs

---

## Summary: Before vs After Phase 18

### Before Phase 18
```
- Raw AI clips stitched together
- No branding (logo, watermark, CTA)
- Hard cuts between scenes
- Flat, digital colors
- No sound effects
- Abrupt ending
- Node.js 20.x (deprecated)
```

### After Phase 18
```
- Professional logo intro (2-3s)
- Persistent watermark throughout
- Elegant transitions (light leaks, dissolves)
- Cinematic color grading + film grain
- Transition sounds + audio ducking
- Animated end card with contact info
- Node.js 22.x (current LTS)
- Broadcast-quality output
```

---

## Congratulations!

You now have a **broadcast-quality video rendering system** that produces professional TV commercials from AI-generated content. The "WOW" factor is achieved when viewers say:

> "This looks like it was made by a professional agency, not AI!"

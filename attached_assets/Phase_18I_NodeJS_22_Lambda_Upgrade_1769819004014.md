# Phase 18I: Node.js 22 Lambda Upgrade

## Priority: HIGH
## Dependency: Phase 18H (Broadcast Composition)
## Estimated Time: 1-2 hours

---

## Purpose

Upgrade Remotion Lambda from Node.js 20.x to Node.js 22.x to:
- Address AWS deprecation warning
- Get latest performance improvements
- Ensure long-term compatibility

---

## Current State

```
Region: us-east-2
Lambda: remotion-render-4-0-410-mem3008mb-disk10240mb-900sec
Runtime: nodejs20.x  ← DEPRECATED
```

---

## Task 1: Deploy New Lambda Function

Run in terminal:

```bash
# Deploy Remotion Lambda with Node.js 22
npx remotion lambda functions deploy \
  --region us-east-2 \
  --memory 10240 \
  --timeout 900 \
  --disk 10240 \
  --architecture arm64 \
  --runtime nodejs22.x \
  --enable-cloudwatch-logs

# Expected output:
# Deployed function: remotion-render-mem10240mb-disk10240mb-900sec
# Region: us-east-2
# Runtime: nodejs22.x
# Architecture: arm64
```

**Note:** Using `us-east-2` to match your existing infrastructure. The AWS docs mentioned `us-east-1`, but keep your current region.

---

## Task 2: Verify Deployment

```bash
# List functions to confirm
npx remotion lambda functions ls --region us-east-2

# Expected output:
# ┌─────────────────────────────────────────────────────┬─────────────┬──────────┬────────────┬────────────┐
# │ Function Name                                       │ Memory (MB) │ Timeout  │ Disk (MB)  │ Runtime    │
# ├─────────────────────────────────────────────────────┼─────────────┼──────────┼────────────┼────────────┤
# │ remotion-render-mem10240mb-disk10240mb-900sec       │ 10240       │ 900s     │ 10240      │ nodejs22.x │
# └─────────────────────────────────────────────────────┴─────────────┴──────────┴────────────┴────────────┘
```

---

## Task 3: Update Environment Variables

Update in Replit Secrets:

```bash
# Old values (keep for reference)
# REMOTION_FUNCTION_NAME=remotion-render-4-0-410-mem3008mb-disk10240mb-900sec

# New values
REMOTION_FUNCTION_NAME=remotion-render-mem10240mb-disk10240mb-900sec
REMOTION_AWS_REGION=us-east-2
```

---

## Task 4: Update Remotion Site Bundle

```bash
# Rebuild and deploy the Remotion bundle with new components
npx remotion lambda sites create \
  --site-name pinehillfarm-video \
  --region us-east-2

# Expected output:
# Deployed site: https://remotionlambda-useast2-xxxxx.s3.us-east-2.amazonaws.com/sites/pinehillfarm-video/index.html
```

Update in Replit Secrets:

```bash
REMOTION_SERVE_URL=<URL from output above>
```

---

## Task 5: Create Health Check Endpoint

Add to `server/routes/render-routes.ts`:

```typescript
// server/routes/render-routes.ts

import { getFunctions } from '@remotion/lambda/client';

router.get('/api/render/health', async (req, res) => {
  try {
    const region = process.env.REMOTION_AWS_REGION as any || 'us-east-2';
    const functionName = process.env.REMOTION_FUNCTION_NAME;

    // Get available functions
    const functions = await getFunctions({
      region,
      compatibleOnly: true,
    });

    // Find our function
    const ourFunction = functions.find(f => f.functionName === functionName);

    if (!ourFunction) {
      return res.status(503).json({
        status: 'unhealthy',
        error: 'Lambda function not found',
        expected: functionName,
        available: functions.map(f => f.functionName),
        region,
      });
    }

    // Return health status
    res.json({
      status: 'healthy',
      function: {
        name: ourFunction.functionName,
        version: ourFunction.version,
        memory: ourFunction.memorySizeInMb,
        timeout: ourFunction.timeoutInSeconds,
        disk: ourFunction.diskSizeInMb,
      },
      region,
      serveUrl: process.env.REMOTION_SERVE_URL,
      bucket: process.env.REMOTION_S3_BUCKET,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Health] Check failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});
```

---

## Task 6: Test Health Check

```bash
curl https://your-app.replit.dev/api/render/health

# Expected response:
{
  "status": "healthy",
  "function": {
    "name": "remotion-render-mem10240mb-disk10240mb-900sec",
    "version": "2024.xx.xx",
    "memory": 10240,
    "timeout": 900,
    "disk": 10240
  },
  "region": "us-east-2",
  "serveUrl": "https://remotionlambda-useast2-xxx.s3...",
  "bucket": "pinehillfarm-renders",
  "timestamp": "2026-01-27T..."
}
```

---

## Task 7: Test Preview Render

```bash
curl -X POST https://your-app.replit.dev/api/render/test-preview \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected response:
{
  "success": true,
  "renderId": "abc123...",
  "message": "Test render started"
}
```

---

## Task 8: Delete Old Lambda Function (Optional)

Once confirmed working, clean up old function:

```bash
# List all functions
npx remotion lambda functions ls --region us-east-2

# Remove old Node.js 20 function
npx remotion lambda functions rmall --region us-east-2 --yes

# Re-deploy just the Node.js 22 function
npx remotion lambda functions deploy \
  --region us-east-2 \
  --memory 10240 \
  --timeout 900 \
  --disk 10240 \
  --architecture arm64 \
  --runtime nodejs22.x
```

---

## Troubleshooting

### Error: "Function not found"

```bash
# Verify function exists
aws lambda get-function --function-name remotion-render-mem10240mb-disk10240mb-900sec --region us-east-2

# If not found, redeploy
npx remotion lambda functions deploy --region us-east-2 --memory 10240 --timeout 900 --runtime nodejs22.x
```

### Error: "Timeout exceeded"

```bash
# Increase timeout (max 900 seconds = 15 minutes)
npx remotion lambda functions deploy --region us-east-2 --timeout 900 --memory 10240
```

### Error: "Out of memory"

```bash
# Increase memory (max 10240 MB = 10GB)
npx remotion lambda functions deploy --region us-east-2 --memory 10240
```

---

## Verification

Check that everything is working:

1. **Health check passes:**
   ```
   GET /api/render/health → { "status": "healthy", "function": { "name": "remotion-render-mem10240mb-..." } }
   ```

2. **Preview render completes:**
   ```
   POST /api/render/test-preview → renders in ~2 minutes
   ```

3. **No deprecation warnings:**
   - Lambda console shows `nodejs22.x` runtime
   - No warnings about Node.js 20 EOL

---

## Success Criteria

- [ ] New Lambda deployed with `nodejs22.x` runtime
- [ ] Environment variables updated in Replit
- [ ] Remotion site bundle redeployed
- [ ] Health check endpoint returns `healthy`
- [ ] Test preview render completes successfully
- [ ] Old Lambda function cleaned up (optional)

---

## Next Phase

Proceed to **Phase 18J: S3 Assets & Final Deployment** for sound effects and production readiness.

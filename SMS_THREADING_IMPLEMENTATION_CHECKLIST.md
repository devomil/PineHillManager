# SMS Targeting + Threaded Replies Implementation Checklist

## Key Facts from SMS_TARGETING_DEBUG_REPORT.md (Aug 30, 2025)
- **Issue**: SMS responses target announcement ID 11 instead of newest (25 "FINAL DEBUG TEST")
- **Root Cause**: Twilio webhook points to production (`https://phfmanager.co/api/sms/webhook`)
- **Environment**: Dev doesn't receive webhooks; prod + dev share database
- **Test Numbers**: User +18474015540, Twilio +12624751882

---

## 1. Database Migration

### Schema Extensions (Extend, Don't Break)
- [ ] Add fields to `responses` table:
  - [ ] `parent_message_id BIGINT NULL` (FK to responses.id for threading)
  - [ ] `sender_phone TEXT NULL` (E.164 format)
  - [ ] `source TEXT CHECK (source IN ('sms','ui','system')) DEFAULT 'sms'`
  - [ ] `twilio_message_sid TEXT UNIQUE NULL` (idempotency key)
  - [ ] `thread_token TEXT NULL` (for deterministic routing)

### Announcements Table Verification
- [ ] Confirm `announcements` has:
  - [ ] `id, title, content, created_at`
  - [ ] `is_active BOOLEAN DEFAULT true` (add if missing)

### Indexes for Performance
- [ ] Create composite index: `(announcement_id, created_at DESC)`
- [ ] Create unique index: `(twilio_message_sid)`
- [ ] Create index: `(thread_token)` (optional for frequent lookups)

### Migration SQL Template
```sql
ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS parent_message_id BIGINT NULL,
  ADD COLUMN IF NOT EXISTS sender_phone TEXT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('sms','ui','system')) DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS twilio_message_sid TEXT UNIQUE NULL,
  ADD COLUMN IF NOT EXISTS thread_token TEXT NULL;

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_responses_announcement_created
  ON responses(announcement_id, created_at DESC);
```

---

## 2. Webhook + Routing Logic

### Environment Configuration
- [ ] Set up environment variables:
  - [ ] `TWILIO_ACCOUNT_SID`
  - [ ] `TWILIO_AUTH_TOKEN`
  - [ ] `TWILIO_INBOUND_NUMBER_PROD=+12624751882`
  - [ ] `TWILIO_INBOUND_NUMBER_DEV=+1xxxxxxxxxx`
  - [ ] `TWILIO_ENV=prod` (or dev)
  - [ ] `TWILIO_VERIFY_SIGNATURE=true` (false for dev)

### Webhook Routes
- [ ] Keep production: `POST /api/sms/webhook`
- [ ] Add dev/test route: `POST /api/sms/webhook/dev`
- [ ] Environment-aware webhook handling

### SMS Targeting Logic Fix
- [ ] **Critical**: Fix announcement targeting to use newest active announcement (ID 25, not 11)
- [ ] Parse thread token from SMS body: `/\[#A(\d+)-M(\d+)\]/`
- [ ] Implement fallback strategy:
  - [ ] Resolve phone → user → groups
  - [ ] Pick most recent active announcement for user's groups
  - [ ] If none, use globally most recent active announcement

### Idempotency & Safety
- [ ] Check `twilio_message_sid` for duplicates → return 200 OK, no-op
- [ ] Validate Twilio signature in production
- [ ] Feature flag: `FEATURE_THREAD_TOKEN=true/false`
- [ ] Dry-run mode: `SMS_DRY_RUN=true` (log without insert)

---

## 3. Thread Token Handling

### Token Format Implementation
- [ ] Generate outbound tokens: `[#A<announcementId>-M<messageId>]`
- [ ] Example: `[#A25-M123]`
- [ ] Parse inbound tokens with regex validation
- [ ] Handle malformed/invalid tokens gracefully

### Token Routing Logic
- [ ] **With token**: Strict match to exact announcement/parent
- [ ] **Without token**: Use fallback targeting strategy (most recent active)
- [ ] **Invalid token**: Log warning, fall back to strategy
- [ ] **Multiple tokens**: Use first valid token found

### Edge Cases
- [ ] Non-existent announcement/message IDs → fallback + log WARN
- [ ] Unknown phone numbers → create unmapped sender placeholder
- [ ] Multiple tokens in one message → use first valid

---

## 4. UI/Frontend Changes

### Threaded View Rendering
- [ ] Display parent → children structure
- [ ] Sort: Latest first within each thread
- [ ] Visual thread indicators/indentation

### Reply Functionality
- [ ] Add reply box to each thread
- [ ] POST to `/api/messages` with:
  - [ ] `announcement_id`
  - [ ] `parent_message_id`
  - [ ] `body`
- [ ] Return generated `thread_token` in response

### Token Sharing Features
- [ ] "Copy Token" button on each message
- [ ] Copy format: `[#A25-M123]`
- [ ] Display token in UI for sharing

### Real-time Updates
- [ ] WebSocket listener for `message.created` events
- [ ] Append new replies to correct thread
- [ ] Update UI within 1 second (AT-07 requirement)

---

## 5. Tests (Unit, Integration, Acceptance AT-01..AT-07)

### Unit Tests
- [ ] **Token Parsing**:
  - [ ] Valid tokens: `[#A25-M123]`
  - [ ] Invalid/missing tokens
  - [ ] Malformed tokens
- [ ] **Fallback Resolver**:
  - [ ] User with multiple groups
  - [ ] No active announcements
  - [ ] Unknown phone numbers
- [ ] **Idempotency**:
  - [ ] Duplicate `MessageSid` handling
  - [ ] Database constraint violations

### Integration Tests
- [ ] Mock Twilio POST → verify 200, correct row insertion
- [ ] UI POST → verify threading and WebSocket emission
- [ ] End-to-end: SMS → webhook → database → UI update

### Acceptance Tests (Must Pass)
- [ ] **AT-01**: SMS "new test" → targets announcement_id = 25 (not 11)
- [ ] **AT-02**: UI reply to announcement 25 → appears in same thread as SMS
- [ ] **AT-03**: SMS with `[#A25-M123]` → attaches to exact announcement/message
- [ ] **AT-04**: Multiple active announcements → deterministic targeting (most recent)
- [ ] **AT-05**: Duplicate Twilio webhooks → handled idempotently (no dup rows)
- [ ] **AT-06**: Feature flags work; logging/metrics visible
- [ ] **AT-07**: WebSocket update → UI renders reply within 1s

### Manual SQL Verification
```sql
SELECT id, content, announcement_id, parent_message_id, 
       sender_phone, source, twilio_message_sid, created_at
FROM responses
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

---

## 6. Observability/Logging

### Structured Logging (INFO/DEBUG)
- [ ] Parsed sender phone number
- [ ] Matched user and groups
- [ ] Resolved target (announcement_id, parent_message_id)
- [ ] Thread token detection and validation
- [ ] Fallback strategy decisions

### Metrics Counters
- [ ] `sms_inbound_total`
- [ ] `sms_routed_with_token_total`
- [ ] `sms_routed_fallback_total`
- [ ] `sms_idempotent_dupe_total`
- [ ] `sms_targeting_errors_total`

### Debug Interface
- [ ] `/admin/sms/last-100` page (dev only)
- [ ] Show recent routing decisions
- [ ] Display targeting logic outcomes
- [ ] Export logs for troubleshooting

### Error Handling
- [ ] Unknown phone → log unmapped sender
- [ ] Invalid tokens → log WARN with details
- [ ] Webhook validation failures → log security events

---

## 7. Deployment & Rollout Steps

### Pre-Deployment
- [ ] **Step 1**: Ship database migration
- [ ] **Step 2**: Deploy code with `FEATURE_THREAD_TOKEN=false`
- [ ] **Step 3**: Verify migration success in production

### Development Testing
- [ ] **Step 4**: Enable in dev environment first
- [ ] **Step 5**: Run acceptance tests AT-01 through AT-07
- [ ] **Step 6**: Verify WebSocket updates and UI threading

### Production Rollout
- [ ] **Step 7**: Deploy to production during low-risk window
- [ ] **Step 8**: Toggle `FEATURE_THREAD_TOKEN=true` in production
- [ ] **Step 9**: Send test SMS to verify targeting (should hit ID 25)

### Post-Deployment Monitoring
- [ ] **Step 10**: Monitor logs/metrics for 30 minutes
- [ ] **Step 11**: Verify no duplicate rows created
- [ ] **Step 12**: Confirm correct announcement targeting
- [ ] **Step 13**: Test WebSocket real-time updates

### Rollback Plan
- [ ] Feature flag rollback: `FEATURE_THREAD_TOKEN=false`
- [ ] Database rollback plan (if needed)
- [ ] Twilio webhook fallback configuration

---

## API Endpoints Summary

### New/Modified Routes
- [ ] `POST /api/sms/webhook` (enhanced with threading)
- [ ] `POST /api/sms/webhook/dev` (development endpoint)
- [ ] `POST /api/messages` (UI replies with threading)
- [ ] `GET /admin/sms/last-100` (debug interface)

### WebSocket Events
- [ ] `message.created` with threading metadata
- [ ] Include `announcement_id`, `parent_message_id`, `thread_token`

---

## Success Criteria

### Core Functionality
- [ ] SMS responses target newest announcement (ID 25, not 11)
- [ ] Threaded replies work bidirectionally (SMS ↔ UI)
- [ ] Thread tokens enable deterministic routing
- [ ] Real-time UI updates within 1 second

### Production Safety
- [ ] Idempotent webhook handling
- [ ] Feature flags for safe rollout
- [ ] Comprehensive logging and metrics
- [ ] No data loss or corruption

### Environment Separation
- [ ] Production webhook: `https://phfmanager.co/api/sms/webhook`
- [ ] Development webhook route available
- [ ] Configurable Twilio environment settings

---

*Implementation Checklist Generated: September 3, 2025*
*Based on SMS_TARGETING_DEBUG_REPORT.md (August 30, 2025)*
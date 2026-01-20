# Phase 1: Database Schema

## Task
Add new database tables for Homer's memory, files, and user profiles.

## Instructions
Add these table definitions to `shared/schema.ts`

---

## Add to `shared/schema.ts`

**Add these imports at the top if not present:**
```typescript
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from 'drizzle-orm/pg-core';
```

**Add these table definitions:**

```typescript
// ============================================
// HOMER AI - USER PROFILES
// ============================================
export const homerUserProfiles = pgTable('homer_user_profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(), // Links to auth user
  
  // Personal info
  displayName: text('display_name').notNull(),
  preferredName: text('preferred_name'), // "Jackie" instead of "Jacalyn"
  role: text('role').notNull(), // "Admin", "Owner-Manager"
  title: text('title'), // "CEO", "Operations Manager"
  
  // Communication preferences
  communicationStyle: text('communication_style').default('professional'), // professional, casual, brief
  preferredGreeting: text('preferred_greeting'), // Custom greeting preference
  wantsDetailedAnalysis: boolean('wants_detailed_analysis').default(true),
  wantsProactiveInsights: boolean('wants_proactive_insights').default(true),
  
  // Focus areas - what they care about most
  focusAreas: jsonb('focus_areas').$type<string[]>().default([]), // ["revenue", "inventory", "labor"]
  
  // Context
  responsibilities: text('responsibilities'), // Free text about their role
  workingHours: text('working_hours'), // "9am-5pm" or "early mornings"
  timezone: text('timezone').default('America/Chicago'),
  
  // Metadata
  lastInteraction: timestamp('last_interaction'),
  totalInteractions: integer('total_interactions').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// HOMER AI - MEMORIES
// ============================================
export const homerMemories = pgTable('homer_memories', {
  id: serial('id').primaryKey(),
  
  // Ownership
  userId: text('user_id'), // Null = global memory, otherwise user-specific
  
  // Memory content
  category: text('category').notNull(), // "fact", "preference", "decision", "reminder", "context"
  subject: text('subject').notNull(), // Brief subject line
  content: text('content').notNull(), // The actual memory
  
  // Importance and relevance
  importance: integer('importance').default(5), // 1-10 scale
  expiresAt: timestamp('expires_at'), // Null = permanent
  
  // Source tracking
  sourceConversationId: text('source_conversation_id'), // Which conversation created this
  sourceMessageId: text('source_message_id'),
  
  // Metadata
  tags: jsonb('tags').$type<string[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('homer_memories_user_id_idx').on(table.userId),
  categoryIdx: index('homer_memories_category_idx').on(table.category),
  importanceIdx: index('homer_memories_importance_idx').on(table.importance),
}));

// ============================================
// HOMER AI - FILES
// ============================================
export const homerFiles = pgTable('homer_files', {
  id: serial('id').primaryKey(),
  
  // File identity
  fileId: text('file_id').notNull().unique(), // UUID for file reference
  
  // Ownership
  uploadedBy: text('uploaded_by').notNull(), // User ID who uploaded
  
  // File metadata
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(), // bytes
  
  // Storage
  storagePath: text('storage_path').notNull(), // Path in storage system
  storageType: text('storage_type').default('local'), // "local" or "s3"
  
  // AI-generated metadata
  description: text('description'), // AI-generated description
  extractedText: text('extracted_text'), // For PDFs/docs
  tags: jsonb('tags').$type<string[]>().default([]),
  
  // Access control
  isShared: boolean('is_shared').default(false), // Visible to all Homer users
  sharedWith: jsonb('shared_with').$type<string[]>().default([]), // Specific user IDs
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uploadedByIdx: index('homer_files_uploaded_by_idx').on(table.uploadedBy),
  fileIdIdx: index('homer_files_file_id_idx').on(table.fileId),
}));

// ============================================
// HOMER AI - FILE-MESSAGE LINKS
// ============================================
export const homerFileMessages = pgTable('homer_file_messages', {
  id: serial('id').primaryKey(),
  
  fileId: text('file_id').notNull(), // References homerFiles.fileId
  conversationId: text('conversation_id').notNull(), // Session ID
  messageId: text('message_id').notNull(), // Message that included this file
  
  // How the file was used
  direction: text('direction').notNull(), // "inbound" (user sent) or "outbound" (Homer sent)
  context: text('context'), // Why this file was shared
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  fileIdIdx: index('homer_file_messages_file_id_idx').on(table.fileId),
  conversationIdIdx: index('homer_file_messages_conversation_id_idx').on(table.conversationId),
}));
```

---

## Run Migration

After adding the schema, run:
```bash
npm run db:push
```

Or if using drizzle-kit:
```bash
npx drizzle-kit push
```

---

## Verification
1. No TypeScript errors in schema.ts
2. Migration runs successfully
3. Four new tables created:
   - `homer_user_profiles`
   - `homer_memories`
   - `homer_files`
   - `homer_file_messages`

## Next
Proceed to Phase 2.

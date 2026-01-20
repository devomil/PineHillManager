# Phase 8B: Memory Management & Limits

## Problem
Without limits, Homer's memory database could grow indefinitely, causing:
- Slow context building
- Increased token usage
- Irrelevant old memories cluttering context

## Task
Add memory limits, pruning, and management features.

## Instructions

---

## Step 1: Update Memory Service with Limits

**In `server/services/homer-memory-service.ts`, add these constants at the top:**

```typescript
// Memory limits
const MAX_MEMORIES_PER_USER = 100;      // Max personal memories per user
const MAX_GLOBAL_MEMORIES = 50;          // Max shared/global memories
const AUTO_PRUNE_THRESHOLD = 0.8;        // Prune when at 80% capacity
const LOW_IMPORTANCE_PRUNE_DAYS = 90;    // Remove low-importance memories after 90 days
```

---

## Step 2: Add Memory Count Method

**Add this method to the HomerMemoryService class:**

```typescript
/**
 * Get memory count for a user
 */
async getMemoryCount(userId: string): Promise<{ personal: number; global: number; total: number }> {
  const [personalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(homerMemories)
    .where(and(
      eq(homerMemories.userId, userId),
      eq(homerMemories.isActive, true)
    ));
  
  const [globalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(homerMemories)
    .where(and(
      isNull(homerMemories.userId),
      eq(homerMemories.isActive, true)
    ));
  
  const personal = Number(personalResult?.count || 0);
  const global = Number(globalResult?.count || 0);
  
  return {
    personal,
    global,
    total: personal + global,
  };
}
```

---

## Step 3: Add Auto-Pruning Logic

**Add this method to the HomerMemoryService class:**

```typescript
/**
 * Prune old, low-importance memories to stay within limits
 */
async pruneMemories(userId: string): Promise<number> {
  const counts = await this.getMemoryCount(userId);
  let prunedCount = 0;
  
  // Check if we need to prune personal memories
  if (counts.personal >= MAX_MEMORIES_PER_USER * AUTO_PRUNE_THRESHOLD) {
    console.log(`[Homer Memory] User ${userId} at ${counts.personal}/${MAX_MEMORIES_PER_USER} - pruning`);
    
    // First, remove expired memories
    const expiredResult = await db.update(homerMemories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(homerMemories.userId, userId),
        eq(homerMemories.isActive, true),
        lte(homerMemories.expiresAt, new Date())
      ));
    
    // Then, remove old low-importance memories (importance <= 3, older than 90 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOW_IMPORTANCE_PRUNE_DAYS);
    
    const oldLowImportance = await db.update(homerMemories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(homerMemories.userId, userId),
        eq(homerMemories.isActive, true),
        lte(homerMemories.importance, 3),
        lte(homerMemories.createdAt, cutoffDate)
      ));
    
    // If still over limit, remove lowest importance memories
    const newCounts = await this.getMemoryCount(userId);
    if (newCounts.personal >= MAX_MEMORIES_PER_USER) {
      const excess = newCounts.personal - MAX_MEMORIES_PER_USER + 10; // Remove 10 extra for buffer
      
      const toRemove = await db.select({ id: homerMemories.id })
        .from(homerMemories)
        .where(and(
          eq(homerMemories.userId, userId),
          eq(homerMemories.isActive, true)
        ))
        .orderBy(homerMemories.importance, homerMemories.createdAt)
        .limit(excess);
      
      if (toRemove.length > 0) {
        await db.update(homerMemories)
          .set({ isActive: false, updatedAt: new Date() })
          .where(inArray(homerMemories.id, toRemove.map(m => m.id)));
        
        prunedCount += toRemove.length;
      }
    }
    
    console.log(`[Homer Memory] Pruned ${prunedCount} memories for user ${userId}`);
  }
  
  return prunedCount;
}
```

**Add this import at the top if not present:**
```typescript
import { eq, and, desc, gte, or, isNull, inArray, lte, sql } from 'drizzle-orm';
```

---

## Step 4: Update createMemory to Check Limits

**Update the `createMemory` method to auto-prune:**

```typescript
async createMemory(input: CreateMemoryInput): Promise<Memory> {
  // Auto-prune if needed before adding new memory
  if (input.userId) {
    await this.pruneMemories(input.userId);
  }
  
  // Check if at hard limit
  if (input.userId) {
    const counts = await this.getMemoryCount(input.userId);
    if (counts.personal >= MAX_MEMORIES_PER_USER) {
      console.warn(`[Homer Memory] User ${input.userId} at memory limit, cannot add more`);
      throw new Error('Memory limit reached. Please delete some memories first.');
    }
  }
  
  const [memory] = await db.insert(homerMemories)
    .values({
      userId: input.userId || null,
      category: input.category,
      subject: input.subject,
      content: input.content,
      importance: input.importance || 5,
      tags: input.tags || [],
      expiresAt: input.expiresAt,
      sourceConversationId: input.sourceConversationId,
      sourceMessageId: input.sourceMessageId,
    })
    .returning();
  
  console.log(`[Homer Memory] Created: "${input.subject}" (${input.category})`);
  return memory as Memory;
}
```

---

## Step 5: Add Memory Stats Route

**Add this route to `server/routes/homer-routes.ts`:**

```typescript
/**
 * Get memory statistics
 */
router.get('/memories/stats', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const counts = await homerMemoryService.getMemoryCount(userId);
    
    res.json({
      success: true,
      stats: {
        personal: counts.personal,
        global: counts.global,
        total: counts.total,
        limits: {
          maxPersonal: 100,
          maxGlobal: 50,
        },
        usage: {
          personalPercent: Math.round((counts.personal / 100) * 100),
          globalPercent: Math.round((counts.global / 50) * 100),
        },
      },
    });

  } catch (error: any) {
    console.error('[Homer Routes] Memory stats error:', error);
    res.status(500).json({ error: 'Failed to get memory stats' });
  }
});

/**
 * Manually trigger memory cleanup
 */
router.post('/memories/prune', isAuthenticated, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const prunedCount = await homerMemoryService.pruneMemories(userId);
    
    res.json({
      success: true,
      prunedCount,
      message: `Pruned ${prunedCount} old or low-importance memories`,
    });

  } catch (error: any) {
    console.error('[Homer Routes] Prune error:', error);
    res.status(500).json({ error: 'Failed to prune memories' });
  }
});
```

---

## Step 6: Add Bulk Delete for Admin

**Add this route for Ryan (admin) to manage memories:**

```typescript
/**
 * Bulk delete memories by category or age (Admin only)
 */
router.delete('/memories/bulk', isAuthenticated, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { category, olderThanDays, importance } = req.body;
    
    let conditions = [eq(homerMemories.isActive, true)];
    
    if (category) {
      conditions.push(eq(homerMemories.category, category));
    }
    
    if (olderThanDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);
      conditions.push(lte(homerMemories.createdAt, cutoff));
    }
    
    if (importance) {
      conditions.push(lte(homerMemories.importance, importance));
    }
    
    // Soft delete matching memories
    const result = await db.update(homerMemories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(...conditions));
    
    res.json({
      success: true,
      message: 'Memories deleted',
    });

  } catch (error: any) {
    console.error('[Homer Routes] Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete memories' });
  }
});
```

---

## Memory Limits Summary

| Limit | Value | Behavior |
|-------|-------|----------|
| Max per user | 100 | Hard cap, error if exceeded |
| Max global | 50 | Shared memories across all users |
| Auto-prune trigger | 80% | Starts cleaning at 80 memories |
| Low-importance expiry | 90 days | Importance ≤ 3 deleted after 90 days |

## API Endpoints Added

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/homer/memories/stats` | Get memory usage stats |
| POST | `/api/homer/memories/prune` | Manually trigger cleanup (admin) |
| DELETE | `/api/homer/memories/bulk` | Bulk delete by criteria (admin) |

---

## Verification
1. Memory count method works
2. Auto-pruning triggers at 80% capacity
3. Hard limit prevents exceeding 100 memories
4. Stats endpoint shows usage
5. Admin can bulk delete old memories

## Next
Continue with Phase 9 (File Routes).

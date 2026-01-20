# Phase 8: Memory Routes

## Task
Add API routes for managing Homer's memories.

## Instructions
Add these routes to `server/routes/homer-routes.ts`

---

## Step 1: Add Import

**Add this import at the top of the file:**

```typescript
import { homerMemoryService } from '../services/homer-memory-service';
```

---

## Step 2: Add Memory Routes

**Add these routes BEFORE the `export default router;` line:**

```typescript
// ============================================
// MEMORY ENDPOINTS
// ============================================

/**
 * Get user's memories
 */
router.get('/memories', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const category = req.query.category as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    let memories;
    if (category) {
      memories = await homerMemoryService.getMemoriesByCategory(userId, category);
    } else {
      memories = await homerMemoryService.getMemoriesForUser(userId, { limit });
    }

    res.json({
      success: true,
      memories,
      count: memories.length,
    });

  } catch (error: any) {
    console.error('[Homer Routes] Get memories error:', error);
    res.status(500).json({ error: 'Failed to get memories' });
  }
});

/**
 * Create a memory manually
 */
router.post('/memories', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { category, subject, content, importance, tags, isGlobal } = req.body;

    if (!category || !subject || !content) {
      return res.status(400).json({ error: 'Category, subject, and content are required' });
    }

    const memory = await homerMemoryService.createMemory({
      userId: isGlobal ? null : userId,
      category,
      subject,
      content,
      importance: importance || 5,
      tags: tags || [],
    });

    res.json({
      success: true,
      memory,
    });

  } catch (error: any) {
    console.error('[Homer Routes] Create memory error:', error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

/**
 * Search memories
 */
router.get('/memories/search', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const memories = await homerMemoryService.searchMemories(userId, query);

    res.json({
      success: true,
      memories,
      count: memories.length,
    });

  } catch (error: any) {
    console.error('[Homer Routes] Search memories error:', error);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

/**
 * Update memory importance
 */
router.patch('/memories/:id/importance', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const memoryId = parseInt(req.params.id);
    const { importance } = req.body;

    if (isNaN(memoryId) || importance === undefined) {
      return res.status(400).json({ error: 'Memory ID and importance required' });
    }

    await homerMemoryService.updateImportance(memoryId, importance);

    res.json({
      success: true,
      message: 'Memory importance updated',
    });

  } catch (error: any) {
    console.error('[Homer Routes] Update importance error:', error);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

/**
 * Delete (deactivate) a memory
 */
router.delete('/memories/:id', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const memoryId = parseInt(req.params.id);

    if (isNaN(memoryId)) {
      return res.status(400).json({ error: 'Valid memory ID required' });
    }

    await homerMemoryService.deactivateMemory(memoryId);

    res.json({
      success: true,
      message: 'Memory deleted',
    });

  } catch (error: any) {
    console.error('[Homer Routes] Delete memory error:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});
```

---

## API Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/homer/memories` | Get all memories |
| GET | `/api/homer/memories?category=fact` | Get by category |
| GET | `/api/homer/memories/search?q=term` | Search memories |
| POST | `/api/homer/memories` | Create new memory |
| PATCH | `/api/homer/memories/:id/importance` | Update importance |
| DELETE | `/api/homer/memories/:id` | Delete memory |

---

## Verification
1. No TypeScript errors
2. Import added
3. All 6 memory routes added
4. Routes are before `export default router`

## Next
Proceed to Phase 9.

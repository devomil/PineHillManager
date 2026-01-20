# Phase 3: Memory Service

## Task
Create a service for managing Homer's memories.

## Instructions
Create a new file: `server/services/homer-memory-service.ts`

---

## File: `server/services/homer-memory-service.ts`

```typescript
import { db } from '../db';
import { homerMemories } from '@shared/schema';
import { eq, and, desc, gte, or, isNull, inArray } from 'drizzle-orm';

export interface Memory {
  id: number;
  userId: string | null;
  category: string;
  subject: string;
  content: string;
  importance: number;
  tags: string[];
  createdAt: Date;
}

export interface CreateMemoryInput {
  userId?: string | null;
  category: 'fact' | 'preference' | 'decision' | 'reminder' | 'context';
  subject: string;
  content: string;
  importance?: number;
  tags?: string[];
  expiresAt?: Date;
  sourceConversationId?: string;
  sourceMessageId?: string;
}

class HomerMemoryService {
  
  /**
   * Create a new memory
   */
  async createMemory(input: CreateMemoryInput): Promise<Memory> {
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
  
  /**
   * Get memories relevant for a user (their personal + global memories)
   */
  async getMemoriesForUser(userId: string, options?: {
    category?: string;
    limit?: number;
    minImportance?: number;
  }): Promise<Memory[]> {
    const limit = options?.limit || 50;
    const minImportance = options?.minImportance || 1;
    
    let query = db.select()
      .from(homerMemories)
      .where(
        and(
          // User's memories OR global memories
          or(
            eq(homerMemories.userId, userId),
            isNull(homerMemories.userId)
          ),
          // Active only
          eq(homerMemories.isActive, true),
          // Not expired
          or(
            isNull(homerMemories.expiresAt),
            gte(homerMemories.expiresAt, new Date())
          ),
          // Minimum importance
          gte(homerMemories.importance, minImportance)
        )
      )
      .orderBy(desc(homerMemories.importance), desc(homerMemories.createdAt))
      .limit(limit);
    
    const memories = await query;
    return memories as Memory[];
  }
  
  /**
   * Get memories by category
   */
  async getMemoriesByCategory(
    userId: string, 
    category: string
  ): Promise<Memory[]> {
    const memories = await db.select()
      .from(homerMemories)
      .where(
        and(
          or(
            eq(homerMemories.userId, userId),
            isNull(homerMemories.userId)
          ),
          eq(homerMemories.category, category),
          eq(homerMemories.isActive, true)
        )
      )
      .orderBy(desc(homerMemories.importance));
    
    return memories as Memory[];
  }
  
  /**
   * Search memories by tags or content
   */
  async searchMemories(
    userId: string, 
    searchTerm: string
  ): Promise<Memory[]> {
    // Simple search - in production, consider full-text search
    const allMemories = await this.getMemoriesForUser(userId, { limit: 100 });
    
    const lowerSearch = searchTerm.toLowerCase();
    return allMemories.filter(m => 
      m.subject.toLowerCase().includes(lowerSearch) ||
      m.content.toLowerCase().includes(lowerSearch) ||
      m.tags.some(t => t.toLowerCase().includes(lowerSearch))
    );
  }
  
  /**
   * Update a memory's importance
   */
  async updateImportance(memoryId: number, importance: number): Promise<void> {
    await db.update(homerMemories)
      .set({ 
        importance: Math.min(10, Math.max(1, importance)),
        updatedAt: new Date()
      })
      .where(eq(homerMemories.id, memoryId));
  }
  
  /**
   * Deactivate a memory (soft delete)
   */
  async deactivateMemory(memoryId: number): Promise<void> {
    await db.update(homerMemories)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(homerMemories.id, memoryId));
    
    console.log(`[Homer Memory] Deactivated memory ${memoryId}`);
  }
  
  /**
   * Get memory context formatted for Claude
   */
  async getMemoryContext(userId: string): Promise<string> {
    const memories = await this.getMemoriesForUser(userId, { 
      limit: 30,
      minImportance: 3 
    });
    
    if (memories.length === 0) {
      return '';
    }
    
    // Group by category
    const grouped: Record<string, Memory[]> = {};
    for (const memory of memories) {
      if (!grouped[memory.category]) {
        grouped[memory.category] = [];
      }
      grouped[memory.category].push(memory);
    }
    
    // Format for Claude
    let context = '<homer_memories>\n';
    
    for (const [category, categoryMemories] of Object.entries(grouped)) {
      context += `\n## ${category.charAt(0).toUpperCase() + category.slice(1)}s:\n`;
      for (const memory of categoryMemories.slice(0, 10)) {
        context += `- ${memory.subject}: ${memory.content}\n`;
      }
    }
    
    context += '</homer_memories>';
    return context;
  }
  
  /**
   * Extract and save memories from a conversation
   * Called by Claude when it identifies something worth remembering
   */
  async saveFromConversation(
    userId: string,
    conversationId: string,
    memories: Array<{
      category: CreateMemoryInput['category'];
      subject: string;
      content: string;
      importance?: number;
      tags?: string[];
    }>
  ): Promise<number> {
    let savedCount = 0;
    
    for (const memory of memories) {
      try {
        await this.createMemory({
          userId,
          category: memory.category,
          subject: memory.subject,
          content: memory.content,
          importance: memory.importance || 5,
          tags: memory.tags || [],
          sourceConversationId: conversationId,
        });
        savedCount++;
      } catch (error) {
        console.error('[Homer Memory] Error saving memory:', error);
      }
    }
    
    return savedCount;
  }
}

export const homerMemoryService = new HomerMemoryService();
```

---

## Verification
1. No TypeScript errors
2. File created at `server/services/homer-memory-service.ts`
3. All CRUD methods implemented

## Next
Proceed to Phase 4.

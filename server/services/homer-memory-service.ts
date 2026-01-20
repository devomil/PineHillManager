import { db } from '../db';
import { homerMemories } from '@shared/schema';
import { eq, and, desc, gte, or, isNull, inArray, lte, sql, isNotNull } from 'drizzle-orm';

// Memory limits (exported for use in routes)
export const MAX_MEMORIES_PER_USER = 100;
export const MAX_GLOBAL_MEMORIES = 50;
const AUTO_PRUNE_THRESHOLD = 0.8;
const LOW_IMPORTANCE_PRUNE_DAYS = 90;

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
  
  async createMemory(input: CreateMemoryInput): Promise<Memory> {
    // Auto-prune if needed before adding new memory
    if (input.userId) {
      await this.pruneMemories(input.userId);
    } else {
      await this.pruneGlobalMemories();
    }
    
    // Check if at hard limit
    if (input.userId) {
      const counts = await this.getMemoryCount(input.userId);
      if (counts.personal >= MAX_MEMORIES_PER_USER) {
        console.warn(`[Homer Memory] User ${input.userId} at memory limit, cannot add more`);
        throw new Error('Memory limit reached. Please delete some memories first.');
      }
    } else {
      // Check global memory limit
      const globalCount = await this.getGlobalMemoryCount();
      if (globalCount >= MAX_GLOBAL_MEMORIES) {
        console.warn(`[Homer Memory] Global memories at limit (${globalCount}/${MAX_GLOBAL_MEMORIES})`);
        throw new Error('Global memory limit reached. Please delete some global memories first.');
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
  
  async pruneMemories(userId: string): Promise<number> {
    const counts = await this.getMemoryCount(userId);
    let prunedCount = 0;
    
    // Check if we need to prune personal memories
    if (counts.personal >= MAX_MEMORIES_PER_USER * AUTO_PRUNE_THRESHOLD) {
      console.log(`[Homer Memory] User ${userId} at ${counts.personal}/${MAX_MEMORIES_PER_USER} - pruning`);
      
      // First, remove expired memories (only those with an expiry date set)
      await db.update(homerMemories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(homerMemories.userId, userId),
          eq(homerMemories.isActive, true),
          isNotNull(homerMemories.expiresAt),
          lte(homerMemories.expiresAt, new Date())
        ));
      
      // Then, remove old low-importance memories (importance <= 3, older than 90 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - LOW_IMPORTANCE_PRUNE_DAYS);
      
      await db.update(homerMemories)
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
        const excess = newCounts.personal - MAX_MEMORIES_PER_USER + 10;
        
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
  
  async getGlobalMemoryCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(homerMemories)
      .where(and(
        isNull(homerMemories.userId),
        eq(homerMemories.isActive, true)
      ));
    
    return Number(result?.count || 0);
  }
  
  async pruneGlobalMemories(): Promise<number> {
    const count = await this.getGlobalMemoryCount();
    let prunedCount = 0;
    
    if (count >= MAX_GLOBAL_MEMORIES * AUTO_PRUNE_THRESHOLD) {
      console.log(`[Homer Memory] Global memories at ${count}/${MAX_GLOBAL_MEMORIES} - pruning`);
      
      // Remove expired global memories
      await db.update(homerMemories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          isNull(homerMemories.userId),
          eq(homerMemories.isActive, true),
          isNotNull(homerMemories.expiresAt),
          lte(homerMemories.expiresAt, new Date())
        ));
      
      // Remove old low-importance global memories
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - LOW_IMPORTANCE_PRUNE_DAYS);
      
      await db.update(homerMemories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          isNull(homerMemories.userId),
          eq(homerMemories.isActive, true),
          lte(homerMemories.importance, 3),
          lte(homerMemories.createdAt, cutoffDate)
        ));
      
      // If still over limit, remove lowest importance
      const newCount = await this.getGlobalMemoryCount();
      if (newCount >= MAX_GLOBAL_MEMORIES) {
        const excess = newCount - MAX_GLOBAL_MEMORIES + 5;
        
        const toRemove = await db.select({ id: homerMemories.id })
          .from(homerMemories)
          .where(and(
            isNull(homerMemories.userId),
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
      
      console.log(`[Homer Memory] Pruned ${prunedCount} global memories`);
    }
    
    return prunedCount;
  }
  
  async getMemoriesForUser(userId: string, options?: {
    category?: string;
    limit?: number;
    minImportance?: number;
  }): Promise<Memory[]> {
    const limit = options?.limit || 50;
    const minImportance = options?.minImportance || 1;
    
    const conditions = [
      or(
        eq(homerMemories.userId, userId),
        isNull(homerMemories.userId)
      ),
      eq(homerMemories.isActive, true),
      or(
        isNull(homerMemories.expiresAt),
        gte(homerMemories.expiresAt, new Date())
      ),
      gte(homerMemories.importance, minImportance)
    ];
    
    if (options?.category) {
      conditions.push(eq(homerMemories.category, options.category));
    }
    
    const memories = await db.select()
      .from(homerMemories)
      .where(and(...conditions))
      .orderBy(desc(homerMemories.importance), desc(homerMemories.createdAt))
      .limit(limit);
    
    return memories as Memory[];
  }
  
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
          eq(homerMemories.isActive, true),
          or(
            isNull(homerMemories.expiresAt),
            gte(homerMemories.expiresAt, new Date())
          )
        )
      )
      .orderBy(desc(homerMemories.importance));
    
    return memories as Memory[];
  }
  
  async searchMemories(
    userId: string, 
    searchTerm: string
  ): Promise<Memory[]> {
    const allMemories = await this.getMemoriesForUser(userId, { limit: 100 });
    
    const lowerSearch = searchTerm.toLowerCase();
    return allMemories.filter(m => 
      m.subject.toLowerCase().includes(lowerSearch) ||
      m.content.toLowerCase().includes(lowerSearch) ||
      m.tags.some(t => t.toLowerCase().includes(lowerSearch))
    );
  }
  
  async updateImportance(memoryId: number, importance: number): Promise<void> {
    await db.update(homerMemories)
      .set({ 
        importance: Math.min(10, Math.max(1, importance)),
        updatedAt: new Date()
      })
      .where(eq(homerMemories.id, memoryId));
  }
  
  async deactivateMemory(memoryId: number): Promise<void> {
    await db.update(homerMemories)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(homerMemories.id, memoryId));
    
    console.log(`[Homer Memory] Deactivated memory ${memoryId}`);
  }
  
  async getMemoryContext(userId: string): Promise<string> {
    const memories = await this.getMemoriesForUser(userId, { 
      limit: 30,
      minImportance: 3 
    });
    
    if (memories.length === 0) {
      return '';
    }
    
    const grouped: Record<string, Memory[]> = {};
    for (const memory of memories) {
      if (!grouped[memory.category]) {
        grouped[memory.category] = [];
      }
      grouped[memory.category].push(memory);
    }
    
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

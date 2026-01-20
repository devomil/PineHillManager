import { db } from '../db';
import { homerMemories } from '@shared/schema';
import { eq, and, desc, gte, or, isNull } from 'drizzle-orm';

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

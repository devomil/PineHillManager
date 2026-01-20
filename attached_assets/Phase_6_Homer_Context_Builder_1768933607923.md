# Phase 6: Homer Context Builder

## Task
Create a unified context builder that combines user profile, memories, and files for Claude.

## Instructions
Create a new file: `server/services/homer-context-builder.ts`

---

## File: `server/services/homer-context-builder.ts`

```typescript
import { homerUserProfileService } from './homer-user-profile-service';
import { homerMemoryService } from './homer-memory-service';
import { homerFileService } from './homer-file-service';

export interface HomerContext {
  userContext: string;
  memoryContext: string;
  recentFilesContext: string;
  systemInstructions: string;
  fullContext: string;
}

class HomerContextBuilder {
  
  /**
   * Build complete context for a user query
   */
  async buildContext(userId: string, conversationId?: string): Promise<HomerContext> {
    // Fetch all context in parallel
    const [userContext, memoryContext, recentFiles] = await Promise.all([
      homerUserProfileService.getUserContext(userId),
      homerMemoryService.getMemoryContext(userId),
      homerFileService.getFilesForUser(userId, 10),
    ]);
    
    // Build files context
    let recentFilesContext = '';
    if (recentFiles.length > 0) {
      recentFilesContext = '<recent_files>\nFiles available to reference:\n';
      for (const file of recentFiles) {
        recentFilesContext += `- ${file.originalName} (${file.mimeType}) - ${file.description || 'No description'}\n`;
      }
      recentFilesContext += '</recent_files>';
    }
    
    // Build system instructions based on user preferences
    const profile = await homerUserProfileService.getProfile(userId);
    const systemInstructions = this.buildSystemInstructions(profile);
    
    // Combine everything
    const fullContext = `${systemInstructions}

${userContext}

${memoryContext}

${recentFilesContext}`.trim();
    
    return {
      userContext,
      memoryContext,
      recentFilesContext,
      systemInstructions,
      fullContext,
    };
  }
  
  /**
   * Build system instructions based on user profile
   */
  private buildSystemInstructions(profile: any): string {
    let instructions = `<homer_system_instructions>
You are Homer, an AI Business Intelligence assistant for a multi-location business.
You have access to sales, inventory, purchasing, and financial data.

Core Behaviors:
- Be proactive with insights when you notice something important
- Remember context from previous conversations using provided memories
- Personalize responses based on who you're talking to
- When asked to "remember" something, acknowledge it and I will save it to memory

Available Actions:
- Query sales, revenue, and financial data
- Analyze inventory levels and trends
- Review purchasing and vendor information
- Compare performance across locations
- Generate reports and summaries
- Save important information to memory when asked

When saving to memory, format your response to include:
<save_memory>
{
  "category": "fact|preference|decision|reminder|context",
  "subject": "Brief subject line",
  "content": "The actual information to remember",
  "importance": 1-10
}
</save_memory>
`;
    
    // Add user-specific instructions
    if (profile) {
      if (!profile.wantsDetailedAnalysis) {
        instructions += `\nIMPORTANT: This user prefers brief, concise responses. Lead with the key answer.\n`;
      }
      
      if (profile.wantsProactiveInsights) {
        instructions += `\nIf you notice anything noteworthy in the data (unusual trends, concerns, opportunities), proactively mention it.\n`;
      }
      
      if (profile.focusAreas.length > 0) {
        instructions += `\nThis user's primary focus areas are: ${profile.focusAreas.join(', ')}. Prioritize information relevant to these areas.\n`;
      }
    }
    
    instructions += `</homer_system_instructions>`;
    
    return instructions;
  }
  
  /**
   * Build context for file analysis
   */
  async buildFileAnalysisContext(
    userId: string, 
    fileId: string
  ): Promise<string> {
    const file = await homerFileService.getFile(fileId);
    if (!file) {
      return 'File not found.';
    }
    
    let context = `<file_for_analysis>
Filename: ${file.originalName}
Type: ${file.mimeType}
Uploaded by: User
`;
    
    // Add extracted text if available
    if ((file as any).extractedText) {
      context += `\nExtracted content:\n${(file as any).extractedText}\n`;
    }
    
    context += `</file_for_analysis>`;
    
    return context;
  }
  
  /**
   * Extract memories to save from Claude's response
   */
  parseMemoriesToSave(response: string): Array<{
    category: string;
    subject: string;
    content: string;
    importance: number;
  }> {
    const memories: Array<{
      category: string;
      subject: string;
      content: string;
      importance: number;
    }> = [];
    
    // Look for <save_memory> tags in response
    const memoryRegex = /<save_memory>([\s\S]*?)<\/save_memory>/g;
    let match;
    
    while ((match = memoryRegex.exec(response)) !== null) {
      try {
        const memoryJson = JSON.parse(match[1].trim());
        if (memoryJson.category && memoryJson.subject && memoryJson.content) {
          memories.push({
            category: memoryJson.category,
            subject: memoryJson.subject,
            content: memoryJson.content,
            importance: memoryJson.importance || 5,
          });
        }
      } catch (e) {
        console.warn('[Homer Context] Failed to parse memory JSON:', e);
      }
    }
    
    return memories;
  }
  
  /**
   * Clean response by removing memory tags (don't show to user)
   */
  cleanResponse(response: string): string {
    return response
      .replace(/<save_memory>[\s\S]*?<\/save_memory>/g, '')
      .trim();
  }
  
  /**
   * Get a personalized greeting
   */
  async getGreeting(userId: string): Promise<string> {
    return homerUserProfileService.getPersonalizedGreeting(userId);
  }
}

export const homerContextBuilder = new HomerContextBuilder();
```

---

## Verification
1. No TypeScript errors
2. File created at `server/services/homer-context-builder.ts`
3. Combines all context sources
4. Memory parsing from Claude responses implemented

## Next
Proceed to Phase 7.

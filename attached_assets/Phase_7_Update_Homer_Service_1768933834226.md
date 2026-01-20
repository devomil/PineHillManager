# Phase 7: Update Homer AI Service

## Task
Modify `server/services/homer-ai-service.ts` to integrate memory, files, and user profiles.

## Instructions
Make these modifications to the existing file.

---

## Step 1: Add Imports

**Find the imports section at the top and add:**

```typescript
import { homerContextBuilder } from './homer-context-builder';
import { homerMemoryService } from './homer-memory-service';
import { homerUserProfileService } from './homer-user-profile-service';
```

---

## Step 2: Update processQuery Method

**Find the `processQuery` method. Add context building BEFORE the Claude API call.**

**Find this section (near the beginning of processQuery):**
```typescript
async processQuery(
  userId: string,
  sessionId: string,
  question: string,
  inputMethod: 'text' | 'voice' = 'text'
): Promise<HomerResponse> {
  const startTime = Date.now();
```

**Add these lines right after `const startTime = Date.now();`:**

```typescript
    // Build personalized context
    console.log('[Homer] Building context for user:', userId);
    const context = await homerContextBuilder.buildContext(userId, sessionId);
    
    // Record this interaction
    await homerUserProfileService.recordInteraction(userId);
```

---

## Step 3: Update the System Prompt

**Find where the system prompt is built for Claude (look for `messages:` in the API call).**

**The system content should be updated to include the context. Find:**
```typescript
{
  role: 'user',
  content: `...` // or similar
}
```

**Update the system message to include context. Replace the existing system/user messages structure with:**

```typescript
messages: [
  {
    role: 'user',
    content: `${context.fullContext}

<business_data>
${JSON.stringify(businessData, null, 2)}
</business_data>

<user_question>
${question}
</user_question>

Please respond to the user's question. If they ask you to remember something, include a <save_memory> tag with the information to save.`,
  },
],
```

---

## Step 4: Process Memory Saves from Response

**Find where the response text is extracted from Claude's response. Look for:**
```typescript
const responseText = message.content[0].type === 'text'
  ? message.content[0].text
  : 'I apologize, I had trouble processing that request.';
```

**Add these lines right AFTER that:**

```typescript
      // Check for memories to save
      const memoriesToSave = homerContextBuilder.parseMemoriesToSave(responseText);
      if (memoriesToSave.length > 0) {
        console.log('[Homer] Saving', memoriesToSave.length, 'memories');
        await homerMemoryService.saveFromConversation(
          userId,
          sessionId,
          memoriesToSave as any[]
        );
      }
      
      // Clean the response (remove memory tags)
      const cleanedResponse = homerContextBuilder.cleanResponse(responseText);
```

**Then update the return and database insert to use `cleanedResponse` instead of `responseText`:**

```typescript
      await db.insert(homerConversations).values({
        userId,
        sessionId,
        role: 'assistant',
        content: cleanedResponse,  // Changed from responseText
        queryType,
        dataSourcesUsed,
        tokensUsed: message.usage?.output_tokens,
        responseTimeMs,
      });

      return {
        text: cleanedResponse,  // Changed from responseText
        queryType,
        dataSourcesUsed,
        tokensUsed: message.usage?.output_tokens,
        responseTimeMs,
      };
```

---

## Step 5: Add Greeting Method

**Add this new method to the HomerAIService class:**

```typescript
  /**
   * Get personalized greeting for a user
   */
  async getGreeting(userId: string): Promise<string> {
    return homerContextBuilder.getGreeting(userId);
  }
```

---

## Complete Updated Method Example

For reference, here's what the key parts should look like:

```typescript
async processQuery(
  userId: string,
  sessionId: string,
  question: string,
  inputMethod: 'text' | 'voice' = 'text'
): Promise<HomerResponse> {
  const startTime = Date.now();
  
  // Build personalized context
  console.log('[Homer] Building context for user:', userId);
  const context = await homerContextBuilder.buildContext(userId, sessionId);
  
  // Record this interaction
  await homerUserProfileService.recordInteraction(userId);
  
  // ... existing business data gathering code ...
  
  try {
    const message = await this.client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${context.fullContext}

<business_data>
${JSON.stringify(businessData, null, 2)}
</business_data>

<user_question>
${question}
</user_question>

Please respond to the user's question. If they ask you to remember something, include a <save_memory> tag with the information to save.`,
        },
      ],
    });
    
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : 'I apologize, I had trouble processing that request.';
    
    // Check for memories to save
    const memoriesToSave = homerContextBuilder.parseMemoriesToSave(responseText);
    if (memoriesToSave.length > 0) {
      console.log('[Homer] Saving', memoriesToSave.length, 'memories');
      await homerMemoryService.saveFromConversation(userId, sessionId, memoriesToSave as any[]);
    }
    
    // Clean the response
    const cleanedResponse = homerContextBuilder.cleanResponse(responseText);
    
    // ... rest of method using cleanedResponse ...
  }
}
```

---

## Verification
1. No TypeScript errors
2. New imports added
3. Context is built before Claude API call
4. Memory extraction from responses works
5. Response is cleaned before showing to user

## Next
Proceed to Phase 8.

# Phase 5: User Profile Service

## Task
Create a service for managing Homer user profiles and personalization.

## Instructions
Create a new file: `server/services/homer-user-profile-service.ts`

---

## File: `server/services/homer-user-profile-service.ts`

```typescript
import { db } from '../db';
import { homerUserProfiles } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface UserProfile {
  id: number;
  userId: string;
  displayName: string;
  preferredName?: string;
  role: string;
  title?: string;
  communicationStyle: string;
  preferredGreeting?: string;
  wantsDetailedAnalysis: boolean;
  wantsProactiveInsights: boolean;
  focusAreas: string[];
  responsibilities?: string;
  workingHours?: string;
  timezone: string;
  lastInteraction?: Date;
  totalInteractions: number;
}

class HomerUserProfileService {
  
  // Cache profiles to avoid repeated DB queries
  private profileCache: Map<string, { profile: UserProfile; cachedAt: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Get user profile by user ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    // Check cache first
    const cached = this.profileCache.get(userId);
    if (cached && Date.now() - cached.cachedAt < this.cacheTimeout) {
      return cached.profile;
    }
    
    const [profile] = await db.select()
      .from(homerUserProfiles)
      .where(eq(homerUserProfiles.userId, userId));
    
    if (profile) {
      this.profileCache.set(userId, { 
        profile: profile as UserProfile, 
        cachedAt: Date.now() 
      });
    }
    
    return profile as UserProfile || null;
  }
  
  /**
   * Get the name to use when addressing the user
   */
  async getGreetingName(userId: string): Promise<string> {
    const profile = await this.getProfile(userId);
    return profile?.preferredName || profile?.displayName || 'there';
  }
  
  /**
   * Record an interaction
   */
  async recordInteraction(userId: string): Promise<void> {
    await db.update(homerUserProfiles)
      .set({
        lastInteraction: new Date(),
        totalInteractions: (await this.getProfile(userId))?.totalInteractions || 0 + 1,
        updatedAt: new Date(),
      })
      .where(eq(homerUserProfiles.userId, userId));
    
    // Invalidate cache
    this.profileCache.delete(userId);
  }
  
  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: {
    communicationStyle?: string;
    wantsDetailedAnalysis?: boolean;
    wantsProactiveInsights?: boolean;
    focusAreas?: string[];
    preferredGreeting?: string;
  }): Promise<void> {
    await db.update(homerUserProfiles)
      .set({
        ...preferences,
        updatedAt: new Date(),
      })
      .where(eq(homerUserProfiles.userId, userId));
    
    this.profileCache.delete(userId);
  }
  
  /**
   * Get context for Claude about this user
   */
  async getUserContext(userId: string): Promise<string> {
    const profile = await this.getProfile(userId);
    
    if (!profile) {
      return '<user_context>Unknown user. Use a professional, helpful tone.</user_context>';
    }
    
    const name = profile.preferredName || profile.displayName;
    const timeOfDay = this.getTimeOfDay(profile.timezone);
    
    let context = `<user_context>
You are speaking with ${name}.
- Role: ${profile.title || profile.role}
- Communication style preference: ${profile.communicationStyle}
- Wants detailed analysis: ${profile.wantsDetailedAnalysis ? 'Yes' : 'No, prefers brief summaries'}
- Focus areas: ${profile.focusAreas.join(', ') || 'General business'}
- Responsibilities: ${profile.responsibilities || 'Not specified'}

Personalization instructions:
`;
    
    // Add communication style guidance
    switch (profile.communicationStyle) {
      case 'technical':
        context += `- ${name} appreciates technical details, data, and specific numbers
- Include metrics, percentages, and precise figures
- Can use technical terminology without explanation\n`;
        break;
      case 'brief':
        context += `- ${name} prefers concise, to-the-point responses
- Lead with the answer, then provide supporting details if asked
- Use bullet points for quick scanning\n`;
        break;
      case 'casual':
        context += `- ${name} prefers a conversational, friendly tone
- Can use relaxed language while remaining professional\n`;
        break;
      default: // professional
        context += `- Use a professional but warm tone
- Balance thoroughness with clarity\n`;
    }
    
    // Add focus area guidance
    if (profile.focusAreas.length > 0) {
      context += `- When possible, relate information to their focus areas: ${profile.focusAreas.join(', ')}\n`;
    }
    
    // Add time-appropriate greeting suggestion
    context += `- Time of day for them: ${timeOfDay}\n`;
    
    // Add interaction history context
    if (profile.totalInteractions > 0) {
      context += `- This is not their first conversation with you (${profile.totalInteractions} previous interactions)\n`;
    } else {
      context += `- This appears to be their first conversation with you\n`;
    }
    
    context += '</user_context>';
    
    return context;
  }
  
  /**
   * Get time of day for greeting
   */
  private getTimeOfDay(timezone: string): string {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      });
      const hour = parseInt(formatter.format(now));
      
      if (hour < 12) return 'morning';
      if (hour < 17) return 'afternoon';
      return 'evening';
    } catch {
      return 'day';
    }
  }
  
  /**
   * Generate personalized greeting
   */
  async getPersonalizedGreeting(userId: string): Promise<string> {
    const profile = await this.getProfile(userId);
    
    if (!profile) {
      return "Hello! How can I help you today?";
    }
    
    const name = profile.preferredName || profile.displayName.split(' ')[0];
    const timeOfDay = this.getTimeOfDay(profile.timezone);
    
    // Custom greeting if set
    if (profile.preferredGreeting) {
      return profile.preferredGreeting.replace('{name}', name);
    }
    
    // Generate contextual greeting
    const greetings = {
      morning: [
        `Good morning, ${name}!`,
        `Morning, ${name}! Ready to dive into the numbers?`,
      ],
      afternoon: [
        `Good afternoon, ${name}!`,
        `Hey ${name}, how's the day going?`,
      ],
      evening: [
        `Good evening, ${name}!`,
        `Evening, ${name}! Wrapping up the day?`,
      ],
    };
    
    const options = greetings[timeOfDay as keyof typeof greetings] || greetings.afternoon;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  /**
   * Clear cache (useful after updates)
   */
  clearCache(): void {
    this.profileCache.clear();
  }
}

export const homerUserProfileService = new HomerUserProfileService();
```

---

## Verification
1. No TypeScript errors
2. File created at `server/services/homer-user-profile-service.ts`
3. Profile caching implemented
4. User context generation for Claude

## Next
Proceed to Phase 6.

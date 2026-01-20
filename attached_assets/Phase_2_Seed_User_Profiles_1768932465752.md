# Phase 2: Seed User Profiles

## Task
Create a seed script to pre-populate the 4 team member profiles.

## Instructions
Create a new file: `server/seeds/homer-user-profiles.ts`

---

## File: `server/seeds/homer-user-profiles.ts`

```typescript
import { db } from '../db';
import { homerUserProfiles, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface TeamMemberSeed {
  displayName: string;
  preferredName?: string;
  role: string;
  title: string;
  email: string; // Used to match existing user
  communicationStyle: string;
  focusAreas: string[];
  responsibilities: string;
  wantsDetailedAnalysis: boolean;
  wantsProactiveInsights: boolean;
}

const teamMembers: TeamMemberSeed[] = [
  {
    displayName: 'Ryan Sorensen',
    preferredName: 'Ryan',
    role: 'Admin',
    title: 'Technology Director',
    email: 'ryan@', // Partial match - update with actual email
    communicationStyle: 'technical',
    focusAreas: ['technology', 'integrations', 'analytics', 'automation'],
    responsibilities: 'Oversees all technology systems, integrations, and data analytics. Builds automation and AI solutions. Primary technical decision maker.',
    wantsDetailedAnalysis: true,
    wantsProactiveInsights: true,
  },
  {
    displayName: 'Jacalyn Phillips',
    preferredName: 'Jackie',
    role: 'Owner-Manager',
    title: 'Owner',
    email: 'jacalyn@', // Partial match - update with actual email
    communicationStyle: 'professional',
    focusAreas: ['revenue', 'profitability', 'growth', 'strategy'],
    responsibilities: 'Business owner focused on overall performance, profitability, and strategic growth. Wants high-level insights and trend analysis.',
    wantsDetailedAnalysis: true,
    wantsProactiveInsights: true,
  },
  {
    displayName: 'Leanne Anthon',
    preferredName: 'Leanne',
    role: 'Owner-Manager',
    title: 'Operations Manager',
    email: 'leanne@', // Partial match - update with actual email
    communicationStyle: 'brief',
    focusAreas: ['inventory', 'purchasing', 'vendors', 'operations'],
    responsibilities: 'Manages day-to-day operations, inventory control, vendor relationships, and purchasing decisions.',
    wantsDetailedAnalysis: false,
    wantsProactiveInsights: true,
  },
  {
    displayName: 'Lynley Gray',
    preferredName: 'Lynley',
    role: 'Owner-Manager',
    title: 'Operations Manager',
    email: 'lynley@', // Partial match - update with actual email
    communicationStyle: 'professional',
    focusAreas: ['scheduling', 'labor', 'customer-service', 'operations'],
    responsibilities: 'Manages scheduling, labor costs, and customer service operations. Focused on team efficiency and service quality.',
    wantsDetailedAnalysis: false,
    wantsProactiveInsights: true,
  },
];

export async function seedHomerUserProfiles() {
  console.log('[Homer Seed] Starting user profile seeding...');
  
  for (const member of teamMembers) {
    try {
      // Try to find existing user by email pattern
      const existingUsers = await db.select()
        .from(users)
        .where(eq(users.email, member.email));
      
      // If no exact match, try to find by name or partial email
      let userId: string | null = null;
      
      if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
      } else {
        // Search by display name in existing users
        const allUsers = await db.select().from(users);
        const matchedUser = allUsers.find(u => 
          u.email?.toLowerCase().includes(member.displayName.split(' ')[0].toLowerCase()) ||
          (u as any).name?.toLowerCase().includes(member.displayName.toLowerCase())
        );
        
        if (matchedUser) {
          userId = matchedUser.id;
        }
      }
      
      if (!userId) {
        console.warn(`[Homer Seed] Could not find user for ${member.displayName} - creating placeholder`);
        userId = `placeholder-${member.displayName.toLowerCase().replace(' ', '-')}`;
      }
      
      // Check if profile already exists
      const existingProfile = await db.select()
        .from(homerUserProfiles)
        .where(eq(homerUserProfiles.userId, userId));
      
      if (existingProfile.length > 0) {
        // Update existing profile
        await db.update(homerUserProfiles)
          .set({
            displayName: member.displayName,
            preferredName: member.preferredName,
            role: member.role,
            title: member.title,
            communicationStyle: member.communicationStyle,
            focusAreas: member.focusAreas,
            responsibilities: member.responsibilities,
            wantsDetailedAnalysis: member.wantsDetailedAnalysis,
            wantsProactiveInsights: member.wantsProactiveInsights,
            updatedAt: new Date(),
          })
          .where(eq(homerUserProfiles.userId, userId));
        
        console.log(`[Homer Seed] Updated profile for ${member.displayName}`);
      } else {
        // Insert new profile
        await db.insert(homerUserProfiles).values({
          userId,
          displayName: member.displayName,
          preferredName: member.preferredName,
          role: member.role,
          title: member.title,
          communicationStyle: member.communicationStyle,
          focusAreas: member.focusAreas,
          responsibilities: member.responsibilities,
          wantsDetailedAnalysis: member.wantsDetailedAnalysis,
          wantsProactiveInsights: member.wantsProactiveInsights,
        });
        
        console.log(`[Homer Seed] Created profile for ${member.displayName}`);
      }
      
    } catch (error) {
      console.error(`[Homer Seed] Error seeding ${member.displayName}:`, error);
    }
  }
  
  console.log('[Homer Seed] User profile seeding complete!');
}

// Run if called directly
if (require.main === module) {
  seedHomerUserProfiles()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
```

---

## Run the Seed

Add to `package.json` scripts:
```json
"db:seed:homer": "npx tsx server/seeds/homer-user-profiles.ts"
```

Then run:
```bash
npm run db:seed:homer
```

Or run directly:
```bash
npx tsx server/seeds/homer-user-profiles.ts
```

---

## Important Note
After running, you may need to update the `userId` fields to match actual user IDs in your system. Check the `users` table for the correct IDs.

## Verification
1. Seed script runs without errors
2. Four profiles exist in `homer_user_profiles` table
3. Each profile has correct focus areas and preferences

## Next
Proceed to Phase 3.

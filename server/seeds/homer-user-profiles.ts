import { db } from '../db';
import { homerUserProfiles, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'url';

interface TeamMemberSeed {
  displayName: string;
  preferredName?: string;
  role: string;
  title: string;
  email: string;
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
    email: 'ryan@pinehillfarm.co',
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
    email: 'jackie@pinehillfarm.co',
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
    email: 'leanne@pinehillfarm.co',
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
    email: 'lynley@pinehillfarm.co',
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
      const existingUsers = await db.select()
        .from(users)
        .where(eq(users.email, member.email));
      
      let userId: string | null = null;
      
      if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
      } else {
        const allUsers = await db.select().from(users);
        const matchedUser = allUsers.find(u => 
          u.email?.toLowerCase().includes(member.displayName.split(' ')[0].toLowerCase()) ||
          u.firstName?.toLowerCase() === member.displayName.split(' ')[0].toLowerCase()
        );
        
        if (matchedUser) {
          userId = matchedUser.id;
        }
      }
      
      if (!userId) {
        console.warn(`[Homer Seed] Could not find user for ${member.displayName} - creating placeholder`);
        userId = `placeholder-${member.displayName.toLowerCase().replace(' ', '-')}`;
      }
      
      const existingProfile = await db.select()
        .from(homerUserProfiles)
        .where(eq(homerUserProfiles.userId, userId));
      
      if (existingProfile.length > 0) {
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

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  seedHomerUserProfiles()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

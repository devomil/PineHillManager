# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive platform designed to streamline operations for employees, managers, and administrators at Pine Hill Farm. Its core purpose is to provide role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to integrate essential business tools to offer an all-in-one solution for farm management, enhancing efficiency and oversight across all departments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite. Radix UI provides accessible components, styled with Tailwind CSS, ensuring a consistent and branded look using the Great Vibes font. The design emphasizes a clear, multi-role dashboard experience for Admin, Manager, and Employee users with dedicated page access. A modern, responsive sidebar navigation is implemented for admin/manager users, featuring collapsible desktop functionality and a mobile hamburger drawer menu.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query, Wouter.
- **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM, bcrypt, session-based authentication.
- **Database**: PostgreSQL hosted on Neon Database, Drizzle ORM for type-safe operations and migrations.
- **Data Storage**: Replit Object Storage (Google Cloud Storage) for announcement images with presigned URL uploads and ACL policies.
- **Communication**: Mobile-first SMS integration via Twilio API, SendGrid for email, WebSocket support for real-time features.
- **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
- **Time Management**: Clock in/out, break tracking, multi-location scheduling, time off requests, manual time entry, and comprehensive Scheduled vs Actual Hours reporting. Includes a modern drag-and-drop scheduling interface, PDF schedule generation, and a comprehensive shift swap system with SMS notifications.
- **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive responses and TCPA-compliant consent tracking via Twilio. Real-time integration via WebSockets.
- **Document Management**: Comprehensive document center with dual interfaces for role-based access (Admin/Manager with full control, Employee with read-only access). Supports upload, categorization, permissions, and audit trails.
- **Inventory Management**: Dedicated `/inventory` page with dual-system tracking reconciling Clover POS (live inventory) and Thrive (vendor/cost data). Features include a unified dashboard, real-time sync status, profitability analytics, manual matching interface, and enhanced CSV import. Includes vendor analytics for purchasing negotiations.
- **Order Management**: Dedicated `/orders` page for comprehensive order processing with real-time analytics, payment tracking, and performance insights, optimized for fast page loads.
- **Accounting**: Comprehensive financial management with live integrations for Clover POS, Amazon Store, HSA, and Thrive inventory. Features real-time revenue dashboards, multi-location analytics, accurate COGS calculations, discount/refund reporting, automated Chart of Accounts, and QuickBooks Online integration. Includes a cached financial reports system for optimized historical data retrieval.
- **Employee Purchase Portal**: Dedicated `/employee-purchases` page for employees to scan and purchase inventory items using a monthly allowance, with real-time balance tracking and purchase history. Features role-based pricing, an enhanced shopping cart, Clover payment integration, and automatic inventory deduction.
- **Task Management System**: Comprehensive task management system with role-based access, supporting task creation, priority/due dates, assignees, checklists, status tracking, and comments.
- **Training & Learning System**: Comprehensive employee training platform with personalized learning paths, progress tracking, skill assessment, and AI-powered content generation.

### System Design Choices
The system follows a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is designed for clarity, and performance is considered through optimized database queries and consistent timezone handling. The architecture supports multi-merchant configurations and department-specific page access. Key optimizations include real-time API data fetching, efficient React Query caching, and a self-contained component design. All endpoints require proper authentication.

## External Dependencies

-   **Email Service**: SendGrid
-   **Database Hosting**: Neon Database
-   **ORM**: Drizzle
-   **UI Components**: Radix UI
-   **Styling**: Tailwind CSS
-   **Fonts**: Great Vibes
-   **Development Tools**: TypeScript, Vite, React Query
-   **Accounting Integrations**: QuickBooks, Clover POS, Amazon Store API, HSA Providers, Thrive Inventory
-   **Content Generation**: Hugging Face API
-   **SMS Service**: Twilio API

## Database Migration Workflow

### Overview
This workflow ensures safe database schema changes without risking production data. All database modifications should follow this process to minimize downtime and prevent data loss.

### Pre-Migration Checklist

**Before making any database changes:**
1. ✅ Document what you're changing and why
2. ✅ Identify which tables/columns will be affected
3. ✅ Check if existing code depends on current structure
4. ✅ Plan for backward compatibility during transition
5. ✅ Schedule changes during low-traffic periods (if significant)

### Step-by-Step Migration Process

#### Phase 1: Planning & Schema Design

**1. Update the Schema File** (`shared/schema.ts`)
   - Add new tables/columns with proper types
   - Use `.default()` for new columns to avoid breaking existing data
   - Keep old columns/tables initially (don't delete yet)
   
**Example - Adding a new column:**
```typescript
// GOOD: Add new column with default value
export const employees = pgTable('employees', {
  // ... existing columns
  department: varchar('department', { length: 100 }).default('General'), // New column
});

// BAD: Don't add required columns without defaults
// phone: varchar('phone', { length: 20 }).notNull(), // ❌ This breaks existing rows
```

**2. Generate Migration File**
```bash
npm run db:generate
```
This creates a migration SQL file in `drizzle/` directory.

**3. Review the Migration SQL**
   - Open the generated `.sql` file
   - Verify the SQL commands are safe
   - Check for any DROP or DELETE statements
   - Ensure default values are set correctly

#### Phase 2: Testing in Development

**4. Apply Migration to Development Database**
```bash
npm run db:migrate
```

**5. Test the Application**
   - Restart the application workflow
   - Test all affected features
   - Check browser console for errors
   - Verify queries return expected data
   - Test both old and new code paths

**6. Verify Data Integrity**
   - Check that existing data is intact
   - Verify new columns have default values
   - Test insert/update operations
   - Confirm all relationships still work

**7. Monitor Error Logs**
   - Check workflow logs for database errors
   - Look for CRITICAL warnings in server logs
   - Verify no DATA_LOSS markers appear
   - Test accounting/COGS endpoints if financial tables changed

#### Phase 3: Code Updates

**8. Update Storage Interface** (`server/storage.ts`)
   - Add new methods for new functionality
   - Keep old methods working during transition
   - Add type safety with new schema types

**9. Update API Routes** (`server/routes.ts`)
   - Add new endpoints if needed
   - Keep old endpoints functional
   - Add validation for new fields

**10. Update Frontend Components**
   - Add UI for new features
   - Ensure old features still work
   - Test loading states and error handling

#### Phase 4: Cleanup (After Testing)

**11. Gradual Deprecation**
   - Mark old columns/methods as deprecated
   - Add console warnings for old usage
   - Give time for transition (days/weeks)

**12. Final Removal**
   - Generate migration to remove old columns
   - Test thoroughly before applying
   - Document the removal

### Safe Migration Patterns

**✅ SAFE Changes (Low Risk):**
- Adding new tables
- Adding new columns with defaults
- Adding indexes
- Creating new relationships
- Expanding column length (varchar 100 → 255)

**⚠️ CAREFUL Changes (Medium Risk):**
- Adding required columns (use defaults first)
- Renaming columns (needs dual-write period)
- Changing column types (test thoroughly)
- Adding unique constraints

**❌ RISKY Changes (High Risk):**
- Dropping columns actively used by code
- Dropping tables with live data
- Changing primary keys
- Removing constraints code depends on

### Rollback Procedures

**If Something Goes Wrong:**

**Option 1: Code Rollback (Preferred)**
1. Click "Rollback" in Replit workspace
2. Select the checkpoint before the migration
3. This restores code but keeps database intact
4. Fix the issue and try again

**Option 2: Database Rollback (Use with Caution)**
1. Click "Rollback" in Replit workspace
2. Check "Restore databases" under additional options
3. This resets BOTH code AND database
4. ⚠️ Only use if development data is corrupted

**Option 3: Manual Rollback**
1. Write a reverse migration SQL file
2. Test the rollback locally
3. Apply manually via database tools

### Production Deployment Guidelines

**When Deploying to Production:**

1. **Backup First**
   - Production database backups are automatic (Neon)
   - Create manual backup before major changes
   - Document backup location

2. **Deploy in Stages**
   ```
   Stage 1: Deploy code that works with OLD and NEW schema
   Stage 2: Run migration on production database
   Stage 3: Deploy code that uses new schema only
   ```

3. **Monitor After Deployment**
   - Watch error logs for 24-48 hours
   - Monitor query performance
   - Check critical endpoints (accounting, orders)
   - Verify user-facing features work

4. **Have Rollback Plan Ready**
   - Document rollback steps before deploying
   - Keep previous version available
   - Have database restore procedure ready

### Migration Best Practices

**DO:**
- ✅ Make small, incremental changes
- ✅ Test extensively in development
- ✅ Use transactions for data migrations
- ✅ Add default values to new columns
- ✅ Keep migrations reversible when possible
- ✅ Document breaking changes
- ✅ Use type-safe Drizzle queries

**DON'T:**
- ❌ Drop columns without verifying code doesn't use them
- ❌ Change types without testing data conversion
- ❌ Skip testing in development
- ❌ Deploy during peak hours
- ❌ Forget to communicate changes to team
- ❌ Rush complex migrations

### Common Migration Scenarios

**Scenario 1: Adding a New Feature**
```
1. Add new table/columns with defaults
2. Deploy code that can handle both states
3. Test new feature with new data
4. Gradually migrate old data if needed
5. Clean up after transition period
```

**Scenario 2: Renaming a Column**
```
1. Add new column with correct name
2. Dual-write: Update code to write to BOTH columns
3. Backfill: Copy data from old to new column
4. Dual-read: Read from new column, fall back to old
5. Deploy code that only uses new column
6. Remove old column in separate migration
```

**Scenario 3: Changing Data Type**
```
1. Add new column with new type
2. Write migration to transform and copy data
3. Update code to use new column
4. Test thoroughly with real data
5. Remove old column after verification
```

### Emergency Contacts & Resources

**If You Need Help:**
- Replit Support: support@replit.com
- Database Provider (Neon): Check dashboard for support
- Drizzle Documentation: https://orm.drizzle.team/docs/migrations

**Monitoring Dashboard:**
- Development Database: Access via Replit Database pane
- Workflow Logs: Check for errors and warnings
- Browser Console: Monitor client-side errors

### Recent Changes Log

**2025-11-07: Employee Purchase Portal UI Refresh Fix**
- Fixed instant UI updates after purchases by switching from invalidateQueries to refetchQueries
- TanStack Query v5 invalidateQueries wasn't triggering refetches despite staleTime: 0
- refetchQueries forces immediate network refetch, ensuring purchase history and balance update without hard refresh
- Applied fix to both free and paid purchase flows with parallel Promise.all execution
- Maintained consistent form state clearing across all completion and cancellation paths
- Backend correctly deducts Clover inventory via API (verified with successful stock updates)

**2025-11-07: Data Loss Prevention Safeguards**
- Added global error handling in React Query
- Implemented visual error states in accounting dashboard
- Created type-safe query builder with Zod validation
- Enhanced server-side logging for COGS endpoints
- Fixed queryClient parameter serialization bug
# Pine Hill Farm Employee Management System

## Overview

Pine Hill Farm Employee Management System is a comprehensive business management platform built with React (Vite), Express.js, and PostgreSQL. The system provides role-based access for employees, managers, and administrators with features including time tracking, scheduling, communication tools, support ticket management, and a comprehensive accounting tool with QuickBooks, Clover POS, HSA, and Thrive inventory integrations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Authentication**: Session-based authentication with role-based access control
- **Styling**: Tailwind CSS with custom Pine Hill Farm branding using Great Vibes font

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Session-based auth with bcrypt password hashing and PostgreSQL session storage
- **Email Service**: SendGrid integration for support ticket notifications
- **File Uploads**: Multer for handling file uploads (5MB limit)
- **Real-time Features**: WebSocket support for notifications and messaging

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon Database
- **ORM**: Drizzle ORM with migrations managed by Drizzle Kit
- **Session Storage**: PostgreSQL-backed sessions with 7-day expiration
- **File Storage**: Local file system for uploads (documents, attachments)

## Key Components

### Authentication & User Management
- **Multi-role System**: Admin, Manager, and Employee roles with different permission levels
- **Employee Management**: Complete CRUD operations for employee profiles
- **Password Security**: Bcrypt hashing with 10 salt rounds, password reset functionality
- **Invitation System**: Admin-controlled employee invitation and registration process

### Core Features
- **Time Clock System**: Clock in/out functionality with break tracking
- **Work Scheduling**: Multi-location schedule management (Lake Geneva, Watertown locations)
- **Time Off Management**: Request submission, approval workflow, and balance tracking
- **Communication Tools**: Team messaging, company announcements, and support tickets
- **Document Management**: File sharing with role-based permissions
- **Accounting Tool**: Comprehensive financial management with QuickBooks, Clover POS, HSA, and Thrive integrations

### Support System
- **Intelligent Routing**: Employee issues → Jackie (HR), Technical issues → Ryan
- **Email Notifications**: Professional SendGrid templates with Pine Hill Farm branding
- **Priority-based Handling**: Automatic categorization and routing of support requests

## Data Flow

### Authentication Flow
1. User submits login credentials
2. Server validates against bcrypt-hashed passwords
3. Session created and stored in PostgreSQL
4. Role-based redirects (Admin → Admin Dashboard, Employee → Employee Dashboard)

### Time Tracking Flow
1. Employee clicks clock in/out
2. Frontend validates current status
3. API creates time clock entry with CST timezone
4. Real-time updates via polling (30-second intervals)

### Support Ticket Flow
1. Employee submits support request via categorized forms
2. System routes to appropriate personnel based on category
3. SendGrid sends professional email notification
4. Admin can track and manage tickets through dashboard

## External Dependencies

### Email Service
- **SendGrid**: Production email delivery for support tickets and notifications
- **Configuration**: API key-based authentication with branded templates

### Database
- **Neon Database**: Serverless PostgreSQL with connection pooling
- **Drizzle**: Type-safe ORM with automatic migrations

### UI Components
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Great Vibes Font**: Custom branding font loaded from Google Fonts

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **Vite**: Fast development build tool with HMR
- **React Query**: Server state management with caching and synchronization

## Recent Changes (January 2025)

### Navigation System Fix (July 21, 2025)
- **Critical Bug Resolution**: Fixed persistent RovingFocusGroupItem React error caused by nested Tabs components
- **AdminLayout Refactoring**: Converted entire AdminLayout from Tabs/TabsTrigger system to Button-based navigation
- **Component Cleanup**: Removed all conflicting TabsContent and TabsTrigger imports across admin pages
- **Navigation Stability**: Eliminated console errors during admin page navigation while maintaining all styling and functionality
- **User Experience**: Smooth navigation between Dashboard, Employees, Accounting, Scheduling, and other admin sections confirmed working

### Accounting Tool Implementation (Phase 1 Complete)
- **Database Schema**: Extended PostgreSQL with comprehensive accounting tables (financial_accounts, financial_transactions, transaction_lines, quickbooks_config, clover_config, hsa_config, thrive_config, customers_vendors, inventory_items, pos_sales, pos_sale_items, hsa_expenses, integration_logs, report_configs, dashboard_widgets)
- **Storage Layer**: Implemented 96+ accounting methods in DatabaseStorage class for complete financial data management
- **API Routes**: Added comprehensive accounting API endpoints covering configurations, accounts, transactions, customers/vendors, inventory, and analytics
- **Frontend Dashboard**: Created accounting dashboard with system health monitoring, multi-tab interface, and integration status tracking

### External Integrations Framework (Phase 2 Complete - January 2025)
- **QuickBooks Integration**: OAuth 2.0 flow, chart of accounts sync, customer/vendor management, transaction processing
- **Clover POS Integration**: Live production API integration with Lake Geneva Retail (2DWZED6B4ZVF1), daily sales sync, transaction categorization, payment method breakdown, inventory integration
- **HSA Provider Integration**: Medical expense tracking, compliance reporting, receipt management, eligibility verification
- **Thrive Inventory Integration**: Real-time stock monitoring, low stock alerts, purchase order tracking, COGS calculation
- **Integration Dashboard**: Complete UI for managing all external connections with test capabilities and status monitoring
- **API Infrastructure**: 50+ integration-specific API endpoints with OAuth handling and error logging

### Clover POS Integration Details (July 31, 2025)
- **Production Environment**: Successfully configured with https://api.clover.com
- **Merchant Accounts**: 6 total locations (Lake Geneva Retail, Watertown Retail, Lake Geneva HSA, Watertown HSA, Pine Hill Farm Main, Online Store)
- **Authentication**: Production API tokens with Read/Write permissions for Orders, Payments, Customers, Inventory, Merchant APIs
- **Active Integration**: Lake Geneva Retail (2DWZED6B4ZVF1) fully operational
- **Setup Guide**: Complete documentation in CLOVER_INTEGRATION_SETUP.md for additional merchant configuration
- **Sales Sync**: Real-time transaction data retrieval and accounting system integration
- **Database Schema**: Fixed all missing columns in pos_sales and pos_sale_items tables (employee_id, customer_count, status, qb_posted, qb_transaction_id, last_sync_at, inventory_item_id, line_total, discount_amount)
- **Credential Persistence**: Enhanced UI to save and display multiple merchant configurations with visible API tokens

## Deployment Strategy

### Production Readiness (V1.2 + Accounting Phase 1)
- **Database**: Optimized PostgreSQL schema with proper indexing and accounting tables
- **Performance**: Request monitoring middleware and query optimization
- **Security**: Session-based authentication with CSRF protection
- **Email**: Production SendGrid configuration for reliable notifications
- **Error Handling**: Comprehensive error boundaries and API error responses
- **Accounting Foundation**: Complete backend infrastructure ready for external integrations

### Environment Configuration
- **Development**: Local development with hot reloading via Vite
- **Production**: Node.js server with built frontend assets
- **Database**: Environment-specific PostgreSQL connections
- **Session Management**: Secure session configuration with appropriate cookie settings

### Monitoring & Performance
- **Performance Middleware**: Request timing and slow query detection
- **Query Optimization**: Proper database indexing for frequent operations
- **CST Timezone**: Consistent time formatting using date-fns-tz
- **Memory Management**: Efficient resource usage with connection pooling

The system is designed for scalability and maintainability, with clear separation of concerns between frontend and backend, comprehensive error handling, and production-ready security measures.
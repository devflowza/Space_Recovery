# xSuite - Data Recovery CRM/ERP System

A comprehensive business management system for data recovery companies, built with React, TypeScript, Tailwind CSS, and Supabase.

## Overview

xSuite is a production-grade CRM/ERP system designed specifically for data recovery operations. It features a **Settings-First Architecture** where all master data and configuration drives application behavior.

### Completed Features (Steps S0-S4)

- **Authentication System**: Complete auth with role-based access control (Admin, Technician, Sales, Accounts)
- **Settings Management (S1)**: Full CRUD for all master data tables
  - Device types, brands, capacities, accessories
  - Service types, priorities, statuses
  - Customer groups, payment methods, expense categories
  - Templates system with rich content support
  - Automated number sequences for cases, invoices, quotes, customers
- **User Management (S2)**: Profile system linked to Supabase Auth with role management
- **Client Management (S3)**: Individual and company customer tracking with NDA support
- **Case Management (S4)**: Complete case workflow system with:
  - Multi-device support per case
  - Automatic case number generation
  - Immutable audit trail (job history)
  - Internal notes with privacy controls
  - Multi-engineer assignment support
  - Status-driven workflows with automatic logging

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, Lucide Icons
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v7
- **Forms**: React Hook Form + Zod validation
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **i18n**: i18next with RTL support (English/Arabic)

## Prerequisites

- Node.js 18+ and npm
- Supabase account (already configured with provided .env)
- Modern web browser

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

The project comes pre-configured with Supabase credentials in `.env`:

```
VITE_SUPABASE_URL=https://wczvambcmekfnkvfgafn.supabase.co
VITE_SUPABASE_ANON_KEY=<provided in .env file>
```

### 3. Email Configuration (Optional)

To enable email sending for documents (receipts, quotes, invoices, etc.), you need to configure Gmail SMTP:

1. Follow the detailed setup guide: [GMAIL_SMTP_SETUP.md](GMAIL_SMTP_SETUP.md)
2. Set up a Gmail App Password (requires 2FA)
3. Configure the environment variables in Supabase:
   - `GMAIL_USER` - Your Gmail address
   - `GMAIL_APP_PASSWORD` - Your Gmail App Password

Without this configuration, the system will work normally but document emails cannot be sent.

### 4. Database Setup

The database is already set up with:
- All necessary tables and relationships
- Row Level Security (RLS) policies
- Database functions for number generation
- Master data seeded

**Database Migrations Applied:**
- `001_initial_settings_schema` - Settings and master data tables
- `002_users_profiles_schema` - User profiles and RLS policies
- `003_clients_schema` - Customers and NDAs
- `004_cases_core_schema` - Cases, devices, history, notes, engineers

### 5. Create Admin User

To create your first admin user:

1. Start the development server:
```bash
npm run dev
```

2. Navigate to `/signup` in your browser
3. Sign up with your email and password
4. After signup, manually update your role in the Supabase dashboard:
   - Go to the Supabase dashboard → Authentication → Users
   - Find your user, copy the ID
   - Go to Table Editor → profiles
   - Update your role from 'sales' (default) to 'admin'

Alternatively, use SQL:
```sql
UPDATE profiles SET role = 'admin' WHERE id = '<your-user-id>';
```

### 6. Start Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Features Guide

### Settings (Admin Only)

Access: `/settings`

Manage all master data that drives the application:
- **Device Types**: HDD, SSD, RAID, Server, etc.
- **Brands**: Seagate, Western Digital, Samsung, etc.
- **Capacities**: Storage sizes from 128GB to 16TB
- **Accessories**: Cables, adapters, cases
- **Service Types**: Data Recovery, RAID Recovery, Forensics
- **Case Priorities**: Low, Medium, High, Urgent
- **Case Statuses**: Received → Diagnosis → In Progress → Delivered
- **Customer Groups**: Individual, Corporate, VIP, Government
- **Payment Methods**: Cash, Card, Transfer
- **Expense Categories**: Parts, Shipping, Tools

All changes are immediately reflected throughout the system.

### Clients

Access: `/clients`

- Create individual or company customers
- Track contact information and addresses
- Manage portal access
- Link customer groups for pricing/discounts

### Cases

Access: `/cases`

- Create new data recovery cases
- Automatic case number generation (C-000001, C-000002, etc.)
- Link to customers and service types
- Set priority levels
- Track status through workflow
- Automatic job history logging

## Database Schema

### Key Tables

**Settings & Master Data:**
- `settings` - Single-row system configuration
- `device_types`, `brands`, `capacities`, `accessories`
- `service_types`, `case_priorities`, `case_statuses`
- `customer_groups`, `payment_methods`, `expense_categories`
- `templates` - Rich content templates
- `number_sequences` - Automated numbering

**Core Entities:**
- `profiles` - User accounts linked to auth.users
- `customers` - Individual and company clients
- `ndas` - Non-disclosure agreements
- `cases` - Primary case records
- `case_devices` - Multiple devices per case
- `case_job_history` - Immutable audit trail
- `case_internal_notes` - Private staff notes
- `case_engineers` - Multi-engineer assignments

### Security (Row Level Security)

All tables have comprehensive RLS policies:
- **Admin**: Full access to everything
- **Technician**: Access to assigned cases only, can add notes
- **Sales**: Can create customers and cases, read most data
- **Accounts**: Read-only for cases, full access to finance (future)

## Project Structure

```
src/
├── components/
│   ├── layout/       # AppLayout with sidebar
│   ├── ui/           # Reusable UI components (Button, Input, Modal, Table, Badge)
│   └── ProtectedRoute.tsx
├── contexts/
│   └── AuthContext.tsx
├── hooks/            # Custom React hooks
├── lib/
│   ├── supabaseClient.ts
│   ├── i18n.ts       # Internationalization with RTL support
│   └── format.ts     # Currency, date, number formatting
├── pages/
│   ├── auth/         # Login, Signup
│   ├── dashboard/    # Dashboard
│   ├── settings/     # Settings management
│   ├── clients/      # Client management
│   └── cases/        # Case management
├── types/
│   └── database.ts   # TypeScript database types
└── App.tsx
```

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
npm run typecheck # TypeScript type checking
```

## Features Coming in Future Steps

- **Step S5**: RAID recovery tracking, imaging progress, SLA management, WhatsApp integration
- **Step S6**: Reports with PDF generation
- **Step S7**: Finance (Quotes, Invoices, Payments with OMR currency and VAT)
- **Step S8**: Inventory and Asset Management
- **Step S9**: Admin tools, audit logs, password vault
- **Step S10**: Customer portal
- **Step S11**: Global search with deep linking
- **Step S12**: Dashboard with KPIs and analytics

## Internationalization

The system supports multiple languages with RTL (Right-to-Left) capability:
- **English** (default, LTR)
- **Arabic** (RTL)

Toggle between languages using the globe icon in the sidebar.

## Number Sequences

Automatic number generation for:
- **Cases**: C-000001 (annual reset)
- **Invoices**: INV-00001 (annual reset)
- **Quotes**: QT-00001 (annual reset)
- **Customers**: CUST-0001 (no reset)

Managed in Settings → Number Sequences (future feature)

## Important Notes

1. **Settings-First Architecture**: Always configure Settings before creating cases or customers
2. **Role-Based Access**: Assign appropriate roles to users in the profiles table
3. **RLS Security**: All data access is controlled by Row Level Security policies
4. **Audit Trail**: All case status changes and assignments are automatically logged
5. **Data Integrity**: Customer deletion is prevented if linked to cases

## Support

For issues or questions about the system:
- Check the database migrations in `supabase/migrations/`
- Review RLS policies in Supabase dashboard
- Verify user roles in the profiles table

## License

Proprietary - xSuite Data Recovery CRM/ERP System

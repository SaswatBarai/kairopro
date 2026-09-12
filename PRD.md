# KairoPro — Product Requirements Document

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Target Users](#2-target-users)
3. [User Journey](#3-user-journey)
4. [Feature Specifications](#4-feature-specifications)
5. [Input Phase](#5-input-phase)
6. [Approval Flow](#6-approval-flow)
7. [Build Phase](#7-build-phase)
8. [Error Handling](#8-error-handling)
9. [Project Modification](#9-project-modification)
10. [Version Control](#10-version-control)
11. [Preview and Deployment](#11-preview-and-deployment)
12. [Platform Features](#12-platform-features)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Edge Cases and Error Scenarios](#14-edge-cases-and-error-scenarios)
15. [UX Specifications](#15-ux-specifications)
16. [Analytics and Monitoring](#16-analytics-and-monitoring)
17. [MVP Scope](#17-mvp-scope)
18. [Future Roadmap](#18-future-roadmap)

---

## 1. Product Overview

### 1.1 What is KairoPro?

KairoPro is an AI-powered full-stack development platform that transforms user-provided requirements into working web applications. Users provide input — PRDs, documentation, plain text, screenshots, or design files — and KairoPro generates, runs, tests, and deploys complete applications.

### 1.2 Vision

KairoPro behaves like an AI software engineer — not a simple code generator. It:

- Understands requirements
- Plans architecture
- Writes code
- Runs the application
- Observes errors
- Fixes errors
- Delivers a working application

The AI works with the project over time, supporting iterative changes and additions.

### 1.3 Core Philosophy

```
Simple → Reliable → Observable → Scalable
```

Not:

```
Complex → Over-engineered → Hard to debug
```

Every decision prioritizes simplicity and reliability first. Complexity is added only when the simpler approach demonstrably fails.

### 1.4 What KairoPro is NOT

- A code completion tool (like Copilot)
- A low-code/no-code drag-and-drop builder
- A static site generator
- A deployment platform only (like Vercel)
- A template marketplace

KairoPro generates real, customizable, production-grade code that the user owns and can modify.

---

## 2. Target Users

### 2.1 Primary User (V1): Developers Who Want to Bootstrap Faster

- Technical knowledge: High
- Tolerance for rough UX: High
- Feedback quality: High — they understand what went wrong
- Value prop: Go from idea to working app in minutes instead of days
- They validate the core value proposition fastest

### 2.2 Secondary User (V2): Non-Technical Founders

- Technical knowledge: Low
- Tolerance for rough UX: Low
- Feedback quality: Medium — they know what they want but not why it broke
- Value prop: Build an app without knowing how to code
- Requires: Simpler UI, more hand-holding, better error messages

### 2.3 Tertiary User (V3): Agencies/Freelancers

- Technical knowledge: High
- Tolerance for rough UX: Medium
- Feedback quality: High
- Value prop: Deliver client projects faster
- Requires: Client-facing outputs, multiple projects, billing/team management

### 2.4 Why Start with Developers

1. They tolerate rougher UX — the product doesn't need to be polished
2. They give the best feedback loop — they understand what went wrong
3. They validate the core value prop (AI generates real working apps) fastest
4. Non-technical founders and agencies become natural next steps once the product works well

---

## 3. User Journey

### 3.1 First-Time User Journey

```
1. User visits kairopro.dev
2. Signs up (email/password or Google OAuth)
3. Lands on Dashboard (empty state)
4. Clicks "Create New Project"
5. Enters project description or uploads files
6. AI generates PRD
7. User reviews PRD → approves or requests changes
8. AI generates Data Model
9. User reviews Data Model → approves or requests changes
10. AI generates App Structure
11. User reviews App Structure → approves or requests changes
12. AI builds the project (build progress visible)
13. User sees preview URL
14. User clicks preview URL → sees working app
15. User requests changes or deploys
```

### 3.2 Returning User Journey

```
1. User logs in
2. Lands on Dashboard (sees existing projects)
3. Opens existing project
4. Requests a change (e.g., "Add a deadline field to tasks")
5. AI understands the change using smart context
6. AI modifies the project
7. User sees updated preview
8. User approves or requests further changes
9. User deploys or exports to GitHub
```

### 3.3 Deployment Journey

```
1. User has a working project in preview
2. Clicks "Deploy"
3. Chooses deployment option:
   a. Deploy on KairoPro → gets myapp.kairopro.app URL
   b. Export to GitHub → pushes to user's GitHub repo
4. For KairoPro deployment:
   - System assigns domain
   - Adds HTTPS (Let's Encrypt)
   - Makes container persistent
   - Runs database migrations
   - Starts the app
5. User receives live URL
6. App is live and accessible
```

---

## 4. Feature Specifications

### 4.1 Landing Page

**Purpose:** Marketing, value proposition, call to action

**Sections:**

- Hero section: Headline, subheadline, CTA button ("Start Building")
- How it works: 3-step visual (Describe → Review → Deploy)
- Feature highlights: AI generation, real-time preview, one-click deploy
- Pricing: Free during V1 (no billing page needed yet)
- Footer: Links, social, contact

**Requirements:**

- SEO-optimized (server-side rendered)
- Fast load time (< 2 seconds)
- Mobile responsive
- CTA redirects to signup

### 4.2 Authentication Pages

**Signup Page:**

- Email/password fields
- Google OAuth button
- "Already have an account? Log in" link
- Form validation with Zod
- Error messages for duplicate email, weak password, etc.

**Login Page:**

- Email/password fields
- Google OAuth button
- "Don't have an account? Sign up" link
- "Forgot password?" link (V2 — for V1, show message "Contact support")

**Requirements:**

- NextAuth.js handles all auth logic
- Session persists across page reloads
- Redirect to dashboard after login
- Redirect to login if accessing protected routes without auth

### 4.3 Dashboard

**Purpose:** List of projects, create new project

**Empty State:**

- Illustration or icon
- "Create your first project" CTA
- Brief description of what KairoPro does

**With Projects:**

- Grid or list view of projects
- Each project card shows:
  - Project name
  - Status badge (Draft, Specifying, Building, Ready, Deployed, Error)
  - Last modified timestamp
  - Preview URL (if ready)
  - Deployed URL (if deployed)
- "Create New Project" button
- Search/filter projects (V2)

**Project Actions:**

- Open project (navigates to project view)
- Delete project (with confirmation)
- Duplicate project (V2)

### 4.4 Input Flow

**Purpose:** Collect user requirements for the project

**Layout:**

- Left panel: Input area
- Right panel: AI chat/preview (optional, shows AI understanding)

**Input Methods:**

1. **Free-text description**
   - Large text area
   - Placeholder: "Describe the app you want to build..."
   - Minimum character count (10 characters)
   - Examples/suggestions shown below text area

2. **File uploads**
   - Drag-and-drop zone
   - Supported formats: PDF, DOCX, TXT, MD, PNG, JPG, SVG
   - Maximum file size: 10MB per file
   - Maximum files: 5 per project
   - File preview for images
   - Remove uploaded file option

3. **Combination**
   - User can provide both text and files
   - AI processes all inputs together

**Flow:**

```
User enters description and/or uploads files
       ↓
Clicks "Generate PRD"
       ↓
Loading state: "Analyzing your requirements..."
       ↓
AI generates PRD
       ↓
Navigates to Approval Flow (Step 1: PRD)
```

**Edge Cases:**

- Empty input: Disable "Generate PRD" button, show validation message
- Very long input (> 10,000 characters): Truncate with warning
- Unsupported file format: Show error, suggest supported formats
- File too large: Show error with size limit
- Upload fails: Show retry option

### 4.5 Approval Flow

**Purpose:** 3-step review process before code generation

**Step 1: PRD Review**

**Layout:**

- Left panel: Generated PRD document
- Right panel: Chat/feedback area

**PRD Document Contains:**

- App name and description
- Target audience
- Features list (with priority: must-have, nice-to-have)
- User roles and permissions
- User stories (as a [role], I want to [action], so that [benefit])
- Non-functional requirements (if any)
- Third-party integrations identified
- Assumptions and questions

**User Actions:**

- Approve: Moves to Step 2 (Data Model)
- Request changes: Types feedback in chat, AI revises PRD
- Start over: Goes back to input flow

**Step 2: Data Model Review**

**Layout:**

- Left panel: Visual entity-relationship diagram + Prisma schema
- Right panel: Chat/feedback area

**Data Model Contains:**

- Entity list with fields, types, and constraints
- Relationships between entities (one-to-many, many-to-many)
- Prisma schema code
- Indexes and unique constraints

**User Actions:**

- Approve: Moves to Step 3 (App Structure)
- Request changes: Types feedback, AI revises data model
- Go back: Returns to Step 1 (PRD) — downstream steps need re-approval

**Step 3: App Structure Review**

**Layout:**

- Left panel: Page list, API endpoints, component tree
- Right panel: Chat/feedback area

**App Structure Contains:**

- Page list with routes and descriptions
- API endpoints with methods and descriptions
- Component breakdown
- Navigation structure
- Authentication requirements per page

**User Actions:**

- Approve: Starts build phase
- Request changes: Types feedback, AI revises app structure
- Go back: Returns to Step 2 (Data Model) — downstream steps need re-approval

**Revision Handling:**

- When a user changes an earlier section (e.g., edits the PRD after approving the data model), downstream sections are flagged for re-approval
- V1: User must re-approve flagged sections manually
- V2: AI automatically regenerates downstream sections

**Chat/Feedback Area:**

- User types natural language feedback
- AI processes feedback and revises the spec
- Revision history is maintained
- User can see what changed between versions

### 4.6 Build View

**Purpose:** Show real-time build progress

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Project: TaskManager          [Cancel Build]             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ✅ Understanding requirements                           │
│ ✅ Generating database schema                           │
│ 🔄 Creating API routes                                  │
│ ⬜ Building pages                                       │
│ ⬜ Setting up authentication                            │
│ ⬜ Running and testing                                  │
│ ⬜ Preparing preview                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ ▶ Terminal Output                          [Minimize]   │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Creating file: src/app/api/tasks/route.ts            ││
│ │ Writing Prisma schema...                             ││
│ │ Running: npm install                                 ││
│ │ ✓ Installed 42 dependencies                          ││
│ │ Running: npx prisma migrate                          ││
│ │ ✓ Migration applied                                  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ▶ Code Stream                             [Minimize]   │
│ ┌─────────────────────────────────────────────────────┐│
│ │ // src/app/api/tasks/route.ts                        ││
│ │                                                       ││
│ │ import { NextResponse } from 'next/server';          ││
│ │ import { prisma } from '@/lib/prisma';               ││
│ │                                                       ││
│ │ export async function GET() {                         ││
│ │   const tasks = await prisma.task.findMany(           ││
│ │   ...▌                                               ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Three Layers of Transparency:**

1. **Status Messages** — Always visible, non-technical friendly
   - Shows current step and completed steps
   - Updates in real-time via SSE
   - Each step has: pending (⬜), in-progress (🔄), completed (✅), error (❌)

2. **Terminal Output** — Expandable, shows commands and results
   - Collapsed by default
   - Shows npm install, prisma migrate, build commands, test results
   - Auto-scrolls to bottom
   - User can scroll up to see history
   - Copy button for terminal output

3. **Code Stream** — Expandable, shows code being written in real-time
   - Collapsed by default
   - Shows file path and code content as it's generated
   - Syntax highlighting
   - Auto-scrolls to bottom
   - User can pause/resume scrolling

**Cancel Build:**

- "Cancel Build" button in top-right corner
- Confirmation dialog: "Cancel build? Progress will be saved up to the last completed step."
- On cancel: System stops at next safe checkpoint, preserves everything generated so far
- User can then: request changes, continue from checkpoint, or delete project

**Build Completion:**

- Success: Green checkmark, preview URL displayed, "View App" button
- Partial success: Green checkmark with note about simplified features
- Failure: Internal logging, user sees "Something went wrong. Our team has been notified. You can try again."

### 4.7 Project View

**Purpose:** View, interact with, and modify the generated project

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│ Project: TaskManager        [Preview] [Deploy] [Export]  │
├──────────────┬───────────────────────────────────────────┤
│              │                                           │
│ File         │          Code Editor                      │
│ Explorer     │          (Monaco)                         │
│              │                                           │
│ src/         │                                           │
│   app/       │                                           │
│   components/│                                           │
│   lib/       │                                           │
│ prisma/      │                                           │
│ package.json │                                           │
│              │                                           │
├──────────────┴───────────────────────────────────────────┤
│ Terminal / Logs / Preview                                  │
└──────────────────────────────────────────────────────────┘
```

**Left Panel: File Explorer**

- Tree view of all project files
- Click to open file in code editor
- Color-coded by type (components, pages, API routes, etc.)

**Center Panel: Code Editor (Monaco)**

- Syntax highlighting
- Read-only by default (V1)
- V2: Editable with AI-assisted changes

**Bottom Panel: Tabs**

- Terminal: Shows running server logs
- Logs: Shows application logs
- Preview: Embedded iframe of the running app

**Right Panel: AI Chat**

- User types change requests in natural language
- AI responds with planned changes
- User approves or modifies
- AI applies changes, runs tests, shows result

**Change Request Flow:**

```
User: "Add a deadline field to tasks"
       ↓
AI: "I'll make these changes:
     - Add 'deadline' field to Task model in Prisma schema
     - Update task creation form to include deadline
     - Update task list to display deadline
     - Update task API to handle deadline
     Approve?"
       ↓
User: "Yes" or "Modify: also add a priority field"
       ↓
AI applies changes
       ↓
Build progress shown (abbreviated)
       ↓
Preview updates
```

**History Panel:**

- List of all changes with timestamps
- Each entry shows: change description, timestamp, undo button
- "Undo" reverts to previous state
- "View changes" shows simplified diff

### 4.8 Deploy Flow

**Purpose:** Deploy the project or export to GitHub

**Deploy on KairoPro:**

```
User clicks "Deploy"
       ↓
Modal: "Deploy your app"
  - Shows current preview URL
  - Shows chosen subdomain (editable)
  - "Deploy" button
       ↓
System:
  - Assigns domain: {subdomain}.kairopro.app
  - Adds HTTPS via Let's Encrypt
  - Makes container persistent
  - Runs database migrations
  - Starts the app
       ↓
User receives: https://{subdomain}.kairopro.app
       ↓
Success screen with live URL
```

**Export to GitHub:**

```
User clicks "Export to GitHub"
       ↓
Modal: "Export to GitHub"
  - "Connect GitHub" button (if not connected)
  - Repository name (pre-filled with project name)
  - Public/Private toggle
  - "Export" button
       ↓
System:
  - User authorizes via GitHub OAuth
  - Creates new repo in user's account
  - Pushes project code
       ↓
User receives: GitHub repo URL
       ↓
Success screen with repo link
```

### 4.9 Settings Page

**Purpose:** User profile and project credentials management

**Sections:**

1. **Profile**
   - Name, email, profile image
   - Change password
   - Connected accounts (Google OAuth status)

2. **Project Credentials**
   - Per-project list of third-party credentials
   - Add/edit/remove credentials
   - Masked display (show only last 4 characters)
   - Services: Google OAuth, Stripe, SendGrid, AWS, etc.

3. **GitHub Connection**
   - Connect/disconnect GitHub account
   - View connected repositories

---

## 5. Input Phase

### 5.1 Input Methods

Users can provide any combination of:

1. **Free-text description**
   - Large text area with placeholder text
   - Minimum 10 characters
   - Maximum 10,000 characters
   - Examples/suggestions shown below

2. **File uploads**
   - Drag-and-drop zone
   - Supported formats: PDF, DOCX, TXT, MD, PNG, JPG, SVG
   - Maximum file size: 10MB per file
   - Maximum files: 5 per project
   - File preview for images
   - Remove uploaded file option

3. **Combination**
   - User can provide both text and files
   - AI processes all inputs together

### 5.2 Input Processing

When the user submits input:

1. **Text input** is sent directly to the LLM
2. **File uploads** are processed based on type:
   - PDF/DOCX/TXT/MD: Extract text content
   - PNG/JPG: Send to vision-capable LLM for description
   - SVG: Parse structure and send to LLM
3. **All inputs** are combined into a single context for the LLM
4. **LLM generates PRD** based on combined input

### 5.3 Third-Party Credentials Collection

During the PRD phase, the AI identifies required third-party integrations:

```
Your app needs the following integrations:

✅ Google OAuth
   Please provide Client ID and Client Secret
   [Client ID field] [Client Secret field]
   ☐ Skip for now, add later

✅ Stripe
   Please provide API Key
   [API Key field]
   ☐ Skip for now, add later

⬜ Email (SendGrid)
   Optional — add later if needed
```

**Rules:**

- Credentials are collected during the approval phase, not during the build
- Each credential is optional — user can skip and add later
- Credentials are stored encrypted (AES-256) at rest
- Credentials are injected as environment variables into containers
- Credentials are never hardcoded in source code
- Masked display in settings (show only last 4 characters)

---

## 6. Approval Flow

### 6.1 Three-Step Approval Process

**Why three steps:**

- PRD catches "you misunderstood what I want"
- Data Model catches "I need subtasks" or "users should have roles"
- App Structure catches "I need a settings page" or "that API is missing search"
- More than 3 steps gets tedious
- Fewer than 3 means errors aren't caught early enough

### 6.2 Step 1: PRD

**Generated PRD Contains:**

```markdown
# Project Name: TaskManager

## Description

A task management application for teams to organize, track, and complete work.

## Target Audience

- Small to medium-sized teams
- Project managers
- Individual contributors

## Features

### Must-Have

- User authentication (email/password)
- Create, read, update, delete tasks
- Assign tasks to team members
- Task priorities (low, medium, high)
- Task statuses (todo, in-progress, done)
- Team management
- Dashboard with task overview

### Nice-to-Have

- Due dates and reminders
- File attachments
- Activity log
- Search and filters

## User Roles

- Admin: Full access, manage team, manage all tasks
- Manager: Manage team tasks, assign tasks
- Member: View and update own tasks

## User Stories

1. As a Manager, I want to create tasks so that I can assign work to my team.
2. As a Member, I want to see my assigned tasks so that I know what to work on.
3. As an Admin, I want to manage team members so that I can control access.
4. As a Manager, I want to see a dashboard so that I can track team progress.
5. As a Member, I want to update task status so that my manager knows progress.

## Third-Party Integrations

- Google OAuth (authentication)

## Assumptions

- Single team per account (V1)
- No real-time notifications (V1)
- Email/password as primary auth, Google OAuth as optional
```

**User Actions:**

- Approve: Moves to Step 2
- Request changes: Types feedback, AI revises PRD
- Start over: Goes back to input flow

### 6.3 Step 2: Data Model

**Generated Data Model Contains:**

```prisma
// Prisma Schema

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  image     String?
  role      Role     @default(MEMBER)
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id])
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Team {
  id      String  @id @default(cuid())
  name    String
  members User[]
  tasks   Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      Status   @default(TODO)
  priority    Priority @default(MEDIUM)
  assigneeId  String?
  assignee    User?    @relation(fields: [assigneeId], references: [id])
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Role {
  ADMIN
  MANAGER
  MEMBER
}

enum Status {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

**Visual Representation:**

- Entity-relationship diagram showing all models and their connections
- Field list with types and constraints
- Relationships clearly labeled

**User Actions:**

- Approve: Moves to Step 3
- Request changes: Types feedback, AI revises data model
- Go back: Returns to Step 1 (PRD) — Step 3 will need re-approval

### 6.4 Step 3: App Structure

**Generated App Structure Contains:**

```
Pages:
  /dashboard       — Dashboard with task overview, team stats
  /tasks           — Task list with filters and search
  /tasks/new       — Create new task form
  /tasks/[id]      — Task detail view
  /tasks/[id]/edit — Edit task form
  /team            — Team management (admin/manager only)
  /team/[id]       — Team member detail
  /settings        — User settings
  /login           — Login page
  /register        — Registration page

API Endpoints:
  POST   /api/auth/register    — Register new user
  POST   /api/auth/login       — Login user
  POST   /api/auth/logout      — Logout user
  GET    /api/tasks             — List tasks (filtered by team, assignee, status)
  POST   /api/tasks             — Create task
  GET    /api/tasks/[id]        — Get task detail
  PUT    /api/tasks/[id]        — Update task
  DELETE /api/tasks/[id]        — Delete task
  GET    /api/team              — Get team info
  PUT    /api/team/[id]         — Update team member
  DELETE /api/team/[id]          — Remove team member

Components:
  TaskCard       — Displays task summary
  TaskForm       — Create/edit task form
  TaskList       — List of tasks with filters
  TaskStatusBadge — Status indicator
  PriorityBadge  — Priority indicator
  TeamMemberCard — Team member display
  Dashboard      — Dashboard layout with stats
  Sidebar        — Navigation sidebar
  Header         — Top header with user info
  AuthForm       — Login/register form
```

**User Actions:**

- Approve: Starts build phase
- Request changes: Types feedback, AI revises app structure
- Go back: Returns to Step 2 (Data Model)

### 6.5 Revision Loop

When the user requests changes:

1. User types natural language feedback
2. AI processes feedback and revises the spec
3. Revised spec is shown with changes highlighted
4. User can see what changed between versions
5. User approves or requests more changes
6. Loop continues until approved

**Change Highlighting:**

- Added sections: Green highlight
- Removed sections: Red highlight with strikethrough
- Modified sections: Yellow highlight with before/after comparison

---

## 7. Build Phase

### 7.1 Build Process

After all three spec steps are approved:

```
1. Template Scaffolding
   - Clone Next.js template
   - Install base dependencies
   - Set up project structure

2. Schema Generation
   - Generate Prisma schema from approved data model
   - Run prisma migrate
   - Generate Prisma client

3. API Generation
   - Generate API routes from approved app structure
   - Implement CRUD operations
   - Add validation with Zod
   - Add authentication middleware

4. Page Generation
   - Generate page components from approved app structure
   - Implement forms with validation
   - Implement data fetching
   - Add loading states and error boundaries

5. Auth Setup
   - Configure NextAuth
   - Set up login/register pages
   - Set up protected routes
   - Inject user-provided credentials

6. Build & Test
   - Run npm run build (type check + build)
   - Run linter
   - Start the application
   - Verify it runs without errors
   - If errors: enter fix loop

7. Deliver Preview
   - Assign preview URL
   - Start container
   - Verify application is accessible
   - Show preview URL to user
```

### 7.2 Build Steps (User-Facing)

The user sees these status messages during build:

1. ✅ Understanding requirements
2. ✅ Generating database schema
3. 🔄 Creating API routes
4. ⬜ Building pages
5. ⬜ Setting up authentication
6. ⬜ Running and testing
7. ⬜ Preparing preview

### 7.3 Template Contents

The base template provides:

```
nextjs-template/
├── src/
│   ├── app/
│   │   ├── layout.tsx          — Root layout with sidebar, header
│   │   ├── page.tsx            — Dashboard/home page
│   │   ├── globals.css         — Global styles (Tailwind)
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts — NextAuth setup
│   │   ├── login/
│   │   │   └── page.tsx        — Login page
│   │   └── register/
│   │       └── page.tsx        — Registration page
│   ├── components/
│   │   ├── ui/                 — shadcn/ui components
│   │   ├── Sidebar.tsx         — Navigation sidebar
│   │   ├── Header.tsx          — Top header
│   │   └── AuthForm.tsx        — Auth form component
│   ├── lib/
│   │   ├── prisma.ts           — Prisma client singleton
│   │   ├── auth.ts             — Auth configuration
│   │   └── utils.ts            — Utility functions
│   └── middleware.ts           — Auth middleware
├── prisma/
│   └── schema.prisma           — (Generated by AI)
├── public/
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 7.4 AI-Generated Content

The AI generates:

```
AI-Generated:
├── prisma/
│   └── schema.prisma           — From approved data model
├── src/
│   ├── app/
│   │   ├── tasks/
│   │   │   ├── page.tsx        — Task list page
│   │   │   ├── new/
│   │   │   │   └── page.tsx    — Create task page
│   │   │   └── [id]/
│   │   │       ├── page.tsx    — Task detail page
│   │   │       └── edit/
│   │   │           └── page.tsx — Edit task page
│   │   ├── team/
│   │   │   ├── page.tsx        — Team management page
│   │   │   └── [id]/
│   │   │       └── page.tsx    — Team member detail
│   │   └── settings/
│   │       └── page.tsx        — Settings page
│   ├── app/api/
│   │   ├── tasks/
│   │   │   └── route.ts        — Tasks CRUD API
│   │   └── team/
│   │       └── route.ts        — Team API
│   └── components/
│       ├── TaskCard.tsx        — Task card component
│       ├── TaskForm.tsx        — Task form component
│       ├── TaskList.tsx        — Task list component
│       ├── TaskStatusBadge.tsx — Status badge
│       ├── PriorityBadge.tsx   — Priority badge
│       └── TeamMemberCard.tsx  — Team member card
```

---

## 8. Error Handling

### 8.1 Silent Graceful Degradation

The AI **never shows errors to the user**. The user always receives a working application.

**Principle:** If something is too hard, the AI quietly builds a simpler working version instead.

**Examples:**

| What Failed                  | What User Gets                    | What User Sees                                                                          |
| ---------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| Google OAuth setup           | Email/password login only         | "Your app is ready! Login uses email/password. You can add Google login from settings." |
| Complex analytics dashboard  | Simple dashboard with basic stats | "Your app is ready! Here's your dashboard."                                             |
| Advanced search with filters | Basic search                      | "Your app is ready! Search is available on the tasks page."                             |
| File upload feature          | Feature omitted                   | "Your app is ready! You can add file attachments later."                                |

### 8.2 Error Recovery Flow

```
For each file/feature:
  Attempt 1: Generate the full implementation
  ↓ type check + lint
  If error:
    Attempt 2: Fix the specific error
    ↓ type check + lint
    If error:
      Attempt 3: Fix again
      ↓ type check + lint
      If error:
        Attempt 4: Simpler implementation
        ↓ type check + lint
        If error:
          Attempt 5: Fix the simpler version
          ↓ type check + lint
          If error:
            Attempt 6: Simplest possible version
            ↓ type check + lint
            If still failing:
              Log error internally
              Omit or simplify the feature
              Continue with rest of the project
```

### 8.3 Build Failure

If the entire build fails (extremely rare):

- Internal logging captures the full error
- User sees: "Something went wrong while building your app. Our team has been notified. You can try again."
- "Try Again" button restarts the build
- Error details are stored for debugging

### 8.4 Internal Error Logging

All errors are logged internally for the KairoPro team:

```json
{
  "projectId": "abc-123",
  "buildId": "build-456",
  "step": "creating_api_routes",
  "error": "TypeError: Cannot read properties of undefined",
  "file": "src/app/api/tasks/route.ts",
  "attempt": 3,
  "approach": "simpler_implementation",
  "timestamp": "2024-01-15T10:30:00Z",
  "resolved": true,
  "resolution": "simplified_to_basic_crud"
}
```

---

## 9. Project Modification

### 9.1 Change Request Flow

After the initial build, users can request changes:

```
User: "Add a deadline field to tasks"
       ↓
1. Parse the request
   - Affects: tasks, database, API, UI
   ↓
2. Find relevant files using smart context
   - prisma/schema.prisma (data model)
   - src/app/api/tasks/route.ts (API)
   - src/app/tasks/page.tsx (UI)
   - src/components/TaskForm.tsx (form)
   - src/components/TaskCard.tsx (display)
   ↓
3. Build context
   - Project summary (always included)
   - Relevant files (based on keyword + dependency matching)
   - Change request
   ↓
4. Send to LLM
   ↓
5. LLM generates targeted edits
   ↓
6. Apply edits
   ↓
7. Run type check + lint
   ↓
8. If errors: fix loop (silent)
   ↓
9. Run application
   ↓
10. Verify it works
    ↓
11. Show updated preview to user
```

### 9.2 Smart Context (V1)

**Project Summary (always included):**

```
Project: TaskManager
Stack: Next.js 14, PostgreSQL, Prisma, shadcn/ui, NextAuth
Auth: Email/password + Google OAuth
Models: User, Team, Task
Pages: /dashboard, /tasks, /tasks/new, /tasks/[id], /team, /settings
API: /api/tasks, /api/team, /api/auth
Conventions: App Router, server components, server actions, Zod validation
```

**File Index:**

```json
{
  "prisma/schema.prisma": "Database schema - defines User, Team, Task models",
  "src/app/api/tasks/route.ts": "API routes for tasks CRUD operations",
  "src/app/tasks/page.tsx": "Tasks list page - displays all tasks with filters",
  "src/app/tasks/new/page.tsx": "Create new task page",
  "src/app/tasks/[id]/page.tsx": "Task detail page",
  "src/components/TaskForm.tsx": "Form component for creating/editing tasks",
  "src/components/TaskCard.tsx": "Card component for displaying task summary"
}
```

**Keyword + Dependency Matching:**

- User says "deadline" + "tasks" → search file index for "task" → find relevant files
- Dependency graph: changing Prisma schema → also update API routes and UI components

### 9.3 Change Confirmation

Before applying changes, the AI shows the user what it plans to do:

```
AI: "I'll make these changes:
     - Add 'deadline' DateTime field to Task model in Prisma schema
     - Update task creation API to accept deadline
     - Update task form to include deadline input
     - Update task card to display deadline
     - Update task list to sort by deadline
     Approve?"
```

User can:

- Approve: AI applies changes
- Modify: "Also add a priority field" → AI updates plan
- Cancel: No changes made

### 9.4 V2: Vector Search

- pgvector extension on PostgreSQL
- Embed each file's content and summary
- Semantic search for context retrieval
- Better for larger projects where keyword matching is insufficient

---

## 10. Version Control

### 10.1 Git Under the Hood

Each project is a git repository on the server filesystem:

```
/projects/
  └── {project-id}/
      ├── .git/
      ├── src/
      ├── prisma/
      ├── package.json
      └── ...
```

### 10.2 Commit Strategy

Every AI action creates a git commit:

```
git commit -m "Initial project from spec"
git commit -m "Add deadline field to tasks"
git commit -m "Fix task creation validation"
git commit -m "Add team management page"
```

### 10.3 User-Facing Operations

| User Action              | Git Operation           | UI Representation                          |
| ------------------------ | ----------------------- | ------------------------------------------ |
| View history             | `git log --oneline`     | List of changes with timestamps            |
| View changes             | `git diff`              | Simplified diff view (added/removed lines) |
| Undo last change         | `git revert HEAD`       | "Undo" button, shows what was reverted     |
| Restore previous version | `git checkout {commit}` | "Restore" button on history entry          |

### 10.4 History UI

```
History:
  ✅ "Add deadline field to tasks" — 2 min ago    [View] [Undo]
  ✅ "Fix task creation validation" — 5 min ago   [View] [Undo]
  ✅ "Initial project" — 1 hour ago                [View]

[Undo last change]  [View full history]
```

- "View" shows a simplified diff (not raw git diff)
- "Undo" reverts the last change and shows confirmation
- Git is never exposed to the user

---

## 11. Preview and Deployment

### 11.1 Preview

After build completion:

**Separate URL:**

- Format: `https://{project-name}.preview.kairopro.dev`
- Always available
- Works reliably for all features including OAuth
- Updated in real-time during builds

**Iframe Preview:**

- Embedded in KairoPro project view
- May have edge cases with OAuth flows and same-origin policy
- Responsive sizing
- Refresh button to reload preview
- "Open in new tab" button as fallback

### 11.2 Deploy on KairoPro

```
User clicks "Deploy"
       ↓
Modal: "Deploy your app"
  - Subdomain: [myapp] .kairopro.app (editable)
  - "Deploy" button
       ↓
System:
  1. Validate subdomain availability
  2. Assign domain: myapp.kairopro.app
  3. Provision SSL certificate (Let's Encrypt)
  4. Make container persistent
  5. Run database migrations
  6. Start the application
  7. Verify application is accessible
       ↓
User receives: https://myapp.kairopro.app
       ↓
Success screen with:
  - Live URL
  - "Visit App" button
  - "Share" button (copy URL)
```

### 11.3 Export to GitHub

```
User clicks "Export to GitHub"
       ↓
Modal: "Export to GitHub"
  - If not connected: "Connect GitHub" button (OAuth)
  - Repository name: [taskmanager] (editable)
  - Visibility: Public / Private
  - "Export" button
       ↓
System:
  1. User authorizes via GitHub OAuth
  2. Create new repository in user's GitHub account
  3. Push project code to repository
  4. Add README with project description
       ↓
User receives: https://github.com/{username}/{repo}
       ↓
Success screen with:
  - GitHub repo URL
  - "Open in GitHub" button
  - "Deploy to Vercel" suggestion
```

---

## 12. Platform Features

### 12.1 Authentication (KairoPro Platform)

- **Email/password:** Signup, login, password reset (V2)
- **Google OAuth:** One-click signup/login
- **Session management:** JWT-based sessions via NextAuth
- **Protected routes:** Middleware redirects unauthenticated users to login
- **No billing in V1:** All features free

### 12.2 Dashboard

- Project list with status badges
- Create new project
- Open existing project
- Delete project (with confirmation)
- Empty state for new users

### 12.3 Settings

- Profile management (name, email, image)
- Password change
- Connected accounts (Google OAuth status)
- Per-project credential management
- GitHub connection management

---

## 13. Non-Functional Requirements

### 13.1 Performance

- Landing page load: < 2 seconds
- Dashboard load: < 1 second
- Build start: < 5 seconds from approval
- SSE event latency: < 500ms
- Preview URL accessible: < 30 seconds after build completion
- Deploy to live URL: < 2 minutes

### 13.2 Reliability

- Build success rate target: > 90% (with graceful degradation)
- Preview uptime: > 99% during active development
- Deployed app uptime: > 99.5%
- SSE reconnection: Automatic with last event ID

### 13.3 Security

- All credentials encrypted at rest (AES-256)
- Container isolation between projects
- Resource limits per container (CPU, memory)
- No shared filesystem between projects
- Input validation on all API routes (Zod)
- CSRF protection (built into Next.js)
- Rate limiting on API routes
- File upload validation (type, size)

### 13.4 Scalability (V1 Targets)

- 10-50 concurrent project builds
- 100-500 registered users
- 50-200 projects
- Single server deployment

### 13.5 Accessibility

- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus indicators
- Alt text for images

### 13.6 Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- No IE11 support

---

## 14. Edge Cases and Error Scenarios

### 14.1 Input Edge Cases

| Scenario                         | Handling                                               |
| -------------------------------- | ------------------------------------------------------ |
| Empty input                      | Disable "Generate PRD" button, show validation message |
| Very long input (> 10,000 chars) | Truncate with warning                                  |
| Unsupported file format          | Show error, suggest supported formats                  |
| File too large (> 10MB)          | Show error with size limit                             |
| Upload fails                     | Show retry option                                      |
| Conflicting requirements         | AI asks for clarification in PRD                       |
| Ambiguous requirements           | AI makes assumptions, lists them in PRD for review     |

### 14.2 Build Edge Cases

| Scenario                        | Handling                                         |
| ------------------------------- | ------------------------------------------------ |
| LLM API timeout                 | Retry 3 times, then show "Something went wrong"  |
| LLM generates invalid code      | Fix loop (up to 3 attempts per file)             |
| LLM generates conflicting code  | Fix loop with simpler approach                   |
| Docker container fails to start | Retry with fresh container                       |
| Database migration fails        | Retry, then simplify schema                      |
| npm install fails               | Retry with cache clear                           |
| Port already in use             | Assign different port                            |
| Build takes > 10 minutes        | Show "Still working..." message, continue        |
| Build crashes completely        | Show "Something went wrong" message, offer retry |

### 14.3 Preview Edge Cases

| Scenario                 | Handling                                  |
| ------------------------ | ----------------------------------------- |
| App crashes on load      | Fix loop, then simplify                   |
| OAuth redirect in iframe | Show "Open in new tab" button             |
| Slow app response        | Show loading indicator                    |
| App not accessible       | Check container health, restart if needed |

### 14.4 Deployment Edge Cases

| Scenario                | Handling                             |
| ----------------------- | ------------------------------------ |
| Subdomain already taken | Suggest alternatives                 |
| SSL certificate fails   | Retry, then show error               |
| Container won't stay up | Check logs, restart, then show error |
| GitHub OAuth fails      | Show error with retry                |
| GitHub repo name taken  | Suggest alternatives                 |

### 14.5 Change Request Edge Cases

| Scenario                             | Handling                           |
| ------------------------------------ | ---------------------------------- |
| Change conflicts with existing code  | AI resolves conflict, shows plan   |
| Change requires database migration   | AI generates migration, applies it |
| Change breaks existing functionality | Fix loop, then simplify            |
| Change is too complex                | AI breaks it into smaller steps    |
| Change is ambiguous                  | AI asks for clarification          |

---

## 15. UX Specifications

### 15.1 Design Principles

- **Clarity over cleverness:** Every screen should be immediately understandable
- **Progressive disclosure:** Show simple by default, reveal complexity on demand
- **Never show errors:** Always deliver a working app, simplify if needed
- **Real-time feedback:** Show what the AI is doing at all times
- **Human-readable language:** No technical jargon in user-facing messages

### 15.2 Color System

- Primary: Blue (trust, technology)
- Success: Green (completed, approved)
- Warning: Yellow (in progress, needs attention)
- Error: Red (only for internal logging, never shown to users)
- Neutral: Gray (secondary text, borders)

### 15.3 Typography

- Headings: Inter or similar sans-serif
- Body: Inter or similar sans-serif
- Code: JetBrains Mono or similar monospace

### 15.4 Responsive Design

- Desktop: Full layout with sidebar
- Tablet: Collapsible sidebar
- Mobile: Bottom navigation, stacked layout

### 15.5 Loading States

- Skeleton loaders for content areas
- Spinner for short operations (< 2 seconds)
- Progress bar for long operations (build progress)
- SSE streaming for real-time updates

### 15.6 Empty States

- Dashboard (no projects): Illustration + "Create your first project" CTA
- Project (no changes): "Your project is up to date"
- History (no history): "No changes yet"

### 15.7 Confirmation Dialogs

- Delete project: "Are you sure? This cannot be undone."
- Cancel build: "Cancel build? Progress will be saved up to the last completed step."
- Deploy: "Deploy your app to [subdomain].kairopro.app?"
- Undo change: "Undo [change description]? This will revert to the previous version."

---

## 16. Analytics and Monitoring

### 16.1 Product Analytics

- Number of projects created
- Approval flow completion rate (how many users complete all 3 steps)
- Build success rate
- Average build time
- Most common change requests
- Feature usage (deploy vs. GitHub export)
- User retention (daily/weekly/monthly)

### 16.2 Technical Monitoring

- Build error rates by step
- LLM API latency and error rates
- Container health and resource usage
- SSE connection stability
- Database query performance
- File system usage per project

### 16.3 Error Tracking

- All build errors logged with full context
- LLM API failures tracked
- Container crashes tracked
- User-facing error messages tracked (even though they're generic)
- Internal error dashboard for the team

---

## 17. MVP Scope

### 17.1 V1 — Must Have

- User auth (email/password + Google OAuth)
- Input: free-text description + file uploads
- 3-step approval flow (PRD → Data Model → App Structure)
- Credentials collection for third-party services
- AI workflow + agent (hybrid: template + AI business logic)
- Generated stack: Next.js + PostgreSQL + Prisma + shadcn/ui + NextAuth
- Build progress UI (status messages + terminal + code stream)
- Silent error handling with graceful degradation
- Cancel build with checkpoint
- Smart context (file index + keyword matching + project summary)
- Docker containers (separate app + Postgres per project)
- Preview: iframe + separate URL
- Git-based version control with undo UI
- Deploy on KairoPro (subdomain)
- GitHub export
- No billing

### 17.2 V1 — Not Included

- HeroUI / multiple UI libraries
- Custom domains
- Vector search for context
- Team accounts / collaboration
- Billing / payments
- Mobile app generation
- Other frameworks (Vue, Go backend, etc.)
- Firecracker / microVMs
- Live collaborative editing
- Auto-scaling
- Magic link auth
- GitHub OAuth for platform login
- Password reset
- Search/filter on dashboard

---

## 18. Future Roadmap

### V1.1 (Quick Wins)

- Password reset flow
- GitHub OAuth for platform login
- Project search/filter on dashboard
- Duplicate project
- Export project as ZIP

### V2 (Core Enhancements)

- HeroUI as alternative UI library
- Vector search (pgvector) for context
- Billing and payments (freemium + usage-based)
- Custom domains for deployed apps
- Magic link authentication
- Iframe preview improvements (OAuth handling)
- Collaborative editing
- Multiple LLM providers
- Auto-deploy on changes

### V3 (Scale)

- Firecracker microVMs for isolation
- Kubernetes orchestration
- Team accounts and collaboration
- Vue and other frontend frameworks
- Go and other backend languages
- Mobile app generation
- Enterprise features (SSO, audit logs)
- CDN for deployed apps
- Auto-scaling
- Distributed storage for project files
- Advanced analytics dashboard

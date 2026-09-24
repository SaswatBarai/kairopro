# System Design Specification - KairoNotes App

## 1. Architecture Overview

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide icons, Shadcn UI components.
- **Backend API**: Next.js API Routes / Node.js with Prisma ORM.
- **Database**: PostgreSQL (managed via Prisma).
- **Authentication**: NextAuth.js / JWT session token.

## 2. API Endpoints

### Auth & User

- `POST /api/auth/register` - Create user account
- `POST /api/auth/login` - Authenticate user
- `GET /api/user/profile` - Get current user info

### Notes Management

- `GET /api/notes` - List notes (supports `query`, `tagId`, `folderId`, `archived`)
- `POST /api/notes` - Create a new note
- `GET /api/notes/:id` - Fetch single note by ID
- `PATCH /api/notes/:id` - Update note content/title/tags/folder/pinned status
- `DELETE /api/notes/:id` - Soft-delete or permanently remove note

### Folders & Tags

- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag

## 3. Database Schema Blueprint

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  notes     Note[]
  folders   Folder[]
  tags      Tag[]
}

model Note {
  id        String   @id @default(cuid())
  title     String
  content   String   @db.Text
  isPinned  Boolean  @default(false)
  isArchived Boolean @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  folderId  String?
  folder    Folder?  @relation(fields: [folderId], references: [id], onDelete: SetNull)
  tags      Tag[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Folder {
  id        String   @id @default(cuid())
  name      String
  color     String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  notes     Note[]
  createdAt DateTime @default(now())
}

model Tag {
  id        String   @id @default(cuid())
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  notes     Note[]
  createdAt DateTime @default(now())
}
```

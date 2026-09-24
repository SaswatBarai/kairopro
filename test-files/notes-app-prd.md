# Product Requirements Document (PRD) - KairoNotes App

## 1. Overview

KairoNotes is a modern, fast, full-stack notes and knowledge management web application. It allows users to create, organize, edit, and share notes with markdown support, tags, search, and real-time auto-saving.

## 2. Key Features

### 2.1 User Authentication & Workspaces

- User sign-up, login, and profile management (JWT / Session auth).
- Workspace separation: Personal Notes vs Shared/Team Workspaces.

### 2.2 Note Management & Editor

- Rich markdown editor (headings, code blocks, checklists, images, tables).
- Real-time auto-save draft functionality.
- Pin important notes to top.
- Archive and trash bin functionality (soft delete with restore option).

### 2.3 Organization & Categorization

- Nested folder hierarchy for note organization.
- Color-coded tags and labels.
- Favorite notes list.

### 2.4 Search & Filtering

- Full-text search across titles and content.
- Filter by tags, date created/updated, folder, or shared status.

### 2.5 Sharing & Export

- Share notes via public read-only link or secret access code.
- Export notes as Markdown (.md), HTML, or PDF.

## 3. Non-Functional Requirements

- Sub-200ms API response time for note fetching and updates.
- Responsive dark/light UI built with Next.js and Tailwind CSS.
- Secure data encryption for notes stored in the database.

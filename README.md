# TaskFlow AI - Full-Stack Team Task Manager

TaskFlow AI is a modern, high-fidelity team task management dashboard. Designed with premium glassmorphism, responsive color modes, and interactive workspaces, it provides an intuitive platform for tracking software development lifecycles.

The application implements strict Role-Based Access Control (RBAC) to ensure appropriate privileges across Administrators and Team Members.

---

## Key Features

### 1. Interactive Kanban Board & Optimistic Updates
* Native HTML5 drag-and-drop support for tasks across states.
* Snap-fast **Optimistic Updates**: changes to board status, subtasks, priority pills, and tags reflect instantly on the UI with zero network latency, automatically rolling back only if a database error is encountered.

### 2. AI Intelligence (Gemini AI)
* **Checklist Auto-Breakdown (AI)**: Instantly generate a set of actionable checklist subtasks from a task title and description using the Gemini API.
* **Agile Progress Report (AI)**: Instantly compile and render high-impact executive summaries of the sprint's progress with a custom built-in Markdown renderer.

### 3. Collaboration & Real-Time Sync
* **Real-Time Board Sync**: Pusher integration automatically and instantly synchronizes card drag-and-drop state updates and comments across all logged-in browsers.
* **Task Comments & Audit Trail Logs**: Log details, write developer comments, and track the chronological audit trail of all task modifications (status shifts, reassignments, tags, priorities).
* **Assignee Email Notifications**: Automatically dispatches a clean, structured HTML assignment email alert via Resend when a task is assigned.

### 4. Personal Task Isolation & RBAC
* By default, the Kanban Board filters to the logged-in Member's personal deliverables.
* Allows toggling to "All Tasks" to view the broader team landscape, while locking down editing capability for non-admin/non-assigned tasks.

### 5. Dual Theme System
* Features responsive, high-contrast Light and Dark modes using CSS custom variables.
* Choices are persisted in `localStorage` across page reloads.

---

## Technology Stack

* **Core Framework**: Next.js 16 (App Router)
* **Styles**: Tailwind CSS v4, Google Material Symbols
* **Database Engine**: Neon PostgreSQL (serverless Postgres)
* **Object-Relational Mapping (ORM)**: Prisma ORM
* **AI Engine**: `@google/generative-ai` (`gemini-2.5-flash` model)
* **Real-time Sync**: `pusher` (Server) & `pusher-js` (Client)
* **Email Client**: `resend` SDK
* **Security & Auth**: NextAuth.js, Bcrypt.js

---

## Local Configuration & Environment

To run the application locally, clone this repository and create a `.env` file in the root directory:

```env
# Database Connection (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@hostname/dbname?sslmode=require"

# NextAuth Secrets
NEXTAUTH_SECRET="your-32-character-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI Integration (Gemini Key)
GEMINI_API_KEY="your-gemini-api-key"

# Pusher Credentials for Real-time board sync (Optional)
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="your-pusher-cluster"
NEXT_PUBLIC_PUSHER_KEY="your-public-pusher-key"
NEXT_PUBLIC_PUSHER_CLUSTER="your-public-pusher-cluster"

# Resend API Key for task assignment email alerts (Optional)
RESEND_API_KEY="your-resend-api-key"
```

### Installation and Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the database migration check:
   ```bash
   npx prisma generate
   ```

3. Run the Next.js development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

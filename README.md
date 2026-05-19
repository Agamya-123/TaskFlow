# TaskFlow AI - Team Task Manager (Full-Stack)

TaskFlow AI is a premium team task management dashboard. It features modern design aesthetics, smooth glassmorphism, responsive light and dark color modes, dynamic Kanban board interactivity, and robust Role-Based Access Control (RBAC) separating Administrators and Team Members.

---

## Key Features

*   **Auth and RBAC (Credentials Provider)**:
    *   Authenticates via NextAuth.js.
    *   Features instant **Quick Demo Access** buttons to instantly sign in as an Admin (`admin@taskflow.io`) or a Member (`member@taskflow.io`) with a single click.
    *   Allows new users to sign up seamlessly.
*   **Role-Based Workspace Authority**:
    *   **Administrators**: Can create projects, add new tasks, edit or re-assign any task, toggle system-wide user roles, invite new team members, and delete tasks.
    *   **Team Members**: Have a tailored read-only workspace dashboard. They can only view projects and modify the status of tasks assigned to them. All other tasks are read-only with a visual padlock icon.
*   **Personal Task Isolation**:
    *   For Members, the Kanban board defaults to the "My Tasks" scope, isolating only their assigned work.
    *   Members can toggle to "All Tasks" to review the team's wider board scope in a secure, read-only state.
*   **Premium Glassmorphic UI and Adaptive Themes**:
    *   Designed with advanced glassmorphic layers, fine borders, backdrop blurs, and electric glow colors.
    *   Supports a persistent, high-contrast, fully adaptive Light / Dark Mode toggle.
*   **Dynamic Kanban Board**:
    *   Live indicators showing real-time statistics (To Do, In Progress, Under Review, Completed).
    *   Instantly responds to status transitions.
*   **Modern Next.js Tech Stack**:
    *   Uses Next.js App Router, Tailwind CSS v4, Prisma ORM, and SQLite database for frictionless deployment.

---

## Tech Stack

*   **Frontend**: Next.js (App Router), React, Tailwind CSS v4, Material Symbols
*   **Backend**: Next.js API Routes, NextAuth.js
*   **Database and ORM**: SQLite (`dev.db`), Prisma ORM
*   **Authentication and Cryptography**: NextAuth.js, Bcrypt.js

# TaskFlow AI - Full-Stack Team Task Manager

TaskFlow AI is a modern, high-fidelity team task management dashboard. Designed with premium glassmorphism, responsive color modes, and interactive workspaces, it provides an intuitive platform for tracking software development lifecycles.

The application implements strict Role-Based Access Control (RBAC) to ensure appropriate read/write privileges across Administrators and Team Members.

---

## Architecture Overview

TaskFlow AI is architected as a modern Next.js single-page application (SPA) backed by server-side REST API routes and a secure local database layer.

* **User Interface Layer**: Crafted using React server/client components and styled with Tailwind CSS v4. Icons are powered by Google Material Symbols.
* **Authentication & Security**: Integrated with NextAuth.js credentials provider, utilizing client-side context provider wrappers and secure password encryption.
* **Database Management**: Backed by SQLite for reliability and structured schema management via Prisma ORM.

---

## Role-Based Workspace Authority

TaskFlow AI separates workspace functionality based on system roles to protect data integrity and coordinate teams:

### Administrators

Administrators hold full write-access and workspace management privileges.

* **Project Management**: Create and track multiple software projects with progress metrics.
* **Task Lifecycle Control**: Create, assign, edit, and delete tasks.
* **User Management**: Invite team members and promote/demote system roles.
* **Full Override**: Modify any status, assignee, or date across the entire workspace.

### Team Members

Team Members have a streamlined, read-only board access flow focused on their deliverables.

* **Personal Task Scope**: View tasks assigned to their account in a clean Kanban layout.
* **Task Status Updates**: Modify progress states (To Do, In Progress, Under Review, Completed) for their assigned tasks.
* **Read-Only Workspace**: View projects, team directory, and others' tasks in a locked state.
* **Security Lock**: System actions (assignee changes, deletion, creation) are fully disabled.

---

## Key Features

### 1. Dual Theme System

* Features a responsive, high-contrast Light and Dark mode.
* Uses dynamic CSS custom properties for instant background, text, and shadow transitions.
* Persists the user's choice locally in `localStorage` across page reloads.

### 2. Personal Task Isolation

* By default, the Kanban Board filters to the logged-in Member's personal deliverables.
* Allows toggling to "All Tasks" to view the broader team landscape while locking down write-access for external items.

### 3. Quick Authentication Testing

* Provides one-click "Quick Demo Access" actions on the sign-in form for rapid evaluator review.
* Supports automatic, secure developer user account provisioning on demand.

### 4. Interactive Kanban Board

* Aggregates task tallies for each development column.
* Enables state transition controls that immediately sync updates with the backend SQLite database.

---

## Technology Stack

* **Core Framework**: Next.js 16 (App Router)
* **Client Logic**: React, NextAuth.js Client
* **Styles**: Tailwind CSS v4, Google Font System (Geist & Material Symbols)
* **Database Engine**: SQLite
* **Object-Relational Mapping (ORM)**: Prisma
* **Security**: Bcrypt.js

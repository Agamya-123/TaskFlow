# 📌 TaskFlow AI - Team Task Manager (Full-Stack)

TaskFlow AI is a premium, state-of-the-art team task management dashboard. It features rich design aesthetics, smooth glassmorphism, responsive light/dark color modes, dynamic Kanban board interactivity, and robust Role-Based Access Control (RBAC) separating **Administrators** and **Team Members**.

---

## 🚀 Key Features

*   **🔒 Auth & RBAC (Credentials Provider)**:
    *   Authenticates via NextAuth.js.
    *   Features instant **⚡ Quick Demo Access** buttons to instantly sign in as an **Admin** (`admin@taskflow.io`) or a **Member** (`member@taskflow.io`) with a single click.
    *   Allows new users to sign up seamlessly.
*   **👥 Role-Based Workspace Authority**:
    *   **🛡️ Administrators**: Can create projects, add new tasks, edit or re-assign any task, toggle system-wide user roles, invite new team members, and delete tasks.
    *   **👥 Team Members**: Have a tailored read-only workspace dashboard. They can only view projects and modify the status of tasks **assigned to them**. All other tasks are read-only with a visual padlock icon.
*   **👁️ Personal Task Isolation**:
    *   For Members, the Kanban board defaults to the **"My Tasks"** scope, isolating only their assigned work.
    *   Members can toggle to **"All Tasks"** to review the team's wider board scope in a secure, read-only state.
*   **🎨 Premium Glassmorphic UI & Adaptive Themes**:
    *   Designed with advanced glassmorphic layers, fine borders, backdrop blurs, and electric glow colors.
    *   Supports a persistent, high-contrast, fully adaptive **Light / Dark Mode** toggle.
*   **📊 Dynamic Kanban Board**:
    *   Live indicators showing real-time statistics (`To Do`, `In Progress`, `Under Review`, `Completed`).
    *   Instantly responds to status transitions.
*   **⚡ Modern Next.js Tech Stack**:
    *   Uses Next.js App Router, Tailwind CSS v4, Prisma ORM, and SQLite database for frictionless deployment.

---

## ⚙️ Tech Stack

*   **Frontend**: Next.js (App Router), React, Tailwind CSS v4, Material Symbols
*   **Backend**: Next.js API Routes, NextAuth.js
*   **Database & ORM**: SQLite (`dev.db`), Prisma ORM
*   **Authentication & Cryptography**: NextAuth.js, Bcrypt.js

---

## 📦 Local Development

Follow these steps to run the application locally:

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Generate database schema & push changes**:
    ```bash
    npx prisma db push
    ```

3.  **Run the local development server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

4.  **Quick Demo Logins**:
    *   **Admin Access**: Click the **Demo Admin** button on the login page (or credentials: `admin@taskflow.io` / `password`).
    *   **Member Access**: Click the **Demo Member** button on the login page (or credentials: `member@taskflow.io` / `password`).

---

## 🌐 Deployment (Railway Instructions)

Follow these instructions to deploy this application to Railway:

### 1. Push to GitHub
Initialize Git and push the codebase to your GitHub repository:
```bash
git init
git add .
git commit -m "feat: init taskflow workspace"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Set Up Project on Railway
1. Go to [Railway.app](https://railway.app/) and create a project.
2. Select **Deploy from GitHub repo** and connect your repository.

### 3. Add Environment Variables
Configure the following variables in the **Variables** settings tab of your Railway service:
*   `NEXTAUTH_SECRET`: Generate a random secure key.
*   `NEXTAUTH_URL`: Set to your live Railway domain (e.g., `https://your-production-app.up.railway.app`).

### 4. Set Up Persistent SQLite Volume
Since Railway containers run on ephemeral filesystems, your SQLite database (`prisma/dev.db`) will reset on new deployments. Add a volume to persist your data:
1. Go to your service's **Settings** tab.
2. Under **Volumes**, click **Add Volume**.
3. Name the volume and set the **Mount Path** to `/app/prisma` (where the SQLite database resides).
4. Redeploy your service.

*(Optional Alternative: You can add a PostgreSQL database plugin inside Railway, change the schema provider in `prisma/schema.prisma` to `postgresql`, and bind the `DATABASE_URL` variable).*

---

## ⏳ Submission Checklists

*   **Live App URL**: (Provided by Railway)
*   **GitHub Repository**: (Link to your public repository)
*   **README.md**: Complete documentation of features, setup, and RBAC rules.
*   **Demo Video (2-5 min)**: Record showcasing:
    1.  The Light/Dark theme transitions.
    2.  Admin login & full controls (Project creation, task assignment, inviting members).
    3.  Member login & restricted controls (Personal task isolation, task locks, status change constraints).

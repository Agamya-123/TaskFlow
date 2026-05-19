# 📌 TaskFlow - Team Task Manager (Full-Stack)

TaskFlow is a premium, beautifully designed full-stack team task management application. Built with Next.js, Prisma, Tailwind CSS v4, and NextAuth.js.

## 🚀 Key Features

*   **Authentication (Signup/Login)**: Uses NextAuth.js with Credentials provider. Automatically creates a user if the email doesn't exist (useful for MVP testing).
*   **Premium Glassmorphic Design**: Uses the Lumina Task Systems design language with backdrop blurs, dark mode themes, and electric purple/cyan accents. Designed via Stitch MCP.
*   **Dashboard**: Shows a high-level overview of tasks, recent tasks, and team activity.
*   **REST APIs**: `/api/tasks` and `/api/auth` endpoints built seamlessly using Next.js App Router.
*   **Database**: Uses SQLite for fast local development, but easily adaptable to PostgreSQL via Prisma.
*   **Role-based Access**: Users are created as `ADMIN` by default for the first user.

## ⚙️ Tech Stack

*   **Frontend**: Next.js 16 (App Router), React, Tailwind CSS v4
*   **Backend**: Next.js API Routes, Prisma ORM
*   **Database**: SQLite (Local / Railway Volumes), PostgreSQL (Production Optional)
*   **Auth**: NextAuth.js (v4) & bcryptjs

## 📦 Local Development

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set up the Database:**
    ```bash
    npx prisma db push
    ```

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The app will be running on `http://localhost:3000`.

## 🌐 Deployment (Mandatory Railway Instructions)

To deploy this application to Railway and fulfill the mandatory requirement, follow these exact steps:

1.  **Push to GitHub:**
    Initialize a git repository in this folder and push it to your GitHub account.
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
    git push -u origin main
    ```

2.  **Deploy on Railway:**
    *   Go to [Railway.app](https://railway.app/).
    *   Click **New Project** > **Deploy from GitHub repo**.
    *   Select your newly created repository.

3.  **Configure Environment Variables in Railway:**
    *   Go to your project's **Variables** tab.
    *   Add `NEXTAUTH_SECRET`: (Generate a random string, e.g., `super-secret-key-12345`).
    *   Add `NEXTAUTH_URL`: `https://YOUR_RAILWAY_URL.up.railway.app` (You will get this URL after the first deployment, you must update this variable once you have the domain).

4.  **Database Persistence (Crucial for SQLite on Railway):**
    Because Railway uses ephemeral file systems, your SQLite `dev.db` will be wiped on every deploy unless you add a volume.
    *   Go to your Railway Service Settings.
    *   Scroll to **Volumes** and click **Add Volume**.
    *   Set the mount path to `/app/prisma` (or wherever your `dev.db` is located relative to root).
    *   *Alternative:* If you prefer, you can add a **PostgreSQL** database service in Railway, update the `DATABASE_URL` variable, and change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`.

5.  **Build Command (Optional, usually automatic):**
    Railway will automatically detect Next.js and run `npm run build` and `npm start`.

## ⏳ Submission Requirements

*   **Live URL**: (Will be provided by Railway)
*   **GitHub repo**: (Your GitHub repository link)
*   **README**: You are reading it!
*   **Demo Video**: You can record the screen using OBS Studio, Loom, or Windows Game Bar (Win + G) showing:
    1.  The beautiful Dashboard UI.
    2.  Signing in or creating an account on the Login page.
    3.  Navigating the tasks.

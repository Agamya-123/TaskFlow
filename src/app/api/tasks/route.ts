import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';
import { resend } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Auto-seed default tasks if empty
  const count = await prisma.task.count();
  if (count === 0) {
    const project = await prisma.project.findFirst();
    const user = await prisma.user.findFirst();
    if (project && user) {
      const task1 = await prisma.task.create({
        data: {
          title: 'Design Landing Page Hero',
          description: 'Create stunning interactive 3D component with Tailwind animations',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          tags: ['design', 'frontend'],
          projectId: project.id,
          assigneeId: user.id
        }
      });
      await prisma.subtask.createMany({
        data: [
          { title: 'Create glassmorphic card component', isCompleted: true, taskId: task1.id },
          { title: 'Add Tailwind hover & slide-in animations', isCompleted: false, taskId: task1.id },
          { title: 'Test on mobile and desktop breakpoints', isCompleted: false, taskId: task1.id },
        ]
      });

      const task2 = await prisma.task.create({
        data: {
          title: 'Setup Authentication Middleware',
          description: 'Configure secure JSON Web Tokens with NextAuth session callbacks',
          status: 'TODO',
          priority: 'MEDIUM',
          tags: ['security', 'backend'],
          projectId: project.id,
          assigneeId: user.id
        }
      });
      await prisma.subtask.createMany({
        data: [
          { title: 'Configure JWT secret in .env', isCompleted: true, taskId: task2.id },
          { title: 'Define session callback to pass user role', isCompleted: false, taskId: task2.id },
        ]
      });

      const task3 = await prisma.task.create({
        data: {
          title: 'Database Migration to Production',
          description: 'Sync SQLite model schema with live Railway PostgreSQL cluster',
          status: 'DONE',
          priority: 'LOW',
          tags: ['database'],
          projectId: project.id,
          assigneeId: user.id
        }
      });
      await prisma.subtask.createMany({
        data: [
          { title: 'Export local SQLite data to JSON', isCompleted: true, taskId: task3.id },
          { title: 'Run prisma db push on Neon database', isCompleted: true, taskId: task3.id },
        ]
      });
    }
  }

  const tasks = await prisma.task.findMany({
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      subtasks: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, status, priority, tags, dueDate, projectId, assigneeId, subtasks } = body;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      tags: tags || [],
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId,
      assigneeId: assigneeId || null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      subtasks: true,
    },
  });

  // If subtasks were sent during task creation (e.g. via AI or templates)
  if (subtasks && Array.isArray(subtasks)) {
    const createdSubtasks = await Promise.all(
      subtasks.map((s: any) =>
        prisma.subtask.create({
          data: {
            title: s.title,
            isCompleted: s.isCompleted || false,
            taskId: task.id,
          },
        })
      )
    );
    task.subtasks = createdSubtasks;
  }

  return NextResponse.json(task);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, title, description, status, priority, tags, dueDate, projectId, assigneeId, subtasks } = body;

  // Fetch the current task before updating to compare fields for activity logging
  const oldTask = await prisma.task.findUnique({
    where: { id },
    include: { assignee: true },
  });

  // 1. Update basic task info
  const task = await prisma.task.update({
    where: { id },
    data: {
      title,
      description,
      status,
      priority: priority !== undefined ? priority : undefined,
      tags: tags !== undefined ? tags : undefined,
      dueDate: dueDate ? new Date(dueDate) : (dueDate === null ? null : undefined),
      projectId,
      assigneeId: assigneeId === '' ? null : (assigneeId !== undefined ? assigneeId : undefined),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      subtasks: { orderBy: { createdAt: 'asc' } },
    },
  });

  // 2. Sync subtasks if provided in the body
  if (subtasks && Array.isArray(subtasks)) {
    const existingSubtasks = await prisma.subtask.findMany({ where: { taskId: id } });
    const existingSubtaskIds = existingSubtasks.map(s => s.id);
    const newSubtaskIds = subtasks
      .filter((s: any) => s.id && !s.id.toString().startsWith('temp-'))
      .map((s: any) => s.id);
    const toDelete = existingSubtasks.filter(s => !newSubtaskIds.includes(s.id)).map(s => s.id);

    if (toDelete.length > 0) {
      await prisma.subtask.deleteMany({ where: { id: { in: toDelete } } });
    }

    for (const s of subtasks) {
      if (s.id && !s.id.toString().startsWith('temp-') && existingSubtaskIds.includes(s.id)) {
        await prisma.subtask.update({
          where: { id: s.id },
          data: { title: s.title, isCompleted: s.isCompleted },
        });
      } else {
        await prisma.subtask.create({
          data: { title: s.title, isCompleted: s.isCompleted || false, taskId: id },
        });
      }
    }

    // Refresh subtasks list in return object
    task.subtasks = await prisma.subtask.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  // 3. Activity Logging & Collaboration Events (Server Session User)
  const userEmail = session.user?.email;
  const user = userEmail ? await prisma.user.findUnique({ where: { email: userEmail } }) : null;
  const userId = user?.id;

  if (userId && oldTask) {
    // Status Change
    if (status && status !== oldTask.status) {
      await prisma.activityLog.create({
        data: {
          action: 'STATUS_CHANGE',
          details: `Moved task from "${oldTask.status}" to "${status}"`,
          taskId: id,
          userId,
        },
      });
    }

    // Assignee Change
    if (assigneeId !== undefined && assigneeId !== oldTask.assigneeId) {
      const oldAssigneeName = oldTask.assignee?.name || 'Unassigned';
      const newAssigneeName = task.assignee?.name || 'Unassigned';
      
      await prisma.activityLog.create({
        data: {
          action: 'ASSIGNEE_CHANGE',
          details: `Reassigned task from "${oldAssigneeName}" to "${newAssigneeName}"`,
          taskId: id,
          userId,
        },
      });

      // Send email alert via Resend when reassigned to a valid user
      if (task.assignee?.email && resend) {
        try {
          await resend.emails.send({
            from: 'TaskFlow AI <notifications@taskflow-ai.dev>',
            to: task.assignee.email,
            subject: `Task Assigned: ${task.title}`,
            html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; max-width: 600px;">
              <h2 style="color: #6366f1; margin-top: 0;">Task Assigned to You</h2>
              <p>Hello <strong>${task.assignee.name}</strong>,</p>
              <p>You have been assigned to the following task in TaskFlow AI:</p>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6366f1;">
                <h3 style="margin-top: 0; color: #1e1b4b; margin-bottom: 5px;">${task.title}</h3>
                <p style="font-size: 13px; color: #4b5563; margin-top: 0;">${task.description || 'No description provided.'}</p>
                <p style="font-size: 11px; color: #6b7280; margin-bottom: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                  <strong>Priority:</strong> ${task.priority} | <strong>Status:</strong> ${task.status}
                </p>
              </div>
              <p style="font-size: 11px; color: #9ca3af; margin-top: 20px;">
                This is an automated notification from your team board at TaskFlow AI.
              </p>
            </div>`,
          });
        } catch (emailErr) {
          console.error('Failed to send Resend email:', emailErr);
        }
      }
    }

    // Priority Change
    if (priority && priority !== oldTask.priority) {
      await prisma.activityLog.create({
        data: {
          action: 'PRIORITY_CHANGE',
          details: `Changed priority from "${oldTask.priority}" to "${priority}"`,
          taskId: id,
          userId,
        },
      });
    }

    // Tags Change
    if (tags && JSON.stringify(tags) !== JSON.stringify(oldTask.tags)) {
      await prisma.activityLog.create({
        data: {
          action: 'TAGS_CHANGE',
          details: `Updated tags to: ${tags.join(', ') || 'none'}`,
          taskId: id,
          userId,
        },
      });
    }
  }

  // 4. Real-time board update broadcast via Pusher
  if (pusherServer) {
    try {
      await pusherServer.trigger('task-board', 'task-updated', {
        taskId: id,
        task,
      });
    } catch (pusherErr) {
      console.error('Failed to trigger Pusher sync:', pusherErr);
    }
  }

  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id } = body;

  await prisma.task.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

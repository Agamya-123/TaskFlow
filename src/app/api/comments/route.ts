import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';
import { resend } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'taskId parameter is required' }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userEmail = session.user?.email;
  if (!userEmail) return NextResponse.json({ error: 'User email not found in session' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();
  const { taskId, content } = body;

  if (!taskId || !content) {
    return NextResponse.json({ error: 'taskId and content are required' }, { status: 400 });
  }

  // Create comment
  const comment = await prisma.comment.create({
    data: {
      content,
      taskId,
      userId: user.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Create Activity Log for comment creation
  const details = `${user.name || 'A team member'} added a comment: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`;
  await prisma.activityLog.create({
    data: {
      action: 'COMMENT_ADDED',
      details,
      taskId,
      userId: user.id,
    },
  });

  // Parse @mentions in comment content
  if (content.includes('@')) {
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });
    
    // Sort by name length descending to avoid substring collision (e.g. matching @John before @John Doe)
    const sortedUsers = [...allUsers]
      .filter((u) => !!u.name)
      .sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));

    let tempContent = content;
    for (const u of sortedUsers) {
      if (!u.name) continue;
      const mentionToken = `@${u.name}`;
      
      if (tempContent.includes(mentionToken)) {
        // Prevent double matching this string for shorter sub-names by replacing it with a placeholder
        tempContent = tempContent.replaceAll(mentionToken, `__MENTION_${u.id}__`);

        // Log mention activity
        await prisma.activityLog.create({
          data: {
            action: 'MENTION',
            details: `${user.name || 'A team member'} mentioned ${u.name} in a comment`,
            taskId,
            userId: user.id,
          },
        });

        // Email mentioned user via Resend (unless they mentioned themselves)
        const resendInstance = resend;
        if (u.email && resendInstance && u.id !== user.id) {
          prisma.task.findUnique({ where: { id: taskId } })
            .then((task) => {
              resendInstance.emails.send({
                from: 'TaskFlow AI <notifications@taskflow-ai.dev>',
                to: u.email!,
                subject: `Mentioned in Task: ${task?.title || 'Task update'}`,
                html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; max-width: 600px;">
                  <h2 style="color: #6366f1; margin-top: 0;">You Were Mentioned</h2>
                  <p>Hello <strong>${u.name}</strong>,</p>
                  <p><strong>${user.name || 'A team member'}</strong> mentioned you in a comment on the task <strong>"${task?.title || 'Unknown Task'}"</strong>:</p>
                  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6366f1; font-style: italic; color: #374151;">
                    "${content}"
                  </div>
                  <p style="font-size: 11px; color: #9ca3af; margin-top: 20px;">
                    This is an automated notification from your team board at TaskFlow AI.
                  </p>
                </div>`,
              }).catch((emailErr) => {
                console.error('Failed to send mention email:', emailErr);
              });
            })
            .catch((taskErr) => {
              console.error('Failed to fetch task for email:', taskErr);
            });
        }
      }
    }
  }

  // Broadcast via Pusher if configured
  if (pusherServer) {
    try {
      await pusherServer.trigger('task-collaboration', 'comment-added', {
        taskId,
        comment,
      });
    } catch (err) {
      console.error('Pusher trigger failed:', err);
    }
  }

  return NextResponse.json(comment);
}

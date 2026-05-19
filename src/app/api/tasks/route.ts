import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
      await prisma.task.createMany({
        data: [
          { title: 'Design Landing Page Hero', description: 'Create stunning interactive 3D component with Tailwind animations', status: 'IN_PROGRESS', projectId: project.id, assigneeId: user.id },
          { title: 'Setup Authentication Middleware', description: 'Configure secure JSON Web Tokens with NextAuth session callbacks', status: 'TODO', projectId: project.id, assigneeId: user.id },
          { title: 'Database Migration to Production', description: 'Sync SQLite model schema with live Railway PostgreSQL cluster', status: 'DONE', projectId: project.id, assigneeId: user.id },
        ],
      });
    }
  }

  const tasks = await prisma.task.findMany({
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, status, dueDate, projectId, assigneeId } = body;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: status || 'TODO',
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId,
      assigneeId: assigneeId || null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(task);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, title, description, status, dueDate, projectId, assigneeId } = body;

  const task = await prisma.task.update({
    where: { id },
    data: {
      title,
      description,
      status,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      projectId,
      assigneeId: assigneeId === '' ? null : assigneeId,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

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



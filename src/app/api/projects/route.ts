import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Auto-seed default projects if empty
  const count = await prisma.project.count();
  if (count === 0) {
    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.project.createMany({
        data: [
          { name: 'Acme Website Redesign', description: 'Modernize marketing site with glassmorphism', ownerId: user.id },
          { name: 'API Integration Layer', description: 'Build scalable GraphQL/REST gateway APIs', ownerId: user.id },
        ],
      });
    }
  }

  const projects = await prisma.project.findMany({
    include: {
      owner: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, description } = body;

  const user = await prisma.user.findUnique({
    where: { email: session.user?.email || '' },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const project = await prisma.project.create({
    data: {
      name,
      description,
      ownerId: user.id,
    },
  });

  return NextResponse.json(project);
}

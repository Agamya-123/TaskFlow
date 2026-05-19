import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Auto-seed some team members if there is only 1 user
  const count = await prisma.user.count();
  if (count === 1) {
    await prisma.user.createMany({
      data: [
        { email: 'sarah.dev@taskflow.io', password: 'no-password-needed-dev', name: 'Sarah Chen', role: 'MEMBER' },
        { email: 'marcus.eng@taskflow.io', password: 'no-password-needed-dev', name: 'Marcus Brody', role: 'MEMBER' },
        { email: 'felix.design@taskflow.io', password: 'no-password-needed-dev', name: 'Felix Vance', role: 'ADMIN' },
      ],
    });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}

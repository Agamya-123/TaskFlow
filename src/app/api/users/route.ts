import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Auto-seed some team members if there is only 1 user
  const count = await prisma.user.count();
  if (count === 1) {
    const placeholderPassword = await bcrypt.hash('password123', 10);
    await prisma.user.createMany({
      data: [
        { email: 'sarah.dev@taskflow.io', password: placeholderPassword, name: 'Sarah Chen', role: 'MEMBER' },
        { email: 'marcus.eng@taskflow.io', password: placeholderPassword, name: 'Marcus Brody', role: 'MEMBER' },
        { email: 'felix.design@taskflow.io', password: placeholderPassword, name: 'Felix Vance', role: 'ADMIN' },
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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Backend authorization: Only Admins can invite team members
  const currentUserRole = (session.user as any)?.role;
  if (currentUserRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, role } = body;
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const placeholderPassword = await bcrypt.hash('password123', 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        password: placeholderPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Backend authorization: Only Admins can change user roles
  const currentUserRole = (session.user as any)?.role;
  if (currentUserRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, role } = body;
    if (!id || !role) {
      return NextResponse.json({ error: 'User ID and Role are required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

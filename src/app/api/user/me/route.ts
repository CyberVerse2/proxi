import { NextResponse } from 'next/server';
import { getUserByPrivyId, getProxyByCreatorId, updateUser } from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const privyId = searchParams.get('privyId');
  if (!privyId) return NextResponse.json({ error: 'Missing privyId' }, { status: 400 });

  const user = await getUserByPrivyId(privyId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const proxy = await getProxyByCreatorId(user.id);

  return NextResponse.json({ user, proxy });
}

export async function PATCH(request: Request) {
  const { privyId, displayName, bio } = await request.json();
  if (!privyId) return NextResponse.json({ error: 'Missing privyId' }, { status: 400 });

  const user = await getUserByPrivyId(privyId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const updated = await updateUser(user.id, { displayName, bio });
  return NextResponse.json(updated);
}

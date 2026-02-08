import { NextResponse } from 'next/server';
import {
  getProxyQueue,
  answerQueueItem,
  skipQueueItem,
  getUserByPrivyId,
  getProxyByCreatorId
} from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let proxyId = searchParams.get('proxyId');

  // Allow resolving via privyId (owner's proxy)
  if (!proxyId) {
    const privyId = searchParams.get('privyId');
    if (privyId) {
      const user = await getUserByPrivyId(privyId);
      if (user) {
        const proxy = await getProxyByCreatorId(user.id);
        proxyId = proxy?.id ?? null;
      }
    }
  }

  if (!proxyId) return NextResponse.json({ error: 'Missing proxyId or privyId' }, { status: 400 });

  const items = await getProxyQueue(proxyId);
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { id, answer, action } = await request.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  if (action === 'skip') {
    const item = await skipQueueItem(id);
    return NextResponse.json(item);
  }

  if (!answer) return NextResponse.json({ error: 'Missing answer' }, { status: 400 });
  const item = await answerQueueItem(id, answer);
  return NextResponse.json(item);
}

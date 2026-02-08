import { NextResponse } from 'next/server';
import {
  getLiveProxies,
  createProxy,
  getTopProxies,
  getTrendingProxies,
  updateProxy,
  getUserByPrivyId,
  getProxyByCreatorId
} from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const limit = Number(searchParams.get('limit') ?? 20);

  let proxies;
  if (category === 'trending') {
    proxies = await getTrendingProxies(limit);
  } else if (category === 'top') {
    proxies = await getTopProxies(limit);
  } else {
    proxies = await getLiveProxies(limit);
  }

  return NextResponse.json(proxies);
}

export async function POST(request: Request) {
  const data = await request.json();
  const proxy = await createProxy(data);
  return NextResponse.json(proxy, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { proxyId, privyId, ...updates } = body;

  let id = proxyId;

  if (!id && privyId) {
    const user = await getUserByPrivyId(privyId);
    if (user) {
      const proxy = await getProxyByCreatorId(user.id);
      id = proxy?.id;
    }
  }

  if (!id) return NextResponse.json({ error: 'Missing proxyId or privyId' }, { status: 400 });

  const proxy = await updateProxy(id, updates);
  return NextResponse.json(proxy);
}

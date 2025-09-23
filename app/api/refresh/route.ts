import { NextResponse } from 'next/server';

import { fetchMatchdayData } from '../../../scripts/fetchData';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const spieltag = Number(searchParams.get('spieltag') ?? '1');
  const force = searchParams.get('force') === 'true';
  if (!Number.isFinite(spieltag) || spieltag < 1) {
    return NextResponse.json({ error: 'Ungültiger Spieltag' }, { status: 400 });
  }
  const data = await fetchMatchdayData(spieltag, { force });
  return NextResponse.json({
    updatedAt: data.updatedAt,
    cacheAge: data.cacheAge,
    fromCache: data.fromCache
  });
}

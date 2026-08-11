import { NextRequest, NextResponse } from 'next/server';
import { runApiBalanceSyncCheck } from '@/lib/cron-services';

async function handleAuthAndExecute(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret) {
    const isAuthHeaderValid = authHeader === `Bearer ${expectedSecret}`;
    const isSecretParamValid = secretParam === expectedSecret;
    if (!isAuthHeaderValid && !isSecretParamValid) {
      return NextResponse.json({ error: 'Unauthorized: CRON_SECRET không hợp lệ' }, { status: 401 });
    }
  }

  const result = await runApiBalanceSyncCheck();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return handleAuthAndExecute(request);
}

export async function POST(request: NextRequest) {
  return handleAuthAndExecute(request);
}

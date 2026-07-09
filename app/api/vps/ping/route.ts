import { NextResponse } from 'next/server';
import net from 'net';

function pingTcp(ip: string, port: number, timeout = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeout);

    socket.connect(port, ip, () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('error', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hosts } = body as { hosts: Array<{ id: number; ip: string; port: number }> };

    if (!hosts || !Array.isArray(hosts)) {
      return NextResponse.json({ error: 'Hosts must be an array' }, { status: 400 });
    }

    const results = await Promise.all(
      hosts.map(async (host) => {
        const alive = await pingTcp(host.ip, host.port);
        return {
          id: host.id,
          alive,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

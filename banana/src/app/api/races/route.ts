import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';

export async function GET() {
  try {
    const filePath = '/tmp/races.json';

    const data = await fs.readFile(filePath, 'utf8');
    const races = JSON.parse(data);

    return NextResponse.json(races);
  } catch (error) {
    console.error('⚠️ /api/races não encontrou races.json em /tmp:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export const revalidate = 0;

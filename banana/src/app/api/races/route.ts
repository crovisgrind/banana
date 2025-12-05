import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'races.json');
    const data = await fs.readFile(filePath, 'utf8');
    const races = JSON.parse(data);

    return NextResponse.json(races);
  } catch (error) {
    console.error('Erro ao ler races.json:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export const revalidate = 0;

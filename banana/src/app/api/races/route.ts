import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Caminho para o arquivo dentro de /public
    const filePath = path.join(process.cwd(), 'public', 'races.json');

    const fileData = await fs.readFile(filePath, 'utf8');
    const races = JSON.parse(fileData);

    return NextResponse.json(races);
  } catch (error) {
    console.error('Erro ao carregar races.json:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export const revalidate = 0;

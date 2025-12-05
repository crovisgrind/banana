import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path'; // É necessário importar o módulo 'path' do Node.js

// FORÇA A NÃO-CACHE da função Serverless no CDN da Vercel
export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    // 1. Constrói o caminho absoluto para o arquivo dentro da pasta 'public/data'
    const filePath = path.join(process.cwd(), 'public', 'data', 'races.json');

    // 2. Lê o arquivo
    const data = await fs.readFile(filePath, 'utf8');
    const races = JSON.parse(data);

    return NextResponse.json(races);
  } catch (error) {
    console.error('⚠️ /api/races não encontrou races.json em public/data:', error);
    return NextResponse.json([], { status: 200 });
  }
}
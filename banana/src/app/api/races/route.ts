// src/app/api/races/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';

// 1. FORÇA a execução dinâmica do endpoint API (não cacheia no CDN)
export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    // 2. LÊ do local temporário onde o crawler SALVA (assumindo que seja /tmp)
    const filePath = '/tmp/races.json'; 

    // Inclua um timestamp para DEBUG e veja se está lendo o arquivo certo
    console.log(`[API RACES] Tentando ler: ${filePath} em ${new Date().toISOString()}`);

    const data = await fs.readFile(filePath, 'utf8');
    const races = JSON.parse(data);

    return NextResponse.json(races);
  } catch (error) {
    console.error('⚠️ /api/races não encontrou races.json. Falha de persistência?');
    // Retorna vazio em caso de falha para não quebrar a página
    return NextResponse.json([], { status: 200 }); 
  }
}
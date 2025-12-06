// src/app/api/races/route.ts

import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('\n🔍 ========== API /races ==========');
    console.log(`⏰ ${new Date().toISOString()}`);

    // Buscar o arquivo races.json
    console.log('📥 Buscando races.json do Blob...');
    
    const { blobs } = await list({ prefix: 'races/races.json' });

    if (!blobs || blobs.length === 0) {
      console.warn('⚠️ Blob não encontrado');
      return NextResponse.json(
        [],
        { status: 200 }
      );
    }

    const blob = blobs[0];
    console.log(`✅ Blob encontrado: ${blob.pathname} (${blob.size} bytes)`);
    console.log(`   URL: ${blob.url}`);

    // Fazer fetch do arquivo via URL pública
    console.log('📥 Fazendo fetch do conteúdo...');
    const response = await fetch(blob.url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`❌ Erro ao fetch: ${response.statusText}`);
      return NextResponse.json([], { status: 200 });
    }

    const text = await response.text();
    const races = JSON.parse(text);

    console.log(`✅ ${races.length} corridas carregadas`);
    
    if (races.length > 0) {
      console.log('📌 Primeira corrida:', races[0].title, races[0].date);
    }

    console.log('========== FIM ==========\n');

    return NextResponse.json(races);

  } catch (error) {
    console.error('\n❌ ERRO na API /races');
    console.error('Erro:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : '');
    
    return NextResponse.json([], { status: 200 });
  }
}
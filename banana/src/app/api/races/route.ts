// src/app/api/races/route.ts

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('\n🔍 API /races - Buscando do Blob...');

    // ✅ URL DIRETA do Blob (copie do seu Vercel Storage)
    // Você pode encontrar isso em: Vercel Dashboard → Storage → Blob → races/races.json
    const BLOB_URL = process.env.BLOB_RACES_URL || '';

    if (!BLOB_URL) {
      console.error('❌ BLOB_RACES_URL não configurada!');
      return NextResponse.json([], { status: 200 });
    }

    console.log(`📥 Buscando de: ${BLOB_URL.substring(0, 50)}...`);

    const response = await fetch(BLOB_URL, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`❌ Erro: ${response.statusText}`);
      return NextResponse.json([], { status: 200 });
    }

    const races = await response.json();
    console.log(`✅ ${races.length} corridas carregadas`);

    return NextResponse.json(races);

  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
    return NextResponse.json([], { status: 200 });
  }
}
// src/app/api/races/route.ts

import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('\n🔍 ========== API /races ==========');
    console.log(`⏰ ${new Date().toISOString()}`);

    // ✅ Usar 'get' ao invés de 'list' - mais direto e confiável
    console.log('📥 Buscando races.json do Blob...');
    
    const blob = await get('races/races.json');

    if (!blob) {
      console.warn('⚠️ Blob não encontrado');
      return NextResponse.json(
        { message: 'Nenhuma corrida encontrada. Cron job não foi executado ainda.' },
        { status: 200 }
      );
    }

    console.log(`✅ Blob encontrado: ${blob.size} bytes`);

    // Converter stream para string
    const text = await blob.text();
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
    
    // Retorna array vazio em vez de erro, para não quebrar o front
    return NextResponse.json(
      [],
      { status: 200 }
    );
  }
}
// src/app/api/races/route.ts

import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';

const BLOB_FILE_NAME = 'races/races.json';

export async function GET() {
  try {
    console.log('\n🔍 ========== DEBUG API RACES ==========');
    console.log(`⏰ Horário: ${new Date().toISOString()}`);
    console.log(`📍 Procurando por: ${BLOB_FILE_NAME}`);

    // DEBUG: Verificar se as variáveis estão setadas
    console.log('🔑 Verificando variáveis de ambiente:');
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const hasKey = !!process.env.BLOB_STORE_KEY;
    console.log(`   BLOB_READ_WRITE_TOKEN configurado: ${hasToken}`);
    console.log(`   BLOB_STORE_KEY configurado: ${hasKey}`);
    
    if (!hasToken && !hasKey) {
      console.error('❌ NENHUMA VARIÁVEL DE BLOB CONFIGURADA!');
      console.error('Variables disponíveis:', Object.keys(process.env).filter(k => k.includes('BLOB')));
      return NextResponse.json(
        { error: 'Blob não configurado', variables: Object.keys(process.env).filter(k => k.includes('BLOB')) },
        { status: 401 }
      );
    }

    // 1. Listar todos os blobs
    console.log('📦 Listando blobs...');
    const { blobs } = await list({ prefix: 'races/' });
    
    console.log(`✅ Total de blobs encontrados: ${blobs.length}`);
    blobs.forEach((blob, i) => {
      console.log(`   ${i + 1}. ${blob.pathname} (${blob.size} bytes)`);
    });

    if (blobs.length === 0) {
      console.error(`❌ Nenhum blob encontrado com prefixo 'races/'`);
      console.error('❌ O cron job ainda não foi executado ou falhou');
      return NextResponse.json([], { status: 200 });
    }

    // 2. Pegar o primeiro blob que corresponde ao padrão
    const racesBlob = blobs.find(b => b.pathname === 'races/races.json');
    
    if (!racesBlob) {
      console.error(`❌ Blob 'races/races.json' não encontrado`);
      console.error(`Blobs disponíveis: ${blobs.map(b => b.pathname).join(', ')}`);
      return NextResponse.json([], { status: 200 });
    }

    console.log(`✅ Blob encontrado: ${racesBlob.pathname}`);
    console.log(`   URL: ${racesBlob.url}`);
    console.log(`   Tamanho: ${racesBlob.size} bytes`);

    // 3. Fazer fetch do conteúdo
    console.log('📥 Buscando conteúdo do blob...');
    const response = await fetch(racesBlob.url);

    if (!response.ok) {
      console.error(`❌ Erro ao buscar blob: ${response.statusText}`);
      return NextResponse.json([], { status: 200 });
    }

    // 4. Parse JSON
    const dataText = await response.text();
    console.log(`✅ Conteúdo recebido: ${dataText.length} caracteres`);

    const races = JSON.parse(dataText);
    console.log(`✅ JSON parseado com sucesso: ${races.length} corridas`);

    if (races.length > 0) {
      console.log('📌 Primeiras 3 corridas:');
      races.slice(0, 3).forEach((race: any, i: number) => {
        console.log(`   ${i + 1}. ${race.title} (${race.date})`);
      });
    }

    console.log('========== FIM DO DEBUG ==========\n');

    return NextResponse.json(races);

  } catch (error) {
    console.error('\n❌ ========== ERRO NA API ==========');
    console.error('Erro:', error);
    if (error instanceof Error) {
      console.error('Mensagem:', error.message);
      console.error('Stack:', error.stack);
    }
    console.error('========== FIM DO ERRO ==========\n');
    
    return NextResponse.json([], { status: 200 });
  }
}
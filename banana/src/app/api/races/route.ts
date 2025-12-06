// src/app/api/races/route.ts

import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('\n🔍 ========== API /races START ==========');
    console.log(`⏰ ${new Date().toISOString()}`);

    // DEBUG: Verificar credenciais
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    console.log(`🔑 BLOB_READ_WRITE_TOKEN existe: ${hasToken}`);
    
    if (!hasToken) {
      console.error('❌ BLOB_READ_WRITE_TOKEN não configurado!');
      return NextResponse.json({ error: 'Blob token não configurado' }, { status: 500 });
    }

    // Buscar o arquivo races.json
    console.log('📥 Chamando list({ prefix: "races/races.json" })...');
    
    let blobs;
    try {
      const result = await list({ prefix: 'races/races.json' });
      blobs = result.blobs;
      console.log(`✅ list() retornou ${blobs.length} blobs`);
    } catch (listError) {
      console.error('❌ Erro no list():', listError instanceof Error ? listError.message : String(listError));
      throw listError;
    }

    if (!blobs || blobs.length === 0) {
      console.warn('⚠️ Nenhum blob encontrado com prefix "races/races.json"');
      console.log('📦 Tentando listar todos os blobs com prefix "races/"...');
      
      try {
        const allResult = await list({ prefix: 'races/' });
        console.log(`Found ${allResult.blobs.length} blobs com prefix "races/":`);
        allResult.blobs.forEach(b => console.log(`  - ${b.pathname}`));
      } catch (e) {
        console.error('❌ Erro ao listar todos:', e instanceof Error ? e.message : String(e));
      }
      
      return NextResponse.json([], { status: 200 });
    }

    const blob = blobs[0];
    console.log(`✅ Blob encontrado: ${blob.pathname}`);
    console.log(`   Tamanho: ${blob.size} bytes`);
    console.log(`   URL: ${blob.url}`);

    // Fazer fetch do arquivo via URL pública
    console.log('📥 Fazendo fetch do blob.url...');
    let response;
    try {
      response = await fetch(blob.url, {
        cache: 'no-store',
      });
      console.log(`✅ Fetch retornou status: ${response.status}`);
    } catch (fetchError) {
      console.error('❌ Erro no fetch:', fetchError instanceof Error ? fetchError.message : String(fetchError));
      throw fetchError;
    }

    if (!response.ok) {
      console.error(`❌ Erro no fetch: ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Resposta: ${errorText}`);
      return NextResponse.json([], { status: 200 });
    }

    let text;
    try {
      text = await response.text();
      console.log(`✅ Texto recebido: ${text.length} caracteres`);
    } catch (textError) {
      console.error('❌ Erro ao ler texto:', textError instanceof Error ? textError.message : String(textError));
      throw textError;
    }

    let races;
    try {
      races = JSON.parse(text);
      console.log(`✅ JSON parseado com sucesso: ${races.length} corridas`);
      
      if (races.length > 0) {
        console.log('📌 Primeira corrida:', races[0].title, races[0].date);
      }
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError instanceof Error ? parseError.message : String(parseError));
      console.error('Primeiros 100 caracteres:', text.substring(0, 100));
      throw parseError;
    }

    console.log('========== API /races END ==========\n');

    return NextResponse.json(races);

  } catch (error) {
    console.error('\n❌ ========== ERRO GERAL NA API /races ==========');
    console.error('Tipo:', typeof error);
    console.error('Erro:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    console.error('========== FIM DO ERRO ==========\n');
    
    return NextResponse.json([], { status: 200 });
  }
}
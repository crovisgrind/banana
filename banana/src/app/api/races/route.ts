// src/app/api/races/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache de 1 hora no navegador

export async function GET() {
  try {
    console.log('\n🔍 [API] /races - Carregando corridas...');

    // ✅ CORREÇÃO: Usa a URL pública do Blob diretamente
    // O Vercel Blob retorna uma URL pública sempre que você usa put()
    // Você pode pegar essa URL em: Vercel Dashboard → Storage → Blob
    
    const BLOB_URL = 'https://l6gigqjmh87ogcuy.public.blob.vercel-storage.com/races/races.json';
    
    // ⚠️ SE O LINK ACIMA NÃO FUNCIONAR:
    // 1. Vá em https://vercel.com/dashboard/storage/blob
    // 2. Procure o arquivo "races.json"
    // 3. Copie a URL pública
    // 4. Cole aqui

    if (!BLOB_URL) {
      console.warn('⚠️  Usando arquivo de fallback vazio');
      return NextResponse.json([], {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }

    console.log(`📥 Buscando de: ${BLOB_URL}`);

    const response = await fetch(BLOB_URL, {
      cache: 'no-store', // Não cachear a requisição fetch
      headers: {
        'User-Agent': 'NextJS-RaceCrawler/1.0',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️  Erro ao buscar Blob (${response.status}): ${response.statusText}`);
      return NextResponse.json([], {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      });
    }

    const races = await response.json();
    console.log(`✅ ${races.length} corridas carregadas`);

    return NextResponse.json(races, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
    return NextResponse.json([], {
      status: 200, // Retorna 200 com array vazio em vez de erro
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }
}

// ✅ NOVO: Endpoint para ATUALIZAÇÃO MANUAL (chamado por UI)
export async function POST() {
  try {
    console.log('\n🔄 [API] POST /races - Disparando atualização manual...');

    // ✅ Chama o cron endpoint para atualizar manualmente
    const VERCEL_PROJECT_URL = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const cronSecret = process.env.CRON_SECRET || '';

    const response = await fetch(
      `${VERCEL_PROJECT_URL}/api/cron/generate-races`,
      {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${cronSecret}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao disparar cron:', data);
      return NextResponse.json(
        { success: false, error: 'Falha ao disparar atualização' },
        { status: 500 }
      );
    }

    console.log('✅ Atualização manual disparada com sucesso');
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
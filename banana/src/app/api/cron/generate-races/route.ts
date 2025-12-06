// src/app/api/cron/generate-races/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { put } from '@vercel/blob';

import { crawlTvComRunning } from '@/crawlers/tvcomrunning';
import { crawlAtivo } from '@/crawlers/ativo';
import { Race } from '@/types/races';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos (máximo para Vercel)

// Mapa dos meses
const MONTH_MAP: { [key: string]: number } = {
  'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'ABRIL': 3,
  'MAIO': 4, 'JUNHO': 5, 'JULHO': 6, 'AGOSTO': 7,
  'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11,
};

// Normalização de datas
function normalizeDate(rawDate: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentYear = now.getFullYear();

  rawDate = rawDate.toUpperCase().trim();

  // Formato: "01 DE JANEIRO DE 2025"
  const full = rawDate.match(/(\d{1,2})\s+DE\s+([A-ZÃ‡ÃƒÃÃ‰ÃÃ"Ãš]+)\s+DE\s+(\d{4})/);
  if (full) {
    const day = Number(full[1]);
    const month = MONTH_MAP[full[2]];
    const year = Number(full[3]);
    if (month !== undefined) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Formato: "01/01"
  const numeric = rawDate.match(/(\d{1,2})[./](\d{1,2})/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    let year = currentYear;

    const d = new Date(year, month, day);
    if (d < now) year++;

    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return rawDate;
}

// ✅ VERIFICA SE É UMA REQUISIÇÃO DE CRON VÁLIDA
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Se CRON_SECRET não está configurada, aceita (útil para testes locais)
  if (!cronSecret) {
    console.warn("⚠️  CRON_SECRET não configurada. Aceitando todas as requisições.");
    return true;
  }

  // Verifica Bearer token
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  // ✅ VERIFICA AUTENTICAÇÃO DO CRON
  if (!verifyCronSecret(request)) {
    console.error("❌ [CRON] Acesso não autorizado");
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log("\n🚀 [CRON] Iniciando coleta de corridas...");
    const start = Date.now();

    // ✅ VERIFICA SE O TOKEN BLOB ESTÁ CONFIGURADO
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error("❌ [CRON] BLOB_READ_WRITE_TOKEN não configurada!");
      return NextResponse.json(
        {
          success: false,
          error: 'BLOB_READ_WRITE_TOKEN não configurada no ambiente Vercel',
          help: 'Configure a variável de ambiente BLOB_READ_WRITE_TOKEN em Vercel → Settings → Environment Variables'
        },
        { status: 500 }
      );
    }
    console.log("[CRON] ✅ Token Blob encontrado");

    // 1. CRAWLERS (com timeout para Vercel)
    console.log("[CRON] 🔄 Executando crawlers em paralelo...");
    const tvComRaces = await crawlTvComRunning().catch(err => {
      console.error("[CRON] ❌ Erro TVCom:", err);
      return [];
    });
    
    // ⏸️ TEMPORÁRIO: Ativo desabilitado para debug
    console.log("[CRON] ⏸️  Ativo desabilitado temporariamente (debug)");
    const ativoRaces: any[] = [];

    console.log(`[CRON] ✅ TVCom: ${tvComRaces.length} | Ativo: ${ativoRaces.length}`);

    // 2. UNIFICAR
    const all = [...tvComRaces, ...ativoRaces];
    console.log(`[CRON] 📊 Total antes dedup: ${all.length}`);

    // 3. DEDUPLICAR (por URL)
    const unique = Array.from(new Map(all.map(r => [r.url, r])).values());
    console.log(`[CRON] 🔄 Após dedup: ${unique.length}`);

    // 4. NORMALIZAR DATAS
    const normalized = unique.map(r => ({
      ...r,
      date: normalizeDate(r.date),
    }));

    // 5. FILTRAR FUTURAS
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const future = normalized.filter(r => {
      const d = new Date(r.date);
      return !isNaN(d.getTime()) && d >= today;
    });
    console.log(`[CRON] 📅 Corridas futuras: ${future.length}`);

    // 6. ORDENAR POR DATA
    const sorted = future.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // 7. ✅ SALVAR NO VERCEL BLOB COM RETRY E ALLOWOVERWRITE
    let blobUrl: string | null = null;
    let retries = 3;
    
    while (retries > 0 && !blobUrl) {
      try {
        console.log(`[CRON] 💾 Salvando no Blob (tentativa ${4 - retries}/3)...`);
        const jsonContent = JSON.stringify(sorted, null, 2);
        
        const blob = await put('races/races.json', jsonContent, {
          access: 'public',
          contentType: 'application/json',
          allowOverwrite: true, // ✅ CRÍTICO: Permite sobrescrever arquivo existente
          token: blobToken, // ✅ CRÍTICO: Passa o token explicitamente
        });
        
        blobUrl = blob.url;
        console.log(`[CRON] ✅ Blob salvo em: ${blobUrl}`);
      } catch (blobError) {
        retries--;
        console.error(`[CRON] ⚠️  Erro ao salvar Blob (${retries} tentativas restantes):`, 
          blobError instanceof Error ? blobError.message : String(blobError)
        );
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 1000)); // Aguarda 1s antes de retry
        }
      }
    }

    if (!blobUrl) {
      throw new Error("Falha ao salvar JSON no Vercel Blob após 3 tentativas");
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);

    // ✅ RESPOSTA DE SUCESSO
    const response = {
      success: true,
      message: "✅ Crawler executado e JSON atualizado com sucesso!",
      stats: {
        tvcom: tvComRaces.length,
        ativo: ativoRaces.length,
        total: sorted.length,
        blobUrl: blobUrl,
        duration: `${duration}s`,
        timestamp: new Date().toISOString(),
      },
    };

    console.log("[CRON] 🎉 Execução concluída com sucesso");
    return NextResponse.json(response);

  } catch (err) {
    console.error("❌ [CRON] Erro fatal:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
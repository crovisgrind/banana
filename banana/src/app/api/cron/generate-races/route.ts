// src/app/api/cron/route.ts (ou onde seu crawler está)
import { NextResponse } from 'next/server';
// ⚠️ REMOVIDOS: import * as fs from 'fs'; import * as path from 'path';
import { put } from '@vercel/blob'; // 🎯 NOVO: Importa a função de escrita do Blob

import { crawlTvComRunning } from '@/crawlers/tvcomrunning';
import { crawlAtivo } from '@/crawlers/ativo';
import { Race } from '@/types/races';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Garante que a função não seja cacheada (boa prática)

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
  const full = rawDate.match(/(\d{1,2})\s+DE\s+([A-ZÇÃÁÉÍÓÚ]+)\s+DE\s+(\d{4})/);
  if (full) {
    const day = Number(full[1]);
    const month = MONTH_MAP[full[2]];
    const year = Number(full[3]);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

export async function GET() {
  try {
    console.log("🏃 [CRON] Iniciando coleta...");
    const start = Date.now();

    // 1. Crawlers
    const [tvComRaces, ativoRaces] = await Promise.all([
      crawlTvComRunning(),
      crawlAtivo(),
    ]);

    // 2. Unificar
    const all = [...tvComRaces, ...ativoRaces];

    // 3. Dedup
    const unique = Array.from(new Map(all.map(r => [r.url, r])).values());

    // 4. Normalizar datas
    const normalized = unique.map(r => ({
      ...r,
      date: normalizeDate(r.date),
    }));

    // 5. Filtrar futuras
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const future = normalized.filter(r => {
      const d = new Date(r.date);
      return !isNaN(d.getTime()) && d >= today;
    });

    // 6. Ordenar
    const sorted = future.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // 7. SALVAMENTO CORRIGIDO: Salva no Vercel Blob (Armazenamento Persistente)
    const jsonContent = JSON.stringify(sorted, null, 2);
    const blob = await put('races/races.json', jsonContent, { 
        access: 'public',
        contentType: 'application/json'
    });

    const duration = ((Date.now() - start) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      message: "Crawler executado e JSON salvo no Vercel Blob com sucesso!",
      stats: {
        tvcom: tvComRaces.length,
        ativo: ativoRaces.length,
        total: sorted.length,
        savedAt: blob.url, // Agora mostra o URL do Blob
        duration: `${duration}s`,
        timestamp: new Date().toISOString(), // Adicionado para confirmação
      },
    });

  } catch (err) {
    console.error("❌ [CRON] Erro:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
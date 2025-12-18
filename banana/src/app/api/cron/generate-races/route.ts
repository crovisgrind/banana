// src/app/api/cron/generate-races/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { put } from '@vercel/blob';

import { crawlTvComRunning } from '@/crawlers/tvcomrunning';
import { crawlAtivo } from '@/crawlers/ativo';
import { getMinhasInscricoesRaces } from '@/crawlers/o2corre'; // ✅ Importado do script manual
import { Race } from '@/types/races';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; 

const MONTH_MAP: { [key: string]: number } = {
  'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'ABRIL': 3,
  'MAIO': 4, 'JUNHO': 5, 'JULHO': 6, 'AGOSTO': 7,
  'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11,
};

// ✅ NOVO: Mapa de abreviaturas do script manual
const MONTH_ABBREVIATION_MAP: { [key: string]: number } = {
  'JAN': 0, 'FEV': 1, 'MAR': 2, 'ABR': 3,
  'MAI': 4, 'JUN': 5, 'JUL': 6, 'AGO': 7,
  'SET': 8, 'OUT': 9, 'NOV': 10, 'DEZ': 11,
};

function normalizeDate(rawDate: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentYear = now.getFullYear();
  rawDate = rawDate.toUpperCase().trim();

  // 1. Formato COMPLETO (TVCom)
  const full = rawDate.match(/(\d{1,2})\s+DE\s+([A-ZÇÃÕÉÊÁÂÚÍÓÔ\s]+)\s+DE\s+(\d{4})/);
  if (full) {
    const day = Number(full[1]);
    const month = MONTH_MAP[full[2].trim()];
    const year = Number(full[3]);
    if (month !== undefined) return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // 2. ✅ NOVO: Formato Curto (Ativo/O2) do script manual
  const shortMonth = rawDate.match(/(\d{1,2})\s+DE\s+([A-ZÇÃÕÉÊÁÂÚÍÓÔ]{3,})/);
  if (shortMonth) {
    const day = Number(shortMonth[1]);
    const monthKey = shortMonth[2].substring(0, 3);
    const month = MONTH_ABBREVIATION_MAP[monthKey];
    if (month !== undefined) {
      let year = currentYear;
      if (new Date(year, month, day) < now) year++;
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 3. Formato NUMÉRICO: "01/01"
  const numeric = rawDate.match(/(\d{1,2})[./](\d{1,2})/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    let year = currentYear;
    if (new Date(year, month, day) < now) year++;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return rawDate;
}

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("\n🚀 [CRON] Iniciando coleta unificada...");
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    // ✅ EXECUTANDO OS 3 CRAWLERS (Igual ao manual)
    const [tvComRaces, ativoRaces, o2correRaces] = await Promise.all([
      crawlTvComRunning().catch(() => []),
      crawlAtivo().catch(() => []),
      getMinhasInscricoesRaces().catch(() => []), // Adicionado O2
    ]);

    const all = [...tvComRaces, ...ativoRaces, ...o2correRaces];
    const unique = Array.from(new Map(all.map(r => [r.url, r])).values());
    
    const normalized = unique.map(r => ({ ...r, date: normalizeDate(r.date) }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = normalized
      .filter(r => {
        const d = new Date(r.date);
        return !isNaN(d.getTime()) && d >= today;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // SALVAR NO BLOB
    const jsonContent = JSON.stringify(sorted, null, 2);
    const blob = await put('races/races.json', jsonContent, {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
      token: blobToken,
    });

    return NextResponse.json({
      success: true,
      stats: {
        total: sorted.length,
        sources: { tvcom: tvComRaces.length, ativo: ativoRaces.length, o2: o2correRaces.length },
        url: blob.url
      }
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { crawlTvComRunning } from '@/crawlers/tvcomrunning';
import { crawlAtivo } from '@/crawlers/ativo';
import { type Race } from '@/types/races';

export const runtime = 'nodejs';

// Mapeamento dos meses para normalização
const MONTH_MAP: { [key: string]: number } = {
  'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'ABRIL': 3,
  'MAIO': 4, 'JUNHO': 5, 'JULHO': 6, 'AGOSTO': 7,
  'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11,
};

function normalizeDate(rawDate: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentYear = now.getFullYear();

  let day: number | undefined;
  let month: number | undefined;

  rawDate = rawDate.toUpperCase().trim();

  // Padrão: "01 DE JANEIRO DE 2025"
  const fullMatch = rawDate.match(/(\d{1,2})\s+DE\s+([A-ZÇÃÁÉÍÓÚ]+)\s+DE\s+(\d{4})/);
  if (fullMatch) {
    day = Number(fullMatch[1]);
    month = MONTH_MAP[fullMatch[2]];
    return `${fullMatch[3]}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Padrão: "01/01"
  const numericMatch = rawDate.match(/(\d{1,2})[./](\d{1,2})/);
  if (numericMatch) {
    day = Number(numericMatch[1]);
    month = Number(numericMatch[2]) - 1;

    let year = currentYear;

    const maybeDate = new Date(year, month, day);
    if (maybeDate < now) year++;

    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return rawDate;
}

export async function GET(request: Request) {
  try {
    console.log('🔄 [CRON] Iniciando coleta de corridas...');
    const start = Date.now();

    // 1. Executa crawlers
    const [tvComRaces, ativoRaces] = await Promise.all([
      crawlTvComRunning(),
      crawlAtivo(),
    ]);

    const allRaces = [...tvComRaces, ...ativoRaces];

    // 2. Remover duplicatas
    const uniqueRaces = Array.from(new Map(allRaces.map(r => [r.url, r])).values());

    // 3. Normalizar datas
    const normalized = uniqueRaces.map(r => ({
      ...r,
      date: normalizeDate(r.date),
    }));

    // 4. Filtrar futuras
    const today = new Date();
    today.setHours(0,0,0,0);

    const futureRaces = normalized.filter(r => {
      const d = new Date(r.date);
      return !isNaN(d.getTime()) && d >= today;
    });

    // 5. Ordenar (CORRIGIDO)
    const sorted = futureRaces.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // (resto do arquivo continua igual — se quiser mando completo)

  } catch (error) {
    console.error("❌ [CRON] Erro:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

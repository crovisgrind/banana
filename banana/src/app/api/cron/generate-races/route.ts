// app/api/cron/generate-races.ts

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { crawlTvComRunning } from '@/crawlers/tvcomrunning';
import { crawlAtivo } from '@/crawlers/ativo';
import { type Race } from '@/types/races';

export const runtime = 'nodejs';

/**
 * Rota chamada automaticamente pelo Vercel Cron
 * Configuração: vercel.json
 * 
 * Schedule: "0 2 * * 1" = Segunda-feira às 2:00 AM UTC
 */

// Mapeamento dos meses
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
  let year: number | undefined;

  const cleanedString = rawDate.toUpperCase().replace(/\s+/g, ' ');
  const fullDateRegex = /(\d{1,2})\s+DE\s+([A-ZÇÃÁÉÍÓÚ]+)\s+DE\s+(\d{4})/;
  const fullDateMatch = cleanedString.match(fullDateRegex);

  if (fullDateMatch) {
    day = parseInt(fullDateMatch[1], 10);
    const monthName = fullDateMatch[2];
    month = MONTH_MAP[monthName];
    year = parseInt(fullDateMatch[3], 10);
  } else {
    const shortDateRegex = rawDate.match(/(\d{1,2})[./](\d{1,2})/);
    if (shortDateRegex) {
      day = parseInt(shortDateRegex[1], 10);
      month = parseInt(shortDateRegex[2], 10) - 1;
      year = currentYear;
    }
  }

  if (day === undefined || month === undefined || isNaN(day) || isNaN(month) || month < 0 || month > 11) {
    return rawDate;
  }

  let dateObject = new Date(year || currentYear, month, day);

  if ((!year || dateObject < now) && month < now.getMonth()) {
    const targetYear = (year || currentYear) + 1;
    dateObject = new Date(targetYear, month, day);
  }

  if (isNaN(dateObject.getTime())) {
    return rawDate;
  }

  return dateObject.toISOString().split('T')[0];
}

export async function GET(request: Request) {
  try {
    console.log('🏃 [CRON] Iniciando geração de races.json...');
    const startTime = Date.now();

    // 1. Executa crawlers em paralelo
    console.log('[CRON] Executando crawlers...');
    const [tvComRaces, ativoRaces] = await Promise.all([
      crawlTvComRunning(),
      crawlAtivo(),
    ]);

    console.log(`[CRON] TVCom: ${tvComRaces.length} | Ativo: ${ativoRaces.length}`);

    // 2. Combina resultados
    const allRaces = [...tvComRaces, ...ativoRaces];
    console.log(`[CRON] Total antes de dedup: ${allRaces.length}`);

    // 3. Remove duplicatas
    const uniqueRaces = Array.from(
      new Map(allRaces.map((race) => [race.url, race])).values()
    );
    console.log(`[CRON] Total após dedup: ${uniqueRaces.length}`);

    // 4. Normaliza datas
    const normalizedRaces = uniqueRaces.map((race) => ({
      ...race,
      date: normalizeDate(race.date),
    }));

    // 5. Filtra corridas futuras
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureRaces = normalizedRaces.filter((race) => {
      const raceDate = new Date(race.date);
      return raceDate >= today;
    });

    console.log(`[CRON] Total de corridas futuras: ${futureRaces.length}`);

    // 6. Ordena por data
    const sortedRaces = futureRaces.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // 7. Salva JSON
    const dataDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`[CRON] Diretório criado: ${dataDir}`);
    }

    const jsonPath = path.join(dataDir, 'races.json');
    fs.writeFileSync(jsonPath, JSON.stringify(sortedRaces, null, 2), 'utf-8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const fileSize = (fs.statSync(jsonPath).size / 1024).toFixed(2);

    console.log(`✅ [CRON] races.json salvo com sucesso!`);
    console.log(`📊 Total: ${sortedRaces.length} eventos`);
    console.log(`📁 Tamanho: ${fileSize}KB`);
    console.log(`⏱️  Tempo: ${duration}s\n`);

    return NextResponse.json(
      {
        success: true,
        message: 'races.json gerado com sucesso',
        data: {
          totalRaces: sortedRaces.length,
          filePath: jsonPath,
          fileSize: `${fileSize}KB`,
          duration: `${duration}s`,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ [CRON] Erro ao gerar races.json:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
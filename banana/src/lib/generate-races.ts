// src/lib/generate-races.ts

import * as fs from 'fs';
import * as path from 'path';
import { crawlTvComRunning } from '@/crawlers/tvcomrunning';
import { crawlAtivo } from '@/crawlers/ativo';
import { type Race } from '@/types/races';

// Mapeamento dos meses para normalização do formato brasileiro
const MONTH_MAP: { [key: string]: number } = {
  'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'ABRIL': 3,
  'MAIO': 4, 'JUNHO': 5, 'JULHO': 6, 'AGOSTO': 7,
  'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11,
};

function normalizeRace(race: Race): Race {
  const rawDate = race.date;
  if (!rawDate || typeof rawDate !== 'string') {
    return race;
  }

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

  if (
    day === undefined ||
    month === undefined ||
    isNaN(day) ||
    isNaN(month) ||
    month < 0 ||
    month > 11
  ) {
    console.warn(
      `[NORMALIZE] Erro ao normalizar: ${rawDate} para ${race.title}`
    );
    return race;
  }

  let dateObject = new Date(year || currentYear, month, day);

  if ((!year || dateObject < now) && month < now.getMonth()) {
    const targetYear = (year || currentYear) + 1;
    dateObject = new Date(targetYear, month, day);
  }

  if (isNaN(dateObject.getTime())) {
    console.error(`[NORMALIZE] Erro fatal: ${rawDate}`);
    return race;
  }

  return {
    ...race,
    date: dateObject.toISOString().split('T')[0],
  };
}

// -----------------------------------------------------------------
// FUNÇÃO EXPORTADA - Gera e salva JSON
// -----------------------------------------------------------------
export async function generateRacesJSON() {
  console.log('\n🏃 [GENERATE] Iniciando geração de races.json...');
  const startTime = Date.now();

  try {
    // 1. CRAWLERS
    console.log('[GENERATE] Executando crawlers...');
    const [tvComRaces, ativoRaces] = await Promise.all([
      crawlTvComRunning(),
      crawlAtivo(),
    ]);

    console.log(`[GENERATE] TVCom: ${tvComRaces.length} | Ativo: ${ativoRaces.length}`);

    // 2. COMBINAR
    const allRaces = [...tvComRaces, ...ativoRaces];
    console.log(`[GENERATE] Total antes de dedup: ${allRaces.length}`);

    // 3. REMOVER DUPLICATAS
    const uniqueRaces = Array.from(
      new Map(allRaces.map((race) => [race.url, race])).values()
    );
    console.log(`[GENERATE] Total após dedup: ${uniqueRaces.length}`);

    // 4. NORMALIZAR DATAS
    const normalizedRaces = uniqueRaces.map(normalizeRace);

    // 5. FILTRAR FUTURAS
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureRaces = normalizedRaces.filter((race) => {
      const raceDate = new Date(race.date);
      return raceDate >= today;
    });

    console.log(`[GENERATE] Total de corridas futuras: ${futureRaces.length}`);

    // 6. ORDENAR POR DATA
    const sortedRaces = futureRaces.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // 7. SALVAR JSON
    const dataDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`[GENERATE] Diretório criado: ${dataDir}`);
    }

    const jsonPath = path.join(dataDir, 'races.json');
    fs.writeFileSync(jsonPath, JSON.stringify(sortedRaces, null, 2), 'utf-8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const fileSize = (fs.statSync(jsonPath).size / 1024).toFixed(2);

    console.log(`✅ [GENERATE] Sucesso! races.json salvo em ${fileSize}KB`);
    console.log(`⏱️  [GENERATE] Tempo total: ${duration}s`);
    console.log(`📅 [GENERATE] Próxima execução: próxima semana\n`);

    return {
      success: true,
      totalRaces: sortedRaces.length,
      filePath: jsonPath,
      duration: `${duration}s`,
    };
  } catch (error) {
    console.error('[GENERATE] ❌ Erro ao gerar races.json:', error);
    throw error;
  }
}
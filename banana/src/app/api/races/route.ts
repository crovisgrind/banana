// app/api/cron/generate-races/route.ts

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Importa os crawlers
import { crawlTvComRunning } from '@/crawlers/tvcomrunning';
import { crawlAtivo } from '@/crawlers/ativo';
import { type Race } from '@/types/races';

// ✅ Importa função para salvar no KV
import { saveRacesToKV } from '@/lib/storage';

// ✅ Tipos necessários para normalização
const MONTH_MAP: { [key: string]: number } = {
  'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'ABRIL': 3,
  'MAIO': 4, 'JUNHO': 5, 'JULHO': 6, 'AGOSTO': 7,
  'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11,
};

const MONTH_ABBR_MAP: { [key: string]: string } = {
  'JAN': 'JANEIRO', 'FEV': 'FEVEREIRO', 'MAR': 'MARÇO', 'ABR': 'ABRIL',
  'MAI': 'MAIO', 'JUN': 'JUNHO', 'JUL': 'JULHO', 'AGO': 'AGOSTO',
  'SET': 'SETEMBRO', 'OUT': 'OUTUBRO', 'NOV': 'NOVEMBRO', 'DEZ': 'DEZEMBRO',
};

// ✅ Função de normalização (copiada de generate-races.ts)
function normalizeRace(race: any) {
  let rawDate = race.date;
  if (!rawDate || typeof rawDate !== 'string') return race;
  
  console.log(`[NORMALIZE] Data bruta: "${rawDate}"`);
  rawDate = rawDate.toUpperCase();
  
  // Converter meses abreviados
  for (const [abbr, full] of Object.entries(MONTH_ABBR_MAP)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    if (rawDate.includes(abbr)) {
      console.log(`[NORMALIZE]   Convertendo ${abbr} → ${full}`);
    }
    rawDate = rawDate.replace(regex, full);
  }
  
  console.log(`[NORMALIZE] Data após conversão: "${rawDate}"`);
  
  const currentYear = new Date().getFullYear();
  
  let day: number | undefined;
  let month: number | undefined;
  let year: number | undefined;

  const cleanedString = rawDate.replace(/\s+/g, ' ');
  
  // Tenta: "01 DE JANEIRO DE 2025"
  const fullDateRegex = /(\d{1,2})\s+DE\s+([A-ZÇÃÁÉÍÓÚ]+)\s+DE\s+(\d{4})/;
  const fullDateMatch = cleanedString.match(fullDateRegex);

  if (fullDateMatch) {
    day = parseInt(fullDateMatch[1], 10);
    const monthName = fullDateMatch[2];
    month = MONTH_MAP[monthName];
    year = parseInt(fullDateMatch[3], 10);
    console.log(`[NORMALIZE]   ✅ Formato completo: Dia=${day}, Mês=${monthName}(${month + 1}), Ano=${year}`);
  } else {
    // Tenta: "01 DE JANEIRO" (sem ano)
    const shortFullRegex = /(\d{1,2})\s+DE\s+([A-ZÇÃÁÉÍÓÚ]+)$/;
    const shortFullMatch = cleanedString.match(shortFullRegex);
    
    if (shortFullMatch) {
      day = parseInt(shortFullMatch[1], 10);
      const monthName = shortFullMatch[2];
      month = MONTH_MAP[monthName];
      year = undefined;
      console.log(`[NORMALIZE]   ✅ Formato curto: Dia=${day}, Mês=${monthName}(${month + 1}), Ano=indefinido`);
    } else {
      // Tenta: "01/01" ou "01.01"
      const shortDateRegex = rawDate.match(/(\d{1,2})[./](\d{1,2})/);
      if (shortDateRegex) {
        day = parseInt(shortDateRegex[1], 10);
        month = parseInt(shortDateRegex[2], 10) - 1;
        year = undefined;
        console.log(`[NORMALIZE]   ✅ Formato numeral: Dia=${day}, Mês=${month + 1}, Ano=indefinido`);
      }
    }
  }

  if (day === undefined || month === undefined || isNaN(day) || isNaN(month) || month < 0 || month > 11) {
    console.warn(`⚠️ [NORMALIZE] Erro ao normalizar: ${race.date}\n`);
    return race;
  }

  if (year === undefined) {
    year = currentYear;
    console.log(`[NORMALIZE]   Usando ano atual: ${year}`);
  }

  // Verificar se data passou
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Se data passou e é do mesmo ano, avança pro próximo ano
  const testDate = new Date(year, month, day);
  if (testDate < today && year === currentYear) {
    year = year + 1;
    console.log(`[NORMALIZE]   Ajustado para próximo ano: ${year}`);
  }

  // Converter para string ISO
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const dateOnly = `${year}-${monthStr}-${dayStr}`;
  
  console.log(`[NORMALIZE] ✅ Data final: ${dateOnly}\n`);

  return {
    ...race,
    date: dateOnly,
  };
}

// ✅ Rota do cron
export async function GET(request: Request) {
  try {
    console.log('\n🚀 ========== INICIANDO CRON GENERATE-RACES ==========');
    console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);

    // Executar crawlers em paralelo
    console.log('\n📡 Executando crawlers em paralelo...');
    const start = Date.now();
    
    const [tvComRaces, ativoRaces] = await Promise.all([
      crawlTvComRunning(),
      crawlAtivo(),
    ]);
    
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n✅ Resultado dos Crawlers (${duration}s):`);
    console.log(`   - TVCom: ${tvComRaces.length} eventos`);
    console.log(`   - Ativo: ${ativoRaces.length} eventos`);
    console.log(`   - Total bruto: ${tvComRaces.length + ativoRaces.length} eventos\n`);
    
    // Combinar
    const allRaces = [...tvComRaces, ...ativoRaces];
    
    // Remover duplicatas
    const uniqueRaces = Array.from(
      new Map(allRaces.map((race) => [race.url, race])).values()
    );
    console.log(`📄 Após remover duplicatas: ${uniqueRaces.length} eventos\n`);
    
    // Normalizar datas
    console.log(`⏳ Normalizando ${uniqueRaces.length} datas...\n`);
    const normalizedRaces = uniqueRaces.map(normalizeRace);
    console.log(`✅ Datas normalizadas\n`);
    
    // Filtrar futuras
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureRaces = normalizedRaces.filter((race) => {
      const raceDate = new Date(race.date);
      return raceDate >= today;
    });
    
    console.log(`🔮 Corridas futuras: ${futureRaces.length} eventos\n`);
    
    // Ordenar por data
    futureRaces.sort((a, b) => a.date.localeCompare(b.date));
    
    // ✅ SALVAR NO VERCEL KV (IMPORTANTE!)
    console.log('💾 Salvando no Vercel KV...');
    await saveRacesToKV(futureRaces);
    console.log(`✅ ${futureRaces.length} corridas salvas no KV!\n`);
    
    // Também salvar localmente em /tmp para backup (Vercel permite isso)
    try {
      const tmpDir = '/tmp/races-data';
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      
      const tmpPath = path.join(tmpDir, 'races.json');
      fs.writeFileSync(tmpPath, JSON.stringify(futureRaces, null, 2), 'utf-8');
      console.log(`📦 Backup salvo em: ${tmpPath}`);
    } catch (tmpError) {
      console.warn('⚠️ Não foi possível salvar backup em /tmp (isso é normal)', tmpError);
    }
    
    if (futureRaces.length > 0) {
      console.log('\n📌 Primeiras 5 corridas:');
      futureRaces.slice(0, 5).forEach((race, i) => {
        console.log(`   ${i + 1}. ${race.title} (${race.date}) - ${race.location}`);
      });
    }
    
    console.log('\n✅ ========== CRON FINALIZADO COM SUCESSO ==========\n');

    return NextResponse.json({
      success: true,
      message: 'Crawler executado com sucesso',
      stats: {
        tvcom: tvComRaces.length,
        ativo: ativoRaces.length,
        total: futureRaces.length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('\n❌ ========== ERRO NO CRON ==========');
    console.error('Erro:', error);
    console.error('========== FIM DO ERRO ==========\n');

    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao executar crawler',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

export const revalidate = 0;
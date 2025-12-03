// app/api/races/route.ts

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import crawlTvComRunning from '@/crawlers/tvcomrunning';
import { type Race } from '@/types/races'; 


// -----------------------------------------------------------------
// ESTRUTURA GLOBAL DE CACHE
// -----------------------------------------------------------------
interface CacheEntry {
    data: Race[];
    timestamp: number;
}

let dataCache: CacheEntry | null = null;
const CACHE_DURATION_MS = 1000 * 60 * 60 * 24; // 24 horas

// Mapeamento dos meses para normalização do formato brasileiro
const MONTH_MAP: { [key: string]: number } = {
    'JANEIRO': 0,
    'FEVEREIRO': 1,
    'MARÇO': 2,
    'ABRIL': 3,
    'MAIO': 4,
    'JUNHO': 5,
    'JULHO': 6,
    'AGOSTO': 7,
    'SETEMBRO': 8,
    'OUTUBRO': 9,
    'NOVEMBRO': 10,
    'DEZEMBRO': 11,
};

function normalizeRace(race: Race): Race {
    const rawDate = race.date; 
    if (!rawDate || typeof rawDate !== 'string') { return race; }
      
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    const currentYear = now.getFullYear();
    
    let day: number | undefined;
    let month: number | undefined; // Mês baseado em 0 (Janeiro = 0, Dezembro = 11)
    let year: number | undefined;

    // --- CAMINHO 1: FORMATO BRASILEIRO COMPLETO (TVCom Running) ---
    // Ex: "05 DE DEZEMBRO DE 2025"
    const cleanedString = rawDate.toUpperCase().replace(/\s+/g, ' ');
    const fullDateRegex = /(\d{1,2})\s+DE\s+([A-ZÇ]+)\s+DE\s+(\d{4})/;
    const fullDateMatch = cleanedString.match(fullDateRegex);

    if (fullDateMatch) {
        day = parseInt(fullDateMatch[1], 10);
        const monthName = fullDateMatch[2];
        month = MONTH_MAP[monthName];
        year = parseInt(fullDateMatch[3], 10);

    } else {
        // --- CAMINHO 2: FORMATO ABREVIADO (DD/MM ou DD.MM) ---
        // Ex: "20/03"
        const shortDateRegex = rawDate.match(/(\d{1,2})[./](\d{1,2})/); 
        if (shortDateRegex) {
            day = parseInt(shortDateRegex[1], 10);
            // O mês no formato curto é baseado em 1, então subtraímos 1.
            month = parseInt(shortDateRegex[2], 10) - 1; 
            year = currentYear;
        }
    }

    // Se não conseguimos extrair Dia, Mês ou Ano, alertamos e pulamos.
    if (day === undefined || month === undefined || isNaN(day) || isNaN(month) || month < 0 || month > 11) {
        console.warn(`Erro ao normalizar data: Formato inesperado. Valor: ${rawDate} para ${race.title}.`);
        return race;
    }

    // 1. Tenta usar o ano extraído (se disponível) ou o ano atual.
    let dateObject = new Date(year || currentYear, month, day);

    // 2. Se a data for no passado ou se estivermos usando o ano atual para o formato DD/MM.
    // E se o mês da corrida for anterior ao mês atual, avança o ano.
    // Isso resolve o problema de corridas de Dezembro/2025 que aparecem em Janeiro/2026.
    if ((!year || dateObject < now) && month < now.getMonth()) {
        const targetYear = (year || currentYear) + 1;
        dateObject = new Date(targetYear, month, day);
    }

    // 3. Verificação de Sanidade
    if (isNaN(dateObject.getTime())) {
      console.error(`Erro fatal: Data não pôde ser normalizada. Valor: ${rawDate}`);
      return race; 
    }

    return {
      ...race,
      // Retorna a data no formato ISO padrão (AAAA-MM-DD)
      date: dateObject.toISOString().split('T')[0],
    };
}

// -----------------------------------------------------------------
// FUNÇÃO PRINCIPAL DA ROTA: EXPORT NOMEADO (NUNCA DEFAULT!)
// -----------------------------------------------------------------
// 🚨 CORREÇÃO: Removida a palavra 'default'
// 🚨 MODIFICADO PARA DIAGNÓSTICO
export async function GET(request: Request) { 
  try {
    console.log(">>>> [DIAGNÓSTICO] API /api/races INICIADA."); // <--- NOVO LOG DE DIAGNÓSTICO

    const now = Date.now();
    
    // 1. VERIFICAÇÃO DO CACHE
    if (dataCache && now - dataCache.timestamp < CACHE_DURATION_MS) {
        const remainingMinutes = Math.round((dataCache.timestamp + CACHE_DURATION_MS - now) / 60000);
        console.log(`[CACHE HIT] Retornando dados do cache. Tempo de vida restante: ${remainingMinutes} minutos.`);
        return NextResponse.json(dataCache.data);
    }
    
    // 2. CACHE MISS
    console.log("Iniciando pipeline de crawl & normalize (CACHE MISS)...");
    
    // Chamada do Crawler Sequencial (com delay de 5s)
    const rawRaces = await crawlTvComRunning();

    const normalizedRaces = rawRaces.map(normalizeRace);

    console.log(`Pipeline concluída. ${normalizedRaces.length} eventos prontos.`);

    // 3. ATUALIZAÇÃO DO CACHE
    dataCache = {
        data: normalizedRaces,
        timestamp: now,
    };
    
    return NextResponse.json(normalizedRaces);

  } catch (error) {
    console.error("Erro na rota /api/races:", error);

    // Retorna cache expirado como fallback
    if (dataCache) {
         console.warn("Erro no scraping. Retornando cache expirado como fallback.");
         return NextResponse.json(dataCache.data, { 
             status: 200 
         });
    }

    return new Response(JSON.stringify({ 
        message: "Erro ao processar as corridas", 
        details: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
        status: 500,
        headers: {
            'Content-Type': 'application/json',
        },
    });
  }
}
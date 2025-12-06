// scripts/generate-races.ts
// Roda LOCALMENTE com ambos os crawlers e salva no Vercel Blob


import { crawlTvComRunning } from '../src/crawlers/tvcomrunning.ts'; 
import { crawlAtivo } from '../src/crawlers/ativo.ts'; 
import type { Race } from '../src/types/races.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

// ✅ Carrega .env.local
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const MONTH_MAP: { [key: string]: number } = {
  'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'ABRIL': 3,
  'MAIO': 4, 'JUNHO': 5, 'JULHO': 6, 'AGOSTO': 7,
  'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11,
};

// 🌟 NOVO MAPA: Abreviaturas usadas pelo Crawler Ativo
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

  // 1. Formato COMPLETO: "01 DE JANEIRO DE 2025" (TVCom)
  // Regex ajustada para letras e cedilha
  const full = rawDate.match(/(\d{1,2})\s+DE\s+([A-ZÇÃÕÉÊÁÂÚÍÓÔ\s]+)\s+DE\s+(\d{4})/);
  if (full) {
    const day = Number(full[1]);
    const month = MONTH_MAP[full[2].trim()]; 
    const year = Number(full[3]);
    if (month !== undefined) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

    // 2. NOVO FORMATO AJUSTADO: "X DE MÊS CURTO" (Ex: "7 DE DEZ", "13 DE NOV")
    const shortMonth = rawDate.match(/(\d{1,2})\s+DE\s+([A-ZÇÃÕÉÊÁÂÚÍÓÔ]{3,})/);
    if (shortMonth) {
        const day = Number(shortMonth[1]);
        const monthKey = shortMonth[2].substring(0, 3); // Pega a abreviação (DEZ, NOV, ABR, etc.)

        const month = MONTH_ABBREVIATION_MAP[monthKey];
        
        if (month !== undefined) {
            let year = currentYear;
            const d = new Date(year, month, day);

            // Verificação de validação: Se a data não for resolvida ou cair em um dia inválido,
            // ou se for a mesma data do ano, mas no passado, ajusta o ano
            if (d < now) {
                year++; // Move para o próximo ano
            }
            
            // Refaz a data com o ano correto para garantir que o mês e o dia sejam válidos (e evita 
            // problemas como '29 FEV' em anos não bissextos)
            const finalDate = new Date(year, month, day);

            // Se o parsing de data (dia/mês) for inválido (e.g. dia 32), retorna rawDate para descarte.
            if (isNaN(finalDate.getTime())) {
                return rawDate;
            }

            return `${year}-${String(finalDate.getMonth() + 1).padStart(2, '0')}-${String(finalDate.getDate()).padStart(2, '0')}`;
        }
    }


  // 3. Formato NUMÉRICO: "01/01"
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

async function generateRaces() {
  console.log('\n🚀 ===== GERADOR DE CORRIDAS (LOCAL) =====\n');
  const start = Date.now();

  try {
    // 1. Executa crawlers
    console.log('📡 Executando crawlers...\n');
    const [tvComRaces, ativoRaces] = await Promise.all([
      crawlTvComRunning(),
      crawlAtivo(),
    ]);

    console.log(`\n✅ TVCom: ${tvComRaces.length} eventos`);
    console.log(`✅ Ativo: ${ativoRaces.length} eventos\n`);

    // 2. Unifica
    const all = [...tvComRaces, ...ativoRaces];
    console.log(`📊 Total: ${all.length} eventos\n`);

    // 3. Dedup
    const unique = Array.from(new Map(all.map(r => [r.url, r])).values());
    console.log(`🔄 Após remover duplicatas: ${unique.length} eventos\n`);

    // 4. Normaliza datas
    const normalized = unique.map(r => ({
      ...r,
      date: normalizeDate(r.date),
    }));

    // 🔎 DIAGNÓSTICO: Quais eventos falharam na conversão de data?
    const invalid = normalized.filter(r => {
      const d = new Date(r.date);
      // Data Inválida (Invalid Date) é a principal razão pela qual corridas são perdidas.
      return isNaN(d.getTime()); 
    });

    if (invalid.length > 0) {
      console.log(`\n🔴 DIAGNÓSTICO: ${invalid.length} eventos tinham data inválida e foram descartados ANTES DO FILTRO DE DATA FUTURA:`);
      invalid.forEach(r => {
        console.log(`   - Data Crua: "${r.date}" - Título: ${r.title.substring(0, 40)}...`);
      });
      console.log('--------------------------------------------------');
    }
    // FIM DO DIAGNÓSTICO

    // 5. Filtra futuras
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const future = normalized.filter(r => {
      const d = new Date(r.date);
      return !isNaN(d.getTime()) && d >= today;
    });

    console.log(`📅 Corridas futuras: ${future.length}\n`);

    // 6. Ordena por data
    const sorted = future.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // 7. Salva localmente em JSON
    const outputDir = path.join(process.cwd(), 'public');
    const outputPath = path.join(outputDir, 'races.json');

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(sorted, null, 2));

    console.log(`💾 Arquivo salvo localmente em: ${outputPath}\n`);

    // 8. Tenta salvar no Vercel Blob
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (blobToken) {
      console.log('📤 Enviando para Vercel Blob...');
      const { put } = await import('@vercel/blob');
      const jsonContent = JSON.stringify(sorted, null, 2);
      const blob = await put('races/races.json', jsonContent, {
        access: 'public',
        contentType: 'application/json',
        allowOverwrite: true,
        token: blobToken,
      });

      console.log(`✅ Blob salvo em: ${blob.url}\n`);
    } else {
      console.log('⚠️  BLOB_READ_WRITE_TOKEN não configurada');
      console.log('   Arquivo salvo apenas localmente em public/races.json\n');
      console.log('📋 Para configurar Vercel Blob:');
      console.log('   1. Vá para: https://vercel.com/dashboard');
      console.log('   2. Settings → Environment Variables');
      console.log('   3. Cole seu BLOB_READ_WRITE_TOKEN\n');
    }

    // 9. Log das primeiras corridas
    console.log('📋 Primeiras 5 corridas:\n');
    sorted.slice(0, 5).forEach((race, i) => {
      console.log(`${i + 1}. ${race.title}`);
      console.log(`   📍 ${race.location} (${race.state})`);
      console.log(`   📅 ${race.date}`);
      console.log(`   🏃 ${race.distances.join(', ') || 'N/A'}\n`);
    });

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`✅ Geração completa em ${duration}s`);
    console.log(`📊 Total de corridas: ${sorted.length}\n`);

  } catch (error) {
    console.error('❌ ERRO:', error instanceof Error ? error.message : String(error));
    console.error(error);
    process.exit(1);
  }
}

generateRaces();
// src/crawlers/ativo.ts

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { type Race } from '@/types/races';

const CALENDAR_URL = "https://www.ativo.com/calendario/";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function parseDistances(distancesRaw: string): string[] {
  if (!distancesRaw || distancesRaw === '#' || distancesRaw === '') return [];
  
  return distancesRaw
    .split(/[,/]/)
    .map(d => d.trim().toUpperCase()
      .replace(/KM$/, 'K')
      .replace('K ', 'K')
      .replace(/MEIA[\s-]?MARATONA/, '21.1K')
      .replace(/MARATONA/, '42.2K')
    )
    .filter(d => d.length > 0 && d !== '#')
    .filter((d, i, arr) => arr.indexOf(d) === i);
}

function extractState(location: string): string {
  if (!location || location === '#') return 'ND';
  const stateRegex = /\(([A-Z]{2})\)$|[\s-]([A-Z]{2})$/;
  const match = location.match(stateRegex);
  return match ? (match[1] || match[2]) : 'ND';
}

// ✅ MESES ABREVIADOS EM PT
const MONTH_ABBR_MAP: { [key: string]: string } = {
  'JAN': 'JANEIRO',
  'FEV': 'FEVEREIRO',
  'MAR': 'MARÇO',
  'ABR': 'ABRIL',
  'MAI': 'MAIO',
  'JUN': 'JUNHO',
  'JUL': 'JULHO',
  'AGO': 'AGOSTO',
  'SET': 'SETEMBRO',
  'OUT': 'OUTUBRO',
  'NOV': 'NOVEMBRO',
  'DEZ': 'DEZEMBRO',
};

export async function crawlAtivo(): Promise<Race[]> {
  console.log("Iniciando crawl no Ativo.com Calendar (Puppeteer)...");
  const start = Date.now();
  const allRaces: Race[] = [];

  try {
    // ⏳ DELAY RESPEITOSO ANTES DE FAZER REQUISIÇÃO
    console.log("[ATIVO] Aguardando 3 segundos antes de fazer requisição...");
    await delay(3000);

    // Importa puppeteer dinamicamente
    console.log("[ATIVO] Importando puppeteer...");
    let puppeteer;
    try {
      puppeteer = await import('puppeteer');
      console.log("[ATIVO] ✅ Puppeteer importado com sucesso");
    } catch (importError) {
      console.error("[ATIVO] ❌ Erro ao importar puppeteer:", importError);
      console.log("[ATIVO] Dica: Execute 'npm install puppeteer' se ainda não fez");
      return [];
    }
    
    console.log("[ATIVO] Iniciando navegador Chromium...");
    let browser;
    try {
      browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      });
      console.log("[ATIVO] ✅ Navegador iniciado");
    } catch (launchError) {
      console.error("[ATIVO] ❌ Erro ao iniciar navegador:", launchError);
      return [];
    }

    const page = await browser.newPage();
    console.log("[ATIVO] ✅ Nova página criada");
    
    // Define User-Agent realista
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    console.log("[ATIVO] Navegando para página...");
    try {
      await page.goto(CALENDAR_URL, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      console.log("[ATIVO] ✅ Página carregada");
    } catch (gotoError) {
      console.error("[ATIVO] ❌ Erro ao navegar:", gotoError);
      await browser.close();
      return [];
    }

    // ⏳ AGUARDA MAIS UM POUCO PARA JS CARREGAR COMPLETAMENTE
    console.log("[ATIVO] Aguardando 2 segundos para JS carregar...");
    await delay(2000);

    // Espera os cards carregarem
    console.log("[ATIVO] Aguardando cards...");
    try {
      await page.waitForSelector('article.card.card-event', { timeout: 5000 });
      console.log("[ATIVO] ✅ Cards encontrados");
    } catch (waitError) {
      console.warn("[ATIVO] ⚠️  Timeout aguardando cards, continuando mesmo assim...");
    }

    // Extrai HTML após JS executar
    console.log("[ATIVO] Extraindo HTML da página...");
    const html = await page.content();
    await browser.close();
    console.log("[ATIVO] ✅ Navegador fechado");

    // Parse com cheerio
    const $ = cheerio.load(html);
    const cards = $('article.card.card-event');
    console.log(`[ATIVO] Cards encontrados: ${cards.length}`);

    if (cards.length === 0) {
      console.warn("[ATIVO] ⚠️  Nenhum card encontrado com seletor 'article.card.card-event'");
      console.log("[ATIVO] 🔍 Salvando HTML para debug...");
      
      // Salva HTML para análise
      const debugPath = path.join(process.cwd(), 'ativo-debug.html');
      fs.writeFileSync(debugPath, html, 'utf-8');
      console.log(`[ATIVO] 📄 HTML salvo em: ${debugPath}`);
      
      return [];
    }

    let processedCount = 0;
    cards.each((i, element) => {
      try {
        const $card = $(element);

        const $linkElement = $card.find('a.card-cover');
        const title = $card.find('h3.title, h3.title-fixed-height').text().trim();
        const dayElement = $card.find('span.date-square-day').text().trim();
        const monthElement = $card.find('span.date-square-month').text().trim();
        const locationRaw = $card.find('span.place-input').text().trim();
        const distancesText = $card.find('span.distances').text().trim();
        let fullUrl = $linkElement.attr('href') || '';

        // 🔍 DEBUG: Log dos primeiros 5 cards
        if (i < 5) {
          console.log(`\n[ATIVO DEBUG ${i}]`);
          console.log(`  Título: "${title}"`);
          console.log(`  Dia: "${dayElement}"`);
          console.log(`  Mês: "${monthElement}"`);
          console.log(`  Local: "${locationRaw}"`);
          console.log(`  Distâncias: "${distancesText}"`);
          console.log(`  URL: "${fullUrl}"`);
        }

        // Validações rigorosas
        if (!title || title === 'Imagem Evento' || title.includes('#')) return;
        if (!dayElement || isNaN(parseInt(dayElement))) return;
        if (!fullUrl || fullUrl === '#') return;

        const dateRaw = `${dayElement} DE ${monthElement.toUpperCase()}`;
        const distances = parseDistances(distancesText);
        const state = extractState(locationRaw);
        const location = locationRaw.replace(/\([A-Z]{2}\)/, '').replace(/[\s-][A-Z]{2}$/, '').trim();

        if (!state || state === 'ND') return;

        const typeTag = $card.find('span.tag').text().trim().toLowerCase();
        const type: 'road' | 'trail' = typeTag.includes('trilha') || typeTag.includes('mountain') ? 'trail' : 'road';

        const id = `ativo-${title.replace(/\s/g, '_')}-${dayElement}-${monthElement}`;

        const newRace: Race = {
          id: id,
          title: title,
          location: location,
          date: dateRaw, // ✅ Será normalizado depois com meses abreviados suportados
          distances: distances,
          type: type,
          url: fullUrl,
          state: state,
        };

        if (processedCount < 3) {
          console.log(`[ATIVO] ✅ Encontrada: ${newRace.title} - ${newRace.location}`);
        }

        allRaces.push(newRace);
        processedCount++;

      } catch (cardError) {
        console.error(`[ATIVO] Erro no card ${i}:`, cardError);
      }
    });

  } catch (error) {
    console.error("[ATIVO] ❌ Erro:", error);
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`[Crawler Ativo] Completo em ${duration}s. ${allRaces.length} eventos encontrados.\n`);

  return allRaces;
}
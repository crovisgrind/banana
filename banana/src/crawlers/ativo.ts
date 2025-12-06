// src/crawlers/ativo.ts
import * as cheerio from 'cheerio';
import { type Race } from '@/types/races';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

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
  
  if (match) {
    return (match[1] || match[2]) as string;
  }

  return 'ND';
}

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
  console.log("🚀 [ATIVO] Iniciando crawl...");
  const start = Date.now();
  const allRaces: Race[] = [];
  let browser;

  try {
    // DELAY RESPEITOSO
    console.log("[ATIVO] ⏳ Aguardando 3 segundos...");
    await delay(3000);
    
    // ✅ CRÍTICO: Verifica se estamos em ambiente serverless
    const isVercel = !!process.env.VERCEL;
    console.log(`[ATIVO] Environment: ${isVercel ? 'VERCEL (Serverless)' : 'LOCAL'}`);
    
    console.log("[ATIVO] 🌐 Iniciando navegador...");
    
    // ✅ CORRIGIDO: Configuração melhorada para Vercel
    let launchConfig: any = {
      headless: true,
      defaultViewport: { width: 1280, height: 720 },
    };

    if (isVercel) {
      // Em Vercel, SEMPRE use chromium
      launchConfig = {
        ...launchConfig,
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
        executablePath: await chromium.executablePath(),
      };
    } else {
      // Localmente, use o Chromium se disponível, senão Chrome
      launchConfig = {
        ...launchConfig,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };
    }

    browser = await puppeteer.launch(launchConfig);
    console.log("[ATIVO] ✅ Navegador iniciado");

    const page = await browser.newPage();
    console.log("[ATIVO] ✅ Página criada");
    
    // User-Agent realista
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // ✅ TIMEOUT aumentado para Vercel
    console.log("[ATIVO] 🔗 Navegando...");
    try {
      await page.goto(CALENDAR_URL, { 
        waitUntil: 'networkidle2', 
        timeout: 45000 // Aumentado de 30s para 45s
      });
      console.log("[ATIVO] ✅ Página carregada");
    } catch (navError) {
      console.error("[ATIVO] ❌ Erro ao navegar:", navError instanceof Error ? navError.message : String(navError));
      return [];
    }

    // AGUARDA JS executar
    console.log("[ATIVO] ⏳ Aguardando 3 segundos para JS...");
    await delay(3000);

    // Aguarda cards
    console.log("[ATIVO] 🔎 Aguardando cards...");
    try {
      await page.waitForSelector('article.card.card-event', { timeout: 10000 });
      console.log("[ATIVO] ✅ Cards encontrados");
    } catch (waitError) {
      console.warn("[ATIVO] ⚠️  Timeout aguardando cards, continuando...");
    }

    // Extrai conteúdo
    console.log("[ATIVO] 📄 Extraindo HTML...");
    const html = await page.content();
    console.log("[ATIVO] ✅ HTML extraído");

    // Parse com cheerio
    const $ = cheerio.load(html);
    const cards = $('article.card.card-event');
    console.log(`[ATIVO] 📊 ${cards.length} cards encontrados`);

    if (cards.length === 0) {
      console.warn("[ATIVO] ⚠️  Nenhum card encontrado");
      return [];
    }

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

        // Validações
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
          date: dateRaw,
          distances: distances,
          type: type,
          url: fullUrl,
          state: state,
        };

        allRaces.push(newRace);

      } catch (cardError) {
        console.error(`[ATIVO] ❌ Erro no card ${i}:`, cardError instanceof Error ? cardError.message : String(cardError));
      }
    });

    return allRaces;

  } catch (error) {
    console.error("[ATIVO] ❌ Erro inesperado:", error instanceof Error ? error.message : String(error));
    return [];
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("[ATIVO] ✅ Navegador fechado");
      } catch (closeError) {
        console.error("[ATIVO] ⚠️  Erro ao fechar navegador:", closeError);
      }
    }
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[ATIVO] ⏱️  Completo em ${duration}s. ${allRaces.length} eventos.\n`);
  }
}
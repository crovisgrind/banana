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
    console.log("[ATIVO] ⏳ Aguardando 2 segundos...");
    await delay(2000);
    
    const isVercel = !!process.env.VERCEL;
    console.log(`[ATIVO] Environment: ${isVercel ? 'VERCEL (Serverless)' : 'LOCAL'}`);
    
    console.log("[ATIVO] 🌐 Iniciando navegador...");
    
    let launchConfig: any = {
      headless: true,
      defaultViewport: { width: 1280, height: 720 },
    };

    if (isVercel) {
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
      launchConfig = {
        ...launchConfig,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };
    }

    browser = await puppeteer.launch(launchConfig);
    console.log("[ATIVO] ✅ Navegador iniciado");

    const page = await browser.newPage();
    console.log("[ATIVO] ✅ Página criada");
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    console.log("[ATIVO] 🔗 Navegando...");
    try {
      await page.goto(CALENDAR_URL, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 // AUMENTADO para 60s
      });
      console.log("[ATIVO] ✅ Página carregada");
    } catch (navError) {
      console.error("[ATIVO] ❌ Erro ao navegar:", navError instanceof Error ? navError.message : String(navError));
      return [];
    }

    // ✅ NOVO: Aguarda múltiplos seletores possíveis
    console.log("[ATIVO] 🔎 Aguardando eventos...");
    try {
      // Tenta esperar por qualquer um desses seletores
      await Promise.race([
        page.waitForSelector('article.card.card-event', { timeout: 15000 }).catch(() => null),
        page.waitForSelector('[class*="card"][class*="event"]', { timeout: 15000 }).catch(() => null),
        page.waitForSelector('div[class*="evento"]', { timeout: 15000 }).catch(() => null),
      ]);
      console.log("[ATIVO] ✅ Eventos detectados");
    } catch (waitError) {
      console.warn("[ATIVO] ⚠️  Timeout aguardando eventos, continuando mesmo assim...");
    }

    // ✅ AGUARDA MAIS PARA JS FINALIZAR
    console.log("[ATIVO] ⏳ Aguardando 5 segundos para JS renderizar completamente...");
    await delay(5000);

    // Extrai conteúdo
    console.log("[ATIVO] 📄 Extraindo HTML...");
    const html = await page.content();
    console.log("[ATIVO] ✅ HTML extraído");

    // Parse com cheerio
    const $ = cheerio.load(html);
    
    // ✅ NOVO: Tenta múltiplos seletores
    let cards = $('article.card.card-event');
    console.log(`[ATIVO] 🔍 Tentativa 1 - Cards encontrados: ${cards.length}`);
    
    if (cards.length === 0) {
      cards = $('[class*="card"][class*="event"]');
      console.log(`[ATIVO] 🔍 Tentativa 2 - Cards encontrados: ${cards.length}`);
    }
    
    if (cards.length === 0) {
      cards = $('div.col-xl-4, div.col-lg-4, div.col-md-6');
      console.log(`[ATIVO] 🔍 Tentativa 3 - Cards encontrados: ${cards.length}`);
    }

    if (cards.length === 0) {
      console.warn("[ATIVO] ⚠️  Nenhum card encontrado com seletores padrão");
      // LOG do HTML para debugar
      const htmlSnippet = html.substring(0, 2000);
      console.log("[ATIVO] 📋 HTML Preview:", htmlSnippet);
      return [];
    }

    console.log(`[ATIVO] 📊 ${cards.length} cards para processar`);

    cards.each((i, element) => {
      try {
        const $card = $(element);
        
        // ✅ Múltiplas tentativas de extração
        const $linkElement = $card.find('a.card-cover, a[href*="/calendario"]').first();
        const title = $card.find('h3.title, h3.title-fixed-height, h3, [class*="title"]').first().text().trim();
        const dayElement = $card.find('span.date-square-day, [class*="day"]').first().text().trim();
        const monthElement = $card.find('span.date-square-month, [class*="month"]').first().text().trim();
        const locationRaw = $card.find('span.place-input, [class*="location"], [class*="place"]').first().text().trim();
        const distancesText = $card.find('span.distances, [class*="distance"]').first().text().trim();
        let fullUrl = $linkElement.attr('href') || '';

        // Validações
        if (!title || title === 'Imagem Evento' || title.includes('#') || title.length < 3) {
          if (i < 3) console.log(`[ATIVO] ⏭️  Card ${i} ignorado - título inválido: "${title}"`);
          return;
        }
        
        if (!dayElement || isNaN(parseInt(dayElement))) {
          if (i < 3) console.log(`[ATIVO] ⏭️  Card ${i} ignorado - dia inválido: "${dayElement}"`);
          return;
        }
        
        if (!fullUrl || fullUrl === '#') {
          if (i < 3) console.log(`[ATIVO] ⏭️  Card ${i} ignorado - URL inválida: "${fullUrl}"`);
          return;
        }

        // Garante URL completa
        if (fullUrl.startsWith('/')) {
          fullUrl = 'https://www.ativo.com' + fullUrl;
        }

        const dateRaw = `${dayElement} DE ${monthElement.toUpperCase()}`;
        const distances = parseDistances(distancesText);
        const state = extractState(locationRaw);
        const location = locationRaw.replace(/\([A-Z]{2}\)/, '').replace(/[\s-][A-Z]{2}$/, '').trim();

        if (!state || state === 'ND') {
          if (i < 3) console.log(`[ATIVO] ⏭️  Card ${i} ignorado - estado inválido`);
          return;
        }

        const typeTag = $card.find('span.tag, [class*="tag"]').first().text().trim().toLowerCase();
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

        console.log(`[ATIVO] ✅ Card ${i}: ${title} - ${state}`);
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
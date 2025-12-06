// src/crawlers/ativo.ts

import * as cheerio from 'cheerio';
import { type Race } from '@/types/races';

// ✅ Importações para ambiente Serverless
import puppeteer from 'puppeteer-core';

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
  let browser;

  try { 
    // ⏳ DELAY RESPEITOSO ANTES DE FAZER REQUISIÇÃO
    console.log("[ATIVO] Aguardando 3 segundos antes de fazer requisição...");
    await delay(3000);
    
    console.log("[ATIVO] Iniciando navegador Chromium compatível com Vercel...");
    
    
    try {
      const isVercel = !!process.env.VERCEL;
      
      let launchConfig: any = {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
        ],
        headless: true,
        defaultViewport: { width: 1280, height: 720 },
      };

      if (isVercel) {
        console.log("[ATIVO] Ambiente: VERCEL - Tentando usar chrome/chromium do sistema...");
        // No Vercel, tenta os caminhos padrão onde o Chrome está instalado
        const possiblePaths = [
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          '/snap/bin/chromium',
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ];

        let foundPath: string | undefined;
        for (const path of possiblePaths) {
          try {
            const fs = await import('fs/promises');
            await fs.access(path);
            foundPath = path;
            console.log(`[ATIVO] ✅ Encontrado Chrome em: ${path}`);
            break;
          } catch (e) {
            // Continua tentando próximo caminho
          }
        }

        if (foundPath) {
          launchConfig.executablePath = foundPath;
        } else {
          console.warn("[ATIVO] ⚠️  Chrome não encontrado em caminhos conhecidos, tentando sem executablePath...");
        }
      } else {
        console.log("[ATIVO] Ambiente: LOCAL");
      }

      browser = await puppeteer.launch(launchConfig);
      console.log("[ATIVO] ✅ Navegador iniciado com sucesso");
    } catch (launchError) {
      console.error("[ATIVO] ❌ Erro ao iniciar navegador:", launchError instanceof Error ? launchError.message : String(launchError));
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
    console.log("[ATIVO] ✅ Conteúdo extraído");

    // Parse com cheerio
    const $ = cheerio.load(html);
    const cards = $('article.card.card-event');
    console.log(`[ATIVO] Cards encontrados: ${cards.length}`);

    if (cards.length === 0) {
      console.warn("[ATIVO] ⚠️  Nenhum card encontrado. O seletor pode ter mudado.");
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
          date: dateRaw,
          distances: distances,
          type: type,
          url: fullUrl,
          state: state,
        };

        allRaces.push(newRace);

      } catch (cardError) {
        console.error(`[ATIVO] Erro no card ${i}:`, cardError);
      }
    });

    return allRaces;

  } catch (error) {
    console.error("[ATIVO] ❌ Erro inesperado no Crawler:", error);
    return [];
  } finally {
    // GARANTE que o navegador seja fechado, mesmo em caso de erro
    if (browser) {
      await browser.close();
      console.log("[ATIVO] ✅ Navegador fechado");
    }
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[Crawler Ativo] Completo em ${duration}s. ${allRaces.length} eventos encontrados.\n`);
  }
}
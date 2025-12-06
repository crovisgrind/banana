// src/crawlers/ativo.ts
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

export async function crawlAtivo(): Promise<Race[]> {
  console.log("🚀 [ATIVO] Iniciando crawl...");
  const start = Date.now();
  const allRaces: Race[] = [];
  let browser;

  try {
    console.log("[ATIVO] ⏳ Aguardando 2 segundos antes de conectar...");
    await delay(2000);
    
    const isVercel = !!process.env.VERCEL;
    console.log(`[ATIVO] Environment: ${isVercel ? 'VERCEL' : 'LOCAL'}`);
    
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

    console.log("[ATIVO] 🌐 Iniciando navegador...");
    browser = await puppeteer.launch(launchConfig);
    console.log("[ATIVO] ✅ Navegador iniciado");

    const page = await browser.newPage();
    console.log("[ATIVO] ✅ Página criada");
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // ✅ Intercepta requisições para debugar
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.log(`[ATIVO] ⚠️  Response ${response.status()}: ${response.url()}`);
      }
    });

    console.log("[ATIVO] 🔗 Navegando...");
    try {
      await page.goto(CALENDAR_URL, { 
        waitUntil: 'networkidle2', 
        timeout: 60000
      });
      console.log("[ATIVO] ✅ Página inicial carregada");
    } catch (navError) {
      console.error("[ATIVO] ❌ Erro ao navegar:", navError instanceof Error ? navError.message : String(navError));
      return [];
    }

    // ✅ AGUARDA MUITO MAIS TEMPO PARA JS RENDERIZAR
    console.log("[ATIVO] ⏳ Aguardando 8 segundos para JS renderizar completamente...");
    await delay(8000);

    // ✅ TENTA ROLAR A PÁGINA PARA DISPARAR LAZY-LOADING
    console.log("[ATIVO] 📜 Rolando página para ativar lazy-loading...");
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    
    await delay(3000);
    
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    
    await delay(3000);

    // ✅ EXTRAI EVENTOS USANDO page.evaluate (executa JS no contexto da página)
    console.log("[ATIVO] 🔍 Extraindo eventos via JavaScript...");
    
    const events = await page.evaluate(() => {
      const results: any[] = [];
      
      // Tenta múltiplos seletores
      let cards = document.querySelectorAll('article.card.card-event');
      console.log(`[EVAL] article.card.card-event: ${cards.length}`);
      
      if (cards.length === 0) {
        cards = document.querySelectorAll('[class*="card"][class*="event"]');
        console.log(`[EVAL] [class*="card"][class*="event"]: ${cards.length}`);
      }

      if (cards.length === 0) {
        cards = document.querySelectorAll('div.col-xl-4');
        console.log(`[EVAL] div.col-xl-4: ${cards.length}`);
      }

      cards.forEach((card, idx) => {
        try {
          const title = card.querySelector('h3')?.textContent?.trim() || '';
          const day = card.querySelector('[class*="day"]')?.textContent?.trim() || 
                     card.querySelector('span.date-square-day')?.textContent?.trim() || '';
          const month = card.querySelector('[class*="month"]')?.textContent?.trim() || 
                       card.querySelector('span.date-square-month')?.textContent?.trim() || '';
          const location = card.querySelector('[class*="place"], [class*="location"]')?.textContent?.trim() || 
                          card.querySelector('span.place-input')?.textContent?.trim() || '';
          const distances = card.querySelector('[class*="distance"], span.distances')?.textContent?.trim() || '';
          const link = card.querySelector('a[href]')?.getAttribute('href') || '';

          if (title && title !== 'Imagem Evento' && day && link) {
            results.push({
              title,
              day,
              month,
              location,
              distances,
              link,
            });
          }
        } catch (e) {
          console.log(`[EVAL] Erro ao processar card ${idx}`);
        }
      });

      console.log(`[EVAL] Total extraído: ${results.length}`);
      return results;
    });

    console.log(`[ATIVO] ✅ ${events.length} eventos extraídos via JavaScript`);

    if (events.length === 0) {
      console.warn("[ATIVO] ⚠️  Nenhum evento encontrado. Site pode ter mudado a estrutura.");
      return [];
    }

    // ✅ PROCESSA EVENTOS
    events.forEach((event, idx) => {
      try {
        const { title, day, month, location, distances, link } = event;

        if (!title || !day || !link) {
          console.log(`[ATIVO] ⏭️  Evento ${idx} inválido`);
          return;
        }

        const state = extractState(location);
        if (!state || state === 'ND') {
          console.log(`[ATIVO] ⏭️  Evento ${idx} sem estado válido`);
          return;
        }

        let fullUrl = link;
        if (!fullUrl.startsWith('http')) {
          fullUrl = 'https://www.ativo.com' + (fullUrl.startsWith('/') ? '' : '/') + fullUrl;
        }

        const dateRaw = `${day} DE ${month.toUpperCase()}`;
        const type: 'road' | 'trail' = title.toLowerCase().includes('trilha') ? 'trail' : 'road';

        const newRace: Race = {
          id: `ativo-${title.replace(/\s/g, '_')}-${day}-${month}`,
          title,
          location: location.replace(/\([A-Z]{2}\)/, '').replace(/[\s-][A-Z]{2}$/, '').trim(),
          date: dateRaw,
          distances: parseDistances(distances),
          type,
          url: fullUrl,
          state,
        };

        allRaces.push(newRace);
        console.log(`[ATIVO] ✅ ${title} - ${state}`);

      } catch (error) {
        console.error(`[ATIVO] ❌ Erro no evento ${idx}:`, error instanceof Error ? error.message : String(error));
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
        console.error("[ATIVO] ⚠️  Erro ao fechar:", closeError);
      }
    }
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[ATIVO] ⏱️  Completo em ${duration}s. ${allRaces.length} eventos.\n`);
  }
}
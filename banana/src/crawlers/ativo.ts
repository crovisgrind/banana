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
  console.log("\n🚀 [ATIVO] ===== INICIANDO CRAWL =====");
  const start = Date.now();
  const allRaces: Race[] = [];
  let browser;

  try {
    console.log("[ATIVO] Step 1: Verificando ambiente...");
    const isVercel = !!process.env.VERCEL;
    console.log(`[ATIVO] Environment: ${isVercel ? '☁️  VERCEL' : '💻 LOCAL'}`);

    console.log("[ATIVO] Step 2: Configurando Puppeteer...");
    let launchConfig: any = {
      headless: true,
      defaultViewport: { width: 1280, height: 720 },
    };

    if (isVercel) {
      console.log("[ATIVO] Step 2a: Usando Chromium do Vercel...");
      const chromiumPath = await chromium.executablePath();
      console.log(`[ATIVO] Chromium path: ${chromiumPath}`);
      
      launchConfig = {
        ...launchConfig,
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-web-security',
        ],
        executablePath: chromiumPath,
      };
    } else {
      console.log("[ATIVO] Step 2b: Usando Chromium local...");
      launchConfig = {
        ...launchConfig,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };
    }

    console.log("[ATIVO] Step 3: Lançando navegador...");
    try {
      browser = await puppeteer.launch(launchConfig);
      console.log("[ATIVO] ✅ Navegador lançado com sucesso");
    } catch (launchErr) {
      console.error("[ATIVO] ❌ FALHA ao lançar navegador:", launchErr instanceof Error ? launchErr.message : String(launchErr));
      return [];
    }

    console.log("[ATIVO] Step 4: Criando página...");
    const page = await browser.newPage();
    console.log("[ATIVO] ✅ Página criada");
    
    console.log("[ATIVO] Step 5: Configurando user agent...");
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    console.log("[ATIVO] ✅ User agent configurado");

    console.log("[ATIVO] Step 6: Navegando para URL...");
    try {
      const response = await page.goto(CALENDAR_URL, { 
        waitUntil: 'networkidle2', 
        timeout: 60000
      });
      console.log(`[ATIVO] ✅ Página navegada (status: ${response?.status()})`);
    } catch (gotoErr) {
      console.error("[ATIVO] ❌ FALHA ao navegar:", gotoErr instanceof Error ? gotoErr.message : String(gotoErr));
      return [];
    }

    console.log("[ATIVO] Step 7: Aguardando renderização JS (8s)...");
    await delay(8000);
    console.log("[ATIVO] ✅ Aguarde concluído");

    console.log("[ATIVO] Step 8: Rolando página para lazy-loading...");
    try {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await delay(2000);
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await delay(2000);
      console.log("[ATIVO] ✅ Página rolada");
    } catch (scrollErr) {
      console.error("[ATIVO] ⚠️  Erro ao rolar (continuando):", scrollErr);
    }

    console.log("[ATIVO] Step 9: Extraindo eventos com page.evaluate...");
    let events: any[] = [];
    try {
      events = await page.evaluate(() => {
        const results: any[] = [];
        
        // Log no console do navegador
        console.log('[BROWSER] Iniciando extração...');
        
        let cards = document.querySelectorAll('article.card.card-event');
        console.log(`[BROWSER] article.card.card-event: ${cards.length}`);
        
        if (cards.length === 0) {
          cards = document.querySelectorAll('[class*="card"]');
          console.log(`[BROWSER] [class*="card"]: ${cards.length}`);
        }

        if (cards.length === 0) {
          cards = document.querySelectorAll('div[class*="col"]');
          console.log(`[BROWSER] div[class*="col"]: ${cards.length}`);
        }

        cards.forEach((card, idx) => {
          try {
            const title = card.querySelector('h3')?.textContent?.trim() || '';
            const day = card.querySelector('[class*="day"]')?.textContent?.trim() || '';
            const month = card.querySelector('[class*="month"]')?.textContent?.trim() || '';
            const location = card.querySelector('[class*="place"]')?.textContent?.trim() || '';
            const distances = card.querySelector('[class*="distance"]')?.textContent?.trim() || '';
            const link = card.querySelector('a[href]')?.getAttribute('href') || '';

            if (title && title !== 'Imagem Evento' && day && link) {
              results.push({ title, day, month, location, distances, link });
              console.log(`[BROWSER] Card ${idx}: ${title}`);
            }
          } catch (e) {
            console.log(`[BROWSER] Erro card ${idx}`);
          }
        });

        console.log(`[BROWSER] Total: ${results.length}`);
        return results;
      });
      console.log(`[ATIVO] ✅ Extração concluída: ${events.length} eventos`);
    } catch (evalErr) {
      console.error("[ATIVO] ❌ FALHA na extração:", evalErr instanceof Error ? evalErr.message : String(evalErr));
      return [];
    }

    console.log("[ATIVO] Step 10: Processando eventos...");
    if (events.length === 0) {
      console.warn("[ATIVO] ⚠️  Nenhum evento encontrado!");
      
      // Log do HTML para debug
      const html = await page.content();
      console.log(`[ATIVO] HTML length: ${html.length}`);
      console.log(`[ATIVO] Has 'Imagem Evento': ${html.includes('Imagem Evento')}`);
      console.log(`[ATIVO] Has placeholder: ${html.includes('via.placeholder.com')}`);
      
      return [];
    }

    events.forEach((event, idx) => {
      try {
        const { title, day, month, location, distances, link } = event;

        if (!title || !day || !link) {
          console.log(`[ATIVO] ⏭️  Evento ${idx} inválido (faltam campos)`);
          return;
        }

        const state = extractState(location);
        if (!state || state === 'ND') {
          console.log(`[ATIVO] ⏭️  Evento ${idx} sem estado: "${location}"`);
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
        console.log(`[ATIVO] ✅ Processado: ${title}`);

      } catch (error) {
        console.error(`[ATIVO] ❌ Erro ao processar evento ${idx}:`, error instanceof Error ? error.message : String(error));
      }
    });

    console.log(`[ATIVO] Step 11: Total de corridas: ${allRaces.length}`);
    return allRaces;

  } catch (error) {
    console.error("[ATIVO] ❌ ERRO FATAL:", error instanceof Error ? error.message : String(error));
    console.error("[ATIVO] Stack:", error instanceof Error ? error.stack : '');
    return [];
  } finally {
    console.log("[ATIVO] Step 12: Fechando navegador...");
    if (browser) {
      try {
        await browser.close();
        console.log("[ATIVO] ✅ Navegador fechado");
      } catch (closeError) {
        console.error("[ATIVO] ⚠️  Erro ao fechar:", closeError);
      }
    }
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[ATIVO] ===== CRAWL COMPLETO =====`);
    console.log(`[ATIVO] Duração: ${duration}s`);
    console.log(`[ATIVO] Corridas: ${allRaces.length}\n`);
  }
}
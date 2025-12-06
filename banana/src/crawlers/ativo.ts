// src/crawlers/ativo.ts
import * as cheerio from 'cheerio';
import { type Race } from '@/types/races';

const CALENDAR_URL = "https://www.ativo.com/calendario/";

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
  console.log("[ATIVO] Tentando crawler sem Puppeteer (HTML estático)...");
  const start = Date.now();
  const allRaces: Race[] = [];

  try {
    console.log("[ATIVO] Fetching HTML...");
    const response = await fetch(CALENDAR_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`[ATIVO] Erro HTTP: ${response.status}`);
      return [];
    }

    const html = await response.text();
    console.log(`[ATIVO] HTML obtido (${html.length} chars)`);

    // ✅ TENTA EXTRAIR JSON EMBUTIDO NA PÁGINA
    console.log("[ATIVO] Procurando por JSON embutido...");
    
    // Procura por padrões comuns de JSON com dados de eventos
    const jsonPatterns = [
      /window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s,
      /window\.__data__\s*=\s*(\{.*?\});/s,
      /"events"\s*:\s*(\[.*?\])/s,
      /eventos\s*=\s*(\[.*?\])/s,
    ];

    let eventsData: any = null;
    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match) {
        console.log("[ATIVO] ✅ JSON encontrado!");
        try {
          eventsData = JSON.parse(match[1]);
          break;
        } catch (e) {
          console.log("[ATIVO] ⚠️  JSON inválido neste padrão");
        }
      }
    }

    // Se não achou JSON, tenta parsing do HTML
    if (!eventsData) {
      console.log("[ATIVO] Nenhum JSON encontrado, parseando HTML...");
      
      const $ = cheerio.load(html);

      // Tenta TODOS os seletores possíveis
      const selectors = [
        'article.card.card-event',
        '[class*="card"][class*="event"]',
        'div[class*="evento"]',
        'div[data-event]',
        '[role="article"]',
      ];

      let cards = $();
      for (const selector of selectors) {
        cards = $(selector);
        if (cards.length > 0) {
          console.log(`[ATIVO] ✅ Cards encontrados com "${selector}": ${cards.length}`);
          break;
        }
      }

      if (cards.length === 0) {
        console.log("[ATIVO] ⚠️  Nenhum card encontrado");
        // Log para debug
        console.log("[ATIVO] Procurando por h3 com títulos...");
        const titles = $('h3');
        console.log(`[ATIVO] H3 encontrados: ${titles.length}`);
        titles.slice(0, 3).each((i, el) => {
          const text = $(el).text().trim();
          if (text && text !== 'Fechar' && text.length > 3) {
            console.log(`[ATIVO] Título ${i}: ${text}`);
          }
        });
        
        return [];
      }

      // Processa cards
      cards.each((i, element) => {
        try {
          const $card = $(element);

          // Múltiplas formas de extrair dados
          const title = $card.find('h3').text().trim() ||
                       $card.find('[class*="title"]').text().trim() ||
                       $card.attr('title') || '';

          const dayElement = $card.find('span.date-square-day, [class*="day"]').first().text().trim();
          const monthElement = $card.find('span.date-square-month, [class*="month"]').first().text().trim();
          const locationRaw = $card.find('span.place-input, [class*="place"], [class*="location"]').first().text().trim();
          const distancesText = $card.find('span.distances, [class*="distance"]').first().text().trim();
          let fullUrl = $card.find('a[href]').first().attr('href') || '';

          // Validações
          if (!title || title === 'Imagem Evento' || title.length < 3) return;
          if (!dayElement || isNaN(parseInt(dayElement))) return;
          if (!fullUrl) return;

          if (!fullUrl.startsWith('http')) {
            fullUrl = 'https://www.ativo.com' + (fullUrl.startsWith('/') ? '' : '/') + fullUrl;
          }

          const dateRaw = `${dayElement} DE ${monthElement.toUpperCase()}`;
          const distances = parseDistances(distancesText);
          const state = extractState(locationRaw);
          const location = locationRaw.replace(/\([A-Z]{2}\)/, '').replace(/[\s-][A-Z]{2}$/, '').trim();

          if (!state || state === 'ND') return;

          const typeTag = $card.find('span.tag, [class*="tag"]').first().text().trim().toLowerCase();
          const type: 'road' | 'trail' = typeTag.includes('trilha') ? 'trail' : 'road';

          const newRace: Race = {
            id: `ativo-${title.replace(/\s/g, '_')}-${dayElement}-${monthElement}`,
            title,
            location,
            date: dateRaw,
            distances,
            type,
            url: fullUrl,
            state,
          };

          allRaces.push(newRace);
          console.log(`[ATIVO] ✅ ${title}`);

        } catch (error) {
          console.error(`[ATIVO] Erro no card ${i}:`, error instanceof Error ? error.message : '');
        }
      });
    }

    return allRaces;

  } catch (error) {
    console.error("[ATIVO] ❌ Erro:", error instanceof Error ? error.message : String(error));
    return [];
  } finally {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[ATIVO] Completo em ${duration}s. ${allRaces.length} eventos.\n`);
  }
}
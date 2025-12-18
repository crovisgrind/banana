import * as cheerio from 'cheerio';
import { type Race } from '@/types/races';
import puppeteer, { Page } from 'puppeteer';

// URL base para paginação
const BASE_URL_FILTRO = "https://minhasinscricoes.com.br/pt-br/Calendario/Filtro";

// --- Funções Auxiliares de Tratamento de Texto ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getCurrentDateEncoded(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    // Formato DD/MM/YYYY codificado para URL (sendo / = %2F)
    return `${day}%2F${month}%2F${year}`;
}

function parseDistances(text: string): string[] {
  if (!text) return [];
  // Regex robusto para pegar "5km", "10k", "21.1 km", "42k"
  const matches = text.match(/(\d+(?:[.,]\d+)?)\s?(?:k|km|m)(?=\s|$|[^a-zA-Z]|\.|\,)/gi);
  if (!matches) return [];

  return matches
    .map(d => d.trim().toUpperCase()
      .replace(/KM$/, 'K')
      .replace('K ', 'K')
      .replace(/\s/g, '') // Remove espaços internos
      .replace(',', '.')  // Padroniza decimais
    )
    .filter((d, i, arr) => arr.indexOf(d) === i) // Remove duplicatas
    .filter(d => {
        const num = parseFloat(d.replace('K', ''));
        return num > 0 && num < 150; // Filtra valores absurdos
    });
}

function extractState(text: string): string {
  // Procura padrões: "Cidade - SP", "(SP)", "Cidade/SP"
  const stateRegex = /[\s(-/]([A-Z]{2})[)\s.,]|^([A-Z]{2})$/m;
  const match = text.match(stateRegex);
  
  if (match) {
    const uf = match[1] || match[2];
    const knownStates = ['SP', 'RJ', 'MG', 'RS', 'SC', 'PR', 'BA', 'DF', 'GO', 'ES', 'PE', 'CE', 'AM', 'PA', 'MT', 'MS', 'RN', 'PB'];
    if (knownStates.includes(uf)) return uf;
  }
  return 'ND';
}

// --- Scraper da Página de Detalhes (Nível 2) ---

async function scrapeEventDetails(browser: any, url: string): Promise<Partial<Race> | null> {
    let page: Page | null = null;
    try {
        page = await browser.newPage();
        if (!page) return null;

        // Otimização: Bloquear imagens e CSS para ser rápido
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'media', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Timeout curto pois queremos velocidade
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        
        // Espera mínima para hidratação do React/Next
        try { await page.waitForSelector('h1', { timeout: 3000 }); } catch {}

        const content = await page.content();
        const $ = cheerio.load(content);
        const fullText = $('body').text();

        // 1. Título
        // Prioridade 1: Meta Tag OG (Geralmente o título mais limpo para compartilhamento)
        let title = $('meta[property="og:title"]').attr('content')?.trim();

        // Prioridade 2: Tag Title (Limpando o sufixo padrão)
        if (!title) {
            const pageTitle = $('title').text().trim();
            if (pageTitle) {
                title = pageTitle
                    .split('|')[0]
                    .replace(/\s*-\s*Minhas Inscrições.*$/i, '') // Remove "- Minhas Inscrições"
                    .trim();
            }
        }

        // Prioridade 3: H1 (Último caso, pois costuma ter texto duplicado/escondido)
        if (!title) {
            title = $('h1').first().text().trim();
        }

        if (!title) return null;

        // Limpeza final de caracteres estranhos
        title = title.replace(/\s+/g, ' ').trim();

        // 2. Data
        // Minhas Inscrições costuma usar formato DD/MM/YYYY ou "Dia DD de Mês"
        let dateRaw = '';
        
        // Regex 1: DD/MM/YYYY
        const dateSlashMatch = fullText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        // Regex 2: DD de Mês (Extenso)
        const dateExtenseMatch = fullText.match(/(\d{1,2})\s+de\s+([a-záéíóúç]+)\s+de\s+(\d{4})/i);

        if (dateExtenseMatch) {
            dateRaw = `${dateExtenseMatch[1]} DE ${dateExtenseMatch[2].toUpperCase()}`;
        } else if (dateSlashMatch) {
            const day = dateSlashMatch[1];
            const monthNum = parseInt(dateSlashMatch[2]);
            const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
            dateRaw = `${day} DE ${months[monthNum-1] || 'MÊS'}`;
        } else {
            // Fallback: Procura data solta perto do topo
            const shortDate = fullText.substring(0, 1000).match(/Data:\s*(\d{1,2})\/(\d{1,2})/i);
            if (shortDate) {
                 const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
                 dateRaw = `${shortDate[1]} DE ${months[parseInt(shortDate[2])-1]}`;
            }
        }

        // 3. Local e Estado
        let location = 'Local a definir';
        let state = 'ND';
        
        // Procura blocos com "Local" ou "Cidade"
        const locationBlock = $("*:contains('Local:'), *:contains('Cidade:')").last().parent().text();
        if (locationBlock && locationBlock.length < 200) {
            location = locationBlock.replace(/Local:|Cidade:/i, '').trim();
            state = extractState(location);
        } else {
            // Tenta pegar do título ou texto inicial
            state = extractState(title + ' ' + fullText.substring(0, 500));
        }
        
        // Limpeza final do location
        if (location.length > 60) location = location.substring(0, 60) + '...';

        // 4. Distâncias
        const distances = parseDistances(fullText);

        // 5. Tipo
        const type: 'road' | 'trail' = (title + fullText).toLowerCase().match(/trilha|trail|montanha|terra|off-road/) ? 'trail' : 'road';

        return { title, date: dateRaw, location, state, distances, type };

    } catch (error) {
        return null;
    } finally {
        await page?.close();
    }
}

// --- Crawler Principal ---

export async function getMinhasInscricoesRaces(): Promise<Race[]> {
  const allRaces: Race[] = [];
  let browser;

  try {
    console.log("[MINHAS_INSCRICOES] 🚀 Iniciando Crawler...");

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ],
      defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // --- PASSO 1: Paginação (Páginas 1 a 10) ---
    
    const startDateEncoded = getCurrentDateEncoded();
    const MAX_PAGES = 10;
    const allLinksSet = new Set<string>();

    for (let i = 1; i <= MAX_PAGES; i++) {
        const pageUrl = `${BASE_URL_FILTRO}?pagina=${i}&Valor=0%2C500&PesquisaDataInicio=${startDateEncoded}&PesquisaDataFim=31%2F12%2F9999&exclusivo=False&internacional=False`;
        
        console.log(`[MINHAS_INSCRICOES] Acessando página ${i}/${MAX_PAGES}...`);
        
        try {
            await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Pequeno delay para garantir carregamento dinâmico dos cards
            await delay(1500);

            // Extrai links desta página
            const pageLinks = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('a'));
                return anchors
                    .map(a => a.href)
                    .filter(href => href && (
                        href.includes('/ClickEventos/Redirecionar') ||
                        href.includes('/evento/') || 
                        href.includes('EventoDetalhe')
                    ))
                    .filter(href => !href.includes('javascript') && !href.includes('#'));
            });

            pageLinks.forEach(link => allLinksSet.add(link));
            console.log(`   -> Encontrados ${pageLinks.length} links nesta página.`);

        } catch (err) {
            console.warn(`[MINHAS_INSCRICOES] ⚠️ Falha ao ler página ${i}:`, err);
            // Continua para a próxima página mesmo se uma falhar
        }
    }

    // Convert Set to Array
    const uniqueLinks = Array.from(allLinksSet);
    console.log(`[MINHAS_INSCRICOES] Total de links únicos coletados: ${uniqueLinks.length}`);

    // --- PASSO 2: Drill Down em cada evento ---
    
    // Processar TODOS ou limitar se necessário (ex: slice(0, 50))
    const linksToProcess = uniqueLinks; 

    for (const url of linksToProcess) {
        // Delay humano para evitar bloqueio
        await delay(Math.random() * 800 + 200);

        const details = await scrapeEventDetails(browser, url);
        
        if (details && details.title) {
            // Cria ID único
            const dateStr = details.date ? details.date.replace(/\s/g, '-') : 'TBA';
            const id = `mi-${details.title.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}-${dateStr}`;
            
            // Só adiciona se tiver título e não for duplicado
            if (!allRaces.find(r => r.id === id)) {
                allRaces.push({
                    id: id.substring(0, 100),
                    title: details.title,
                    location: details.location || 'Brasil',
                    state: details.state || 'ND',
                    date: details.date || 'Data a confirmar',
                    distances: details.distances || [],
                    type: details.type || 'road',
                    url: url
                } as Race);
                console.log(`[MINHAS_INSCRICOES] ✅ ${details.title}`);
            }
        }
    }

    console.log(`[MINHAS_INSCRICOES] Crawler finalizado. ${allRaces.length} eventos extraídos.`);
    return allRaces;

  } catch (error) {
    console.error("[MINHAS_INSCRICOES] ❌ Erro Crítico:", error instanceof Error ? error.message : String(error));
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
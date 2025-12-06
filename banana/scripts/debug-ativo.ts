// scripts/debug-ativo.ts
// Debug SEM Puppeteer - apenas fetch + parsing

import * as cheerio from 'cheerio';

const CALENDAR_URL = "https://www.ativo.com/calendario/";

async function debugAtivo() {
  console.log("🧪 [DEBUG] Testando Ativo via Fetch (sem Puppeteer)...\n");

  try {
    console.log(`🔗 Fazendo requisição para ${CALENDAR_URL}...`);
    const response = await fetch(CALENDAR_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`❌ Erro HTTP: ${response.status} ${response.statusText}`);
      return;
    }

    const html = await response.text();
    console.log(`✅ Resposta obtida (${html.length} caracteres)\n`);

    // Parse
    const $ = cheerio.load(html);

    // Debug 1: Procura por qualquer card
    console.log("🔍 TESTE 1: article.card.card-event");
    let cards = $('article.card.card-event');
    console.log(`   Encontrados: ${cards.length}`);

    if (cards.length === 0) {
      console.log("\n🔍 TESTE 2: [class*='card']");
      cards = $('[class*="card"]');
      console.log(`   Encontrados: ${cards.length}`);
    }

    if (cards.length === 0) {
      console.log("\n🔍 TESTE 3: div.col-xl-4");
      cards = $('div.col-xl-4');
      console.log(`   Encontrados: ${cards.length}`);
    }

    if (cards.length === 0) {
      console.log("\n🔍 TESTE 4: article");
      cards = $('article');
      console.log(`   Encontrados: ${cards.length}`);
    }

    // Debug 2: Procura por elementos com data
    console.log("\n🔍 TESTE 5: span.date-square-day");
    let dateElements = $('span.date-square-day');
    console.log(`   Encontrados: ${dateElements.length}`);

    console.log("\n🔍 TESTE 6: span com classes date");
    dateElements = $('span[class*="date"]');
    console.log(`   Encontrados: ${dateElements.length}`);

    // Debug 3: Procura por títulos
    console.log("\n🔍 TESTE 7: h3");
    let titles = $('h3');
    console.log(`   Encontrados: ${titles.length}`);
    if (titles.length > 0) {
      console.log(`   Primeiros 5 títulos:`);
      titles.slice(0, 5).each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 0) {
          console.log(`     ${i + 1}. "${text}"`);
        }
      });
    }

    // Debug 4: Procura por "placeholder" - indicativo de JS não renderizado
    console.log("\n🔍 TESTE 8: Verificando se HTML está renderizado");
    if (html.includes('via.placeholder.com')) {
      console.log("   ⚠️  Encontrado placeholder - HTML NÃO está renderizado (JS não executou)");
      console.log("   ℹ️  Isso significa que Puppeteer é NECESSÁRIO para este site");
    } else {
      console.log("   ✅ Sem placeholder - HTML parece estar renderizado");
    }

    if (html.includes('Imagem Evento')) {
      console.log("   ⚠️  Encontrado 'Imagem Evento' - conteúdo ainda é placeholder");
    } else {
      console.log("   ✅ Sem 'Imagem Evento'");
    }

    // Debug 5: Procura por padrões de corridas
    console.log("\n🔍 TESTE 9: Procurando por nomes de estados (UF)");
    const states = ['SP', 'RJ', 'MG', 'BA', 'RS', 'DF', 'PE', 'CE'];
    states.forEach(state => {
      const count = (html.match(new RegExp(state, 'g')) || []).length;
      if (count > 0) {
        console.log(`   ${state}: ${count}x`);
      }
    });

    // Debug 6: Lista links
    console.log("\n🔍 TESTE 10: Links encontrados (primeiros 10)");
    const links = $('a[href*="calendario"], a[href*="evento"]');
    console.log(`   Total com 'calendario' ou 'evento': ${links.length}`);
    if (links.length > 0) {
      links.slice(0, 10).each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim().substring(0, 50);
        console.log(`     ${i + 1}. [${text}] → ${href}`);
      });
    }

    // Debug 7: Mostra estrutura básica
    console.log("\n🔍 TESTE 11: Estrutura de elementos principais");
    console.log(`   body: ${$('body').length}`);
    console.log(`   main: ${$('main').length}`);
    console.log(`   section: ${$('section').length}`);
    console.log(`   div: ${$('div').length}`);
    console.log(`   a: ${$('a').length}`);
    console.log(`   img: ${$('img').length}`);

    // Debug 8: Salva um snippet do HTML
    console.log("\n📋 SNIPPET DO HTML (primeiros 2000 caracteres):");
    console.log("=".repeat(80));
    console.log(html.substring(0, 2000));
    console.log("=".repeat(80));

  } catch (error) {
    console.error("\n❌ ERRO:", error instanceof Error ? error.message : String(error));
  }
}

debugAtivo();
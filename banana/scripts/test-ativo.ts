// scripts/test-ativo.ts
// Use este script para debugar o Puppeteer localmente

import { crawlAtivo } from '@/crawlers/ativo';

async function main() {
  console.log('🧪 Testando crawler Ativo...\n');
  
  try {
    const races = await crawlAtivo();
    console.log(`\n✅ Resultado: ${races.length} corridas encontradas`);
    
    if (races.length > 0) {
      console.log('\n📋 Primeiras 3 corridas:');
      races.slice(0, 3).forEach((race, i) => {
        console.log(`\n${i + 1}. ${race.title}`);
        console.log(`   Data: ${race.date}`);
        console.log(`   Local: ${race.location} (${race.state})`);
        console.log(`   URL: ${race.url}`);
      });
    } else {
      console.log('\n⚠️  Nenhuma corrida encontrada');
      console.log('Possíveis causas:');
      console.log('  1. O site mudou a estrutura HTML (seletor inválido)');
      console.log('  2. Puppeteer falhou ao carregar a página');
      console.log('  3. JavaScript não foi executado corretamente');
    }
    
  } catch (error) {
    console.error('\n❌ Erro ao executar crawler:');
    console.error(error instanceof Error ? error.message : String(error));
  }
}

main();
// scripts/postbuild.js
// Este script é executado APÓS o build para baixar o Chrome

const puppeteer = require('puppeteer');

async function downloadChrome() {
  console.log('📥 Baixando Chrome para Vercel...');
  try {
    await puppeteer.browsers.download('chrome');
    console.log('✅ Chrome baixado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao baixar Chrome:', error);
    // Não falha o build se não conseguir
    process.exit(0);
  }
}

downloadChrome();
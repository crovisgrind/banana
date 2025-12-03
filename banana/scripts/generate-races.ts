// scripts/generate-races.ts
// Script para gerar arquivo JSON estático com dados do crawler

import * as fs from 'fs';
import * as path from 'path';

// Importar o crawler
import { crawlTvComRunning } from '../src/crawlers/tvcomrunning';

const MONTH_MAP: { [key: string]: number } = {
    'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'ABRIL': 3,
    'MAIO': 4, 'JUNHO': 5, 'JULHO': 6, 'AGOSTO': 7,
    'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11,
};

function normalizeRace(race: any) {
    const rawDate = race.date;
    if (!rawDate || typeof rawDate !== 'string') return race;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentYear = now.getFullYear();
    
    let day: number | undefined;
    let month: number | undefined;
    let year: number | undefined;

    const cleanedString = rawDate.toUpperCase().replace(/\s+/g, ' ');
    const fullDateRegex = /(\d{1,2})\s+DE\s+([A-ZÇ]+)\s+DE\s+(\d{4})/;
    const fullDateMatch = cleanedString.match(fullDateRegex);

    if (fullDateMatch) {
        day = parseInt(fullDateMatch[1], 10);
        const monthName = fullDateMatch[2];
        month = MONTH_MAP[monthName];
        year = parseInt(fullDateMatch[3], 10);
    } else {
        const shortDateRegex = rawDate.match(/(\d{1,2})[./](\d{1,2})/);
        if (shortDateRegex) {
            day = parseInt(shortDateRegex[1], 10);
            month = parseInt(shortDateRegex[2], 10) - 1;
            year = currentYear;
        }
    }

    if (day === undefined || month === undefined || isNaN(day) || isNaN(month) || month < 0 || month > 11) {
        console.warn(`⚠️ Erro ao normalizar data: ${rawDate}`);
        return race;
    }

    let dateObject = new Date(year || currentYear, month, day);

    if ((!year || dateObject < now) && month < now.getMonth()) {
        const targetYear = (year || currentYear) + 1;
        dateObject = new Date(targetYear, month, day);
    }

    if (isNaN(dateObject.getTime())) {
        console.error(`❌ Erro fatal: Data não pôde ser normalizada. Valor: ${rawDate}`);
        return race;
    }

    return {
        ...race,
        date: dateObject.toISOString().split('T')[0],
    };
}

async function generateRacesJSON() {
    console.log('🚀 Gerando arquivo JSON estático de corridas...\n');
    
    try {
        // Executar o crawler
        const rawRaces = await crawlTvComRunning();
        
        // Normalizar as datas
        const normalizedRaces = rawRaces.map(normalizeRace);
        
        // Ordenar por data
        normalizedRaces.sort((a, b) => a.date.localeCompare(b.date));
        
        // Criar diretório public/data se não existir
        const dataDir = path.join(process.cwd(), 'public', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log(`✅ Diretório criado: ${dataDir}`);
        }
        
        // Salvar JSON
        const filePath = path.join(dataDir, 'races.json');
        fs.writeFileSync(filePath, JSON.stringify(normalizedRaces, null, 2), 'utf-8');
        
        console.log(`\n✅ Arquivo gerado com sucesso!`);
        console.log(`📁 Localização: ${filePath}`);
        console.log(`📊 Total de corridas: ${normalizedRaces.length}`);
        console.log('\n📅 Amostra dos dados:');
        console.log(JSON.stringify(normalizedRaces.slice(0, 2), null, 2));
        
    } catch (error) {
        console.error('❌ Erro ao gerar arquivo JSON:', error);
        process.exit(1);
    }
}

generateRacesJSON();
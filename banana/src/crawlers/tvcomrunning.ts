// src/crawlers/tvcomrunning.ts

import * as cheerio from 'cheerio';
import { type Race } from '@/types/races'; 
import { URL } from 'url';

// URL base
const BASE_URL = "https://tvcomrunning.com.br";

// Seletor Mestre
const RACE_LIST_MASTER_CONTAINER = 'section.blog-content-section .row.g-4';

// Seletor do Card de Corrida
const RACE_CARD_SELECTOR = 'div.col-md-6.col-xl-4'; 

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function parseDistances(distancesRaw: string): string[] {
    return distancesRaw.split(/[,/]/)
        .map(d => d.trim().toUpperCase().replace(/KM$/, 'K').replace('K ', 'K'))
        .filter(d => d.length > 0)
        .map(d => d.includes('MEIA MARATONA') ? '21.1K' : d) 
        .map(d => d.includes('MARATONA') && d.length > 8 ? '42.2K' : d) 
        .map(d => d.includes('K') && parseFloat(d) > 42.2 ? 'ULTRA' : d) 
        .filter((d, i, arr) => arr.indexOf(d) === i); 
}


// -----------------------------------------------------------------
// CRAWLER PRINCIPAL
// -----------------------------------------------------------------
export default async function crawlTvComRunning(): Promise<Race[]> {
    console.log("Iniciando crawl no TVCom Running (HTML ESTÁTICO CONFIRMADO)...");
    const start = Date.now();
    const allRaces: Race[] = [];

    try {
        const response = await fetch(BASE_URL);
        
        if (!response.ok) {
            console.error(`[ERRO] Falha ao carregar ${BASE_URL}: ${response.statusText}.`);
            return [];
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const raceContainer = $(RACE_LIST_MASTER_CONTAINER);

        console.log(`[DIAGNÓSTICO] Container Mestre (${RACE_LIST_MASTER_CONTAINER}) Encontrados: ${raceContainer.length} elementos.`);


        if (raceContainer.length === 0) {
            console.error(`[ERRO] Container principal de corridas não encontrado.`);
            return [];
        }

        // Itera sobre cada card de corrida individual
        let debugCounter = 0;
        raceContainer.find(RACE_CARD_SELECTOR).each((i, element) => {
            const $card = $(element);
            
            // 1. DATA: Apenas normalizamos o espaço, mantendo a estrutura do mês.
            // Ex: "05 DE DEZEMBRO DE 2025"
            const dateRaw = $card.find('span.text-primary').text().replace(/\s+/g, ' ').trim();
            
            // 2. TÍTULO E LINK: h2.blog-link > a
            const $link = $card.find('h2.blog-link a').first();
            const title = $link.text().trim();
            const urlRelative = $link.attr('href');

            // 3. DISTÂNCIAS: p.py-20
            const distancesText = $card.find('p.py-20').text().trim();
            const distances = parseDistances(distancesText);

            // 4. LOCALIZAÇÃO E ESTADO:
            const $locationElement = $card.find('div.blog-left-content > div:nth-child(1) > p').first();
            
            // Extrai o texto completo do P.
            let locationRaw = $locationElement.text();
            
            // Remove a data crua do início da string para isolar o local/estado.
            // O .replace('DE DEZEMBRO DE 2025') só é necessário se a função dateRaw não for suficiente
            locationRaw = locationRaw
                .replace(dateRaw, '') // Remove a string de data limpa
                .replace(/DE\s*\d{4}/g, '') // Remove o ano e o 'DE' (Ex: 'DE 2025')
                .replace(/[^A-Za-zÀ-ú\s\-\/]/g, '') // Remove caracteres não alfanuméricos (como o ícone)
                .trim(); 
            
            // Assumimos que o estado está no formato "CIDADE - UF" ou "CIDADE / UF"
            const locationParts = locationRaw.split(/[\-\/]/).map(p => p.trim()).filter(p => p.length > 0);
            
            const state = locationParts.pop()?.toUpperCase() || 'ND';
            const location = locationParts.join(', ').trim();

            // --- FIM DA EXTRAÇÃO ---
            
            if (title && urlRelative && dateRaw) {
                
                const type: 'road' | 'trail' = title.toLowerCase().includes('trilha') ? 'trail' : 'road';
                
                const newRace: Race = {
                    id: `${title}-${dateRaw}-${state}`.replace(/\s/g, '_'), 
                    title: title,
                    location: location,
                    date: dateRaw, 
                    distances: distances,
                    type: type,
                    url: new URL(urlRelative, BASE_URL).href, 
                    state: state,
                };
                
                if (debugCounter < 5) {
                    console.log(`[DEBUG TVCOM] Título: ${newRace.title}, Data Crua: "${newRace.date}", Estado Atribuído: "${newRace.state}"`);
                    debugCounter++;
                }

                allRaces.push(newRace);
            }
        });

    } catch (error) {
        console.error(`Erro inesperado durante o crawling em ${BASE_URL}:`, error);
    }
    
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(
        `[Crawler TVCom Running] Busca completa em ${duration}s. ${allRaces.length} eventos encontrados.`
    );

    return allRaces;
}
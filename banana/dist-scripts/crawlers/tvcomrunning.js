"use strict";
// src/crawlers/tvcomrunning.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlTvComRunning = crawlTvComRunning;
const cheerio = __importStar(require("cheerio"));
const url_1 = require("url");
// URL base
const BASE_URL = "https://tvcomrunning.com.br";
// Seletor Mestre
const RACE_LIST_MASTER_CONTAINER = 'section.blog-content-section .row.g-4';
// 🚨 CORREÇÃO DO SELETOR: Removendo o .col-md-6 que causou o problema
const RACE_CARD_SELECTOR = 'div.col-xl-4';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function parseDistances(distancesRaw) {
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
async function crawlTvComRunning() {
    console.log("Iniciando crawl no TVCom Running (HTML ESTÁTICO CONFIRMADO)...");
    const start = Date.now();
    const allRaces = [];
    try {
        const response = await fetch(BASE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NextjsRaceCrawler/1.0)',
            },
        });
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
            var _a;
            const $card = $(element);
            const dateRaw = $card.find('span.text-primary').text().replace(/\s+/g, ' ').trim();
            const $link = $card.find('h2.blog-link a').first();
            const title = $link.text().trim();
            const urlRelative = $link.attr('href');
            const distancesText = $card.find('p.py-20').text().trim();
            const distances = parseDistances(distancesText);
            const $locationElement = $card.find('div.blog-left-content > div:nth-child(1) > p').first();
            let locationRaw = $locationElement.text();
            locationRaw = locationRaw
                .replace(dateRaw, '')
                .replace(/DE\s*\d{4}/g, '')
                .replace(/[^A-Za-zÀ-ú\s\-\/]/g, '')
                .trim();
            const locationParts = locationRaw.split(/[\-\/]/).map(p => p.trim()).filter(p => p.length > 0);
            const state = ((_a = locationParts.pop()) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || 'ND';
            const location = locationParts.join(', ').trim();
            if (title && urlRelative && dateRaw) {
                const type = title.toLowerCase().includes('trilha') ? 'trail' : 'road';
                const newRace = {
                    id: `${title}-${dateRaw}-${state}`.replace(/\s/g, '_'),
                    title: title,
                    location: location,
                    date: dateRaw,
                    distances: distances,
                    type: type,
                    url: new url_1.URL(urlRelative, BASE_URL).href,
                    state: state,
                };
                if (debugCounter < 5) {
                    console.log(`[DEBUG TVCOM] Título: ${newRace.title}, Data Crua: "${newRace.date}", Estado Atribuído: "${newRace.state}"`);
                    debugCounter++;
                }
                allRaces.push(newRace);
            }
        });
    }
    catch (error) {
        console.error(`Erro inesperado durante o crawling em ${BASE_URL}:`, error);
    }
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[Crawler TVCom Running] Busca completa em ${duration}s. ${allRaces.length} eventos encontrados.`);
    return allRaces;
}

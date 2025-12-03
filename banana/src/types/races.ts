// src/types/races.ts

// 1. Interface para DADOS BRUTOS (ScrapedRace) - O formato que o crawler retorna.
// O crawlerCorridasBR.ts precisa deste tipo!
export interface ScrapedRace {
  title: string;
  date: string; // Ex: '2025-12-31'
  location: string; // Ex: 'São Paulo - SP'
  distances: string[]; // Ex: ['5K', '10K', '21K'] - Pode ter lixo textual
  type: "road" | "trail" | "unknown"; // O tipo da corrida
  url: string; // URL da corrida
  state: string; // O código do estado (Ex: SP)
}


// 2. Interface para DADOS LIMPOS (Race) - O formato final que o frontend usa.
// O HomePage.tsx e RaceCard.tsx precisam deste tipo!
export interface Race {
  id: string; // ID único (hash da URL)
  title: string;
  date: string; // Data no formato ISO (ex: '2025-12-31T00:00:00.000Z') - Limpo e padronizado
  location: string;
  distances: string[];
  type: "road" | "trail"; // Garante que é um dos tipos válidos
  url: string;
  state: string;
}
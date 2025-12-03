// src/app/page.tsx
import ClientRacesList from '@/components/ClientRacesList';
import { type Race } from '@/types/races';
import * as fs from 'fs';
import * as path from 'path';

async function getRaces(): Promise<Race[]> {
  try {
    // Tentar carregar JSON estático
    const jsonPath = path.join(process.cwd(), 'public', 'data', 'races.json');
    
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, 'utf-8');
      const races: Race[] = JSON.parse(data);
      console.log(`✅ Carregado ${races.length} eventos do arquivo estático`);
      return races;
    }
    
    console.warn('⚠️ Arquivo races.json não encontrado');
    return [];
  } catch (error) {
    console.error('❌ Erro ao carregar races.json:', error);
    return [];
  }
}

export default async function Home() {
  const races = await getRaces();

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-300 via-pink-500 to-cyan-500 p-8 md:p-20">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-8xl md:text-9xl font-black text-black uppercase tracking-tighter drop-shadow-[15px_15px_0_rgba(255,255,255,0.8)] mb-4 rotate-[-3deg]">
          BORA BORA BORA
        </h1>
        <p className="text-5xl md:text-6xl font-black text-black mb-16 drop-shadow-[8px_8px_0_white] rotate-[2deg]">
          acha tua corrida!
        </p>

        <ClientRacesList initialRaces={races} />
      </div>
    </main>
  );
}
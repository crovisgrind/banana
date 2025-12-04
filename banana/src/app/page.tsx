// src/app/page.tsx
import ClientRacesList from '@/components/ClientRacesList';
import BananaHero from '@/components/BananaHero';
import { type Race } from '@/types/races';
import * as fs from 'fs';
import * as path from 'path';

async function getRaces(): Promise<Race[]> {
  try {
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
    <main className="min-h-screen gradient-hero">
      {/* HERO SECTION */}
      <section className="px-6 md:px-10 pt-12 md:pt-20 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto">
          {/* Título Principal com Banana */}
          <div className="mb-8 md:mb-12 flex items-center justify-between gap-4 md:gap-8">
            <div>
              <h1 className="title-hero text-black drop-shadow-[8px_8px_0_rgba(255,255,255,0.9)] mb-2 md:mb-4">
                BORA<br/>BORA<br/>BORA
              </h1>
              
              {/* Subtítulo com Slogan */}
              <p className="text-2xl md:text-4xl font-montserrat font-black text-black mb-4 md:mb-6">
                acha tua corrida!
              </p>
              
              {/* Slogan da Marca */}
              <div className="inline-block badge-next-race font-montserrat">
                🍌 tem uma banana e uma medalha esperando por você 🏅
              </div>
            </div>

            {/* Banana Visual */}
            <div className="flex-shrink-0">
  <BananaHero size={180} className="md:w-[520px] md:h-[520px]" />
</div>
          </div>

          {/* Search Input */}
          <div className="mb-12 md:mb-16 mt-12">
            <input
              type="text"
              placeholder="busca por prova, cidade, estado..."
              className="w-full search-input text-lg md:text-2xl font-montserrat font-bold placeholder-gray-600 bg-white focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* RACES SECTION */}
      <section className="px-6 md:px-10 py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <ClientRacesList initialRaces={races} />
        </div>
      </section>
    </main>
  );
}
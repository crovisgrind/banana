// src/app/page.tsx

// FORÇA A RENDERIZAÇÃO DINÂMICA (SSR) PARA GARANTIR OS DADOS MAIS RECENTES
export const dynamic = 'force-dynamic'; 

import ClientRacesList from '@/components/ClientRacesList';
import BananaHero from '@/components/BananaHero';
import BananaPattern from '@/components/BananaPattern';
import { type Race } from '@/types/races';

async function getRaces(): Promise<Race[]> {
  try {
    // Base URL confiável para SSR + produção
    // O Next.js resolverá o fetch interno (Server Component -> API Route)
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // A chamada 'fetch' no Server Component usa o novo cache 'no-store'
    const response = await fetch(`${baseUrl}/api/races`); 

    if (!response.ok) {
      console.error('❌ Erro ao buscar /api/races:', response.status);
      // Retorna vazio em caso de erro
      return []; 
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ Erro em getRaces():', error);
    return [];
  }
}

export default async function Home() {
  const races = await getRaces();

  return (
    <main className="min-h-screen gradient-hero relative">
      {/* PADRÃO DE BANANAS NO HERO */}
      <BananaPattern />

      {/* HERO SECTION */}
      <section className="relative px-6 md:px-10 pt-12 md:pt-20 pb-16 md:pb-24 z-10">
        <div className="absolute inset-0 z-0 flex items-center justify-center md:justify-end">
          <BananaHero
            size={160}
            className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px]
                       rotate-[4deg] animate-float md:mr-20"
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-20">
          <div className="mb-8 md:mb-12">
            <h1
              className="title-hero font-black text-black 
                          drop-shadow-[8px_8px_0_rgba(255,255,255,0.9)] 
                          leading-[0.85] md:leading-[0.8] text-left"
            >
              <span className="block">BORA</span>
              <span className="block">BORA</span>
              <span className="block">BORA</span>
            </h1>
          </div>

          <p className="text-2xl md:text-4xl font-montserrat font-black text-black mb-4 md:mb-6">
            acha tua corrida!
          </p>

          <div className="inline-block badge-next-race font-montserrat">
            🌟 tem uma banana e uma medalha esperando por você 🥇
          </div>

          <div className="mb-12 md:mb-16 mt-12 w-full">
            <div className="flex gap-2 md:gap-3">
              <div className="relative flex-grow">
                <input
                  type="text"
                  id="searchInput"
                  placeholder="busca por prova, cidade, estado..."
                  className="w-full search-input text-base md:text-xl font-montserrat font-bold placeholder-gray-600 bg-white/95 backdrop-blur-sm focus:outline-none pl-12 pr-4 py-3 md:py-4"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl md:text-2xl pointer-events-none">
                  🔍
                </div>
              </div>

              <button
                id="searchBtn"
                className="btn-primary whitespace-nowrap px-4 md:px-8 py-3 md:py-4 text-base md:text-lg font-montserrat font-black flex items-center gap-1 md:gap-2 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
              >
                <span className="hidden md:inline">BORA!</span>
                <span className="md:hidden">GO!</span>
                <span className="text-lg md:text-xl">🌟</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* RACES SECTION */}
      <section className="relative px-6 md:px-10 py-12 md:py-20 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto relative z-20">
          <ClientRacesList initialRaces={races} />
        </div>
      </section>

      <footer className="relative py-8 bg-gradient-to-b from-white to-yellow-50 z-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-600 font-montserrat font-bold">
            🌟 BoraBoraBora - tem uma banana e uma medalha esperando por você
          </p>
        </div>
      </footer>

      {/* SEARCH SCRIPT */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('searchBtn')?.addEventListener('click', function() {
              const input = document.getElementById('searchInput');
              const value = input.value.trim();
              if (value) {
                console.log('🔍 Buscando:', value);
                input.value = '';
              }
            });

            document.getElementById('searchInput')?.addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                document.getElementById('searchBtn')?.click();
              }
            });
          `,
        }}
      />
    </main>
  );
}
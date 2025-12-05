// src/app/page.tsx
import ClientRacesList from '@/components/ClientRacesList';
import BananaHero from '@/components/BananaHero';
import BananaPattern from '@/components/BananaPattern';
import { type Race } from '@/types/races';
import * as fs from 'fs';
import * as path from 'path';

async function getRaces(): Promise<Race[]> {
  try {
    // ✅ Tenta chamar a API primeiro (em produção ela serve do arquivo)
    try {
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/races`, {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const races = await response.json();
        console.log(`✅ Carregado ${races.length} eventos da API`);
        return races;
      }
    } catch (apiError) {
      console.warn('⚠️ Falha na API, tentando arquivo local...');
    }

    // Fallback: arquivo local
    const jsonPath = path.join(process.cwd(), 'public', 'data', 'races.json');
    
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, 'utf-8');
      const races: Race[] = JSON.parse(data);
      console.log(`✅ Carregado ${races.length} eventos do arquivo local`);
      return races;
    }

    console.warn('⚠️ Nenhuma fonte de dados disponível');
    return [];
  } catch (error) {
    console.error('❌ Erro ao carregar races:', error);
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
        
        {/* Banana grande principal do hero */}
        <div className="absolute inset-0 z-0 flex items-center justify-center md:justify-end">
          <BananaHero
            size={160}
            className="w-[400px] h-[400px] md:w-[600px] md:h-[600px] lg:w-[800px] lg:h-[800px]
                       rotate-[4deg] animate-float md:mr-20"
          />
        </div>

        {/* Container principal */}
        <div className="max-w-7xl mx-auto relative z-20">
          
          {/* Título principal */}
          <div className="mb-8 md:mb-12">
            <h1 className="title-hero font-black text-black 
                          drop-shadow-[8px_8px_0_rgba(255,255,255,0.9)] 
                          leading-[0.85] md:leading-[0.8] text-left">
              <span className="block">BORA</span>
              <span className="block">BORA</span>
              <span className="block">BORA</span>
            </h1>
          </div>

          {/* SLOGAN */}
          <p className="text-2xl md:text-4xl font-montserrat font-black text-black mb-4 md:mb-6">
            acha tua corrida!
          </p>

          <div className="inline-block badge-next-race font-montserrat">
            🌟 tem uma banana e uma medalha esperando por você 🥇
          </div>

          {/* Search Input com Botão */}
          <div className="mb-12 md:mb-16 mt-12 w-full">
            <div className="flex gap-2 md:gap-3">
              {/* Input com ícone de lupa */}
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
              
              {/* Botão de Busca Principal */}
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

      {/* RACES SECTION COM PADRÃO DE BANANAS */}
      <section className="relative px-6 md:px-10 py-12 md:py-20 bg-white/95 backdrop-blur-sm z-10">
        {/* Padrão de bananas no background */}
        <svg
          className="fixed inset-0 w-full h-full pointer-events-none -z-10"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1000 1000"
        >
          <defs>
            {/* Padrão de banana minimalista */}
            <pattern
              id="bananaPattern"
              x="0"
              y="0"
              width="200"
              height="200"
              patternUnits="userSpaceOnUse"
            >
              {/* Banana 1 */}
              <g transform="translate(50, 50)">
                <path
                  d="M 10 5 Q 20 0 30 5 Q 35 8 32 15"
                  stroke="#FFE55C"
                  strokeWidth="3"
                  fill="none"
                  opacity="0.15"
                  strokeLinecap="round"
                />
              </g>

              {/* Banana 2 - rotacionada */}
              <g transform="translate(130, 80) rotate(45)">
                <path
                  d="M 10 5 Q 20 0 30 5 Q 35 8 32 15"
                  stroke="#F6C700"
                  strokeWidth="3"
                  fill="none"
                  opacity="0.12"
                  strokeLinecap="round"
                />
              </g>

              {/* Banana 3 */}
              <g transform="translate(80, 130) rotate(-30)">
                <path
                  d="M 10 5 Q 20 0 30 5 Q 35 8 32 15"
                  stroke="#FFE55C"
                  strokeWidth="3"
                  fill="none"
                  opacity="0.1"
                  strokeLinecap="round"
                />
              </g>

              {/* Círculo decorativo */}
              <circle
                cx="100"
                cy="100"
                r="8"
                fill="#FF7A29"
                opacity="0.08"
              />
            </pattern>

            {/* Gradiente sutil */}
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="50%" stopColor="#FFFEF5" stopOpacity="1" />
              <stop offset="100%" stopColor="#FFFAF0" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Background gradiente */}
          <rect width="1000" height="1000" fill="url(#bgGradient)" />

          {/* Padrão de bananas */}
          <rect width="1000" height="1000" fill="url(#bananaPattern)" />
        </svg>
        
        <div className="max-w-7xl mx-auto relative z-20">
          <ClientRacesList initialRaces={races} />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-8 bg-gradient-to-b from-white to-yellow-50 z-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-600 font-montserrat font-bold">
            🌟 BoraBoraBora - tem uma banana e uma medalha esperando por você
          </p>
        </div>
      </footer>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('searchBtn')?.addEventListener('click', function() {
              const input = document.getElementById('searchInput');
              const searchValue = input.value.trim();
              if (searchValue) {
                console.log('🔍 Buscando:', searchValue);
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
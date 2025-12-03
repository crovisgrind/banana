// src/app/page.tsx
import ClientRacesList from '@/components/ClientRacesList';
import { type Race } from '@/types/races';

async function getRaces(): Promise<Race[]> {
  try {
    // Endereço de loopback mais robusto para chamadas internas na Vercel
    const internalApiUrl = 'http://127.0.0.1:3000/api/races';

    // 🚨 CORREÇÃO CRÍTICA: cache: 'no-store'
    // Isso garante que o fetch NÃO seja resolvido estaticamente no build
    // e força a execução da função Serverless em tempo de renderização/requisição.
    const res = await fetch(internalApiUrl, {
      cache: 'no-store', // <--- NOVO
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
        console.error(`Falha no fetch (Server Component): ${res.status} ${res.statusText}`);
        return [];
    }
    const data: Race[] = await res.json();
    data.sort((a, b) => a.date.localeCompare(b.date));
    return data;
  } catch (error) {
    console.error('Erro ao buscar races:', error);
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
          acha tua corrida, porra!
        </p>

        <ClientRacesList initialRaces={races} />
      </div>
    </main>
  );
}
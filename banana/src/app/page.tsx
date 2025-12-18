import ClientRacesList from '@/components/ClientRacesList';
import { BananaIcon } from '@/components/RaceIcons';
import { type Race } from '@/types/races';

const BLOB_RACES_URL = 'https://l6gigqjmh87ogcuy.public.blob.vercel-storage.com/races/races.json';

export default async function Page() {
  const response = await fetch(BLOB_RACES_URL, { next: { revalidate: 3600 } });
  const races: Race[] = await response.json();

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <BananaIcon className="w-10 h-10 text-banana fill-current" />
            <h1 className="text-5xl font-black text-banana-text tracking-tighter">borabanana</h1>
            <BananaIcon className="w-10 h-10 text-banana fill-current rotate-180" />
          </div>
          <p className="text-banana-text/70 font-bold text-lg max-w-md mx-auto">
            Ganhe bananas e medalhas nas melhores corridas do Brasil! 🏃‍♂️🍌
          </p>
        </header>

        <ClientRacesList initialRaces={races} />
      </div>
    </main>
  );
}
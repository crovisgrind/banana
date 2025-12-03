'use client';

import { useState } from 'react';
import { type Race } from '@/types/races';

export default function ClientRacesList({ initialRaces }: { initialRaces: Race[] }) {
  const [search, setSearch] = useState('');

  const filtered = initialRaces.filter((race) =>
    race.title.toLowerCase().includes(search.toLowerCase()) ||
    race.location?.toLowerCase().includes(search.toLowerCase())
  );

  const rotates = ['rotate-6', '-rotate-6', 'rotate-3', '-rotate-3'];
  const colors = ['bg-pink-600', 'bg-yellow-400', 'bg-cyan-600', 'bg-lime-500'];

  return (
    <>
      {/* Campo de busca brutal */}
      <input
        type="text"
        placeholder="busca por prova, cidade, estado..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-10 text-4xl font-black placeholder-gray-600 bg-white border-8 border-black shadow-[25px_25px_0_black] mb-20 focus:outline-none"
      />

      {/* Grid das corridas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {filtered.length === 0 ? (
          <p className="col-span-full text-7xl font-black text-black text-center rotate-[-4deg]">
            nada encontrado, irmão...
          </p>
        ) : (
          filtered.map((race, i) => (
            <article
              key={race.title + race.date}
              className={`${colors[i % 4]} ${rotates[i % 4]} border-8 border-black p-10 shadow-[30px_30px_0_black] transition-all hover:rotate-0 hover:scale-105 md:hover:animate-none animate-float-mobile`}
            >
              <h2 className="text-5xl font-black text-black mb-4 leading-tight">
                {race.title}
              </h2>
              <time className="block text-3xl font-bold text-black mb-4">
                {new Date(race.date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
              <p className="text-2xl font-bold text-black mb-8">
                {race.location || 'Local não informado'}
              </p>
              {race.url && (
                <a
                  href={race.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-black text-white px-10 py-6 text-3xl font-black hover:bg-white hover:text-black transition-all border-4 border-black"
                >
                  INSCREVE LOGO
                </a>
              )}
            </article>
          ))
        )}
      </div>
    </>
  );
}
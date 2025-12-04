'use client';

import { useState } from 'react';
import { type Race } from '@/types/races';
import { 
  MedalIcon, 
  BananaIcon, 
  CalendarIcon, 
  LocationIcon 
} from './RaceIcons';

type DistanceFilter = 'all' | '5k' | '10k' | '21k' | '42k';

export default function ClientRacesList({ initialRaces }: { initialRaces: Race[] }) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<DistanceFilter>('all');
  const [selectedEstado, setSelectedEstado] = useState('');

  const estadosBrasil = [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
    "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
    "RS","RO","RR","SC","SP","SE","TO"
  ];

  // -----------------------------------
  //  🔥 ORDENAR POR DATA (mais próximas -> mais distantes)
  // -----------------------------------
  const sortByDate = (list: Race[]) => {
    return [...list].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  // -----------------------------------
  //  🧹 Ocultar corridas que já passaram
  // -----------------------------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Detecta distância pelo nome
  const detectDistance = (title: string): string | null => {
    const t = title.toLowerCase();
    if (t.includes('5k')) return '5k';
    if (t.includes('10k')) return '10k';
    if (t.includes('meia') || t.includes('21k') || t.includes('21 km')) return '21k';
    if (t.includes('maratona') || t.includes('42k') || t.includes('42 km')) return '42k';
    return null;
  };

  // -----------------------------------
  //  🔍 FILTRO PRINCIPAL:
  //     busca + distância + estado + remover passadas
  // -----------------------------------
  const filtered = sortByDate(initialRaces).filter((race) => {
    const raceDate = new Date(race.date);
    raceDate.setHours(0, 0, 0, 0);

    // ❌ Oculta corridas passadas
    if (raceDate < today) return false;

    const matchesSearch =
      race.title.toLowerCase().includes(search.toLowerCase()) ||
      race.location?.toLowerCase().includes(search.toLowerCase());

    const raceDistance = detectDistance(race.title);
    const matchesDistance =
      activeFilter === 'all' || raceDistance === activeFilter;

    const raceUF = race.state?.toUpperCase() || '';
    const matchesEstado =
      selectedEstado === '' || raceUF === selectedEstado;

    return matchesSearch && matchesDistance && matchesEstado;
  });

  // Destaque e demais corridas
  const featuredRace = filtered.length > 0 ? filtered[0] : null;
  const otherRaces = filtered.slice(1);

  // Cores rotativas
  const colors = ['bg-yellow-300', 'bg-pink-300', 'bg-cyan-300', 'bg-green-300'];
  const getColor = (i: number) => colors[i % colors.length];

  return (
    <>
      {/* ------------------------------ */}
      {/* 🔥 FILTROS */}
      {/* ------------------------------ */}
      <div className="filter-bar flex flex-wrap gap-3 items-center mb-10">

        <span className="font-montserrat font-bold text-black text-lg hidden md:inline">
          Filtrar:
        </span>

        {/* Filtro por distância */}
        {(['all', '5k', '10k', '21k', '42k'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
          >
            {filter === 'all' ? 'Todas' : filter.toUpperCase()}
          </button>
        ))}

        {/* 👉 Filtro de Estado */}
        <select
          value={selectedEstado}
          onChange={(e) => setSelectedEstado(e.target.value)}
          className="border border-black px-3 py-2 font-bold rounded-md bg-white"
        >
          <option value="">Todos os Estados</option>
          {estadosBrasil.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </div>

      {/* ------------------------------ */}
      {/* 🥇 CARD DESTAQUE */}
      {/* ------------------------------ */}
      {featuredRace && (
        <article className="card-featured mb-12 md:mb-20 animate-glow animate-shake group">
          <div className="card-featured-content">
            <div className="badge-next-race font-montserrat animate-pulse-badge">
              🏁 PRÓXIMA CORRIDA
            </div>

            <h2 className="title-card text-black">{featuredRace.title}</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-lg md:text-xl font-montserrat font-bold text-black">
                <CalendarIcon className="w-6 h-6 md:w-7 md:h-7 text-black animate-pop-hover" />
                <time>
                  {new Date(featuredRace.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
              </div>

              <div className="flex items-center gap-3 text-lg md:text-xl font-montserrat font-bold text-black">
                <LocationIcon className="w-6 h-6 md:w-7 md:h-7 text-black animate-pop-hover" />
                <p>{featuredRace.location || 'Local não informado'}</p>
              </div>
            </div>

            {featuredRace.url && (
              <a
                href={featuredRace.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-4 inline-block w-fit hover:scale-110 group"
              >
                <span className="flex items-center gap-2">
                  <BananaIcon className="w-5 h-5 animate-bounce-hover" />
                  INSCREVE LOGO
                  <MedalIcon className="w-5 h-5 animate-bounce-hover" />
                </span>
              </a>
            )}
          </div>

          <div className="card-featured-visual">
            <div className="text-6xl md:text-7xl">🏃‍♂️</div>
          </div>
        </article>
      )}

      {/* ------------------------------ */}
      {/* 🏁 GRID DE OUTRAS CORRIDAS */}
      {/* ------------------------------ */}
      {otherRaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {otherRaces.map((race, i) => (
            <article
              key={race.title + race.date}
              className={`${getColor(i)} card-race animate-float-mobile`}
            >
              <h2 className="title-card text-black mb-4">{race.title}</h2>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-lg font-montserrat font-bold text-black">
                  <CalendarIcon className="w-5 h-5 text-black animate-pop-hover" />
                  <time>
                    {new Date(race.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                </div>

                <div className="flex items-center gap-2 text-lg font-montserrat font-bold text-black">
                  <LocationIcon className="w-5 h-5 text-black animate-pop-hover" />
                  <p>{race.location || 'Local não informado'}</p>
                </div>
              </div>

              {race.url && (
                <a
                  href={race.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary block text-center w-full"
                >
                  INSCREVE
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="empty-state-text mb-4">
            sem bananas por aqui,<br />irmão...
          </p>
          <p className="text-2xl font-montserrat font-bold text-gray-600">
            tenta outra busca aí 🔍
          </p>
        </div>
      )}
    </>
  );
}

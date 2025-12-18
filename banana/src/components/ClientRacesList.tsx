'use client';

import { useState } from 'react';
import { type Race } from '@/types/races';
import { Calendar, MapPin, ArrowRight, Filter } from 'lucide-react';

export default function ClientRacesList({ initialRaces }: { initialRaces: Race[] }) {
  const [selectedEstado, setSelectedEstado] = useState('');
  const estadosBrasil = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  const filteredRaces = initialRaces.filter(race => 
    selectedEstado === '' || race.state === selectedEstado
  );

  return (
    <div className="w-full">
      {/* Filtro Arredondado */}
      <div className="flex flex-col items-center mb-12">
        <div className="relative w-full max-w-xs">
          <select 
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full h-12 px-6 rounded-full border-2 border-banana bg-white text-banana-text font-bold appearance-none text-center cursor-pointer shadow-sm focus:ring-2 ring-banana/20 outline-none"
          >
            <option value="">Brasil (Todos)</option>
            {estadosBrasil.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          <Filter className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-banana pointer-events-none" />
        </div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {filteredRaces.length} provas encontradas
        </p>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRaces.map((race) => (
          <article 
            key={race.url} 
            className="group bg-white rounded-[2.5rem] border border-black/5 flex flex-col transition-all duration-300 shadow-sm hover:shadow-2xl hover:scale-105"
          >
            {/* Header Amarelo */}
            <div className="bg-banana px-8 py-5 rounded-t-[2.5rem]">
              <h2 className="font-extrabold text-banana-text text-lg leading-tight truncate">
                {race.title}
              </h2>
            </div>
            
            {/* Informações */}
            <div className="p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3 text-banana-text/80 font-bold text-sm">
                <Calendar className="w-5 h-5 text-banana shrink-0" strokeWidth={2.5} />
                <span>{new Date(race.date).toLocaleDateString('pt-BR')}</span>
              </div>
              
              <div className="flex items-center gap-3 text-banana-text/80 font-bold text-sm">
                <MapPin className="w-5 h-5 text-banana shrink-0" strokeWidth={2.5} />
                <span className="truncate">{race.location || 'Local'}, {race.state}</span>
              </div>

              {/* Tags de Distância (Cápsulas Amarelas como o Header) */}
              <div className="flex flex-wrap gap-2 mt-2">
                {race.distances.map((dist) => (
                  <span 
                    key={dist} 
                    className="bg-banana text-banana-text text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase border border-black/5"
                  >
                    {dist}
                  </span>
                ))}
              </div>

              {/* Botão de Ação */}
              <a 
                href={race.url} 
                target="_blank" 
                className="mt-4 flex items-center justify-between bg-banana-text text-white font-black text-[11px] px-6 py-4 rounded-2xl group-hover:bg-black transition-colors"
              >
                QUERO CORRER
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
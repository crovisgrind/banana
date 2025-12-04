// src/components/SearchBar.tsx
'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch?: (searchTerm: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    if (searchTerm.trim()) {
      console.log(`🔍 Buscando: "${searchTerm}"`);
      if (onSearch) {
        onSearch(searchTerm);
      }
      // Aqui você pode adicionar lógica de busca ou scroll
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setSearchTerm('');
  };

  return (
    <div className="mb-12 md:mb-16 mt-12 w-full">
      <div className="flex gap-2 md:gap-3">
        {/* Input com ícone de lupa */}
        <div className="relative flex-grow">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="busca por prova, cidade, estado..."
            className="w-full search-input text-base md:text-xl font-montserrat font-bold placeholder-gray-600 bg-white/95 backdrop-blur-sm focus:outline-none pl-12 pr-4 py-3 md:py-4"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl md:text-2xl pointer-events-none">
            🔍
          </div>
          
          {/* Botão X para limpar (aparece quando tem texto) */}
          {searchTerm && (
            <button
              onClick={handleClear}
              className="absolute right-14 md:right-16 top-1/2 transform -translate-y-1/2 text-xl hover:scale-125 transition-transform"
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Botão de Busca Principal */}
        <button
          onClick={handleSearch}
          disabled={!searchTerm.trim()}
          className={`btn-primary whitespace-nowrap px-4 md:px-8 py-3 md:py-4 text-base md:text-lg font-montserrat font-black flex items-center gap-1 md:gap-2 hover:scale-105 active:scale-95 transition-transform duration-200 ${
            !searchTerm.trim() ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <span className="hidden md:inline">BORA!</span>
          <span className="md:hidden">GO!</span>
          <span className="text-lg md:text-xl">🍌</span>
        </button>
      </div>

      {/* Dica subtle para o usuário */}
      {!searchTerm && (
        <p className="text-xs md:text-sm font-montserrat text-gray-500 mt-3 text-center md:text-left">
          💡 dica: escreve aí e clica em BORA pra encontrar tua corrida!
        </p>
      )}
    </div>
  );
}
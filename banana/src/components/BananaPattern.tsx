// src/components/BananaPattern.tsx - VERSÃO CORRIGIDA
'use client';

import { useEffect, useState } from 'react';

export default function BananaPattern() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden opacity-20">
      {/* Pattern usando background-image */}
      <div className="absolute inset-0 banana-pattern-bg"></div>
      
      {/* Bananas flutuantes grandes */}
      <div 
        className="absolute top-1/4 left-10 text-yellow-300/30 text-9xl animate-float-slow"
      >
        🍌
      </div>
      <div 
        className="absolute bottom-1/3 right-20 text-yellow-400/20 text-7xl animate-float"
        style={{ animationDelay: '1.5s' }}
      >
        🍌
      </div>
      <div 
        className="absolute top-1/2 left-1/3 text-yellow-500/15 text-8xl animate-float-slow"
        style={{ animationDelay: '3s' }}
      >
        🍌
      </div>
    </div>
  );
}
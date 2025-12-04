// app/api/races/route.ts - VERSÃO SIMPLIFICADA (apenas lê JSON estático)

import { unstable_noStore as noStore } from 'next/cache';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { type Race } from '@/types/races';

// -----------------------------------------------------------------
// FUNÇÃO PRINCIPAL - Lê JSON estático
// -----------------------------------------------------------------
export async function GET(request: Request) {
  noStore();

  try {
    console.log(">>>> [API] GET /api/races iniciada");
    
    // Tenta ler o JSON estático
    const jsonPath = path.join(process.cwd(), 'public', 'data', 'races.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.warn("[API] races.json não encontrado. Execute: npm run generate-races");
      return NextResponse.json(
        { 
          message: "races.json não gerado ainda. Execute o cron job.",
          races: []
        },
        { status: 202 }
      );
    }

    // Lê e retorna o JSON
    const data = fs.readFileSync(jsonPath, 'utf-8');
    const races: Race[] = JSON.parse(data);

    console.log(`[API] ✅ Retornando ${races.length} eventos do races.json`);

    return NextResponse.json(races);

  } catch (error) {
    console.error("[API] ❌ Erro ao ler races.json:", error);

    return new Response(
      JSON.stringify({
        message: "Erro ao processar as corridas",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
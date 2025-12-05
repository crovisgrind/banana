// src/app/api/races/route.ts

import { NextResponse } from 'next/server';
import { list } from '@vercel/blob'; // Usamos 'list' para encontrar o URL do Blob

// FORÇA A NÃO-CACHE da função Serverless no CDN
export const dynamic = 'force-dynamic'; 

const BLOB_FILE_NAME = 'races/races.json'; 

export async function GET() {
  try {
    // 1. Busca o URL do arquivo Blob pelo nome, sem o parâmetro 'mode'.
    // O 'list' retorna os metadados por padrão, incluindo o URL.
    const { blobs } = await list({ prefix: BLOB_FILE_NAME });

    if (blobs.length === 0) {
        console.error(`❌ Blob ${BLOB_FILE_NAME} não encontrado. O crawler rodou?`);
        return NextResponse.json([], { status: 200 });
    }

    // 2. O array 'blobs' contém todos os Blobs com o prefixo. Pegamos o primeiro (e único, se for só este arquivo)
    const blobUrl = blobs[0].url; 
    
    // 3. Faz o fetch nativo usando o URL público
    const response = await fetch(blobUrl);

    if (!response.ok) {
        console.error(`❌ Erro ao buscar o Blob: ${response.statusText}`);
        return NextResponse.json([], { status: 200 });
    }

    // 4. Extrai o conteúdo
    const dataText = await response.text(); 
    const races = JSON.parse(dataText);

    return NextResponse.json(races);
  } catch (error) {
    console.error('⚠️ Erro ao ler dados do Vercel Blob:', error);
    return NextResponse.json([], { status: 200 }); 
  }
}
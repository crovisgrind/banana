import races from '@/data/races.json';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json(races);
  } catch (error) {
    console.error("Erro ao carregar races.json:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export const revalidate = 0;

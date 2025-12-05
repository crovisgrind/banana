// lib/storage.ts

import { kv } from '@vercel/kv';

const RACES_KEY = 'races:data';

/**
 * Salva as corridas no Vercel KV
 */
export async function saveRacesToKV(races: any[]) {
  try {
    await kv.set(RACES_KEY, JSON.stringify(races));
    console.log(`✅ Salvo ${races.length} corridas no KV`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar no KV:', error);
    throw error;
  }
}

/**
 * Recupera as corridas do Vercel KV
 */
export async function getRacesFromKV() {
  try {
    const data = await kv.get(RACES_KEY);
    if (!data) {
      console.warn('⚠️ Nenhuma corrida encontrada no KV');
      return [];
    }
    const races = JSON.parse(data as string);
    console.log(`✅ Recuperado ${races.length} corridas do KV`);
    return races;
  } catch (error) {
    console.error('❌ Erro ao recuperar do KV:', error);
    return [];
  }
}

/**
 * Deleta as corridas do KV (para debug/reset)
 */
export async function deleteRacesFromKV() {
  try {
    await kv.del(RACES_KEY);
    console.log('✅ Corridas deletadas do KV');
    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar do KV:', error);
    return false;
  }
}
// src/utils/dateUtils.ts

/**
 * Converte string de data (YYYY-MM-DD) para Date sem ajustes de timezone
 * Isso evita que o JS interprete a data em UTC
 * 
 * ⚠️ IMPORTANTE: Use SEMPRE essa função ao invés de new Date('2025-01-06')
 * porque new Date() interpreta como UTC, causando -1 dia em algumas timezones
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Cria data com valores locais, não UTC
  return new Date(year, month - 1, day);
}

/**
 * Formata data para exibição em português brasileiro
 * Ex: "6 de janeiro de 2025"
 */
export function formatDatePT(date: Date | string): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = parseLocalDate(date);
  } else {
    dateObj = date;
  }

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };

  return dateObj.toLocaleDateString('pt-BR', options);
}

/**
 * Formata data para exibição curta
 * Ex: "06 JAN"
 */
export function formatDateShort(date: Date | string): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = parseLocalDate(date);
  } else {
    dateObj = date;
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();

  return `${day} ${month}`;
}

/**
 * Retorna nome do dia da semana em português
 * Ex: "terça-feira"
 */
export function getDayNamePT(date: Date | string): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = parseLocalDate(date);
  } else {
    dateObj = date;
  }

  const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  return days[dateObj.getDay()];
}
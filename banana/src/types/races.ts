export interface Race {
  title: string;
  date: string;        // vem como string do crawler, vira ISO no normalize
  location?: string;
  link?: string;
  modality?: string;   // se tiver
  distance?: string;   // se tiver
  // adiciona os campos que seu crawler retorna
}
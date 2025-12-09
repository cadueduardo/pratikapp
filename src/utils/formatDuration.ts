/**
 * Formata duração em milissegundos para formato legível (MM:SS ou HH:MM:SS)
 * @param durationMillis - Duração em milissegundos
 * @returns String formatada (ex: "1:30" ou "1:05:30")
 */
export const formatDuration = (durationMillis: string | number): string => {
  const milliseconds = typeof durationMillis === 'string' ? parseInt(durationMillis, 10) : durationMillis;
  const totalSeconds = Math.floor(milliseconds / 1000);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Formata duração em segundos para formato legível
 * @param durationSeconds - Duração em segundos
 * @returns String formatada (ex: "1:30" ou "1:05:30")
 */
export const formatDurationFromSeconds = (durationSeconds: number): string => {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = Math.floor(durationSeconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};


/**
 * Valida se uma string é uma URL válida do Google Drive
 * @param url - URL a ser validada
 * @returns true se for uma URL válida do Google Drive
 */
export const isValidGoogleDriveUrl = (url: string): boolean => {
  if (!url.trim()) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    
    // Aceita URLs do Google Drive (drive.google.com)
    const validDomains = ['drive.google.com', 'docs.google.com'];
    if (!validDomains.includes(urlObj.hostname)) {
      return false;
    }

    // Verifica se é um link de arquivo ou pasta
    // Formato: https://drive.google.com/file/d/FILE_ID/view
    // ou: https://drive.google.com/open?id=FILE_ID
    // ou: https://docs.google.com/document/d/FILE_ID/edit
    const pathname = urlObj.pathname;
    const hasId = urlObj.searchParams.has('id') || pathname.includes('/d/');
    
    return hasId;
  } catch {
    // Se não for uma URL válida
    return false;
  }
};

/**
 * Valida se uma string é uma URL válida
 * @param url - URL a ser validada
 * @returns true se for uma URL válida
 */
export const isValidUrl = (url: string): boolean => {
  if (!url.trim()) {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Valida se uma string é um email válido
 * @param email - Email a ser validado
 * @returns true se for um email válido
 */
export const isValidEmail = (email: string): boolean => {
  if (!email.trim()) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};









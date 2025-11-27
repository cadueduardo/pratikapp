/**
 * Mensagens de erro padronizadas e amigáveis para o usuário
 */

export const ErrorMessages = {
  // Autenticação
  AUTH_INVALID_CREDENTIALS: 'E-mail ou senha incorretos. Verifique suas credenciais.',
  AUTH_EMAIL_ALREADY_EXISTS: 'Este e-mail já está cadastrado. Tente fazer login ou recuperar sua senha.',
  AUTH_WEAK_PASSWORD: 'A senha deve ter pelo menos 6 caracteres.',
  AUTH_INVALID_EMAIL: 'Informe um e-mail válido.',
  AUTH_NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',

  // Vídeos
  VIDEO_NOT_FOUND: 'Vídeo não encontrado.',
  VIDEO_CREATE_ERROR: 'Erro ao criar agendamento. Tente novamente.',
  VIDEO_UPDATE_ERROR: 'Erro ao atualizar agendamento. Tente novamente.',
  VIDEO_DELETE_ERROR: 'Erro ao remover agendamento. Tente novamente.',
  VIDEO_LOAD_ERROR: 'Erro ao carregar agendamentos. Tente recarregar a página.',

  // Plataformas
  PLATFORM_NOT_FOUND: 'Plataforma não encontrada.',
  PLATFORM_CREATE_ERROR: 'Erro ao adicionar plataforma. Tente novamente.',
  PLATFORM_UPDATE_ERROR: 'Erro ao atualizar plataforma. Tente novamente.',
  PLATFORM_DELETE_ERROR: 'Erro ao remover plataforma. Tente novamente.',
  PLATFORM_LOAD_ERROR: 'Erro ao carregar plataformas. Tente recarregar a página.',

  // Posts
  POST_LOAD_ERROR: 'Erro ao carregar postagens. Tente recarregar a página.',

  // Perfil
  PROFILE_UPDATE_ERROR: 'Erro ao atualizar perfil. Tente novamente.',

  // Dashboard
  DASHBOARD_LOAD_ERROR: 'Erro ao carregar dados do dashboard. Tente recarregar a página.',

  // Geral
  NETWORK_ERROR: 'Erro de conexão com o servidor. Verifique sua internet.',
  UNKNOWN_ERROR: 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
  UNAUTHORIZED: 'Você não tem permissão para realizar esta ação.',
  FORBIDDEN: 'Acesso negado. Faça login novamente.',
} as const;

/**
 * Mapeia erros do Supabase para mensagens amigáveis
 */
export const mapSupabaseError = (error: Error | null | undefined): string => {
  if (!error) {
    return ErrorMessages.UNKNOWN_ERROR;
  }

  const errorMessage = error.message.toLowerCase();

  // Erros de autenticação
  if (errorMessage.includes('invalid login credentials') || errorMessage.includes('email not confirmed')) {
    return ErrorMessages.AUTH_INVALID_CREDENTIALS;
  }

  if (errorMessage.includes('user already registered') || errorMessage.includes('email already exists')) {
    return ErrorMessages.AUTH_EMAIL_ALREADY_EXISTS;
  }

  if (errorMessage.includes('password')) {
    return ErrorMessages.AUTH_WEAK_PASSWORD;
  }

  // Erros de rede
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return ErrorMessages.NETWORK_ERROR;
  }

  // Erros de autorização
  if (errorMessage.includes('unauthorized') || errorMessage.includes('jwt')) {
    return ErrorMessages.UNAUTHORIZED;
  }

  if (errorMessage.includes('forbidden') || errorMessage.includes('permission')) {
    return ErrorMessages.FORBIDDEN;
  }

  // Retorna a mensagem original se não houver mapeamento específico
  return error.message || ErrorMessages.UNKNOWN_ERROR;
};









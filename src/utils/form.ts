export const formatSupabaseError = (message: string) => {
  if (message.includes('Invalid login credentials')) {
    return 'Credenciais inválidas. Verifique o e-mail e a senha.';
  }
  if (message.includes('User already registered')) {
    return 'Este e-mail já está cadastrado. Tente fazer login ou recupere sua senha.';
  }
  return message;
};










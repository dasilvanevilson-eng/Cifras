export function validatePassword(password) {
  const value = String(password || '');

  if (value.length < 6) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'A senha deve conter letras e numeros.';
  }

  return '';
}

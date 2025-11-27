import { FormHelperText } from '@mui/material';

interface CharacterCounterProps {
  current: number;
  max: number;
  min?: number;
  showMin?: boolean;
}

/**
 * Componente para exibir contador de caracteres
 * Útil para campos de texto com limite
 */
export const CharacterCounter = ({
  current,
  max,
  min = 0,
  showMin = false,
}: CharacterCounterProps) => {
  const isOverLimit = current > max;
  const isUnderMin = showMin && current < min;
  const remaining = max - current;

  return (
    <FormHelperText
      error={isOverLimit || isUnderMin}
      sx={{
        textAlign: 'right',
        mt: 0.5,
        fontSize: '0.75rem',
      }}
    >
      {isOverLimit
        ? `Excedeu o limite de ${max} caracteres`
        : isUnderMin
          ? `Mínimo de ${min} caracteres (faltam ${min - current})`
          : `${current}/${max}${showMin ? ` (mín: ${min})` : ''} ${remaining <= 10 ? `- ${remaining} restantes` : ''}`}
    </FormHelperText>
  );
};









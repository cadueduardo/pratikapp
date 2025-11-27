import type { PaletteMode } from '@mui/material';
import { createContext } from 'react';

export interface ColorModeContextValue {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

export const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggleColorMode: () => undefined,
});

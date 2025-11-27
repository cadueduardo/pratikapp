import type { PaletteMode } from '@mui/material';
import { CssBaseline, ThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import type { PropsWithChildren } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { ColorModeContext } from './ColorModeContext';

const STORAGE_KEY = 'pratikapp:color-mode';

const getStoredMode = (): PaletteMode | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (error) {
    console.warn('Não foi possível acessar o localStorage para ler o tema.', error);
  }
  return null;
};

export const AppThemeProvider = ({ children }: PropsWithChildren) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<PaletteMode>('light');

  useEffect(() => {
    const storedMode = getStoredMode();
    if (storedMode) {
      setMode(storedMode);
      return;
    }

    setMode(prefersDarkMode ? 'dark' : 'light');
  }, [prefersDarkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.warn('Não foi possível salvar o tema no localStorage.', error);
    }
  }, [mode]);

  const toggleColorMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#1565d8', // Azul primário do Figma
            light: '#2188e7', // Azul claro do Figma
          },
          secondary: {
            main: '#5a7184', // Texto secundário do Figma
          },
          text: {
            primary: mode === 'dark' ? '#ffffff' : '#183b56', // Branco no dark, escuro no light
            secondary: mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#5a7184', // Branco translúcido no dark, cinza no light
          },
        },
        shape: {
          borderRadius: 8, // Baseado no design do Figma (8px)
        },
        typography: {
          fontFamily: "'Open Sans', 'Inter', 'Segoe UI', sans-serif",
          h1: {
            fontFamily: "'Hanken Grotesk', 'Open Sans', sans-serif",
            fontWeight: 700,
            letterSpacing: 0.2,
          },
          h2: {
            fontFamily: "'Hanken Grotesk', 'Open Sans', sans-serif",
            fontWeight: 700,
            letterSpacing: 0.2,
          },
          h3: {
            fontFamily: "'Hanken Grotesk', 'Open Sans', sans-serif",
            fontWeight: 700,
            letterSpacing: 0.2,
          },
          h4: {
            fontFamily: "'Hanken Grotesk', 'Open Sans', sans-serif",
            fontWeight: 700,
            letterSpacing: 0.2,
          },
          h5: {
            fontFamily: "'Hanken Grotesk', 'Open Sans', sans-serif",
            fontWeight: 700,
            letterSpacing: 0.2,
          },
          h6: {
            fontFamily: "'Hanken Grotesk', 'Open Sans', sans-serif",
            fontWeight: 700,
            letterSpacing: 0.2,
          },
          body1: {
            fontFamily: "'Open Sans', sans-serif",
            fontWeight: 400,
          },
          body2: {
            fontFamily: "'Open Sans', sans-serif",
            fontWeight: 400,
          },
          button: {
            fontFamily: "'Open Sans', sans-serif",
            fontWeight: 700,
            textTransform: 'none',
          },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 8,
                fontWeight: 700,
                padding: '14px 24px',
                fontSize: '16px',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16, // Baseado nos cards do Figma
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

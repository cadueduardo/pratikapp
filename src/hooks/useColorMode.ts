import { useContext } from 'react';

import { ColorModeContext } from '@/theme/ColorModeContext';

export const useColorMode = () => useContext(ColorModeContext);

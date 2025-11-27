import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { NavigationDrawer } from '@/components/navigation';
import { useColorMode } from '@/hooks/useColorMode';

export const AppLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { mode, toggleColorMode } = useColorMode();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerToggle = () => {
    setDrawerOpen((prev) => !prev);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.default,
      }}
    >
      <AppBar position="sticky" elevation={0} color="primary">
        <Toolbar
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="Menu principal"
              size={isMobile ? 'small' : 'medium'}
              onClick={handleDrawerToggle}
            >
              <MenuRoundedIcon />
            </IconButton>
            <Typography
              variant={isMobile ? 'subtitle1' : 'h6'}
              component="span"
              sx={{ fontWeight: 600 }}
            >
              pratikapp
            </Typography>
          </Box>
          <IconButton
            color="inherit"
            aria-label={mode === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            onClick={toggleColorMode}
            size={isMobile ? 'small' : 'medium'}
          >
            {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <NavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <Container
          component="main"
          maxWidth="lg"
          sx={{
            flexGrow: 1,
            width: '100%',
            py: { xs: 2, md: 4 },
            transition: theme.transitions.create(['margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            ...(!isMobile &&
              drawerOpen && {
                marginLeft: '280px',
                transition: theme.transitions.create(['margin'], {
                  easing: theme.transitions.easing.easeOut,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              }),
          }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

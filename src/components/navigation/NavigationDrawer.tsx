import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

const DRAWER_WIDTH = 280;

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
    requiresAuth: true,
  },
  {
    label: 'Agendamentos',
    path: '/schedules',
    icon: <ScheduleIcon />,
    requiresAuth: true,
  },
  {
    label: 'Configurações',
    path: '/settings',
    icon: <SettingsIcon />,
    requiresAuth: true,
  },
];

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const NavigationDrawer = ({ open, onClose }: NavigationDrawerProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
    if (isMobile) {
      onClose();
    }
  };

  const drawerContent = (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
        }}
      >
        <ListItemText
          primary="pratikapp"
          primaryTypographyProps={{
            variant: 'h6',
            fontWeight: 600,
          }}
        />
        <IconButton
          edge="end"
          onClick={onClose}
          aria-label="Fechar menu"
          size="small"
          sx={{ ml: 1 }}
        >
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      {user && (
        <>
          <List>
            {navigationItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleNavigation(item.path)}
                >
                  <ListItemIcon
                    sx={{
                      color: location.pathname === item.path ? 'primary.main' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Sair" />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}
    </>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      open={open}
      onClose={onClose}
      sx={{
        width: open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};


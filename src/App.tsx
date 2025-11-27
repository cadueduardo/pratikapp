import { RouterProvider } from 'react-router-dom';

import { NotificationProvider } from '@/components/common';
import { AuthProvider } from '@/hooks/useAuth';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { router } from '@/routes/router';
import { AppThemeProvider } from '@/theme/AppThemeProvider';

const App = () => {
  useServiceWorker();

  return (
    <AppThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </NotificationProvider>
    </AppThemeProvider>
  );
};

export default App;

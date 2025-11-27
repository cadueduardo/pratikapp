import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/layouts/AppLayout';
import { ForgotPasswordPage, LoginPage, SignupPage } from '@/pages/auth';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { HomePage } from '@/pages/home/HomePage';
import { OAuthCallbackPage } from '@/pages/oauth/OAuthCallbackPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { SchedulesCalendarPage } from '@/pages/schedules/SchedulesCalendarPage';
import { NewSchedulePage } from '@/pages/schedules/NewSchedulePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { VideoDetailsPage } from '@/pages/videos/VideoDetailsPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'schedules',
            children: [
              {
                index: true,
                element: <SchedulesCalendarPage />,
              },
              {
                path: 'new',
                element: <NewSchedulePage />,
              },
              {
                path: ':id/edit',
                element: <NewSchedulePage />,
              },
            ],
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: 'videos/:id',
            element: <VideoDetailsPage />,
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <NotFoundPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
    errorElement: <NotFoundPage />,
  },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
        errorElement: <NotFoundPage />,
      },
      {
        path: '/oauth/callback/:platform',
        element: <OAuthCallbackPage />,
        errorElement: <NotFoundPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
]);

import { createBrowserRouter } from 'react-router'
import { FullPageSpinner } from '@/components/ui/States'
import { RequireAdmin } from '@/features/admin/RequireAdmin'
import { GuestOnly, RequireAuth, RequireProfile } from '@/features/auth/guards'
import { HomeRoute } from './HomeRoute'
import { NotFoundPage } from './NotFoundPage'
import { RootLayout } from './RootLayout'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      { path: '/', element: <HomeRoute /> },
      {
        element: <GuestOnly />,
        children: [
          {
            path: '/login',
            lazy: () => import('@/features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })),
          },
          {
            path: '/signup',
            lazy: () => import('@/features/auth/SignupPage').then((m) => ({ Component: m.SignupPage })),
          },
          {
            path: '/forgot-password',
            lazy: () =>
              import('@/features/auth/ForgotPasswordPage').then((m) => ({
                Component: m.ForgotPasswordPage,
              })),
          },
        ],
      },
      {
        path: '/reset-password',
        lazy: () =>
          import('@/features/auth/ResetPasswordPage').then((m) => ({
            Component: m.ResetPasswordPage,
          })),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/onboarding',
            lazy: () =>
              import('@/features/profile/OnboardingPage').then((m) => ({
                Component: m.OnboardingPage,
              })),
          },
          {
            element: <RequireProfile />,
            children: [
              {
                path: '/connect/:eventId',
                lazy: () => import('@/features/connect/ConnectPage').then((m) => ({ Component: m.ConnectPage })),
              },
              {
                path: '/profile',
                lazy: () =>
                  import('@/features/profile/ProfilePage').then((m) => ({
                    Component: m.ProfilePage,
                  })),
              },
              {
                element: <RequireAdmin />,
                children: [
                  {
                    path: '/admin',
                    lazy: () =>
                      import('@/features/admin/AdminLayout').then((m) => ({
                        Component: m.AdminLayout,
                      })),
                    children: [
                      {
                        index: true,
                        lazy: () =>
                          import('@/features/admin/AdminQueuePage').then((m) => ({
                            Component: m.AdminQueuePage,
                          })),
                      },
                      {
                        path: 'events/:eventId/host',
                        lazy: () =>
                          import('@/features/host/HostConsolePage').then((m) => ({
                            Component: m.HostConsolePage,
                          })),
                      },
                      {
                        path: 'reports',
                        lazy: () => import('@/features/admin/ReportsPage').then((m) => ({ Component: m.ReportsPage })),
                      },
                      {
                        path: 'contacts',
                        lazy: () =>
                          import('@/features/admin/ContactsPage').then((m) => ({
                            Component: m.ContactsPage,
                          })),
                      },
                    ],
                  },
                  {
                    path: '/screen/:eventId',
                    lazy: () => import('@/features/screen/ScreenPage').then((m) => ({ Component: m.ScreenPage })),
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: '/privacy', lazy: () => import('@/features/legal/PrivacyPage').then((m) => ({ Component: m.PrivacyPage })) },
      { path: '/terms', lazy: () => import('@/features/legal/TermsPage').then((m) => ({ Component: m.TermsPage })) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

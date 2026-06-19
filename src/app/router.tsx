import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { RequestListPage } from '../features/credit-payment-term/pages/RequestListPage'
import { RequestDetailPage } from '../features/credit-payment-term/pages/RequestDetailPage'
import { CreateRequestPage } from '../features/credit-payment-term/pages/CreateRequestPage'
import { EditRequestPage } from '../features/credit-payment-term/pages/EditRequestPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/requests" replace /> },
      { path: 'requests', element: <RequestListPage /> },
      { path: 'requests/new', element: <CreateRequestPage /> },
      { path: 'requests/:id', element: <RequestDetailPage /> },
      { path: 'requests/:id/edit', element: <EditRequestPage /> },
    ],
  },
])

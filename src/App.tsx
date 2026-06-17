import { RouterProvider } from 'react-router-dom'
import { UserProvider } from './app/UserContext'
import { router } from './app/router'

export default function App() {
  return (
    <UserProvider>
      <RouterProvider router={router} />
    </UserProvider>
  )
}

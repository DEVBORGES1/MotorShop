import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { router } from '@/routes/index.jsx';

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

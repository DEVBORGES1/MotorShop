import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { StoreProvider } from '@/contexts/StoreContext.jsx';
import { router } from '@/routes/index.jsx';

export function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <RouterProvider router={router} />
      </StoreProvider>
    </AuthProvider>
  );
}

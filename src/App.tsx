import { useState } from 'react';
import Storefront from './components/Storefront';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [isAdminView, setIsAdminView] = useState(false);

  if (isAdminView) {
    return <AdminPanel onBackToStore={() => setIsAdminView(false)} />;
  }

  return <Storefront onAdminClick={() => setIsAdminView(true)} />;
}

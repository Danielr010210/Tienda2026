/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Storefront from './components/Storefront';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [view, setView] = useState<'store' | 'admin'>('store');
  const [productsRefresher, setProductsRefresher] = useState<number>(0);

  // Triggered when anything updates inside the Admin dashboard, updating storefront pricing/visibility/inventories
  const handleProductsUpdated = () => {
    setProductsRefresher(prev => prev + 1);
  };

  return (
    <>
      {view === 'store' ? (
        <Storefront 
          onAdminOpen={() => setView('admin')} 
          productsRefresher={productsRefresher}
        />
      ) : (
        <AdminPanel 
          onClose={() => setView('store')} 
          onProductsUpdated={handleProductsUpdated}
        />
      )}
    </>
  );
}


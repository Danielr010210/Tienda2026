import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.error('No Supabase credentials found in env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkTable(tableName: string) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      return { exists: false, error: error.message };
    }
    return { exists: true, count: data?.length || 0 };
  } catch (e: any) {
    return { exists: false, error: e.message };
  }
}

async function run() {
  const tables = [
    'shop_settings',
    'products',
    'workers',
    'orders',
    'audit_logs',
    'security_alerts',
    'visitor_history',
    'coupons',
    'product_reviews',
    'support_inquiries',
    'product_categories'
  ];

  console.log('Checking database tables status:');
  for (const table of tables) {
    const res = await checkTable(table);
    if (res.exists) {
      console.log(`- Table "${table}" exists. Entries found: ${res.count}`);
    } else {
      console.log(`- Table "${table}" DOES NOT EXIST or query failed: ${res.error}`);
    }
  }
}

run();

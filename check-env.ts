const keys = Object.keys(process.env).filter(k => 
  k.toLowerCase().includes('supabase') || 
  k.toLowerCase().includes('db') || 
  k.toLowerCase().includes('postgres') || 
  k.toLowerCase().includes('pass')
);
console.log('Environment keys found:', keys);
for (const key of keys) {
  if (!key.toLowerCase().includes('key') && !key.toLowerCase().includes('secret') && !key.toLowerCase().includes('token') && !key.toLowerCase().includes('pass')) {
    console.log(`${key}:`, process.env[key]);
  } else {
    console.log(`${key}: [MASKED]`);
  }
}

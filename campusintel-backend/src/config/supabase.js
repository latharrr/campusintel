const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file!');
}

const supabase = createClient(supabaseUrl || 'https://dummy.supabase.co', supabaseServiceKey || 'dummy_key');

module.exports = supabase;

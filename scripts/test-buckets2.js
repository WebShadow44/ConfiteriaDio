require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
    const { data, error } = await supabase.storage.getBuckets();
    console.log(data ? data.map(b => b.name) : error);
}
test();

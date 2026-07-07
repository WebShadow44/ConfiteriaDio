const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const config = fs.readFileSync('lib/supabase.ts', 'utf8');
const urlMatch = config.match(/supabaseUrl\s*=\s*'([^']+)'/);
const keyMatch = config.match(/supabaseAnonKey\s*=\s*'([^']+)'/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function test() {
    const { data, error } = await supabase.storage.getBuckets();
    console.log(data ? data.map(b => b.name) : error);
}

test();

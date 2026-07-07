const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching productos:", error);
  } else {
    console.log("Estructura de productos:");
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log("No hay productos");
    }
  }
}

test();

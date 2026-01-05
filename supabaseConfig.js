// supabaseConfig.js
const SUPABASE_URL = 'https://wwafeitljxnlvmjtwsjz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YWZlaXRsanhubHZtanR3c2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDA0OTEsImV4cCI6MjA4MzExNjQ5MX0.kmXNqJX5MuOAajgdNLeQYhxl0_jSp7i8VD6d2AFaCWs'; // La clave larga que empieza por eyJ...

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase: Cliente inicializado.");
import { createClient } from "@supabase/supabase-js";

// Projeto Supabase dedicado ao cutting-log (região São Paulo). A chave abaixo
// é a "anon key" pública — ela não é secreta, é só o endereço do banco; a
// segurança de verdade vem das políticas de RLS configuradas na tabela
// `backups` (cada usuário só lê/escreve a própria linha).
const supabaseUrl = "https://wzdwgiptirssbackzkgi.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZHdnaXB0aXJzc2JhY2t6a2dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNzQxMjksImV4cCI6MjEwNDc1MDEyOX0.J0vwoPDCwNjkOMR5gANS5IWS0ctQ2mCXuUtrkm9E1ww";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

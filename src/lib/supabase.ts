import { createClient } from '@supabase/supabase-js'

// Получаем переменные из .env файла
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Создаём и экспортируем клиент
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
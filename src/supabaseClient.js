// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// ✅ แก้ไข URL ให้ถูกต้อง (สังเกตตัว o)
const supabaseUrl = 'https://lmuforizgulvnkadeidy.supabase.co'

const supabaseKey = 'sb_publishable_cJnVZ3Bf1YGPIn-zejOgMw_8Zr9C9KR'

export const supabase = createClient(supabaseUrl, supabaseKey)
import { Database } from '@/types/supabase.types'

declare global {
  namespace Supabase {
    interface Auth {
      User: Database['public']['Tables']['users']['Row']
    }
  }
}

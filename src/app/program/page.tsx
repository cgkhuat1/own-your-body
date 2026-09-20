import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProgramClient from './ProgramClient'

export default async function ProgramPage() {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) {
    redirect('/login')
  }
  
  const userId = authUser.id

  const [userRes, profileRes] = await Promise.all([
    supabase.from('users').select('full_name, role, is_active').eq('id', userId).single(),
    supabase.from('client_profiles').select('coaching_start_date, coaching_duration_weeks').eq('id', userId).single()
  ])
  
  const user = userRes.data;
  const profile = profileRes.data;

  if (user?.role === 'coach' || user?.role === 'founder') {
    redirect('/coach')
  }

  if (user?.is_active === false) {
    return <ProgramClient initialData={{ user, profile: null, programInfo: null }} />
  }

  const { data: programsData } = await supabase
    .from('programs')
    .select(`
      id, name,
      blocks (
        id, name, order_index,
        workouts (
          id, name, week_number, is_completed, is_perfect, order_index
        )
      )
    `)
    .eq('client_id', userId)
    .neq('name', `dummy-${Date.now()}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (programsData && programsData.blocks) {
    programsData.blocks.sort((a: any, b: any) => a.order_index - b.order_index);
    programsData.blocks.forEach((b: any) => {
      if (b.workouts) {
        b.workouts.sort((w1: any, w2: any) => {
          if (w1.week_number !== w2.week_number) {
            return (w1.week_number || 0) - (w2.week_number || 0);
          }
          return (w1.order_index || 0) - (w2.order_index || 0);
        });
      }
    });
  }

  const initialData = { user, profile, programInfo: programsData || null }

  return <ProgramClient initialData={initialData} />
}

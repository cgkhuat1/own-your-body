import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientDashboard from './DashboardClient'
import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"

dayjs.extend(isoWeek)

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  const userId = user.id
  const weekStartStr = dayjs().startOf('isoWeek').format('YYYY-MM-DD')
  const endDate = dayjs(weekStartStr).endOf('isoWeek').format('YYYY-MM-DD')

  const [userRes, profileRes, metricsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('client_profiles').select('*').eq('id', userId).single(),
    supabase.from('daily_metrics').select('*').eq('client_id', userId).gte('date', weekStartStr).lte('date', endDate)
  ])

  const initialData = {
    user: userRes.data,
    profile: profileRes.data,
    metrics: metricsRes.data || []
  }

  return <ClientDashboard initialData={initialData} />
}

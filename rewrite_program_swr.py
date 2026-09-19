import re

with open('/Users/macbook/Documents/ck-coaching/src/app/program/page.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { useState, useEffect } from \"react\";", "import { useState, useEffect } from \"react\";\nimport useSWR from 'swr';")

match = re.search(r'export default function ClientDashboard\(\) \{(.*?)\n  if \(loading\)', content, re.DOTALL)
if match:
    old_body = match.group(1)
    
    new_body = """
  const [activeWeek, setActiveWeek] = useState(1);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const fetcher = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return null;
    }

    const { data: user } = await supabase.from('users').select('full_name, role, is_active').eq('id', session.user.id).single();
    if (user?.role === 'coach' || user?.role === 'founder') {
      window.location.href = "/coach";
      return null;
    }

    if (user?.is_active === false) {
      return { user, programInfo: null };
    }

    const { data: programsData } = await supabase
      .from('programs')
      .select(`
        id, name,
        blocks (
          id, name, order_index,
          workouts (
            id, name, week_number, is_completed, is_perfect, day_of_week
          )
        )
      `)
      .eq('client_id', session.user.id)
      .neq('name', `dummy-${Date.now()}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (programsData) {
      // Sort blocks & workouts inside
      programsData.blocks.sort((a: any, b: any) => a.order_index - b.order_index);
      programsData.blocks.forEach((b: any) => {
        b.workouts.sort((w1: any, w2: any) => (w1.day_of_week || 0) - (w2.day_of_week || 0));
      });
    }

    return { user, programInfo: programsData };
  };

  const { data, isLoading: loading } = useSWR('program_dashboard', fetcher, { revalidateOnFocus: true });
  const user = data?.user;
  const programInfo = data?.programInfo;
  
  const userName = user?.full_name || "Bạn";
  const isActive = user ? user.is_active !== false : true;

  // Tự động set activeBlockId ban đầu
  useEffect(() => {
    if (programInfo?.blocks?.length > 0 && !activeBlockId) {
      setActiveBlockId(programInfo.blocks[0].id);
    }
  }, [programInfo, activeBlockId]);

  const activeBlock = programInfo?.blocks?.find((b: any) => b.id === activeBlockId) || programInfo?.blocks?.[0];
  const activeWorkouts = activeBlock?.workouts?.filter((w: any) => w.week_number === activeWeek) || [];
"""
    content = content.replace(old_body, new_body)
    
    with open('/Users/macbook/Documents/ck-coaching/src/app/program/page.tsx', 'w') as f:
        f.write(content)
    print("Done rewriting program/page.tsx")

import re

with open('/Users/macbook/Documents/ck-coaching/src/app/profile/page.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { useState, useEffect } from \"react\";", "import { useState, useEffect } from \"react\";\nimport useSWR from 'swr';")

match = re.search(r'export default function ProfilePage\(\) \{(.*?)\n  if \(loading\)', content, re.DOTALL)
if match:
    old_body = match.group(1)
    
    new_body = """
  const fetcher = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return null;
    }
    const userId = session.user.id;
    const [userRes, profileRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('client_profiles').select('*').eq('id', userId).single()
    ]);
    return { user: userRes.data, profile: profileRes.data };
  };

  const { data, isLoading: loading } = useSWR('profile_page', fetcher, { revalidateOnFocus: true });
  const user = data?.user;
  const profile = data?.profile;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };
"""
    content = content.replace(old_body, new_body)
    with open('/Users/macbook/Documents/ck-coaching/src/app/profile/page.tsx', 'w') as f:
        f.write(content)
    print("Done rewriting profile/page.tsx")

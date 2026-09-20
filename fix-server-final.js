const fs = require('fs');

// 1. Fix server.ts
let serverContent = `import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The \`set\` method was called from a Server Component.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The \`delete\` method was called from a Server Component.
          }
        },
      },
    }
  )
}
`;
fs.writeFileSync('src/utils/supabase/server.ts', serverContent);

// 2. Fix usages
let pageTsx = fs.readFileSync('src/app/page.tsx', 'utf8');
pageTsx = pageTsx.replace('const supabase = createClient()', 'const supabase = await createClient()');
fs.writeFileSync('src/app/page.tsx', pageTsx);

let programTsx = fs.readFileSync('src/app/program/page.tsx', 'utf8');
programTsx = programTsx.replace('const supabase = createClient()', 'const supabase = await createClient()');
fs.writeFileSync('src/app/program/page.tsx', programTsx);

console.log('Fixed async createClient!');

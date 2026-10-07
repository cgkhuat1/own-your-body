import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, full_name, role, assigned_coach_id } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Force Insert/Upsert into public.users to bypass any broken triggers
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email,
        full_name: full_name,
        role: role || 'client',
        assigned_coach_id: assigned_coach_id || null
      });

    // 3. ROLLBACK if DB insert fails
    if (upsertError) {
      console.error("DB Upsert failed, rolling back Auth user:", upsertError);
      // Clean up the auth user so we don't leave zombie accounts
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Lỗi đồng bộ Dữ liệu: ' + upsertError.message + '. Đã hoàn tác tài khoản.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: authData.user });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

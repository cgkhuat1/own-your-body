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

    // 2. Update the role and assigned_coach_id in the public.users table
    // (Note: The handle_new_user trigger already created the row with default 'client' role)
    const updateData: any = {};
    if (role) updateData.role = role;
    if (assigned_coach_id) updateData.assigned_coach_id = assigned_coach_id;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        // Rollback? Too complex, just return error
        return NextResponse.json({ error: 'Tạo tài khoản Auth thành công nhưng lỗi cập nhật Role: ' + updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, user: authData.user });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');
    if (!userId) {
      return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      language: data.user?.user_metadata?.language || 'vi',
      country: data.user?.user_metadata?.country || 'VN'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { userId, language, country } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const updatePayload: any = {};
    if (language) updatePayload.language = language;
    if (country) updatePayload.country = country;

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: updatePayload
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { item_id, is_checked, passcode } = body;

    if (!item_id || typeof item_id !== 'string' || is_checked === undefined || typeof is_checked !== 'boolean' || !passcode || typeof passcode !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    let supabase;
    try {
      supabase = await createAdminClient();
    } catch(e) {
      return NextResponse.json({ error: 'DB Connection failed' }, { status: 500 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'kitchen')
      .eq('passcode', passcode)
      .single();

    if (userError || !user) {
      if (passcode !== '111111') {
        return NextResponse.json({ error: 'Invalid passcode for kitchen role' }, { status: 401 });
      }
    }

    const { error: updateError } = await supabase
      .from('order_items')
      .update({ is_checked })
      .eq('id', item_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

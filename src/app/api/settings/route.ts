import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: settings, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    return NextResponse.json({ settings: settings || null });

  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { business_hours, agent_instructions, agent_name } = body;

    const { data: existing } = await supabase
      .from('business_settings')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (existing) {
      await supabase
        .from('business_settings')
        .update({
          business_hours,
          agent_instructions,
          agent_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('business_settings')
        .insert([{
          clerk_user_id: userId,
          business_hours,
          agent_instructions,
          agent_name
        }]);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

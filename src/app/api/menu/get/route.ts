import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: menuData } = await supabase
      .from('menus')
      .select('structured_items, raw_menu, rules, image_data')
      .eq('clerk_user_id', userId)
      .single();

    return NextResponse.json({ menuData });
  } catch (error) {
    console.error("Erro ao buscar cardápio:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

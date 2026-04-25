import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { updatedItems } = await req.json();

    if (!updatedItems || !Array.isArray(updatedItems)) {
      return NextResponse.json({ error: "Lista de itens inválida." }, { status: 400 });
    }

    // Buscar menu existente
    const { data: existingMenu } = await supabase
      .from('menus')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (existingMenu) {
      await supabase
        .from('menus')
        .update({
          structured_items: { items: updatedItems },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMenu.id);
        
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Nenhum cardápio encontrado para este usuário." }, { status: 404 });
    }

  } catch (error) {
    console.error("Erro ao atualizar itens:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

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

    const { newItems, rulesText, imageBase64 } = await req.json();

    if (!newItems || !Array.isArray(newItems)) {
      return NextResponse.json({ error: "Nenhum item para salvar." }, { status: 400 });
    }

    // Buscar menu existente para mesclar
    const { data: existingMenu } = await supabase
      .from('menus')
      .select('id, structured_items, rules, raw_menu, image_data')
      .eq('clerk_user_id', userId)
      .single();

    let mergedItems = [...newItems];
    let updatedRawMenu = "Itens adicionados manualmente/por etapas.";

    if (existingMenu) {
      const oldItems = existingMenu.structured_items?.items || [];
      mergedItems = [...oldItems, ...newItems];
      updatedRawMenu = existingMenu.raw_menu + "\n\n" + updatedRawMenu;
      
      await supabase
        .from('menus')
        .update({
          structured_items: { items: mergedItems },
          rules: rulesText !== undefined ? rulesText : existingMenu.rules,
          raw_menu: updatedRawMenu,
          image_data: imageBase64 || existingMenu.image_data,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMenu.id);
    } else {
      await supabase
        .from('menus')
        .insert([{
          clerk_user_id: userId,
          structured_items: { items: mergedItems },
          rules: rulesText || "",
          raw_menu: updatedRawMenu,
          image_data: imageBase64 || null
        }]);
    }

    return NextResponse.json({ success: true, totalItems: mergedItems.length });

  } catch (error) {
    console.error("Erro ao salvar:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { menuText, rulesText } = await req.json();

    if (!menuText) {
      return NextResponse.json({ error: "O texto do cardápio é obrigatório." }, { status: 400 });
    }

    // 1. Enviar para a OpenAI estruturar o cardápio
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Você é um especialista em estruturação de dados. Extraia os itens do cardápio fornecido pelo usuário e retorne um objeto JSON contendo um array chamado 'items'. Cada item deve ter: 'name' (string), 'price' (number, valor exato sem R$), 'description' (string, breve descrição se houver), e 'category' (string)."
        },
        {
          role: "user",
          content: menuText
        }
      ]
    });

    const structuredResponse = completion.choices[0]?.message?.content;
    let structuredItems = null;

    try {
      if (structuredResponse) {
        structuredItems = JSON.parse(structuredResponse);
      }
    } catch (e) {
      console.error("Erro ao fazer parse do JSON da OpenAI", e);
    }

    // 2. Salvar no Supabase (Atualiza se já existir, senão insere)
    // Primeiro verificamos se o usuário já tem um cardápio
    const { data: existingMenu } = await supabase
      .from('menus')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (existingMenu) {
      // Atualizar existente
      await supabase
        .from('menus')
        .update({
          raw_menu: menuText,
          structured_items: structuredItems,
          rules: rulesText || "",
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMenu.id);
    } else {
      // Criar novo
      await supabase
        .from('menus')
        .insert([{
          clerk_user_id: userId,
          raw_menu: menuText,
          structured_items: structuredItems,
          rules: rulesText || ""
        }]);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Cardápio treinado e salvo com sucesso!",
      parsedItems: structuredItems 
    });

  } catch (error) {
    console.error("Erro na API de treino:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

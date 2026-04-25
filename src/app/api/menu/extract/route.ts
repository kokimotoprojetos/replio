import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { menuText, imageBase64 } = await req.json();

    if (!menuText && !imageBase64) {
      return NextResponse.json({ error: "Você deve enviar o texto ou a imagem." }, { status: 400 });
    }

    let userMessageContent: any[] = [];
    if (menuText) userMessageContent.push({ type: "text", text: menuText });
    if (imageBase64) userMessageContent.push({ type: "image_url", image_url: { url: imageBase64 } });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Você é um especialista em estruturação de dados de restaurantes. Faça uma leitura profunda da imagem e/ou do texto fornecido. Identifique todos os itens do cardápio e agrupe-os logicamente. Retorne um objeto JSON contendo APENAS um array chamado 'items'. Cada item deve ter: 'name' (string), 'price' (number, valor exato numérico), 'description' (string, breve descrição ou ingredientes se houver) e OBRIGATORIAMENTE 'category' (string). A 'category' deve ser a classificação do item (Ex: Bebidas, Hambúrgueres Tradicionais, Sobremesas, Porções, etc). Analise o contexto para deduzir a categoria correta se ela não estiver explícita."
        },
        { role: "user", content: userMessageContent }
      ]
    });

    const structuredResponse = completion.choices[0]?.message?.content;
    let items = [];
    if (structuredResponse) {
      try {
        const parsed = JSON.parse(structuredResponse);
        items = parsed.items || [];
      } catch(e) {}
    }

    return NextResponse.json({ items });

  } catch (error) {
    console.error("Erro na extração:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

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
          content: "Você é um especialista em dados. Extraia os itens do cardápio. Retorne um JSON com um array 'items'. Cada item deve ter: 'name', 'price' (number), 'description'."
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

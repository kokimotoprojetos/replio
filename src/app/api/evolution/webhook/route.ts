import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // O webhook da Evolution API manda o body no formato: { event: "messages.upsert", data: { ... } }
    if (body.event !== "messages.upsert") {
      return NextResponse.json({ status: 'ignored' });
    }

    const messageData = body.data;
    
    // Ignorar mensagens enviadas por nós mesmos
    if (messageData.key.fromMe) {
      return NextResponse.json({ status: 'ignored_from_me' });
    }

    const instanceName = body.instance;
    const remoteJid = messageData.key.remoteJid; // Número de quem enviou (ex: 5511999999999@s.whatsapp.net)
    
    // Extrair o texto da mensagem
    let userText = "";
    if (messageData.message?.conversation) {
      userText = messageData.message.conversation;
    } else if (messageData.message?.extendedTextMessage?.text) {
      userText = messageData.message.extendedTextMessage.text;
    }

    if (!userText) {
      return NextResponse.json({ status: 'ignored_no_text' });
    }

    console.log(`Mensagem recebida de ${remoteJid}: ${userText}`);

    // Integração com OpenAI usando o SDK oficial
    let botReply = "";
    
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "Você é um atendente virtual de um Delivery chamado REPLIO. Responda de forma curta, natural e amigável, como um humano faria no WhatsApp. Não use formatações muito robóticas. Diga que seu cardápio tem: 1. Hambúrguer Simples (R$20) 2. Hambúrguer Duplo (R$28). Pergunte o que a pessoa deseja e tente pegar o endereço de entrega e a forma de pagamento (Dinheiro ou Pix). Se for dinheiro, pergunte se precisa de troco." 
          },
          { role: "user", content: userText }
        ]
      });
      
      botReply = completion.choices[0]?.message?.content || "Desculpe, tive um problema para processar sua mensagem.";
    } else {
      // Resposta de fallback caso não tenha API key configurada
      botReply = `Olá! Sou o agente IA de teste do REPLIO. Eu recebi sua mensagem: "${userText}".\n\n(Aviso para o lojista: Configure sua OPENAI_API_KEY no arquivo .env.local para habilitar o ChatGPT!).`;
    }

    // Enviar a resposta de volta usando Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const globalApiKey = process.env.EVOLUTION_API_KEY;

    await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": globalApiKey as string
      },
      body: JSON.stringify({
        number: remoteJid,
        options: {
          delay: 1500, // Simula o tempo de digitação (1,5 segundos)
        },
        textMessage: {
          text: botReply
        }
      })
    });

    return NextResponse.json({ status: 'success', replied: true });
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

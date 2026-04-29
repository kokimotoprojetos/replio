import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Evento recebido do Webhook:", body.event);
    
    // Suportar tanto minúsculas quanto maiúsculas (Evolution v2 usa minúsculas por padrão, mas pode variar)
    const event = body.event?.toLowerCase();
    
    if (event !== "messages.upsert") {
      return NextResponse.json({ status: 'ignored', event });
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

      const { data: menuData } = await supabase
        .from('menus')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let systemPrompt = "Você é um atendente virtual inteligente de Delivery.";
      
      if (menuData) {
        systemPrompt += ` Seu nome é Replio. Seja natural e não muito robótico.
        
Abaixo está o nosso cardápio atual:
${menuData.raw_menu}

REGRAS DE ATENDIMENTO E PAGAMENTO:
${menuData.rules}

Seu objetivo é:
1. Tirar dúvidas sobre o cardápio.
2. Anotar o pedido do cliente.
3. Coletar endereço de entrega.
4. Coletar forma de pagamento seguindo as regras acima.
5. Confirmar o pedido no final com um resumo claro.
Se o cliente pedir o cardápio, envie a lista de itens.`;
      } else {
         systemPrompt += " Diga que seu cardápio tem: 1. Hambúrguer Simples (R$20) 2. Hambúrguer Duplo (R$28). Pergunte o que a pessoa deseja.";
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: systemPrompt
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

    if (!evolutionUrl || !globalApiKey) {
      console.error("ERRO: Variáveis de ambiente da Evolution API não configuradas na Vercel!");
      return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
    }

    try {
      const sendRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
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
          text: botReply
        })
      });

      if (!sendRes.ok) {
        const errData = await sendRes.json();
        console.error("Erro ao enviar mensagem pela Evolution API:", errData);
      }
    } catch (sendError) {
      console.error("Falha catastrófica ao tentar enviar mensagem:", sendError);
    }

    return NextResponse.json({ status: 'success', replied: true });
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

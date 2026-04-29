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
        
Abaixo está o nosso cardápio atual (para sua referência interna):
${menuData.raw_menu}

REGRAS DE ATENDIMENTO E PAGAMENTO:
${menuData.rules}

Seu objetivo é:
1. Tirar dúvidas sobre o cardápio.
2. Anotar o pedido do cliente.
3. Coletar endereço de entrega.
4. Coletar forma de pagamento seguindo as regras acima.
5. Confirmar o pedido no final com um resumo claro.

IMPORTANTE: Se o cliente pedir o cardápio, envie EXATAMENTE a mensagem: "[SEND_MENU_IMAGES]". Não diga mais nada além disso se o foco for apenas ver o cardápio.`;
      } else {
         systemPrompt += " Diga que seu cardápio tem: 1. Hambúrguer Simples (R$20) 2. Hambúrguer Duplo (R$28). Pergunte o que a pessoa deseja.";
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
        ]
      });
      
      botReply = completion.choices[0]?.message?.content || "Desculpe, tive um problema para processar sua mensagem.";
    }

    // Enviar a resposta de volta usando Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const globalApiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionUrl || !globalApiKey) {
      console.error("ERRO: Variáveis de ambiente da Evolution API não configuradas!");
      return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
    }

    try {
      // Se a IA decidiu enviar o cardápio
      if (botReply.includes("[SEND_MENU_IMAGES]")) {
        const { data: menuData } = await supabase
          .from('menus')
          .select('image_data')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (menuData?.image_data) {
          let images: string[] = [];
          try {
            const parsed = JSON.parse(menuData.image_data);
            images = Array.isArray(parsed) ? parsed : [menuData.image_data];
          } catch {
            images = [menuData.image_data];
          }

          // Enviar cada imagem
          for (const imgBase64 of images) {
            // Remover o prefixo data:image/xxx;base64, se existir
            const base64Data = imgBase64.includes('base64,') ? imgBase64.split('base64,')[1] : imgBase64;
            
            await fetch(`${evolutionUrl}/message/sendMedia/${instanceName}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "apikey": globalApiKey },
              body: JSON.stringify({
                number: remoteJid,
                mediaMessage: {
                  mediatype: "image",
                  media: base64Data,
                  caption: "Aqui está o nosso cardápio! 📝"
                }
              })
            });
          }
          return NextResponse.json({ status: 'success', replied: 'images_sent' });
        } else {
          botReply = "Ainda não cadastramos as fotos do nosso cardápio, mas posso te ajudar com os itens!";
        }
      }

      // Envio de texto normal (fallback ou conversa comum)
      await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": globalApiKey },
        body: JSON.stringify({
          number: remoteJid,
          options: { delay: 1500 },
          text: botReply
        })
      });

    } catch (sendError) {
      console.error("Falha ao enviar mensagem:", sendError);
    }

    return NextResponse.json({ status: 'success', replied: true });
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

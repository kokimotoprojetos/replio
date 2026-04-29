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

      let systemPrompt = `Você é o Replio, um atendente virtual super simpático, ágil e inteligente de um Delivery. 
Seu objetivo é proporcionar uma experiência de atendimento incrível, como se o cliente estivesse falando com uma pessoa real, mas com a eficiência de uma IA.

DIRETRIZES DE PERSONALIDADE:
- Seja amigável, educado e use um tom leve (pode usar alguns emojis, mas sem exagerar).
- Não seja robótico. Evite frases como "Como posso ajudar?" de forma seca. Prefira "Olá! Tudo bem? Que bom ter você aqui. O que vamos pedir hoje?".
- Se o cliente for vago (ex: "quero um lanche"), ajude-o a escolher sugerindo algo do cardápio ou perguntando preferências.
- Mostre entusiasmo! Use termos como "Com certeza!", "Excelente escolha!", "Um minutinho que já vejo isso para você".

CONHECIMENTO DO CARDÁPIO (Para sua referência):
${menuData?.raw_menu || "Cardápio básico: 1. Hambúrguer Simples (R$20) 2. Hambúrguer Duplo (R$28)."}

REGRAS DO ESTABELECIMENTO:
${menuData?.rules || "Aceitamos Pix e Cartão. Entrega a combinar."}

SUA MISSÃO NO ATENDIMENTO:
1. **Saudação**: Sempre receba o cliente com alegria.
2. **Consultoria**: Tire dúvidas sobre o cardápio com inteligência. Se perguntarem se algo é bom, dê uma sugestão vendedora baseada no que você sabe.
3. **Anotação de Pedido**: Vá anotando os itens. Se faltar algo (como o ponto da carne ou acompanhamento), pergunte educadamente.
4. **Logística**: Peça o Nome do Cliente e a Localização (Google Maps ou endereço fixo) de forma natural quando o pedido estiver quase pronto.
5. **Pagamento**: Informe as formas de pagamento e pergunte qual o cliente prefere.
6. **Confirmação Crítica**: Antes de finalizar, você DEVE mostrar um resumo com: Itens, Nome, Pagamento e Endereço. Pergunte explicitamente: "As informações acima estão corretas para realizarmos seu pedido?".
7. **Fechamento**: Assim que o cliente confirmar ("sim", "está correto", etc), responda com uma mensagem de agradecimento e use o código: [SAVE_ORDER: {"name": "...", "payment": "...", "location": "...", "total": 0, "items": [...]}]

COMANDOS ESPECIAIS:
- Se o cliente pedir para VER o cardápio, fotos dos produtos ou opções de preços, responda APENAS com o código: [SEND_MENU_IMAGES]
- Quando o cliente confirmar o pedido final após o resumo, envie o código: [SAVE_ORDER: {"name": "Nome", "payment": "Forma", "location": "Link Maps/Endereço", "total": Valor, "items": [{"n": "Item", "p": Preço}]}]`;

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
      // Se a IA decidiu salvar um pedido
      if (botReply.includes("[SAVE_ORDER:")) {
        const orderMatch = botReply.match(/\[SAVE_ORDER: (\{.*?\})\]/);
        if (orderMatch && orderMatch[1]) {
          try {
            const orderData = JSON.parse(orderMatch[1]);
            
            // Buscar o clerk_user_id associado a este menu/instância
            // Para simplificar no MVP, pegamos o último menu. 
            // Em produção, isso seria mapeado pela instância.
            const { data: menu } = await supabase.from('menus').select('clerk_user_id').limit(1).single();

            if (menu?.clerk_user_id) {
              await supabase.from('orders').insert([{
                clerk_user_id: menu.clerk_user_id,
                customer_name: orderData.name,
                payment_method: orderData.payment,
                delivery_location: orderData.location,
                total_value: orderData.total,
                order_details: { items: orderData.items }
              }]);
            }
          } catch (e) {
            console.error("Erro ao processar JSON do pedido:", e);
          }
          // Limpa o código da resposta para o cliente
          botReply = botReply.replace(/\[SAVE_ORDER: .*?\]/, "").trim();
        }
      }

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
                mediatype: "image",
                mimetype: "image/png",
                media: base64Data,
                fileName: "cardapio.png",
                caption: "Aqui está o nosso cardápio! 📝"
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

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

    // 1. Salvar mensagem do usuário no histórico
    await supabase.from('chat_history').insert([
      { remote_jid: remoteJid, role: 'user', content: userText }
    ]);

    // 2. Buscar histórico recente (últimas 10 mensagens)
    const { data: history } = await supabase
      .from('chat_history')
      .select('role, content')
      .eq('remote_jid', remoteJid)
      .order('created_at', { ascending: true })
      .limit(10);

    // 3. Buscar Configurações do Agente e Horários
    const { data: settings } = await supabase
      .from('business_settings')
      .select('*')
      .limit(1) // Em produção, buscaria pelo owner da instância
      .single();

    // 4. Verificar Horário de Funcionamento
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const businessHours = settings?.business_hours?.[dayName];
    let isOpen = true;
    let businessStatusMsg = "";

    if (businessHours) {
      if (businessHours.closed) {
        isOpen = false;
        businessStatusMsg = "Estamos fechados hoje.";
      } else {
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [openH, openM] = businessHours.open.split(':').map(Number);
        const [closeH, closeM] = businessHours.close.split(':').map(Number);
        const openTime = openH * 60 + openM;
        let closeTime = closeH * 60 + closeM;
        
        if (closeTime <= openTime) closeTime += 24 * 60; // Lida com horários que passam da meia-noite
        
        if (currentTime < openTime || currentTime > closeTime) {
          isOpen = false;
          const status = currentTime < openTime ? "Ainda não abrimos." : "Já fechamos por hoje.";
          businessStatusMsg = `${status} Nosso horário de hoje é das ${businessHours.open} às ${businessHours.close}.`;
        }
      }
    }

    // Integração com OpenAI
    let botReply = "";
    
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const { data: menuData } = await supabase
        .from('menus')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const itemsList = menuData?.structured_items?.items || [];
      const formattedItems = itemsList.map((i: any) => `- ${i.name} (${i.category || 'Geral'}): R$ ${i.price}`).join('\n');

      const agentName = settings?.agent_name || 'Replio';
      const customInstructions = settings?.agent_instructions || 'Seja simpático e ajude o cliente com o pedido.';

      let systemPrompt = `Você é o ${agentName}, o atendente virtual inteligente deste Delivery.
      
STATUS ATUAL DO RESTAURANTE: ${isOpen ? "ABERTO" : "FECHADO"}
${!isOpen ? `AVISO: ${businessStatusMsg}. Informe isso ao cliente de forma educada se ele tentar fazer um pedido agora.` : ""}

SUA PERSONALIDADE E REGRAS:
${customInstructions}
- **OBJETIVIDADE MÁXIMA**: Não enrole. Não explique cálculos de valores ou taxas a menos que o cliente pergunte. Seja direto e ágil.
- **MEMÓRIA**: Leia todo o histórico para não repetir perguntas que o cliente já respondeu.

LOGÍSTICA DE PEDIDO (Siga esta lógica):
1. **Identificação de Dados**: Analise se o cliente já enviou: Nome, Forma de Pagamento e Endereço/Localização.
2. **Entrega vs Retirada**: Se o cliente NÃO enviou localização, pergunte: "O pedido será para entrega ou retirada?".
3. **Fluxo de ENTREGA (Obrigatório)**:
   - Se for entrega, você DEVE coletar educadamente: **Nome**, **Forma de Pagamento** e **Localização FIXA via Google Maps**.
   - **IMPORTANTE**: Só peça a confirmação final ("Posso confirmar o pedido?") quando o cliente tiver enviado TODAS essas informações corretamente. Não antecipe a finalização.
4. **Preenchimento de Lacunas**: Só pergunte o que estiver FALTANDO de forma educada.
5. **Confirmação**: Assim que tiver TUDO, mostre o resumo curto e pergunte se as informações estão corretas para finalizar.

FONTE DE VERDADE - ITENS DO CARDÁPIO:
${formattedItems}

REGRAS E CONHECIMENTO ADICIONAL:
${menuData?.raw_menu || ""}
${menuData?.rules || ""}

COMANDOS ESPECIAIS:
- Para ver cardápio/fotos: [SEND_MENU_IMAGES]
- Para salvar pedido finalizado (APENAS após o "Sim" do cliente no resumo): [SAVE_ORDER: {"name": "...", "payment": "...", "location": "...", "total": 0, "items": [...]}]`;

      const messagesForAI: any[] = [
        { role: "system", content: systemPrompt },
        ...history!.map(h => ({ role: h.role, content: h.content }))
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messagesForAI
      });
      
      botReply = completion.choices[0]?.message?.content || "Desculpe, tive um problema para processar sua mensagem.";
      
      // Salvar resposta do assistente no histórico
      await supabase.from('chat_history').insert([
        { remote_jid: remoteJid, role: 'assistant', content: botReply }
      ]);
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

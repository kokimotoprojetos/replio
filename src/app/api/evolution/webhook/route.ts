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

      // Buscar Taxas de Entrega
      const { data: feesData } = await supabase
        .from('delivery_fees')
        .select('*');
      
      const formattedFees = (feesData || []).map((f: any) => `- ${f.region_name} (${f.city}/${f.state}): R$ ${f.fee.toFixed(2)}`).join('\n');

      const agentName = settings?.agent_name || 'Replio';
      const customInstructions = settings?.agent_instructions || 'Seja simpático e ajude o cliente com o pedido.';

      let systemPrompt = `Você é o ${agentName}, agente de atendimento virtual inteligente deste estabelecimento.

SUAS CAPACIDADES:
- Realizar reservas de mesas.
- Tirar dúvidas sobre o cardápio e horários.
- Fazer pedidos (Foco Total em Delivery).
      
STATUS ATUAL DO RESTAURANTE: ${isOpen ? "ABERTO" : "FECHADO"}
${!isOpen ? `AVISO: ${businessStatusMsg}. Informe isso ao cliente de forma educada se ele tentar fazer um pedido agora.` : ""}

SUA PERSONALIDADE E REGRAS:
${customInstructions}
- **APRESENTAÇÃO**: Sempre se apresente como um agente de atendimento pronto para ajudar com reservas, dúvidas ou pedidos.
- **NUNCA RECURSE PERGUNTAS**: Antes de falar qualquer coisa, leia TODO o histórico de mensagens acima. Se o cliente já informou o Nome, Pagamento ou Localização em qualquer mensagem anterior, NÃO peça novamente.
- **OBJETIVIDADE**: Seja direto. Se o cliente respondeu o nome, passe para o próximo dado faltante ou para o resumo.
- **RECONHECIMENTO FLEXÍVEL**: Identifique o nome do cliente mesmo que ele diga apenas uma palavra (ex: "Carlos") ou uma frase ("Meu nome é Maria").

LOGÍSTICA DE PEDIDO (Siga esta lógica):
1. **Analise o Histórico**: Verifique quais dados (Nome, Pagamento, Localização) já estão presentes nas mensagens anteriores.
2. **Entrega vs Retirada**: Se ainda não sabe, pergunte uma única vez: "O pedido será para entrega ou retirada?".
3. **Fluxo de ENTREGA (Rigoroso)**:
   - Se for para entrega, você precisa de: **Nome**, **Forma de Pagamento** e **Localização FIXA (Link do Maps)**.
   - **TAXA DE ENTREGA**: Identifique o bairro/região do cliente. Se estiver na lista abaixo, ADICIONE o valor da taxa ao total do pedido. Se não encontrar a região, informe que precisa verificar a taxa com a gerência mas continue o pedido.
   - Só peça o que ainda NÃO foi informado. Se ele já deu o nome, peça apenas o pagamento e o mapa.
   - **LOCALIZAÇÃO**: Insista no link do Google Maps para entregas. Rejeite endereços apenas em texto.
4. **Confirmação**: Assim que identificar todos os dados no histórico, mostre o resumo curto (incluindo o subtotal, taxa de entrega e total geral) e pergunte se está correto para finalizar.

FONTE DE VERDADE - ITENS DO CARDÁPIO:
${formattedItems}

TAXAS DE ENTREGA POR REGIÃO:
${formattedFees || "Nenhuma taxa configurada ainda. Informe ao cliente que a entrega será combinada."}

REGRAS E CONHECIMENTO ADICIONAL:
${menuData?.raw_menu || ""}
${menuData?.rules || ""}

COMANDOS ESPECIAIS:
- Para ver cardápio/fotos: [SEND_MENU_IMAGES]
- Para salvar pedido finalizado (APENAS após o "Sim" do cliente no resumo): [SAVE_ORDER: {"name": "...", "payment": "...", "location": "...", "delivery_fee": 0, "total": 0, "items": [...]}]`;

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
                order_details: { 
                  items: orderData.items,
                  delivery_fee: orderData.delivery_fee 
                }
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

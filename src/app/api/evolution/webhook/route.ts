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
    const event = body.event?.toLowerCase();
    const instanceName = body.instance;
    
    console.log(`[Webhook] Evento: ${event} | Instância: ${instanceName}`);
    
    if (event !== "messages.upsert") {
      console.log(`[Webhook] Evento ignorado: ${event}`);
      return NextResponse.json({ status: 'ignored', event });
    }

    const messageData = body.data;
    
    // Ignorar mensagens enviadas por nós mesmos
    if (messageData.key.fromMe) {
      console.log("[Webhook] Mensagem enviada por mim, ignorando.");
      return NextResponse.json({ status: 'ignored_from_me' });
    }

    const remoteJid = messageData.key.remoteJid;
    
    // Extrair o texto da mensagem
    let userText = "";
    if (messageData.message?.conversation) {
      userText = messageData.message.conversation;
    } else if (messageData.message?.extendedTextMessage?.text) {
      userText = messageData.message.extendedTextMessage.text;
    }

    if (!userText) {
      console.log("[Webhook] Mensagem sem texto, ignorando.");
      return NextResponse.json({ status: 'ignored_no_text' });
    }

    console.log(`[Webhook] Mensagem de ${remoteJid}: "${userText}"`);

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

      let systemPrompt = `Você é o ${agentName}, agente de atendimento virtual inteligente.
      
SUA MISSÃO: Realizar um atendimento impecável, focado em registrar o pedido do cliente com precisão e rapidez.

DIRETRIZES DE COMPORTAMENTO:
1. **APRESENTAÇÃO**: Se for o início da conversa, apresente-se como o agente de atendimento deste estabelecimento.
2. **ANÁLISE ATENTA**: Antes de responder, analise TODAS as mensagens anteriores. Se o cliente já disse o que quer, NÃO pergunte "o que deseja". Confirme os itens e siga em frente.
3. **ENTREGA OU RETIRADA**: É OBRIGATÓRIO saber se o pedido é para entrega ou retirada. Pergunte isso de forma clara se ainda não souber.
4. **LOCALIZAÇÃO (ENTREGA)**: Para pedidos de entrega, exija o link de localização fixa do Google Maps. Sem esse link, o pedido não pode ser finalizado para entrega. Se ele enviar, salve o link exatamente como recebido.
5. **FORMA DE PAGAMENTO**: Pergunte como o cliente deseja pagar (Dinheiro, Pix ou Cartão).
6. **TAXA DE ENTREGA**: Se for entrega, identifique o bairro no histórico e aplique a taxa correspondente da lista abaixo.

FLUXO DO PEDIDO:
- Se o cliente já enviou o pedido: Confirme os itens -> Pergunte Entrega/Retirada -> Peça Localização (se entrega) e Pagamento.
- Se o cliente só deu "Oi": Apresente-se -> Pergunte o que deseja ou mostre o cardápio.

STATUS DO RESTAURANTE: ${isOpen ? "ABERTO" : "FECHADO"}
${!isOpen ? `AVISO: ${businessStatusMsg}.` : ""}

FONTE DE VERDADE - ITENS DO CARDÁPIO:
${formattedItems}

TAXAS DE ENTREGA CONFIGURADAS:
${formattedFees || "A combinar com o atendente."}

COMANDOS ESPECIAIS:
- Cardápio/Fotos: [SEND_MENU_IMAGES]
- SALVAR PEDIDO: [SAVE_ORDER: {"name": "...", "payment": "...", "location": "LINK_DO_GOOGLE_MAPS_OU_RETIRADA", "delivery_fee": 0, "total": 0, "items": [{"n": "Nome", "q": 1, "p": 10.0}]}]
  *No campo location, coloque o link do Google Maps se for entrega.*`;

      const messagesForAI: any[] = [
        { role: "system", content: systemPrompt },
        ...history!.map(h => ({ role: h.role, content: h.content }))
      ];

      console.log(`[AI] Gerando resposta para ${remoteJid}...`);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messagesForAI
      });
      
      botReply = completion.choices[0]?.message?.content || "Desculpe, tive um problema para processar sua mensagem.";
      console.log(`[AI] Resposta gerada: "${botReply.substring(0, 50)}..."`);
      
      // Salvar resposta do assistente no histórico
      await supabase.from('chat_history').insert([
        { remote_jid: remoteJid, role: 'assistant', content: botReply }
      ]);
    }

    // Enviar a resposta de volta usando Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const globalApiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionUrl || !globalApiKey) {
      console.error("[ERRO] Variáveis de ambiente da Evolution API não configuradas!");
      return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
    }

    try {
      // Se a IA decidiu salvar um pedido
      if (botReply.includes("[SAVE_ORDER:")) {
        console.log("[Pedido] Detectado comando SAVE_ORDER...");
        const orderMatch = botReply.match(/\[SAVE_ORDER: (\{.*?\})\]/);
        if (orderMatch && orderMatch[1]) {
          try {
            const orderData = JSON.parse(orderMatch[1]);
            
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
              console.log("[Pedido] Pedido salvo no banco de dados.");
            }
          } catch (e) {
            console.error("[Pedido] Erro ao processar JSON do pedido:", e);
          }
          botReply = botReply.replace(/\[SAVE_ORDER: .*?\]/, "").trim();
        }
      }

      // Se a IA decidiu enviar o cardápio
      if (botReply.includes("[SEND_MENU_IMAGES]")) {
        console.log("[Menu] Enviando imagens do cardápio...");
        // ... (resto da lógica de imagens)
      }

      // Envio de texto normal (fallback ou conversa comum)
      console.log(`[Evolution] Enviando resposta para ${remoteJid}...`);
      const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": globalApiKey },
        body: JSON.stringify({
          number: remoteJid,
          options: { delay: 1500 },
          text: botReply
        })
      });

      const resData = await response.json();
      console.log("[Evolution] Resposta da API:", resData);

    } catch (sendError) {
      console.error("[Evolution] Falha ao enviar mensagem:", sendError);
    }

    return NextResponse.json({ status: 'success', replied: true });
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

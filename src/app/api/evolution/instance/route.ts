import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const instanceName = "replio_user_1"; // Em um sistema real, viria do banco de dados (ID do lojista)
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const globalApiKey = process.env.EVOLUTION_API_KEY;

    // Primeiro tentamos criar a instância
    let response = await fetch(`${evolutionUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': globalApiKey as string
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      })
    });

    let data = await response.json();

    // Se já existir, deletamos e criamos de novo para garantir uma instância "limpa"
    const isAlreadyInUse = !response.ok && (
      (typeof data?.response?.message === 'object' && JSON.stringify(data.response.message).includes('already in use')) ||
      (typeof data?.message === 'string' && data.message.includes('already'))
    );

    if (isAlreadyInUse) {
      // Deletar a antiga
      await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { 'apikey': globalApiKey as string }
      });

      // Criar a nova
      response = await fetch(`${evolutionUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': globalApiKey as string
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        })
      });
      data = await response.json();
    }

    // Configurar o webhook logo após a tentativa de criação
    // Em produção, deve ser o URL real onde o Next.js está hospedado (ex: https://replio.com.br/api/evolution/webhook)
    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = host ? `${protocol}://${host}` : 'http://localhost:3000';
    await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': globalApiKey as string
      },
      body: JSON.stringify({
        webhook: {
          url: `${baseUrl}/api/evolution/webhook`,
          enabled: true,
          byEvents: false,
          base64: false,
          events: ["MESSAGES_UPSERT"]
        }
      })
    });

    if (data?.qrcode?.base64) {
      return NextResponse.json({ qrcode: data.qrcode.base64 });
    } else if (data?.base64) {
       return NextResponse.json({ qrcode: data.base64 });
    } else if (data?.instance?.state === 'open') {
       return NextResponse.json({ connected: true, message: "WhatsApp já está conectado!" });
    } else {
      console.error("Erro detalhado da Evolution API:", data);
      return NextResponse.json({ 
        error: "Não foi possível gerar o QR Code", 
        details: data?.message || data?.error || "Resposta desconhecida",
        fullResponse: data
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Erro na Evolution API:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

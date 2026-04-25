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

    // Se já existir, a API pode retornar erro informando, então chamamos o connect
    if (!response.ok && data?.message?.includes("already exists")) {
      response = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': globalApiKey as string
        }
      });
      data = await response.json();
    }

    // Configurar o webhook logo após a tentativa de criação
    // Em produção, deve ser o URL real onde o Next.js está hospedado (ex: https://replio.com.br/api/evolution/webhook)
    const baseUrl = req.headers.get('host') ? `https://${req.headers.get('host')}` : 'http://localhost:3000';
    await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': globalApiKey as string
      },
      body: JSON.stringify({
        webhook: {
          url: `${baseUrl}/api/evolution/webhook`,
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
    } else {
      console.log("Evolution API response:", data);
      return NextResponse.json({ error: "Não foi possível gerar o QR Code", details: data }, { status: 500 });
    }

  } catch (error) {
    console.error("Erro na Evolution API:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

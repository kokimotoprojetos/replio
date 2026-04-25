import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const instanceName = "replio_user_1";
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const globalApiKey = process.env.EVOLUTION_API_KEY;

    // Comando para deslogar a instância na Evolution API
    const response = await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': globalApiKey as string
      }
    });

    const data = await response.json();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro ao deslogar:", error);
    return NextResponse.json({ error: "Erro ao desconectar" }, { status: 500 });
  }
}

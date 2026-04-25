"use client";

import { useState } from "react";
import { QrCode, RefreshCw } from "lucide-react";

export default function WhatsAppConnection() {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const generateQrCode = async () => {
    setLoading(true);
    setStatus("connecting");
    
    try {
      // Endpoint que fará a comunicação com a Evolution API
      const response = await fetch("/api/evolution/instance", {
        method: "POST",
      });
      const data = await response.json();
      
      if (data.qrcode) {
        setQrCode(data.qrcode);
      } else {
        setStatus("disconnected");
        alert("Erro ao gerar QR Code. Verifique sua chave da Evolution API.");
      }
    } catch (error) {
      console.error(error);
      setStatus("disconnected");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="h2" style={{ marginBottom: '0.5rem' }}>Conexão WhatsApp</h1>
      <p className="text-secondary" style={{ marginBottom: '2rem' }}>
        Conecte seu número de WhatsApp via Evolution API para que o Agente IA possa responder seus clientes.
      </p>

      <div className="glass-card" style={{ maxWidth: '500px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem' }}>Status da Instância</h3>
          <div className={`badge ${status === 'connected' ? 'badge-success' : 'badge-warning'}`}>
            {status === 'connected' ? 'Conectado' : status === 'connecting' ? 'Conectando...' : 'Desconectado'}
          </div>
        </div>

        {status !== 'connected' && !qrCode && (
          <div className="text-center" style={{ padding: '2rem 0' }}>
            <QrCode size={48} className="text-secondary" style={{ margin: '0 auto 1rem' }} />
            <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
              Para conectar o bot de IA, você precisa escanear o QR Code usando o WhatsApp do seu estabelecimento.
            </p>
            <button 
              onClick={generateQrCode} 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Gerar QR Code'}
            </button>
          </div>
        )}

        {qrCode && status !== 'connected' && (
          <div className="text-center" style={{ padding: '1rem 0' }}>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '1.5rem' }}>
              {/* O Evolution retorna o QRCode em base64 normalmente na prop qrcode.base64 ou a string em texto para gerar no frontend */}
              <img src={qrCode.startsWith('data:image') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} alt="QR Code WhatsApp" width={250} height={250} />
            </div>
            <p className="text-secondary">
              Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie este QR Code.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

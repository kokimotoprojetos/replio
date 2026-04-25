'use client';

import { useState, useEffect } from 'react';
import { QrCode, RefreshCw, LogOut, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function WhatsAppConnection() {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  useEffect(() => {
    // Checar status inicial
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('https://api-zap-evolution-api.vftyk2.easypanel.host/instance/connectionState/replio_user_1', {
        headers: { 'apikey': '8N8CE7R5NG284DSWLIW5E9EQ5VT4AVP9PH9O8DBQ' }
      });
      const data = await res.json();
      if (data.instance?.state === 'open') {
        setStatus('connected');
      }
    } catch (e) {}
  };

  const generateQrCode = async () => {
    setLoading(true);
    setStatus('connecting');
    setMessage(null);
    
    try {
      const response = await fetch("/api/evolution/instance", { method: "POST" });
      const data = await response.json();
      
      if (data.qrcode) {
        setQrCode(data.qrcode);
        setStatus('disconnected');
      } else if (data.connected) {
        setStatus('connected');
        setMessage({ type: 'info', text: 'Seu WhatsApp já está conectado!' });
      } else {
        setStatus('disconnected');
        setMessage({ type: 'error', text: data.details || 'Falha ao gerar QR Code.' });
      }
    } catch (error) {
      setStatus('disconnected');
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Deseja realmente desconectar este WhatsApp?")) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/evolution/instance/logout", { method: "POST" });
      if (res.ok) {
        setStatus('disconnected');
        setQrCode(null);
        setMessage({ type: 'success', text: 'WhatsApp desconectado com sucesso!' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao tentar desconectar.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="h2 text-gradient" style={{ marginBottom: '0.5rem' }}>Conexão WhatsApp</h1>
      <p className="text-secondary" style={{ marginBottom: '2rem' }}>
        Conecte ou gerencie o número de WhatsApp que o seu Agente IA utilizará.
      </p>

      {message && (
        <div className={`glass-card`} style={{ 
          marginBottom: '1.5rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
          borderLeft: `4px solid ${message.type === 'success' ? 'var(--primary)' : message.type === 'error' ? '#ef4444' : '#3b82f6'}`,
          maxWidth: '500px'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={20} color="var(--primary)" /> : 
           message.type === 'error' ? <AlertCircle size={20} color="#ef4444" /> : <Info size={20} color="#3b82f6" />}
          <span style={{ fontSize: '0.95rem' }}>{message.text}</span>
        </div>
      )}

      <div className="glass-card" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Status da Instância</h3>
          <div className={`badge ${status === 'connected' ? 'badge-success' : 'badge-warning'}`} style={{ padding: '0.5rem 1rem' }}>
            {status === 'connected' ? '● Conectado' : status === 'connecting' ? 'Conectando...' : 'Desconectado'}
          </div>
        </div>

        {status === 'connected' ? (
          <div className="text-center" style={{ padding: '2rem 0' }}>
            <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 size={40} color="var(--primary)" />
            </div>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Tudo pronto!</h4>
            <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '0.95rem' }}>
              O seu agente Replio já está ativo e respondendo neste número.
            </p>
            <button onClick={handleLogout} disabled={loading} className="btn btn-secondary" style={{ color: '#ef4444' }}>
              <LogOut size={18} /> Desconectar WhatsApp
            </button>
          </div>
        ) : !qrCode ? (
          <div className="text-center" style={{ padding: '2rem 0' }}>
            <QrCode size={64} className="text-secondary" style={{ margin: '0 auto 1.5rem', opacity: 0.5 }} />
            <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '0.95rem' }}>
              Gere um QR Code para vincular o WhatsApp do seu estabelecimento ao Replio.
            </p>
            <button onClick={generateQrCode} disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Gerar Novo QR Code'}
            </button>
          </div>
        ) : (
          <div className="text-center" style={{ padding: '1rem 0' }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1.5rem', display: 'inline-block', marginBottom: '1.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
              <img 
                src={qrCode.startsWith('data:image') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} 
                alt="QR Code WhatsApp" 
                width={250} 
                height={250} 
              />
            </div>
            <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Acesse <strong>Aparelhos Conectados</strong> no seu WhatsApp e escaneie o código acima.
            </p>
            <button onClick={() => setQrCode(null)} className="btn btn-secondary">Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Bot, Save, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MenuPage() {
  const [menuText, setMenuText] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleTrain = async () => {
    if (!menuText) {
      setStatus({ type: 'error', message: 'O texto do cardápio não pode estar vazio.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/menu/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ menuText, rulesText }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: 'Cardápio analisado e salvo! Sua IA já está pronta para usar essas informações.' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Erro ao salvar o cardápio.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Erro de conexão com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2 text-gradient">Cardápio & Regras</h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
          Cole seu cardápio aqui e a Inteligência Artificial vai organizá-lo automaticamente para responder aos seus clientes.
        </p>
      </header>

      {status && (
        <div className={`glass-card`} style={{ 
          marginBottom: '2rem', 
          padding: '1rem 1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          borderLeft: `4px solid ${status.type === 'success' ? 'var(--primary)' : '#ef4444'}` 
        }}>
          {status.type === 'success' ? <CheckCircle2 color="var(--primary)" /> : <AlertCircle color="#ef4444" />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="grid-features" style={{ marginTop: 0, gridTemplateColumns: '1fr 1fr' }}>
        <div className="glass-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <FileText className="text-primary" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Texto do Cardápio</h2>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            Copie e cole os itens do seu cardápio, com preços e descrições. Não precisa formatar perfeitamente, a IA vai entender.
          </p>
          <div className="form-group">
            <textarea 
              className="form-textarea" 
              placeholder="Ex: Hambúrguer Simples - R$ 20,00 (Pão, carne, queijo)&#10;Batata Frita Média - R$ 15,00"
              value={menuText}
              onChange={(e) => setMenuText(e.target.value)}
              style={{ minHeight: '300px' }}
            />
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <Bot className="text-gradient" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Regras do Robô</h2>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            Como a IA deve se comportar? Quais as formas de pagamento? Tem taxa de entrega fixa?
          </p>
          <div className="form-group">
            <textarea 
              className="form-textarea" 
              placeholder="Ex: Aceitamos apenas Pix e Dinheiro. A taxa de entrega é R$5 fixa para toda a cidade. Sempre pergunte se precisa de troco."
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              style={{ minHeight: '300px' }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          className="btn btn-primary" 
          onClick={handleTrain} 
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Analisando e Salvando...' : (
            <>
              <Save size={18} /> Salvar e Treinar IA
            </>
          )}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Bot, Save, FileText, CheckCircle2, AlertCircle, Image as ImageIcon, List } from 'lucide-react';

export default function MenuPage() {
  const [menuText, setMenuText] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    // Carregar o cardápio existente ao abrir a página
    fetch('/api/menu/get')
      .then(res => res.json())
      .then(data => {
        if (data?.menuData) {
          setMenuText(data.menuData.raw_menu || '');
          setRulesText(data.menuData.rules || '');
          if (data.menuData.structured_items?.items) {
            setParsedItems(data.menuData.structured_items.items);
          }
        }
      });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleTrain = async () => {
    if (!menuText && !imageBase64) {
      setStatus({ type: 'error', message: 'Você precisa digitar o texto ou enviar uma foto do cardápio.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/menu/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuText, rulesText, imageBase64 }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: 'Cardápio analisado e salvo! A IA já sabe de tudo.' });
        if (data.parsedItems?.items) {
          setParsedItems(data.parsedItems.items);
        }
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
        <h1 className="h2 text-gradient">Cardápio Inteligente</h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
          Faça upload da foto do cardápio ou cole o texto. Nossa IA vai ler, salvar no banco e preparar os itens para o WhatsApp.
        </p>
      </header>

      {status && (
        <div className="glass-card" style={{ 
          marginBottom: '2rem', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Entrada do Cardápio</h2>
          </div>
          
          <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <ImageIcon size={32} className="text-secondary" style={{ margin: '0 auto 0.5rem' }} />
            <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Envie uma foto do seu cardápio</p>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: '0.875rem' }} />
            {imageBase64 && <p style={{ color: 'var(--primary)', marginTop: '0.5rem', fontSize: '0.875rem' }}>Imagem anexada pronta para análise!</p>}
          </div>

          <p className="text-secondary" style={{ textAlign: 'center', margin: '1rem 0' }}>OU</p>

          <textarea 
            className="form-textarea" 
            placeholder="Digite ou cole os itens do cardápio aqui..."
            value={menuText}
            onChange={(e) => setMenuText(e.target.value)}
            style={{ minHeight: '150px', width: '100%' }}
          />
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <Bot className="text-gradient" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Regras do Robô</h2>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            Quais as regras de entrega, pagamento, etc?
          </p>
          <textarea 
            className="form-textarea" 
            placeholder="Ex: Aceitamos Pix e Dinheiro. Entrega fixa de R$5."
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            style={{ minHeight: '300px', width: '100%' }}
          />
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handleTrain} disabled={loading} style={{ width: '100%', maxWidth: '400px' }}>
          {loading ? 'A IA está lendo e analisando...' : <><Save size={18} /> Salvar e Gerar Itens</>}
        </button>
      </div>

      {parsedItems.length > 0 && (
        <div className="glass-card" style={{ marginTop: '3rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <List className="text-primary" size={24} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Itens Lidos pela IA</h2>
          </div>
          <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
            Esses são os itens que a inteligência artificial identificou no banco de dados e vai usar para vender no WhatsApp:
          </p>
          
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {parsedItems.map((item, idx) => (
              <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', background: 'var(--bg-dark)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{item.name}</strong>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>R$ {item.price}</span>
                </div>
                {item.category && <span className="badge badge-warning" style={{ marginBottom: '0.5rem' }}>{item.category}</span>}
                {item.description && <p className="text-secondary" style={{ fontSize: '0.875rem' }}>{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

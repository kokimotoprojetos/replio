'use client';

import { useState, useEffect } from 'react';
import { Bot, Save, FileText, CheckCircle2, AlertCircle, Image as ImageIcon, Search, PlusCircle } from 'lucide-react';

export default function MenuPage() {
  const [menuText, setMenuText] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1 = Upload, 2 = Review & Category
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    // Carregar regras existentes
    fetch('/api/menu/get')
      .then(res => res.json())
      .then(data => {
        if (data?.menuData?.rules) {
          setRulesText(data.menuData.rules);
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

  const handleExtract = async () => {
    if (!menuText && !imageBase64) {
      setStatus({ type: 'error', message: 'Envie uma foto ou digite o texto.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/menu/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuText, imageBase64 }),
      });

      const data = await res.json();

      if (res.ok && data.items) {
        setPendingItems(data.items);
        setStep(2); // Vai para o passo de revisar e categorizar
      } else {
        setStatus({ type: 'error', message: data.error || 'Erro ao extrair.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Erro de conexão.' });
    } finally {
      setLoading(false);
    }
  };

  const applyCategory = () => {
    if (!categoryInput) return;
    const updated = pendingItems.map(item => ({ ...item, category: categoryInput }));
    setPendingItems(updated);
  };

  const handleSaveToDB = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/menu/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newItems: pendingItems, rulesText, imageBase64 }),
      });

      if (res.ok) {
        setStatus({ type: 'success', message: 'Itens adicionados ao estoque com sucesso!' });
        setStep(1);
        setPendingItems([]);
        setImageBase64(null);
        setMenuText('');
        setCategoryInput('');
      } else {
        setStatus({ type: 'error', message: 'Erro ao salvar no banco.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Erro de conexão.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2 text-gradient">Adicionar ao Cardápio</h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
          Faça o upload de uma página do seu cardápio, revise as categorias e salve no estoque da IA.
        </p>
      </header>

      {status && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: `4px solid ${status.type === 'success' ? 'var(--primary)' : '#ef4444'}` }}>
          {status.type === 'success' ? <CheckCircle2 color="var(--primary)" /> : <AlertCircle color="#ef4444" />}
          <span>{status.message}</span>
        </div>
      )}

      {step === 1 && (
        <div className="grid-features" style={{ marginTop: 0, gridTemplateColumns: '1fr 1fr' }}>
          <div className="glass-card">
            <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
              <FileText className="text-primary" size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Entrada do Cardápio</h2>
            </div>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '0.5rem', textAlign: 'center' }}>
              <ImageIcon size={32} className="text-secondary" style={{ margin: '0 auto 0.5rem' }} />
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: '0.875rem' }} />
              {imageBase64 && <p style={{ color: 'var(--primary)', marginTop: '0.5rem', fontSize: '0.875rem' }}>Imagem anexada!</p>}
            </div>

            <p className="text-secondary" style={{ textAlign: 'center', margin: '1rem 0' }}>OU digite</p>

            <textarea 
              className="form-textarea" 
              placeholder="Digite os itens aqui..."
              value={menuText}
              onChange={(e) => setMenuText(e.target.value)}
              style={{ minHeight: '100px', width: '100%' }}
            />

            <button className="btn btn-primary" onClick={handleExtract} disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
              {loading ? 'Lendo...' : 'Extrair Itens'}
            </button>
          </div>

          <div className="glass-card">
            <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
              <Bot className="text-gradient" size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Regras do Robô</h2>
            </div>
            <textarea 
              className="form-textarea" 
              placeholder="Ex: Aceitamos Pix. Entrega de R$5."
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              style={{ minHeight: '250px', width: '100%' }}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Passo 2: Categorizar e Salvar</h2>
            <button className="btn text-secondary" onClick={() => setStep(1)}>Voltar</button>
          </div>
          
          <div style={{ background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Aplicar categoria a todos os itens lidos:</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Bebidas, Lanches, Combos..." 
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <button className="btn btn-secondary" onClick={applyCategory}>Aplicar</button>
          </div>

          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', marginBottom: '2rem' }}>
            {pendingItems.map((item, idx) => (
              <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{item.name}</strong>
                  <span style={{ color: 'var(--primary)' }}>R$ {item.price}</span>
                </div>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Categoria" 
                  value={item.category || ''}
                  onChange={(e) => {
                    const updated = [...pendingItems];
                    updated[idx].category = e.target.value;
                    setPendingItems(updated);
                  }}
                  style={{ width: '100%', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                />
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={handleSaveToDB} disabled={loading} style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex' }}>
            {loading ? 'Salvando...' : <><Save size={18} /> Confirmar e Adicionar ao Estoque</>}
          </button>
        </div>
      )}
    </div>
  );
}

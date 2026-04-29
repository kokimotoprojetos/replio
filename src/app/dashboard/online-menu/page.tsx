'use client';

import { useState, useEffect } from 'react';
import { Globe, Copy, ExternalLink, QrCode, ImageIcon } from 'lucide-react';

export default function OnlineMenuPage() {
  const [menuData, setMenuData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/menu/get')
      .then(res => res.json())
      .then(data => {
        if (data.menuData) {
          setMenuData(data.menuData);
        }
        setLoading(false);
      });
  }, []);

  const publicUrl = menuData ? `${window.location.origin}/menu/${menuData.id}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="animate-fade-up">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2 text-gradient">Cardápio Online</h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
          Gerencie o link público do seu cardápio e visualize sua imagem salva.
        </p>
      </header>

      <div className="grid-features" style={{ marginTop: 0, gridTemplateColumns: '1fr 1fr' }}>
        {/* Link e Compartilhamento */}
        <div className="glass-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <Globe className="text-primary" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Seu Link Público</h2>
          </div>

          <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', wordBreak: 'break-all' }}>
            <code style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>{publicUrl || 'Nenhum menu configurado'}</code>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={copyToClipboard} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Copy size={18} style={{ marginRight: '0.5rem' }} />
              {copied ? 'Copiado!' : 'Copiar Link'}
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
              <ExternalLink size={18} style={{ marginRight: '0.5rem' }} />
              Abrir
            </a>
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '1rem', display: 'inline-block', width: '100%' }}>
             <p style={{ color: 'black', marginBottom: '1rem', fontWeight: 600 }}>QR Code para Clientes</p>
             <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', display: 'inline-block' }}>
                <QrCode size={150} color="black" />
             </div>
             <p style={{ color: '#6b7280', marginTop: '1rem', fontSize: '0.75rem' }}>Aponte a câmera para testar</p>
          </div>
        </div>

        {/* Visualização da Imagem */}
        <div className="glass-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <ImageIcon className="text-gradient" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Imagem do Cardápio</h2>
          </div>

          {menuData?.image_data ? (
            <div style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <img 
                src={menuData.image_data} 
                alt="Cardápio" 
                style={{ width: '100%', height: 'auto', display: 'block' }} 
              />
            </div>
          ) : (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '0.5rem' }}>
              <ImageIcon size={48} className="text-secondary" style={{ margin: '0 auto 1rem' }} />
              <p className="text-secondary">Nenhuma imagem de cardápio armazenada ainda.</p>
              <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Vá em "Cardápio & Regras" e faça um upload.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

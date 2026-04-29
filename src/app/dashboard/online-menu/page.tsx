'use client';

import { useState, useEffect } from 'react';
import { ImageIcon, Trash2, Plus, Save, Loader2, CheckCircle2 } from 'lucide-react';

export default function OnlineMenuPage() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetch('/api/menu/get')
      .then(res => res.json())
      .then(data => {
        if (data.menuData?.image_data) {
          try {
            // Tenta parsear como JSON (array de imagens)
            const parsed = JSON.parse(data.menuData.image_data);
            setImages(Array.isArray(parsed) ? parsed : [data.menuData.image_data]);
          } catch {
            // Se não for JSON, trata como string única
            setImages([data.menuData.image_data]);
          }
        }
        setLoading(false);
      });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const saveImages = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/menu/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newItems: [], // Não estamos adicionando novos itens aqui
          imageBase64: JSON.stringify(images) 
        }),
      });

      if (res.ok) {
        setStatus({ type: 'success', message: 'Imagens do cardápio salvas com sucesso!' });
      } else {
        setStatus({ type: 'error', message: 'Erro ao salvar imagens.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Erro de conexão.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="animate-fade-up">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2 text-gradient">Imagens do Cardápio</h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
          Suba as fotos do seu cardápio aqui. O Agente IA enviará essas imagens automaticamente quando o cliente pedir o cardápio.
        </p>
      </header>

      {status && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: `4px solid ${status.type === 'success' ? 'var(--primary)' : '#ef4444'}` }}>
          {status.type === 'success' ? <CheckCircle2 color="var(--primary)" /> : <ImageIcon color="#ef4444" />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="glass-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {images.map((img, idx) => (
            <div key={idx} className="relative group" style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)', aspectRatio: '3/4' }}>
              <img src={img} alt={`Menu ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button 
                onClick={() => removeImage(idx)}
                style={{ 
                  position: 'absolute', 
                  top: '0.5rem', 
                  right: '0.5rem', 
                  background: '#ef4444', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.25rem', 
                  padding: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          
          <label style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            border: '2px dashed var(--border-color)', 
            borderRadius: '0.5rem', 
            aspectRatio: '3/4',
            cursor: 'pointer',
            transition: 'border-color 0.2s'
          }} className="hover:border-primary">
            <Plus size={32} className="text-secondary" />
            <span className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Adicionar Foto</span>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={saveImages} 
          disabled={saving} 
          style={{ width: '100%', maxWidth: '300px', margin: '0 auto', display: 'flex', gap: '0.5rem' }}
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}

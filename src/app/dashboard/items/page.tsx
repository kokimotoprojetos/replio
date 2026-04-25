'use client';

import { useState, useEffect } from 'react';
import { List, Search, Loader2 } from 'lucide-react';

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/menu/get')
      .then(res => res.json())
      .then(data => {
        if (data?.menuData?.structured_items?.items) {
          setItems(data.menuData.structured_items.items);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-up">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="h2 text-gradient">Meus Itens</h1>
          <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
            Estes são todos os produtos que a IA extraiu do seu cardápio e está usando para vender no WhatsApp.
          </p>
        </div>
      </header>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div className="flex items-center gap-2">
            <List className="text-primary" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Estoque da IA</h2>
          </div>
          
          {/* Barra de Busca */}
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar item ou categoria..." 
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ marginBottom: '1rem' }} />
            <p>Carregando seus itens do banco de dados...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Nenhum item encontrado.</p>
            <p style={{ fontSize: '0.875rem' }}>Faça o upload do seu cardápio na aba "Cardápio & Regras" para a IA popular esta lista.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filteredItems.map((item, idx) => (
              <div key={idx} style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '1rem', background: 'var(--bg-card)', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{item.name}</strong>
                  <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem' }}>
                    {typeof item.price === 'number' ? `R$ ${item.price.toFixed(2)}` : `R$ ${item.price}`}
                  </span>
                </div>
                {item.category && <span className="badge badge-warning" style={{ marginBottom: '1rem' }}>{item.category}</span>}
                {item.description && <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{item.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { List, Search, Loader2, Trash2, Edit2, Check, X } from 'lucide-react';

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controle de Seleção
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  
  // Controle de Edição
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', category: '', description: '' });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = () => {
    setLoading(true);
    fetch('/api/menu/get')
      .then(res => res.json())
      .then(data => {
        if (data?.menuData?.structured_items?.items) {
          setItems(data.menuData.structured_items.items);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const updateDatabase = async (newItems: any[]) => {
    try {
      await fetch('/api/menu/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedItems: newItems }),
      });
      setItems(newItems);
    } catch (error) {
      alert("Erro ao atualizar o banco de dados.");
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // SELEÇÃO
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Seleciona apenas os visíveis na busca (ou todos)
      setSelectedIndices(filteredItems.map((_, idx) => items.indexOf(filteredItems[idx])));
    } else {
      setSelectedIndices([]);
    }
  };

  const toggleSelect = (originalIndex: number) => {
    if (selectedIndices.includes(originalIndex)) {
      setSelectedIndices(selectedIndices.filter(i => i !== originalIndex));
    } else {
      setSelectedIndices([...selectedIndices, originalIndex]);
    }
  };

  // EXCLUSÃO
  const deleteSelected = () => {
    if (selectedIndices.length === 0) return;
    if (!confirm(`Tem certeza que deseja apagar ${selectedIndices.length} item(ns)?`)) return;

    const newItems = items.filter((_, idx) => !selectedIndices.includes(idx));
    updateDatabase(newItems);
    setSelectedIndices([]);
  };

  const deleteSingle = (originalIndex: number) => {
    if (!confirm('Tem certeza que deseja apagar este item?')) return;
    const newItems = items.filter((_, idx) => idx !== originalIndex);
    updateDatabase(newItems);
  };

  // EDIÇÃO
  const startEdit = (originalIndex: number, item: any) => {
    setEditingIndex(originalIndex);
    setEditForm({
      name: item.name || '',
      price: item.price || '',
      category: item.category || '',
      description: item.description || ''
    });
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const newItems = [...items];
    newItems[editingIndex] = { ...newItems[editingIndex], ...editForm };
    updateDatabase(newItems);
    setEditingIndex(null);
  };

  return (
    <div className="animate-fade-up">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="h2 text-gradient">Meus Itens</h1>
          <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
            Gerencie o estoque do seu robô. Edite ou exclua o que a IA aprendeu.
          </p>
        </div>
      </header>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div className="flex items-center gap-4">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <List className="text-primary" size={24} /> Estoque
            </h2>
            
            {/* Controles em Massa */}
            {items.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-dark)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={selectedIndices.length === filteredItems.length && filteredItems.length > 0}
                  />
                  Selecionar Tudo
                </label>

                {selectedIndices.length > 0 && (
                  <button onClick={deleteSelected} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={16} /> Apagar Selecionados ({selectedIndices.length})
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Barra de Busca */}
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar item..." 
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
            <p>Carregando itens...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Nenhum item encontrado.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {filteredItems.map((item, index) => {
              const originalIndex = items.indexOf(item);
              const isEditing = editingIndex === originalIndex;
              const isSelected = selectedIndices.includes(originalIndex);

              return (
                <div key={originalIndex} style={{ 
                  padding: '1.5rem', 
                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`, 
                  borderRadius: '1rem', 
                  background: isSelected ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-card)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}>
                  
                  {/* Checkbox Individual */}
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelect(originalIndex)}
                      style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                    />
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                      <input className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Nome" />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input className="form-input" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} placeholder="Preço" style={{ width: '40%' }} />
                        <input className="form-input" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} placeholder="Categoria" style={{ width: '60%' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button className="btn btn-primary" onClick={saveEdit} style={{ flex: 1, padding: '0.5rem' }}><Check size={16} /> Salvar</button>
                        <button className="btn btn-secondary" onClick={() => setEditingIndex(null)} style={{ flex: 1, padding: '0.5rem' }}><X size={16} /> Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ paddingRight: '2rem' }}>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>{item.name}</strong>
                        <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem', display: 'block', marginBottom: '0.5rem' }}>
                          {typeof item.price === 'number' ? `R$ ${item.price.toFixed(2)}` : `R$ ${item.price}`}
                        </span>
                      </div>
                      
                      {item.category && <span className="badge badge-warning" style={{ marginBottom: '1rem' }}>{item.category}</span>}
                      
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <button onClick={() => startEdit(originalIndex, item)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <Edit2 size={16} /> Editar
                        </button>
                        <button onClick={() => deleteSingle(originalIndex)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                          <Trash2 size={16} /> Excluir
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

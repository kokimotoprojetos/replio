'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Save, Loader2, CheckCircle2, AlertCircle, Search } from 'lucide-react';

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function DeliveryFeesPage() {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // New item state
  const [newRegion, setNewRegion] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCityId, setNewCityId] = useState('');
  const [newState, setNewState] = useState('SP');
  const [newFee, setNewFee] = useState('');

  // API data
  const [cities, setCities] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    fetchFees();
  }, []);

  // Buscar cidades quando mudar o estado
  useEffect(() => {
    if (newState) {
      setLoadingLocations(true);
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${newState}/municipios`)
        .then(res => res.json())
        .then(data => {
          setCities(data.sort((a: any, b: any) => a.nome.localeCompare(b.nome)));
          setLoadingLocations(false);
        });
    }
  }, [newState]);

  // Buscar bairros quando mudar a cidade (usando ViaCEP ou similar para simular/complementar)
  useEffect(() => {
    if (newCity) {
      // Nota: IBGE não tem API de bairros para todas as cidades de forma simples.
      // Vou deixar o campo de bairro como um input com sugestões ou texto livre.
      setNeighborhoods([]); 
    }
  }, [newCity]);

  const fetchFees = async () => {
    try {
      const res = await fetch('/api/delivery-fees');
      const data = await res.json();
      setFees(data.fees || []);
    } catch (err) {
      console.error('Erro ao buscar taxas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegion || !newFee || !newCity) return;

    setSaving(true);
    try {
      const res = await fetch('/api/delivery-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region_name: newRegion,
          city: newCity,
          state: newState,
          fee: newFee
        }),
      });

      if (res.ok) {
        setNewRegion('');
        fetchFees();
        setStatus({ type: 'success', message: 'Região adicionada com sucesso!' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Erro ao adicionar região.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta região?')) return;

    try {
      const res = await fetch('/api/delivery-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });

      if (res.ok) {
        setFees(fees.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const filteredFees = fees.filter(f => 
    f.region_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="animate-fade-up">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2 text-gradient">Taxas e Regiões</h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
          Configure o valor da entrega para cada bairro ou cidade. O Agente IA usará esses valores ao calcular o total do pedido.
        </p>
      </header>

      {status && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: `4px solid ${status.type === 'success' ? 'var(--primary)' : '#ef4444'}` }}>
          {status.type === 'success' ? <CheckCircle2 color="var(--primary)" /> : <AlertCircle color="#ef4444" />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="grid-features" style={{ marginTop: 0, gridTemplateColumns: '1fr 2fr', alignItems: 'start' }}>
        {/* Formulário de Adição */}
        <div className="glass-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <Plus className="text-primary" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Nova Região</h2>
          </div>

          <form onSubmit={handleAdd} style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
              <div>
                <label className="form-label">UF</label>
                <select 
                  className="form-input w-full" 
                  value={newState}
                  onChange={(e) => {
                    setNewState(e.target.value);
                    setNewCity('');
                  }}
                  style={{ height: '42px' }}
                >
                  {STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Cidade {loadingLocations && <Loader2 className="animate-spin inline" size={12} />}</label>
                <select 
                  className="form-input w-full" 
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  style={{ height: '42px' }}
                  required
                >
                  <option value="">Selecione a cidade</option>
                  {cities.map(city => <option key={city.id} value={city.nome}>{city.nome}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Bairro / Região de Entrega</label>
              <input 
                type="text" 
                className="form-input w-full" 
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                placeholder="Ex: Centro, Vila Mariana..."
                required
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Dica: Você pode colocar "Toda a Cidade" se o preço for único.
              </p>
            </div>

            <div>
              <label className="form-label">Taxa de Entrega (R$)</label>
              <input 
                type="number" 
                step="0.01"
                className="form-input w-full" 
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving} 
              style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              Adicionar Taxa
            </button>
          </form>
        </div>

        {/* Lista de Regiões */}
        <div className="glass-card">
          <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
            <div className="flex items-center gap-2">
              <MapPin className="text-gradient" size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Regiões Cadastradas</h2>
            </div>
            
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="form-input w-full"
                style={{ paddingLeft: '2rem', fontSize: '0.875rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Bairro/Região</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Cidade/UF</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Taxa</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Nenhuma região encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredFees.map((fee) => (
                    <tr key={fee.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{fee.region_name}</td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{fee.city} / {fee.state}</td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-success">R$ {fee.fee.toFixed(2)}</span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDelete(fee.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

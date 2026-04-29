'use client';

import { useState, useEffect } from 'react';
import { Bot, Clock, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const DAYS = [
  { id: 'monday', label: 'Segunda-feira' },
  { id: 'tuesday', label: 'Terça-feira' },
  { id: 'wednesday', label: 'Quarta-feira' },
  { id: 'thursday', label: 'Quinta-feira' },
  { id: 'friday', label: 'Sexta-feira' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' },
];

export default function AgentSettingsPage() {
  const [agentName, setAgentName] = useState('Replio');
  const [instructions, setInstructions] = useState('');
  const [hours, setHours] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setAgentName(data.settings.agent_name || 'Replio');
          setInstructions(data.settings.agent_instructions || '');
          setHours(data.settings.business_hours || {});
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: agentName,
          agent_instructions: instructions,
          business_hours: hours,
        }),
      });

      if (res.ok) {
        setStatus({ type: 'success', message: 'Configurações salvas com sucesso!' });
      } else {
        setStatus({ type: 'error', message: 'Erro ao salvar configurações.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Erro de conexão.' });
    } finally {
      setSaving(false);
    }
  };

  const updateHour = (day: string, field: string, value: any) => {
    setHours((prev: any) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="animate-fade-up">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="h2 text-gradient">Agente & Horários</h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
          Personalize a personalidade do seu Agente IA e defina os horários de funcionamento.
        </p>
      </header>

      {status && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: `4px solid ${status.type === 'success' ? 'var(--primary)' : '#ef4444'}` }}>
          {status.type === 'success' ? <CheckCircle2 color="var(--primary)" /> : <AlertCircle color="#ef4444" />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="grid-features" style={{ marginTop: 0, gridTemplateColumns: '1fr 1.2fr' }}>
        {/* Configurações do Agente */}
        <div className="glass-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <Bot className="text-primary" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Personalidade do Agente</h2>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Nome do Agente</label>
            <input 
              type="text" 
              className="form-input" 
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Ex: Replio, Atendente Virtual..."
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Instruções Personalizadas</label>
            <p className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              Diga como o agente deve se comportar (Ex: "Seja brincalhão", "Fale apenas o essencial", "Dê ênfase na nossa promoção de hoje").
            </p>
            <textarea 
              className="form-textarea" 
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Digite aqui as instruções para o seu agente..."
              style={{ width: '100%', minHeight: '150px' }}
            />
          </div>
        </div>

        {/* Horários de Funcionamento */}
        <div className="glass-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <Clock className="text-gradient" size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Horários de Funcionamento</h2>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {DAYS.map((day) => (
              <div key={day.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-dark)', borderRadius: '0.5rem' }}>
                <div style={{ width: '120px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{day.label}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="time" 
                    className="form-input" 
                    disabled={hours[day.id]?.closed}
                    value={hours[day.id]?.open || '18:00'}
                    onChange={(e) => updateHour(day.id, 'open', e.target.value)}
                    style={{ padding: '0.25rem', fontSize: '0.875rem' }}
                  />
                  <span>até</span>
                  <input 
                    type="time" 
                    className="form-input" 
                    disabled={hours[day.id]?.closed}
                    value={hours[day.id]?.close || '23:00'}
                    onChange={(e) => updateHour(day.id, 'close', e.target.value)}
                    style={{ padding: '0.25rem', fontSize: '0.875rem' }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={hours[day.id]?.closed} 
                    onChange={(e) => updateHour(day.id, 'closed', e.target.checked)}
                  />
                  Fechado
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={saving} 
          style={{ width: '100%', maxWidth: '400px', display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0 auto' }}
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}

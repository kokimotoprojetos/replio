'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, MapPin, CreditCard, User, Clock, Copy, CheckCircle2, ClipboardList } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOrders = () => {
    fetch('/api/orders/get')
      .then(res => res.json())
      .then(data => {
        if (data.orders) {
          setOrders(data.orders);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Atualiza a cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const copyOrder = (order: any) => {
    const text = `*NOVO PEDIDO - REPLIO*\n\n` +
      `*Cliente:* ${order.customer_name}\n` +
      `*Pagamento:* ${order.payment_method}\n` +
      `*Localização:* ${order.delivery_location}\n\n` +
      `*ITENS:*\n` +
      (order.order_details?.items?.map((i: any) => `- ${i.n} (R$ ${i.p})`).join('\n') || '') +
      (order.order_details?.delivery_fee ? `\n- Taxa de Entrega (R$ ${order.order_details.delivery_fee})` : '') +
      `\n\n*TOTAL: R$ ${order.total_value}*`;
    
    navigator.clipboard.writeText(text);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <div className="p-8 text-center"><Clock className="animate-spin inline mr-2" /> Carregando pedidos...</div>;

  return (
    <div className="animate-fade-up">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="h2 text-gradient">Gerenciador de Pedidos</h1>
          <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
            Acompanhe em tempo real os pedidos finalizados pelo seu Agente IA.
          </p>
        </div>
        <div className="glass-card" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
           Monitorando Atendimento
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <ShoppingBag size={48} className="text-secondary" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Nenhum pedido ainda</h2>
          <p className="text-secondary">Assim que o Agente IA fechar um pedido no WhatsApp, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {orders.map((order) => (
            <div key={order.id} className="glass-card order-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: 'var(--primary)', color: 'black', padding: '0.75rem', borderRadius: '0.5rem' }}>
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{order.customer_name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(order.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>R$ {order.total_value}</div>
                   <button 
                    className={`btn ${copiedId === order.id ? 'btn-secondary' : 'btn-primary'}`} 
                    onClick={() => copyOrder(order)}
                    style={{ marginTop: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.875rem' }}
                   >
                     {copiedId === order.id ? <><CheckCircle2 size={16} /> Copiado</> : <><Copy size={16} /> Copiar para o PDV</>}
                   </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                   <CreditCard size={18} className="text-primary" style={{ marginTop: '0.2rem' }} />
                   <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Pagamento</span>
                      <span>{order.payment_method}</span>
                   </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                   <MapPin size={18} className="text-primary" style={{ marginTop: '0.2rem' }} />
                   <div style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Entrega</span>
                      <span style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>{order.delivery_location}</span>
                   </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-dark)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                   <ClipboardList size={16} className="text-secondary" />
                   <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Itens do Pedido</span>
                </div>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {order.order_details?.items?.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid #ffffff05' }}>
                       <span>{item.n}</span>
                       <span style={{ fontWeight: 600 }}>R$ {item.p}</span>
                    </div>
                  ))}
                  {order.order_details?.delivery_fee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', paddingTop: '0.5rem', borderTop: '2px dashed #ffffff10', marginTop: '0.5rem' }}>
                       <span style={{ color: 'var(--text-secondary)' }}>Taxa de Entrega</span>
                       <span style={{ fontWeight: 600 }}>R$ {order.order_details.delivery_fee}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardHome() {
  return (
    <div>
      <h1 className="h2" style={{ marginBottom: '0.5rem' }}>Bem-vindo ao Replio!</h1>
      <p className="text-secondary" style={{ marginBottom: '2rem' }}>
        Seu agente de atendimento automático já está ativo. Configure seu cardápio e conecte seu WhatsApp.
      </p>

      <div className="grid-features" style={{ marginTop: '0' }}>
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Status do Robô</h3>
          <div className="badge badge-warning">Desconectado</div>
          <p className="text-secondary" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            Vá até a aba "Conexão WhatsApp" para escanear o QR Code e conectar sua Evolution API.
          </p>
        </div>
        
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Pedidos Hoje</h3>
          <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>0</div>
          <p className="text-secondary" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Nenhum pedido recebido ainda.
          </p>
        </div>
      </div>
    </div>
  );
}

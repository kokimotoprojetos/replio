import Link from 'next/link';
import { Bot, Home, MessageSquare, Settings, QrCode } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="flex items-center gap-2" style={{ marginBottom: '2rem' }}>
          <Bot size={24} className="text-gradient" />
          <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>REPLIO</span>
        </div>
        
        <nav className="sidebar-nav" style={{ flex: 1 }}>
          <Link href="/dashboard" className="sidebar-link">
            <Home size={18} /> Resumo
          </Link>
          <Link href="/dashboard/whatsapp" className="sidebar-link">
            <QrCode size={18} /> Conexão WhatsApp
          </Link>
          <Link href="/dashboard/menu" className="sidebar-link">
            <MessageSquare size={18} /> Cardápio & Regras
          </Link>
          <Link href="/dashboard/settings" className="sidebar-link">
            <Settings size={18} /> Configurações
          </Link>
        </nav>
        
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserButton showName />
        </div>
      </aside>
      
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}

import Link from 'next/link';
import { Bot, Zap, Clock, Smartphone, ChevronRight } from 'lucide-react';
import { Show, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main>
      <div className="bg-glow glow-top-right"></div>
      <div className="bg-glow glow-bottom-left"></div>

      <nav className="navbar">
        <div className="container flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <Bot size={28} className="text-gradient" />
            <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>REPLIO</span>
          </div>
          <div className="flex items-center gap-4">
            <Show when="signed-out">
              <Link href="/sign-in" className="btn btn-secondary">Entrar</Link>
              <Link href="/sign-up" className="btn btn-primary">Começar Grátis</Link>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className="btn btn-primary">Acessar Dashboard</Link>
              <UserButton />
            </Show>
          </div>
        </div>
      </nav>

      <section className="hero container">
        <div className="flex-col items-center">
          <div className="badge badge-success animate-fade-up" style={{ marginBottom: '1.5rem' }}>
            <Zap size={14} style={{ marginRight: '0.25rem' }} /> NOVO: INTEGRAÇÃO EVOLUTION API
          </div>
          
          <h1 className="h1 animate-fade-up delay-100">
            Atendimento <span className="text-gradient">Automático</span><br />
            para o seu Delivery.
          </h1>
          
          <p className="animate-fade-up delay-200">
            Conecte seu WhatsApp e deixe nossa Inteligência Artificial tirar pedidos, enviar cardápios e responder dúvidas dos seus clientes 24 horas por dia.
          </p>
          
          <div className="flex gap-4 justify-center animate-fade-up delay-300">
            <Show when="signed-out">
              <Link href="/sign-up" className="btn btn-primary">
                Criar meu Agente <ChevronRight size={18} />
              </Link>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className="btn btn-primary">
                Acessar Dashboard <ChevronRight size={18} />
              </Link>
            </Show>
            <Link href="#features" className="btn btn-secondary">
              Ver como funciona
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="container" style={{ paddingBottom: '8rem' }}>
        <div className="text-center animate-fade-up">
          <h2 className="h2">Tudo que seu restaurante precisa</h2>
          <p className="text-secondary" style={{ marginTop: '1rem' }}>
            O Replio foi desenhado exclusivamente para operações de delivery.
          </p>
        </div>

        <div className="grid-features">
          <div className="glass-card animate-fade-up delay-100">
            <Bot size={32} className="text-gradient" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Agente Inteligente</h3>
            <p className="text-secondary">
              Nossa IA entende áudios, textos com erros de digitação e contexto. Ela sabe exatamente como conduzir o cliente até o fechamento do pedido.
            </p>
          </div>

          <div className="glass-card animate-fade-up delay-200">
            <Smartphone size={32} className="text-gradient" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>WhatsApp Oficial</h3>
            <p className="text-secondary">
              Conexão via QR Code super rápida e estável através da poderosa Evolution API. Use seu próprio número de WhatsApp Business.
            </p>
          </div>

          <div className="glass-card animate-fade-up delay-300">
            <Clock size={32} className="text-gradient" style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Atendimento 24/7</h3>
            <p className="text-secondary">
              Nunca mais perca uma venda porque o atendente estava ocupado. O Replio atende múltiplos clientes simultaneamente, sem filas.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

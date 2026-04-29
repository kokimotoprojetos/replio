import { createClient } from '@supabase/supabase-js';
import { Bot, MapPin, Phone, Clock } from 'lucide-react';
import Image from 'next/image';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function PublicMenuPage({ params }: { params: { id: string } }) {
  const { data: menu, error } = await supabase
    .from('menus')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !menu) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Cardápio não encontrado</h1>
        <p className="text-secondary">O link pode estar incorreto ou o cardápio foi removido.</p>
      </div>
    );
  }

  const items = menu.structured_items?.items || [];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Header Premium */}
      <div className="relative h-64 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0b] z-10" />
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" />
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-4">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-full mb-4 border border-white/20">
            <Bot size={48} className="text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-center">
            Cardápio <span className="text-gradient">Digital</span>
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-30 pb-20">
        {/* Info Card */}
        <div className="glass-card mb-8 p-6 flex flex-wrap justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-primary" />
            <span>Aberto agora</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            <span>Entrega em toda região</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={18} className="text-primary" />
            <span>Peça pelo WhatsApp</span>
          </div>
        </div>

        {/* Menu Image Section */}
        {menu.image_data && (
          <div className="glass-card p-2 mb-12 overflow-hidden">
            <div className="rounded-lg overflow-hidden border border-white/10">
              <img 
                src={menu.image_data} 
                alt="Cardápio Original" 
                className="w-full h-auto"
              />
            </div>
          </div>
        )}

        {/* Structured Items Section */}
        {items.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-8 text-center">Itens do Cardápio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item: any, index: number) => (
                <div key={index} className="glass-card p-6 flex justify-between items-start hover:border-primary/50 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                    <p className="text-secondary text-sm">{item.category || 'Geral'}</p>
                  </div>
                  <div className="text-primary font-bold text-lg">
                    R$ {item.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-secondary mb-4 italic">"{menu.rules || 'Atendimento automatizado via IA'}"</p>
          <a 
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`} 
            className="btn btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-full text-lg font-bold shadow-lg shadow-primary/20"
          >
            Fazer Pedido no WhatsApp
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-secondary text-sm">
        <p>Desenvolvido por <span className="font-bold text-white">REPLIO</span></p>
      </footer>
    </div>
  );
}

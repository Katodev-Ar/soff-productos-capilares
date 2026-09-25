'use client'

import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'

export default function MayoristasPage() {
  return (
    <main className="min-h-screen bg-[#e8e2d8] flex flex-col pt-16">
      
      {/* Hero Section */}
      <div className="relative w-full overflow-hidden flex flex-col items-center pt-12 md:pt-20">
        
        {/* Texts */}
        <div className="text-center z-10 px-6 max-w-2xl mx-auto mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl text-[#6d5b51] font-sans">
            Soff <span className="font-bold uppercase tracking-widest">MAYORISTAS</span>
          </h1>
        </div>

        {/* Placeholder for an aesthetic model image */}
        <div className="relative w-full max-w-3xl aspect-[4/3] md:aspect-video rounded-t-full md:rounded-t-[400px] overflow-hidden bg-[#dcd0c2] shadow-xl">
           <img 
              src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=2070&auto=format&fit=crop" 
              alt="Mayoristas Soff"
              className="w-full h-full object-cover object-top opacity-90"
           />
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-[#e8e2d8] w-full py-16 px-6 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl text-[#6d5b51] mb-2 font-medium">
            ¿Querés ser parte de Soff?
          </h2>
          <h3 className="text-3xl md:text-5xl font-bold text-[#6d5b51] mb-6">
            Ahora es posible
          </h3>
          
          <p className="text-[#6d5b51] text-lg md:text-xl leading-relaxed mb-10 opacity-90">
            Empezá a revender nuestros productos con un mínimo de compra súper accesible y sumate a una marca líder que acompaña a miles de clientes en el cuidado capilar.
          </p>

          <a 
            href="https://wa.me/5493816253929?text=Hola,%20me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20para%20ser%20mayorista%20de%20Soff." 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#6d5b51] text-[#e8e2d8] px-8 py-4 rounded-full text-lg font-bold uppercase tracking-wider hover:bg-[#584941] transition-transform hover:scale-105"
          >
            <MessageCircle size={24} />
            Contactanos al WhatsApp
          </a>

          <p className="mt-8 text-sm text-[#6d5b51] opacity-75">
            Una vez que nos contactes, nuestro equipo evaluará tu perfil y activará tu cuenta mayorista en la plataforma.
          </p>
        </div>
      </div>

    </main>
  )
}

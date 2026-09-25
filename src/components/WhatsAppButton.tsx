'use client'

import { useState } from 'react'
import { MessageCircle, X, ChevronRight } from 'lucide-react'

const WHATSAPP_NUMBER = '5493816253929' // Number formatted for wa.me

const faqs = [
  { id: 1, text: 'Quiero información sobre envíos y zonas de entrega' },
  { id: 2, text: 'Me gustaría ser revendedor/a de sus marcas' },
  { id: 3, text: 'Tengo una consulta sobre un pedido que realicé' },
  { id: 4, text: 'Otras consultas / Hablar con atención al cliente' },
]

export default function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false)

  const handleFaqClick = (question: string) => {
    const encodedMessage = encodeURIComponent(question)
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer')
    setIsOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Popup Window */}
      {isOpen && (
        <div className="mb-4 w-[320px] rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#25D366] p-4 text-white">
            <h3 className="font-bold text-lg">Soff Productos</h3>
            <p className="text-sm opacity-90">¡Hola! ¿En qué podemos ayudarte hoy?</p>
          </div>
          
          {/* FAQ List */}
          <div className="p-3 bg-gray-50 max-h-[300px] overflow-y-auto space-y-2">
            {faqs.map((faq) => (
              <button
                key={faq.id}
                onClick={() => handleFaqClick(faq.text)}
                className="w-full text-left bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <span className="pr-2">{faq.text}</span>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-[#25D366] flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Contactar por WhatsApp"
        className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none ${
          isOpen ? 'bg-gray-800' : 'bg-[#25D366] hover:bg-[#20bd5a]'
        }`}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>
    </div>
  )
}

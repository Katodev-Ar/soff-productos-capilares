'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function AutoCarousel({ children, speed = 3000 }: { children: React.ReactNode, speed?: number }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [canScroll, setCanScroll] = useState(false)

  const checkScroll = () => {
    if (scrollRef.current) {
      setCanScroll(scrollRef.current.scrollWidth > scrollRef.current.clientWidth)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [children])

  const scrollLeft = () => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' })
  }

  const scrollRight = () => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    const maxScroll = el.scrollWidth - el.clientWidth
    
    // If we are at the end (with a 20px tolerance), go back to start
    if (el.scrollLeft >= maxScroll - 20) {
      el.scrollTo({ left: 0, behavior: 'smooth' })
    } else {
      el.scrollBy({ left: 300, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const startAutoScroll = () => {
      intervalId = setInterval(() => {
        if (!isHovered && canScroll) {
          scrollRight()
        }
      }, speed)
    }

    startAutoScroll()

    return () => clearInterval(intervalId)
  }, [speed, isHovered, canScroll])

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {canScroll && (
        <button 
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-100 text-gray-700 hover:text-brand-primary group-hover:flex transition-all hover:scale-110"
          aria-label="Anterior"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <div 
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-6 pt-2 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        ref={scrollRef}
        onScroll={checkScroll}
      >
        {children}
      </div>

      {canScroll && (
        <button 
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 hidden h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-100 text-gray-700 hover:text-brand-primary group-hover:flex transition-all hover:scale-110"
          aria-label="Siguiente"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  )
}

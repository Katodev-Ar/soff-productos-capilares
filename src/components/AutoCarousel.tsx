'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type AutoCarouselProps = {
  children: React.ReactNode
  speed?: number
  label?: string
}

export default function AutoCarousel({ children, speed = 3000, label = 'Productos' }: AutoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [hasFocus, setHasFocus] = useState(false)
  const [canScroll, setCanScroll] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const checkScroll = () => setCanScroll(element.scrollWidth > element.clientWidth + 2)
    checkScroll()

    // Detectar cambios de tamaño de las tarjetas y del contenedor.
    const observer = new ResizeObserver(checkScroll)
    observer.observe(element)
    for (const child of element.children) observer.observe(child)
    window.addEventListener('resize', checkScroll)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', checkScroll)
    }
  }, [children])

  const move = (direction: -1 | 1) => {
    const element = scrollRef.current
    if (!element) return
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth)
    const next = element.scrollLeft + direction * Math.min(320, element.clientWidth * 0.85)
    const left = direction > 0 && element.scrollLeft >= maxScroll - 20 ? 0 : Math.max(0, next)
    element.scrollTo({ left, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }

  useEffect(() => {
    if (!canScroll || isHovered || hasFocus || prefersReducedMotion) return

    const timer = window.setInterval(() => {
      if (!document.hidden) {
        const element = scrollRef.current
        if (!element) return
        const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth)
        const left = element.scrollLeft >= maxScroll - 20 ? 0 : element.scrollLeft + Math.min(320, element.clientWidth * 0.85)
        element.scrollTo({ left, behavior: 'smooth' })
      }
    }, speed)
    return () => window.clearInterval(timer)
  }, [speed, isHovered, hasFocus, canScroll, prefersReducedMotion])

  return (
    <div
      className="group relative"
      role="region"
      aria-roledescription="carrusel"
      aria-label={label}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false)
      }}
    >
      {canScroll && (
        <button
          type="button"
          onClick={() => move(-1)}
          className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 sm:-translate-x-3 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          aria-label={`Anterior: ${label}`}
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-6 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {children}
      </div>

      {canScroll && (
        <button
          type="button"
          onClick={() => move(1)}
          className="absolute right-0 top-1/2 z-10 flex h-9 w-9 translate-x-1 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 shadow-md transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 sm:translate-x-3 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          aria-label={`Siguiente: ${label}`}
        >
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

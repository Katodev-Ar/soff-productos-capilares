import dynamic from 'next/dynamic'

export const MapSelector = dynamic(() => import('@/components/MapSelector'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Cargando mapa...</div>
})

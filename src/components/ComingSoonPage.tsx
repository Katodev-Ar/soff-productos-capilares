import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type ComingSoonPageProps = {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}

export default function ComingSoonPage({
  title,
  description,
  actionHref = '/productos',
  actionLabel = 'Ver productos',
}: ComingSoonPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <Header />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-brand-primary">Soff Productos Capilares</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#002f5b] sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-gray-600">{description}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={actionHref} className="rounded bg-[#002f5b] px-5 py-3 text-sm font-bold text-white hover:bg-black">
            {actionLabel}
          </Link>
          <Link href="/" className="rounded border border-gray-300 px-5 py-3 text-sm font-bold text-gray-800 hover:border-brand-primary">
            Volver al inicio
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { UploadCloud, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminStockCSVPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ updated: number, errors: string[] } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const processCSV = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)

    const text = await file.text()
    // Simple CSV parser (assuming comma separated and double quotes for fields with commas)
    const lines = text.split('\n').filter(line => line.trim() !== '')
    
    if (lines.length < 2) {
      setResult({ updated: 0, errors: ['El archivo está vacío o no tiene el formato correcto.'] })
      setUploading(false)
      return
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
    
    // Find expected columns: we need something to match (e.g. name or sku), and the fields to update (stock, price)
    const nameIdx = headers.findIndex(h => h.includes('nombre') || h.includes('name') || h.includes('producto'))
    const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('cantidad'))
    const priceRetailIdx = headers.findIndex(h => h.includes('precio') || h.includes('minorista') || h.includes('retail'))
    const priceWholesaleIdx = headers.findIndex(h => h.includes('mayorista') || h.includes('wholesale'))

    if (nameIdx === -1) {
      setResult({ updated: 0, errors: ['No se encontró la columna de Nombre/Producto en el CSV.'] })
      setUploading(false)
      return
    }

    let updatedCount = 0
    let errors: string[] = []

    // Fetch all products first to match by name
    const { data: products } = await supabase.from('products').select('id, name')

    if (!products) {
      setResult({ updated: 0, errors: ['Error al cargar productos de la base de datos.'] })
      setUploading(false)
      return
    }

    // Process each line
    for (let i = 1; i < lines.length; i++) {
      // Split by comma but respect quotes
      const columns = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || []
      
      const name = columns[nameIdx]
      if (!name) continue

      const product = products.find(p => p.name.toLowerCase() === name.toLowerCase())
      
      if (!product) {
        errors.push(`Fila ${i + 1}: Producto no encontrado "${name}"`)
        continue
      }

      const updates: any = {}
      if (stockIdx !== -1 && columns[stockIdx]) {
        updates.stock = parseInt(columns[stockIdx], 10)
      }
      if (priceRetailIdx !== -1 && columns[priceRetailIdx]) {
        updates.price_retail = parseFloat(columns[priceRetailIdx].replace(/[^0-9.-]+/g, ''))
      }
      if (priceWholesaleIdx !== -1 && columns[priceWholesaleIdx]) {
        updates.price_wholesale = parseFloat(columns[priceWholesaleIdx].replace(/[^0-9.-]+/g, ''))
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('products')
          .update(updates)
          .eq('id', product.id)
        
        if (error) {
          errors.push(`Fila ${i + 1}: Error al actualizar "${name}" - ${error.message}`)
        } else {
          updatedCount++
        }
      }
    }

    setResult({ updated: updatedCount, errors })
    setUploading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
          <ArrowLeft className="h-4 w-4" /> Volver al Panel
        </Link>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
            <UploadCloud className="h-7 w-7" /> Importar Stock (CSV)
          </h1>
          <p className="text-gray-500 mb-8">
            Subí un archivo CSV para actualizar masivamente el stock y los precios de tus productos.
            El sistema buscará coincidencias por el <strong>Nombre del producto</strong>.
          </p>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="hidden" 
              id="csv-upload"
            />
            <label 
              htmlFor="csv-upload" 
              className="cursor-pointer flex flex-col items-center justify-center gap-3"
            >
              <UploadCloud className="h-10 w-10 text-gray-400" />
              <span className="text-sm font-medium text-black bg-white border border-gray-200 px-4 py-2 rounded-full hover:bg-gray-50">
                Seleccionar archivo CSV
              </span>
              <span className="text-xs text-gray-500">
                {file ? file.name : 'Ningún archivo seleccionado'}
              </span>
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={processCSV}
              disabled={!file || uploading}
              className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
            >
              {uploading ? 'Procesando...' : 'Actualizar Base de Datos'}
            </button>
          </div>

          {result && (
            <div className={`mt-8 p-6 rounded-xl border ${result.errors.length === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <h3 className="font-bold flex items-center gap-2 mb-4">
                {result.errors.length === 0 ? (
                  <><CheckCircle className="h-5 w-5 text-green-600" /> ¡Actualización exitosa!</>
                ) : (
                  <><AlertTriangle className="h-5 w-5 text-yellow-600" /> Resultados de la importación</>
                )}
              </h3>
              
              <p className="text-sm font-medium mb-2">
                ✅ Se actualizaron {result.updated} productos correctamente.
              </p>

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-red-800 mb-2">Advertencias / Errores ({result.errors.length}):</p>
                  <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto bg-white p-3 rounded border border-red-100">
                    {result.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

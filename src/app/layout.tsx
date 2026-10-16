import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Soff Productos Capilares",
  description: "Expertos en el cuidado del cabello",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fallar en modo seguro: no habilitar autenticación, carrito o compra sin Supabase.
  // Permite compilar el sitio SIN variables reales para una revisión de código.
  if (!isSupabaseConfigured) {
    return (
      <html lang="es" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}
              style={{ margin: 0, padding: 32, minHeight: '100vh', background: '#faf9f7', color: '#222' }}>
          <main style={{ margin: '12vh auto', maxWidth: 640, lineHeight: 1.6 }} role="status">
            <h1>SOFF — configuración pendiente</h1>
            <p>Esta copia de revisión no tiene configurada la conexión a Supabase.</p>
            <p>Por seguridad se encuentran inhabilitados el acceso, el catálogo, las compras y los cobros.</p>
            <p>El propietario deberá configurar las variables del entorno de forma segura y volver a compilar
               y publicar el proyecto antes de realizar pruebas con datos reales.</p>
          </main>
        </body>
      </html>
    );
  }
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Soff Admin" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <CartProvider>
          <FavoritesProvider>
            {children}
            <CartDrawer />
            <WhatsAppButton />
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}

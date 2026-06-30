import { ShopSettings } from './types';

/**
 * ARCHIVO DE CONFIGURACIÓN DE LA TIENDA (DEFAULT / FALLBACK)
 * 
 * Este archivo contiene los datos estáticos por defecto de la tienda. 
 * Si la base de datos de Supabase no responde, está offline o decides 
 * alimentar la aplicación directamente desde aquí para simplificar, 
 * puedes modificar los valores en este objeto.
 */
export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  // Nombre principal de tu negocio
  shop_name: 'Cubanos en Miami',

  // Descripción corta que aparece bajo el nombre o en meta tags
  shop_description: 'La experiencia de compra más rápida de la web.',

  // Número telefónico de contacto visible en la web
  contact_number: '+1 7862942257',

  // Número de WhatsApp sin caracteres especiales (usado para enviar pedidos)
  whatsapp_number: '17862942257',

  // Horario laboral visible para los clientes
  business_hours: 'Lunes a Sábado 9am-5pm (Domingo Cerrado)',

  // Dirección física del negocio
  address: '16335 NW 48th Ave Miami Gardens, FL 33014',

  // Moneda por defecto de la tienda
  currency: '$',

  // ¿Mostrar la sección "Sobre Nosotros"? (true/false)
  about_visible: true,

  // Enlace oficial de la tienda (Utilizado para compartir y generar el Código QR dinámico)
  store_url: 'https://ais-pre-ab4uuppefwsrs3265ndeqg-801981886560.us-east1.run.app',

  // Texto explicativo de la sección "Sobre Nosotros"
  about_text: 'La experiencia de compra más rápida de la web.',

  // Marcador de posición (placeholder) en la barra de búsqueda inteligente
  smart_search_text: 'Búsqueda Inteligente',

  // URL del logo de la tienda (en blanco para usar el logo de texto por defecto)
  shop_logo_url: '',

  // Ajuste preestablecido de tema visual ('classic' | 'dark' | 'neon' | 'warm' | 'emerald')
  theme_preset: 'classic',

  // Color de acento primario
  color_primary: '#0f172a',

  // Color de fondo de la cabecera
  color_header_bg: '#ffffff',

  // Color de fondo de la página
  color_page_bg: '#F8F9FA',

  // Color principal del texto
  color_text: '#1e293b',

  // Color de fondo de las tarjetas de productos
  color_card_bg: '#ffffff',

  // Tipografía seleccionada para el diseño de la interfaz
  font_family: 'Inter',

  // Tipo de visualización del logo ('text' | 'image' | 'icon')
  shop_logo_type: 'text',

  // Valor textual o emoji si usas tipo 'text' o 'icon'
  shop_logo_val: 'M',

  // Monedas aceptadas en la pasarela de pedidos y conversión
  currencies: ['CUP', 'USD', 'EUR', 'MLC'],

  // ¿Mostrar barra de anuncio superior? (true/false)
  banner_visible: false,

  // Texto de la barra de anuncios
  banner_text: '',

  // Color de fondo del anuncio
  banner_bg: '#1e293b',

  // Color de texto del anuncio
  banner_text_color: '#ffffff',

  // Mensaje que aparece mientras la aplicación carga contenido
  loading_text: 'Actualizando, por favor espere...',

  // Tipo de mapa interactivo ('address' | 'coords' | 'embed')
  maps_option: 'address',

  // Coordenadas geográficas opcionales (lat,lng)
  maps_coords: '',

  // URL embebida de Google Maps opcional
  maps_embed_url: '',

  // Token del bot de notificaciones automáticas de Telegram (opcional)
  telegram_bot_token: '',

  // ID del chat o canal para recibir alertas de compra en Telegram (opcional)
  telegram_chat_id: '',

  // ¿Habilitar el canal de notificaciones automáticas de Telegram? (true/false)
  telegram_enabled: false
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Product, Worker, Order, AuditLog, SecurityAlert, ShopSettings, ProductCategory, ProductReview, SupportInquiry, VisitorHistoryEntry, Coupon } from './types';
import { generateInvoiceNumber, hashSHA256 } from './utils';

// Helper to check if string is a valid UUID
const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Default mock data so the app feels alive instantly
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: '0f76d605-edd2-4f99-816e-c206c1fd001b',
    name: '12 CUP ALUMINUM COFFEE MAKER 6-CS',
    description: '',
    price: 10.12,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/12 CUP ALUMINUM COFFEE MAKER 6-CS.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD',
    quantity_prices: [{ quantity: 6, price: 9.11 }]
  },
  {
    id: 'fdd969ee-cf0a-4fb0-a981-10d1a9f43bcb',
    name: '16CT Tide Pods Clean Breeze',
    description: '',
    price: 6.02,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/16CT Tide Pods Clean Breeze.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '6f35bc91-38a2-4b86-9d93-19b182a52dd8',
    name: '3pk 100gr Dettol Bar Soap',
    description: '',
    price: 2.15,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/3pk 100gr Dettol Bar Soap-Fresh.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '6be532b5-cb11-4908-839c-9209f495128a',
    name: '4 Pack Kids Tooth Brush With Cap Soft',
    description: '',
    price: 1.11,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/4 Pack Kids Tooth Brush With Cap Soft.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '84ffb764-99b5-4cc9-b163-824ae7f54aae',
    name: '4 Pack Tooth Brush With Cap Soft',
    description: '',
    price: 0.99,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/4 Pack Tooth Brush With Cap Soft.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '1b6987a9-4241-41e3-b459-37636280b47f',
    name: '4.2oz Crest-Tartar Protection Regular Paste',
    description: '',
    price: 1.64,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/4.2oz Crest-Tartar Protection Regular Paste.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '884ca244-fc89-4638-94de-5d317b049eda',
    name: '5 Pack Tooth Brush Clear Handle Soft',
    description: '',
    price: 0.99,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/5 Pack Tooth Brush Clear Handle Soft.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'aede4ef0-9958-48cf-834e-2336fb33ac4c',
    name: '5.4oz Crest Toothpaste W-Scoope 4pk',
    description: '',
    price: 12,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/5.4oz Crest Toothpaste W-Scoope 4pk.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '1cd3d000-0b26-4b01-b912-1c1e7be46322',
    name: '6 Cup Aluminum Coffee Maker 12-cs',
    description: '',
    price: 6.52,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/6 Cup Aluminum Coffee Maker 12-cs.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '4e4a98f9-06eb-4c9f-860a-f8f4f1f2ef18',
    name: '6.4oz Tp Whitening With Toothbrush',
    description: '',
    price: 1,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/6.4oz Tp Whitening With Toothbrush.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'f3d54f9d-cb64-42ce-b40d-ac59d057e9cb',
    name: '60 PC DENTAL FLOSS FLUORIDE-48',
    description: '',
    price: 1.15,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/60 PC DENTAL FLOSS FLUORIDE-48.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '2c0958da-f9b5-497d-8e10-a76c99954fa4',
    name: '9 Cup Aluminum Coffee Maker 12-cs',
    description: '',
    price: 8.42,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/9 Cup Aluminum Coffee Maker 12-cs.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '585daef3-1d23-4351-a432-18bb4041a437',
    name: 'Alas de Mariposa',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Alas de Mariposa.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'f11a3ff2-e45a-42e5-ae0d-ef97e2c54a9d',
    name: 'Alicia',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Alicia.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '9e801ecb-4630-4a5d-8abd-c44cfb363f80',
    name: 'Blue Moon',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Blue Moon.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'd8a1445f-bd07-4053-979f-64fc0994e749',
    name: 'Camerata',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Camerata.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '9941b5cc-5096-4b06-acc8-9b259c410996',
    name: 'Colgate 8 oz (226 gr)',
    description: '',
    price: 2.5,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Colgate 8 oz (226 gr).jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'e99ec8e6-ebf4-4bd1-8cd0-9dc2437125f8',
    name: 'Complice Man',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Complice Man.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'ba826053-7cc0-408c-9f50-05cd25aebc6a',
    name: 'Complice Woman',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Complice Woman.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '349c6eb2-5b8a-4fbe-8e79-db27bc21447f',
    name: 'Dove Body Spray',
    description: '',
    price: 2.68,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Dove Woman.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'c043de78-a26c-485f-ae80-2c120657a408',
    name: 'Dove Men',
    description: '',
    price: 3.75,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Dove Men.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '5e5f25d1-6eb4-4b15-ad29-3fa28aa2dfee',
    name: 'EcoFlow Delta 2 (950)',
    description: '',
    price: 750,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/EcoFlow Delta 2 (950).jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '58831200-17d3-4253-b623-6226f7c74a3c',
    name: 'EcoFlow Delta 3 Classic',
    description: '',
    price: 650,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/EcoFlow Delta 3 Classic.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '27ff9cde-c355-4636-9cb1-8fb9c61401b7',
    name: 'EcoFlow Delta 3 Max',
    description: '',
    price: 1100,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/EcoFlow Delta 3 Max.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '55b3ccb9-ce7a-41a8-95f7-392ca7483fec',
    name: 'Electric Espresso Maker 3 Cups, Red',
    description: '',
    price: 36.16,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Electric Espresso Maker 3 Cups, Red.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'f6b4603a-cc9b-4dcd-a207-0de22dd404ce',
    name: 'Electric Espresso Maker 6 Cups, Red',
    description: '',
    price: 40.9,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Electric Espresso Maker 6 Cups, Red.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '1a8d3a91-cb28-4b1b-b88b-12ee18789634',
    name: 'Electric Espresso Marker 6 Cups',
    description: '',
    price: 36.83,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Electric Espresso Marker 6 Cups.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'ac2ed0bf-bb2a-4e9e-8690-435f51828591',
    name: 'Elements',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Elements.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'f1f6a297-13d3-4871-b66c-f5a4d83feefc',
    name: 'Eva',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Eva.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '7b0a7ccb-97c8-4844-ab2d-125be9bab584',
    name: 'Habana',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Habana.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '9d0c5ea0-c40e-4c48-9f39-258b81d9699b',
    name: 'Habana Man',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Habana Man.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '97ab8cda-a57e-472c-bba4-1e9ebed4f216',
    name: 'Impacto Man',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Impacto Man.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '9b870271-9a76-43ae-8b66-96f0dd8ac4e5',
    name: 'Mariposa',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Mariposa.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '241210cb-de80-452b-aad5-acfa57e20866',
    name: 'Mariposa Absolu',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Mariposa Absolu.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '24d01af6-321b-4d09-9cb3-fe1ace4d5e4b',
    name: 'Nao',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Nao.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '91f7a0aa-26c3-48d9-b868-dfb731e42f39',
    name: 'Premium Panini Maker 2 Slice',
    description: '',
    price: 30.95,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Panini Maker 2 Slice.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '9fb85924-7bef-4813-af21-31edcbaee6c2',
    name: 'Premium Rice Cooker 1.2L- 6 Cups',
    description: '',
    price: 18,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Rice Cooker 1.2L- 6 Cups.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'e5b0c7c1-0bbc-48ef-a2b4-df7180e3697a',
    name: 'Premium Rice Cooker 1.5L-8 Cups',
    description: '',
    price: 24,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Rice Cooker 1.5L-8 Cups.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '054ad15e-058c-4382-be66-a6df95acb0c4',
    name: 'Premium Sandwich Maker S.S',
    description: '',
    price: 27,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Sandwich Maker S.S.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'ff1fd35a-c7e4-4a44-be10-d6f7055bea70',
    name: 'Premium Sandwich Maker White',
    description: '',
    price: 13,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Sandwich Maker White.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '9cb52819-4762-486f-8e22-b7502caac1ee',
    name: 'Premium Sandwich Marker Rect',
    description: '',
    price: 12,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Premium Sandwich Marker Rect.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'ad47fcff-77c5-4188-8ba4-9f811939f996',
    name: 'Rebelde',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Rebelde.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'f1dca5de-b9cd-4469-af15-36e67a9b3409',
    name: 'Rechargeable Fan 10´´',
    description: '',
    price: 34.5,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Rechargeable Fan 10´´.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'c20cde4a-34e3-4693-a05f-d1953f886236',
    name: 'Rechargeable Fan 12´´',
    description: '',
    price: 36.8,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Rechargeable Fan 12´´.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '55885252-6f8b-41d3-8128-7811d92114ab',
    name: 'Rechargeable Fan 14´´',
    description: '',
    price: 42.55,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Rechargeable Fan 14´´.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '81bc59a3-022a-4786-9e90-771300179f6f',
    name: 'Rechargeable Fan 8´´',
    description: '',
    price: 20.52,
    category: 'Equipos Electrónicos',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Equipos Electronicos/Rechargeable Fan 8´´.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'c76ac28d-97b3-45e7-ad4f-ddbd6bb9a47e',
    name: 'Romeo & Julieta',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Romeo & Julieta.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'e040172e-3a30-4372-b855-17f2e7236855',
    name: 'Rosa Venus White Bar Soap',
    description: '',
    price: 0.99,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Rosa Venus White Bar Soap.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'ffa4b609-1524-43cd-a193-87e7b00e3905',
    name: 'Sanogyl Soin Gencives',
    description: '',
    price: 7.5,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Sanogyl Soin Gencives.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '8824e380-a719-4052-bfd7-6144d64cb332',
    name: 'Tooth Brush 10 pcs Medium',
    description: '',
    price: 0.99,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Tooth Brush 10 pcs Medium.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'c2e150e6-23dd-4d1d-9bec-f09ab96f7f0e',
    name: 'Tooth Brush 5pcs Medium-Value Pack',
    description: '',
    price: 0.99,
    category: 'Aseo Personal',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Aseo/Tooth Brush 5pcs Medium-Value Pack.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: '9041da99-6223-452e-9a7c-fd41480fcc3e',
    name: 'Vegueros',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Vegueros.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  },
  {
    id: 'f5b3692e-f5a5-431a-b65b-bc19737a12df',
    name: 'Vegueros in Black',
    description: '',
    price: 50,
    category: 'Perfumería',
    image_url: 'https://cdn.jsdelivr.net/gh/Danielr010210/fotosTIENDAONLINNE/Perfumess//Vegueros in Black.jpg',
    stock: 10,
    is_visible: true,
    promotion_discount: 0,
    currency: 'USD'
  }
];

const DEFAULT_WORKERS = [
  {
    id: '45b4e7a0-7eb4-45cd-b00f-fffe0976dc6d',
    username: 'admin',
    password_sha256: '0a5bc3e342432f1bad92ffd51b785343ec72906cdba6a26131060b008e786656',
    role: 'admin',
    name: 'Sofía Rodríguez (Admin)',
    phone: '+506 7000-1111',
    is_active: true,
    failed_attempts: 0,
    locked_until: null,
    must_reset_password: false,
    permissions: ['ver_pedidos', 'procesar_pedidos', 'ver_inventario', 'editar_inventario', 'ver_alertas', 'ver_soporte'],
    security_pin: '112233'
  },
  {
    id: '63c1a697-2131-4814-a5a0-70b8bffa419b',
    username: 'gerente',
    password_sha256: '68e059127789ea920ad39f186b60eaa3acfef029a4c8808d2d271e500c992d4a',
    role: 'gerente',
    name: 'Carlos Mendoza (Gerente)',
    phone: '+506 7000-2222',
    is_active: true,
    failed_attempts: 0,
    locked_until: null,
    must_reset_password: true,
    permissions: ['ver_pedidos', 'procesar_pedidos', 'ver_inventario', 'editar_inventario', 'ver_alertas', 'ver_soporte'],
    security_pin: '223344'
  },
  {
    id: '90079414-1cf1-4286-9a2a-547fa466370e',
    username: 'empleado',
    password_sha256: 'a5eb10313b9116ce94dc36afd5b653bf03fee85101278b1a0f044ebc21a98a93',
    role: 'empleado',
    name: 'Mateo Gómez (Empleado)',
    phone: '+506 7000-3333',
    is_active: true,
    failed_attempts: 0,
    locked_until: null,
    must_reset_password: true,
    permissions: ['ver_pedidos', 'ver_inventario'],
    security_pin: '334455'
  }
];

const DEFAULT_SETTINGS: ShopSettings = {
  shop_name: 'Cubanos en Miami',
  shop_description: 'La experiencia de compra más rápida de la web.',
  contact_number: '+1 786 294 2257',
  whatsapp_number: '17862942257',
  business_hours: 'Lunes a Sábado: 9:00 AM - 5:00 PM',
  address: '16335 nw 48th ave Miami Gardens FL 33016',
  currency: '$',
  about_visible: true,
  store_url: '',
  about_text: 'La experiencia de compra más rápida de la web.',
  smart_search_text: 'Búsqueda Inteligente',
  shop_logo_url: '',
  theme_preset: 'classic',
  color_primary: '#0f172a',
  color_header_bg: '#ffffff',
  color_page_bg: '#F8F9FA',
  color_text: '#1e293b',
  color_card_bg: '#ffffff',
  font_family: 'Inter',
  shop_logo_type: 'text',
  shop_logo_val: 'M',
  currencies: ['CUP', 'USD', 'EUR', 'MLC'],
  banner_visible: false,
  banner_text: '',
  banner_bg: '#1e293b',
  banner_text_color: '#ffffff',
  loading_text: 'Actualizando, por favor espere...',
  maps_option: 'address',
  maps_coords: '',
  maps_embed_url: '',
  telegram_bot_token: '',
  telegram_chat_id: '',
  telegram_enabled: false
};

const DEFAULT_AUDITS: AuditLog[] = [
  {
    id: 'a-1',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    user: 'Sofía Rodríguez',
    role: 'admin',
    action: 'Inició sesión',
    details: 'Inicio de sesión exitoso desde IP autorizada en la base de datos.'
  },
  {
    id: 'a-2',
    timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    user: 'Sofía Rodríguez',
    role: 'admin',
    action: 'Modificó Configuración',
    details: 'Se actualizó el horario de atención de la tienda.'
  }
];

const DEFAULT_ALERTS: SecurityAlert[] = [
  {
    id: 'al-1',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    type: 'stock_critico',
    severity: 'medium',
    message: 'El producto "Auriculares Inalámbricos SoundZen" ha alcanzado el nivel crítico de inventario (4 unidades restantes).',
    resolved: false
  }
];

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord-1234',
    invoice_number: 'FACT-48194',
    customer_name: 'Alejandro',
    customer_lastname: 'Pérez',
    customer_phone: '654321098',
    customer_address: 'Calle Mayor 12, Piso 3B',
    customer_reference: 'Frente a la panadería de la esquina',
    customer_nickname: 'Alex',
    items: [
      {
        product_id: 'prod-1542496658',
        product_name: 'Smart Watch Aura X',
        quantity: 1,
        price_sold: 169.99
      },
      {
        product_id: 'prod-1553062407',
        product_name: 'Mochila Urbana EcoShield',
        quantity: 2,
        price_sold: 47.99
      }
    ],
    total: 265.97,
    status: 'confirmado',
    processed_by: 'Carlos Mendoza',
    processed_role: 'gerente',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 7.8).toISOString()
  }
];

// Helper to initialize local storage to keep state stable
function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  const value = localStorage.getItem(key);
  if (!value) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function setLocalStorageItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export class SupabaseService {
  // Configured URL and Key (populated with exact user parameters!)
  static getCredentials() {
    const metaEnv = (import.meta as any).env;
    const url = (metaEnv?.VITE_SUPABASE_URL as string) || localStorage.getItem('supabase_url') || 'https://yczvjaciqhaxymsbeyty.supabase.co';
    const key = (metaEnv?.VITE_SUPABASE_ANON_KEY as string) || localStorage.getItem('supabase_key') || 'sb_publishable_fYQjTggl4-eoDyc-s3jPdQ_MG5q4UlW';
    const hasCustomCreds = !!(metaEnv?.VITE_SUPABASE_URL && metaEnv?.VITE_SUPABASE_ANON_KEY) || !!localStorage.getItem('supabase_url');
    const mode = localStorage.getItem('supabase_mode') || (hasCustomCreds ? 'real' : 'mock');
    return { url, key, mode };
  }

  static setCredentials(url: string, key: string, mode: 'mock' | 'real') {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    localStorage.setItem('supabase_mode', mode);
  }

  public static isReal() {
    const { url, key, mode } = this.getCredentials();
    return mode === 'real' && !!url && !!key;
  }

  static async checkConnection(): Promise<boolean> {
    if (!this.isReal()) return true;
    const client = this.getClient();
    if (!client) return false;
    try {
      // Perform a lightweight query on shop_settings to prove real communication is fully online
      const { data, error } = await client.from('shop_settings').select('id').limit(1);
      if (error) {
        console.warn('Supabase database status check warning:', error);
        if (error.code === 'PGRST114' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('⚠️ LA TABLA "shop_settings" NO EXISTE EN SUPABASE. Por favor, abre el Panel de Control, ve a la pestaña "Supabase Setup" y copia y pega las consultas SQL en el editor de Supabase.');
        } else {
          console.warn(`⚠️ Error de conexión a Supabase [Código ${error.code || 'sin código'}]: ${error.message || 'Sin mensaje'}`);
        }
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase database status exception:', e);
      return false;
    }
  }

  private static getClient() {
    const { url, key } = this.getCredentials();
    if (!url || !key) return null;
    try {
      return createClient(url, key);
    } catch (e) {
      console.error('Error creating Supabase client:', e);
      return null;
    }
  }

  // --- CACHE ENGINE (5 MINUTES) ---
  private static getCachedData<T>(key: string): T | null {
    const cached = localStorage.getItem(`db_cache_${key}`);
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.timestamp === 'number') {
        const elapsed = Date.now() - parsed.timestamp;
        if (elapsed < 5 * 60 * 1000) { // 5 minutes in ms
          return parsed.data as T;
        }
      }
    } catch (e) {
      console.warn('Error reading cache for', key, e);
    }
    return null;
  }

  private static setCachedData<T>(key: string, data: T): void {
    try {
      const item = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`db_cache_${key}`, JSON.stringify(item));
    } catch (e) {
      console.warn('Error writing cache for', key, e);
    }
  }

  public static clearCache(key?: string): void {
    if (key) {
      localStorage.removeItem(`db_cache_${key}`);
    } else {
      const keys = ['products', 'orders', 'workers', 'audit_logs', 'security_alerts', 'shop_settings', 'product_categories', 'coupons', 'support_inquiries', 'visitor_history'];
      keys.forEach(k => localStorage.removeItem(`db_cache_${k}`));
    }
  }

  // --- PRODUCTS ---
  static async getProducts(forceRefresh = false): Promise<Product[]> {
    if (!forceRefresh) {
      const cached = this.getCachedData<Product[]>('products');
      if (cached) return cached;
    }
    const realMode = this.isReal();
    const fallbackProducts: Product[] = DEFAULT_PRODUCTS;

    if (!realMode) {
      const local = getLocalStorageItem('shop_products', fallbackProducts);
      this.setCachedData('products', local);
      return local;
    }
    const client = this.getClient();
    if (!client) {
      const local = getLocalStorageItem('shop_products', fallbackProducts);
      this.setCachedData('products', local);
      return local;
    }
    try {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('name');
      if (error) {
        console.warn('Supabase products fetch failed, using local local storage:', error);
        const local = getLocalStorageItem('shop_products', fallbackProducts);
        this.setCachedData('products', local);
        return local;
      }
      
      let fetchedData = data || [];
      const localProducts = getLocalStorageItem<Product[]>('shop_products', fallbackProducts);
      const safeLocalProducts = Array.isArray(localProducts) ? localProducts : fallbackProducts;

      // DO NOT auto-seed mock/test products in real mode
      if (fetchedData.length === 0 && safeLocalProducts.length > 0 && !realMode) {
        try {
          const insertData = safeLocalProducts.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: p.price,
            category: p.category,
            image_url: p.image_url || '',
            stock: p.stock ?? 10,
            is_visible: p.is_visible !== false,
            promotion_discount: p.promotion_discount || 0,
            currency: p.currency || 'CUP',
            quantity_prices: p.quantity_prices || [],
            variants: p.variants || [],
            gallery_images: p.gallery_images || []
          }));
          await client.from('products').insert(insertData);
          const { data: refetched } = await client.from('products').select('*').order('name');
          if (refetched && refetched.length > 0) {
            fetchedData = refetched;
          }
        } catch (e) {
          console.error('Error auto-seeding products into Supabase:', e);
        }
      }

      const merged = fetchedData.map((dbProd: any) => {
        const localProd = safeLocalProducts.find(lp => lp.id === dbProd.id || lp.name === dbProd.name);
        return {
          ...dbProd,
          is_visible: dbProd.is_visible !== false,
          currency: dbProd.currency || localProd?.currency || 'CUP',
          quantity_prices: dbProd.quantity_prices || localProd?.quantity_prices || [],
          variants: dbProd.variants || localProd?.variants || [],
          gallery_images: dbProd.gallery_images || localProd?.gallery_images || []
        };
      });
      this.setCachedData('products', merged);
      return merged;
    } catch (e) {
      console.warn('Supabase products fetch exception, using local:', e);
      const local = getLocalStorageItem('shop_products', fallbackProducts);
      this.setCachedData('products', local);
      return local;
    }
  }

  static async saveProduct(product: Product): Promise<void> {
    // Clear product cache first
    this.clearCache('products');

    // 1. Always sync to mock local storage for high availability fallback
    const products = await this.getProducts(true);
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      products[idx] = product;
    } else {
      products.push(product);
    }
    setLocalStorageItem('shop_products', products);

    if (product.stock <= 5) {
      await this.triggerAlert('stock_critico', 'medium', `Inventario bajo para ${product.name} (${product.stock} unidades).`);
    }

    // 2. Real database sync
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          const isIdUuid = isUUID(product.id);
          const rowData: any = {
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            image_url: product.image_url,
            stock: product.stock,
            is_visible: product.is_visible,
            promotion_discount: product.promotion_discount,
            currency: product.currency || 'CUP',
            quantity_prices: product.quantity_prices || [],
            variants: product.variants || [],
            gallery_images: product.gallery_images || []
          };
          
          const performSync = async (dataToSave: any) => {
            if (isIdUuid) {
              const { data: existing, error: checkError } = await client
                .from('products')
                .select('id')
                .eq('id', product.id)
                .maybeSingle();

              if (checkError) {
                console.error('Error checking existing product in Supabase:', checkError);
              }

              if (existing) {
                const { error: updateError } = await client
                  .from('products')
                  .update(dataToSave)
                  .eq('id', product.id);
                if (updateError) {
                  console.error('Error updating product in Supabase:', updateError);
                  throw updateError;
                }
              } else {
                const { error: insertError } = await client
                  .from('products')
                  .insert({ ...dataToSave, id: product.id });
                if (insertError) {
                  console.error('Error inserting product in Supabase:', insertError);
                  throw insertError;
                }
              }
            } else {
              // First check if a product with the same name already exists in the real DB to update it,
              // or insert it as a new product
              const { data: existing, error: nameCheckError } = await client
                .from('products')
                .select('id')
                .eq('name', product.name)
                .maybeSingle();
              
              if (nameCheckError) {
                console.error('Error checking product by name in Supabase:', nameCheckError);
              }
              
              if (existing) {
                const { error: updateError } = await client
                  .from('products')
                  .update(dataToSave)
                  .eq('id', existing.id);
                if (updateError) {
                  console.error('Error updating product by name in Supabase:', updateError);
                  throw updateError;
                }
                product.id = existing.id;
              } else {
                const { data: inserted, error: insertError } = await client
                  .from('products')
                  .insert(dataToSave)
                  .select('id')
                  .single();
                if (insertError) {
                  console.error('Error inserting non-UUID product in Supabase:', insertError);
                  throw insertError;
                }
                if (inserted) {
                  product.id = inserted.id;

                  // Update offline fallback memory to match
                  const fallbackList = await this.getProducts(true);
                  const findIdx = fallbackList.findIndex(p => p.name === product.name);
                  if (findIdx >= 0) {
                    fallbackList[findIdx].id = inserted.id;
                    setLocalStorageItem('shop_products', fallbackList);
                  }
                }
              }
            }
          };

          try {
            await performSync(rowData);
          } catch (firstError: any) {
            let errMsg = String(firstError?.message || '').toLowerCase();
            let currentData = { ...rowData };
            if (errMsg.includes('quantity_prices') && (errMsg.includes('column') || errMsg.includes('does not exist'))) {
              console.warn('The products table on Supabase is missing "quantity_prices" column. Retrying sync without "quantity_prices"...');
              delete currentData.quantity_prices;
              try {
                await performSync(currentData);
              } catch (retryError: any) {
                errMsg = String(retryError?.message || '').toLowerCase();
                if (errMsg.includes('currency') && errMsg.includes('column')) {
                  console.warn('The products table on Supabase is missing "currency" column. Retrying sync without "currency"...');
                  delete currentData.currency;
                  await performSync(currentData);
                } else {
                  throw retryError;
                }
              }
            } else if (errMsg.includes('currency') && errMsg.includes('column')) {
              console.warn('The products table on Supabase is missing "currency" column. Retrying sync without "currency"...');
              delete currentData.currency;
              await performSync(currentData);
            } else {
              throw firstError;
            }
          }
        } catch (e) {
          console.error('Supabase sync product error:', e);
          throw e; // Throw so that callers know it failed
        }
      }
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    this.clearCache('products');
    const products = await this.getProducts(true);
    const prod = products.find(p => p.id === id);
    const updated = products.filter(p => p.id !== id);
    setLocalStorageItem('shop_products', updated);
    if (prod) {
      this.logAudit('Sistema/Trabajador', 'Eliminar Producto', `Se eliminó el producto: ${prod.name}`);
    }

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          const tableId = isUUID(id) ? id : null;
          if (tableId) {
            await client.from('products').delete().eq('id', tableId);
          } else if (prod) {
            await client.from('products').delete().eq('name', prod.name);
          }
        } catch (e) {
          console.error('Supabase delete product error:', e);
        }
      }
    }
  }

  // --- WORKERS ---
  static async getWorkers(forceRefresh = false): Promise<Worker[]> {
    if (!forceRefresh) {
      const cached = this.getCachedData<Worker[]>('workers');
      if (cached) return cached;
    }
    if (!this.isReal()) {
      const local = getLocalStorageItem('shop_workers', DEFAULT_WORKERS as Worker[]);
      this.setCachedData('workers', local);
      return local;
    }
    const client = this.getClient();
    if (!client) {
      const local = getLocalStorageItem('shop_workers', DEFAULT_WORKERS as Worker[]);
      this.setCachedData('workers', local);
      return local;
    }
    try {
      const { data, error } = await client
        .from('workers')
        .select('*')
        .order('name');
      if (error) {
        console.warn('Real workers fetch failed, using local:', error);
        const local = getLocalStorageItem('shop_workers', DEFAULT_WORKERS as Worker[]);
        this.setCachedData('workers', local);
        return local;
      }
      this.setCachedData('workers', data || []);
      return data || [];
    } catch (e) {
      console.warn('Real workers fetch error, using local:', e);
      const local = getLocalStorageItem('shop_workers', DEFAULT_WORKERS as Worker[]);
      this.setCachedData('workers', local);
      return local;
    }
  }

  static async saveWorker(worker: Worker, plainPassword?: string): Promise<void> {
    this.clearCache('workers');
    // 1. Mock store sync
    const workers = await this.getWorkers(true);
    let dbWorker = { ...worker };
    
    if (plainPassword) {
      const hashed = await hashSHA256(plainPassword);
      (dbWorker as any).password_sha256 = hashed;
    }

    const idx = workers.findIndex(w => w.id === dbWorker.id);
    if (idx >= 0) {
      if (!plainPassword) {
        const oldWorker = workers[idx];
        (dbWorker as any).password_sha256 = (oldWorker as any).password_sha256;
      }
      workers[idx] = dbWorker;
      this.logAudit('Admin', 'Modificar Trabajador', `Se actualizaron datos del colaborador: ${dbWorker.name} (${dbWorker.role})`);
    } else {
      if (!plainPassword) {
        const defaultHash = await hashSHA256('Colaborador123!');
        (dbWorker as any).password_sha256 = defaultHash;
      }
      workers.push(dbWorker);
      this.logAudit('Admin', 'Crear Trabajador', `Se registró un nuevo colaborador: ${dbWorker.name} con rol ${dbWorker.role}`);
    }
    setLocalStorageItem('shop_workers', workers);

    // 2. Real db sync
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          const isIdUuid = isUUID(dbWorker.id);
          const rowData: any = {
            username: dbWorker.username.toLowerCase(),
            role: dbWorker.role,
            name: dbWorker.name,
            phone: dbWorker.phone,
            is_active: dbWorker.is_active,
            failed_attempts: dbWorker.failed_attempts,
            locked_until: dbWorker.locked_until,
            must_reset_password: dbWorker.must_reset_password,
            permissions: dbWorker.permissions,
            security_pin: dbWorker.security_pin
          };
          if (plainPassword || (dbWorker as any).password_sha256) {
            rowData.password_sha256 = plainPassword ? await hashSHA256(plainPassword) : (dbWorker as any).password_sha256;
          }

          if (isIdUuid) {
            rowData.id = dbWorker.id;
            let { error } = await client.from('workers').upsert(rowData);
            if (error && (error.code === '42703' || error.message?.includes('column'))) {
              // Retry without new columns
              delete rowData.must_reset_password;
              delete rowData.permissions;
              const retryRes = await client.from('workers').upsert(rowData);
              error = retryRes.error;
            }
            if (error) throw error;
          } else {
            // lookup by username
            const { data: existing } = await client
              .from('workers')
              .select('id, password_sha256')
              .eq('username', dbWorker.username.toLowerCase())
              .maybeSingle();

            if (existing) {
              if (!rowData.password_sha256) {
                rowData.password_sha256 = existing.password_sha256;
              }
              let { error } = await client.from('workers').update(rowData).eq('id', existing.id);
              if (error && (error.code === '42703' || error.message?.includes('column'))) {
                delete rowData.must_reset_password;
                delete rowData.permissions;
                const retryRes = await client.from('workers').update(rowData).eq('id', existing.id);
                error = retryRes.error;
              }
              if (error) throw error;
              dbWorker.id = existing.id;
            } else {
              if (!rowData.password_sha256) {
                rowData.password_sha256 = await hashSHA256('Colaborador123!');
              }
              let { data: inserted, error } = await client
                .from('workers')
                .insert(rowData)
                .select('id')
                .maybeSingle();

              if (error && (error.code === '42703' || error.message?.includes('column'))) {
                delete rowData.must_reset_password;
                delete rowData.permissions;
                const retryRes = await client
                  .from('workers')
                  .insert(rowData)
                  .select('id')
                  .maybeSingle();
                inserted = retryRes.data;
                error = retryRes.error;
              }
              if (error) throw error;

              if (inserted) {
                dbWorker.id = inserted.id;
              }
            }
          }
        } catch (e) {
          console.error('Supabase worker sync exception:', e);
          throw e;
        }
      }
    }
  }

  static async deleteWorker(id: string): Promise<void> {
    this.clearCache('workers');
    const workers = await this.getWorkers(true);
    const worker = workers.find(w => w.id === id);
    const updated = workers.filter(w => w.id !== id);
    setLocalStorageItem('shop_workers', updated);
    if (worker) {
      this.logAudit('Admin', 'Eliminar Trabajador', `Se desvinculó al trabajador: ${worker.name}`);
    }

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          if (isUUID(id)) {
            await client.from('workers').delete().eq('id', id);
          } else if (worker) {
            await client.from('workers').delete().eq('username', worker.username.toLowerCase());
          }
        } catch (e) {
          console.error('Supabase worker delete error:', e);
        }
      }
    }
  }

  // --- ORDERS ---
  static async getOrders(forceRefresh = false): Promise<Order[]> {
    if (!forceRefresh) {
      const cached = this.getCachedData<Order[]>('orders');
      if (cached) return cached;
    }
    if (!this.isReal()) {
      const local = getLocalStorageItem('shop_orders', DEFAULT_ORDERS);
      this.setCachedData('orders', local);
      return local;
    }
    const client = this.getClient();
    if (!client) {
      const local = getLocalStorageItem('shop_orders', DEFAULT_ORDERS);
      this.setCachedData('orders', local);
      return local;
    }
    try {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Real orders fetch failed, using local fallback:', error);
        const local = getLocalStorageItem('shop_orders', DEFAULT_ORDERS);
        this.setCachedData('orders', local);
        return local;
      }
      const mapped = (data || []).map((o: any) => ({
        ...o,
        items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
      }));
      this.setCachedData('orders', mapped);
      return mapped;
    } catch (e) {
      console.warn('Real orders fetch exception:', e);
      const local = getLocalStorageItem('shop_orders', DEFAULT_ORDERS);
      this.setCachedData('orders', local);
      return local;
    }
  }

  static async createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'status'>): Promise<Order> {
    this.clearCache('orders');
    const orders = await this.getOrders(true);
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toISOString(),
      status: 'pendiente',
    };
    orders.unshift(newOrder);
    setLocalStorageItem('shop_orders', orders);

    // Apply stock deduction automatically on available items
    const products = await this.getProducts(true);
    for (const item of newOrder.items) {
      const targetProd = products.find(p => p.id === item.product_id);
      if (targetProd) {
        const newStock = Math.max(0, targetProd.stock - item.quantity);
        targetProd.stock = newStock;
        await this.saveProduct(targetProd);
      }
    }

    this.logAudit('Cliente ' + orderData.customer_name, 'Pedido Creado', `Se emitió el pedido ${newOrder.invoice_number} por un valor de ${orderData.total}`);

    // Real DB Sync
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('orders')
            .insert({
              invoice_number: newOrder.invoice_number,
              customer_name: newOrder.customer_name,
              customer_lastname: newOrder.customer_lastname,
              customer_phone: newOrder.customer_phone,
              customer_address: newOrder.customer_address,
              customer_reference: newOrder.customer_reference,
              customer_nickname: newOrder.customer_nickname,
              items: newOrder.items,
              total: newOrder.total,
              status: newOrder.status,
              processed_by: newOrder.processed_by,
              processed_role: newOrder.processed_role
            })
            .select('id')
            .single();
          if (data) {
            newOrder.id = data.id;
          }
          if (error) console.error('Supabase write order error:', error);
        } catch (e) {
          console.error('Supabase write order exception:', e);
        }
      }
    }

    // Trigger Telegram notification in background
    this.sendTelegramInvoice(newOrder).catch(err => {
      console.error('Error in sendTelegramInvoice background promise:', err);
    });

    return newOrder;
  }

  static async sendTelegramInvoice(order: Order): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings || !settings.telegram_enabled || !settings.telegram_bot_token || !settings.telegram_chat_id) {
        return;
      }
      
      const botToken = settings.telegram_bot_token.trim();
      const chatId = settings.telegram_chat_id.trim();
      if (!botToken || !chatId) return;

      const shopName = settings.shop_name || 'Nuestra Tienda';
      const itemsList = order.items.map(it => {
        const itemTotal = it.price_sold * it.quantity;
        const itemCurrency = it.currency || settings.currency || 'CUP';
        return `• <b>${it.product_name}</b> x${it.quantity} (${itemCurrency})\n  Precio: ${itemCurrency} ${it.price_sold.toLocaleString('es-ES', { minimumFractionDigits: 2 })} -> Total: ${itemCurrency} ${itemTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
      }).join('\n');

      const messageText = `🔔 <b>NUEVO PEDIDO CONFIRMADO</b> 🏪\n----------------------------------\n<b>Factura:</b> <code>#${order.invoice_number}</code>\n<b>Tienda:</b> ${shopName}\n<b>Fecha:</b> ${new Date(order.created_at || Date.now()).toLocaleString('es-ES')}\n\n👤 <b>Cliente:</b>\n• Nombre: ${order.customer_name} ${order.customer_lastname || ''}\n• Teléfono: ${order.customer_phone || 'N/A'}\n• Dirección: ${order.customer_address || 'N/A'}\n• Referencia: ${order.customer_reference || 'N/A'}\n\n📦 <b>Detalles del Pedido:</b>\n${itemsList}\n\n💰 <b>TOTAL DEL PEDIDO:</b>\n• Importe: <b>${settings.currency || 'CUP'} ${order.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</b>\n----------------------------------\n🛒 ¡Se ha registrado con éxito en el sistema!`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML'
        })
      });
    } catch (e) {
      console.error('Failed to send Telegram invoice:', e);
    }
  }

  static async updateOrderStatus(
    orderId: string, 
    status: 'confirmado' | 'cancelado', 
    processedBy: string, 
    processedRole: string
  ): Promise<void> {
    this.clearCache('orders');
    const orders = await this.getOrders(true);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx >= 0) {
      const oldStatus = orders[idx].status;
      orders[idx].status = status;
      orders[idx].processed_by = processedBy;
      orders[idx].processed_role = processedRole;
      orders[idx].updated_at = new Date().toISOString();
      setLocalStorageItem('shop_orders', orders);

      // Revert stock if canceled
      if (status === 'cancelado' && oldStatus !== 'cancelado') {
        const products = await this.getProducts(true);
        for (const item of orders[idx].items) {
          const targetProd = products.find(p => p.id === item.product_id);
          if (targetProd) {
            targetProd.stock += item.quantity;
            await this.saveProduct(targetProd);
          }
        }
      }

      this.logAudit(
        processedBy, 
        status === 'confirmado' ? 'Confirmar Pedido' : 'Cancelar Pedido', 
        `Pedido ${orders[idx].invoice_number} marcado como ${status} por el colaborador.`
      );

      // Real database status sync
      if (this.isReal()) {
        const client = this.getClient();
        if (client) {
          try {
            await client
              .from('orders')
              .update({
                status,
                processed_by: processedBy,
                processed_role: processedRole,
                updated_at: new Date().toISOString()
              })
              .eq(isUUID(orderId) ? 'id' : 'invoice_number', isUUID(orderId) ? orderId : orders[idx].invoice_number);
          } catch (e) {
            console.error('Supabase order status sync fail:', e);
          }
        }
      }
    }
  }

  // --- CONFIG / SETTINGS ---
  static async getSettings(forceRefresh = false): Promise<ShopSettings> {
    if (!forceRefresh) {
      const cached = this.getCachedData<ShopSettings>('shop_settings');
      if (cached) return cached;
    }
    if (!this.isReal()) {
      const local = getLocalStorageItem('shop_settings', DEFAULT_SETTINGS);
      this.setCachedData('shop_settings', local);
      return local;
    }
    const client = this.getClient();
    if (!client) {
      const local = getLocalStorageItem('shop_settings', DEFAULT_SETTINGS);
      this.setCachedData('shop_settings', local);
      return local;
    }
    try {
      const { data, error } = await client
        .from('shop_settings')
        .select('*')
        .eq('id', 'singleton')
        .maybeSingle();
      if (error || !data) {
        const local = getLocalStorageItem('shop_settings', DEFAULT_SETTINGS);
        this.setCachedData('shop_settings', local);
        return local;
      }
      const merged = { ...DEFAULT_SETTINGS, ...data };
      this.setCachedData('shop_settings', merged);
      return merged;
    } catch (e) {
      const local = getLocalStorageItem('shop_settings', DEFAULT_SETTINGS);
      this.setCachedData('shop_settings', local);
      return local;
    }
  }

  static async saveSettings(settings: ShopSettings, adminName: string): Promise<void> {
    this.clearCache('shop_settings');
    setLocalStorageItem('shop_settings', settings);
    this.logAudit(adminName, 'Actualizar Configuración', `Se modificaron los datos globales de la tienda.`);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client
            .from('shop_settings')
            .upsert({ id: 'singleton', ...settings });
        } catch (e) {
          console.error('Supabase saveSettings error:', e);
        }
      }
    }
  }

  // --- SECURITY ALERTS ---
  static async getAlerts(forceRefresh = false): Promise<SecurityAlert[]> {
    if (!forceRefresh) {
      const cached = this.getCachedData<SecurityAlert[]>('security_alerts');
      if (cached) return cached;
    }
    if (!this.isReal()) {
      const local = getLocalStorageItem('shop_alerts', DEFAULT_ALERTS);
      this.setCachedData('security_alerts', local);
      return local;
    }
    const client = this.getClient();
    if (!client) {
      const local = getLocalStorageItem('shop_alerts', DEFAULT_ALERTS);
      this.setCachedData('security_alerts', local);
      return local;
    }
    try {
      const { data, error } = await client
        .from('security_alerts')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) {
        const local = getLocalStorageItem('shop_alerts', DEFAULT_ALERTS);
        this.setCachedData('security_alerts', local);
        return local;
      }
      this.setCachedData('security_alerts', data || []);
      return data || [];
    } catch (e) {
      const local = getLocalStorageItem('shop_alerts', DEFAULT_ALERTS);
      this.setCachedData('security_alerts', local);
      return local;
    }
  }

  static async triggerAlert(type: SecurityAlert['type'], severity: SecurityAlert['severity'], message: string): Promise<void> {
    this.clearCache('security_alerts');
    const alerts = await this.getAlerts(true);
    const newAlert: SecurityAlert = {
      id: `al-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      resolved: false
    };
    alerts.unshift(newAlert);
    setLocalStorageItem('shop_alerts', alerts);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('security_alerts').insert({
            type,
            severity,
            message,
            resolved: false
          });
        } catch (e) {
          console.error('Supabase triggerAlert exception:', e);
        }
      }
    }
  }

  static async resolveAlert(id: string): Promise<void> {
    this.clearCache('security_alerts');
    const alerts = await this.getAlerts(true);
    const idx = alerts.findIndex(a => a.id === id);
    if (idx >= 0) {
      alerts[idx].resolved = true;
      setLocalStorageItem('shop_alerts', alerts);
    }

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client
            .from('security_alerts')
            .update({ resolved: true })
            .eq(isUUID(id) ? 'id' : 'message', isUUID(id) ? id : (alerts[idx]?.message || ''));
        } catch (e) {
          console.error('Supabase resolve alert exception:', e);
        }
      }
    }
  }

  // --- AUDIT LOGS ---
  static async getAuditLogs(forceRefresh = false): Promise<AuditLog[]> {
    if (!forceRefresh) {
      const cached = this.getCachedData<AuditLog[]>('audit_logs');
      if (cached) return cached;
    }
    if (!this.isReal()) {
      const local = getLocalStorageItem('shop_audits', DEFAULT_AUDITS);
      this.setCachedData('audit_logs', local);
      return local;
    }
    const client = this.getClient();
    if (!client) {
      const local = getLocalStorageItem('shop_audits', DEFAULT_AUDITS);
      this.setCachedData('audit_logs', local);
      return local;
    }
    try {
      const { data, error } = await client
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) {
        const local = getLocalStorageItem('shop_audits', DEFAULT_AUDITS);
        this.setCachedData('audit_logs', local);
        return local;
      }
      this.setCachedData('audit_logs', data || []);
      return data || [];
    } catch (e) {
      const local = getLocalStorageItem('shop_audits', DEFAULT_AUDITS);
      this.setCachedData('audit_logs', local);
      return local;
    }
  }

  static logAudit(user: string, action: string, details: string): void {
    this.clearCache('audit_logs');
    const audits = getLocalStorageItem('shop_audits', DEFAULT_AUDITS);
    const newAudit: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user,
      role: 'Sistema',
      action,
      details
    };
    audits.unshift(newAudit);
    setLocalStorageItem('shop_audits', audits);

    const { mode, url, key } = this.getCredentials();
    if (mode === 'real' && url && key) {
      // Dynamic client insertion
      try {
        const client = createClient(url, key);
        client.from('audit_logs').insert({
          user,
          role: 'Colaborador',
          action,
          details
        }).then(({ error }) => {
          if (error) console.error('Auditing insert fail:', error);
        });
      } catch (err) {
        console.error(err);
      }
    }
  }

  // AUTHENTICATION ENGINE WITH SHA-256 (MOCK AND REAL SYNCED)
  static async login(username: string, plainPassword: string): Promise<{ success: boolean; worker?: Worker; error?: string }> {
    const workers = await this.getWorkers();
    const worker = workers.find(w => w.username.toLowerCase() === username.toLowerCase());
    
    if (!worker) {
      await this.triggerAlert('intento_fallido', 'low', `Intento de acceso erróneo. Usuario no existente: "${username}"`);
      return { success: false, error: 'Credenciales inválidas.' };
    }

    if (!worker.is_active) {
      return { success: false, error: 'Esta cuenta se encuentra desactivada o bloqueada por seguridad. Contacte al Administrador o Gerente.' };
    }

    // Check temporary lockout
    let isReincidenceCheck = false;
    if (worker.locked_until) {
      const lockTime = new Date(worker.locked_until).getTime();
      const diff = lockTime - Date.now();
      if (diff > 0) {
        const minutes = Math.ceil(diff / 60000);
        return { success: false, error: `Sección bloqueada por exceso de intentos erróneos. Reintente en ${minutes} min.` };
      } else {
        // Lock expired, do not clear failed attempts yet! Tag active reincidence check.
        isReincidenceCheck = true;
      }
    }

    const inputHash = await hashSHA256(plainPassword);
    const isPassOk = (worker as any).password_sha256 === inputHash;

    if (isPassOk) {
      // Reset attempts
      worker.failed_attempts = 0;
      worker.locked_until = null;
      await this.saveWorker(worker);
      
      this.logAudit(worker.name, 'Inicio de Sesión', `Acceso concedido para rol ${worker.role}`);
      return { success: true, worker };
    } else {
      let errorMsg = 'Credenciales inválidas.';

      if (isReincidenceCheck || worker.failed_attempts >= 3) {
        // Reincidence after 5 minutes lock or additional failure
        worker.is_active = false;
        worker.failed_attempts = 0;
        worker.locked_until = null;
        errorMsg = 'Cuenta bloqueada permanentemente por reincidencia tras el bloqueo de 5 minutos. Debe ser reactivada por un Administrador o Gerente.';
        
        await this.triggerAlert(
          'bloqueo_usuario',
          'high',
          `Usuario "${worker.name}" (${worker.username}) bloqueado permanentemente por fallar de nuevo la contraseña tras el desbloqueo del tiempo de espera.`
        );
        this.logAudit('Sistema', 'Bloqueo Permanente', `Usuario bloqueado de forma incondicional: ${worker.username}`);
      } else {
        worker.failed_attempts += 1;
        if (worker.failed_attempts >= 3) {
          const lockoutMinutes = 5;
          const lockedDate = new Date(Date.now() + lockoutMinutes * 60000);
          worker.locked_until = lockedDate.toISOString();
          errorMsg = 'Cuenta bloqueada temporalmente por 5 minutos.';
          
          await this.triggerAlert(
            'bloqueo_usuario',
            'high',
            `Cuenta de "${worker.name}" (${worker.username}) bloqueada temporalmente por 5 minutos debido a 3 fallas de clave consecutivas.`
          );
          this.logAudit('Sistema', 'Bloqueo de Seguridad', `Usuario bloqueado por 5m: ${worker.username}`);
        } else {
          await this.triggerAlert(
            'intento_fallido',
            'medium',
            `Intento fallido de contraseña número ${worker.failed_attempts} para el usuario: "${worker.username}"`
          );
        }
      }

      await this.saveWorker(worker);
      return { success: false, error: `${errorMsg}` };
    }
  }

  // --- PRODUCT CATEGORIES ---
  static async getCategories(forceRefresh = false): Promise<ProductCategory[]> {
    if (!forceRefresh) {
      const cached = this.getCachedData<ProductCategory[]>('product_categories');
      if (cached) return cached;
    }
    const defaultCats: ProductCategory[] = [
      { id: 'cat-1', name: 'Comida' },
      { id: 'cat-2', name: 'Equipos Electrónicos' },
      { id: 'cat-3', name: 'Aseo Personal' },
      { id: 'cat-4', name: 'Perfumería' }
    ];
    const local = getLocalStorageItem<ProductCategory[]>('shop_categories', defaultCats);
    if (!this.isReal()) {
      this.setCachedData('product_categories', local);
      return local;
    }
    const client = this.getClient();
    if (!client) {
      this.setCachedData('product_categories', local);
      return local;
    }
    try {
      const { data, error } = await client.from('product_categories').select('*').order('name');
      if (error) {
        this.setCachedData('product_categories', local);
        return local;
      }
      let result = data || [];
      if (result.length === 0) {
        try {
          const insertData = defaultCats.map(cat => ({
            id: cat.id,
            name: cat.name,
            image_path: cat.image_path || ''
          }));
          await client.from('product_categories').insert(insertData);
          const { data: refetched } = await client.from('product_categories').select('*').order('name');
          if (refetched && refetched.length > 0) {
            result = refetched;
          }
        } catch (e) {
          console.error('Error auto-seeding product categories:', e);
        }
      }
      this.setCachedData('product_categories', result);
      return result;
    } catch {
      this.setCachedData('product_categories', local);
      return local;
    }
  }

  static async saveCategory(category: ProductCategory): Promise<void> {
    this.clearCache('product_categories');
    const cats = await this.getCategories(true);
    const idx = cats.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      cats[idx] = category;
    } else {
      cats.push(category);
    }
    setLocalStorageItem('shop_categories', cats);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('product_categories').upsert(category);
        } catch (e) {
          console.error('Error saving category to Supabase:', e);
        }
      }
    }
  }

  static async deleteCategory(id: string): Promise<void> {
    this.clearCache('product_categories');
    const cats = await this.getCategories(true);
    const filtered = cats.filter(c => c.id !== id);
    setLocalStorageItem('shop_categories', filtered);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('product_categories').delete().eq('id', id);
        } catch (e) {
          console.error('Error deleting category from Supabase:', e);
        }
      }
    }
  }

  // --- COUPONS / CUPONES ---
  static async getCoupons(forceRefresh = false): Promise<Coupon[]> {
    if (!forceRefresh) {
      const cached = this.getCachedData<Coupon[]>('coupons');
      if (cached) return cached;
    }
    const defaultCoupons: Coupon[] = [
      { id: 'cp-1', code: 'BIENVENIDO10', discount_type: 'percent', discount_value: 10, is_active: true, min_purchase_amount: 0 },
      { id: 'cp-2', code: 'PROMO20', discount_type: 'percent', discount_value: 20, is_active: true, min_purchase_amount: 0 },
      { id: 'cp-3', code: 'DESCON99', discount_type: 'fixed', discount_value: 99, is_active: true, min_purchase_amount: 0 }
    ];
    const local = getLocalStorageItem<Coupon[]>('shop_coupons', defaultCoupons);
    if (!this.isReal()) {
      this.setCachedData('coupons', local);
      return local;
    }
    const client = this.getClient();
    if (!client) {
      this.setCachedData('coupons', local);
      return local;
    }
    try {
      const { data, error } = await client.from('coupons').select('*').order('code');
      if (error) {
        this.setCachedData('coupons', local);
        return local;
      }
      const result = data && data.length > 0 ? data : local;
      this.setCachedData('coupons', result);
      return result;
    } catch {
      this.setCachedData('coupons', local);
      return local;
    }
  }

  static async saveCoupon(coupon: Coupon): Promise<void> {
    this.clearCache('coupons');
    const coupons = await this.getCoupons(true);
    const idx = coupons.findIndex(c => c.id === coupon.id);
    if (idx >= 0) {
      coupons[idx] = coupon;
    } else {
      coupons.push(coupon);
    }
    setLocalStorageItem('shop_coupons', coupons);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          const isIdUuid = isUUID(coupon.id);
          const rowData: any = {
            code: coupon.code.toUpperCase().trim(),
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            is_active: coupon.is_active,
            min_purchase_amount: coupon.min_purchase_amount || 0
          };
          if (isIdUuid) {
            rowData.id = coupon.id;
            await client.from('coupons').upsert(rowData);
          } else {
            const { data: existing } = await client.from('coupons').select('id').eq('code', coupon.code).maybeSingle();
            if (existing) {
              await client.from('coupons').update(rowData).eq('id', existing.id);
            } else {
              await client.from('coupons').insert(rowData);
            }
          }
        } catch (e) {
          console.error('Error saving coupon to Supabase:', e);
        }
      }
    }
  }

  static async deleteCoupon(id: string): Promise<void> {
    this.clearCache('coupons');
    const coupons = await this.getCoupons(true);
    const filtered = coupons.filter(c => c.id !== id);
    setLocalStorageItem('shop_coupons', filtered);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('coupons').delete().eq('id', id);
        } catch (e) {
          console.error('Error deleting coupon from Supabase:', e);
        }
      }
    }
  }

  // --- PRODUCT REVIEWS ---
  static async getReviews(productId: string): Promise<ProductReview[]> {
    const defaultReviews: ProductReview[] = [];
    const local = getLocalStorageItem<ProductReview[]>('product_reviews', defaultReviews);
    const prodReviews = local.filter(r => r.product_id === productId);

    if (!this.isReal()) return prodReviews;
    const client = this.getClient();
    if (!client) return prodReviews;
    try {
      const { data, error } = await client
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) return prodReviews;
      return data || [];
    } catch {
      return prodReviews;
    }
  }

  static async saveReview(review: ProductReview): Promise<void> {
    const all = getLocalStorageItem<ProductReview[]>('product_reviews', []);
    all.push(review);
    setLocalStorageItem('product_reviews', all);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('product_reviews').insert(review);
        } catch (e) {
          console.error('Error saving review to Supabase:', e);
        }
      }
    }
  }

  static async deleteReview(id: string): Promise<void> {
    const all = getLocalStorageItem<ProductReview[]>('product_reviews', []);
    const reviewToRemove = all.find(r => r.id === id);
    const filtered = all.filter(r => r.id !== id);
    setLocalStorageItem('product_reviews', filtered);

    if (reviewToRemove) {
      this.logAudit('Sistema', 'Eliminar Opinión', `Se eliminó crítica de: ${reviewToRemove.reviewer_name} ("${reviewToRemove.comment}")`);
    }

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('product_reviews').delete().eq('id', id);
        } catch (e) {
          console.error('Error deleting review from Supabase:', e);
        }
      }
    }
  }

  static async toggleReviewVisibility(id: string, is_hidden: boolean): Promise<void> {
    const all = getLocalStorageItem<ProductReview[]>('product_reviews', []);
    const idx = all.findIndex(r => r.id === id);
    if (idx >= 0) {
      all[idx].is_hidden = is_hidden;
      setLocalStorageItem('product_reviews', all);
      this.logAudit('Sistema', is_hidden ? 'Ocultar Opinión' : 'Mostrar Opinión', `Se cambió visibilidad de opinión #${id} a ${is_hidden ? 'Oculta' : 'Visible'}`);
    }

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('product_reviews').update({ is_hidden }).eq('id', id);
        } catch (e) {
          console.error('Error updating review visibility on Supabase:', e);
        }
      }
    }
  }

  // --- SUPPORT INQUIRIES ---
  static async getSupportInquiries(forceRefresh = false): Promise<SupportInquiry[]> {
    if (!forceRefresh) {
      const cached = this.getCachedData<SupportInquiry[]>('support_inquiries');
      if (cached) return cached;
    }
    const defaultInquiries: SupportInquiry[] = [
      { 
        id: 'sop-1', 
        customer_name: 'Yaniel Alfonso', 
        customer_phone: '+53 52123456', 
        type: 'queja', 
        message: 'No puedo ver el botón de confirmación en mi navegador móvil.', 
        created_at: new Date(Date.now() - 3600000).toISOString() 
      }
    ];
    const local = getLocalStorageItem<SupportInquiry[]>('support_inquiries', defaultInquiries);
    if (!this.isReal()) {
      this.setCachedData('support_inquiries', local);
      return local;
    }
    const client = this.getClient();
    if (!client) {
      this.setCachedData('support_inquiries', local);
      return local;
    }
    try {
      const { data, error } = await client.from('support_inquiries').select('*').order('created_at', { ascending: false });
      if (error) {
        this.setCachedData('support_inquiries', local);
        return local;
      }
      const result = data || [];
      this.setCachedData('support_inquiries', result);
      return result;
    } catch {
      this.setCachedData('support_inquiries', local);
      return local;
    }
  }

  static async saveSupportInquiry(inquiry: SupportInquiry): Promise<void> {
    this.clearCache('support_inquiries');
    const list = await this.getSupportInquiries(true);
    const idx = list.findIndex(item => item.id === inquiry.id);
    if (idx >= 0) {
      list[idx] = inquiry;
    } else {
      list.unshift(inquiry);
    }
    setLocalStorageItem('support_inquiries', list);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          const isIdUuid = isUUID(inquiry.id);
          if (isIdUuid) {
            const { data: existing } = await client
              .from('support_inquiries')
              .select('id')
              .eq('id', inquiry.id)
              .maybeSingle();

            if (existing) {
              await client.from('support_inquiries').update({
                customer_name: inquiry.customer_name,
                customer_phone: inquiry.customer_phone,
                message: inquiry.message,
                resolved: inquiry.resolved
              }).eq('id', inquiry.id);
            } else {
              await client.from('support_inquiries').insert(inquiry);
            }
          } else {
            const { data: existing } = await client
              .from('support_inquiries')
              .select('id')
              .eq('customer_name', inquiry.customer_name)
              .eq('message', inquiry.message)
              .maybeSingle();

            if (existing) {
              await client.from('support_inquiries').update({
                resolved: inquiry.resolved
              }).eq('id', existing.id);
            } else {
              await client.from('support_inquiries').insert(inquiry);
            }
          }
        } catch (e) {
          console.error('Error saving support inquiry:', e);
        }
      }
    }
  }

  static async deleteSupportInquiry(id: string): Promise<void> {
    this.clearCache('support_inquiries');
    const list = await this.getSupportInquiries(true);
    const filtered = list.filter(item => item.id !== id);
    setLocalStorageItem('support_inquiries', filtered);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('support_inquiries').delete().eq('id', id);
        } catch (e) {
          console.error('Error deleting support inquiry:', e);
        }
      }
    }
  }

  // --- SYSTEM WIPE UTILITIES FOR ADMIN VACIAR LISTA ---
  static async clearProducts(): Promise<void> {
    setLocalStorageItem('shop_products', []);
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try { await client.from('products').delete().neq('name', 'dummy_value_61d9a24'); } catch(e){}
      }
    }
  }

  static async clearWorkers(): Promise<void> {
    const workers = await this.getWorkers();
    const adminOnly = workers.filter(w => w.role === 'admin');
    setLocalStorageItem('shop_workers', adminOnly);
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try { await client.from('workers').delete().neq('role', 'admin'); } catch(e){}
      }
    }
  }

  static async clearOrders(): Promise<void> {
    setLocalStorageItem('shop_orders', []);
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try { await client.from('orders').delete().neq('invoice_number', 'dummy_val'); } catch(e){}
      }
    }
  }

  static async clearAuditLogs(): Promise<void> {
    setLocalStorageItem('shop_audits', []);
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try { await client.from('audit_logs').delete().neq('user', 'dummy_val'); } catch(e){}
      }
    }
  }

  static async clearSecurityAlerts(): Promise<void> {
    setLocalStorageItem('shop_alerts', []);
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try { await client.from('security_alerts').delete().neq('severity', 'dummy_val'); } catch(e){}
      }
    }
  }

  static async clearSupportInquiries(): Promise<void> {
    setLocalStorageItem('support_inquiries', []);
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try { await client.from('support_inquiries').delete().neq('customer_name', 'dummy_val'); } catch(e){}
      }
    }
  }

  // --- VISITOR TRACKING ---
  static async getVisitorHistory(forceRefresh = false): Promise<VisitorHistoryEntry[]> {
    if (!forceRefresh) {
      const cached = this.getCachedData<VisitorHistoryEntry[]>('visitor_history');
      if (cached) return cached;
    }
    const localHistory = getLocalStorageItem<VisitorHistoryEntry[]>('visitor_history', []);
    
    // Auto-cleanup older than 60 days
    const sixtyDaysAgo = Date.now() - 60 * 24 * 3600 * 1000;
    const cleanedLocal = localHistory.filter(h => new Date(h.timestamp).getTime() >= sixtyDaysAgo);
    if (cleanedLocal.length !== localHistory.length) {
      setLocalStorageItem('visitor_history', cleanedLocal);
    }

    if (!this.isReal()) {
      this.setCachedData('visitor_history', cleanedLocal);
      return cleanedLocal;
    }

    const client = this.getClient();
    if (!client) {
      this.setCachedData('visitor_history', cleanedLocal);
      return cleanedLocal;
    }
    try {
      const { data, error } = await client
        .from('visitor_history')
        .select('*')
        .order('timestamp', { ascending: false });
        
      if (error) {
        console.warn('Real visitor history fetch failed, using local:', error);
        this.setCachedData('visitor_history', cleanedLocal);
        return cleanedLocal;
      }
      
      // Keep real table clean
      const sixtyDaysAgoISO = new Date(sixtyDaysAgo).toISOString();
      await client.from('visitor_history').delete().lt('timestamp', sixtyDaysAgoISO);
      
      const result = data || [];
      this.setCachedData('visitor_history', result);
      return result;
    } catch (e) {
      console.warn('Real visitor history fetch exception:', e);
      this.setCachedData('visitor_history', cleanedLocal);
      return cleanedLocal;
    }
  }

  static async recordVisitor(
    ip: string, 
    pageVisited: string, 
    userAgent: string, 
    country: string = 'Cuba', 
    city: string = 'La Habana'
  ): Promise<void> {
    this.clearCache('visitor_history');
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    
    if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
    else if (/safari/i.test(userAgent)) browser = 'Safari';
    else if (/firefox|iceweasel/i.test(userAgent)) browser = 'Firefox';
    else if (/opera|opr/i.test(userAgent)) browser = 'Opera';
    else if (/edge|edg/i.test(userAgent)) browser = 'Edge';
    else if (/msie|trident/i.test(userAgent)) browser = 'IE';

    if (/windows/i.test(userAgent)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
    else if (/android/i.test(userAgent)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
    else if (/linux/i.test(userAgent)) os = 'Linux';

    const newEntry: VisitorHistoryEntry = {
      id: `vis-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      ip: ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      user_agent: userAgent || 'Unknown UA',
      browser,
      os,
      page_visited: pageVisited || 'Inicio de Tienda',
      country: country || 'Cuba',
      city: city || 'La Habana'
    };

    const local = getLocalStorageItem<VisitorHistoryEntry[]>('visitor_history', []);
    local.unshift(newEntry);
    
    const sixtyDaysAgo = Date.now() - 60 * 24 * 3600 * 1000;
    const cleanedLocal = local.filter(h => new Date(h.timestamp).getTime() >= sixtyDaysAgo);
    setLocalStorageItem('visitor_history', cleanedLocal);

    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('visitor_history').insert({
            ip: newEntry.ip,
            user_agent: newEntry.user_agent,
            browser: newEntry.browser,
            os: newEntry.os,
            page_visited: newEntry.page_visited,
            country: newEntry.country,
            city: newEntry.city
          });
        } catch (e) {
          console.error('Supabase write visitor error:', e);
        }
      }
    }
  }

  static async clearVisitorHistory(): Promise<void> {
    this.clearCache('visitor_history');
    setLocalStorageItem('visitor_history', []);
    if (this.isReal()) {
      const client = this.getClient();
      if (client) {
        try {
          await client.from('visitor_history').delete().neq('ip', 'dummy_value_9a24');
        } catch (e) {
          console.error('Supabase delete visitor history error:', e);
        }
      }
    }
  }

  static async checkTablesStatus(): Promise<{ name: string; exists: boolean; error?: string }[]> {
    const tables = [
      'shop_settings',
      'products',
      'workers',
      'orders',
      'audit_logs',
      'security_alerts',
      'visitor_history',
      'coupons',
      'product_reviews',
      'support_inquiries',
      'product_categories'
    ];
    
    if (!this.isReal()) {
      return tables.map(t => ({ name: t, exists: true }));
    }
    
    const client = this.getClient();
    if (!client) {
      return tables.map(t => ({ name: t, exists: false, error: 'No se pudo inicializar el cliente de Supabase.' }));
    }
    
    const results = [];
    for (const table of tables) {
      try {
        const { error } = await client.from(table).select('*').limit(0);
        if (error) {
          const msg = error.message.toLowerCase();
          const relationNotExists = msg.includes('does not exist') || msg.includes('no existe la relación') || error.code === '42P01';
          if (relationNotExists) {
            results.push({ name: table, exists: false, error: error.message });
          } else {
            results.push({ name: table, exists: true, error: error.message });
          }
        } else {
          results.push({ name: table, exists: true });
        }
      } catch (e: any) {
        results.push({ name: table, exists: false, error: e?.message || 'Error desconocido' });
      }
    }
    return results;
  }
}

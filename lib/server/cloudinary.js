// =====================================================================
// lib/server/cloudinary.js
//
// ATTENZIONE: usa CLOUDINARY_API_SECRET, una credenziale segreta. Va
// importato SOLO da file server-side (route API in app/api/.../route.js),
// MAI da un componente con 'use client' in cima. Le variabili
// CLOUDINARY_* non hanno il prefisso NEXT_PUBLIC_ apposta: senza quel
// prefisso Next.js non le rende MAI visibili al browser.
// =====================================================================
import { v2 as cloudinary } from 'cloudinary';

function verificaConfig() {
  const mancanti = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME) mancanti.push('CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) mancanti.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) mancanti.push('CLOUDINARY_API_SECRET');
  if (mancanti.length > 0) {
    throw new Error(`Config Cloudinary mancante: imposta ${mancanti.join(', ')} su Vercel e in .env.local, poi riavvia.`);
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Carica un video su Cloudinary e restituisce il suo URL pubblico diretto.
 * @param {Buffer} buffer
 * @param {string} publicId - nome logico del file, es. "giocatore-123/video-456"
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function caricaSuCloudinary(buffer, publicId) {
  verificaConfig();
  const base64 = `data:video/mp4;base64,${buffer.toString('base64')}`;

  const risultato = await cloudinary.uploader.upload(base64, {
    resource_type: 'video',
    public_id: publicId,
    folder: 'hiddengems-feed',
    overwrite: false,
  });

  return { url: risultato.secure_url, publicId: risultato.public_id };
}

/** Cancella un video da Cloudinary (usato se in futuro si aggiunge "elimina post"). */
export async function cancellaDaCloudinary(publicId) {
  verificaConfig();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Computes the SHA-256 hash of a string using the native browser Web Crypto API.
 */
export async function hashSHA256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generates a unique secure invoice identifier like FACT-10493
 */
export function generateInvoiceNumber(): string {
  const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 digits
  return `FACT-${randomNum}`;
}

/**
 * Formats a numeric price into a neat readable currency format.
 */
export function formatCurrency(amount: number, symbol: string = '$'): string {
  return `${symbol}${amount.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

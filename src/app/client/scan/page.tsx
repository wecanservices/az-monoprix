import { ScanClient } from "./scan-client";

/**
 * Scanner code-barre client.
 *
 * Ouvre la caméra arrière et lit un EAN-13 / EAN-8 / UPC via l'API
 * native `BarcodeDetector` (Chrome/Edge/Samsung/Firefox mobile récent).
 * Fallback : saisie manuelle.
 * Une fois lu → POST `/api/v1/client/scan` → redirect vers la fiche produit.
 */
export default function ScanPage() {
  return <ScanClient />;
}

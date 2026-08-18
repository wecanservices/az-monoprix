"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Keyboard, Loader2, ScanLine } from "lucide-react";

/**
 * Composant scanner. Détecte les codes-barres via l'API native
 * `window.BarcodeDetector` — supportée sur Chrome / Edge Android /
 * Samsung Internet / Firefox 116+. Fallback : input manuel.
 */

// Formats les plus courants en supermarché
const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

// Type minimal pour BarcodeDetector (pas dans lib.dom)
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string; format: string }>>;
};
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

export function ScanClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockRef = useRef(false); // évite les doubles lectures

  const [status, setStatus] = useState<"idle" | "camera" | "manual" | "lookup" | "notfound" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [lastCode, setLastCode] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleCode = useCallback(
    async (code: string) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setLastCode(code);
      setStatus("lookup");
      try {
        const res = await fetch(`/api/v1/client/scan?code=${encodeURIComponent(code)}`);
        const json = (await res.json()) as {
          data: { productId: string } | null;
          error: { code: string; message: string } | null;
        };
        if (res.ok && json.data?.productId) {
          stopCamera();
          router.push(`/client/product/${json.data.productId}`);
          return;
        }
        setStatus("notfound");
        setTimeout(() => {
          lockRef.current = false;
          setStatus("camera");
        }, 1500);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Erreur réseau");
        setStatus("error");
        lockRef.current = false;
      }
    },
    [router, stopCamera],
  );

  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = (window as any).BarcodeDetector as BarcodeDetectorCtor | undefined;
    if (!Ctor) {
      setStatus("manual");
      setErrorMsg("Scanner non supporté par ce navigateur — utilise Chrome sur Android, ou saisis le code.");
      return;
    }
    try {
      detectorRef.current = new Ctor({ formats: BARCODE_FORMATS });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setStatus("camera");

      const loop = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0) {
            const raw = codes[0].rawValue.replace(/\D/g, "");
            if (raw.length >= 8) {
              await handleCode(raw);
              return;
            }
          }
        } catch {
          /* frame skip */
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      setErrorMsg(
        e instanceof Error
          ? e.name === "NotAllowedError"
            ? "Accès caméra refusé. Autorise-le dans les réglages du navigateur."
            : e.message
          : "Impossible d'ouvrir la caméra",
      );
      setStatus("error");
    }
  }, [handleCode]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <main className="min-h-svh bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 z-10">
        <Link
          href="/client/home"
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur grid place-items-center"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-sm font-semibold">Scanner un code-barre</div>
        <button
          type="button"
          onClick={() => {
            stopCamera();
            setStatus("manual");
          }}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur grid place-items-center"
          aria-label="Saisie manuelle"
        >
          <Keyboard className="w-5 h-5" />
        </button>
      </div>

      {/* Viewport */}
      <div className="relative flex-1 overflow-hidden">
        {status !== "manual" && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />
        )}

        {/* Overlay avec cible */}
        {(status === "camera" || status === "lookup" || status === "notfound") && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-44 max-w-[80vw]">
              <div className="absolute inset-0 border-2 border-white/80 rounded-2xl" />
              <div className="absolute inset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-2xl" />
              <ScanLine className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-white/70 animate-pulse" />
            </div>
            <p className="absolute left-0 right-0 top-[calc(50%+120px)] text-center text-sm text-white/80 px-6">
              Alignez le code-barre dans le cadre
            </p>
          </div>
        )}

        {/* Manual entry */}
        {status === "manual" && (
          <div className="absolute inset-0 flex items-start justify-center pt-16 bg-[var(--color-background)] text-[var(--color-foreground)]">
            <form
              className="w-full max-w-sm space-y-4 px-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCode.trim()) handleCode(manualCode.trim());
              }}
            >
              <div>
                <label className="text-sm font-semibold" htmlFor="bc">
                  Code-barre
                </label>
                <input
                  id="bc"
                  inputMode="numeric"
                  autoFocus
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="ex : 6134091915159"
                  className="mt-2 w-full h-12 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-base"
                />
              </div>
              <button
                type="submit"
                disabled={manualCode.length < 6}
                className="az-btn-primary w-full h-12 text-sm disabled:opacity-50"
              >
                Chercher le prix
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  startCamera();
                }}
                className="w-full text-sm text-[var(--color-foreground-muted)] flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" /> Réessayer la caméra
              </button>
            </form>
          </div>
        )}

        {/* Erreur */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-[var(--color-background)] text-[var(--color-foreground)]">
            <p className="text-sm text-[var(--color-az-danger)]">{errorMsg}</p>
            <button onClick={() => setStatus("manual")} className="az-btn-primary">
              Saisir le code
            </button>
          </div>
        )}

        {/* Overlay chargement / not found */}
        {status === "lookup" && (
          <div className="absolute inset-x-0 bottom-32 flex justify-center">
            <div className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin" /> Recherche du produit…
            </div>
          </div>
        )}
        {status === "notfound" && (
          <div className="absolute inset-x-0 bottom-32 flex justify-center">
            <div className="bg-[var(--color-az-danger)] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              Code {lastCode} inconnu
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

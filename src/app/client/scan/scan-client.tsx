"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Keyboard, Loader2, ScanLine } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

/**
 * Scanner code-barre.
 *
 * Deux moteurs de décodage, choisis dans cet ordre :
 *   1. `BarcodeDetector` natif  — Chrome/Edge Android, Samsung Internet, Firefox 116+
 *   2. `@zxing/browser`         — fallback JS pur pour Safari iPhone / tout le reste
 *
 * L'ouverture de la caméra est déclenchée par un tap utilisateur explicite
 * (iOS Safari refuse `getUserMedia` hors user gesture).
 */

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"];

const ZXING_HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
    ],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

// BarcodeDetector typing (absent de lib.dom)
type BarcodeDetectorLike = {
  detect: (s: CanvasImageSource) => Promise<Array<{ rawValue: string; format: string }>>;
};
type BarcodeDetectorCtor = new (o?: { formats?: string[] }) => BarcodeDetectorLike;

type Status = "idle" | "starting" | "scanning" | "manual" | "lookup" | "notfound" | "error";

export function ScanClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingCtrlRef = useRef<{ stop: () => void } | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockRef = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [engine, setEngine] = useState<"native" | "zxing" | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    zxingCtrlRef.current?.stop();
    zxingCtrlRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleCode = useCallback(
    async (code: string) => {
      if (lockRef.current) return;
      lockRef.current = true;
      const clean = code.replace(/\D/g, "");
      setLastCode(clean);
      setStatus("lookup");
      try {
        const res = await fetch(`/api/v1/client/scan?code=${encodeURIComponent(clean)}`);
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
          setStatus("scanning");
        }, 1500);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Erreur réseau");
        setStatus("error");
        lockRef.current = false;
      }
    },
    [router, stopCamera],
  );

  const startScanner = useCallback(async () => {
    setErrorMsg(null);
    setStatus("starting");

    // 1. Ouvrir la caméra arrière
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
    } catch (e) {
      setErrorMsg(
        e instanceof Error
          ? e.name === "NotAllowedError"
            ? "Accès caméra refusé. Autorise-le dans les réglages du navigateur."
            : e.name === "NotFoundError"
              ? "Aucune caméra trouvée sur ton appareil."
              : e.message
          : "Impossible d'ouvrir la caméra",
      );
      setStatus("error");
      return;
    }
    streamRef.current = stream;

    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    // iOS Safari : nécessite ces attributs + play() sous user gesture
    video.setAttribute("playsinline", "true");
    video.muted = true;
    try {
      await video.play();
    } catch {
      /* play retriggered on user tap fallback */
    }
    setStatus("scanning");

    // 2. Choisir un moteur — natif d'abord, ZXing sinon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = (window as any).BarcodeDetector as BarcodeDetectorCtor | undefined;
    if (Ctor) {
      setEngine("native");
      const det = new Ctor({ formats: FORMATS });
      const loop = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await det.detect(videoRef.current);
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
    } else {
      setEngine("zxing");
      const reader = new BrowserMultiFormatReader(ZXING_HINTS, { delayBetweenScanAttempts: 250 });
      const ctrl = await reader.decodeFromVideoElement(video, (result) => {
        if (!result) return;
        const raw = result.getText().replace(/\D/g, "");
        if (raw.length >= 8) void handleCode(raw);
      });
      zxingCtrlRef.current = ctrl;
    }
  }, [handleCode]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

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

        {/* Idle — bouton de démarrage (obligatoire pour iOS Safari) */}
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 text-center">
            <div className="grid place-items-center w-20 h-20 rounded-full bg-white/8 border border-white/12 backdrop-blur-md az-pulse-soft">
              <Camera className="w-9 h-9 text-white/70" strokeWidth={1.6} />
            </div>
            <p className="text-base text-white/85 max-w-xs leading-relaxed">
              Autorise l&apos;accès à ta caméra pour scanner le code-barre d&apos;un produit
            </p>
            <button
              onClick={startScanner}
              className="az-btn-primary h-12 px-8"
            >
              <Camera className="w-4 h-4" /> Ouvrir la caméra
            </button>
            <button
              onClick={() => setStatus("manual")}
              className="text-xs text-white/60 underline underline-offset-4 hover:text-white/90 transition-colors"
            >
              Ou saisir un code manuellement
            </button>
          </div>
        )}

        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Démarrage de la caméra…
            </div>
          </div>
        )}

        {/* Overlay cible */}
        {(status === "scanning" || status === "lookup" || status === "notfound") && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-44 max-w-[80vw]">
              <div className="absolute inset-0 border-2 border-white/80 rounded-2xl" />
              <div className="absolute inset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-2xl" />
              <ScanLine className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-white/70 animate-pulse" />
            </div>
            <p className="absolute left-0 right-0 top-[calc(50%+120px)] text-center text-sm text-white/80 px-6">
              Alignez le code-barre dans le cadre
              {engine === "zxing" && (
                <span className="block text-[10px] text-white/40 mt-1">Moteur ZXing</span>
              )}
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
                }}
                className="w-full text-sm text-[var(--color-foreground-muted)] flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" /> Retour au scanner caméra
              </button>
            </form>
          </div>
        )}

        {/* Erreur caméra */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-[var(--color-background)] text-[var(--color-foreground)]">
            <p className="text-sm text-[var(--color-az-danger)] max-w-xs">{errorMsg}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setStatus("idle")}
                className="h-11 px-5 rounded-full border border-[var(--color-border)] text-sm"
              >
                Réessayer
              </button>
              <button onClick={() => setStatus("manual")} className="az-btn-primary h-11 px-5 text-sm">
                Saisir le code
              </button>
            </div>
          </div>
        )}

        {/* Overlays lookup / not found */}
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

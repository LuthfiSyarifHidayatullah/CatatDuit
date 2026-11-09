"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseReceipt } from "@/lib/parseReceipt";
import { ParsedReceipt } from "@/lib/types";

interface Props {
  onResult: (data: { parsed: ParsedReceipt; rawText: string; previewUrl: string }) => void;
}

type Status = "idle" | "loading" | "running" | "error";
type Mode = "gemini" | "tesseract";

const MODE_KEY = "catatduit:scanMode";

/** Baca File menjadi base64 (tanpa prefix data URL). */
function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve({ base64, mimeType: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

export default function ReceiptScanner({ onResult }: Props) {
  const [mode, setMode] = useState<Mode>("gemini");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Ingat pilihan mode terakhir.
  useEffect(() => {
    const saved = window.localStorage.getItem(MODE_KEY);
    if (saved === "gemini" || saved === "tesseract") setMode(saved);
  }, []);

  const changeMode = (m: Mode) => {
    setMode(m);
    window.localStorage.setItem(MODE_KEY, m);
  };

  const scanWithGemini = useCallback(
    async (file: File, url: string) => {
      setStatus("running");
      const { base64, mimeType } = await fileToBase64(file);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Gagal memindai dengan Gemini.");
      }
      onResult({ parsed: data.parsed as ParsedReceipt, rawText: data.rawText || "", previewUrl: url });
    },
    [onResult]
  );

  const scanWithTesseract = useCallback(
    async (file: File, url: string) => {
      const Tesseract = (await import("tesseract.js")).default;
      setStatus("running");
      const result = await Tesseract.recognize(file, "ind+eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const rawText = result.data.text || "";
      const parsed = parseReceipt(rawText);
      onResult({ parsed, rawText, previewUrl: url });
    },
    [onResult]
  );

  const run = useCallback(
    async (file: File) => {
      setError(null);
      setProgress(0);
      setStatus("loading");
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      try {
        if (mode === "gemini") {
          await scanWithGemini(file, url);
        } else {
          await scanWithTesseract(file, url);
        }
        setStatus("idle");
      } catch (e) {
        console.error(e);
        const fallback =
          mode === "gemini"
            ? "Gagal memindai dengan Gemini. Pastikan API key sudah diset, atau beralih ke mode OCR gratis."
            : "Gagal membaca struk. Pastikan ada koneksi internet (model OCR diunduh sekali) dan foto cukup jelas.";
        setError(e instanceof Error && e.message ? e.message : fallback);
        setStatus("error");
      }
    },
    [mode, scanWithGemini, scanWithTesseract]
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) run(file);
    e.target.value = "";
  };

  const busy = status === "loading" || status === "running";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {/* Pemilih mode pembacaan */}
      {!busy && (
        <div className="mb-5">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Mode pembacaan
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => changeMode("gemini")}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                mode === "gemini"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="font-semibold">✨ Gemini (akurat)</div>
              <div className="text-xs opacity-80">Baca item &amp; total. Perlu API key gratis.</div>
            </button>
            <button
              type="button"
              onClick={() => changeMode("tesseract")}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                mode === "tesseract"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="font-semibold">🔌 OCR gratis (offline)</div>
              <div className="text-xs opacity-80">Tanpa API. Akurasi lebih terbatas.</div>
            </button>
          </div>
        </div>
      )}

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Pratinjau struk"
          className="mx-auto mb-4 max-h-56 rounded-lg object-contain"
        />
      )}

      {busy ? (
        <div className="py-6 text-center">
          <div className="mb-3 text-sm font-medium text-slate-600">
            {mode === "gemini"
              ? "Membaca struk dengan Gemini…"
              : status === "loading"
                ? "Menyiapkan OCR (mengunduh model bahasa, hanya sekali)…"
                : `Membaca struk… ${progress}%`}
          </div>
          <div className="mx-auto h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{
                width: `${mode === "tesseract" && status === "running" ? progress : 40}%`,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="mb-1 text-lg font-semibold text-slate-800">
            Foto atau unggah struk
          </div>
          <p className="mb-5 text-sm text-slate-500">
            Data pada struk akan dibaca otomatis. Kamu tetap bisa cek &amp; edit
            hasilnya sebelum menyimpan.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-medium text-white transition hover:bg-brand-700"
            >
              📷 Foto struk
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              🖼️ Unggah gambar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

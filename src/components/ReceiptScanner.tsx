"use client";

import { useCallback, useRef, useState } from "react";
import { parseReceipt } from "@/lib/parseReceipt";
import { ParsedReceipt } from "@/lib/types";

interface Props {
  onResult: (data: { parsed: ParsedReceipt; rawText: string; previewUrl: string }) => void;
}

type Status = "idle" | "loading" | "running" | "error";

export default function ReceiptScanner({ onResult }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const runOcr = useCallback(
    async (file: File) => {
      setError(null);
      setProgress(0);
      setStatus("loading");

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      try {
        // Import dinamis supaya Tesseract hanya dimuat di browser saat dibutuhkan.
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
        setStatus("idle");
      } catch (e) {
        console.error(e);
        setError(
          "Gagal membaca struk. Pastikan ada koneksi internet (model OCR diunduh sekali) dan foto cukup jelas."
        );
        setStatus("error");
      }
    },
    [onResult]
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runOcr(file);
    // reset supaya file yang sama bisa dipilih lagi
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
            {status === "loading"
              ? "Menyiapkan OCR (mengunduh model bahasa, hanya sekali)…"
              : `Membaca struk… ${progress}%`}
          </div>
          <div className="mx-auto h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${status === "running" ? progress : 15}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="mb-1 text-lg font-semibold text-slate-800">
            Foto atau unggah struk
          </div>
          <p className="mb-5 text-sm text-slate-500">
            Teks pada struk akan dibaca otomatis. Kamu tetap bisa cek &amp; edit
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

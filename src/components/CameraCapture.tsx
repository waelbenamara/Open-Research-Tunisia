"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A live in-app camera. Opens the device camera via getUserMedia (works on
 * desktop webcams and phones alike — the browser handles the permission
 * prompt), shows a preview, and on capture hands back a JPEG File. Falls back
 * to the file picker if no camera is available or permission is denied.
 *
 * Requires a secure context (HTTPS or localhost) — production is HTTPS.
 */
export function CameraCapture({
  onCapture,
  onClose,
  onFallback,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<{ url: string; file: File } | null>(null);
  const [starting, setStarting] = useState(true);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't open the camera.");
      setStarting(false);
      return;
    }
    try {
      let stream: MediaStream;
      try {
        // Prefer the back camera on phones; harmless on desktop.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was blocked. Allow it in your browser, or upload a photo instead."
          : name === "NotFoundError"
            ? "No camera found on this device."
            : "Couldn't open the camera.",
      );
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    stop();
    onClose();
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        setShot({ url: URL.createObjectURL(blob), file });
      },
      "image/jpeg",
      0.9,
    );
  }

  function retake() {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
  }

  function usePhoto() {
    if (!shot) return;
    onCapture(shot.file);
    close();
  }

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center p-4"
      style={{ background: "rgba(12,10,8,0.82)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
    >
      <div className="w-full max-w-[540px] overflow-hidden rounded-[18px] border border-line bg-card shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
          <span className="text-[13.5px] font-semibold text-ink">
            {shot ? "Use this photo?" : "Take a photo"}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close camera"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border-none bg-transparent text-[18px] text-ink-4 hover:bg-tint hover:text-ink"
          >
            ×
          </button>
        </div>

        <div className="relative grid aspect-[4/3] w-full place-items-center bg-black">
          {/* Live preview (hidden once a shot is taken). */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-contain ${shot ? "hidden" : "block"}`}
          />
          {/* Captured frame for review. */}
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot.url} alt="Captured photo" className="h-full w-full object-contain" />
          ) : null}

          {starting && !error ? (
            <div className="absolute inset-0 grid place-items-center text-[13px] text-paper/80">
              Starting camera…
            </div>
          ) : null}

          {error ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                <p className="mb-4 text-[13.5px] leading-relaxed text-paper">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onFallback();
                  }}
                  className="cursor-pointer rounded-full border-none bg-brick px-4 py-2 text-[13px] font-semibold"
                  style={{ color: "#faf8f3" }}
                >
                  Upload a photo instead
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {!error ? (
          <div className="flex items-center justify-center gap-3 px-4 py-3.5">
            {shot ? (
              <>
                <button
                  type="button"
                  onClick={retake}
                  className="cursor-pointer rounded-full border border-line bg-transparent px-4 py-2 text-[13px] font-medium text-ink-4 hover:border-line-strong hover:text-ink"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={usePhoto}
                  className="cursor-pointer rounded-full border-none px-5 py-2 text-[13px] font-semibold"
                  style={{ background: "linear-gradient(135deg, #9a3b2b, #69241a)", color: "#faf8f3" }}
                >
                  Use photo
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={capture}
                disabled={starting}
                aria-label="Capture photo"
                className="grid h-[58px] w-[58px] cursor-pointer place-items-center rounded-full border-[3px] border-brick bg-card transition-transform hover:enabled:scale-105 active:enabled:scale-95 disabled:opacity-40"
              >
                <span className="h-[42px] w-[42px] rounded-full bg-brick" />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

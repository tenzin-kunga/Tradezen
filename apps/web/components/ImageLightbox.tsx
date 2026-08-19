"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Dialog, DialogContent, Button } from "@/components/ui";
import { useTradeImages, type TradeImageDto } from "@/lib/api";

interface ImageLightboxProps {
  tradeId: string;
  previewImage: { url: string; width?: number | null; height?: number | null };
  imageCount: number;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({
  tradeId,
  previewImage,
  imageCount,
  open,
  onClose,
}: ImageLightboxProps) {
  const hasMultipleImages = imageCount > 1;

  const { data: allImages, isLoading } = useTradeImages(
    tradeId,
    open && hasMultipleImages,
  );

  const images: TradeImageDto[] = allImages ?? [];
  const totalImages =
    hasMultipleImages && images.length > 0 ? images.length : 1;

  const [currentIndex, setCurrentIndex] = useState(0);

  const currentUrl =
    hasMultipleImages && images.length > 0
      ? (images[currentIndex]?.url ?? previewImage.url)
      : previewImage.url;

  const goNext = useCallback(() => {
    if (currentIndex < totalImages - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, totalImages]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, goNext, goPrev]);

  useEffect(() => {
    if (!open) setCurrentIndex(0);
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        overlayClassName="bg-black/50 backdrop-blur-md"
        className="sm:max-w-[90vw] max-w-[90vw] max-h-[90vh] w-fit p-0 border overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-2xl)",
        }}
        showCloseButton={false}
      >
        <div className="relative flex items-center justify-center w-fit">
          {hasMultipleImages && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 z-20 opacity-70 hover:opacity-100"
              disabled={currentIndex === 0}
              onClick={goPrev}
              aria-label="Previous image"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Button>
          )}

          {isLoading && hasMultipleImages && images.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2"
              style={{ color: "var(--text-muted)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="animate-spin"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className="text-xs">Loading images...</span>
            </div>
          ) : (
            <Image
              src={currentUrl}
              alt="Trade screenshot"
              width={previewImage.width ?? 1200}
              height={previewImage.height ?? 800}
              className="max-h-[85vh] max-w-[90vw] h-auto w-auto object-contain rounded-lg"
              unoptimized
            />
          )}

          {hasMultipleImages && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 z-20 opacity-70 hover:opacity-100"
              disabled={currentIndex >= totalImages - 1}
              onClick={goNext}
              aria-label="Next image"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Button>
          )}
        </div>

        {/* Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          {hasMultipleImages && images.length > 0 ? (
            <span
              className="text-xs font-medium px-2 py-1 rounded bg-black/60"
              style={{ color: "var(--text-muted)" }}
            >
              {currentIndex + 1} of {totalImages}
            </span>
          ) : !hasMultipleImages ? (
            <span
              className="text-xs font-medium px-2 py-1 rounded bg-black/60"
              style={{ color: "var(--text-muted)" }}
            >
              1 of 1
            </span>
          ) : null}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex items-center justify-center w-9 h-9 rounded-full opacity-80 hover:opacity-100 transition-opacity border-none cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.12)",
            color: "var(--text-primary)",
          }}
          aria-label="Close lightbox"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </DialogContent>
    </Dialog>
  );
}

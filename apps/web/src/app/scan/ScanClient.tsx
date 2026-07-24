"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import styles from "@/app/scan/scan.module.css";

type ScannerStatus =
  | "idle"
  | "requesting"
  | "live"
  | "captured"
  | "denied"
  | "unsupported"
  | "error";

type LocalPhoto = {
  file: File;
  objectUrl: string;
  source: "camera" | "picker";
};

const MAX_LOCAL_PHOTO_BYTES = 30 * 1024 * 1024;
const SAFE_BACK_FALLBACK = "/network";

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 2688 },
  },
};

function makeCaptureFileName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `grookai-card-${timestamp}.jpg`;
}

function getCameraError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return {
        status: "denied" as const,
        message:
          "Camera access was denied. Allow camera access in this site's browser settings, or choose a photo instead.",
      };
    }

    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return {
        status: "unsupported" as const,
        message:
          "No compatible camera is available. You can still choose an existing photo.",
      };
    }

    if (error.name === "NotReadableError" || error.name === "AbortError") {
      return {
        status: "error" as const,
        message:
          "The camera is busy or could not be started. Close other camera apps and try again.",
      };
    }
  }

  return {
    status: "error" as const,
    message: "The camera could not be started. Try again or choose a photo.",
  };
}

function canShareLocalFile(file: File) {
  try {
    return (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}

export function ScanClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const safeBackRef = useRef(false);

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [photo, setPhoto] = useState<LocalPhoto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [shareAvailable, setShareAvailable] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    streamRef.current = null;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const releasePhoto = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setPhoto(null);
    setShareAvailable(false);
    setShareMessage(null);
  }, []);

  const setLocalPhoto = useCallback(
    (file: File, source: LocalPhoto["source"]) => {
      releasePhoto();
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setPhoto({ file, objectUrl, source });
      setStatus("captured");
      setMessage(null);

      setShareAvailable(canShareLocalFile(file));
    },
    [releasePhoto],
  );

  useEffect(() => {
    mountedRef.current = true;

    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      safeBackRef.current =
        referrer?.origin === window.location.origin &&
        referrer.pathname !== "/scan";
    } catch {
      safeBackRef.current = false;
    }

    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
      stopCamera();

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [stopCamera]);

  async function startCamera() {
    requestVersionRef.current += 1;
    const requestVersion = requestVersionRef.current;
    stopCamera();
    releasePhoto();
    setMessage(null);
    setIsCapturing(false);
    setShareMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setMessage(
        "This browser cannot open a live camera. Choose a photo from your device instead.",
      );
      return;
    }

    setStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        CAMERA_CONSTRAINTS,
      );

      if (
        !mountedRef.current ||
        requestVersion !== requestVersionRef.current
      ) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        setStatus("error");
        setMessage("The camera preview could not be created. Try again.");
        return;
      }

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      if (
        !mountedRef.current ||
        requestVersion !== requestVersionRef.current
      ) {
        stopCamera();
        return;
      }

      setStatus("live");
    } catch (error) {
      if (
        !mountedRef.current ||
        requestVersion !== requestVersionRef.current
      ) {
        return;
      }

      stopCamera();
      const cameraError = getCameraError(error);
      setStatus(cameraError.status);
      setMessage(cameraError.message);
    }
  }

  async function capturePhoto() {
    if (isCapturing) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      setMessage("The camera is still getting ready. Hold steady and try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setStatus("error");
      setMessage("The photo could not be captured. Try another photo instead.");
      stopCamera();
      return;
    }

    const captureVersion = requestVersionRef.current;
    setIsCapturing(true);
    setMessage(null);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.94);
    });

    if (
      !mountedRef.current ||
      captureVersion !== requestVersionRef.current
    ) {
      return;
    }

    if (!blob) {
      setIsCapturing(false);
      setStatus("error");
      setMessage("The photo could not be captured. Try again.");
      stopCamera();
      return;
    }

    const file = new File([blob], makeCaptureFileName(), {
      type: blob.type || "image/jpeg",
      lastModified: Date.now(),
    });
    requestVersionRef.current += 1;
    setIsCapturing(false);
    stopCamera();
    setLocalPhoto(file, "camera");
  }

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    requestVersionRef.current += 1;
    stopCamera();
    setIsCapturing(false);

    if (!file.type.startsWith("image/")) {
      setStatus("error");
      setMessage("Choose an image file from your camera or photo library.");
      return;
    }

    if (file.size > MAX_LOCAL_PHOTO_BYTES) {
      setStatus("error");
      setMessage("Choose a photo smaller than 30 MB.");
      return;
    }

    setLocalPhoto(file, "picker");
  }

  async function sharePhoto() {
    if (!photo || !shareAvailable) {
      return;
    }

    setShareMessage(null);

    try {
      await navigator.share({
        files: [photo.file],
        title: "Grookai card photo",
        text: "A card photo captured locally in Grookai Vault.",
      });
      setShareMessage("The share sheet closed.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareMessage("Sharing was canceled. The photo remains on this device.");
        return;
      }

      setShareMessage("The photo could not be shared. You can save it instead.");
    }
  }

  function closeCamera() {
    requestVersionRef.current += 1;
    stopCamera();
    setIsCapturing(false);
    setStatus("idle");
    setMessage(null);
  }

  function leaveScanner() {
    requestVersionRef.current += 1;
    stopCamera();
    releasePhoto();

    if (safeBackRef.current && window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(SAFE_BACK_FALLBACK);
  }

  const hasError =
    status === "denied" || status === "unsupported" || status === "error";

  return (
    <div className={styles.scanPage} data-gv-scan-page>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={leaveScanner}
          aria-label="Close scanner"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1>Scan</h1>
        <span className={styles.headerSpacer} aria-hidden="true" />
      </header>

      <main className={styles.body}>
        <section
          className={styles.scanner}
          aria-labelledby="scanner-instruction"
        >
          <div
            className={`${styles.preview} ${
              status === "live" ? styles.previewLive : ""
            }`}
          >
            <video
              ref={videoRef}
              className={styles.video}
              muted
              playsInline
              aria-label="Live rear camera preview"
            />

            {photo ? (
              // Blob URLs are local browser previews and cannot use next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.photo}
                src={photo.objectUrl}
                alt={
                  photo.source === "camera"
                    ? "Captured card preview"
                    : "Selected card photo preview"
                }
              />
            ) : null}

            <div className={styles.guide} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>

            {status !== "live" && status !== "captured" ? (
              <div className={styles.previewState}>
                {status === "requesting" ? (
                  <span className={styles.spinner} aria-hidden="true" />
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 4H5a1 1 0 0 0-1 1v2" />
                    <path d="M17 4h2a1 1 0 0 1 1 1v2" />
                    <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
                    <path d="M17 20h2a1 1 0 0 0 1-1v-2" />
                    <rect x="7" y="8" width="10" height="8" rx="2" />
                    <circle cx="12" cy="12" r="2.25" />
                  </svg>
                )}
                <p>
                  {status === "requesting"
                    ? "Waiting for camera permission…"
                    : hasError
                      ? "Camera unavailable"
                      : "Camera is off"}
                </p>
              </div>
            ) : null}
          </div>

          <div className={styles.instructions} aria-live="polite">
            <p id="scanner-instruction" className={styles.instruction}>
              {status === "live"
                ? "Place one card inside the guide"
                : status === "captured"
                  ? "Photo ready"
                  : "Capture one card at a time"}
            </p>
            <p className={styles.hint}>
              {status === "live"
                ? "Hold steady, then capture a photo."
                : status === "captured"
                  ? "This photo is still local to your device."
                  : "Camera access starts only after you choose Start camera."}
            </p>
          </div>

          {message ? (
            <p className={styles.alert} role="alert">
              {message}
            </p>
          ) : null}

          <div className={styles.controls}>
            {status === "idle" ||
            status === "denied" ||
            status === "unsupported" ||
            status === "error" ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={startCamera}
              >
                {status === "idle" ? "Start camera" : "Try camera again"}
              </button>
            ) : null}

            {status === "requesting" ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeCamera}
              >
                Cancel
              </button>
            ) : null}

            {status === "live" ? (
              <>
                <button
                  type="button"
                  className={styles.shutter}
                  onClick={capturePhoto}
                  aria-label="Capture card photo"
                  aria-busy={isCapturing}
                  disabled={isCapturing}
                >
                  <span aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={closeCamera}
                >
                  Close camera
                </button>
              </>
            ) : null}

            {status === "captured" && photo ? (
              <>
                <div className={styles.photoActions}>
                  <a
                    className={styles.primaryButton}
                    href={photo.objectUrl}
                    download={photo.file.name}
                  >
                    Save photo
                  </a>
                  {shareAvailable ? (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={sharePhoto}
                    >
                      Share photo
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={startCamera}
                >
                  Retake with camera
                </button>
              </>
            ) : null}

            {status !== "requesting" && status !== "live" ? (
              <label className={styles.photoPicker}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelection}
                />
                {status === "captured"
                  ? "Choose another photo"
                  : "Use a photo instead"}
              </label>
            ) : null}
          </div>

          {shareMessage ? (
            <p className={styles.shareStatus} role="status">
              {shareMessage}
            </p>
          ) : null}
        </section>

        {status === "captured" ? (
          <section className={styles.handoff} aria-labelledby="scan-next-step">
            <p className={styles.eyebrow}>Next step</p>
            <h2 id="scan-next-step">Add the exact card manually</h2>
            <p>
              Grookai does not identify or add this photo yet. Nothing has been
              uploaded. Search for the card and choose its exact printing before
              adding it to your Vault.
            </p>
            <div className={styles.handoffActions}>
              <Link href="/explore" onClick={stopCamera}>
                Search and add manually
              </Link>
              <Link href="/vault/import" onClick={stopCamera}>
                Import a Collectr CSV
              </Link>
            </div>
            <p className={styles.csvNote}>
              Vault Import accepts a Collectr CSV only; it does not accept this
              photo.
            </p>
          </section>
        ) : null}

        <p className={styles.privacyNote}>
          No photo is uploaded automatically. Saving or sharing happens only
          after you choose it.
        </p>
      </main>

      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
}

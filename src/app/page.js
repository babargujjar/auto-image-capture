"use client";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [flash, setFlash] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isCapturing, setIsCapturing] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    async function initCamera() {
      try {
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);

        const constraints = {
          video: isMobile ? { facingMode: "environment" } : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        
        startCapturing();

        return () => {
          stopCapturing();
          stream.getTracks().forEach((track) => track.stop());
        };
      } catch (err) {
        console.error("Camera error:", err);
      }
    }

    initCamera();
  }, []);

  const startCapturing = () => {
    if (intervalRef.current) return; 
    intervalRef.current = setInterval(() => {
      captureImage();
    }, 5000);
    setIsCapturing(true);
  };

  const stopCapturing = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsCapturing(false);
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    ctx.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const imageData = canvasRef.current.toDataURL("image/png");

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    setPreview(imageData);
    setTimeout(() => setPreview(null), 1000);

    console.log("📸 Captured:", imageData.substring(0, 50));

    // 📍 Location
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await saveToSupabase(
          imageData,
          pos.coords.latitude,
          pos.coords.longitude
        );
      },
      async () => {
        await saveToSupabase(imageData, null, null);
      }
    );
  };

  async function saveToSupabase(image, latitude, longitude) {
    try {
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, latitude, longitude }),
      });
      const data = await res.json();
      console.log("✅ Uploaded:", data);
    } catch (error) {
      console.error("❌ Upload failed:", error);
    }
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 🎥 Camera */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} width={1280} height={720} className="hidden" />

      {/* ⚡ Flash */}
      {flash && (
        <div className="absolute inset-0 bg-white opacity-80 animate-pulse" />
      )}

      {/* 🖼️ Preview */}
      {preview && (
        <img
          src={preview}
          alt="Captured"
          className="absolute bottom-4 right-4 w-32 h-20 rounded-lg border-2 border-white shadow-lg"
        />
      )}

      {/* 🎛️ Stop / Resume Button */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        {isCapturing ? (
          <button
            onClick={stopCapturing}
            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg shadow-lg"
          >
            ⏸ Stop Capturing
          </button>
        ) : (
          <button
            onClick={startCapturing}
            className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow-lg"
          >
            ▶ Resume Capturing
          </button>
        )}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";

export default function page() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const [flash, setFlash] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    async function initCamera() {
      try {
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);

        const constraints = {
          video: isMobile
            ? { facingMode: { exact: "environment" } } // 📱 Mobile back cam
            : true, // 💻 Desktop cam
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const interval = setInterval(() => {
          captureImage();
        }, 5000);

        return () => {
          clearInterval(interval);
          stream.getTracks().forEach((track) => track.stop());
        };
      } catch (err) {
        console.error("Camera error:", err);
      }
    }

    initCamera();
  }, []);

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

    // 🔊 Play shutter sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }

    // ⚡ Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    // 🖼️ Show preview for 1 sec
    setPreview(imageData);
    setTimeout(() => setPreview(null), 1000);

    console.log("📸 Captured:", imageData.substring(0, 50));

    // Send to API
    // try {
    //   await fetch("/api/upload-image", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ image: imageData }),
    //   });
    // } catch (error) {
    //   console.error("❌ Upload failed:", error);
    // }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 🎥 Live Camera */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Hidden canvas */}
      <canvas ref={canvasRef} width={1280} height={720} className="hidden" />

      {/* 🔊 Shutter sound */}
      {/* <audio ref={audioRef} src="/shutter.mp3" preload="auto" /> */}

      {/* ⚡ Flash overlay */}
      {flash && (
        <div className="absolute inset-0 bg-white opacity-80 animate-pulse" />
      )}

      {/* 🖼️ Preview image */}
      {preview && (
        <img
          src={preview}
          alt="Captured"
          className="absolute bottom-4 right-4 w-32 h-20 rounded-lg border-2 border-white shadow-lg"
        />
      )}
    </div>
  );
}

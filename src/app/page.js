"use client";
import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function Page() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [flash, setFlash] = useState(false);
  const [preview, setPreview] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState(null);

  // 🟢 NEW
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null); // ✅/❌ display

  // Load models
  useEffect(() => {
    async function loadModels() {
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
      console.log("✅ FaceAPI Models Loaded");
      initCamera();
    }
    loadModels();
  }, []);

  const initCamera = async () => {
    try {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      const constraints = {
        video: isMobile ? { facingMode: "environment" } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // Load known images
  useEffect(() => {
    if (!modelsLoaded) return;

    async function loadLabeledImages() {
      try {
        const res = await fetch("/api/upload-image");
        const data = await res.json();
        const photos = data.data;

        const labeledDescriptors = [];
        for (let photo of photos) {
          try {
            const img = await faceapi.fetchImage(photo.image_url);
            const detection = await faceapi
              .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detection) {
              labeledDescriptors.push(
                new faceapi.LabeledFaceDescriptors(photo.id.toString(), [
                  detection.descriptor,
                ])
              );
            }
          } catch (err) {
            console.error("Error loading image:", photo.image_url, err);
          }
        }

        if (labeledDescriptors.length > 0) {
          const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
          setFaceMatcher(matcher);
          console.log(
            "✅ Face Matcher Ready with",
            labeledDescriptors.length,
            "faces"
          );
        }
      } catch (err) {
        console.error("API fetch error:", err);
      }
    }

    loadLabeledImages();
  }, [modelsLoaded]);

  // Face detection loop
  useEffect(() => {
    if (!modelsLoaded) return;

    const detectFaces = async () => {
      if (isProcessing) return;
      if (videoRef.current && canvasRef.current) {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );
        if (detections.length > 0) {
          console.log("👤 Face detected!");
          setIsProcessing(true);
          await captureImage();
        }
      }
    };

    const interval = setInterval(detectFaces, 1500);
    return () => clearInterval(interval);
  }, [modelsLoaded, faceMatcher, isProcessing]);

  // Capture + Recognize
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
    setCapturedImage(imageData);

    let resultText = "❌ Unknown";

    if (faceMatcher) {
      const img = await faceapi.fetchImage(imageData);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        if (bestMatch.label !== "unknown") {
          console.log("✅ Known Person:", bestMatch.label);
          resultText = `✅ Known: ${bestMatch.label}`;
        } else {
          console.log("❌ Unknown Person");
          resultText = "❌ Unknown";
        }
      } else {
        console.log("⚠️ No face detected in captured image");
        resultText = "⚠️ No face detected";
      }
    }
    // 🔍 Recognition
    // if (faceMatcher) {
    //   const img = await faceapi.fetchImage(imageData);
    //   const detection = await faceapi
    //     .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    //     .withFaceLandmarks()
    //     .withFaceDescriptor();

    //   if (detection) {
    //     const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
    //     if (bestMatch.label !== "unknown") {
    //       console.log("✅ Known Person:", bestMatch.label);
    //     } else {
    //       console.log("❌ Unknown Person");
    //     }
    //   } else {
    //     console.log("⚠️ No face detected in captured image");
    //   }
    // }

    setRecognitionResult(resultText);

    // Unlock only after result is set
    setIsProcessing(false);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas ref={canvasRef} width={1280} height={720} className="hidden" />

      {/* Flash */}
      {flash && (
        <div className="absolute inset-0 bg-white opacity-80 animate-pulse" />
      )}

      {/* Preview */}
      {preview && (
        <img
          src={preview}
          alt="Captured"
          className="absolute bottom-4 right-4 w-32 h-20 rounded-lg border-2 border-white shadow-lg"
        />
      )}

      {/* Top-right recognition result */}
      {recognitionResult && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg font-semibold shadow-lg">
          {recognitionResult}
        </div>
      )}

      {/* Debug info */}
      {capturedImage && (
        <div className="absolute bottom-4 left-4 bg-white text-black p-2 rounded">
          ✅ Face Captured & Checked
        </div>
      )}
    </div>
  );
}

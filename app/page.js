"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const canvasRef = useRef(null);
  const [analyser, setAnalyser] = useState(null);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [micError, setMicError] = useState("");
  const smoothedDataRef = useRef(new Uint8Array(256));

  async function startMic() {
    if (isVisualizing) return;
    setIsVisualizing(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const newAnalyser = audioContext.createAnalyser();
      newAnalyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(newAnalyser);

      setAnalyser(newAnalyser);
    } catch (err) {
      console.error("Microphone access error:", err);
      setMicError("Mic access denied or not supported: " + err.message);
      setIsVisualizing(false);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId;
    const dataArray = new Uint8Array(256);
    const baseRadius = 100;
    const maxBulge = 30; // smaller bulge to prevent freak outs
    const segments = 64;

    function draw() {
      if (!analyser) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        animationId = requestAnimationFrame(draw);
        return;
      }

      analyser.getByteTimeDomainData(dataArray);
      const smoothedData = smoothedDataRef.current;

      for (let i = 0; i < dataArray.length; i++) {
        // Smooth the data (more smoothing = less jitter)
        smoothedData[i] = 0.85 * smoothedData[i] + 0.15 * dataArray[i];
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.beginPath();

      for (let i = 0; i < segments; i++) {
        const dataIndex = Math.floor((i / segments) * smoothedData.length);
        const audioValue = smoothedData[dataIndex] || 128;

        const offset = (audioValue - 128) / 128; // -1 to 1
        const eased = Math.sign(offset) * Math.pow(Math.abs(offset), 0.6); // less aggressive
        const bulge = Math.max(Math.min(eased * maxBulge, maxBulge), -maxBulge);

        const radius = baseRadius + bulge;
        const angle = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.closePath();

      const gradient = ctx.createRadialGradient(0, 0, baseRadius * 0.1, 0, 0, baseRadius + maxBulge);
      gradient.addColorStop(0, "#ff9999");
      gradient.addColorStop(0.5, "#99ff99");
      gradient.addColorStop(1, "#9999ff");

      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    }

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [analyser]);

  return (
    <div
      style={{
        backgroundColor: "#FFF8DC",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1 style={{ marginBottom: 20 }}>Custom Circular Audio Visualizer</h1>
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        style={{
          border: "1px solid #999",
          borderRadius: "10px",
          marginBottom: 20,
        }}
      />
      {!isVisualizing && (
        <button
          onClick={startMic}
          style={{
            padding: "10px 20px",
            backgroundColor: "#a15e5e",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Start Visualizer
        </button>
      )}
      {micError && (
        <p style={{ color: "red", marginTop: 10 }}>{micError}</p>
      )}
    </div>
  );
}


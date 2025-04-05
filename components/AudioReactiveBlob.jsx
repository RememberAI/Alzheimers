import React, { useRef, useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { Box, Paper, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { grey, lightBlue } from '@mui/material/colors';

// --- Material-UI Theme ---
const theme = createTheme({
  palette: { 
    mode: 'light', 
    background: { 
      default: '#f8f8f8', 
      paper: '#ffffff', 
    }, 
    text: { 
      primary: grey[900], 
      secondary: grey[700], 
    }, 
    primary: {
      main: lightBlue[700],
      light: lightBlue[500],
      dark: lightBlue[900],
    },
    error: { 
      main: '#d32f2f', 
    }, 
  },
  components: { 
    MuiPaper: { 
      styleOverrides: { 
        root: { 
          borderRadius: '16px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
          border: `1px solid ${grey[200]}`, 
          position: 'relative', 
          overflow: 'hidden', 
        } 
      } 
    } 
  },
});

// --- p5.js Sketch Definition ---
const sketch = (p) => {
  // --- Audio Analysis Setup ---
  let audioContext; let analyser; let microphone; let micStream; let frequencyData;
  let audioReady = false; let sampleRate = 44100;
  const audioThreshold = 0.09;
  const fftSize = 512;
  let nyquist;

  // --- State Management (within p5) ---
  let isP5StateActive = false;
  let activeStateIntensity = 0; const activeStateLerpFactor = 0.07;

  // --- Blob Geometry & Core Properties ---
  let baseRadius = 100;
  const numVertices = 140; let vertices = [];

  // --- Core "Breathing" & Pause Effects ---
  let breathingTime = Math.random() * 500;
  const breathingSpeed = 0.0008; const breathingAmount = 0.025;
  let isBreathing = false; let silenceFrames = 0;
  const silenceThreshold = 0.03; const framesForBreathing = 90;
  const framesForPause = 20;
  let pauseEnded = false;
  let pauseEffectTimer = 0; const pauseEffectDuration = 12;
  let pauseEffectIntensity = 0; const pauseEffectDecay = 0.06;
  let inhaleAmount = 0;
  const inhaleSpeed = 0.15;
  const maxInhaleFactor = 0.08;

  // --- Noise Parameters ---
  // Passive - Gentle, slow-moving baseline effects
  let passiveNoiseTime = Math.random() * 1000; const basePassiveNoiseSpeed = 0.0004; // Slower for calmer motion
  const passiveNoisePosScale = 0.7;
  let currentPassiveDeformationAmount = 0.04; // Very subtle deformation for stability
  const basePassiveDeformationAmount = 0.04; // Very subtle deformation for stability
  const maxPassiveDeformationBoost = 0.02; // Minimal boost for gentle response
  const passiveDeformationLerpFactor = 0.008; // Slower transitions for smoother animation
  
  // Active - Shape (core form) - very subtle, slow changes
  let activeShapeNoiseTime = Math.random() * 2000; const baseActiveShapeNoiseSpeed = 0.0006; // Much slower for stability
  const baseActiveShapeNoiseScale = 0.9; // Subtle shape variation
  let currentActiveShapeNoiseScale = baseActiveShapeNoiseScale;
  const shapeScaleLerpFactor = 0.008; // Slower transitions
  const shapeScaleSpreadFactor = 0.08; // Minimal variation
  
  // Active - Texture (fine details) - very subtle
  let activeTextureNoiseTime = Math.random() * 3000; const baseActiveTextureNoiseSpeed = 0.0010; // Slower for stability
  const activeTextureNoiseScale = 8.0; let currentActiveTextureIntensity = 0.04; // Very subtle texture
  const baseTextureIntensity = 0.02; const maxTextureIntensity = 0.08; // Limited intensity
  const textureIntensityLerpFactor = 0.012; // Slower transitions
  
  // Active - Waviness (speaking motion) - gentle, controlled response
  let activeWavinessNoiseTime = Math.random() * 4000; const baseActiveWavinessNoiseSpeed = 0.0006; // Slower for stability
  let currentWavinessNoiseScale = 3.5; // Lower scale for smoother shapes
  const baseWavinessNoiseScale = 3.5; // Lower scale for smoother shapes
  const wavinessScalePitchFactor = 0.5; // Reduced pitch influence for consistency
  const wavinessScaleLerpFactor = 0.01; // Very slow transitions for elderly-friendly visuals
  let currentWavinessInfluence = 0.0;
  const maxWavinessInfluence = 0.15; // Limited influence for controlled movement
  const wavinessInfluenceLerpFactor = 0.012; // Slower transitions
  // Active - Angular Offset
  let activeNoiseAngularOffset = Math.random() * p.TWO_PI;
  const baseActiveNoiseOffsetSpeed = 0.0003;

  // --- Speed Modulation by Volume --- (slower, more deliberate for CSM speaking style)
  const maxSlowSpeedMultiplier = 1.8; // Much lower for calmer motion
  const maxFastSpeedMultiplier = 1.4; // Much lower for calmer motion

  // Peak extension control - gentle, smooth response
  let activePeakMultiplier = 1.0; const activeMultiplierLerpFactor = 0.08; // Slower transitions
  const maxPeakExtensionFactor = 1.1; // Very limited extension for stability

  // --- Internal Complexity Texture ---
  let internalTextureTime = Math.random() * 6000; const internalTextureSpeed = 0.0003;
  const internalTextureScale = 0.5; const internalTextureComplexityScale = 2.5;
  let internalTextureAlpha = 0; const maxInternalTextureAlpha = 18;
  const internalAlphaLerpFactor = 0.015;

  // --- Edge Sharpness / Certainty Proxy ---
  let edgeSharpness = 1.0; const edgeSharpnessLerpFactor = 0.015;

  // --- Inferred Speech Mode Factors ---
  let focusFactor = 0.0; const focusFactorLerp = 0.02;
  let melodyFactor = 0.0; const melodyFactorLerp = 0.025;
  let emphasisFactor = 0.0; const emphasisFactorLerp = 0.05;

  // --- Audio Reactivity Parameters ---
  let smoothedOverallLevel = 0; let smoothedMidLevel = 0; let smoothedTrebleLevel = 0;
  const audioLerpFactor = 0.1;
  let frequencySpread = 0; const freqSpreadLerpFactor = 0.03;
  const binActivationThreshold = 10;
  let pitchProxy = 0.5; const pitchProxyLerpFactor = 0.06;
  let lastPitchProxy = 0.5;
  let pitchChangeRate = 0; const pitchChangeLerpFactor = 0.05;
  const pitchMinFreq = 80; const pitchMaxFreq = 500;
  let pitchMinIndex, pitchMaxIndex;
  let midHistory = []; const midHistoryLength = 30;
  let sustainedMidLevel = 0;

  // --- Volume Dynamics (Aha! detection) ---
  let volumeHistory = []; const volumeHistoryLength = 60;
  let averageVolume = 0; const ahaThresholdMultiplier = 1.4;
  const ahaMinimumLevel = 0.30; let isAhaMoment = false;
  let ahaTimer = 0; const ahaDuration = 15;

  // --- Color Properties --- (calm, soothing colors for elderly audience)
  const baseHue = 210; let hueShiftRange = 15; // Blue is calming, less shift for stability
  let targetHue = baseHue; let currentHue = baseHue; const hueLerpFactor = 0.01; // Slower color transitions
  const baseSaturation = 60; const baseBrightness = 95; // Slightly less saturated, gentle colors
  let saturationBoost = 0; const maxSaturationBoost = 10; // Limited saturation change
  let brightnessBoost = 0; const maxBrightnessBoost = 2; // Very subtle brightness changes
  let currentCenterColor; let currentEdgeColor; // Assigned in updateColor
  let flashIntensity = 0; const flashDecay = 0.10; // Slower decay for gentler transitions

  // --- p5.js Setup ---
  p.setup = () => {
    const container = document.getElementById('canvas-container'); 
    if (!container) {
      console.error("Canvas container not found");
      return;
    }
    
    // Create canvas with integer dimensions to avoid sub-pixel rendering issues
    const canvasWidth = Math.floor(container.offsetWidth);
    const canvasHeight = Math.floor(container.offsetHeight);
    
    // Create and position the canvas
    const canvas = p.createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvas-container');
    
    // Remove any default margins/padding that might cause positioning issues
    const canvasElement = document.querySelector('#canvas-container canvas');
    if (canvasElement) {
      canvasElement.style.display = 'block';
      canvasElement.style.margin = '0';
      canvasElement.style.padding = '0';
      canvasElement.style.width = '100%';
      canvasElement.style.height = '100%';
      canvasElement.style.position = 'absolute';
      canvasElement.style.top = '0';
      canvasElement.style.left = '0';
    }
    
    p.colorMode(p.HSB, 360, 100, 100, 100); 
    p.angleMode(p.RADIANS); 
    p.frameRate(60);
    
    baseRadius = p.min(p.width, p.height) / 5.0;
    nyquist = sampleRate / 2;
    const binWidth = nyquist / (fftSize / 2);
    pitchMinIndex = Math.max(1, Math.floor(pitchMinFreq / binWidth));
    pitchMaxIndex = Math.min(fftSize / 2 - 1, Math.ceil(pitchMaxFreq / binWidth));
    
    // Initialize vertices and history arrays
    for (let i = 0; i < numVertices; i++) { 
      vertices.push(p.createVector(0, 0)); 
    }
    for(let i=0; i<volumeHistoryLength; i++) volumeHistory.push(0);
    for(let i=0; i<midHistoryLength; i++) midHistory.push(0);
    
    // Initialize core variables to their base values
    currentActiveShapeNoiseScale = baseActiveShapeNoiseScale;
    currentPassiveDeformationAmount = basePassiveDeformationAmount;
    currentWavinessNoiseScale = baseWavinessNoiseScale;
    
    // Initial calculations
    updateColor(); 
    calculateBlobShape(); 
    
    // Force a complete redraw once on setup
    p.clear();
    p.background(p.color(theme.palette.background.default));
    
    console.log(`p5 Setup Complete. Canvas: ${p.width}x${p.height}, BaseRadius: ${baseRadius}, Pitch Range Indices: ${pitchMinIndex}-${pitchMaxIndex}`);
  };

  // --- p5.js Draw Loop ---
  p.draw = () => {
    let timeDelta = p.deltaTime / (1000 / 60);
    
    // Clear the entire canvas with background color to prevent artifacts
    p.clear();
    p.background(p.color(theme.palette.background.default));
    
    // Ensure everything is perfectly centered
    p.push();
    // Use integer values to avoid sub-pixel rendering issues
    const centerX = Math.floor(p.width / 2);
    const centerY = Math.floor(p.height / 2);
    p.translate(centerX, centerY);
    
    updateAudio();
    updateStateAndMotion(timeDelta);
    updateColor();
    calculateBlobShape();
    drawInternalTexture();
    drawBlob();
    drawMicrophoneIcon();
    if(pauseEffectTimer > 0) drawPauseEffect();
    
    p.pop();
  };
  
  // --- Draw Microphone Icon ---
  const drawMicrophoneIcon = () => {
    // Use the same scaling factor for all elements to keep them in sync
    // Ensure the scaling factor can never become negative
    const smoothedLevel = Math.max(0, smoothedOverallLevel); // Prevent negative audio levels
    const peakMult = Math.max(0, activePeakMultiplier); // Prevent negative multipliers
    const scaleFactor = 1 + smoothedLevel * peakMult * 0.6;
    
    // Draw scaling circle around microphone - MUCH larger now
    const minCircleRadius = Math.max(0.1, baseRadius * 0.75); // Close to blob border
    const maxCircleRadius = Math.max(minCircleRadius + 0.1, baseRadius * 0.92); // Almost touching the blob
    // Ensure level is between 0-1 for lerp
    const safeLevel = p.constrain(smoothedLevel, 0, 1);
    const circleRadius = p.lerp(minCircleRadius, maxCircleRadius, safeLevel);
    p.push();
    p.noFill();
    p.stroke(255);
    p.strokeWeight(2); // Slightly thicker for better visibility
    p.circle(0, 0, circleRadius * 2);
    p.pop();
    
    // Draw a simple, iconic podcast microphone
    p.push();
    p.fill(255);
    p.noStroke();
    
    // Base size for microphone that scales with audio
    const baseMicSize = Math.max(0.1, baseRadius * 0.28); // Ensure base size is never too small
    // Ensure scaleFactor is always positive (at least 0.1) to prevent negative dimensions
    const safeScaleFactor = Math.max(0.1, scaleFactor); 
    const currentMicSize = baseMicSize * safeScaleFactor;
    
    // Simple classic microphone - just the essential elements
    
    // Main mic head - simple rounded rectangle
    p.rectMode(p.CENTER);
    // Ensure the corner radius is always positive
    const cornerRadius = Math.max(0.001, currentMicSize * 0.2);
    p.rect(0, -currentMicSize * 0.3, currentMicSize * 0.55, currentMicSize * 0.8, cornerRadius);
    
    // Simple mic stand - no corner radius to avoid errors
    p.rect(0, currentMicSize * 0.5, Math.max(0.001, currentMicSize * 0.12), Math.max(0.001, currentMicSize * 1.0));
    
    // Base - ellipse doesn't need radius protection as p5.js handles it
    p.ellipse(0, currentMicSize * 1.0, Math.max(0.001, currentMicSize * 0.7), Math.max(0.001, currentMicSize * 0.18));
    
    // Mic grille pattern - subtle circles 
    p.fill(0, 0, 0, 30); // Semitransparent dark
    
    // Three small circles to suggest mic grille
    const grilleDiameter = Math.max(0.001, currentMicSize * 0.12);
    
    // Only draw grille details if microphone is large enough to avoid artifacts
    if (currentMicSize > 0.1) {
      p.ellipse(-currentMicSize * 0.15, -currentMicSize * 0.4, grilleDiameter);
      p.ellipse(0, -currentMicSize * 0.4, grilleDiameter);
      p.ellipse(currentMicSize * 0.15, -currentMicSize * 0.4, grilleDiameter);
      
      p.ellipse(-currentMicSize * 0.15, -currentMicSize * 0.2, grilleDiameter);
      p.ellipse(0, -currentMicSize * 0.2, grilleDiameter);
      p.ellipse(currentMicSize * 0.15, -currentMicSize * 0.2, grilleDiameter);
    }
    
    p.pop();
  };

  // --- Audio Setup Function ---
  const setupAudio = async () => { if (audioContext && audioContext.state === 'running') { if (!micStream || !micStream.active) { try { micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); if (microphone) microphone.disconnect(); microphone = audioContext.createMediaStreamSource(micStream); microphone.connect(analyser); console.log("Reconnected mic stream."); } catch (err) { console.error("Error reconnecting mic:", err); audioReady = false; isP5StateActive = false; return false; } } audioReady = true; console.log("Audio already running or reconnected."); return true; } if (audioContext && audioContext.state !== 'closed') { console.log("Closing existing audio context before creating new one."); await audioContext.close().catch(e => console.error("Error closing previous context:", e)); audioContext = null; } try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); sampleRate = audioContext.sampleRate; nyquist = sampleRate / 2; const binWidth = nyquist / (fftSize / 2); pitchMinIndex = Math.max(1, Math.floor(pitchMinFreq / binWidth)); pitchMaxIndex = Math.min(fftSize / 2 - 1, Math.ceil(pitchMaxFreq / binWidth)); if (audioContext.state === 'suspended') { await audioContext.resume(); } micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); microphone = audioContext.createMediaStreamSource(micStream); analyser = audioContext.createAnalyser(); analyser.fftSize = fftSize; analyser.smoothingTimeConstant = 0.75; frequencyData = new Uint8Array(analyser.frequencyBinCount); microphone.connect(analyser); console.log('Audio setup successful. Context state:', audioContext.state); audioReady = true; return true; } catch (err) { console.error('Audio Setup Error:', err); audioReady = false; isP5StateActive = false; if (micStream) micStream.getTracks().forEach(track => track.stop()); micStream = null; microphone = null; analyser = null; frequencyData = null; if (audioContext && audioContext.state !== 'closed') { await audioContext.close().catch(e => console.error("Error closing context on failure:", e)); } audioContext = null; return false; } };

  // --- Stop Audio Processing ---
  const stopAudioProcessing = () => { console.log("Stopping audio processing and mic tracks."); if (micStream) { micStream.getTracks().forEach(track => track.stop()); micStream = null; } if (microphone) { microphone.disconnect(); microphone = null; } audioReady = false; const stopLerpFactor = audioLerpFactor * 4; smoothedOverallLevel=p.lerp(smoothedOverallLevel,0,stopLerpFactor); smoothedMidLevel=p.lerp(smoothedMidLevel,0,stopLerpFactor); smoothedTrebleLevel=p.lerp(smoothedTrebleLevel,0,stopLerpFactor); frequencySpread = p.lerp(frequencySpread, 0, stopLerpFactor); averageVolume = 0; volumeHistory = volumeHistory.map(() => 0); midHistory = midHistory.map(() => 0); sustainedMidLevel = 0; pitchProxy = 0.5; lastPitchProxy = 0.5; pitchChangeRate = 0; focusFactor=0; melodyFactor=0; emphasisFactor=0; /* Reset mode factors */};

  // --- Update Audio Analysis ---
  const updateAudio = () => { lastPitchProxy = pitchProxy; if (!isP5StateActive || !audioReady || !analyser || !frequencyData) { const idleLerpFactor = audioLerpFactor * 0.3; smoothedOverallLevel=p.lerp(smoothedOverallLevel,0,idleLerpFactor); smoothedMidLevel=p.lerp(smoothedMidLevel,0,idleLerpFactor); smoothedTrebleLevel=p.lerp(smoothedTrebleLevel,0,idleLerpFactor); frequencySpread = p.lerp(frequencySpread, 0, freqSpreadLerpFactor); volumeHistory.push(0); if(volumeHistory.length > volumeHistoryLength) volumeHistory.shift(); averageVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length; midHistory.push(0); if(midHistory.length > midHistoryLength) midHistory.shift(); sustainedMidLevel = midHistory.reduce((a,b) => a+b, 0) / midHistory.length; pitchProxy = p.lerp(pitchProxy, 0.5, pitchProxyLerpFactor); pitchChangeRate = p.lerp(pitchChangeRate, 0, pitchChangeLerpFactor); return; } analyser.getByteFrequencyData(frequencyData); let oSum=0, mSum=0, tSum=0, activeBinCount = 0; const fbc=frequencyData.length; const midEndFreq=4000, trebleStartFreq=4000; const midEndIndex=Math.min(fbc-1,Math.ceil(midEndFreq/(nyquist/fbc))); const trebleStartIndex=Math.min(fbc-1,Math.floor(trebleStartFreq/(nyquist/fbc))); let maxAmp = 0; let peakIndex = -1; for (let i = pitchMinIndex; i <= pitchMaxIndex; i++) { if (frequencyData[i] > maxAmp) { maxAmp = frequencyData[i]; peakIndex = i; } } let targetPitchProxy = 0.5; if (peakIndex !== -1 && maxAmp > binActivationThreshold * 1.5) { targetPitchProxy = p.map(peakIndex, pitchMinIndex, pitchMaxIndex, 0, 1, true); } pitchProxy = p.lerp(pitchProxy, targetPitchProxy, pitchProxyLerpFactor); for(let i=0;i<fbc;i++){ let l=frequencyData[i]; oSum+=l; if(i<=midEndIndex) mSum+=l; else if(i>=trebleStartIndex) tSum+=l; if(l > binActivationThreshold) activeBinCount++; } let nO=fbc>0?oSum/fbc:0; let numMidBins = midEndIndex + 1; let numTrebleBins = fbc - trebleStartIndex; let nM=numMidBins>0?mSum/numMidBins:0; let nT=numTrebleBins>0?tSum/numTrebleBins:0; let normO=p.map(nO,0,160,0,1,true); let normM=p.map(nM,0,160,0,1,true); let normT=p.map(nT,0,160,0,1,true); smoothedOverallLevel = p.lerp(smoothedOverallLevel,normO,audioLerpFactor); smoothedMidLevel = p.lerp(smoothedMidLevel,normM,audioLerpFactor); smoothedTrebleLevel = p.lerp(smoothedTrebleLevel,normT,audioLerpFactor); let targetSpread = fbc > 0 ? activeBinCount / fbc : 0; frequencySpread = p.lerp(frequencySpread, targetSpread, freqSpreadLerpFactor); volumeHistory.push(smoothedOverallLevel); if(volumeHistory.length > volumeHistoryLength) volumeHistory.shift(); averageVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length; midHistory.push(smoothedMidLevel); if(midHistory.length > midHistoryLength) midHistory.shift(); sustainedMidLevel = midHistory.reduce((a,b) => a+b, 0) / midHistory.length; let currentPitchChange = Math.abs(pitchProxy - lastPitchProxy); pitchChangeRate = p.lerp(pitchChangeRate, currentPitchChange, pitchChangeLerpFactor); if (!isAhaMoment && smoothedOverallLevel > ahaMinimumLevel && averageVolume > 0.01 && smoothedOverallLevel > averageVolume * ahaThresholdMultiplier) { isAhaMoment = true; ahaTimer = ahaDuration; flashIntensity = 1.0; console.log("Aha! Detected"); } };

  // --- Update State & Motion ---
  const updateStateAndMotion = (timeDelta) => {
    let targetActiveStateIntensity = isP5StateActive ? 1.0 : 0.0; activeStateIntensity = p.lerp(activeStateIntensity, targetActiveStateIntensity, activeStateLerpFactor * timeDelta);
    pauseEnded = false; if (isP5StateActive && smoothedOverallLevel < silenceThreshold) { silenceFrames++; } else { if (silenceFrames >= framesForPause) { pauseEnded = true; pauseEffectTimer = pauseEffectDuration; pauseEffectIntensity = 1.0; inhaleAmount = -1.0; } silenceFrames = 0; isBreathing = false; } if (silenceFrames >= framesForBreathing) { isBreathing = true; breathingTime += breathingSpeed * timeDelta; }
    if (pauseEffectTimer > 0) pauseEffectTimer--; pauseEffectIntensity = p.lerp(pauseEffectIntensity, 0, pauseEffectDecay); if (pauseEnded || inhaleAmount !== 0) { inhaleAmount = p.lerp(inhaleAmount, 1.0, inhaleSpeed);} if (Math.abs(inhaleAmount - 1.0) < 0.01) inhaleAmount = 0;
    let currentSlowSpeedMultiplier = 1.0; let currentFastSpeedMultiplier = 1.0; if (isP5StateActive && smoothedOverallLevel > audioThreshold) { const mapStartLevel = audioThreshold + 0.02; const mapEndLevel = 0.85; currentSlowSpeedMultiplier = p.map(smoothedOverallLevel, mapStartLevel, mapEndLevel, 1.0, maxSlowSpeedMultiplier, true); currentFastSpeedMultiplier = p.map(smoothedOverallLevel, mapStartLevel, mapEndLevel, 1.0, maxFastSpeedMultiplier, true); }
    let targetFocusFactor = 0.0, targetMelodyFactor = 0.0, targetEmphasisFactor = 0.0; if (isP5StateActive && smoothedOverallLevel > audioThreshold) { targetFocusFactor = p.map(frequencySpread, 0.3, 0.7, 0, 1, true) * p.map(pitchChangeRate, 0.05, 0.005, 0, 1, true); targetMelodyFactor = p.map(pitchChangeRate, 0.01, 0.1, 0, 1, true); targetEmphasisFactor = p.map(smoothedOverallLevel, 0.5, 0.9, 0, 1, true); if (isAhaMoment) targetEmphasisFactor = 1.0; } focusFactor = p.lerp(focusFactor, targetFocusFactor, focusFactorLerp); melodyFactor = p.lerp(melodyFactor, targetMelodyFactor, melodyFactorLerp); emphasisFactor = p.lerp(emphasisFactor, targetEmphasisFactor, emphasisFactorLerp);
    let rotationSpeedModifier = p.lerp(1.0, 0.8, focusFactor) * p.lerp(1.0, 1.2, melodyFactor); let finalSlowMultiplier = currentSlowSpeedMultiplier * p.lerp(1.0, 1.1, emphasisFactor); let finalFastMultiplier = currentFastSpeedMultiplier * p.lerp(1.0, 1.1, emphasisFactor); let finalOffsetMultiplier = currentFastSpeedMultiplier * rotationSpeedModifier * p.lerp(1.0, 1.1, emphasisFactor);
    let wavinessSpeedBoost = p.map(pitchChangeRate, 0.01, 0.1, 1.0, 2.5, true);
    passiveNoiseTime      += basePassiveNoiseSpeed      * (isP5StateActive ? finalSlowMultiplier : 1.0) * timeDelta;
    activeShapeNoiseTime    += baseActiveShapeNoiseSpeed    * finalFastMultiplier * timeDelta;
    activeTextureNoiseTime  += baseActiveTextureNoiseSpeed  * finalFastMultiplier * timeDelta;
    activeWavinessNoiseTime += baseActiveWavinessNoiseSpeed * finalSlowMultiplier * wavinessSpeedBoost * timeDelta;
    internalTextureTime += internalTextureSpeed * timeDelta;
    activeNoiseAngularOffset += baseActiveNoiseOffsetSpeed * finalOffsetMultiplier * timeDelta; activeNoiseAngularOffset %= p.TWO_PI;
    let targetMultiplier = 1.0; let midTrebleCombined = smoothedMidLevel + smoothedTrebleLevel; if (isP5StateActive && midTrebleCombined > audioThreshold) { targetMultiplier = p.map(midTrebleCombined * p.lerp(1.0, 1.2, emphasisFactor), audioThreshold + 0.02, 0.9, 1.0, maxPeakExtensionFactor, true); } activePeakMultiplier = p.lerp(activePeakMultiplier, targetMultiplier, activeMultiplierLerpFactor * timeDelta);
    let targetWavinessInfluence = 0; if(isP5StateActive && smoothedOverallLevel > audioThreshold){ targetWavinessInfluence = p.map(melodyFactor, 0.1, 0.9, 0.0, maxWavinessInfluence, true); } currentWavinessInfluence = p.lerp(currentWavinessInfluence, targetWavinessInfluence, wavinessInfluenceLerpFactor);
    let targetWavinessScale = baseWavinessNoiseScale; if(isP5StateActive && smoothedOverallLevel > audioThreshold){ targetWavinessScale = p.map(pitchProxy, 0, 1, baseWavinessNoiseScale * (1 + wavinessScalePitchFactor/2), baseWavinessNoiseScale * (1 - wavinessScalePitchFactor/2), true); targetWavinessScale = p.max(1.0, targetWavinessScale); } currentWavinessNoiseScale = p.lerp(currentWavinessNoiseScale, targetWavinessScale, wavinessScaleLerpFactor);
    let targetTextureIntensity = baseTextureIntensity; if(isP5StateActive && smoothedOverallLevel > audioThreshold){ targetTextureIntensity = p.map(frequencySpread, 0.1, 0.6, baseTextureIntensity, maxTextureIntensity, true) * p.lerp(1.0, 0.6, focusFactor); } currentActiveTextureIntensity = p.lerp(currentActiveTextureIntensity, targetTextureIntensity, textureIntensityLerpFactor);
    let targetShapeScale = baseActiveShapeNoiseScale; if(isP5StateActive && smoothedOverallLevel > audioThreshold) { let scaleModifier = p.map(frequencySpread, 0.1, 0.6, 1.0 + shapeScaleSpreadFactor, 1.0 - shapeScaleSpreadFactor, true); targetShapeScale = baseActiveShapeNoiseScale * scaleModifier; targetShapeScale = p.max(0.5, targetShapeScale); } currentActiveShapeNoiseScale = p.lerp(currentActiveShapeNoiseScale, targetShapeScale, shapeScaleLerpFactor);
    let targetPassiveDeformation = basePassiveDeformationAmount; if(isP5StateActive && sustainedMidLevel > audioThreshold * 1.2) { let boost = p.map(sustainedMidLevel, audioThreshold * 1.2, 0.6, 0, maxPassiveDeformationBoost, true); targetPassiveDeformation = basePassiveDeformationAmount + boost; } currentPassiveDeformationAmount = p.lerp(currentPassiveDeformationAmount, targetPassiveDeformation, passiveDeformationLerpFactor);
    let targetEdgeSharpness = 1.0; if(isP5StateActive && smoothedOverallLevel > audioThreshold){ let spreadSharpnessValue = p.map(frequencySpread, 0.1, 0.7, 1.0, 0.3, true); targetEdgeSharpness = p.lerp(spreadSharpnessValue, 1.0, focusFactor * 0.7); } edgeSharpness = p.lerp(edgeSharpness, targetEdgeSharpness, edgeSharpnessLerpFactor); // Use corrected logic
    let targetInternalAlpha = 0; const internalTextureThreshold = audioThreshold + 0.05; if(isP5StateActive && smoothedOverallLevel > internalTextureThreshold){ targetInternalAlpha = p.map(smoothedOverallLevel, internalTextureThreshold, 0.7, 0, maxInternalTextureAlpha, true) * p.lerp(0.5, 1.5, focusFactor); } internalTextureAlpha = p.lerp(internalTextureAlpha, targetInternalAlpha, internalAlphaLerpFactor);
    if (ahaTimer > 0) { ahaTimer--; if (ahaTimer <= 0) isAhaMoment = false; } flashIntensity = p.lerp(flashIntensity, 0, flashDecay);
  };

  // --- Update Color ---
  const updateColor = () => { targetHue = baseHue; if (isP5StateActive && smoothedOverallLevel > audioThreshold) { let spreadShift = p.map(frequencySpread, 0.1, 0.6, -hueShiftRange/3, hueShiftRange/3, true); let pitchShift = p.map(pitchProxy, 0, 1, -hueShiftRange/2, hueShiftRange/2, true); targetHue = (baseHue + spreadShift + pitchShift + 360) % 360; } let hueDiff = targetHue - currentHue; if (Math.abs(hueDiff) > 180) { if (hueDiff > 0) currentHue += 360; else currentHue -= 360; } currentHue = p.lerp(currentHue, targetHue, hueLerpFactor); currentHue = (currentHue + 360) % 360; saturationBoost = 0; brightnessBoost = 0; if (isP5StateActive && smoothedOverallLevel > audioThreshold) { const mapStartLevel = audioThreshold + 0.02; saturationBoost = p.map(smoothedOverallLevel, mapStartLevel, 0.9, 0, maxSaturationBoost, true); brightnessBoost = p.map(smoothedOverallLevel, mapStartLevel, 0.9, 0, maxBrightnessBoost, true); } let currentSaturationValue = p.constrain(baseSaturation + saturationBoost, 60, 95); let currentBrightnessValue = p.constrain(baseBrightness + brightnessBoost, 92, 100); 
    
    // More subtle dynamic flash color based on current color
    let targetFlashHue = currentHue;
    let targetFlashSaturation = p.constrain(currentSaturationValue + 15, 0, 100); // Slightly more saturated
    let targetFlashBrightness = p.constrain(currentBrightnessValue + 8, 0, 100); // Slightly brighter
    let dynamicFlashColor = p.color(targetFlashHue, targetFlashSaturation, targetFlashBrightness, 100);
    
    let baseCenter = p.color(currentHue, currentSaturationValue * 0.9, currentBrightnessValue * 0.98, 100);
    let baseEdge = p.color(currentHue, currentSaturationValue, currentBrightnessValue, 95);
    currentCenterColor = p.lerpColor(baseCenter, dynamicFlashColor, flashIntensity);
    currentEdgeColor = p.lerpColor(baseEdge, dynamicFlashColor, flashIntensity);
  };

  // --- Blob Shape Calculation ---
  const calculateBlobShape = () => { 
    let currentBaseRadius = baseRadius; 
    let coreMod = 0; 
    
    // Breathing and inhale effects
    if(isBreathing){
      coreMod += p.sin(breathingTime * p.TWO_PI) * breathingAmount; 
    } 
    if(inhaleAmount !== 0){
      coreMod += p.sin(inhaleAmount * p.PI) * maxInhaleFactor * -1; 
    } 
    currentBaseRadius *= (1 + coreMod);
    
    // Volume-based waviness - very gentle, mimicking calm speaking patterns for CSM
    // Much lower boost values and more constrained ranges for elderly-friendly visuals
    const volumeWavinessBoost = p.map(smoothedOverallLevel, 0.2, 0.8, 1, 2.2, true); // Much gentler boost
    const highFreqWavinessBoost = p.map(smoothedTrebleLevel, 0.1, 0.7, 1, 1.6, true); // Minimal high-frequency effect
    
    // Calculate frequency-based waviness modifiers - subtle for speech patterns
    const freqSpreadWaviness = p.map(frequencySpread, 0.1, 0.7, 1, 1.4, true); // Limited frequency influence
    
    // Create time-dependent wave patterns - slow, gentle, consistent
    const waveTime = p.millis() * 0.0005; // Half-speed for slower motion
    const waveSpeed = 0.4 + smoothedOverallLevel * 1.2; // Much slower baseline with limited acceleration
    const waveAmplitude = 0.005 + smoothedOverallLevel * 0.04; // Very subtle amplitude changes
    
    // Create vertices for the blob shape
    for (let i = 0; i < numVertices; i++) { 
      let angle = p.map(i, 0, numVertices, 0, p.TWO_PI); 
      let cosAnglePassive = p.cos(angle); 
      let sinAnglePassive = p.sin(angle); 
      
      // Base passive noise (circular stability)
      let passiveNoiseX = p.map(cosAnglePassive, -1, 1, 0, passiveNoisePosScale); 
      let passiveNoiseY = p.map(sinAnglePassive, -1, 1, 0, passiveNoisePosScale); 
      let passiveNoiseVal = p.noise(passiveNoiseX, passiveNoiseY, passiveNoiseTime); 
      
      // Apply volume-based modulation to passive noise
      let volumeModulatedAmount = currentPassiveDeformationAmount;
      if (smoothedOverallLevel > 0.3) {
        volumeModulatedAmount = p.lerp(
          currentPassiveDeformationAmount,
          currentPassiveDeformationAmount * volumeWavinessBoost,
          p.map(smoothedOverallLevel, 0.3, 0.9, 0, 1, true)
        );
      }
      
      let passiveOffset = p.map(passiveNoiseVal, 0, 1, -volumeModulatedAmount, volumeModulatedAmount) * currentBaseRadius; 
      let coreRadius = currentBaseRadius + passiveOffset; 
      
      // Add very subtle high-frequency ripples for speech articulation cues
      // For elderly users, we want minimal fast motion but still some indication of speech
      if (smoothedTrebleLevel > 0.25) { // Higher threshold to prevent constant rippling
        // Limit number of ripples to avoid visual complexity
        const trebleRippleCount = Math.floor(2 + smoothedTrebleLevel * 6); // Much fewer ripples
        
        // Very small amplitude for gentle effects
        const rippleAmplitude = currentBaseRadius * 0.004 * smoothedTrebleLevel * highFreqWavinessBoost;
        
        // Slower phase change for more gradual motion
        const ripplePhase = waveTime * waveSpeed * 1.2;
        
        // Gentle ripple offset
        const rippleOffset = Math.sin(angle * trebleRippleCount + ripplePhase) * rippleAmplitude;
        coreRadius += rippleOffset;
      }
      
      let peakExtensionOffset = 0; 
      
      // Active state deformations (audio responsive)
      if (activeStateIntensity > 0.01 && isP5StateActive) { 
        // Add very subtle angle shift for natural-sounding speech simulation
        // For CSM speaking visualization, we want small, deliberate movements
        const volumeDrivenAngleShift = smoothedOverallLevel > 0.3 ? 
            p.sin(waveTime * waveSpeed * 0.6) * p.TWO_PI * 0.02 * p.map(smoothedOverallLevel, 0.3, 0.9, 0, 1, true) : 0;
        
        let activeAngle = (angle + activeNoiseAngularOffset + volumeDrivenAngleShift) % p.TWO_PI; 
        let cosAngleActive = p.cos(activeAngle); 
        let sinAngleActive = p.sin(activeAngle); 
        
        // Shape noise (core form)
        let shapeNoiseX = p.map(cosAngleActive, -1, 1, 0, currentActiveShapeNoiseScale); 
        let shapeNoiseY = p.map(sinAngleActive, -1, 1, 0, currentActiveShapeNoiseScale); 
        let shapeNoiseVal = p.noise(shapeNoiseX, shapeNoiseY, activeShapeNoiseTime); 
        
        // Texture noise (small details)
        let textureNoiseX = p.map(cosAngleActive, -1, 1, 0, activeTextureNoiseScale); 
        let textureNoiseY = p.map(sinAngleActive, -1, 1, 0, activeTextureNoiseScale); 
        let textureNoiseVal = p.noise(textureNoiseX, textureNoiseY, activeTextureNoiseTime); 
        let textureOffset = p.map(textureNoiseVal, 0, 1, -currentActiveTextureIntensity, currentActiveTextureIntensity); 
        
        // Enhanced waviness response to volume
        // Scale waviness noise by volume and frequency spread for more dramatic effects
        let enhancedWavinessScale = currentWavinessNoiseScale * freqSpreadWaviness;
        let wavinessNoiseX = p.map(cosAngleActive, -1, 1, 0, enhancedWavinessScale); 
        let wavinessNoiseY = p.map(sinAngleActive, -1, 1, 0, enhancedWavinessScale); 
        
        // Add a frequency component to waviness noise time for more variation
        const freqTimeModifier = p.map(frequencySpread, 0, 1, 0, 0.5, true) * activeWavinessNoiseTime;
        let wavinessNoiseVal = p.noise(wavinessNoiseX, wavinessNoiseY, activeWavinessNoiseTime + freqTimeModifier); 
        
        // Amplify waviness based on volume
        let amplifiedWavinessInfluence = currentWavinessInfluence;
        if (smoothedOverallLevel > 0.2) {
          // Dramatically increase waviness with volume
          amplifiedWavinessInfluence = p.lerp(
            currentWavinessInfluence,
            currentWavinessInfluence * volumeWavinessBoost * 1.5,
            p.map(smoothedOverallLevel, 0.2, 0.8, 0, 1, true)
          );
        }
        
        let wavinessOffset = p.map(wavinessNoiseVal, 0, 1, -1.0, 1.0) * amplifiedWavinessInfluence;
        
        // Add gentle, speech-like subtle mouth movements for CSM visualization
        // For elderly users, these patterns are slowed down and made more predictable
        if (smoothedOverallLevel > 0.3) {
          // Much gentler wave pattern with reduced angle influence for predictability
          const wavePhase = waveTime * waveSpeed * 0.6 + angle * 1.5; // Slower, less angular variation
          
          // Very small amplitude changes for subtle movement cues
          const volumeWave = Math.sin(wavePhase) * waveAmplitude * 0.6 * currentBaseRadius * 
            p.map(smoothedOverallLevel, 0.3, 0.8, 0, 1, true);
            
          wavinessOffset += volumeWave;
        }
        
        // Combine all noise effects
        let combinedActiveNoiseShape = p.map(shapeNoiseVal, 0, 1, 0, 1) + textureOffset + wavinessOffset; 
        let peakMagnitude = baseRadius * p.max(0, combinedActiveNoiseShape) * p.max(0, activePeakMultiplier - 1.0); 
        peakExtensionOffset = peakMagnitude * activeStateIntensity; 
      } 
      
      // Calculate final radius and constrain within limits
      let totalRadius = coreRadius + peakExtensionOffset; 
      const minRadiusClamp = baseRadius * 0.2 * (1 - maxInhaleFactor); 
      const maxCoreDeformation = baseRadius * (1 + basePassiveDeformationAmount + maxPassiveDeformationBoost + breathingAmount + maxInhaleFactor); 
      const maxPeak = baseRadius * maxPeakExtensionFactor; 
      
      // Allow slightly more deformation at higher volumes
      const volumeDeformationFactor = 1.0 + smoothedOverallLevel * 0.3;
      const maxRadiusClamp = (maxCoreDeformation + maxPeak * 1.2) * volumeDeformationFactor; 
      
      totalRadius = p.constrain(totalRadius, minRadiusClamp, maxRadiusClamp); 
      
      // Set vertex position
      let x = totalRadius * p.cos(angle); 
      let y = totalRadius * p.sin(angle); 
      vertices[i].set(x, y); 
    } 
  };

  // --- Internal Texture Rendering ---
  const drawInternalTexture = () => { if (internalTextureAlpha <= 1) return; p.push(); p.noFill(); const textureColor = p.color(currentHue, baseSaturation * 0.5, baseBrightness * 1.1, internalTextureAlpha); p.stroke(textureColor); p.strokeWeight(0.75); const steps = 10; const maxOffset = baseRadius * 0.15; for (let step = 0; step < steps; step++) { let ratio = p.map(step, 0, steps, 0.2, 0.8); p.beginShape(); for (let i = 0; i < numVertices; i++) { let angle = p.map(i, 0, numVertices, 0, p.TWO_PI); let cosA = p.cos(angle); let sinA = p.sin(angle); let noiseVal1 = p.noise(cosA * internalTextureScale + 10, sinA * internalTextureScale + 20, internalTextureTime + step * 0.1); let noiseVal2 = p.noise(cosA * internalTextureComplexityScale + 30, sinA * internalTextureComplexityScale + 40, internalTextureTime * 0.5 + step * 0.05); let offset = p.map(noiseVal1 + noiseVal2, 0, 2, -maxOffset, maxOffset); let r = baseRadius * ratio + offset; r = p.max(baseRadius * 0.1, r); p.vertex(r * cosA, r * sinA); } p.endShape(p.CLOSE); } p.pop(); };

  // --- Blob Rendering ---
  const drawBlob = () => { 
    // Base parameters for blob layers
    const baseLayers = 8; 
    const maxLayersBoost = 10; 
    const baseAlphaStep = 2; 
    const maxAlphaStepBoost = 6;
    
    // Make edge sharpness and layers more reactive to volume
    // Combine edgeSharpness with volume for more dynamic border
    const volumeReactivity = p.map(smoothedOverallLevel, 0.1, 0.8, 0, 1, true);
    const volumeInfluencedEdgeSharpness = p.lerp(edgeSharpness, 1.0, volumeReactivity * 0.8);
    
    // Add pulsing effect to layer count based on audio
    const layerPulse = p.map(smoothedOverallLevel, 0, 0.8, 0, maxLayersBoost * 1.5, true);
    
    // Determine number of layers based on combined factors
    let layers = p.floor(p.lerp(baseLayers, baseLayers + layerPulse, volumeInfluencedEdgeSharpness));
    
    // Make alpha step more dramatic with volume for sharper edge contrast
    let alphaStep = p.lerp(
      baseAlphaStep, 
      baseAlphaStep + maxAlphaStepBoost * (1 + volumeReactivity), 
      volumeInfluencedEdgeSharpness
    );
    
    // Make radius step smaller with higher volume for more defined edge
    let radiusStepRatio = p.lerp(0.04, 0.01 * (1 + volumeReactivity), volumeInfluencedEdgeSharpness);
    
    // Ensure minimum layers for visual quality
    layers = p.max(4, layers);
    
    // Add gentle outer glow effect for speaking indication (softer, always present but subtle)
    // For elderly users, a consistent, gentle visual cue is better than dramatic changes
    {
      p.noFill();
      // Gentle pulsing glow that's always somewhat visible but enhances during speech
      const baseGlowIntensity = 5; // Always visible minimum
      const maxAdditionalGlow = 15; // Limited maximum for calm effect
      const glowIntensity = baseGlowIntensity + p.map(smoothedOverallLevel, 0.1, 0.7, 0, maxAdditionalGlow, true);
      
      // Soft, calming color with limited saturation for comfortable viewing
      const glowColor = p.color(currentHue, 50, 98, glowIntensity);
      p.stroke(glowColor);
      
      // Consistent, thin stroke for elegant appearance
      const baseStrokeWeight = 1.2;
      const maxAdditionalWeight = 1.0;
      p.strokeWeight(baseStrokeWeight + p.map(smoothedOverallLevel, 0.1, 0.7, 0, maxAdditionalWeight, true));
      
      // Very subtle size variation - barely noticeable but provides gentle feedback
      const glowSize = 1.01 + (smoothedOverallLevel * 0.03);
      p.beginShape();
      p.curveVertex(vertices[numVertices - 1].x * glowSize, vertices[numVertices - 1].y * glowSize);
      for (let i = 0; i < numVertices; i++) {
        p.curveVertex(vertices[i].x * glowSize, vertices[i].y * glowSize);
      }
      p.curveVertex(vertices[0].x * glowSize, vertices[0].y * glowSize);
      p.curveVertex(vertices[1].x * glowSize, vertices[1].y * glowSize);
      p.endShape(p.CLOSE);
    }
    
    // Draw standard blob layers
    for (let layer = 0; layer < layers; layer++) { 
      let layerRadiusRatio = 1.0 - (layer * radiusStepRatio); 
      let layerAlpha = p.alpha(currentEdgeColor) - layer * alphaStep; 
      
      // Make the outer layers more influenced by volume
      const layerVolumeInfluence = layer < 2 ? volumeReactivity * 0.7 : 0;
      let colorMix = p.map(layer, 0, layers - 1, 0, 1);
      
      // Adjust color mix for outer layers based on volume
      if (layer < 3) {
        colorMix = p.lerp(colorMix, 1.0, layerVolumeInfluence);
      }
      
      let layerColor = p.lerpColor(currentCenterColor, currentEdgeColor, colorMix);
      layerColor.setAlpha(p.max(0, layerAlpha));
      
      p.noStroke();
      p.fill(layerColor);
      p.beginShape();
      p.curveVertex(vertices[numVertices - 1].x * layerRadiusRatio, vertices[numVertices - 1].y * layerRadiusRatio);
      for (let i = 0; i < numVertices; i++) {
        p.curveVertex(vertices[i].x * layerRadiusRatio, vertices[i].y * layerRadiusRatio);
      }
      p.curveVertex(vertices[0].x * layerRadiusRatio, vertices[0].y * layerRadiusRatio);
      p.curveVertex(vertices[1].x * layerRadiusRatio, vertices[1].y * layerRadiusRatio);
      p.endShape(p.CLOSE);
    }
  };

  // --- Pause Effect Rendering ---
  const drawPauseEffect = () => { if(pauseEffectIntensity <= 0.01) return; let rippleRadius = baseRadius * (1 + currentPassiveDeformationAmount + breathingAmount) * 1.1 * (1.0 - pauseEffectIntensity); let rippleAlpha = pauseEffectIntensity * 50; let rippleWeight = p.lerp(0.5, 3, pauseEffectIntensity); let currentSaturationValue = p.constrain(baseSaturation + saturationBoost, 60, 95); let currentBrightnessValue = p.constrain(baseBrightness + brightnessBoost, 92, 100); p.push(); p.noFill(); p.strokeWeight(rippleWeight); let rippleColor = p.color(currentHue, currentSaturationValue * 0.8, currentBrightnessValue, rippleAlpha); p.stroke(rippleColor); p.ellipse(0, 0, rippleRadius * 2, rippleRadius * 2); p.pop(); }

  // --- External Control & Cleanup ---
  p.activate = async () => { 
    console.log("p5: Received activation request."); 
    // Reset all animation state variables
    silenceFrames = 0; 
    isBreathing = false; 
    pauseEnded = false; 
    pauseEffectTimer = 0; 
    pauseEffectIntensity = 0; 
    inhaleAmount = 0; 
    
    // First set the state to active immediately to provide instant visual feedback
    isP5StateActive = true;
    
    // Check if we already have audio initialized
    if (audioContext && audioContext.state === 'running' && audioReady) {
      console.log("p5: Audio already initialized and running");
      return true;
    }
    
    // Try to set up the audio - we now use a timeout to prevent blocking
    // This allows the visualization to start even if audio permission takes time
    const audioSetupPromise = new Promise((resolve) => {
      // Use a small timeout to ensure visualization starts first
      setTimeout(async () => {
        try {
          const success = await setupAudio();
          if (!success) {
            console.warn("p5: Audio setup failed, but keeping visualization active");
            // Even if audio fails, we keep visualization active
          }
          resolve(true);
        } catch (err) {
          console.error("p5: Audio setup error:", err);
          resolve(false);
        }
      }, 100);
    });
    
    // Don't wait for audio setup to complete - let it happen in background
    // This ensures the visualization starts immediately
    audioSetupPromise.catch(err => {
      console.error("p5: Unhandled audio setup error:", err);
    });
    
    // Always return true so we show visualization
    return true; 
  };
  p.deactivate = () => { console.log("p5: Received deactivation request."); isP5StateActive = false; isBreathing = false; pauseEnded = false; pauseEffectTimer = 0; pauseEffectIntensity = 0; inhaleAmount = 0; stopAudioProcessing(); };
  p.cleanup = () => { console.log("p5: Cleaning up sketch and audio."); stopAudioProcessing(); if (audioContext && audioContext.state !=='closed') { audioContext.close().then(() => console.log("AudioContext closed.")).catch(e => console.error("Error closing context on cleanup:", e)); audioContext = null; } p.remove(); console.log("p5 cleanup complete."); };
  p.windowResized = () => { 
    const container = document.getElementById('canvas-container'); 
    if (!container) return; 
    
    // Resize the canvas to fill the container
    const canvasWidth = Math.floor(container.offsetWidth);
    const canvasHeight = Math.floor(container.offsetHeight);
    p.resizeCanvas(canvasWidth, canvasHeight); 
    
    // Update the base radius based on the new dimensions
    baseRadius = p.min(p.width, p.height) / 5.0; 
    console.log(`Resized, new dimensions: ${canvasWidth}x${canvasHeight}, new baseRadius: ${baseRadius}`); 
    
    // Force redraw to update visual
    p.redraw();
  };
};

// --- React Component Definition ---
const AudioReactivePaintBlob = ({ isActive }) => {
  const canvasContainerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // We're removing the internal microphoneActive state and relying solely on props
  // This ensures perfect synchronization with the parent component's state
  
  // Remove direct canvas interaction - all control should come from parent component
  // to maintain a single source of truth for microphone state
  
  // Effect to initialize p5.js and canvas
  useEffect(() => { 
    let p5instance; 
    let mounted = true;
    
    // Initialize p5.js with a slight delay to ensure DOM is fully ready
    const timer = setTimeout(() => {
      if (!mounted) return;
      
      import('p5').then(p5 => { 
        if (!mounted) return;
        
        if (canvasContainerRef.current && !p5InstanceRef.current) { 
          try {
            p5instance = new p5.default(sketch, canvasContainerRef.current); 
            p5InstanceRef.current = p5instance; 
            console.log("React: p5 instance created successfully"); 
            
            // Force a redraw after a short delay to ensure everything renders properly
            setTimeout(() => {
              if (mounted) {
                setIsLoading(false); // Hide loading indicator
                if (p5InstanceRef.current && p5InstanceRef.current.redraw) {
                  p5InstanceRef.current.redraw();
                  console.log("Forced redraw after initialization");
                }
              }
            }, 200);
          } catch (err) {
            console.error("Error creating p5 instance:", err);
            setErrorMessage("Failed to initialize visualization");
          }
        } 
      }).catch(error => { 
        console.error("Failed to load p5.js:", error); 
        if (mounted) {
          setErrorMessage("Failed to load visualization component."); 
        }
      }); 
    }, 50); // Short delay to ensure DOM is ready
    
    return () => { 
      mounted = false;
      clearTimeout(timer);
      if (p5InstanceRef.current) { 
        console.log("React: Cleaning up p5 instance."); 
        try {
          p5InstanceRef.current.cleanup(); 
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
        p5InstanceRef.current = null; 
      } 
    }; 
  }, []);

  // Effect to synchronize blob state with isActive prop
  useEffect(() => {
    // Use a ref to track the current p5 instance state
    // This prevents race conditions during the component lifecycle
    const p5Instance = p5InstanceRef.current;
    
    // Early return if no p5 instance
    if (!p5Instance) return;

    // Use a flag to avoid double-activations
    let isHandlingStateChange = false;
    
    // This function synchronizes the p5 instance state with props
    const syncState = async () => {
      if (isHandlingStateChange) return;
      
      try {
        isHandlingStateChange = true;
        console.log("AudioReactiveBlob: Sync state called, isActive:", isActive);
        
        // isActive here refers to whether the microphone should be active
        if (isActive) {
          console.log("AudioReactiveBlob: Activating p5 audio for visualization");
          // We don't await this call to ensure UI updates immediately
          p5Instance.activate();
        } else {
          console.log("AudioReactiveBlob: Deactivating p5 audio");
          p5Instance.deactivate();
        }
      } catch (error) {
        console.error("AudioReactiveBlob: Error during p5 audio sync:", error);
        setErrorMessage("An unexpected error occurred with the audio visualization.");
      } finally {
        // Use a small timeout to prevent rapid re-synchronization
        setTimeout(() => {
          isHandlingStateChange = false;
        }, 300);
      }
    };
    
    // Run synchronization
    syncState();
    
    // Ensure cleanup on unmount or when isActive changes
    return () => {
      if (p5Instance) {
        console.log("AudioReactiveBlob: Cleaning up on state change or unmount");
        // Only deactivate if we're unmounting or turning off
        if (!isActive) {
          p5Instance.deactivate();
        }
      }
    };
  }, [isActive]); // Only depend on isActive to prevent loops
  // Status indicators for accessibility and visual feedback
  const renderStatusIndicator = () => {
    // Now using the isActive prop directly from parent component
    // This ensures perfect sync with the parent's state
    if (isActive) {
      return (
        <div aria-live="polite" 
          style={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            backgroundColor: 'rgba(3, 169, 244, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            zIndex: 5,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ 
            width: '8px', 
            height: '8px', 
            backgroundColor: '#fff', 
            borderRadius: '50%', 
            display: 'inline-block',
            animation: 'pulse 1.5s infinite ease-in-out'
          }} />
          Audio Visualization Active
        </div>
      );
    }
    return null;
  };

  return ( 
    <div id="canvas-container" 
      ref={canvasContainerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      {renderStatusIndicator()}
      
      {isLoading && 
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          backgroundColor: '#f8f8f8'
        }}>
          <span style={{color: grey[500], fontSize: '1rem'}}>Loading Visualizer...</span>
        </div>
      } 
      
      {errorMessage && ( 
        <div style={{ 
          position: 'absolute', 
          bottom: 16, 
          left: 16, 
          right: 16, 
          color: '#d32f2f', 
          textAlign: 'center', 
          backgroundColor: 'rgba(255, 235, 238, 0.9)', 
          padding: '8px', 
          borderRadius: '4px', 
          fontSize: '0.875rem', 
          zIndex: 10 
        }}> 
          {errorMessage} 
        </div> 
      )} 
      
      {/* Add a hidden style tag for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0% { opacity: 0.4; }
            50% { opacity: 1; }
            100% { opacity: 0.4; }
          }
        `
      }} />
    </div> 
  );
};

export default AudioReactivePaintBlob; // Export the component
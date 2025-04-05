/**
 * AudioReactiveBlob.jsx
 * 
 * This component creates an interactive, audio-reactive visualization that responds
 * to microphone input. The blob visualization changes shape, color, and behavior based
 * on audio analysis, creating a visual representation of speech for the Alzheimer's
 * assessment tool.
 * 
 * It uses p5.js for canvas-based animation and the Web Audio API for audio analysis.
 * The component is designed to be accessible and visually calming for elderly users.
 * 
 * Key features:
 * - Real-time audio processing using Web Audio API
 * - Organic blob animation using Perlin noise
 * - Audio frequency analysis for reactive visualization
 * - Gentle color and motion changes optimized for elderly users
 * - Microphone integration with permission handling
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { Box, Paper, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { grey, lightBlue } from '@mui/material/colors';

/**
 * Material-UI Theme Configuration
 * 
 * Defines a custom theme with:
 * - Light color mode for high readability
 * - Calm blue color palette (soothing for elderly users)
 * - Custom paper styling with rounded borders for a softer appearance
 */
const theme = createTheme({
  palette: { 
    mode: 'light', 
    background: { 
      default: '#f8f8f8', // Light grey background
      paper: '#ffffff',   // White paper components
    }, 
    text: { 
      primary: grey[900],   // Dark text for high contrast
      secondary: grey[700], // Slightly lighter secondary text
    }, 
    primary: {
      main: lightBlue[700], // Blue primary color (calming)
      light: lightBlue[500],
      dark: lightBlue[900],
    },
    error: { 
      main: '#d32f2f', // Standard error color
    }, 
  },
  components: { 
    MuiPaper: { 
      styleOverrides: { 
        root: { 
          borderRadius: '16px',  // Rounded corners
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', // Subtle shadow
          border: `1px solid ${grey[200]}`, // Light border
          position: 'relative',
          overflow: 'hidden',
        } 
      } 
    } 
  },
});

/**
 * p5.js Sketch Definition
 * 
 * This defines the p5.js sketch that creates the audio-reactive blob visualization.
 * The sketch handles:
 * - Audio input processing and analysis
 * - Blob geometry calculation and animation
 * - Visual effects based on audio characteristics
 * - Rendering the blob with layers and depth
 * 
 * @param {Object} p - The p5.js instance
 */
const sketch = (p) => {
  /**
   * Audio Analysis Configuration
   * 
   * Setup for Web Audio API integration:
   * - audioContext: Manages audio processing
   * - analyser: Performs frequency analysis on audio input
   * - microphone: Captures audio from the device mic
   * - micStream: Raw media stream from getUserMedia
   * - frequencyData: Array to store frequency domain data
   */
  let audioContext; let analyser; let microphone; let micStream; let frequencyData;
  let audioReady = false; let sampleRate = 44100; // Default sample rate
  const audioThreshold = 0.09; // Minimum audio level for reaction
  const fftSize = 512; // FFT size (power of 2) for frequency analysis
  let nyquist; // Will store the Nyquist frequency (half the sample rate)

  /**
   * Blob State Management
   * 
   * Controls the active/inactive state of the blob:
   * - isP5StateActive: Whether the blob should react to audio
   * - activeStateIntensity: Smoothly transitions between states (0-1)
   * - activeStateLerpFactor: Controls the transition speed
   */
  let isP5StateActive = false;
  let activeStateIntensity = 0; const activeStateLerpFactor = 0.07;

  /**
   * Blob Geometry Configuration
   * 
   * Basic shape parameters:
   * - baseRadius: Base size of the blob
   * - numVertices: Number of points defining the blob's perimeter (higher = smoother)
   * - vertices: Array of vertex positions
   */
  let baseRadius = 100;
  const numVertices = 140; let vertices = [];

  /**
   * Breathing and Pause Effects
   * 
   * Simulates natural breathing and pause behavior:
   * - Creates gentle pulsing when idle
   * - Responds to pauses in speech
   * - Adds subtle "inhale" effect after pauses
   * 
   * These effects make the blob appear more organic and lifelike,
   * especially during quiet periods, enhancing the feeling of
   * interacting with something alive.
   */
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

  /**
   * Perlin Noise Parameters
   * 
   * These control the organic movement and deformation of the blob.
   * All parameters are carefully tuned for gentle, predictable motion
   * that's visually pleasing and non-distracting for elderly users.
   */

  /**
   * Passive Noise (Idle State)
   * 
   * Creates gentle, slow baseline motion even when the blob is inactive:
   * - Subtle deformations that make the blob feel alive but calm
   * - Very slow speed to avoid distraction
   * - Smooth transitions between states
   */
  let passiveNoiseTime = Math.random() * 1000; // Starting time offset
  const basePassiveNoiseSpeed = 0.0004; // Slow speed for calm motion
  const passiveNoisePosScale = 0.7; // Scale of noise position mapping
  let currentPassiveDeformationAmount = 0.04; // Current deformation amount
  const basePassiveDeformationAmount = 0.04; // Base deformation (very subtle)
  const maxPassiveDeformationBoost = 0.02; // Maximum additional deformation
  const passiveDeformationLerpFactor = 0.008; // Transition speed (slow)
  
  /**
   * Active Shape Noise (Core Form)
   * 
   * Controls the overall shape morphing during speech:
   * - Creates subtle, slow changes to the core blob shape
   * - Maintains visual stability with minimal variation
   * - Parameters optimized for calm, predictable motion
   */
  let activeShapeNoiseTime = Math.random() * 2000; // Starting time offset
  const baseActiveShapeNoiseSpeed = 0.0006; // Very slow for stability
  const baseActiveShapeNoiseScale = 0.9; // Subtle shape variation scale
  let currentActiveShapeNoiseScale = baseActiveShapeNoiseScale;
  const shapeScaleLerpFactor = 0.008; // Slow transition between states
  const shapeScaleSpreadFactor = 0.08; // Minimal variation amount
  
  /**
   * Active Texture Noise (Fine Details)
   * 
   * Adds subtle surface details to the blob:
   * - Very fine, small-scale texture variations
   * - Limited intensity to prevent visual distraction
   * - Slower transitions for elderly-friendly visuals
   */
  let activeTextureNoiseTime = Math.random() * 3000; // Starting time offset
  const baseActiveTextureNoiseSpeed = 0.0010; // Slow speed for stability
  const activeTextureNoiseScale = 8.0; // High frequency for fine details
  let currentActiveTextureIntensity = 0.04; // Current texture intensity
  const baseTextureIntensity = 0.02; // Minimum texture intensity
  const maxTextureIntensity = 0.08; // Maximum texture intensity
  const textureIntensityLerpFactor = 0.012; // Slow transition speed
  
  /**
   * Active Waviness (Speech Motion)
   * 
   * Creates the appearance of speech through gentle wave-like motion:
   * - Responds to audio level and frequency content
   * - Gentle, controlled response optimized for elderly users
   * - Mimics natural mouth movements during speech
   */
  let activeWavinessNoiseTime = Math.random() * 4000; // Starting time offset
  const baseActiveWavinessNoiseSpeed = 0.0006; // Speed of waviness animation
  let currentWavinessNoiseScale = 3.5; // Current waviness scale
  const baseWavinessNoiseScale = 3.5; // Base waviness scale
  const wavinessScalePitchFactor = 0.5; // Pitch influence amount
  const wavinessScaleLerpFactor = 0.01; // Very slow transitions
  let currentWavinessInfluence = 0.0; // Current waviness influence
  const maxWavinessInfluence = 0.15; // Limited influence for controlled movement
  const wavinessInfluenceLerpFactor = 0.012; // Slow transition speed
  
  /**
   * Angular Offset
   * 
   * Controls rotation of noise patterns:
   * - Creates variation in the appearance over time
   * - Prevents the blob from looking too static
   * - Very slow movement for stability
   */
  let activeNoiseAngularOffset = Math.random() * p.TWO_PI; // Random starting angle
  const baseActiveNoiseOffsetSpeed = 0.0003; // Very slow rotation

  /**
   * Speed Modulation Parameters
   * 
   * Controls how quickly the blob animates based on audio volume:
   * - Lower multipliers create calmer, more deliberate motion
   * - Optimized for a calm, soothing speaking style
   * - Prevents rapid, jarring movements that might be distracting
   */
  const maxSlowSpeedMultiplier = 1.8; // Maximum slow motion speed factor
  const maxFastSpeedMultiplier = 1.4; // Maximum fast motion speed factor

  /**
   * Peak Extension Control
   * 
   * Manages how much the blob can extend or spike outward:
   * - Creates gentle, smooth responses to audio
   * - Very limited extension factor for visual stability
   * - Slow transitions to prevent sudden shape changes
   */
  let activePeakMultiplier = 1.0; // Current peak extension multiplier
  const activeMultiplierLerpFactor = 0.08; // Slow transition rate
  const maxPeakExtensionFactor = 1.1; // Very limited maximum extension

  /**
   * Internal Complexity Texture
   * 
   * Creates subtle internal texture within the blob:
   * - Adds visual depth and complexity
   * - Very slow movement for stability
   * - Opacity controlled by audio characteristics
   */
  let internalTextureTime = Math.random() * 6000; // Starting time offset
  const internalTextureSpeed = 0.0003; // Very slow movement
  const internalTextureScale = 0.5; // Base texture scale
  const internalTextureComplexityScale = 2.5; // Higher frequency detail scale
  let internalTextureAlpha = 0; // Current opacity (0-100)
  const maxInternalTextureAlpha = 18; // Maximum opacity
  const internalAlphaLerpFactor = 0.015; // Slow fade in/out

  /**
   * Edge Sharpness Control
   * 
   * Manages the definition of the blob's edge:
   * - Proxy for "certainty" in speech
   * - More defined edges during clear speech
   * - Softer edges during uncertain or quiet moments
   */
  let edgeSharpness = 1.0; // Current edge sharpness
  const edgeSharpnessLerpFactor = 0.015; // Slow transition rate

  /**
   * Speech Mode Factors
   * 
   * Infers speech characteristics to adjust blob behavior:
   * - focusFactor: Represents concentration/clarity
   * - melodyFactor: Represents tonal variation/singing quality
   * - emphasisFactor: Represents emphasis/excitement
   * 
   * These factors are derived from audio analysis and influence
   * various aspects of the blob's animation and appearance.
   */
  let focusFactor = 0.0; const focusFactorLerp = 0.02;
  let melodyFactor = 0.0; const melodyFactorLerp = 0.025;
  let emphasisFactor = 0.0; const emphasisFactorLerp = 0.05;

  /**
   * Audio Reactivity Parameters
   * 
   * Core audio analysis values that drive the visualization:
   * - Smoothed audio levels across frequency bands
   * - Frequency spread and distribution analysis
   * - Pitch detection and tracking
   * - History tracking for sustained patterns
   * 
   * These parameters extract meaningful characteristics from 
   * the audio input to create appropriate visual responses.
   */
  let smoothedOverallLevel = 0; // Overall audio level (0-1)
  let smoothedMidLevel = 0;     // Mid frequency level (0-1)
  let smoothedTrebleLevel = 0;  // High frequency level (0-1)
  const audioLerpFactor = 0.1;  // Smoothing factor for audio levels
  let frequencySpread = 0;      // How spread out the frequencies are
  const freqSpreadLerpFactor = 0.03; // Smoothing for frequency spread
  const binActivationThreshold = 10;  // Minimum bin value to count as active
  let pitchProxy = 0.5;         // Estimated pitch value (0-1)
  const pitchProxyLerpFactor = 0.06; // Smoothing for pitch changes
  let lastPitchProxy = 0.5;     // Previous pitch value
  let pitchChangeRate = 0;      // How quickly pitch is changing
  const pitchChangeLerpFactor = 0.05; // Smoothing for pitch change rate
  const pitchMinFreq = 80;      // Minimum tracked frequency (Hz)
  const pitchMaxFreq = 500;     // Maximum tracked frequency (Hz)
  let pitchMinIndex, pitchMaxIndex; // FFT bin indices for pitch range
  let midHistory = [];          // History of mid-frequency levels
  const midHistoryLength = 30;  // Length of history buffer
  let sustainedMidLevel = 0;    // Average mid level over time

  /**
   * Volume Dynamics Detection
   * 
   * Analyzes volume patterns to detect significant moments:
   * - Tracks volume history to establish baselines
   * - Detects "Aha!" moments (sudden volume increases)
   * - Creates special visual effects for these moments
   * 
   * This adds a layer of emotional intelligence to the visualization,
   * responding appropriately to significant audio events.
   */
  let volumeHistory = [];       // History of volume levels
  const volumeHistoryLength = 60; // Length of history buffer
  let averageVolume = 0;        // Running average volume
  const ahaThresholdMultiplier = 1.4; // Volume spike detection threshold
  const ahaMinimumLevel = 0.30; // Minimum level for "Aha!" detection
  let isAhaMoment = false;      // Currently in an "Aha!" moment
  let ahaTimer = 0;             // Timer for "Aha!" effect duration
  const ahaDuration = 15;       // How long "Aha!" effects last

  /**
   * Color Properties
   * 
   * Controls the blob's color scheme:
   * - Base blue color (calming for elderly audience)
   * - Limited color shifts for visual stability
   * - Gentle saturation and brightness changes
   * - Subtle flash effects for emphasis
   * 
   * Colors are carefully chosen to be soothing and accessible,
   * with minimal jarring changes.
   */
  const baseHue = 210;          // Base color hue (blue)
  let hueShiftRange = 15;       // Limited hue variation
  let targetHue = baseHue;      // Target hue to transition toward
  let currentHue = baseHue;     // Current hue value
  const hueLerpFactor = 0.01;   // Very slow color transitions
  const baseSaturation = 60;    // Moderate saturation (not too vivid)
  const baseBrightness = 95;    // High brightness for visibility
  let saturationBoost = 0;      // Current saturation boost
  const maxSaturationBoost = 10; // Limited saturation change
  let brightnessBoost = 0;      // Current brightness boost
  const maxBrightnessBoost = 2; // Very subtle brightness changes
  let currentCenterColor;       // Current blob center color
  let currentEdgeColor;         // Current blob edge color
  let flashIntensity = 0;       // Current flash effect intensity
  const flashDecay = 0.10;      // Slow decay for gentle transitions

  /**
   * p5.js Setup Function
   * 
   * Initializes the canvas and sets up all required components:
   * - Creates and positions the canvas in the container
   * - Sets up color and angle modes
   * - Calculates initial dimensions and parameters
   * - Initializes all arrays and state variables
   * - Performs initial calculations for blob appearance
   */
  p.setup = () => {
    // Find the container element where the canvas will be placed
    const container = document.getElementById('canvas-container'); 
    if (!container) {
      console.error("Canvas container not found");
      return;
    }
    
    // Create canvas with integer dimensions to avoid sub-pixel rendering issues
    const canvasWidth = Math.floor(container.offsetWidth);
    const canvasHeight = Math.floor(container.offsetHeight);
    
    // Create and position the canvas inside the container
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
    
    // Set up color and angle modes
    p.colorMode(p.HSB, 360, 100, 100, 100); // HSB color mode with alpha
    p.angleMode(p.RADIANS); // Use radians for angle calculations
    p.frameRate(60); // Target 60fps for smooth animation
    
    // Calculate dimensions and audio parameters
    baseRadius = p.min(p.width, p.height) / 5.0; // Responsive sizing based on canvas
    nyquist = sampleRate / 2; // Nyquist frequency (highest detectable frequency)
    const binWidth = nyquist / (fftSize / 2); // Width of each frequency bin
    
    // Calculate FFT bin indices for pitch tracking range
    pitchMinIndex = Math.max(1, Math.floor(pitchMinFreq / binWidth));
    pitchMaxIndex = Math.min(fftSize / 2 - 1, Math.ceil(pitchMaxFreq / binWidth));
    
    // Initialize vertices array for the blob's shape
    for (let i = 0; i < numVertices; i++) { 
      vertices.push(p.createVector(0, 0)); 
    }
    
    // Initialize history arrays with zeros
    for(let i=0; i<volumeHistoryLength; i++) volumeHistory.push(0);
    for(let i=0; i<midHistoryLength; i++) midHistory.push(0);
    
    // Initialize core variables to their base values
    currentActiveShapeNoiseScale = baseActiveShapeNoiseScale;
    currentPassiveDeformationAmount = basePassiveDeformationAmount;
    currentWavinessNoiseScale = baseWavinessNoiseScale;
    
    // Perform initial calculations for blob appearance
    updateColor(); // Calculate initial colors
    calculateBlobShape(); // Calculate initial shape
    
    // Force a complete redraw once on setup
    p.clear();
    p.background(p.color(theme.palette.background.default));
    
    console.log(`p5 Setup Complete. Canvas: ${p.width}x${p.height}, BaseRadius: ${baseRadius}, Pitch Range Indices: ${pitchMinIndex}-${pitchMaxIndex}`);
  };

  /**
   * p5.js Draw Loop
   * 
   * Main animation loop that runs continuously:
   * - Calculates time delta for frame-rate independent animation
   * - Clears and resets the canvas
   * - Centers all drawing operations
   * - Updates audio analysis data
   * - Updates motion, color, and shape parameters
   * - Renders all visual elements in the correct order
   * 
   * This function runs once per frame (ideally 60 times per second).
   */
  p.draw = () => {
    // Calculate time delta for consistent animation speed regardless of frame rate
    let timeDelta = p.deltaTime / (1000 / 60); // Normalize to 60fps
    
    // Clear the entire canvas with background color to prevent artifacts
    p.clear();
    p.background(p.color(theme.palette.background.default));
    
    // Ensure everything is perfectly centered
    p.push(); // Save the current transformation state
    
    // Use integer values to avoid sub-pixel rendering issues
    const centerX = Math.floor(p.width / 2);
    const centerY = Math.floor(p.height / 2);
    p.translate(centerX, centerY); // Center the coordinate system
    
    // Update all calculations in sequence
    updateAudio(); // Process audio input data
    updateStateAndMotion(timeDelta); // Update motion parameters
    updateColor(); // Update color parameters
    calculateBlobShape(); // Calculate the blob vertices
    
    // Draw all visual elements in the correct order (back to front)
    drawInternalTexture(); // Draw internal texture details
    drawBlob(); // Draw the main blob shape
    drawMicrophoneIcon(); // Draw the microphone icon
    if(pauseEffectTimer > 0) drawPauseEffect(); // Draw pause ripple effect if active
    
    p.pop(); // Restore the original transformation state
  };
  
  /**
   * Draw Microphone Icon
   * 
   * Renders a microphone icon at the center of the blob:
   * - Icon scales and animates based on audio level
   * - Provides a visual cue that this is an audio interface
   * - Simple, recognizable design with high contrast
   * - Includes a pulsing circle indicator around the microphone
   */
  const drawMicrophoneIcon = () => {
    // Calculate scaling factor based on audio level
    // Uses safety checks to prevent negative or invalid values
    const smoothedLevel = Math.max(0, smoothedOverallLevel); // Prevent negative audio levels
    const peakMult = Math.max(0, activePeakMultiplier); // Prevent negative multipliers
    const scaleFactor = 1 + smoothedLevel * peakMult * 0.6; // Audio-driven scaling
    
    // Draw a pulsing circle around the microphone 
    // This creates a visual indicator of active speech
    const minCircleRadius = Math.max(0.1, baseRadius * 0.75); // Minimum radius
    const maxCircleRadius = Math.max(minCircleRadius + 0.1, baseRadius * 0.92); // Maximum radius
    const safeLevel = p.constrain(smoothedLevel, 0, 1); // Ensure level is between 0-1
    const circleRadius = p.lerp(minCircleRadius, maxCircleRadius, safeLevel); // Interpolate radius
    
    p.push(); // Save drawing state
    p.noFill(); // Transparent center
    p.stroke(255); // White circle
    p.strokeWeight(2); // Slightly thicker for better visibility
    p.circle(0, 0, circleRadius * 2); // Draw the circle
    p.pop(); // Restore drawing state
    
    // Draw the microphone icon
    p.push(); // Save drawing state
    p.fill(255); // White fill
    p.noStroke(); // No outline
    
    // Calculate microphone size based on audio level
    const baseMicSize = Math.max(0.1, baseRadius * 0.28); // Base size that scales with blob
    const safeScaleFactor = Math.max(0.1, scaleFactor); // Ensure scale factor is positive
    const currentMicSize = baseMicSize * safeScaleFactor; // Apply scaling
    
    // Draw the main microphone head (rounded rectangle)
    p.rectMode(p.CENTER); // Center-based rectangle mode
    const cornerRadius = Math.max(0.001, currentMicSize * 0.2); // Safe positive corner radius
    p.rect(0, -currentMicSize * 0.3, // Position slightly above center
          currentMicSize * 0.55, currentMicSize * 0.8, // Width and height
          cornerRadius); // Rounded corners
    
    // Draw the microphone stand (thin rectangle)
    p.rect(0, currentMicSize * 0.5, // Position below the head
          Math.max(0.001, currentMicSize * 0.12), // Width (with safety check)
          Math.max(0.001, currentMicSize * 1.0)); // Height (with safety check)
    
    // Draw the base of the microphone (ellipse)
    p.ellipse(0, currentMicSize * 1.0, // Position at bottom of stand
             Math.max(0.001, currentMicSize * 0.7), // Width
             Math.max(0.001, currentMicSize * 0.18)); // Height
    
    // Draw microphone grille pattern (subtle dots)
    p.fill(0, 0, 0, 30); // Semi-transparent dark color
    const grilleDiameter = Math.max(0.001, currentMicSize * 0.12);
    
    // Only draw grille details if microphone is large enough to avoid artifacts
    if (currentMicSize > 0.1) {
      // Top row of grille dots
      p.ellipse(-currentMicSize * 0.15, -currentMicSize * 0.4, grilleDiameter);
      p.ellipse(0, -currentMicSize * 0.4, grilleDiameter);
      p.ellipse(currentMicSize * 0.15, -currentMicSize * 0.4, grilleDiameter);
      
      // Bottom row of grille dots
      p.ellipse(-currentMicSize * 0.15, -currentMicSize * 0.2, grilleDiameter);
      p.ellipse(0, -currentMicSize * 0.2, grilleDiameter);
      p.ellipse(currentMicSize * 0.15, -currentMicSize * 0.2, grilleDiameter);
    }
    
    p.pop(); // Restore drawing state
  };

  /**
   * Setup Audio Processing
   * 
   * Initializes or reconnects the Web Audio API components:
   * - Creates AudioContext for processing audio input
   * - Sets up microphone access with permission request
   * - Configures the analyzer for frequency analysis
   * - Handles error cases and state management
   * 
   * @returns {Promise<boolean>} Success or failure of the audio setup
   */
  const setupAudio = async () => { 
    // Check if audio is already running, just reconnect mic if needed
    if (audioContext && audioContext.state === 'running') { 
      if (!micStream || !micStream.active) { 
        try { 
          // Request microphone access with noise suppression
          micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
              echoCancellation: true, 
              noiseSuppression: true 
            } 
          }); 
          
          // Reconnect the microphone to the analyzer
          if (microphone) microphone.disconnect(); 
          microphone = audioContext.createMediaStreamSource(micStream); 
          microphone.connect(analyser); 
          console.log("Reconnected mic stream."); 
        } catch (err) { 
          console.error("Error reconnecting mic:", err); 
          audioReady = false; 
          isP5StateActive = false; 
          return false; 
        } 
      } 
      
      audioReady = true; 
      console.log("Audio already running or reconnected."); 
      return true; 
    } 
    
    // Close existing audio context if present
    if (audioContext && audioContext.state !== 'closed') { 
      console.log("Closing existing audio context before creating new one."); 
      await audioContext.close().catch(e => console.error("Error closing previous context:", e)); 
      audioContext = null; 
    } 
    
    try { 
      // Create a new audio context
      audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
      
      // Update sample rate and frequency calculation parameters
      sampleRate = audioContext.sampleRate; 
      nyquist = sampleRate / 2; 
      const binWidth = nyquist / (fftSize / 2); 
      pitchMinIndex = Math.max(1, Math.floor(pitchMinFreq / binWidth)); 
      pitchMaxIndex = Math.min(fftSize / 2 - 1, Math.ceil(pitchMaxFreq / binWidth)); 
      
      // Resume context if it's suspended
      if (audioContext.state === 'suspended') { 
        await audioContext.resume(); 
      } 
      
      // Request microphone access
      micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true 
        } 
      }); 
      
      // Set up audio nodes
      microphone = audioContext.createMediaStreamSource(micStream); 
      analyser = audioContext.createAnalyser(); 
      analyser.fftSize = fftSize; 
      analyser.smoothingTimeConstant = 0.75; // Smoothing for transitions
      frequencyData = new Uint8Array(analyser.frequencyBinCount); 
      
      // Connect microphone to analyzer
      microphone.connect(analyser); 
      
      console.log('Audio setup successful. Context state:', audioContext.state); 
      audioReady = true; 
      return true; 
    } catch (err) { 
      // Handle setup errors
      console.error('Audio Setup Error:', err); 
      audioReady = false; 
      isP5StateActive = false; 
      
      // Clean up any partial resources
      if (micStream) { 
        micStream.getTracks().forEach(track => track.stop()); 
        micStream = null; 
      } 
      
      microphone = null; 
      analyser = null; 
      frequencyData = null; 
      
      if (audioContext && audioContext.state !== 'closed') { 
        await audioContext.close().catch(e => console.error("Error closing context on failure:", e)); 
      } 
      
      audioContext = null; 
      return false; 
    } 
  };

  /**
   * Stop Audio Processing
   * 
   * Gracefully shuts down audio processing:
   * - Stops all active microphone tracks
   * - Disconnects audio nodes
   * - Gradually fades out audio-related parameters
   * - Resets all state variables to default values
   */
  const stopAudioProcessing = () => { 
    console.log("Stopping audio processing and mic tracks."); 
    
    // Stop all microphone tracks
    if (micStream) { 
      micStream.getTracks().forEach(track => track.stop()); 
      micStream = null; 
    } 
    
    // Disconnect the microphone node
    if (microphone) { 
      microphone.disconnect(); 
      microphone = null; 
    } 
    
    // Mark audio as not ready
    audioReady = false; 
    
    // Use a faster lerp factor for quicker fade-out
    const stopLerpFactor = audioLerpFactor * 4; 
    
    // Gradually fade audio levels to zero
    smoothedOverallLevel = p.lerp(smoothedOverallLevel, 0, stopLerpFactor); 
    smoothedMidLevel = p.lerp(smoothedMidLevel, 0, stopLerpFactor); 
    smoothedTrebleLevel = p.lerp(smoothedTrebleLevel, 0, stopLerpFactor); 
    frequencySpread = p.lerp(frequencySpread, 0, stopLerpFactor); 
    
    // Reset all history arrays and derived values
    averageVolume = 0; 
    volumeHistory = volumeHistory.map(() => 0); 
    midHistory = midHistory.map(() => 0); 
    sustainedMidLevel = 0; 
    
    // Reset pitch tracking
    pitchProxy = 0.5; 
    lastPitchProxy = 0.5; 
    pitchChangeRate = 0; 
    
    // Reset speech mode factors
    focusFactor = 0; 
    melodyFactor = 0; 
    emphasisFactor = 0; 
  };

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

/**
 * AudioReactivePaintBlob React Component
 * 
 * A React component that renders an audio-reactive blob visualization.
 * This component:
 * - Creates and manages a p5.js canvas instance
 * - Synchronizes the blob state with parent component props
 * - Handles microphone activation/deactivation
 * - Provides loading and error states
 * 
 * The component is designed to be simple to use - just pass an isActive prop
 * to control when the blob should be active (reacting to audio).
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isActive - Whether the microphone/blob should be active
 */
const AudioReactivePaintBlob = ({ isActive }) => {
  // Refs to hold references across renders
  const canvasContainerRef = useRef(null); // Reference to the container div
  const p5InstanceRef = useRef(null);      // Reference to the p5.js instance
  
  // Component state
  const [errorMessage, setErrorMessage] = useState(''); // Error message to display
  const [isLoading, setIsLoading] = useState(true);     // Loading state flag
  
  /**
   * Initialize p5.js canvas
   * 
   * This effect runs once on component mount to:
   * - Import the p5.js library dynamically
   * - Create a new p5 instance with our sketch
   * - Clean up resources when the component unmounts
   */
  useEffect(() => { 
    let p5instance; 
    let mounted = true; // Track component mount state
    
    // Initialize p5.js with a slight delay to ensure DOM is fully ready
    const timer = setTimeout(() => {
      if (!mounted) return;
      
      // Dynamically import p5.js to reduce initial bundle size
      import('p5').then(p5 => { 
        if (!mounted) return; // Check mount state again after async operation
        
        // Create new p5 instance if container exists and we don't already have one
        if (canvasContainerRef.current && !p5InstanceRef.current) { 
          try {
            // Initialize p5 with our sketch and container
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
    
    // Cleanup function runs when component unmounts
    return () => { 
      mounted = false; // Mark component as unmounted
      clearTimeout(timer); // Clear the initialization timer
      
      // Clean up p5 instance if it exists
      if (p5InstanceRef.current) { 
        console.log("React: Cleaning up p5 instance."); 
        try {
          p5InstanceRef.current.cleanup(); // Call p5 cleanup method
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
        p5InstanceRef.current = null; // Clear the reference
      } 
    }; 
  }, []); // Empty dependency array - only run on mount/unmount

  /**
   * Synchronize blob state with isActive prop
   * 
   * This effect runs whenever the isActive prop changes to:
   * - Activate or deactivate the p5 audio processing
   * - Handle errors during state transitions
   * - Clean up resources when deactivating
   */
  useEffect(() => {
    // Get the current p5 instance from ref
    const p5Instance = p5InstanceRef.current;
    
    // Early return if no p5 instance exists yet
    if (!p5Instance) return;

    // Flag to prevent multiple simultaneous state changes
    let isHandlingStateChange = false;
    
    /**
     * Synchronize the p5 instance state with component props
     */
    const syncState = async () => {
      if (isHandlingStateChange) return; // Prevent concurrent state changes
      
      try {
        isHandlingStateChange = true;
        console.log("AudioReactiveBlob: Sync state called, isActive:", isActive);
        
        // Control the p5 instance based on isActive prop
        if (isActive) {
          console.log("AudioReactiveBlob: Activating p5 audio for visualization");
          // Don't await this call to ensure UI updates immediately
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
    
    // Run the sync state function
    syncState();
    
    // Cleanup function runs when component unmounts or isActive changes
    return () => {
      if (p5Instance) {
        console.log("AudioReactiveBlob: Cleaning up on state change or unmount");
        // Only deactivate if we're unmounting or turning off
        if (!isActive) {
          p5Instance.deactivate();
        }
      }
    };
  }, [isActive]); // Depend only on isActive prop

  /**
   * Render the status indicator (currently returns null)
   * 
   * This could be expanded in the future to show more status information
   * or accessibility indicators.
   */
  const renderStatusIndicator = () => {
    // No visual indicator needed
    return null;
  };

  /**
   * Component render function
   * 
   * Renders:
   * - A container div for the p5.js canvas
   * - Loading indicator during initialization
   * - Error message if something goes wrong
   * - CSS animations for visual effects
   */
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
      
      {/* Loading indicator */}
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
      
      {/* Error message display */}
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
      
      {/* CSS animations for visual effects */}
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

/**
 * Export the AudioReactivePaintBlob component as the default export
 * 
 * This component can be imported and used in other components like:
 * import AudioReactivePaintBlob from './AudioReactiveBlob';
 */
export default AudioReactivePaintBlob;
/**
 * Custom hook for using the Vapi service with proper microphone state management
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import MockVapiService, { SpeechState } from '../utils/mockVapiService';

/**
 * States for the microphone - simplified to just ON/OFF
 */
export const MicrophoneState = {
  OFF: 'off',  // Microphone is off
  ON: 'on'     // Microphone is on
};

/**
 * Hook to handle Vapi service integration with UI
 * The two primary states are:
 * 1. Microphone ON/OFF
 * 2. AI Speaking/Idle
 * @returns {Object} Service state and functions
 */
export function useVapiService() {
  // Core states
  const [microphoneState, setMicrophoneState] = useState(MicrophoneState.OFF);
  const [isActive, setIsActive] = useState(false); // Is the AI speaking?
  const [currentText, setCurrentText] = useState('');
  const [serviceState, setServiceState] = useState(SpeechState.IDLE);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Use ref to maintain the service instance across renders
  const serviceRef = useRef(null);
  // Use a ref to track if we're in the middle of a state change
  const isProcessingRef = useRef(false);
  // Use a ref to track the actual microphone state to avoid race conditions
  const micStateRef = useRef(MicrophoneState.OFF);
  
  // Update the ref whenever microphoneState changes
  useEffect(() => {
    micStateRef.current = microphoneState;
    console.log(`Microphone state updated to: ${microphoneState}`, new Error().stack);
  }, [microphoneState]);
  
  // Simple function to set the AI speaking state
  const setAISpeakingState = useCallback((toActive) => {
    // Set the active state immediately for a quick response
    setIsActive(toActive);
    
    console.log(`AI speaking state set to: ${toActive}`);
  }, []);
  
  /**
   * Activate the microphone
   * Returns a promise that resolves when the microphone is activated
   * and permissions are granted
   */
  const activateMicrophone = useCallback(async () => {
    console.log("useVapiService: Activating microphone");
    
    // Check if the browser supports the necessary APIs
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("useVapiService: Browser doesn't support getUserMedia");
      return false;
    }

    try {
      // We'll set the state after permission is granted to avoid race conditions
      // First, request microphone access to trigger the browser's permission prompt
      console.log("useVapiService: Requesting microphone permission");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // If we got here, permissions were granted
      console.log("useVapiService: Microphone permission granted");
      
      // Store this stream in a ref so we can reference it later
      // This prevents us from having to request permissions multiple times
      if (stream && stream.active) {
        // The stream is active, update state to ON
        setMicrophoneState(MicrophoneState.ON);
        
        // Release the stream - the AudioReactiveBlob will get its own
        stream.getTracks().forEach(track => track.stop());
        
        return true;
      } else {
        console.error("useVapiService: Stream not active after permission granted");
        setMicrophoneState(MicrophoneState.OFF);
        return false;
      }
    } catch (error) {
      console.error("useVapiService: Error activating microphone:", error);
      // Reset state to OFF if there was an error or permission denied
      setMicrophoneState(MicrophoneState.OFF);
      return false;
    }
  }, []);
  
  /**
   * Deactivate the microphone
   */
  const deactivateMicrophone = useCallback(() => {
    console.log("useVapiService: Deactivating microphone");
    setMicrophoneState(MicrophoneState.OFF);
    
    // If the AI is speaking when turning off mic, it should stop
    if (isActive) {
      console.log("useVapiService: Stopping active speech");
      setAISpeakingState(false);
    }
  }, [isActive, setAISpeakingState]);
  
  // Initialize the service on mount
  useEffect(() => {
    // Create a new service instance
    serviceRef.current = new MockVapiService();
    
    // Set up state change handler
    serviceRef.current.onStateChange = (newState) => {
      console.log("Speech state changed:", newState);
      setServiceState(newState);
      
      // Handle speaking states based on service state
      if (newState === SpeechState.SPEAKING) {
        // When the AI starts speaking
        setAISpeakingState(true);
      } else if (newState === SpeechState.IDLE && isActive) {
        // When the AI stops speaking
        setAISpeakingState(false);
      }
    };
    
    // Set up text change handler
    serviceRef.current.onTextChange = (text) => {
      console.log("Text changed:", text);
      setCurrentText(text);
    };
    
    // Initialize the service
    serviceRef.current.initialize();
    
    // Cleanup on unmount
    return () => {
      if (serviceRef.current) {
        serviceRef.current.cleanup();
      }
      // Ensure microphone is off when component unmounts
      setMicrophoneState(MicrophoneState.OFF);
    };
  }, [isActive, setAISpeakingState]);
  
  /**
   * Handle starting the assessment
   */
  const startAssessment = async () => {
    if (!serviceRef.current || isProcessingRef.current) return;
    
    // Check if microphone is active first
    if (micStateRef.current !== MicrophoneState.ON) {
      console.log("useVapiService: Can't start assessment without microphone permission");
      const micSuccess = await activateMicrophone();
      if (!micSuccess) {
        console.log("useVapiService: Failed to get microphone permission, aborting assessment");
        return;
      }
    }
    
    try {
      isProcessingRef.current = true;
      setHasInteracted(true);
      
      if (serviceState === SpeechState.IDLE) {
        await serviceRef.current.startAssessment();
      }
    } finally {
      isProcessingRef.current = false;
    }
  };
  
  /**
   * Handle advancing to the next question
   */
  const askNextQuestion = async () => {
    if (!serviceRef.current || serviceState !== SpeechState.IDLE || isProcessingRef.current) return;
    
    // Check if microphone is active first
    if (micStateRef.current !== MicrophoneState.ON) {
      console.log("useVapiService: Can't advance questions without microphone permission");
      return;
    }
    
    try {
      isProcessingRef.current = true;
      await serviceRef.current.askNextQuestion();
    } finally {
      isProcessingRef.current = false;
    }
  };
  
  /**
   * Handle a click on the blob area
   */
  const handleBlobClick = async () => {
    if (isProcessingRef.current) return;
    console.log("useVapiService: Blob clicked, mic state:", micStateRef.current);
    
    // Only process if microphone is active
    if (micStateRef.current !== MicrophoneState.ON) {
      console.log("useVapiService: Blob click ignored - microphone is off");
      return;
    }
    
    try {
      isProcessingRef.current = true;
      setHasInteracted(true);
      
      // If the service is idle, handle the assessment flow
      if (serviceState === SpeechState.IDLE) {
        if (!hasInteracted || serviceRef.current.currentQuestion === 0) {
          // First click - start assessment
          await startAssessment();
        } else {
          // Subsequent clicks - ask next question
          await askNextQuestion();
        }
      } 
      // If we're speaking, clicking doesn't do anything
      // except mark that we've interacted
    } finally {
      isProcessingRef.current = false;
    }
  };
  
  /**
   * Toggle the microphone state - the main control function
   * Super simple: just turn mic on or off, and automatically handle assessment
   */
  const toggleMicrophone = useCallback(async () => {
    console.log("useVapiService: toggleMicrophone called, current state:", micStateRef.current);
    
    // Add a processing flag to prevent double-clicking issues
    if (isProcessingRef.current) {
      console.log("useVapiService: Already processing a toggle request, ignoring");
      return;
    }
    
    try {
      isProcessingRef.current = true;
      
      if (micStateRef.current === MicrophoneState.OFF) {
        // Turning ON - we need to await the permission request
        console.log("useVapiService: Turning microphone ON");
        
        // Set a temporary UI state so user knows something is happening
        // This doesn't affect the actual state, just UI cues
        document.body.style.cursor = 'wait';
        
        // First, activate the microphone and wait for permission
        const success = await activateMicrophone();
        
        // Reset cursor
        document.body.style.cursor = 'default';
        
        if (success) {
          console.log("useVapiService: Microphone activated successfully");
          
          // Only proceed with assessment if microphone was successfully activated
          console.log("useVapiService: Automatically starting/continuing assessment");
          
          // Allow a small delay for the audio streams to initialize
          setTimeout(() => {
            // Simple logic - just start assessment if we haven't or continue if we have
            if (!hasInteracted || serviceRef.current.currentQuestion === 0) {
              startAssessment();
            } else if (serviceState === SpeechState.IDLE) {
              askNextQuestion();
            }
          }, 200);
        } else {
          console.log("useVapiService: Failed to activate microphone");
        }
      } else {
        // Turn microphone OFF - simple on/off toggle
        deactivateMicrophone();
      }
    } finally {
      // Make sure we reset the processing flag
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300); // Small delay to prevent rapid toggling
    }
  }, [serviceState, hasInteracted, activateMicrophone, deactivateMicrophone, startAssessment, askNextQuestion]);
  
  // Define an explicit microphone status check function for components
  const isMicrophoneActive = useCallback(() => {
    return micStateRef.current === MicrophoneState.ON;
  }, []);
  
  return {
    // Core states
    isActive,                // Is the AI speaking?
    currentText,             // The current text being spoken/displayed
    serviceState,            // Current state of the voice service
    hasInteracted,           // Has the user interacted with the assessment?
    microphoneState,         // Current state of the microphone
    
    // Super simplified: the only action needed is toggle
    toggleMicrophone,        // Toggle the microphone on/off (does everything)
  };
}

export default useVapiService;
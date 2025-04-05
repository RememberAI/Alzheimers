/**
 * Custom hook for using the Vapi service with the @vapi-ai/web SDK
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';

// Vapi Call Status Enum
export const VapiCallStatus = {
  INACTIVE: 'inactive',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
};

// Transcript Type Enum
export const TranscriptType = {
  PARTIAL: 'partial',
  FINAL: 'final',
};

// Recording states
export const RecordingState = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
  PAUSED: 'paused',
};

/**
 * Hook to handle Vapi service integration with UI
 * @returns {Object} Service state and functions
 */
export function useVapiService() {
  const [callStatus, setCallStatus] = useState(VapiCallStatus.INACTIVE);
  const [isSpeaking, setIsSpeaking] = useState(false); // Vapi speaking state
  const [recordingState, setRecordingState] = useState(RecordingState.INACTIVE); // Added recording state
  const [transcript, setTranscript] = useState({ text: '', type: TranscriptType.FINAL });
  const [error, setError] = useState(null);
  const [averageVolumeLevel, setAverageVolumeLevel] = useState(0);

  const vapiRef = useRef(null);
  const isStoppingRef = useRef(false); // To prevent race conditions on stop/end

  // Initialize Vapi on mount
  // State for pre-speech transcript (what the assistant will say before speaking)
  const [preSpeechTranscript, setPreSpeechTranscript] = useState('');
  
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
    if (!apiKey) {
      console.error("Vapi API Key missing in .env.local");
      setError("Vapi API Key missing.");
      setCallStatus(VapiCallStatus.ERROR);
      return;
    }

    if (!vapiRef.current) {
      vapiRef.current = new Vapi(apiKey);

      vapiRef.current.on('call-start', () => {
        console.log('Vapi: call-start');
        setCallStatus(VapiCallStatus.CONNECTED);
        setRecordingState(RecordingState.ACTIVE); // Set recording as active when call starts
        setError(null);
        isStoppingRef.current = false;
      });

      vapiRef.current.on('call-end', () => {
        console.log('Vapi: call-end');
        if (!isStoppingRef.current) {
          setCallStatus(VapiCallStatus.INACTIVE);
        }
        setIsSpeaking(false);
        setRecordingState(RecordingState.INACTIVE); // Reset recording state on call end
        setTranscript({ text: '', type: TranscriptType.FINAL });
        setAverageVolumeLevel(0);
        setError(null); // Clear error on call end
        isStoppingRef.current = false;
      });

      vapiRef.current.on('speech-start', () => {
        console.log('Vapi: speech-start');
        setIsSpeaking(true);
        setRecordingState(RecordingState.PAUSED); // Pause recording while assistant is speaking
        
        // Use the pre-speech transcript as the initial transcript when speaking starts
        if (preSpeechTranscript) {
          setTranscript({ text: preSpeechTranscript, type: TranscriptType.PARTIAL });
        }
      });

      vapiRef.current.on('speech-end', () => {
        console.log('Vapi: speech-end');
        setIsSpeaking(false);
        
        // Ensure we're listening for user input after the assistant stops speaking
        if (vapiRef.current && callStatus === VapiCallStatus.CONNECTED) {
          // Resume listening after assistant finishes speaking
          console.log('Resuming listening for user input');
          setRecordingState(RecordingState.ACTIVE); // Activate recording after assistant stops speaking
          
          // Explicitly tell Vapi to resume listening if needed (the SDK may handle this automatically)
          try {
            // The SDK might have a method to explicitly resume recording
            // Check SDK documentation for the exact method if needed
            // For now, we're relying on the SDK to auto-resume listening
          } catch (e) {
            console.error('Error resuming recording:', e);
          }
        }
      });

      vapiRef.current.on('message', (message) => {
        // console.log('Vapi message:', message); // Can be noisy
        if (message.type === 'transcript') {
          const { transcript: text, transcriptType, speaker } = message;
          
          // Only update transcript if it's from the assistant, not the user
          if (speaker !== 'user') {
            const type = transcriptType === 'final' ? TranscriptType.FINAL : TranscriptType.PARTIAL;
            
            // Store partial transcripts while the assistant is preparing to speak
            if (!isSpeaking && type === TranscriptType.PARTIAL) {
              setPreSpeechTranscript(text);
            } 
            // When the assistant is speaking, show the actual transcript
            else if (isSpeaking) {
              setTranscript({ text, type });
            }
            // When we get a final transcript and the assistant isn't speaking yet
            else if (type === TranscriptType.FINAL && !isSpeaking) {
              setPreSpeechTranscript(text);
            }
          }
        }
      });

      vapiRef.current.on('volume-level', (level) => {
        setAverageVolumeLevel(level);
      });

      vapiRef.current.on('error', (e) => {
        console.error('Raw Vapi error event object:', e);
        console.error('Vapi error:', e?.message || e);
        setError(e?.message || 'An unknown Vapi error occurred.');
        setCallStatus(VapiCallStatus.ERROR);
        setIsSpeaking(false);
        setRecordingState(RecordingState.INACTIVE); // Set recording to inactive on error
        setAverageVolumeLevel(0);
      });
    }

    // Cleanup
    return () => {
      console.log('Cleaning up Vapi hook effect');
      if (vapiRef.current) {
        vapiRef.current.stop(); // Ensure stop on unmount
        vapiRef.current = null;
      }
      setCallStatus(VapiCallStatus.INACTIVE); // Reset state
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Control Functions ---
  const startVapiCall = useCallback(async () => {
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    if (!assistantId) {
      console.error("Vapi Assistant ID missing in .env.local");
      setError("Vapi Assistant ID missing.");
      setCallStatus(VapiCallStatus.ERROR);
      return;
    }

    if (!vapiRef.current) {
      console.error("Vapi instance not ready.");
      setError("Vapi service not initialized.");
      setCallStatus(VapiCallStatus.ERROR);
      return;
    }

    if (callStatus !== VapiCallStatus.INACTIVE && callStatus !== VapiCallStatus.ERROR) {
      console.warn('Call start ignored, status:', callStatus);
      return;
    }

    console.log('Starting Vapi call...');
    setCallStatus(VapiCallStatus.CONNECTING);
    setError(null);
    isStoppingRef.current = false;

    try {
      await vapiRef.current.start(assistantId);
    } catch (e) {
      console.error('Error caught during vapi.start():', e);
      console.error('Failed to start Vapi call:', e?.message || e);
      setError(e?.message || 'Failed to start the call.');
      setCallStatus(VapiCallStatus.ERROR);
      setIsSpeaking(false);
      setAverageVolumeLevel(0);
    }
  }, [callStatus]); // Include callStatus

  const stopVapiCall = useCallback(() => {
    if (!vapiRef.current) {
      console.error("Vapi instance not available to stop.");
      return;
    }
    if (callStatus === VapiCallStatus.INACTIVE) {
      console.warn('Call stop ignored, already inactive.');
      return;
    }

    console.log('Stopping Vapi call...');
    isStoppingRef.current = true;
    setCallStatus(VapiCallStatus.INACTIVE); // Immediate UI feedback
    vapiRef.current.stop();
  }, [callStatus]); // Include callStatus

  // Toggle function for simple UI interaction
  const toggleVapiCall = useCallback(() => {
    if (callStatus === VapiCallStatus.INACTIVE || callStatus === VapiCallStatus.ERROR) {
      startVapiCall();
    } else { // CONNECTING or CONNECTED
      stopVapiCall();
    }
  }, [callStatus, startVapiCall, stopVapiCall]);

  return {
    callStatus,
    isSpeaking,
    recordingState, // Expose recording state
    transcript,
    preSpeechTranscript, // Expose the pre-speech transcript
    error,
    averageVolumeLevel,
    toggleVapiCall, // Expose the simple toggle function
  };
}

export default useVapiService;
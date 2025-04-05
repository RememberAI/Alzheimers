'use client';

import { useEffect, useState, useCallback } from 'react';
import { Box, Container, Typography, ThemeProvider, createTheme, CssBaseline, Paper, Fade, CircularProgress } from '@mui/material'; // Added CircularProgress
import { blueGrey, lightBlue, grey } from '@mui/material/colors';

// Import our AudioReactive component
import AudioReactivePaintBlob from '../components/AudioReactiveBlob'; // Correct path

// Import our custom hook for Vapi service and Status Enum
import useVapiService, { VapiCallStatus } from '../src/hooks/useVapiService'; // Correct path

// Create an accessible theme designed for elderly users (Theme remains unchanged)
const theme = createTheme({
  palette: {
    primary: {
      main: lightBlue[700],
      light: lightBlue[500],
      dark: lightBlue[900],
    },
    secondary: {
      main: blueGrey[600],
      light: blueGrey[400],
      dark: blueGrey[800],
    },
    background: {
      default: '#f8f8f8', // Keep light background
      paper: '#ffffff',
    },
    error: { main: '#d32f2f' },
    warning: { main: '#ffa000' },
    info: { main: '#0288d1' },
    success: { main: '#388e3c' },
    text: { // Ensure text colors have good contrast on light background
      primary: grey[900],
      secondary: grey[700],
    },
  },
  typography: {
    fontFamily: ['Roboto', 'Arial', 'sans-serif',].join(','),
    h1: { fontSize: '2.2rem', fontWeight: 500, color: lightBlue[900], letterSpacing: '-0.01em' },
    h2: { fontSize: '1.8rem', fontWeight: 500, color: lightBlue[800], },
    h3: { fontSize: '1.5rem', fontWeight: 500, color: lightBlue[800], },
    h4: { fontSize: '1.3rem', fontWeight: 500, },
    h5: { fontSize: '1.2rem', fontWeight: 500, },
    body1: { fontSize: '1.2rem', lineHeight: 1.6, },
    body2: { fontSize: '1.1rem', lineHeight: 1.6, },
  },
  shape: { borderRadius: 12, },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 500, padding: '10px 16px', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.1)', }, },
        sizeLarge: { padding: '12px 24px', fontSize: '1.1rem', },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 16 } }
    },
  },
});


export default function Home() {
  // Use our custom Vapi hook
  const {
    callStatus,
    isSpeaking,
    recordingState,
    transcript,
    preSpeechTranscript, // Get the pre-speech transcript
    error,
    averageVolumeLevel,
    toggleVapiCall // Use the simple toggle function
  } = useVapiService();

  // State only for displaying the transcript smoothly
  const [displayedTranscript, setDisplayedTranscript] = useState('');

  // State for potential mic permission errors (kept separate from Vapi errors)
  const [micError, setMicError] = useState(null);

  // State for loading indicator during connection
  const [isLoading, setIsLoading] = useState(false); // Reintroduce for connecting phase

  // Update displayed transcript when Vapi transcript or pre-speech transcript changes
  useEffect(() => {
    // If the AI is speaking, show the actual transcript
    if (isSpeaking && transcript.text) {
      setDisplayedTranscript(transcript.text);
    }
    // Before the AI speaks, show the pre-speech transcript if available
    else if (!isSpeaking && preSpeechTranscript && callStatus === VapiCallStatus.CONNECTED) {
      setDisplayedTranscript(preSpeechTranscript);
    }
    // Clear transcript if call ends and text is empty (or on error)
    else if (callStatus === VapiCallStatus.INACTIVE || callStatus === VapiCallStatus.ERROR) {
      setDisplayedTranscript('');
    }
  }, [transcript.text, transcript.type, preSpeechTranscript, isSpeaking, callStatus]);

  // Update loading state based on callStatus
  useEffect(() => {
    setIsLoading(callStatus === VapiCallStatus.CONNECTING);
  }, [callStatus]);

  // Import RecordingState
  const { RecordingState } = require('../src/hooks/useVapiService');

  // Get status text based on Vapi state
  const getStatusText = () => {
    switch (callStatus) {
      case VapiCallStatus.INACTIVE: return "Click the blue bubble to start";
      case VapiCallStatus.CONNECTING: return "Connecting...";
      case VapiCallStatus.CONNECTED: 
        if (isSpeaking) return "Assistant is speaking...";
        // Always emphasize that the user can speak
        return "You can speak anytime. Click bubble to stop";
      case VapiCallStatus.ERROR: return error ? `Error: ${error.substring(0, 35)}...` : "Error - Click bubble to retry"; // Show short error
      default: return "Initializing...";
    }
  };

  // Get styles for the main blob container based on Vapi state
  const getBlobStyleProps = () => {
    let borderColor = grey[300];
    let shadowColor = 'rgba(0, 0, 0, 0.1)';
    let opacity = 0.85;
    let filter = 'grayscale(40%)'; // More noticeable inactive state
    let cursor = 'pointer';
    
    // Default animation
    let animation = 'none';

    switch (callStatus) {
      case VapiCallStatus.CONNECTING:
        borderColor = theme.palette.warning.light;
        shadowColor = 'rgba(255, 160, 0, 0.25)';
        opacity = 0.9;
        filter = 'grayscale(10%)';
        cursor = 'wait'; // Indicate waiting
        break;
      case VapiCallStatus.CONNECTED:
        // Use green for connected state to indicate user can always speak
        borderColor = theme.palette.success.main;
        shadowColor = 'rgba(46, 125, 50, 0.3)';
        
        // Add subtle pulse when assistant is speaking
        if (isSpeaking) {
          animation = 'pulse 2.5s infinite';
        } else {
          animation = 'none';
        }
        
        opacity = 1;
        filter = 'none';
        cursor = 'pointer';
        break;
      case VapiCallStatus.ERROR:
        borderColor = theme.palette.error.light;
        shadowColor = 'rgba(211, 47, 47, 0.2)';
        filter = 'grayscale(50%)';
        break;
      case VapiCallStatus.INACTIVE:
      default:
        // Use blue for inactive state
        borderColor = theme.palette.primary.light;
        shadowColor = 'rgba(3, 169, 244, 0.2)';
        break;
    }
    return { borderColor, shadowColor, opacity, filter, cursor, animation };
  };
  const blobStyleProps = getBlobStyleProps();


  // Define global animations (unchanged)
  const globalStyles = `...`; // Keep existing animation styles

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <Container
        maxWidth="md"
        sx={{
          minHeight: '100vh',
          py: { xs: 3, sm: 4, md: 5 },
          px: { xs: 2, sm: 3, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 3, md: 4 }
        }}
        role="main"
        aria-label="Alzheimer's voice assessment application"
      >
        {/* Header (Unchanged) */}
        <Box component="header" sx={{ textAlign: 'center', mb: { xs: 2, sm: 3 } }}>
          <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '1.8rem', sm: '2rem', md: '2.2rem', lg: '2.4rem' }, lineHeight: 1.3, fontWeight: 500, mb: { xs: 1, sm: 2, md: 2 } }} tabIndex={0}>
            Alzheimer's Voice Assessment
          </Typography>
        </Box>

        {/* Status Text (Logic Updated) */}
        <Box component="section" aria-live="polite" aria-atomic="true" sx={{ textAlign: 'center', mb: 2, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 1 }}>
          <Typography variant="body1" role="status" sx={{
            fontWeight: 'bold',
            color: callStatus === VapiCallStatus.CONNECTED ? (isSpeaking ? 'primary.main' : 'success.dark') :
              callStatus === VapiCallStatus.CONNECTING ? 'warning.dark' :
                callStatus === VapiCallStatus.ERROR ? 'error.main' : grey[700],
            position: 'relative', zIndex: 10, fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem', lg: '1.2rem' },
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
            borderRadius: '8px', padding: '10px 16px',
            backgroundColor: callStatus === VapiCallStatus.CONNECTED ? (isSpeaking ? 'primary.light' + '40' : 'success.light' + '40') : // Use alpha transparency
              callStatus === VapiCallStatus.CONNECTING ? 'warning.light' + '40' :
                callStatus === VapiCallStatus.ERROR ? 'error.light' + '40' : grey[200] + '80', // Lighter grey for inactive
            border: '1px solid',
            borderColor: callStatus === VapiCallStatus.CONNECTED ? (isSpeaking ? 'primary.light' : 'success.light') :
              callStatus === VapiCallStatus.CONNECTING ? 'warning.light' :
                callStatus === VapiCallStatus.ERROR ? 'error.light' : grey[300],
            width: '100%', maxWidth: { xs: '100%', sm: '600px' }, transition: 'all 0.3s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {callStatus === VapiCallStatus.CONNECTING ? (
              <CircularProgress size={18} sx={{ color: 'warning.main', mr: 0.5 }} /> // Slightly smaller spinner
            ) : (
              <Box component="span" sx={{
                width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block', transition: 'background-color 0.3s ease',
                backgroundColor: callStatus === VapiCallStatus.CONNECTED ? (isSpeaking ? 'primary.main' : 'success.main') :
                  callStatus === VapiCallStatus.ERROR ? 'error.main' : grey[500],
                animation: isSpeaking ? 'pulse 1.5s infinite' : 'none', // Only pulse when speaking
              }} />
            )}
            {getStatusText()}
          </Typography>
        </Box>

        {/* Blob Container (Logic Updated, Structure Unchanged) */}
        <Box component="section" sx={{ width: '100%', position: 'relative', mb: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Mic Error Message (Unchanged) */}
          {micError && (<Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 25, /* ... */ }}> {micError} </Box>)}

          {/* Vapi Error Message (Different from micError) */}
          {error && callStatus === VapiCallStatus.ERROR && (
            <Box sx={{ position: 'absolute', top: '40%', left: '50%', transform: 'translateX(-50%)', zIndex: 25, bgcolor: 'error.dark', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', maxWidth: '80%', textAlign: 'center', animation: 'fadeIn 0.3s ease-in-out' }} role="alert">
              Vapi Error: {error}
            </Box>
          )}


          {/* Main interactive blob AREA (Click Handler Updated) */}
          <Box
            onClick={toggleVapiCall} // Use the toggle function directly
            sx={{
              width: '100%', height: { xs: '280px', sm: '320px', md: '350px' },
              position: 'relative', // Needed for absolute positioning of the canvas
              cursor: blobStyleProps.cursor, // Dynamic cursor
              textAlign: 'center',
              border: `4px solid`,
              borderColor: blobStyleProps.borderColor, // Dynamic border color
              borderRadius: '24px',
              transition: 'all 0.3s ease',
              boxShadow: `0 4px 25px ${blobStyleProps.shadowColor}`, // Dynamic shadow
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: blobStyleProps.opacity, // Dynamic opacity
              filter: blobStyleProps.filter, // Dynamic filter
              animation: blobStyleProps.animation, // Add animation property
              zIndex: 20, // Ensure clickable area is usable
              '&:focus': { outline: `3px solid ${theme.palette.primary.main}`, outlineOffset: '2px' },
              '&:hover': {
                transform: callStatus !== VapiCallStatus.CONNECTING ? 'translateY(-2px)' : 'none',
                boxShadow: callStatus !== VapiCallStatus.CONNECTING ? `0 6px 30px ${blobStyleProps.shadowColor}` : `0 4px 25px ${blobStyleProps.shadowColor}`,
                opacity: callStatus !== VapiCallStatus.CONNECTING ? 1 : blobStyleProps.opacity,
              }
            }}
            role="button"
            aria-label={ // Updated aria-label based on Vapi status
              callStatus === VapiCallStatus.INACTIVE ? "Click to start assessment" :
                callStatus === VapiCallStatus.CONNECTING ? "Connecting..." :
                  callStatus === VapiCallStatus.CONNECTED ? "Click to stop assessment" :
                    "Click to retry connection"
            }
            tabIndex={0}
          >
            {/* --- The p5 Canvas Goes Here --- */}
            {/* Render the blob visualization, passing necessary state */}
            <AudioReactivePaintBlob
              isActive={isSpeaking} // Pass Vapi speaking state
              averageVolume={averageVolumeLevel} // Pass Vapi volume level
              isConnecting={callStatus === VapiCallStatus.CONNECTING} // Pass connecting state
              isRecording={recordingState === RecordingState.ACTIVE && !isSpeaking} // Pass recording state
            />
            {/* Microphone Icon is now rendered inside AudioReactivePaintBlob */}

            {/* Add a visual indicator that the mic is always listening */}
          <Box sx={{
            position: 'absolute',
            bottom: '15px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            padding: '3px 12px',
            borderRadius: '10px',
            fontSize: { xs: '0.75rem', sm: '0.8rem' },
            fontWeight: 'bold',
            opacity: callStatus === VapiCallStatus.CONNECTED ? 0.8 : 0,
            transition: 'opacity 0.3s ease'
          }}>
            Always listening
          </Box>
          </Box> {/* End clickable blob area */}

          {/* "Click above..." Button removed as requested */}

        </Box> {/* End blob section */}

        {/* Transcript display removed as requested */}

        {/* About Section (Unchanged) */}
        <Box component="section" sx={{ p: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'rgba(224, 242, 254, 0.3)', borderRadius: '16px', mt: 'auto', position: 'relative', zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} aria-labelledby="about-heading">
          {/* Content Unchanged */}
          <Typography variant="h5" component="h2" id="about-heading" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.35rem', md: '1.45rem', lg: '1.5rem' }, fontWeight: 500, color: lightBlue[900] }} tabIndex={0}>
            About This Assessment
          </Typography>
          <Typography variant="body1" paragraph sx={{ fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem', lg: '1.25rem' }, lineHeight: 1.6 }}>
            This cognitive assessment tool uses voice interaction...
          </Typography>
          <Typography variant="body1" paragraph sx={{ fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem', lg: '1.25rem' }, lineHeight: 1.6 }}>
            The assessment is designed to be user-friendly...
          </Typography>
          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem', lg: '1.25rem' }, lineHeight: 1.6, backgroundColor: 'rgba(255, 248, 225, 0.7)', padding: { xs: 1, sm: 1.5, md: 2 }, borderRadius: 1, borderLeft: `4px solid ${theme.palette.warning.main}`, display: 'flex', alignItems: 'center', gap: 1 }} role="alert">
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', bgcolor: theme.palette.warning.main, color: 'white', borderRadius: '50%', width: 24, height: 24, fontWeight: 'bold', fontSize: '1rem', flexShrink: 0 }}>
              !
            </Box>
            Note: This is not a diagnostic tool...
          </Typography>
        </Box>

      </Container>
    </ThemeProvider>
  );
}
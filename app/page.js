'use client';

import { useEffect, useState, useCallback } from 'react';
import { Box, Container, Typography, ThemeProvider, createTheme, CssBaseline, Paper, Fade } from '@mui/material';
import { blueGrey, lightBlue, grey } from '@mui/material/colors';

// Import our AudioReactive component
import AudioReactivePaintBlob from '../components/AudioReactiveBlob';

// Import our custom hook for Vapi service
import useVapiService from '../src/hooks/useVapiService';

// Create an accessible theme designed for elderly users
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
      default: '#f8f8f8',
      paper: '#ffffff',
    },
    error: {
      main: '#d32f2f'
    },
    warning: {
      main: '#ffa000'
    },
    info: {
      main: '#0288d1'
    },
    success: {
      main: '#388e3c'
    }
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.2rem',
      fontWeight: 500,
      color: lightBlue[900],
      letterSpacing: '-0.01em'
    },
    h2: {
      fontSize: '1.8rem',
      fontWeight: 500,
      color: lightBlue[800],
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
      color: lightBlue[800],
    },
    h4: {
      fontSize: '1.3rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.2rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1.2rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '1.1rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '10px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          },
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: '1.1rem',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16
        }
      }
    },
  },
});

export default function Home() {
  // Use our custom hook to handle Vapi service integration
  const { 
    isActive, 
    currentText, 
    hasInteracted, 
    serviceState, 
    microphoneState,
    toggleMicrophone
  } = useVapiService();
  
  // State to track any errors that might occur
  const [micError, setMicError] = useState(null);
  
  // Add loading state to show feedback during mic activation
  const [isLoading, setIsLoading] = useState(false);
  
  // For debugging
  useEffect(() => {
    console.log("Main page: Microphone state changed:", microphoneState);
  }, [microphoneState]);
  
  useEffect(() => {
    console.log("Main page: isActive changed:", isActive);
  }, [isActive]);
  
  // Handle explicit microphone toggling
  const handleMicrophoneToggle = useCallback(async (e) => {
    e.stopPropagation(); // Prevent event bubbling
    
    console.log("Main page: Toggling microphone");
    try {
      await toggleMicrophone();
    } catch (error) {
      console.error("Main page: Error toggling microphone:", error);
      setMicError("Could not toggle microphone. Please check browser permissions.");
      // Hide error after 3 seconds
      setTimeout(() => setMicError(null), 3000);
    }
  }, [toggleMicrophone]);
  
  // Define styles with animations for the component
  const globalStyles = `
    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }
    
    @keyframes fadeIn {
      0% { opacity: 0; transform: translateY(-10px) translateX(-50%); }
      100% { opacity: 1; transform: translateY(0) translateX(-50%); }
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <Container 
        maxWidth="md" 
        sx={{ 
          minHeight: '100vh',
          py: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 3, md: 4 }
        }}
        role="main"
        aria-label="Alzheimer's voice assessment application"
      >
        {/* Header */}
        <Box 
          component="header" 
          sx={{ 
            textAlign: 'center', 
            mb: { xs: 2, sm: 3 } 
          }}
        >
          <Typography 
            variant="h1" 
            component="h1"
            sx={{
              fontSize: { xs: '1.8rem', sm: '2rem', md: '2.2rem' },
              lineHeight: 1.3,
              fontWeight: 500
            }}
            tabIndex={0}
          >
            Alzheimer's Voice Assessment
          </Typography>
        </Box>
        
        {/* Status text that updates based on interaction state */}
        <Box 
          component="section"
          aria-live="polite"
          aria-atomic="true"
          sx={{ 
            textAlign: 'center', 
            mb: 2, 
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 1
          }}
        >
          <Typography 
            variant="body1" 
            role="status"
            sx={{ 
              fontWeight: 'bold',
              color: microphoneState === 'on' ? 
                (isActive ? lightBlue[700] : 'success.dark') : 
                'error.main',
              position: 'relative',
              zIndex: 10,
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              borderRadius: '8px',
              padding: '10px 16px',
              backgroundColor: microphoneState === 'on' ? 
                (isActive ? 'rgba(227, 242, 253, 0.5)' : 'rgba(232, 245, 233, 0.5)') : 
                'rgba(255, 235, 238, 0.5)',
              border: '1px solid',
              borderColor: microphoneState === 'on' ? 
                (isActive ? lightBlue[200] : 'success.light') : 
                'error.light',
              width: '100%',
              maxWidth: { xs: '100%', sm: '600px' },
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Box component="span" 
              sx={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: microphoneState === 'on' ? 
                  (isActive ? lightBlue[500] : 'success.main') : 
                  'error.main',
                display: 'inline-block',
                animation: isActive ? 'pulse 1.5s infinite' : 'none'
              }}
            />
            
            {microphoneState === 'off' ? 
              "Click on the audio bubble to start" :
              isActive ? 
                "AI Assistant is speaking... Click the bubble to stop" :
                "Microphone active"}
          </Typography>
        </Box>
        
        {/* Blob container with responsive dimensions */}
        <Box 
          component="section"
          sx={{ 
            width: '100%',
            position: 'relative',
            mb: { xs: 3, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {/* Loading indicator for microphone activation */}
          {isLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 25,
                backgroundColor: 'rgba(3, 169, 244, 0.9)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                maxWidth: '90%',
                textAlign: 'center',
                animation: 'fadeIn 0.3s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
              role="status"
            >
              <Box
                component="span"
                sx={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '3px solid white',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite'
                }}
              />
              Activating microphone...
            </Box>
          )}
          
          {/* Error message for microphone issues */}
          {micError && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 25,
                backgroundColor: 'error.dark',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                maxWidth: '90%',
                textAlign: 'center',
                animation: 'fadeIn 0.3s ease-in-out'
              }}
              role="alert"
            >
              {micError}
            </Box>
          )}
          
          {/* Main interactive blob area - the only thing users need to interact with */}
          <Box 
            onClick={async (e) => {
              // Prevent the event from bubbling up
              e.stopPropagation();
              
              console.log("Blob clicked, current mic state:", microphoneState);
              
              // Prevent multiple clicks
              if (isLoading) return;
              
              try {
                // Show loading state
                setIsLoading(true);
                
                // SUPER simple logic - just toggle microphone on/off
                // All assessment logic is handled automatically in toggleMicrophone
                await toggleMicrophone();
              } catch (error) {
                console.error("Error toggling microphone:", error);
                setMicError("Could not toggle microphone. Please try again.");
              } finally {
                // Hide loading state after a small delay to prevent flicker
                setTimeout(() => {
                  setIsLoading(false);
                }, 300);
              }
            }}
            sx={{ 
              width: '100%',
              height: { xs: '280px', sm: '320px', md: '350px' },
              position: 'relative',
              cursor: 'pointer',
              textAlign: 'center',
              border: `4px solid ${
                isActive ? lightBlue[500] : 
                microphoneState === 'on' ? 'success.main' : 
                'error.light'
              }`,
              borderRadius: '24px',
              transition: 'all 0.3s ease',
              boxShadow: 
                isActive ? '0 4px 25px rgba(3, 169, 244, 0.3)' : 
                microphoneState === 'on' ? '0 4px 20px rgba(46, 125, 50, 0.2)' : 
                '0 4px 20px rgba(211, 47, 47, 0.15)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: microphoneState === 'on' ? 1 : 0.85,
              filter: microphoneState === 'on' ? 'none' : 'grayscale(30%)',
              '&:focus': {
                outline: `3px solid ${lightBlue[500]}`,
                outlineOffset: '2px'
              },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 
                  isActive ? '0 6px 30px rgba(3, 169, 244, 0.4)' : 
                  microphoneState === 'on' ? '0 6px 25px rgba(46, 125, 50, 0.25)' : 
                  '0 6px 25px rgba(211, 47, 47, 0.25)'
              }
            }}
            role="button"
            aria-label={
              microphoneState === 'on' ?
                "Click to turn off microphone" :
                "Click to start assessment"
            }
            tabIndex={0}
          >
            {/* Microphone status indicator shown on blob */}
            <Box 
              sx={{
                position: 'absolute',
                top: 15,
                right: 15,
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: microphoneState === 'on' ? 'success.main' : 'error.light',
                border: '2px solid white',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                animation: 'none',
                transition: 'all 0.3s ease',
                zIndex: 10
              }}
              aria-hidden="true"
            />
            
            {/* Microphone text status */}
            <Box 
              sx={{
                position: 'absolute',
                top: 15,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: microphoneState === 'on' ? 'rgba(46, 125, 50, 0.9)' : 'rgba(211, 47, 47, 0.9)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d={microphoneState === 'on' ?
                    "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" : 
                    "M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"
                  } 
                  fill="white" 
                />
              </svg>
              {microphoneState === 'on' ? 'Microphone ON' : 'Microphone OFF'}
            </Box>
            
            {/* Status prompt displayed at center */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                maxWidth: '80%',
                textAlign: 'center',
                zIndex: 5,
                pointerEvents: 'none',
                opacity: isActive ? 0 : 0.9,
                transition: 'opacity 0.3s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              {microphoneState === 'off' ? 'Click to start' : 'Click to stop'}
            </Box>
          
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AudioReactivePaintBlob 
                isActive={microphoneState === 'on'} 
              />
            </Box>
          </Box>
        </Box>
        
        {/* Text display - completely separate from the blob */}
        <Fade in={!!currentText} timeout={700}>
          <Paper 
            component="section"
            elevation={1}
            sx={{ 
              p: { xs: 2, sm: 3 },
              mb: { xs: 3, sm: 4 },
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              minHeight: { xs: '100px', sm: '120px' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 10,
              visibility: currentText ? 'visible' : 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}
            role="region"
            aria-label="AI assistant's message"
            tabIndex={currentText ? 0 : -1}
          >
            <Typography 
              variant="body1" 
              align="center"
              sx={{ 
                fontStyle: 'italic',
                width: '100%',
                wordBreak: 'break-word',
                fontSize: { xs: '1.1rem', sm: '1.2rem' },
                lineHeight: 1.6
              }}
            >
              "{currentText}"
            </Typography>
          </Paper>
        </Fade>
        
        {/* About section */}
        <Box 
          component="section"
          sx={{
            p: { xs: 2, sm: 3 },
            backgroundColor: 'rgba(224, 242, 254, 0.3)',
            borderRadius: '16px',
            mt: 'auto',
            position: 'relative',
            zIndex: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}
          aria-labelledby="about-heading"
        >
          <Typography 
            variant="h5" 
            component="h2" 
            id="about-heading"
            gutterBottom
            sx={{
              fontSize: { xs: '1.3rem', sm: '1.4rem', md: '1.5rem' },
              fontWeight: 500,
              color: lightBlue[900]
            }}
            tabIndex={0}
          >
            About This Assessment
          </Typography>
          <Typography 
            variant="body1" 
            paragraph
            sx={{
              fontSize: { xs: '1.1rem', sm: '1.2rem' },
              lineHeight: 1.6
            }}
          >
            This cognitive assessment tool uses voice interaction to evaluate various aspects of cognitive function, including memory, orientation, attention, and language skills.
          </Typography>
          <Typography 
            variant="body1" 
            paragraph
            sx={{
              fontSize: { xs: '1.1rem', sm: '1.2rem' },
              lineHeight: 1.6
            }}
          >
            The assessment is designed to be user-friendly, particularly for elderly individuals. You'll interact with an AI assistant through voice commands, answering questions that help evaluate cognitive abilities.
          </Typography>
          <Typography 
            variant="body1" 
            paragraph 
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1.1rem', sm: '1.2rem' },
              lineHeight: 1.6,
              backgroundColor: 'rgba(255, 248, 225, 0.7)',
              padding: 1.5,
              borderRadius: 1,
              borderLeft: `4px solid ${theme.palette.warning.main}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
            role="alert"
          >
            <Box component="span" 
              sx={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: theme.palette.warning.main,
                color: 'white',
                borderRadius: '50%',
                width: 24,
                height: 24,
                fontWeight: 'bold',
                fontSize: '1rem',
                flexShrink: 0
              }}
            >
              !
            </Box>
            Note: This is not a diagnostic tool. Results should be discussed with a healthcare professional.
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
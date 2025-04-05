# Alzheimer's Voice Assessment Tool

A voice-based cognitive assessment tool using an interactive speaking blob visualization with speech recognition integration. This application provides a calming, intuitive interface for elderly users to participate in Alzheimer's cognitive assessments through natural voice conversation.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technical Architecture](#technical-architecture)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [User Experience Flow](#user-experience-flow)
- [Installation & Setup](#installation--setup)
- [Development](#development)
- [Vapi.ai Integration](#vapiai-integration)
- [Accessibility & Elderly-Friendly Design](#accessibility--elderly-friendly-design)
- [Future Development](#future-development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

This project is a single-page web application designed for elderly users to participate in Alzheimer's cognitive assessments through a natural voice conversation interface. By eliminating complex UI elements and focusing on simple voice interactions, the application creates an intuitive and engaging experience for users who may not be comfortable with traditional computer interfaces.

The central visual element is a calming, audio-reactive blob that responds to the AI assistant's speech, providing visual feedback during the assessment process. The voice assistant guides users through a series of cognitive assessment questions, creating a natural conversation flow that feels less clinical and more approachable.

## Key Features

- **Voice-Based Interaction**: Users interact with the application entirely through voice, eliminating the need for complex UI navigation
- **Audio-Reactive Visualization**: The central blob visualization responds to the AI's speech patterns in real-time, creating visual feedback
- **Elderly-Friendly Design**: Large text, simple layout, clear instructions, and soothing color scheme optimized for older adults
- **Cognitive Assessment Questions**: Standard questions for assessing orientation, memory, attention, and recall
- **Responsive Design**: Fully responsive layout that works on various screen sizes and devices
- **Mock API Integration**: Simulated voice service with appropriate timing for prototype demonstration

## Technical Architecture

### Frontend Stack

- **Framework**: Next.js with React 18
- **UI Framework**: Material UI v5
- **Visualization**: p5.js for the audio-reactive blob
- **Audio Processing**: Web Audio API for audio analysis
- **State Management**: React Hooks for local state management
- **Styling**: Material UI theming with CSS-in-JS
- **Fonts**: Geist Sans and Geist Mono from Google Fonts

### Key Technical Components

1. **Audio-Reactive Blob**: A p5.js-based visualization that responds to audio input with gentle animations
2. **Speech Service Hook**: Custom React hook that manages speech states and microphone permissions
3. **Mock Voice API Service**: Simulated service that manages the conversation flow
4. **Responsive Layout**: Material UI components with responsive breakpoints

## Project Structure

```
/
├── app/                    # Next.js app directory
│   ├── globals.css         # Global styles
│   ├── layout.js           # Root layout component
│   └── page.js             # Main application page
├── components/
│   └── AudioReactiveBlob.jsx  # Blob visualization component
├── src/
│   ├── api/
│   │   └── vapiService.js     # Voice API service interface
│   ├── hooks/
│   │   └── useVapiService.js  # Custom hook for service integration
│   └── utils/
│       └── mockVapiService.js # Mock implementation for testing
├── public/                 # Static assets (icons, images)
├── next.config.mjs         # Next.js configuration
├── package.json            # Dependencies and scripts
└── README.md               # Project documentation
```

## Core Components

### AudioReactiveBlob.jsx

The `AudioReactiveBlob` component creates a visually engaging, audio-reactive blob visualization that responds to speech patterns. Key features:

- **Real-time Audio Analysis**: Uses the Web Audio API to analyze speech patterns
- **Organic Animation**: Smooth, natural motion with gentle pulsing and waviness
- **Accessibility**: Designed with visual cues that are easy to understand for elderly users
- **Microphone Integration**: Connects to the device microphone for audio input

Technical implementation:
- Uses p5.js for canvas-based drawing and animation
- Implements FFT (Fast Fourier Transform) for audio frequency analysis
- Applies Perlin noise for organic, natural motion
- Uses React hooks for lifecycle management and prop synchronization

### useVapiService.js

This custom React hook manages the integration with the voice service:

- **Microphone State Management**: Handles microphone permissions and state
- **Speech State Tracking**: Manages the current state of the conversation (idle, speaking, listening)
- **Assessment Flow**: Controls the assessment flow through states and transitions
- **Text Synchronization**: Updates UI text based on current speech

### mockVapiService.js

This service simulates a voice-based conversation with an AI assistant:

- **Simulated Speech**: Mimics AI speech with appropriate timing
- **Question Management**: Handles the sequence of assessment questions
- **State Management**: Tracks conversation state and progression
- **Event Handling**: Provides callbacks for state and text changes

## User Experience Flow

1. **Initial View**: The user sees a welcome screen explaining the purpose of the assessment
2. **Start Assessment**: Upon clicking the blob, the microphone is activated and the AI introduces itself
3. **Voice Interaction**: The blob animates in response to the AI's speech, creating a visual indicator of active speaking
4. **Cognitive Assessment**: The AI asks a series of questions designed to evaluate cognitive function
5. **User Response**: The user responds verbally to each question
6. **Assessment Conclusion**: After completing all questions, the AI provides closing remarks

## Installation & Setup

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/RememberAI/Alzheimers.git
cd Alzheimers

# Install dependencies
npm install
# or
yarn
# or
pnpm install
```

### Development Server

```bash
# Start the development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Development

### Project Configuration

- **next.config.mjs**: Contains Next.js configuration, including webpack setup for asset modules
- **package.json**: Lists all dependencies and npm scripts
- **jsconfig.json**: JavaScript configuration for better IDE support

### Key Dependencies

- React 19
- Next.js 15.2
- Material UI 7.0
- p5.js 1.11
- pitchy 4.1 (audio analysis)
- Three.js 0.175 (for future 3D capabilities)

### Blob Visualization

The blob visualization parameters can be adjusted in `AudioReactiveBlob.jsx`:

- **Base Radius**: Controls the overall size of the blob
- **Noise Parameters**: Adjust the organic motion characteristics
- **Color Properties**: Change the color palette for the blob
- **Animation Speed**: Control how quickly the blob responds to audio

## Vapi.ai Integration

The current implementation uses a mock service to simulate voice interactions. In production, this would be replaced with Vapi.ai integration:

### Mock Implementation

- `mockVapiService.js` simulates conversation flow
- Sample assessment questions are defined in the service
- Speech states (idle, speaking, listening, processing) are used to control the blob animation

### Production Integration

To integrate with Vapi.ai in production:

1. Replace the mock service with the Vapi API client
2. Implement proper speech-to-text and text-to-speech functionality
3. Connect to Vapi.ai endpoints for LLM-based conversation
4. Implement proper error handling and fallback mechanisms

## Accessibility & Elderly-Friendly Design

The application is designed with elderly users in mind:

- **Large Text**: Increased font sizes for better readability
- **High Contrast**: Clear color contrast for text and UI elements
- **Simple Layout**: Clean, uncluttered design with clear instructions
- **Voice-First Interaction**: Minimal need for keyboard or mouse interaction
- **Status Indicators**: Clear visual feedback for microphone and speech states
- **Minimal Cognitive Load**: Simple, focused interface with one primary action
- **Calm Visual Aesthetic**: Soothing colors and gentle animations

### Material UI Theme

The application uses a custom Material UI theme optimized for elderly users:

- **Color Palette**: Light blue and blue-grey for a calm, trustworthy aesthetic
- **Typography**: Larger font sizes with increased line height
- **Component Styling**: Rounded corners and subtle shadows for depth
- **Focus States**: Clear focus indicators for keyboard navigation

## Future Development

Planned enhancements for future releases:

1. **Real Vapi.ai Integration**: Connect to actual Vapi.ai API for LLM-based conversation
2. **Assessment Scoring**: Implement proper scoring and result tracking
3. **User Profiles**: Add user authentication and profile management
4. **Session Recording**: Save and analyze assessment sessions
5. **Healthcare Provider Portal**: Secure sharing of results with healthcare professionals
6. **Multilingual Support**: Add support for multiple languages
7. **Offline Mode**: Allow assessments without an internet connection
8. **Advanced Analytics**: Provide insights and trending analysis for repeat assessments
9. **Voice Customization**: Allow selection of different AI voices
10. **Visual Improvements**: Enhanced visualization options and themes

## Deployment

### Build for Production

```bash
# Build the application
npm run build
# or
yarn build
# or
pnpm build

# Start the production server
npm start
# or
yarn start
# or
pnpm start
```

### Deployment Options

The application can be deployed to various platforms:

- **Vercel**: Recommended for Next.js applications
- **Netlify**: Good alternative with similar features
- **Self-Hosted**: Can be deployed to any Node.js server

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Important Note**: This application is intended as a screening tool only and not as a diagnostic device. Always consult with healthcare professionals for proper diagnosis and treatment of Alzheimer's disease or other cognitive conditions.
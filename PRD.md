# PrivaChain Communication Platform

A decentralized communication platform demonstrating secure messaging, email, and search capabilities with modern blockchain-inspired UI/UX.

**Experience Qualities**:
1. **Secure** - Users feel confident their communications are private and protected
2. **Intuitive** - Complex decentralized concepts are presented in familiar, accessible ways  
3. **Modern** - Cutting-edge design that feels futuristic yet approachable

**Complexity Level**: Complex Application (advanced functionality, accounts)
- Demonstrates multiple interconnected communication services with persistent state management and real-time features

## Essential Features

### Secure Messenger
- **Functionality**: Real-time messaging with encryption indicators and group chat support
- **Purpose**: Primary communication hub that users trust for sensitive conversations
- **Trigger**: User clicks on contacts or starts new conversation
- **Progression**: Select contact → compose message → send with encryption → receive delivery confirmation → real-time responses
- **Success criteria**: Messages persist, encryption status visible, smooth real-time feel

### Anonymous Email System  
- **Functionality**: Email with .prv domains, encrypted storage, and anonymous addressing
- **Purpose**: Provides email service without revealing user identity or metadata
- **Trigger**: User navigates to mail section or composes new email
- **Progression**: Compose email → select/create .prv address → encrypt content → send via network → recipient downloads and decrypts
- **Success criteria**: Emails stored securely, .prv addresses work, anonymous sending confirmed

### Decentralized Search
- **Functionality**: Search across messages, emails, and network content with privacy protection
- **Purpose**: Enables content discovery without compromising user privacy
- **Trigger**: User types in search interface
- **Progression**: Enter search terms → query distributed index → filter results → display with privacy indicators
- **Success criteria**: Fast search results, privacy status clear, relevant content surfaced

### Identity Management
- **Functionality**: Zero-knowledge authentication and premium NFT access
- **Purpose**: Secure account management without revealing personal information
- **Trigger**: User wants to access premium features or verify identity
- **Progression**: Generate identity → create ZK proof → bind to services → access premium features
- **Success criteria**: Identity created securely, premium access granted, no personal data exposed

### Video Call Infrastructure (IMPLEMENTED)
- **Functionality**: WebRTC-based video/audio calls with simulated decentralized relay system and comprehensive call controls
- **Purpose**: Secure video communication without centralized servers, demonstrating P2P technology with professional-grade features
- **Trigger**: User clicks video/audio call buttons in messenger or receives incoming call
- **Progression**: Initiate call → establish connection via TURN nodes → full-screen video interface → call controls (mute, video toggle, screen share, recording) → end call
- **Success criteria**: 
  - Incoming call notifications with accept/decline options
  - Full-screen video call interface with local/remote video streams
  - Complete call controls: mute, video toggle, screen sharing, recording, speaker control
  - Call quality indicators and settings panel
  - Seamless integration with messenger interface
  - Call status indicators and duration tracking

## Technical Implementation Features

### Video Calling System
- **WebRTC Simulation**: Realistic video call interface simulating P2P connections
- **Call Management**: Context-based call state management with React hooks
- **UI Components**: Full-screen video interface with professional call controls
- **Connection Quality**: Visual indicators for network status and performance
- **Settings Panel**: Real-time call configuration (video quality, bandwidth, noise cancellation)
- **Call States**: Comprehensive handling of connecting, ringing, active, and ended states
- **Demo Features**: Simulated incoming calls for demonstration purposes

### Enhanced Messenger Integration
- **Call Buttons**: Direct video/audio call initiation from contact interface
- **Status Indicators**: Real-time call status display in messenger header
- **Contact Availability**: Online/offline status affecting call button availability
- **Seamless Transitions**: Smooth navigation between messaging and video calling

## Edge Case Handling
- **Network Offline**: Show cached messages, queue outgoing until reconnected
- **Encryption Failure**: Clear error messages with recovery options, fallback protocols
- **Invalid Address**: Suggest corrections, validate .prv domains before sending
- **Call Quality Issues**: Automatic quality adjustment, relay node switching
- **Storage Limits**: Warning notifications, data cleanup suggestions
- **Authentication Loss**: Secure recovery flows, backup reminder prompts

## Design Direction
The design should feel like a next-generation Signal or Telegram - sleek, trustworthy, and subtly futuristic with blockchain-inspired elements. Clean minimalism with purposeful animations that reinforce security concepts without being overwhelming.

## Color Selection
Triadic (three equally spaced colors) - Deep blue for trust/security, warm orange for energy/innovation, and muted green for success/encryption states. Creates dynamic contrast while maintaining professional authority.

- **Primary Color**: Deep Blue (oklch(0.45 0.15 250)) - Conveys security, trust, and technological sophistication
- **Secondary Colors**: 
  - Warm Orange (oklch(0.70 0.15 65)) - Represents innovation and user engagement
  - Muted Green (oklch(0.65 0.12 150)) - Indicates successful encryption and security states
- **Accent Color**: Bright Orange (oklch(0.75 0.20 65)) - Calls attention to important actions and notifications
- **Foreground/Background Pairings**: 
  - Background (Dark Blue #1a1f3a): Light text (oklch(0.95 0.02 250)) - Ratio 12.3:1 ✓
  - Card (Medium Blue #2d3561): White text (oklch(0.98 0.01 250)) - Ratio 8.1:1 ✓  
  - Primary (Deep Blue #364389): White text (oklch(0.98 0.01 250)) - Ratio 5.2:1 ✓
  - Secondary (Light Blue #4a5aa8): Dark text (oklch(0.15 0.05 250)) - Ratio 6.8:1 ✓
  - Accent (Warm Orange #E8965A): Dark text (oklch(0.15 0.02 65)) - Ratio 4.8:1 ✓
  - Muted (Cool Gray #52566e): Light text (oklch(0.90 0.02 250)) - Ratio 7.4:1 ✓

## Font Selection
Inter and JetBrains Mono should convey technical precision while remaining highly readable - balancing trust with cutting-edge innovation for a platform that handles sensitive communications.

- **Typographic Hierarchy**:
  - H1 (App Title): Inter Bold/32px/tight tracking (-0.02em)
  - H2 (Section Headers): Inter SemiBold/24px/normal tracking  
  - H3 (Component Titles): Inter Medium/18px/normal tracking
  - Body (Primary Text): Inter Regular/16px/relaxed line-height (1.6)
  - Caption (Metadata): Inter Regular/14px/normal tracking
  - Code (Addresses): JetBrains Mono Regular/14px/monospace spacing

## Animations
Subtle and purposeful animations that reinforce security concepts - encryption indicators, connection status, and state transitions should feel smooth and trustworthy without being distracting.

- **Purposeful Meaning**: Motion should communicate security states, data flow, and system status while building confidence in the platform's reliability
- **Hierarchy of Movement**: Encryption indicators and security warnings get priority, followed by navigation transitions, then subtle hover states

## Component Selection
- **Components**: Dialog for settings/auth, Card for message containers, Tabs for navigation, Badge for encryption status, Input for addresses, Button with loading states, Avatar for contacts, Sheet for mobile menus
- **Customizations**: Encryption status indicators, .prv address validators, network connection status, video call controls, search result cards
- **States**: Buttons show encryption/sending states, inputs validate addresses in real-time, calls display connection quality, messages show delivery status
- **Icon Selection**: Lock/unlock for encryption, Shield for security, Globe for network, Phone for calls, Search for discovery, User for identity
- **Spacing**: 4px micro-spacing, 16px component gaps, 24px section breaks, 32px major divisions using Tailwind scale
- **Mobile**: Stack navigation vertically, collapse sidebar to bottom tabs, full-screen video calls, swipe gestures for message actions
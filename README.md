# Offline File Transfer PWA

A cross-platform, offline-first Progressive Web App for secure file sharing over local Wi-Fi without internet connection.

## Features

- 🔒 **Secure P2P Transfer**: Direct file transfer using WebRTC DataChannel
- 🌐 **Offline-First**: No internet required after installation
- 📱 **Cross-Platform**: Works on any device with a modern web browser
- 🚀 **PWA**: Installable as a native app experience
- 📲 **QR Code Signaling**: Easy connection setup via QR codes
- 📊 **Progress Tracking**: Real-time transfer progress and chunking
- 🎨 **Mobile-Friendly**: Responsive design with Tailwind CSS

## How It Works

1. **Choose Role**: Select whether you want to send or receive a file
2. **Sender**: Pick a file and generate a connection offer (QR code)
3. **Receiver**: Scan the offer QR code and generate an answer
4. **Connect**: Sender scans the answer QR code to establish connection
5. **Transfer**: Files are sent directly over WebRTC DataChannel
6. **Complete**: Download the received file

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **WebRTC**: simple-peer for P2P connections
- **QR Codes**: qrcode.react, react-qr-reader
- **Styling**: Tailwind CSS
- **PWA**: Vite PWA plugin with service worker

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Usage

### For Senders:
1. Open the app and select "Sender"
2. Choose the file you want to send
3. Generate a connection offer QR code
4. Share the QR code with the receiver
5. Scan the receiver's answer QR code
6. Wait for the transfer to complete

### For Receivers:
1. Open the app and select "Receiver"
2. Scan the sender's offer QR code
3. Generate and share your answer QR code
4. Wait for the file to be received
5. Download the received file

## PWA Installation

The app can be installed as a PWA on:
- **Android**: Chrome will show "Add to Home Screen" prompt
- **iOS**: Safari → Share → Add to Home Screen
- **Desktop**: Chrome/Edge will show install prompt in address bar

## Network Requirements

- Both devices must be on the same local network (Wi-Fi)
- No internet connection required after initial installation
- Uses public STUN servers for NAT traversal when needed

## Security

- All data is transferred directly between devices
- No data passes through any servers (except STUN for NAT traversal)
- WebRTC provides built-in encryption
- Manual signaling ensures no automatic connections

## Browser Support

- Chrome 88+
- Firefox 84+
- Safari 14+
- Edge 88+

## Development

The project uses:
- **Vite** for fast development and building
- **TypeScript** for type safety
- **ESLint** for code quality
- **Tailwind CSS** for styling
- **React Context** for state management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details 
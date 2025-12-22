<div align="center">

  <img src="https://res.cloudinary.com/dewvz4zxk/image/upload/v1766405786/img1-removebg-preview_zxfcth.png" alt="Silent Glaze Logo" width="60" />

  <h1>Silent Glaze</h1>
  
  <p>
    <b>A Video Connection Platform</b>
  </p>

  <p>
    <a href="https://github.com/tekle-eyesus/silent-glaze/graphs/contributors">
      <img src="https://img.shields.io/badge/contributors-welcome-brightgreen.svg?style=flat-square" alt="Contributors" />
    </a>
    <a href="https://github.com/tekle-eyesus/silent-glaze/network/members">
      <img src="https://img.shields.io/github/forks/yourusername/silent-glaze?style=flat-square" alt="Forks" />
    </a>
    <a href="https://github.com/tekle-eyesus/silent-glaze/stargazers">
      <img src="https://img.shields.io/github/stars/yourusername/silent-glaze?style=flat-square" alt="Stars" />
    </a>
    <a href="https://github.com/tekle-eyesus/silent-glaze/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License" />
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" />
    <img src="https://img.shields.io/badge/Socket.io-25C2A0?style=for-the-badge&logo=socket.io&logoColor=white" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-00BCFF?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  </p>

  <h4>
    <a href="https://silent-gaze.vercel.app/">View Demo</a>
    <span> · </span>
    <a href="https://github.com/tekle-eyesus/silent-glaze/issues">Report Bug</a>
    <span> · </span>
    <a href="https://github.com/tekle-eyesus/silent-glaze/issues">Request Feature</a>
  </h4>
</div>

<br />

## About The Project

**Silent Glaze** is a conceptual video meeting application designed for "Silent Connection." Unlike traditional tools like Zoom or Google Meet, this platform disables audio to focus entirely on visual presence and text-based emotion.

The interface features a **futuristic Glassmorphism UI** where chat messages float over the video feed like a Heads-Up Display (HUD). It emphasizes emotional connection through animated particle emojis and a moody, cinematic atmosphere.

## ✨ Key Features

*   **Real-Time Video:** Peer-to-Peer video streaming using WebRTC (Simple-Peer).
*   **Silent Communication:** Audio is intentionally disabled to foster deep visual focus.
*   **Dual Chat HUD:** 
    *   **Desktop:** Split-screen glassy overlays for Sender and Receiver.
    *   **Mobile:** Unified, WhatsApp-style scrollable chat stream.
*   **Animated Reactions:** Telegram-style emojis that explode into floating particles on screen.
*   **Live Typing Indicators:** See when your partner is typing in real-time.
*   **Message Persistence:** All chats are stored in MongoDB, ensuring history is never lost on refresh.
*   **Fully Responsive:** Adaptive layout that switches from a Sci-Fi HUD on desktop to a functional chat app on mobile.

## ⚡ Built With

### Frontend
*   [React.js](https://reactjs.org/) (Vite)
*   [Tailwind CSS](https://tailwindcss.com/) (Glassmorphism Styling)
*   [Framer Motion](https://www.framer.com/motion/) (Animations & Particles)
*   [Simple Peer](https://github.com/feross/simple-peer) (WebRTC Wrapper)
*   [Socket.io Client](https://socket.io/)

### Backend
*   [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
*   [Socket.io](https://socket.io/) (Signaling & Real-time events)
*   [MongoDB](https://www.mongodb.com/) (Database)
*   [Mongoose](https://mongoosejs.com/) (ODM)

## Getting Started

To get a local copy up and running, follow these steps.

### Prerequisites
*   Node.js (v14 or higher)
*   MongoDB (Local or Atlas URL)

### Installation

1.  **Clone the repo**
    ```sh
    git clone https://github.com/yourusername/silent-glaze.git
    cd silent-glaze
    ```

2.  **Setup Backend**
    ```sh
    cd server
    npm install
    # Create .env file (see below)
    npm run dev
    ```

3.  **Setup Frontend**
    Open a new terminal:
    ```sh
    cd client
    npm install
    # Create .env file (see below)
    npm run dev
    ```

## 🔑 Environment Variables

To run this project, you will need to add the following environment variables.

### Server (`server/.env`)
```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/silent-glaze  # Or your MongoDB Atlas URL
```
### Client (client/.env)
```env
VITE_SERVER_URL=http://localhost:3001
```
---
## 🤝 Contributing
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly `appreciated`.

## License
Distributed under the MIT License. See LICENSE for more information.

<div align="center">
<p>Built by <a href="https://www.linkedin/in/tekleeyesus-munye">Tekleeyesus Munye</a></p>
</div>

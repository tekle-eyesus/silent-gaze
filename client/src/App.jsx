import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

// Connect to backend
const socket = io.connect("http://localhost:3001");

function App() {
  const [myStream, setMyStream] = useState(null);
  const [messages, setMessages] = useState([]); // Stores { text, sender: 'me' | 'partner' }
  const [input, setInput] = useState("");
  
  const myVideoRef = useRef();
  const partnerVideoRef = useRef();

  // 1. Get User Media (Video ONLY, Audio FALSE)
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        setMyStream(stream);
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
      });
  }, []);

  const sendMessage = () => {
    if(input.trim()) {
      const msgData = { text: input, sender: 'me' };
      setMessages((prev) => [...prev, msgData]);
      // Emit to socket here later...
      setInput("");
    }
  };

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden flex justify-center items-center flex">
      
      {/* --- VIDEO LAYER --- */}
      <div className="absolute inset-0 z-0 flex">
        {/* For MVP, let's assume full screen partner video, your video in corner, 
            OR split screen. Let's do Full Screen Partner (or self for test) */}
        <video 
          ref={myVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
        />
        {/* Setup Partner video tag here later */}
      </div>

      {/* --- GLASSY UI OVERLAY --- */}
      <div className="absolute inset-0 z-10 grid grid-cols-2 gap-4 p-10 pointer-events-none">
        
        {/* Left: Partner's Messages (Incoming) */}
        <div className="flex flex-col justify-end items-start space-y-4">
           {messages.filter(m => m.sender === 'partner').map((msg, i) => (
             <div key={i} className="glass-bubble-left">
               {msg.text}
             </div>
           ))}
        </div>

        {/* Right: My Messages (Outgoing) */}
        <div className="flex flex-col justify-end items-end space-y-4">
           {messages.filter(m => m.sender === 'me').map((msg, i) => (
             <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-white max-w-xs shadow-lg animate-fade-in">
               {msg.text}
             </div>
           ))}
           
           {/* Input Area (Must enable pointer events) */}
           <div className="pointer-events-auto mt-4 w-full max-w-md">
             <input 
               type="text" 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
               placeholder="Type a thought..."
               className="w-full bg-black/40 backdrop-blur-xl border border-white/30 text-white px-4 py-3 rounded-full outline-none focus:border-white/60 transition-all placeholder-white/50"
             />
           </div>
        </div>

      </div>
    </div>
  );
}

export default App;
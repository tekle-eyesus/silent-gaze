import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSend, IoExitOutline } from 'react-icons/io5';

const socket = io.connect("http://localhost:3001");

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Waiting for partner...");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Refs
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const messagesEndRef = useRef(null); 

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Logic
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((currentStream) => {
        if (myVideo.current) myVideo.current.srcObject = currentStream;

        socket.emit('join_room', roomId);

        socket.on('room_full', () => {
            alert("Room is full!");
            navigate('/');
        });

        // WebRTC: User Joined (Host Logic)
        socket.on('user_joined', (userId) => {
          setStatus("Connecting...");
          const peer = new Peer({ initiator: true, trickle: false, stream: currentStream });

          peer.on('signal', (data) => {
            socket.emit('offer', { target: userId, caller: socket.id, sdp: data });
          });

          peer.on('stream', (userStream) => {
            if (userVideo.current) userVideo.current.srcObject = userStream;
            setStatus("Connected");
          });

          socket.on('answer', (payload) => {
            peer.signal(payload.sdp);
          });

          connectionRef.current = peer;
        });
        socket.on('offer', (payload) => {
          setStatus("Connecting...");
          const peer = new Peer({ initiator: false, trickle: false, stream: currentStream });

          peer.on('signal', (data) => {
            socket.emit('answer', { target: payload.caller, sdp: data });
          });

          peer.on('stream', (userStream) => {
            if (userVideo.current) userVideo.current.srcObject = userStream;
            setStatus("Connected");
          });

          peer.signal(payload.sdp);
          connectionRef.current = peer;
        });


        socket.on('receive_message', (data) => {
            console.log("Msg received:", data);
            setMessages((prev) => [...prev, { ...data, sender: 'partner' }]);
        });
      });

      // --- CLEANUP FUNCTION (Fixes Double Messages) ---
      return () => {
        socket.off('room_full');
        socket.off('user_joined');
        socket.off('offer');
        socket.off('answer');
        socket.off('receive_message'); 
        if(connectionRef.current) connectionRef.current.destroy();
      }
  }, [roomId, navigate]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if(input.trim()) {
      const msgData = { roomId, text: input, senderId: socket.id };
      socket.emit('send_message', msgData);
      setMessages((prev) => [...prev, { text: input, sender: 'me' }]);
      setInput("");
    }
  };

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden flex flex-col">
      
      <div className="absolute inset-0 z-0">
        <video 
          ref={userVideo} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover opacity-80"
        />
        {!connectionRef.current && (
            <div className="absolute inset-0 flex items-center justify-center z-0">
                <p className="text-white/30 animate-pulse tracking-widest uppercase">{status}</p>
            </div>
        )}
      </div>

      {/* --- HEADER --- */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 pointer-events-auto bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-white/50 text-xs tracking-widest">
              ROOM: <span className="text-white font-mono">{roomId}</span>
          </div>
          <button 
            onClick={() => {
                socket.emit('leave_room', roomId);
                navigate('/');
            }}
            className="text-white/50 hover:text-red-400 transition-colors"
          >
              <IoExitOutline size={24} />
          </button>
      </div>

      <div className={`relative z-10 w-full h-full pointer-events-none p-4 ${isMobile ? 'flex flex-col' : 'grid grid-cols-2 gap-8'}`}>
        
        <div className={`flex flex-col justify-end items-start space-y-4 ${isMobile ? 'flex-1 mb-20' : 'pb-10'}`}>
            <AnimatePresence>
            {messages.filter(m => m.sender === 'partner').slice(-5).map((msg, i) => (
                <motion.div 
                    initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={i} 
                    className="glass-bubble bg-white/10 backdrop-blur-md border border-white/10 px-5 py-3 rounded-r-2xl rounded-tl-2xl text-white text-base shadow-lg max-w-[85%]"
                >
                    {msg.text}
                </motion.div>
            ))}
            </AnimatePresence>
        </div>

        <div className={`flex flex-col justify-end items-end space-y-4 ${isMobile ? 'absolute bottom-4 left-0 w-full px-4' : 'pb-10'}`}>
             
            {/* My recent messages */}
            <div className="flex flex-col space-y-2 items-end opacity-70 w-full">
                {messages.filter(m => m.sender === 'me').slice(-2).map((msg, i) => (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i}
                        className="text-white/80 text-right text-sm bg-black/40 px-3 py-1 rounded-lg backdrop-blur-sm"
                    >
                        {msg.text}
                    </motion.div>
                ))}
            </div>
            
            <div ref={messagesEndRef} />

            {/* INPUT AREA (Placed above My Video on Desktop) */}
            <div className="pointer-events-auto w-full max-w-sm relative">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Whisper..."
                    className="w-full bg-black/50 backdrop-blur-xl border border-white/20 text-white px-5 py-3 rounded-full outline-none focus:border-white/60 transition-all placeholder-white/30 pr-12 shadow-2xl"
                />
                <button 
                    onClick={sendMessage}
                    className="absolute right-2 top-1.5 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
                >
                    <IoSend size={16} />
                </button>
            </div>
            {!isMobile && (
                <div className="w-48 h-32 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/50 backdrop-blur-sm mt-4 pointer-events-auto">
                    <video 
                        ref={myVideo} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover transform scale-x-[-1]" 
                    />
                </div>
            )}
        </div>

      </div>

      {isMobile && (
         <div className="absolute top-16 right-4 w-24 h-32 rounded-lg overflow-hidden border border-white/20 shadow-xl bg-black/50 backdrop-blur-sm z-20 pointer-events-auto">
             <video 
                 ref={myVideo} 
                 autoPlay 
                 playsInline 
                 muted 
                 className="w-full h-full object-cover transform scale-x-[-1]" 
             />
         </div>
      )}

    </div>
  );
};

export default Room;
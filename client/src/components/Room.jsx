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
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Waiting for partner...");
  
  // Refs
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) myVideo.current.srcObject = currentStream;

        // Join Room
        socket.emit('join_room', roomId);

        socket.on('room_full', () => {
            alert("Room is full!");
            navigate('/');
        });

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
            setMessages((prev) => [...prev, { ...data, sender: 'partner' }]);
        });
      });

      // Cleanup
      return () => {
        socket.off();
        if(connectionRef.current) connectionRef.current.destroy();
      }
  }, [roomId, navigate]);


  const sendMessage = () => {
    if(input.trim()) {
      const msgData = { roomId, text: input, senderId: socket.id };
      socket.emit('send_message', msgData);
      setMessages((prev) => [...prev, { text: input, sender: 'me' }]);
      setInput("");
    }
  };

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden flex justify-center items-center">
      
      {/* --- VIDEO LAYER --- */}
      <div className="absolute inset-0 z-0">
        {/* Partner Video (Main Fullscreen) */}
        <video 
          ref={userVideo} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover opacity-90"
        />
        
        {/* Status Indicator (Centered if no video) */}
        {!connectionRef.current && (
            <div className="absolute inset-0 flex items-center justify-center z-0">
                <p className="text-white/30 animate-pulse tracking-widest uppercase">{status}</p>
            </div>
        )}

        {/* My Video (Small PIP, mirrored) */}
        <div className="absolute bottom-5 right-5 w-48 h-32 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/50 backdrop-blur-sm z-20">
             <video 
                ref={myVideo} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform scale-x-[-1]" 
             />
        </div>
      </div>

      {/* --- UI OVERLAY LAYER --- */}
      <div className="absolute inset-0 z-10 grid grid-cols-2 p-8 pointer-events-none">
        
        {/* LEFT: PARTNER MESSAGES */}
        <div className="flex flex-col justify-end items-start space-y-4 pb-20">
            <AnimatePresence>
            {messages.filter(m => m.sender === 'partner').slice(-5).map((msg, i) => (
                <motion.div 
                    initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={i} 
                    className="glass-bubble bg-white/10 backdrop-blur-md border border-white/10 px-6 py-4 rounded-r-3xl rounded-tl-3xl text-white text-lg font-light shadow-lg max-w-md"
                >
                    {msg.text}
                </motion.div>
            ))}
            </AnimatePresence>
        </div>

        {/* RIGHT: MY INPUT & MESSAGES */}
        <div className="flex flex-col justify-end items-end space-y-4 pb-20">
             {/* My recent messages (fading out) */}
            <div className="flex flex-col space-y-2 items-end opacity-70 mb-4">
                {messages.filter(m => m.sender === 'me').slice(-3).map((msg, i) => (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i}
                        className="text-white/80 text-right text-sm bg-black/30 px-3 py-1 rounded-lg"
                    >
                        {msg.text}
                    </motion.div>
                ))}
            </div>

            {/* INPUT AREA */}
            <div className="pointer-events-auto w-full max-w-sm relative">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Whisper something..."
                    className="w-full bg-black/40 backdrop-blur-xl border border-white/20 text-white px-6 py-4 rounded-full outline-none focus:border-white/60 focus:bg-black/60 transition-all placeholder-white/30 pr-12"
                />
                <button 
                    onClick={sendMessage}
                    className="absolute right-2 top-2 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
                >
                    <IoSend size={18} />
                </button>
            </div>
        </div>

      </div>

      {/* Header / Controls */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20 pointer-events-auto">
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

    </div>
  );
};

export default Room;
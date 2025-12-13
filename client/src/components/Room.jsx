import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSend, IoExitOutline } from 'react-icons/io5';
import { MdEmojiEmotions } from 'react-icons/md';
import { getMessages } from '../api';

const socket = io("http://localhost:3001", { autoConnect: false });

const EMOJI_LIST = [
    '❤️', '💖', '😍', '😘', '🥰', '🔥', '✨', '🎉',
    '😂', '🤣', '😊', '😁', '😎', '😜', '👻', '💩',
    '👍', '👎', '👏', '🙌', '😮', '😲', '🤔', '👀',
    '😢', '😭', '🥺', '😤', '😡', '🤬', '💔', '🙏'
];

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Waiting...");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingParticles, setFloatingParticles] = useState([]);

  // User Identity
  const [myUserId] = useState(() => {
    const stored = sessionStorage.getItem('u_id');
    if (stored) return stored;
    const newId = Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('u_id', newId);
    return newId;
  });

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const messagesEndRef = useRef(null);

  // --- 1. STABLE PARTICLE GENERATOR (FIXED) ---
  // We use useCallback so this function reference stays stable across renders
  const triggerFloatingParticles = useCallback((emoji) => {
      const newParticles = [];
      for (let i = 0; i < 15; i++) {
          newParticles.push({
              id: Math.random(),
              emoji: emoji,
              x: Math.random() * 100, 
              delay: Math.random() * 0.5,
              duration: 2 + Math.random() * 2,
              size: 20 + Math.random() * 40
          });
      }

      setFloatingParticles((prev) => [...prev, ...newParticles]);

      setTimeout(() => {
          setFloatingParticles((prev) => prev.filter(p => !newParticles.includes(p)));
      }, 4000);
  }, []);

  // --- 2. SOCKET LISTENER (FIXED) ---
  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('join_room', roomId);
    
    socket.off('receive_message');
    
    socket.on('receive_message', (newMsg) => {
        console.log("📨 Message Received:", newMsg);

        setMessages((prev) => {
            if (prev.some(m => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
        });

        // TRIGGER ANIMATION FOR RECEIVER
        // We check if (senderId !== myUserId) so we don't double-animate for the sender
        if (newMsg.type === 'emoji' && newMsg.senderId !== myUserId) {
            triggerFloatingParticles(newMsg.text);
        }
    });

    return () => socket.off('receive_message');
  }, [roomId, myUserId, triggerFloatingParticles]); // Added triggerFloatingParticles to dependencies

  // --- STANDARD LOGIC (Unchanged) ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    getMessages(roomId).then(data => { if(Array.isArray(data)) setMessages(data); });
    return () => window.removeEventListener('resize', handleResize);
  }, [roomId]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
        if (myVideo.current) myVideo.current.srcObject = stream;
        socket.off('user_joined'); socket.off('offer'); socket.off('answer');
        
        socket.on('user_joined', (userId) => {
          const peer = new Peer({ initiator: true, trickle: false, stream });
          peer.on('signal', data => socket.emit('offer', { target: userId, caller: socket.id, sdp: data }));
          peer.on('stream', userStream => { if (userVideo.current) userVideo.current.srcObject = userStream; setStatus("Connected"); });
          socket.on('answer', payload => peer.signal(payload.sdp));
          connectionRef.current = peer;
        });

        socket.on('offer', (payload) => {
          const peer = new Peer({ initiator: false, trickle: false, stream });
          peer.on('signal', data => socket.emit('answer', { target: payload.caller, sdp: data }));
          peer.on('stream', userStream => { if (userVideo.current) userVideo.current.srcObject = userStream; setStatus("Connected"); });
          peer.signal(payload.sdp);
          connectionRef.current = peer;
        });
    }).catch(err => console.error(err));
    return () => { if (connectionRef.current) connectionRef.current.destroy(); };
  }, []);

  const sendMessage = (text = input, type = 'text') => { 
      if (!text.trim()) return;

      const msgData = { roomId, text: text, senderId: myUserId, type: type };

      socket.emit('send_message', msgData);
      
      // TRIGGER ANIMATION LOCALLY (Instant Feedback)
      if (type === 'emoji') {
          triggerFloatingParticles(text);
          setShowEmojiPicker(false);
      } else {
          setInput("");
      }
  };

  const isMine = (msg) => msg.senderId === myUserId;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderMessage = (msg) => {
      if (msg.type === 'emoji') {
          return (
             <motion.div 
                initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-6xl drop-shadow-lg filter"
             >
                 {msg.text}
             </motion.div>
          );
      }
      return (
        <div className={`px-5 py-3 text-base shadow-lg max-w-[85%] ${!isMine(msg) ? 'glass-bubble bg-white/10 backdrop-blur-md border border-white/10 rounded-r-2xl rounded-tl-2xl text-white' : 'text-white/80 text-right bg-black/40 rounded-lg backdrop-blur-sm'}`}>
            {msg.text}
        </div>
      );
  };

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden flex flex-col">
      
      {/* FLOATING PARTICLES */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          <AnimatePresence>
            {floatingParticles.map((particle) => (
                <motion.div
                    key={particle.id}
                    initial={{ y: '110vh', x: `${particle.x}vw`, opacity: 0, scale: 0 }}
                    animate={{ y: '-10vh', opacity: [0, 1, 1, 0], scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: particle.duration, ease: "easeOut", delay: particle.delay }}
                    className="absolute text-4xl"
                    style={{ fontSize: `${particle.size}px`, left: 0 }}
                >
                    {particle.emoji}
                </motion.div>
            ))}
          </AnimatePresence>
      </div>

      {/* BACKGROUND VIDEO */}
      <div className="absolute inset-0 z-0">
        <video ref={userVideo} autoPlay playsInline className="w-full h-full object-cover opacity-80" />
        {!connectionRef.current && (
           <div className="absolute inset-0 flex items-center justify-center"><p className="text-white/30 animate-pulse">{status}</p></div>
        )}
      </div>

      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 pointer-events-auto bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-white/50 text-xs tracking-widest">ROOM: <span className="text-white font-mono">{roomId}</span></div>
          <button onClick={() => { socket.disconnect(); navigate('/'); }} className="text-white/50 hover:text-red-400"><IoExitOutline size={24} /></button>
      </div>

      {/* CHAT UI */}
      <div className={`relative z-10 w-full h-full pointer-events-none p-4 ${isMobile ? 'flex flex-col' : 'grid grid-cols-2 gap-8'}`}>
        <div className={`flex flex-col justify-end items-start space-y-4 ${isMobile ? 'flex-1 mb-20' : 'pb-10'}`}>
            <AnimatePresence>
            {messages.filter(m => !isMine(m)).slice(-5).map((msg, i) => (
                <motion.div initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} key={i}>
                    {renderMessage(msg)}
                </motion.div>
            ))}
            </AnimatePresence>
        </div>

        <div className={`flex flex-col justify-end items-end space-y-4 ${isMobile ? 'absolute bottom-4 left-0 w-full px-4' : 'pb-10'}`}>
            <div className="flex flex-col space-y-2 items-end opacity-70 w-full pointer-events-none">
                {messages.filter(m => isMine(m)).slice(-3).map((msg, i) => (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={i}>
                        {renderMessage(msg)}
                    </motion.div>
                ))}
            </div>
            <div ref={messagesEndRef} />
            
            <div className="pointer-events-auto w-full max-w-sm relative flex items-center gap-2">
                <AnimatePresence>
                {showEmojiPicker && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="absolute bottom-16 left-0 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl z-50 w-full"
                    >
                        <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {EMOJI_LIST.map((emoji) => (
                                <button key={emoji} onClick={() => sendMessage(emoji, 'emoji')} className="text-2xl hover:scale-125 transition-transform p-2">{emoji}</button>
                            ))}
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>

                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-3 rounded-full transition-colors ${showEmojiPicker ? 'bg-white text-black' : 'bg-black/50 text-white hover:bg-white/20'}`}>
                    <MdEmojiEmotions size={22} />
                </button>

                <div className="relative flex-1">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage(input, 'text')} placeholder="Whisper..." className="w-full bg-black/50 backdrop-blur-xl border border-white/20 text-white px-5 py-3 rounded-full outline-none focus:border-white/60 transition-all pr-12 shadow-2xl" />
                    <button onClick={() => sendMessage(input, 'text')} className="absolute right-2 top-1.5 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white"><IoSend size={16} /></button>
                </div>
            </div>

            {!isMobile && (
                <div className="w-48 h-32 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/50 backdrop-blur-sm mt-4 pointer-events-auto">
                    <video ref={myVideo} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                </div>
            )}
        </div>
      </div>

      {isMobile && (
         <div className="absolute top-16 right-4 w-24 h-32 rounded-lg overflow-hidden border border-white/20 shadow-xl bg-black/50 backdrop-blur-sm z-20 pointer-events-auto">
             <video ref={myVideo} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
         </div>
      )}
    </div>
  );
};

export default Room;
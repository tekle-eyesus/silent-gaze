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
  
  // <--- NEW: REFS FOR SCROLLABLE WINDOWS --->
  const partnerWindowRef = useRef(null);
  const myWindowRef = useRef(null);

  // Particle Logic (Kept same)
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

  // Socket Logic (Kept same)
  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('join_room', roomId);
    socket.off('receive_message');
    socket.on('receive_message', (newMsg) => {
        setMessages((prev) => {
            if (prev.some(m => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
        });
        if (newMsg.type === 'emoji' && newMsg.senderId !== myUserId) {
            triggerFloatingParticles(newMsg.text);
        }
    });
    return () => socket.off('receive_message');
  }, [roomId, myUserId, triggerFloatingParticles]);

  // Standard Setup (Kept same)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    getMessages(roomId).then(data => { if(Array.isArray(data)) setMessages(data); });
    return () => window.removeEventListener('resize', handleResize);
  }, [roomId]);

  // WebRTC (Kept same)
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
      if (type === 'emoji') {
          triggerFloatingParticles(text);
          setShowEmojiPicker(false);
      } else {
          setInput("");
      }
  };

  const isMine = (msg) => msg.senderId === myUserId;

  // <--- NEW: AUTO SCROLL BOTH WINDOWS --->
  useEffect(() => {
    if (partnerWindowRef.current) {
        partnerWindowRef.current.scrollTop = partnerWindowRef.current.scrollHeight;
    }
    if (myWindowRef.current) {
        myWindowRef.current.scrollTop = myWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const renderMessage = (msg) => {
      if (msg.type === 'emoji') {
          return (
             <motion.div 
                initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="text-5xl drop-shadow-lg filter my-2 block"
             >
                 {msg.text}
             </motion.div>
          );
      }
      return (
        <div className={`px-4 py-2 text-sm shadow-md max-w-full break-words mb-2 ${!isMine(msg) ? 'bg-white/10 border border-white/10 rounded-r-xl rounded-tl-xl text-white' : 'text-white/90 text-right bg-white/5 border border-white/5 rounded-l-xl rounded-tr-xl'}`}>
            {msg.text}
        </div>
      );
  };

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden flex flex-col">
      
      {/* PARTICLES */}
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

      {/* --- MAIN LAYOUT GRID --- */}
      <div className={`relative z-10 w-full h-full pointer-events-none p-4 pt-16 ${isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-8'}`}>
        
        {/* --- LEFT: PARTNER WINDOW --- */}
        <div className="flex flex-col justify-end h-full">
            {/* The Glass Container */}
            <div 
                ref={partnerWindowRef}
                className={`glass-panel w-full flex flex-col items-start space-y-2 p-4 transition-all ${isMobile ? 'h-[40vh]' : 'h-[60vh]'}`}
            >
                {/* Title Label */}
                <div className="text-xs text-white/30 tracking-widest mb-2 uppercase sticky top-0">Partner Stream</div>
                
                <AnimatePresence>
                    {messages.filter(m => !isMine(m)).map((msg, i) => (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            key={i}
                            className="w-full flex justify-start"
                        >
                            {renderMessage(msg)}
                        </motion.div>
                    ))}
                </AnimatePresence>
                {/* Empty State hint */}
                {messages.filter(m => !isMine(m)).length === 0 && (
                    <div className="text-white/20 text-sm italic mt-10 w-full text-center">Silence...</div>
                )}
            </div>
        </div>

        {/* --- RIGHT: MY WINDOW & INPUT --- */}
        <div className="flex flex-col justify-end h-full relative">
            
            {/* My Messages Container */}
            <div 
                ref={myWindowRef}
                className={`glass-panel w-full flex flex-col items-end space-y-2 p-4 mb-4 transition-all ${isMobile ? 'h-[25vh]' : 'h-[50vh]'}`}
            >
                 <div className="text-xs text-white/30 tracking-widest mb-2 uppercase sticky top-0 w-full text-right">My Stream</div>

                 <AnimatePresence>
                    {messages.filter(m => isMine(m)).map((msg, i) => (
                        <motion.div 
                            initial={{ opacity: 0, x: 10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            key={i}
                            className="w-full flex justify-end"
                        >
                            {renderMessage(msg)}
                        </motion.div>
                    ))}
                 </AnimatePresence>
            </div>
            
            {/* Input Area */}
            <div className="pointer-events-auto w-full max-w-full relative flex items-center gap-2">
                <AnimatePresence>
                {showEmojiPicker && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-16 left-0 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl z-50 w-full"
                    >
                        <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {EMOJI_LIST.map((emoji) => (
                                <button key={emoji} onClick={() => sendMessage(emoji, 'emoji')} className="text-2xl hover:scale-110 transition-transform p-2">{emoji}</button>
                            ))}
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>

                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-3 rounded-full transition-colors ${showEmojiPicker ? 'bg-white text-black' : 'glass-panel text-white hover:bg-white/20'}`}>
                    <MdEmojiEmotions size={22} />
                </button>

                <div className="relative flex-1">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage(input, 'text')} placeholder="Transmit..." className="w-full glass-panel border border-white/20 text-white px-5 py-3 rounded-full outline-none focus:border-white/50 transition-all pr-12" />
                    <button onClick={() => sendMessage(input, 'text')} className="absolute right-2 top-1.5 p-2 hover:bg-white/10 rounded-full text-white"><IoSend size={16} /></button>
                </div>
            </div>

            {/* My Video (Desktop Only) */}
            {!isMobile && (
                <div className="absolute -right-6 top-0 w-40 h-28 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/50 backdrop-blur-sm pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
                    <video ref={myVideo} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                </div>
            )}
        </div>
      </div>

      {isMobile && (
         <div className="absolute top-16 right-4 w-20 h-28 rounded-lg overflow-hidden border border-white/20 shadow-xl bg-black/50 backdrop-blur-sm z-20 pointer-events-auto">
             <video ref={myVideo} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
         </div>
      )}
    </div>
  );
};

export default Room;
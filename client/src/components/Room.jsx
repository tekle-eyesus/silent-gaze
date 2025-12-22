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

const TypingIndicator = () => (
  <motion.div 
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="flex items-center gap-1 px-3 py-2 bg-white/5 rounded-full w-fit mb-2 border border-white/5"
  >
    <span className="text-[10px] text-white/40 mr-1">typing</span>
    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }} className="w-1 h-1 bg-white rounded-full" />
    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} className="w-1 h-1 bg-white rounded-full" />
    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }} className="w-1 h-1 bg-white rounded-full" />
  </motion.div>
);

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
  const [isPartnerTyping, setIsPartnerTyping] = useState(false); // <--- NEW STATE

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
  const partnerWindowRef = useRef(null);
  const myWindowRef = useRef(null);
  const messagesEndRef = useRef(null); 
  const typingTimeoutRef = useRef(null);

  const formatTime = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  // Socket Logic
  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('join_room', roomId);
    socket.off('receive_message');
    
    // --- SOCKET LISTENERS ---
    socket.on('receive_message', (newMsg) => {
        setMessages((prev) => {
            if (prev.some(m => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
        });
        if (newMsg.type === 'emoji' && newMsg.senderId !== myUserId) {
            triggerFloatingParticles(newMsg.text);
        }
        // Force stop typing indicator when message received
        setIsPartnerTyping(false); 
    });

    // Typing Listeners
    socket.on('display_typing', (senderId) => {
        if (senderId !== myUserId) setIsPartnerTyping(true);
    });

    socket.on('hide_typing', (senderId) => {
        if (senderId !== myUserId) setIsPartnerTyping(false);
    });

    return () => {
        socket.off('receive_message');
        socket.off('display_typing');
        socket.off('hide_typing');
    };
  }, [roomId, myUserId, triggerFloatingParticles]);

  // Standard Setup
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    getMessages(roomId).then(data => { if(Array.isArray(data)) setMessages(data); });
    return () => window.removeEventListener('resize', handleResize);
  }, [roomId]);

  // WebRTC
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

  // --- NEW INPUT HANDLER ---
  const handleInputChange = (e) => {
      setInput(e.target.value);
      
      socket.emit('typing_start', roomId);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing_stop', roomId);
      }, 2000);
  };

  const sendMessage = (text = input, type = 'text') => { 
      if (!text.trim()) return;
      
      // Stop typing immediately when sent
      socket.emit('typing_stop', roomId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

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

  useEffect(() => {
    if (partnerWindowRef.current) partnerWindowRef.current.scrollTop = partnerWindowRef.current.scrollHeight;
    if (myWindowRef.current) myWindowRef.current.scrollTop = myWindowRef.current.scrollHeight;
    if (isMobile) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isMobile, isPartnerTyping]); // Scroll when typing appears too!

  const renderMessage = (msg, isDesktopContext = false) => {
      if (msg.type === 'emoji') {
          return (
             <div className={`flex flex-col ${isMine(msg) ? 'items-end' : 'items-start'}`}>
                 <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200 }} className={`text-5xl drop-shadow-lg filter my-1 ${isDesktopContext ? 'block' : 'inline-block'}`}>
                     {msg.text}
                 </motion.div>
                 <span className="text-[10px] text-white/40 px-1">{formatTime(msg.createdAt)}</span>
             </div>
          );
      }

      if (isDesktopContext) {
        return (
            <div className={`px-4 py-2 text-sm shadow-md max-w-full break-words mb-2 flex flex-col ${!isMine(msg) ? 'bg-white/10 border border-white/10 rounded-r-xl rounded-tl-xl text-white' : 'text-white/90 items-end bg-white/5 border border-white/5 rounded-l-xl rounded-tr-xl'}`}>
                <span>{msg.text}</span>
                <span className={`text-[9px] mt-1 ${!isMine(msg) ? 'text-white/40' : 'text-white/30'}`}>{formatTime(msg.createdAt)}</span>
            </div>
        );
      }

      return (
        <div className={`px-4 py-2 text-base shadow-lg max-w-[85%] break-words flex flex-col ${!isMine(msg) ? 'glass-bubble bg-white/10 backdrop-blur-md border border-white/10 rounded-r-2xl rounded-tl-2xl text-white' : 'text-white/80 items-end bg-black/50 border border-white/5 rounded-l-2xl rounded-tr-2xl backdrop-blur-sm'}`}>
            <span>{msg.text}</span>
            <span className={`text-[10px] mt-1 ${!isMine(msg) ? 'text-white/40' : 'text-white/30'}`}>{formatTime(msg.createdAt)}</span>
        </div>
      );
  };

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden flex flex-col">
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          <AnimatePresence>
            {floatingParticles.map((particle) => (
                <motion.div key={particle.id} initial={{ y: '110vh', x: `${particle.x}vw`, opacity: 0, scale: 0 }} animate={{ y: '-10vh', opacity: [0, 1, 1, 0], scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: particle.duration, ease: "easeOut", delay: particle.delay }} className="absolute text-4xl" style={{ fontSize: `${particle.size}px`, left: 0 }}>
                    {particle.emoji}
                </motion.div>
            ))}
          </AnimatePresence>
      </div>

      <div className="absolute inset-0 z-0">
        <video ref={userVideo} autoPlay playsInline className="w-full h-full object-cover opacity-80" />
        {!connectionRef.current && <div className="absolute inset-0 flex items-center justify-center"><p className="text-white/30 animate-pulse">{status}</p></div>}
      </div>

      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 pointer-events-auto bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-white/50 text-xs tracking-widest">ROOM: <span className="text-white font-mono">{roomId}</span></div>
          <button onClick={() => { socket.disconnect(); navigate('/'); }} className="text-white/50 hover:text-red-400"><IoExitOutline size={24} /></button>
      </div>

      {isMobile ? (
         <div className="relative z-10 w-full h-full flex flex-col pt-16 pb-2 pointer-events-none">
            <div className="flex-1 overflow-y-auto px-4 flex flex-col space-y-3 custom-scrollbar pointer-events-auto">
                {messages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`w-full flex ${isMine(msg) ? 'justify-end' : 'justify-start'}`}>
                        {renderMessage(msg, false)}
                    </motion.div>
                ))}
                
                {/* MOBILE TYPING INDICATOR */}
                <AnimatePresence>
                    {isPartnerTyping && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="w-full flex justify-start">
                             <TypingIndicator />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>
            <div className="w-full px-4 pt-2 pointer-events-auto shrink-0">
                <div className="w-full relative flex items-center gap-2">
                    <AnimatePresence>
                        {showEmojiPicker && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-16 left-0 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl z-50 w-full">
                                <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {EMOJI_LIST.map((emoji) => <button key={emoji} onClick={() => sendMessage(emoji, 'emoji')} className="text-2xl p-2">{emoji}</button>)}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-3 rounded-full ${showEmojiPicker ? 'bg-white text-black' : 'bg-black/50 text-white'}`}><MdEmojiEmotions size={22} /></button>
                    <div className="relative flex-1">
                        <input type="text" value={input} onChange={handleInputChange} onKeyDown={(e) => e.key === 'Enter' && sendMessage(input, 'text')} placeholder="Whisper..." className="w-full bg-black/50 backdrop-blur-xl border border-white/20 text-white px-5 py-3 rounded-full outline-none" />
                        <button onClick={() => sendMessage(input, 'text')} className="absolute right-2 top-1.5 p-2 text-white"><IoSend size={16} /></button>
                    </div>
                </div>
            </div>
            <div className="absolute top-16 right-4 w-24 h-32 rounded-lg overflow-hidden border border-white/20 shadow-xl bg-black/50 backdrop-blur-sm z-20 pointer-events-auto">
                 <video ref={myVideo} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
             </div>
         </div>
      ) : (
      <div className="relative z-10 w-full h-full pointer-events-none p-8 pt-20 grid grid-cols-2 gap-8">
        <div className="flex flex-col justify-end items-start h-full">
            <div ref={partnerWindowRef} className="glass-panel w-80 h-96 flex flex-col items-start space-y-2 p-4 transition-all">
                <div className="text-xs text-white/30 tracking-widest mb-2 uppercase sticky top-0">Partner Stream</div>
                <AnimatePresence>
                    {messages.filter(m => !isMine(m)).map((msg, i) => (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="w-full flex justify-start">
                            {renderMessage(msg, true)}
                        </motion.div>
                    ))}
                    {/* DESKTOP TYPING INDICATOR (Inside Partner Window) */}
                    {isPartnerTyping && <TypingIndicator />}
                </AnimatePresence>
            </div>
        </div>
        <div className="flex flex-col justify-end items-end h-full">
            <div ref={myWindowRef} className="glass-panel w-80 h-96 flex flex-col items-end space-y-2 p-4 mb-4 transition-all">
                 <div className="text-xs text-white/30 tracking-widest mb-2 uppercase sticky top-0 w-full text-right">My Stream</div>
                 <AnimatePresence>
                    {messages.filter(m => isMine(m)).map((msg, i) => (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} key={i} className="w-full flex justify-end">
                            {renderMessage(msg, true)}
                        </motion.div>
                    ))}
                 </AnimatePresence>
            </div>
            <div className="w-80 flex flex-col items-end gap-4 pointer-events-auto">
                <div className="w-full relative flex items-center gap-2">
                    <AnimatePresence>
                    {showEmojiPicker && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-16 left-0 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl z-50 w-full">
                            <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {EMOJI_LIST.map((emoji) => <button key={emoji} onClick={() => sendMessage(emoji, 'emoji')} className="text-2xl hover:scale-110 p-2">{emoji}</button>)}
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-3 rounded-full transition-colors ${showEmojiPicker ? 'bg-white text-black' : 'glass-panel text-white hover:bg-white/20'}`}><MdEmojiEmotions size={22} /></button>
                    <div className="relative flex-1">
                        <input type="text" value={input} onChange={handleInputChange} onKeyDown={(e) => e.key === 'Enter' && sendMessage(input, 'text')} placeholder="Transmit..." className="w-full glass-panel border border-white/20 text-white px-5 py-3 rounded-full outline-none focus:border-white/50 transition-all pr-12" />
                        <button onClick={() => sendMessage(input, 'text')} className="absolute right-2 top-1.5 p-2 hover:bg-white/10 rounded-full text-white"><IoSend size={16} /></button>
                    </div>
                </div>
                <div className="w-40 h-28 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/50 backdrop-blur-sm pointer-events-auto opacity-80 hover:opacity-100 transition-opacity">
                    <video ref={myVideo} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                </div>
            </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Room;
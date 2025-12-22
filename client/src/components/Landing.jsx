import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { FaTwitter, FaGithub, FaLinkedin } from 'react-icons/fa';

const Landing = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) navigate(`/room/${roomId}`);
  };

  const createRoom = () => {
    const newId = uuidv4().slice(0, 8); // Short random ID
    navigate(`/room/${newId}`);
  };

  return (
    <div className="h-screen w-full flex flex-col justify-center items-center relative overflow-hidden bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center">
      
      {/* Dark Overlay to make text pop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-0"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 flex flex-col items-center gap-8 p-8 max-w-md w-full"
      >
        {/* Logo / Title */}
        <div className="text-center">
          <h1 className="text-5xl font-thin tracking-[0.2em] text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            SILENT GAZE
          </h1>
          <p className="mt-4 text-white/60 text-sm tracking-widest uppercase">
            Words are loud. Silence is true.
          </p>
        </div>

        {/* Input Box - Glassmorphism */}
        <form onSubmit={joinRoom} className="w-full flex flex-col gap-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="Enter Room Key..."
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center text-xl text-white outline-none focus:border-white/40 focus:bg-white/10 transition-all placeholder:text-white/20"
            />
            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded-xl bg-white/5 blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          <button 
            type="submit"
            className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-gray-200 transition-colors tracking-widest uppercase text-sm"
          >
            Connect
          </button>
        </form>

        <div className="flex items-center w-full gap-4">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-white/30 text-xs">OR</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <button 
          onClick={createRoom}
          className="text-white/50 hover:text-white text-sm tracking-wider underline underline-offset-4 transition-colors"
        >
          Generate New Key
        </button>

        <div className="w-full flex flex-col items-center gap-3 text-white/60 text-sm">
          <span className="tracking-wider uppercase">Find me online</span>
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <a
              href="https://x.com/TekleeyesusM" target='_blank'
              className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FaTwitter aria-hidden />
              <span className="hidden sm:inline">Twitter</span>
            </a>
            <a
              href="https://github.com/tekle-eyesus"    target='_blank'
              className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FaGithub aria-hidden />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <a
              href="https://www.linkedin.com/in/tekleeyesus-munye/" target='_blank'
              className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FaLinkedin aria-hidden />
              <span className="hidden sm:inline">LinkedIn</span>
            </a>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Landing;
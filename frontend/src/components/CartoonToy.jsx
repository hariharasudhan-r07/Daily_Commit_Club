import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

/**
 * CartoonToy - Cute Interactive Animated Companion ("Byte")
 * 
 * Features:
 * - 3D-styled vector illustration with lighting gradients and highlights.
 * - Subtle idle breathing, ear twitch, and blinking animations.
 * - Interactive, accessible nose button (with keyboard support & focus ring).
 * - Click 1: Squish/bounce animation + floating speech bubble "You found the secret! Admin login?".
 * - Click 2: Transition trigger to Admin Login form.
 * - Secret credentials are NEVER embedded or exposed.
 */
export default function CartoonToy({ 
  isAdminMode, 
  onAdminToggle, 
  noseClicks, 
  setNoseClicks 
}) {
  const [isNoseSquished, setIsNoseSquished] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [showHeart, setShowHeart] = useState(false);

  // Periodic natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000);

    return () => clearInterval(blinkInterval);
  }, []);

  const handleNoseClick = () => {
    // Trigger squish animation
    setIsNoseSquished(true);
    setShowHeart(true);
    setTimeout(() => setIsNoseSquished(false), 350);
    setTimeout(() => setShowHeart(false), 800);

    if (isAdminMode) {
      // If already in admin mode, clicking the nose toggles back to user login
      onAdminToggle(false);
      setNoseClicks(0);
      return;
    }

    if (noseClicks === 0) {
      setNoseClicks(1);
    } else if (noseClicks === 1) {
      setNoseClicks(2);
      onAdminToggle(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNoseClick();
    }
  };

  return (
    <div className="toy-companion-wrapper relative flex flex-col items-center select-none">
      
      {/* 1. Speech Bubble / Floating Secret Notification */}
      <div 
        className={`toy-speech-bubble-container absolute -top-16 sm:-top-20 z-20 pointer-events-auto transition-all duration-300 transform ${
          noseClicks === 1 
            ? 'opacity-100 scale-100 translate-y-0' 
            : isAdminMode 
            ? 'opacity-90 scale-95 translate-y-1' 
            : 'opacity-0 scale-90 translate-y-2 pointer-events-none'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="relative bg-[#062416] text-[#ecfdf5] border-2 border-emerald-400/80 rounded-2xl px-4 py-2.5 shadow-[0_10px_25px_rgba(16,185,129,0.35)] text-center max-w-[210px] sm:max-w-[230px] backdrop-blur-md">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold font-display-clean text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
            <span>{isAdminMode ? 'Admin Portal Ready' : 'Secret Discovered!'}</span>
          </div>
          
          <p className="text-[12px] sm:text-[13px] text-emerald-100 font-sans-clean font-medium mt-0.5 leading-snug">
            {isAdminMode 
              ? 'Click my nose to return to member login' 
              : 'You found the secret! Admin login?'}
          </p>

          {!isAdminMode && noseClicks === 1 && (
            <div className="mt-1 text-[10px] text-emerald-400/90 font-mono font-semibold tracking-wide bg-emerald-950/60 py-0.5 px-2 rounded-full border border-emerald-500/30">
              👉 Click nose once more
            </div>
          )}

          {/* Speech bubble tail pointing down to nose */}
          <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-emerald-400" />
        </div>
      </div>

      {/* Floating Sparkle Heart on Boop */}
      {showHeart && (
        <div className="absolute top-8 z-30 pointer-events-none animate-float-fade text-amber-300 text-lg font-bold">
          ✨ Boop! ✨
        </div>
      )}

      {/* 2. Main Character Vector Body */}
      <div className="toy-character-body relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
        
        {/* Soft Ambient Shadow Beneath Toy */}
        <div className="absolute -bottom-2 w-24 h-4 bg-emerald-500/15 rounded-full blur-md pointer-events-none transform scale-y-50" />

        <svg 
          viewBox="0 0 160 160" 
          className="w-full h-full overflow-visible filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
        >
          <defs>
            {/* Body 3D spherical gradient */}
            <radialGradient id="toyBodyGradient" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="45%" stopColor="#10b981" />
              <stop offset="85%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#042f24" />
            </radialGradient>

            {/* Belly highlight gradient */}
            <radialGradient id="toyBellyGradient" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="70%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#10b981" />
            </radialGradient>

            {/* Ear inner gradient */}
            <radialGradient id="toyEarInner" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fbcfe8" />
              <stop offset="80%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#db2777" />
            </radialGradient>

            {/* 3D Shiny Nose Gradient */}
            <radialGradient id="toyNoseGradient" cx="30%" cy="25%" r="70%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#fbbf24" />
              <stop offset="80%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </radialGradient>

            {/* Nose Squish Glow */}
            <radialGradient id="toyNoseActiveGlow" cx="30%" cy="25%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#00ff88" />
              <stop offset="90%" stopColor="#059669" />
              <stop offset="100%" stopColor="#022c22" />
            </radialGradient>

            {/* Cheek blush */}
            <radialGradient id="toyCheekBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(244, 114, 182, 0.7)" />
              <stop offset="100%" stopColor="rgba(244, 114, 182, 0)" />
            </radialGradient>

            {/* Sunglasses / Visor Gradient for Admin Mode */}
            <linearGradient id="adminVisorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
          </defs>

          {/* Group with gentle idle float animation */}
          <g className="animate-toy-idle transform-origin-center">
            
            {/* Left Ear */}
            <g className="animate-ear-left transform-origin-left-ear">
              <ellipse cx="44" cy="40" rx="16" ry="20" fill="url(#toyBodyGradient)" transform="rotate(-25 44 40)" />
              <ellipse cx="45" cy="41" rx="9" ry="12" fill="url(#toyEarInner)" opacity="0.85" transform="rotate(-25 45 41)" />
            </g>

            {/* Right Ear */}
            <g className="animate-ear-right transform-origin-right-ear">
              <ellipse cx="116" cy="40" rx="16" ry="20" fill="url(#toyBodyGradient)" transform="rotate(25 116 40)" />
              <ellipse cx="115" cy="41" rx="9" ry="12" fill="url(#toyEarInner)" opacity="0.85" transform="rotate(25 115 41)" />
            </g>

            {/* Little Antenna with Glowing Bulb */}
            <line x1="80" y1="36" x2="80" y2="20" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
            <circle cx="80" cy="18" r="6" fill={isAdminMode ? "#fbbf24" : "#34d399"} className="animate-pulse" />
            <circle cx="80" cy="18" r="3" fill="#ffffff" />

            {/* Main Round Head/Body */}
            <circle cx="80" cy="85" r="50" fill="url(#toyBodyGradient)" />

            {/* Cute Soft Belly Muzzle / Chin */}
            <ellipse cx="80" cy="96" rx="28" ry="22" fill="url(#toyBellyGradient)" opacity="0.95" />

            {/* Rosy Glowing Cheeks */}
            <ellipse cx="48" cy="93" rx="9" ry="6" fill="url(#toyCheekBlush)" />
            <ellipse cx="112" cy="93" rx="9" ry="6" fill="url(#toyCheekBlush)" />

            {/* EYES */}
            {!isAdminMode ? (
              // Normal Expressive Anime Eyes
              <g className="toy-eyes">
                {isBlinking || noseClicks > 0 ? (
                  // Happy curved arc eyes (^ _ ^) when booped or blinking
                  <g stroke="#032014" strokeWidth="3.5" strokeLinecap="round" fill="none">
                    <path d="M 52 76 Q 60 70 68 76" />
                    <path d="M 92 76 Q 100 70 108 76" />
                  </g>
                ) : (
                  // Normal wide sparkling eyes
                  <>
                    {/* Left Eye */}
                    <g>
                      <circle cx="60" cy="74" r="8" fill="#032014" />
                      {/* Specular highlights */}
                      <circle cx="58" cy="72" r="3.2" fill="#ffffff" />
                      <circle cx="62" cy="76" r="1.4" fill="#ffffff" />
                    </g>
                    {/* Right Eye */}
                    <g>
                      <circle cx="100" cy="74" r="8" fill="#032014" />
                      {/* Specular highlights */}
                      <circle cx="98" cy="72" r="3.2" fill="#ffffff" />
                      <circle cx="102" cy="76" r="1.4" fill="#ffffff" />
                    </g>
                  </>
                )}
              </g>
            ) : (
              // Admin Mode: Cool Cyber-Sunglasses
              <g className="toy-sunglasses filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                <rect x="44" y="66" width="32" height="18" rx="6" fill="url(#adminVisorGrad)" stroke="#34d399" strokeWidth="1.5" />
                <rect x="84" y="66" width="32" height="18" rx="6" fill="url(#adminVisorGrad)" stroke="#34d399" strokeWidth="1.5" />
                <line x1="76" y1="74" x2="84" y2="74" stroke="#34d399" strokeWidth="2.5" />
                {/* Shiny glint across glasses */}
                <line x1="48" y1="69" x2="62" y2="81" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="88" y1="69" x2="102" y2="81" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            )}

            {/* Cute Smile */}
            <path 
              d="M 74 103 Q 80 108 86 103" 
              fill="none" 
              stroke="#042f24" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
            />

            {/* Little Hands/Paws Resting on Chin */}
            <ellipse cx="50" cy="120" rx="8" ry="7" fill="url(#toyBodyGradient)" />
            <ellipse cx="110" cy="120" rx="8" ry="7" fill="url(#toyBodyGradient)" />
            
            {/* Admin Badge on Chest if Admin Mode */}
            {isAdminMode && (
              <g transform="translate(73, 115)">
                <polygon points="7,0 14,4 12,12 7,15 2,12 0,4" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                <circle cx="7" cy="7" r="2.5" fill="#042f24" />
              </g>
            )}

          </g>
        </svg>

        {/* 3. ACCESSIBLE INTERACTIVE NOSE BUTTON */}
        {/* Rendered directly over the SVG nose coordinates (80, 89) for absolute keyboard & touch accessibility */}
        <button
          type="button"
          onClick={handleNoseClick}
          onKeyDown={handleKeyDown}
          aria-label={isAdminMode ? "Admin companion nose - Click to exit admin mode" : "Secret cartoon companion nose - Click to interact"}
          title={isAdminMode ? "Click nose to return to member login" : "Click my nose!"}
          tabIndex={0}
          className={`toy-nose-button absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-6 rounded-full cursor-pointer transition-transform duration-150 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030d08] ${
            isNoseSquished 
              ? 'scale-x-125 scale-y-75' 
              : 'hover:scale-115 active:scale-95'
          }`}
          style={{ zIndex: 15 }}
        >
          {/* 3D Shiny Nose Sphere */}
          <div 
            className={`w-7 h-5 rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.6)] border border-amber-300/40 transition-colors duration-200 relative overflow-hidden ${
              isAdminMode 
                ? 'bg-gradient-to-br from-emerald-300 via-teal-500 to-emerald-800' 
                : isNoseSquished
                ? 'bg-gradient-to-br from-white via-amber-300 to-amber-600'
                : 'bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700'
            }`}
          >
            {/* Nose Specular Highlight Glint */}
            <div className="absolute top-0.5 left-1.5 w-2 h-1 bg-white/90 rounded-full rotate-[-15deg] pointer-events-none" />
          </div>
        </button>

      </div>

      {/* Subtle Caption / Hint */}
      <div className="text-[11px] font-sans-clean text-emerald-400/60 mt-1 font-medium tracking-wide">
        {isAdminMode ? '🛡️ Admin Assistant' : '✨ Club Companion'}
      </div>

    </div>
  );
}

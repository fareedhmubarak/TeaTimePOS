import React, { useEffect, useState } from 'react';
import { XIcon } from './Icons.tsx';

interface OrderPlacedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  invoiceNumber: number;
  totalAmount: number;
}

const OrderPlacedModal: React.FC<OrderPlacedModalProps> = ({ 
  isOpen, 
  onClose, 
  onPrint, 
  invoiceNumber, 
  totalAmount 
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Trigger confetti burst
      setTimeout(() => setShowConfetti(true), 100);
      return () => {
        document.body.style.overflow = 'unset';
        setShowConfetti(false);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 30 }, (_, i) => {
    const angle = (Math.random() - 0.5) * 360;
    const distance = 50 + Math.random() * 100;
    const radians = (angle * Math.PI) / 180;
    return {
      id: i,
      left: 50 + (Math.random() - 0.5) * 20,
      top: 50,
      delay: Math.random() * 0.3,
      duration: 0.5 + Math.random() * 0.5,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 6)],
      translateX: Math.cos(radians) * distance,
      translateY: Math.sin(radians) * distance,
      rotate: angle + 720,
    };
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      {/* Confetti Burst Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiParticles.map(particle => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                backgroundColor: particle.color,
                animation: `confettiBurst ${particle.duration}s ease-out ${particle.delay}s forwards`,
                '--translateX': `${particle.translateX}px`,
                '--translateY': `${particle.translateY}px`,
                '--rotate': `${particle.rotate}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-2xl max-w-xs w-full overflow-hidden animate-burstCracker relative">
        {/* Success Animation */}
        <div className="bg-gradient-to-br from-green-400 to-green-600 p-4 text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="animate-burstScale mb-2">
              <svg 
                className="w-12 h-12 mx-auto text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1 animate-fadeInDelay">
              Order Placed!
            </h2>
            <p className="text-green-50 text-sm">
              Invoice #{invoiceNumber}
            </p>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="p-4 space-y-3">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-xl font-bold text-purple-900">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-all transform hover:scale-105 active:scale-95"
            >
              Close
            </button>
            <button
              onClick={onPrint}
              className="flex-1 px-4 py-2 bg-purple-800 text-white rounded-lg text-sm font-semibold hover:bg-purple-900 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes burstCracker {
          0% { 
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          100% { 
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes burstScale {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.3) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes confettiBurst {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate(var(--translateX), var(--translateY)) scale(0) rotate(var(--rotate));
          }
        }
        @keyframes fadeInDelay {
          from { 
            opacity: 0;
            transform: translateY(-5px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-burstCracker {
          animation: burstCracker 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .animate-burstScale {
          animation: burstScale 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .animate-confettiBurst {
          animation: confettiBurst var(--duration) ease-out var(--delay) forwards;
        }
        .animate-fadeInDelay {
          animation: fadeInDelay 0.4s ease-out 0.3s both;
        }
      `}</style>
    </div>
  );
};

export default OrderPlacedModal;


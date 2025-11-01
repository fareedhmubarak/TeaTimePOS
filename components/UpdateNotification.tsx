import React from 'react';
import { XIcon } from './Icons.tsx';

interface UpdateNotificationProps {
  isVisible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ isVisible, onUpdate, onDismiss }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9998] animate-slideUpNotification">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg shadow-2xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="animate-pulse">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Update Available</p>
            <p className="text-xs text-purple-100">New version is ready. Refresh to update!</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onUpdate}
            className="px-4 py-2 bg-white text-purple-800 rounded-lg font-semibold text-sm hover:bg-purple-50 transition-all transform hover:scale-105 active:scale-95"
          >
            Update
          </button>
          <button
            onClick={onDismiss}
            className="p-1 text-white hover:bg-purple-700 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUpNotification {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUpNotification {
          animation: slideUpNotification 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UpdateNotification;


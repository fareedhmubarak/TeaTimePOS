import React from 'react';
import { ChartBarIcon, DocumentTextIcon, ArrowDownTrayIcon } from './Icons.tsx';

interface HomeScreenProps {
  onNavigate: (view: 'pos' | 'admin') => void;
  installPromptEvent: Event | null;
  onInstallClick: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, installPromptEvent, onInstallClick }) => {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Content */}
        <div className="flex flex-col items-center">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-extrabold text-purple-900 drop-shadow-lg">Welcome to Tea Time</h1>
                <p className="text-lg text-gray-800 font-medium mt-2">Your complete Point of Sale & Management solution.</p>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 ${installPromptEvent ? 'lg:grid-cols-3' : ''} gap-8 w-full max-w-6xl`}>
                <div
                    onClick={() => onNavigate('pos')}
                    className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl border-4 border-transparent hover:border-purple-500 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
                >
                    <div className="bg-purple-100 p-6 rounded-full mb-6">
                        <DocumentTextIcon className="h-16 w-16 text-purple-800" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Billing</h2>
                    <p className="text-gray-600">
                        Go to the Point of Sale screen to manage orders, handle payments, and serve customers quickly.
                    </p>
                </div>
                <div
                    onClick={() => onNavigate('admin')}
                    className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl border-4 border-transparent hover:border-purple-500 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
                >
                    <div className="bg-purple-100 p-6 rounded-full mb-6">
                        <ChartBarIcon className="h-16 w-16 text-purple-800" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h2>
                    <p className="text-gray-600">
                        Access sales reports, track expenses, and view analytics to gain insights into your business performance.
                    </p>
                </div>
                {installPromptEvent && (
                    <div
                        onClick={onInstallClick}
                        className="group bg-green-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-2xl border-4 border-transparent hover:border-green-400 transition-all duration-300 cursor-pointer flex flex-col items-center text-center md:col-span-2 lg:col-span-1"
                    >
                        <div className="bg-white p-6 rounded-full mb-6">
                            <ArrowDownTrayIcon className="h-16 w-16 text-green-700" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Install App</h2>
                        <p>
                            For a faster, offline-ready experience, install the Tea Time POS app directly on your device.
                        </p>
                    </div>
                )}
            </div>
        </div>
    </main>
  );
};

export default HomeScreen;
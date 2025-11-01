import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types.ts';

interface SettingsPageProps {
  appSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ appSettings, onSave }) => {
  const [settings, setSettings] = useState<AppSettings>(appSettings);

  useEffect(() => {
    setSettings(appSettings);
  }, [appSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Application Settings</h1>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Recurring Monthly Expenses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="monthlyRent" className="block text-sm font-medium text-gray-700">Monthly Rent (₹)</label>
              <input
                type="number"
                id="monthlyRent"
                name="monthlyRent"
                value={settings.monthlyRent}
                onChange={handleChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                min="0"
                step="100"
              />
            </div>
            <div>
              <label htmlFor="monthlySalary" className="block text-sm font-medium text-gray-700">Total Monthly Salary (₹)</label>
              <input
                type="number"
                id="monthlySalary"
                name="monthlySalary"
                value={settings.monthlySalary}
                onChange={handleChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                min="0"
                step="100"
              />
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Milk Usage & Cost</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="milkRatePerLiter" className="block text-sm font-medium text-gray-700">Milk Rate per Liter (₹)</label>
              <input
                type="number"
                id="milkRatePerLiter"
                name="milkRatePerLiter"
                value={settings.milkRatePerLiter}
                onChange={handleChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                min="0"
                step="0.5"
              />
            </div>
            <div>
              <label htmlFor="dailyMilkUsageLiters" className="block text-sm font-medium text-gray-700">Avg. Daily Milk Usage (Liters)</label>
              <input
                type="number"
                id="dailyMilkUsageLiters"
                name="dailyMilkUsageLiters"
                value={settings.dailyMilkUsageLiters}
                onChange={handleChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                min="0"
                step="1"
              />
            </div>
          </div>
        </div>
        <div className="pt-4 flex justify-end">
            <button
                type="submit"
                className="py-2 px-6 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors"
            >
                Save Settings
            </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
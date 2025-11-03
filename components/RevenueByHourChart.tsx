import React from 'react';

interface RevenueByHourData {
  hour: number;
  revenue: number;
}

interface RevenueByHourChartProps {
  data: RevenueByHourData[];
}

const RevenueByHourChart: React.FC<RevenueByHourChartProps> = ({ data }) => {
    const maxRevenue = Math.max(...data.map(d => d.revenue), 0) || 1;

    const formatHour = (hour: number) => {
        if (hour === 12) return '12PM';
        if (hour > 12) return `${hour - 12}PM`;
        if (hour === 0) return '12AM';
        return `${hour}AM`;
    }

    const formatCurrency = (value: number) => {
        if (value === 0) return '';
        return `₹${value.toFixed(0)}`;
    }

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm h-full">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Revenue by Hour</h3>
            <p className="text-xs text-gray-500 mb-3">Total sales amount in each hour (5AM - 9PM)</p>
            <div className="h-64 flex items-end justify-between space-x-1 px-2">
                {data.map(({ hour, revenue }) => (
                    <div key={hour} className="flex-1 flex flex-col items-center h-full justify-end group" title={`${formatHour(hour)}: ${formatCurrency(revenue)}`}>
                        {/* Value label above bar */}
                        <span className={`text-[10px] font-semibold ${revenue > 0 ? 'text-gray-700' : 'text-transparent'}`}>
                            {formatCurrency(revenue)}
                        </span>
                        <div className="w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-t-md group-hover:from-purple-600 group-hover:to-purple-400 transition-colors"
                             style={{ height: `${(revenue / maxRevenue) * 100}%` }}>
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1">{formatHour(hour)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RevenueByHourChart;

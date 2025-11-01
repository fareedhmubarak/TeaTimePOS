import React from 'react';

interface OrdersByTimeData {
  hour: number;
  orders: number;
}

interface OrdersByTimeChartProps {
  data: OrdersByTimeData[];
}

const OrdersByTimeChart: React.FC<OrdersByTimeChartProps> = ({ data }) => {
    const maxOrders = Math.max(...data.map(d => d.orders), 0) || 1;

    const formatHour = (hour: number) => {
        if (hour === 12) return '12PM';
        if (hour > 12) return `${hour - 12}PM`;
        if (hour === 0) return '12AM';
        return `${hour}AM`;
    }

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm h-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Orders by Time of Day</h3>
            <div className="h-64 flex items-end justify-between space-x-1 px-2">
                {data.map(({ hour, orders }) => (
                    <div key={hour} className="flex-1 flex flex-col items-center h-full justify-end group" title={`${formatHour(hour)}: ${orders} order(s)`}>
                        <div className="w-full bg-gray-200 rounded-t-md group-hover:bg-gray-300 transition-colors"
                             style={{ height: `${(orders / maxOrders) * 100}%` }}>
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1">{formatHour(hour)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrdersByTimeChart;

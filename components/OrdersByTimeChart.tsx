import React from 'react';

interface OrdersByTimeData {
  hour: number;
  orders: number;
}

interface OrdersByTimeChartProps {
  data: OrdersByTimeData[];
  itemOptions?: string[];
  selectedItem?: string;
  onSelectItem?: (value: string) => void;
}

const OrdersByTimeChart: React.FC<OrdersByTimeChartProps> = ({ data, itemOptions, selectedItem = 'all', onSelectItem }) => {
    const maxOrders = Math.max(...data.map(d => d.orders), 0) || 1;

    const formatHour = (hour: number) => {
        if (hour === 12) return '12PM';
        if (hour > 12) return `${hour - 12}PM`;
        if (hour === 0) return '12AM';
        return `${hour}AM`;
    }

    const totalCount = data.reduce((sum, d) => sum + d.orders, 0);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-800">Orders by Time of Day</h3>
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">Total: {totalCount}</span>
                </div>
                {itemOptions && onSelectItem && (
                  <select
                    value={selectedItem}
                    onChange={(e) => onSelectItem(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white"
                    aria-label="Select item for orders-by-time chart"
                  >
                    <option value="all">All Items</option>
                    {itemOptions.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
            </div>
            <div className="h-64 flex items-end justify-between space-x-1 px-2">
                {data.map(({ hour, orders }) => (
                    <div key={hour} className="flex-1 flex flex-col items-center h-full justify-end group" title={`${formatHour(hour)}: ${orders} order(s)`}>
                        {/* Value label above bar */}
                        <span className={`text-[10px] font-semibold ${orders > 0 ? 'text-gray-700' : 'text-transparent'}`}>{orders}</span>
                        <div className={`w-full rounded-t-md transition-colors ${orders > 0 ? 'bg-gradient-to-t from-purple-600 to-purple-400 group-hover:from-purple-700 group-hover:to-purple-500' : 'bg-gray-200 group-hover:bg-gray-300'}`}
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

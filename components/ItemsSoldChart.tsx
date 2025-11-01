import React from 'react';

interface ItemsSoldData {
    productName: string;
    quantity: number;
}

interface ItemsSoldChartProps {
  data: ItemsSoldData[];
}

const ItemsSoldChart: React.FC<ItemsSoldChartProps> = ({ data }) => {
    const maxQuantity = Math.max(...data.map(d => d.quantity), 0) || 1;
    
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm h-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Top Items Sold</h3>
            <div className="space-y-3 pr-2">
                {data.length > 0 ? data.map(item => (
                    <div key={item.productName} className="grid grid-cols-6 gap-2 items-center text-xs">
                        <span className="font-medium text-gray-600 truncate col-span-2" title={item.productName}>
                            {item.productName}
                        </span>
                        <div className="col-span-3 flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className="bg-purple-600 h-4 rounded-full"
                                    style={{ width: `${(item.quantity / maxQuantity) * 100}%` }}
                                    title={`Sold: ${item.quantity}`}
                                >
                                </div>
                            </div>
                        </div>
                         <span className="font-semibold text-gray-800 text-right">{item.quantity}</span>
                    </div>
                )) : (
                     <div className="h-64 flex items-center justify-center text-sm text-gray-500">
                        No item data for this period.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemsSoldChart;

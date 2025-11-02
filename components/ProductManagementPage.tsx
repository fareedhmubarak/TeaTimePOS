import React, { useState, useMemo } from 'react';
import { Product } from '../types.ts';
import ProductModal from './ProductModal.tsx';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon } from './Icons.tsx';

interface ProductManagementPageProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: number) => void;
}

const ProductManagementPage: React.FC<ProductManagementPageProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const openModalForNew = () => {
        setEditingProduct(null);
        setModalOpen(true);
    };

    const openModalForEdit = (product: Product) => {
        setEditingProduct(product);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingProduct(null);
    };

    const handleSave = (productData: Omit<Product, 'id'>, id?: number) => {
        if (id) {
            onUpdateProduct({ ...productData, id });
        } else {
            onAddProduct(productData);
        }
        closeModal();
    };
    
    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [products, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <h1 className="text-xl font-bold text-gray-800">Manage Products</h1>
                <button onClick={openModalForNew} className="flex items-center bg-purple-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow hover:bg-purple-700 transition-colors text-base">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add New Product
                </button>
            </div>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full bg-white border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-base"
                />
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="max-h-[70vh] overflow-y-auto">
                    <table className="w-full text-base text-left text-gray-500">
                        <thead className="text-sm text-gray-700 uppercase bg-gray-100 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3 text-right">Price</th>
                                <th scope="col" className="px-6 py-3 text-right">Profit</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => (
                                <tr key={product.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                                    <td className="px-6 py-4">{product.category}</td>
                                    <td className="px-6 py-4 text-right">₹{product.price.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">₹{product.profit.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center items-center space-x-2">
                                            <button onClick={() => openModalForEdit(product)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full">
                                                <PencilIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => onDeleteProduct(product.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                             {filteredProducts.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-500 text-base">No products found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isModalOpen && (
                <ProductModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSave}
                    productToEdit={editingProduct}
                    products={products}
                />
            )}
        </div>
    );
};

export default ProductManagementPage;
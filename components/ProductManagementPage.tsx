import React, { useState, useMemo } from 'react';
import { Product, Category } from '../types.ts';
import ProductModal from './ProductModal.tsx';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, ArrowUpIcon, ArrowDownIcon } from './Icons.tsx';
import { supabase } from '../supabaseClient.ts';

interface ProductManagementPageProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: number) => void;
  onCategoryAdded?: () => void;
}

const ProductManagementPage: React.FC<ProductManagementPageProps> = ({ 
  products, 
  categories,
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct,
  onCategoryAdded
}) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    // Get unique product categories (for filtering)
    const productCategories = useMemo(() => {
        const cats = Array.from(new Set(products.map(p => p.category))).sort();
        return cats;
    }, [products]);

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

    // Filter products by category and search term, then sort by display_order
    const filteredProducts = useMemo(() => {
        let filtered = products;
        
        if (selectedCategory) {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }
        
        if (searchTerm) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        
        // Sort by display_order (ascending), then by name
        return filtered.sort((a, b) => {
            const aOrder = a.displayOrder || 0;
            const bOrder = b.displayOrder || 0;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            return a.name.localeCompare(b.name);
        });
    }, [products, selectedCategory, searchTerm]);

    // Update product display order by moving up/down
    const handleMoveProduct = async (productId: number, direction: 'up' | 'down') => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const categoryProducts = products
            .filter(p => p.category === product.category)
            .sort((a, b) => {
                const aOrder = a.displayOrder || 0;
                const bOrder = b.displayOrder || 0;
                if (aOrder !== bOrder) return aOrder - bOrder;
                return a.name.localeCompare(b.name);
            });

        const currentIndex = categoryProducts.findIndex(p => p.id === productId);
        if (currentIndex === -1) return;

        let targetIndex: number;
        if (direction === 'up' && currentIndex > 0) {
            targetIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < categoryProducts.length - 1) {
            targetIndex = currentIndex + 1;
        } else {
            return; // Can't move
        }

        const targetProduct = categoryProducts[targetIndex];
        const currentOrder = product.displayOrder || currentIndex + 1;
        const targetOrder = targetProduct.displayOrder || targetIndex + 1;

        // Swap display orders
        try {
            // Update current product
            const { error: error1 } = await supabase
                .from('products')
                .update({ display_order: targetOrder })
                .eq('id', productId);

            if (error1) throw error1;

            // Update target product
            const { error: error2 } = await supabase
                .from('products')
                .update({ display_order: currentOrder })
                .eq('id', targetProduct.id);

            if (error2) throw error2;

            // Update local state
            onUpdateProduct({ ...product, displayOrder: targetOrder });
            onUpdateProduct({ ...targetProduct, displayOrder: currentOrder });
        } catch (error: any) {
            console.error('Failed to update product order:', error);
            alert(`Failed to update product order: ${error.message}`);
        }
    };

    // Handle drag and drop for product ordering
    const [draggedProductId, setDraggedProductId] = useState<number | null>(null);
    const [dragOverProductId, setDragOverProductId] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, productId: number) => {
        setDraggedProductId(productId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', productId.toString());
    };

    const handleDragOver = (e: React.DragEvent, productId: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedProductId !== productId) {
            setDragOverProductId(productId);
        }
    };

    const handleDragLeave = () => {
        setDragOverProductId(null);
    };

    const handleDrop = async (e: React.DragEvent, targetProductId: number) => {
        e.preventDefault();
        setDragOverProductId(null);

        if (!draggedProductId || draggedProductId === targetProductId) {
            setDraggedProductId(null);
            return;
        }

        const draggedProduct = products.find(p => p.id === draggedProductId);
        const targetProduct = products.find(p => p.id === targetProductId);

        if (!draggedProduct || !targetProduct || draggedProduct.category !== targetProduct.category) {
            setDraggedProductId(null);
            return;
        }

        // Get all products in the same category, sorted by current order
        const categoryProducts = products
            .filter(p => p.category === draggedProduct.category)
            .sort((a, b) => {
                const aOrder = a.displayOrder || 0;
                const bOrder = b.displayOrder || 0;
                if (aOrder !== bOrder) return aOrder - bOrder;
                return a.name.localeCompare(b.name);
            });

        const draggedIndex = categoryProducts.findIndex(p => p.id === draggedProductId);
        const targetIndex = categoryProducts.findIndex(p => p.id === targetProductId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedProductId(null);
            return;
        }

        // Swap the display orders
        const draggedOrder = draggedProduct.displayOrder || draggedIndex + 1;
        const targetOrder = targetProduct.displayOrder || targetIndex + 1;

        try {
            // Update dragged product
            const { error: error1 } = await supabase
                .from('products')
                .update({ display_order: targetOrder })
                .eq('id', draggedProductId);

            if (error1) throw error1;

            // Update target product
            const { error: error2 } = await supabase
                .from('products')
                .update({ display_order: draggedOrder })
                .eq('id', targetProductId);

            if (error2) throw error2;

            // Update local state
            onUpdateProduct({ ...draggedProduct, displayOrder: targetOrder });
            onUpdateProduct({ ...targetProduct, displayOrder: draggedOrder });
        } catch (error: any) {
            console.error('Failed to update product order:', error);
            alert(`Failed to update product order: ${error.message}`);
        }

        setDraggedProductId(null);
    };

    const handleDragEnd = () => {
        setDraggedProductId(null);
        setDragOverProductId(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <h1 className="text-xl font-bold text-gray-800">Manage Products</h1>
                <button onClick={openModalForNew} className="flex items-center bg-purple-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow hover:bg-purple-700 transition-colors text-base">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add New Product
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end">
                {/* Category Filter */}
                <div className="flex-1 w-full sm:w-auto">
                    <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Category
                    </label>
                    <select
                        id="category-filter"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="block w-full bg-white border border-gray-300 rounded-md py-2.5 px-4 text-base"
                    >
                        <option value="">All Categories</option>
                        {productCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="flex-1 w-full sm:w-auto relative">
                    <label htmlFor="search-products" className="block text-sm font-medium text-gray-700 mb-2">
                        Search Products
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            id="search-products"
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full bg-white border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-base"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="max-h-[70vh] overflow-y-auto">
                    <table className="w-full text-base text-left text-gray-500">
                        <thead className="text-sm text-gray-700 uppercase bg-gray-100 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">Order</th>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3 text-right">Price</th>
                                <th scope="col" className="px-6 py-3 text-right">Profit</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product, index) => {
                                const categoryProducts = products.filter(p => p.category === product.category);
                                const sortedCategoryProducts = categoryProducts.sort((a, b) => {
                                    const aOrder = a.displayOrder || 0;
                                    const bOrder = b.displayOrder || 0;
                                    if (aOrder !== bOrder) return aOrder - bOrder;
                                    return a.name.localeCompare(b.name);
                                });
                                const categoryIndex = sortedCategoryProducts.findIndex(p => p.id === product.id);
                                const canMoveUp = categoryIndex > 0;
                                const canMoveDown = categoryIndex < sortedCategoryProducts.length - 1;

                                const isDragging = draggedProductId === product.id;
                                const isDragOver = dragOverProductId === product.id;
                                
                                return (
                                    <tr 
                                        key={product.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, product.id)}
                                        onDragOver={(e) => handleDragOver(e, product.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, product.id)}
                                        onDragEnd={handleDragEnd}
                                        className={`bg-white border-b hover:bg-gray-50 cursor-move transition-colors ${
                                            isDragging ? 'opacity-50' : ''
                                        } ${
                                            isDragOver ? 'bg-purple-100 border-purple-300' : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="flex items-center justify-center w-8 h-8 rounded border-2 border-dashed border-gray-300 text-gray-400 text-sm font-medium">
                                                    {product.displayOrder || categoryIndex + 1}
                                                </div>
                                                <span className="text-xs text-gray-500">Drag to reorder</span>
                                            </div>
                                        </td>
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
                                );
                            })}
                             {filteredProducts.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-base">No products found.</td></tr>
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
                    categories={categories}
                    onCategoryAdded={onCategoryAdded}
                />
            )}
        </div>
    );
};

export default ProductManagementPage;

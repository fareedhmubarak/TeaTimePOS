import React, { useState } from 'react';

interface CategorySidebarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onReorderCategories?: (newOrder: string[]) => void;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory, 
  isOpen, 
  onClose,
  onReorderCategories 
}) => {
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, category: string) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedCategory !== category) {
      setDragOverCategory(category);
    }
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDrop = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    setDragOverCategory(null);

    if (!draggedCategory || draggedCategory === targetCategory || !onReorderCategories) {
      setDraggedCategory(null);
      return;
    }

    const draggedIndex = categories.indexOf(draggedCategory);
    const targetIndex = categories.indexOf(targetCategory);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedCategory(null);
      return;
    }

    // Reorder categories
    const newCategories = [...categories];
    const [removed] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, removed);

    onReorderCategories(newCategories);
    setDraggedCategory(null);
  };

  const handleDragEnd = () => {
    setDraggedCategory(null);
    setDragOverCategory(null);
  };

  return (
    <aside className={`w-48 bg-purple-800 text-white flex-shrink-0 fixed inset-y-0 left-0 z-30 pt-12 transform transition-transform duration-300 ease-in-out md:relative md:w-40 md:translate-x-0 md:pt-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1">
          {categories.map((category) => {
            const isDragging = draggedCategory === category;
            const isDragOver = dragOverCategory === category;
            
            return (
              <li 
                key={category} 
                draggable={!!onReorderCategories}
                onDragStart={(e) => handleDragStart(e, category)}
                onDragOver={(e) => handleDragOver(e, category)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, category)}
                onDragEnd={handleDragEnd}
                className={`px-2 ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'bg-purple-600' : ''} ${onReorderCategories ? 'cursor-move' : ''}`}
              >
                <button
                  onClick={() => onSelectCategory(category)}
                  className={`w-full text-left text-sm font-semibold py-2.5 px-3 rounded-md transition-colors duration-200 ${
                    selectedCategory === category
                      ? 'bg-white text-purple-900'
                      : 'hover:bg-purple-700 text-white'
                  }`}
                >
                  {category}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default CategorySidebar;
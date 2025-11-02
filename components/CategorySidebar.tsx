import React from 'react';

interface CategorySidebarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({ categories, selectedCategory, onSelectCategory, isOpen, onClose }) => {
  return (
    <aside className={`w-48 bg-purple-800 text-white flex-shrink-0 fixed inset-y-0 left-0 z-30 pt-12 transform transition-transform duration-300 ease-in-out md:relative md:w-40 md:translate-x-0 md:pt-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1">
          {categories.map((category) => (
            <li key={category} className="px-2">
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
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default CategorySidebar;
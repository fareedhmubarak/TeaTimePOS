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
    <aside className={`w-64 bg-purple-800 text-white flex-shrink-0 fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:w-48 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
       <nav className="mt-4">
        <ul>
          {categories.map((category) => (
            <li key={category} className="px-2">
              <button
                onClick={() => onSelectCategory(category)}
                className={`w-full text-left text-sm font-semibold p-3 my-1 rounded-md transition-colors duration-200 ${
                  selectedCategory === category
                    ? 'bg-white text-purple-900'
                    : 'hover:bg-purple-700'
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
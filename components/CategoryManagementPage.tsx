import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.ts';
import { Category } from '../types.ts';
import { ArrowUpIcon, ArrowDownIcon } from './Icons.tsx';

const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      setMessage({ type: 'error', text: `Failed to load categories: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    if (categories.length === 0) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const updatedCategories = [...categories];
    const temp = updatedCategories[index];
    updatedCategories[index] = updatedCategories[newIndex];
    updatedCategories[newIndex] = temp;

    // Update display_order for all categories
    const categoriesToUpdate = updatedCategories.map((cat, idx) => ({
      id: cat.id,
      display_order: idx + 1,
    }));

    setSaving(true);
    try {
      // Update all categories in parallel
      const updatePromises = categoriesToUpdate.map((cat) =>
        supabase
          .from('categories')
          .update({ display_order: cat.display_order, updated_at: new Date().toISOString() })
          .eq('id', cat.id)
      );

      await Promise.all(updatePromises);

      setCategories(updatedCategories);
      setMessage({ type: 'success', text: 'Category order saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error updating category order:', error);
      setMessage({ type: 'error', text: `Failed to save order: ${error.message}` });
      // Reload to get correct order
      loadCategories();
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async (name: string) => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Category name cannot be empty' });
      return;
    }

    if (categories.some(cat => cat.name.toUpperCase() === name.toUpperCase())) {
      setMessage({ type: 'error', text: 'Category already exists' });
      return;
    }

    try {
      setSaving(true);
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.display_order)) 
        : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: name.trim().toUpperCase(),
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data]);
      setMessage({ type: 'success', text: `Category "${name}" added successfully!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error adding category:', error);
      setMessage({ type: 'error', text: `Failed to add category: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"? This will not delete products in this category.`)) {
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Reorder remaining categories
      const remainingCategories = categories.filter(c => c.id !== id);
      const reorderPromises = remainingCategories.map((cat, idx) =>
        supabase
          .from('categories')
          .update({ display_order: idx + 1, updated_at: new Date().toISOString() })
          .eq('id', cat.id)
      );

      await Promise.all(reorderPromises);

      setCategories(remainingCategories);
      setMessage({ type: 'success', text: `Category "${name}" deleted successfully!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error deleting category:', error);
      setMessage({ type: 'error', text: `Failed to delete category: ${error.message}` });
      loadCategories();
    } finally {
      setSaving(false);
    }
  };

  const [newCategoryName, setNewCategoryName] = useState('');

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-800"></div>
          <p className="mt-4 text-gray-600 text-base">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Category Management</h2>

        {message && (
          <div
            className={`mb-4 p-4 rounded-md text-base ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Add New Category */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Category</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addCategory(newCategoryName);
                  setNewCategoryName('');
                }
              }}
              placeholder="Enter category name"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
            />
            <button
              onClick={() => {
                addCategory(newCategoryName);
                setNewCategoryName('');
              }}
              disabled={saving || !newCategoryName.trim()}
              className="px-6 py-2 bg-purple-800 text-white rounded-md hover:bg-purple-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-base"
            >
              Add
            </button>
          </div>
        </div>

        {/* Category List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Category Order</h3>
          <p className="text-gray-600 mb-4 text-base">
            Drag categories up or down to reorder them. The order will be reflected in the POS sidebar.
          </p>

          {categories.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-base">No categories found. Add a category above.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((category, index) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-base font-semibold text-gray-600 w-8 text-center">
                      {index + 1}
                    </span>
                    <span className="text-base font-semibold text-gray-800 flex-1">
                      {category.name}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => moveCategory(index, 'up')}
                      disabled={index === 0 || saving}
                      className="p-2 text-purple-800 hover:bg-purple-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ArrowUpIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => moveCategory(index, 'down')}
                      disabled={index === categories.length - 1 || saving}
                      className="p-2 text-purple-800 hover:bg-purple-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ArrowDownIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id, category.name)}
                      disabled={saving}
                      className="px-4 py-2 text-red-600 hover:bg-red-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-base"
                      title="Delete category"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementPage;


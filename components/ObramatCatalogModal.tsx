import React, { useState, useMemo } from 'react';
import { OBRAMAT_CATEGORIES, OBRAMAT_PRODUCTS, ObramatProduct } from '../obramat-catalog';

interface ObramatCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: ObramatProduct) => void;
}

export const ObramatCatalogModal: React.FC<ObramatCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(OBRAMAT_CATEGORIES[0]);

  const filteredProducts = useMemo(() => {
    let list = OBRAMAT_PRODUCTS;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.nameEs.toLowerCase().includes(q) || 
        p.nameRu.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q)
      );
    } else {
      list = list.filter(p => p.category === selectedCategory);
    }
    
    return list;
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[700px]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
              <span className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black tracking-widest uppercase">OBRAMAT</span>
              Справочник товаров
            </h3>
            <p className="text-xs text-slate-400 mt-1">Быстрый выбор оригинальных строительных материалов</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-8 py-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Поиск по названию (цемент, кабель, tubo, placa...)" 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:border-indigo-500 focus:bg-white transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Categories Sidebar (Only visible if not searching) */}
          {!searchQuery && (
            <div className="w-1/3 border-r border-slate-100 bg-slate-50/50 p-4 overflow-y-auto space-y-1.5">
              {OBRAMAT_CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat;
                const shortName = cat.split(' ')[0];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {shortName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Products List */}
          <div className={`flex-1 p-6 overflow-y-auto ${searchQuery ? 'w-full' : 'w-2/3'}`}>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
              {searchQuery ? `Результаты поиска (${filteredProducts.length})` : selectedCategory}
            </h4>
            
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-2xl mb-2">📦</p>
                <p className="text-xs font-bold">Ничего не найдено</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map(prod => (
                  <div 
                    key={prod.id} 
                    className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-all flex justify-between items-center gap-4 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate">{prod.nameRu}</p>
                      <p className="text-xs text-slate-400 italic font-medium mt-0.5 truncate">{prod.nameEs}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">
                          {prod.defaultUnit}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[9px] font-black">
                          ~ {prod.approxPrice} €
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(prod)}
                      className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all shrink-0 active:scale-95"
                    >
                      + Выбрать
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart } from '../context/CartContext.js';

interface Variant {
  id: number;
  size: string;
  color: string;
  stockQuantity: number;
  priceAdjustment?: number;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  image_url: string;
  category_name?: string;
  variants?: Variant[];
}

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { addItem } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    product.variants && product.variants.length > 0 ? product.variants[0].id : null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId);
  const isOutOfStock = !selectedVariant || selectedVariant.stockQuantity <= 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedVariantId || isOutOfStock) return;

    try {
      setIsAdding(true);
      setErrorMsg(null);
      await addItem(selectedVariantId, 1);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot add item');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(product)}
      className="group cursor-pointer bg-[#0e0e0e] border border-[#1e1e1e] hover:border-[#383838] transition-all duration-300 flex flex-col justify-between"
    >
      {/* Product Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#161616]">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {product.compare_at_price && product.compare_at_price > product.price && (
          <span className="absolute top-2 left-2 bg-[#e63946] text-white text-[10px] font-black uppercase px-2 py-0.5 tracking-wider">
            SALE
          </span>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-xs font-bold tracking-widest text-red-400 uppercase bg-black px-3 py-1 border border-red-900">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      {/* Product Details Section */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-sm font-black tracking-wide uppercase text-white font-heading truncate">
            {product.name}
          </h3>
          <p className="text-xs text-[#8e8e93] mt-0.5 truncate">
            {selectedVariant ? `${selectedVariant.color} / ${selectedVariant.size}` : 'Standard Edition'}
          </p>

          <div className="flex items-center space-x-2 mt-2">
            <span className="text-sm font-extrabold text-white">
              ${Number(product.price).toFixed(2)} USD
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs text-gray-500 line-through">
                ${Number(product.compare_at_price).toFixed(2)}
              </span>
            )}
          </div>

          {/* Quick Variant Size Selector if multiple sizes */}
          {product.variants && product.variants.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`text-[10px] px-2 py-1 font-semibold uppercase transition-colors ${
                    selectedVariantId === v.id
                      ? 'bg-white text-black font-bold'
                      : 'bg-[#181818] text-gray-400 hover:text-white border border-[#282828]'
                  } ${v.stockQuantity <= 0 ? 'opacity-40 line-through' : ''}`}
                >
                  {v.size}
                </button>
              ))}
            </div>
          )}

          {errorMsg && (
            <p className="text-[11px] text-[#e63946] mt-2 font-medium">{errorMsg}</p>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleQuickAdd}
          disabled={isOutOfStock || isAdding}
          className={`w-full mt-4 py-2.5 px-4 text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
            addedSuccess
              ? 'bg-green-600 text-white'
              : isOutOfStock
              ? 'bg-[#1a1a1a] text-gray-500 cursor-not-allowed border border-[#242424]'
              : 'bg-[#141414] hover:bg-white text-white hover:text-black border border-[#2b2b2b]'
          }`}
        >
          {addedSuccess ? (
            <>
              <Check size={14} />
              <span>ADDED</span>
            </>
          ) : isOutOfStock ? (
            <span>OUT OF STOCK</span>
          ) : (
            <>
              <ShoppingBag size={14} />
              <span>{isAdding ? 'ADDING...' : 'ADD TO CART'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};


import React, { useEffect, useState } from 'react';
import { Search, Filter, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '../components/ProductCard.js';
import { productApi } from '../services/api.js';

interface CatalogPageProps {
  initialCategory?: string;
  initialQuery?: string;
  onSelectProduct: (product: any) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialCategory,
  initialQuery,
  onSelectProduct,
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery || '');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [maxPrice, setMaxPrice] = useState<number>(150);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(false);

  // Sync props when navigation changes
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (initialQuery !== undefined) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Load categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await productApi.getCategories();
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch filtered & paginated products
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const params: any = {
          page: currentPage,
          limit: 8,
          sortBy,
          inStock: inStockOnly ? 'true' : undefined,
          maxPrice: maxPrice < 150 ? maxPrice : undefined,
        };

        if (selectedCategory && selectedCategory !== 'all') {
          params.category = selectedCategory;
        }

        if (searchQuery.trim()) {
          params.q = searchQuery.trim();
        }

        const data = await productApi.getProducts(params);
        setProducts(data.products || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      } catch (err) {
        console.error('Failed to fetch catalog:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [selectedCategory, searchQuery, sortBy, inStockOnly, maxPrice, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Page Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#222222]">
        <div>
          <span className="text-[#e63946] text-xs font-black uppercase tracking-widest">
            COLLECTION & ARCHIVE
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold uppercase text-white font-bebas tracking-wide mt-1">
            {selectedCategory === 'all'
              ? 'ALL STREETWEAR DROPS'
              : selectedCategory.replace('-', ' ').toUpperCase()}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Showing {totalCount} authentic pieces curated for NYC pavement.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Filter by keyword..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#121212] border border-[#2b2b2b] text-white text-xs px-3 py-2.5 pl-9 focus:outline-none focus:border-white transition-colors placeholder-gray-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
        </form>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111111] p-4 border border-[#222222]">
        
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setCurrentPage(1);
            }}
            className={`text-xs px-3 py-1.5 font-bold uppercase tracking-wider transition-colors ${
              selectedCategory === 'all'
                ? 'bg-white text-black'
                : 'bg-[#181818] text-gray-400 hover:text-white border border-[#262626]'
            }`}
          >
            All Drops
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => {
                setSelectedCategory(cat.slug);
                setCurrentPage(1);
              }}
              className={`text-xs px-3 py-1.5 font-bold uppercase tracking-wider transition-colors ${
                selectedCategory === cat.slug
                  ? 'bg-white text-black'
                  : 'bg-[#181818] text-gray-400 hover:text-white border border-[#262626]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort and Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 uppercase font-semibold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#181818] border border-[#333333] text-white text-xs px-2.5 py-1.5 focus:outline-none focus:border-white"
            >
              <option value="featured">Featured Drops</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
              <option value="name_asc">Alphabetical (A-Z)</option>
            </select>
          </div>

          <button
            onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
            className="flex items-center space-x-1.5 bg-[#181818] border border-[#333333] text-xs font-bold uppercase tracking-wider text-gray-200 px-3 py-1.5 hover:text-white"
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Expandable Advanced Filter Panel */}
      {filterDrawerOpen && (
        <div className="bg-[#141414] border border-[#262626] p-6 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
              Maximum Price: ${maxPrice} USD
            </label>
            <input
              type="range"
              min="20"
              max="150"
              step="5"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full accent-[#e63946]"
            />
            <div className="flex justify-between text-[11px] text-gray-500 mt-1">
              <span>$20</span>
              <span>$150+</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-4 md:pt-2">
            <input
              type="checkbox"
              id="inStockOnly"
              checked={inStockOnly}
              onChange={(e) => {
                setInStockOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="w-4 h-4 accent-[#e63946] rounded-none bg-[#1c1c1c] border-[#333333]"
            />
            <label htmlFor="inStockOnly" className="text-xs font-bold uppercase tracking-wider text-gray-200 cursor-pointer">
              Hide Out of Stock Pieces
            </label>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-96 bg-[#121212] animate-pulse border border-[#222222]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-[#121212] border border-[#222222] p-8">
          <p className="text-lg font-bold uppercase text-white font-heading">
            No pieces found matching your criteria
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Try adjusting your search terms, changing the category, or clearing the price filters.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
              setMaxPrice(150);
              setInStockOnly(false);
              setCurrentPage(1);
            }}
            className="mt-6 bg-white text-black text-xs font-black px-6 py-3 uppercase tracking-wider hover:bg-gray-200"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-8 border-t border-[#222222]">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-[#333333] bg-[#141414] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#222222]"
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-9 h-9 text-xs font-extrabold uppercase transition-colors ${
                  currentPage === pageNum
                    ? 'bg-white text-black'
                    : 'bg-[#141414] border border-[#333333] text-gray-300 hover:text-white hover:bg-[#222222]'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-[#333333] bg-[#141414] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#222222]"
            aria-label="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};


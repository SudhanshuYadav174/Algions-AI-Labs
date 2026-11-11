import React, { useState } from 'react';
import { Search, User, ShoppingBag, Menu, X, ShieldAlert, Package, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';

interface NavbarProps {
  onNavigate: (view: string, params?: any) => void;
  activeView: string;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, activeView, onOpenAuth }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount, setIsOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navLinks = [
    { label: 'NEW ARRIVALS', category: 'new-arrivals' },
    { label: 'MEN', category: 'men' },
    { label: 'WOMEN', category: 'women' },
    { label: 'ACCESSORIES', category: 'accessories' },
    { label: 'SALE', category: 'sale' },
    { label: 'ABOUT', view: 'about' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('catalog', { q: searchQuery.trim() });
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#222222]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Left: Mobile Menu Button & Brand Logo */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white hover:text-gray-300 p-2"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-2 text-left group"
            >
              <div className="bg-white text-black font-extrabold text-lg px-2 py-0.5 tracking-tighter">
                UT
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-wider text-white font-bebas leading-none">
                  URBAN THREADS
                </span>
                <span className="text-[9px] uppercase tracking-widest text-[#888888] font-semibold">
                  New York • Streetwear
                </span>
              </div>
            </button>
          </div>

          {/* Center: Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  if (link.view) onNavigate(link.view);
                  else onNavigate('catalog', { category: link.category });
                }}
                className={`text-xs font-bold tracking-widest hover:text-white transition-colors uppercase ${
                  link.label === 'SALE' ? 'text-[#e63946] hover:text-red-400' : 'text-[#a0a0a0]'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right: Actions (Search, User, Cart) */}
          <div className="flex items-center space-x-5">
            {/* Search Trigger */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="text-gray-300 hover:text-white transition-colors p-1"
              aria-label="Search Catalog"
            >
              <Search size={20} />
            </button>

            {/* User Dropdown / Login */}
            <div className="relative">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-1.5 text-gray-300 hover:text-white p-1"
                  >
                    <User size={20} />
                    <span className="hidden lg:inline text-xs font-medium text-gray-300 max-w-[100px] truncate">
                      {user?.fullName.split(' ')[0]}
                    </span>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-[#141414] border border-[#2a2a2a] rounded-md shadow-2xl py-2 z-50">
                      <div className="px-4 py-2 border-b border-[#222222]">
                        <p className="text-xs text-gray-400">Signed in as</p>
                        <p className="text-sm font-bold text-white truncate">{user?.fullName}</p>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-[#262626] text-gray-300 mt-1 inline-block">
                          {user?.role}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#202020] hover:text-white flex items-center space-x-2"
                      >
                        <User size={14} />
                        <span>Profile & Addresses</span>
                      </button>

                      <button
                        onClick={() => {
                          onNavigate('orders');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#202020] hover:text-white flex items-center space-x-2"
                      >
                        <Package size={14} />
                        <span>Order History</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            onNavigate('admin');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-[#e63946] hover:bg-[#202020] flex items-center space-x-2 font-bold"
                        >
                          <ShieldAlert size={14} />
                          <span>Admin Dashboard</span>
                        </button>
                      )}

                      <div className="border-t border-[#222222] my-1"></div>

                      <button
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                          onNavigate('home');
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-400 hover:bg-[#202020] hover:text-white flex items-center space-x-2"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center space-x-1 text-gray-300 hover:text-white p-1 text-xs font-bold tracking-wider"
                >
                  <User size={20} />
                </button>
              )}
            </div>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-1 text-gray-300 hover:text-white transition-colors"
              aria-label="View Shopping Bag"
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#e63946] text-white text-[10px] font-black rounded-full h-4 w-4 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Search Input */}
        {searchOpen && (
          <div className="py-3 border-t border-[#222222] animate-fadeIn">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search products, streetwear silhouettes, colors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-[#141414] border border-[#333333] text-white text-sm px-4 py-2.5 pl-10 focus:outline-none focus:border-white transition-colors rounded-none placeholder-gray-500"
              />
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <button
                type="submit"
                className="absolute right-2 top-2 bg-white text-black text-xs font-bold px-3 py-1 uppercase tracking-wider hover:bg-gray-200"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#111111] border-b border-[#222222] px-6 py-6 space-y-4">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => {
                if (link.view) onNavigate(link.view);
                else onNavigate('catalog', { category: link.category });
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left text-sm font-bold tracking-widest text-gray-200 hover:text-white py-2 border-b border-[#222222]"
            >
              {link.label}
            </button>
          ))}
          {!isAuthenticated && (
            <button
              onClick={() => {
                onOpenAuth();
                setMobileMenuOpen(false);
              }}
              className="w-full bg-white text-black text-xs font-bold py-3 uppercase tracking-wider text-center block mt-4"
            >
              Sign In / Register
            </button>
          )}
        </div>
      )}
    </header>
  );
};


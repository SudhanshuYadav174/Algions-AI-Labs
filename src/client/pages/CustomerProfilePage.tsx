import React, { useState, useEffect } from 'react';
import { User, MapPin, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { authApi } from '../services/api.js';

interface Address {
  id: number;
  full_name: string;
  phone: string;
  street_address: string;
  apartment?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export const CustomerProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Address Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const data = await authApi.getProfile();
      setAddresses(data.addresses || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg(null);
      await authApi.addAddress({
        fullName,
        phone,
        streetAddress,
        apartment: apartment || undefined,
        city,
        state,
        postalCode,
        country: 'United States',
        isDefault,
      });

      setSuccessMsg('Address added successfully');
      setShowAddForm(false);
      setStreetAddress('');
      setApartment('');
      setCity('');
      setState('');
      setPostalCode('');
      await fetchAddresses();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!window.confirm('Delete this saved address?')) return;
    try {
      await authApi.deleteAddress(id);
      await fetchAddresses();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete address');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Profile Header */}
      <div className="bg-[#111111] border border-[#222222] p-6 flex items-center space-x-4">
        <div className="w-14 h-14 bg-white text-black font-extrabold text-xl flex items-center justify-center font-bebas">
          UT
        </div>
        <div>
          <h1 className="text-xl font-black uppercase text-white font-heading">{user?.fullName}</h1>
          <p className="text-xs text-gray-400">{user?.email}</p>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#222222] text-gray-300 mt-1 inline-block">
            {user?.role} Account
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-950/60 border border-green-800 p-4 text-xs text-green-200 flex items-center space-x-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-950/60 border border-red-800 p-4 text-xs text-red-200 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Address Book Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-[#222222]">
          <h2 className="text-sm font-black uppercase tracking-wider text-white font-heading flex items-center space-x-2">
            <MapPin size={16} className="text-[#e63946]" />
            <span>Saved Shipping Addresses</span>
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-white hover:bg-gray-200 text-black text-xs font-bold px-3 py-1.5 uppercase tracking-wider flex items-center space-x-1"
          >
            <Plus size={14} />
            <span>{showAddForm ? 'Cancel' : 'Add Address'}</span>
          </button>
        </div>

        {/* Add Address Form */}
        {showAddForm && (
          <form onSubmit={handleAddAddress} className="bg-[#141414] border border-[#2e2e2e] p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">New Shipping Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full bg-[#1c1c1c] border border-[#333333] text-white text-xs px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-[#1c1c1c] border border-[#333333] text-white text-xs px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Street Address *</label>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                required
                className="w-full bg-[#1c1c1c] border border-[#333333] text-white text-xs px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full bg-[#1c1c1c] border border-[#333333] text-white text-xs px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">State *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  className="w-full bg-[#1c1c1c] border border-[#333333] text-white text-xs px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Postal Code *</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required
                  className="w-full bg-[#1c1c1c] border border-[#333333] text-white text-xs px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="defaultAddress"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 accent-[#e63946]"
              />
              <label htmlFor="defaultAddress" className="text-xs text-gray-300">Set as default shipping address</label>
            </div>

            <button
              type="submit"
              className="w-full bg-white text-black font-bold text-xs py-2.5 uppercase tracking-wider hover:bg-gray-200 mt-2"
            >
              Save Address
            </button>
          </form>
        )}

        {/* Address Cards List */}
        {loading ? (
          <div className="text-xs text-gray-400">Loading address book...</div>
        ) : addresses.length === 0 ? (
          <div className="bg-[#111111] border border-[#222222] p-6 text-center text-xs text-gray-400">
            No saved addresses found. Add one above to speed up future checkouts.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-[#111111] border border-[#222222] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-white uppercase">{addr.full_name}</p>
                    {addr.is_default && (
                      <span className="text-[10px] font-bold uppercase bg-[#242424] text-green-400 px-2 py-0.5">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 mt-2">{addr.street_address}</p>
                  {addr.apartment && <p className="text-xs text-gray-400">{addr.apartment}</p>}
                  <p className="text-xs text-gray-400">{addr.city}, {addr.state} {addr.postal_code}</p>
                  <p className="text-xs text-gray-500 mt-1">{addr.phone}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#1c1c1c] flex justify-end">
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-gray-500 hover:text-red-400 text-xs flex items-center space-x-1"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


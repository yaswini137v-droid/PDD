import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Contacts = () => {
  const [contactsData, setContactsData] = useState([
    { id: '', name: '', phone: '', countryCode: '+91' },
    { id: '', name: '', phone: '', countryCode: '+91' },
    { id: '', name: '', phone: '', countryCode: '+91' }
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const { apiRequest } = useAuth();

  const fetchContacts = async () => {
    try {
      const res = await apiRequest('/api/contacts');
      if (res.success) {
        const mapped = [
          { id: '', name: '', phone: '', countryCode: '+91' },
          { id: '', name: '', phone: '', countryCode: '+91' },
          { id: '', name: '', phone: '', countryCode: '+91' }
        ];
        res.data.forEach((contact, idx) => {
          if (idx < 3) {
            let phone = contact.phone || '';
            let code = '+91';
            if (phone.startsWith('+91')) {
              phone = phone.substring(3).trim();
              code = '+91';
            } else if (phone.startsWith('+')) {
              if (phone.length > 3) {
                code = phone.substring(0, 3);
                phone = phone.substring(3).trim();
              }
            }
            mapped[idx] = {
              id: contact._id || '',
              name: contact.name || '',
              phone: phone,
              countryCode: code
            };
          }
        });
        setContactsData(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleInputChange = (index, field, value) => {
    const updated = [...contactsData];
    updated[index][field] = value;
    setContactsData(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    // Validate: if Name is filled, Phone must be filled and vice versa
    for (let i = 0; i < 3; i++) {
      const { name, phone } = contactsData[i];
      if ((name && !phone) || (!name && phone)) {
        setMessage({ text: `Please fill both Name and Phone for Contact ${i + 1}`, type: 'error' });
        return;
      }
    }

    setSaving(true);

    try {
      for (let i = 0; i < 3; i++) {
        const { id, name, phone, countryCode } = contactsData[i];
        const fullPhone = phone ? `${countryCode}${phone}` : '';

        if (name && phone) {
          if (id) {
            // Update existing contact
            await apiRequest(`/api/contacts/${id}`, {
              method: 'PUT',
              body: JSON.stringify({ name, phone: fullPhone, relationship: `Contact ${i + 1}` }),
            });
          } else {
            // Create new contact
            await apiRequest('/api/contacts', {
              method: 'POST',
              body: JSON.stringify({ name, phone: fullPhone, relationship: `Contact ${i + 1}` }),
            });
          }
        } else if (!name && !phone && id) {
          // Delete removed contact
          await apiRequest(`/api/contacts/${id}`, {
            method: 'DELETE',
          });
        }
      }

      setMessage({ text: 'Guardian contacts updated successfully!', type: 'success' });
      await fetchContacts();
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Connection failure occurred while saving.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-12 font-sans relative overflow-hidden select-none">
      {/* Background Glow */}
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-[#FF6D6D]/5 blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 z-10 relative">
        {/* Navigation header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors shadow-sm">
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-[#FF6D6D] mb-0.5">
                <Shield className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Guard System</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white leading-none">Trusted Contacts</h1>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl border text-sm text-center font-medium ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-zinc-500 text-sm">
            <div className="w-8 h-8 border-4 border-zinc-800 border-t-[#FF6D6D] rounded-full animate-spin mx-auto mb-3"></div>
            Loading guardians directory...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contactsData.map((contact, index) => (
                <div 
                  key={index}
                  className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl space-y-6"
                >
                  <h3 className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
                    CONTACT {index + 1}
                  </h3>
                  
                  {/* Name field */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                      placeholder="Name"
                      className="w-full px-4 py-3 bg-transparent border border-zinc-800 focus:border-[#FF6D6D] text-white text-sm rounded-xl transition-all outline-none"
                    />
                  </div>

                  {/* Phone Row */}
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-3 bg-transparent border border-zinc-800 rounded-xl">
                      <span className="text-base leading-none">🇮🇳</span>
                      <span className="text-sm text-zinc-400 font-mono font-medium">{contact.countryCode}</span>
                    </div>
                    
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => handleInputChange(index, 'phone', e.target.value)}
                      placeholder="Phone"
                      className="flex-1 w-full px-4 py-3 bg-transparent border border-zinc-800 focus:border-[#FF6D6D] text-white text-sm rounded-xl transition-all outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full md:w-auto px-10 py-4 bg-[#FF6D6D] hover:bg-[#ff7e7e] disabled:bg-zinc-800 text-white text-base font-semibold rounded-full shadow-md shadow-[#FF6D6D]/10 hover:shadow-[#FF6D6D]/20 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'SAVE & CONTINUE'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Contacts;


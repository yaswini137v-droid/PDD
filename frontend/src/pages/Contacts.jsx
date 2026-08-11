import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Trash2, Plus, Users, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { apiRequest } = useAuth();

  const fetchContacts = async () => {
    try {
      const res = await apiRequest('/api/contacts');
      if (res.success) {
        setContacts(res.data);
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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await apiRequest('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (res.success) {
        setFormData({ name: '', phone: '', email: '', relationship: '' });
        fetchContacts();
      } else {
        setError(res.message);
      }
    } catch (err) {
      console.error(err);
      setError('Connection failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this emergency contact?')) return;
    try {
      const res = await apiRequest(`/api/contacts/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        fetchContacts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Emergency Contacts</h1>
              <p className="text-sm text-slate-500 font-medium">Manage guardians who will be notified in safety emergencies</p>
            </div>
          </div>
        </div>

        {/* Main Grid split */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Add form */}
          <div className="glass-panel p-6 h-fit shadow-sm border border-slate-200/50">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <UserCheck className="w-5 h-5 text-blue-600" /> Add Guardian
            </h2>

            {error && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200/60 text-red-600 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Guardian's Name"
                  className="w-full glass-input text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 98765 43210"
                  className="w-full glass-input text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="guardian@example.com"
                  className="w-full glass-input text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Relationship</label>
                <input
                  type="text"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleInputChange}
                  placeholder="Mother, Father, Spouse, Friend"
                  className="w-full glass-input text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 text-sm mt-4"
              >
                <Plus className="w-4 h-4" /> Add Guardian
              </button>
            </form>
          </div>

          {/* Grid listing existing contacts */}
          <div className="md:col-span-2 space-y-4">
            <div className="glass-panel p-6 shadow-sm border border-slate-200/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
                <Users className="w-5 h-5 text-slate-400" /> Guardian Contacts Directory
              </h2>

              {loading ? (
                <div className="text-center py-10 text-slate-400 text-sm">Loading guardians directory...</div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  No emergency contacts configured yet. Add at least one guardian above to receive SOS triggers!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {contacts.map((contact) => (
                    <div 
                      key={contact._id}
                      className="p-4 bg-white border border-slate-200/60 rounded-2xl flex justify-between items-start transition-all hover:scale-[1.01] shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-800 text-base leading-none">{contact.name}</p>
                          {contact.relationship && (
                            <span className="text-[9px] bg-blue-600/10 border border-blue-600/20 text-blue-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {contact.relationship}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 font-mono pt-1">{contact.phone}</p>
                        {contact.email && (
                          <p className="text-xs text-slate-400 truncate">{contact.email}</p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleDelete(contact._id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Contacts;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Shield, ShieldAlert, Key, Edit, LogOut, CheckCircle, Info, Calendar } from 'lucide-react';

const Profile = () => {
  const { user, logout, updateProfile, changePassword, deleteAccount, apiRequest } = useAuth();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'settings', 'password'
  
  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState((user?.phone || '').replace(/^\+91/, ''));
  const [gender, setGender] = useState(user?.gender || 'Female');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [dob, setDob] = useState(user?.dob || '');

  // Contact 1 Form States
  const [c1Name, setC1Name] = useState('');
  const [c1Phone, setC1Phone] = useState('');
  const [c1Id, setC1Id] = useState('');

  // Settings State (Persisted in localStorage)
  const [sosNotifications, setSosNotifications] = useState(() => localStorage.getItem('sosNotifications') !== 'false');
  const [liveLocationSharing, setLiveLocationSharing] = useState(() => localStorage.getItem('liveLocationSharing') !== 'false');
  const [confirmBeforeSending, setConfirmBeforeSending] = useState(() => localStorage.getItem('confirmBeforeSending') !== 'false');
  const [countdownSeconds, setCountdownSeconds] = useState(() => parseInt(localStorage.getItem('countdownDuration') || '5', 10));

  // Change Password States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const res = await apiRequest('/api/contacts');
      if (res.success) {
        setContacts(res.data);
        if (res.data.length > 0) {
          const contact1 = res.data[0];
          setC1Name(contact1.name || '');
          setC1Phone((contact1.phone || '').replace(/^\+91/, ''));
          setC1Id(contact1._id || '');
        }
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    if ((c1Name && !c1Phone) || (!c1Name && c1Phone)) {
      setMessage({ text: 'Please fill both Name and Phone for Contact 1', type: 'error' });
      setSaving(false);
      return;
    }

    try {
      // 1. Update Profile
      const profRes = await updateProfile({
        name,
        phone: `+91${phone}`,
        gender,
        bloodGroup,
        dob,
      });

      if (!profRes.success) {
        throw new Error(profRes.message || 'Profile update failed');
      }

      // 2. Save Contact 1
      if (c1Name && c1Phone) {
        const fullPhone = `+91${c1Phone}`;
        if (c1Id) {
          await apiRequest(`/api/contacts/${c1Id}`, {
            method: 'PUT',
            body: JSON.stringify({ name: c1Name, phone: fullPhone, relationship: 'Contact 1' }),
          });
        } else {
          await apiRequest('/api/contacts', {
            method: 'POST',
            body: JSON.stringify({ name: c1Name, phone: fullPhone, relationship: 'Contact 1' }),
          });
        }
      } else if (!c1Name && !c1Phone && c1Id) {
        await apiRequest(`/api/contacts/${c1Id}`, {
          method: 'DELETE',
        });
      }

      setMessage({ text: 'Profile details saved successfully!', type: 'success' });
      fetchContacts();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to save details', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('sosNotifications', sosNotifications.toString());
    localStorage.setItem('liveLocationSharing', liveLocationSharing.toString());
    localStorage.setItem('confirmBeforeSending', confirmBeforeSending.toString());
    localStorage.setItem('countdownDuration', countdownSeconds.toString());
    setMessage({ text: 'Preferences saved successfully!', type: 'success' });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match', type: 'error' });
      return;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await changePassword(oldPassword, newPassword);
      if (res.success) {
        setMessage({ text: 'Password changed successfully!', type: 'success' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ text: res.message || 'Failed to update password', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Server error updating password', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you absolutely sure you want to delete your account? This is irreversible.')) {
      try {
        const res = await deleteAccount();
        if (res.success) {
          navigate('/login');
        } else {
          setMessage({ text: res.message || 'Account delete failed', type: 'error' });
        }
      } catch (err) {
        setMessage({ text: 'Server error deleting account', type: 'error' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col font-sans">
      {/* Header */}
      <header className="py-4 px-6 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-lg font-bold text-slate-800">My Profile & Settings</h1>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </header>

      {/* Main split grid */}
      <main className="flex-grow p-4 md:p-8 max-w-[1200px] w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left pane: Navigation menu card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 text-center shadow-sm">
            {/* Avatar circle */}
            <div className="w-24 h-24 bg-[#FFBABA] rounded-full mx-auto flex items-center justify-center mb-4 shadow-inner">
              <User className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{user?.name}</h2>
            <p className="text-sm text-slate-400 font-medium mb-6">{user?.email}</p>

            <div className="space-y-1 text-left">
              <button
                onClick={() => { setActiveTab('details'); setMessage({ text: '', type: '' }); }}
                className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-3 ${
                  activeTab === 'details' ? 'bg-[#xFFFF] border border-coral-200 text-pink-600 bg-pink-50' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Personal Details</span>
              </button>
              <button
                onClick={() => { setActiveTab('settings'); setMessage({ text: '', type: '' }); }}
                className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-3 ${
                  activeTab === 'settings' ? 'bg-[#xFFFF] border border-coral-200 text-pink-600 bg-pink-50' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Preferences & Safety</span>
              </button>
              <button
                onClick={() => { setActiveTab('password'); setMessage({ text: '', type: '' }); }}
                className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-3 ${
                  activeTab === 'password' ? 'bg-[#xFFFF] border border-coral-200 text-pink-600 bg-pink-50' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Change Password</span>
              </button>
            </div>
          </div>

          {/* Quick Help Guide */}
          <div className="bg-slate-800 rounded-2xl text-white p-6 shadow-sm border border-slate-700/60 space-y-4">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#FF6D6D] border-b border-slate-700 pb-2 flex items-center gap-2">
              <Info className="w-4 h-4" /> How It Works
            </h3>
            
            <div className="space-y-4 text-xs">
              {[
                { n: 1, t: 'SafeZone', d: 'Use the SOS button directly from the main screen when you are in danger. The countdown gives you time to cancel before the SOS is activated.' },
                { n: 2, t: 'Geofence', d: 'Save important places such as Home, College, or Office as safe places.' },
                { n: 3, t: 'Journey', d: 'Start a one-time journey when travelling to a destination. The app can monitor the journey and location status.' },
                { n: 4, t: 'SOS', d: 'When SOS is activated, the emergency process can use your saved emergency contacts and location information.' },
                { n: 5, t: 'History', d: 'View previous safety activity, journeys, and emergency-related events in the History section.' },
                { n: 6, t: 'Privacy', d: 'Your profile and safety information are associated with your account and stored securely.' }
              ].map((item) => (
                <div key={item.n} className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-[#FF6D6D] text-white rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {item.n}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[13px]">{item.t}</h4>
                    <p className="text-slate-400 mt-0.5 leading-relaxed">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right pane: Action form sheet */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm flex flex-col min-h-[400px]">
          
          {/* Notifications banner */}
          {message.text && (
            <div className={`p-4 rounded-xl border mb-6 text-sm font-bold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          {/* Dynamic tabs */}
          {activeTab === 'details' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-2">Personal Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 font-semibold text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="px-3 border border-slate-200 bg-slate-50 rounded-xl flex items-center gap-1 font-bold text-sm text-slate-500">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-grow px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 font-mono font-semibold text-slate-750"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 font-semibold text-slate-750"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 font-semibold text-slate-750"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Date of Birth</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 font-semibold text-slate-750"
                    />
                  </div>
                </div>
              </div>

              <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-2 pt-4">CONTACT 1</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Contact Name</label>
                  <input
                    type="text"
                    value={c1Name}
                    onChange={(e) => setC1Name(e.target.value)}
                    placeholder="e.g. Mom"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 font-semibold text-slate-750"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Contact Phone</label>
                  <div className="flex gap-2">
                    <div className="px-3 border border-slate-200 bg-slate-50 rounded-xl flex items-center gap-1 font-bold text-sm text-slate-500">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={c1Phone}
                      onChange={(e) => setC1Phone(e.target.value)}
                      placeholder="9000575108"
                      className="flex-grow px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 font-mono font-semibold text-slate-750"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#FF6D6D] text-white font-bold text-sm rounded-xl hover:bg-red-500 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'SAVE & CONTINUE'}
              </button>
            </form>
          )}

          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-2">Preferences & Safety</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">SOS Alert Notifications</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Alert guardians with web push signals during SOS event</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sosNotifications}
                    onChange={(e) => setSosNotifications(e.target.checked)}
                    className="w-4 h-4 accent-[#FF6D6D]"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Live Location Sharing</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Allow authorized responder tracking metrics</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={liveLocationSharing}
                    onChange={(e) => setLiveLocationSharing(e.target.checked)}
                    className="w-4 h-4 accent-[#FF6D6D]"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Confirm Before Sending SOS</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Show confirmation button modal before alarm</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={confirmBeforeSending}
                    onChange={(e) => setConfirmBeforeSending(e.target.checked)}
                    className="w-4 h-4 accent-[#FF6D6D]"
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-2">SOS Countdown Duration</label>
                  <select
                    value={countdownSeconds}
                    onChange={(e) => setCountdownSeconds(parseInt(e.target.value, 10))}
                    className="px-4 py-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value={3}>3 seconds</option>
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#FF6D6D] text-white font-bold text-sm rounded-xl hover:bg-red-500 transition-all cursor-pointer shadow-md"
                >
                  SAVE PREFERENCES
                </button>
              </div>

              <h3 className="text-base font-extrabold text-red-650 border-b border-red-100 pb-2 pt-6">Danger Zone</h3>
              <div className="p-4 bg-red-50 rounded-xl border border-red-200/50 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-red-800">Permanently Delete Account</h4>
                  <p className="text-xs text-red-600 mt-0.5">Clear all emergency data logs and telemetry routes</p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md uppercase transition-all"
                >
                  Delete Account
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-6">
              <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-2">Change Password</h3>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Current Password</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 font-semibold text-slate-750"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 font-semibold text-slate-750"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 font-semibold text-slate-750"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#FF6D6D] text-white font-bold text-sm rounded-xl hover:bg-red-500 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'UPDATE PASSWORD'}
              </button>
            </form>
          )}

        </div>
      </main>
    </div>
  );
};

export default Profile;

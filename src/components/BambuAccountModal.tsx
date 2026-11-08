import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Cloud,
  Globe,
  Key,
  Lock,
  LogOut,
  Mail,
  Printer,
  RefreshCw,
  Server,
  ShieldCheck,
  Smartphone,
  User,
  Wifi,
  X,
  Plus,
} from 'lucide-react';
import type {
  BambuAccountProfile,
  BambuBoundPrinter,
  BambuCloudRegion,
} from '../types/slicer';

interface BambuAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: BambuAccountProfile;
  onUpdateAccount: (updated: BambuAccountProfile) => void;
  onSelectActivePrinter: (printer: BambuBoundPrinter) => void;
}

const REGION_SERVERS: { id: BambuCloudRegion; label: string; host: string }[] = [
  { id: 'us', label: 'North America', host: 'us.mqtt.bambulab.com' },
  { id: 'eu', label: 'Europe', host: 'eu.mqtt.bambulab.com' },
  { id: 'global', label: 'Global / Asia Pacific', host: 'global.mqtt.bambulab.com' },
  { id: 'cn', label: 'China', host: 'cn.mqtt.bambulab.com' },
];

export const BambuAccountModal: React.FC<BambuAccountModalProps> = ({
  isOpen,
  onClose,
  account,
  onUpdateAccount,
  onSelectActivePrinter,
}) => {
  // Login Form State
  const [emailInput, setEmailInput] = useState('bambu.maker@carbon-studio.io');
  const [passwordInput, setPasswordInput] = useState('••••••••••••');
  const [regionInput, setRegionInput] = useState<BambuCloudRegion>('us');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Printer Binding Form State
  const [showAddPrinter, setShowAddPrinter] = useState(false);
  const [newSerial, setNewSerial] = useState('');
  const [newAccessCode, setNewAccessCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newModel, setNewModel] = useState<BambuBoundPrinter['model']>('Bambu Lab X1 Carbon');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setErrorMsg('Please enter a valid Bambu Lab account email.');
      return;
    }
    if (passwordInput.length < 4) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    setTimeout(() => {
      setIsSubmitting(false);
      const nickname = emailInput.split('@')[0];
      const updated: BambuAccountProfile = {
        ...account,
        isLoggedIn: true,
        accountEmail: emailInput.trim(),
        nickname: nickname.charAt(0).toUpperCase() + nickname.slice(1),
        region: regionInput,
        authToken: `bbl_tk_${Math.random().toString(36).substring(2, 12)}`,
        cloudPrintEnabled: true,
        cloudSyncStatus: 'synced',
        lastSyncedIso: new Date().toISOString(),
      };
      onUpdateAccount(updated);
      setSuccessMsg('Successfully connected to Bambu Lab Cloud!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 600);
  };

  const handleLogout = () => {
    onUpdateAccount({
      ...account,
      isLoggedIn: false,
      authToken: '',
      cloudSyncStatus: 'offline',
    });
    setSuccessMsg('Signed out of Bambu Lab Cloud.');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleToggleCloudPrinting = () => {
    onUpdateAccount({
      ...account,
      cloudPrintEnabled: !account.cloudPrintEnabled,
    });
  };

  const handleSelectPrinter = (devId: string) => {
    const target = account.boundPrinters.find((p) => p.devId === devId);
    if (target) {
      onUpdateAccount({
        ...account,
        selectedPrinterDevId: devId,
      });
      onSelectActivePrinter(target);
    }
  };

  const handleSyncCloud = () => {
    onUpdateAccount({
      ...account,
      cloudSyncStatus: 'syncing',
    });
    setTimeout(() => {
      onUpdateAccount({
        ...account,
        cloudSyncStatus: 'synced',
        lastSyncedIso: new Date().toISOString(),
      });
      setSuccessMsg('Cloud presets and printer telemetry synchronized.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 700);
  };

  const handleAddBoundPrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerial.trim() || newSerial.trim().length < 8) {
      setErrorMsg('Serial number must be at least 8 characters (e.g. 00M09A351800421).');
      return;
    }
    if (!newAccessCode.trim()) {
      setErrorMsg('Enter the 8-character LAN Access Code from printer touchscreen.');
      return;
    }

    const newPrinter: BambuBoundPrinter = {
      devId: newSerial.trim().toUpperCase(),
      name: newName.trim() || `${newModel} (${newSerial.trim().slice(-4)})`,
      model: newModel,
      online: true,
      ip: '192.168.1.150',
      accessCode: newAccessCode.trim(),
      firmwareVersion: '01.07.03.00',
      amsCount: newModel.includes('mini') ? 0 : 1,
      cloudMqttHost: REGION_SERVERS.find((r) => r.id === account.region)?.host || 'us.mqtt.bambulab.com',
      nozzleDiameter: 0.4,
    };

    onUpdateAccount({
      ...account,
      boundPrinters: [...account.boundPrinters, newPrinter],
      selectedPrinterDevId: newPrinter.devId,
    });
    onSelectActivePrinter(newPrinter);
    setShowAddPrinter(false);
    setNewSerial('');
    setNewAccessCode('');
    setNewName('');
    setSuccessMsg(`Bound new ${newPrinter.name} to Bambu Studio!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bambu-account-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 id="bambu-account-modal-title" className="text-base font-bold text-slate-100">
                Bambu Studio Cloud Account
              </h2>
              <p className="text-xs text-slate-400">
                Manage cloud credentials, bound printers, and wireless OTA printing
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-950/80 border-b border-rose-800/80 text-rose-200 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
          {!account.isLoggedIn ? (
            /* LOGIN FORM VIEW */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Direct Wireless Printing via Bambu Lab Cloud
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Log in with your official Bambu Lab account to automatically discover bound X1 Carbon printers, print wirelessly over the internet, and receive real-time camera and telemetry updates.
                </p>
              </div>

              {/* Quick Fill Demo Button */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Need instant testing?</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmailInput('bambu.maker@carbon-studio.io');
                    setPasswordInput('BambuLabX1C#2026');
                    setRegionInput('us');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Quick Fill Demo Studio Account
                </button>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Bambu Account Email
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="user@domain.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-sm text-slate-100 placeholder-slate-600 outline-hidden font-mono"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Bambu Password
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter account password"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-sm text-slate-100 placeholder-slate-600 outline-hidden font-mono"
                  required
                />
              </div>

              {/* Cloud Region */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Cloud Region Server
                </label>
                <select
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value as BambuCloudRegion)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-xs text-slate-100 outline-hidden"
                >
                  {REGION_SERVERS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} ({r.host})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2FA / Code (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    Verification Code / Access Token (Optional)
                  </label>
                  <span className="text-[11px] text-slate-500">If 2FA enabled</span>
                </div>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6-digit code or Bambu User Token"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-xs text-slate-100 placeholder-slate-600 outline-hidden font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Authenticating with Bambu Cloud...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      Log In to Bambu Account
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* LOGGED IN ACCOUNT DASHBOARD */
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg shrink-0">
                    {account.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100 truncate">
                        {account.nickname}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        Bambu Cloud Connected
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {account.accountEmail} · {account.bambuUserId}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                      <span>Server: {REGION_SERVERS.find((r) => r.id === account.region)?.host || 'us.mqtt.bambulab.com'}</span>
                      <span>·</span>
                      <span className="text-emerald-400 capitalize">
                        Status: {account.cloudSyncStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSyncCloud}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    Sync Cloud
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    Log Out
                  </button>
                </div>
              </div>

              {/* Cloud Wireless Printing Toggle */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    Bambu Cloud Wireless Printing (OTA)
                  </div>
                  <div className="text-xs text-slate-400">
                    Allows dispatching 3MF toolpaths directly over encrypted Bambu MQTT broker without requiring local subnet bridging.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={account.cloudPrintEnabled}
                  onClick={handleToggleCloudPrinting}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                    account.cloudPrintEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      account.cloudPrintEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Bound Printers Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Printer className="w-4 h-4 text-emerald-400" />
                    Bound Printers ({account.boundPrinters.length})
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddPrinter(!showAddPrinter)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showAddPrinter ? 'Cancel' : 'Bind New Printer'}
                  </button>
                </div>

                {/* Add Printer Form */}
                {showAddPrinter && (
                  <form onSubmit={handleAddBoundPrinter} className="p-4 bg-slate-950 border border-slate-700 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-slate-200">
                      Bind Bambu Printer to Studio Account
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-400 font-medium">Printer Model</label>
                        <select
                          value={newModel}
                          onChange={(e) => setNewModel(e.target.value as BambuBoundPrinter['model'])}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                        >
                          <option value="Bambu Lab X1 Carbon">Bambu Lab X1 Carbon</option>
                          <option value="Bambu Lab P1S">Bambu Lab P1S</option>
                          <option value="Bambu Lab A1 mini">Bambu Lab A1 mini</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 font-medium">Custom Name (Optional)</label>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. Workshop X1C"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-400 font-medium">Serial Number</label>
                        <input
                          type="text"
                          value={newSerial}
                          onChange={(e) => setNewSerial(e.target.value)}
                          placeholder="00M09A351800..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 font-medium">Access Code</label>
                        <input
                          type="text"
                          value={newAccessCode}
                          onChange={(e) => setNewAccessCode(e.target.value)}
                          placeholder="8-digit LAN code"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors"
                    >
                      Confirm Printer Binding
                    </button>
                  </form>
                )}

                {/* Printer List Cards */}
                <div className="space-y-2.5">
                  {account.boundPrinters.map((p) => {
                    const isSelected = p.devId === account.selectedPrinterDevId;
                    return (
                      <div
                        key={p.devId}
                        onClick={() => handleSelectPrinter(p.devId)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'bg-slate-950 border-emerald-500 shadow-sm shadow-emerald-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            <Printer className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-100 truncate">
                                {p.name}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                  p.online
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {p.online ? 'Online' : 'Offline'}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                              S/N: {p.devId} · FW: {p.firmwareVersion} · {p.amsCount > 0 ? `AMS (${p.amsCount})` : 'Single Spool'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {isSelected ? (
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                              <Check className="w-4 h-4" />
                              Active Printer
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPrinter(p.devId);
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded border border-slate-800"
                            >
                              Select
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            Bambu Studio MQTT Protocol v3.1.1 · Port 8883 (MQTTS)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

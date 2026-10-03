import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  CheckCircle2,
  Trash2,
  Share2,
  Filter,
  DollarSign,
  CreditCard,
  X,
  MessageCircle,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { api } from '../../services/api';
import { UdharCustomer, UdharTransaction, UdharSummary } from '../../types';

export const UdharPage: React.FC = () => {
  // State
  const [summary, setSummary] = useState<UdharSummary>({
    totalGave: 0,
    totalGot: 0,
    netBalance: 0,
    customerCount: 0,
    transactionCount: 0,
    pendingCount: 0,
  });

  const [customers, setCustomers] = useState<UdharCustomer[]>([]);
  const [allCustomers, setAllCustomers] = useState<UdharCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerLedger, setSelectedCustomerLedger] = useState<{
    customer: UdharCustomer;
    transactions: UdharTransaction[];
  } | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'receivable' | 'payable' | 'settled'>('all');
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txType, setTxType] = useState<'gave' | 'got'>('gave');

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');
  const [isSubmittingCust, setIsSubmittingCust] = useState(false);

  // New Transaction Form State
  const [txCustomerId, setTxCustomerId] = useState('');
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);
  const [txNewCustomerName, setTxNewCustomerName] = useState('');
  const [txNewCustomerPhone, setTxNewCustomerPhone] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txPaymentMode, setTxPaymentMode] = useState('UPI / QR');
  const [txDueDate, setTxDueDate] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Load Overview Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, custRes, allCustRes] = await Promise.all([
        api.udhar.getSummary(),
        api.udhar.getCustomers({ search, filter }),
        api.udhar.getCustomers({ filter: 'all' }),
      ]);
      setSummary(sumRes);
      setCustomers(custRes.customers);
      setAllCustomers(allCustRes.customers);

      // Auto-select first customer on desktop if none selected
      if (!selectedCustomerId && custRes.customers.length > 0) {
        setSelectedCustomerId(custRes.customers[0].id);
      }
    } catch (err) {
      console.warn('Error loading Udhar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  // Load single customer ledger
  const loadCustomerLedger = async (customerId: string) => {
    try {
      setLedgerLoading(true);
      const res = await api.udhar.getCustomer(customerId);
      setSelectedCustomerLedger(res);
    } catch (err) {
      console.warn('Error loading customer ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerLedger(selectedCustomerId);
    } else {
      setSelectedCustomerLedger(null);
    }
  }, [selectedCustomerId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Add Customer Submit
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    setIsSubmittingCust(true);
    try {
      const res = await api.udhar.createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        notes: newCustNotes.trim() || undefined,
      });

      setShowAddCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustNotes('');
      await loadData();
      setSelectedCustomerId(res.customer.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setIsSubmittingCust(false);
    }
  };

  // Add Transaction Submit
  const handleAddTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    const isCreatingNew = isNewCustomerMode || allCustomers.length === 0 || !txCustomerId;
    if (isCreatingNew) {
      if (!txNewCustomerName.trim()) {
        alert('Please enter the customer name.');
        return;
      }
    } else {
      if (!txCustomerId) {
        alert('Please select an existing customer or click "+ New Customer".');
        return;
      }
    }

    setIsSubmittingTx(true);
    try {
      const res = await api.udhar.addTransaction({
        customerId: isCreatingNew ? undefined : txCustomerId,
        customerName: isCreatingNew ? txNewCustomerName.trim() : undefined,
        customerPhone: isCreatingNew ? txNewCustomerPhone.trim() : undefined,
        type: txType,
        amount: amt,
        description: txDescription.trim() || undefined,
        paymentMode: txPaymentMode,
        dueDate: txDueDate || undefined,
      });

      setShowAddTxModal(false);
      setTxAmount('');
      setTxDescription('');
      setTxDueDate('');
      setTxNewCustomerName('');
      setTxNewCustomerPhone('');
      setIsNewCustomerMode(false);
      await loadData();
      if (res.transaction?.customerId) {
        setSelectedCustomerId(res.transaction.customerId);
        await loadCustomerLedger(res.transaction.customerId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record transaction');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Open Quick Transaction for a specific customer
  const openTxForCustomer = (customerId: string, type: 'gave' | 'got') => {
    setTxCustomerId(customerId);
    setTxType(type);
    setIsNewCustomerMode(false);
    setShowAddTxModal(true);
  };

  // Open General Transaction modal from header
  const openNewTransaction = (type: 'gave' | 'got' = 'gave') => {
    setTxType(type);
    if (allCustomers.length === 0) {
      setIsNewCustomerMode(true);
      setTxCustomerId('');
    } else {
      setIsNewCustomerMode(false);
      setTxCustomerId(selectedCustomerId || allCustomers[0]?.id || '');
    }
    setShowAddTxModal(true);
  };

  // Settle Transaction
  const handleSettleTx = async (txId: string) => {
    try {
      await api.udhar.settleTransaction(txId);
      if (selectedCustomerId) {
        await loadCustomerLedger(selectedCustomerId);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to settle transaction');
    }
  };

  // Delete Transaction
  const handleDeleteTx = async (txId: string) => {
    if (confirm('Delete this ledger entry?')) {
      try {
        await api.udhar.deleteTransaction(txId);
        if (selectedCustomerId) {
          await loadCustomerLedger(selectedCustomerId);
        }
        await loadData();
      } catch (err: any) {
        alert('Failed to delete transaction');
      }
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (cust: UdharCustomer) => {
    if (confirm(`Delete customer "${cust.name}" and all their transaction records?`)) {
      try {
        await api.udhar.deleteCustomer(cust.id);
        setSelectedCustomerId(null);
        setSelectedCustomerLedger(null);
        await loadData();
      } catch (err) {
        alert('Failed to delete customer');
      }
    }
  };

  // WhatsApp Reminder Link Generator
  const generateWhatsAppLink = (cust: UdharCustomer) => {
    if (!cust.phone) return null;
    const phoneClean = cust.phone.replace(/[^0-9]/g, '');
    const amountAbs = Math.abs(cust.balance).toLocaleString('en-IN');
    let message = '';

    if (cust.balance > 0) {
      message = encodeURIComponent(
        `Hello ${cust.name}, this is a gentle reminder regarding your pending balance of ₹${amountAbs} on FluxDrop Khata. Please settle at your earliest convenience. Thank you!`
      );
    } else {
      message = encodeURIComponent(
        `Hello ${cust.name}, checking in regarding our account balance of ₹${amountAbs} on FluxDrop Khata. Thank you!`
      );
    }
    return `https://wa.me/${phoneClean}?text=${message}`;
  };

  const formatCurrency = (amt: number) => {
    return `₹${Math.abs(amt).toLocaleString('en-IN')}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#61f7df]/10 text-[#61f7df] border border-[#61f7df]/20">
              <Receipt className="w-5 h-5" />
            </span>
            <span>Udhar & Khata Management</span>
          </h2>
          <p className="text-xs text-[#8B95A7] mt-1">
            Track receivables (You will get), payables (You will give), and customer debt ledgers with Supabase sync.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center gap-2 transition"
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Add Customer</span>
          </button>

          <button
            onClick={() => openNewTransaction('gave')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#61f7df] to-cyan-400 hover:from-[#4fe0c8] hover:to-cyan-300 text-black text-xs font-bold shadow-lg shadow-[#61f7df]/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Entry</span>
          </button>
        </div>
      </div>

      {/* Top 3 Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* You'll Get (Aapko Lena Hai) */}
        <div className="p-5 rounded-2xl glass-card border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.05] to-transparent relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              You Will Get (Lena Hai)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
            {formatCurrency(summary.totalGave)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Credit extended to {customers.filter((c) => c.balance > 0).length} customer(s)
          </p>
        </div>

        {/* You'll Give (Aapko Dena Hai) */}
        <div className="p-5 rounded-2xl glass-card border border-rose-500/20 bg-gradient-to-b from-rose-500/[0.05] to-transparent relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              You Will Give (Dena Hai)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
            {formatCurrency(summary.totalGot)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Payable to {customers.filter((c) => c.balance < 0).length} customer(s)
          </p>
        </div>

        {/* Net Khata Balance */}
        <div className="p-5 rounded-2xl glass-card border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.05] to-transparent relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              Net Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-heading font-extrabold ${
              summary.netBalance >= 0 ? 'text-[#61f7df]' : 'text-rose-400'
            }`}
          >
            {summary.netBalance >= 0 ? '+' : '-'}
            {formatCurrency(summary.netBalance)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Total {summary.customerCount} customers • {summary.transactionCount} transactions
          </p>
        </div>
      </div>

      {/* Main Udhar Workspace: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customer Directory (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl glass-panel border border-white/10 shadow-xl space-y-4">
            {/* Search and Filters */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search customer name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs text-white placeholder-gray-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </form>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl glass-card">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'receivable', label: "You'll Get" },
                  { id: 'payable', label: "You'll Give" },
                  { id: 'settled', label: 'Settled' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    filter === f.id
                      ? 'bg-[#61f7df]/20 text-[#61f7df] border border-[#61f7df]/40 font-semibold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Customer List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {customers.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-white/5 space-y-3">
                  <Users className="w-8 h-8 text-gray-500 mx-auto" />
                  <p className="text-xs text-gray-400">No customers found.</p>
                  <button
                    onClick={() => setShowAddCustomerModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#61f7df]/10 hover:bg-[#61f7df]/20 border border-[#61f7df]/30 text-[#61f7df] text-xs font-semibold inline-flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Customer</span>
                  </button>
                </div>
              ) : (
                customers.map((cust) => {
                  const isSelected = selectedCustomerId === cust.id;
                  const isReceivable = cust.balance > 0;
                  const isPayable = cust.balance < 0;
                  const isSettled = cust.balance === 0;
                  const waLink = generateWhatsAppLink(cust);

                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className={`p-3.5 sm:p-4 rounded-2xl transition cursor-pointer border flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#61f7df]/10 border-[#61f7df]/40 shadow-lg shadow-[#61f7df]/5'
                          : 'glass-card border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Customer Avatar Initial */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                            isReceivable
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isPayable
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-white/5 text-gray-400 border-white/10'
                          }`}
                        >
                          {cust.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">{cust.name}</h4>
                          <p className="text-[11px] text-gray-400 truncate">
                            {cust.phone || 'No phone'} • {cust.transactionCount} entries
                          </p>
                        </div>
                      </div>

                      {/* Right Balance amount & quick WhatsApp */}
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <div
                            className={`text-xs sm:text-sm font-heading font-bold ${
                              isReceivable
                                ? 'text-emerald-400'
                                : isPayable
                                ? 'text-rose-400'
                                : 'text-gray-400'
                            }`}
                          >
                            {formatCurrency(cust.balance)}
                          </div>
                          <span className="text-[10px] uppercase font-mono tracking-wider block text-gray-400">
                            {isReceivable ? "You'll Get" : isPayable ? "You'll Give" : 'Settled'}
                          </span>
                        </div>

                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Send WhatsApp Reminder"
                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Customer Detailed Ledger (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedCustomerLedger ? (
            <div className="p-6 rounded-3xl glass-panel border border-white/10 shadow-2xl space-y-6">
              {/* Customer Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/10 gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#61f7df]/10 border border-[#61f7df]/30 text-[#61f7df] flex items-center justify-center font-bold text-lg">
                    {selectedCustomerLedger.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-bold text-white">
                      {selectedCustomerLedger.customer.name}
                    </h3>
                    <p className="text-xs text-[#8B95A7]">
                      {selectedCustomerLedger.customer.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-cyan-400" />
                          {selectedCustomerLedger.customer.phone}
                        </span>
                      ) : (
                        'No phone attached'
                      )}
                      {selectedCustomerLedger.customer.notes && (
                        <span> • {selectedCustomerLedger.customer.notes}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {generateWhatsAppLink(selectedCustomerLedger.customer) && (
                    <a
                      href={generateWhatsAppLink(selectedCustomerLedger.customer)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleDeleteCustomer(selectedCustomerLedger.customer)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/5 transition"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Customer Balance Quick Bar */}
              <div className="p-4 rounded-2xl bg-[#090D14] border border-white/5 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">
                    Total Given
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white">
                    {formatCurrency(selectedCustomerLedger.customer.totalGave)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">
                    Total Received
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white">
                    {formatCurrency(selectedCustomerLedger.customer.totalGot)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">
                    Current Balance
                  </span>
                  <span
                    className={`text-sm sm:text-base font-bold ${
                      selectedCustomerLedger.customer.balance > 0
                        ? 'text-emerald-400'
                        : selectedCustomerLedger.customer.balance < 0
                        ? 'text-rose-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {formatCurrency(selectedCustomerLedger.customer.balance)}
                  </span>
                </div>
              </div>

              {/* Quick Transaction Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => openTxForCustomer(selectedCustomerLedger.customer.id, 'gave')}
                  className="py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-500/5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>You Gave (Udhar Diya)</span>
                </button>

                <button
                  onClick={() => openTxForCustomer(selectedCustomerLedger.customer.id, 'got')}
                  className="py-3 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/5"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>You Got (Jama Kiya)</span>
                </button>
              </div>

              {/* Ledger Entries List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Transaction History
                  </h4>
                  <span className="text-[11px] text-[#8B95A7] font-mono">
                    {selectedCustomerLedger.transactions.length} records
                  </span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {selectedCustomerLedger.transactions.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-white/5 text-xs text-gray-500">
                      No entries recorded for this customer yet. Use the buttons above to record a payment or credit.
                    </div>
                  ) : (
                    selectedCustomerLedger.transactions.map((tx) => {
                      const isGave = tx.type === 'gave';
                      const isSettled = tx.status === 'settled';

                      return (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-2xl bg-[#090D14]/80 border border-white/5 hover:border-white/10 transition flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isGave
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {isGave ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : (
                                <ArrowDownLeft className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-medium text-white truncate">
                                {tx.description || (isGave ? 'Credit / Udhar' : 'Payment Received')}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono">
                                {new Date(tx.createdAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                • {tx.paymentMode}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span
                                className={`text-sm font-heading font-bold block ${
                                  isGave ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {isGave ? '-' : '+'}
                                {formatCurrency(tx.amount)}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                  isSettled
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                {isSettled ? 'Settled' : 'Pending'}
                              </span>
                            </div>

                            {!isSettled && (
                              <button
                                onClick={() => handleSettleTx(tx.id)}
                                title="Mark as Settled"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteTx(tx.id)}
                              title="Delete Entry"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center rounded-3xl glass-panel border border-white/5 space-y-3">
              <Receipt className="w-12 h-12 text-gray-500 mx-auto" />
              <h4 className="text-base font-semibold text-white">Select a Customer Ledger</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Click any customer on the left to view their detailed transaction history, settle dues, or record new credits.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-3xl glass-panel border border-[#61f7df]/30 shadow-2xl relative space-y-5 bg-[#090D14]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#61f7df]" />
                <span>Add Customer to Khata</span>
              </h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1.5">
                  Customer / Contact Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1.5">
                  Phone Number (for WhatsApp reminder)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shop vendor, Flatmate, Wholesale client"
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCust || !newCustName.trim()}
                  className="px-5 py-2 rounded-xl bg-[#61f7df] hover:bg-[#4fe0c8] text-black font-bold text-xs shadow-lg shadow-[#61f7df]/20 transition disabled:opacity-40"
                >
                  {isSubmittingCust ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal 2: Record Transaction Modal */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-3xl glass-panel border border-white/10 shadow-2xl relative space-y-5 bg-[#090D14]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-400" />
                <span>Record Udhar Entry</span>
              </h3>
              <button onClick={() => setShowAddTxModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTxSubmit} className="space-y-4">
              {/* Type Toggle: You Gave vs You Got */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#05070B] border border-white/10 gap-1">
                <button
                  type="button"
                  onClick={() => setTxType('gave')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    txType === 'gave'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>You Gave (Udhar)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTxType('got')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    txType === 'got'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>You Got (Received)</span>
                </button>
              </div>

              {/* Customer Selector or Inline Create */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-gray-300 font-medium">
                    {isNewCustomerMode || allCustomers.length === 0 ? 'Customer Name *' : 'Select Customer *'}
                  </label>
                  {allCustomers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewCustomerMode(!isNewCustomerMode);
                        if (isNewCustomerMode) {
                          setTxCustomerId(allCustomers[0]?.id || '');
                        }
                      }}
                      className="text-[11px] text-[#61f7df] hover:underline flex items-center gap-1 font-medium"
                    >
                      {isNewCustomerMode ? '← Choose Existing Customer' : '+ Add New Customer'}
                    </button>
                  )}
                </div>

                {isNewCustomerMode || allCustomers.length === 0 ? (
                  <div className="space-y-2.5 p-3 rounded-2xl bg-[#05070B] border border-[#61f7df]/20">
                    {allCustomers.length === 0 && (
                      <div className="text-[11px] text-[#61f7df] flex items-center gap-1.5 font-medium pb-0.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>No customers added yet. Type a name to auto-create them!</span>
                      </div>
                    )}
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Customer name (e.g. Ramesh, Apple Store)"
                        value={txNewCustomerName}
                        onChange={(e) => setTxNewCustomerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                        autoFocus
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Phone number (optional for WhatsApp reminder)"
                        value={txNewCustomerPhone}
                        onChange={(e) => setTxNewCustomerPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <select
                    required
                    value={txCustomerId}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setIsNewCustomerMode(true);
                      } else {
                        setTxCustomerId(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white bg-[#0F1420]"
                  >
                    <option value="">Select customer...</option>
                    {allCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} — Balance: ₹{Math.abs(c.balance).toLocaleString('en-IN')}
                      </option>
                    ))}
                    <option value="__new__">+ Enter a new customer name...</option>
                  </select>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1.5">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl glass-input text-sm font-mono text-white"
                  />
                </div>
              </div>

              {/* Description / Bill Note */}
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1.5">
                  Description / Item Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grocery items, Office lunch, Hardware purchase"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-xs text-gray-300 font-medium block mb-1.5">
                  Payment Mode
                </label>
                <select
                  value={txPaymentMode}
                  onChange={(e) => setTxPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white bg-[#0F1420]"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI / QR">UPI / QR (GPay, PhonePe, Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS / NEFT</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx || !txAmount}
                  className={`px-5 py-2 rounded-xl font-bold text-xs shadow-lg transition disabled:opacity-40 ${
                    txType === 'gave'
                      ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                      : 'bg-[#61f7df] hover:bg-[#4fe0c8] text-black shadow-[#61f7df]/20'
                  }`}
                >
                  {isSubmittingTx ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

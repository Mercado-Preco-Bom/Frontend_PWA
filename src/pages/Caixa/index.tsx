import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Package, Plus, Minus, Clock, UserPlus, X, MapPin, Truck, WifiOff, FileText, CheckCircle2, Banknote, Pencil, Ban, Sprout } from 'lucide-react';
import { PaymentChips } from '../../components/ui/PaymentBadges';
import { formatBRL, parseMoney } from '../../utils/money';

const CIDADES_VALE = [
  'Registro', 'Jacupiranga', 'Pariquera-Açu', 'Sete Barras', 'Juquiá',
  'Cajati', 'Eldorado', 'Miracatu', 'Iguape', 'Cananéia', 'Ilha Comprida', 'Outra'
];

const BAIRROS_REGISTRO = [
  'Agrocha', 'Alay Correa', 'Arapongal', 'Bloco B', 'Capinzal', 'Carapiranga',
  'Centro', 'Jardim América', 'Jardim Brasil', 'Jardim Caiçara', 'Jardim das Palmeiras',
  'Jardim Eiji Matsumura', 'Jardim Hatori', 'Jardim Paulistano', 'Jardim Planalto',
  'Jardim São Conrado', 'Jardim São Paulo', 'Nosso Teto', 'Pedreira', 'Serrote',
  'Vila Cabral', 'Vila Flórida', 'Vila Nova', 'Vila Ponce', 'Vila Ribeirópolis',
  'Vila Romão', 'Vila São Francisco', 'Vila Tupy', 'Votupoca'
];

interface ViaCepResult {
  cep: string; logradouro: string; complemento: string;
  bairro: string; localidade: string; uf: string;
}

interface Customer {
  id: string; name: string; street?: string | null; number?: string | null;
  neighborhood?: string; reference?: string; isRural?: boolean;
  latitude?: number | null; longitude?: number | null;
}

interface User {
  id: string; name: string; role: string;
}

interface Delivery {
  id: string; boxCount: number; paymentMethod: string; changeFor: number | null;
  isPaid: boolean; amount: number | null;
  description: string | null; status: string; createdAt: string;
  startedAt: string | null; finishedAt: string | null;
  canceledAt?: string | null; cancelReason?: string | null;
  customer: Customer; driver: User | null;
}

const SHOW_FINISHED_TAB = false;

const isSameDay = (iso: string, nowMs: number) =>
  new Date(iso).toDateString() === new Date(nowMs).toDateString();

const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const formatOrderTime = (iso: string, nowMs: number) => {
  const time = new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isSameDay(iso, nowMs)) return time;
  return `${formatShortDate(iso)} · ${time}`;
};

const formatClock = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';

const formatElapsed = (iso: string, now: number) => {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'agora há pouco';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
};

const formatStreet = (c: Customer) =>
  [c.street, c.number].filter(Boolean).join(', ') || (c.isRural ? 'Sítio / zona rural' : '');

const formatDestination = (c: Customer) =>
  [c.neighborhood, [c.street, c.number].filter(Boolean).join(', ')].filter(Boolean).join(' — ') ||
  (c.isRural ? 'Sítio / zona rural' : '');

const METHOD_LABEL: Record<string, string> = { CASH: 'Dinheiro', CREDIT_CARD: 'Cartão', DEBIT_CARD: 'Cartão', PIX: 'Pix' };
const METHOD_CODE: Record<string, string> = { Dinheiro: 'CASH', Cartão: 'CREDIT_CARD', Pix: 'PIX' };

type DriverState = 'AVAILABLE' | 'ASSIGNED' | 'ON_ROUTE';

interface DriverStop {
  id: string; address: string; neighborhood: string; left: boolean; createdAt: string;
}

interface DriverStatus {
  driver: User; state: DriverState; departedAt: string | null;
  freeSince: string | null; stops: DriverStop[]; onRouteCount: number; queuedCount: number;
}

const summarizeStops = (stops: DriverStop[]) => {
  const counts = new Map<string, number>();
  stops.forEach(st => {
    const key = st.neighborhood || 'Sem bairro';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()].map(([n, c]) => (c > 1 ? `${n} ×${c}` : n)).join(' · ');
};

export function Caixa() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [volume, setVolume] = useState(1);
  const [payment, setPayment] = useState('Dinheiro');
  const [changeFor, setChangeFor] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [description, setDescription] = useState('');

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [editing, setEditing] = useState<Delivery | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    customerId: '', boxCount: 1, payment: 'Dinheiro', isPaid: false, amount: '', changeFor: '', description: '', driverId: ''
  });
  const [canceling, setCanceling] = useState<Delivery | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [savingCancel, setSavingCancel] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '', phone: '', street: '', number: '', neighborhood: 'Centro', reference: ''
  });
  const [isRural, setIsRural] = useState(false);

  const [selectedCity, setSelectedCity] = useState('Registro');
  const [customCity, setCustomCity] = useState('');
  const [rawNeighborhood, setRawNeighborhood] = useState('Centro');
  const [isManualNeighborhood, setIsManualNeighborhood] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<ViaCepResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const activeCityName = selectedCity === 'Outra' ? customCity.trim() : selectedCity;

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/customers`);
      setCustomers(response.data);
    } catch (error) {}
  };

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get(`${API_URL}/deliveries`);
      setDeliveries(response.data);
      setIsOffline(false);
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) setIsOffline(true);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setDrivers(response.data.filter((u: User) => u.role === 'DRIVER'));
    } catch (error) {}
  };

  const syncOfflineDeliveries = async () => {
    const pending = JSON.parse(localStorage.getItem('@PrecoBom:offline_deliveries') || '[]');
    if (pending.length === 0) return;

    const remaining = [];
    for (const p of pending) {
      try {
        await axios.post(`${API_URL}/deliveries`, p);
      } catch (e: any) {
        if (!e.response) remaining.push(p);
      }
    }
    localStorage.setItem('@PrecoBom:offline_deliveries', JSON.stringify(remaining));
    if (pending.length !== remaining.length) fetchDeliveries();
  };

  useEffect(() => {
    fetchCustomers();
    fetchDeliveries();
    fetchDrivers();

    const interval = setInterval(fetchDeliveries, 5000);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    const syncInterval = setInterval(syncOfflineDeliveries, 10000);

    window.addEventListener('online', () => {
      setIsOffline(false);
      syncOfflineDeliveries();
    });
    window.addEventListener('offline', () => setIsOffline(true));

    return () => {
      clearInterval(interval);
      clearInterval(clock);
      clearInterval(syncInterval);
    };
  }, []);

  useEffect(() => {
    const bairroLimpo = rawNeighborhood.trim();
    if (!bairroLimpo) {
      setNewCustomer(prev => ({ ...prev, neighborhood: '' }));
      return;
    }
    if (selectedCity === 'Registro') {
      setNewCustomer(prev => ({ ...prev, neighborhood: bairroLimpo }));
    } else if (activeCityName) {
      setNewCustomer(prev => ({ ...prev, neighborhood: `${bairroLimpo} (${activeCityName})` }));
    } else {
      setNewCustomer(prev => ({ ...prev, neighborhood: bairroLimpo }));
    }
  }, [rawNeighborhood, selectedCity, customCity, activeCityName]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (newCustomer.street.trim().length >= 3 && activeCityName && selectedCity !== 'Outra' && showSuggestions) {
        try {
          const res = await fetch(`https://viacep.com.br/ws/SP/${encodeURIComponent(activeCityName)}/${encodeURIComponent(newCustomer.street.trim())}/json/`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) setStreetSuggestions(data.slice(0, 6));
          }
        } catch {}
      } else {
        setStreetSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [newCustomer.street, activeCityName, selectedCity, showSuggestions]);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setStreetSuggestions([]);
    setIsManualNeighborhood(false);
    setRawNeighborhood(city === 'Registro' ? 'Centro' : '');
  };

  const handleSelectSuggestion = (item: ViaCepResult) => {
    setShowSuggestions(false);
    setStreetSuggestions([]);
    if (item.logradouro) setNewCustomer(prev => ({ ...prev, street: item.logradouro }));
    if (item.bairro) {
      const matchedBairro = BAIRROS_REGISTRO.find(b => b.toLowerCase() === item.bairro.toLowerCase());
      if (selectedCity === 'Registro' && matchedBairro) {
        setIsManualNeighborhood(false);
        setRawNeighborhood(matchedBairro);
      } else {
        setIsManualNeighborhood(selectedCity === 'Registro');
        setRawNeighborhood(item.bairro);
      }
    }
  };

  const resetCustomerModal = () => {
    setIsRural(false);
    setNewCustomer({ name: '', phone: '', street: '', number: '', neighborhood: 'Centro', reference: '' });
    setSelectedCity('Registro'); setCustomCity(''); setRawNeighborhood('Centro'); setIsManualNeighborhood(false);
    setStreetSuggestions([]); setShowSuggestions(false); setShowCustomerModal(false);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.neighborhood) return alert('Por favor, informe o bairro.');
    setLoadingCustomer(true);
    try {
      const response = await axios.post(`${API_URL}/customers`, { ...newCustomer, isRural });
      await fetchCustomers();
      setSelectedCustomerId(response.data.id);
      resetCustomerModal();
    } catch (error) {
      alert('Erro ao cadastrar cliente. Verifique se preencheu tudo.');
    } finally {
      setLoadingCustomer(false);
    }
  };

  const resetForm = () => {
    setVolume(1); setPayment('Dinheiro'); setChangeFor(''); setDescription(''); setSelectedCustomerId('');
    setIsPaid(false); setAmount(''); setAmountTouched(false);
  };

  const parsedAmount = parseMoney(amount);
  const parsedChange = parseMoney(changeFor);
  const amountMissing = !isPaid && (parsedAmount === null || parsedAmount <= 0);
  const showAmountError = amountMissing && amountTouched;
  const showChangeField = !isPaid && payment === 'Dinheiro';

  const handleSelectPaid = (paid: boolean) => {
    setIsPaid(paid);
    if (paid) setChangeFor('');
  };

  const handleRegistrarPedido = async () => {
    if (!selectedCustomerId) return alert('Por favor, selecione um cliente!');

    if (!isPaid && amountMissing) {
      setAmountTouched(true);
      return alert('Informe o valor a cobrar do cliente. O motorista precisa saber quanto cobrar, inclusive no Pix.');
    }

    if (isPaid && amount.trim() !== '' && parsedAmount === null) {
      setAmountTouched(true);
      return alert('O valor informado é inválido.');
    }

    if (showChangeField && changeFor.trim() !== '') {
      if (parsedChange === null) return alert('O valor do troco é inválido.');
      if (parsedAmount !== null && parsedChange < parsedAmount) {
        return alert('O troco deve ser maior ou igual ao valor a cobrar.');
      }
    }

    setLoading(true);

    const methodMap: Record<string, string> = { Dinheiro: 'CASH', Cartão: 'CREDIT_CARD', Pix: 'PIX' };
    const payload = {
      customerId: selectedCustomerId,
      boxCount: volume,
      paymentMethod: methodMap[payment],
      isPaid,
      amount: parsedAmount,
      changeFor: showChangeField && parsedChange !== null ? parsedChange : null,
      description: description.trim() || null,
    };

    try {
      await axios.post(`${API_URL}/deliveries`, payload);
      resetForm();
      fetchDeliveries();
      setActiveTab('PENDING');
    } catch (error: any) {
      if (!error.response) {
        const pending = JSON.parse(localStorage.getItem('@PrecoBom:offline_deliveries') || '[]');
        pending.push(payload);
        localStorage.setItem('@PrecoBom:offline_deliveries', JSON.stringify(pending));
        alert('Sem internet! Pedido salvo no caixa e será enviado automaticamente quando a rede voltar.');
        resetForm();
      } else {
        alert('Erro ao registrar pedido.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeDriver = async (delivery: Delivery, newDriverId: string) => {
    if ((delivery.driver?.id ?? '') === newDriverId) return;
    if (delivery.startedAt) {
      const ok = window.confirm(
        `Esta entrega já saiu com ${delivery.driver?.name.split(' ')[0] ?? 'o motorista'}. ` +
        'Ao trocar, ela volta para "aguardando saída" com o novo motorista. Continuar?'
      );
      if (!ok) return;
    }
    try {
      await axios.put(`${API_URL}/deliveries/${delivery.id}`, { driverId: newDriverId || null });
      fetchDeliveries();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao trocar o motorista.');
    }
  };

  const openEdit = (d: Delivery) => {
    setEditing(d);
    setEditForm({
      customerId: d.customer.id,
      boxCount: d.boxCount || 1,
      payment: METHOD_LABEL[d.paymentMethod] ?? 'Dinheiro',
      isPaid: Boolean(d.isPaid),
      amount: d.amount !== null && d.amount !== undefined ? String(d.amount).replace('.', ',') : '',
      changeFor: d.changeFor ? String(d.changeFor).replace('.', ',') : '',
      description: d.description ?? '',
      driverId: d.driver?.id ?? '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    const amountValue = parseMoney(editForm.amount);
    const changeValue = parseMoney(editForm.changeFor);
    const cash = !editForm.isPaid && editForm.payment === 'Dinheiro';

    if (!editForm.isPaid && (amountValue === null || amountValue <= 0)) return alert('Informe o valor a cobrar do cliente.');
    if (editForm.isPaid && editForm.amount.trim() !== '' && amountValue === null) return alert('O valor informado é inválido.');
    if (cash && editForm.changeFor.trim() !== '') {
      if (changeValue === null) return alert('O valor do troco é inválido.');
      if (amountValue !== null && changeValue < amountValue) return alert('O troco deve ser maior ou igual ao valor a cobrar.');
    }
    if (editing.startedAt && (editing.driver?.id ?? '') !== editForm.driverId) {
      const ok = window.confirm('Trocar o motorista de uma entrega que já saiu faz ela voltar para "aguardando saída". Continuar?');
      if (!ok) return;
    }

    setSavingEdit(true);
    try {
      await axios.put(`${API_URL}/deliveries/${editing.id}`, {
        customerId: editForm.customerId,
        boxCount: Math.max(1, editForm.boxCount || 1),
        paymentMethod: METHOD_CODE[editForm.payment],
        isPaid: editForm.isPaid,
        amount: amountValue,
        changeFor: cash && changeValue !== null ? changeValue : null,
        description: editForm.description.trim() || null,
        driverId: editForm.driverId || null,
      });
      setEditing(null);
      fetchDeliveries();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao salvar a entrega.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!canceling) return;
    setSavingCancel(true);
    try {
      await axios.put(`${API_URL}/deliveries/${canceling.id}/cancel`, { reason: cancelReason.trim() || null });
      setCanceling(null);
      setCancelReason('');
      fetchDeliveries();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao cancelar a entrega.');
    } finally {
      setSavingCancel(false);
    }
  };

  const todayKey = new Date(now).toDateString();
  const visibleDeliveries = deliveries.filter(d => {
    const isToday = new Date(d.createdAt).toDateString() === todayKey;
    if (!isToday && d.status === 'DELIVERED') return false;
    if (!SHOW_FINISHED_TAB && d.status === 'DELIVERED') return false;
    if (d.status === 'CANCELED' && !isToday) return false;
    return true;
  });

  const filteredDeliveries = visibleDeliveries.filter(d => d.status === activeTab);
  const countPending = visibleDeliveries.filter(d => d.status === 'PENDING').length;
  const countTransit = visibleDeliveries.filter(d => d.status === 'IN_TRANSIT').length;
  const countCanceled = visibleDeliveries.filter(d => d.status === 'CANCELED').length;

  const driverStatuses = useMemo<DriverStatus[]>(() => {
    return drivers.map(driver => {
      const mine = deliveries.filter(d => d.driver?.id === driver.id);
      const open = mine.filter(d => d.status === 'IN_TRANSIT');
      const onRoute = open.filter(d => d.startedAt).sort((a, b) => new Date(a.startedAt!).getTime() - new Date(b.startedAt!).getTime());
      const queued = open.filter(d => !d.startedAt);
      const lastFinished = mine.filter(d => d.status === 'DELIVERED' && d.finishedAt && new Date(d.finishedAt).toDateString() === todayKey)
        .sort((a, b) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime())[0];

      const state: DriverState = onRoute.length > 0 ? 'ON_ROUTE' : queued.length > 0 ? 'ASSIGNED' : 'AVAILABLE';
      const toStop = (d: Delivery, left: boolean): DriverStop => ({
        id: d.id,
        address: formatDestination(d.customer),
        neighborhood: d.customer.neighborhood ?? '',
        left,
        createdAt: d.createdAt,
      });

      return {
        driver, state, departedAt: onRoute[0]?.startedAt ?? null,
        freeSince: state === 'AVAILABLE' ? lastFinished?.finishedAt ?? null : null,
        stops: [...onRoute.map(d => toStop(d, true)), ...queued.map(d => toStop(d, false))],
        onRouteCount: onRoute.length, queuedCount: queued.length
      };
    });
  }, [drivers, deliveries, todayKey]);

  return (
    <>
      <main className="flex flex-col lg:flex-row gap-6 h-full relative">
        <div className="w-full lg:w-5/12 bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex-shrink-0 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Nova Entrega</h2>
            {isOffline && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                <WifiOff size={12} /> OFFLINE
              </span>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">1. CLIENTE</label>
            <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#1A4B9F] focus-within:ring-1 focus-within:ring-[#1A4B9F] transition-all">
              <div className="pl-3 items-center justify-center hidden sm:flex"><Search size={16} className="text-gray-400" /></div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="flex-1 min-w-0 p-3 outline-none text-sm text-gray-700 bg-transparent cursor-pointer truncate"
              >
                <option value="">Buscar por nome...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.isRural ? '🌾 ' : ''}{c.name} {c.neighborhood ? `(${c.neighborhood})` : ''}</option>)}
              </select>
              <button onClick={() => setShowCustomerModal(true)} className="bg-[#1A4B9F] text-white px-3 sm:px-4 hover:bg-blue-800 flex items-center justify-center gap-1 text-[10px] sm:text-xs font-semibold transition-colors flex-shrink-0">
                <UserPlus size={14} className="sm:w-4 sm:h-4" /><span className="hidden sm:inline">Novo</span>
              </button>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">2. VOLUMES / CAIXAS</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#1A4B9F] focus-within:ring-1 focus-within:ring-[#1A4B9F]">
                <button type="button" onClick={() => setVolume(Math.max(1, volume - 1))} className="p-3 bg-gray-50 hover:bg-gray-100 border-r border-gray-300"><Minus size={16} /></button>
                <input
                  type="number" min="1" value={volume === 0 ? '' : volume}
                  onChange={(e) => { const val = e.target.value; if (val === '') { setVolume(0); return; } const num = parseInt(val, 10); if (!isNaN(num)) setVolume(Math.max(1, num)); }}
                  onBlur={() => { if (!volume || volume < 1) setVolume(1); }}
                  className="w-16 text-center font-semibold text-base text-gray-800 outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" onClick={() => setVolume(volume + 1)} className="p-3 bg-gray-50 hover:bg-gray-100 border-l border-gray-300"><Plus size={16} /></button>
              </div>
              <div className="p-3 border border-gray-300 rounded-lg text-gray-500"><Package size={20} /></div>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">3. PAGAMENTO</label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPaid(true)}
                className={`flex flex-col items-center text-center gap-1 p-3 border-2 rounded-lg transition-all ${isPaid ? 'bg-green-50 border-green-500 text-green-800' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
              >
                <CheckCircle2 size={22} className={isPaid ? 'text-green-600' : 'text-gray-400'} />
                <span className="text-xs font-extrabold">JÁ FOI PAGO</span>
                <span className="text-[10px] leading-tight">Motorista não cobra nada do cliente</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPaid(false)}
                className={`flex flex-col items-center text-center gap-1 p-3 border-2 rounded-lg transition-all ${!isPaid ? 'bg-[#FFF3E0] border-[#E65100] text-[#9A3412]' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
              >
                <Banknote size={22} className={!isPaid ? 'text-[#E65100]' : 'text-gray-400'} />
                <span className="text-xs font-extrabold">RECEBER NA ENTREGA</span>
                <span className="text-[10px] leading-tight">Motorista cobra no destino</span>
              </button>
            </div>

            <div className="mt-4">
              <label className={`block text-xs font-bold mb-1.5 ${isPaid ? 'text-green-700' : showAmountError ? 'text-[#E53E3E]' : 'text-[#E65100]'}`}>
                {isPaid ? 'Valor da entrega (R$) — já pago' : 'Valor a cobrar do cliente (R$) *'}
              </label>
              <div className={`flex items-center border-2 rounded-lg overflow-hidden ${isPaid ? 'border-green-300 bg-green-50/50' : showAmountError ? 'border-[#E53E3E] bg-red-50' : 'border-[#E65100] bg-[#FFF3E0]/60'}`}>
                <span className="pl-3 text-sm font-semibold text-gray-600">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => setAmountTouched(true)}
                  className="flex-1 min-w-0 p-3 text-right outline-none bg-transparent text-base text-gray-800 font-bold"
                />
              </div>
              {showAmountError && (
                <p className="mt-1.5 text-[11px] font-semibold text-[#E53E3E]">
                  Obrigatório: o motorista precisa saber quanto cobrar, inclusive no Pix.
                </p>
              )}
            </div>

            <label className="block text-[11px] font-semibold text-gray-500 mt-4 mb-2 uppercase tracking-wide">
              {isPaid ? 'Forma usada no pagamento' : 'Forma de cobrança na entrega'}
            </label>
            <div className="flex gap-2">
              {['Dinheiro', 'Cartão', 'Pix'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => { setPayment(method); if (method !== 'Dinheiro') setChangeFor(''); }}
                  className={`flex-1 py-3 border rounded-lg text-xs font-semibold transition-all ${payment === method ? 'bg-[#1A4B9F] border-[#1A4B9F] text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  {method}
                </button>
              ))}
            </div>

            {showChangeField && (
              <div className="mt-4 flex items-center justify-between border border-gray-300 rounded-lg overflow-hidden">
                <span className="pl-3 text-sm font-medium text-gray-600">Troco para R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={changeFor}
                  onChange={(e) => setChangeFor(e.target.value)}
                  className="p-3 text-right outline-none text-sm text-gray-800 font-semibold w-1/2"
                />
              </div>
            )}

            <div className={`mt-4 rounded-lg px-3 py-2.5 text-xs font-bold ${isPaid ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-[#FFF3E0] text-[#9A3412] border border-[#FFE0B2]'}`}>
              {isPaid
                ? `PAGO${parsedAmount !== null ? ` — ${formatBRL(parsedAmount)}` : ''} · ${payment} · motorista NÃO cobra`
                : `Motorista COBRA ${parsedAmount !== null && parsedAmount > 0 ? formatBRL(parsedAmount) : '(informe o valor)'} no ${payment}`}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
              <FileText size={12} /> 4. OBSERVAÇÃO / DESCRIÇÃO
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Entregar pelos fundos, Cuidado frágil..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] resize-none h-20"
            />
          </div>

          <button onClick={handleRegistrarPedido} disabled={loading} className="w-full bg-[#E53E3E] text-white font-bold text-sm py-4 rounded-lg shadow-sm hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50">
            {loading ? 'Registrando...' : 'Registrar Pedido'}
          </button>
        </div>

        <div className="w-full lg:w-7/12 bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col h-[80vh]">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pl-1">Despacho do Dia</h2>

          <div className="mb-4">
            <p className="text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Motoristas</p>
            {driverStatuses.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum motorista cadastrado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 items-start">
                {driverStatuses.map(({ driver, state, departedAt, freeSince, stops, queuedCount }) => {
                  const badge = state === 'ON_ROUTE' ? { label: 'Em rota', cls: 'bg-[#1A4B9F] text-white' } : state === 'ASSIGNED' ? { label: queuedCount > 1 ? `${queuedCount} entregas` : 'Atribuída', cls: 'bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2]' } : { label: 'Disponível', cls: 'bg-green-50 text-green-700 border border-green-200' };
                  const expanded = expandedDrivers.has(driver.id);

                  return (
                    <div key={driver.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800 truncate">
                          <Truck size={14} className="text-gray-500 flex-shrink-0" /> {driver.name.split(' ')[0]}
                        </span>
                        <span className={`font-medium px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${badge.cls}`}>{badge.label}</span>
                      </div>

                      <p className="text-[11px] text-gray-600 mt-2">
                        {state === 'ON_ROUTE' && departedAt && (
                          <>
                            <span className="font-bold text-[#E53E3E]">Fora há {formatElapsed(departedAt, now)}</span><br/>
                            Saiu às {formatClock(departedAt)} {queuedCount > 0 && ` · +${queuedCount} aguardando`}
                          </>
                        )}
                        {state === 'ASSIGNED' && 'Ainda não saiu para entregar'}
                        {state === 'AVAILABLE' && (freeSince ? `Livre desde ${formatClock(freeSince)} · há ${formatElapsed(freeSince, now)}` : 'Sem entregas hoje')}
                      </p>

                      {stops.length > 0 && (
                        <div className="mt-1.5">
                          {!expanded ? (
                            <button type="button" onClick={() => setExpandedDrivers(prev => new Set(prev).add(driver.id))} className="w-full text-left text-[11px] text-gray-500 flex items-start gap-1 hover:text-[#1A4B9F]" title="Ver paradas">
                              <MapPin size={11} className="mt-0.5 flex-shrink-0 text-[#E53E3E]" />
                              <span className="truncate">{summarizeStops(stops)}</span>
                              {stops.length > 1 && <span className="ml-auto flex-shrink-0 font-semibold text-[#1A4B9F]">ver {stops.length}</span>}
                            </button>
                          ) : (
                            <div>
                              <ul className="space-y-1">
                                {stops.map(stop => (
                                  <li key={stop.id} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                                    <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${stop.left ? 'bg-[#1A4B9F]' : 'bg-[#E65100]'}`} />
                                    <span className="flex-1">
                                      {stop.address}
                                      {!isSameDay(stop.createdAt, now) && (
                                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[9px] whitespace-nowrap">
                                          {formatShortDate(stop.createdAt)}
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{stop.left ? 'em rota' : 'não saiu'}</span>
                                  </li>
                                ))}
                              </ul>
                              <button type="button" onClick={() => setExpandedDrivers(prev => { const next = new Set(prev); next.delete(driver.id); return next; })} className="mt-1.5 text-[10px] font-semibold text-[#1A4B9F] hover:underline">
                                recolher
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button onClick={() => setActiveTab('PENDING')} className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'PENDING' ? 'border-[#1A4B9F] text-[#1A4B9F]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Pendentes ({countPending})
            </button>
            <button onClick={() => setActiveTab('IN_TRANSIT')} className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'IN_TRANSIT' ? 'border-[#1A4B9F] text-[#1A4B9F]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Em Rota ({countTransit})
            </button>
            <button onClick={() => setActiveTab('CANCELED')} className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'CANCELED' ? 'border-[#E53E3E] text-[#E53E3E]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Canceladas ({countCanceled})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {filteredDeliveries.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-10">Nenhuma entrega nesta aba.</p>
            ) : (
              filteredDeliveries.map((delivery) => {
                const isFromPreviousDay = !isSameDay(delivery.createdAt, now);
                let tagColorClass = '';
                let tagText = '';
                if (delivery.status === 'CANCELED') {
                  tagColorClass = 'bg-red-50 text-red-700 border border-red-200'; tagText = 'Cancelada';
                } else if (delivery.status === 'DELIVERED') {
                  tagColorClass = 'bg-[#008A2E] text-white';
                  tagText = `Entregue às ${new Date(delivery.finishedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                } else if (delivery.status === 'IN_TRANSIT' && delivery.startedAt) {
                  tagColorClass = 'bg-[#1A4B9F] text-white'; tagText = 'Em rota';
                } else if (delivery.status === 'IN_TRANSIT') {
                  tagColorClass = 'bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2]'; tagText = 'Aguardando saída';
                }

                return (
                  <div key={delivery.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-[#1A4B9F] font-bold text-sm uppercase">{delivery.customer.name}</h3>
                        <p className="text-gray-800 text-xs mt-1">{formatStreet(delivery.customer)}{delivery.customer.neighborhood ? `${formatStreet(delivery.customer) ? ' — ' : ''}${delivery.customer.neighborhood}` : ''}
                          {delivery.customer.isRural && <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full"><Sprout size={10} /> SÍTIO{delivery.customer.latitude != null ? ' · localização salva' : ' · sem localização'}</span>}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-[10px]"># {delivery.id.substring(0, 5)}</p>
                        <p className="text-gray-800 font-bold text-xs flex items-center justify-end gap-1 mt-0.5">
                          <Clock size={12} className="text-[#E53E3E]" /> {formatOrderTime(delivery.createdAt, now)}
                        </p>
                      </div>
                    </div>
                    {delivery.status === 'CANCELED' && delivery.cancelReason && (
                      <p className="text-xs text-red-600 font-medium mt-1">Motivo: {delivery.cancelReason}</p>
                    )}
                    {delivery.description && (
                      <div className="bg-gray-50 border border-gray-100 p-2 rounded my-2">
                        <p className="text-xs text-gray-600 font-medium"><span className="font-bold">Obs:</span> {delivery.description}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="text-[#1A4B9F] font-medium bg-blue-50 px-2 py-1 rounded text-[10px] flex items-center gap-1"><Package size={12} /> {delivery.boxCount} vol.</span>
                      <PaymentChips delivery={delivery} />
                      {delivery.driver && <span className="text-white font-medium bg-[#E65100] px-2 py-1 rounded-full text-[10px]">Mot. {delivery.driver.name.split(' ')[0]}</span>}
                      {tagText && <span className={`font-medium px-2 py-1 rounded-full text-[10px] ${tagColorClass}`}>{tagText}</span>}
                      {isFromPreviousDay && (
                        <span className="font-semibold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded-full text-[10px]">
                          Dia {formatShortDate(delivery.createdAt)}
                        </span>
                      )}
                    </div>

                    {activeTab === 'PENDING' && !delivery.driver && (
                      <div className="mt-4 flex gap-2 flex-wrap">
                        {drivers.map(driver => (
                          <button key={driver.id} onClick={() => handleChangeDriver(delivery, driver.id)} className="flex-1 text-white text-xs font-semibold py-2 px-2 rounded transition bg-[#1A4B9F] hover:bg-blue-800">
                            Atribuir a {driver.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    )}

                    {delivery.status !== 'CANCELED' && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                        <button type="button" onClick={() => openEdit(delivery)} className="flex items-center gap-1 text-[11px] font-semibold text-[#1A4B9F] bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors">
                          <Pencil size={12} /> Editar
                        </button>
                        <select
                          value={delivery.driver?.id ?? ''}
                          onChange={e => handleChangeDriver(delivery, e.target.value)}
                          title="Trocar motorista"
                          className="text-[11px] font-semibold text-gray-700 border border-gray-300 rounded-md px-2 py-1.5 bg-white outline-none focus:border-[#1A4B9F]"
                        >
                          <option value="">Sem motorista</option>
                          {drivers.map(driver => <option key={driver.id} value={driver.id}>Motorista: {driver.name.split(' ')[0]}</option>)}
                        </select>
                        <button type="button" onClick={() => { setCanceling(delivery); setCancelReason(''); }} className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-[#E53E3E] bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-md transition-colors">
                          <Ban size={12} /> Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#1A4B9F] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Pencil size={18} /> Editar entrega # {editing.id.substring(0, 5)}</h3>
              <button onClick={() => setEditing(null)} className="text-blue-200 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente</label>
                <select value={editForm.customerId} onChange={e => setEditForm({ ...editForm, customerId: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:border-[#1A4B9F] text-sm">
                  {customers.map(c => <option key={c.id} value={c.id}>{c.isRural ? '🌾 ' : ''}{c.name} {c.neighborhood ? `(${c.neighborhood})` : ''}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Volumes / caixas</label>
                  <input type="number" min={1} value={editForm.boxCount} onChange={e => setEditForm({ ...editForm, boxCount: parseInt(e.target.value, 10) || 1 })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Motorista</label>
                  <select value={editForm.driverId} onChange={e => setEditForm({ ...editForm, driverId: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:border-[#1A4B9F] text-sm">
                    <option value="">Sem motorista</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditForm({ ...editForm, isPaid: true, changeFor: '' })} className={`p-2.5 border-2 rounded-lg text-xs font-extrabold ${editForm.isPaid ? 'bg-green-50 border-green-500 text-green-800' : 'bg-white border-gray-300 text-gray-500'}`}>JÁ FOI PAGO</button>
                <button type="button" onClick={() => setEditForm({ ...editForm, isPaid: false })} className={`p-2.5 border-2 rounded-lg text-xs font-extrabold ${!editForm.isPaid ? 'bg-[#FFF3E0] border-[#E65100] text-[#9A3412]' : 'bg-white border-gray-300 text-gray-500'}`}>RECEBER NA ENTREGA</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{editForm.isPaid ? 'Valor (R$) — já pago' : 'Valor a cobrar (R$) *'}</label>
                  <input type="text" inputMode="decimal" placeholder="0,00" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Forma</label>
                  <select value={editForm.payment} onChange={e => setEditForm({ ...editForm, payment: e.target.value, changeFor: e.target.value === 'Dinheiro' ? editForm.changeFor : '' })} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:border-[#1A4B9F] text-sm">
                    {['Dinheiro', 'Cartão', 'Pix'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {!editForm.isPaid && editForm.payment === 'Dinheiro' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Troco para R$</label>
                  <input type="text" inputMode="decimal" placeholder="0,00" value={editForm.changeFor} onChange={e => setEditForm({ ...editForm, changeFor: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] text-sm" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Observação</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-[#1A4B9F] resize-none h-20" />
              </div>

              <button type="submit" disabled={savingEdit} className="w-full bg-[#1A4B9F] text-white font-bold text-sm py-3 rounded-lg shadow-sm hover:bg-blue-800 transition-colors disabled:opacity-50">
                {savingEdit ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </form>
          </div>
        </div>
      )}

      {canceling && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#E53E3E] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Ban size={18} /> Cancelar entrega</h3>
              <button onClick={() => setCanceling(null)} className="text-red-100 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-700">
                Cancelar a entrega de <span className="font-bold">{canceling.customer.name}</span>?
              </p>
              {canceling.startedAt && (
                <p className="text-xs font-semibold text-[#9A3412] bg-[#FFF3E0] border border-[#FFE0B2] rounded-lg p-2.5">
                  Esta entrega já saiu com o motorista. Ele deixará de ver a entrega no app.
                </p>
              )}
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Motivo (opcional): cliente desistiu, endereço errado..."
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-[#E53E3E]"
              />
              <div className="flex gap-2">
                <button onClick={() => setCanceling(null)} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50">Voltar</button>
                <button onClick={handleConfirmCancel} disabled={savingCancel} className="flex-1 py-2.5 rounded-lg bg-[#E53E3E] text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                  {savingCancel ? 'Cancelando...' : 'Cancelar entrega'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#1A4B9F] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><MapPin size={18} /> Cadastrar Novo Cliente</h3>
              <button onClick={resetCustomerModal} className="text-blue-200 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4 overflow-y-auto">
              <button
                type="button"
                onClick={() => setIsRural(v => !v)}
                className={`w-full flex items-start gap-3 text-left p-3 rounded-lg border-2 transition-colors ${isRural ? 'bg-amber-50 border-amber-400' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              >
                <Sprout size={20} className={isRural ? 'text-amber-600 mt-0.5' : 'text-gray-400 mt-0.5'} />
                <span className="flex-1">
                  <span className={`block text-xs font-extrabold ${isRural ? 'text-amber-800' : 'text-gray-600'}`}>
                    {isRural ? 'É SÍTIO / ZONA RURAL' : 'É sítio / zona rural?'}
                  </span>
                  <span className="block text-[11px] text-gray-500 leading-snug">
                    {isRural
                      ? 'Rua e número são opcionais. Na primeira entrega o motorista marca a localização no celular e nas próximas já vai direto.'
                      : 'Toque se o cliente mora em sítio, sem rua/número formal.'}
                  </span>
                </span>
                <span className={`mt-0.5 w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${isRural ? 'bg-amber-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                  <span className="w-4 h-4 bg-white rounded-full shadow" />
                </span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Cliente / Local *</label>
                  <input required autoFocus type="text" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" placeholder="Ex: Dona Maria / Mercado Central" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone / WhatsApp</label>
                  <input type="text" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" placeholder="(13) 99999-9999" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Cidade *</label>
                  <select value={selectedCity} onChange={e => handleCityChange(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm">
                    {CIDADES_VALE.map(city => <option key={city} value={city}>{city === 'Outra' ? 'Outra cidade...' : `${city} - SP`}</option>)}
                  </select>
                </div>

                {selectedCity === 'Outra' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Qual Cidade? *</label>
                    <input required type="text" value={customCity} onChange={e => setCustomCity(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" placeholder="Digite o nome da cidade" />
                  </div>
                )}

                <div className={selectedCity === 'Outra' ? 'sm:col-span-2' : ''}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-600">Bairro *</label>
                    {selectedCity === 'Registro' && (
                      <button
                        type="button"
                        onClick={() => {
                          setRawNeighborhood(isManualNeighborhood ? 'Centro' : '');
                          setIsManualNeighborhood(!isManualNeighborhood);
                        }}
                        className="text-[11px] font-semibold text-[#1A4B9F] hover:underline"
                      >
                        {isManualNeighborhood ? 'Escolher da lista' : 'Digitar outro bairro'}
                      </button>
                    )}
                  </div>
                  {selectedCity === 'Registro' && !isManualNeighborhood ? (
                    <select
                      required
                      value={rawNeighborhood}
                      onChange={e => setRawNeighborhood(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm"
                    >
                      {BAIRROS_REGISTRO.map(bairro => <option key={bairro} value={bairro}>{bairro}</option>)}
                    </select>
                  ) : (
                    <input
                      required
                      type="text"
                      value={rawNeighborhood}
                      onChange={e => setRawNeighborhood(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm"
                      placeholder={`Digite o bairro em ${activeCityName}`}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{isRural ? 'Rua / Estrada (opcional)' : 'Rua / Logradouro *'}</label>
                  <input required={!isRural} type="text" value={newCustomer.street} onChange={e => { setNewCustomer({ ...newCustomer, street: e.target.value }); setShowSuggestions(true); }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" placeholder="Digite o nome da rua..." />

                  {showSuggestions && streetSuggestions.length > 0 && (
                    <ul className="absolute z-30 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {streetSuggestions.map((item, idx) => (
                        <li key={`${item.cep}-${idx}`} onMouseDown={() => handleSelectSuggestion(item)} className="cursor-pointer border-b border-gray-100 px-3 py-2 text-xs hover:bg-blue-50 last:border-none">
                          <p className="font-semibold text-gray-800">{item.logradouro}</p>
                          <p className="text-[11px] text-gray-500">{item.bairro ? `${item.bairro} • ` : ''}CEP: {item.cep}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{isRural ? 'Número (opc.)' : 'Número *'}</label>
                  <input required={!isRural} type="text" value={newCustomer.number} onChange={e => setNewCustomer({ ...newCustomer, number: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" placeholder="Ex: 123" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{isRural ? 'Como chegar / referência (ajuda o motorista na 1ª vez)' : 'Ponto de Referência (opcional)'}</label>
                <input type="text" value={newCustomer.reference} onChange={e => setNewCustomer({ ...newCustomer, reference: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" placeholder={isRural ? 'Ex: Estrada do Rocio, km 3, porteira verde depois da igreja' : 'Ex: Próximo à praça, portão azul...'} />
              </div>

              <button type="submit" disabled={loadingCustomer} className="w-full bg-[#1A4B9F] text-white font-bold text-sm py-3 mt-2 rounded-lg shadow-sm hover:bg-blue-800 active:bg-blue-900 transition-colors disabled:opacity-50">
                {loadingCustomer ? 'Salvando...' : 'Salvar e Selecionar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
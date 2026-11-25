import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Package, CheckCircle2, Clock, Hourglass, Route, Circle, Loader2, WifiOff, AlertTriangle, Users, UserPlus, X, Trash2, Shield, Calendar, Search, MapPin, ChevronRight } from 'lucide-react';
import { DeliveryMap } from '../../components/ui/DeliveryMap';
import { PaymentChips } from '../../components/ui/PaymentBadges';
import { formatBRL } from '../../utils/money';

export interface DashboardDelivery {
  id: string; status: string; createdAt: string; startedAt: string | null; finishedAt: string | null;
  assignedAt: string | null; startLatitude: number | null; startLongitude: number | null;
  endLatitude: number | null; endLongitude: number | null; driverId: string | null;
  customer: { name: string; neighborhood: string; street?: string; number?: string };
  driver: { id: string; name: string } | null;
  isPaid?: boolean; amount?: number | null; paymentMethod?: string; changeFor?: number | null;
  boxCount?: number; description?: string | null;
  tripId?: string | null; cancelReason?: string | null;
}

export interface DashboardTrip {
  id: string; driverId: string; leftAt: string; returnedAt: string | null; estimated: boolean;
}

export interface TripView {
  id: string; numero: number; dataReferencia: string; primeiraSaida: string | null;
  retornoBase: string | null; aindaFora: boolean; qtdEntregas: number; tempoForaMercado: number;
  estimado: boolean; aguardandoSaida: boolean; entregas: DashboardDelivery[];
}

export interface HistoryFilters {
  startDate: string; endDate: string; driver: string; status: string; search: string;
}

export interface DashboardDriver {
  id: string; name: string; status: 'EM_ROTA' | 'VOLTANDO' | 'NO_MERCADO' | 'INDEFINIDO'; queuedCount?: number; openTripLeftAt?: string | null; connectionStatus: 'ONLINE' | 'SINAL_PERDIDO' | 'DESCONECTADO';
  currentDelivery: DashboardDelivery | null;
  lastLocation: { latitude: number; longitude: number; at: string | null; } | null;
}

interface DashboardData {
  metrics: { totalToday: number; completed: number; pending: number; canceled?: number; avgIdleTime: number; avgRouteTime: number; };
  drivers: Array<DashboardDriver>;
  history: Array<DashboardDelivery>;
  trips?: Array<DashboardTrip>;
}

const isSameDay = (isoString: string, nowMs: number) =>
  new Date(isoString).toDateString() === new Date(nowMs).toDateString();

const formatShortDate = (isoString: string) =>
  new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const formatTime = (isoString?: string | null) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatTimeWithDate = (isoString?: string | null, nowMs?: number) => {
  if (!isoString) return '-';
  const time = formatTime(isoString);
  if (nowMs && !isSameDay(isoString, nowMs)) {
    return `${formatShortDate(isoString)} · ${time}`;
  }
  return time;
};

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString('pt-BR');
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
};

const calcMinutesNumber = (start?: string | null, end?: string | null | number) => {
  if (!start) return 0;
  const endTime = end ? (typeof end === 'number' ? end : new Date(end).getTime()) : Date.now();
  const diff = endTime - new Date(start).getTime();
  return Math.max(0, Math.round(diff / 60000));
};

const getAvatarColor = (name: string) => {
  const colors = ['bg-[#1A4B9F]', 'bg-[#E65100]', 'bg-green-600', 'bg-purple-600'];
  return colors[name.charCodeAt(0) % colors.length];
};

const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const defaultHistoryFilters = (): HistoryFilters => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return { startDate: toInputDate(start), endDate: toInputDate(end), driver: 'ALL', status: 'ALL', search: '' };
};

interface AdminLocationState {
  openHistory?: boolean;
  filters?: HistoryFilters;
}

export function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = useRef(location.state as AdminLocationState | null);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const [showUserModal, setShowUserModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(Boolean(restoredState.current?.openHistory));

  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'MOTORISTA' });
  const [loadingUser, setLoadingUser] = useState(false);

  const [historyData, setHistoryData] = useState<DashboardDelivery[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>(
    () => restoredState.current?.filters ?? defaultHistoryFilters()
  );
  const [unassigned, setUnassigned] = useState<DashboardDelivery[]>([]);
  const [tripDriver, setTripDriver] = useState('ALL');

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await axios.get(`${API_URL}/admin/dashboard`);
        setData(response.data);
      } catch (error) {} finally { setLoading(false); }
    }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    const clock = setInterval(() => setNow(Date.now()), 15000);

    return () => { clearInterval(interval); clearInterval(clock); };
  }, [API_URL]);

  useEffect(() => {
    async function fetchUnassigned() {
      try {
        const response = await axios.get(`${API_URL}/deliveries`);
        const list: DashboardDelivery[] = Array.isArray(response.data) ? response.data : [];
        setUnassigned(
          list
            .filter(d => !d.driver && d.status !== 'DELIVERED' && d.status !== 'CANCELED')
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
      } catch {}
    }
    fetchUnassigned();
    const interval = setInterval(fetchUnassigned, 5000);
    return () => clearInterval(interval);
  }, [API_URL]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsersList(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingUser(true);
    try {
      await axios.post(`${API_URL}/users`, newUser);
      setNewUser({ name: '', email: '', password: '', role: 'MOTORISTA' });
      fetchUsers();
      alert('Usuário cadastrado com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao cadastrar usuário.');
    } finally {
      setLoadingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    try {
      await axios.delete(`${API_URL}/users/${id}`);
      fetchUsers();
    } catch (error) {
      alert('Erro ao excluir usuário.');
    }
  };

  const loadHistory = useCallback(async (source: HistoryFilters) => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API_URL}/admin/history`, {
        params: { startDate: source.startDate, endDate: source.endDate, status: 'ALL' }
      });
      setHistoryData(response.data);
    } catch {
      alert('Erro ao buscar histórico.');
    } finally {
      setLoadingHistory(false);
    }
  }, [API_URL]);

  const fetchHistory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    return loadHistory(filters);
  };

  useEffect(() => {
    const restored = restoredState.current;
    if (!restored?.openHistory) return;
    restoredState.current = null;
    loadHistory(restored.filters ?? defaultHistoryFilters());
    navigate(location.pathname, { replace: true, state: null });
  }, [loadHistory, navigate, location.pathname]);

  const updateFilter = <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const goToDetails = (deliveryId: string, fromHistory = false) =>
    navigate(`/admin/entrega/${deliveryId}`, fromHistory ? { state: { from: 'history', filters } } : undefined);

  // Viagem = uma saída do motorista (do raio do mercado até a volta), registrada pelo servidor.
  // Entrega atribuída enquanto ele já está na rua entra na viagem atual (recebe a saída dele).
  const getTripsByDriver = (): Record<string, TripView[]> => {
    if (!data) return {};
    const allTrips = data.trips ?? [];
    const ms = (iso?: string | null) => (iso ? new Date(iso).getTime() : null);
    const sortKey = (d: DashboardDelivery) => ms(d.startedAt) ?? ms(d.createdAt) ?? 0;

    const byDriver: Record<string, { name: string; deliveries: DashboardDelivery[] }> = {};
    data.history.forEach(d => {
      if (!d.driver || d.status === 'CANCELED') return;
      if (tripDriver !== 'ALL' && d.driver.id !== tripDriver) return;
      if (!byDriver[d.driver.id]) byDriver[d.driver.id] = { name: d.driver.name, deliveries: [] };
      byDriver[d.driver.id].deliveries.push(d);
    });

    const result: Record<string, TripView[]> = {};

    Object.entries(byDriver).forEach(([driverId, { name, deliveries }]) => {
      const views: Omit<TripView, 'numero'>[] = [];

      allTrips.filter(t => t.driverId === driverId).forEach(t => {
        const entregas = deliveries.filter(d => d.tripId === t.id).sort((a, b) => sortKey(a) - sortKey(b));
        if (entregas.length === 0) return;
        const left = new Date(t.leftAt).getTime();
        const back = ms(t.returnedAt);
        views.push({
          id: t.id, dataReferencia: t.leftAt, primeiraSaida: t.leftAt, retornoBase: t.returnedAt,
          aindaFora: back === null, qtdEntregas: entregas.length, estimado: t.estimated, aguardandoSaida: false,
          tempoForaMercado: Math.max(0, Math.round(((back ?? now) - left) / 60000)), entregas,
        });
      });

      // Entregas sem saída registrada
      const orphans = deliveries.filter(d => !d.tripId);

      // iniciadas, mas sem GPS de saída (dados antigos / celular sem sinal): agrupa por horário, valor estimado
      const legacy = orphans.filter(d => d.startedAt).sort((a, b) => sortKey(a) - sortKey(b));
      let group: DashboardDelivery[] = [];
      const flush = () => {
        if (group.length === 0) return;
        const first = ms(group[0].startedAt)!;
        const unfinished = group.some(d => !d.finishedAt);
        const lastEnd = Math.max(...group.map(d => ms(d.finishedAt) ?? 0));
        views.push({
          id: `legacy-${group[0].id}`, dataReferencia: group[0].startedAt!, primeiraSaida: group[0].startedAt,
          retornoBase: null, aindaFora: unfinished, qtdEntregas: group.length, estimado: true, aguardandoSaida: false,
          tempoForaMercado: Math.max(0, Math.round(((unfinished ? now : lastEnd) - first) / 60000)), entregas: group,
        });
        group = [];
      };
      legacy.forEach(d => {
        if (group.length > 0) {
          const prevEnd = group.some(x => !x.finishedAt) ? now : Math.max(...group.map(x => ms(x.finishedAt) ?? 0));
          if ((ms(d.startedAt)! - prevEnd) / 60000 > 90) flush();
        }
        group.push(d);
      });
      flush();

      views.sort((a, b) => new Date(a.dataReferencia).getTime() - new Date(b.dataReferencia).getTime());
      const numbered: TripView[] = views.map((v, index) => ({ ...v, numero: index + 1 }));

      // ainda no mercado, esperando sair
      const waiting = orphans.filter(d => !d.startedAt).sort((a, b) => sortKey(a) - sortKey(b));
      if (waiting.length > 0) {
        numbered.push({
          id: `waiting-${driverId}`, numero: 0, dataReferencia: waiting[0].createdAt, primeiraSaida: null,
          retornoBase: null, aindaFora: false, qtdEntregas: waiting.length, tempoForaMercado: 0,
          estimado: false, aguardandoSaida: true, entregas: waiting,
        });
      }

      if (numbered.length > 0) result[name] = numbered;
    });

    return result;
  };

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#1A4B9F]" size={40} />
      </div>
    );
  }

  const viagensAgrupadas = getTripsByDriver();

  const todasViagens = Object.values(viagensAgrupadas).flat();
  const viagensComTempo = todasViagens.filter(v => !v.aguardandoSaida && !v.aindaFora && v.tempoForaMercado > 0);
  const mediaTempoFora = viagensComTempo.length > 0
    ? Math.round(viagensComTempo.reduce((acc, v) => acc + v.tempoForaMercado, 0) / viagensComTempo.length)
    : 0;

  const searchTerm = filters.search.toLowerCase();
  const filteredHistory = historyData.filter(h => {
    const matchesSearch =
      h.customer.name.toLowerCase().includes(searchTerm) ||
      h.driver?.name.toLowerCase().includes(searchTerm) ||
      h.customer.neighborhood?.toLowerCase().includes(searchTerm);
    const matchesDriver =
      filters.driver === 'ALL' ||
      (filters.driver === 'NONE' ? !h.driver : h.driver?.id === filters.driver);
    const matchesStatus = filters.status === 'ALL' || h.status === filters.status;
    return matchesSearch && matchesDriver && matchesStatus;
  });

  const historyDriverNames: Record<string, string> = {};
  historyData.forEach(h => {
    if (h.driver) historyDriverNames[h.driver.id] = h.driver.name;
  });
  const historyDrivers = Object.entries(historyDriverNames).sort((a, b) => a[1].localeCompare(b[1]));

  const totalPaid = filteredHistory.filter(h => h.isPaid).reduce((sum, h) => sum + (h.amount ?? 0), 0);
  const totalToCollect = filteredHistory.filter(h => !h.isPaid).reduce((sum, h) => sum + (h.amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1A4B9F]">Gestão de Entregas</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Monitoramento em tempo real</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { setShowHistoryModal(true); fetchHistory(); }}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm hover:bg-green-700 transition-colors"
          >
            <Calendar size={14} /> Histórico Filtrado
          </button>
          <button
            onClick={() => { setShowUserModal(true); fetchUsers(); }}
            className="flex items-center gap-2 bg-[#1A4B9F] text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm hover:bg-blue-800 transition-colors"
          >
            <Users size={14} /> Gerenciar Equipe
          </button>
          <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            GPS ao vivo
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <Package size={20} className="text-indigo-600 mb-2" />
          <span className="text-2xl font-bold text-gray-800">{data.metrics.totalToday}</span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Entregas do dia</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <CheckCircle2 size={20} className="text-green-500 mb-2" />
          <span className="text-2xl font-bold text-gray-800">{data.metrics.completed}</span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Finalizadas</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <Clock size={20} className="text-orange-500 mb-2" />
          <span className="text-2xl font-bold text-gray-800">{data.metrics.pending}</span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Pendentes / em rota</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <Hourglass size={20} className="text-red-500 mb-2" />
          <span className="text-2xl font-bold text-gray-800 flex items-baseline gap-1">
            {mediaTempoFora} <span className="text-sm font-normal text-gray-500">min</span>
          </span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Tempo médio fora</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center col-span-2 md:col-span-1">
          <Route size={20} className="text-purple-600 mb-2" />
          <span className="text-2xl font-bold text-gray-800 flex items-baseline gap-1">
            {data.metrics.avgRouteTime} <span className="text-sm font-normal text-gray-500">min</span>
          </span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Tempo de rota médio</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 relative z-0 overflow-hidden min-h-[420px]">
          <button
            type="button"
            onClick={() => setSelectedDeliveryId(null)}
            className={`absolute top-3 right-3 z-[400] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-colors ${
              selectedDeliveryId
                ? 'bg-[#1A4B9F] text-white hover:bg-blue-800'
                : 'bg-white/95 text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <MapPin size={14} />
            {selectedDeliveryId ? 'Ver todas as localizações' : 'Todas as localizações'}
          </button>

          <DeliveryMap drivers={data.drivers} deliveries={data.history} selectedDeliveryId={selectedDeliveryId} />
        </div>

        <div className="w-full lg:w-[320px] bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-[400px] z-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Motoristas</h3>
          <div className="flex-1 overflow-y-auto space-y-5">
            {data.drivers.length === 0 && <p className="text-sm text-gray-400">Nenhum motorista cadastrado.</p>}

            {data.drivers.map((driver) => (
              <div key={driver.id} className="pb-4 border-b border-gray-50 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full ${getAvatarColor(driver.name)} text-white flex items-center justify-center text-xs font-bold uppercase`}>
                      {driver.name.charAt(0)}
                    </div>
                    <span className="font-bold text-gray-800 text-sm capitalize">{driver.name}</span>
                  </div>

                  {driver.connectionStatus === 'ONLINE' && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Online</span>}
                  {driver.connectionStatus === 'SINAL_PERDIDO' && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle size={10} /> Sinal perdido</span>}
                  {driver.connectionStatus === 'DESCONECTADO' && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1"><WifiOff size={10} /> Desconectado</span>}
                </div>

                {driver.connectionStatus === 'DESCONECTADO' ? (
                  <div className="text-gray-400 text-xs font-medium mb-1">Motorista desconectado</div>
                ) : driver.status === 'EM_ROTA' && driver.currentDelivery?.startedAt ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <div className="bg-[#1A4B9F] text-white text-[10px] font-semibold px-2 py-1 rounded w-fit">
                        Fora do mercado há {formatDuration(calcMinutesNumber(driver.openTripLeftAt ?? driver.currentDelivery.startedAt, now))}
                      </div>
                      {!isSameDay(driver.currentDelivery.createdAt, now) && (
                        <span className="font-semibold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                          Dia {formatShortDate(driver.currentDelivery.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-tight">
                      → Indo para {driver.currentDelivery?.customer?.neighborhood}
                      {(driver.queuedCount ?? 0) > 0 && ` · +${driver.queuedCount} aguardando`}
                    </p>
                  </>
                ) : driver.status === 'VOLTANDO' ? (
                  <div className="text-[#1A4B9F] text-xs font-semibold mb-1">
                    Fora do mercado há {formatDuration(calcMinutesNumber(driver.openTripLeftAt, now))} · voltando
                    {(driver.queuedCount ?? 0) > 0 && <span className="text-gray-500 font-medium"> · {driver.queuedCount} aguardando</span>}
                  </div>
                ) : driver.status === 'NO_MERCADO' ? (
                  <div className="text-[#E65100] text-xs font-semibold mb-1 flex items-center gap-1.5">
                    <Circle size={8} fill="currentColor" /> Disponível no mercado
                    {(driver.queuedCount ?? 0) > 0 && <span className="text-gray-500 font-medium">· {driver.queuedCount} aguardando saída</span>}
                  </div>
                ) : (
                  <div className="text-gray-400 text-xs font-medium mb-1">Aguardando localização</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`rounded-xl shadow-sm border p-5 ${unassigned.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Entregas sem motorista</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${unassigned.length > 0 ? 'bg-[#E65100] text-white' : 'bg-gray-100 text-gray-500'}`}>
            {unassigned.length}
          </span>
        </div>

        {unassigned.length === 0 ? (
          <p className="text-sm text-gray-400">Todas as entregas abertas já têm motorista.</p>
        ) : (
          <div className="space-y-2">
            {unassigned.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => goToDetails(d.id)}
                className="w-full text-left flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-white border border-amber-200 hover:border-[#E65100] transition-colors"
              >
                <div>
                  <p className="font-semibold text-gray-800 capitalize text-sm">{d.customer.name}</p>
                  <p className="text-xs text-gray-500">
                    {[d.customer.neighborhood, [d.customer.street, d.customer.number].filter(Boolean).join(', ')].filter(Boolean).join(' — ')}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Registrada {formatTimeWithDate(d.createdAt, now)} · aguardando há {formatDuration(calcMinutesNumber(d.createdAt, now))}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <PaymentChips delivery={d} />
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Relatório de Viagens e Entregas (Hoje e Em Aberto)
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={tripDriver}
              onChange={e => setTripDriver(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white outline-none focus:border-[#1A4B9F]"
            >
              <option value="ALL">Todos os motoristas</option>
              {data.drivers.map(driver => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
            {selectedDeliveryId && (
              <button
                type="button"
                onClick={() => setSelectedDeliveryId(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#1A4B9F] bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
              >
                <MapPin size={12} /> Ver todas as localizações no mapa
              </button>
            )}
          </div>
        </div>

        {Object.keys(viagensAgrupadas).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhuma entrega registrada hoje.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(viagensAgrupadas).map(([driverName, viagens]) => (
              <div key={driverName} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                <h4 className="font-bold text-[#1A4B9F] capitalize mb-3 flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${getAvatarColor(driverName)} text-white flex items-center justify-center text-[10px] font-bold uppercase`}>
                    {driverName.charAt(0)}
                  </div>
                  Motorista: {driverName}
                </h4>

                <div className="space-y-4">
                  {viagens.map(viagem => (
                    <div key={viagem.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-blue-200 transition-colors">
                      <div className="flex flex-wrap gap-4 justify-between items-center mb-4 pb-3 border-b border-gray-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{viagem.aguardandoSaida ? 'Aguardando saída' : `Viagem #${viagem.numero}`}</span>
                            {viagem.estimado && <span className="text-[10px] font-semibold text-gray-400">(estimado, sem GPS)</span>}
                            {!isSameDay(viagem.dataReferencia, now) && (
                              <span className="font-semibold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                                Dia {formatShortDate(viagem.dataReferencia)}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-gray-800 mt-1 flex items-center gap-2">
                            {viagem.primeiraSaida ? `Saiu às ${formatTimeWithDate(viagem.primeiraSaida, now)}` : 'Ainda no mercado'}
                            {viagem.primeiraSaida && <span className="text-gray-300">→</span>}
                            {viagem.retornoBase ? (
                              <span className="text-green-700">Voltou às {formatTimeWithDate(viagem.retornoBase, now)}</span>
                            ) : viagem.aindaFora ? (
                              <span className="text-blue-600 animate-pulse">Fora do mercado</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex gap-6">
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Tempo Fora do Mercado</div>
                            <div className={`text-sm font-bold px-2.5 py-0.5 rounded text-center inline-block ${
                              viagem.aindaFora
                                ? 'text-[#E53E3E] bg-red-50 animate-pulse'
                                : 'text-[#1A4B9F] bg-blue-50'
                            }`}>
                              {viagem.primeiraSaida ? formatDuration(viagem.tempoForaMercado) : '-'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Entregas Feitas</div>
                            <div className="text-sm font-bold text-gray-800 bg-gray-100 px-3 py-0.5 rounded text-center inline-block">{viagem.qtdEntregas}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {viagem.entregas.map((entrega, idx) => {
                          const isFromPreviousDay = !isSameDay(entrega.createdAt, now);
                          const horaInicio = entrega.startedAt ? formatTimeWithDate(entrega.startedAt, now) : null;
                          const horaFim = entrega.finishedAt ? formatTimeWithDate(entrega.finishedAt, now) : null;

                          let tagClass = 'bg-gray-50 text-gray-600 border border-gray-200';
                          let tagText = 'Aguardando início';
                          if (entrega.status === 'DELIVERED') {
                            tagClass = 'bg-green-50 text-green-700 border border-green-100';
                            tagText = `Entregue às ${horaFim}`;
                          } else if (entrega.status === 'IN_TRANSIT' && entrega.startedAt) {
                            tagClass = 'bg-blue-50 text-blue-700 border border-blue-100';
                            tagText = 'Em rota';
                          }

                          return (
                            <div
                              key={entrega.id}
                              className={`flex flex-wrap justify-between items-center gap-2 text-sm p-2 rounded transition-colors group cursor-pointer ${
                                selectedDeliveryId === entrega.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-blue-50/50'
                              }`}
                              onClick={() => setSelectedDeliveryId(selectedDeliveryId === entrega.id ? null : entrega.id)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-300 w-4">{idx + 1}.</span>
                                <div className="flex items-center flex-wrap gap-1.5">
                                  <span className="font-semibold text-gray-700 capitalize">{entrega.customer.name}</span>
                                  <span className="text-[11px] text-gray-400">({entrega.customer.neighborhood})</span>
                                  {isFromPreviousDay && (
                                    <span className="font-semibold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full text-[10px]">
                                      Dia {formatShortDate(entrega.createdAt)} · {formatTime(entrega.createdAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <PaymentChips delivery={entrega} />
                                {entrega.assignedAt && (
                                  <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-100">
                                    Atribuída às {formatTime(entrega.assignedAt)}
                                  </span>
                                )}
                                {horaInicio && (
                                  <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-indigo-50 text-[#1A4B9F] border border-indigo-100">
                                    Iniciada às {horaInicio}
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${tagClass}`}>
                                  {tagText}
                                </span>
                                <button
                                  type="button"
                                  onClick={(ev) => { ev.stopPropagation(); goToDetails(entrega.id); }}
                                  className="text-[10px] font-bold px-2 py-1 rounded-md text-[#1A4B9F] bg-white border border-blue-200 hover:bg-blue-50 transition-colors"
                                >
                                  Detalhes ›
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh]">

            <div className="bg-[#1A4B9F] text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2"><Calendar size={18} /> Histórico de Entregas</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-blue-200 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-100 shrink-0">
              <form onSubmit={fetchHistory} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Data Inicial</label>
                  <input type="date" value={filters.startDate} onChange={e => updateFilter('startDate', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-[#1A4B9F]" />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Data Final</label>
                  <input type="date" value={filters.endDate} onChange={e => updateFilter('endDate', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-[#1A4B9F]" />
                </div>
                <button type="submit" disabled={loadingHistory} className="bg-[#1A4B9F] text-white px-6 py-2 rounded-lg text-sm font-bold shadow hover:bg-blue-800 disabled:opacity-50 h-[38px] w-full sm:w-auto">
                  {loadingHistory ? 'Buscando...' : 'Filtrar'}
                </button>
              </form>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Motorista</label>
                  <select value={filters.driver} onChange={e => updateFilter('driver', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:border-[#1A4B9F]">
                    <option value="ALL">Todos</option>
                    <option value="NONE">Sem motorista</option>
                    {historyDrivers.map(([driverId, driverName]) => (
                      <option key={driverId} value={driverId}>{driverName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Situação</label>
                  <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white outline-none focus:border-[#1A4B9F]">
                    <option value="ALL">Todas</option>
                    <option value="PENDING">Pendentes</option>
                    <option value="IN_TRANSIT">Em andamento</option>
                    <option value="DELIVERED">Entregues</option>
                    <option value="CANCELED">Canceladas</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, motorista ou bairro nos resultados abaixo..."
                  value={filters.search}
                  onChange={e => updateFilter('search', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 pl-9 text-sm outline-none focus:border-[#1A4B9F]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white sticky top-0 shadow-sm">
                  <tr className="text-gray-400 border-b border-gray-100 text-[11px] uppercase">
                    <th className="p-4 font-medium">Data</th>
                    <th className="p-4 font-medium">Cliente</th>
                    <th className="p-4 font-medium">Local</th>
                    <th className="p-4 font-medium">Motorista</th>
                    <th className="p-4 font-medium">Pagamento</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {filteredHistory.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-400 text-sm">Nenhuma entrega encontrada para este período.</td></tr>
                  )}
                  {filteredHistory.map((h) => (
                    <tr key={h.id} onClick={() => goToDetails(h.id, true)} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="p-4 font-medium text-gray-600">{formatDate(h.createdAt)} <span className="text-[10px] ml-1">{formatTime(h.createdAt)}</span></td>
                      <td className="p-4 font-semibold text-gray-800 capitalize">{h.customer.name}</td>
                      <td className="p-4 text-gray-500">{h.customer.neighborhood}</td>
                      <td className="p-4 text-gray-600">{h.driver?.name || '-'}</td>
                      <td className="p-4"><PaymentChips delivery={h} /></td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {h.assignedAt && (
                            <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-amber-50 text-amber-800">
                              Atribuída às {formatTime(h.assignedAt)}
                            </span>
                          )}
                          {h.startedAt && (
                            <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-indigo-50 text-[#1A4B9F]">
                              Iniciada às {formatTime(h.startedAt)}
                            </span>
                          )}
                          {h.status === 'DELIVERED' ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-green-50 text-green-700">Entregue às {formatTime(h.finishedAt)}</span>
                          ) : h.status === 'CANCELED' ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-50 text-red-700">Cancelada</span>
                          ) : h.status === 'IN_TRANSIT' && h.startedAt ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700">Em rota</span>
                          ) : h.status === 'IN_TRANSIT' ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-orange-50 text-orange-700">Aguardando saída</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-600">Pendente</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-300"><ChevronRight size={16} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white border-t border-gray-100 p-3 shrink-0 flex justify-between items-center text-xs text-gray-500 font-semibold">
              <span>Mostrando {filteredHistory.length} entregas</span>
              <span className="flex items-center gap-4 flex-wrap justify-end">
                <span className="text-green-700">Já pagas: {formatBRL(totalPaid)}</span>
                <span className="text-[#E65100]">A cobrar: {formatBRL(totalToCollect)}</span>
                <span className="text-gray-800">Total: {formatBRL(totalPaid + totalToCollect)}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="bg-[#1A4B9F] text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2"><Users size={18} /> Gerenciar Equipe</h3>
              <button onClick={() => setShowUserModal(false)} className="text-blue-200 hover:text-white"><X size={20} /></button>
            </div>

            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              <div className="w-full md:w-1/3 p-5 border-r border-gray-100 bg-gray-50 overflow-y-auto">
                <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <UserPlus size={16} className="text-[#1A4B9F]" /> Novo Usuário
                </h4>
                <form onSubmit={handleRegisterUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nome Completo *</label>
                    <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" placeholder="Nome do funcionário" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail de Acesso *</label>
                    <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" placeholder="email@precobom.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Senha de Acesso *</label>
                    <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" placeholder="Digite uma senha segura" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cargo / Função *</label>
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm">
                      <option value="MOTORISTA">Motorista (App Mobile)</option>
                      <option value="CAIXA">Caixa (PWA)</option>
                      <option value="ADMIN">Administrador (PWA)</option>
                    </select>
                  </div>
                  <button type="submit" disabled={loadingUser} className="w-full bg-[#1A4B9F] text-white font-bold text-sm py-3 mt-2 rounded-lg shadow-sm hover:bg-blue-800 active:bg-blue-900 transition-colors disabled:opacity-50">
                    {loadingUser ? 'Cadastrando...' : 'Cadastrar Usuário'}
                  </button>
                </form>
              </div>

              <div className="w-full md:w-2/3 p-5 overflow-y-auto bg-white">
                <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield size={16} className="text-[#1A4B9F]" /> Usuários Cadastrados
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100 text-[11px] uppercase">
                        <th className="pb-3 font-medium">Nome</th>
                        <th className="pb-3 font-medium">E-mail</th>
                        <th className="pb-3 font-medium">Cargo</th>
                        <th className="pb-3 font-medium text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {usersList.length === 0 && (
                        <tr><td colSpan={4} className="py-4 text-center text-gray-400 text-sm">Nenhum usuário cadastrado.</td></tr>
                      )}
                      {usersList.map((u) => (
                        <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 font-semibold text-gray-800 capitalize">{u.name}</td>
                          <td className="py-3 text-gray-500">{u.email}</td>
                          <td className="py-3">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                              u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' :
                              u.role === 'CAIXA' ? 'bg-blue-50 text-blue-700' :
                              'bg-orange-50 text-orange-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Excluir usuário">
                              <Trash2 size={16} className="mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
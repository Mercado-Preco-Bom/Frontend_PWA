import { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, CheckCircle2, Clock, Hourglass, Route, Circle, Loader2, WifiOff, AlertTriangle, Users, UserPlus, X, Trash2, Shield, Calendar, Search } from 'lucide-react';
import { DeliveryMap } from '../../components/ui/DeliveryMap';

export interface DashboardDelivery {
  id: string; status: string; createdAt: string; startedAt: string | null; finishedAt: string | null;
  assignedAt: string | null; startLatitude: number | null; startLongitude: number | null;
  endLatitude: number | null; endLongitude: number | null; driverId: string | null;
  customer: { name: string; neighborhood: string; street?: string; number?: string };
  driver: { id: string; name: string } | null;
}

export interface DashboardDriver {
  id: string; name: string; status: 'EM_ROTA' | 'DISPONIVEL'; connectionStatus: 'ONLINE' | 'SINAL_PERDIDO' | 'DESCONECTADO';
  currentDelivery: DashboardDelivery | null;
  lastLocation: { latitude: number; longitude: number; at: string | null; } | null;
}

interface DashboardData {
  metrics: { totalToday: number; completed: number; pending: number; avgIdleTime: number; avgRouteTime: number; };
  drivers: Array<DashboardDriver>; 
  history: Array<DashboardDelivery>;
  baseReturns?: Array<{ driverId: string; arrivedAt: string }>;
}

const formatTime = (isoString?: string | null) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString('pt-BR');
};

const calcMinutes = (start?: string | null, end?: string | null | number) => {
  if (!start) return '-';
  const endTime = end ? (typeof end === 'number' ? end : new Date(end).getTime()) : Date.now();
  const diff = endTime - new Date(start).getTime();
  return `${Math.max(0, Math.round(diff / 60000))} min`;
};

const getAvatarColor = (name: string) => {
  const colors = ['bg-[#1A4B9F]', 'bg-[#E65100]', 'bg-green-600', 'bg-purple-600'];
  return colors[name.charCodeAt(0) % colors.length];
};

export function Admin() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Estados dos Modais
  const [showUserModal, setShowUserModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Estados para Gestão de Usuários
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'MOTORISTA' });
  const [loadingUser, setLoadingUser] = useState(false);

  // Estados para o Histórico Filtrável
  const [historyData, setHistoryData] = useState<DashboardDelivery[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');

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
    const clock = setInterval(() => setNow(Date.now()), 60000);
    
    // Define as datas padrão para o filtro de histórico (últimos 7 dias)
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);

    return () => { clearInterval(interval); clearInterval(clock); };
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

  const fetchHistory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API_URL}/admin/history`, {
        params: { startDate, endDate }
      });
      setHistoryData(response.data);
    } catch (error) {
      alert('Erro ao buscar histórico.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // 🚀 LÓGICA TRANSPARENTE: Mostra tudo, pendente, em rota e entregue.
  const getTripsByDriver = () => {
    if (!data) return {};
    const tripsByDriver: Record<string, any[]> = {};
    const deliveriesByDriver: Record<string, DashboardDelivery[]> = {};
    const returnsByDriver: Record<string, number[]> = {};

    if (data.baseReturns) {
      data.baseReturns.forEach(br => {
        if (!returnsByDriver[br.driverId]) returnsByDriver[br.driverId] = [];
        returnsByDriver[br.driverId].push(new Date(br.arrivedAt).getTime());
      });
    }
    
    // Guarda na memória todas as entregas do motorista independentemente do status
    data.history.forEach(d => {
      if (!d.driver) return;
      if (!deliveriesByDriver[d.driver.name]) deliveriesByDriver[d.driver.name] = [];
      deliveriesByDriver[d.driver.name].push(d);
    });

    Object.keys(deliveriesByDriver).forEach(driverName => {
      // Ordena por ordem de criação
      const sorted = deliveriesByDriver[driverName].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      if (sorted.length === 0) return;

      const driverId = sorted[0].driverId!;
      const driverReturns = (returnsByDriver[driverId] || []).sort((a, b) => a - b);

      const trips = [];
      let currentTrip = [sorted[0]];

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        
        const prevStart = prev.startedAt ? new Date(prev.startedAt).getTime() : new Date(prev.createdAt).getTime();
        const currStart = curr.startedAt ? new Date(curr.startedAt).getTime() : new Date(curr.createdAt).getTime();
        const prevEnd = prev.finishedAt ? new Date(prev.finishedAt).getTime() : now;
        
        const furouCercaFisicamente = driverReturns.some(rt => rt > prevStart && rt <= currStart);
        const timeoutSeguranca = (currStart - prevEnd) / 60000 > 90;

        if (furouCercaFisicamente || timeoutSeguranca) { 
          trips.push(currentTrip);
          currentTrip = [curr]; 
        } else {
          currentTrip.push(curr);
        }
      }
      trips.push(currentTrip);

      tripsByDriver[driverName] = trips.map((tripDeliveries, index) => {
        const first = tripDeliveries[0];
        const last = tripDeliveries[tripDeliveries.length - 1];
        
        const idleTime = first.assignedAt && first.startedAt 
          ? Math.max(0, Math.round((new Date(first.startedAt).getTime() - new Date(first.assignedAt).getTime()) / 60000))
          : 0;

        const endTime = last.finishedAt ? new Date(last.finishedAt).getTime() : now;
        const streetTime = first.startedAt ? Math.max(0, Math.round((endTime - new Date(first.startedAt).getTime()) / 60000)) : 0;

        return {
          id: `viagem-${driverName}-${index}`,
          numero: index + 1,
          primeiraSaida: first.startedAt,
          ultimaConclusao: last.finishedAt,
          qtdEntregas: tripDeliveries.length,
          ociosidadeMercado: idleTime,
          tempoTotalRua: streetTime,
          entregas: tripDeliveries
        };
      });
    });

    return tripsByDriver;
  };

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#1A4B9F]" size={40} />
      </div>
    );
  }

  const viagensAgrupadas = getTripsByDriver();

  const filteredHistory = historyData.filter(h => 
    h.customer.name.toLowerCase().includes(historySearch.toLowerCase()) || 
    h.driver?.name.toLowerCase().includes(historySearch.toLowerCase()) ||
    h.customer.neighborhood?.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1A4B9F]">Gestão de Entregas</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Monitoramento em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
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
            {data.metrics.avgIdleTime} <span className="text-sm font-normal text-gray-500">min</span>
          </span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Ociosidade média</span>
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
                    <div className="bg-[#1A4B9F] text-white text-[10px] font-semibold px-2 py-1 rounded w-fit mb-2">
                      Tempo de rua: {calcMinutes(driver.currentDelivery.startedAt, now)}
                    </div>
                    <p className="text-xs text-gray-500 leading-tight">
                      → Indo para {driver.currentDelivery?.customer?.neighborhood}
                    </p>
                  </>
                ) : (
                  <div className="text-[#E65100] text-xs font-semibold mb-1 flex items-center gap-1.5">
                    <Circle size={8} fill="currentColor" /> Disponível no mercado
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Relatório de Viagens e Entregas (Hoje)
          </h3>
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
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Viagem #{viagem.numero}</span>
                          <div className="text-sm font-semibold text-gray-800 mt-1 flex items-center gap-2">
                            {viagem.primeiraSaida ? formatTime(viagem.primeiraSaida) : 'Aguardando saída'} 
                            {viagem.primeiraSaida && <span className="text-gray-300">→</span>}
                            {viagem.primeiraSaida && !viagem.ultimaConclusao && <span className="text-blue-600 animate-pulse">Na rua</span>}
                            {viagem.ultimaConclusao && formatTime(viagem.ultimaConclusao)}
                          </div>
                        </div>
                        
                        <div className="flex gap-6">
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Ociosidade (Loja)</div>
                            <div className="text-sm font-bold text-[#E53E3E] bg-red-50 px-2 py-0.5 rounded text-center inline-block">{viagem.ociosidadeMercado} min</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Tempo na Rua</div>
                            <div className="text-sm font-bold text-[#1A4B9F] bg-blue-50 px-2 py-0.5 rounded text-center inline-block">{viagem.tempoTotalRua > 0 ? `${viagem.tempoTotalRua} min` : '-'}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Entregas Feitas</div>
                            <div className="text-sm font-bold text-gray-800 bg-gray-100 px-3 py-0.5 rounded text-center inline-block">{viagem.qtdEntregas}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {viagem.entregas.map((entrega: any, idx: number) => {
                          let tagClass = 'bg-gray-50 text-gray-600 border border-gray-200';
                          let tagText = 'Aguardando início';
                          if (entrega.status === 'DELIVERED') {
                            tagClass = 'bg-green-50 text-green-700 border border-green-100';
                            tagText = `Entregue às ${formatTime(entrega.finishedAt)}`;
                          } else if (entrega.status === 'IN_TRANSIT' && entrega.startedAt) {
                            tagClass = 'bg-blue-50 text-blue-700 border border-blue-100';
                            tagText = 'Em rota';
                          }
                          
                          return (
                            <div key={entrega.id} className="flex justify-between items-center text-sm p-2 hover:bg-blue-50/50 rounded transition-colors group cursor-pointer" onClick={() => setSelectedDeliveryId(selectedDeliveryId === entrega.id ? null : entrega.id)}>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-300 w-4">{idx + 1}.</span>
                                <div>
                                  <span className="font-semibold text-gray-700 capitalize">{entrega.customer.name}</span>
                                  <span className="text-[11px] text-gray-400 ml-2">({entrega.customer.neighborhood})</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${tagClass}`}>
                                  {tagText}
                                </span>
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
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-[#1A4B9F]" />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Data Final</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-[#1A4B9F]" />
                </div>
                <button type="submit" disabled={loadingHistory} className="bg-[#1A4B9F] text-white px-6 py-2 rounded-lg text-sm font-bold shadow hover:bg-blue-800 disabled:opacity-50 h-[38px] w-full sm:w-auto">
                  {loadingHistory ? 'Buscando...' : 'Filtrar'}
                </button>
              </form>
              
              <div className="mt-4 relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente, motorista ou bairro nos resultados abaixo..." 
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
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
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {filteredHistory.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-400 text-sm">Nenhuma entrega encontrada para este período.</td></tr>
                  )}
                  {filteredHistory.map((h) => (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-600">{formatDate(h.createdAt)} <span className="text-[10px] ml-1">{formatTime(h.createdAt)}</span></td>
                      <td className="p-4 font-semibold text-gray-800 capitalize">{h.customer.name}</td>
                      <td className="p-4 text-gray-500">{h.customer.neighborhood}</td>
                      <td className="p-4 text-gray-600">{h.driver?.name}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-green-50 text-green-700">Entregue às {formatTime(h.finishedAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-white border-t border-gray-100 p-3 shrink-0 flex justify-between items-center text-xs text-gray-500 font-semibold">
              <span>Mostrando {filteredHistory.length} entregas</span>
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
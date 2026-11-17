import { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, CheckCircle2, Clock, Hourglass, Route, Circle, Loader2, WifiOff, AlertTriangle } from 'lucide-react';
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
  drivers: Array<DashboardDriver>; history: Array<DashboardDelivery>;
}

const formatTime = (isoString?: string | null) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// NOVO: Função que calcula minutos exatos entre duas datas
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

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/dashboard`);
        setData(response.data);
      } catch (error) {} finally { setLoading(false); }
    }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    const clock = setInterval(() => setNow(Date.now()), 60000); // Atualiza os tempos a cada minuto
    return () => { clearInterval(interval); clearInterval(clock); };
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#1A4B9F]" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1A4B9F]">Gestão de Entregas</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Monitoramento em tempo real</p>
        </div>
        <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          GPS ao vivo
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
                  <div className="text-gray-400 text-xs font-medium mb-1">Motorista desconectado do aplicativo</div>
                ) : driver.status === 'EM_ROTA' && driver.currentDelivery?.startedAt ? (
                  <>
                    <div className="bg-[#1A4B9F] text-white text-[10px] font-semibold px-2 py-1 rounded w-fit mb-2">
                      Tempo de rua: {calcMinutes(driver.currentDelivery.startedAt, now)}
                    </div>
                    <p className="text-xs text-gray-500 leading-tight">
                      → Em direção à {driver.currentDelivery?.customer?.neighborhood}
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
            Histórico de entregas de hoje
          </h3>
          {selectedDeliveryId && <button onClick={() => setSelectedDeliveryId(null)} className="text-xs font-semibold text-[#1A4B9F] hover:underline">Mostrar todas no mapa</button>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 text-[11px]">
                <th className="pb-3 font-medium uppercase">Cliente/ID</th>
                <th className="pb-3 font-medium uppercase text-center">Motorista</th>
                <th className="pb-3 font-medium uppercase text-center">Iniciado</th>
                <th className="pb-3 font-medium uppercase text-center text-[#E53E3E]">Ociosidade (Mercado)</th>
                <th className="pb-3 font-medium uppercase text-center text-[#1A4B9F]">Tempo Rota (Rua)</th>
                <th className="pb-3 font-medium uppercase text-left">Status do Pedido</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {data.history.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-gray-400 text-sm">Nenhuma entrega registrada hoje.</td></tr>
              )}

              {data.history.map((delivery) => {
                const isSelected = selectedDeliveryId === delivery.id;
                return (
                  <tr
                    key={delivery.id}
                    onClick={() => setSelectedDeliveryId(isSelected ? null : delivery.id)}
                    className={`border-b border-gray-50 cursor-pointer transition ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                  >
                    <td className="py-3.5">
                      <div className="font-semibold text-gray-800 capitalize truncate max-w-[150px]">{delivery.customer.name}</div>
                      <div className="text-gray-400 text-[10px]">#{delivery.id.split('-')[0]}</div>
                    </td>
                    <td className="py-3.5 text-center">
                      {delivery.driver ? (
                        <div className={`w-6 h-6 rounded-full ${getAvatarColor(delivery.driver.name)} text-white flex items-center justify-center text-[10px] font-bold mx-auto uppercase`} title={delivery.driver.name}>
                          {delivery.driver.name.charAt(0)}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3.5 text-center text-gray-500">{formatTime(delivery.startedAt)}</td>
                    
                    {/* NOVO: Tempo que o motorista ficou no mercado (ociosidade) */}
                    <td className="py-3.5 text-center font-bold text-[#E53E3E]">
                      {delivery.assignedAt && delivery.startedAt ? calcMinutes(delivery.assignedAt, delivery.startedAt) : '-'}
                    </td>
                    
                    {/* NOVO: Tempo que o motorista ficou na rua para essa entrega */}
                    <td className="py-3.5 text-center font-bold text-[#1A4B9F]">
                      {delivery.startedAt ? calcMinutes(delivery.startedAt, delivery.finishedAt || now) : '-'}
                    </td>

                    <td className="py-3.5 text-left">
                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-md ${
                          delivery.status === 'DELIVERED' ? 'bg-green-50 text-green-700 border border-green-100' :
                          delivery.status === 'IN_TRANSIT' && delivery.startedAt ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-orange-50 text-orange-700 border border-orange-100'
                        }`}>
                        {delivery.status === 'DELIVERED' ? `Entregue às ${formatTime(delivery.finishedAt)}` : delivery.status === 'IN_TRANSIT' && delivery.startedAt ? 'Em andamento' : 'Não iniciada'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
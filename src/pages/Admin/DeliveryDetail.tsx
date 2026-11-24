import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Loader2, MapPin, Package, Phone, FileText, Timer, Truck } from 'lucide-react';
import { PaymentPanel } from '../../components/ui/PaymentBadges';
import type { PaymentInfo } from '../../components/ui/PaymentBadges';
import type { HistoryFilters } from './index';

interface DetailDelivery extends PaymentInfo {
  id: string;
  status: string;
  createdAt: string;
  assignedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  boxCount?: number;
  description?: string | null;
  startLatitude?: number | null;
  startLongitude?: number | null;
  endLatitude?: number | null;
  endLongitude?: number | null;
  customer: {
    name: string;
    phone?: string | null;
    street?: string;
    number?: string;
    neighborhood?: string;
    reference?: string | null;
  };
  driver: { id: string; name: string } | null;
}

interface DetailLocationState {
  from?: string;
  filters?: HistoryFilters;
}

interface TimelineStep {
  key: string;
  title: string;
  at: string | null;
  note: string | null;
  done: boolean;
}

const formatClockWithSeconds = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const formatFullDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

const formatSpan = (fromIso: string, toIso: string) => {
  const ms = Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime());
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'menos de 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
};

const getStatusBadge = (delivery: DetailDelivery) => {
  if (delivery.status === 'DELIVERED') return { label: 'Entregue', cls: 'bg-green-50 text-green-700 border border-green-200' };
  if (delivery.status === 'IN_TRANSIT' && delivery.startedAt) return { label: 'Em rota', cls: 'bg-[#1A4B9F] text-white' };
  if (delivery.status === 'IN_TRANSIT') return { label: 'Aguardando saída', cls: 'bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2]' };
  return { label: 'Pendente', cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
};

const buildTimeline = (delivery: DetailDelivery): TimelineStep[] => {
  const { createdAt, assignedAt, startedAt, finishedAt, driver } = delivery;

  let assignedNote: string | null = 'Ainda sem motorista';
  if (driver && assignedAt) assignedNote = `Esperou ${formatSpan(createdAt, assignedAt)} no caixa`;
  else if (driver) assignedNote = 'Horário da atribuição não registrado';

  return [
    {
      key: 'created',
      title: 'Pedido registrado no caixa',
      at: createdAt,
      note: null,
      done: true,
    },
    {
      key: 'assigned',
      title: driver ? `Atribuída ao motorista ${driver.name}` : 'Ainda sem motorista',
      at: driver ? assignedAt : null,
      note: assignedNote,
      done: Boolean(driver),
    },
    {
      key: 'started',
      title: 'Motorista iniciou a entrega',
      at: startedAt,
      note: startedAt && assignedAt ? `Saiu ${formatSpan(assignedAt, startedAt)} após a atribuição` : null,
      done: Boolean(startedAt),
    },
    {
      key: 'finished',
      title: 'Entrega concluída',
      at: finishedAt,
      note: finishedAt && startedAt ? `${formatSpan(startedAt, finishedAt)} em rota` : null,
      done: Boolean(finishedAt),
    },
  ];
};

const hasPoint = (lat?: number | null, lng?: number | null) =>
  typeof lat === 'number' && typeof lng === 'number';

export function DeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as DetailLocationState | null;

  const [delivery, setDelivery] = useState<DetailDelivery | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchDelivery = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/deliveries/${id}`);
      setDelivery(response.data);
    } catch {
      try {
        const response = await axios.get(`${API_URL}/deliveries`);
        const list: DetailDelivery[] = Array.isArray(response.data) ? response.data : [];
        setDelivery(list.find(d => d.id === id) ?? null);
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [API_URL, id]);

  useEffect(() => {
    fetchDelivery();
    const interval = setInterval(fetchDelivery, 10000);
    return () => clearInterval(interval);
  }, [fetchDelivery]);

  const handleBack = () => {
    if (state?.from === 'history') {
      navigate('/admin', { state: { openHistory: true, filters: state.filters } });
    } else {
      navigate('/admin');
    }
  };

  const backButton = (
    <button
      type="button"
      onClick={handleBack}
      className="flex items-center gap-1.5 text-xs font-semibold text-[#1A4B9F] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors w-fit"
    >
      <ArrowLeft size={14} /> Voltar
    </button>
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#1A4B9F]" size={40} />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {backButton}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500 text-sm">
          Entrega não encontrada.
        </div>
      </div>
    );
  }

  const badge = getStatusBadge(delivery);
  const steps = buildTimeline(delivery);
  const customer = delivery.customer;
  const address = [customer.street, customer.number].filter(Boolean).join(', ');
  const showStartPoint = hasPoint(delivery.startLatitude, delivery.startLongitude);
  const showEndPoint = hasPoint(delivery.endLatitude, delivery.endLongitude);

  return (
    <div className="max-w-3xl w-full mx-auto flex flex-col gap-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {backButton}
        <span className={`font-bold px-3 py-1.5 rounded-full text-xs ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold text-[#1A4B9F] uppercase">{customer.name}</h2>
          <span className="text-[10px] text-gray-400"># {delivery.id.substring(0, 5)}</span>
        </div>

        <div className="space-y-2 text-sm text-gray-700">
          <p className="flex items-start gap-2">
            <MapPin size={16} className="text-[#E53E3E] mt-0.5 flex-shrink-0" />
            <span>
              {address || '—'}
              {customer.neighborhood && <span className="text-gray-500"> — {customer.neighborhood}</span>}
            </span>
          </p>
          {customer.reference && (
            <p className="text-xs text-gray-500 pl-6">Referência: {customer.reference}</p>
          )}
          <p className="flex items-center gap-2">
            <Phone size={16} className="text-gray-400 flex-shrink-0" />
            {customer.phone ? (
              <a href={`tel:${customer.phone.replace(/\D/g, '')}`} className="text-[#1A4B9F] font-semibold hover:underline">
                {customer.phone}
              </a>
            ) : (
              <span className="text-gray-400">Telefone não informado</span>
            )}
          </p>
          <p className="flex items-center gap-2">
            <Truck size={16} className="text-gray-400 flex-shrink-0" />
            {delivery.driver ? (
              <span className="font-semibold">{delivery.driver.name}</span>
            ) : (
              <span className="text-[#E65100] font-semibold">Sem motorista</span>
            )}
          </p>
          <p className="flex items-center gap-2">
            <Package size={16} className="text-gray-400 flex-shrink-0" />
            {delivery.boxCount ?? 1} vol.
          </p>
          {delivery.description && (
            <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg mt-2">
              <p className="text-xs text-gray-600 font-medium flex items-start gap-1.5">
                <FileText size={13} className="mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-bold">Obs:</span> {delivery.description}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      <PaymentPanel delivery={delivery} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Linha do tempo</h3>
          {delivery.finishedAt && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
              <Timer size={12} /> Tempo total: {formatSpan(delivery.createdAt, delivery.finishedAt)}
            </span>
          )}
        </div>

        <ol>
          {steps.map((step, index) => (
            <li key={step.key} className="relative pl-10 pb-6 last:pb-0">
              {index < steps.length - 1 && (
                <span className={`absolute left-[13px] top-7 bottom-0 w-0.5 ${step.done ? 'bg-green-200' : 'bg-gray-200'}`} />
              )}
              <span className="absolute left-0 top-0">
                {step.done ? (
                  <CheckCircle2 size={28} className="text-green-600" />
                ) : (
                  <Circle size={28} className="text-gray-300" />
                )}
              </span>
              <p className={`text-sm font-bold ${step.done ? 'text-gray-800' : 'text-gray-400'}`}>{step.title}</p>
              {step.at ? (
                <p className="text-xs text-gray-600 font-semibold mt-0.5">
                  {formatClockWithSeconds(step.at)} · {formatFullDate(step.at)}
                </p>
              ) : (
                !step.done && <p className="text-xs text-gray-400 mt-0.5">Aguardando</p>
              )}
              {step.note && <p className="text-xs text-gray-500 mt-0.5">{step.note}</p>}
            </li>
          ))}
        </ol>

        {(showStartPoint || showEndPoint) && (
          <div className="flex gap-2 flex-wrap mt-5 pt-4 border-t border-gray-100">
            {showStartPoint && (
              <a
                href={`https://www.google.com/maps?q=${delivery.startLatitude},${delivery.startLongitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#1A4B9F] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
              >
                <MapPin size={12} /> Ponto de saída
              </a>
            )}
            {showEndPoint && (
              <a
                href={`https://www.google.com/maps?q=${delivery.endLatitude},${delivery.endLongitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-full transition-colors"
              >
                <MapPin size={12} /> Ponto de entrega
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

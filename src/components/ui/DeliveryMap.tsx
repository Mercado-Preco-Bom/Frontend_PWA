import { Fragment } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DashboardDelivery, DashboardDriver } from '../../pages/Admin';

interface DeliveryMapProps {
  drivers: DashboardDriver[];
  deliveries?: DashboardDelivery[];
  selectedDeliveryId?: string | null;
}

const createPinIcon = (bgColor: string, label: string) =>
  L.divIcon({
    className: 'custom-leaflet-pin',
    html: `<div style="background-color:${bgColor};color:#fff;padding:3px 8px;border-radius:9999px;font-size:10px;font-weight:800;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;transform:translate(-50%, -50%);">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

const startIcon = createPinIcon('#1A4B9F', 'INÍCIO');
const endIcon = createPinIcon('#059669', 'FIM');

const formatHour = (iso?: string | null) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export function DeliveryMap({ drivers, deliveries = [], selectedDeliveryId = null }: DeliveryMapProps) {
  const defaultCenter: [number, number] = [-24.4882, -47.8447];

  const startedDeliveries = deliveries.filter((d) => {
    if (!d.startedAt) return false;
    if (selectedDeliveryId && d.id !== selectedDeliveryId) return false;
    return true;
  });

  const visibleDrivers = drivers.filter((drv) => {
    if (!drv.lastLocation) return false;
    if (drv.connectionStatus === 'DESCONECTADO') return false;
    if (selectedDeliveryId && drv.currentDelivery?.id !== selectedDeliveryId) return false;
    return true;
  });

  return (
    <div className="w-full h-full min-h-[400px] relative">
      <MapContainer
        center={defaultCenter}
        zoom={14}
        style={{ height: '100%', width: '100%', minHeight: '400px', borderRadius: '0.75rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {startedDeliveries.map((delivery) => {
          const hasStart =
            delivery.startLatitude !== null &&
            delivery.startLatitude !== undefined &&
            delivery.startLongitude !== null &&
            delivery.startLongitude !== undefined;

          const hasEnd =
            delivery.status === 'DELIVERED' &&
            delivery.endLatitude !== null &&
            delivery.endLatitude !== undefined &&
            delivery.endLongitude !== null &&
            delivery.endLongitude !== undefined;

          const driverInRoute = visibleDrivers.find((d) => d.currentDelivery?.id === delivery.id);

          const startPos: [number, number] | null = hasStart
            ? [delivery.startLatitude!, delivery.startLongitude!]
            : null;

          const endPos: [number, number] | null = hasEnd
            ? [delivery.endLatitude!, delivery.endLongitude!]
            : null;

          const livePos: [number, number] | null =
            driverInRoute && driverInRoute.lastLocation
              ? [driverInRoute.lastLocation.latitude, driverInRoute.lastLocation.longitude]
              : null;

          return (
            <Fragment key={delivery.id}>
              {startPos && (
                <Marker position={startPos} icon={startIcon}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-[#1A4B9F]">Início da Corrida</p>
                      <p>
                        <strong>Cliente:</strong> {delivery.customer.name}
                      </p>
                      <p>
                        <strong>Motorista:</strong> {delivery.driver?.name || '-'}
                      </p>
                      <p>
                        <strong>Iniciado às:</strong> {formatHour(delivery.startedAt)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {endPos && (
                <Marker position={endPos} icon={endIcon}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-green-700">Final da Entrega</p>
                      <p>
                        <strong>Cliente:</strong> {delivery.customer.name}
                      </p>
                      <p>
                        <strong>Motorista:</strong> {delivery.driver?.name || '-'}
                      </p>
                      <p>
                        <strong>Entregue às:</strong> {formatHour(delivery.finishedAt)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {startPos && livePos && delivery.status === 'IN_TRANSIT' && (
                <Polyline
                  positions={[startPos, livePos]}
                  pathOptions={{ color: '#E65100', weight: 3, dashArray: '6, 6' }}
                />
              )}

              {startPos && endPos && delivery.status === 'DELIVERED' && (
                <Polyline
                  positions={[startPos, endPos]}
                  pathOptions={{ color: '#059669', weight: 4 }}
                />
              )}
            </Fragment>
          );
        })}

        {visibleDrivers.map((driver) => {
          if (!driver.lastLocation) return null;
          const pos: [number, number] = [
            driver.lastLocation.latitude,
            driver.lastLocation.longitude,
          ];

          const isLost = driver.connectionStatus === 'SINAL_PERDIDO';
          const firstName = driver.name.split(' ')[0].toUpperCase();
          const pinIcon = isLost
            ? createPinIcon('#D97706', `⚠️ LOCALIZAÇÃO PERDIDA (${firstName})`)
            : createPinIcon('#E65100', `🛵 ${firstName}`);

          return (
            <Marker key={`driver-${driver.id}`} position={pos} icon={pinIcon}>
              <Popup>
                <div className="text-xs space-y-1">
                  <p className={`font-bold ${isLost ? 'text-amber-600' : 'text-[#E65100]'}`}>
                    {isLost ? 'Localização perdida aqui!' : 'Posição Atual do Motorista'}
                  </p>
                  <p>
                    <strong>Motorista:</strong> {driver.name}
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    {driver.status === 'EM_ROTA' ? 'Em rota de entrega' : 'Disponível'}
                  </p>
                  {driver.currentDelivery && (
                    <p>
                      <strong>Entrega atual:</strong> {driver.currentDelivery.customer.name} (
                      {driver.currentDelivery.customer.neighborhood})
                    </p>
                  )}
                  <p>
                    <strong>Última atualização:</strong> {formatHour(driver.lastLocation.at)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow border border-gray-100 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-gray-700">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1A4B9F] inline-block"></span>
          Início da corrida
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E65100] inline-block"></span>
          Motorista Online
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] inline-block"></span>
          Localização perdida
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#059669] inline-block"></span>
          Final da entrega
        </div>
      </div>
    </div>
  );
}
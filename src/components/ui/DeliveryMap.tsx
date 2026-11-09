import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Corrigir o ícone padrão do Leaflet no React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface DeliveryMapProps {
  drivers: any[];
}

export function DeliveryMap({ drivers }: DeliveryMapProps) {
  // Coordenadas centrais (Registro, SP)
  const defaultPosition: [number, number] = [-24.4933, -47.8471];

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-gray-200 z-0">
      <MapContainer 
        center={defaultPosition} 
        zoom={14} 
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Exemplo de Marcador Fixo (Base do Mercado Preço Bom) */}
        <Marker position={defaultPosition}>
          <Popup>
            <strong>Mercado Preço Bom</strong><br />Base de Despacho
          </Popup>
        </Marker>

        {/* 
          Futuramente, vamos iterar sobre a prop `drivers` aqui:
          drivers.map(driver => <Marker position={[lat, lng]} ... />)
        */}
      </MapContainer>
    </div>
  );
}
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Package, Plus, Minus, Clock, UserPlus, X } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  street: string;
  number: string;
  neighborhood?: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface Delivery {
  id: string;
  boxCount: number;
  paymentMethod: string;
  changeFor: number | null;
  status: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  customer: Customer;
  driver: User | null;
}

export function Caixa() {
  // Estados do Formulário Principal
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [volume, setVolume] = useState(1);
  const [payment, setPayment] = useState('Dinheiro');
  const [changeFor, setChangeFor] = useState('');

  // Estados da Lista
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [loading, setLoading] = useState(false);

  // Estados do Modal de Novo Cliente
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '', phone: '', street: '', number: '', neighborhood: '', reference: ''
  });

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get(`${API_URL}/deliveries`);
      setDeliveries(response.data);
    } catch (error) {
      console.error('Erro ao buscar entregas:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      const driversList = response.data.filter((u: User) => u.role === 'DRIVER');
      setDrivers(driversList);
    } catch (error) {
      console.error('Erro ao buscar motoristas:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchDeliveries();
    fetchDrivers();
    const interval = setInterval(fetchDeliveries, 5000);
    return () => clearInterval(interval);
  }, []);

  // Lógica para cadastrar novo cliente
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCustomer(true);
    try {
      const response = await axios.post(`${API_URL}/customers`, newCustomer);
      
      // Atualiza a lista de clientes
      await fetchCustomers();
      
      // Seleciona o cliente recém-criado automaticamente
      setSelectedCustomerId(response.data.id);
      
      // Limpa e fecha o modal
      setNewCustomer({ name: '', phone: '', street: '', number: '', neighborhood: '', reference: '' });
      setShowCustomerModal(false);
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      alert('Erro ao cadastrar cliente. Verifique se preencheu tudo.');
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleRegistrarPedido = async () => {
    if (!selectedCustomerId) return alert('Por favor, selecione um cliente!');
    setLoading(true);
    try {
      const methodMap: any = { 'Dinheiro': 'CASH', 'Cartão': 'CREDIT_CARD', 'Pix': 'PIX' };
      await axios.post(`${API_URL}/deliveries`, {
        customerId: selectedCustomerId,
        boxCount: volume,
        paymentMethod: methodMap[payment],
        changeFor: payment === 'Dinheiro' && changeFor ? Number(changeFor) : null,
      });

      setVolume(1);
      setPayment('Dinheiro');
      setChangeFor('');
      setSelectedCustomerId('');
      fetchDeliveries(); 
      setActiveTab('PENDING');
    } catch (error) {
      console.error(error);
      alert('Erro ao registrar pedido.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDriver = async (deliveryId: string, driverId: string) => {
    const currentDelivery = deliveries.find(d => d.id === deliveryId);
    if (!currentDelivery) return;

    try {
      await axios.put(`${API_URL}/deliveries/${deliveryId}`, {
        boxCount: currentDelivery.boxCount,
        paymentMethod: currentDelivery.paymentMethod,
        changeFor: currentDelivery.changeFor,
        status: 'IN_TRANSIT', 
        customerId: currentDelivery.customer.id, 
        driverId: driverId 
      });
      fetchDeliveries(); 
    } catch (error) {
      console.error('Detalhe do erro:', error);
      alert('Erro ao atribuir motorista.');
    }
  };

  const handleSimularInicio = async (deliveryId: string, driverId: string) => {
    try {
      await axios.put(`${API_URL}/deliveries/${deliveryId}/start`, {
        driverId: driverId, latitude: -24.6934, longitude: -48.0033
      });
      fetchDeliveries();
    } catch (error) { console.error(error); }
  };

  const handleSimularFim = async (deliveryId: string) => {
    try {
      await axios.put(`${API_URL}/deliveries/${deliveryId}/finish`, {
        latitude: -24.6950, longitude: -48.0010
      });
      fetchDeliveries();
    } catch (error) { console.error(error); }
  };

  const filteredDeliveries = deliveries.filter(d => d.status === activeTab);
  const countPending = deliveries.filter(d => d.status === 'PENDING').length;
  const countTransit = deliveries.filter(d => d.status === 'IN_TRANSIT').length;
  const countDelivered = deliveries.filter(d => d.status === 'DELIVERED').length;

  return (
    <>
      <main className="flex flex-col lg:flex-row gap-6 h-full relative">
        
        {/* FORMULÁRIO (NOVA ENTREGA) */}
        <div className="w-full lg:w-5/12 bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex-shrink-0 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Nova Entrega</h2>

<div className="mb-5">
          <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">1. CLIENTE</label>
          <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#1A4B9F] focus-within:ring-1 focus-within:ring-[#1A4B9F] transition-all">
            <div className="pl-3 flex items-center justify-center hidden sm:flex">
              <Search size={16} className="text-gray-400" />
            </div>
            <select 
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 min-w-0 p-3 outline-none text-sm text-gray-700 bg-transparent cursor-pointer truncate"
            >
              <option value="">Buscar por nome...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button 
              onClick={() => setShowCustomerModal(true)}
              className="bg-[#1A4B9F] text-white px-3 sm:px-4 hover:bg-blue-800 flex items-center justify-center gap-1 text-[10px] sm:text-xs font-semibold transition-colors flex-shrink-0"
              title="Cadastrar novo cliente"
            >
              <UserPlus size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Novo</span>
            </button>
          </div>
        </div>

          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">2. VOLUMES / CAIXAS</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button onClick={() => setVolume(Math.max(1, volume - 1))} className="p-3 bg-gray-50 hover:bg-gray-100 border-r border-gray-300 transition-colors">
                  <Minus size={16} />
                </button>
                <div className="w-14 text-center font-semibold text-base text-gray-800">{volume}</div>
                <button onClick={() => setVolume(volume + 1)} className="p-3 bg-gray-50 hover:bg-gray-100 border-l border-gray-300 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              <div className="p-3 border border-gray-300 rounded-lg text-gray-500"><Package size={20} /></div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[11px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">3. PAGAMENTO</label>
            <div className="flex gap-2">
              {['Dinheiro', 'Cartão', 'Pix'].map((method) => (
                <button
                  key={method}
                  onClick={() => {
                    setPayment(method);
                    if (method !== 'Dinheiro') setChangeFor('');
                  }}
                  className={`flex-1 py-3 border rounded-lg text-xs font-semibold transition-all
                  ${payment === method ? 'bg-[#1A4B9F] border-[#1A4B9F] text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  {method}
                </button>
              ))}
            </div>
            {payment === 'Dinheiro' && (
              <div className="mt-4 flex items-center justify-between border border-gray-300 rounded-lg overflow-hidden">
                <span className="pl-3 text-sm font-medium text-gray-600">Troco para R$</span>
                <input 
                  type="number" placeholder="0,00" value={changeFor} onChange={(e) => setChangeFor(e.target.value)}
                  className="p-3 text-right outline-none text-sm text-gray-800 font-semibold w-1/2" 
                />
              </div>
            )}
          </div>

          <button 
            onClick={handleRegistrarPedido} disabled={loading}
            className="w-full bg-[#E53E3E] text-white font-bold text-sm py-4 rounded-lg shadow-sm hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrar Pedido'}
          </button>
        </div>

        {/* LISTA (DESPACHO DO DIA) */}
        <div className="w-full lg:w-7/12 bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col h-[80vh]">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pl-1">Despacho do Dia</h2>
          
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button onClick={() => setActiveTab('PENDING')} className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'PENDING' ? 'border-[#1A4B9F] text-[#1A4B9F]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Pendentes ({countPending})
            </button>
            <button onClick={() => setActiveTab('IN_TRANSIT')} className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'IN_TRANSIT' ? 'border-[#1A4B9F] text-[#1A4B9F]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Em Rota ({countTransit})
            </button>
            <button onClick={() => setActiveTab('DELIVERED')} className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'DELIVERED' ? 'border-[#1A4B9F] text-[#1A4B9F]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              Finalizadas ({countDelivered})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {filteredDeliveries.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-10">Nenhuma entrega nesta aba.</p>
            ) : (
              filteredDeliveries.map((delivery) => {
                let tagColorClass = '';
                let tagText = '';
                
                if (delivery.status === 'DELIVERED') {
                  tagColorClass = 'bg-[#008A2E] text-white'; 
                  const horaEntrega = new Date(delivery.finishedAt!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  tagText = `Entregue às ${horaEntrega}`;
                } else if (delivery.status === 'IN_TRANSIT' && delivery.startedAt) {
                  tagColorClass = 'bg-[#1A4B9F] text-white';
                  tagText = 'Em rota';
                } else if (delivery.status === 'IN_TRANSIT') {
                  tagColorClass = 'bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2]';
                  tagText = 'Aguardando saída';
                }

                return (
                  <div key={delivery.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-[#1A4B9F] font-bold text-sm uppercase">{delivery.customer.name}</h3>
                        <p className="text-gray-800 text-xs mt-1">{delivery.customer.street}, {delivery.customer.number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-[10px]"># {delivery.id.substring(0, 5)}</p>
                        <p className="text-gray-800 font-bold text-xs flex items-center justify-end gap-1 mt-0.5">
                          <Clock size={12} className="text-[#E53E3E]" /> 
                          {new Date(delivery.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="text-[#1A4B9F] font-medium bg-blue-50 px-2 py-1 rounded text-[10px] flex items-center gap-1">
                        <Package size={12} /> {delivery.boxCount} vol.
                      </span>
                      <span className="text-[#1A4B9F] font-medium bg-blue-50 px-2 py-1 rounded text-[10px]">
                        {delivery.paymentMethod === 'CASH' ? 'Dinheiro' : delivery.paymentMethod === 'CREDIT_CARD' ? 'Cartão' : 'Pix'}
                      </span>
                      {delivery.driver && (
                        <span className="text-white font-medium bg-[#E65100] px-2 py-1 rounded-full text-[10px]">
                          Motorista {delivery.driver.name.split(' ')[0]}
                        </span>
                      )}
                      {tagText && (
                        <span className={`font-medium px-2 py-1 rounded-full text-[10px] ${tagColorClass}`}>
                          {tagText}
                        </span>
                      )}
                    </div>

                    {activeTab === 'PENDING' && !delivery.driver && (
                      <div className="mt-4 flex gap-2 flex-wrap">
                        {drivers.map((driver, index) => {
                           const colorClass = index % 2 === 0 ? 'bg-[#1A4B9F] hover:bg-blue-800' : 'bg-[#E65100] hover:bg-orange-700';
                           return (
                             <button 
                               key={driver.id}
                               onClick={() => handleAssignDriver(delivery.id, driver.id)}
                               className={`flex-1 text-white text-xs font-semibold py-2 px-2 rounded transition ${colorClass}`}
                             >
                               Atribuir a {driver.name.split(' ')[0]}
                             </button>
                           );
                        })}
                        {drivers.length === 0 && (
                           <p className="text-xs text-red-500 italic">Nenhum motorista cadastrado.</p>
                        )}
                      </div>
                    )}

                    {activeTab === 'IN_TRANSIT' && (
                      <div className="mt-4 flex gap-2 border-t pt-3">
                        {!delivery.startedAt ? (
                          <button onClick={() => handleSimularInicio(delivery.id, delivery.driver!.id)} className="text-xs bg-gray-200 px-3 py-1 rounded">
                            Simular: Motorista Iniciou Rota
                          </button>
                        ) : (
                          <button onClick={() => handleSimularFim(delivery.id)} className="text-xs bg-green-200 text-green-800 px-3 py-1 rounded">
                            Simular: Motorista Entregou
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* MODAL DE NOVO CLIENTE */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#1A4B9F] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold">Cadastrar Novo Cliente</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-blue-200 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Estabelecimento *</label>
                <input 
                  required autoFocus type="text"
                  value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" 
                  placeholder="Ex: Mercado Central"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Rua *</label>
                  <input 
                    required type="text"
                    value={newCustomer.street} onChange={e => setNewCustomer({...newCustomer, street: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" 
                    placeholder="Ex: Rua Direita"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Número *</label>
                  <input 
                    required type="text"
                    value={newCustomer.number} onChange={e => setNewCustomer({...newCustomer, number: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" 
                    placeholder="Ex: 123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Bairro *</label>
                  <input 
                    required type="text"
                    value={newCustomer.neighborhood} onChange={e => setNewCustomer({...newCustomer, neighborhood: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" 
                    placeholder="Ex: Centro"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
                  <input 
                    type="text"
                    value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[#1A4B9F] focus:ring-1 focus:ring-[#1A4B9F] text-sm" 
                    placeholder="(13) 99999-9999"
                  />
                </div>
              </div>

              <button 
                type="submit" disabled={loadingCustomer}
                className="w-full bg-[#1A4B9F] text-white font-bold text-sm py-3 mt-2 rounded-lg shadow-sm hover:bg-blue-800 active:bg-blue-900 transition-colors disabled:opacity-50"
              >
                {loadingCustomer ? 'Salvando...' : 'Salvar e Selecionar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
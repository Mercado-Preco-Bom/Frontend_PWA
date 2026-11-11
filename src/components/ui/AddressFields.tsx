import React, { useEffect, useState } from 'react';
import { BAIRROS_REGISTRO, buscarRuasPorNome, CIDADES_VALE

    
 } from '../../utils/locations';
import type { ViaCepResult } from '../../utils/locations';

interface AddressFieldsProps {
  street: string;
  setStreet: (val: string) => void;
  number: string;
  setNumber: (val: string) => void;
  neighborhood: string;
  setNeighborhood: (val: string) => void;
  reference: string;
  setReference: (val: string) => void;
}

export const AddressFields: React.FC<AddressFieldsProps> = ({
  street,
  setStreet,
  number,
  setNumber,
  neighborhood,
  setNeighborhood,
  reference,
  setReference,
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('Registro');
  const [customCity, setCustomCity] = useState<string>('');
  const [rawNeighborhood, setRawNeighborhood] = useState<string>('Centro');
  const [isManualNeighborhood, setIsManualNeighborhood] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<ViaCepResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const activeCityName = selectedCity === 'Outra' ? customCity.trim() : selectedCity;

  useEffect(() => {
    const bairroLimpo = rawNeighborhood.trim();
    if (!bairroLimpo) {
      setNeighborhood('');
      return;
    }

    if (selectedCity === 'Registro') {
      setNeighborhood(bairroLimpo);
    } else if (activeCityName) {
      setNeighborhood(`${bairroLimpo} (${activeCityName})`);
    } else {
      setNeighborhood(bairroLimpo);
    }
  }, [rawNeighborhood, selectedCity, customCity]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (street.trim().length >= 3 && activeCityName && showSuggestions) {
        const results = await buscarRuasPorNome(activeCityName, street);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [street, activeCityName, showSuggestions]);

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    if (newCity === 'Registro') {
      setIsManualNeighborhood(false);
      setRawNeighborhood('Centro');
    } else {
      setIsManualNeighborhood(true);
      setRawNeighborhood('');
    }
  };

  const handleSelectSuggestion = (item: ViaCepResult) => {
    setShowSuggestions(false);
    setSuggestions([]);
    if (item.logradouro) {
      setStreet(item.logradouro);
    }
    if (item.bairro) {
      const foundInList = BAIRROS_REGISTRO.find(
        (b) => b.toLowerCase() === item.bairro.toLowerCase()
      );
      if (selectedCity === 'Registro' && foundInList) {
        setIsManualNeighborhood(false);
        setRawNeighborhood(foundInList);
      } else {
        setIsManualNeighborhood(true);
        setRawNeighborhood(item.bairro);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cidade
          </label>
          <select
            value={selectedCity}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
          >
            {CIDADES_VALE.map((city) => (
              <option key={city} value={city}>
                {city === 'Outra' ? 'Outra cidade...' : `${city} - SP`}
              </option>
            ))}
          </select>
        </div>

        {selectedCity === 'Outra' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Cidade
            </label>
            <input
              type="text"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder="Digite a cidade"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
              required
            />
          </div>
        )}

        <div className={selectedCity === 'Outra' ? 'md:col-span-2' : ''}>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Bairro
            </label>
            {selectedCity === 'Registro' && (
              <button
                type="button"
                onClick={() => {
                  setIsManualNeighborhood(!isManualNeighborhood);
                  setRawNeighborhood(isManualNeighborhood ? 'Centro' : '');
                }}
                className="text-xs font-medium text-blue-700 hover:underline"
              >
                {isManualNeighborhood ? 'Selecionar da lista' : 'Digitar outro bairro'}
              </button>
            )}
          </div>

          {selectedCity === 'Registro' && !isManualNeighborhood ? (
            <select
              value={rawNeighborhood}
              onChange={(e) => setRawNeighborhood(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
            >
              {BAIRROS_REGISTRO.map((bairro) => (
                <option key={bairro} value={bairro}>
                  {bairro}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={rawNeighborhood}
              onChange={(e) => setRawNeighborhood(e.target.value)}
              placeholder={`Digite o bairro em ${activeCityName || 'sua cidade'}`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
              required
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rua / Logradouro
          </label>
          <input
            type="text"
            value={street}
            onChange={(e) => {
              setStreet(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Digite o nome da rua..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
            required
          />

          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {suggestions.map((item, idx) => (
                <li
                  key={`${item.cep}-${idx}`}
                  onMouseDown={() => handleSelectSuggestion(item)}
                  className="cursor-pointer border-b border-gray-100 px-3 py-2 text-sm hover:bg-blue-50 last:border-none"
                >
                  <p className="font-medium text-gray-800">{item.logradouro}</p>
                  <p className="text-xs text-gray-500">
                    {item.bairro ? `${item.bairro} • ` : ''}CEP: {item.cep}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número
          </label>
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Ex: 210"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ponto de Referência (opcional)
        </label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Ex: Próximo à praça, portão azul..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none"
        />
      </div>
    </div>
  );
};
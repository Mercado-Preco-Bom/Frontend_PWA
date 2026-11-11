export const CIDADES_VALE = [
  'Registro',
  'Jacupiranga',
  'Pariquera-Açu',
  'Sete Barras',
  'Juquiá',
  'Cajati',
  'Eldorado',
  'Miracatu',
  'Iguape',
  'Cananéia',
  'Ilha Comprida',
  'Outra'
];

export const BAIRROS_REGISTRO = [
  'Agrocha',
  'Alay Correa',
  'Arapongal',
  'Bloco B',
  'Capinzal',
  'Carapiranga',
  'Centro',
  'Jardim América',
  'Jardim Brasil',
  'Jardim Caiçara',
  'Jardim das Palmeiras',
  'Jardim Eiji Matsumura',
  'Jardim Hatori',
  'Jardim Paulistano',
  'Jardim Planalto',
  'Jardim São Paulo',
  'Jardim São Conrado',
  'Nosso Teto',
  'Pedreira',
  'Serrote',
  'Vila Cabral',
  'Vila Flórida',
  'Vila Nova',
  'Vila Ponce',
  'Vila Ribeirópolis',
  'Vila Romão',
  'Vila São Francisco',
  'Vila Tupy',
  'Votupoca'
];

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export async function buscarRuasPorNome(cidade: string, termoRua: string): Promise<ViaCepResult[]> {
  if (!cidade || cidade === 'Outra' || termoRua.trim().length < 3) {
    return [];
  }

  try {
    const cidadeFormatada = encodeURIComponent(cidade.trim());
    const ruaFormatada = encodeURIComponent(termoRua.trim());
    const response = await fetch(`https://viacep.com.br/ws/SP/${cidadeFormatada}/${ruaFormatada}/json/`);
    if (!response.ok) return [];
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.slice(0, 6);
    }
    return [];
  } catch {
    return [];
  }
}
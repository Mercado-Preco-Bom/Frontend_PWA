import { Banknote, CheckCircle2 } from 'lucide-react';
import { formatBRL } from '../../utils/money';

export interface PaymentInfo {
  isPaid?: boolean | null;
  amount?: number | null;
  paymentMethod?: string | null;
  changeFor?: number | null;
}

export function paymentMethodLabel(method?: string | null): string {
  switch (method) {
    case 'CASH':
      return 'Dinheiro';
    case 'CREDIT_CARD':
      return 'Cartão';
    case 'DEBIT_CARD':
      return 'Débito';
    case 'PIX':
      return 'Pix';
    default:
      return method || '—';
  }
}

const hasAmount = (amount?: number | null): amount is number =>
  typeof amount === 'number' && Number.isFinite(amount);

export function PaymentStatusBadge({ isPaid }: { isPaid?: boolean | null }) {
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 font-bold px-2 py-1 rounded-full text-[10px] bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 size={12} /> PAGO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-bold px-2 py-1 rounded-full text-[10px] bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2]">
      <Banknote size={12} /> COBRAR NA ENTREGA
    </span>
  );
}

export function PaymentChips({ delivery }: { delivery: PaymentInfo }) {
  const paid = Boolean(delivery.isPaid);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <PaymentStatusBadge isPaid={paid} />
      <span className="text-[#1A4B9F] font-medium bg-blue-50 px-2 py-1 rounded text-[10px]">
        {paymentMethodLabel(delivery.paymentMethod)}
      </span>
      {hasAmount(delivery.amount) ? (
        <span
          className={`font-bold px-2 py-1 rounded text-[10px] border ${
            paid
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]'
          }`}
        >
          {formatBRL(delivery.amount)}
        </span>
      ) : !paid ? (
        <span className="font-bold px-2 py-1 rounded text-[10px] bg-red-50 text-[#E53E3E] border border-red-200">
          valor não informado
        </span>
      ) : null}
    </div>
  );
}

export function PaymentPanel({ delivery }: { delivery: PaymentInfo }) {
  const paid = Boolean(delivery.isPaid);
  const amountKnown = hasAmount(delivery.amount);
  const amountText = amountKnown ? formatBRL(delivery.amount) : 'Valor não informado';
  const methodText = paymentMethodLabel(delivery.paymentMethod);
  const changeFor = hasAmount(delivery.changeFor) && delivery.changeFor > 0 ? delivery.changeFor : null;
  const changeBack =
    changeFor !== null && amountKnown && changeFor > (delivery.amount as number)
      ? Math.round((changeFor - (delivery.amount as number)) * 100) / 100
      : null;

  if (paid) {
    return (
      <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5">
        <div className="flex items-center gap-2 text-green-800 font-extrabold text-sm tracking-wide">
          <CheckCircle2 size={20} /> PAGO ANTERIORMENTE
        </div>
        <p className="text-xs text-green-700 mt-1">O motorista não deve cobrar nada do cliente</p>
        <p className="text-4xl font-extrabold text-green-700 mt-3">{amountText}</p>
        <p className="text-sm text-green-800 font-semibold mt-2">Forma usada: {methodText}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-[#E65100] bg-[#FFF3E0] p-5">
      <div className="flex items-center gap-2 text-[#9A3412] font-extrabold text-sm tracking-wide">
        <Banknote size={20} /> COBRAR NA ENTREGA
      </div>
      <p className="text-xs text-[#9A3412] mt-1">
        O motorista deve receber este valor do cliente no destino
      </p>
      <p className={`text-4xl font-extrabold mt-3 ${amountKnown ? 'text-[#E65100]' : 'text-[#E53E3E]'}`}>
        {amountText}
      </p>
      <p className="text-sm text-[#9A3412] font-semibold mt-2">Forma de cobrança: {methodText}</p>
      {delivery.paymentMethod === 'CASH' && changeFor !== null && (
        <p className="text-sm text-[#9A3412] font-semibold mt-1">
          Troco para {formatBRL(changeFor)}
          {changeBack !== null && ` — devolver ${formatBRL(changeBack)}`}
        </p>
      )}
    </div>
  );
}

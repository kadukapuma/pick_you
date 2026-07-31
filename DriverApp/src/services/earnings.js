import api from './api';

/**
 * Driver commission account: signed net position with PickU.
 * Positive balance means PickU owes the driver, negative means the driver
 * owes PickU (commission on cash rides they collected in full).
 */
export const fetchDriverAccount = async () => {
  const { data } = await api.get('/driver/account');
  return data?.data || null;
};

export const fetchEarningsSummary = async (period = 'day') => {
  const { data } = await api.get('/driver/earnings/summary', { params: { period } });
  return data?.data || null;
};

export const fetchAccountTransactions = async (page = 1) => {
  const { data } = await api.get('/driver/account/transactions', { params: { page } });
  return data?.data || null;
};

export const formatRs = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return 'Rs.0.00';

  return `Rs.${Math.abs(amount).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

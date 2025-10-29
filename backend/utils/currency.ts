export const convertToCents = (amount: number | null) => {
  if (!amount) return 0;

  return Math.round(amount * 100);
};

export const convertToDollars = (amount: number | null) => {
  if (!amount) return 0;

  return amount / 100;
};

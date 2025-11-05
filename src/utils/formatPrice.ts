export const formatPrice = (n: number, currency: string = 'INR'): string => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${n}`;
  }
};


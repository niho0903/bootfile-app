import type { Appearance } from '@stripe/stripe-js';

export const stripeAppearance: Appearance = {
  theme: 'flat',
  variables: {
    colorPrimary: '#7D8B6E',
    colorBackground: '#F7F4EF',
    colorText: '#2D2926',
    colorDanger: '#DC2626',
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '8px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: '1px solid #DDD6CC',
      boxShadow: 'none',
    },
    '.Input:focus': {
      border: '1px solid #7D8B6E',
      boxShadow: '0 0 0 1px #7D8B6E',
    },
    '.Label': {
      color: '#7A746B',
      fontSize: '14px',
    },
  },
};

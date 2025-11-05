export const MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Sign-in failed. Check email or password.',
    SIGNED_IN: 'Welcome back!',
  },
  BOOKING: {
    CREATED: 'Appointment booked.',
    CANCELLED: 'Appointment cancelled.',
    RESCHEDULED: 'Appointment rescheduled.',
    CONFLICT: 'You already have an appointment at that time.',
  },
  ORDERS: {
    ADDED_TO_CART: 'Added to cart.',
    EMPTY_CART: 'Add items to checkout.',
    CANCELLED: 'Order cancelled.',
  },
  GENERIC: {
    NETWORK_ERROR: "We couldn't save this. Try again.",
  },
} as const;


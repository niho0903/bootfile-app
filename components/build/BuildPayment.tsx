'use client';

import { useState } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { getStripeClient } from '@/lib/stripe-client';
import { stripeAppearance } from '@/lib/stripe-appearance';

interface PaymentFormProps {
  onSuccess: (paymentIntentId: string) => void;
}

function PaymentForm({ onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/build`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setProcessing(false);
      setErrorMessage(error.message || 'Payment failed. Please try again.');
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setProcessing(false);
      setErrorMessage('Payment was not completed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 16 }}>
        <PaymentElement />
      </div>
      {errorMessage && (
        <p
          style={{
            color: '#DC2626',
            fontSize: 13,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        style={{
          width: '100%',
          backgroundColor: processing ? '#A0A89A' : '#7D8B6E',
          color: '#fff',
          fontWeight: 600,
          padding: '16px 32px',
          borderRadius: 12,
          fontSize: 16,
          border: 'none',
          cursor: processing ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          fontFamily: 'inherit',
          opacity: !stripe ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!processing) e.currentTarget.style.backgroundColor = '#5C6650';
        }}
        onMouseLeave={(e) => {
          if (!processing) e.currentTarget.style.backgroundColor = '#7D8B6E';
        }}
      >
        {processing ? 'Processing...' : 'Pay $4.99'}
      </button>
    </form>
  );
}

interface BuildPaymentProps {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
}

export function BuildPayment({ clientSecret, onSuccess }: BuildPaymentProps) {
  return (
    <Elements
      stripe={getStripeClient()}
      options={{ clientSecret, appearance: stripeAppearance }}
    >
      <PaymentForm onSuccess={onSuccess} />
    </Elements>
  );
}

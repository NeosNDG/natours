import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51QXpDtLX7GETBKGwmuCCKqK1z96lt3Y0tRWO2IAZ8kG0WOTgUoYBhh4OLsEIJ41rkPX9mtrAdxnTI5uEWLvzKV11006DjQeFBa',
);

export const bookTour = async (tourId) => {
  try {
    // 1) get checkout session from API
    const session = await axios(
      `http://localhost:8000/api/v1/booking/checkout-session/${tourId}`,
    );

    console.log(session);

    // 2) create checkout form + charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};

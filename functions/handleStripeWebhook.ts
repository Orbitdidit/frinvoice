import { createClient } from 'npm:@base44/sdk@0.1.0';
import Stripe from 'npm:stripe@14.21.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    let event;

    if (!webhookSecret) {
        console.error('Stripe webhook secret is not set.');
        return new Response('Webhook secret not configured.', { status: 500 });
    }

    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            webhookSecret
        );
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                const invoiceId = session.metadata.invoice_id;
                
                if (invoiceId) {
                    await base44.entities.Invoice.update(invoiceId, {
                        status: 'paid',
                        payment_status: 'paid',
                        payment_method: 'credit_card',
                        stripe_session_id: session.id,
                        stripe_payment_intent_id: session.payment_intent,
                    });
                    console.log(`✅ Invoice ${invoiceId} marked as paid.`);
                } else {
                    console.warn(`Webhook received for session ${session.id} with no invoice_id in metadata.`);
                }
                break;
                
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error processing webhook event:', error);
        return new Response('Webhook processing error', { status: 500 });
    }
});
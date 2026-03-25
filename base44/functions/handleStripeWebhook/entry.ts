import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.14.0';

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
        const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

        if (!STRIPE_SECRET_KEY) {
             console.error("Stripe Key Missing");
             return new Response("Stripe config missing", { status: 500 });
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY);
        const signature = req.headers.get('stripe-signature');
        const body = await req.text();

        let event;
        try {
             // If we had a webhook secret, we'd verify it. 
             // For now, assume it's valid if no secret set (dev mode) or try verify
             if (STRIPE_WEBHOOK_SECRET) {
                 event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
             } else {
                 event = JSON.parse(body);
             }
        } catch (err) {
            console.error(`Webhook signature verification failed.`, err.message);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        const admin = base44.asServiceRole;

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const invoiceId = session.metadata?.invoice_id;

            if (invoiceId) {
                console.log(`💰 Payment received for Invoice ${invoiceId}`);
                
                // Update Invoice Status
                try {
                    // Update to 'paid' and set payment method
                    await admin.entities.Invoice.update(invoiceId, {
                        status: 'paid',
                        payment_status: 'paid',
                        payment_method: 'credit_card', // Assuming Stripe is card usually
                        updated_date: new Date().toISOString()
                    });
                    console.log(`✅ Invoice ${invoiceId} marked as paid`);
                } catch (e) {
                    console.error("Failed to update invoice:", e);
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });

    } catch (error) {
        console.error("Webhook Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
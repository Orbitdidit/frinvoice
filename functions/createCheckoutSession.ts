import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { invoiceData, successUrl, cancelUrl } = await req.json();
        
        // --- VALIDATION ---
        if (!invoiceData || !invoiceData.id) {
            return new Response(JSON.stringify({ error: 'Invoice data is required' }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
        
        if (!invoiceData.total_amount || invoiceData.total_amount < 0.50) {
             return new Response(JSON.stringify({ error: `Invoice total must be at least $0.50. Current total: $${invoiceData.total_amount}` }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // --- CREATE STRIPE SESSION ---
        const lineItems = [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `Payment for Invoice #${invoiceData.invoice_number}`,
                    description: `Invoice ID: ${invoiceData.id}`,
                },
                unit_amount: Math.round(invoiceData.total_amount * 100), // Stripe expects the total amount in cents
            },
            quantity: 1,
        }];

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                invoice_id: invoiceData.id,
                invoice_number: invoiceData.invoice_number,
            },
            customer_email: invoiceData.client_email || undefined,
        });

        return new Response(JSON.stringify({ checkout_url: session.url }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        return new Response(JSON.stringify({ error: `Stripe Error: ${error.message}` }), {
            status: 500,
            headers: { 'Content-Type': "application/json" },
        });
    }
});
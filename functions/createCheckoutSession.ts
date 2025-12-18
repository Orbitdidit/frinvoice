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
        const base44 = createClientFromRequest(req);
        // This function is public so clients can pay!
        // But ideally we validate the invoice status first.
        // We'll use Service Role to read the invoice details.
        const admin = base44.asServiceRole;

        const { invoice_id, return_url } = await req.json();

        if (!invoice_id) {
            return new Response(JSON.stringify({ error: "Invoice ID required" }), { status: 400, headers: corsHeaders });
        }

        const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
        if (!STRIPE_SECRET_KEY) {
             return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500, headers: corsHeaders });
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY);

        // Fetch invoice
        const invoices = await admin.entities.Invoice.filter({ id: invoice_id });
        const invoice = invoices[0];

        if (!invoice) {
            return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: corsHeaders });
        }

        if (invoice.status === 'paid') {
             return new Response(JSON.stringify({ error: "Invoice already paid" }), { status: 400, headers: corsHeaders });
        }

        // Construct line items for Stripe
        const line_items = invoice.line_items.map(item => {
            // Stripe expects amount in cents
            const unitAmountCents = Math.round((item.unit_price || 0) * 100);
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: item.description || 'Service',
                        description: item.detail || undefined,
                    },
                    unit_amount: unitAmountCents,
                },
                quantity: item.quantity || 1,
            };
        });

        // Add tax/discount as separate line items if simple, or handle logic
        // For simplicity, let's trust the total amount if complex logic was used
        // But Stripe prefers itemized. 
        // If there's a discount_amount or tax_amount, we might need to adjust.
        // EASIER STRATEGY: Create one line item for the full total if structure is complex,
        // OR pass line items and hope they sum up correctly.
        // Let's stick to "Total Invoice Amount" to ensure exact match with invoice total.
        
        const finalAmountCents = Math.round((invoice.total_amount || 0) * 100);
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Invoice #${invoice.invoice_number}`,
                            description: `Payment for Invoice ${invoice.invoice_number}`,
                        },
                        unit_amount: finalAmountCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${return_url || req.headers.get('origin')}/PaymentSuccess?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoice_id}`,
            cancel_url: `${return_url || req.headers.get('origin')}/PaymentCancelled?invoice_id=${invoice_id}`,
            metadata: {
                invoice_id: invoice_id,
                invoice_number: invoice.invoice_number
            },
            customer_email: invoice.client_email || undefined,
        });

        return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });

    } catch (error) {
        console.error("Stripe Checkout Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
});
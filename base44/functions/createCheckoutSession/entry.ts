import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@^14.0.0';

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
    // Use service role to access invoice and creator's config regardless of who is calling
    const adminBase44 = base44.asServiceRole;

    const { invoice_id, return_url } = await req.json();

    if (!invoice_id) {
        return new Response(JSON.stringify({ error: 'Invoice ID is required' }), { status: 400, headers: corsHeaders });
    }

    // 1. Fetch Invoice
    const invoice = await adminBase44.entities.Invoice.get(invoice_id);
    if (!invoice) {
        return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: corsHeaders });
    }
    
    // Check if already paid
    if (invoice.status === 'paid') {
         return new Response(JSON.stringify({ error: 'Invoice is already paid' }), { status: 400, headers: corsHeaders });
    }

    // 2. Determine Stripe Credentials (BYOK)
    let secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    // Check if the invoice creator has their own keys
    const configs = await adminBase44.entities.PaymentConfig.filter({ 
        created_by: invoice.created_by,
        is_active: true
    });
    
    if (configs.length > 0) {
        secretKey = configs[0].stripe_secret_key;
        console.log("Using User's Stripe Keys");
    } else {
        console.log("Using Platform Stripe Keys");
    }

    if (!secretKey) {
        return new Response(JSON.stringify({ error: 'Payment processing not configured for this merchant' }), { status: 500, headers: corsHeaders });
    }

    const stripe = new Stripe(secretKey);

    // 3. Prepare Line Items
    const line_items = invoice.line_items.map(item => {
        // Stripe expects amounts in cents
        // Handle negative amounts (discounts/deposits) - Stripe Checkout doesn't support negative line items directly in the same way.
        // Strategy: We will sum up the total and create one line item if the structure is complex, 
        // OR filter out negative items and apply them as coupons/discounts.
        // simpler for MVP: Create one line item for the TOTAL amount.
        return null; 
    }).filter(Boolean);

    // MVP Approach: Single line item for the full amount to avoid negative item complexity
    const checkoutLineItems = [{
        price_data: {
            currency: 'usd',
            product_data: {
                name: `Invoice #${invoice.invoice_number}`,
                description: `Payment for invoice from ${invoice.client_name || 'Merchant'}`,
            },
            unit_amount: Math.round(invoice.total_amount * 100), // Convert to cents
        },
        quantity: 1,
    }];

    // 4. Create Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: checkoutLineItems,
      mode: 'payment',
      success_url: `${return_url}/payment-success?invoice_id=${invoice.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${return_url}/payment-cancelled?invoice_id=${invoice.id}`,
      client_reference_id: invoice.id,
      metadata: {
        invoice_id: invoice.id,
        app_id: 'invox'
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Checkout Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
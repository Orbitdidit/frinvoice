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
    const adminBase44 = base44.asServiceRole;
    
    const { invoice_id, session_id } = await req.json();

    if (!invoice_id || !session_id) {
        return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400, headers: corsHeaders });
    }

    // 1. Fetch Invoice
    const invoice = await adminBase44.entities.Invoice.get(invoice_id);
    if (!invoice) {
        return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: corsHeaders });
    }

    // 2. Determine Credentials
    let secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const configs = await adminBase44.entities.PaymentConfig.filter({ 
        created_by: invoice.created_by,
        is_active: true
    });
    if (configs.length > 0) {
        secretKey = configs[0].stripe_secret_key;
    }

    if (!secretKey) {
        return new Response(JSON.stringify({ error: 'Configuration error' }), { status: 500, headers: corsHeaders });
    }

    const stripe = new Stripe(secretKey);

    // 3. Verify Session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
        // Update Invoice
        if (invoice.status !== 'paid') {
            await adminBase44.entities.Invoice.update(invoice.id, {
                status: 'paid',
                payment_status: 'paid',
                payment_method: 'credit_card' // Assume CC for now
            });
            return new Response(JSON.stringify({ status: 'paid', verified: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        } else {
             return new Response(JSON.stringify({ status: 'already_paid', verified: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
    } else {
        return new Response(JSON.stringify({ status: session.payment_status, verified: false }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

  } catch (error) {
    console.error('Verification Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
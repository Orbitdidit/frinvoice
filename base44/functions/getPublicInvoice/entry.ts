import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // 1. Safe Body Parsing
        let invoice_id;

        // Support both GET (query param) and POST (body)
        if (req.method === 'GET') {
            const url = new URL(req.url);
            invoice_id = url.searchParams.get('invoice_id');
        } else {
            try {
                const body = await req.json();
                invoice_id = body.invoice_id;
            } catch (e) {
                // If body is empty or invalid, check query params as fallback
                 const url = new URL(req.url);
                 invoice_id = url.searchParams.get('invoice_id');
            }
        }

        if (!invoice_id) {
            return new Response(JSON.stringify({ error: "Invoice ID required" }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        // 2. Initialize SDK
        // NOTE: For public functions, createClientFromRequest might not have user session, 
        // but it still initializes the client for Service Role usage.
        const base44 = createClientFromRequest(req);
        
        // 3. Service Role Access (Bypass RLS)
        const admin = base44.asServiceRole;

        // 4. Fetch Invoice
        // We use .filter instead of .get because .get might throw if not found or permissions issue
        // .filter is often safer with service role
        const invoices = await admin.entities.Invoice.filter({ id: invoice_id });
        const invoice = invoices[0];
        
        if (!invoice) {
            console.error(`Invoice not found: ${invoice_id}`);
            return new Response(JSON.stringify({ error: "Invoice not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        // 5. Fetch Creator Info
        let creator = {};
        if (invoice.created_by) {
            const users = await admin.entities.User.filter({ email: invoice.created_by });
            creator = users[0] || {};
        }

        // 6. Sanitize Response
        const companyInfo = {
            company_name: creator.company_name || "Frinvoice User",
            company_logo_url: creator.company_logo_url,
            payment_details: creator.payment_details || creator.default_invoice_terms || "",
            email: creator.email,
            phone: creator.phone
        };

        return new Response(JSON.stringify({ 
            invoice,
            companyInfo
        }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });

    } catch (error) {
        console.error("CRITICAL getPublicInvoice ERROR:", error);
        return new Response(JSON.stringify({ 
            error: "Internal Server Error", 
            details: error.message 
        }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
});
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
        const base44 = createClientFromRequest(req);
        const { invoice_id } = await req.json();

        if (!invoice_id) {
            return new Response(JSON.stringify({ error: "Invoice ID required" }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        // Use Service Role to bypass RLS for the Invoice and User
        // This is safe because we only return specific sanitized data
        const admin = base44.asServiceRole;
        
        const invoice = await admin.entities.Invoice.get(invoice_id);
        
        if (!invoice) {
            return new Response(JSON.stringify({ error: "Invoice not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json", ...corsHeaders }
            });
        }

        // Fetch company/creator info
        const creators = await admin.entities.User.filter({ email: invoice.created_by });
        const creator = creators[0] || {};

        // Sanitize return data (don't send sensitive user info)
        const companyInfo = {
            company_name: creator.company_name,
            company_logo_url: creator.company_logo_url,
            payment_details: creator.payment_details || creator.default_invoice_terms,
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
        console.error("getPublicInvoice error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@^14.0.0';

export async function getStripeClient(base44, userId = null) {
    let secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    let isPlatform = true;

    // If a specific user is provided (the invoice creator), try to find their keys
    if (userId) {
        // We need to query the PaymentConfig for this user.
        // Since we might be running as the logged-in user (payer) or public,
        // we should ideally use service role to fetch the CREATOR'S config.
        // However, we can't easily filter by 'created_by' if we don't know the exact mechanism.
        // The robust way: Fetch invoice -> get creator_email -> fetch PaymentConfig where created_by = creator_email
        // For now, let's assume we pass the *creator's email* or rely on the caller to handle logic.
        
        // Actually, we can use the base44 client to find the config.
        // Note: RLS prevents reading other's configs. We must use service role if we are checking for someone else.
        
        try {
           // This assumes the caller has appropriate privileges or we use service role here.
           // Since this is a helper, we rely on the passed base44 client being a Service Role client if needed.
           const configs = await base44.entities.PaymentConfig.filter({ 
                created_by: userId, 
                is_active: true 
           });
           
           if (configs.length > 0) {
               secretKey = configs[0].stripe_secret_key;
               isPlatform = false;
           }
        } catch (e) {
            console.log("Error fetching user payment config, falling back to platform keys:", e);
        }
    }

    if (!secretKey) {
        throw new Error("Stripe configuration missing");
    }

    return {
        stripe: new Stripe(secretKey),
        isPlatform
    };
}
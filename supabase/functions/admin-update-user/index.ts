import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Create admin client with service role
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Verify the requesting user is an admin
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: "No authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !requestingUser) {
            return new Response(
                JSON.stringify({ success: false, error: "Invalid token" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if requesting user is admin
        const { data: roleData, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", requestingUser.id)
            .single();

        if (roleError || roleData?.role !== "admin") {
            return new Response(
                JSON.stringify({ success: false, error: "Only admins can update users" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { user_id, email, password, name, department, roll_number, employee_id } = await req.json();

        if (!user_id) {
            return new Response(
                JSON.stringify({ success: false, error: "Missing user_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Password validation - defense in depth (only if password is provided)
        if (password !== undefined && password !== null && password !== '') {
            if (typeof password !== 'string' || password.length < 8) {
                return new Response(
                    JSON.stringify({ success: false, error: "Password must be at least 8 characters" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (password.length > 128) {
                return new Response(
                    JSON.stringify({ success: false, error: "Password must be less than 128 characters" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Check for at least one uppercase, one lowercase, and one number
            const hasUppercase = /[A-Z]/.test(password);
            const hasLowercase = /[a-z]/.test(password);
            const hasNumber = /[0-9]/.test(password);

            if (!hasUppercase || !hasLowercase || !hasNumber) {
                return new Response(
                    JSON.stringify({ success: false, error: "Password must contain uppercase, lowercase, and a number" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        const updates: any = {};
        const userMetadataUpdates: any = {};

        if (email) updates.email = email;
        if (password) updates.password = password;

        // Check if metadata needs update
        if (name !== undefined) userMetadataUpdates.name = name;
        if (department !== undefined) userMetadataUpdates.department = department;
        if (roll_number !== undefined) userMetadataUpdates.roll_number = roll_number;
        if (employee_id !== undefined) userMetadataUpdates.employee_id = employee_id;

        if (Object.keys(userMetadataUpdates).length > 0) {
            updates.user_metadata = userMetadataUpdates;
        }

        // Update user with admin API
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user_id,
            updates
        );

        if (updateError) {
            console.error("Error updating user:", updateError);
            return new Response(
                JSON.stringify({ success: false, error: updateError.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Also explicitly update the profiles table if metadata was changed, to ensure sync (though triggers might handle this, it's safer to do it here or let triggers work. Usually I'd rely on Auth to Profile trigger, but if it doesn't exist, I might need to update public.profiles manually).
        // Assuming there is a trigger that updates profiles on auth update, or we update profiles manually.
        // Let's update profiles manually to be sure, using the service role client.

        const profileUpdates: any = {};
        if (name) profileUpdates.name = name;
        if (department) profileUpdates.department = department;
        if (roll_number) profileUpdates.roll_number = roll_number;
        if (employee_id) profileUpdates.employee_id = employee_id;
        if (email) profileUpdates.email = email; // Update email in profile as well

        if (Object.keys(profileUpdates).length > 0) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdates)
                .eq('user_id', user_id);

            if (profileError) {
                console.error("Error updating profile:", profileError);
                // We don't fail the request if profile update fails but auth succeeded, but it's not ideal.
            }
        }

        return new Response(
            JSON.stringify({ success: true, user: updatedUser.user }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Server error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

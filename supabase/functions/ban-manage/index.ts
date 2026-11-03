import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, user_id } = await req.json();

    if (action === "archive_and_delete") {
      // 1. Get profile
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      if (!profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Gather all user data
      const [credits, projects, conversations, favorites, memories, stickyNotes] =
        await Promise.all([
          supabaseAdmin.from("user_credits").select("*").eq("user_id", user_id),
          supabaseAdmin.from("user_projects").select("*").eq("user_id", user_id),
          supabaseAdmin.from("conversations").select("*").eq("user_id", user_id),
          supabaseAdmin.from("user_favorites").select("*").eq("user_id", user_id),
          supabaseAdmin.from("user_memories").select("*").eq("user_id", user_id),
          supabaseAdmin.from("sticky_notes").select("*").eq("user_id", user_id),
        ]);

      // 3. Get messages for user's conversations
      const conversationIds = (conversations.data || []).map((c: any) => c.id);
      let messagesData: any[] = [];
      if (conversationIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("messages")
          .select("*")
          .in("conversation_id", conversationIds);
        messagesData = data || [];
      }

      // 4. Save backup
      const backupData = {
        profile,
        credits: credits.data || [],
        projects: projects.data || [],
        conversations: conversations.data || [],
        messages: messagesData,
        favorites: favorites.data || [],
        memories: memories.data || [],
        sticky_notes: stickyNotes.data || [],
      };

      await supabaseAdmin.from("banned_user_backups").upsert(
        {
          original_user_id: user_id,
          email: profile.email,
          display_name: profile.display_name,
          backup_data: backupData,
        },
        { onConflict: "original_user_id" }
      );

      // 5. Delete messages referencing this user, then delete auth user
      await supabaseAdmin.from("messages").delete().eq("user_id", user_id);
      await supabaseAdmin.from("message_reactions").delete().eq("user_id", user_id);
      await supabaseAdmin.auth.admin.deleteUser(user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "restore") {
      // 1. Get backup
      const { data: backup } = await supabaseAdmin
        .from("banned_user_backups")
        .select("*")
        .eq("original_user_id", user_id)
        .maybeSingle();

      if (!backup) {
        return new Response(JSON.stringify({ error: "No backup found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = backup.backup_data as any;
      const email = backup.email;

      // 2. Create new auth user with same email and a temp password
      const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        });

      if (createError || !newUser?.user) {
        return new Response(
          JSON.stringify({ error: createError?.message || "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newUserId = newUser.user.id;

      // 3. Update profile with old data (profile is auto-created by trigger)
      if (data.profile) {
        await supabaseAdmin
          .from("profiles")
          .update({
            display_name: data.profile.display_name,
            avatar_url: data.profile.avatar_url,
            preferred_language: data.profile.preferred_language,
            terms_accepted: data.profile.terms_accepted,
            terms_accepted_at: data.profile.terms_accepted_at,
            terms_version: data.profile.terms_version,
          })
          .eq("user_id", newUserId);
      }

      // 4. Restore credits
      if (data.credits?.length > 0) {
        const oldCredits = data.credits[0];
        await supabaseAdmin
          .from("user_credits")
          .update({ credits: oldCredits.credits })
          .eq("user_id", newUserId);
      }

      // 5. Restore projects (with new user_id)
      for (const project of data.projects || []) {
        const { id, user_id: _, created_at, updated_at, ...rest } = project;
        await supabaseAdmin.from("user_projects").insert({
          ...rest,
          user_id: newUserId,
        });
      }

      // 6. Restore conversations and messages
      const convIdMap: Record<string, string> = {};
      for (const conv of data.conversations || []) {
        const { id: oldId, user_id: _, created_at, updated_at, ...rest } = conv;
        const { data: newConv } = await supabaseAdmin
          .from("conversations")
          .insert({ ...rest, user_id: newUserId })
          .select("id")
          .single();
        if (newConv) convIdMap[oldId] = newConv.id;
      }

      for (const msg of data.messages || []) {
        const newConvId = convIdMap[msg.conversation_id];
        if (!newConvId) continue;
        const { id, conversation_id, user_id: msgUserId, created_at, ...rest } = msg;
        await supabaseAdmin.from("messages").insert({
          ...rest,
          conversation_id: newConvId,
          user_id: msgUserId === user_id ? newUserId : msgUserId,
        });
      }

      // 7. Restore favorites
      for (const fav of data.favorites || []) {
        const newConvId = fav.conversation_id ? convIdMap[fav.conversation_id] : null;
        await supabaseAdmin.from("user_favorites").insert({
          user_id: newUserId,
          conversation_id: newConvId,
          note: fav.note,
        });
      }

      // 8. Restore memories
      for (const mem of data.memories || []) {
        const { id, user_id: _, created_at, updated_at, ...rest } = mem;
        await supabaseAdmin.from("user_memories").insert({
          ...rest,
          user_id: newUserId,
        });
      }

      // 9. Restore sticky notes
      for (const note of data.sticky_notes || []) {
        const { id, user_id: _, created_at, updated_at, ...rest } = note;
        await supabaseAdmin.from("sticky_notes").insert({
          ...rest,
          user_id: newUserId,
        });
      }

      // 10. Remove ban entry and backup
      await supabaseAdmin.from("banned_users").delete().eq("user_id", user_id);
      await supabaseAdmin.from("banned_user_backups").delete().eq("original_user_id", user_id);

      return new Response(
        JSON.stringify({
          success: true,
          new_user_id: newUserId,
          email,
          temp_password: tempPassword,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

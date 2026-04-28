import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", { user_id: user.id });
    
    if (adminError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { to, subject, html, senderAddress, templateId, eventHandlerId } = body;

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpHost = "uthutho.co.za";
    const smtpPort = 465;
    const smtpUsername = "alerts@uthutho.co.za";
    const smtpPassword = "#Established@2026";
    
    const fromAddress = senderAddress || smtpUsername;
    const recipients = Array.isArray(to) ? to : [to];

    // Send email
    const result = await sendEmail(smtpHost, smtpPort, smtpUsername, smtpPassword, fromAddress, recipients, subject, html);

    // Log the email send
    for (const recipient of recipients) {
      await supabase.from("email_send_log").insert({
        template_id: templateId || null,
        event_handler_id: eventHandlerId || null,
        recipient_email: recipient,
        subject: subject,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent to ${recipients.length} recipient(s)`,
        result: result
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Email send error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send email", 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

async function sendEmail(host, port, username, password, fromAddress, recipients, subject, html) {
  const conn = await Deno.connectTls({ hostname: host, port: port });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  let buffer = new Uint8Array(8192);
  
  async function readResponse() {
    const bytesRead = await conn.read(buffer);
    if (!bytesRead) return "";
    const response = decoder.decode(buffer.subarray(0, bytesRead));
    console.log("RECV:", response.trim());
    return response;
  }
  
  async function sendCommand(cmd, expectedCode) {
    console.log("SEND:", cmd);
    await conn.write(encoder.encode(cmd + "\r\n"));
    const response = await readResponse();
    const code = parseInt(response.substring(0, 3));
    if (code !== expectedCode) {
      throw new Error(`Expected ${expectedCode}, got ${code}: ${response}`);
    }
    return response;
  }
  
  try {
    // Read greeting
    let response = await readResponse();
    let code = parseInt(response.substring(0, 3));
    if (code !== 220) throw new Error(`Invalid greeting: ${response}`);
    
    // EHLO
    await sendCommand(`EHLO ${host}`, 250);
    
    // AUTH LOGIN
    await sendCommand("AUTH LOGIN", 334);
    
    // Username (base64)
    await sendCommand(btoa(username), 334);
    
    // Password (base64)
    await sendCommand(btoa(password), 235);
    
    // MAIL FROM
    await sendCommand(`MAIL FROM:<${fromAddress}>`, 250);
    
    // RCPT TO
    for (const recipient of recipients) {
      await sendCommand(`RCPT TO:<${recipient}>`, 250);
    }
    
    // DATA
    await sendCommand("DATA", 354);
    
    // Prepare email content - make sure it ends with \r\n.\r\n
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${host}>`;
    const date = new Date().toUTCString();
    
    // Build email parts
    const headers = [
      `Date: ${date}`,
      `Message-ID: ${messageId}`,
      `From: "Alerts" <${fromAddress}>`,
      `To: ${recipients.join(", ")}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      `X-Priority: 3`,
      `X-Mailer: Supabase-Edge-Function`,
      ``,
    ].join("\r\n");
    
    // Send headers
    await conn.write(encoder.encode(headers));
    
    // Send HTML content
    await conn.write(encoder.encode(html));
    
    // Send the final dot (end of message)
    await conn.write(encoder.encode("\r\n.\r\n"));
    
    // Read the final response
    response = await readResponse();
    code = parseInt(response.substring(0, 3));
    if (code !== 250) {
      throw new Error(`Failed to send email content: ${response}`);
    }
    
    console.log("Email content accepted by server");
    
    // QUIT
    await sendCommand("QUIT", 221);
    
    await conn.close();
    console.log("Email sent successfully!");
    
    return { messageId, recipients, date };
    
  } catch (error) {
    await conn.close();
    throw error;
  }
}
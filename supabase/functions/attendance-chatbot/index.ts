import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  userId: string;
  userRole: 'admin' | 'professor' | 'student';
}

interface QueryPlan {
  intent: string;
  filters: {
    date?: string;
    dateRange?: { start: string; end: string };
    classId?: string;
    department?: string;
    semester?: string;
    threshold?: number;
    studentId?: string;
  };
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, userRole } = await req.json() as ChatRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Chatbot] User: ${userId}, Role: ${userRole}, Message: ${message}`);

    // Step 1: Use AI to parse the intent and extract filters
    const parseResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an attendance query parser. Parse the user's natural language query and extract:
- intent: One of: absent_today, present_today, class_attendance, low_attendance, date_range, student_specific, trend_analysis, general_stats
- filters: Extract any relevant filters like date, dateRange, classId, department, semester, threshold percentage, studentId

Today's date is: ${new Date().toISOString().split('T')[0]}

Respond ONLY with valid JSON in this format:
{
  "intent": "string",
  "filters": {
    "date": "YYYY-MM-DD or null",
    "dateRange": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } or null,
    "classId": "string or null",
    "department": "string or null", 
    "semester": "string or null",
    "threshold": number or null,
    "studentId": "string or null"
  },
  "description": "brief description of what user wants"
}`
          },
          { role: "user", content: message }
        ],
      }),
    });

    if (!parseResponse.ok) {
      const errorText = await parseResponse.text();
      console.error("[Chatbot] AI parse error:", parseResponse.status, errorText);
      
      if (parseResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment.",
          response: "I'm currently experiencing high demand. Please try again in a few seconds." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("Failed to parse query");
    }

    const parseData = await parseResponse.json();
    let queryPlan: QueryPlan;
    
    try {
      const content = parseData.choices[0].message.content;
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      queryPlan = JSON.parse(jsonMatch[1].trim());
      console.log("[Chatbot] Parsed intent:", queryPlan);
    } catch (e) {
      console.error("[Chatbot] Failed to parse AI response:", e);
      queryPlan = { intent: "general_stats", filters: {}, description: "General query" };
    }

    // Step 2: Build and execute database query based on role and intent
    let queryResult: any[] = [];
    let queryError: string | null = null;

    // Validate userId is a valid UUID to prevent any injection attempts
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error("[Chatbot] Invalid userId format:", userId);
      return new Response(JSON.stringify({ 
        error: "Invalid user ID format",
        response: "I couldn't verify your identity. Please try logging in again." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split('T')[0];

    try {
      switch (queryPlan.intent) {
        case 'absent_today':
        case 'present_today': {
          const status = queryPlan.intent === 'absent_today' ? 'absent' : 'present';
          const targetDate = queryPlan.filters.date || today;
          
          // First get sessions for the date
          const { data: sessions } = await supabase
            .from('attendance_sessions')
            .select('id, class_id')
            .eq('date', targetDate);
          
          if (sessions && sessions.length > 0) {
            const sessionIds = sessions.map(s => s.id);
            
            // Get attendance records
            const { data: records, error } = await supabase
              .from('attendance_records')
              .select(`
                id,
                status,
                student_id,
                class_id,
                session_id,
                timestamp
              `)
              .in('session_id', sessionIds)
              .eq('status', status);
            
            if (error) throw error;
            
            // Filter by role access
            if (userRole === 'professor') {
              const { data: profClasses } = await supabase
                .from('classes')
                .select('id')
                .eq('professor_id', userId);
              const classIds = profClasses?.map(c => c.id) || [];
              queryResult = records?.filter(r => classIds.includes(r.class_id)) || [];
            } else if (userRole === 'student') {
              queryResult = records?.filter(r => r.student_id === userId) || [];
            } else {
              queryResult = records || [];
            }
            
            // Get student names
            if (queryResult.length > 0) {
              const studentIds = [...new Set(queryResult.map(r => r.student_id))];
              const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, name, roll_number')
                .in('user_id', studentIds);
              
              queryResult = queryResult.map(r => ({
                ...r,
                student_name: profiles?.find(p => p.user_id === r.student_id)?.name || 'Unknown',
                roll_number: profiles?.find(p => p.user_id === r.student_id)?.roll_number || 'N/A'
              }));
            }
          }
          break;
        }

        case 'low_attendance': {
          const threshold = queryPlan.filters.threshold || 75;
          
          // Get all enrollments and calculate attendance per student
          let query = supabase
            .from('class_enrollments')
            .select(`
              student_id,
              class_id,
              classes (subject, code)
            `);
          
          const { data: enrollments } = await query;
          
          if (enrollments) {
            // Filter by professor's classes if needed
            let filteredEnrollments = enrollments;
            if (userRole === 'professor') {
              const { data: profClasses } = await supabase
                .from('classes')
                .select('id')
                .eq('professor_id', userId);
              const classIds = profClasses?.map(c => c.id) || [];
              filteredEnrollments = enrollments.filter(e => classIds.includes(e.class_id));
            }
            
            // Calculate attendance for each student
            const studentStats: Record<string, { total: number; present: number; studentId: string; classes: string[] }> = {};
            
            for (const enrollment of filteredEnrollments) {
              const { data: sessions } = await supabase
                .from('attendance_sessions')
                .select('id')
                .eq('class_id', enrollment.class_id);
              
              const sessionIds = sessions?.map(s => s.id) || [];
              
              if (sessionIds.length > 0) {
                const { data: records } = await supabase
                  .from('attendance_records')
                  .select('status')
                  .eq('student_id', enrollment.student_id)
                  .in('session_id', sessionIds);
                
                if (!studentStats[enrollment.student_id]) {
                  studentStats[enrollment.student_id] = { 
                    total: 0, 
                    present: 0, 
                    studentId: enrollment.student_id,
                    classes: []
                  };
                }
                
                studentStats[enrollment.student_id].total += sessionIds.length;
                studentStats[enrollment.student_id].present += records?.filter(r => r.status === 'present' || r.status === 'late').length || 0;
                studentStats[enrollment.student_id].classes.push((enrollment.classes as any)?.code || 'Unknown');
              }
            }
            
            // Filter by threshold
            const lowAttendance = Object.values(studentStats)
              .filter(s => s.total > 0 && (s.present / s.total) * 100 < threshold);
            
            // Get names
            const studentIds = lowAttendance.map(s => s.studentId);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, name, roll_number')
              .in('user_id', studentIds);
            
            queryResult = lowAttendance.map(s => ({
              student_id: s.studentId,
              student_name: profiles?.find(p => p.user_id === s.studentId)?.name || 'Unknown',
              roll_number: profiles?.find(p => p.user_id === s.studentId)?.roll_number || 'N/A',
              attendance_percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
              total_sessions: s.total,
              present_sessions: s.present,
              classes: [...new Set(s.classes)].join(', ')
            }));
          }
          break;
        }

        case 'general_stats':
        case 'class_attendance':
        default: {
          // Get overall stats
          let classQuery = supabase.from('classes').select('id, subject, code, department');
          
          if (userRole === 'professor') {
            classQuery = classQuery.eq('professor_id', userId);
          }
          
          const { data: classes } = await classQuery;
          
          if (classes) {
            for (const cls of classes.slice(0, 5)) { // Limit to 5 classes
              const { data: sessions } = await supabase
                .from('attendance_sessions')
                .select('id')
                .eq('class_id', cls.id);
              
              const sessionIds = sessions?.map(s => s.id) || [];
              
              if (sessionIds.length > 0) {
                const { data: records } = await supabase
                  .from('attendance_records')
                  .select('status')
                  .in('session_id', sessionIds);
                
                const total = records?.length || 0;
                const present = records?.filter(r => r.status === 'present' || r.status === 'late').length || 0;
                
                queryResult.push({
                  class_name: cls.subject,
                  class_code: cls.code,
                  department: cls.department,
                  total_records: total,
                  present_count: present,
                  attendance_percentage: total > 0 ? Math.round((present / total) * 100) : 0,
                  total_sessions: sessionIds.length
                });
              }
            }
          }
          break;
        }
      }
    } catch (dbError: any) {
      console.error("[Chatbot] Database error:", dbError);
      queryError = dbError.message;
    }

    console.log("[Chatbot] Query result count:", queryResult.length);

    // Step 3: Use AI to format the response
    const formatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a helpful attendance assistant. Format the query results into a clear, human-readable response.

Rules:
- Be concise and professional
- Use bullet points for lists
- Include percentages and counts when relevant
- If no data found, explain politely
- Never make up data - only report what's in the results
- For error cases, apologize and suggest trying again

User's original question: ${message}
Query intent: ${queryPlan.intent}
User role: ${userRole}
${queryError ? `Error occurred: ${queryError}` : ''}`
          },
          { 
            role: "user", 
            content: queryResult.length > 0 
              ? `Query results:\n${JSON.stringify(queryResult, null, 2)}`
              : "No data found for this query."
          }
        ],
      }),
    });

    if (!formatResponse.ok) {
      if (formatResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded",
          response: "I'm currently busy. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to format response");
    }

    const formatData = await formatResponse.json();
    const assistantResponse = formatData.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      intent: queryPlan.intent,
      dataCount: queryResult.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Chatbot] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      response: "I apologize, but I encountered an error processing your request. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

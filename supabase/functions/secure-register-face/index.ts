import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptureData {
  front: string | null;
  left: string | null;
  right: string | null;
  up: string | null;
  blink: string | null;
}

interface BatchAnalysisResult {
  overall_status: 'success' | 'failure';
  overall_reason: string;
  is_same_person: boolean;
  liveness_confirmed: boolean;
  quality_score: number;
  facial_signature: string;
  angle_results: {
    front: { valid: boolean; reason: string };
    left: { valid: boolean; reason: string };
    right: { valid: boolean; reason: string };
    up: { valid: boolean; reason: string };
    blink: { valid: boolean; reason: string };
  };
}

function extractBase64(imageBase64: string): { mimeType: string; data: string } {
  let base64Data = imageBase64;
  let mimeType = 'image/jpeg';
  
  if (imageBase64.startsWith('data:')) {
    const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }
  
  return { mimeType, data: base64Data };
}

// Helper function with retry logic for rate limits
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 3000
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      if (attempt < maxRetries - 1) {
        const waitTime = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw new Error('Rate limit exceeded. Please wait 30 seconds and try again.');
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}

// Analyze ALL face images in a SINGLE API call - LENIENT version
async function analyzeAllFaces(
  captures: CaptureData,
  apiKey: string
): Promise<BatchAnalysisResult> {
  const images: any[] = [];
  
  // Prepare all images for the single request
  const angleNames = ['front', 'left', 'right', 'up', 'blink'] as const;
  for (const angle of angleNames) {
    const imageData = captures[angle];
    if (imageData) {
      const { mimeType, data } = extractBase64(imageData);
      images.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${data}` }
      });
    }
  }

  const response = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are a LENIENT face registration system for classroom attendance.

CRITICAL: Your goal is to HELP students register, not to block them. Be forgiving of imperfect conditions.

Analyze the 5 face images provided (front, left, right, up, blink).

TASKS:
1. Check that each image contains a human face (be lenient - partial visibility is OK)
2. Confirm ALL images show the SAME person (focus on major features, ignore minor differences)
3. Basic anti-spoofing check (reject only obvious photos of screens/printouts)
4. Verify blink shows natural eye movement (any visible eye movement counts)
5. Generate a facial signature for future verification

LENIENT VALIDATION - ACCEPT if:
- Face is visible in most images (minor blur/lighting issues are OK)
- Same person is recognizable across images
- No obvious spoofing attempts
- Some eye movement detected in blink image

ONLY REJECT if:
- NO face visible in multiple images
- CLEARLY different people in images
- OBVIOUS spoofing (photo of a photo, screen display)
- Zero natural movement (completely static across all images)

DO NOT REJECT FOR:
- Slightly blurry images
- Low or uneven lighting
- Glasses, minor obstructions
- Imperfect angles
- Average camera quality

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "overall_status": "success" | "failure",
  "overall_reason": "brief, encouraging explanation",
  "is_same_person": true | false,
  "liveness_confirmed": true | false,
  "quality_score": number (0-100, be generous),
  "facial_signature": "detailed textual descriptor of distinguishing features",
  "angle_results": {
    "front": { "valid": true|false, "reason": "..." },
    "left": { "valid": true|false, "reason": "..." },
    "right": { "valid": true|false, "reason": "..." },
    "up": { "valid": true|false, "reason": "..." },
    "blink": { "valid": true|false, "reason": "..." }
  }
}

IMPORTANT: When in doubt, return SUCCESS. Real users in real classrooms with real devices should succeed.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Register this student face. Be lenient - this is a real classroom with imperfect conditions. Images: front, left, right, up, blink.'
            },
            ...images
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from AI');
  }

  const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  console.log('AI response:', cleanContent.substring(0, 500));
  
  try {
    return JSON.parse(cleanContent);
  } catch {
    console.error('Failed to parse AI response:', cleanContent);
    throw new Error('Invalid AI response format');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { captures } = await req.json() as { captures: CaptureData };
    
    // Validate all required captures are present
    if (!captures.front || !captures.left || !captures.right || !captures.up || !captures.blink) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'All capture angles are required for secure registration' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authorization required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Starting secure face registration for user:', user.id);

    // Analyze ALL faces in a SINGLE API call
    console.log('Analyzing all face captures in single request...');
    const analysis = await analyzeAllFaces(captures, LOVABLE_API_KEY);

    // Lenient validation - only reject for clear failures
    if (analysis.overall_status === 'failure') {
      // Check if it's a minor issue we can overlook
      const hasValidFront = analysis.angle_results?.front?.valid !== false;
      const isSamePerson = analysis.is_same_person !== false;
      
      // If front is valid and same person, allow registration anyway
      if (hasValidFront && isSamePerson) {
        console.log('Overriding failure - front valid and same person detected');
        analysis.overall_status = 'success';
      } else {
        return new Response(JSON.stringify({ 
          success: false, 
          error: analysis.overall_reason || 'Please try again with better lighting'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Relaxed same person check - trust unless clearly false
    if (analysis.is_same_person === false) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Please ensure only your face is visible during registration.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Relaxed liveness check - accept if not explicitly false
    if (analysis.liveness_confirmed === false) {
      // Give one more chance - maybe just warn
      console.log('Liveness not confirmed but proceeding with registration');
    }

    // Create embedding data
    const comprehensiveEmbedding = {
      facial_signature: analysis.facial_signature,
      quality_score: analysis.quality_score || 70, // Default to decent score
      angle_results: analysis.angle_results,
      registered_at: new Date().toISOString(),
      registration_method: 'multi_angle_lenient_v4',
    };

    const embeddingJson = JSON.stringify(comprehensiveEmbedding);

    // Store the face embedding
    const { data: existingFace } = await supabase
      .from('face_embeddings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let dbError;
    if (existingFace) {
      const { error } = await supabase
        .from('face_embeddings')
        .update({ 
          embedding: embeddingJson,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      dbError = error;
    } else {
      const { error } = await supabase
        .from('face_embeddings')
        .insert({ 
          user_id: user.id,
          embedding: embeddingJson
        });
      dbError = error;
    }

    if (dbError) {
      console.error('Database error:', dbError.message);
      throw new Error('Failed to save face data');
    }

    console.log('Secure face registration successful for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Face registered successfully!',
      quality_score: analysis.quality_score || 70
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Secure registration error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Registration failed. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

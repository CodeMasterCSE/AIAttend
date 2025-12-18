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

// Analyze ALL face images in a SINGLE API call
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
          content: `You are an expert face verification system for attendance. Analyze the 5 face images provided (front, left, right, up, blink) in a SINGLE analysis.

TASKS:
1. Verify each image contains exactly ONE real human face
2. Confirm ALL 5 images show the SAME person
3. Perform anti-spoofing check (reject photos of photos, screens, printed images)
4. Verify the blink image shows natural eye movement (liveness check)
5. Generate a stable facial signature for future verification

VALIDATION RULES:
- Each face must be clearly visible, not blurred, not heavily obstructed
- Reject if images appear to be spoofed or from different people
- Check for consistent lighting and natural appearance across all angles

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "overall_status": "success | failure",
  "overall_reason": "brief explanation",
  "is_same_person": true | false,
  "liveness_confirmed": true | false,
  "quality_score": number (0-100),
  "facial_signature": "detailed textual descriptor of distinguishing features: face shape, eye spacing, nose structure, jawline, unique characteristics",
  "angle_results": {
    "front": { "valid": true|false, "reason": "..." },
    "left": { "valid": true|false, "reason": "..." },
    "right": { "valid": true|false, "reason": "..." },
    "up": { "valid": true|false, "reason": "..." },
    "blink": { "valid": true|false, "reason": "..." }
  }
}

IMPORTANT:
- Be LENIENT for legitimate real faces with minor quality issues
- Focus on confirming same person and liveness, not perfect image quality
- If faces are real and same person, return success even with minor issues`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze these 5 face images for registration. Images are in order: front, left, right, up, blink. Verify same person, liveness, and generate facial signature.'
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

    // Validate results
    if (analysis.overall_status === 'failure') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: analysis.overall_reason || 'Face verification failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!analysis.is_same_person) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'The captured images do not appear to be the same person. Please try again.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!analysis.liveness_confirmed) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Liveness check failed. Please ensure you blink naturally during capture.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create embedding data
    const comprehensiveEmbedding = {
      facial_signature: analysis.facial_signature,
      quality_score: analysis.quality_score,
      angle_results: analysis.angle_results,
      registered_at: new Date().toISOString(),
      registration_method: 'multi_angle_secure_v3',
    };

    const embeddingJson = JSON.stringify(comprehensiveEmbedding);

    // Store the face embedding (skip duplicate check to reduce API calls)
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
      message: 'Face registered securely with multi-angle verification',
      quality_score: analysis.quality_score
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Secure registration error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Registration failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

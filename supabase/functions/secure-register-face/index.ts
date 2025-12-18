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

interface FaceAnalysis {
  status: 'success' | 'failure';
  reason: string;
  face_count: number;
  liveness: 'live' | 'spoof' | 'uncertain';
  quality_score: number;
  facial_signature: string | null;
  angle_verified: boolean;
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

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function with retry logic for rate limits
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 2000
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      if (attempt < maxRetries - 1) {
        const waitTime = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await delay(waitTime);
        continue;
      }
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}

async function analyzeFaceImage(
  imageBase64: string, 
  expectedAngle: string,
  apiKey: string
): Promise<FaceAnalysis> {
  const { mimeType, data } = extractBase64(imageBase64);
  
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
          content: `You are an expert computer vision system specialized in human face analysis.
Your task is to STRICTLY analyze images for face recognition purposes.

IMPORTANT:
This system is used for an AI-based attendance platform.
Accuracy, consistency, and strict validation are REQUIRED.

TASKS (FOLLOW IN ORDER):
1. Analyze the provided image.
2. Detect whether the image contains:
   - Exactly ONE real human face
   - Zero faces
   - More than one face
3. If the image does NOT contain exactly one real human face,
   immediately return a failure response.

VALIDATION RULES:
- The face must be:
  - Clearly visible
  - Front-facing or slightly angled (±30°)
  - Not blurred
  - Not cropped
  - Not covered by mask, sunglasses, or heavy obstruction
- Reject images that appear to be:
  - Photos of photos
  - Screens
  - Videos
  - Printed images
  - AI-generated faces
- Reject images with:
  - Poor lighting
  - Extreme angles
  - Heavy shadows
  - Motion blur

ANTI-SPOOFING CHECK:
Determine if the face belongs to a LIVE PERSON.
If the image appears artificial, replayed, or static, reject it.

FACE CONSISTENCY OUTPUT:
If exactly one valid face is detected:
- Generate a stable and repeatable facial description
  using distinguishing facial attributes:
  - Face shape
  - Eye spacing
  - Nose structure
  - Jawline
  - Facial proportions
- This description MUST be consistent when the same person
  is analyzed multiple times.

ANGLE VERIFICATION:
The expected angle is: "${expectedAngle}"
Verify that the face matches the expected angle. Set angle_verified to true only if matched.

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "status": "success | failure",
  "reason": "clear short explanation",
  "face_count": number,
  "liveness": "live | spoof | uncertain",
  "quality_score": number (0-100),
  "facial_signature": "stable textual facial descriptor OR null",
  "angle_verified": true | false
}

IMPORTANT CONSTRAINTS:
- DO NOT guess.
- DO NOT assume identity.
- If uncertain, return failure.
- Be conservative rather than permissive.
- Consistency is more important than recall.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this face image. Expected angle: ${expectedAngle}. Perform thorough anti-spoofing checks.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${data}`
              }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from AI');
  }

  // Parse JSON response
  const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleanContent);
  
  return {
    status: parsed.status === 'success' ? 'success' : 'failure',
    reason: parsed.reason || 'Unknown',
    face_count: parsed.face_count ?? 0,
    liveness: parsed.liveness || 'uncertain',
    quality_score: parsed.quality_score ?? 0,
    facial_signature: parsed.facial_signature || null,
    angle_verified: parsed.angle_verified ?? false
  };
}

async function checkForDuplicates(
  supabase: any,
  userId: string,
  newEmbedding: string,
  apiKey: string
): Promise<{ isDuplicate: boolean; matchedUserId?: string }> {
  // Get all existing face embeddings
  const { data: existingEmbeddings, error } = await supabase
    .from('face_embeddings')
    .select('user_id, embedding')
    .neq('user_id', userId);

  if (error || !existingEmbeddings || existingEmbeddings.length === 0) {
    return { isDuplicate: false };
  }

  // Use AI to compare embeddings with retry logic
  try {
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
            content: `You are a face embedding comparison system. Compare the new facial signature data against existing face data to detect duplicates.

COMPARISON MODE:
- Compare the current facial signatures with the references
- Return a similarity confidence score (0–100)
- Consider it a match ONLY if similarity ≥ 85

Return JSON: { "is_duplicate": boolean, "highest_similarity": number (0-100), "matched_index": number or null }`
          },
          {
            role: 'user',
            content: `New face data:
${newEmbedding}

Existing face data (array):
${JSON.stringify(existingEmbeddings.map((e: any, i: number) => ({ index: i, embedding: e.embedding })))}`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.warn('Duplicate check failed, allowing registration');
      return { isDuplicate: false };
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      return { isDuplicate: false };
    }

    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanContent);
    
    if (result.is_duplicate && result.matched_index !== null && result.highest_similarity >= 85) {
      return { 
        isDuplicate: true, 
        matchedUserId: existingEmbeddings[result.matched_index]?.user_id 
      };
    }
  } catch (err) {
    console.warn('Duplicate check error, allowing registration:', err);
  }

  return { isDuplicate: false };
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

    // Analyze all captured angles
    const angleAnalysis: Record<string, FaceAnalysis> = {};
    const angles = [
      { key: 'front', expected: 'front facing' },
      { key: 'left', expected: 'turned slightly left' },
      { key: 'right', expected: 'turned slightly right' },
      { key: 'up', expected: 'looking up' },
      { key: 'blink', expected: 'front facing with natural expression' },
    ];

    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i];
      const imageData = captures[angle.key as keyof CaptureData];
      if (!imageData) continue;
      
      // Add delay between AI calls to avoid rate limiting (except for first call)
      if (i > 0) {
        await delay(1500);
      }
      
      console.log(`Analyzing ${angle.key} capture...`);
      angleAnalysis[angle.key] = await analyzeFaceImage(imageData, angle.expected, LOVABLE_API_KEY);
    }

    // Validate all captures
    const validationErrors: string[] = [];
    
    // Check face detection and liveness in all angles
    for (const [angle, analysis] of Object.entries(angleAnalysis)) {
      if (analysis.status === 'failure') {
        validationErrors.push(`${angle} capture failed: ${analysis.reason}`);
        continue;
      }
      if (analysis.face_count !== 1) {
        validationErrors.push(`${angle} capture: Expected 1 face, found ${analysis.face_count}`);
      }
      if (analysis.liveness === 'spoof') {
        validationErrors.push(`Anti-spoofing check failed for ${angle} capture: ${analysis.reason}`);
      }
      if (analysis.liveness === 'uncertain') {
        validationErrors.push(`Liveness uncertain for ${angle} capture. Please try again with better lighting.`);
      }
      if (analysis.quality_score < 60) {
        validationErrors.push(`Low quality in ${angle} capture (${analysis.quality_score}%). Please ensure good lighting and focus.`);
      }
      if (!analysis.angle_verified) {
        validationErrors.push(`${angle} capture: Face angle does not match expected position`);
      }
    }

    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: validationErrors[0],
        all_errors: validationErrors
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create comprehensive embedding from all angles using facial signatures
    const comprehensiveEmbedding = {
      facial_signatures: {
        front: angleAnalysis.front?.facial_signature,
        left: angleAnalysis.left?.facial_signature,
        right: angleAnalysis.right?.facial_signature,
        up: angleAnalysis.up?.facial_signature,
      },
      quality_scores: {
        front: angleAnalysis.front?.quality_score,
        left: angleAnalysis.left?.quality_score,
        right: angleAnalysis.right?.quality_score,
        up: angleAnalysis.up?.quality_score,
      },
      liveness_results: {
        front: angleAnalysis.front?.liveness,
        left: angleAnalysis.left?.liveness,
        right: angleAnalysis.right?.liveness,
        up: angleAnalysis.up?.liveness,
        blink: angleAnalysis.blink?.liveness,
      },
      registered_at: new Date().toISOString(),
      registration_method: 'multi_angle_secure_v2',
    };

    const embeddingJson = JSON.stringify(comprehensiveEmbedding);

    // Check for duplicate registrations
    console.log('Checking for duplicate registrations...');
    const duplicateCheck = await checkForDuplicates(supabase, user.id, embeddingJson, LOVABLE_API_KEY);
    
    if (duplicateCheck.isDuplicate) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'This face appears to be already registered with another account. Please contact support if you believe this is an error.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store the comprehensive face embedding
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

    const avgQuality = Math.round(
      ((angleAnalysis.front?.quality_score || 0) + 
       (angleAnalysis.left?.quality_score || 0) + 
       (angleAnalysis.right?.quality_score || 0) + 
       (angleAnalysis.up?.quality_score || 0)) / 4
    );

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Face registered securely with multi-angle verification',
      quality_score: avgQuality
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Image data is required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Use Lovable AI (Gemini) to extract face embedding description
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Extracting face features for user:', user.id);

    // Extract base64 data without the data URL prefix
    let base64Data = imageBase64;
    let mimeType = 'image/jpeg';
    
    if (imageBase64.startsWith('data:')) {
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    console.log('Image MIME type:', mimeType);
    console.log('Base64 data length:', base64Data.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a facial feature extraction system for an AI attendance platform.
Your task is to analyze a face image and extract distinctive facial characteristics for later comparison.

VALIDATION RULES:
1. Exactly ONE human face must be present
2. Face must be clearly visible (no heavy shadows, blur, or obstruction)
3. Face should be front-facing or near-front (slight angle acceptable)
4. Image quality must be sufficient for feature extraction

If validation fails, return face_detected: false with a reason.

FEATURE EXTRACTION:
Extract and describe the following characteristics with clear, consistent terminology:
- Face shape (oval, round, square, heart, oblong, diamond)
- Forehead (height: high/medium/low, width: wide/narrow, hairline pattern)
- Eyebrows (shape: arched/straight/curved, thickness: thick/medium/thin, spacing)
- Eyes (shape, size: large/medium/small, spacing: wide/normal/close, color if visible)
- Nose (length, width, bridge shape: straight/curved/bumped, tip shape)
- Mouth (lip fullness: full/medium/thin, width: wide/medium/narrow, shape)
- Chin/Jaw (chin shape: pointed/rounded/square, jawline: sharp/soft, prominence)
- Cheekbones (prominence: high/medium/low, position)
- Distinctive features (moles with location, dimples, scars, facial hair, glasses, birthmarks)
- Skin tone (light/medium/olive/tan/dark with undertones if visible)
- Hair (color, style, texture if visible)

IMPORTANT:
- Be descriptive but concise
- Focus on stable, distinguishing features
- Use consistent terminology for repeatability
- This data will be used for attendance verification comparisons

OUTPUT FORMAT (JSON ONLY):
{
  "face_detected": boolean,
  "reason": "explanation if face not detected",
  "face_position": "centered | left | right",
  "quality_score": number (0-100),
  "face_features": {
    "face_shape": "description",
    "forehead": "description",
    "eyebrows": "description",
    "eyes": "description",
    "nose": "description",
    "mouth": "description",
    "chin_jaw": "description",
    "cheekbones": "description",
    "distinctive_features": ["array", "of", "features"] or [],
    "skin_tone": "description",
    "hair": "description"
  }
}

Return ONLY valid JSON, no markdown or explanation.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract facial features from this image for attendance registration.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', content);

    // Parse the JSON response
    let faceData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      faceData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to analyze face features');
    }

    if (!faceData.face_detected) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No face detected in the image. Please ensure your face is clearly visible.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store the face embedding in the secure face_embeddings table
    // First check if user already has a face registered
    const { data: existingFace } = await supabase
      .from('face_embeddings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let dbError;
    if (existingFace) {
      // Update existing
      const { error } = await supabase
        .from('face_embeddings')
        .update({ 
          embedding: JSON.stringify(faceData),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      dbError = error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('face_embeddings')
        .insert({ 
          user_id: user.id,
          embedding: JSON.stringify(faceData)
        });
      dbError = error;
    }

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save face data');
    }

    console.log('Face registered successfully for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Face registered successfully',
      face_shape: faceData.face_features?.face_shape
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in register-face:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

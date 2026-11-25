export default {
 async fetch(request, env) {
  const allowedOrigin="https://mediaticoastur-rgb.github.io";
  const origin=request.headers.get("Origin");
  const cors={"Access-Control-Allow-Origin":allowedOrigin,"Vary":"Origin","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
  if(origin && origin!==allowedOrigin) return new Response("Forbidden",{status:403});
  if(request.method==="OPTIONS") return new Response(null,{headers:cors});
  const url=new URL(request.url);
  if(url.pathname!=="/coach" || request.method!=="POST") return new Response("GymStats Coach API",{headers:cors});
  if(!env.GEMINI_API_KEY) return Response.json({error:"Missing GEMINI_API_KEY"},{status:500,headers:cors});
  try {
   const body=await request.json();
   const prompt=`Eres un entrenador de fuerza prudente para una persona principiante. Objetivo: ${body.goal||"ganar músculo y perder grasa"}. Nivel: ${body.level||"principiante"}. Días semanales: ${body.days||3}. Historial reciente (datos del usuario): ${JSON.stringify(body.history||[])}. Rutina actual: ${JSON.stringify(body.currentRoutine||[])}. Petición: ${String(body.message||"").slice(0,2000)}. Responde en español, explica cambios y prioriza técnica, recuperación y ausencia de dolor. No diagnostiques ni recomiendes entrenar con dolor. Devuelve SOLO JSON con forma {"reply":"explicación clara","routine":[{"focus":"...","items":[{"name":"...","sets":3,"reps":"8-12"}]}]}. Si la petición no exige cambiar rutina, devuelve routine como []. Ajusta el número de sesiones al número de días indicado.`;
   const model="gemini-3.5-flash";
   const api=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:0.4}})});
   const raw=await api.json();
   if(!api.ok) return Response.json({error:"Gemini request failed",detail:raw.error?.message||"API error"},{status:502,headers:cors});
   const text=raw.candidates?.[0]?.content?.parts?.[0]?.text||"{}";
   let result;try{result=JSON.parse(text)}catch{result={reply:text,routine:[]}}
   return Response.json(result,{headers:cors});
  } catch(e){return Response.json({error:"Invalid request"},{status:400,headers:cors});}
 }
};

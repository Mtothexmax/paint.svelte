const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./BDNDa8-q.js","./DCVLe8nc.js","./BvE5W-fC.js","./kWiB1Mq2.js","./B3RHKNgJ.js","./DbLjdFZ7.js","./DMaPB_IG.js","./Cvp1BgVb.js","./CqSF0-wl.js","./YXvwHbsu.js","./DBHxoxt-.js","./CS_FLY5Z.js","./DD2J0f45.js","./fdhzcDlp.js"])))=>i.map(i=>d[i]);
import{ct as e,ut as t,vt as n}from"./BvE5W-fC.js";import"./DEaFL2nV.js";import{t as r}from"./HclGiUj8.js";import{A as i,C as a,J as o,O as s,S as c,T as l,V as u,Y as d,_ as f,at as p,b as m,d as h,et as g,f as _,i as v,it as y,l as b,m as x,n as S,o as C,r as w,rt as T,s as ee,t as te,tt as E,u as ne,v as re,x as D,z as ie}from"./DCVLe8nc.js";import{n as ae,t as O}from"./kWiB1Mq2.js";import{t as oe}from"./B3RHKNgJ.js";import{D as se,O as ce,S as le,d as ue,f as de,g as fe,h as pe,i as me,w as he,x as ge}from"./YXvwHbsu.js";import{n as k}from"./fdhzcDlp.js";import{d as _e,f as ve}from"./CS_FLY5Z.js";var ye=class{listeners=new Map;on(e,t){let n=this.listeners.get(e);return n||(n=new Set,this.listeners.set(e,n)),n.add(t),()=>this.off(e,t)}off(e,t){this.listeners.get(e)?.delete(t)}emit(e,t){let n=this.listeners.get(e);if(n)for(let e of[...n])e(t)}removeAll(){this.listeners.clear()}},A={opened:`opened`,closed:`closed`,active:`active`,changed:`changed`},j=new class{events=new ye;docs=new Map;order=[];activeDocId=null;get all(){return this.order.map(e=>this.docs.get(e)).filter(Boolean)}get count(){return this.order.length}get active(){return this.activeDocId?this.docs.get(this.activeDocId)??null:null}get activeId(){return this.activeDocId}getById(e){return this.docs.get(e)??null}open(e){this.docs.has(e.id)||(this.docs.set(e.id,e),this.order.push(e.id),this.events.emit(A.opened,e),this.setActive(e.id))}close(e){let t=this.docs.get(e);t&&(this.docs.delete(e),this.order=this.order.filter(t=>t!==e),this.events.emit(A.closed,{id:e,doc:t}),this.activeDocId===e&&this.setActive(this.order.length?this.order[this.order.length-1]:null))}notifyChange(e){this.events.emit(A.changed,e)}setActive(e){e!==null&&!this.docs.has(e)||(this.activeDocId=e,this.events.emit(A.active,{id:e}))}},be={extension:{type:y.Environment,name:`browser`,priority:-1},test:()=>!0,load:async()=>{await r(()=>import(`./BDNDa8-q.js`),__vite__mapDeps([0,1,2,3,4,5,6]),import.meta.url)}},xe={extension:{type:y.Environment,name:`webworker`,priority:0},test:()=>typeof self<`u`&&self.WorkerGlobalScope!==void 0,load:async()=>{await r(()=>import(`./Cvp1BgVb.js`),__vite__mapDeps([7,3,1,2,4,5,6]),import.meta.url)}},Se=`
in vec2 vTextureCoord;
in vec4 vColor;

out vec4 finalColor;

uniform float uBlend;

uniform sampler2D uTexture;
uniform sampler2D uBackTexture;

{FUNCTIONS}

void main()
{ 
    vec4 back = texture(uBackTexture, vTextureCoord);
    vec4 front = texture(uTexture, vTextureCoord);
    float blendedAlpha = front.a + back.a * (1.0 - front.a);
    
    {MAIN}
}
`,Ce=`in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 backgroundUv;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`,we=`
struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct BlendUniforms {
  uBlend:f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;
@group(0) @binding(3) var uBackTexture: texture_2d<f32>;

@group(1) @binding(0) var<uniform> blendUniforms : BlendUniforms;


struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
  };

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);  
}
  
@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition)
  );
}

{FUNCTIONS}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>
) -> @location(0) vec4<f32> {


   var back =  textureSample(uBackTexture, uSampler, uv);
   var front = textureSample(uTexture, uSampler, uv);
   var blendedAlpha = front.a + back.a * (1.0 - front.a);
   
   var out = vec4<f32>(0.0,0.0,0.0,0.0);

   {MAIN}

   return out;
}`,M=class extends v{constructor(e){let t=e.gpu,n=Te({source:we,...t}),r=_.from({vertex:{source:n,entryPoint:`mainVertex`},fragment:{source:n,entryPoint:`mainFragment`}}),i=e.gl,a=Te({source:Se,...i}),o=x.from({vertex:Ce,fragment:a}),s=new h({uBlend:{value:1,type:`f32`}});super({gpuProgram:r,glProgram:o,blendRequired:!0,resources:{blendUniforms:s,uBackTexture:u.EMPTY}})}};function Te(e){let{source:t,functions:n,main:r}=e;return t.replace(`{FUNCTIONS}`,n).replace(`{MAIN}`,r)}var Ee=`
	float getLuminosity(vec3 c) {
		return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
	}

	vec3 setLuminosity(vec3 c, float lum) {
		float modLum = lum - getLuminosity(c);
		vec3 color = c.rgb + vec3(modLum);

		// clip back into legal range
		modLum = getLuminosity(color);
		vec3 modLumVec = vec3(modLum);

		float cMin = min(color.r, min(color.g, color.b));
		float cMax = max(color.r, max(color.g, color.b));

		if(cMin < 0.0) {
			color = mix(modLumVec, color, modLum / (modLum - cMin));
		}

		if(cMax > 1.0) {
			color = mix(modLumVec, color, (1.0 - modLum) / (cMax - modLum));
		}

		return color;
	}

	float getSaturation(vec3 c) {
		return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
	}

	vec3 setSaturationMinMidMax(vec3 cSorted, float s) {
		vec3 colorSorted = cSorted;

		if(colorSorted.z > colorSorted.x) {
			colorSorted.y = (((colorSorted.y - colorSorted.x) * s) / (colorSorted.z - colorSorted.x));
			colorSorted.z = s;
		}
		else {
			colorSorted.y = 0.0;
			colorSorted.z = 0.0;
		}

		colorSorted.x = 0.0;

		return colorSorted;
	}

	vec3 setSaturation(vec3 c, float s) {
		vec3 color = c;

		if(color.r <= color.g && color.r <= color.b) {
			if(color.g <= color.b) {
				color = setSaturationMinMidMax(color.rgb, s).rgb;
			}
			else {
				color = setSaturationMinMidMax(color.rbg, s).rbg;
			}
		}
		else if(color.g <= color.r && color.g <= color.b) {
			if(color.r <= color.b) {
				color = setSaturationMinMidMax(color.grb, s).grb;
			}
			else {
				color = setSaturationMinMidMax(color.gbr, s).gbr;
			}
		}
		else {
			// Using bgr for both fixes part of hue
			if(color.r <= color.g) {
				color = setSaturationMinMidMax(color.brg, s).brg;
			}
			else {
				color = setSaturationMinMidMax(color.bgr, s).bgr;
			}
		}

		return color;
	}
    `,De=`
	fn getLuminosity(c: vec3<f32>) -> f32
	{
		return 0.3*c.r + 0.59*c.g + 0.11*c.b;
	}

	fn setLuminosity(c: vec3<f32>, lum: f32) -> vec3<f32>
	{
		var modLum: f32 = lum - getLuminosity(c);
		var color: vec3<f32> = c.rgb + modLum;

		// clip back into legal range
		modLum = getLuminosity(color);
		let modLumVec = vec3<f32>(modLum);

		let cMin: f32 = min(color.r, min(color.g, color.b));
		let cMax: f32 = max(color.r, max(color.g, color.b));

		if(cMin < 0.0)
		{
			color = mix(modLumVec, color, modLum / (modLum - cMin));
		}

		if(cMax > 1.0)
		{
			color = mix(modLumVec, color, (1 - modLum) / (cMax - modLum));
		}

		return color;
	}

	fn getSaturation(c: vec3<f32>) -> f32
	{
		return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
	}

	fn setSaturationMinMidMax(cSorted: vec3<f32>, s: f32) -> vec3<f32>
	{
		var colorSorted = cSorted;

		if(colorSorted.z > colorSorted.x)
		{
			colorSorted.y = (((colorSorted.y - colorSorted.x) * s) / (colorSorted.z - colorSorted.x));
			colorSorted.z = s;
		}
		else
		{
			colorSorted.y = 0;
			colorSorted.z = 0;
		}

		colorSorted.x = 0;

		return colorSorted;
	}

	fn setSaturation(c: vec3<f32>, s: f32) -> vec3<f32>
	{
		var color = c;

		if (color.r <= color.g && color.r <= color.b)
		{
			if (color.g <= color.b)
			{
				color = vec3<f32>(setSaturationMinMidMax(color.rgb, s)).rgb;
			}
			else
			{
				color = vec3<f32>(setSaturationMinMidMax(color.rbg, s)).rbg;
			}
		}
		else if (color.g <= color.r && color.g <= color.b)
		{
			if (color.r <= color.b)
			{
				color = vec3<f32>(setSaturationMinMidMax(color.grb, s)).grb;
			}
			else
			{
				color = vec3<f32>(setSaturationMinMidMax(color.gbr, s)).gbr;
			}
		}
		else
		{
			// Using bgr for both fixes part of hue
			if (color.r <= color.g)
			{
				color = vec3<f32>(setSaturationMinMidMax(color.brg, s)).brg;
			}
			else
			{
				color  = vec3<f32>(setSaturationMinMidMax(color.bgr, s)).bgr;
			}
		}

		return color;
	}
	`,Oe=class extends M{constructor(){super({gl:{functions:`
                ${Ee}

                vec3 blendColor(vec3 base, vec3 blend,  float opacity)
                {
                    return (setLuminosity(blend, getLuminosity(base)) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendColor(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                ${De}

                fn blendColorOpacity(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    return (setLuminosity(blend, getLuminosity(base)) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendColorOpacity(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};Oe.extension={name:`color`,type:y.BlendMode};var ke=class extends M{constructor(){super({gl:{functions:`
                float colorBurn(float base, float blend)
                {
                    return max((1.0 - ((1.0 - base) / blend)), 0.0);
                }

                vec3 blendColorBurn(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        colorBurn(base.r, blend.r),
                        colorBurn(base.g, blend.g),
                        colorBurn(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendColorBurn(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                fn colorBurn(base:f32, blend:f32) -> f32
                {
                    return max((1.0-((1.0-base)/blend)),0.0);
                }

                fn blendColorBurn(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        colorBurn(base.r, blend.r),
                        colorBurn(base.g, blend.g),
                        colorBurn(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendColorBurn(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};ke.extension={name:`color-burn`,type:y.BlendMode};var Ae=class extends M{constructor(){super({gl:{functions:`
                float colorDodge(float base, float blend)
                {
                    return base / (1.0 - blend);
                }

                vec3 blendColorDodge(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        colorDodge(base.r, blend.r),
                        colorDodge(base.g, blend.g),
                        colorDodge(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendColorDodge(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn colorDodge(base: f32, blend: f32) -> f32
                {
                    return base / (1.0 - blend);
                }

                fn blendColorDodge(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        colorDodge(base.r, blend.r),
                        colorDodge(base.g, blend.g),
                        colorDodge(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                    out = vec4<f32>(blendColorDodge(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};Ae.extension={name:`color-dodge`,type:y.BlendMode};var je=class extends M{constructor(){super({gl:{functions:`
                vec3 blendDarken(vec3 base, vec3 blend, float opacity)
                {
                    return (min(base, blend) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendDarken(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn blendDarken(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    return (min(blend,base) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendDarken(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};je.extension={name:`darken`,type:y.BlendMode};var Me=class extends M{constructor(){super({gl:{functions:`
                vec3 blendDifference(vec3 base, vec3 blend,  float opacity)
                {
                    return (abs(blend - base) * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendDifference(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                fn blendDifference(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    return (abs(blend - base) * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendDifference(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Me.extension={name:`difference`,type:y.BlendMode};var Ne=class extends M{constructor(){super({gl:{functions:`
                float divide(float base, float blend)
                {
                    return (blend > 0.0) ? clamp(base / blend, 0.0, 1.0) : 1.0;
                }

                vec3 blendDivide(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        divide(base.r, blend.r),
                        divide(base.g, blend.g),
                        divide(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendDivide(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn divide(base: f32, blend: f32) -> f32
                {
                    return select(1.0, clamp(base / blend, 0.0, 1.0), blend > 0.0);
                }

                fn blendDivide(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        divide(base.r, blend.r),
                        divide(base.g, blend.g),
                        divide(base.b, blend.b)
                    );
                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendDivide(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Ne.extension={name:`divide`,type:y.BlendMode};var Pe=class extends M{constructor(){super({gl:{functions:`
                vec3 exclusion(vec3 base, vec3 blend)
                {
                    return base + blend - 2.0 * base * blend;
                }

                vec3 blendExclusion(vec3 base, vec3 blend, float opacity)
                {
                    return (exclusion(base, blend) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendExclusion(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn exclusion(base: vec3<f32>, blend: vec3<f32>) -> vec3<f32>
                {
                    return base+blend-2.0*base*blend;
                }

                fn blendExclusion(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    return (exclusion(base, blend) * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendExclusion(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Pe.extension={name:`exclusion`,type:y.BlendMode};var Fe=class extends M{constructor(){super({gl:{functions:`
                float hardLight(float base, float blend)
                {
                    return (blend < 0.5) ? 2.0 * base * blend : 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
                }

                vec3 blendHardLight(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        hardLight(base.r, blend.r),
                        hardLight(base.g, blend.g),
                        hardLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendHardLight(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                fn hardLight(base: f32, blend: f32) -> f32
                {
                    return select(1.0 - 2.0 * (1.0 - base) * (1.0 - blend), 2.0 * base * blend, blend < 0.5);
                }

                fn blendHardLight(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        hardLight(base.r, blend.r),
                        hardLight(base.g, blend.g),
                        hardLight(base.b, blend.b)
                    );
                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendHardLight(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};Fe.extension={name:`hard-light`,type:y.BlendMode};var Ie=class extends M{constructor(){super({gl:{functions:`
                float hardMix(float base, float blend)
                {
                    return (base + blend >= 1.0) ? 1.0 : 0.0;
                }

                vec3 blendHardMix(vec3 base, vec3 blend,  float opacity)
                {
                    vec3 blended = vec3(
                        hardMix(base.r, blend.r),
                        hardMix(base.g, blend.g),
                        hardMix(base.b, blend.b)
                    );
                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendHardMix(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                fn hardMix(base: f32, blend: f32) -> f32
                {
                    return select(0.0, 1.0, base + blend >= 1.0);
                }

                fn blendHardMix(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended: vec3<f32> = vec3<f32>(
                        hardMix(base.r, blend.r),
                        hardMix(base.g, blend.g),
                        hardMix(base.b, blend.b)
                    );
                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendHardMix(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Ie.extension={name:`hard-mix`,type:y.BlendMode};var Le=class extends M{constructor(){super({gl:{functions:`
                vec3 blendLighten(vec3 base, vec3 blend, float opacity)
                {
                    return (max(base, blend) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendLighten(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn blendLighten(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    return (max(base, blend) * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendLighten(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Le.extension={name:`lighten`,type:y.BlendMode};var Re=class extends M{constructor(){super({gl:{functions:`
                float linearBurn(float base, float blend)
                {
                    return max(0.0, base + blend - 1.0);
                }

                vec3 blendLinearBurn(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        linearBurn(base.r, blend.r),
                        linearBurn(base.g, blend.g),
                        linearBurn(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendLinearBurn(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn linearBurn(base: f32, blend: f32) -> f32
                {
                    return max(0.0, base + blend - 1.0);
                }

                fn blendLinearBurn(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        linearBurn(base.r, blend.r),
                        linearBurn(base.g, blend.g),
                        linearBurn(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendLinearBurn(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};Re.extension={name:`linear-burn`,type:y.BlendMode};var ze=class extends M{constructor(){super({gl:{functions:`
                float linearDodge(float base, float blend) {
                    return min(1.0, base + blend);
                }

                vec3 blendLinearDodge(vec3 base, vec3 blend, float opacity) {
                    vec3 blended = vec3(
                        linearDodge(base.r, blend.r),
                        linearDodge(base.g, blend.g),
                        linearDodge(base.b, blend.b)
                    );
                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendLinearDodge(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn linearDodge(base: f32, blend: f32) -> f32
                {
                    return min(1, base + blend);
                }

                fn blendLinearDodge(base:vec3<f32>, blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        linearDodge(base.r, blend.r),
                        linearDodge(base.g, blend.g),
                        linearDodge(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendLinearDodge(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};ze.extension={name:`linear-dodge`,type:y.BlendMode};var Be=class extends M{constructor(){super({gl:{functions:`
                float linearBurn(float base, float blend) {
                    return max(0.0, base + blend - 1.0);
                }

                float linearDodge(float base, float blend) {
                    return min(1.0, base + blend);
                }

                float linearLight(float base, float blend) {
                    return (blend <= 0.5) ? linearBurn(base,2.0*blend) : linearBurn(base,2.0*(blend-0.5));
                }

                vec3 blendLinearLight(vec3 base, vec3 blend, float opacity) {
                    vec3 blended = vec3(
                        linearLight(base.r, blend.r),
                        linearLight(base.g, blend.g),
                        linearLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendLinearLight(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn linearBurn(base: f32, blend: f32) -> f32
                {
                    return max(0.0, base + blend - 1.0);
                }

                fn linearDodge(base: f32, blend: f32) -> f32
                {
                    return min(1.0, base + blend);
                }

                fn linearLight(base: f32, blend: f32) -> f32
                {
                    return select(linearBurn(base,2.0*(blend-0.5)), linearBurn(base,2.0*blend), blend <= 0.5);
                }

                fn blendLinearLightOpacity(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        linearLight(base.r, blend.r),
                        linearLight(base.g, blend.g),
                        linearLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendLinearLightOpacity(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Be.extension={name:`linear-light`,type:y.BlendMode};var Ve=class extends M{constructor(){super({gl:{functions:`
                ${Ee}

                vec3 blendLuminosity(vec3 base, vec3 blend,  float opacity)
                {
                    vec3 blendLuminosity = setLuminosity(base, getLuminosity(blend));
                    return (blendLuminosity * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendLuminosity(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                ${De}

                fn blendLuminosity(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blendLuminosity: vec3<f32> = setLuminosity(base, getLuminosity(blend));
                    return (blendLuminosity * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendLuminosity(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Ve.extension={name:`luminosity`,type:y.BlendMode};var He=class extends M{constructor(){super({gl:{functions:`
                vec3 negation(vec3 base, vec3 blend)
                {
                    return 1.0-abs(1.0-base-blend);
                }

                vec3 blendNegation(vec3 base, vec3 blend, float opacity)
                {
                    return (negation(base, blend) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendNegation(back.rgb, front.rgb, front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn blendNegation(base: vec3<f32>, blend: vec3<f32>) -> vec3<f32>
                {
                    return 1.0-abs(1.0-base-blend);
                }

                fn blendNegationOpacity(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    return (blendNegation(base, blend) * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendNegationOpacity(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};He.extension={name:`negation`,type:y.BlendMode};var Ue=class extends M{constructor(){super({gl:{functions:`
                float overlay(float base, float blend)
                {
                    return (base < 0.5) ? (2.0*base*blend) : (1.0-2.0*(1.0-base)*(1.0-blend));
                }

                vec3 blendOverlay(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        overlay(base.r, blend.r),
                        overlay(base.g, blend.g),
                        overlay(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendOverlay(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn overlay(base: f32, blend: f32) -> f32
                {
                    return select((1.0-2.0*(1.0-base)*(1.0-blend)), (2.0*base*blend), base < 0.5);
                }

                fn blendOverlay(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        overlay(base.r, blend.r),
                        overlay(base.g, blend.g),
                        overlay(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendOverlay(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};Ue.extension={name:`overlay`,type:y.BlendMode};var We=class extends M{constructor(){super({gl:{functions:`
                float pinLight(float base, float blend)
                {
                    return (blend <= 0.5) ? min(base, 2.0 * blend) : max(base, 2.0 * (blend - 0.5));
                }

                vec3 blendPinLight(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        pinLight(base.r, blend.r),
                        pinLight(base.g, blend.g),
                        pinLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendPinLight(back.rgb, front.rgb, front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn pinLight(base: f32, blend: f32) -> f32
                {
                    return select(max(base,2.0*(blend-0.5)), min(base,2.0*blend), blend <= 0.5);
                }

                fn blendPinLight(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        pinLight(base.r, blend.r),
                        pinLight(base.g, blend.g),
                        pinLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendPinLight(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};We.extension={name:`pin-light`,type:y.BlendMode};var Ge=class extends M{constructor(){super({gl:{functions:`
                ${Ee}

                vec3 blendSaturation(vec3 base, vec3 blend,  float opacity)
                {
                    vec3 blendSaturation = setLuminosity(setSaturation(base, getSaturation(blend)), getLuminosity(base));
                    return (blendSaturation * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendSaturation(back.rgb, front.rgb, front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                ${De}

                fn blendSaturation(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blendSaturation = setLuminosity(setSaturation(base, getSaturation(blend)), getLuminosity(base));
                    return (blendSaturation * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendSaturation(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Ge.extension={name:`saturation`,type:y.BlendMode};var Ke=class extends M{constructor(){super({gl:{functions:`
                float softLight(float base, float blend)
                {
                    return (blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend));
                }

                vec3 blendSoftLight(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        softLight(base.r, blend.r),
                        softLight(base.g, blend.g),
                        softLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendSoftLight(back.rgb, front.rgb, front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn softLight(base: f32, blend: f32) -> f32
                {
                    return select(2.0 * base * blend + base * base * (1.0 - 2.0 * blend), sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend), blend < 0.5);
                }

                fn blendSoftLight(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended: vec3<f32> = vec3<f32>(
                        softLight(base.r, blend.r),
                        softLight(base.g, blend.g),
                        softLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendSoftLight(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};Ke.extension={name:`soft-light`,type:y.BlendMode};var qe=class extends M{constructor(){super({gl:{functions:`
                float subtract(float base, float blend)
                {
                    return max(0.0, base - blend);
                }

                vec3 blendSubtract(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        subtract(base.r, blend.r),
                        subtract(base.g, blend.g),
                        subtract(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendSubtract(back.rgb, front.rgb, front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn subtract(base: f32, blend: f32) -> f32
                {
                    return max(0, base - blend);
                }

                fn blendSubtract(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        subtract(base.r, blend.r),
                        subtract(base.g, blend.g),
                        subtract(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendSubtract(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};qe.extension={name:`subtract`,type:y.BlendMode};var Je=class extends M{constructor(){super({gl:{functions:`
                float colorBurn(float base, float blend)
                {
                    return max((1.0-((1.0-base)/blend)),0.0);
                }

                float colorDodge(float base, float blend)
                {
                    return min(1.0, base / (1.0-blend));
                }

                float vividLight(float base, float blend)
                {
                    return (blend < 0.5) ? colorBurn(base,(2.0*blend)) : colorDodge(base,(2.0*(blend-0.5)));
                }

                vec3 blendVividLight(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        vividLight(base.r, blend.r),
                        vividLight(base.g, blend.g),
                        vividLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendVividLight(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                fn colorBurn(base:f32, blend:f32) -> f32
                {
                    return max((1.0-((1.0-base)/blend)),0.0);
                }

                fn colorDodge(base: f32, blend: f32) -> f32
                {
                    return min(1.0, base / (1.0-blend));
                }

                fn vividLight(base: f32, blend: f32) -> f32
                {
                    return select(colorDodge(base,(2.0*(blend-0.5))), colorBurn(base,(2.0*blend)), blend<0.5);
                }

                fn blendVividLight(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended: vec3<f32> = vec3<f32>(
                        vividLight(base.r, blend.r),
                        vividLight(base.g, blend.g),
                        vividLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendVividLight(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};Je.extension={name:`vivid-light`,type:y.BlendMode};var Ye;function Xe(e){return Ye===void 0&&(Ye=(()=>{let t={stencil:!0,failIfMajorPerformanceCaveat:e??ce.defaultOptions.failIfMajorPerformanceCaveat};try{if(!m.get().getWebGLRenderingContext())return!1;let e=m.get().createCanvas().getContext(`webgl`,t),n=!!e?.getContextAttributes()?.stencil;if(e){let t=e.getExtension(`WEBGL_lose_context`);t&&t.loseContext()}return e=null,n}catch{return!1}})()),Ye}var Ze;async function Qe(e={}){return Ze===void 0&&(Ze=await(async()=>{let t=m.get().getNavigator().gpu;if(!t)return!1;try{return await(await t.requestAdapter(e)).requestDevice(),!0}catch{return!1}})()),Ze}var $e=[`webgl`,`webgpu`,`canvas`];async function et(e){let t=[];e.preference?Array.isArray(e.preference)?t=e.preference.slice():(t.push(e.preference),$e.forEach(n=>{n!==e.preference&&t.push(n)})):t=$e.slice();let n,i={};for(let a=0;a<t.length;a++){let o=t[a];if(o===`webgpu`&&await Qe()){let{WebGPURenderer:t}=await r(async()=>{let{WebGPURenderer:e}=await import(`./CqSF0-wl.js`).then(e=>e.t);return{WebGPURenderer:e}},__vite__mapDeps([8,2,1,9,10,6,11]),import.meta.url);n=t,i={...e,...e.webgpu};break}if(o===`webgl`&&Xe(e.failIfMajorPerformanceCaveat??ce.defaultOptions.failIfMajorPerformanceCaveat)){let{WebGLRenderer:t}=await r(async()=>{let{WebGLRenderer:e}=await import(`./DD2J0f45.js`).then(e=>e.t);return{WebGLRenderer:e}},__vite__mapDeps([12,2,1,9,11]),import.meta.url);n=t,i={...e,...e.webgl};break}if(o===`canvas`){let{CanvasRenderer:t}=await r(async()=>{let{CanvasRenderer:e}=await import(`./fdhzcDlp.js`).then(e=>e.t);return{CanvasRenderer:e}},__vite__mapDeps([13,2,1,4,9,10]),import.meta.url);n=t,i={...e,...e.canvasOptions};break}}if(delete i.webgpu,delete i.webgl,delete i.canvasOptions,!n)throw Error(`No available renderer for the current environment`);let a=new n;return await a.init(i),a}var tt=class{static init(e){Object.defineProperty(this,"resizeTo",{configurable:!0,set(e){globalThis.removeEventListener(`resize`,this.queueResize),this._resizeTo=e,e&&(globalThis.addEventListener(`resize`,this.queueResize),this.resize())},get(){return this._resizeTo}}),this.queueResize=()=>{this._resizeTo&&(this._cancelResize(),this._resizeId=requestAnimationFrame(()=>this.resize()))},this._cancelResize=()=>{this._resizeId&&=(cancelAnimationFrame(this._resizeId),null)},this.resize=()=>{if(!this._resizeTo)return;this._cancelResize();let e,t;if(this._resizeTo===globalThis.window)e=globalThis.innerWidth,t=globalThis.innerHeight;else{let{clientWidth:n,clientHeight:r}=this._resizeTo;e=n,t=r}this.renderer.resize(e,t),this.render()},this._resizeId=null,this._resizeTo=null,this.resizeTo=e.resizeTo||null}static destroy(){globalThis.removeEventListener(`resize`,this.queueResize),this._cancelResize(),this._cancelResize=null,this.queueResize=null,this.resizeTo=null,this.resize=null}};tt.extension=y.Application;var nt=class{static init(e){e=Object.assign({autoStart:!0,sharedTicker:!1},e),Object.defineProperty(this,"ticker",{configurable:!0,set(e){this._ticker&&this._ticker.remove(this.render,this),this._ticker=e,e&&e.add(this.render,this,re.LOW)},get(){return this._ticker}}),this.stop=()=>{this._ticker.stop()},this.start=()=>{this._ticker.start()},this._ticker=null,this.ticker=e.sharedTicker?f.shared:new f,e.autoStart&&this.start()}static destroy(){if(this._ticker){let e=this._ticker;this.ticker=null,e.destroy()}}};nt.extension=y.Application,p.add(tt),p.add(nt);var rt=class e{constructor(...e){this.stage=new a,e[0]!==void 0&&o(d,`Application constructor options are deprecated, please use Application.init() instead.`)}async init(t){t={...t},this.stage||=new a,this.renderer=await et(t),e._plugins.forEach(e=>{e.init.call(this,t)})}render(){this.renderer.render({container:this.stage})}get canvas(){return this.renderer.canvas}get view(){return o(d,`Application.view is deprecated, please use Application.canvas instead.`),this.renderer.canvas}get screen(){return this.renderer.screen}get domContainerRoot(){return this.renderer.renderPipes.dom?._domElement}destroy(t=!1,n=!1){let r=e._plugins.slice(0);r.reverse(),r.forEach(e=>{e.destroy.call(this)}),this.stage.destroy(n),this.stage=null,this.renderer.destroy(t),this.renderer=null}};rt._plugins=[];var it=rt;p.handleByList(y.Application,it._plugins),p.add(se);function at(e,t,n,r,i,a,o,s){let c=o-n,l=s-r,u=i-n,d=a-r,f=e-n,p=t-r,m=c*c+l*l,h=c*u+l*d,g=c*f+l*p,_=u*u+d*d,v=u*f+d*p,y=1/(m*_-h*h),b=(_*g-h*v)*y,x=(m*v-h*g)*y;return b>=0&&x>=0&&b+x<1}var ot={5:[.153388,.221461,.250301],7:[.071303,.131514,.189879,.214607],9:[.028532,.067234,.124009,.179044,.20236],11:[.0093,.028002,.065984,.121703,.175713,.198596],13:[.002406,.009255,.027867,.065666,.121117,.174868,.197641],15:[489e-6,.002403,.009246,.02784,.065602,.120999,.174697,.197448]},st=[`in vec2 vBlurTexCoords[%size%];`,`uniform sampler2D uTexture;`,`out vec4 finalColor;`,`void main(void)`,`{`,`    %blur%`,`}`].join(`
`);function ct(e){let t=ot[e],n=t.length,r=``;for(let i=0;i<e;i++){let a=i===0?`finalColor = `:`    + `,o=i<n?i:e-i-1,s=`texture(uTexture, vBlurTexCoords[%index%]) * %value%`.replace(`%index%`,i.toString()).replace(`%value%`,t[o].toString());r+=`${a}${s}
`}return st.replace(`%blur%`,`${r};`).replace(`%size%`,e.toString())}var lt=`
    in vec2 aPosition;

    uniform float uStrength;

    out vec2 vBlurTexCoords[%size%];

    uniform vec4 uInputSize;
    uniform vec4 uOutputFrame;
    uniform vec4 uOutputTexture;

    vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

    vec2 filterTextureCoord( void )
    {
        return aPosition * (uOutputFrame.zw * uInputSize.zw);
    }

    void main(void)
    {
        gl_Position = filterVertexPosition();

        float pixelStrength = uInputSize.%dimension% * uStrength;

        vec2 textureCoord = filterTextureCoord();
        %blur%
    }`;function ut(e,t){let n=Math.ceil(e/2),r=lt,i=``,a;a=t?`vBlurTexCoords[%index%] =  textureCoord + vec2(%sampleIndex% * pixelStrength, 0.0);`:`vBlurTexCoords[%index%] =  textureCoord + vec2(0.0, %sampleIndex% * pixelStrength);`;for(let t=0;t<e;t++){let e=a.replace(`%index%`,t.toString());e=e.replace(`%sampleIndex%`,`${t-(n-1)}.0`),i+=e,i+=`
`}return r=r.replace(`%blur%`,i),r=r.replace(`%size%`,e.toString()),r=r.replace(`%dimension%`,t?`z`:`w`),r}function dt(e,t){let n=ut(t,e),r=ct(t);return x.from({vertex:n,fragment:r,name:`blur-${e?`horizontal`:`vertical`}-pass-filter`})}var ft=`

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct BlurUniforms {
  uStrength:f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;

@group(1) @binding(0) var<uniform> blurUniforms : BlurUniforms;


struct VSOutput {
    @builtin(position) position: vec4<f32>,
    %blur-struct%
  };

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);
}

fn getSize() -> vec2<f32>
{
  return gfu.uGlobalFrame.zw;
}


@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>,
) -> VSOutput {

  let filteredCord = filterTextureCoord(aPosition);

  let pixelStrength = gfu.uInputSize.%dimension% * blurUniforms.uStrength;

  return VSOutput(
   filterVertexPosition(aPosition),
    %blur-vertex-out%
  );
}

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  %blur-fragment-in%
) -> @location(0) vec4<f32> {

    var   finalColor = vec4(0.0);

    %blur-sampling%

    return finalColor;
}
`;function pt(e,t){let n=ot[t],r=n.length,i=[],a=[],o=[];for(let s=0;s<t;s++){i[s]=`@location(${s}) offset${s}: vec2<f32>,`,e?a[s]=`filteredCord + vec2(${s-r+1} * pixelStrength, 0.0),`:a[s]=`filteredCord + vec2(0.0, ${s-r+1} * pixelStrength),`;let c=n[s<r?s:t-s-1].toString();o[s]=`finalColor += textureSample(uTexture, uSampler, offset${s}) * ${c};`}let s=i.join(`
`),c=a.join(`
`),l=o.join(`
`),u=ft.replace(`%blur-struct%`,s).replace(`%blur-vertex-out%`,c).replace(`%blur-fragment-in%`,s).replace(`%blur-sampling%`,l).replace(`%dimension%`,e?`z`:`w`);return _.from({vertex:{source:u,entryPoint:`mainVertex`},fragment:{source:u,entryPoint:`mainFragment`}})}var mt=class e extends v{constructor(t){t={...e.defaultOptions,...t};let n=dt(t.horizontal,t.kernelSize),r=pt(t.horizontal,t.kernelSize);super({glProgram:n,gpuProgram:r,resources:{blurUniforms:{uStrength:{value:0,type:`f32`}}},...t}),this.horizontal=t.horizontal,this.legacy=t.legacy??!1,this._quality=0,this.quality=t.quality,this.blur=t.strength,this._blurUniforms=this.resources.blurUniforms,this._uniforms=this._blurUniforms.uniforms}apply(e,t,n,r){this.legacy?this._applyLegacy(e,t,n,r):this._applyOptimized(e,t,n,r)}_applyLegacy(e,t,n,r){if(this._uniforms.uStrength=this.strength/this.passes,this.passes===1)e.applyFilter(this,t,n,r);else{let i=l.getSameSizeTexture(t),a=t,o=i;this._state.blend=!1;let s=e.renderer.type===b.WEBGPU;for(let t=0;t<this.passes-1;t++){e.applyFilter(this,a,o,t===0||s);let n=o;o=a,a=n}this._state.blend=!0,e.applyFilter(this,a,n,r),l.returnTexture(i)}}_applyOptimized(e,t,n,r){if(this._uniforms.uStrength=this._calculateInitialStrength(),this.passes===1)e.applyFilter(this,t,n,r);else{let i=l.getSameSizeTexture(t),a=t,o=i;this._state.blend=!1;let s=e.renderer,c=s.type===b.WEBGPU,u=c?s.renderPipes.uniformBatch:null;for(let t=0;t<this.passes-1;t++){u&&this.groups[1].setResource(u.getUboResource(this._blurUniforms),0),e.applyFilter(this,a,o,c);let t=o;o=a,a=t,this._uniforms.uStrength*=.5}u&&this.groups[1].setResource(u.getUboResource(this._blurUniforms),0),this._state.blend=!0,e.applyFilter(this,a,n,r),l.returnTexture(i)}}_calculateInitialStrength(){let e=1,t=.5;for(let n=1;n<this.passes;n++)e+=t*t,t*=.5;return this.strength/Math.sqrt(e)}get blur(){return this.strength}set blur(e){this.padding=1+Math.abs(e)*2,this.strength=e}get quality(){return this._quality}set quality(e){this._quality=e,this.passes=e}};mt.defaultOptions={strength:8,quality:4,kernelSize:5,legacy:!1};var ht=mt,gt=class extends v{constructor(...e){let t=e[0]??{};typeof t==`number`&&(o(d,`BlurFilter constructor params are now options object. See params: { strength, quality, resolution, kernelSize }`),t={strength:t},e[1]!==void 0&&(t.quality=e[1]),e[2]!==void 0&&(t.resolution=e[2]||`inherit`),e[3]!==void 0&&(t.kernelSize=e[3])),t={...ht.defaultOptions,...t};let{strength:n,strengthX:r,strengthY:i,quality:a,...s}=t;super({...s,compatibleRenderers:b.BOTH,resources:{}}),this._repeatEdgePixels=!1,this.blurXFilter=new ht({horizontal:!0,...t}),this.blurYFilter=new ht({horizontal:!1,...t}),this.quality=a,this.strengthX=r??n,this.strengthY=i??n,this.repeatEdgePixels=!1}apply(e,t,n,r){let i=Math.abs(this.blurXFilter.strength),a=Math.abs(this.blurYFilter.strength);if(i&&a){let i=l.getSameSizeTexture(t);this.blurXFilter.blendMode=`normal`,this.blurXFilter.apply(e,t,i,!0),this.blurYFilter.blendMode=this.blendMode,this.blurYFilter.apply(e,i,n,r),l.returnTexture(i)}else a?(this.blurYFilter.blendMode=this.blendMode,this.blurYFilter.apply(e,t,n,r)):(this.blurXFilter.blendMode=this.blendMode,this.blurXFilter.apply(e,t,n,r))}updatePadding(){this.padding=this._repeatEdgePixels?0:Math.max(Math.abs(this.blurXFilter.blur),Math.abs(this.blurYFilter.blur))*2}get strength(){if(this.strengthX!==this.strengthY)throw Error(`BlurFilter's strengthX and strengthY are different`);return this.strengthX}set strength(e){this.blurXFilter.blur=this.blurYFilter.blur=e,this.updatePadding()}get quality(){return this.blurXFilter.quality}set quality(e){this.blurXFilter.quality=this.blurYFilter.quality=e}get strengthX(){return this.blurXFilter.blur}set strengthX(e){this.blurXFilter.blur=e,this.updatePadding()}get strengthY(){return this.blurYFilter.blur}set strengthY(e){this.blurYFilter.blur=e,this.updatePadding()}get blur(){return o(`8.3.0`,`BlurFilter.blur is deprecated, please use BlurFilter.strength instead.`),this.strength}set blur(e){o(`8.3.0`,`BlurFilter.blur is deprecated, please use BlurFilter.strength instead.`),this.strength=e}get blurX(){return o(`8.3.0`,`BlurFilter.blurX is deprecated, please use BlurFilter.strengthX instead.`),this.strengthX}set blurX(e){o(`8.3.0`,`BlurFilter.blurX is deprecated, please use BlurFilter.strengthX instead.`),this.strengthX=e}get blurY(){return o(`8.3.0`,`BlurFilter.blurY is deprecated, please use BlurFilter.strengthY instead.`),this.strengthY}set blurY(e){o(`8.3.0`,`BlurFilter.blurY is deprecated, please use BlurFilter.strengthY instead.`),this.strengthY=e}get repeatEdgePixels(){return this._repeatEdgePixels}set repeatEdgePixels(e){this._repeatEdgePixels=e,this.updatePadding()}};gt.defaultOptions={strength:8,quality:4,kernelSize:5,legacy:!1};var _t=`
in vec2 vTextureCoord;
in vec4 vColor;

out vec4 finalColor;

uniform float uColorMatrix[20];
uniform float uAlpha;

uniform sampler2D uTexture;

float rand(vec2 co)
{
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main()
{
    vec4 color = texture(uTexture, vTextureCoord);
    float randomValue = rand(gl_FragCoord.xy * 0.2);
    float diff = (randomValue - 0.5) *  0.5;

    if (uAlpha == 0.0) {
        finalColor = color;
        return;
    }

    if (color.a > 0.0) {
        color.rgb /= color.a;
    }

    vec4 result;

    result.r = (uColorMatrix[0] * color.r);
        result.r += (uColorMatrix[1] * color.g);
        result.r += (uColorMatrix[2] * color.b);
        result.r += (uColorMatrix[3] * color.a);
        result.r += uColorMatrix[4];

    result.g = (uColorMatrix[5] * color.r);
        result.g += (uColorMatrix[6] * color.g);
        result.g += (uColorMatrix[7] * color.b);
        result.g += (uColorMatrix[8] * color.a);
        result.g += uColorMatrix[9];

    result.b = (uColorMatrix[10] * color.r);
       result.b += (uColorMatrix[11] * color.g);
       result.b += (uColorMatrix[12] * color.b);
       result.b += (uColorMatrix[13] * color.a);
       result.b += uColorMatrix[14];

    result.a = (uColorMatrix[15] * color.r);
       result.a += (uColorMatrix[16] * color.g);
       result.a += (uColorMatrix[17] * color.b);
       result.a += (uColorMatrix[18] * color.a);
       result.a += uColorMatrix[19];

    vec3 rgb = mix(color.rgb, result.rgb, uAlpha);

    // Premultiply alpha again.
    rgb *= result.a;

    finalColor = vec4(rgb, result.a);
}
`,vt=`struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct ColorMatrixUniforms {
  uColorMatrix:array<vec4<f32>, 5>,
  uAlpha:f32,
};


@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;
@group(1) @binding(0) var<uniform> colorMatrixUniforms : ColorMatrixUniforms;


struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>,
  };
  
fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition),
  );
}


@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
) -> @location(0) vec4<f32> {


  var c = textureSample(uTexture, uSampler, uv);
  
  if (colorMatrixUniforms.uAlpha == 0.0) {
    return c;
  }

 
    // Un-premultiply alpha before applying the color matrix. See issue #3539.
    if (c.a > 0.0) {
      c.r /= c.a;
      c.g /= c.a;
      c.b /= c.a;
    }

    var cm = colorMatrixUniforms.uColorMatrix;


    var result = vec4<f32>(0.);

    result.r = (cm[0][0] * c.r);
    result.r += (cm[0][1] * c.g);
    result.r += (cm[0][2] * c.b);
    result.r += (cm[0][3] * c.a);
    result.r += cm[1][0];

    result.g = (cm[1][1] * c.r);
    result.g += (cm[1][2] * c.g);
    result.g += (cm[1][3] * c.b);
    result.g += (cm[2][0] * c.a);
    result.g += cm[2][1];

    result.b = (cm[2][2] * c.r);
    result.b += (cm[2][3] * c.g);
    result.b += (cm[3][0] * c.b);
    result.b += (cm[3][1] * c.a);
    result.b += cm[3][2];

    result.a = (cm[3][3] * c.r);
    result.a += (cm[4][0] * c.g);
    result.a += (cm[4][1] * c.b);
    result.a += (cm[4][2] * c.a);
    result.a += cm[4][3];

    var rgb = mix(c.rgb, result.rgb, colorMatrixUniforms.uAlpha);

    rgb.r *= result.a;
    rgb.g *= result.a;
    rgb.b *= result.a;

    return vec4(rgb, result.a);
}`,N=class extends v{constructor(e={}){let t=new h({uColorMatrix:{value:[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],type:`f32`,size:20},uAlpha:{value:1,type:`f32`}}),n=_.from({vertex:{source:vt,entryPoint:`mainVertex`},fragment:{source:vt,entryPoint:`mainFragment`}}),r=x.from({vertex:O,fragment:_t,name:`color-matrix-filter`});super({...e,gpuProgram:n,glProgram:r,resources:{colorMatrixUniforms:t}}),this.alpha=1}_loadMatrix(e,t=!1){if(t){let t=[...e];this._multiply(t,this.matrix,e),this.resources.colorMatrixUniforms.uniforms.uColorMatrix=t}else this.resources.colorMatrixUniforms.uniforms.uColorMatrix=e;this.resources.colorMatrixUniforms.update()}_multiply(e,t,n){return e[0]=t[0]*n[0]+t[1]*n[5]+t[2]*n[10]+t[3]*n[15],e[1]=t[0]*n[1]+t[1]*n[6]+t[2]*n[11]+t[3]*n[16],e[2]=t[0]*n[2]+t[1]*n[7]+t[2]*n[12]+t[3]*n[17],e[3]=t[0]*n[3]+t[1]*n[8]+t[2]*n[13]+t[3]*n[18],e[4]=t[0]*n[4]+t[1]*n[9]+t[2]*n[14]+t[3]*n[19]+t[4],e[5]=t[5]*n[0]+t[6]*n[5]+t[7]*n[10]+t[8]*n[15],e[6]=t[5]*n[1]+t[6]*n[6]+t[7]*n[11]+t[8]*n[16],e[7]=t[5]*n[2]+t[6]*n[7]+t[7]*n[12]+t[8]*n[17],e[8]=t[5]*n[3]+t[6]*n[8]+t[7]*n[13]+t[8]*n[18],e[9]=t[5]*n[4]+t[6]*n[9]+t[7]*n[14]+t[8]*n[19]+t[9],e[10]=t[10]*n[0]+t[11]*n[5]+t[12]*n[10]+t[13]*n[15],e[11]=t[10]*n[1]+t[11]*n[6]+t[12]*n[11]+t[13]*n[16],e[12]=t[10]*n[2]+t[11]*n[7]+t[12]*n[12]+t[13]*n[17],e[13]=t[10]*n[3]+t[11]*n[8]+t[12]*n[13]+t[13]*n[18],e[14]=t[10]*n[4]+t[11]*n[9]+t[12]*n[14]+t[13]*n[19]+t[14],e[15]=t[15]*n[0]+t[16]*n[5]+t[17]*n[10]+t[18]*n[15],e[16]=t[15]*n[1]+t[16]*n[6]+t[17]*n[11]+t[18]*n[16],e[17]=t[15]*n[2]+t[16]*n[7]+t[17]*n[12]+t[18]*n[17],e[18]=t[15]*n[3]+t[16]*n[8]+t[17]*n[13]+t[18]*n[18],e[19]=t[15]*n[4]+t[16]*n[9]+t[17]*n[14]+t[18]*n[19]+t[19],e}brightness(e,t){let n=[e,0,0,0,0,0,e,0,0,0,0,0,e,0,0,0,0,0,1,0];this._loadMatrix(n,t)}tint(e,t){let[n,r,i]=ie.shared.setValue(e).toArray(),a=[n,0,0,0,0,0,r,0,0,0,0,0,i,0,0,0,0,0,1,0];this._loadMatrix(a,t)}greyscale(e,t){let n=[e,e,e,0,0,e,e,e,0,0,e,e,e,0,0,0,0,0,1,0];this._loadMatrix(n,t)}grayscale(e,t){this.greyscale(e,t)}blackAndWhite(e){this._loadMatrix([.3,.6,.1,0,0,.3,.6,.1,0,0,.3,.6,.1,0,0,0,0,0,1,0],e)}hue(e,t){e=(e||0)/180*Math.PI;let n=Math.cos(e),r=Math.sin(e),i=Math.sqrt,a=1/3,o=i(a),s=[n+(1-n)*a,a*(1-n)-o*r,a*(1-n)+o*r,0,0,a*(1-n)+o*r,n+a*(1-n),a*(1-n)-o*r,0,0,a*(1-n)-o*r,a*(1-n)+o*r,n+a*(1-n),0,0,0,0,0,1,0];this._loadMatrix(s,t)}contrast(e,t){let n=(e||0)+1,r=-.5*(n-1),i=[n,0,0,0,r,0,n,0,0,r,0,0,n,0,r,0,0,0,1,0];this._loadMatrix(i,t)}saturate(e=0,t){let n=e*2/3+1,r=(n-1)*-.5,i=[n,r,r,0,0,r,n,r,0,0,r,r,n,0,0,0,0,0,1,0];this._loadMatrix(i,t)}desaturate(){this.saturate(-1)}negative(e){this._loadMatrix([-1,0,0,1,0,0,-1,0,1,0,0,0,-1,1,0,0,0,0,1,0],e)}sepia(e){this._loadMatrix([.393,.7689999,.18899999,0,0,.349,.6859999,.16799999,0,0,.272,.5339999,.13099999,0,0,0,0,0,1,0],e)}technicolor(e){this._loadMatrix([1.9125277891456083,-.8545344976951645,-.09155508482755585,0,.046249425232852304,-.3087833385928097,1.7658908555458428,-.10601743074722245,0,-.2758903984886823,-.231103377548616,-.7501899197440212,1.847597816108189,0,.12137623870388682,0,0,0,1,0],e)}polaroid(e){this._loadMatrix([1.438,-.062,-.062,0,0,-.122,1.378,-.122,0,0,-.016,-.016,1.483,0,0,0,0,0,1,0],e)}toBGR(e){this._loadMatrix([0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0],e)}kodachrome(e){this._loadMatrix([1.1285582396593525,-.3967382283601348,-.03992559172921793,0,.24991995145868634,-.16404339962244616,1.0835251566291304,-.05498805115633132,0,.09698983488904393,-.16786010706155763,-.5603416277695248,1.6014850761964943,0,.13972481597886063,0,0,0,1,0],e)}browni(e){this._loadMatrix([.5997023498159715,.34553243048391263,-.2708298674538042,0,.1860075629647401,-.037703249837783157,.8609577587992641,.15059552388459913,0,-.14497417640467167,.24113635128153335,-.07441037908422492,.44972182064877153,0,-.029655197167024642,0,0,0,1,0],e)}vintage(e){this._loadMatrix([.6279345635605994,.3202183420819367,-.03965408211312453,0,.037848179746251466,.02578397704808868,.6441188644374771,.03259127616149294,0,.029265996770472907,.0466055556782719,-.0851232987247891,.5241648018700465,0,.020232119953863904,0,0,0,1,0],e)}colorTone(e,t,n,r,i){e||=.2,t||=.15,n||=16770432,r||=3375104;let a=ie.shared,[o,s,c]=a.setValue(n).toArray(),[l,u,d]=a.setValue(r).toArray(),f=[.3,.59,.11,0,0,o,s,c,e,0,l,u,d,t,0,o-l,s-u,c-d,0,0];this._loadMatrix(f,i)}night(e,t){e||=.1;let n=[e*-2,-e,0,0,0,-e,0,e,0,0,0,e,e*2,0,0,0,0,0,1,0];this._loadMatrix(n,t)}predator(e,t){let n=[11.224130630493164*e,-4.794486999511719*e,-2.8746118545532227*e,0*e,.40342438220977783*e,-3.6330697536468506*e,9.193157196044922*e,-2.951810836791992*e,0*e,-1.316135048866272*e,-3.2184197902679443*e,-4.2375030517578125*e,7.476448059082031*e,0*e,.8044459223747253*e,0,0,0,1,0];this._loadMatrix(n,t)}lsd(e){this._loadMatrix([2,-.4,.5,0,0,-.5,2,-.4,0,0,-.4,-.5,3,0,0,0,0,0,1,0],e)}reset(){this._loadMatrix([1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],!1)}get matrix(){return this.resources.colorMatrixUniforms.uniforms.uColorMatrix}set matrix(e){this.resources.colorMatrixUniforms.uniforms.uColorMatrix=e}get alpha(){return this.resources.colorMatrixUniforms.uniforms.uAlpha}set alpha(e){this.resources.colorMatrixUniforms.uniforms.uAlpha=e}},yt=class e extends te{constructor(...t){let n=t[0]??{};n instanceof Float32Array&&(o(d,`use new MeshGeometry({ positions, uvs, indices }) instead`),n={positions:n,uvs:t[1],indices:t[2]}),n={...e.defaultOptions,...n};let r=n.positions||new Float32Array([0,0,1,0,1,1,0,1]),i=n.uvs;i||=n.positions?new Float32Array(r.length):new Float32Array([0,0,1,0,1,1,0,1]);let a=n.indices||new Uint32Array([0,1,2,0,2,3]),s=n.shrinkBuffersToFit,c=new S({data:r,label:`attribute-mesh-positions`,shrinkToFit:s,usage:w.VERTEX|w.COPY_DST}),l=new S({data:i,label:`attribute-mesh-uvs`,shrinkToFit:s,usage:w.VERTEX|w.COPY_DST}),u=new S({data:a,label:`index-mesh-buffer`,shrinkToFit:s,usage:w.INDEX|w.COPY_DST});super({attributes:{aPosition:{buffer:c,format:`float32x2`,stride:8,offset:0},aUV:{buffer:l,format:`float32x2`,stride:8,offset:0}},indexBuffer:u,topology:n.topology}),this.batchMode=`auto`}get positions(){return this.attributes.aPosition.buffer.data}set positions(e){this.attributes.aPosition.buffer.data=e}get uvs(){return this.attributes.aUV.buffer.data}set uvs(e){this.attributes.aUV.buffer.data=e}get indices(){return this.indexBuffer.data}set indices(e){this.indexBuffer.data=e}};yt.defaultOptions={topology:`triangle-list`,shrinkBuffersToFit:!1};var P=yt,bt=class{constructor(){this.batcherName=`default`,this.packAsQuad=!1,this.indexOffset=0,this.attributeOffset=0,this.roundPixels=0,this._batcher=null,this._batch=null,this._textureMatrixUpdateId=-1,this._uvUpdateId=-1}get blendMode(){return this.renderable.groupBlendMode}get topology(){return this._topology||this.geometry.topology}set topology(e){this._topology=e}reset(){this.renderable=null,this.texture=null,this._batcher=null,this._batch=null,this.geometry=null,this._uvUpdateId=-1,this._textureMatrixUpdateId=-1}setTexture(e){this.texture!==e&&(this.texture=e,this._textureMatrixUpdateId=-1)}get uvs(){let e=this.geometry.getBuffer(`aUV`),t=e.data,n=t,r=this.texture.textureMatrix;return r.isSimple||(n=this._transformedUvs,(this._textureMatrixUpdateId!==r._updateID||this._uvUpdateId!==e._updateID)&&((!n||n.length<t.length)&&(n=this._transformedUvs=new Float32Array(t.length)),this._textureMatrixUpdateId=r._updateID,this._uvUpdateId=e._updateID,r.multiplyUvs(t,n))),n}get positions(){return this.geometry.positions}get indices(){return this.geometry.indices}get color(){return this.renderable.groupColorAlpha}get groupTransform(){return this.renderable.groupTransform}get attributeSize(){return this.geometry.positions.length/2}get indexSize(){return this.geometry.indices.length}},xt=class{destroy(){}},St=class{constructor(e,t){this.localUniforms=new h({uTransformMatrix:{value:new g,type:`mat3x3<f32>`},uColor:{value:new Float32Array([1,1,1,1]),type:`vec4<f32>`},uRound:{value:0,type:`f32`}}),this.localUniformsBindGroup=new ne({0:this.localUniforms}),this.renderer=e,this._adaptor=t,this._adaptor.init()}validateRenderable(e){let t=this._getMeshData(e),n=t.batched,r=e.batched;if(t.batched=r,n!==r)return!0;if(r){let n=e._geometry;if(n.indices.length!==t.indexSize||n.positions.length!==t.vertexSize)return t.indexSize=n.indices.length,t.vertexSize=n.positions.length,!0;let r=this._getBatchableMesh(e);return r.texture.uid!==e._texture.uid&&(r._textureMatrixUpdateId=-1),!r._batcher.checkAndUpdateTexture(r,e._texture)}return!1}addRenderable(e,t){let n=this.renderer.renderPipes.batch,r=this._getMeshData(e);if(e.didViewUpdate&&(r.indexSize=e._geometry.indices?.length,r.vertexSize=e._geometry.positions?.length),r.batched){let r=this._getBatchableMesh(e);r.setTexture(e._texture),r.geometry=e._geometry,n.addToBatch(r,t)}else n.break(t),t.add(e)}updateRenderable(e){if(e.batched){let t=this._getBatchableMesh(e);t.setTexture(e._texture),t.geometry=e._geometry,t._batcher.updateElement(t)}}execute(e){if(!e.isRenderable)return;e.state.blend&&(e.state.blendMode=he(e.groupBlendMode,e.texture._source));let t=this.localUniforms;t.uniforms.uTransformMatrix=e.groupTransform,t.uniforms.uRound=this.renderer._roundPixels|e._roundPixels,t.update(),ue(e.groupColorAlpha,t.uniforms.uColor,0),this._adaptor.execute(this,e)}_getMeshData(e){var t,n;return(t=e._gpuData)[n=this.renderer.uid]||(t[n]=new xt),e._gpuData[this.renderer.uid].meshData||this._initMeshData(e)}_initMeshData(e){return e._gpuData[this.renderer.uid].meshData={batched:e.batched,indexSize:0,vertexSize:0},e._gpuData[this.renderer.uid].meshData}_getBatchableMesh(e){var t,n;return(t=e._gpuData)[n=this.renderer.uid]||(t[n]=new xt),e._gpuData[this.renderer.uid].batchableMesh||this._initBatchableMesh(e)}_initBatchableMesh(e){let t=new bt;return t.renderable=e,t.setTexture(e._texture),t.transform=e.groupTransform,t.roundPixels=this.renderer._roundPixels|e._roundPixels,e._gpuData[this.renderer.uid].batchableMesh=t,t}destroy(){this.localUniforms=null,this.localUniformsBindGroup=null,this._adaptor.destroy(),this._adaptor=null,this.renderer=null}};St.extension={type:[y.WebGLPipes,y.WebGPUPipes],name:`mesh`},p.add(St);var Ct=class extends c{constructor(...e){let t=e[0];t instanceof te&&(o(d,`Mesh: use new Mesh({ geometry, shader }) instead`),t={geometry:t,shader:e[1]},e[3]&&(o(d,`Mesh: drawMode argument has been removed, use geometry.topology instead`),t.geometry.topology=e[3]));let{geometry:n,shader:r,texture:i,roundPixels:a,state:s,...c}=t;super({label:`Mesh`,...c}),this.renderPipeId=`mesh`,this._shader=null,this.allowChildren=!1,this.shader=r??null,this.texture=i??r?.texture??u.WHITE,this.state=s??C.for2d(),this._geometry=n,this._geometry.on(`update`,this.onViewUpdate,this),this.roundPixels=a??!1}get material(){return o(d,`mesh.material property has been removed, use mesh.shader instead`),this._shader}set shader(e){this._shader!==e&&(this._shader=e,this.onViewUpdate())}get shader(){return this._shader}set geometry(e){this._geometry!==e&&(this._geometry?.off(`update`,this.onViewUpdate,this),e.on(`update`,this.onViewUpdate,this),this._geometry=e,this.onViewUpdate())}get geometry(){return this._geometry}set texture(e){e||=u.EMPTY;let t=this._texture;t!==e&&(t&&t.dynamic&&t.off(`update`,this.onViewUpdate,this),e.dynamic&&e.on(`update`,this.onViewUpdate,this),this.shader&&(this.shader.texture=e),this._texture=e,this.onViewUpdate())}get texture(){return this._texture}get batched(){return this._shader||this.state.data&12?!1:this._geometry instanceof P?this._geometry.batchMode===`auto`?this._geometry.positions.length/2<=100:this._geometry.batchMode===`batch`:!1}get bounds(){return this._geometry.bounds}updateBounds(){this._bounds=this._geometry.bounds}containsPoint(e){let{x:t,y:n}=e;if(!this.bounds.containsPoint(t,n))return!1;let r=this.geometry.getBuffer(`aPosition`).data,i=this.geometry.topology===`triangle-strip`?3:1;if(this.geometry.getIndex()){let e=this.geometry.getIndex().data,a=e.length;for(let o=0;o+2<a;o+=i){let i=e[o]*2,a=e[o+1]*2,s=e[o+2]*2;if(at(t,n,r[i],r[i+1],r[a],r[a+1],r[s],r[s+1]))return!0}}else{let e=r.length/2;for(let a=0;a+2<e;a+=i){let e=a*2,i=(a+1)*2,o=(a+2)*2;if(at(t,n,r[e],r[e+1],r[i],r[i+1],r[o],r[o+1]))return!0}}return!1}destroy(e){if(super.destroy(e),typeof e==`boolean`?e:e?.texture){let t=typeof e==`boolean`?e:e?.textureSource;this._texture.destroy(t)}this._geometry?.off(`update`,this.onViewUpdate,this),this._texture=null,this._geometry=null,this._shader=null}},wt=class{constructor({matrix:e,observer:t}={}){this.dirty=!0,this._matrix=e??new g,this.observer=t,this.position=new T(this,0,0),this.scale=new T(this,1,1),this.pivot=new T(this,0,0),this.skew=new T(this,0,0),this._rotation=0,this._cx=1,this._sx=0,this._cy=0,this._sy=1}get matrix(){let e=this._matrix;return this.dirty?(e.a=this._cx*this.scale.x,e.b=this._sx*this.scale.x,e.c=this._cy*this.scale.y,e.d=this._sy*this.scale.y,e.tx=this.position.x-(this.pivot.x*e.a+this.pivot.y*e.c),e.ty=this.position.y-(this.pivot.x*e.b+this.pivot.y*e.d),this.dirty=!1,e):e}_onUpdate(e){this.dirty=!0,e===this.skew&&this.updateSkew(),this.observer?._onUpdate(this)}updateSkew(){this._cx=Math.cos(this._rotation+this.skew.y),this._sx=Math.sin(this._rotation+this.skew.y),this._cy=-Math.sin(this._rotation-this.skew.x),this._sy=Math.cos(this._rotation-this.skew.x),this.dirty=!0}toString(){return`[pixi.js/math:Transform position=(${this.position.x}, ${this.position.y}) rotation=${this.rotation} scale=(${this.scale.x}, ${this.scale.y}) skew=(${this.skew.x}, ${this.skew.y}) ]`}setFromMatrix(e){e.decompose(this),this.dirty=!0}get rotation(){return this._rotation}set rotation(e){this._rotation!==e&&(this._rotation=e,this._onUpdate(this.skew))}},Tt=new g,F=new g,I=[new E,new E,new E,new E],Et=class{constructor(e){this._renderer=e}validateRenderable(e){return!1}addRenderable(e,t){this._renderer.renderPipes.batch.break(t),t.add(e)}updateRenderable(e){}execute(e){let t=this._renderer,n=t.canvasContext,r=n.activeContext;r.save(),n.setBlendMode(e.groupBlendMode);let a=t.globalUniforms.globalUniformData?.worldColor??4294967295,o=e.groupColorAlpha,c=(a>>>24&255)/255,l=(o>>>24&255)/255,u=t.filter?.alphaMultiplier??1,d=c*l*u;if(d<=0){r.restore();return}r.globalAlpha=d;let f=a&16777215,p=o&16777215,m=s(i(p,f)),h=e.texture,g=oe.getTintedPattern(h,m),_=e.width,v=e.height,y=e.groupTransform,b=h.source._resolution??h.source.resolution??1;F.copyFrom(e._tileTransform.matrix),e.applyAnchorToTexture||F.translate(-e.anchor.x*_,-e.anchor.y*v);let x=F.tx,S=F.ty;F.scale(1/b,1/b),F.tx=x,F.ty=S,Tt.identity(),Tt.prepend(F),Tt.prepend(y);let C=t._roundPixels|e._roundPixels;n.setContextTransform(Tt,C===1),r.fillStyle=g;let w=e.anchor.x*-_,T=e.anchor.y*-v;I[0].set(w,T),I[1].set(w+_,T),I[2].set(w+_,T+v),I[3].set(w,T+v);for(let e=0;e<4;e++)F.applyInverse(I[e],I[e]);r.beginPath(),r.moveTo(I[0].x,I[0].y);for(let e=1;e<4;e++)r.lineTo(I[e].x,I[e].y);r.closePath(),r.fill(),r.restore()}destroy(){this._renderer=null}};Et.extension={type:[y.CanvasPipes],name:`tilingSprite`};var Dt={name:`tiling-bit`,vertex:{header:`
            struct TilingUniforms {
                uMapCoord:mat3x3<f32>,
                uClampFrame:vec4<f32>,
                uClampOffset:vec2<f32>,
                uTextureTransform:mat3x3<f32>,
                uSizeAnchor:vec4<f32>
            };

            @group(2) @binding(0) var<uniform> tilingUniforms: TilingUniforms;
            @group(2) @binding(1) var uTexture: texture_2d<f32>;
            @group(2) @binding(2) var uSampler: sampler;
        `,main:`
            uv = (tilingUniforms.uTextureTransform * vec3(uv, 1.0)).xy;

            position = (position - tilingUniforms.uSizeAnchor.zw) * tilingUniforms.uSizeAnchor.xy;
        `},fragment:{header:`
            struct TilingUniforms {
                uMapCoord:mat3x3<f32>,
                uClampFrame:vec4<f32>,
                uClampOffset:vec2<f32>,
                uTextureTransform:mat3x3<f32>,
                uSizeAnchor:vec4<f32>
            };

            @group(2) @binding(0) var<uniform> tilingUniforms: TilingUniforms;
            @group(2) @binding(1) var uTexture: texture_2d<f32>;
            @group(2) @binding(2) var uSampler: sampler;
        `,main:`

            var coord = vUV + ceil(tilingUniforms.uClampOffset - vUV);
            coord = (tilingUniforms.uMapCoord * vec3(coord, 1.0)).xy;
            var unclamped = coord;
            coord = clamp(coord, tilingUniforms.uClampFrame.xy, tilingUniforms.uClampFrame.zw);

            var bias = 0.;

            if(unclamped.x == coord.x && unclamped.y == coord.y)
            {
                bias = -32.;
            }

            outColor = textureSampleBias(uTexture, uSampler, coord, bias);
        `}},Ot={name:`tiling-bit`,vertex:{header:`
            uniform mat3 uTextureTransform;
            uniform vec4 uSizeAnchor;

        `,main:`
            uv = (uTextureTransform * vec3(aUV, 1.0)).xy;

            position = (position - uSizeAnchor.zw) * uSizeAnchor.xy;
        `},fragment:{header:`
            uniform sampler2D uTexture;
            uniform mat3 uMapCoord;
            uniform vec4 uClampFrame;
            uniform vec2 uClampOffset;
        `,main:`

        vec2 coord = vUV + ceil(uClampOffset - vUV);
        coord = (uMapCoord * vec3(coord, 1.0)).xy;
        vec2 unclamped = coord;
        coord = clamp(coord, uClampFrame.xy, uClampFrame.zw);

        outColor = texture(uTexture, coord, unclamped == coord ? 0.0 : -32.0);// lod-bias very negative to force lod 0

        `}},kt,At,jt=class extends ee{constructor(){kt??=le({name:`tiling-sprite-shader`,bits:[_e,Dt,pe]}),At??=ge({name:`tiling-sprite-shader`,bits:[ve,Ot,fe]});let e=new h({uMapCoord:{value:new g,type:`mat3x3<f32>`},uClampFrame:{value:new Float32Array([0,0,1,1]),type:`vec4<f32>`},uClampOffset:{value:new Float32Array([0,0]),type:`vec2<f32>`},uTextureTransform:{value:new g,type:`mat3x3<f32>`},uSizeAnchor:{value:new Float32Array([100,100,.5,.5]),type:`vec4<f32>`}});super({glProgram:At,gpuProgram:kt,resources:{localUniforms:new h({uTransformMatrix:{value:new g,type:`mat3x3<f32>`},uColor:{value:new Float32Array([1,1,1,1]),type:`vec4<f32>`},uRound:{value:0,type:`f32`}}),tilingUniforms:e,uTexture:u.EMPTY.source,uSampler:u.EMPTY.source.style}})}updateUniforms(e,t,n,r,i,a){let o=this.resources.tilingUniforms,s=a.width,c=a.height,l=a.textureMatrix,u=o.uniforms.uTextureTransform;u.set(n.a*s/e,n.b*s/t,n.c*c/e,n.d*c/t,n.tx/e,n.ty/t),u.invert(),o.uniforms.uMapCoord=l.mapCoord,o.uniforms.uClampFrame=l.uClampFrame,o.uniforms.uClampOffset=l.uClampOffset,o.uniforms.uTextureTransform=u,o.uniforms.uSizeAnchor[0]=e,o.uniforms.uSizeAnchor[1]=t,o.uniforms.uSizeAnchor[2]=r,o.uniforms.uSizeAnchor[3]=i,a&&(this.resources.uTexture=a.source,this.resources.uSampler=a.source.style)}},Mt=class extends P{constructor(){super({positions:new Float32Array([0,0,1,0,1,1,0,1]),uvs:new Float32Array([0,0,1,0,1,1,0,1]),indices:new Uint32Array([0,1,2,0,2,3])})}};function Nt(e,t){let n=e.anchor.x,r=e.anchor.y;t[0]=-n*e.width,t[1]=-r*e.height,t[2]=(1-n)*e.width,t[3]=-r*e.height,t[4]=(1-n)*e.width,t[5]=(1-r)*e.height,t[6]=-n*e.width,t[7]=(1-r)*e.height}function Pt(e,t,n,r){let i=0,a=e.length/(t||2),o=r.a,s=r.b,c=r.c,l=r.d,u=r.tx,d=r.ty;for(n*=t;i<a;){let r=e[n],a=e[n+1];e[n]=o*r+c*a+u,e[n+1]=s*r+l*a+d,n+=t,i++}}function Ft(e,t){let n=e.texture,r=n.frame.width,i=n.frame.height,a=0,o=0;e.applyAnchorToTexture&&(a=e.anchor.x,o=e.anchor.y),t[0]=t[6]=-a,t[2]=t[4]=1-a,t[1]=t[3]=-o,t[5]=t[7]=1-o;let s=e._tileTransform.matrix,c=g.shared;c.set(s.a*r/e.width,s.b*r/e.height,s.c*i/e.width,s.d*i/e.height,s.tx/e.width,s.ty/e.height),c.invert(),Pt(t,2,0,c)}var It=new Mt,Lt=class{constructor(){this.canBatch=!0,this.geometry=new P({indices:It.indices.slice(),positions:It.positions.slice(),uvs:It.uvs.slice()})}destroy(){this.geometry.destroy(),this.shader?.destroy()}},Rt=class{constructor(e){this._state=C.default2d,this._renderer=e,this._managedTilingSprites=new de({renderer:e,type:`renderable`,name:`tilingSprite`})}validateRenderable(e){let t=this._getTilingSpriteData(e),n=t.canBatch;this._updateCanBatch(e);let r=t.canBatch;if(r&&r===n){let{batchableMesh:n}=t;return!n._batcher.checkAndUpdateTexture(n,e.texture)}return n!==r}addRenderable(e,t){let n=this._renderer.renderPipes.batch;this._updateCanBatch(e);let r=this._getTilingSpriteData(e),{geometry:i,canBatch:a}=r;if(a){r.batchableMesh||=new bt;let a=r.batchableMesh;e.didViewUpdate&&(this._updateBatchableMesh(e),a.geometry=i,a.renderable=e,a.transform=e.groupTransform,a.setTexture(e._texture)),a.roundPixels=this._renderer._roundPixels|e._roundPixels,n.addToBatch(a,t)}else n.break(t),r.shader||=new jt,this.updateRenderable(e),t.add(e)}execute(e){let t=this._renderer,{shader:n}=this._getTilingSpriteData(e);n.groups[0]=t.globalUniforms.bindGroup;let r=n.resources.localUniforms.uniforms;r.uTransformMatrix=e.groupTransform,r.uRound=t._roundPixels|e._roundPixels,ue(e.groupColorAlpha,r.uColor,0),this._state.blendMode=he(e.groupBlendMode,e.texture._source),t.encoder.draw({geometry:It,shader:n,state:this._state})}updateRenderable(e){let t=this._getTilingSpriteData(e),{canBatch:n}=t;if(n){let{batchableMesh:n}=t;e.didViewUpdate&&this._updateBatchableMesh(e),n._batcher.updateElement(n)}else if(e.didViewUpdate){let{shader:n}=t;n.updateUniforms(e.width,e.height,e._tileTransform.matrix,e.anchor.x,e.anchor.y,e.texture)}}_getTilingSpriteData(e){return e._gpuData[this._renderer.uid]||this._initTilingSpriteData(e)}_initTilingSpriteData(e){let t=new Lt;return t.renderable=e,e._gpuData[this._renderer.uid]=t,this._managedTilingSprites.add(e),t}_updateBatchableMesh(e){let{geometry:t}=this._getTilingSpriteData(e),n=e.texture.source.style;n.addressMode!==`repeat`&&(n.addressMode=`repeat`,n.update()),Ft(e,t.uvs),Nt(e,t.positions)}destroy(){this._managedTilingSprites.destroy(),this._renderer=null}_updateCanBatch(e){let t=this._getTilingSpriteData(e),n=e.texture,r=!0;return this._renderer.type===b.WEBGL&&(r=this._renderer.context.supports.nonPowOf2wrapping),t.canBatch=n.textureMatrix.isSimple&&(r||n.source.isPowerOfTwo),t.canBatch}};Rt.extension={type:[y.WebGLPipes,y.WebGPUPipes],name:`tilingSprite`},p.add(Et),p.add(Rt);var zt=class e extends c{constructor(...t){let n=t[0]||{};n instanceof u&&(n={texture:n}),t.length>1&&(o(d,`use new TilingSprite({ texture, width:100, height:100 }) instead`),n.width=t[1],n.height=t[2]),n={...e.defaultOptions,...n};let{texture:r,anchor:i,tilePosition:a,tileScale:s,tileRotation:c,width:l,height:f,applyAnchorToTexture:p,roundPixels:m,...h}=n??{};super({label:`TilingSprite`,...h}),this.renderPipeId=`tilingSprite`,this.batched=!0,this.allowChildren=!1,this._anchor=new T({_onUpdate:()=>{this.onViewUpdate()}}),this.applyAnchorToTexture=p,this.texture=r,this._width=l??r.width,this._height=f??r.height,this._tileTransform=new wt({observer:{_onUpdate:()=>this.onViewUpdate()}}),i&&(this.anchor=i),this.tilePosition=a,this.tileScale=s,this.tileRotation=c,this.roundPixels=m??!1}static from(t,n={}){return typeof t==`string`?new e({texture:ae.get(t),...n}):new e({texture:t,...n})}get uvRespectAnchor(){return o(d,`uvRespectAnchor is deprecated, please use applyAnchorToTexture instead`),this.applyAnchorToTexture}set uvRespectAnchor(e){o(d,`uvRespectAnchor is deprecated, please use applyAnchorToTexture instead`),this.applyAnchorToTexture=e}get clampMargin(){return this._texture.textureMatrix.clampMargin}set clampMargin(e){this._texture.textureMatrix.clampMargin=e}get anchor(){return this._anchor}set anchor(e){typeof e==`number`?this._anchor.set(e):this._anchor.copyFrom(e)}get tilePosition(){return this._tileTransform.position}set tilePosition(e){this._tileTransform.position.copyFrom(e)}get tileScale(){return this._tileTransform.scale}set tileScale(e){typeof e==`number`?this._tileTransform.scale.set(e):this._tileTransform.scale.copyFrom(e)}set tileRotation(e){this._tileTransform.rotation=e}get tileRotation(){return this._tileTransform.rotation}get tileTransform(){return this._tileTransform}set texture(e){e||=u.EMPTY;let t=this._texture;t!==e&&(t&&t.dynamic&&t.off(`update`,this.onViewUpdate,this),e.dynamic&&e.on(`update`,this.onViewUpdate,this),this._texture=e,this.onViewUpdate())}get texture(){return this._texture}set width(e){this._width=e,this.onViewUpdate()}get width(){return this._width}set height(e){this._height=e,this.onViewUpdate()}get height(){return this._height}setSize(e,t){typeof e==`object`&&(t=e.height??e.width,e=e.width),this._width=e,this._height=t??e,this.onViewUpdate()}getSize(e){return e||={},e.width=this._width,e.height=this._height,e}updateBounds(){let e=this._bounds,t=this._anchor,n=this._width,r=this._height;e.minX=-t._x*n,e.maxX=e.minX+n,e.minY=-t._y*r,e.maxY=e.minY+r}containsPoint(e){let t=this._width,n=this._height,r=-t*this._anchor._x,i=0;return e.x>=r&&e.x<=r+t&&(i=-n*this._anchor._y,e.y>=i&&e.y<=i+n)}destroy(e=!1){if(super.destroy(e),this._anchor=null,this._tileTransform=null,this._bounds=null,typeof e==`boolean`?e:e?.texture){let t=typeof e==`boolean`?e:e?.textureSource;this._texture.destroy(t)}this._texture=null}};zt.defaultOptions={texture:u.EMPTY,anchor:{x:0,y:0},tilePosition:{x:0,y:0},tileScale:{x:1,y:1},tileRotation:0,applyAnchorToTexture:!1};var Bt=zt,Vt=class e extends P{constructor(...e){super({});let t=e[0]??{};typeof t==`number`&&(o(d,`PlaneGeometry constructor changed please use { width, height, verticesX, verticesY } instead`),t={width:t,height:e[1],verticesX:e[2],verticesY:e[3]}),this.build(t)}build(t){t={...e.defaultOptions,...t},this.verticesX=this.verticesX??t.verticesX,this.verticesY=this.verticesY??t.verticesY,this.width=this.width??t.width,this.height=this.height??t.height;let n=this.verticesX*this.verticesY,r=[],i=[],a=[],o=this.verticesX-1,s=this.verticesY-1,c=this.width/o,l=this.height/s;for(let e=0;e<n;e++){let t=e%this.verticesX,n=e/this.verticesX|0;r.push(t*c,n*l),i.push(t/o,n/s)}let u=o*s;for(let e=0;e<u;e++){let t=e%o,n=e/o|0,r=n*this.verticesX+t,i=n*this.verticesX+t+1,s=(n+1)*this.verticesX+t,c=(n+1)*this.verticesX+t+1;a.push(r,i,s,i,c,s)}this.buffers[0].data=new Float32Array(r),this.buffers[1].data=new Float32Array(i),this.indexBuffer.data=new Uint32Array(a),this.buffers[0].update(),this.buffers[1].update(),this.indexBuffer.update()}};Vt.defaultOptions={width:100,height:100,verticesX:10,verticesY:10};var Ht=Vt;function Ut(e,t,n,r){let i=n.buffers[0],a=i.data,{verticesX:o,verticesY:s}=n,c=e/(o-1),l=t/(s-1),u=0,d=r[0],f=r[1],p=r[2],m=r[3],h=r[4],g=r[5],_=r[6],v=r[7],y=r[8];for(let e=0;e<a.length;e+=2){let t=u%o*c,n=(u/o|0)*l,r=d*t+f*n+p,i=m*t+h*n+g,s=_*t+v*n+y;a[e]=r/s,a[e+1]=i/s,u++}i.update()}function Wt(e,t){let n=t[0],r=t[1],i=t[2],a=t[3],o=t[4],s=t[5],c=t[6],l=t[7],u=t[8];return e[0]=o*u-s*l,e[1]=i*l-r*u,e[2]=r*s-i*o,e[3]=s*c-a*u,e[4]=n*u-i*c,e[5]=i*a-n*s,e[6]=a*l-o*c,e[7]=r*c-n*l,e[8]=n*o-r*a,e}function Gt(e,t,n){let r=t[0],i=t[1],a=t[2],o=t[3],s=t[4],c=t[5],l=t[6],u=t[7],d=t[8],f=n[0],p=n[1],m=n[2],h=n[3],g=n[4],_=n[5],v=n[6],y=n[7],b=n[8];return e[0]=f*r+p*o+m*l,e[1]=f*i+p*s+m*u,e[2]=f*a+p*c+m*d,e[3]=h*r+g*o+_*l,e[4]=h*i+g*s+_*u,e[5]=h*a+g*c+_*d,e[6]=v*r+y*o+b*l,e[7]=v*i+y*s+b*u,e[8]=v*a+y*c+b*d,e}function Kt(e,t,n){let r=n[0],i=n[1],a=n[2];return e[0]=t[0]*r+t[1]*i+t[2]*a,e[1]=t[3]*r+t[4]*i+t[5]*a,e[2]=t[6]*r+t[7]*i+t[8]*a,e}var qt=[0,0,0,0,0,0,0,0,0],Jt=[0,0,0],Yt=[0,0,0];function Xt(e,t,n,r,i,a,o,s,c){let l=qt;l[0]=t,l[1]=r,l[2]=a,l[3]=n,l[4]=i,l[5]=o,l[6]=1,l[7]=1,l[8]=1;let u=Wt(e,l);Yt[0]=s,Yt[1]=c,Yt[2]=1;let d=Kt(Jt,u,Yt),f=e;return e[0]=d[0],e[1]=0,e[2]=0,e[3]=0,e[4]=d[1],e[5]=0,e[6]=0,e[7]=0,e[8]=d[2],Gt(e,f,l)}var Zt=[0,0,0,0,0,0,0,0,0],Qt=[0,0,0,0,0,0,0,0,0];function $t(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g){let _=Xt(Zt,t,n,a,o,l,u,p,m),v=Xt(Qt,r,i,s,c,d,f,h,g);return Gt(e,Wt(_,_),v)}var en=class extends Ht{constructor(e){super(e),this._projectionMatrix=[0,0,0,0,0,0,0,0,0];let{width:t,height:n}=e;this.corners=[0,0,t,0,t,n,0,n]}setCorners(e,t,n,r,i,a,o,s){let c=this.corners;c[0]=e,c[1]=t,c[2]=n,c[3]=r,c[4]=i,c[5]=a,c[6]=o,c[7]=s,this.updateProjection()}updateProjection(){let{width:e,height:t}=this,n=this.corners,r=$t(this._projectionMatrix,0,0,n[0],n[1],e,0,n[2],n[3],e,t,n[4],n[5],0,t,n[6],n[7]);Ut(e,t,this,r)}};p.add(be,xe);var tn=new Map;function nn(e=8,t=`bright`){let n=tn.get(t);if(n)return n;let r=e*2,i=document.createElement(`canvas`);i.width=r,i.height=r;let a=i.getContext(`2d`),o=t===`dark`?`#241f21`:`#ffffff`,s=t===`dark`?`#000000`:`#d0d0d0`;a.fillStyle=o,a.fillRect(0,0,r,r),a.fillStyle=s,a.fillRect(0,0,e,e),a.fillRect(e,e,e,e);let c=u.from(i);return tn.set(t,c),c}p.add(Oe,ke,Ae,je,Me,Ne,Pe,Fe,Ie,Le,Re,Be,ze,Ve,He,Ue,We,Ge,Ke,qe,Je);var rn=`rgba16float`,L=null;function an(){if(L!==null)return L;try{if(typeof document>`u`)return L=!1,L;let e=document.createElement(`canvas`).getContext(`webgl2`);return e?(L=!!(e.getExtension(`EXT_color_buffer_float`)??e.getExtension(`EXT_color_buffer_half_float`)),L):(L=!1,L)}catch{return L=!1,L}}function R(e,t){let n=Math.max(1,Math.round(e)),r=Math.max(1,Math.round(t));return an()?me.create({width:n,height:r,resolution:1,format:rn}):me.create({width:n,height:r,resolution:1})}function on(e,t){return me.create({width:Math.max(1,Math.round(e)),height:Math.max(1,Math.round(t)),resolution:1})}var sn={overlay:0,darken:1,lighten:2,"color-dodge":3,"color-burn":4,"hard-light":5,"soft-light":6,difference:7,exclusion:8};function cn(e){let t=sn[e];return typeof t==`number`?t:null}var ln=`
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform sampler2D uBackdrop;
	uniform float uMode;

	float overlay(float base, float blend)
	{
		return (base < 0.5) ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
	}
	vec3 blendOverlay(vec3 base, vec3 blend, float opacity)
	{
		vec3 blended = vec3(
			overlay(base.r, blend.r),
			overlay(base.g, blend.g),
			overlay(base.b, blend.b)
		);
		return (blended * opacity + base * (1.0 - opacity));
	}

	vec3 blendDarken(vec3 base, vec3 blend, float opacity)
	{
		return (min(base, blend) * opacity + base * (1.0 - opacity));
	}

	vec3 blendLighten(vec3 base, vec3 blend, float opacity)
	{
		return (max(base, blend) * opacity + base * (1.0 - opacity));
	}

	float colorDodge(float base, float blend)
	{
		return base / (1.0 - blend);
	}
	vec3 blendColorDodge(vec3 base, vec3 blend, float opacity)
	{
		vec3 blended = vec3(
			colorDodge(base.r, blend.r),
			colorDodge(base.g, blend.g),
			colorDodge(base.b, blend.b)
		);
		return (blended * opacity + base * (1.0 - opacity));
	}

	float colorBurn(float base, float blend)
	{
		return max((1.0 - ((1.0 - base) / blend)), 0.0);
	}
	vec3 blendColorBurn(vec3 base, vec3 blend, float opacity)
	{
		vec3 blended = vec3(
			colorBurn(base.r, blend.r),
			colorBurn(base.g, blend.g),
			colorBurn(base.b, blend.b)
		);
		return (blended * opacity + base * (1.0 - opacity));
	}

	float hardLight(float base, float blend)
	{
		return (blend < 0.5) ? 2.0 * base * blend : 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
	}
	vec3 blendHardLight(vec3 base, vec3 blend, float opacity)
	{
		vec3 blended = vec3(
			hardLight(base.r, blend.r),
			hardLight(base.g, blend.g),
			hardLight(base.b, blend.b)
		);
		return (blended * opacity + base * (1.0 - opacity));
	}

	float softLight(float base, float blend)
	{
		return (blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend));
	}
	vec3 blendSoftLight(vec3 base, vec3 blend, float opacity)
	{
		vec3 blended = vec3(
			softLight(base.r, blend.r),
			softLight(base.g, blend.g),
			softLight(base.b, blend.b)
		);
		return (blended * opacity + base * (1.0 - opacity));
	}

	vec3 blendDifference(vec3 base, vec3 blend, float opacity)
	{
		return (abs(blend - base) * opacity + base * (1.0 - opacity));
	}

	vec3 exclusion(vec3 base, vec3 blend)
	{
		return base + blend - 2.0 * base * blend;
	}
	vec3 blendExclusion(vec3 base, vec3 blend, float opacity)
	{
		return (exclusion(base, blend) * opacity + base * (1.0 - opacity));
	}

	void main()
	{
		vec4 back = texture(uBackdrop, vTextureCoord);
		vec4 front = texture(uTexture, vTextureCoord);
		float blendedAlpha = front.a + back.a * (1.0 - front.a);
		vec3 blended = back.rgb;
		if (uMode < 0.5) blended = blendOverlay(back.rgb, front.rgb, front.a);
		else if (uMode < 1.5) blended = blendDarken(back.rgb, front.rgb, front.a);
		else if (uMode < 2.5) blended = blendLighten(back.rgb, front.rgb, front.a);
		else if (uMode < 3.5) blended = blendColorDodge(back.rgb, front.rgb, front.a);
		else if (uMode < 4.5) blended = blendColorBurn(back.rgb, front.rgb, front.a);
		else if (uMode < 5.5) blended = blendHardLight(back.rgb, front.rgb, front.a);
		else if (uMode < 6.5) blended = blendSoftLight(back.rgb, front.rgb, front.a);
		else if (uMode < 7.5) blended = blendDifference(back.rgb, front.rgb, front.a);
		else blended = blendExclusion(back.rgb, front.rgb, front.a);
		finalColor = vec4(blended, blendedAlpha);
	}
`,un=class extends v{constructor(e,t){super({glProgram:x.from({vertex:O,fragment:ln,name:`layer-blend`}),resources:{blendStatics:new h({uMode:{value:e,type:`f32`}}),uBackdrop:t.source}})}};function z(e=``){let t;return t=typeof crypto<`u`&&typeof crypto.randomUUID==`function`?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`,e?`${e}-${t}`:t}var dn={normal:`normal`,multiply:`multiply`,screen:`screen`,overlay:`overlay`,darken:`darken`,lighten:`lighten`,"color-dodge":`color-dodge`,"color-burn":`color-burn`,"hard-light":`hard-light`,"soft-light":`soft-light`,difference:`difference`,exclusion:`exclusion`,add:`add`},fn=class{app=null;surfaces=new Map;attach(e){this.app=e}requireApp(){if(!this.app)throw Error(`SurfaceStore has no Application attached.`);return this.app}render(e,t,n){this.requireApp().renderer.render({container:e,target:t,clear:n})}create(e,t,n){let r=z(`sfc`),i=R(e,t);return this.surfaces.set(r,i),n!==void 0&&this.fill(r,n),r}clear(e){this.render(new a,this.getTexture(e),!0)}createFromBitmap(e){let t=u.from(e),n=t.width,r=t.height,i=z(`sfc`),a=R(n,r);this.surfaces.set(i,a);let o=new D(t);return this.render(o,a,!0),o.destroy(),t.destroy(),i}adopt(e){let t=z(`sfc`);return this.surfaces.set(t,e),t}release(e){this.surfaces.delete(e)}has(e){return this.surfaces.has(e)}getTexture(e){let t=this.surfaces.get(e);if(!t)throw Error(`Unknown surface: ${e}`);return t}fill(e,t){let n=this.getTexture(e),r=new k;r.rect(0,0,n.width,n.height).fill(t),this.render(r,n,!0),r.destroy()}copyRegion(e,t){let n=this.getTexture(e),r=R(t.width,t.height),i=z(`sfc`);this.surfaces.set(i,r);let o=new D(n),s=new a;return o.position.set(-t.x,-t.y),s.addChild(o),this.render(s,r,!0),s.destroy({children:!0}),i}blitRegion(e,t,n,r,i=`normal`,o=1){let s=this.getTexture(e),c=this.getTexture(t),l=new D(s);l.position.set(n,r),l.blendMode=i,l.alpha=o;let u=new a;u.addChild(l),this.render(u,c,!1),u.destroy({children:!0})}compositeLayer(e,t,n,r){this.compositeTexture(this.getTexture(e),t,n,r)}compositeTexture(e,t,n,r){let i=this.getTexture(t),o=Math.max(0,Math.min(1,n)),s=cn(r);if(s===null){let t=new D(e);t.alpha=o,t.blendMode=dn[r]??`normal`;let n=new a;n.addChild(t),this.render(n,i,!1),n.destroy({children:!0});return}let c=this.copyRegion(t,{x:0,y:0,width:i.width,height:i.height}),l=new D(e);l.alpha=o;let u=new un(s,this.getTexture(c));l.filters=[u];let d=new a;d.addChild(l),this.render(d,i,!1),d.destroy({children:!0}),u.destroy(),this.dispose(c)}blitPerspective(e,t,n,r=`normal`){let i=this.getTexture(e),o=this.getTexture(t),s=new en({width:i.width,height:i.height,verticesX:24,verticesY:24});s.setCorners(n[0].x,n[0].y,n[1].x,n[1].y,n[2].x,n[2].y,n[3].x,n[3].y);let c=new Ct({texture:i,geometry:s});c.blendMode=r;let l=new a;l.addChild(c),this.render(l,o,!1),l.destroy({children:!0}),s.destroy()}blitTransformed(e,t,n,r,i,o,s,c,l,u,d,f=`normal`,p=0,m=0){let h=new D(this.getTexture(e));h.anchor.set(n/h.texture.width,r/h.texture.height),h.position.set(i+s,o+c),h.scale.set(l,u),h.rotation=d,h.skew.set(p,m),h.blendMode=f;let g=new a;g.addChild(h),this.render(g,this.getTexture(t),!1),g.destroy({children:!0})}renderInto(e,t,n=!1){this.render(t,e,n)}dispose(e){let t=this.surfaces.get(e);t&&(t.destroy(!0),this.surfaces.delete(e))}disposeAll(){for(let e of this.surfaces.values())e.destroy(!0);this.surfaces.clear()}},pn=`
	in vec2 aPosition;
	in vec2 aUV;
	out vec2 vUV;
	uniform mat3 uTextureMatrix;

	void main()
	{
		vUV = (uTextureMatrix * vec3(aUV, 1.0)).xy;
		gl_Position = vec4(aPosition, 0.0, 1.0);
	}
`,mn=`
	in vec2 vUV;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	void main()
	{
		vec4 c = texture(uTexture, vUV);
		if (c.a <= 0.0) { finalColor = vec4(0.0, 0.0, 0.0, 0.0); return; }
		if (c.a >= 1.0) { finalColor = c; return; }
		finalColor = vec4(clamp(c.rgb / c.a, 0.0, 1.0), c.a);
	}
`,hn=new Float32Array([-1,-1,3,-1,-1,3]);function gn(e,t,n,r,i,o,s,c){let l=Math.max(1,Math.round(s??i)),u=Math.max(1,Math.round(c??o)),d=Math.max(1,t.width),f=Math.max(1,t.height),p=n/d,m=r/f,h=Math.max(1,Math.round(i))/d,g=Math.max(1,Math.round(o))/f,_=on(l,u),v=t.source,y=x.from({vertex:pn,fragment:mn,name:`unpremultiply-blit`}),b=new ee({glProgram:y,resources:{uTexture:v,uSampler:v.style,textureUniforms:{uTextureMatrix:{type:`mat3x3<f32>`,value:t.textureMatrix.mapCoord}}}}),S=new te({attributes:{aPosition:hn,aUV:new Float32Array([p,m,p+2*h,m,p,m+2*g])}}),C=new Ct({geometry:S,shader:b}),w=new a;return w.addChild(C),e.app.renderer.render({container:w,target:_,clear:!0}),w.destroy({children:!0}),S.destroy(),b.destroy(!0),y.destroy(),_}function _n(e,t,n,r){let i=Math.max(1,Math.round(n??t.width)),a=Math.max(1,Math.round(r??t.height));return gn(e,t,0,0,t.width,t.height,i,a)}function vn(e,t,n,r,i,a){let o=gn(e,t,n,r,i,a),s=new D(o),c=e.app.renderer.extract.pixels({target:s,resolution:1});s.destroy();let l=new Uint8ClampedArray(c.pixels),u=c.width,d=c.height;return o.destroy(!0),{pixels:l,width:u,height:d}}function B(e,t,n,r){let i=_n(e,t,n,r),a=new D(i),o=e.app.renderer.extract.pixels({target:a,resolution:1});a.destroy();let s=new Uint8ClampedArray(o.pixels),c=o.width,l=o.height;return i.destroy(!0),{pixels:s,width:c,height:l}}function yn(e,t){return B(e,e.surfaces.getTexture(t))}function bn(e,t){let{pixels:n,width:r,height:i}=B(e,t);for(let e=0;e<n.length;e+=4)n[e+3]===0&&(n[e]=0,n[e+1]=0,n[e+2]=0);let a=document.createElement(`canvas`);return a.width=r,a.height=i,a.getContext(`2d`).putImageData(new ImageData(Uint8ClampedArray.from(n),r,i),0,0),a}var xn=n({default:()=>Tn}),Sn=null,V=null;function Cn(){let e=j.active,t=e?.activeLayer;if(!e||!t||!bs())return null;if(Sn===t.surfaceId&&V)return V;let n=ys(),r=n.surfaces;if(!r.has(t.surfaceId))return null;let i=e.width,a=e.height,{pixels:o,width:s,height:c}=B(n,r.getTexture(t.surfaceId),i,a);if(s!==i||c!==a)return null;let l=255,u=255,d=255,f=0,p=0,m=0;for(let e=0;e<o.length;e+=4){if(o[e+3]===0)continue;let t=o[e],n=o[e+1],r=o[e+2];t<l&&(l=t),n<u&&(u=n),r<d&&(d=r),t>f&&(f=t),n>p&&(p=n),r>m&&(m=r)}return V=f<=l&&p<=u&&m<=d?{lo:[0,0,0],hi:[1,1,1]}:{lo:[l/255,u/255,d/255],hi:[Math.max(l+1,f)/255,Math.max(u+1,p)/255,Math.max(d+1,m)/255]},Sn=t.surfaceId,V}function wn(e){let[t,n,r]=e.lo,[i,a,o]=e.hi,s=1/Math.max(i-t,1e-4),c=1/Math.max(a-n,1e-4),l=1/Math.max(o-r,1e-4);return[s,0,0,0,-t*s,0,c,0,0,-n*c,0,0,l,0,-r*l,0,0,0,1,0]}var Tn={label:`Auto-Level`,icon:`🎚️`,params:[],filter:e=>{let t=Cn(),n=new N;return t&&(n.matrix=wn(t)),n},isNoop:()=>!1},En=n({default:()=>Dn}),Dn={label:`Black and White`,icon:`📰`,params:[],filter:()=>{let e=new N;return e.matrix=[.299,.587,.114,0,0,.299,.587,.114,0,0,.299,.587,.114,0,0,0,0,0,1,0],e},isNoop:()=>!1},On=`
	float hash(vec2 p)
	{
		return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
	}

	float valueNoise(vec2 p)
	{
		vec2 i = floor(p);
		vec2 f = fract(p);
		vec2 u = f * f * (3.0 - 2.0 * f);
		float a = hash(i);
		float b = hash(i + vec2(1.0, 0.0));
		float c = hash(i + vec2(0.0, 1.0));
		float d = hash(i + vec2(1.0, 1.0));
		return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
	}

	float fbm(vec2 p)
	{
		float v = 0.0;
		float amp = 0.5;
		for (int i = 0; i < 4; i++)
		{
			v += amp * valueNoise(p);
			p *= 2.02;
			amp *= 0.5;
		}
		return v;
	}
`,H=`
	vec4 adjustSample(sampler2D tex, vec2 uv)
	{
		vec4 c = texture(tex, uv);
		return c.a > 0.0 ? vec4(c.rgb / c.a, c.a) : vec4(0.0, 0.0, 0.0, 0.0);
	}

	vec4 adjustOutput(vec3 rgb, float a)
	{
		return vec4(clamp(rgb, 0.0, 1.0) * a, a);
	}

	float luma(vec3 c)
	{
		return dot(c, vec3(0.299, 0.587, 0.114));
	}
`;function U(){let e=j.active;return!e||!e.height?1:e.width/e.height}function W(e,t,n=0){let r=new h(t),i=x.from({vertex:O,fragment:e,name:`custom-effect`});return new v({glProgram:i,resources:{filterUniforms:r},padding:n})}var kn=n({default:()=>jn}),An=`
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform float uBrightness;
	uniform float uContrast;

${H}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}

		float B = uBrightness;
		float C = uContrast;
		float multiply = C < 0.0 ? C + 100.0 : (C > 0.0 ? 100.0 : 1.0);
		float divide = C < 0.0 ? 100.0 : (C > 0.0 ? 100.0 - C : 1.0);

		vec3 v = c.rgb * 255.0;
		float i = luma(v);
		vec3 outRgb;

		if (abs(divide) < 0.5)
		{
			// Maximum contrast: hard threshold against the shifted intensity.
			float t = (i + B) < 128.0 ? 0.0 : 255.0;
			outRgb = vec3(t);
		}
		else
		{
			float shift;
			if (abs(divide - 100.0) < 0.5)
				shift = (i - 127.0) * multiply / divide + 127.0 - i + B;
			else
				shift = (i - 127.0 + B) * multiply / divide + 127.0 - i;
			outRgb = v + shift;
		}

		finalColor = adjustOutput(outRgb / 255.0, c.a);
	}
`,jn={label:`Brightness / Contrast`,icon:`☀️`,params:[{key:`brightness`,label:`Brightness`,min:-100,max:100,step:1,default:0,centerTick:!0,gradient:`linear-gradient(90deg, #000 0%, #fff 100%)`},{key:`contrast`,label:`Contrast`,min:-100,max:100,step:1,default:0,centerTick:!0,gradient:`linear-gradient(90deg, #808080 0%, #505050 15%, #b0b0b0 30%, #202020 45%, #e0e0e0 60%, #000000 70%, #000000 76%, #ffffff 76%, #ffffff 82%, #000000 82%, #000000 88%, #ffffff 88%, #ffffff 94%, #000000 94%, #000000 100%)`}],filter:e=>W(An,{uBrightness:{value:e.brightness,type:`f32`},uContrast:{value:e.contrast,type:`f32`}}),isNoop:e=>e.brightness===0&&e.contrast===0},Mn=n({clearCurvesCache:()=>zn,curvesFilter:()=>Vn,default:()=>Hn,defaultCurveSet:()=>Nn,evalCurve:()=>Pn}),Nn={rgb:[{x:0,y:0},{x:1,y:1}],r:[{x:0,y:0},{x:1,y:1}],g:[{x:0,y:0},{x:1,y:1}],b:[{x:0,y:0},{x:1,y:1}]};function Pn(e,t){let n=e.length;if(n===0)return t;if(t<=e[0].x)return e[0].y;if(t>=e[n-1].x)return e[n-1].y;let r=0;for(r=0;r<n-1&&!(t>=e[r].x&&t<=e[r+1].x);r++);let i=e[Math.max(0,r-1)],a=e[r],o=e[r+1],s=e[Math.min(n-1,r+2)],c=(t-a.x)/Math.max(o.x-a.x,1e-6),l=.5*(2*a.y+(-i.y+o.y)*c+(2*i.y-5*a.y+4*o.y-s.y)*c*c+(-i.y+3*a.y-3*o.y+s.y)*c*c*c);return Math.max(0,Math.min(1,l))}function G(e){let t=new Uint8Array(256);for(let n=0;n<256;n++){let r=Pn(e,n/255);t[n]=Math.round(r*255)}return t}function Fn(e){let t=G(e.rgb),n=G(e.r),r=G(e.g),i=G(e.b),a=new Uint8Array(256),o=new Uint8Array(256),s=new Uint8Array(256);for(let e=0;e<256;e++)a[e]=n[t[e]],o[e]=r[t[e]],s[e]=i[t[e]];return{r:a,g:o,b:s}}var K=new Map,In=64;function Ln(e){return JSON.stringify(e)}function Rn(e){let t=Ln(e),n=K.get(t);if(n)return n;let{r,g:i,b:a}=Fn(e),o=document.createElement(`canvas`);o.width=256,o.height=1;let s=o.getContext(`2d`),c=s.createImageData(256,1);for(let e=0;e<256;e++)c.data[e*4]=r[e],c.data[e*4+1]=i[e],c.data[e*4+2]=a[e],c.data[e*4+3]=255;s.putImageData(c,0,0);let l=u.from(o);if(l.source&&(l.source.scaleMode=`linear`),K.size>=In){let e=K.keys().next().value;if(e!==void 0){let t=K.get(e);t&&t.destroy(!0),K.delete(e)}}return K.set(t,l),l}function zn(){for(let e of K.values())e.destroy(!0);K.clear()}var Bn=`
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform sampler2D uLut;

${H}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}
		vec3 rgb = vec3(
			texture(uLut, vec2(c.r, 0.5)).r,
			texture(uLut, vec2(c.g, 0.5)).g,
			texture(uLut, vec2(c.b, 0.5)).b
		);
		finalColor = adjustOutput(rgb, c.a);
	}
`;function Vn(e){let t=x.from({vertex:O,fragment:Bn,name:`curves`});return new v({glProgram:t,resources:{uLut:Rn(e).source}})}var Hn={label:`Curves`,icon:`📈`,params:[],dialog:`curves`,filter:()=>Vn(Nn),isNoop:()=>!1},Un=n({default:()=>Gn}),Wn=`
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform float uExposure;

${H}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}
		finalColor = adjustOutput(c.rgb * exp2(uExposure), c.a);
	}
`,Gn={label:`Exposure`,icon:`📷`,params:[{key:`exposure`,label:`Exposure`,min:-5,max:5,step:.1,default:0,centerTick:!0,gradient:`linear-gradient(90deg, #000 0%, #808080 50%, #fff 100%)`}],filter:e=>W(Wn,{uExposure:{value:e.exposure,type:`f32`}}),isNoop:e=>e.exposure===0},Kn=n({default:()=>Jn}),qn=`
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform float uHighlights;
	uniform float uShadows;

${H}

	// Push rgb toward white (amount > 0) or toward black (amount < 0),
	// scaled by mask. Highlights and shadows are mirror images of each
	// other, so they share this one rule: the negative branch must move
	// toward black for BOTH. (It previously used minus-rgb for highlights,
	// which made a negative Highlights value brighten the image instead of
	// darkening it: rgb * (1 + mask * abs(h)) overshoots to white.)
	vec3 pushLuminance(vec3 rgb, float mask, float amount)
	{
		return rgb + mask * amount * (amount > 0.0 ? (1.0 - rgb) : rgb);
	}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}

		vec3 rgb = c.rgb;
		float l = luma(rgb);
		float shadowMask = pow(1.0 - l, 3.0);
		float highMask = pow(l, 3.0);

		// u* > 0 lifts toward white, u* < 0 pushes toward black.
		rgb = pushLuminance(rgb, shadowMask, uShadows);
		rgb = pushLuminance(rgb, highMask, uHighlights);

		finalColor = adjustOutput(rgb, c.a);
	}
`,Jn={label:`Highlights / Shadows`,icon:`🌗`,params:[{key:`highlights`,label:`Highlights`,min:-100,max:100,step:1,default:0,centerTick:!0,gradient:`linear-gradient(90deg, #404040 0%, #808080 50%, #fff 100%)`},{key:`shadows`,label:`Shadows`,min:-100,max:100,step:1,default:0,centerTick:!0,gradient:`linear-gradient(90deg, #000 0%, #606060 70%, #b0b0b0 100%)`}],filter:e=>W(qn,{uHighlights:{value:e.highlights/100,type:`f32`},uShadows:{value:e.shadows/100,type:`f32`}}),isNoop:e=>e.highlights===0&&e.shadows===0},Yn=n({default:()=>Xn}),Xn={label:`Hue / Saturation`,icon:`🎨`,params:[{key:`hue`,label:`Hue`,min:-180,max:180,step:1,default:0,centerTick:!0,gradient:`linear-gradient(90deg, hsl(0,100%,50%) 0%, hsl(60,100%,50%) 16.6%, hsl(120,100%,50%) 33.3%, hsl(180,100%,50%) 50%, hsl(240,100%,50%) 66.6%, hsl(300,100%,50%) 83.3%, hsl(360,100%,50%) 100%)`},{key:`sat`,label:`Saturation`,min:0,max:200,step:1,default:100,centerTick:!0,gradient:`linear-gradient(90deg, hsl(0,0%,50%) 0%, hsl(60,17%,50%) 16.6%, hsl(120,33%,50%) 33.3%, hsl(180,50%,50%) 50%, hsl(240,67%,50%) 66.6%, hsl(300,83%,50%) 83.3%, hsl(360,100%,50%) 100%)`},{key:`light`,label:`Lightness`,min:0,max:200,step:1,default:100,centerTick:!0,gradient:`linear-gradient(90deg, #000 0%, #fff 100%)`}],filter:e=>{let t=new N;return t.saturate(Math.max(0,e.sat/100),!0),t.hue(e.hue,!0),t.brightness(Math.max(0,e.light/100),!0),t},isNoop:e=>e.hue===0&&e.sat===100&&e.light===100},Zn=n({default:()=>Qn}),Qn={label:`Invert Alpha`,icon:`🏁`,params:[],filter:()=>{let e=new N;return e.matrix=[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,-1,1],e},isNoop:()=>!1},$n=n({default:()=>tr}),er=`
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform vec3 uInLo;
	uniform vec3 uInHi;
	uniform vec3 uOutLo;
	uniform vec3 uOutHi;
	uniform float uGamma;
	uniform vec3 uMask;

${H}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}

		vec3 span = max(uInHi - uInLo, vec3(1.0 / 255.0));
		vec3 v = clamp((c.rgb - uInLo) / span, 0.0, 1.0);
		v = pow(v, vec3(1.0 / max(uGamma, 0.01)));
		vec3 mapped = uOutLo + v * (uOutHi - uOutLo);
		// Per-channel mask: unchecked channels pass through untouched.
		vec3 res = mix(c.rgb, mapped, uMask);

		finalColor = adjustOutput(res, c.a);
	}
`,tr={label:`Levels`,icon:`📊`,dialog:`levels`,params:[{key:`inBlack`,label:`Input Black`,min:0,max:254,step:1,default:0},{key:`inWhite`,label:`Input White`,min:1,max:255,step:1,default:255},{key:`gamma`,label:`Gamma (×100)`,min:1,max:1e3,step:1,default:100},{key:`outBlack`,label:`Output Black`,min:0,max:255,step:1,default:0},{key:`outWhite`,label:`Output White`,min:0,max:255,step:1,default:255},{key:`chR`,label:`Red channel`,min:0,max:1,step:1,default:1,kind:`checkbox`},{key:`chG`,label:`Green channel`,min:0,max:1,step:1,default:1,kind:`checkbox`},{key:`chB`,label:`Blue channel`,min:0,max:1,step:1,default:1,kind:`checkbox`}],filter:e=>{let t=e.inBlack/255,n=e.inWhite/255;return W(er,{uInLo:{value:[t,t,t],type:`vec3<f32>`},uInHi:{value:[n,n,n],type:`vec3<f32>`},uOutLo:{value:[e.outBlack/255,e.outBlack/255,e.outBlack/255],type:`vec3<f32>`},uOutHi:{value:[e.outWhite/255,e.outWhite/255,e.outWhite/255],type:`vec3<f32>`},uGamma:{value:e.gamma/100,type:`f32`},uMask:{value:[e.chR??1,e.chG??1,e.chB??1],type:`vec3<f32>`}})},isNoop:e=>{let t=e.inBlack===0&&e.inWhite===255&&e.gamma===100&&e.outBlack===0&&e.outWhite===255,n=(e.chR??1)===0&&(e.chG??1)===0&&(e.chB??1)===0;return t||n}},nr=n({default:()=>ir}),rr=`
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform float uLevels;

${H}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}

		float n = max(uLevels, 2.0);
		vec3 v = floor(c.rgb * (n - 1.0) + 0.5) / (n - 1.0);
		finalColor = adjustOutput(v, c.a);
	}
`,ir={label:`Posterize`,icon:`🎚`,params:[{key:`levels`,label:`Colors per channel`,min:2,max:256,step:1,default:16}],filter:e=>W(rr,{uLevels:{value:e.levels,type:`f32`}}),isNoop:e=>e.levels>=256},ar=n({default:()=>or}),or={label:`Sepia`,icon:`📜`,params:[],filter:()=>{let e=new N;return e.matrix=[.393,.769,.189,0,0,.349,.686,.168,0,0,.272,.534,.131,0,0,0,0,0,1,0],e},isNoop:()=>!1},sr=n({default:()=>lr}),cr=`
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform float uThreshold;

${H}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}

		float i = luma(c.rgb) * 255.0;
		float v = i >= uThreshold ? 1.0 : 0.0;
		finalColor = adjustOutput(vec3(v), c.a);
	}
`,lr={label:`Threshold`,icon:`◾`,params:[{key:`threshold`,label:`Threshold`,min:0,max:255,step:1,default:128,gradient:`linear-gradient(90deg, #000 0%, #fff 100%)`}],filter:e=>W(cr,{uThreshold:{value:e.threshold,type:`f32`}}),isNoop:()=>!1},ur=n({default:()=>pr}),dr=3,fr=`
    precision highp float;
    in vec2 vTextureCoord;
    uniform highp vec4 uInputSize;
    uniform sampler2D uTexture;
    out vec4 finalColor;

    uniform float uAmount;
    uniform float uPadding;

    float hash(vec2 p)
    {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main()
    {
        vec2 px = vTextureCoord * uInputSize.xy;
        
        // Generate independent random offsets for this specific pixel within [-uAmount, uAmount]
        vec2 seed1 = px + vec2(12.9898, 78.233);
        vec2 seed2 = px + vec2(39.346, 11.135);
        float r1 = hash(seed1);
        float r2 = hash(seed2);
        
        vec2 offset = (vec2(r1, r2) * 2.0 - 1.0) * uAmount;
        vec2 destPx = px + offset;
        
        // Clamp strictly to the inner sprite boundaries so padding pixels 
        // sample the valid edge pixels of the image instead of turning black.
        vec2 minBound = vec2(uPadding);
        vec2 maxBound = uInputSize.xy - vec2(uPadding) - 1.0;
        destPx = clamp(destPx, minBound, maxBound);
        
        vec2 destUv = destPx * uInputSize.zw;
        
        finalColor = texture(uTexture, destUv);
    }
`,pr={label:`Frosted Glass`,icon:`🧊`,params:[{key:`amount`,label:`Amount`,min:1,max:100,step:1,default:dr}],filter:e=>{let t=e.amount??dr,n=Math.ceil(t);return W(fr,{uAmount:{value:t,type:`f32`},uPadding:{value:n,type:`f32`}},n)},isNoop:e=>(e.amount??dr)<=0},mr=n({default:()=>hr}),hr={label:`Gaussian Blur`,icon:`💧`,params:[{key:`strength`,label:`Blur strength`,min:0,max:50,step:1,default:8,gradient:`linear-gradient(90deg, #2A7B9B 0%, #2A7B9B 3%, #57C785 3%, #57C785 6%, #2A7B9B 6%, #2A7B9B 10%, #57C785 10%, #57C785 15%, #2A7B9B 18%, #57C785 28%, #2A7B9B 45%, #57C785 70%, #2A7B9B 100%)`}],filter:e=>new gt({strength:e.strength,resolution:1}),isNoop:e=>e.strength<=0},gr=n({default:()=>br}),_r=25,vr=10,yr=`
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;
    uniform sampler2D uTexture;

    uniform float uAngle;
    uniform float uDistance;
    uniform float uCentered;
    uniform float uEdgeMode; // 0: Clamp, 1: Wrap, 2: Mirror, 3: Transparent

    vec2 getWrapUV(vec2 uv)
    {
        return fract(uv);
    }

    vec2 getMirrorUV(vec2 uv)
    {
        return 1.0 - abs(fract(uv * 0.5) * 2.0 - 1.0);
    }

    vec4 sampleTexture(vec2 uv)
    {
        if (uEdgeMode > 2.5) // Transparent
        {
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
            {
                return vec4(0.0);
            }
            return texture2D(uTexture, uv);
        }
        else if (uEdgeMode > 1.5) // Mirror
        {
            return texture2D(uTexture, getMirrorUV(uv));
        }
        else if (uEdgeMode > 0.5) // Wrap
        {
            return texture2D(uTexture, getWrapUV(uv));
        }
        else // Clamp
        {
            return texture2D(uTexture, clamp(uv, 0.0, 1.0));
        }
    }

    void main()
    {
        if (uDistance <= 0.0)
        {
            gl_FragColor = texture2D(uTexture, vTextureCoord);
            return;
        }

        vec2 texel = uInputSize.zw;
        
        // Paint.NET direction vector: end = (-dist * cos(theta), dist * sin(theta))
        vec2 endOffset = vec2(-uDistance * cos(uAngle), uDistance * sin(uAngle)) * texel;
        vec2 startOffset = uCentered > 0.5 ? -0.5 * endOffset : vec2(0.0);

        vec4 acc = vec4(0.0);
        const int SAMPLES = 32;

        for (int i = 0; i < SAMPLES; i++)
        {
            float t = float(i) / float(SAMPLES - 1);
            vec2 uv = vTextureCoord + startOffset + t * endOffset;
            acc += sampleTexture(uv);
        }

        gl_FragColor = acc / float(SAMPLES);
    }
`,br={label:`Motion Blur`,icon:`🎞️`,params:[{key:`angle`,label:`Angle`,kind:`angle`,min:0,max:360,step:1,default:_r},{key:`distance`,label:`Distance`,min:0,max:200,step:1,default:vr},{key:`centered`,label:`Centered`,kind:`checkbox`,min:0,max:1,step:1,default:1},{key:`edgeBehavior`,label:`Edge Behavior`,kind:`select`,options:[{value:0,label:`Clamp`},{value:1,label:`Wrap`},{value:2,label:`Mirror`},{value:3,label:`Transparent`}],min:0,max:3,step:1,default:0}],filter:e=>W(yr,{uAngle:{value:(90-e.angle)*Math.PI/180,type:`f32`},uDistance:{value:e.distance,type:`f32`},uCentered:{value:+!!e.centered,type:`f32`},uEdgeMode:{value:e.edgeBehavior??0,type:`f32`}},0),isNoop:e=>e.distance<=0},xr=n({default:()=>Tr}),Sr=2,Cr=2,wr=`
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;
    uniform sampler2D uTexture;

    uniform vec2 uCenter;
    uniform float uAngle;
    uniform float uQuality;

    void main()
    {
        if (uAngle <= 0.0)
        {
            gl_FragColor = texture2D(uTexture, vTextureCoord);
            return;
        }

        // Convert offset to pixel space to guarantee 1:1 circular rotation without aspect ratio distortion
        vec2 relPx = (vTextureCoord - uCenter) * uInputSize.xy;

        vec4 accum = vec4(0.0);
        float count = 0.0;

        // Dynamic sample count derived from quality setting (32 to 96 samples)
        int samples = int(16.0 + uQuality * 16.0);

        for (int i = 0; i < 96; i++)
        {
            if (i >= samples)
            {
                break;
            }

            // Map sample index across the full arc [-uAngle, +uAngle]
            float t = (float(i) / float(samples - 1) - 0.5) * 2.0;
            float currentAngle = t * uAngle;

            float c = cos(currentAngle);
            float s = sin(currentAngle);

            // Rotate pixel vector
            vec2 rotPx = vec2(relPx.x * c - relPx.y * s, relPx.x * s + relPx.y * c);
            vec2 sampleUV = uCenter + rotPx * uInputSize.zw;

            // Paint.NET boundary check
            if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0)
            {
                accum += texture2D(uTexture, sampleUV);
                count += 1.0;
            }
        }

        if (count > 0.0)
        {
            gl_FragColor = accum / count;
        }
        else
        {
            gl_FragColor = vec4(0.0);
        }
    }
`,Tr={label:`Radial Blur`,icon:`💫`,params:[{key:`angle`,label:`Angle`,kind:`angle`,min:0,max:360,step:1,default:Sr},{key:`center`,label:`Center`,kind:`xy`,minX:0,maxX:100,minY:0,maxY:100,step:1,default:50,defaultY:50,yDown:!0},{key:`quality`,label:`Quality`,min:1,max:5,step:1,default:Cr}],filter:e=>W(wr,{uCenter:{value:[e.centerX/100,e.centerY/100],type:`vec2<f32>`},uAngle:{value:e.angle*Math.PI/180,type:`f32`},uQuality:{value:e.quality,type:`f32`}},0),isNoop:e=>e.angle<=0},Er=n({default:()=>kr}),Dr=10,Or=`
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uAngle;

	void main()
	{
		vec2 p = vTextureCoord - uCenter;
		float r = length(p);
		if (r < 1e-5)
		{
			finalColor = texture(uTexture, vTextureCoord);
			return;
		}
		float base = atan(p.y, p.x);

		vec4 acc = vec4(0.0);
		for (int i = 0; i < 24; i++)
		{
			float t = float(i) / 23.0 - 0.5;
			float a = base + uAngle * t;
			vec2 samplePix = uCenter + vec2(cos(a), sin(a)) * r;
			acc += texture(uTexture, samplePix);
		}
		finalColor = acc / 24.0;
	}
`,kr={label:`Rotary Blur`,icon:`🌀`,params:[{key:`angle`,label:`Angle`,kind:`angle`,min:-180,max:180,step:1,default:Dr},{key:`center`,label:`Center`,kind:`xy`,minX:0,maxX:100,minY:0,maxY:100,step:1,default:50,defaultY:50,yDown:!0}],filter:e=>W(Or,{uCenter:{value:[e.centerX/100,e.centerY/100],type:`vec2<f32>`},uAngle:{value:e.angle*Math.PI/180,type:`f32`}},0),isNoop:e=>e.angle===0},Ar=n({default:()=>Pr}),jr=5,Mr=20,Nr=`
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uRadius;
	uniform float uThreshold;

	float lum(vec4 c)
	{
		return dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
	}

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 center = texture(uTexture, vTextureCoord);
		float centerLum = lum(center);

		const int maxR = 10;
		vec4 acc = vec4(0.0);
		float wsum = 0.0;
		for (int x = -maxR; x <= maxR; x++)
		{
			if (abs(float(x)) > uRadius) continue;
			for (int y = -maxR; y <= maxR; y++)
			{
				if (abs(float(y)) > uRadius) continue;
				vec4 c = texture(uTexture, vTextureCoord + vec2(float(x), float(y)) * texel);
				float w = abs(lum(c) - centerLum) < uThreshold ? 1.0 : 0.0;
				acc += c * w;
				wsum += w;
			}
		}
		finalColor = wsum > 0.0 ? acc / wsum : center;
	}
`,Pr={label:`Smart Blur`,icon:`🧠`,params:[{key:`radius`,label:`Radius`,min:1,max:10,step:1,default:jr},{key:`threshold`,label:`Threshold`,min:0,max:100,step:1,default:Mr}],filter:e=>W(Nr,{uRadius:{value:e.radius,type:`f32`},uThreshold:{value:e.threshold/100,type:`f32`}},Math.ceil(e.radius)),isNoop:e=>e.radius<=0||e.threshold<=0},Fr=n({default:()=>zr}),Ir=5,Lr=20,Rr=`
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uRadius;
	uniform float uThreshold;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 center = texture(uTexture, vTextureCoord);
		vec3 c0 = center.rgb;

		const int maxR = 10;
		vec4 acc = vec4(0.0);
		float wsum = 0.0;
		for (int x = -maxR; x <= maxR; x++)
		{
			if (abs(float(x)) > uRadius) continue;
			for (int y = -maxR; y <= maxR; y++)
			{
				if (abs(float(y)) > uRadius) continue;
				vec4 c = texture(uTexture, vTextureCoord + vec2(float(x), float(y)) * texel);
				float d = max(abs(c.r - c0.r), max(abs(c.g - c0.g), abs(c.b - c0.b)));
				float w = clamp(1.0 - d / uThreshold, 0.0, 1.0);
				acc += c * w;
				wsum += w;
			}
		}
		finalColor = wsum > 0.0 ? acc / wsum : center;
	}
`,zr={label:`Surface Blur`,icon:`🌊`,params:[{key:`radius`,label:`Radius`,min:1,max:10,step:1,default:Ir},{key:`threshold`,label:`Threshold`,min:1,max:100,step:1,default:Lr}],filter:e=>W(Rr,{uRadius:{value:e.radius,type:`f32`},uThreshold:{value:e.threshold/100,type:`f32`}},Math.ceil(e.radius)),isNoop:e=>e.radius<=0},Br=n({default:()=>Wr}),Vr=10,q=24,Hr=[];for(let e=0;e<q;e++){let t=e/q*Math.PI*2,n=.5*Math.sqrt((e+.5)/q);Hr.push(`vec2(${n*Math.cos(t)},${n*Math.sin(t)})`)}var Ur=`
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uRadius;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 acc = vec4(0.0);
		${Hr.map(e=>`acc += texture(uTexture, vTextureCoord + ${e} * uRadius * texel);`).join(`
		`)}
		finalColor = acc / ${q}.0;
	}
`,Wr={label:`Unfocus`,icon:`🔮`,params:[{key:`radius`,label:`Radius`,min:0,max:1e3,step:1,default:Vr}],filter:e=>W(Ur,{uRadius:{value:e.radius,type:`f32`}},Math.ceil(e.radius)),isNoop:e=>e.radius<=0},Gr=n({default:()=>Jr}),Kr=10,qr=`
    precision highp float;

    varying vec2 vTextureCoord;
    uniform sampler2D uTexture;

    uniform vec2 uCenter;
    uniform float uAmount;

    void main()
    {
        vec2 rel = vTextureCoord - uCenter;

        // Paint.NET bit-shift decay conversion: (fx >> 4) * fZ >> 10  =>  fx * (uAmount / 16384.0)
        float decay = 1.0 - (uAmount / 16384.0);

        vec4 accum = vec4(0.0);
        float count = 0.0;

        // Exact Paint.NET loop count (64 iterations)
        for (int i = 0; i < 64; i++)
        {
            vec2 sampleUV = uCenter + rel;

            // Bounds check (sourceBounds.Contains)
            if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0)
            {
                accum += texture2D(uTexture, sampleUV);
                count += 1.0;
            }

            rel *= decay;
        }

        if (count > 0.0)
        {
            gl_FragColor = accum / count;
        }
        else
        {
            gl_FragColor = vec4(0.0);
        }
    }
`,Jr={label:`Zoom Blur`,icon:`🎯`,params:[{key:`amount`,label:`Amount`,min:0,max:100,step:1,default:Kr},{key:`center`,label:`Center`,kind:`xy`,minX:0,maxX:100,minY:0,maxY:100,step:1,default:50,defaultY:50,yDown:!0}],filter:e=>W(qr,{uCenter:{value:[e.centerX/100,e.centerY/100],type:`vec2<f32>`},uAmount:{value:e.amount,type:`f32`}},0),isNoop:e=>e.amount<=0},Yr=n({default:()=>Qr}),Xr=30,Zr=`
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uAmount;
	uniform float uAspect;

	void main()
	{
		vec2 d = (vTextureCoord - uCenter) * vec2(uAspect, 1.0);
		float r2 = dot(d, d);
		float f = 1.0 - uAmount * (1.0 - r2);
		vec2 s = uCenter + d * f / vec2(uAspect, 1.0);
		finalColor = texture(uTexture, s);
	}
`,Qr={label:`Bulge`,icon:`🔍`,params:[{key:`amount`,label:`Bulge`,min:0,max:100,step:1,default:Xr},{key:`center`,label:`Center`,kind:`xy`,minX:0,maxX:100,minY:0,maxY:100,step:1,default:50,defaultY:50,yDown:!0}],filter:e=>W(Zr,{uCenter:{value:[e.centerX/100,e.centerY/100],type:`vec2<f32>`},uAmount:{value:e.amount*.002,type:`f32`},uAspect:{value:U(),type:`f32`}},0),isNoop:e=>e.amount<=0},$r=n({default:()=>ni}),ei=12,ti=`
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uCellSize;

	float hash(vec2 p)
	{
		return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
	}

	vec2 seed(vec2 cell)
	{
		return cell + vec2(hash(cell), hash(cell + 13.7));
	}

	void main()
	{
		vec2 px = vTextureCoord * uInputSize.xy;
		vec2 cell = floor(px / uCellSize);
		float bestD = 1e9;
		vec2 bestSeed = vec2(0.0);
		for (int x = -1; x <= 1; x++)
		{
			for (int y = -1; y <= 1; y++)
			{
				vec2 c = cell + vec2(float(x), float(y));
				vec2 s = seed(c);
				float d = length(px - s * uCellSize);
				if (d < bestD)
				{
					bestD = d;
					bestSeed = s;
				}
			}
		}
		vec2 uv = bestSeed * uCellSize * uInputSize.zw;
		finalColor = texture(uTexture, uv);
	}
`,ni={label:`Crystalize`,icon:`💎`,params:[{key:`cellSize`,label:`Cell size`,min:2,max:60,step:1,default:ei}],filter:e=>W(ti,{uCellSize:{value:e.cellSize,type:`f32`}},Math.ceil(e.cellSize*1.5)),isNoop:e=>e.cellSize<=1},ri=n({default:()=>oi}),ii=10,ai=`
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uCellSize;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec2 px = vTextureCoord * uInputSize.xy;
		vec2 cellOrigin = floor(px / uCellSize) * uCellSize;

		const int N = 4;
		vec4 acc = vec4(0.0);
		for (int i = 0; i < N; i++)
		{
			for (int j = 0; j < N; j++)
			{
				vec2 off = vec2(float(i), float(j)) * (uCellSize / float(N - 1));
				acc += texture(uTexture, (cellOrigin + off) * texel);
			}
		}
		finalColor = acc / float(N * N);
	}
`,oi={label:`Pixelate`,icon:`🔲`,params:[{key:`cellSize`,label:`Cell size`,min:2,max:60,step:1,default:ii}],filter:e=>W(ai,{uCellSize:{value:e.cellSize,type:`f32`}},Math.ceil(e.cellSize)),isNoop:e=>e.cellSize<=1},si=n({default:()=>li}),ci=`
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAspect;
	uniform vec2 uCenter;

	void main()
	{
		vec2 p = (vTextureCoord - uCenter) * vec2(uAspect, 1.0);
		float r = length(p);
		if (r < 1e-5)
		{
			finalColor = texture(uTexture, vTextureCoord);
			return;
		}
		// Half-diagonal of the frame: a scale, not a strict bound (r2 is clamped
		// below), so it stays sensible when the centre is moved off the middle.
		float maxR = length(vec2(0.5 * uAspect, 0.5));
		float a = atan(p.y, p.x);
		float r2 = clamp(maxR - r, 0.0, maxR);
		vec2 q = vec2(cos(a), sin(a)) * r2 / vec2(uAspect, 1.0) + uCenter;
		finalColor = texture(uTexture, clamp(q, 0.0, 1.0));
	}
`,li={label:`Polar Inversion`,icon:`🌐`,params:[{key:`center`,label:`Center`,kind:`xy`,minX:0,maxX:100,minY:0,maxY:100,step:1,default:50,defaultY:50,yDown:!0}],filter:e=>W(ci,{uAspect:{value:U(),type:`f32`},uCenter:{value:[e.centerX/100,e.centerY/100],type:`vec2<f32>`}},0),isNoop:()=>!1},ui=n({default:()=>pi}),di=40,fi=`
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uStrength;
	uniform float uAspect;

	void main()
	{
		vec2 p = (vTextureCoord - uCenter) * vec2(uAspect, 1.0);
		float r = length(p);
		float f = 1.0 + uStrength * exp(-r * 2.0);
		vec2 s = uCenter + f * p / vec2(uAspect, 1.0);
		finalColor = texture(uTexture, s);
	}
`,pi={label:`Smudge`,icon:`🖱`,params:[{key:`strength`,label:`Strength`,min:-100,max:100,step:1,default:di,centerTick:!0},{key:`center`,label:`Center`,kind:`xy`,minX:0,maxX:100,minY:0,maxY:100,step:1,default:50,defaultY:50,yDown:!0}],filter:e=>W(fi,{uCenter:{value:[e.centerX/100,e.centerY/100],type:`vec2<f32>`},uStrength:{value:e.strength*.02,type:`f32`},uAspect:{value:U(),type:`f32`}},0),isNoop:e=>e.strength===0},mi=n({default:()=>_i}),hi=4,gi=`
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uTileCount;

	float core(float x, float count)
	{
		float t = x * count;
		t = fract(t);
		return 1.0 - abs(2.0 * t - 1.0);
	}

	void main()
	{
		vec2 s = vTextureCoord;
		s.x = core(s.x, uTileCount);
		s.y = core(s.y, uTileCount);
		finalColor = texture(uTexture, s);
	}
`,_i={label:`Tile Reflection`,icon:`🪞`,params:[{key:`tileCount`,label:`Tiles`,min:1,max:12,step:1,default:hi}],filter:e=>W(gi,{uTileCount:{value:e.tileCount,type:`f32`}},0),isNoop:e=>e.tileCount<=1},vi=n({default:()=>wi}),yi=30,bi=100,xi=50,Si=50,Ci=`
    in vec2 vTextureCoord;
    uniform highp vec4 uInputSize;
    uniform sampler2D uTexture;
    out vec4 finalColor;

    uniform vec2 uCenter;
    uniform float uAmount;
    uniform float uRadiusPercentage;

    void main()
    {
        vec2 px = vTextureCoord * uInputSize.xy;
        vec2 center = uCenter * uInputSize.xy;

        float halfWidth = uInputSize.x * 0.5;
        float halfHeight = uInputSize.y * 0.5;
        float radiusBasis = min(halfWidth, halfHeight);
        float maxRadius = radiusBasis * (uRadiusPercentage / 100.0);

        vec2 p = px - center;
        float rSq = dot(p, p);

        // If sample falls outside twist circle, return original pixel
        if (rSq > maxRadius * maxRadius || maxRadius <= 0.0) {
            finalColor = texture(uTexture, vTextureCoord);
            return;
        }

        float r = sqrt(rSq);
        float radialFactor = 1.0 - (r / maxRadius);
        float twistAmount = radialFactor * radialFactor * radialFactor; // Cubic falloff

        float preliminaryTwist = -uAmount;
        float twistSetting = (preliminaryTwist * abs(preliminaryTwist)) / 100.0;
        float localTwist = twistAmount * twistSetting;

        float c = cos(localTwist);
        float s = sin(localTwist);
        mat2 rot = mat2(c, -s, s, c);
        vec2 rotatedP = rot * p;

        vec2 sourcePx = center + rotatedP;
        vec2 sourceUv = sourcePx * uInputSize.zw;

        finalColor = texture(uTexture, sourceUv);
    }
`,wi={label:`Twist`,icon:`🌀`,params:[{key:`amount`,label:`Amount`,min:-100,max:100,step:1,default:yi,centerTick:!0},{key:`radiusPercentage`,label:`Radius Percentage`,min:0,max:100,step:1,default:bi},{key:`center`,label:`Center`,kind:`xy`,minX:0,maxX:100,minY:0,maxY:100,step:1,default:xi,defaultY:Si,yDown:!0}],filter:e=>W(Ci,{uCenter:{value:[e.centerX/100,e.centerY/100],type:`vec2<f32>`},uAmount:{value:e.amount,type:`f32`},uRadiusPercentage:{value:e.radiusPercentage,type:`f32`}},0),isNoop:e=>e.amount===0},Ti=n({default:()=>Oi}),Ei=40,Di=`
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uStrength;
	uniform float uAspect;

	void main()
	{
		vec2 p = (vTextureCoord - uCenter) * vec2(uAspect, 1.0);
		float r2 = dot(p, p);
		float f = 1.0 + uStrength * r2;
		vec2 s = uCenter + f * p / vec2(uAspect, 1.0);
		finalColor = texture(uTexture, s);
	}
`,Oi={label:`Warp`,icon:`🌊`,params:[{key:`strength`,label:`Strength`,min:-100,max:100,step:1,default:Ei,centerTick:!0},{key:`center`,label:`Center`,kind:`xy`,minX:0,maxX:100,minY:0,maxY:100,step:1,default:50,defaultY:50,yDown:!0}],filter:e=>W(Di,{uCenter:{value:[e.centerX/100,e.centerY/100],type:`vec2<f32>`},uStrength:{value:e.strength*.004,type:`f32`},uAspect:{value:U(),type:`f32`}},0),isNoop:e=>e.strength===0},ki=n({default:()=>Mi}),Ai=25,ji=`
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;
    uniform sampler2D uTexture;

    uniform float uAmount;
    uniform float uMonochrome;
    uniform float uSeed;
    uniform float uLinkAlpha;

    // Dave Hoskins "Hash without Sine" (GLSL ES 100 compatible)
    vec3 hash33(vec2 p)
    {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yxz + 33.33);
        return fract((p3.xxy + p3.yzz) * p3.zyx);
    }

    void main()
    {
        vec4 c = texture2D(uTexture, vTextureCoord);
        vec2 px = floor(vTextureCoord * uInputSize.xy);

        // Sample independent noise per pixel in range [-0.5, 0.5]
        vec3 rnd = hash33(px + vec2(uSeed, uSeed * 1.37)) - 0.5;
        vec3 noise = mix(rnd, vec3(rnd.x), uMonochrome);

        if (uLinkAlpha > 0.5)
        {
            // --- LINKED TO ALPHA ---
            // Only apply noise to pixels that already have non-zero alpha
            if (c.a <= 0.0)
            {
                gl_FragColor = vec4(0.0);
                return;
            }

            vec3 straight = c.rgb / c.a;
            float gray = dot(straight, vec3(0.299, 0.587, 0.114));
            vec3 baseColor = mix(straight, vec3(gray), uMonochrome);

            vec3 noisyColor = clamp(baseColor + noise * uAmount, 0.0, 1.0);
            gl_FragColor = vec4(noisyColor * c.a, c.a);
        }
        else
        {
            // --- UNLINKED ---
            // Apply noise everywhere, including transparent areas
            if (c.a <= 0.0)
            {
                // On transparent pixels, generate standalone noise grain scaled by uAmount
                vec3 grainColor = clamp(vec3(0.5) + noise, 0.0, 1.0);
                float grainAlpha = uAmount;
                gl_FragColor = vec4(grainColor * grainAlpha, grainAlpha);
            }
            else
            {
                // On existing artwork pixels, apply noise normally
                vec3 straight = c.rgb / c.a;
                float gray = dot(straight, vec3(0.299, 0.587, 0.114));
                vec3 baseColor = mix(straight, vec3(gray), uMonochrome);

                vec3 noisyColor = clamp(baseColor + noise * uAmount, 0.0, 1.0);
                float outAlpha = max(c.a, uAmount);
                gl_FragColor = vec4(noisyColor * outAlpha, outAlpha);
            }
        }
    }
`,Mi={label:`Add Noise`,icon:`🌫`,params:[{key:`amount`,label:`Amount`,min:0,max:100,step:1,default:Ai},{key:`monochrome`,label:`Monochrome`,min:0,max:100,step:1,default:0},{key:`seed`,label:`Seed`,min:0,max:1e3,step:1,default:123},{key:`linkAlpha`,label:`Link to alpha`,min:0,max:1,step:1,default:1,kind:`checkbox`}],filter:e=>W(ji,{uAmount:{value:e.amount*.01,type:`f32`},uMonochrome:{value:e.monochrome/100,type:`f32`},uSeed:{value:e.seed,type:`f32`},uLinkAlpha:{value:+!!e.linkAlpha,type:`f32`}},0),isNoop:e=>e.amount<=0},Ni=n({default:()=>zi}),Pi=10,Fi=50,Ii=3,J=6,Li=120,Ri=`#version 300 es
precision highp float;

in vec2 vTextureCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform float uRadius;
uniform float uPercentile;

void main()
{
    vec2 texel = uInputSize.zw;

    // Exact half-pixel offsets anchoring bounds to outer pixel centers
    vec2 minUV = 0.5 * texel;
    vec2 maxUV = vec2(1.0) - 0.5 * texel;

    vec2 uv = clamp(vTextureCoord, minUV, maxUV);

    if (uRadius <= 0.0)
    {
        fragColor = texture(uTexture, uv);
        return;
    }

    int r = int(clamp(floor(uRadius + 0.5), 1.0, float(${J})));
    int rSq = r * r;

    vec4 samples[${Li}];
    int totalSamples = 0;

    // Isotropic circular sampling window
    for (int dy = -${J}; dy <= ${J}; dy++)
    {
        if (dy < -r || dy > r) continue;

        for (int dx = -${J}; dx <= ${J}; dx++)
        {
            if (dx < -r || dx > r) continue;

            if ((dx * dx + dy * dy) > rSq) continue;

            // Clamping out-of-bounds coordinates duplicates the outermost image edge pixels
            vec2 sampleUV = clamp(uv + vec2(float(dx), float(dy)) * texel, minUV, maxUV);
            samples[totalSamples] = texture(uTexture, sampleUV);
            totalSamples++;
        }
    }

    if (totalSamples == 0)
    {
        fragColor = texture(uTexture, uv);
        return;
    }

    // Hi-Lo (Binary Search) median over cached samples
    float targetIndex = floor(clamp(uPercentile, 0.0, 1.0) * float(totalSamples - 1));
    float targetThreshold = targetIndex + 0.5;

    vec4 lo = vec4(0.0);
    vec4 hi = vec4(1.0);

    for (int stepIdx = 0; stepIdx < 8; stepIdx++)
    {
        vec4 mid = (lo + hi) * 0.5;
        vec4 count = vec4(0.0);

        for (int i = 0; i < ${Li}; i++)
        {
            if (i >= totalSamples) break;
            count += step(samples[i], mid);
        }

        vec4 ge = step(vec4(targetThreshold), count);
        hi = mix(hi, mid, ge);
        lo = mix(mid, lo, ge);
    }

    fragColor = (lo + hi) * 0.5;
}
`,zi={label:`Median`,icon:`🧂`,params:[{key:`radius`,label:`Radius`,min:1,max:100,step:1,default:Pi},{key:`percentile`,label:`Percentile`,min:0,max:100,step:1,default:Fi},{key:`quality`,label:`Quality`,min:1,max:5,step:1,default:Ii}],filter:e=>{let t=Math.max(0,Math.round(e.radius)),n=(e.percentile??Fi)/100,r=Math.max(1,Math.min(5,e.quality??Ii));if(t<=0)return[];let i=Math.min(J,1+r);if(t<=i)return W(Ri,{uRadius:{value:t,type:`f32`},uPercentile:{value:n,type:`f32`}},0);let a=Math.max(r,Math.ceil(t/i)),o=Math.min(i,Math.max(1,Math.round(t/a))),s=t>20?.5:1,c=[];for(let e=0;e<a;e++){let e=W(Ri,{uRadius:{value:o,type:`f32`},uPercentile:{value:n,type:`f32`}},0);s<1&&(e.resolution=s),c.push(e)}return c},isNoop:e=>e.radius<=0},Bi=n({default:()=>Wi}),Vi=40,Hi=12,Ui=`
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAmount;
	uniform float uThreshold;

	float lum(vec4 c)
	{
		return dot(c.rgb, vec3(0.299, 0.587, 0.114));
	}

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 center = texture(uTexture, vTextureCoord);
		float cl = lum(center);

		float w = 0.0;
		vec4 acc = vec4(0.0);
		for (int gy = -1; gy <= 1; gy++)
		{
			for (int gx = -1; gx <= 1; gx++)
			{
				if (gx == 0 && gy == 0) continue;
				vec2 off = vec2(float(gx), float(gy)) * texel;
				vec4 c = texture(uTexture, clamp(vTextureCoord + off, 0.0, 1.0));
				float d = abs(lum(c) - cl);
				if (d < uThreshold)
				{
					acc += c;
					w += 1.0;
				}
			}
		}
		vec4 smooth = (center + acc) / (1.0 + w);
		finalColor = mix(center, smooth, uAmount);
	}
`,Wi={label:`Reduce Noise`,icon:`🧹`,params:[{key:`amount`,label:`Amount`,min:0,max:100,step:1,default:Vi},{key:`threshold`,label:`Threshold`,min:0,max:100,step:1,default:Hi}],filter:e=>W(Ui,{uAmount:{value:e.amount/100,type:`f32`},uThreshold:{value:e.threshold*.004,type:`f32`}},1),isNoop:e=>e.amount<=0},Gi=n({default:()=>Ji}),Ki=45,qi=`
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform highp vec4 uInputSize;
	uniform float uDepth;
	uniform float uAngle;

	void main()
	{
		vec4 c = texture(uTexture, vTextureCoord);
		if (c.a < 0.01)
		{
			finalColor = c;
			return;
		}

		vec2 px = uInputSize.zw;
		float aR = texture(uTexture, vTextureCoord + vec2(px.x, 0.0)).a;
		float aL = texture(uTexture, vTextureCoord - vec2(px.x, 0.0)).a;
		float aU = texture(uTexture, vTextureCoord + vec2(0.0, px.y)).a;
		float aD = texture(uTexture, vTextureCoord - vec2(0.0, px.y)).a;

		float dx = aR - aL;
		float dy = aU - aD;

		// Light direction in radians.
		float rad = radians(uAngle);
		float lx = cos(rad);
		float ly = sin(rad);

		float lighting = (dx * lx + dy * ly) * uDepth;

		if (lighting > 0.0)
			c.rgb = clamp(c.rgb + lighting * vec3(1.0), 0.0, 1.0);
		else
			c.rgb = clamp(c.rgb + lighting * vec3(0.3, 0.3, 0.4), 0.0, 1.0);

		finalColor = c;
	}
`,Ji={label:`Bevel`,icon:`🔲`,params:[{key:`depth`,label:`Depth`,min:0,max:100,step:1,default:20},{key:`angle`,label:`Light Angle`,min:0,max:360,step:1,default:Ki,kind:`angle`}],filter:e=>W(qi,{uDepth:{value:e.depth/100,type:`f32`},uAngle:{value:90+e.angle,type:`f32`}}),isNoop:e=>e.depth<=0},Yi=n({default:()=>Qi}),Xi=`
    precision highp float;
    in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform sampler2D uTexture;
    uniform highp vec4 uInputSize;
    uniform float uShrink;

    void main()
    {
        vec4 original = texture(uTexture, vTextureCoord);
        float shrink = clamp(uShrink, 0.0, 25.0);

        if (shrink <= 0.001)
        {
            finalColor = original;
            return;
        }

        vec2 px = uInputSize.zw;
        float erodedAlpha = original.a;

        // Direkter, stabiler Loop bis 25 (garantiert keine Aussetzer)
        for (int y = -25; y <= 25; y++)
        {
            float fy = float(y);
            if (abs(fy) > shrink) continue;

            for (int x = -25; x <= 25; x++)
            {
                float fx = float(x);
                if (abs(fx) > shrink) continue;

                // length() sorgt dafür, dass Kreise rund bleiben statt zu Rauten zu werden
                if (length(vec2(fx, fy)) <= shrink)
                {
                    vec2 offset = vec2(fx, fy) * px;
                    float neighborAlpha = texture(uTexture, vTextureCoord + offset).a;
                    erodedAlpha = min(erodedAlpha, neighborAlpha);
                }
            }
        }

        if (erodedAlpha <= 0.0001)
        {
            finalColor = vec4(0.0);
            return;
        }

        // Farb-Invarianz wahren (keine weißen Ränder bei bunten Objekten)
        float ratio = original.a > 0.0001 ? erodedAlpha / original.a : 0.0;
        finalColor = vec4(original.rgb * ratio, erodedAlpha);
    }
`,Zi=`
    precision highp float;
    in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform sampler2D uTexture;
    uniform highp vec4 uInputSize;
    uniform float uBlur;

    void main()
    {
        vec4 original = texture(uTexture, vTextureCoord);
        float radius = clamp(uBlur, 0.0, 25.0);

        if (radius <= 0.001)
        {
            finalColor = original;
            return;
        }

        vec2 px = uInputSize.zw;
        float sigma = max(radius * 0.5, 0.0001);

        float sum = 0.0;
        float weightSum = 0.0;
        vec3 colorSum = vec3(0.0);

        for (int y = -25; y <= 25; y++)
        {
            float fy = float(y);
            if (abs(fy) > radius) continue;

            for (int x = -25; x <= 25; x++)
            {
                float fx = float(x);
                if (abs(fx) > radius) continue;

                float d = length(vec2(fx, fy));
                if (d > radius) continue;

                vec2 offset = vec2(fx, fy) * px;
                vec4 sampleCol = texture(uTexture, vTextureCoord + offset);

                float w = exp(-(d * d) / (2.0 * sigma * sigma));
                sum += sampleCol.a * w;
                colorSum += sampleCol.rgb * w;
                weightSum += w;
            }
        }

        if (weightSum <= 0.0001)
        {
            finalColor = original;
            return;
        }

        float blurredAlpha = sum / weightSum;
        vec3 blurredRgb = colorSum / weightSum;

        // Silhouette nicht über das Original vergrößern
        float finalAlpha = min(blurredAlpha, original.a);

        finalColor = vec4(blurredRgb, finalAlpha);
    }
`,Qi={label:`Feather`,icon:`🪶`,params:[{key:`shrink`,label:`Shrink`,min:0,max:25,step:1,default:0},{key:`blur`,label:`Blur`,min:0,max:25,step:1,default:3}],filter:e=>{let t=e.shrink??0,n=e.blur??0;return[W(Xi,{uShrink:{value:t,type:`f32`}},Math.ceil(t)),W(Zi,{uBlur:{value:n,type:`f32`}},Math.ceil(n))]},isNoop:e=>(e.shrink??0)<=0&&(e.blur??0)<=0},$i=n({default:()=>ta}),ea=`
    in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform sampler2D uTexture;
    uniform highp vec4 uInputSize;
    uniform float uWidth;
    uniform float uBlurRadius;
    uniform vec3 uColor;

    void main()
    {
        vec4 original = texture(uTexture, vTextureCoord);
        vec2 px = uInputSize.zw;
        
        float width = min(max(uWidth, 0.0), 20.0);
        float blur = min(max(uBlurRadius, 0.0), 20.0);
        float maxRadius = width + blur;

        float minDist = 1000.0;

        if (original.a > 0.05)
        {
            minDist = 0.0;
        }
        else if (maxRadius > 0.0)
        {
            int limit = int(ceil(maxRadius));

            // Erweiterter Suchbereich auf -40 bis 40, um Clipping bei maximalem Blur zu verhindern
            for (int x = -40; x <= 40; x++)
            {
                float fx = float(x);
                if (abs(fx) > float(limit)) continue;

                for (int y = -40; y <= 40; y++)
                {
                    float fy = float(y);
                    if (abs(fy) > float(limit)) continue;

                    vec2 off = vec2(fx, fy) * px;
                    vec2 sampleCoord = vTextureCoord + off;

                    if (sampleCoord.x >= 0.0 && sampleCoord.x <= 1.0 && sampleCoord.y >= 0.0 && sampleCoord.y <= 1.0)
                    {
                        float neighborAlpha = texture(uTexture, sampleCoord).a;
                        if (neighborAlpha > 0.05)
                        {
                            float dist = length(vec2(fx, fy));
                            minDist = min(minDist, dist);
                        }
                    }
                }
            }
        }

        // Hintergrund-Füllung und Blur-Halo
        vec4 background = vec4(0.0);
        if (minDist <= maxRadius)
        {
            float alpha = 1.0;
            
            if (minDist > width && blur > 0.0)
            {
                float t = (minDist - width) / blur;
                alpha = 1.0 - smoothstep(0.0, 1.0, t);
            }

            background = vec4(uColor * alpha, alpha);
        }

        // Saubere Komposition: Original im Vordergrund, Outline im Hintergrund
        finalColor = original + background * (1.0 - original.a);
    }
`,ta={label:`Outline`,icon:`⬜`,params:[{key:`width`,label:`Width`,min:1,max:20,step:1,default:3},{key:`color`,label:`Color`,min:0,max:16777215,step:1,default:0,kind:`color`},{key:`blurRadius`,label:`Blur radius`,min:0,max:20,step:1,default:0}],filter:e=>{let t=e.width??3,n=e.blurRadius??0,r=Math.max(0,Math.floor(e.color??0))&16777215,i=Math.ceil(t+n);return W(ea,{uWidth:{value:t,type:`f32`},uBlurRadius:{value:n,type:`f32`},uColor:{value:[(r>>16&255)/255,(r>>8&255)/255,(r&255)/255],type:`vec3<f32>`}},i)},isNoop:e=>(e.width??0)<=0&&(e.blurRadius??0)<=0},na=n({default:()=>ia}),ra=`
    precision highp float;
    in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform sampler2D uTexture;
    uniform highp vec4 uInputSize;
    uniform float uOffsetX;
    uniform float uOffsetY;
    uniform float uBlur;
    uniform vec3 uColor;
    uniform float uIntensity;

    void main()
    {
        vec4 original = texture(uTexture, vTextureCoord);
        vec2 px = uInputSize.zw;

        // Versatz für den Schatten anwenden
        vec2 samplePos = vTextureCoord - vec2(uOffsetX, uOffsetY) * px;
        
        float blurredA = 0.0;
        float count = 0.0;
        float r = min(uBlur, 20.0);
        int limitR = int(ceil(r));

        // Erwiterter Loop für sauberen Blur bis zu 20px
        for (int y = -20; y <= 20; y++)
        {
            if (abs(float(y)) > float(limitR)) continue;
            for (int x = -20; x <= 20; x++)
            {
                if (abs(float(x)) > float(limitR)) continue;

                vec2 off = vec2(float(x), float(y)) * px;
                blurredA += texture(uTexture, samplePos + off).a;
                count += 1.0;
            }
        }
        blurredA /= max(count, 1.0);

        float shadowA = blurredA * uIntensity;
        vec4 shadow = vec4(uColor * shadowA, shadowA);

        // Saubere Alpha-Komposition: Original im Vordergrund, Schatten im Hintergrund
        finalColor = original + shadow * (1.0 - original.a);
    }
`,ia={label:`Drop Shadow`,icon:`⬛`,params:[{key:`offset`,label:`Offset`,kind:`xy`,minX:-50,maxX:50,minY:-50,maxY:50,step:1,default:4,defaultY:4,yDown:!0},{key:`blur`,label:`Blur Radius`,min:0,max:20,step:1,default:4},{key:`color`,label:`Color`,min:0,max:16777215,step:1,default:0,kind:`color`},{key:`intensity`,label:`Opacity`,min:0,max:255,step:1,default:128}],filter:e=>{let t=e.offsetX??4,n=e.offsetY??4,r=e.blur??4,i=Math.max(0,Math.floor(e.color??0))&16777215,a=Math.ceil(Math.max(Math.abs(t),Math.abs(n))+r);return W(ra,{uOffsetX:{value:t,type:`f32`},uOffsetY:{value:n,type:`f32`},uBlur:{value:r,type:`f32`},uColor:{value:[(i>>16&255)/255,(i>>8&255)/255,(i&255)/255],type:`vec3<f32>`},uIntensity:{value:(e.intensity??128)/255,type:`f32`}},a)},isNoop:e=>(e.intensity??128)<=0},aa=n({default:()=>ua}),oa=6,sa=10,ca=10,la=`
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;
    uniform sampler2D uTexture;

    uniform float uRadius;
    uniform float uBrightness;
    uniform float uContrast;

    // Multi-ring Gaussian sample disk
    vec4 getBlurred(vec2 uv, vec2 texel, float radius)
    {
        vec4 accum = texture2D(uTexture, uv);
        float total = 1.0;
        float rStep = max(radius * 0.4, 0.5);

        for (int i = 0; i < 8; i++)
        {
            float angle = float(i) * 0.78539816339; // PI / 4
            vec2 dir = vec2(cos(angle), sin(angle));

            // Inner Ring
            accum += texture2D(uTexture, uv + dir * rStep * texel) * 0.6;
            total += 0.6;

            // Outer Ring
            accum += texture2D(uTexture, uv + dir * rStep * 2.0 * texel) * 0.3;
            total += 0.3;
        }

        return accum / total;
    }

    void main()
    {
        vec4 src = texture2D(uTexture, vTextureCoord);

        if (src.a <= 0.0)
        {
            gl_FragColor = vec4(0.0);
            return;
        }

        // 1. Gaussian Blur Pass
        vec4 blurred = getBlurred(vTextureCoord, uInputSize.zw, uRadius);

        // Safely un-premultiply straight color
        vec3 srcRGB = src.rgb / src.a;
        vec3 blurRGB = blurred.a > 0.0 ? blurred.rgb / blurred.a : vec3(0.0);

        // 2. Brightness & Contrast Adjustment
        float cFactor = uContrast >= 0.0 ? (1.0 + uContrast * 2.0) : (1.0 + uContrast);
        vec3 adjustedGlow = clamp((blurRGB - 0.5) * cFactor + 0.5 + uBrightness, 0.0, 1.0);

        // 3. Screen Blend Op: 1.0 - (1.0 - Src) * (1.0 - Glow)
        vec3 screenRGB = 1.0 - (1.0 - srcRGB) * (1.0 - adjustedGlow);

        // Re-premultiply by original alpha
        gl_FragColor = vec4(screenRGB * src.a, src.a);
    }
`,ua={label:`Glow`,icon:`💡`,params:[{key:`radius`,label:`Radius`,min:1,max:20,step:1,default:oa},{key:`brightness`,label:`Brightness`,min:-100,max:100,step:1,default:sa,centerTick:!0},{key:`contrast`,label:`Contrast`,min:-100,max:100,step:1,default:ca,centerTick:!0}],filter:e=>W(la,{uRadius:{value:e.radius,type:`f32`},uBrightness:{value:e.brightness/100,type:`f32`},uContrast:{value:e.contrast/100,type:`f32`}},Math.ceil(e.radius)),isNoop:e=>e.radius<=0||e.brightness===0&&e.contrast===0},da=n({default:()=>ma}),fa=80,pa=`
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uStrength;

	float redness(vec3 c)
	{
		return c.r - max(c.g, c.b);
	}

	void main()
	{
		vec4 c = texture(uTexture, vTextureCoord);
		float r = redness(c.rgb);
		float isRed = step(0.25, r) * step(c.r, 0.65);
		if (isRed > 0.5)
		{
			vec3 corrected = vec3(0.45, 0.40, 0.38) * c.r;
			vec3 target = mix(c.rgb, corrected, isRed * uStrength);
			float bright = dot(target, vec3(0.299, 0.587, 0.114));
			target *= mix(1.0, 0.55, uStrength);
			target = max(target, 0.0);
			finalColor = vec4(mix(c.rgb, target, uStrength), c.a);
		}
		else
		{
			finalColor = c;
		}
	}
`,ma={label:`Red Eye Removal`,icon:`👁`,params:[{key:`strength`,label:`Strength`,min:0,max:100,step:1,default:fa}],filter:e=>W(pa,{uStrength:{value:e.strength/100,type:`f32`}},0),isNoop:e=>e.strength<=0},ha=n({default:()=>va}),ga=50,_a=`
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAmount;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 c = texture(uTexture, vTextureCoord);

		vec4 acc = vec4(0.0);
		acc += texture(uTexture, vTextureCoord + texel * vec2(-1.0, -1.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(0.0, -1.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(1.0, -1.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(-1.0, 0.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(1.0, 0.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(-1.0, 1.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(0.0, 1.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(1.0, 1.0));

		vec4 blurred = acc / 8.0;
		finalColor = max(c + (c - blurred) * uAmount, 0.0);
	}
`,va={label:`Sharpen`,icon:`💠`,params:[{key:`amount`,label:`Amount`,min:0,max:200,step:1,default:ga}],filter:e=>W(_a,{uAmount:{value:e.amount*.02,type:`f32`}},1),isNoop:e=>e.amount<=0},ya=n({default:()=>Sa}),ba=40,xa=`
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uStrength;

	void main()
	{
		vec2 texel = uInputSize.zw;
		float r = 1.0 + uStrength * 2.0;
		vec4 c = texture(uTexture, vTextureCoord);

		vec4 acc = vec4(0.0);
		float total = 0.0;
		for (int y = -2; y <= 2; y++)
		{
			for (int x = -2; x <= 2; x++)
			{
				vec2 off = vec2(float(x), float(y)) * texel * r;
				float d = float(x * x + y * y);
				float w = exp(-d * 0.8);
				acc += texture(uTexture, clamp(vTextureCoord + off, 0.0, 1.0)) * w;
				total += w;
			}
		}
		vec4 smooth = acc / max(total, 1e-5);
		vec4 outC = mix(smooth, c, 0.35);
		float sl = dot(smooth.rgb, vec3(0.299, 0.587, 0.114));
		float cl = dot(c.rgb, vec3(0.299, 0.587, 0.114));
		outC.a = c.a;
		finalColor = mix(c, outC, uStrength);
	}
`,Sa={label:`Soften Portrait`,icon:`🛁`,params:[{key:`strength`,label:`Strength`,min:0,max:100,step:1,default:ba}],filter:e=>W(xa,{uStrength:{value:e.strength/100,type:`f32`}},3),isNoop:e=>e.strength<=0},Ca=n({default:()=>Oa}),wa=250,Ta=50,Ea=0,Da=`
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;

    uniform float uScale;
    uniform float uPower;
    uniform float uSeed;

    // Quintic interpolation curve (Paint.NET standard)
    vec2 fade(vec2 t)
    {
        return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }

    // 8 discrete gradient directions matching Paint.NET's permutation table
    vec2 getGradient(vec2 p, float octaveSeed)
    {
        // Safe integer wrapping (mod 256) without float precision loss
        vec2 ip = mod(mod(p, 256.0) + 256.0, 256.0);
        float h = fract(sin(dot(ip, vec2(127.1, 311.7)) + octaveSeed) * 43758.5453123);
        
        // Snap to 8 exact directional angles (PI / 4 steps)
        float angle = floor(h * 8.0) * 0.78539816339;
        return vec2(cos(angle), sin(angle));
    }

    // Classic 2D Perlin noise without edge artifacts
    float perlinNoise(vec2 p, float octaveSeed)
    {
        vec2 i = floor(p);
        vec2 f = fract(p);

        vec2 g00 = getGradient(i + vec2(0.0, 0.0), octaveSeed);
        vec2 g10 = getGradient(i + vec2(1.0, 0.0), octaveSeed);
        vec2 g01 = getGradient(i + vec2(0.0, 1.0), octaveSeed);
        vec2 g11 = getGradient(i + vec2(1.0, 1.0), octaveSeed);

        float n00 = dot(g00, f - vec2(0.0, 0.0));
        float n10 = dot(g10, f - vec2(1.0, 0.0));
        float n01 = dot(g01, f - vec2(0.0, 1.0));
        float n11 = dot(g11, f - vec2(1.0, 1.0));

        vec2 u = fade(f);

        return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
    }

    void main()
    {
        // Centered coordinate space: dx = 2*X - Width, dy = 2*Y - Height
        vec2 canvasPos = vTextureCoord * uInputSize.xy;
        vec2 d = 2.0 * canvasPos - uInputSize.xy;

        float val = 0.0;
        float mult = 1.0;
        float div = max(uScale, 1.0);

        for (int i = 0; i < 12; i++)
        {
            if (mult <= 0.03 || div <= 0.0)
            {
                break;
            }

            // High-precision division without 65536.0 offset
            vec2 dr = d / div;

            // Seed per octave (matches Pinta byte-xor variation)
            float octaveSeed = uSeed + float(i) * 17.13;

            float noise = perlinNoise(dr, octaveSeed);

            val += noise * mult;
            div /= 2.0;
            mult *= uPower;
        }

        // Map noise range [-1, 1] -> [0, 1]
        float t = clamp((val + 1.0) * 0.5, 0.0, 1.0);

        // Sky Blue / White cloud gradient mapping
        vec3 colBg = vec3(1.0, 1.0, 1.0);
        vec3 colFg = vec3(0.0, 0.4, 0.8);
        vec3 finalCol = mix(colBg, colFg, t);

        gl_FragColor = vec4(finalCol, 1.0);
    }
`,Oa={label:`Clouds`,icon:`☁️`,params:[{key:`scale`,label:`Scale`,min:2,max:1e3,step:1,default:wa},{key:`power`,label:`Power`,min:0,max:100,step:1,default:Ta},{key:`seed`,label:`Seed`,min:0,max:255,step:1,default:Ea}],filter:e=>W(Da,{uScale:{value:e.scale,type:`f32`},uPower:{value:e.power/100,type:`f32`},uSeed:{value:e.seed,type:`f32`}},0),isNoop:()=>!1},ka=n({default:()=>Na}),Aa=8,ja=123,Ma=`
	in vec2 vTextureCoord;
	out vec4 finalColor;
${On}

	uniform float uScale;
	uniform float uSeed;

	vec3 ramp(float t)
	{
		vec3 blue = vec3(0.05, 0.05, 0.45);
		vec3 mid = vec3(0.9, 0.45, 0.05);
		vec3 yellow = vec3(1.0, 0.95, 0.6);
		vec3 c = mix(blue, mid, smoothstep(0.0, 0.5, t));
		c = mix(c, yellow, smoothstep(0.5, 1.0, t));
		return c;
	}

	void main()
	{
		vec2 p = vTextureCoord * uScale + vec2(uSeed * 0.03, 0.0);
		vec2 q = p + vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
		float n = fbm(q);
		float rise = 1.0 - vTextureCoord.y;
		float t = clamp(n * 1.2 + rise * 0.55 - 0.15, 0.0, 1.0);
		finalColor = vec4(ramp(t), 1.0);
	}
`,Na={label:`Flames`,icon:`🔥`,params:[{key:`scale`,label:`Scale`,min:1,max:40,step:1,default:Aa},{key:`seed`,label:`Seed`,min:0,max:1e3,step:1,default:ja}],filter:e=>W(Ma,{uScale:{value:e.scale,type:`f32`},uSeed:{value:e.seed,type:`f32`}},0),isNoop:()=>!1},Pa=n({default:()=>Ba}),Fa=64,Ia=1,La=50,Ra=50,za=`
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform float uIterations;
	uniform float uZoom;
	uniform vec2 uCenter;
	uniform float uAspect;

	void main()
	{
		vec2 p = (vTextureCoord - vec2(0.5)) * vec2(uAspect, 1.0) / uZoom + uCenter;
		vec2 z = p;
		const vec2 c = vec2(-0.8, 0.156);
		int iters = 0;
		for (int i = 0; i < 150; i++)
		{
			if (dot(z, z) > 4.0) break;
			z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
			iters = i + 1;
		}
		float t = clamp(float(iters) / uIterations, 0.0, 1.0);
		vec3 col = mix(vec3(0.02, 0.02, 0.08), vec3(0.95, 0.55, 0.15), sqrt(t));
		col = mix(col, vec3(0.2, 0.0, 0.55), t * t);
		finalColor = vec4(col, 1.0);
	}
`,Ba={label:`Julia Fractal`,icon:`🌀`,params:[{key:`iterations`,label:`Iterations`,min:1,max:150,step:1,default:Fa},{key:`zoom`,label:`Zoom`,min:1,max:200,step:1,default:Ia},{key:`center`,label:`Center`,kind:`xy`,minX:-100,maxX:100,minY:-100,maxY:100,step:1,default:La,defaultY:Ra}],filter:e=>W(za,{uIterations:{value:e.iterations,type:`f32`},uZoom:{value:e.zoom,type:`f32`},uCenter:{value:[e.centerX/100,e.centerY/100],type:`vec2<f32>`},uAspect:{value:U(),type:`f32`}},0),isNoop:e=>e.iterations<=1},Va=n({default:()=>qa}),Ha=1,Ua=2,Wa=10,Ga=0,Ka=`
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;

    uniform float uFactor;
    uniform float uQuality;
    uniform float uZoom;
    uniform float uAngle;
    uniform vec2 uOffset;
    uniform float uInvert;

    // Smooth escape-time calculation with bailout radius 100,000 (Paint.NET standard)
    float calcMandelbrot(vec2 c)
    {
        vec2 z = vec2(0.0);
        float iter = 0.0;
        
        for (int i = 0; i < 256; i++)
        {
            if (dot(z, z) > 100000.0)
            {
                break;
            }
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            iter += 1.0;
        }

        if (iter >= 256.0)
        {
            return -1.0; // Inside set
        }

        // Renormalized continuous potential (eliminates color banding)
        float log_zn = log(dot(z, z)) / 2.0;
        float nu = log(log_zn / 0.69314718056) / 0.69314718056;
        return iter + 1.0 - nu;
    }

    // Paint.NET "Electric" preset color mapping
    vec3 getColor(float m, float factor)
    {
        if (m < 0.0)
        {
            return vec3(0.0); // Interior pure black
        }

        float c = clamp(64.0 + factor * m * 8.0, 0.0, 1023.0) / 1023.0;
        
        // Multi-stop electric gradient cyclic map
        vec3 col = 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 1.0, 1.0) * c + vec3(0.0, 0.33, 0.67)));
        return col;
    }

    void main()
    {
        // Paint.NET coordinate setup: (2*X - Width) / Height
        vec2 canvasPos = vTextureCoord * uInputSize.xy;
        vec2 baseUV = (2.0 * canvasPos - uInputSize.xy) / uInputSize.y;

        // Rotation matrix
        float rad = uAngle * 0.01745329251; // Degrees to radians
        mat2 rot = mat2(cos(rad), sin(rad), -sin(rad), cos(rad));

        float effectiveZoom = 1.0 + 20.0 * (uZoom / 100.0);
        vec2 offsetBasis = vec2(-0.7, -0.29) + uOffset;

        vec3 colorAcc = vec3(0.0);
        float samples = uQuality > 1.0 ? 4.0 : 1.0;

        // 2x2 Sub-pixel Anti-Aliasing grid if Quality > 1
        for (int sx = 0; sx < 2; sx++)
        {
            for (int sy = 0; sy < 2; sy++)
            {
                if (samples == 1.0 && (sx > 0 || sy > 0)) continue;

                vec2 subOffset = samples > 1.0 
                    ? (vec2(float(sx), float(sy)) - 0.5) * (1.0 / uInputSize.y) 
                    : vec2(0.0);

                vec2 rel = baseUV + subOffset;
                vec2 rotatedRel = rot * rel;
                vec2 c = (rotatedRel / effectiveZoom) + offsetBasis;

                float m = calcMandelbrot(c);
                colorAcc += getColor(m, uFactor);
            }
        }

        vec3 finalCol = colorAcc / samples;

        // Apply color inversion if enabled
        if (uInvert > 0.5)
        {
            finalCol = vec3(1.0) - finalCol;
        }

        gl_FragColor = vec4(finalCol, 1.0);
    }
`,qa={label:`Mandelbrot Fractal`,icon:`🪸`,params:[{key:`offset`,label:`Offset`,kind:`xy`,minX:-2,maxX:2,minY:-2,maxY:2,step:.01,default:0,defaultY:0},{key:`zoom`,label:`Zoom`,min:0,max:100,step:.5,default:Wa},{key:`angle`,label:`Angle`,min:0,max:360,step:1,default:Ga,kind:`angle`},{key:`factor`,label:`Factor`,min:1,max:10,step:1,default:Ha},{key:`quality`,label:`Quality`,min:1,max:2,step:1,default:Ua},{key:`invertColors`,label:`Invert Colors`,kind:`checkbox`,min:0,max:1,step:1,default:0}],filter:e=>W(Ka,{uFactor:{value:e.factor,type:`f32`},uQuality:{value:e.quality,type:`f32`},uZoom:{value:e.zoom,type:`f32`},uAngle:{value:e.angle,type:`f32`},uOffset:{value:[e.offsetX??0,e.offsetY??0],type:`vec2<f32>`},uInvert:{value:+!!e.invertColors,type:`f32`}},0),isNoop:()=>!1},Ja=n({default:()=>Qa}),Ya=4,Xa=123,Za=`
	in vec2 vTextureCoord;
	out vec4 finalColor;
${On}

	uniform float uScale;
	uniform float uSeed;

	void main()
	{
		vec2 warp = vTextureCoord * (uScale * 3.0) + vec2(uSeed * 0.05, 0.0);
		vec2 off = vec2(fbm(warp), fbm(warp + vec2(6.3, 4.1))) - 0.5;
		vec2 q = vTextureCoord + off * (0.35 / uScale);
		float n = fbm(q * uScale + vec2(uSeed * 0.05, 0.0));
		vec3 col = vec3(0.45) + n * vec3(0.0, 0.15, 0.3);
		finalColor = vec4(col * (0.6 + 0.4 * n), 1.0);
	}
`,Qa={label:`Turbulence`,icon:`🌪`,params:[{key:`scale`,label:`Scale`,min:1,max:40,step:1,default:Ya},{key:`seed`,label:`Seed`,min:0,max:1e3,step:1,default:Xa}],filter:e=>W(Za,{uScale:{value:e.scale,type:`f32`},uSeed:{value:e.seed,type:`f32`}},0),isNoop:e=>e.scale<=1},$a=n({default:()=>no}),eo=`#version 300 es
    precision highp float;

    in vec2 vTextureCoord;
    uniform sampler2D uTexture;
    uniform vec4 uInputSize;
    uniform float uBlurRadius;

    out vec4 finalColor;

    void main() {
        vec2 texel = uInputSize.zw;
        vec2 minUV = 0.5 * texel;
        vec2 maxUV = vec2(1.0) - 0.5 * texel;
        vec2 uv = clamp(vTextureCoord, minUV, maxUV);

        float r = max(0.0, uBlurRadius);
        if (r <= 0.0) {
            finalColor = texture(uTexture, uv);
            return;
        }

        vec4 acc = vec4(0.0);
        float totalWeight = 0.0;
        int ir = int(ceil(r));

        // Gaußscher Abtastkern für weiche, korrekte Übergänge
        for (int dy = -12; dy <= 12; dy++) {
            if (abs(dy) > ir) continue;
            for (int dx = -12; dx <= 12; dx++) {
                if (abs(dx) > ir) continue;

                float dist = sqrt(float(dx * dx + dy * dy));
                if (dist > r) continue;

                // Gauß-Formel für natürliche Weichzeichnung
                float sigma = max(0.5, r * 0.5);
                float weight = exp(-(dist * dist) / (2.0 * sigma * sigma));

                vec2 sampleUV = clamp(uv + vec2(float(dx), float(dy)) * texel, minUV, maxUV);
                acc += texture(uTexture, sampleUV) * weight;
                totalWeight += weight;
            }
        }

        finalColor = totalWeight > 0.0 ? acc / totalWeight : texture(uTexture, uv);
    }
`,to=`#version 300 es
    precision highp float;
    in vec2 vTextureCoord;
    uniform sampler2D uTexture;
    uniform vec4 uInputSize;
    
    uniform float uMode;     // 0 = Cosine (Paint.NET), 1 = Sobel
    uniform float uAngle;    // Nur für Cosine Mode
    uniform float uBlackBg;  // 1.0 = Schwarzer Hintergrund
    uniform float uBwOnly;   // 1.0 = Nur Schwarz-Weiß
    uniform float uRadius;   // Kanten-Radius

    out vec4 finalColor;

    float lum(vec3 c)
    {
        return dot(c, vec3(0.299, 0.587, 0.114));
    }

    void main()
    {
        vec2 texel = uInputSize.zw;

        vec2 minUV = 0.5 * texel;
        vec2 maxUV = vec2(1.0) - 0.5 * texel;
        vec2 uv = clamp(vTextureCoord, minUV, maxUV);

        vec4 src = texture(uTexture, uv);
        if (src.a <= 0.0001)
        {
            finalColor = vec4(0.0);
            return;
        }

        float r = max(1.0, floor(uRadius + 0.5));

        vec2 uv00 = clamp(uv + vec2(-r, -r) * texel, minUV, maxUV);
        vec2 uv01 = clamp(uv + vec2( 0.0, -r) * texel, minUV, maxUV);
        vec2 uv02 = clamp(uv + vec2( r, -r) * texel, minUV, maxUV);

        vec2 uv10 = clamp(uv + vec2(-r,  0.0) * texel, minUV, maxUV);
        vec2 uv12 = clamp(uv + vec2( r,  0.0) * texel, minUV, maxUV);

        vec2 uv20 = clamp(uv + vec2(-r,  r) * texel, minUV, maxUV);
        vec2 uv21 = clamp(uv + vec2( 0.0,  r) * texel, minUV, maxUV);
        vec2 uv22 = clamp(uv + vec2( r,  r) * texel, minUV, maxUV);

        vec3 c00 = texture(uTexture, uv00).rgb;
        vec3 c01 = texture(uTexture, uv01).rgb;
        vec3 c02 = texture(uTexture, uv02).rgb;
        vec3 c10 = texture(uTexture, uv10).rgb;
        vec3 c12 = texture(uTexture, uv12).rgb;
        vec3 c20 = texture(uTexture, uv20).rgb;
        vec3 c21 = texture(uTexture, uv21).rgb;
        vec3 c22 = texture(uTexture, uv22).rgb;

        vec3 result = vec3(0.5);

        if (uMode < 0.5)
        {
            float angleRad = uAngle * 0.017453292519943295;
            const float DELTA = 0.7853981633974483;

            float w00 = cos(angleRad + DELTA);
            float w01 = cos(angleRad + 2.0 * DELTA);
            float w02 = cos(angleRad + 3.0 * DELTA);
            float w10 = cos(angleRad);
            float w12 = cos(angleRad + 4.0 * DELTA);
            float w20 = cos(angleRad - DELTA);
            float w21 = cos(angleRad - 2.0 * DELTA);
            float w22 = cos(angleRad - 3.0 * DELTA);

            vec3 acc = vec3(0.0);
            acc += c00 * w00 + c01 * w01 + c02 * w02;
            acc += c10 * w10             + c12 * w12;
            acc += c20 * w20 + c21 * w21 + c22 * w22;

            if (uBlackBg > 0.5)
            {
                result = abs(acc);
            }
            else
            {
                result = vec3(0.5) + acc;
            }
        }
        else
        {
            vec3 gx = -c00 - 2.0 * c10 - c20 + c02 + 2.0 * c12 + c22;
            vec3 gy = -c00 - 2.0 * c01 - c02 + c20 + 2.0 * c21 + c22;
            vec3 mag = sqrt(gx * gx + gy * gy);

            if (uBlackBg > 0.5)
            {
                result = mag;
            }
            else
            {
                result = vec3(0.5) + mag * 0.5;
            }
        }

        result = clamp(result, 0.0, 1.0);

        if (uBwOnly > 0.5)
        {
            if (uBlackBg > 0.5)
            {
                float l = lum(result);
                result = vec3(l);
            }
            else
            {
                float mono = lum(result - vec3(0.5)) + 0.5;
                result = vec3(mono);
            }
        }

        finalColor = vec4(result * src.a, src.a);
    }
`,no={label:`Edge Detect`,icon:`🔲`,params:[{key:`mode`,label:`Algorithm`,kind:`select`,options:[{label:`Cosine (Paint.NET)`,value:0},{label:`Sobel`,value:1}],default:0},{key:`angle`,label:`Angle`,kind:`angle`,min:0,max:360,step:1,default:45},{key:`radius`,label:`Edge Radius`,min:1,max:10,step:1,default:1},{key:`blur`,label:`Pre-Blur`,min:0,max:10,step:1,default:0},{key:`blackBg`,label:`Black Background`,kind:`checkbox`,default:0},{key:`bwOnly`,label:`Black & White Only`,kind:`checkbox`,default:0}],filter:e=>{let t=e.radius??1,n=e.blur??0,r=[];return n>0&&r.push(W(eo,{uBlurRadius:{value:n,type:`f32`}},0)),r.push(W(to,{uMode:{value:e.mode??0,type:`f32`},uAngle:{value:e.angle??45,type:`f32`},uBlackBg:{value:+!!e.blackBg,type:`f32`},uBwOnly:{value:+!!e.bwOnly,type:`f32`},uRadius:{value:t,type:`f32`}},0)),r},isNoop:e=>(e.radius??1)<=0&&(e.blur??0)<=0},ro=n({default:()=>so}),io=315,ao=70,oo=`
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAngle;
	uniform float uStrength;

	float lum(vec4 c)
	{
		return dot(c.rgb, vec3(0.299, 0.587, 0.114));
	}

	void main()
	{
		vec2 t = uInputSize.zw;
		vec2 d = vec2(cos(uAngle), sin(uAngle));
		float hi = lum(texture(uTexture, vTextureCoord + d * t));
		float lo = lum(texture(uTexture, vTextureCoord - d * t));
		float e = (hi - lo) * uStrength + 0.5;
		finalColor = vec4(vec3(clamp(e, 0.0, 1.0)), 1.0);
	}
`,so={label:`Emboss`,icon:`🏔`,params:[{key:`angle`,label:`Angle`,kind:`angle`,min:0,max:360,step:1,default:io},{key:`strength`,label:`Strength`,min:0,max:100,step:1,default:ao}],filter:e=>W(oo,{uAngle:{value:(90+e.angle)*Math.PI/180,type:`f32`},uStrength:{value:1.5*(e.strength/100)+.1,type:`f32`}},1),isNoop:e=>e.strength<=0},co=n({default:()=>po}),lo=30,uo=2,fo=`
    precision highp float;
    in vec2 vTextureCoord;
    uniform highp vec4 uInputSize;
    uniform sampler2D uTexture;
    out vec4 finalColor;

    uniform float uThreshold;
    uniform float uThickness;

    float lum(vec4 c)
    {
        return dot(c.rgb, vec3(0.299, 0.587, 0.114));
    }

    float edgeAt(vec2 uv)
    {
        vec2 t = uInputSize.zw;
        vec4 sCenter = texture(uTexture, uv);
        
        // Ignore fully transparent background pixels
        if (sCenter.a <= 0.001) return 0.0;

        vec4 sa = texture(uTexture, uv + vec2(-t.x, -t.y));
        vec4 sb = texture(uTexture, uv + vec2(t.x, -t.y));
        vec4 sc = texture(uTexture, uv + vec2(-t.x, t.y));
        vec4 sd = texture(uTexture, uv + vec2(t.x, t.y));

        // Luminance gradients (internal details)
        float gx = lum(sa) - lum(sd);
        float gy = lum(sc) - lum(sb);
        float grad = length(vec2(gx, gy)) * 2.0;

        // Alpha gradients (silhouette edges)
        float ax = sa.a - sd.a;
        float ay = sc.a - sb.a;
        float alphaGrad = length(vec2(ax, ay));

        return max(grad, alphaGrad);
    }

    void main()
    {
        vec2 texel = uInputSize.zw;
        vec4 src = texture(uTexture, vTextureCoord);
        
        float thick = clamp(uThickness, 1.0, 8.0);
        int limit = int(ceil(thick));

        float isEdge = 0.0;

        for (int y = -8; y <= 8; y++)
        {
            if (abs(float(y)) > thick) continue;
            for (int x = -8; x <= 8; x++)
            {
                if (abs(float(x)) > thick) continue;

                vec2 off = vec2(float(x), float(y));
                if (length(off) > thick) continue;

                if (edgeAt(vTextureCoord + off * texel) > uThreshold * 0.01)
                {
                    isEdge = 1.0;
                    break;
                }
            }
            if (isEdge > 0.5) break;
        }

        // Dark charcoal ink color
        vec3 inkRgb = vec3(0.04, 0.03, 0.03);

        if (isEdge > 0.5)
        {
            // Clean premultiplied alpha output for the outline
            float outAlpha = max(src.a, 0.9);
            finalColor = vec4(inkRgb * outAlpha, outAlpha);
        }
        else
        {
            finalColor = src;
        }
    }
`,po={label:`Ink Outline`,icon:`✒️`,params:[{key:`threshold`,label:`Threshold`,min:0,max:100,step:1,default:lo},{key:`thickness`,label:`Thickness`,min:1,max:8,step:1,default:uo}],filter:e=>W(fo,{uThreshold:{value:e.threshold??lo,type:`f32`},uThickness:{value:e.thickness??uo,type:`f32`}},Math.ceil(e.thickness??uo)),isNoop:e=>(e.threshold??lo)<=0},mo=n({}),ho=n({default:()=>yo}),go=135,_o=80,vo=`
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAngle;
	uniform float uStrength;

	float lum(vec4 c)
	{
		return dot(c.rgb, vec3(0.299, 0.587, 0.114));
	}

	void main()
	{
		vec2 t = uInputSize.zw;
		float l00 = lum(texture(uTexture, vTextureCoord + vec2(-t.x, -t.y)));
		float l10 = lum(texture(uTexture, vTextureCoord + vec2(t.x, -t.y)));
		float l01 = lum(texture(uTexture, vTextureCoord + vec2(-t.x, t.y)));
		float l11 = lum(texture(uTexture, vTextureCoord + vec2(t.x, t.y)));
		float dlx = (l10 + l11 - l00 - l01) * 0.5;
		float dly = (l01 + l11 - l00 - l10) * 0.5;

		vec3 n = normalize(vec3(-dlx * uStrength, -dly * uStrength, 1.0));
		vec3 lightDir = normalize(vec3(cos(uAngle), sin(uAngle), 0.6));
		float shade = dot(n, lightDir) * 0.5 + 0.5;
		float base = clamp(0.55 + shade * 0.45, 0.0, 1.0);
		finalColor = vec4(vec3(base * 0.72, base * 0.70, base * 0.66), 1.0);
	}
`,yo={label:`Relief`,icon:`🗿`,params:[{key:`angle`,label:`Angle`,kind:`angle`,min:0,max:360,step:1,default:go},{key:`strength`,label:`Strength`,min:0,max:100,step:1,default:_o}],filter:e=>W(vo,{uAngle:{value:(e.angle-90)*Math.PI/180,type:`f32`},uStrength:{value:.08+2.6*(e.strength/100),type:`f32`}},1),isNoop:e=>e.strength<=0},bo=[`blurs`,`distort`,`noise`,`photo`,`render`,`stylize`];function xo(e){return e.charAt(0).toUpperCase()+e.slice(1)}function So(e){if(!e||typeof e!=`object`)return!1;let t=e;return typeof t.label==`string`&&Array.isArray(t.params)&&typeof t.filter==`function`}var Co=Object.assign({"./adjustments/autoLevel.ts":xn,"./adjustments/blackAndWhite.ts":En,"./adjustments/brightCont.ts":kn,"./adjustments/curves.ts":Mn,"./adjustments/exposure.ts":Un,"./adjustments/highlightsShadows.ts":Kn,"./adjustments/hueSat.ts":Yn,"./adjustments/invertAlpha.ts":Zn,"./adjustments/levels.ts":$n,"./adjustments/posterize.ts":nr,"./adjustments/sepia.ts":ar,"./adjustments/threshold.ts":sr,"./blurs/frostedGlass.ts":ur,"./blurs/gaussianBlur.ts":mr,"./blurs/motionBlur.ts":gr,"./blurs/radialBlur.ts":xr,"./blurs/rotaryBlur.ts":Er,"./blurs/smartBlur.ts":Ar,"./blurs/surfaceBlur.ts":Fr,"./blurs/unfocus.ts":Br,"./blurs/zoomBlur.ts":Gr,"./distort/bulge.ts":Yr,"./distort/crystalize.ts":$r,"./distort/pixelate.ts":ri,"./distort/polarInversion.ts":si,"./distort/smudge.ts":ui,"./distort/tileReflection.ts":mi,"./distort/twist.ts":vi,"./distort/warp.ts":Ti,"./noise/addNoise.ts":ki,"./noise/median.ts":Ni,"./noise/reduceNoise.ts":Bi,"./object/bevel.ts":Gi,"./object/feather.ts":Yi,"./object/outline.ts":$i,"./object/shadow.ts":na,"./photo/glow.ts":aa,"./photo/redEyeRemoval.ts":da,"./photo/sharpen.ts":ha,"./photo/softenPortrait.ts":ya,"./render/clouds.ts":Ca,"./render/flames.ts":ka,"./render/juliaFractal.ts":Pa,"./render/mandelbrotFractal.ts":Va,"./render/turbulence.ts":Ja,"./stylize/edgeDetect.ts":$a,"./stylize/emboss.ts":ro,"./stylize/inkOutline.ts":co,"./stylize/outline.ts":mo,"./stylize/relief.ts":ho}),wo=[];for(let[e,t]of Object.entries(Co)){let n=t?.default;if(!So(n))continue;let r=e.replace(/^\.\//,``).replace(/\.ts$/,``).split(`/`),i=r[r.length-1];if(!i)continue;let a=r.length>1?r.slice(0,-1).join(`/`):``,o=i;wo.push({...n,id:o,menu:n.menu??(a?xo(a.split(`/`).pop()):`Effects`),defaults:Object.fromEntries(n.params.flatMap(e=>e.kind===`xy`?[[`${e.key}X`,e.default],[`${e.key}Y`,e.defaultY??e.default]]:[[e.key,e.default]]))})}var Y=[...wo].sort((e,t)=>e.label.localeCompare(t.label)),To=`Adjustments`,Eo=Y.filter(e=>e.menu===To);bo.filter(e=>Y.some(t=>t.menu.toLowerCase().replace(/[^a-z]/g,``)===e)).map(xo);var Do=[...Y.filter(e=>e.menu!==To).reduce((e,t)=>{let n=e.get(t.menu)??[];return n.push(t),e.set(t.menu,n),e},new Map)].sort((e,t)=>{let n=e=>bo.indexOf(e.toLowerCase().replace(/[^a-z]/g,``)),r=n(e[0]),i=n(t[0]);return(r===-1?bo.length:r)-(i===-1?bo.length:i)||e[0].localeCompare(t[0])}).map(([e,t])=>({label:e,effects:t}));function Oo(e){return Y.find(t=>t.id===e)}var X=16777215;function ko(e,t,n){let r=Math.max(0,Math.floor(e.x)),i=Math.max(0,Math.floor(e.y)),a=Math.min(t,Math.ceil(e.x+e.width)),o=Math.min(n,Math.ceil(e.y+e.height));return a<=r||o<=i?null:{x:r,y:i,width:a-r,height:o-i}}function Ao(e,t,n){let r=1/0,i=1/0,a=-1/0,o=-1/0;for(let t of e)t.x<r&&(r=t.x),t.y<i&&(i=t.y),t.x>a&&(a=t.x),t.y>o&&(o=t.y);return r>a||i>o?null:ko({x:r,y:i,width:a-r,height:o-i},t,n)}function jo(e,t){e.renderInto(e.getTexture(t),new a,!0)}function Mo(e,t,n,r,i,a,o){jo(e,t);let s=new k,c=null;if(i===`lasso`&&o&&o.length>=3)s.poly(o,!0).fill(X),c=Ao(o,n,r);else if(a&&a.width>0&&a.height>0){if(i===`ellipse`){let e=a.x+a.width/2,t=a.y+a.height/2;s.ellipse(e,t,Math.abs(a.width)/2,Math.abs(a.height)/2).fill(X),c=ko(a,n,r)}else{let e=ko(a,n,r);if(!e)return s.destroy(),null;s.rect(e.x,e.y,e.width,e.height).fill(X),c=e}}return c?(e.renderInto(e.getTexture(t),s,!1),s.destroy(),c):(s.destroy(),null)}function No(e,t,n,r){jo(e,t);let i=new k;i.rect(0,0,n,r).fill(X),e.renderInto(e.getTexture(t),i,!1),i.destroy()}function Po(e,t,n,r){return t===`lasso`?r&&r.length>=3?(e.poly(r,!0),!0):!1:!n||n.width<=0||n.height<=0?!1:(t===`ellipse`?e.ellipse(n.x+n.width/2,n.y+n.height/2,Math.abs(n.width)/2,Math.abs(n.height)/2):e.rect(n.x,n.y,n.width,n.height),!0)}function Fo(e,t,n,r,i,a,o){jo(e,t);let s=new k;s.rect(0,0,n,r).fill(X),Po(s,i,a,o)&&s.cut(),e.renderInto(e.getTexture(t),s,!1),s.destroy()}function Io(e,t,n,r,i){e.blitRegion(t,n,0,0,`erase`,1)}function Lo(e,t,n,r,i,o){let s=e.create(i,o),c=new a,l=new k;l.rect(0,0,i,o).fill(r);let u=new D(e.getTexture(t));u.position.set(0,0),c.addChild(l),c.addChild(u),c.mask=u,e.renderInto(e.getTexture(s),c,!0),c.destroy({children:!0}),e.blitRegion(s,n,0,0,`normal`,1),e.dispose(s)}function Z(e,t,n,r,i,o,s){let c=e.create(o,s),l=new a,u=new D(e.getTexture(n)),d=new D(e.getTexture(t));d.position.set(0,0),l.addChild(u),l.addChild(d),l.mask=d,e.renderInto(e.getTexture(c),l,!0),l.destroy({children:!0}),e.blitRegion(c,r,0,0,i,1),e.dispose(c)}function Ro(e,t,n,r,i){let o=e.create(r,i),s=new a;return s.addChild(new D(e.getTexture(t))),s.addChild(new D(e.getTexture(n))),e.renderInto(e.getTexture(o),s,!0),s.destroy({children:!0}),o}function zo(e,t,n,r,i){let a=Wo(e,n,r,i),o=e.create(r,i);return Z(e,a,t,o,`normal`,r,i),e.dispose(a),o}function Bo(e,t,n){if(e===`lasso`)return n?n.map(e=>({x:e.x,y:e.y})):[];if(!t||t.width<=0||t.height<=0)return[];if(e===`ellipse`){let e=t.x+t.width/2,n=t.y+t.height/2,r=Math.abs(t.width)/2,i=Math.abs(t.height)/2;if(r<=0||i<=0)return[];let a=[];for(let t=0;t<64;t++){let o=t/64*Math.PI*2;a.push({x:e+r*Math.cos(o),y:n+i*Math.sin(o)})}return a}return[{x:t.x,y:t.y},{x:t.x+t.width,y:t.y},{x:t.x+t.width,y:t.y+t.height},{x:t.x,y:t.y+t.height}]}function Vo(e,t,n,r,i){let a=new k;Po(a,n,r,i)&&(a.fill(X),e.renderInto(e.getTexture(t),a,!1)),a.destroy()}function Ho(e,t,n,r,i,a,o){let s=e.create(n,r);Fo(e,s,n,r,i,a,o);let c=e.create(n,r);return Z(e,s,t,c,`normal`,n,r),e.dispose(s),Vo(e,c,i,a,o),c}function Uo(e,t,n,r,i,a,o){let s=e.create(n,r);Fo(e,s,n,r,i,a,o);let c=e.create(n,r);return Z(e,s,t,c,`normal`,n,r),e.dispose(s),c}function Wo(e,t,n,r){let i=e.create(n,r,X);return e.blitRegion(t,i,0,0,`erase`,1),i}function Go(e){let t=1/0,n=1/0,r=-1/0,i=-1/0;for(let a of e)for(let e of a)e.x<t&&(t=e.x),e.y<n&&(n=e.y),e.x>r&&(r=e.x),e.y>i&&(i=e.y);return t>r||n>i?null:{x:t,y:n,width:r-t,height:i-n}}function Ko(e,t,n){let r=t,i=n,a=[],o=(t,n)=>t<0||n<0||t>=r||n>=i?!1:e[(n*r+t)*4+3]>80;for(let e=0;e<i;e++)for(let t=0;t<r;t++)o(t,e)&&(o(t,e-1)||a.push({x1:t,y1:e,x2:t+1,y2:e}),o(t+1,e)||a.push({x1:t+1,y1:e,x2:t+1,y2:e+1}),o(t,e+1)||a.push({x1:t,y1:e+1,x2:t+1,y2:e+1}),o(t-1,e)||a.push({x1:t,y1:e,x2:t,y2:e+1}));if(!a.length)return[];let s=(e,t)=>`${e},${t}`,c=new Map,l=(e,t)=>{let n=c.get(e);n?n.push(t):c.set(e,[t])};a.forEach((e,t)=>{l(s(e.x1,e.y1),t),l(s(e.x2,e.y2),t)});let u=Array(a.length).fill(!1),d=[];for(let e=0;e<a.length;e++){if(u[e])continue;u[e]=!0;let t=a[e],n=[{x:t.x1,y:t.y1},{x:t.x2,y:t.y2}],r=t.x2,i=t.y2,o=0;for(;(r!==n[0].x||i!==n[0].y)&&o++<a.length;){let e=(c.get(s(r,i))??[]).find(e=>!u[e]);if(e===void 0)break;u[e]=!0;let t=a[e],o=t.x1===r&&t.y1===i?{x:t.x2,y:t.y2}:{x:t.x1,y:t.y1};n.push(o),r=o.x,i=o.y}n.length>3&&r===n[0].x&&i===n[0].y&&(n.pop(),d.push(qo(n)))}return d}function qo(e){if(e.length<3)return e;let t=[];for(let n=0;n<e.length;n++){let r=e[(n-1+e.length)%e.length],i=e[n],a=e[(n+1)%e.length],o=i.x-r.x,s=i.y-r.y,c=a.x-i.x;o*(a.y-i.y)!==s*c&&t.push(i)}return t}function Jo(e){return Array.isArray(e)?e:[e]}var Yo=t(!1),Xo=t(null);function Zo(){Xo.set(`apply`)}function Qo(){Xo.set(`cancel`)}function $o(){e(Yo)&&Qo()}function es(e,t,n,r){if(!r.length){let r=new D(t);e.app.renderer.render({container:r,target:n,clear:!0}),r.destroy();return}let i=t,a=null;for(let t=0;t<r.length;t++){let o=t===r.length-1,s=o?n:R(n.width,n.height),c=new D(i);c.filters=[r[t]],e.app.renderer.render({container:c,target:s,clear:!0}),c.destroy(),r[t].destroy(),a&&a.destroy(!0),a=o?null:s,i=s}}function ts(e,t,n){let r=j.active,i=r?.activeLayer;if(!r||!i)return!1;$o();let a=e.surfaces,o=r.width,s=r.height,c=i.surfaceId,l=a.getTexture(c),u=R(o,s);es(e,l,u,Jo(n()));let d=a.adopt(u),f,p=r.selection;return p.active&&p.maskId?(f=a.copyRegion(c,{x:0,y:0,width:o,height:s}),Io(a,p.maskId,f,o,s),Z(a,p.maskId,d,f,`normal`,o,s),a.dispose(d)):f=d,i.surfaceId=f,e.rebuildActiveLayers(),r.setDirty(!0),j.notifyChange(r),r.history.push({label:t,memoryBytes:r.width*r.height*4*2,undo:()=>{i.surfaceId===f&&(i.surfaceId=c,e.rebuildActiveLayers())},redo:()=>{i.surfaceId===c&&(i.surfaceId=f,e.rebuildActiveLayers())},dispose:()=>{i.surfaceId===f?a.dispose(c):a.dispose(f)}}),!0}function ns(e,t,n){if(t.isNoop?.(n))return!1;if($o(),t.apply){let r={renderer:e,applyFilterSwap:(t,n)=>ts(e,t,n)};return t.apply(r,n)}return ts(e,t.label,()=>t.filter(n))}var rs=8,is=16,as=2.6,os=1.2,ss=6,cs=4,ls=.15;function us(e,t){if(!(t.length<2)){e.moveTo(t[0].x,t[0].y);for(let n=1;n<t.length;n++)e.lineTo(t[n].x,t[n].y);e.lineTo(t[0].x,t[0].y)}}function ds(e,t,n,r,i=0){let a=t.length;if(a<2||!(n>0))return;let o=n+r,s=(i%o+o)%o;for(let i=0;i<a;i++){let c=t[i],l=t[(i+1)%a],u=Math.hypot(l.x-c.x,l.y-c.y);if(!(u>0))continue;let d=-s,f=s<n,p=f?n-s:o-s;for(;d<u;){if(d>=0){let t=d/u;e.moveTo(c.x+(l.x-c.x)*t,c.y+(l.y-c.y)*t)}if(d+=p,d>=u){f&&e.lineTo(c.x+(l.x-c.x)*1,c.y+(l.y-c.y)*1);break}let t=d/u;f&&e.lineTo(c.x+(l.x-c.x)*t,c.y+(l.y-c.y)*t),f=!f,p=f?n:r}}}var fs=class{doc;root=new a;checker;layerSprites=[];strokeBuffer=null;strokeOverlay=null;crisp=!1;top=new a;ants=new k;transformHandles=new k;veil=new a;tintSprite=null;tintShape=new k;floating=null;floatingMesh=null;floatingMeshGeometry=null;floatingTexture=null;floatingQuad=null;outlineLoops=null;outlineDashed=!0;zoom=1;strokeClipTexture=null;strokeClipSprite=null;surfaces;layerEffectTextures=new Map;antsOffset=0;antsTick=e=>{this.antsOffset+=ls*e,this.outlineLoops&&this.outlineDashed&&this.strokeOutline()};antsTickerBound=!1;constructor(e,t,n=!1){this.doc=e,this.surfaces=t,this.checker=new Bt({texture:nn(rs,n?`dark`:`bright`),width:e.width,height:e.height}),this.checker.roundPixels=!1,this.root.addChild(this.checker),this.rebuildLayers(t),this.veil.addChild(this.tintShape),this.top.addChild(this.veil),this.top.addChild(this.ants),this.top.addChild(this.transformHandles),this.root.addChild(this.top),this.raiseTop(),this.applyView(e.view.zoom,e.view.panX,e.view.panY),f.shared.add(this.antsTick),this.antsTickerBound=!0}raiseTop(){this.top.parent!==this.root&&this.root.addChild(this.top),this.root.removeChild(this.top),this.root.addChild(this.top)}addUnderVeil(e){this.top.addChildAt(e,this.top.getChildIndex(this.veil))}rebuildLayers(e){for(let e of this.layerSprites)this.root.removeChild(e),e.destroy();this.clearLayerEffectTextures(),this.layerSprites=this.doc.layers.map(e=>{let t=this.resolveLayerTexture(e),n=new D(t);return n.alpha=e.opacity,n.visible=e.visible,n.blendMode=dn[e.blendMode]??`normal`,this.root.addChild(n),n}),this.restorePreview(),this.setStrokeOverlayPosition(),this.raiseTop()}layerEffectTexture(e){let t=e.effects?.filter(e=>e.enabled)??[];if(!t.length)return null;let n=this.layerEffectTextures.get(e.id);if(n)return n;try{let n=this.renderEffectChain(e.surfaceId,t);return n&&this.layerEffectTextures.set(e.id,n),n}catch(e){return typeof console<`u`&&console.error(`[DocScene] layer-effect chain failed; showing base surface:`,e),null}}resolveLayerTexture(e){let t=this.layerEffectTexture(e);if(t)return t;if(this.surfaces.has(e.surfaceId))return this.surfaces.getTexture(e.surfaceId);typeof console<`u`&&console.error(`[DocScene] layer "${e.name}" references unknown surface ${e.surfaceId}; using placeholder.`);let n=this.surfaces.create(this.doc.width,this.doc.height);return e.surfaceId=n,this.surfaces.getTexture(n)}exportTextureFor(e){return this.layerEffectTexture(e)??this.surfaces.getTexture(e.surfaceId)}renderEffectChain(e,t){let n=this.doc.width,r=this.doc.height,i=this.surfaces.getTexture(e),a=R(n,r),o=R(n,r),s=i,c=[];for(let e of t){let t=Oo(e.id);if(!t)continue;let n=Jo(t.filter(e.settings));if(!n.length)continue;c.push(...n);let r=new D(s);r.filters=n,this.surfaces.renderInto(a,r,!0),r.destroy(),s=a;let i=a;a=o,o=i}for(let e of c)e.destroy();return s===i?(a.destroy(!0),o.destroy(!0),null):((s===a?o:a).destroy(!0),s)}clearLayerEffectTextures(){for(let e of this.layerEffectTextures.values())e.destroy(!0);this.layerEffectTextures.clear()}refreshLayerEffects(e){let t=this.doc.layers.findIndex(t=>t.id===e);if(t<0)return;let n=this.doc.layers[t],r=this.layerSprites[t];if(!r)return;let i=this.layerEffectTextures.get(e);i&&(i.destroy(!0),this.layerEffectTextures.delete(e)),r.texture=this.layerEffectTexture(n)??this.surfaces.getTexture(n.surfaceId),this.applySampling()}restorePreview(){if(!this.previewTexture)return;let[e,t]=this.previewTarget(),n=this.previewWidth===this.doc.width&&this.previewHeight===this.doc.height;if(e&&t&&n&&t.surfaceId===this.previewSurfaceId){e.texture=this.previewTexture,this.applySampling();return}this.previewTexture=null,this.previewLayerId=null,this.previewSurfaceId=null,this.destroyPreviewTargets()}setStrokeOverlayPosition(){let e=this.strokeOverlay;if(!e)return;e.parent!==this.root&&this.root.addChild(e);let t=this.doc.layers.findIndex(e=>e.id===this.doc.activeLayerId),n=t>=0?this.layerSprites[t]:null;if(!n||n.parent!==this.root)return;this.root.removeChild(e);let r=this.root.children[this.root.getChildIndex(n)+1];r?this.root.addChildAt(e,this.root.getChildIndex(r)):this.root.addChild(e)}resync(e){this.rebuildLayers(e),this.resyncSize(),this.setCrisp(this.crisp)}resyncSize(){this.checker.width=this.doc.width,this.checker.height=this.doc.height,this.strokeBuffer&&=(this.strokeBuffer.destroy(!0),null),this.strokeOverlay&&=(this.strokeOverlay.parent&&this.strokeOverlay.parent.removeChild(this.strokeOverlay),this.strokeOverlay.destroy(),null),this.strokeClipSprite&&=(this.strokeClipSprite.destroy(),null),this.strokeClipTexture=null,this.raiseTop()}setActiveLayerPreview(e,t=null){let n=this.doc.layers.findIndex(e=>e.id===this.doc.activeLayerId),r=n>=0?this.layerSprites[n]:null;r&&(e?r.texture=e:t&&(r.texture=t))}setCheckerTheme(e){this.checker.texture=nn(rs,e?`dark`:`bright`)}ensureStroke(){return(!this.strokeBuffer||!this.strokeOverlay)&&(this.strokeBuffer=R(this.doc.width,this.doc.height),this.strokeOverlay=new D(this.strokeBuffer),this.strokeOverlay.visible=!1,this.strokeBuffer.source&&(this.strokeBuffer.source.scaleMode=this.crisp?`nearest`:`linear`,this.strokeBuffer.source.style.update()),this.root.addChild(this.strokeOverlay),this.setStrokeOverlayPosition(),this.strokeClipTexture&&this.applyStrokeClip(this.strokeClipTexture),this.raiseTop()),{target:this.strokeBuffer,overlay:this.strokeOverlay}}get strokeActive(){return!!this.strokeOverlay?.visible}previewFiltered=null;previewComposed=null;previewWidth=0;previewHeight=0;previewTexture=null;previewLayerId=null;previewSurfaceId=null;activeLayerSprite(){let e=this.doc.layers.findIndex(e=>e.id===this.doc.activeLayerId);return e>=0?this.layerSprites[e]??null:null}previewTarget(){if(!this.previewLayerId)return[null,null];let e=this.doc.layers.findIndex(e=>e.id===this.previewLayerId);return e<0?[null,null]:[this.layerSprites[e]??null,this.doc.layers[e]??null]}ensurePreviewTargets(e,t){this.previewFiltered&&this.previewComposed&&this.previewWidth===e&&this.previewHeight===t||(this.destroyPreviewTargets(),this.previewFiltered=R(e,t),this.previewComposed=R(e,t),this.previewWidth=e,this.previewHeight=t)}destroyPreviewTargets(){this.previewFiltered?.destroy(!0),this.previewComposed?.destroy(!0),this.previewFiltered=null,this.previewComposed=null,this.previewWidth=0,this.previewHeight=0}setActiveLayerFilter(e){this.clearActiveLayerFilter();let t=e?Jo(e):[];if(!t.length)return;let n=this.doc.activeLayer,r=this.activeLayerSprite();if(!n||!r||!this.surfaces.has(n.surfaceId)){for(let e of t)e.destroy();return}let i=this.surfaces,o=this.doc.width,s=this.doc.height;this.ensurePreviewTargets(o,s);let c=this.previewFiltered,l=i.getTexture(n.surfaceId);this.previewLayerId=n.id,this.previewSurfaceId=n.surfaceId;let u=new D(l);u.filters=t,i.renderInto(c,u,!0),u.destroy();for(let e of t)e.destroy();let d=this.doc.selection,f=d.active&&d.maskId&&i.has(d.maskId)?i.getTexture(d.maskId):null;if(!f)this.previewTexture=c,r.texture=c;else{let e=this.previewComposed,t=new a;t.addChild(new D(l)),i.renderInto(e,t,!0),t.destroy({children:!0});let n=new a,o=new D(f);n.addChild(new D(c)),n.addChild(o),n.mask=o,i.renderInto(e,n,!1),n.destroy({children:!0}),this.previewTexture=e,r.texture=e}this.applySampling()}clearActiveLayerFilter(){if(this.previewTexture){let[e,t]=this.previewTarget();this.previewTexture=null,e&&t&&this.surfaces.has(t.surfaceId)&&(e.texture=this.surfaces.getTexture(t.surfaceId))}this.previewLayerId=null,this.previewSurfaceId=null,this.destroyPreviewTargets(),this.applySampling()}applyView(e,t,n){this.zoom=e,this.root.scale.set(e,e),this.root.position.set(t,n),this.checker.tileScale.set(is/(is*e),is/(is*e)),this.setCrisp(e>=1),this.outlineLoops&&this.strokeOutline()}setCrisp(e){this.crisp=e,this.applySampling()}applySampling(){let e=this.crisp?`nearest`:`linear`;for(let t of this.layerSprites){let n=t.texture?.source;n&&n.scaleMode!==e&&(n.scaleMode=e,n.style.update())}let t=this.strokeBuffer?.source;t&&t.scaleMode!==e&&(t.scaleMode=e,t.style.update())}showSelectionOutline(e,t){this.outlineLoops=e&&e.length?e:null,this.outlineDashed=t,this.strokeOutline()}clearSelectionOutline(){this.showSelectionOutline(null,!0)}strokeOutline(){this.ants.clear();let e=this.outlineLoops;if(!e)return;let t=Math.max(this.zoom,1e-4),n=(n,r)=>{for(let n of e)!n||n.length<2||(this.outlineDashed?ds(this.ants,n,ss/t,cs/t):us(this.ants,n));this.ants.stroke({width:r/t,color:n,alpha:1,cap:`butt`,join:`miter`})};n(16777215,as),n(1118481,os)}showTransformHandles(e){if(this.transformHandles.clear(),this.transformHandles.visible=!!e,!e)return;let t=8/this.zoom,n=t/2,r=[[e.x,e.y],[e.x+e.width/2,e.y],[e.x+e.width,e.y],[e.x+e.width,e.y+e.height/2],[e.x+e.width,e.y+e.height],[e.x+e.width/2,e.y+e.height],[e.x,e.y+e.height],[e.x,e.y+e.height/2]];for(let[e,i]of r)this.transformHandles.rect(e-n,i-n,t,t).fill(3900150).stroke({color:16777215,width:1/this.zoom});this.transformHandles.circle(e.x+e.width/2,e.y+e.height/2,t*.7).fill(3900150).stroke({color:16777215,width:1/this.zoom})}setSelectionTint(e){if(this.tintShape.clear(),!e){this.tintSprite&&(this.veil.removeChild(this.tintSprite),this.tintSprite.destroy(),this.tintSprite=null,this.raiseTop());return}this.tintSprite?this.tintSprite.texture=e:(this.tintSprite=new D(e),this.tintSprite.tint=9422847,this.tintSprite.alpha=.32,this.veil.addChildAt(this.tintSprite,0),this.raiseTop()),this.tintSprite.anchor.set(0,0),this.tintSprite.position.set(0,0),this.tintSprite.scale.set(1,1),this.tintSprite.rotation=0}setSelectionTintFromLoops(e){if(this.tintSprite&&=(this.veil.removeChild(this.tintSprite),this.tintSprite.destroy(),null),this.tintShape.clear(),!e?.length)return;let t=!1;for(let n of e)!n||n.length<3||(this.tintShape.poly(n,!0),t=!0);t&&this.tintShape.fill({color:9422847,alpha:.32})}setSelectionTintOffset(e,t){this.tintSprite&&this.tintSprite.position.set(e,t)}setSelectionTintTransform(e,t,n,r,i,a,o,s=0,c=0){this.tintSprite&&(this.tintSprite.anchor.set(e/this.doc.width,t/this.doc.height),this.tintSprite.position.set(e+n,t+r),this.tintSprite.scale.set(i,a),this.tintSprite.rotation=o,this.tintSprite.skew.set(s,c))}setFloatingTexture(e,t=0,n=0){if(!e){this.floatingTexture=null,this.floatingQuad=null,this.syncFloatingMesh(),this.floating&&=(this.top.removeChild(this.floating),this.floating.destroy(),null);return}this.floating||(this.floating=new D(e),this.addUnderVeil(this.floating),this.raiseTop()),this.floating.texture=e,this.floating.position.set(t,n),this.floatingTexture=e,this.syncFloatingMesh()}setFloatingQuad(e){this.floatingQuad=e?[{...e[0]},{...e[1]},{...e[2]},{...e[3]}]:null,this.syncFloatingMesh()}syncFloatingMesh(){let e=this.floatingTexture;if(!this.floatingQuad||!e){this.floatingMesh&&=(this.top.removeChild(this.floatingMesh),this.floatingMesh.destroy(),null),this.floatingMeshGeometry&&=(this.floatingMeshGeometry.destroy(),null),this.floating&&(this.floating.visible=!0);return}if(!this.floatingMesh||this.floatingMesh.texture!==e){this.floatingMesh&&(this.top.removeChild(this.floatingMesh),this.floatingMesh.destroy()),this.floatingMeshGeometry&&this.floatingMeshGeometry.destroy(),this.floatingMeshGeometry=new en({width:e.width,height:e.height,verticesX:24,verticesY:24});let t=new Ct({texture:e,geometry:this.floatingMeshGeometry});this.addUnderVeil(t),this.floatingMesh=t,this.raiseTop()}let t=this.floatingQuad;this.floatingMeshGeometry.setCorners(t[0].x,t[0].y,t[1].x,t[1].y,t[2].x,t[2].y,t[3].x,t[3].y),this.floatingMesh.position.set(0,0),this.floating&&(this.floating.visible=!1)}setFloatingTransform(e,t,n,r,i,a,o,s,c,l=0,u=0){this.floating&&(this.floating.anchor.set(e/this.floating.texture.width,t/this.floating.texture.height),this.floating.position.set(n+i,r+a),this.floating.scale.set(o,s),this.floating.rotation=c,this.floating.skew.set(l,u))}setStrokeClipTexture(e){this.strokeClipTexture=e,!(e&&!this.strokeOverlay)&&this.applyStrokeClip(e)}applyStrokeClip(e){if(this.strokeClipSprite&&=(this.strokeOverlay&&(this.strokeOverlay.mask=null),this.strokeClipSprite.destroy(),null),!e||!this.strokeOverlay)return;let t=new D(e);t.position.set(0,0),this.root.addChild(t),this.strokeOverlay.mask=t,this.strokeClipSprite=t}dispose(){this.destroyPreviewTargets(),this.clearLayerEffectTextures(),this.floatingMeshGeometry&&=(this.floatingMeshGeometry.destroy(),null),this.floatingMesh=null,this.root.destroy({children:!0}),this.strokeBuffer&&=(this.strokeBuffer.destroy(!0),null),this.strokeOverlay=null,this.strokeClipSprite=null,this.strokeClipTexture=null,this.outlineLoops=null}};function ps(e,t){let n=t.x-e.pivot.x,r=t.y-e.pivot.y,i=Math.cos(e.rotation+e.skewY)*e.scaleX,a=Math.sin(e.rotation+e.skewY)*e.scaleX,o=-Math.sin(e.rotation-e.skewX)*e.scaleY,s=Math.cos(e.rotation-e.skewX)*e.scaleY;return{x:e.pivot.x+e.offset.x+i*n+o*r,y:e.pivot.y+e.offset.y+a*n+s*r}}var Q=t(`dark`),ms=`paint.svelte.viewSettings.v2`;if(typeof window<`u`){try{let e=localStorage.getItem(ms);if(e){let t=JSON.parse(e);(t.checker===`bright`||t.checker===`dark`)&&Q.set(t.checker)}}catch{}Q.subscribe(e=>{try{let t={checker:e};localStorage.setItem(ms,JSON.stringify(t))}catch{}})}var hs=class{app;surfaces=new fn;checkerDark=!1;scenes=new Map;activeScene=null;transformHandlesVisible=!1;cssWidth=0;cssHeight=0;disposed=!1;unsubs=[];get viewWidth(){return this.cssWidth}get viewHeight(){return this.cssHeight}get ready(){return!!this.app}async init(t){let n=new it;await n.init({canvas:t,preference:`webgl`,backgroundAlpha:0,antialias:!1,autoDensity:!0,useBackBuffer:!0,resolution:Math.max(window.devicePixelRatio||1,1)}),this.app=n,this.checkerDark=e(Q)===`dark`,this.surfaces.attach(n),this.wireRegistry();for(let e of j.all)this.addDoc(e);this.attachActive()}wireRegistry(){this.unsubs.push(j.events.on(A.opened,e=>this.addDoc(e))),this.unsubs.push(j.events.on(A.active,e=>this.attachActive(e.id??null))),this.unsubs.push(j.events.on(A.closed,e=>{let{id:t}=e;this.removeDoc(t)}))}addDoc(e){if(!this.scenes.has(e.id))try{this.scenes.set(e.id,new fs(e,this.surfaces,this.checkerDark))}catch(t){typeof console<`u`&&console.error(`[EditorRenderer] could not build scene for doc "${e.name}":`,t)}}setCheckerTheme(e){this.checkerDark=e;for(let t of this.scenes.values())t.setCheckerTheme(e)}removeDoc(e){let t=this.scenes.get(e);if(t){this.activeScene===t&&(this.activeScene=null),t.dispose(),this.scenes.delete(e),this.disposeSelectionMask(t.doc);for(let e of t.doc.layers)this.surfaces.dispose(e.surfaceId)}}ensureSelectionMask(e){let t=e.selection.maskId;if(t&&this.surfaces.has(t))return t;let n=this.surfaces.create(e.width,e.height);return e.selection.maskId=n,n}disposeSelectionMask(e){let t=e.selection.maskId;t&&(this.surfaces.has(t)&&this.surfaces.dispose(t),e.selection.maskId=null)}attachActive(e=j.activeId){if(this.disposed||!this.app||(this.activeScene&&=(this.app.stage.removeChild(this.activeScene.root),null),e===null))return;let t=this.scenes.get(e);t&&(this.activeScene=t,this.app.stage.addChild(t.root),this.refreshActiveView(),this.refreshActiveSelection())}refreshActiveView(){let e=j.active;if(!e)return;let t=this.activeScene;t&&t.applyView(e.view.zoom,e.view.panX,e.view.panY)}getActiveStroke(){return!this.activeScene||!j.active?null:this.activeScene.ensureStroke()}setStrokeOverlayPosition(){this.activeScene?.setStrokeOverlayPosition()}rebuildActiveLayers(){this.activeScene&&this.activeScene.resync(this.surfaces)}refreshLayerEffects(e){this.activeScene?.refreshLayerEffects(e)}exportTextureFor(e){return this.activeScene?.exportTextureFor(e)??null}setActiveLayerPreview(e,t=null){this.activeScene?.setActiveLayerPreview(e,t)}refreshActiveSelection(){if(!this.app)return;let e=j.active,t=this.activeScene;if(!e||!t)return;let n=e.selection;if(!n.active){t.showSelectionOutline(null,!0),t.showTransformHandles(null),t.setStrokeClipTexture(null),t.setSelectionTint(null);return}let r=this.selectionOutlineLoops(e);t.showSelectionOutline(r,!0),n.bounds??n.rect??(r?.length&&(()=>{let e=r.flat(),t=e.map(e=>e.x),n=e.map(e=>e.y);return{x:Math.min(...t),y:Math.min(...n),width:Math.max(...t)-Math.min(...t),height:Math.max(...n)-Math.min(...n)}})()),t.showTransformHandles(null);let i=n.maskId&&this.surfaces.has(n.maskId)?this.surfaces.getTexture(n.maskId):null;t.setStrokeClipTexture(i),this.usesGeometryTint(n)?t.setSelectionTintFromLoops(r):t.setSelectionTint(i)}getActiveSelectionBounds(){let e=j.active;if(!e?.selection.active)return null;let t=e.selection.bounds??e.selection.rect;if(t)return t;let n=this.selectionOutlineLoops(e);if(!n?.length)return null;let r=n.flat(),i=r.map(e=>e.x),a=r.map(e=>e.y);return{x:Math.min(...i),y:Math.min(...a),width:Math.max(...i)-Math.min(...i),height:Math.max(...a)-Math.min(...a)}}previewSelectionOutline(e,t=!1){this.activeScene&&this.activeScene.showSelectionOutline(e,t)}setActiveFloating(e,t=0,n=0){this.activeScene?.setFloatingTexture(e,t,n)}setActiveFloatingQuad(e){this.activeScene?.setFloatingQuad(e)}setActiveFloatingTransform(e,t,n,r,i,a,o,s=0,c=0){let l=j.active?.selection.bounds;l&&this.activeScene?.setFloatingTransform(e-l.x,t-l.y,e,t,n,r,i,a,o,s,c)}setTransformHandlesVisible(e){this.transformHandlesVisible=e,this.activeScene?.showTransformHandles(null)}setActiveTintOffset(e,t){this.activeScene?.setSelectionTintOffset(e,t)}setActiveTintTransform(e,t,n,r,i,a,o,s=0,c=0){this.activeScene?.setSelectionTintTransform(e,t,n,r,i,a,o,s,c)}setSelectionPreviewMask(e){!this.activeScene||!this.surfaces.has(e)||this.activeScene.setSelectionTint(this.surfaces.getTexture(e))}previewMovedSelectionOutline(e,t){let n=j.active;if(!n||!this.activeScene)return;let r=this.selectionOutlineLoops(n);if(!r)return;let i=r.map(n=>n.map(n=>({x:n.x+e,y:n.y+t})));this.activeScene.showSelectionOutline(i,!0),this.usesGeometryTint(n.selection)&&this.activeScene.setSelectionTintFromLoops(i)}previewTransformedSelectionOutline(e,t,n,r,i,a=0,o=0){let s=j.active;if(!s||!this.activeScene)return;let c=this.selectionOutlineLoops(s);if(!c)return;let l={pivot:e,offset:t,scaleX:n,scaleY:r,rotation:i,skewX:a,skewY:o},u=c.map(e=>e.map(e=>ps(l,e)));this.activeScene.showSelectionOutline(u,!0),this.usesGeometryTint(s.selection)&&this.activeScene.setSelectionTintFromLoops(u)}previewWarpedSelectionOutline(e){let t=j.active;if(!t||!this.activeScene)return;if(!e){this.refreshActiveSelection();return}let n=this.selectionOutlineLoops(t);if(!n)return;let r=t=>{let n=e.h,r=n[6]*t.x+n[7]*t.y+n[8]||1;return{x:(n[0]*t.x+n[1]*t.y+n[2])/r,y:(n[3]*t.x+n[4]*t.y+n[5])/r}},i=n.map(e=>e.map(r));this.activeScene.showSelectionOutline(i,!0),t.selection.inverted||this.activeScene.setSelectionTintFromLoops(i)}usesGeometryTint(e){return!e.composite&&!e.inverted}selectionOutlineLoops(e){let t=[],n=this.committedShapeLoops(e);n&&t.push(...n);let r=e.selection;return!r.composite&&r.inverted&&t.push([{x:0,y:0},{x:e.width,y:0},{x:e.width,y:e.height},{x:0,y:e.height}]),t.length?t:null}committedShapeLoops(e){let t=e.selection;if(t.composite)return t.outlineLoops?.length?t.outlineLoops:null;let n=Bo(t.kind,t.rect,t.points);return n.length?[n]:null}computeMaskOutline(e,t,n){if(!this.app)return[];let{pixels:r,width:i,height:a}=B(this,this.surfaces.getTexture(e),t,n);return i!==t||a!==n?[]:Ko(r,t,n)}setActiveLayerFilterPreview(e){this.activeScene?.setActiveLayerFilter(e)}resize(e,t){this.cssWidth=e,this.cssHeight=t,this.app&&this.app.renderer.resize(e,t)}dispose(){this.disposed=!0;for(let e of this.unsubs)e();this.unsubs=[];for(let e of this.scenes.values())e.dispose();this.scenes.clear(),this.surfaces.disposeAll(),this.app&&this.app.destroy(!0,{children:!0,texture:!0,textureSource:!0})}},$=null,gs=null,_s=new Promise(e=>{gs=e});async function vs(e){return $&&$.ready?$:($||=new hs,await $.init(e),gs?.($),$)}function ys(){if(!$)throw Error(`EditorRenderer not initialised yet.`);return $}function bs(){return!!$}var xs=t({kind:null});function Ss(e,t){xs.set({kind:e,payload:t})}function Cs(){xs.set({kind:null})}export{j as $,Ho as A,Pn as B,Mo as C,zo as D,Bo as E,Y as F,vn as G,Tn as H,or as I,z as J,yn as K,Qn as L,Eo as M,Oo as N,Uo as O,Do as P,N as Q,Vn as R,Lo as S,No as T,B as U,Dn as V,bn as W,R as X,cn as Y,on as Z,Jo as _,bs as a,Wo as b,Q as c,ts as d,A as et,$o as f,Qo as g,Zo as h,ys as i,To as j,Ro as k,ps as l,Yo as m,xs as n,vs as o,Xo as p,dn as q,Ss as r,_s as s,Cs as t,ns as u,Z as v,Fo as w,Io as x,Go as y,Nn as z};
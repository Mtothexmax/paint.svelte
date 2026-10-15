import{$ as e,A as t,D as n,F as r,I as i,J as a,M as o,P as s,Q as c,R as l,U as u,X as d,Y as f,Z as p,_ as m,_t as h,et as g,ft as _,g as v,gt as y,ht as b,j as x,k as S,n as C,nt as w,pt as ee,u as T,yt as E}from"./BvE5W-fC.js";import{t as D}from"./HclGiUj8.js";import"./xihTtKlq.js";import{$ as O,W as k,f as A,i as te,t as ne}from"./D13nI74I.js";import{T as re,t as ie}from"./01LdVvwP.js";import{n as ae,r as oe,t as se}from"./CzQ8c4mY.js";var j=class extends Error{code;constructor(e,t){super(t),this.name=`BackgroundRemovalError`,this.code=e}};function ce(e){return`https://huggingface.co/${e.repo}/resolve/${e.revision}/${e.file}`}var le={balanced:{id:`birefnet-lite-512-fp16`,quality:`balanced`,label:`Balanced`,detail:`512 × 512 · ~94 MB download · fast, runs on WebGPU and CPU`,repo:`studioludens/birefnet-lite-512`,revision:`4a3c40c36c94093cc1e724d9ea428b8fa4b57dc7`,file:`onnx/model_fp16.onnx`,byteSize:98484532,sha256:null,inputSize:512,license:`MIT`,requiresWebGpu:!1},high:{id:`birefnet-lite-1024-fp16`,quality:`high`,label:`High quality`,detail:`1024 × 1024 · ~115 MB download · WebGPU only, slower, finer edges`,repo:`jiabins0303/birefnet-lite-1024-webgpu`,revision:`dc4edd9f7623961aa5ae2b186c1b428f4ed38d6a`,file:`onnx/model_fp16.onnx`,byteSize:114834127,sha256:`4059896039dfccb0f15b9080ff06d11d90e499449bb045e797055eb8901cf5f4`,inputSize:1024,license:`MIT`,requiresWebGpu:!0}},ue=`balanced`;function de(e){return ce(e)}var fe=[.485,.456,.406],pe=[.229,.224,.225],me=`paint-ai-cache`,he=1,ge=`ai-models`,_e=`ortweb-gathernd-v1`;function M(e){return`bg-removal/${e.repo}@${e.revision}/${e.file}/${_e}`}function ve(){return new Promise((e,t)=>{if(typeof indexedDB>`u`){t(Error(`IndexedDB is unavailable.`));return}let n=indexedDB.open(me,he);n.onupgradeneeded=()=>{n.result.objectStoreNames.contains(ge)||n.result.createObjectStore(ge,{keyPath:`key`})},n.onsuccess=()=>e(n.result),n.onerror=()=>t(n.error??Error(`Failed to open model cache.`))})}function ye(e,t,n){return new Promise((r,i)=>{let a=n(e.transaction(ge,t).objectStore(ge));a.onsuccess=()=>r(a.result),a.onerror=()=>i(a.error??Error(`Model cache transaction failed.`))})}async function be(e){let t=M(e),n;try{n=await ve()}catch{return!1}try{return await ye(n,`readonly`,e=>e.count(t))>0}catch{return!1}finally{n.close()}}async function xe(e){let t=M(e),n;try{n=await ve()}catch{return null}try{let e=await ye(n,`readonly`,e=>e.get(t));return!e||!(e.bytes instanceof ArrayBuffer)||e.bytes.byteLength===0||e.variant!==`ortweb-gathernd-v1`||e.byteSize!==e.bytes.byteLength?null:e.bytes}catch{return null}finally{n.close()}}async function Se(e,t,n){let r=await ve();try{let i={key:M(e),bytes:t,byteSize:t.byteLength,sha256:null,savedAt:Date.now(),variant:_e,sourceByteSize:n};await ye(r,`readwrite`,e=>e.put(i))}finally{r.close()}}async function Ce(e){let t=M(e),n=`bg-removal/${e.repo}@`,r;try{r=await ve()}catch{return}try{let e=(await ye(r,`readonly`,e=>e.getAllKeys())).filter(e=>typeof e==`string`&&e.startsWith(n)&&e!==t);if(!e.length)return;await new Promise((t,n)=>{let i=r.transaction(ge,`readwrite`),a=i.objectStore(ge);for(let t of e)a.delete(t);i.oncomplete=()=>t(),i.onerror=()=>n(i.error??Error(`Failed to prune model cache.`))})}catch{}finally{r.close()}}var we=Object.defineProperty,Te=Object.getOwnPropertyDescriptor,Ee=Object.getOwnPropertyNames,De=Object.prototype.hasOwnProperty,Oe=(e=>typeof E<`u`?E:typeof Proxy<`u`?new Proxy(e,{get:(e,t)=>(typeof E<`u`?E:e)[t]}):e)(function(e){if(typeof E<`u`)return E.apply(this,arguments);throw Error(`Dynamic require of "`+e+`" is not supported`)}),N=(e,t,n)=>()=>{if(n)throw n[0];try{return e&&(t=e(e=0)),t}catch(e){throw n=[e],e}},ke=(e,t)=>{for(var n in t)we(e,n,{get:t[n],enumerable:!0})},Ae=(e,t,n,r)=>{if(t&&typeof t==`object`||typeof t==`function`)for(let i of Ee(t))!De.call(e,i)&&i!==n&&we(e,i,{get:()=>t[i],enumerable:!(r=Te(t,i))||r.enumerable});return e},je=e=>Ae(we({},`__esModule`,{value:!0}),e),Me,Ne,Pe,Fe,Ie,Le=N(()=>{Me=new Map,Ne=[],Pe=(e,t,n)=>{if(t&&typeof t.init==`function`&&typeof t.createInferenceSessionHandler==`function`){let r=Me.get(e);if(r===void 0)Me.set(e,{backend:t,priority:n});else{if(r.priority>n)return;if(r.priority===n&&r.backend!==t)throw Error(`cannot register backend "${e}" using priority ${n}`)}if(n>=0){let t=Ne.indexOf(e);t!==-1&&Ne.splice(t,1);for(let t=0;t<Ne.length;t++)if(Me.get(Ne[t]).priority<=n){Ne.splice(t,0,e);return}Ne.push(e)}return}throw TypeError(`not a valid backend`)},Fe=async e=>{let t=Me.get(e);if(!t)return`backend not found.`;if(t.initialized)return t.backend;if(t.aborted)return t.error;{let n=!!t.initPromise;try{return n||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(e){return n||(t.error=`${e}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},Ie=async e=>{let t=e.executionProviders||[],n=t.map(e=>typeof e==`string`?e:e.name),r=n.length===0?Ne:n,i,a=[],o=new Set;for(let e of r){let t=await Fe(e);typeof t==`string`?a.push({name:e,err:t}):(i||=t,i===t&&o.add(e))}if(!i)throw Error(`no available backend found. ERR: ${a.map(e=>`[${e.name}] ${e.err}`).join(`, `)}`);for(let{name:e,err:t}of a)n.includes(e)&&console.warn(`removing requested execution provider "${e}" from session options because it is not available: ${t}`);let s=t.filter(e=>o.has(typeof e==`string`?e:e.name));return[i,new Proxy(e,{get:(e,t)=>t===`executionProviders`?s:Reflect.get(e,t)})]}}),Re=N(()=>{Le()}),ze,Be=N(()=>{ze=`1.31.0-dev.20260911-2a43ec07e`}),Ve,He,Ue=N(()=>{Be(),Ve=`warning`,He={wasm:{},webgl:{},webgpu:{},versions:{common:ze},set logLevel(e){if(e!==void 0){if(typeof e!=`string`||[`verbose`,`info`,`warning`,`error`,`fatal`].indexOf(e)===-1)throw Error(`Unsupported logging level: ${e}`);Ve=e}},get logLevel(){return Ve}},Object.defineProperty(He,"logLevel",{enumerable:!0})}),P,We=N(()=>{Ue(),P=He}),Ge,Ke,qe=N(()=>{Ge=(e,t)=>{let n=typeof document<`u`?document.createElement(`canvas`):new OffscreenCanvas(1,1);n.width=e.dims[3],n.height=e.dims[2];let r=n.getContext(`2d`);if(r!=null){let i,a;t?.tensorLayout!==void 0&&t.tensorLayout===`NHWC`?(i=e.dims[2],a=e.dims[3]):(i=e.dims[3],a=e.dims[2]);let o=t?.format===void 0?`RGB`:t.format,s=t?.norm,c,l;s===void 0||s.mean===void 0?c=[255,255,255,255]:typeof s.mean==`number`?c=[s.mean,s.mean,s.mean,s.mean]:(c=[s.mean[0],s.mean[1],s.mean[2],0],s.mean[3]!==void 0&&(c[3]=s.mean[3])),s===void 0||s.bias===void 0?l=[0,0,0,0]:typeof s.bias==`number`?l=[s.bias,s.bias,s.bias,s.bias]:(l=[s.bias[0],s.bias[1],s.bias[2],0],s.bias[3]!==void 0&&(l[3]=s.bias[3]));let u=a*i,d=0,f=u,p=u*2,m=-1;o===`RGBA`?(d=0,f=u,p=u*2,m=u*3):o===`RGB`?(d=0,f=u,p=u*2):o===`RBG`&&(d=0,p=u,f=u*2);for(let t=0;t<a;t++)for(let n=0;n<i;n++){let i=(e.data[d++]-l[0])*c[0],a=(e.data[f++]-l[1])*c[1],o=(e.data[p++]-l[2])*c[2],s=m===-1?255:(e.data[m++]-l[3])*c[3];r.fillStyle=`rgba(`+i+`,`+a+`,`+o+`,`+s+`)`,r.fillRect(n,t,1,1)}if(`toDataURL`in n)return n.toDataURL();throw Error(`toDataURL is not supported`)}throw Error(`Can not access image data`)},Ke=(e,t)=>{let n=typeof document<`u`?document.createElement(`canvas`).getContext(`2d`):new OffscreenCanvas(1,1).getContext(`2d`),r;if(n!=null){let i,a,o;t?.tensorLayout!==void 0&&t.tensorLayout===`NHWC`?(i=e.dims[2],a=e.dims[1],o=e.dims[3]):(i=e.dims[3],a=e.dims[2],o=e.dims[1]);let s=t!==void 0&&t.format!==void 0?t.format:`RGB`,c=t?.norm,l,u;c===void 0||c.mean===void 0?l=[255,255,255,255]:typeof c.mean==`number`?l=[c.mean,c.mean,c.mean,c.mean]:(l=[c.mean[0],c.mean[1],c.mean[2],255],c.mean[3]!==void 0&&(l[3]=c.mean[3])),c===void 0||c.bias===void 0?u=[0,0,0,0]:typeof c.bias==`number`?u=[c.bias,c.bias,c.bias,c.bias]:(u=[c.bias[0],c.bias[1],c.bias[2],0],c.bias[3]!==void 0&&(u[3]=c.bias[3]));let d=a*i;if(t!==void 0&&(t.format!==void 0&&o===4&&t.format!==`RGBA`||o===3&&t.format!==`RGB`&&t.format!==`BGR`))throw Error(`Tensor format doesn't match input tensor dims`);let f=0,p=1,m=2,h=3,g=0,_=d,v=d*2,y=-1;s===`RGBA`?(g=0,_=d,v=d*2,y=d*3):s===`RGB`?(g=0,_=d,v=d*2):s===`RBG`&&(g=0,v=d,_=d*2),r=n.createImageData(i,a);for(let t=0;t<a*i;f+=4,p+=4,m+=4,h+=4,t++)r.data[f]=(e.data[g++]-u[0])*l[0],r.data[p]=(e.data[_++]-u[1])*l[1],r.data[m]=(e.data[v++]-u[2])*l[2],r.data[h]=y===-1?255:(e.data[y++]-u[3])*l[3]}else throw Error(`Can not access image data`);return r}}),Je,Ye,F,Xe,Ze,Qe,$e=N(()=>{lt(),Je=(e,t)=>{if(e===void 0)throw Error(`Image buffer must be defined`);if(t.height===void 0||t.width===void 0)throw Error(`Image height and width must be defined`);if(t.tensorLayout===`NHWC`)throw Error(`NHWC Tensor layout is not supported yet`);let{height:n,width:r}=t,i=t.norm??{mean:255,bias:0},a,o;a=typeof i.mean==`number`?[i.mean,i.mean,i.mean,i.mean]:[i.mean[0],i.mean[1],i.mean[2],i.mean[3]??255],o=typeof i.bias==`number`?[i.bias,i.bias,i.bias,i.bias]:[i.bias[0],i.bias[1],i.bias[2],i.bias[3]??0];let s=t.format===void 0?`RGBA`:t.format,c=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:`RGB`,l=n*r,u=c===`RGBA`?new Float32Array(l*4):new Float32Array(l*3),d=4,f=0,p=1,m=2,h=3,g=0,_=l,v=l*2,y=-1;s===`RGB`&&(d=3,f=0,p=1,m=2,h=-1),c===`RGBA`?y=l*3:c===`RBG`?(g=0,v=l,_=l*2):c===`BGR`&&(v=0,_=l,g=l*2);for(let t=0;t<l;t++,f+=d,m+=d,p+=d,h+=d)u[g++]=(e[f]+o[0])/a[0],u[_++]=(e[p]+o[1])/a[1],u[v++]=(e[m]+o[2])/a[2],y!==-1&&h!==-1&&(u[y++]=(e[h]+o[3])/a[3]);return c===`RGBA`?new ct(`float32`,u,[1,4,n,r]):new ct(`float32`,u,[1,3,n,r])},Ye=async(e,t)=>{let n=typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement,r=typeof ImageData<`u`&&e instanceof ImageData,i=typeof ImageBitmap<`u`&&e instanceof ImageBitmap,a=typeof e==`string`,o,s=t??{},c=()=>{if(typeof document<`u`)return document.createElement(`canvas`);if(typeof OffscreenCanvas<`u`)return new OffscreenCanvas(1,1);throw Error(`Canvas is not supported`)},l=e=>typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||e instanceof OffscreenCanvas?e.getContext(`2d`):null;if(n){let n=c();n.width=e.width,n.height=e.height;let r=l(n);if(r!=null){let n=e.height,i=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(n=t.resizedHeight,i=t.resizedWidth),t!==void 0){if(s=t,t.tensorFormat!==void 0)throw Error(`Image input config format must be RGBA for HTMLImageElement`);s.tensorFormat=`RGBA`,s.height=n,s.width=i}else s.tensorFormat=`RGBA`,s.height=n,s.width=i;r.drawImage(e,0,0),o=r.getImageData(0,0,i,n).data}else throw Error(`Can not access image data`)}else if(r){let n,r;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(n=t.resizedHeight,r=t.resizedWidth):(n=e.height,r=e.width),t!==void 0&&(s=t),s.format=`RGBA`,s.height=n,s.width=r,t!==void 0){let t=c();t.width=r,t.height=n;let i=l(t);if(i!=null)i.putImageData(e,0,0),o=i.getImageData(0,0,r,n).data;else throw Error(`Can not access image data`)}else o=e.data}else if(i){if(t===void 0)throw Error(`Please provide image config with format for Imagebitmap`);let n=c();n.width=e.width,n.height=e.height;let r=l(n);if(r!=null){let t=e.height,n=e.width;return r.drawImage(e,0,0,n,t),o=r.getImageData(0,0,n,t).data,s.height=t,s.width=n,Je(o,s)}throw Error(`Can not access image data`)}else{if(a)return new Promise((t,n)=>{let r=c(),i=l(r);if(!e||!i)return n();let a=new Image;a.crossOrigin=`Anonymous`,a.src=e,a.onload=()=>{r.width=a.width,r.height=a.height,i.drawImage(a,0,0,r.width,r.height);let e=i.getImageData(0,0,r.width,r.height);s.height=r.height,s.width=r.width,t(Je(e.data,s))}});throw Error(`Input data provided is not supported - aborted tensor creation`)}if(o!==void 0)return Je(o,s);throw Error(`Input data provided is not supported - aborted tensor creation`)},F=(e,t)=>{let{width:n,height:r,download:i,dispose:a}=t;return new ct({location:`texture`,type:`float32`,texture:e,dims:[1,r,n,4],download:i,dispose:a})},Xe=(e,t)=>{let{dataType:n,dims:r,download:i,dispose:a}=t;return new ct({location:`gpu-buffer`,type:n??`float32`,gpuBuffer:e,dims:r,download:i,dispose:a})},Ze=(e,t)=>{let{dataType:n,dims:r,download:i,dispose:a}=t;return new ct({location:`ml-tensor`,type:n??`float32`,mlTensor:e,dims:r,download:i,dispose:a})},Qe=(e,t,n)=>new ct({location:`cpu-pinned`,type:e,data:t,dims:n??[t.length]})}),et,tt,nt,rt,it=N(()=>{et=new Map([[`float32`,Float32Array],[`uint8`,Uint8Array],[`int8`,Int8Array],[`uint16`,Uint16Array],[`int16`,Int16Array],[`int32`,Int32Array],[`bool`,Uint8Array],[`float64`,Float64Array],[`uint32`,Uint32Array],[`int4`,Uint8Array],[`uint4`,Uint8Array]]),tt=new Map([[Float32Array,`float32`],[Uint8Array,`uint8`],[Int8Array,`int8`],[Uint16Array,`uint16`],[Int16Array,`int16`],[Int32Array,`int32`],[Float64Array,`float64`],[Uint32Array,`uint32`]]),nt=!1,rt=()=>{if(!nt){nt=!0;let e=typeof BigInt64Array<`u`&&BigInt64Array.from,t=typeof BigUint64Array<`u`&&BigUint64Array.from,n=globalThis.Float16Array,r=typeof n<`u`&&n.from;e&&(et.set(`int64`,BigInt64Array),tt.set(BigInt64Array,`int64`)),t&&(et.set(`uint64`,BigUint64Array),tt.set(BigUint64Array,`uint64`)),r?(et.set(`float16`,n),tt.set(n,`float16`)):et.set(`float16`,Uint16Array)}}}),at,ot,st=N(()=>{lt(),at=e=>{let t=1;for(let n=0;n<e.length;n++){let r=e[n];if(typeof r!=`number`||!Number.isSafeInteger(r))throw TypeError(`dims[${n}] must be an integer, got: ${r}`);if(r<0)throw RangeError(`dims[${n}] must be a non-negative integer, got: ${r}`);t*=r}return t},ot=(e,t)=>{switch(e.location){case`cpu`:return new ct(e.type,e.data,t);case`cpu-pinned`:return new ct({location:`cpu-pinned`,data:e.data,type:e.type,dims:t});case`texture`:return new ct({location:`texture`,texture:e.texture,type:e.type,dims:t});case`gpu-buffer`:return new ct({location:`gpu-buffer`,gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case`ml-tensor`:return new ct({location:`ml-tensor`,mlTensor:e.mlTensor,type:e.type,dims:t});default:throw Error(`tensorReshape: tensor location ${e.location} is not supported`)}}}),ct,lt=N(()=>{qe(),$e(),it(),st(),ct=class{constructor(e,t,n){rt();let r,i;if(typeof e==`object`&&`location`in e)switch(this.dataLocation=e.location,r=e.type,i=e.dims,e.location){case`cpu-pinned`:{let t=et.get(r);if(!t)throw TypeError(`unsupported type "${r}" to create tensor from pinned buffer`);if(!(e.data instanceof t))throw TypeError(`buffer should be of type ${t.name}`);this.cpuData=e.data;break}case`texture`:if(r!==`float32`)throw TypeError(`unsupported type "${r}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break;case`gpu-buffer`:if(r!==`float32`&&r!==`float16`&&r!==`int32`&&r!==`int64`&&r!==`uint32`&&r!==`uint8`&&r!==`bool`&&r!==`uint4`&&r!==`int4`)throw TypeError(`unsupported type "${r}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break;case`ml-tensor`:if(r!==`float32`&&r!==`float16`&&r!==`int32`&&r!==`int64`&&r!==`uint32`&&r!==`uint64`&&r!==`int8`&&r!==`uint8`&&r!==`bool`&&r!==`uint4`&&r!==`int4`)throw TypeError(`unsupported type "${r}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break;default:throw Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let a,o;if(typeof e==`string`){if(r=e,o=n,e===`string`){if(!Array.isArray(t))throw TypeError(`A string tensor's data must be a string array.`);a=t}else{let n=et.get(e);if(n===void 0)throw TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(t)){if(e===`float16`&&n===Uint16Array||e===`uint4`||e===`int4`)throw TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${n.name} as data.`);a=e===`uint64`||e===`int64`?n.from(t,BigInt):n.from(t)}else if(t instanceof n)a=t;else if(t instanceof Uint8ClampedArray){if(e===`uint8`)a=Uint8Array.from(t);else throw TypeError(`A Uint8ClampedArray tensor's data must be type of uint8`)}else if(e===`float16`&&t instanceof Uint16Array&&n!==Uint16Array)a=new globalThis.Float16Array(t.buffer,t.byteOffset,t.length);else throw TypeError(`A ${r} tensor's data must be type of ${n}`)}}else if(o=t,Array.isArray(e)){if(e.length===0)throw TypeError(`Tensor type cannot be inferred from an empty array.`);let t=typeof e[0];if(t===`string`)r=`string`,a=e;else if(t===`boolean`)r=`bool`,a=Uint8Array.from(e);else throw TypeError(`Invalid element type of data array: ${t}.`)}else if(e instanceof Uint8ClampedArray)r=`uint8`,a=Uint8Array.from(e);else{let t=tt.get(e.constructor);if(t===void 0)throw TypeError(`Unsupported type for tensor data: ${e.constructor}.`);r=t,a=e}if(o===void 0)o=[a.length];else if(!Array.isArray(o))throw TypeError(`A tensor's dims must be a number array`);i=o,this.cpuData=a,this.dataLocation=`cpu`}let a=at(i);if(this.cpuData&&a!==this.cpuData.length&&(r!==`uint4`&&r!==`int4`||Math.ceil(a/2)!==this.cpuData.length))throw Error(`Tensor's size(${a}) does not match data length(${this.cpuData.length}).`);this.type=r,this.dims=i,this.size=a}static async fromImage(e,t){return Ye(e,t)}static fromTexture(e,t){return F(e,t)}static fromGpuBuffer(e,t){return Xe(e,t)}static fromMLTensor(e,t){return Ze(e,t)}static fromPinnedBuffer(e,t,n){return Qe(e,t,n)}toDataURL(e){return Ge(this,e)}toImageData(e){return Ke(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw Error(`The data is not stored as a WebGL texture.`);return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw Error(`The data is not stored as a WebGPU buffer.`);return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw Error(`The data is not stored as a WebNN MLTensor.`);return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case`cpu`:case`cpu-pinned`:return this.data;case`texture`:case`gpu-buffer`:case`ml-tensor`:if(!this.downloader)throw Error(`The current tensor is not created with a specified data downloader.`);if(this.isDownloading)throw Error(`The current tensor is being downloaded.`);try{this.isDownloading=!0;let t=await this.downloader();return this.downloader=void 0,this.dataLocation=`cpu`,this.cpuData=t,e&&this.disposer&&(this.disposer(),this.disposer=void 0),t}finally{this.isDownloading=!1}default:throw Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw Error(`The current tensor is being downloaded.`);this.disposer&&=(this.disposer(),void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation=`none`}ensureValid(){if(this.dataLocation===`none`)throw Error(`The tensor is disposed.`)}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw Error(`Cannot reshape a tensor that owns GPU resource.`);return ot(this,e)}}}),I,ut=N(()=>{lt(),I=ct}),dt,ft,pt,mt,ht,gt,_t=N(()=>{Ue(),dt=(e,t)=>{(typeof He.trace>`u`?!He.wasm.trace:!He.trace)||console.timeStamp(`${e}::ORT::${t}`)},ft=(e,t)=>{let n=Error().stack?.split(/\r\n|\r|\n/g)||[],r=!1;for(let i=0;i<n.length;i++){if(r&&!n[i].includes(`TRACE_FUNC`)){let r=`FUNC_${e}::${n[i].trim().split(` `)[1]}`;t&&(r+=`::${t}`),dt(`CPU`,r);return}n[i].includes(`TRACE_FUNC`)&&(r=!0)}},pt=e=>{(typeof He.trace>`u`?!He.wasm.trace:!He.trace)||ft(`BEGIN`,e)},mt=e=>{(typeof He.trace>`u`?!He.wasm.trace:!He.trace)||ft(`END`,e)},ht=e=>{(typeof He.trace>`u`?!He.wasm.trace:!He.trace)||console.time(`ORT::${e}`)},gt=e=>{(typeof He.trace>`u`?!He.wasm.trace:!He.trace)||console.timeEnd(`ORT::${e}`)}}),vt,yt=N(()=>{Le(),ut(),_t(),vt=class e{constructor(e){this.handler=e}async run(e,t,n){pt(),ht(`InferenceSession.run`);let r={},i={};if(typeof e!=`object`||!e||e instanceof I||Array.isArray(e))throw TypeError(`'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.`);let a=!0;if(typeof t==`object`){if(t===null)throw TypeError(`Unexpected argument[1]: cannot be null.`);if(t instanceof I)throw TypeError(`'fetches' cannot be a Tensor`);if(Array.isArray(t)){if(t.length===0)throw TypeError(`'fetches' cannot be an empty array.`);a=!1;for(let e of t){if(typeof e!=`string`)throw TypeError(`'fetches' must be a string array or an object.`);if(this.outputNames.indexOf(e)===-1)throw RangeError(`'fetches' contains invalid output name: ${e}.`);r[e]=null}if(typeof n==`object`&&n)i=n;else if(typeof n<`u`)throw TypeError(`'options' must be an object.`)}else{let e=!1,o=Object.getOwnPropertyNames(t);for(let n of this.outputNames)if(o.indexOf(n)!==-1){let i=t[n];(i===null||i instanceof I)&&(e=!0,a=!1,r[n]=i)}if(e){if(typeof n==`object`&&n)i=n;else if(typeof n<`u`)throw TypeError(`'options' must be an object.`)}else i=t}}else if(typeof t<`u`)throw TypeError(`Unexpected argument[1]: must be 'fetches' or 'options'.`);for(let t of this.inputNames)if(typeof e[t]>`u`)throw Error(`input '${t}' is missing in 'feeds'.`);if(a)for(let e of this.outputNames)r[e]=null;let o=await this.handler.run(e,r,i),s={};for(let e in o)if(Object.hasOwnProperty.call(o,e)){let t=o[e];s[e]=t instanceof I?t:new I(t.type,t.data,t.dims)}return gt(`InferenceSession.run`),mt(),s}async release(){return this.handler.dispose()}static async create(t,n,r,i){pt(),ht(`InferenceSession.create`);let a,o={};if(typeof t==`string`){if(a=t,typeof n==`object`&&n)o=n;else if(typeof n<`u`)throw TypeError(`'options' must be an object.`)}else if(t instanceof Uint8Array){if(a=t,typeof n==`object`&&n)o=n;else if(typeof n<`u`)throw TypeError(`'options' must be an object.`)}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<`u`&&t instanceof SharedArrayBuffer){let e=t,s=0,c=t.byteLength;if(typeof n==`object`&&n)o=n;else if(typeof n==`number`){if(s=n,!Number.isSafeInteger(s))throw RangeError(`'byteOffset' must be an integer.`);if(s<0||s>=e.byteLength)throw RangeError(`'byteOffset' is out of range [0, ${e.byteLength}).`);if(c=t.byteLength-s,typeof r==`number`){if(c=r,!Number.isSafeInteger(c))throw RangeError(`'byteLength' must be an integer.`);if(c<=0||s+c>e.byteLength)throw RangeError(`'byteLength' is out of range (0, ${e.byteLength-s}].`);if(typeof i==`object`&&i)o=i;else if(typeof i<`u`)throw TypeError(`'options' must be an object.`)}else if(typeof r<`u`)throw TypeError(`'byteLength' must be a number.`)}else if(typeof n<`u`)throw TypeError(`'options' must be an object.`);a=new Uint8Array(e,s,c)}else throw TypeError(`Unexpected argument[0]: must be 'path' or 'buffer'.`);let[s,c]=await Ie(o),l=await s.createInferenceSessionHandler(a,c);return gt(`InferenceSession.create`),mt(),new e(l)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),bt,xt=N(()=>{yt(),bt=vt}),St=N(()=>{}),Ct=N(()=>{}),wt=N(()=>{}),Tt=N(()=>{});ke({},{InferenceSession:()=>bt,TRACE:()=>dt,TRACE_EVENT_BEGIN:()=>ht,TRACE_EVENT_END:()=>gt,TRACE_FUNC_BEGIN:()=>pt,TRACE_FUNC_END:()=>mt,Tensor:()=>I,env:()=>P,registerBackend:()=>Pe});var Et=N(()=>{Re(),We(),xt(),ut(),St(),Ct(),_t(),wt(),Tt()}),Dt=N(()=>{}),Ot={};ke(Ot,{default:()=>jt});var kt,At,jt,Mt=N(()=>{df(),cn(),Qt(),kt=`ort-wasm-proxy-worker`,At=globalThis.self?.name===kt,At&&(self.onmessage=e=>{let{type:t,in:n}=e.data;try{switch(t){case`init-wasm`:sn(n.wasm).then(()=>{Qd(n).then(()=>{postMessage({type:t})},e=>{postMessage({type:t,err:e})})},e=>{postMessage({type:t,err:e})});break;case`init-ep`:{let{epName:e,env:r}=n;$d(r,e).then(()=>{postMessage({type:t})},e=>{postMessage({type:t,err:e})});break}case`copy-from`:{let{buffer:e}=n,r=rf(e);postMessage({type:t,out:r});break}case`create`:{let{model:e,options:r}=n;af(e,r).then(e=>{postMessage({type:t,out:e})},e=>{postMessage({type:t,err:e})});break}case`release`:of(n),postMessage({type:t});break;case`run`:{let{sessionId:e,inputIndices:r,inputs:i,outputIndices:a,options:o}=n;cf(e,r,i,a,Array(a.length).fill(null),o).then(e=>{e.some(e=>e[3]!==`cpu`)?postMessage({type:t,err:`Proxy does not support non-cpu tensor location.`}):postMessage({type:t,out:e},uf([...i,...e]))},e=>{postMessage({type:t,err:e})});break}case`end-profiling`:lf(n),postMessage({type:t})}}catch(e){postMessage({type:t,err:e})}}),jt=At?null:e=>new Worker(e??Vt,{type:`module`,name:kt})}),Nt={};ke(Nt,{default:()=>Ft});async function Pt(e={}){var t=e,n=!!globalThis.window,r=!!globalThis.WorkerGlobalScope,i=r&&self.name?.startsWith(`em-pthread`);t.mountExternalData=(e,n)=>{e.startsWith(`./`)&&(e=e.substring(2)),(t.ad||=new Map).set(e,n)},t.unmountExternalData=()=>{delete t.ad,delete t.Yd,delete t.Xd,delete t.be},globalThis.SharedArrayBuffer??new WebAssembly.Memory({initial:0,maximum:0,shared:!0}).buffer.constructor;let a=e=>async(...n)=>{try{if(t.$c)throw Error(`Session already started`);let r=t.$c={Nd:n[0],errors:[]},i=await e(...n);if(t.$c!==r)throw Error(`Session mismatch`);t.hd?.flush();let a=r.errors;if(0<a.length){let e=await Promise.all(a);if(e=e.filter(e=>e),0<e.length)throw Error(e.join(`
`))}return i}finally{t.$c=null}};t.jsepInit=(e,n)=>{if(e===`webgpu`){[t.hd,t.Dd,t.Hd,t.jd,t.Gd,t.bc,t.Id,t.Kd,t.Ed,t.Fd,t.Jd]=n;let e=t.hd;t.jsepRegisterBuffer=(t,n,r,i)=>e.registerBuffer(t,n,r,i),t.jsepGetBuffer=t=>e.getBuffer(t),t.jsepCreateDownloader=(t,n,r)=>e.createDownloader(t,n,r),t.jsepOnCreateSession=t=>{e.onCreateSession(t)},t.jsepOnReleaseSession=t=>{e.onReleaseSession(t)},t.jsepOnRunStart=t=>e.onRunStart(t),t.Ld=(t,n)=>{e.upload(t,n)}}else if(e===`webnn`){let e=n[0];[t.Vd,t.vd,t.webnnEnsureTensor,t.wd,t.webnnDownloadTensor,t.Ud,t.webnnEnableTraceEvent]=n.slice(1),t.webnnReleaseTensorId=t.vd,t.webnnUploadTensor=t.wd,t.webnnRegisterMLContext=t.Ud,t.webnnOnRunStart=t=>e.onRunStart(t),t.webnnOnRunEnd=e.onRunEnd.bind(e),t.webnnOnReleaseSession=t=>{e.onReleaseSession(t)},t.webnnCreateMLTensorDownloader=(t,n)=>e.createMLTensorDownloader(t,n),t.webnnRegisterMLTensor=(t,n,r,i)=>e.registerMLTensor(t,n,r,i),t.webnnCreateMLContext=t=>e.createMLContext(t),t.webnnRegisterGraphInput=e.registerGraphInput.bind(e),t.webnnIsGraphInput=e.isGraphInput.bind(e),t.webnnRegisterGraphOutput=e.registerGraphOutput.bind(e),t.webnnIsGraphOutput=e.isGraphOutput.bind(e),t.webnnCreateTemporaryTensor=e.createTemporaryTensor.bind(e),t.webnnIsGraphInputOutputTypeSupported=e.isGraphInputOutputTypeSupported.bind(e)}};let o=()=>{let e=e=>(...t)=>{let n=nn;return t=e(...t),nn==n?t:new Promise((e,t)=>{ln={resolve:e,reject:t}})};(()=>{for(let n of[`_OrtAppendExecutionProvider`,`_OrtCreateSession`,`_OrtRun`,`_OrtRunWithBinding`,`_OrtBindInput`])t[n]=e(t[n])})(),a!==void 0&&(t._OrtRun=a(t._OrtRun),t._OrtRunWithBinding=a(t._OrtRunWithBinding)),o=void 0};t.asyncInit=()=>{o?.()};var s,c,l=(e,t)=>{throw t},u=import.meta.url,d=``;if(n||r){try{d=new URL(`.`,u).href}catch{}r&&(c=e=>{var t=new XMLHttpRequest;return t.open(`GET`,e,!1),t.responseType=`arraybuffer`,t.send(null),new Uint8Array(t.response)}),s=async e=>{if(C(e))return new Promise((t,n)=>{var r=new XMLHttpRequest;r.open(`GET`,e,!0),r.responseType=`arraybuffer`,r.onload=()=>{r.status==200||r.status==0&&r.response?t(r.response):n(r.status)},r.onerror=n,r.send(null)});var t=await fetch(e,{credentials:`same-origin`});if(t.ok)return t.arrayBuffer();throw Error(t.status+` : `+t.url)}}var f,p,m,h,g,_,v=console.log.bind(console),y=console.error.bind(console),b=v,x=y,S=!1,C=e=>e.startsWith(`file://`);function w(){N.buffer!=T.buffer&&se()}if(i){let e=function(n){try{var r=n.data,i=r.Vc;if(i===`load`){let n=[];self.onmessage=e=>n.push(e),_=()=>{postMessage({Vc:`loaded`});for(let t of n)e(t);self.onmessage=e};for(let e of r.Ad)t[e]&&!t[e].proxy||(t[e]=(...t)=>{postMessage({Vc:`callHandler`,yd:e,args:t})},e==`print`&&(b=t[e]),e==`printErr`&&(x=t[e]));N=r.Rd,se(),p=r.Sd,ue(),aa()}else if(i===`run`){(function(e){var t=(w(),A)[e+52>>>2>>>0];e=(w(),A)[e+56>>>2>>>0],J(t,t-e),Y(t)})(r.Uc),br(r.Uc,0,0,1,0,0),Ee(),Gt(r.Uc),ee||=(vr(),!0);try{ke(r.Pd,r.ed)}catch(e){if(e!=`unwind`)throw e}}else r.target!==`setimmediate`&&(i===`checkMailbox`?ee&&Kt():i&&(x(`worker: received unknown command ${i}`),x(r)))}catch(e){throw xr(),e}};var ee=!1;self.onunhandledrejection=e=>{throw e.reason||e},self.onmessage=e}var T,E,D,O,k,A,te,ne,re,ie,ae,oe=!1;function se(){var e=N.buffer;t.HEAP8=T=new Int8Array(e),D=new Int16Array(e),t.HEAPU8=E=new Uint8Array(e),O=new Uint16Array(e),t.HEAP32=k=new Int32Array(e),t.HEAPU32=A=new Uint32Array(e),te=new Float32Array(e),ne=new Float64Array(e),re=new BigInt64Array(e),ie=new BigUint64Array(e)}function j(){oe=!0,i?_():_i.ub()}function ce(e){throw x(e=`Aborted(`+e+`)`),S=!0,e=new WebAssembly.RuntimeError(e+`. Build with -sASSERTIONS for more info.`),g?.(e),e}function le(){return{a:{ma:xi,hb:bi,g:Me,J:Pe,f:ze,o:Be,i:Ve,$:He,b:Ue,S:P,Ha:Ge,n:Ke,aa:Xe,Ya:Ze,Da:Qe,Fa:$e,Za:et,Wa:tt,Pa:nt,Va:rt,ka:it,Ea:at,Ba:ot,Xa:st,Ca:ct,cb:lt,fa:gt,wa:_t,ua:Tt,ea:Dt,N:Ot,H:kt,va:Mt,_:Bt,xa:Vt,Sa:Ht,za:qt,Ia:Yt,sa:Xt,ga:Zt,Ra:Gt,$a:Qt,Q:dn,r:vn,c:bt,ib:yn,y:bn,M:xn,D:Sn,l:Cn,s:wn,jb:Tn,I:En,R:Dn,j:On,u:z,q:kn,k:An,Ma:jn,Na:Fn,Oa:In,Ka:B,La:Ln,ta:V,eb:Bn,bb:Un,v:Gn,ba:Kn,ha:qn,ab:Vn,V:Jn,_a:Yn,Aa:Xn,F:zn,U:Zn,la:nr,ya:rr,gb:tr,fb:ir,Ta:cr,Ua:lr,Ga:be,T:ur,Ja:dr,ja:fr,Qa:pr,ia:hr,lb:ia,na:$i,mb:ra,oa:Qi,G:Vi,e:Ti,t:Ci,w:Si,B:Fi,nb:Yi,Z:Ji,x:Oi,pa:Xi,X:ea,ca:qi,ob:Ki,pb:Gi,O:Ii,qb:Ui,qa:Wi,rb:Hi,L:zi,Y:Zi,d:wi,A:Di,m:Ei,kb:$,p:Ai,z:ji,C:ki,E:Mi,K:Li,ra:Bi,P:ta,da:Ri,W:na,sb:Pi,tb:Ni,h:gr,a:N,db:ve}}}async function ue(){function e(e,n){var r=_i=e.exports;e={};for(let[t,n]of Object.entries(r))typeof n==`function`?(r=en(n),e[t]=r):e[t]=n;return _i=e,_i=(function(){var e=_i,t=e=>t=>e(t)>>>0,n=e=>()=>e()>>>0;return(e=Object.assign({},e)).vb=t(e.vb),e.Zb=n(e.Zb),e.$b=t(e.$b),e.nc=t(e.nc),e.oc=n(e.oc),e.sc=t(e.sc),e})(),Ce.push(_i.ac),_r=(e=_i).vb,vr=e.wb,t._OrtInit=e.xb,t._OrtGetLastError=e.yb,t._OrtCreateSessionOptions=e.zb,t._OrtAppendExecutionProvider=e.Ab,t._OrtAddFreeDimensionOverride=e.Bb,t._OrtAddSessionConfigEntry=e.Cb,t._OrtReleaseSessionOptions=e.Db,t._OrtCreateSession=e.Eb,t._OrtReleaseSession=e.Fb,t._OrtGetInputOutputCount=e.Gb,t._OrtGetInputOutputMetadata=e.Hb,t._OrtFree=e.Ib,t._OrtCreateTensor=e.Jb,t._OrtGetTensorData=e.Kb,t._OrtReleaseTensor=e.Lb,t._OrtCreateRunOptions=e.Mb,t._OrtAddRunConfigEntry=e.Nb,t._OrtReleaseRunOptions=e.Ob,t._OrtCreateBinding=e.Pb,t._OrtBindInput=e.Qb,t._OrtBindOutput=e.Rb,t._OrtClearBoundOutputs=e.Sb,t._OrtReleaseBinding=e.Tb,t._OrtRunWithBinding=e.Ub,t._OrtRun=e.Vb,t._OrtEndProfiling=e.Wb,t._JsepOutput=e.Xb,t._JsepGetNodeName=e.Yb,yr=e.Zb,U=t._free=e._b,W=t._malloc=e.$b,br=e.cc,xr=e.dc,Sr=e.ec,Cr=e.fc,G=e.gc,K=e.hc,wr=e.ic,q=e.jc,Tr=e.kc,J=e.lc,Y=e.mc,X=e.nc,Z=e.oc,Er=e.pc,Dr=e.qc,Or=e.rc,kr=e.sc,Q=e.tc,Ar=e.uc,jr=e.vc,Mr=e.wc,Nr=e.xc,Pr=e.yc,Fr=e.zc,Ir=e.Ac,Lr=e.Bc,Rr=e.Cc,zr=e.Dc,Br=e.Ec,Vr=e.Fc,Hr=e.Gc,Ur=e.Hc,Wr=e.Ic,Gr=e.Jc,Kr=e.Kc,qr=e.Lc,Jr=e.Mc,Yr=e.Nc,Xr=e.Oc,Zr=e.Pc,Qr=e.Qc,$r=e.Sc,ei=e.Tc,ti=e.cd,ni=e.dd,ri=e.id,ii=e.nd,ai=e.od,oi=e.pd,si=e.qd,ci=e.rd,li=e.sd,ui=e.td,di=e.ud,fi=e.zd,pi=e.Zd,mi=e._d,hi=e.$d,gi=e.ae,p=n,_i}var n,r=le();return t.instantiateWasm?new Promise(n=>{t.instantiateWasm(r,(t,r)=>{n(e(t,r))})}):i?e(new WebAssembly.Instance(p,le()),p):(ae??=t.locateFile?t.locateFile?t.locateFile(`ort-wasm-simd-threaded.jsep.wasm`,d):d+`ort-wasm-simd-threaded.jsep.wasm`:new URL(``+new URL(`../assets/ort-wasm-simd-threaded.jsep.C7qz-dwA.wasm`,import.meta.url).href,``+import.meta.url).href,n=await(async function(e){var t=ae;if(!f&&!C(t))try{var n=fetch(t,{credentials:`same-origin`});return await WebAssembly.instantiateStreaming(n,e)}catch(e){x(`wasm streaming compile failed: ${e}`),x(`falling back to ArrayBuffer instantiation`)}return(async function(e,t){try{var n=await(async function(e){if(!f)try{var t=await s(e);return new Uint8Array(t)}catch{}if(e==ae&&f)e=new Uint8Array(f);else{if(!c)throw`both async and sync fetching of the wasm failed`;e=c(e)}return e})(e);return await WebAssembly.instantiate(n,t)}catch(e){x(`failed to asynchronously prepare wasm: ${e}`),ce(e)}})(t,e)})(r),e(n.instance,n.module))}class de{name=`ExitStatus`;constructor(e){this.message=`Program terminated with exit(${e})`,this.status=e}}var fe=e=>{e.terminate(),e.onmessage=()=>{}},pe=[],me=0,he=null,ge=e=>{xe.length==0&&(Oe(),De(xe[0]));var t=xe.pop();if(!t)return 6;Se.push(t),we[e.Uc]=t,t.Uc=e.Uc;var n={Vc:`run`,Pd:e.Od,ed:e.ed,Uc:e.Uc};return t.postMessage(n,e.md),0},_e=0,M=(e,t,...n)=>{var r,i=16*n.length,a=Z(),o=X(i),s=o>>>3;for(r of n)typeof r==`bigint`?((w(),re)[s++>>>0]=1n,(w(),re)[s++>>>0]=r):((w(),re)[s++>>>0]=0n,(w(),ne)[s++>>>0]=r);return e=Sr(e,0,i,o,t),Y(a),e};function ve(e){if(i)return M(0,1,e);if(m=e,!(0<_e)){for(var t of Se)fe(t);for(t of xe)fe(t);xe=[],Se=[],we={},S=!0}l(0,new de(e))}function ye(e){if(i)return M(1,0,e);be(e)}var be=e=>{if(m=e,i)throw ye(e),`unwind`;ve(e)},xe=[],Se=[],Ce=[],we={},Te=e=>{var t=e.Uc;delete we[t],xe.push(e),Se.splice(Se.indexOf(e),1),e.Uc=0,Cr(t)};function Ee(){Ce.forEach(e=>e())}var De=e=>new Promise(n=>{e.onmessage=r=>{var i=r.data;if(r=i.Vc,i.bd&&i.bd!=yr()){var a=we[i.bd];a?a.postMessage(i,i.md):x(`Internal error! Worker sent a message "${r}" to target pthread ${i.bd}, but that thread no longer exists!`)}else r===`checkMailbox`?Kt():r===`spawnThread`?ge(i):r===`cleanupThread`?Ut(()=>{Te(we[i.Qd])}):r===`loaded`?(e.loaded=!0,n(e)):i.target===`setimmediate`?e.postMessage(i):r===`uncaughtException`?e.onerror(i.error):r===`callHandler`?t[i.yd](...i.args):r&&x(`worker sent an unknown command ${r}`)},e.onerror=e=>{throw x(`worker sent an error! ${e.filename}:${e.lineno}: ${e.message}`),e};var r,i=[];for(r of[])t.propertyIsEnumerable(r)&&i.push(r);e.postMessage({Vc:`load`,Ad:i,Rd:N,Sd:p})});function Oe(){var e=new Worker((()=>{let e=URL;return import.meta.url>`file:`&&import.meta.url<`file;`?new e(`ort.bundle.min.mjs`,import.meta.url):new URL(import.meta.url)})(),{type:`module`,workerData:`em-pthread`,name:`em-pthread`});xe.push(e)}var N,ke=(e,t)=>{_e=0,e=Ar(e,t),0<_e?m=e:G(e)},Ae=[],je=0;function Me(e){var t=new Le(e>>>=0);return(w(),T)[t.Wc+12>>>0]==0&&(Fe(t,!0),je--),Ie(t,!1),Ae.push(t),kr(e)}var Ne=0,Pe=()=>{q(0,0);var e=Ae.pop();Er(e.gd),Ne=0};function Fe(e,t){t=+!!t,(w(),T)[e.Wc+12>>>0]=t}function Ie(e,t){t=+!!t,(w(),T)[e.Wc+13>>>0]=t}class Le{constructor(e){this.gd=e,this.Wc=e-24}}var Re=e=>{var t=Ne;if(!t)return Tr(0),0;var n=new Le(t);(w(),A)[n.Wc+16>>>2>>>0]=t;var r=(w(),A)[n.Wc+4>>>2>>>0];if(!r)return Tr(0),t;for(var i of e){if(i===0||i===r)break;if(Or(i,r,n.Wc+16))return Tr(i),t}return Tr(r),t};function ze(){return Re([])}function Be(e){return Re([e>>>0])}function Ve(e,t,n,r){return Re([e>>>0,t>>>0,n>>>0,r>>>0])}var He=()=>{var e=Ae.pop();e||ce(`no exception to throw`);var t=e.gd;throw(w(),T)[e.Wc+13>>>0]==0&&(Ae.push(e),Ie(e,!0),Fe(e,!1),je++),Dr(t),Ne=t};function Ue(e,t,n){var r=new Le(e>>>=0);throw t>>>=0,n>>>=0,(w(),A)[r.Wc+16>>>2>>>0]=0,(w(),A)[r.Wc+4>>>2>>>0]=t,(w(),A)[r.Wc+8>>>2>>>0]=n,Dr(e),je++,Ne=e}var P=()=>je;function We(e,t,n,r){return i?M(2,1,e,t,n,r):Ge(e,t,n,r)}function Ge(e,t,n,r){if(e>>>=0,t>>>=0,n>>>=0,r>>>=0,!globalThis.SharedArrayBuffer)return 6;var a=[];return i&&a.length===0?We(e,t,n,r):(e={Od:n,Uc:e,ed:r,md:a},i?(e.Vc=`spawnThread`,postMessage(e,a),0):ge(e))}function Ke(e){throw Ne||=e>>>0,Ne}var qe=globalThis.TextDecoder&&new TextDecoder,Je=(e,t,n,r)=>{if(n=t+n,r)return n;for(;e[t]&&!(t>=n);)++t;return t},Ye=(e,t=0,n,r)=>{if(16<(n=Je(e,t>>>=0,n,r))-t&&e.buffer&&qe)return qe.decode(e.buffer instanceof ArrayBuffer?e.subarray(t,n):e.slice(t,n));for(r=``;t<n;){var i=e[t++];if(128&i){var a=63&e[t++];if((224&i)==192)r+=String.fromCharCode((31&i)<<6|a);else{var o=63&e[t++];65536>(i=(240&i)==224?(15&i)<<12|a<<6|o:(7&i)<<18|a<<12|o<<6|63&e[t++])?r+=String.fromCharCode(i):(i-=65536,r+=String.fromCharCode(55296|i>>10,56320|1023&i))}}else r+=String.fromCharCode(i)}return r},F=(e,t,n)=>(e>>>=0)?Ye((w(),E),e,t,n):``;function Xe(e,t,n){return i?M(3,1,e,t,n):0}function Ze(e,t){if(i)return M(4,1,e,t)}function Qe(e,t){if(i)return M(5,1,e,t)}function $e(e,t,n){if(i)return M(6,1,e,t,n)}function et(e,t,n){return i?M(7,1,e,t,n):0}function tt(e,t){if(i)return M(8,1,e,t)}function nt(e,t,n){if(i)return M(9,1,e,t,n)}function rt(e,t,n,r){if(i)return M(10,1,e,t,n,r)}function it(e,t,n,r){if(i)return M(11,1,e,t,n,r)}function at(e,t,n,r){if(i)return M(12,1,e,t,n,r)}function ot(e){if(i)return M(13,1,e)}function st(e,t){if(i)return M(14,1,e,t)}function ct(e,t,n){if(i)return M(15,1,e,t,n)}var lt=()=>ce(``),I=e=>{e>>>=0;for(var t=``;;){var n=(w(),E)[e++>>>0];if(!n)return t;t+=String.fromCharCode(n)}},ut={},dt={},ft={},pt=class extends Error{constructor(e){super(e),this.name=`BindingError`}};function mt(e,t,n={}){return(function(e,t,n={}){var r=t.name;if(!e)throw new pt(`type "${r}" must have a positive integer typeid pointer`);if(dt.hasOwnProperty(e)){if(n.Bd)return;throw new pt(`Cannot register type '${r}' twice`)}dt[e]=t,delete ft[e],ut.hasOwnProperty(e)&&(t=ut[e],delete ut[e],t.forEach(e=>e()))})(e,t,n)}var ht=(e,t,n)=>{switch(t){case 1:return n?e=>(w(),T)[e>>>0]:e=>(w(),E)[e>>>0];case 2:return n?e=>(w(),D)[e>>>1>>>0]:e=>(w(),O)[e>>>1>>>0];case 4:return n?e=>(w(),k)[e>>>2>>>0]:e=>(w(),A)[e>>>2>>>0];case 8:return n?e=>(w(),re)[e>>>3>>>0]:e=>(w(),ie)[e>>>3>>>0];default:throw TypeError(`invalid integer width (${t}): ${e}`)}};function gt(e,t,n,r,i){e>>>=0,n>>>=0,t=I(t>>>0);let a=e=>e;if(r=r===0n){let e=8*n;a=t=>BigInt.asUintN(e,t),i=a(i)}mt(e,{name:t,Rc:a,Yc:(e,t)=>(typeof t==`number`&&(t=BigInt(t)),t),Xc:ht(t,n,!r),Zc:null})}function _t(e,t,n,r){mt(e>>>=0,{name:t=I(t>>>0),Rc:function(e){return!!e},Yc:function(e,t){return t?n:r},Xc:function(e){return this.Rc((w(),E)[e>>>0])},Zc:null})}var vt=[],yt=[0,1,,1,null,1,!0,1,!1,1];function bt(e){9<(e>>>=0)&&--yt[e+1]===0&&(yt[e]=void 0,vt.push(e))}var xt=e=>{if(!e)throw new pt(`Cannot use deleted val. handle = ${e}`);return yt[e]},St=e=>{switch(e){case void 0:return 2;case null:return 4;case!0:return 6;case!1:return 8;default:let t=vt.pop()||yt.length;return yt[t]=e,yt[t+1]=1,t}};function Ct(e){return this.Rc((w(),A)[e>>>2>>>0])}var wt={name:`emscripten::val`,Rc:e=>{var t=xt(e);return bt(e),t},Yc:(e,t)=>St(t),Xc:Ct,Zc:null};function Tt(e){return mt(e>>>0,wt)}var Et=(e,t)=>{switch(t){case 4:return function(e){return this.Rc((w(),te)[e>>>2>>>0])};case 8:return function(e){return this.Rc((w(),ne)[e>>>3>>>0])};default:throw TypeError(`invalid float width (${t}): ${e}`)}};function Dt(e,t,n){n>>>=0,mt(e>>>=0,{name:t=I(t>>>0),Rc:e=>e,Yc:(e,t)=>t,Xc:Et(t,n),Zc:null})}function Ot(e,t,n,r,i){e>>>=0,n>>>=0,t=I(t>>>0);let a=e=>e;if(r===0){var o=32-8*n;a=e=>e<<o>>>o,i=a(i)}mt(e,{name:t,Rc:a,Yc:(e,t)=>t,Xc:ht(t,n,r!==0),Zc:null})}function kt(e,t,n){function r(e){var t=(w(),A)[e>>>2>>>0];return e=(w(),A)[e+4>>>2>>>0],new i((w(),T).buffer,e,t)}var i=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array][t];mt(e>>>=0,{name:n=I(n>>>0),Rc:r,Xc:r},{Bd:!0})}var At=(e,t,n)=>{var r=(w(),E);if(t>>>=0,0<n){var i=t;n=t+n-1;for(var a=0;a<e.length;++a){var o=e.codePointAt(a);if(127>=o){if(t>=n)break;r[t++>>>0]=o}else if(2047>=o){if(t+1>=n)break;r[t++>>>0]=192|o>>6,r[t++>>>0]=128|63&o}else if(65535>=o){if(t+2>=n)break;r[t++>>>0]=224|o>>12,r[t++>>>0]=128|o>>6&63,r[t++>>>0]=128|63&o}else{if(t+3>=n)break;r[t++>>>0]=240|o>>18,r[t++>>>0]=128|o>>12&63,r[t++>>>0]=128|o>>6&63,r[t++>>>0]=128|63&o,a++}}r[t>>>0]=0,e=t-i}else e=0;return e},jt=e=>{for(var t=0,n=0;n<e.length;++n){var r=e.charCodeAt(n);127>=r?t++:2047>=r?t+=2:55296<=r&&57343>=r?(t+=4,++n):t+=3}return t};function Mt(e,t){mt(e>>>=0,{name:t=I(t>>>0),Rc(e){var t=(w(),A)[e>>>2>>>0];return t=F(e+4,t,!0),U(e),t},Yc(e,t){t instanceof ArrayBuffer&&(t=new Uint8Array(t));var n=typeof t==`string`;if(!(n||ArrayBuffer.isView(t)&&t.BYTES_PER_ELEMENT==1))throw new pt(`Cannot pass non-string to std::string`);var r=n?jt(t):t.length,i=W(4+r+1),a=i+4;return(w(),A)[i>>>2>>>0]=r,n?At(t,a,r+1):(w(),E).set(t,a>>>0),e!==null&&e.push(U,i),i},Xc:Ct,Zc(e){U(e)}})}var Nt=globalThis.TextDecoder?new TextDecoder(`utf-16le`):void 0,Pt=(e,t,n)=>{if(e>>>=1,16<(t=Je((w(),O),e,t/2,n))-e&&Nt)return Nt.decode((w(),O).slice(e,t));for(n=``;e<t;++e){var r=(w(),O)[e>>>0];n+=String.fromCharCode(r)}return n},Ft=(e,t,n)=>{if(n??=2147483647,2>n)return 0;var r=t;n=(n-=2)<2*e.length?n/2:e.length;for(var i=0;i<n;++i){var a=e.charCodeAt(i);(w(),D)[t>>>1>>>0]=a,t+=2}return(w(),D)[t>>>1>>>0]=0,t-r},It=e=>2*e.length,Lt=(e,t,n)=>{var r=``;e>>>=2;for(var i=0;!(i>=t/4);i++){var a=(w(),A)[e+i>>>0];if(!a&&!n)break;r+=String.fromCodePoint(a)}return r},Rt=(e,t,n)=>{if(t>>>=0,n??=2147483647,4>n)return 0;var r=t;n=r+n-4;for(var i=0;i<e.length;++i){var a=e.codePointAt(i);if(65535<a&&i++,(w(),k)[t>>>2>>>0]=a,(t+=4)+4>n)break}return(w(),k)[t>>>2>>>0]=0,t-r},zt=e=>{for(var t=0,n=0;n<e.length;++n)65535<e.codePointAt(n)&&n++,t+=4;return t};function Bt(e,t,n){if(e>>>=0,t>>>=0,n=I(n>>>=0),t===2)var r=Pt,i=Ft,a=It;else r=Lt,i=Rt,a=zt;mt(e,{name:n,Rc:e=>{var n=(w(),A)[e>>>2>>>0];return n=r(e+4,n*t,!0),U(e),n},Yc:(e,r)=>{if(typeof r!=`string`)throw new pt(`Cannot pass non-string to C++ string type ${n}`);var o=a(r),s=W(4+o+t);return(w(),A)[s>>>2>>>0]=o/t,i(r,s+4,o+t),e!==null&&e.push(U,s),s},Xc:Ct,Zc(e){U(e)}})}function Vt(e,t){mt(e>>>=0,{Cd:!0,name:t=I(t>>>0),Rc:()=>{},Yc:()=>{}})}function Ht(e){br(e>>>0,!r,1,!n,131072,!1),Ee()}var Ut=e=>{if(!S)try{if(e(),!(0<_e))try{i?yr()&&G(m):be(m)}catch(e){e instanceof de||e==`unwind`||l(0,e)}}catch(e){e instanceof de||e==`unwind`||l(0,e)}},Wt=!Atomics.waitAsync||globalThis.navigator?.userAgent&&91>Number((navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)||[])[2]);function Gt(e){e>>>=0,Wt||(Atomics.waitAsync((w(),k),e>>>2,e).value.then(Kt),e+=128,Atomics.store((w(),k),e>>>2,1))}var Kt=()=>Ut(()=>{var e=yr();e&&(Gt(e),wr())});function qt(e,t){(e>>>=0)==t>>>0?setTimeout(Kt):i?postMessage({bd:e,Vc:`checkMailbox`}):(e=we[e])&&e.postMessage({Vc:`checkMailbox`})}var Jt=[];function Yt(e,t,n,r,i){for(t>>>=0,i>>>=0,Jt.length=0,n=i>>>3,r=i+r>>>3;n<r;){var a=(w(),re)[n++>>>0]?(w(),re)[n++>>>0]:(w(),ne)[n++>>>0];Jt.push(a)}return(t?yi[t]:vi[e])(...Jt)}var Xt=()=>{_e=0};function Zt(e){e>>>=0,i?postMessage({Vc:`cleanupThread`,Qd:e}):Te(we[e])}function Qt(e){}var $t=e=>{try{e()}catch(e){ce(e)}};function en(e){var t=(...t)=>{an.push(e);try{return e(...t)}finally{S||(an.pop(),nn&&tn===1&&an.length===0&&(tn=0,_e+=1,$t(mi),typeof Fibers<`u`&&Fibers.de()))}};return L.set(e,t),t}var tn=0,nn=null,rn=0,an=[],on=new Map,sn=new Map,L=new Map,cn=0,ln=null,un=[],R=e=>(function(e){if(!S){if(tn===0){var t=!1,n=!1;e((e=0)=>{if(!S&&(rn=e,t=!0,n)){tn=2,$t(()=>hi(nn)),typeof MainLoop<`u`&&MainLoop.xd&&MainLoop.resume(),e=!1;try{var r=(function(){var e=(w(),k)[nn+8>>>2>>>0];return e=sn.get(e),e=L.get(e),--_e,e()})()}catch(t){r=t,e=!0}var i=!1;if(!nn){var a=ln;a&&(ln=null,(e?a.reject:a.resolve)(r),i=!0)}if(e&&!i)throw r}}),n=!0,t||(tn=1,nn=(function(){var e=W(65548),t=e+12;if((w(),A)[e>>>2>>>0]=t,(w(),A)[e+4>>>2>>>0]=t+65536,t=an[0],!on.has(t)){var n=cn++;on.set(t,n),sn.set(n,t)}return t=on.get(t),(w(),k)[e+8>>>2>>>0]=t,e})(),typeof MainLoop<`u`&&MainLoop.xd&&MainLoop.pause(),$t(()=>pi(nn)))}else tn===2?(tn=0,$t(gi),U(nn),nn=null,un.forEach(Ut)):ce(`invalid state: ${tn}`);return rn}})(t=>{e().then(t)});function dn(e){return e>>>=0,R(async()=>St(await xt(e)))}var fn=[],pn=e=>{var t=fn.length;return fn.push(e),t},mn=(e,t)=>{for(var n=Array(e),r=0;r<e;++r){var i=r,a=(w(),A)[t+4*r>>>2>>>0],o=dt[a];if(o===void 0)throw e=`parameter ${r}`,a=_r(a),t=I(a),U(a),new pt(`${e} has unknown type ${t}`);n[i]=o}return n},hn=(e,t,n)=>{var r=[];return e=e(r,n),r.length&&((w(),A)[t>>>2>>>0]=St(r)),e},gn={},_n=e=>{var t=gn[e];return t===void 0?I(e):t};function vn(e,t,n){var[r,...i]=mn(e,t>>>0);t=r.Yc.bind(r);var a=i.map(e=>e.Xc.bind(e));e--;var o={toValue:xt};switch(e=a.map((e,t)=>{var n=`argFromPtr${t}`;return o[n]=e,`${n}(args${t?`+`+8*t:``})`}),n){case 0:var s=`toValue(handle)`;break;case 2:s=`new (toValue(handle))`;break;case 3:s=``;break;case 1:o.getStringOrSymbol=_n,s=`toValue(handle)[getStringOrSymbol(methodName)]`}return s+=`(${e})`,r.Cd||(o.toReturnWire=t,o.emval_returnValue=hn,s=`return emval_returnValue(toReturnWire, destructorsRef, ${s})`),s=`return function (handle, methodName, destructorsRef, args) {
  ${s}
  }`,n=Function(Object.keys(o),s)(...Object.values(o)),s=`methodCaller<(${i.map(e=>e.name)}) => ${r.name}>`,pn(Object.defineProperty(n,"name",{value:s}))}function yn(e,t){return t>>>=0,(e=xt(e>>>0))==xt(t)}function bn(e){return(e>>>=0)?(e=_n(e),St(globalThis[e])):St(globalThis)}function xn(e){return e=_n(e>>>0),St(t[e])}function Sn(e,t){return t>>>=0,e=xt(e>>>0),t=xt(t),St(e[t])}function Cn(e){9<(e>>>=0)&&(yt[e+1]+=1)}function wn(e,t,n,r,i){return fn[e>>>0](t>>>0,n>>>0,r>>>0,i>>>0)}function Tn(e,t,n,r,i){return wn(e>>>0,t>>>0,n>>>0,r>>>0,i>>>0)}function En(){return St([])}function Dn(e){e=xt(e>>>0);for(var t=Array(e.length),n=0;n<e.length;n++)t[n]=e[n];return St(t)}function On(e){return St(_n(e>>>0))}function z(){return St({})}function kn(e){for(var t=xt(e>>>=0);t.length;){var n=t.pop();t.pop()(n)}bt(e)}function An(e,t,n){t>>>=0,n>>>=0,e=xt(e>>>0),t=xt(t),n=xt(n),e[t]=n}function jn(e,t){e=-9007199254740992>e||9007199254740992<e?NaN:Number(e),t>>>=0,e=new Date(1e3*e),(w(),k)[t>>>2>>>0]=e.getUTCSeconds(),(w(),k)[t+4>>>2>>>0]=e.getUTCMinutes(),(w(),k)[t+8>>>2>>>0]=e.getUTCHours(),(w(),k)[t+12>>>2>>>0]=e.getUTCDate(),(w(),k)[t+16>>>2>>>0]=e.getUTCMonth(),(w(),k)[t+20>>>2>>>0]=e.getUTCFullYear()-1900,(w(),k)[t+24>>>2>>>0]=e.getUTCDay(),e=(e.getTime()-Date.UTC(e.getUTCFullYear(),0,1,0,0,0,0))/864e5|0,(w(),k)[t+28>>>2>>>0]=e}var Mn=e=>e%4==0&&(e%100!=0||e%400==0),Nn=[0,31,60,91,121,152,182,213,244,274,305,335],Pn=[0,31,59,90,120,151,181,212,243,273,304,334];function Fn(e,t){e=-9007199254740992>e||9007199254740992<e?NaN:Number(e),t>>>=0,e=new Date(1e3*e),(w(),k)[t>>>2>>>0]=e.getSeconds(),(w(),k)[t+4>>>2>>>0]=e.getMinutes(),(w(),k)[t+8>>>2>>>0]=e.getHours(),(w(),k)[t+12>>>2>>>0]=e.getDate(),(w(),k)[t+16>>>2>>>0]=e.getMonth(),(w(),k)[t+20>>>2>>>0]=e.getFullYear()-1900,(w(),k)[t+24>>>2>>>0]=e.getDay();var n=(Mn(e.getFullYear())?Nn:Pn)[e.getMonth()]+e.getDate()-1|0;(w(),k)[t+28>>>2>>>0]=n,(w(),k)[t+36>>>2>>>0]=-60*e.getTimezoneOffset(),n=new Date(e.getFullYear(),6,1).getTimezoneOffset();var r=new Date(e.getFullYear(),0,1).getTimezoneOffset();e=0|(n!=r&&e.getTimezoneOffset()==Math.min(r,n)),(w(),k)[t+32>>>2>>>0]=e}function In(e){e>>>=0;var t=new Date((w(),k)[e+20>>>2>>>0]+1900,(w(),k)[e+16>>>2>>>0],(w(),k)[e+12>>>2>>>0],(w(),k)[e+8>>>2>>>0],(w(),k)[e+4>>>2>>>0],(w(),k)[e>>>2>>>0],0),n=(w(),k)[e+32>>>2>>>0],r=t.getTimezoneOffset(),i=new Date(t.getFullYear(),6,1).getTimezoneOffset(),a=new Date(t.getFullYear(),0,1).getTimezoneOffset(),o=Math.min(a,i);return 0>n?(w(),k)[e+32>>>2>>>0]=+(i!=a&&o==r):0<n!=(o==r)&&(i=Math.max(a,i),t.setTime(t.getTime()+6e4*((0<n?o:i)-r))),(w(),k)[e+24>>>2>>>0]=t.getDay(),n=(Mn(t.getFullYear())?Nn:Pn)[t.getMonth()]+t.getDate()-1|0,(w(),k)[e+28>>>2>>>0]=n,(w(),k)[e>>>2>>>0]=t.getSeconds(),(w(),k)[e+4>>>2>>>0]=t.getMinutes(),(w(),k)[e+8>>>2>>>0]=t.getHours(),(w(),k)[e+12>>>2>>>0]=t.getDate(),(w(),k)[e+16>>>2>>>0]=t.getMonth(),(w(),k)[e+20>>>2>>>0]=t.getYear(),e=t.getTime(),BigInt(isNaN(e)?-1:e/1e3)}function B(e,t,n,r,a,o,s){return i?M(16,1,e,t,n,r,a,o,s):-52}function Ln(e,t,n,r,a,o){if(i)return M(17,1,e,t,n,r,a,o)}var Rn={},zn=()=>performance.timeOrigin+performance.now();function V(e,t){return i?M(18,1,e,t):(Rn[e]&&(clearTimeout(Rn[e].id),delete Rn[e]),t&&(Rn[e]={id:setTimeout(()=>{delete Rn[e],Ut(()=>K(e,performance.timeOrigin+performance.now()))},t),ce:t}),0)}function Bn(e,t,n,r){e>>>=0,t>>>=0,n>>>=0,r>>>=0;var i=new Date().getFullYear(),a=new Date(i,0,1).getTimezoneOffset();i=new Date(i,6,1).getTimezoneOffset();var o=Math.max(a,i);(w(),A)[e>>>2>>>0]=60*o,(w(),k)[t>>>2>>>0]=+(a!=i),e=(t=e=>{var t=Math.abs(e);return`UTC${0<=e?`-`:`+`}${String(Math.floor(t/60)).padStart(2,`0`)}${String(t%60).padStart(2,`0`)}`})(a),t=t(i),i<a?(At(e,n,17),At(t,r,17)):(At(e,r,17),At(t,n,17))}var Vn=()=>Date.now(),Hn=1;function Un(e,t,n){if(n>>>=0,!(0<=e&&3>=e))return 28;if(e===0)e=Date.now();else{if(!Hn)return 52;e=performance.timeOrigin+performance.now()}return e=Math.round(1e6*e),(w(),re)[n>>>3>>>0]=BigInt(e),0}var H=[],Wn=(e,t)=>{H.length=0;for(var n;n=(w(),E)[e++>>>0];){var r=n!=105;t+=(r&=n!=112)&&t%8?4:0,H.push(n==112?(w(),A)[t>>>2>>>0]:n==106?(w(),re)[t>>>3>>>0]:n==105?(w(),k)[t>>>2>>>0]:(w(),ne)[t>>>3>>>0]),t+=r?8:4}return H};function Gn(e,t,n){return e>>>=0,t=Wn(t>>>0,n>>>0),yi[e](...t)}function Kn(e,t,n){return e>>>=0,t=Wn(t>>>0,n>>>0),yi[e](...t)}var qn=()=>{};function Jn(e,t){return x(F(e>>>0,t>>>0))}var Yn=()=>{throw _e+=1,`unwind`};function Xn(){return 4294901760}var Zn=()=>navigator.hardwareConcurrency,Qn={},$n=e=>{var t;return(t=/\bwasm-function\[\d+\]:(0x[0-9a-f]+)/.exec(e))?+t[1]:(t=/:(\d+):\d+(?:\)|$)/.exec(e))?2147483648|t[1]:0},er=e=>{for(var t of e)(e=$n(t))&&(Qn[e]=t)};function tr(){var e=Error().stack.toString().split(`
`);return e[0]==`Error`&&e.shift(),er(e),Qn.kd=$n(e[3]),Qn.Md=e,Qn.kd}function nr(e){if(!(e=Qn[e>>>0]))return 0;var t;if(t=/^\s+at .*\.wasm\.(.*) \(.*\)$/.exec(e))e=t[1];else if(t=/^\s+at (.*) \(.*\)$/.exec(e))e=t[1];else{if(!(t=/^(.+?)@/.exec(e)))return 0;e=t[1]}U(nr.ld??0),t=jt(e)+1;var n=W(t);return n&&At(e,n,t),nr.ld=n,nr.ld}function rr(e){e>>>=0;var t=(w(),E).length;if(e<=t||4294901760<e)return!1;for(var n=1;4>=n;n*=2){var r=t*(1+.2/n);r=Math.min(r,e+100663296);e:{r=(Math.min(4294901760,65536*Math.ceil(Math.max(e,r)/65536))-N.buffer.byteLength+65535)/65536|0;try{N.grow(r),se();var i=1;break e}catch{}i=void 0}if(i)return!0}return!1}function ir(e,t,n){if(e>>>=0,t>>>=0,Qn.kd==e)var r=Qn.Md;else(r=Error().stack.toString().split(`
`))[0]==`Error`&&r.shift(),er(r);for(var i=3;r[i]&&$n(r[i])!=e;)++i;for(e=0;e<n&&r[e+i];++e)(w(),k)[t+4*e>>>2>>>0]=$n(r[e+i]);return e}var ar,or={},sr=()=>{if(!ar){var e,t={USER:`web_user`,LOGNAME:`web_user`,PATH:`/`,PWD:`/`,HOME:`/home/web_user`,LANG:(globalThis.navigator?.language??`C`).replace(`-`,`_`)+`.UTF-8`,_:`./this.program`};for(e in or)or[e]===void 0?delete t[e]:t[e]=or[e];var n=[];for(e in t)n.push(`${e}=${t[e]}`);ar=n}return ar};function cr(e,t){if(i)return M(19,1,e,t);e>>>=0,t>>>=0;var n,r=0,a=0;for(n of sr()){var o=t+r;(w(),A)[e+a>>>2>>>0]=o,r+=At(n,o,1/0)+1,a+=4}return 0}function lr(e,t){if(i)return M(20,1,e,t);e>>>=0,t>>>=0;var n=sr();for(var r of((w(),A)[e>>>2>>>0]=n.length,e=0,n))e+=jt(r)+1;return(w(),A)[t>>>2>>>0]=e,0}function ur(e){return i?M(21,1,e):52}function dr(e,t,n,r,a){return i?M(22,1,e,t,n,r,a):52}function fr(e,t,n,r){return i?M(23,1,e,t,n,r):52}function pr(e,t,n,r){return i?M(24,1,e,t,n,r):70}var mr=[null,[],[]];function hr(e,t,n,r){if(i)return M(25,1,e,t,n,r);t>>>=0,n>>>=0,r>>>=0;for(var a=0,o=0;o<n;o++){var s=(w(),A)[t>>>2>>>0],c=(w(),A)[t+4>>>2>>>0];t+=8;for(var l=0;l<c;l++){var u=e,d=(w(),E)[s+l>>>0],f=mr[u];d===0||d===10?((u===1?b:x)(Ye(f)),f.length=0):f.push(d)}a+=c}return(w(),A)[r>>>2>>>0]=a,0}function gr(e){return e>>>0}i||(function(){for(var e=t.numThreads-1;e--;)Oe();pe.push(async()=>{var e=(async function(){if(!i)return Promise.all(xe.map(De))})();me++,await e,--me==0&&he&&(e=he,he=null,e())})})(),i||(N=new WebAssembly.Memory({initial:256,maximum:65536,shared:!0}),se()),t.wasmBinary&&(f=t.wasmBinary),t.stackSave=()=>Z(),t.stackRestore=e=>Y(e),t.stackAlloc=e=>X(e),t.setValue=function(e,t,n=`i8`){switch(n.endsWith(`*`)&&(n=`*`),n){case`i1`:case`i8`:(w(),T)[e>>>0]=t;break;case`i16`:(w(),D)[e>>>1>>>0]=t;break;case`i32`:(w(),k)[e>>>2>>>0]=t;break;case`i64`:(w(),re)[e>>>3>>>0]=BigInt(t);break;case`float`:(w(),te)[e>>>2>>>0]=t;break;case`double`:(w(),ne)[e>>>3>>>0]=t;break;case`*`:(w(),A)[e>>>2>>>0]=t;break;default:ce(`invalid type for setValue: ${n}`)}},t.getValue=function(e,t=`i8`){switch(t.endsWith(`*`)&&(t=`*`),t){case`i1`:case`i8`:return(w(),T)[e>>>0];case`i16`:return(w(),D)[e>>>1>>>0];case`i32`:return(w(),k)[e>>>2>>>0];case`i64`:return(w(),re)[e>>>3>>>0];case`float`:return(w(),te)[e>>>2>>>0];case`double`:return(w(),ne)[e>>>3>>>0];case`*`:return(w(),A)[e>>>2>>>0];default:ce(`invalid type for getValue: ${t}`)}},t.UTF8ToString=F,t.stringToUTF8=At,t.lengthBytesUTF8=jt;var _r,vr,yr,U,W,br,xr,Sr,Cr,G,K,wr,q,Tr,J,Y,X,Z,Er,Dr,Or,kr,Q,Ar,jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br,Vr,Hr,Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,ni,ri,ii,ai,oi,si,ci,li,ui,di,fi,pi,mi,hi,gi,_i,vi=[ve,ye,We,Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,B,Ln,V,cr,lr,ur,dr,fr,pr,hr],yi={1094556:(e,n,r,i,a)=>{if(t===void 0||!t.ad)return 1;if((e=F(Number(e>>>0))).startsWith(`./`)&&(e=e.substring(2)),!(e=t.ad.get(e)))return 2;if(n=Number(n>>>0),r=Number(r>>>0),i=Number(i>>>0),n+r>e.byteLength)return 3;try{let o=e.subarray(n,n+r);switch(a){case 0:(w(),E).set(o,i>>>0);break;case 1:t.Td?t.Td(i,o):t.Ld(i,o);break;default:return 4}return 0}catch{return 4}},1095380:(e,n,r)=>{t.wd(e,(w(),E).subarray(n>>>0,n+r>>>0))},1095444:()=>t.Vd(),1095486:e=>{t.vd(e)},1095523:()=>{t.Ed()},1095554:()=>{t.Fd()},1095583:()=>{t.Jd()},1095608:e=>t.Dd(e),1095641:e=>t.Hd(e),1095673:(e,n,r)=>{t.jd(Number(e),Number(n),Number(r),!0)},1095736:(e,n,r)=>{t.jd(Number(e),Number(n),Number(r))},1095793:()=>typeof wasmOffsetConverter<`u`,1095850:e=>{t.bc(`Abs`,e,void 0)},1095901:e=>{t.bc(`Neg`,e,void 0)},1095952:e=>{t.bc(`Floor`,e,void 0)},1096005:e=>{t.bc(`Ceil`,e,void 0)},1096057:e=>{t.bc(`Reciprocal`,e,void 0)},1096115:e=>{t.bc(`Sqrt`,e,void 0)},1096167:e=>{t.bc(`Exp`,e,void 0)},1096218:e=>{t.bc(`Erf`,e,void 0)},1096269:e=>{t.bc(`Sigmoid`,e,void 0)},1096324:(e,n,r)=>{t.bc(`HardSigmoid`,e,{alpha:n,beta:r})},1096403:e=>{t.bc(`HardSwish`,e,void 0)},1096460:e=>{t.bc(`Log`,e,void 0)},1096511:e=>{t.bc(`Sin`,e,void 0)},1096562:e=>{t.bc(`Cos`,e,void 0)},1096613:e=>{t.bc(`Tan`,e,void 0)},1096664:e=>{t.bc(`Asin`,e,void 0)},1096716:e=>{t.bc(`Acos`,e,void 0)},1096768:e=>{t.bc(`Atan`,e,void 0)},1096820:e=>{t.bc(`Sinh`,e,void 0)},1096872:e=>{t.bc(`Cosh`,e,void 0)},1096924:e=>{t.bc(`Asinh`,e,void 0)},1096977:e=>{t.bc(`Acosh`,e,void 0)},1097030:e=>{t.bc(`Atanh`,e,void 0)},1097083:e=>{t.bc(`Tanh`,e,void 0)},1097135:e=>{t.bc(`Not`,e,void 0)},1097186:(e,n,r)=>{t.bc(`Clip`,e,{min:n,max:r})},1097255:e=>{t.bc(`Clip`,e,void 0)},1097307:(e,n)=>{t.bc(`Elu`,e,{alpha:n})},1097365:e=>{t.bc(`Gelu`,e,void 0)},1097417:e=>{t.bc(`Relu`,e,void 0)},1097469:(e,n)=>{t.bc(`LeakyRelu`,e,{alpha:n})},1097533:(e,n)=>{t.bc(`ThresholdedRelu`,e,{alpha:n})},1097603:(e,n)=>{t.bc(`Cast`,e,{to:n})},1097661:e=>{t.bc(`Add`,e,void 0)},1097712:e=>{t.bc(`Sub`,e,void 0)},1097763:e=>{t.bc(`Mul`,e,void 0)},1097814:e=>{t.bc(`Div`,e,void 0)},1097865:e=>{t.bc(`Pow`,e,void 0)},1097916:e=>{t.bc(`Equal`,e,void 0)},1097969:e=>{t.bc(`Greater`,e,void 0)},1098024:e=>{t.bc(`GreaterOrEqual`,e,void 0)},1098086:e=>{t.bc(`Less`,e,void 0)},1098138:e=>{t.bc(`LessOrEqual`,e,void 0)},1098197:(e,n,r,i,a)=>{t.bc(`ReduceMean`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1098372:(e,n,r,i,a)=>{t.bc(`ReduceMax`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1098546:(e,n,r,i,a)=>{t.bc(`ReduceMin`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1098720:(e,n,r,i,a)=>{t.bc(`ReduceProd`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1098895:(e,n,r,i,a)=>{t.bc(`ReduceSum`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1099069:(e,n,r,i,a)=>{t.bc(`ReduceL1`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1099242:(e,n,r,i,a)=>{t.bc(`ReduceL2`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1099415:(e,n,r,i,a)=>{t.bc(`ReduceLogSum`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1099592:(e,n,r,i,a)=>{t.bc(`ReduceSumSquare`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1099772:(e,n,r,i,a)=>{t.bc(`ReduceLogSumExp`,e,{keepDims:!!n,noopWithEmptyAxes:!!r,axes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1099952:e=>{t.bc(`Where`,e,void 0)},1100005:(e,n,r)=>{t.bc(`Transpose`,e,{perm:n?Array.from((w(),k).subarray(Number(n)>>>0,Number(r)>>>0)):[]})},1100129:(e,n,r,i)=>{t.bc(`DepthToSpace`,e,{blocksize:n,mode:F(r),format:i?`NHWC`:`NCHW`})},1100262:(e,n,r,i)=>{t.bc(`DepthToSpace`,e,{blocksize:n,mode:F(r),format:i?`NHWC`:`NCHW`})},1100395:(e,n,r,i)=>{t.bc(`DFT`,e,{axis:n,inverse:r,onesided:i})},1100487:(e,n,r,i,a,o,s,c,l,u,d,f,p,m,h)=>{t.bc(`ConvTranspose`,e,{format:l?`NHWC`:`NCHW`,autoPad:n,dilations:[r],group:i,kernelShape:[a],pads:[o,s],strides:[c],wIsConst:()=>!!(w(),T)[u>>>0],outputPadding:d?Array.from((w(),k).subarray(Number(d)>>>0,Number(f)>>>0)):[],outputShape:p?Array.from((w(),k).subarray(Number(p)>>>0,Number(m)>>>0)):[],activation:F(h)})},1100920:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`ConvTranspose`,e,{format:c?`NHWC`:`NCHW`,autoPad:n,dilations:Array.from((w(),k).subarray(Number(r)>>>0,(Number(r)>>>0)+2>>>0)),group:i,kernelShape:Array.from((w(),k).subarray(Number(a)>>>0,(Number(a)>>>0)+2>>>0)),pads:Array.from((w(),k).subarray(Number(o)>>>0,(Number(o)>>>0)+4>>>0)),strides:Array.from((w(),k).subarray(Number(s)>>>0,(Number(s)>>>0)+2>>>0)),wIsConst:()=>!!(w(),T)[l>>>0],outputPadding:u?Array.from((w(),k).subarray(Number(u)>>>0,Number(d)>>>0)):[],outputShape:f?Array.from((w(),k).subarray(Number(f)>>>0,Number(p)>>>0)):[],activation:F(m)})},1101581:(e,n,r,i,a,o,s,c,l,u,d,f,p,m,h)=>{t.bc(`ConvTranspose`,e,{format:l?`NHWC`:`NCHW`,autoPad:n,dilations:[r],group:i,kernelShape:[a],pads:[o,s],strides:[c],wIsConst:()=>!!(w(),T)[u>>>0],outputPadding:d?Array.from((w(),k).subarray(Number(d)>>>0,Number(f)>>>0)):[],outputShape:p?Array.from((w(),k).subarray(Number(p)>>>0,Number(m)>>>0)):[],activation:F(h)})},1102014:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`ConvTranspose`,e,{format:c?`NHWC`:`NCHW`,autoPad:n,dilations:Array.from((w(),k).subarray(Number(r)>>>0,(Number(r)>>>0)+2>>>0)),group:i,kernelShape:Array.from((w(),k).subarray(Number(a)>>>0,(Number(a)>>>0)+2>>>0)),pads:Array.from((w(),k).subarray(Number(o)>>>0,(Number(o)>>>0)+4>>>0)),strides:Array.from((w(),k).subarray(Number(s)>>>0,(Number(s)>>>0)+2>>>0)),wIsConst:()=>!!(w(),T)[l>>>0],outputPadding:u?Array.from((w(),k).subarray(Number(u)>>>0,Number(d)>>>0)):[],outputShape:f?Array.from((w(),k).subarray(Number(f)>>>0,Number(p)>>>0)):[],activation:F(m)})},1102675:(e,n)=>{t.bc(`GlobalAveragePool`,e,{format:n?`NHWC`:`NCHW`})},1102766:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`AveragePool`,e,{format:m?`NHWC`:`NCHW`,auto_pad:n,ceil_mode:r,count_include_pad:i,storage_order:a,dilations:o?Array.from((w(),k).subarray(Number(o)>>>0,Number(s)>>>0)):[],kernel_shape:c?Array.from((w(),k).subarray(Number(c)>>>0,Number(l)>>>0)):[],pads:u?Array.from((w(),k).subarray(Number(u)>>>0,Number(d)>>>0)):[],strides:f?Array.from((w(),k).subarray(Number(f)>>>0,Number(p)>>>0)):[]})},1103245:(e,n)=>{t.bc(`GlobalAveragePool`,e,{format:n?`NHWC`:`NCHW`})},1103336:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`AveragePool`,e,{format:m?`NHWC`:`NCHW`,auto_pad:n,ceil_mode:r,count_include_pad:i,storage_order:a,dilations:o?Array.from((w(),k).subarray(Number(o)>>>0,Number(s)>>>0)):[],kernel_shape:c?Array.from((w(),k).subarray(Number(c)>>>0,Number(l)>>>0)):[],pads:u?Array.from((w(),k).subarray(Number(u)>>>0,Number(d)>>>0)):[],strides:f?Array.from((w(),k).subarray(Number(f)>>>0,Number(p)>>>0)):[]})},1103815:(e,n)=>{t.bc(`GlobalMaxPool`,e,{format:n?`NHWC`:`NCHW`})},1103902:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`MaxPool`,e,{format:m?`NHWC`:`NCHW`,auto_pad:n,ceil_mode:r,count_include_pad:i,storage_order:a,dilations:o?Array.from((w(),k).subarray(Number(o)>>>0,Number(s)>>>0)):[],kernel_shape:c?Array.from((w(),k).subarray(Number(c)>>>0,Number(l)>>>0)):[],pads:u?Array.from((w(),k).subarray(Number(u)>>>0,Number(d)>>>0)):[],strides:f?Array.from((w(),k).subarray(Number(f)>>>0,Number(p)>>>0)):[]})},1104377:(e,n)=>{t.bc(`GlobalMaxPool`,e,{format:n?`NHWC`:`NCHW`})},1104464:(e,n,r,i,a,o,s,c,l,u,d,f,p,m)=>{t.bc(`MaxPool`,e,{format:m?`NHWC`:`NCHW`,auto_pad:n,ceil_mode:r,count_include_pad:i,storage_order:a,dilations:o?Array.from((w(),k).subarray(Number(o)>>>0,Number(s)>>>0)):[],kernel_shape:c?Array.from((w(),k).subarray(Number(c)>>>0,Number(l)>>>0)):[],pads:u?Array.from((w(),k).subarray(Number(u)>>>0,Number(d)>>>0)):[],strides:f?Array.from((w(),k).subarray(Number(f)>>>0,Number(p)>>>0)):[]})},1104939:(e,n,r,i,a)=>{t.bc(`Gemm`,e,{alpha:n,beta:r,transA:i,transB:a})},1105043:e=>{t.bc(`MatMul`,e,void 0)},1105097:(e,n,r,i)=>{t.bc(`ArgMax`,e,{keepDims:!!n,selectLastIndex:!!r,axis:i})},1105205:(e,n,r,i)=>{t.bc(`ArgMin`,e,{keepDims:!!n,selectLastIndex:!!r,axis:i})},1105313:(e,n)=>{t.bc(`Softmax`,e,{axis:n})},1105376:(e,n)=>{t.bc(`Concat`,e,{axis:n})},1105436:(e,n,r,i,a)=>{t.bc(`Split`,e,{axis:n,numOutputs:r,splitSizes:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1105592:e=>{t.bc(`Expand`,e,void 0)},1105646:(e,n)=>{t.bc(`Gather`,e,{axis:Number(n)})},1105717:(e,n)=>{t.bc(`GatherElements`,e,{axis:Number(n)})},1105796:(e,n)=>{t.bc(`GatherND`,e,{batch_dims:Number(n)})},1105875:(e,n,r,i,a,o,s,c,l,u,d)=>{t.bc(`Resize`,e,{antialias:n,axes:r?Array.from((w(),k).subarray(Number(r)>>>0,Number(i)>>>0)):[],coordinateTransformMode:F(a),cubicCoeffA:o,excludeOutside:s,extrapolationValue:c,keepAspectRatioPolicy:F(l),mode:F(u),nearestMode:F(d)})},1106237:(e,n,r,i,a,o,s)=>{t.bc(`Slice`,e,{starts:n?Array.from((w(),k).subarray(Number(n)>>>0,Number(r)>>>0)):[],ends:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[],axes:o?Array.from((w(),k).subarray(Number(o)>>>0,Number(s)>>>0)):[]})},1106501:e=>{t.bc(`Tile`,e,void 0)},1106553:(e,n,r)=>{t.bc(`InstanceNormalization`,e,{epsilon:n,format:r?`NHWC`:`NCHW`})},1106667:(e,n,r)=>{t.bc(`InstanceNormalization`,e,{epsilon:n,format:r?`NHWC`:`NCHW`})},1106781:e=>{t.bc(`Range`,e,void 0)},1106834:(e,n)=>{t.bc(`Einsum`,e,{equation:F(n)})},1106915:(e,n,r,i,a)=>{t.bc(`Pad`,e,{mode:n,value:r,pads:i?Array.from((w(),k).subarray(Number(i)>>>0,Number(a)>>>0)):[]})},1107058:(e,n,r,i,a,o)=>{t.bc(`BatchNormalization`,e,{epsilon:n,momentum:r,spatial:!!a,trainingMode:!!i,format:o?`NHWC`:`NCHW`})},1107227:(e,n,r,i,a,o)=>{t.bc(`BatchNormalization`,e,{epsilon:n,momentum:r,spatial:!!a,trainingMode:!!i,format:o?`NHWC`:`NCHW`})},1107396:(e,n,r)=>{t.bc(`CumSum`,e,{exclusive:Number(n),reverse:Number(r)})},1107493:(e,n,r)=>{t.bc(`DequantizeLinear`,e,{axis:n,blockSize:r})},1107583:(e,n,r,i,a)=>{t.bc(`GridSample`,e,{align_corners:n,mode:F(r),padding_mode:F(i),format:a?`NHWC`:`NCHW`})},1107753:(e,n,r,i,a)=>{t.bc(`GridSample`,e,{align_corners:n,mode:F(r),padding_mode:F(i),format:a?`NHWC`:`NCHW`})},1107923:(e,n)=>{t.bc(`ScatterND`,e,{reduction:F(n)})},1108008:(e,n,r,i,a,o,s,c,l)=>{t.bc(`Attention`,e,{numHeads:n,isUnidirectional:r,maskFilterValue:i,scale:a,doRotary:o,qkvHiddenSizes:s?Array.from((w(),k).subarray(Number(c)>>>0,Number(c)+s>>>0)):[],pastPresentShareBuffer:!!l})},1108280:e=>{t.bc(`BiasAdd`,e,void 0)},1108335:e=>{t.bc(`BiasSplitGelu`,e,void 0)},1108396:e=>{t.bc(`FastGelu`,e,void 0)},1108452:(e,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g)=>{t.bc(`Conv`,e,{format:f?`NHWC`:`NCHW`,auto_pad:n,dilations:r?Array.from((w(),k).subarray(Number(r)>>>0,Number(i)>>>0)):[],group:a,kernel_shape:o?Array.from((w(),k).subarray(Number(o)>>>0,Number(s)>>>0)):[],pads:c?Array.from((w(),k).subarray(Number(c)>>>0,Number(l)>>>0)):[],strides:u?Array.from((w(),k).subarray(Number(u)>>>0,Number(d)>>>0)):[],w_is_const:()=>!!(w(),T)[Number(p)>>>0],activation:F(m),activation_params:h?Array.from((w(),te).subarray(Number(h)>>>0,Number(g)>>>0)):[]})},1109036:e=>{t.bc(`Gelu`,e,void 0)},1109088:(e,n,r,i,a,o,s,c,l)=>{t.bc(`GroupQueryAttention`,e,{numHeads:n,kvNumHeads:r,scale:i,softcap:a,doRotary:o,rotaryInterleaved:s,smoothSoftmax:c,localWindowSize:l})},1109305:(e,n,r,i)=>{t.bc(`LayerNormalization`,e,{axis:n,epsilon:r,simplified:!!i})},1109416:(e,n,r,i)=>{t.bc(`LayerNormalization`,e,{axis:n,epsilon:r,simplified:!!i})},1109527:(e,n,r,i,a,o)=>{t.bc(`MatMulNBits`,e,{k:n,n:r,accuracyLevel:i,bits:a,blockSize:o})},1109654:(e,n,r,i,a,o)=>{t.bc(`MultiHeadAttention`,e,{numHeads:n,isUnidirectional:r,maskFilterValue:i,scale:a,doRotary:o})},1109813:(e,n)=>{t.bc(`QuickGelu`,e,{alpha:n})},1109877:(e,n,r,i,a)=>{t.bc(`RotaryEmbedding`,e,{interleaved:!!n,numHeads:r,rotaryEmbeddingDim:i,scale:a})},1110016:(e,n,r)=>{t.bc(`SkipLayerNormalization`,e,{epsilon:n,simplified:!!r})},1110118:(e,n,r)=>{t.bc(`SkipLayerNormalization`,e,{epsilon:n,simplified:!!r})},1110220:(e,n,r,i)=>{t.bc(`GatherBlockQuantized`,e,{gatherAxis:n,quantizeAxis:r,blockSize:i})},1110341:e=>{t.Id(e)},1110375:(e,n)=>t.Kd(Number(e),Number(n),t.$c.Nd,t.$c.errors)};function bi(e,n,r){return R(async()=>{await t.Gd(Number(e),Number(n),Number(r))})}function xi(){return typeof wasmOffsetConverter<`u`}function Si(e,t,n,r){var i=Z();try{return Rr(e,t,n,r)}catch(e){if(Y(i),e!==e+0)throw e;q(1,0)}}function Ci(e,t,n){var r=Z();try{return Pr(e,t,n)}catch(e){if(Y(r),e!==e+0)throw e;q(1,0)}}function wi(e){var t=Z();try{jr(e)}catch(e){if(Y(t),e!==e+0)throw e;q(1,0)}}function Ti(e,t){var n=Z();try{return Ar(e,t)}catch(e){if(Y(n),e!==e+0)throw e;q(1,0)}}function Ei(e,t,n){var r=Z();try{Q(e,t,n)}catch(e){if(Y(r),e!==e+0)throw e;q(1,0)}}function Di(e,t){var n=Z();try{zr(e,t)}catch(e){if(Y(n),e!==e+0)throw e;q(1,0)}}function Oi(e,t,n,r,i,a,o){var s=Z();try{return Ir(e,t,n,r,i,a,o)}catch(e){if(Y(s),e!==e+0)throw e;q(1,0)}}function ki(e,t,n,r,i,a){var o=Z();try{Mr(e,t,n,r,i,a)}catch(e){if(Y(o),e!==e+0)throw e;q(1,0)}}function Ai(e,t,n,r){var i=Z();try{Lr(e,t,n,r)}catch(e){if(Y(i),e!==e+0)throw e;q(1,0)}}function ji(e,t,n,r,i){var a=Z();try{Nr(e,t,n,r,i)}catch(e){if(Y(a),e!==e+0)throw e;q(1,0)}}function Mi(e,t,n,r,i,a,o){var s=Z();try{Vr(e,t,n,r,i,a,o)}catch(e){if(Y(s),e!==e+0)throw e;q(1,0)}}function Ni(e,t,n,r,i,a,o){var s=Z();try{Hr(e,t,n,r,i,a,o)}catch(e){if(Y(s),e!==e+0)throw e;q(1,0)}}function Pi(e,t,n,r,i,a,o,s){var c=Z();try{Kr(e,t,n,r,i,a,o,s)}catch(e){if(Y(c),e!==e+0)throw e;q(1,0)}}function Fi(e,t,n,r,i){var a=Z();try{return Br(e,t,n,r,i)}catch(e){if(Y(a),e!==e+0)throw e;q(1,0)}}function Ii(e,t,n){var r=Z();try{return qr(e,t,n)}catch(e){if(Y(r),e!==e+0)throw e;q(1,0)}}function Li(e,t,n,r,i,a,o,s){var c=Z();try{Jr(e,t,n,r,i,a,o,s)}catch(e){if(Y(c),e!==e+0)throw e;q(1,0)}}function Ri(e,t,n,r,i,a,o,s,c,l,u,d){var f=Z();try{Ur(e,t,n,r,i,a,o,s,c,l,u,d)}catch(e){if(Y(f),e!==e+0)throw e;q(1,0)}}function zi(e,t,n){var r=Z();try{return Yr(e,t,n)}catch(e){if(Y(r),e!==e+0)throw e;return q(1,0),0n}}function Bi(e,t,n,r,i,a,o,s,c){var l=Z();try{Fr(e,t,n,r,i,a,o,s,c)}catch(e){if(Y(l),e!==e+0)throw e;q(1,0)}}function Vi(e){var t=Z();try{return Xr(e)}catch(e){if(Y(t),e!==e+0)throw e;q(1,0)}}function Hi(e,t){var n=Z();try{return fi(e,t)}catch(e){if(Y(n),e!==e+0)throw e;return q(1,0),0n}}function Ui(e,t,n,r){var i=Z();try{return Zr(e,t,n,r)}catch(e){if(Y(i),e!==e+0)throw e;q(1,0)}}function Wi(e){var t=Z();try{return Qr(e)}catch(e){if(Y(t),e!==e+0)throw e;return q(1,0),0n}}function Gi(e,t,n,r){var i=Z();try{return ii(e,t,n,r)}catch(e){if(Y(i),e!==e+0)throw e;q(1,0)}}function Ki(e,t,n,r,i){var a=Z();try{return ai(e,t,n,r,i)}catch(e){if(Y(a),e!==e+0)throw e;q(1,0)}}function qi(e,t,n,r,i,a){var o=Z();try{return oi(e,t,n,r,i,a)}catch(e){if(Y(o),e!==e+0)throw e;q(1,0)}}function Ji(e,t,n,r,i,a){var o=Z();try{return Wr(e,t,n,r,i,a)}catch(e){if(Y(o),e!==e+0)throw e;q(1,0)}}function Yi(e,t,n,r,i,a){var o=Z();try{return si(e,t,n,r,i,a)}catch(e){if(Y(o),e!==e+0)throw e;q(1,0)}}function Xi(e,t,n,r,i,a,o,s){var c=Z();try{return Gr(e,t,n,r,i,a,o,s)}catch(e){if(Y(c),e!==e+0)throw e;q(1,0)}}function Zi(e,t,n,r,i){var a=Z();try{return ci(e,t,n,r,i)}catch(e){if(Y(a),e!==e+0)throw e;return q(1,0),0n}}function Qi(e,t,n,r){var i=Z();try{return li(e,t,n,r)}catch(e){if(Y(i),e!==e+0)throw e;q(1,0)}}function $i(e,t,n,r){var i=Z();try{return ui(e,t,n,r)}catch(e){if(Y(i),e!==e+0)throw e;q(1,0)}}function ea(e,t,n,r,i,a,o,s,c,l,u,d){var f=Z();try{return di(e,t,n,r,i,a,o,s,c,l,u,d)}catch(e){if(Y(f),e!==e+0)throw e;q(1,0)}}function ta(e,t,n,r,i,a,o,s,c,l,u){var d=Z();try{ni(e,t,n,r,i,a,o,s,c,l,u)}catch(e){if(Y(d),e!==e+0)throw e;q(1,0)}}function na(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){var g=Z();try{ri(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}catch(e){if(Y(g),e!==e+0)throw e;q(1,0)}}function ra(e,t,n){var r=Z();try{return $r(e,t,n)}catch(e){if(Y(r),e!==e+0)throw e;q(1,0)}}function ia(e,t,n){var r=Z();try{return ei(e,t,n)}catch(e){if(Y(r),e!==e+0)throw e;q(1,0)}}function $(e,t,n,r){var i=Z();try{ti(e,t,n,r)}catch(e){if(Y(i),e!==e+0)throw e;q(1,0)}}function aa(){if(0<me)he=aa;else if(i)h?.(t),j();else{for(var e=pe;0<e.length;)e.shift()(t);0<me?he=aa:(t.calledRun=!0,S||(j(),h?.(t)))}}return i||(_i=await ue(),aa()),t.PTR_SIZE=4,oe?t:new Promise((e,t)=>{h=e,g=t})}var Ft,It,Lt=N(()=>{Ft=Pt,It=globalThis.self?.name?.startsWith(`em-pthread`),It&&Pt()}),Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt=N(()=>{Dt(),Rt=typeof location>`u`?void 0:location.origin,zt=import.meta.url>`file:`&&import.meta.url<`file;`,Bt=()=>zt?new URL(new URL(`ort.bundle.min.mjs`,import.meta.url).href,Rt).href:import.meta.url,Vt=Bt(),Ht=()=>{if(Vt&&!Vt.startsWith(`blob:`))return Vt.substring(0,Vt.lastIndexOf(`/`)+1)},Ut=(e,t)=>{try{let n=t??Vt;return(n?new URL(e,n):new URL(e)).origin===Rt}catch{return!1}},Wt=(e,t)=>{let n=t??Vt;try{return(n?new URL(e,n):new URL(e)).href}catch{return}},Gt=(e,t)=>`${t??`./`}${e}`,Kt=async e=>{let t=await(await fetch(e,{credentials:`same-origin`})).blob();return URL.createObjectURL(t)},qt=async e=>(await D(async()=>{let{default:t}=await import(e);return{default:t}},[],import.meta.url)).default,Jt=(Mt(),je(Ot)).default,Yt=async()=>{if(!Vt)throw Error(`Failed to load proxy worker: cannot determine the script source URL.`);if(Ut(Vt))return[void 0,Jt()];let e=await Kt(Vt);return[e,Jt(e)]},Xt=(Lt(),je(Nt)).default,Zt=async(e,t,n,r)=>{let i=Xt&&!(e||t);if(i){if(Vt)i=Ut(Vt)||r&&!n;else if(r&&!n)i=!0;else throw Error(`cannot determine the script source URL.`)}if(i)return[void 0,Xt];{let r=`ort-wasm-simd-threaded.jsep.mjs`,i=e??Wt(r,t),a=n&&i&&!Ut(i,t),o=a?await Kt(i):i??Gt(r,t);return[a?o:void 0,await qt(o)]}}}),$t,en,tn,nn,rn,an,on,sn,L,cn=N(()=>{Qt(),en=!1,tn=!1,nn=!1,rn=()=>{if(typeof SharedArrayBuffer>`u`)return!1;try{return typeof MessageChannel<`u`&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},an=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},on=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},sn=async e=>{if(en)return Promise.resolve();if(tn)throw Error(`multiple calls to 'initializeWebAssembly()' detected.`);if(nn)throw Error(`previous call to 'initializeWebAssembly()' failed.`);tn=!0;let t=e.initTimeout,n=e.numThreads;if(e.simd!==!1){if(e.simd===`relaxed`){if(!on())throw Error(`Relaxed WebAssembly SIMD is not supported in the current environment.`)}else if(!an())throw Error(`WebAssembly SIMD is not supported in the current environment.`)}let r=rn();n>1&&!r&&(typeof self<`u`&&!self.crossOriginIsolated&&console.warn(`env.wasm.numThreads is set to `+n+`, but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info.`),console.warn(`WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading.`),e.numThreads=n=1);let i=e.wasmPaths,a=typeof i==`string`?i:void 0,o=i?.mjs,s=o?.href??o,c=i?.wasm,l=c?.href??c,u=e.wasmBinary,[d,f]=await Zt(s,a,n>1,!!u||!!l),p=!1,m=[];if(t>0&&m.push(new Promise(e=>{setTimeout(()=>{p=!0,e()},t)})),m.push(new Promise((e,t)=>{let r={numThreads:n};if(u)r.wasmBinary=u,r.locateFile=e=>e;else if(l||a)r.locateFile=e=>l??a+e;else if(s&&s.indexOf(`blob:`)!==0)r.locateFile=e=>new URL(e,s).href;else if(d){let e=Ht();e&&(r.locateFile=t=>e+t)}f(r).then(t=>{tn=!1,en=!0,$t=t,e(),d&&URL.revokeObjectURL(d)},e=>{tn=!1,nn=!0,t(e)})})),await Promise.race(m),p)throw Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},L=()=>{if(en&&$t)return $t;throw Error(`WebAssembly is not initialized yet.`)}}),ln,un,R,dn=N(()=>{cn(),ln=(e,t)=>{let n=L(),r=n.lengthBytesUTF8(e)+1,i=n._malloc(r);return n.stringToUTF8(e,i,r),t.push(i),i},un=(e,t,n,r)=>{if(typeof e==`object`&&e){if(n.has(e))throw Error(`Circular reference in options`);n.add(e)}Object.entries(e).forEach(([e,i])=>{let a=t?t+e:e;if(typeof i==`object`)un(i,a+`.`,n,r);else if(typeof i==`string`||typeof i==`number`)r(a,i.toString());else if(typeof i==`boolean`)r(a,i?`1`:`0`);else throw Error(`Can't handle extra config type: ${typeof i}`)})},R=e=>{let t=L(),n=t.stackSave();try{let n=t.PTR_SIZE,r=t.stackAlloc(2*n);t._OrtGetLastError(r,r+n);let i=Number(t.getValue(r,n===4?`i32`:`i64`)),a=t.getValue(r+n,`*`),o=a?t.UTF8ToString(a):``;throw Error(`${e} ERROR_CODE: ${i}, ERROR_MESSAGE: ${o}`)}finally{t.stackRestore(n)}}}),fn,pn=N(()=>{cn(),dn(),fn=e=>{let t=L(),n=0,r=[],i=e||{};try{if(e?.logSeverityLevel===void 0)i.logSeverityLevel=2;else if(typeof e.logSeverityLevel!=`number`||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw Error(`log severity level is not valid: ${e.logSeverityLevel}`);if(e?.logVerbosityLevel===void 0)i.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!=`number`||!Number.isInteger(e.logVerbosityLevel))throw Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);e?.terminate===void 0&&(i.terminate=!1);let a=0;return e?.tag!==void 0&&(a=ln(e.tag,r)),n=t._OrtCreateRunOptions(i.logSeverityLevel,i.logVerbosityLevel,!!i.terminate,a),n===0&&R(`Can't create run options.`),e?.extra!==void 0&&un(e.extra,``,new WeakSet,(e,i)=>{let a=ln(e,r),o=ln(i,r);t._OrtAddRunConfigEntry(n,a,o)!==0&&R(`Can't set a run config entry: ${e} - ${i}.`)}),[n,r]}catch(e){throw n!==0&&t._OrtReleaseRunOptions(n),r.forEach(e=>t._free(e)),e}}}),mn,hn,gn,_n,vn,yn,bn=N(()=>{cn(),dn(),mn=e=>{switch(e){case`disabled`:return 0;case`basic`:return 1;case`extended`:return 2;case`layout`:return 3;case`all`:return 99;default:throw Error(`unsupported graph optimization level: ${e}`)}},hn=e=>{switch(e){case`sequential`:return 0;case`parallel`:return 1;default:throw Error(`unsupported execution mode: ${e}`)}},gn=e=>{e.extra||={},e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||=`1`,e.executionProviders&&e.executionProviders.some(e=>(typeof e==`string`?e:e.name)===`webgpu`)&&(e.enableMemPattern=!1)},_n=(e,t,n,r)=>{let i=ln(t,r),a=ln(n,r);L()._OrtAddSessionConfigEntry(e,i,a)!==0&&R(`Can't set a session config entry: ${t} - ${n}.`)},vn=async(e,t,n)=>{let r=t.executionProviders;for(let t of r){let r=typeof t==`string`?t:t.name,i=[];switch(r){case`webnn`:if(r=`WEBNN`,_n(e,`session.disable_quant_qdq`,`1`,n),_n(e,`session.disable_qdq_constant_folding`,`1`,n),typeof t!=`string`){let r=t?.deviceType;r&&_n(e,`deviceType`,r,n)}break;case`webgpu`:if(r=`JS`,typeof t!=`string`){let r=t;if(r?.preferredLayout){if(r.preferredLayout!==`NCHW`&&r.preferredLayout!==`NHWC`)throw Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${r.preferredLayout}`);_n(e,`preferredLayout`,r.preferredLayout,n)}}break;case`wasm`:case`cpu`:continue;default:throw Error(`not supported execution provider: ${r}`)}let a=ln(r,n),o=i.length,s=0,c=0;if(o>0){s=L()._malloc(o*L().PTR_SIZE),n.push(s),c=L()._malloc(o*L().PTR_SIZE),n.push(c);for(let e=0;e<o;e++)L().setValue(s+e*L().PTR_SIZE,i[e][0],`*`),L().setValue(c+e*L().PTR_SIZE,i[e][1],`*`)}await L()._OrtAppendExecutionProvider(e,a,s,c,o)!==0&&R(`Can't append execution provider: ${r}.`)}},yn=async e=>{let t=L(),n=0,r=[],i=e||{};gn(i);try{let e=mn(i.graphOptimizationLevel??`all`),a=hn(i.executionMode??`sequential`),o=typeof i.logId==`string`?ln(i.logId,r):0,s=i.logSeverityLevel??2;if(!Number.isInteger(s)||s<0||s>4)throw Error(`log severity level is not valid: ${s}`);let c=i.logVerbosityLevel??0;if(!Number.isInteger(c)||c<0||c>4)throw Error(`log verbosity level is not valid: ${c}`);let l=typeof i.optimizedModelFilePath==`string`?ln(i.optimizedModelFilePath,r):0;if(n=t._OrtCreateSessionOptions(e,!!i.enableCpuMemArena,!!i.enableMemPattern,a,!!i.enableProfiling,0,o,s,c,l),n===0&&R(`Can't create session options.`),i.executionProviders&&await vn(n,i,r),i.enableGraphCapture!==void 0){if(typeof i.enableGraphCapture!=`boolean`)throw Error(`enableGraphCapture must be a boolean value: ${i.enableGraphCapture}`);_n(n,`enableGraphCapture`,i.enableGraphCapture.toString(),r)}if(i.freeDimensionOverrides)for(let[e,a]of Object.entries(i.freeDimensionOverrides)){if(typeof e!=`string`)throw Error(`free dimension override name must be a string: ${e}`);if(typeof a!=`number`||!Number.isInteger(a)||a<0)throw Error(`free dimension override value must be a non-negative integer: ${a}`);let i=ln(e,r);t._OrtAddFreeDimensionOverride(n,i,a)!==0&&R(`Can't set a free dimension override: ${e} - ${a}.`)}return i.extra!==void 0&&un(i.extra,``,new WeakSet,(e,t)=>{_n(n,e,t,r)}),[n,r]}catch(e){throw n!==0&&t._OrtReleaseSessionOptions(n)!==0&&R(`Can't release session options.`),r.forEach(e=>t._free(e)),e}}}),xn,Sn,Cn,wn,Tn,En,Dn,On,z=N(()=>{xn=e=>{switch(e){case`int8`:return 3;case`uint8`:return 2;case`bool`:return 9;case`int16`:return 5;case`uint16`:return 4;case`int32`:return 6;case`uint32`:return 12;case`float16`:return 10;case`float32`:return 1;case`float64`:return 11;case`string`:return 8;case`int64`:return 7;case`uint64`:return 13;case`int4`:return 22;case`uint4`:return 21;default:throw Error(`unsupported data type: ${e}`)}},Sn=e=>{switch(e){case 3:return`int8`;case 2:return`uint8`;case 9:return`bool`;case 5:return`int16`;case 4:return`uint16`;case 6:return`int32`;case 12:return`uint32`;case 10:return`float16`;case 1:return`float32`;case 11:return`float64`;case 8:return`string`;case 7:return`int64`;case 13:return`uint64`;case 22:return`int4`;case 21:return`uint4`;default:throw Error(`unsupported data type: ${e}`)}},Cn=(e,t)=>{let n=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],r=typeof t==`number`?t:t.reduce((e,t)=>e*t,1);return n>0?Math.ceil(r*n):void 0},wn=e=>{switch(e){case`float16`:return typeof Float16Array<`u`?Float16Array:Uint16Array;case`float32`:return Float32Array;case`uint8`:return Uint8Array;case`int8`:return Int8Array;case`uint16`:return Uint16Array;case`int16`:return Int16Array;case`int32`:return Int32Array;case`bool`:return Uint8Array;case`float64`:return Float64Array;case`uint32`:return Uint32Array;case`int64`:return BigInt64Array;case`uint64`:return BigUint64Array;default:throw Error(`unsupported type: ${e}`)}},Tn=e=>{switch(e){case`verbose`:return 0;case`info`:return 1;case`warning`:return 2;case`error`:return 3;case`fatal`:return 4;default:throw Error(`unsupported logging level: ${e}`)}},En=e=>e===`float32`||e===`float16`||e===`int32`||e===`int64`||e===`uint32`||e===`uint8`||e===`bool`||e===`uint4`||e===`int4`,Dn=e=>e===`float32`||e===`float16`||e===`int32`||e===`int64`||e===`uint32`||e===`uint64`||e===`int8`||e===`uint8`||e===`bool`||e===`uint4`||e===`int4`,On=e=>{switch(e){case`none`:return 0;case`cpu`:return 1;case`cpu-pinned`:return 2;case`texture`:return 3;case`gpu-buffer`:return 4;case`ml-tensor`:return 5;default:throw Error(`unsupported data location: ${e}`)}}}),kn,An=N(()=>{Dt(),kn=async e=>{if(typeof e==`string`){let t=await fetch(e);if(!t.ok)throw Error(`failed to load external data file: ${e}`);let n=t.headers.get(`Content-Length`),r=n?parseInt(n,10):0;if(r<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw Error(`failed to load external data file: ${e}, no response body.`);let n=t.body.getReader(),i;try{i=new ArrayBuffer(r)}catch(e){if(e instanceof RangeError){let e=Math.ceil(r/65536);i=new WebAssembly.Memory({initial:e,maximum:e}).buffer}else throw e}let a=0;for(;;){let{done:e,value:t}=await n.read();if(e)break;let r=t.byteLength;new Uint8Array(i,a,r).set(t),a+=r}return new Uint8Array(i,0,r)}}return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}}),jn,Mn,Nn,Pn,Fn,In,B,Ln=N(()=>{z(),jn=[`V`,`I`,`W`,`E`,`F`],Mn=(e,t)=>{console.log(`[${jn[e]},${new Date().toISOString()}]${t}`)},Fn=(e,t)=>{Nn=e,Pn=t},In=(e,t)=>{let n=Tn(e);n>=Tn(Nn)&&Mn(n,typeof t==`function`?t():t)},B=(...e)=>{Pn&&In(...e)}}),Rn,zn,V,Bn,Vn,Hn,Un,H=N(()=>{Rn=class{static calcMatMulShape(e,t){return e[1]===t[0]?[e[0],t[1]]:void 0}},zn=class{static calcShape(e,t,n=!1){let r=e.length,i=t.length;if(r===0)return t;if(i===0)return e;let a=Math.max(e.length,t.length),o=Array(a);if(n){if(r<2||i<2)return;let n=Rn.calcMatMulShape([e[r-2],e[r-1]],[t[i-2],t[i-1]]);if(n===void 0)return;[o[a-2],o[a-1]]=n}for(let s=n?3:1;s<=a;s++){let n=r-s<0?1:e[r-s],c=i-s<0?1:t[i-s];if(n!==c&&n>1&&c>1)return;let l=Math.max(n,c);if(n&&c)o[a-s]=Math.max(n,c);else{if(l>1)return;o[a-s]=0}}return o}static isValidBroadcast(e,t){let n=e.length,r=t.length;if(n>r)return!1;for(let i=1;i<=n;i++)if(e[n-i]!==1&&e[n-i]!==t[r-i])return!1;return!0}},V=class e{static size(t){return e.getSizeFromDimensionRange(t,0,t.length)}static convertShape(e,t=4){let n=e.length;if(n===0)return[];let r=Array(n),i=n-1;for(;i>=0;){if(e[i]%t===0){r[i]=e[i]/t;break}if(t%e[i]!==0)throw Error(`cannot convert shape`);r[i]=1,t/=e[i],i--}for(i--;i>=0;i--)r[i]=e[i];return r}static sizeFromDimension(t,n){if(n<0||n>t.length)throw Error(`invalid dimension of ${n} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return e.getSizeFromDimensionRange(t,n,t.length)}static sizeToDimension(t,n){if(n<0||n>t.length)throw Error(`invalid dimension of ${n} for sizeToDimension as Tensor has ${t.length} dimensions.`);return e.getSizeFromDimensionRange(t,0,n)}static getSizeFromDimensionRange(e,t,n){let r=1;for(let i=t;i<n;i++){if(e[i]<0)throw Error(`cannot get valid size from specified dimension range. Most likely the range contains negative values in them.`);r*=Number(e[i])}return r}static computeStrides(e){let t=e.length;if(t===0)return[];if(t===1)return[1];let n=Array(t);n[t-1]=1,n[t-2]=e[t-1];for(let r=t-3;r>=0;--r)n[r]=n[r+1]*e[r+1];return n}static normalizeAxis(e,t){if(e<-t&&e>=t)throw Error(`unsupported axis for this operation.`);return e<0?e+t:e}static normalizeAxes(e,t){return e.map(n=>this.normalizeAxis(n,t??e.length))}static sortBasedOnPerm(e,t){return t?t.map(t=>e[t]):e.slice().reverse()}static padShape(e,t){let n=e.length;return e.map((e,r)=>e+t[r]+t[r+n])}static areEqual(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}},Bn=class e{static adjustPoolAttributes(e,t,n,r,i,a){if(!e&&n.length!==t.length-2)throw Error(`length of specified kernel shapes should be 2 less than length of input dimensions`);if(e)for(let e=0;e<t.length-2;e++)e>=n.length?n.push(t[e+2]):n[e]=t[e+2];for(let e=0;e<n.length;e++)if(e<r.length){if(r[e]<0)throw Error(`strides should be greater than or equal to 1`)}else r.push(1);for(let e=0;e<n.length;e++)if(e<i.length){if(i[e]<0)throw Error(`dilations should be greater than or equal to 1`)}else i.push(1);for(let e=0;e<n.length*2;e++)if(e<a.length){if(a[e]<0)throw Error(`pad should be greater than or equal to 1`)}else a.push(0);for(let e=0;e<n.length;e++){if(n[e]<=0)throw Error(`kernel shapes need to be greater than 0`);if(a[e]>=n[e]||a[e+n.length]>=n[e])throw Error(`pads should be smaller than kernel`)}}static adjustPadsBasedOnAutoPad(t,n,r,i,a,o,s){if(s){if(a.length!==2*(t.length-2))throw Error(`length of pads should be twice the length of data dimensions`);if(n.length!==t.length-2)throw Error(`length of strides should be the length of data dimensions`);if(i.length!==t.length-2)throw Error(`length of kernel shapes should be the length of data dimensions`);for(let c=0;c<t.length-2;c++)e.adjustPadAndReturnShape(t[c+(o?1:2)],n[c],r[c],i[c],a,c,c+t.length-2,s)}}static computePoolOutputShape(t,n,r,i,a,o,s,c=0){if(n.length<=0)throw Error(`input shape must be of size greater than 0`);let l=[n[0],n[1]];return e.computeShapeHelper(t,n,l,r,i,a,o,s,c),l}static computeConvOutputShape(t,n,r,i,a,o,s){if(t.length<=0||n.length<=0)throw Error(`invalid input tensor dims or invalid filter tensor dims`);let c=[t[0],n[0]];return e.computeShapeHelper(!1,t,c,r,i,a,o,s),c}static computeShapeHelper(t,n,r,i,a,o,s,c,l=0){if(t)for(let e=0;e<n.length-2;e++)r.push(1);else for(let t=0;t<n.length-2;t++)r.push(e.adjustPadAndReturnShape(n[t+2],i[t],a[t],o[t],s,t,t+n.length-2,c,l))}static computeOutputSize(e,t,n,r,i){let a=Math.floor(e/t)+1;return i===1&&(a=Math.ceil(e/t)+1,(a-1)*t>=n+r&&--a),a}static adjustPadAndReturnShape(t,n,r,i,a,o,s,c,l=0){let u=r*(i-1)+1;if(c&&c!==`NOTSET`)switch(c){case`VALID`:return a[o]=0,a[s]=0,e.computeOutputSize(t-u,n,t,0,l);case`SAME_LOWER`:case`SAME_UPPER`:if(r!==1)throw Error(`Dilation not supported for SAME_UPPER or SAME_LOWER`);{let r=(Math.floor((t+n-1)/n)-1)*n+i-t;return a[o]=Math.floor(c===`SAME_LOWER`?(r+1)/2:r/2),a[s]=r-a[o],e.computeOutputSize(t+a[o]+a[s]-u,n,t,a[o],l)}default:throw Error(`Unsupported AutoPad type`)}else return e.computeOutputSize(t+a[o]+a[s]-u,n,t,a[o],l)}},Vn=class{static getShapeOfGemmResult(e,t,n,r,i){if(e.length!==2||n.length!==2)throw Error(`shape need to be of size 2`);let a,o,s;t?(a=e[1],o=e[0]):(a=e[0],o=e[1]);let c=-1;if(r?(s=n[0],c=1):(s=n[1],c=0),n[c]!==o)throw Error(`dimension mismatch`);if(a<=0||s<=0||o<=0)throw Error(`invalid shape specified`);if(i&&!zn.isValidBroadcast(i,[a,s]))throw Error(`gemm: invalid bias shape for broadcast`);return[a,s,o]}},Hn=-34028234663852886e22,Un=34028234663852886e22}),Wn,Gn=N(()=>{z(),Wn=(e,t)=>new(wn(t))(e)}),Kn,qn,Jn,Yn,Xn,Zn,Qn,$n,er,tr,nr,rr=N(()=>{z(),Ln(),Kn=new Map([[`float32`,32],[`float16`,16],[`int32`,32],[`uint32`,32],[`int64`,64],[`uint64`,64],[`int8`,8],[`uint8`,8],[`int4`,4],[`uint4`,4]]),qn=(e,t)=>{if(t===`int32`)return e;let n=Kn.get(t);if(!n)throw Error(`WebNN backend does not support data type: ${t}`);let r=n/8;if(e.byteLength%r!==0)throw Error(`Invalid Uint8Array length - must be a multiple of ${r}.`);let i=e.byteLength/r,a=new(wn(t))(e.buffer,e.byteOffset,i);switch(t){case`int64`:case`uint64`:{let e=new Int32Array(i);for(let t=0;t<i;t++){let n=a[t];if(n>2147483647n||n<-2147483648n)throw Error(`Can not convert int64 data to int32 - value out of range.`);e[t]=Number(n)}return new Uint8Array(e.buffer)}case`int8`:case`uint8`:case`uint32`:{if(t===`uint32`&&a.some(e=>e>2147483647))throw Error(`Can not convert uint32 data to int32 - value out of range.`);let e=Int32Array.from(a,Number);return new Uint8Array(e.buffer)}default:throw Error(`Unsupported data conversion from ${t} to 'int32'`)}},Jn=(e,t)=>{if(t===`int32`)return e;if(e.byteLength%4!=0)throw Error(`Invalid Uint8Array length - must be a multiple of 4 (int32).`);let n=e.byteLength/4,r=new Int32Array(e.buffer,e.byteOffset,n);switch(t){case`int64`:{let e=BigInt64Array.from(r,BigInt);return new Uint8Array(e.buffer)}case`uint64`:{if(r.some(e=>e<0))throw Error(`Can not convert int32 data to uin64 - negative value found.`);let e=BigUint64Array.from(r,BigInt);return new Uint8Array(e.buffer)}case`int8`:{if(r.some(e=>e<-128||e>127))throw Error(`Can not convert int32 data to int8 - value out of range.`);let e=Int8Array.from(r,Number);return new Uint8Array(e.buffer)}case`uint8`:if(r.some(e=>e<0||e>255))throw Error(`Can not convert int32 data to uint8 - value out of range.`);return Uint8Array.from(r,Number);case`uint32`:{if(r.some(e=>e<0))throw Error(`Can not convert int32 data to uint32 - negative value found.`);let e=Uint32Array.from(r,Number);return new Uint8Array(e.buffer)}default:throw Error(`Unsupported data conversion from 'int32' to ${t}`)}},Yn=1,Xn=()=>Yn++,Zn=new Map([[`int8`,`int32`],[`uint8`,`int32`],[`uint32`,`int32`],[`int64`,`int32`]]),Qn=(e,t)=>{let n=Kn.get(e);if(!n)throw Error(`WebNN backend does not support data type: ${e}`);return t.length>0?Math.ceil(t.reduce((e,t)=>e*t)*n/8):0},$n=class{constructor(e){this.isDataConverted=!1;let{sessionId:t,context:n,tensor:r,dataType:i,shape:a,fallbackDataType:o}=e;this.sessionId=t,this.mlContext=n,this.mlTensor=r,this.dataType=i,this.tensorShape=a,this.fallbackDataType=o}get tensor(){return this.mlTensor}get type(){return this.dataType}get fallbackType(){return this.fallbackDataType}get shape(){return this.tensorShape}get byteLength(){return Qn(this.dataType,this.tensorShape)}destroy(){B(`verbose`,()=>`[WebNN] TensorWrapper.destroy`),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e){if(this.fallbackDataType){let t=await this.mlContext.readTensor(this.mlTensor),n=Jn(new Uint8Array(t),this.dataType);if(e){(e instanceof ArrayBuffer?new Uint8Array(e):new Uint8Array(e.buffer,e.byteOffset,e.byteLength)).set(n);return}return new Uint8Array(n).buffer}return e?this.mlContext.readTensor(this.mlTensor,e):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,t,n){return this.mlContext===e&&this.dataType===t&&this.tensorShape.length===n.length&&this.tensorShape.every((e,t)=>e===n[t])}setIsDataConverted(e){this.isDataConverted=e}},er=class{constructor(e,t){this.tensorManager=e,this.wrapper=t}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,t,n,r){let i=this.tensorManager.getMLContext(e),a=this.tensorManager.getMLOpSupportLimits(e),o;if(!a?.input.dataTypes.includes(t)){if(o=Zn.get(t),!o||!a?.input.dataTypes.includes(o))throw Error(`WebNN backend does not support data type: ${t}`);B(`verbose`,()=>`[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${t} to ${o}`)}if(this.wrapper){if(this.wrapper.canReuseTensor(i,t,n))return this.wrapper.tensor;if(r){if(this.wrapper.byteLength!==Qn(t,n))throw Error(`Unable to copy data to tensor with different size.`);this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let s=typeof MLTensorUsage>`u`?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,t,n,s,!0,!0,o),r&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){let t=e;if(this.wrapper){if(this.wrapper.fallbackType){if(this.wrapper.fallbackType===`int32`)t=qn(e,this.wrapper.type),this.wrapper.setIsDataConverted(!0);else throw Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`)}if(e.byteLength===this.wrapper.byteLength){this.wrapper.write(t);return}B(`verbose`,()=>`Data size does not match tensor size. Releasing tensor.`),this.releaseTensor()}this.activeUpload?this.activeUpload.set(t):this.activeUpload=new Uint8Array(t)}async download(e){if(this.activeUpload){let t=this.wrapper?.isDataConverted?Jn(this.activeUpload,this.wrapper?.type):this.activeUpload;if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(t):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(t);return}return t.buffer}if(!this.wrapper)throw Error(`Tensor has not been created.`);return e?this.wrapper.read(e):this.wrapper.read()}},tr=class{constructor(e){this.backend=e,this.tensorTrackersById=new Map,this.freeTensors=[],this.externalTensors=new Set}getMLContext(e){let t=this.backend.getMLContext(e);if(!t)throw Error(`MLContext not found for session.`);return t}getMLOpSupportLimits(e){return this.backend.getMLOpSupportLimits(e)}reserveTensorId(){let e=Xn();return this.tensorTrackersById.set(e,new er(this)),e}releaseTensorId(e){let t=this.tensorTrackersById.get(e);t&&(this.tensorTrackersById.delete(e),t.tensorWrapper&&this.releaseTensor(t.tensorWrapper))}async ensureTensor(e,t,n,r,i){B(`verbose`,()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${t}, dataType: ${n}, shape: ${r}, copyOld: ${i}}`);let a=this.tensorTrackersById.get(t);if(!a)throw Error(`Tensor not found.`);return a.ensureTensor(e,n,r,i)}upload(e,t){let n=this.tensorTrackersById.get(e);if(!n)throw Error(`Tensor not found.`);n.upload(t)}async download(e,t){B(`verbose`,()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t?.byteLength}}`);let n=this.tensorTrackersById.get(e);if(!n)throw Error(`Tensor not found.`);return n.download(t)}releaseTensorsForSession(e){for(let t of this.freeTensors)t.sessionId===e&&t.destroy();this.freeTensors=this.freeTensors.filter(t=>t.sessionId!==e)}registerTensor(e,t,n,r){let i=this.getMLContext(e),a=Xn(),o=new $n({sessionId:e,context:i,tensor:t,dataType:n,shape:r});return this.tensorTrackersById.set(a,new er(this,o)),this.externalTensors.add(o),a}async getCachedTensor(e,t,n,r,i,a,o){let s=this.getMLContext(e);for(let[r,i]of this.freeTensors.entries())if(i.canReuseTensor(s,t,n)){B(`verbose`,()=>`[WebNN] Reusing tensor {dataType: ${t}, ${o?`fallbackDataType: ${o},`:``} shape: ${n}`);let i=this.freeTensors.splice(r,1)[0];return i.sessionId=e,i}B(`verbose`,()=>`[WebNN] MLContext.createTensor {dataType: ${t}, ${o?`fallbackDataType: ${o},`:``} shape: ${n}}`);let c=await s.createTensor({dataType:o??t,shape:n,dimensions:n,usage:r,writable:i,readable:a});return new $n({sessionId:e,context:s,tensor:c,dataType:t,shape:n,fallbackDataType:o})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},nr=(...e)=>new tr(...e)}),ir,ar,or,sr=N(()=>{z(),cn(),Gn(),rr(),Ln(),ir=new Map([[1,`float32`],[10,`float16`],[6,`int32`],[12,`uint32`],[7,`int64`],[13,`uint64`],[22,`int4`],[21,`uint4`],[3,`int8`],[2,`uint8`],[9,`uint8`]]),ar=(e,t)=>{if(e===t)return!0;if(e===void 0||t===void 0)return!1;let n=Object.keys(e).sort(),r=Object.keys(t).sort();return n.length===r.length&&n.every((n,i)=>n===r[i]&&e[n]===t[n])},or=class{constructor(e){this.tensorManager=nr(this),this.mlContextBySessionId=new Map,this.sessionIdsByMLContext=new Map,this.mlContextCache=[],this.sessionGraphInputs=new Map,this.sessionGraphOutputs=new Map,this.temporaryGraphInputs=[],this.temporaryGraphOutputs=[],this.temporarySessionTensorIds=new Map,this.mlOpSupportLimitsBySessionId=new Map,Fn(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw Error(`No active session`);return this.activeSessionId}onRunStart(e){B(`verbose`,()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){B(`verbose`,()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let t=this.temporarySessionTensorIds.get(e);if(t){for(let e of t)B(`verbose`,()=>`[WebNN] releasing temporary tensor {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let t=this.mlContextCache.findIndex(t=>t.gpuDevice===e);if(t!==-1)return this.mlContextCache[t].mlContext;{let t=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:t}),t}}if(e===void 0){let e=this.mlContextCache.findIndex(e=>e.options===void 0&&e.gpuDevice===void 0);if(e!==-1)return this.mlContextCache[e].mlContext;{let e=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:e}),e}}let t=this.mlContextCache.findIndex(t=>ar(t.options,e));if(t!==-1)return this.mlContextCache[t].mlContext;{let t=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:t}),t}}registerMLContext(e,t){this.mlContextBySessionId.set(e,t);let n=this.sessionIdsByMLContext.get(t);n||(n=new Set,this.sessionIdsByMLContext.set(t,n)),n.add(e),this.mlOpSupportLimitsBySessionId.has(e)||this.mlOpSupportLimitsBySessionId.set(e,t.opSupportLimits()),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[]),this.temporaryGraphOutputs.length>0&&(this.sessionGraphOutputs.set(e,this.temporaryGraphOutputs),this.temporaryGraphOutputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e),this.sessionGraphOutputs.delete(e);let t=this.mlContextBySessionId.get(e);if(!t)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e),this.mlOpSupportLimitsBySessionId.delete(e);let n=this.sessionIdsByMLContext.get(t);if(n.delete(e),n.size===0){this.sessionIdsByMLContext.delete(t);let e=this.mlContextCache.findIndex(e=>e.mlContext===t);e!==-1&&this.mlContextCache.splice(e,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}getMLOpSupportLimits(e){return this.mlOpSupportLimitsBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){B(`verbose`,()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,t,n,r,i){let a=ir.get(n);if(!a)throw Error(`Unsupported ONNX data type: ${n}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,t,a,r,i)}async createTemporaryTensor(e,t,n){B(`verbose`,()=>`[WebNN] createTemporaryTensor {onnxDataType: ${t}, shape: ${n}}`);let r=ir.get(t);if(!r)throw Error(`Unsupported ONNX data type: ${t}`);let i=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,i,r,n,!1);let a=this.temporarySessionTensorIds.get(e);return a?a.push(i):this.temporarySessionTensorIds.set(e,[i]),i}uploadTensor(e,t){if(!L().shouldTransferToMLTensor)throw Error(`Trying to upload to a MLTensor while shouldTransferToMLTensor is false`);B(`verbose`,()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`),this.tensorManager.upload(e,t)}async downloadTensor(e,t){return this.tensorManager.download(e,t)}createMLTensorDownloader(e,t){return async()=>{let n=await this.tensorManager.download(e);return Wn(n,t)}}registerMLTensor(e,t,n,r){let i=ir.get(n);if(!i)throw Error(`Unsupported ONNX data type: ${n}`);let a=this.tensorManager.registerTensor(e,t,i,r);return B(`verbose`,()=>`[WebNN] registerMLTensor {tensor: ${t}, dataType: ${i}, dimensions: ${r}} -> {tensorId: ${a}}`),a}registerGraphInput(e){this.temporaryGraphInputs.push(e)}registerGraphOutput(e){this.temporaryGraphOutputs.push(e)}isGraphInput(e,t){let n=this.sessionGraphInputs.get(e);return n?n.includes(t):!1}isGraphOutput(e,t){let n=this.sessionGraphOutputs.get(e);return n?n.includes(t):!1}isGraphInputOutputTypeSupported(e,t,n=!0){let r=ir.get(xn(t)),i=this.mlOpSupportLimitsBySessionId.get(e);return typeof r>`u`?!1:n?!!i?.input.dataTypes.includes(r):!!i?.output.dataTypes.includes(r)}flush(){}}}),cr=N(()=>{}),lr,ur,dr,fr,pr,mr,hr,gr,_r,vr=N(()=>{Ln(),cr(),lr=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),ur=[],dr=e=>Math.ceil(Number(e)/16)*16,fr=e=>{for(let t=0;t<ur.length;t++){let n=ur[t];if(e<=n)return n}return Math.ceil(e/16)*16},pr=1,mr=()=>pr++,hr=async(e,t,n,r)=>{let i=dr(n),a=e.device.createBuffer({size:i,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let o=e.getCommandEncoder();e.endComputePass(),o.copyBufferToBuffer(t,0,a,0,i),e.flush(),await a.mapAsync(GPUMapMode.READ);let s=a.getMappedRange();if(r){let e=r();return e.set(new Uint8Array(s,0,n)),e}return new Uint8Array(s.slice(0,n))}finally{a.destroy()}},gr=class{constructor(e){this.backend=e,this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[e]of lr)ur.push(e),this.freeBuffers.set(e,[]),this.freeUniformBuffers.set(e,[]);this.sessionCount=0}upload(e,t){let n=t.buffer,r=t.byteOffset,i=t.byteLength,a=dr(i),o=this.storageCache.get(e);if(!o)throw Error(`gpu data for uploading does not exist`);if(Number(o.originalSize)!==i)throw Error(`inconsistent data size. gpu data size=${o.originalSize}, data size=${i}`);if(a===i&&r%4==0)this.backend.device.queue.writeBuffer(o.gpuData.buffer,0,n,r,i);else{let e=new Uint8Array(a);e.set(t),this.backend.device.queue.writeBuffer(o.gpuData.buffer,0,e,0,a)}B(`verbose`,()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,t){let n=this.storageCache.get(e);if(!n)throw Error(`source gpu data for memcpy does not exist`);let r=this.storageCache.get(t);if(!r)throw Error(`destination gpu data for memcpy does not exist`);if(n.originalSize!==r.originalSize)throw Error(`inconsistent source and destination gpu data size`);let i=dr(n.originalSize),a=this.backend.getCommandEncoder();this.backend.endComputePass(),a.copyBufferToBuffer(n.gpuData.buffer,0,r.gpuData.buffer,0,i)}registerExternalBuffer(e,t,n){let r;if(n){if(r=n[0],e===n[1])return B(`verbose`,()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${r}, buffer is the same, skip.`),r;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else r=mr();return this.storageCache.set(r,{gpuData:{id:r,type:0,buffer:e},originalSize:t}),B(`verbose`,()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${r}, registered.`),r}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),B(`verbose`,()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,t=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let n=fr(e),r,i=(t&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,a=(t&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(i||a){let e=(i?this.freeBuffers:this.freeUniformBuffers).get(n);r=e&&e.length>0?e.pop():this.backend.device.createBuffer({size:n,usage:t})}else r=this.backend.device.createBuffer({size:n,usage:t});let o={id:mr(),type:0,buffer:r};return this.storageCache.set(o.id,{gpuData:o,originalSize:Number(e)}),B(`verbose`,()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${o.id}`),o}get(e){return this.storageCache.get(e)?.gpuData}release(e){let t=typeof e==`bigint`?Number(e):e,n=this.storageCache.get(t);if(!n){if(this.storageCache.size===0)return 0;throw Error(`releasing data does not exist`)}return B(`verbose`,()=>`[WebGPU] GpuDataManager.release(id=${t}), gpuDataId=${n.gpuData.id}`),this.storageCache.delete(t),this.buffersPending.push(n.gpuData.buffer),n.originalSize}async download(e,t){let n=this.storageCache.get(Number(e));if(!n)throw Error(`data does not exist`);await hr(this.backend,n.gpuData.buffer,n.originalSize,t)}refreshPendingBuffers(){if(this.buffersPending.length!==0){if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let t=lr.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let n=this.freeBuffers.get(e.size)||[];t===void 0||n.length>=t?e.destroy():n.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let n=this.freeUniformBuffers.get(e.size)||[];t===void 0||n.length>=t?e.destroy():n.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let t of this.buffersPending)e.push(t);this.buffersPending=[]}}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(e=>{e.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(e=>{e.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(e=>{e.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let t=this.capturedPendingBuffers.get(e);t&&(t.forEach(e=>{e.destroy()}),this.capturedPendingBuffers.delete(e)),--this.sessionCount,this.sessionCount===0&&(B(`warning`,()=>`[WebGPU] Clearing webgpu buffer cache`),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.storageCache=new Map)}},_r=(...e)=>new gr(...e)}),yr,U,W=N(()=>{yr=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(`;`),this.key}},U=e=>new yr(e)}),br,xr,Sr,Cr,G,K,wr,q,Tr,J,Y,X,Z,Er,Dr,Or,kr,Q=N(()=>{z(),H(),br=64,xr=(e,t)=>{if(t===3)throw Error(`vec3 has same alignment as vec4, use vec4 instead`);switch(Number(e)){case 10:return t>1?`vec${t}<f16>`:`f16`;case 1:return t>1?`vec${t}<f32>`:`f32`;case 6:return t>1?`vec${t}<i32>`:`i32`;case 12:return t>1?`vec${t}<u32>`:`u32`;case 7:if(t>1)throw Error(`currently not supported vecX of uint64 yet`);return[`vec2<u32>`,`i32`];case 13:if(t>1)throw Error(`currently not supported vecX of uint64 yet`);return[`vec2<u32>`,`u32`];case 9:if(t!==4)throw Error(`bool must be vec4`);return[`u32`,`vec4<bool>`];case 22:return`i32`;case 21:return`u32`;default:throw Error(`Unknown data type: ${e}`)}},Sr=(e,t=1)=>{let n=xr(e,t);return typeof n==`string`?n:n[0]},Cr=(e,t=1)=>{let n=xr(e,t);return typeof n==`string`?n:n[1]},G=(...e)=>{let t=[];return e.forEach(e=>{e.length!==0&&t.push({type:12,data:e},{type:12,data:V.computeStrides(e)})}),t},K=e=>e%4==0?4:e%2==0?2:1,wr=(e=`f32`,t,n=`0`)=>!t||t===1?`${e}(${n})`:`vec${t}<${e}>(${n})`,q=(e,t,n)=>e===`f32`?n:t===1?`f32(${n})`:`vec${t}<f32>(${n})`,Tr=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,J=(e,t,n,r)=>e.startsWith(`uniforms.`)&&n>4?typeof t==`string`?r===`f16`?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:r===`f16`?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:n>1?`${e}[${t}]`:e,Y=(e,t,n,r,i)=>{let a=typeof n==`number`,o=a?n:n.length,s=[...Array(o).keys()],c=o<2?`u32`:o<=4?`vec${o}<u32>`:`array<u32, ${o}>`,l=xr(t,i),u=typeof l==`string`?l:l[1],d={indices:c,value:u,storage:typeof l==`string`?l:l[0],tensor:t},f=e=>typeof e==`string`?e:`${e}u`,p={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},m=a?`uniforms.`:``,h=`${m}${e}_shape`,g=`${m}${e}_strides`,_=``;for(let e=0;e<o-1;e++)_+=`
    let dim${e} = current / ${J(g,e,o)};
    let rest${e} = current % ${J(g,e,o)};
    indices[${e}] = dim${e};
    current = rest${e};
    `;_+=`indices[${o-1}] = current;`;let v=o<2?``:`
  fn o2i_${e}(offset: u32) -> ${d.indices} {
    var indices: ${d.indices};
    var current = offset;
    ${_}
    return indices;
  }`,y=t=>(p.offsetToIndices=!0,o<2?t:`o2i_${e}(${t})`),b=[];if(o>=2)for(let e=o-1;e>=0;e--)b.push(`${J(g,e,o)} * (indices[${e}])`);let x=o<2?``:`
  fn i2o_${e}(indices: ${d.indices}) -> u32 {
    return ${b.join(`+`)};
  }`,S=t=>(p.indicesToOffset=!0,o<2?t:`i2o_${e}(${t})`),C=(...e)=>o===0?`0u`:`${d.indices}(${e.map(f).join(`,`)})`,w=(e,t)=>o<2?`${e}`:`${J(e,t,o)}`,ee=(e,t,n)=>o<2?`${e}=${n};`:`${J(e,t,o)}=${n};`,T={},E=(t,n)=>{p.broadcastedIndicesToOffset=!0;let r=`${n.name}broadcastedIndicesTo${e}Offset`;if(r in T)return`${r}(${t})`;let i=[];for(let e=o-1;e>=0;e--){let t=n.indicesGet(`outputIndices`,e+n.rank-o);i.push(`${w(g,e)} * (${t} % ${w(h,e)})`)}return T[r]=`fn ${r}(outputIndices: ${n.type.indices}) -> u32 {
             return ${i.length>0?i.join(`+`):`0u`};
           }`,`${r}(${t})`},D=(t,n)=>(()=>{if(d.storage===d.value)return`${e}[${t}]=${n};`;if(d.storage===`vec2<u32>`&&d.value===`i32`)return`${e}[${t}]=vec2<u32>(u32(${n}), select(0u, 0xFFFFFFFFu, ${n} < 0));`;if(d.storage===`vec2<u32>`&&d.value===`u32`)return`${e}[${t}]=vec2<u32>(u32(${n}), 0u);`;if(d.storage===`u32`&&d.value===`vec4<bool>`)return`${e}[${t}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${n}));`;throw Error(`not supported combination of storage type ${d.storage} and value type ${d.value} yet`)})(),O=t=>(()=>{if(d.storage===d.value)return`${e}[${t}]`;if(d.storage===`vec2<u32>`&&d.value===`i32`)return`i32(${e}[${t}].x)`;if(d.storage===`vec2<u32>`&&d.value===`u32`)return`u32(${e}[${t}].x)`;if(d.storage===`u32`&&d.value===`vec4<bool>`)return`vec4<bool>(bool(${e}[${t}] & 0xFFu), bool(${e}[${t}] & 0xFF00u), bool(${e}[${t}] & 0xFF0000u), bool(${e}[${t}] & 0xFF000000u))`;throw Error(`not supported combination of storage type ${d.storage} and value type ${d.value} yet`)})(),k=o<2?``:`
  fn get_${e}ByIndices(indices: ${d.indices}) -> ${u} {
    return ${O(`i2o_${e}(indices)`)};
  }`,A=o<2?``:(()=>{let t=s.map(e=>`d${e}: u32`).join(`, `),n=s.map(e=>`d${e}`).join(`, `);return`
  fn get_${e}(${t}) -> ${u} {
    return get_${e}ByIndices(${C(n)});
  }`})(),te=(...t)=>{if(t.length!==o)throw Error(`indices length must be ${o}`);let n=t.map(f).join(`,`);return o===0?O(`0u`):o===1?O(n[0]):(p.get=!0,p.getByIndices=!0,p.indicesToOffset=!0,`get_${e}(${n})`)},ne=t=>o<2?O(t):(p.getByIndices=!0,p.indicesToOffset=!0,`get_${e}ByIndices(${t})`),re=o<2?``:`
  fn set_${e}ByIndices(indices: ${d.indices}, value: ${u}) {
    ${D(`i2o_${e}(indices)`,`value`)}
  }`,ie=o<2?``:(()=>{let t=s.map(e=>`d${e}: u32`).join(`, `),n=s.map(e=>`d${e}`).join(`, `);return`
  fn set_${e}(${t}, value: ${u}) {
    set_${e}ByIndices(${C(n)}, value);
  }`})();return{impl:()=>{let e=[],t=!1;return p.offsetToIndices&&(e.push(v),t=!0),p.indicesToOffset&&(e.push(x),t=!0),p.broadcastedIndicesToOffset&&(Object.values(T).forEach(t=>e.push(t)),t=!0),p.set&&(e.push(ie),t=!0),p.setByIndices&&(e.push(re),t=!0),p.get&&(e.push(A),t=!0),p.getByIndices&&(e.push(k),t=!0),!a&&t&&e.unshift(`const ${h} = ${d.indices}(${n.join(`,`)});`,`const ${g} = ${d.indices}(${V.computeStrides(n).join(`,`)});`),e.join(`
`)},type:d,offsetToIndices:y,indicesToOffset:S,broadcastedIndicesToOffset:E,indices:C,indicesGet:w,indicesSet:ee,set:(...t)=>{if(t.length!==o+1)throw Error(`indices length must be ${o}`);let n=t[o];if(typeof n!=`string`)throw Error(`value must be string`);let r=t.slice(0,o).map(f).join(`,`);return o===0?D(`0u`,n):o===1?D(r[0],n):(p.set=!0,p.setByIndices=!0,p.indicesToOffset=!0,`set_${e}(${r}, ${n})`)},setByOffset:D,setByIndices:(t,n)=>o<2?D(t,n):(p.setByIndices=!0,p.indicesToOffset=!0,`set_${e}ByIndices(${t}, ${n});`),get:te,getByOffset:O,getByIndices:ne,usage:r,name:e,strides:g,shape:h,rank:o}},X=(e,t,n,r=1)=>Y(e,t,n,`input`,r),Z=(e,t,n,r=1)=>Y(e,t,n,`output`,r),Er=(e,t,n)=>Y(e,t,n,`atomicOutput`,1),Dr=(e,t,n,r=1)=>Y(e,t,n,`internal`,r),Or=class{constructor(e,t){this.normalizedDispatchGroup=e,this.limits=t,this.internalVariables=[],this.variables=[],this.uniforms=[],this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e==`number`?`${e}u`:e}) { return; }`}mainStart(e=br){let t=typeof e==`number`?e:e[0],n=typeof e==`number`?1:e[1],r=typeof e==`number`?1:e[2];if(t>this.limits.maxComputeWorkgroupSizeX||n>this.limits.maxComputeWorkgroupSizeY||r>this.limits.maxComputeWorkgroupSizeZ)throw Error(`workgroup size [${t}, ${n}, ${r}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(t*n*r>this.limits.maxComputeInvocationsPerWorkgroup)throw Error(`workgroup size [${t}, ${n}, ${r}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let i=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1;return`@compute @workgroup_size(${t}, ${n}, ${r})
  fn main(${i?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`}) {
    ${i?`let global_idx = global_id.x;
         let workgroup_index = workgroup_id.x;`:`let workgroup_index = workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
             workgroup_id.y * num_workgroups[0] + workgroup_id.x;
         let global_idx = workgroup_index * ${t*n*r}u + local_idx;`}
  `}appendVariableUniforms(e){e.rank!==0&&(e.shape.startsWith(`uniforms.`)&&this.uniforms.push({name:e.shape.replace(`uniforms.`,``),type:`u32`,length:e.rank}),e.strides.startsWith(`uniforms.`)&&this.uniforms.push({name:e.strides.replace(`uniforms.`,``),type:`u32`,length:e.rank}))}declareVariable(e,t){if(e.usage===`internal`)throw Error(`cannot use internal variable with declareVariable(). use registerInternalVariables() instead.`);this.variables.push(e),this.appendVariableUniforms(e);let n=e.usage===`input`?`read`:`read_write`,r=e.usage===`atomicOutput`?`atomic<i32>`:e.type.storage;return`@group(0) @binding(${t}) var<storage, ${n}> ${e.name}: array<${r}>;`}declareVariables(...e){return e.map(e=>this.declareVariable(e,this.variableIndex++)).join(`
`)}registerInternalVariable(e){if(e.usage!==`internal`)throw Error(`cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.`);this.internalVariables.push(e),this.appendVariableUniforms(e)}registerInternalVariables(...e){return e.forEach(e=>this.registerInternalVariable(e)),this}registerUniform(e,t,n=1){return this.uniforms.push({name:e,type:t,length:n}),this}registerUniforms(e){return this.uniforms=this.uniforms.concat(e),this}uniformDeclaration(){if(this.uniforms.length===0)return``;let e=[];for(let{name:t,type:n,length:r}of this.uniforms)if(r&&r>4)n===`f16`?e.push(`@align(16) ${t}:array<mat2x4<${n}>, ${Math.ceil(r/8)}>`):e.push(`${t}:array<vec4<${n}>, ${Math.ceil(r/4)}>`);else{let i=r==null||r===1?n:`vec${r}<${n}>`;e.push(`${t}:${i}`)}return`
      struct Uniforms { ${e.join(`, `)} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(e=>e.impl()).join(`
`)+this.internalVariables.map(e=>e.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=e=>[12,10,1,6][[`u32`,`f16`,`f32`,`i32`].indexOf(e)];return this.uniforms.map(t=>[e(t.type),t.length??1])}},kr=(e,t)=>new Or(e,t)}),Ar,jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr=N(()=>{z(),H(),W(),Q(),Ar=(e,t)=>{if(!e||e.length!==1)throw Error(`Transpose requires 1 input.`);if(t.length!==0&&t.length!==e[0].dims.length)throw Error(`perm size ${t.length} does not match input rank ${e[0].dims.length}`)},jr=(e,t)=>t.length===0?[...Array(e).keys()].reverse():t,Mr=(e,t)=>V.sortBasedOnPerm(e,jr(e.length,t)),Nr=(e,t,n,r)=>{let i=`fn perm(i: ${r.type.indices}) -> ${n.type.indices} {
    var a: ${n.type.indices};`;for(let n=0;n<t;++n)i+=`a[${e[n]}]=i[${n}];`;return i+=`return a;}`},Pr=(e,t)=>{let n=[],r=[];for(let i=0;i<e.length;++i)e[i]!==1&&n.push(e[i]),e[t[i]]!==1&&r.push(t[i]);return{newShape:n,newPerm:r}},Fr=(e,t)=>{let n=0;for(let r=0;r<e.length;++r)if(t[e[r]]!==1){if(e[r]<n)return!1;n=e[r]}return!0},Ir=(e,t)=>{let n=e.dataType,r=e.dims.length,i=jr(r,t),a=Mr(e.dims,i),o=e.dims,s=a,c=r<2||Fr(i,e.dims),l;if(c)return l=e=>{let t=X(`input`,n,o,4),r=Z(`output`,n,s,4);return`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(t,r)}
  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    output[global_idx] = input[global_idx];
  }`},{name:`TransposeCopy`,shaderCache:{inputDependencies:[`type`]},getRunData:()=>{let t=V.size(a);return{outputs:[{dims:a,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(t/64/4)},programUniforms:[{type:12,data:Math.ceil(t/4)}]}},getShaderSource:l};let{newShape:u,newPerm:d}=Pr(e.dims,i),f=V.areEqual(d,[2,3,1]),p=V.areEqual(d,[3,1,2]);return u.length===2||f||p?(o=f?[u[0],u[1]*u[2]]:p?[u[0]*u[1],u[2]]:u,s=[o[1],o[0]],l=e=>{let t=X(`a`,n,o.length),r=Z(`output`,n,s.length);return`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(t,r)}
  var<workgroup> tile : array<array<${r.type.value}, 17>, 16>;
  ${e.mainStart([16,16,1])}
    let stride = (uniforms.output_shape[1] - 1) / 16 + 1;
    let workgroup_id_x = workgroup_index % stride;
    let workgroup_id_y = workgroup_index / stride;
    let input_col = workgroup_id_y * 16u + local_id.x;
    let input_row = workgroup_id_x * 16u + local_id.y;
    if (input_row < uniforms.a_shape[0] && input_col < uniforms.a_shape[1]) {
      tile[local_id.y][local_id.x] = ${t.getByIndices(`${t.type.indices}(input_row, input_col)`)};
    }
    workgroupBarrier();

    let output_col = workgroup_id_x * 16u + local_id.x;
    let output_row = workgroup_id_y * 16u + local_id.y;
    if (output_row < uniforms.output_shape[0] && output_col < uniforms.output_shape[1]) {
      ${r.setByIndices(`${r.type.indices}(output_row, output_col)`,`tile[local_id.x][local_id.y]`)}
    }
  }`},{name:`TransposeShared`,shaderCache:{inputDependencies:[`type`]},getRunData:()=>{let t=V.size(a);return{outputs:[{dims:a,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(s[1]/16),y:Math.ceil(s[0]/16)},programUniforms:[{type:12,data:t},...G(o,s)]}},getShaderSource:l}):(l=e=>{let t=X(`a`,n,o.length),a=Z(`output`,n,s.length);return`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(t,a)}

  ${Nr(i,r,t,a)}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}

    let indices = ${a.offsetToIndices(`global_idx`)};
    let aIndices = perm(indices);

    ${a.setByOffset(`global_idx`,t.getByIndices(`aIndices`))}
  }`},{name:`Transpose`,shaderCache:{hint:`${t}`,inputDependencies:[`rank`]},getRunData:()=>{let t=V.size(a);return{outputs:[{dims:a,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(t/64)},programUniforms:[{type:12,data:t},...G(o,s)]}},getShaderSource:l})},Lr=(e,t)=>{Ar(e.inputs,t.perm),e.compute(Ir(e.inputs[0],t.perm))},Rr=e=>U({perm:e.perm})}),Br,Vr,Hr,Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,ni,ri,ii,ai,oi,si=N(()=>{z(),H(),Q(),Pi(),zr(),Br={max:`select(bestValue, candidate, candidate > bestValue)`,min:`select(bestValue, candidate, candidate < bestValue)`,mean:`bestValue + candidate`,sum:`bestValue + candidate`,prod:`bestValue * candidate`,sumSquare:`bestValue + candidate * candidate`,logSumExp:`bestValue + exp(candidate)`,l1:`bestValue + abs(candidate)`,l2:`bestValue + candidate * candidate`,logSum:`bestValue + candidate`},Vr={max:`select(bestValue, candidate, candidate > bestValue)`,min:`select(bestValue, candidate, candidate < bestValue)`,mean:`bestValue + candidate`,sum:`bestValue + candidate`,prod:`bestValue * candidate`,sumSquare:`bestValue + candidate`,logSumExp:`bestValue + candidate`,l1:`bestValue + candidate`,l2:`bestValue + candidate`,logSum:`bestValue + candidate`},Hr={max:`_A[offset]`,min:`_A[offset]`,mean:`0`,sum:`0`,prod:`1`,sumSquare:`0`,logSumExp:`0`,l1:`0`,l2:`0`,logSum:`0`},Ur={max:`bestValue`,min:`bestValue`,sum:`bestValue`,prod:`bestValue`,sumSquare:`bestValue`,logSumExp:`log(bestValue)`,l1:`bestValue`,l2:`sqrt(bestValue)`,logSum:`log(bestValue)`},Wr=(e,t)=>{let n=[];for(let r=t-e;r<t;++r)n.push(r);return n},Gr=(e,t)=>{let n=[],r=e.length;for(let i=0;i<r;i++)t.indexOf(i)===-1&&n.push(e[i]);return[n,t.map(t=>e[t])]},Kr=(e,t)=>{let n=e.length+t.length,r=[],i=0;for(let a=0;a<n;a++)t.indexOf(a)===-1?r.push(e[i++]):r.push(1);return r},qr=(e,t)=>{for(let n=0;n<e.length;++n)if(e[e.length-n-1]!==t-1-n)return!1;return!0},Jr=(e,t)=>{let n=[];if(!qr(e,t)){for(let r=0;r<t;++r)e.indexOf(r)===-1&&n.push(r);e.forEach(e=>n.push(e))}return n},Yr=(e,t,n,r,i,a,o)=>{let s=n[0].dims,c=V.size(a),l=V.size(o),u=X(`_A`,n[0].dataType,s),d=Z(`output`,i,a),f=64;c===1&&(f=256);let p=`
          var<workgroup> aBestValues : array<f32, ${f}>;
       `;return{name:e,shaderCache:{hint:`${t};${f}`,inputDependencies:[`type`]},getShaderSource:e=>`
        ${e.registerUniform(`reduceSize`,`u32`).declareVariables(u,d)}
        ${p}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${e.mainStart(f)}

          let outputIndex = global_idx / ${f};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${Hr[r]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${f}) {
           let candidate = f32(${u.getByOffset(`offset + k`)});
           bestValue = ${Br[r]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${f}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${Vr[r]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${d.setByOffset(`outputIndex`,`${r===`mean`?`${d.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${d.type.storage}(${Ur[r]})`}`)};
         }
        }`,getRunData:()=>({outputs:[{dims:a,dataType:i}],dispatchGroup:{x:c},programUniforms:[{type:12,data:l}]})}},Xr=(e,t,n,r)=>{let i=e.inputs.length===1?n:di(e.inputs,n),a=i.axes;a.length===0&&!i.noopWithEmptyAxes&&(a=e.inputs[0].dims.map((e,t)=>t));let o=V.normalizeAxes(a,e.inputs[0].dims.length),s=o,c=e.inputs[0],l=Jr(s,e.inputs[0].dims.length);l.length>0&&(c=e.compute(Ir(e.inputs[0],l),{inputs:[0],outputs:[-1]})[0],s=Wr(s.length,c.dims.length));let[u,d]=Gr(c.dims,s),f=u;i.keepDims&&(f=Kr(u,o)),e.compute(Yr(t,i.cacheKey,[c],r,e.inputs[0].dataType,f,d),{inputs:[c]})},Zr=(e,t)=>{Xr(e,`ReduceMeanShared`,t,`mean`)},Qr=(e,t)=>{Xr(e,`ReduceL1Shared`,t,`l1`)},$r=(e,t)=>{Xr(e,`ReduceL2Shared`,t,`l2`)},ei=(e,t)=>{Xr(e,`ReduceLogSumExpShared`,t,`logSumExp`)},ti=(e,t)=>{Xr(e,`ReduceMaxShared`,t,`max`)},ni=(e,t)=>{Xr(e,`ReduceMinShared`,t,`min`)},ri=(e,t)=>{Xr(e,`ReduceProdShared`,t,`prod`)},ii=(e,t)=>{Xr(e,`ReduceSumShared`,t,`sum`)},ai=(e,t)=>{Xr(e,`ReduceSumSquareShared`,t,`sumSquare`)},oi=(e,t)=>{Xr(e,`ReduceLogSumShared`,t,`logSum`)}}),ci,li,ui,di,fi,pi,mi,hi,gi,_i,vi,yi,bi,xi,Si,Ci,wi,Ti,Ei,Di,Oi,ki,Ai,ji,Mi,Ni,Pi=N(()=>{z(),H(),W(),Q(),si(),ci=e=>{if(!e||e.length===0||e.length>2)throw Error(`Reduce op requires 1 or 2 inputs.`);if(e.length===2&&e[1].dims.length!==1)throw Error(`Invalid axes input dims.`)},li=e=>[``,``,`var value = ${e.getByIndices(`input_indices`)};`,``],ui=(e,t,n,r,i,a,o=!1,s=!1)=>{let c=[],l=n[0].dims,u=l.length,d=V.normalizeAxes(i,u),f=!s&&d.length===0;l.forEach((e,t)=>{f||d.indexOf(t)>=0?o&&c.push(1):c.push(e)});let p=c.length,m=V.size(c);return{name:e,shaderCache:t,getShaderSource:e=>{let t=[],i=X(`_A`,n[0].dataType,u),s=Z(`output`,a,p),c=r(i,s,d),m=c[2];for(let e=0,n=0;e<u;e++)f||d.indexOf(e)>=0?(o&&n++,m=`for(var j${e}: u32 = 0; j${e} < ${l[e]}; j${e}++) {
                  ${c[2].includes(`last_index`)?`let last_index = j${e};`:``}
                  ${i.indicesSet(`input_indices`,e,`j${e}`)}
                  ${m}
                }`):(t.push(`${i.indicesSet(`input_indices`,e,s.indicesGet(`output_indices`,n))};`),n++);return`

        ${e.registerUniform(`output_size`,`u32`).declareVariables(i,s)}

        ${e.mainStart()}
          ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
          var input_indices: ${i.type.indices};
          let output_indices = ${s.offsetToIndices(`global_idx`)};

          ${t.join(`
`)}
          ${c[0]}       // init ops for reduce max/min
          ${c[1]}
          ${m}
          ${c[3]}
          ${c.length===4?s.setByOffset(`global_idx`,`value`):c.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:c,dataType:a}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:[{type:12,data:m},...G(l,c)]})}},di=(e,t)=>{let n=[];return e[1].dims[0]>0&&e[1].getBigInt64Array().forEach(e=>n.push(Number(e))),U({axes:n,keepDims:t.keepDims,noopWithEmptyAxes:t.noopWithEmptyAxes})},fi=(e,t,n,r)=>{let i=e.inputs,a=i.length===1?n:di(i,n);e.compute(ui(t,{hint:a.cacheKey,inputDependencies:[`rank`]},[i[0]],a.noopWithEmptyAxes&&a.axes.length===0?li:r,a.axes,i[0].dataType,a.keepDims,a.noopWithEmptyAxes),{inputs:[0]})},pi=(e,t)=>{ci(e.inputs),fi(e,`ReduceLogSum`,t,(e,t)=>[`var value = ${t.type.storage}(0);`,``,`value += ${e.getByIndices(`input_indices`)};`,`value = log(value);`])},mi=(e,t)=>{ci(e.inputs),fi(e,`ReduceL1`,t,(e,t)=>[`var value = ${t.type.storage}(0);`,``,`value += abs(${e.getByIndices(`input_indices`)});`,``])},hi=(e,t)=>{ci(e.inputs),fi(e,`ReduceL2`,t,(e,t)=>[`var t = ${t.type.value}(0); var value = ${t.type.value}(0);`,``,`t = ${e.getByIndices(`input_indices`)}; value += (t * t);`,`value = sqrt(value);`])},gi=(e,t)=>{ci(e.inputs),fi(e,`ReduceLogSumExp`,t,(e,t)=>[`var value = ${t.type.storage}(0);`,``,`value += exp(${e.getByIndices(`input_indices`)});`,`value = log(value);`])},_i=(e,t)=>{ci(e.inputs),fi(e,`ReduceMax`,t,(e,t,n)=>{let r=[];for(let t=0;t<e.rank;t++)(n.indexOf(t)>=0||n.length===0)&&r.push(e.indicesSet(`input_indices`,t,0));return[`${r.join(`
`)}`,`var value = ${e.getByIndices(`input_indices`)};`,`value = max(value, ${e.getByIndices(`input_indices`)});`,``]})},vi=(e,t)=>{ci(e.inputs),fi(e,`ReduceMean`,t,(t,n,r)=>{let i=1;for(let n=0;n<t.rank;n++)(r.indexOf(n)>=0||r.length===0)&&(i*=e.inputs[0].dims[n]);return[`var sum = f32(0);`,``,`sum += f32(${t.getByIndices(`input_indices`)});`,`let value = ${n.type.value}(sum / ${i});`]})},yi=(e,t)=>{ci(e.inputs),fi(e,`ReduceMin`,t,(e,t,n)=>{let r=[];for(let t=0;t<e.rank;t++)(n.indexOf(t)>=0||n.length===0)&&r.push(`input_indices[${t}] = 0;`);return[`${r.join(`
`)}`,`var value = ${e.getByIndices(`input_indices`)};`,`value = min(value, ${e.getByIndices(`input_indices`)});`,``]})},bi=(e,t)=>{ci(e.inputs),fi(e,`ReduceProd`,t,(e,t)=>[`var value = ${t.type.storage}(1);`,``,`value *= ${e.getByIndices(`input_indices`)};`,``])},xi=(e,t)=>{ci(e.inputs),fi(e,`ReduceSum`,t,(e,t)=>[`var value = ${t.type.storage}(0);`,``,`value += ${e.getByIndices(`input_indices`)};`,``])},Si=(e,t)=>{ci(e.inputs),fi(e,`ReduceSumSquare`,t,(e,t)=>[`var t = ${t.type.value}(0); var value = ${t.type.value}(0);`,``,`t = ${e.getByIndices(`input_indices`)}; value += t * t;`,``])},Ci=(e,t,n)=>{if(t.length===0)return n;let r=1,i=1;for(let n=0;n<t.length;n++)t.indexOf(n)===-1?r*=e[n]:i*=e[n];return i<32&&r>1024},wi=(e,t)=>{Ci(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?vi(e,t):Zr(e,t)},Ti=(e,t)=>{Ci(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?mi(e,t):Qr(e,t)},Ei=(e,t)=>{Ci(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?hi(e,t):$r(e,t)},Di=(e,t)=>{Ci(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?gi(e,t):ei(e,t)},Oi=(e,t)=>{Ci(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?_i(e,t):ti(e,t)},ki=(e,t)=>{Ci(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?yi(e,t):ni(e,t)},Ai=(e,t)=>{Ci(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?bi(e,t):ri(e,t)},ji=(e,t)=>{Ci(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?xi(e,t):ii(e,t)},Mi=(e,t)=>{Ci(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Si(e,t):ai(e,t)},Ni=(e,t)=>{Ci(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?pi(e,t):oi(e,t)}}),Fi,Ii,Li,Ri,zi=N(()=>{z(),W(),Pi(),Fi=e=>{if(!e||e.length===0||e.length>2)throw Error(`ArgMinMaxOp op requires 1 or 2 inputs.`);if(e[0].dataType!==1)throw Error(`Invalid input type.`)},Ii=(e,t)=>{Fi(e.inputs),e.compute(ui(`ArgMin`,{hint:t.cacheKey,inputDependencies:[`rank`]},[e.inputs[0]],(e,n,r)=>{let i=[];for(let t=0;t<e.rank;t++)(r.indexOf(t)>=0||r.length===0)&&i.push(`input_indices[${t}] = 0;`);return[`${i.join(`
`)}`,`var value = ${e.getByIndices(`input_indices`)};
var best_index : i32 = 0;`,`if (${e.getByIndices(`input_indices`)} ${t.selectLastIndex>0?`<=`:`<`} value) {
         value = ${e.getByIndices(`input_indices`)};
         best_index = i32(last_index);
       }`,``,n.setByOffset(`global_idx`,`best_index`)]},[t.axis],7,t.keepDims),{inputs:[0]})},Li=(e,t)=>{Fi(e.inputs),e.compute(ui(`argMax`,{hint:t.cacheKey,inputDependencies:[`rank`]},[e.inputs[0]],(e,n,r)=>{let i=[];for(let t=0;t<e.rank;t++)(r.indexOf(t)>=0||r.length===0)&&i.push(`input_indices[${t}] = 0;`);return[`${i.join(`
`)}`,`var value = ${e.getByIndices(`input_indices`)};
var best_index : i32 = 0;`,`if (${e.getByIndices(`input_indices`)} ${t.selectLastIndex>0?`>=`:`>`} value) {
         value = ${e.getByIndices(`input_indices`)};
         best_index = i32(last_index);
       }`,``,n.setByOffset(`global_idx`,`best_index`)]},[t.axis],7,t.keepDims),{inputs:[0]})},Ri=e=>U(e)}),Bi,Vi,Hi,Ui,Wi,Gi,Ki,qi,Ji=N(()=>{z(),H(),cr(),Q(),Bi=(e,t)=>{let n=e[0],r=e[1],i=e[2],a=e[3],o=e[4],s=e[5];if(o&&s)throw Error(`Attention cannot have both past and attention_bias`);if(n.dims.length!==3)throw Error(`Input "input" must have 3 dimensions`);let c=n.dims[0],l=n.dims[1],u=n.dims[2];if(i.dims.length!==1)throw Error(`Input "bias" is expected to have 1 dimensions`);if(r.dims.length!==2)throw Error(`Input "weights" is expected to have 2 dimensions`);if(r.dims[0]!==u)throw Error(`Input 1 dimension 0 should have same length as dimension 2 of input 0`);if(i.dims[0]!==r.dims[1])throw Error(`Input "bias" dimension 0 should have same length as dimension 1 of input "weights"`);let d=i.dims[0]/3,f=d,p=f;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw Error(`qkv_hidden_sizes attribute should have 3 elements`);for(let e of t.qkvHiddenSizes)if(e%t.numHeads!==0)throw Error(`qkv_hidden_sizes should be divisible by num_heads`);d=t.qkvHiddenSizes[0],f=t.qkvHiddenSizes[1],p=t.qkvHiddenSizes[2]}let m=l;if(d!==f)throw Error(`qkv_hidden_sizes first element should be same as the second`);if(i.dims[0]!==d+f+p)throw Error(`Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes`);let h=0;if(o){if(f!==p)throw Error(`Input "past" expect k_hidden_size == v_hidden_size`);if(o.dims.length!==5)throw Error(`Input "past" must have 5 dimensions`);if(o.dims[0]!==2)throw Error(`Input "past" first dimension must be 2`);if(o.dims[1]!==c)throw Error(`Input "past" second dimension must be batch_size`);if(o.dims[2]!==t.numHeads)throw Error(`Input "past" third dimension must be num_heads`);if(o.dims[4]!==f/t.numHeads)throw Error(`Input "past" fifth dimension must be k_hidden_size / num_heads`);t.pastPresentShareBuffer||(h=o.dims[3])}let g=m+h;if(a)throw Error(`Mask not supported`);if(o)throw Error(`past is not supported`);if(s){if(s.dims.length!==4)throw Error(`Input "attention_bias" must have 4 dimensions`);if(s.dims[0]!==c||s.dims[1]!==t.numHeads||s.dims[2]!==l||s.dims[3]!==g)throw Error(`Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)`)}return{batchSize:c,sequenceLength:l,pastSequenceLength:h,kvSequenceLength:m,totalSequenceLength:g,maxSequenceLength:-1,inputHiddenSize:u,hiddenSize:d,vHiddenSize:p,headSize:Math.floor(d/t.numHeads),vHeadSize:Math.floor(p/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:0,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},Vi=(e,t,n)=>t&&e?`
      let total_sequence_length_input = u32(${t.getByOffset(`0`)});
      let present_sequence_length = max(total_sequence_length_input, uniforms.past_sequence_length);
      let is_subsequent_prompt: bool = sequence_length > 1 && sequence_length != total_sequence_length_input;
      let is_first_prompt: bool = is_subsequent_prompt == false && sequence_length == total_sequence_length_input;
      total_sequence_length = u32(${e?.getByOffset(`batchIdx`)}) + 1;
      var past_sequence_length: u32 = 0;
      if (is_first_prompt == false) {
        past_sequence_length = total_sequence_length - sequence_length;
      }
       `:`
    ${n?`let past_sequence_length = uniforms.past_sequence_length`:``};
    let present_sequence_length = total_sequence_length;
    `,Hi=(e,t,n,r,i,a,o,s)=>{let c=K(o?1:a),l=64,u=a/c;u<l&&(l=32);let d=Math.ceil(a/c/l),f=[{type:12,data:t},{type:12,data:n},{type:12,data:r},{type:12,data:i},{type:12,data:u},{type:12,data:d}],p=Sr(e.dataType,c),m=Cr(1,c),h=[`type`];return o&&h.push(`type`),s&&h.push(`type`),{name:`AttentionProbsSoftmax`,shaderCache:{hint:`${l};${p};${c}`,inputDependencies:h},getShaderSource:t=>{let n=Z(`x`,e.dataType,e.dims,c),r=[n],i=o?X(`seq_lens`,o.dataType,o.dims):void 0;i&&r.push(i);let a=s?X(`total_sequence_length_input`,s.dataType,s.dims):void 0;a&&r.push(a);let u=Cr(e.dataType);return`
  var<workgroup> thread_max: array<f32, ${l}>;
  var<workgroup> thread_sum: array<f32, ${l}>;
  ${t.registerUniforms([{name:`batch_size`,type:`u32`},{name:`num_heads`,type:`u32`},{name:`past_sequence_length`,type:`u32`},{name:`sequence_length`,type:`u32`},{name:`total_sequence_length`,type:`u32`},{name:`elements_per_thread`,type:`u32`}]).declareVariables(...r)}
  ${t.mainStart([l,1,1])}
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let sequence_length = uniforms.sequence_length;
    var total_sequence_length = uniforms.total_sequence_length;
    ${Vi(i,a,!1)}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${l}) * uniforms.total_sequence_length + local_offset;
    let seq_causal_length = ${o?`u32(past_sequence_length + workgroup_id.y + 1)`:`total_sequence_length`};
    var thread_max_vector = ${m}(-3.4028234663852886e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      thread_max_vector = max(${m}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(c){case 1:return`thread_max_vector`;case 2:return`max(thread_max_vector.x, thread_max_vector.y)`;case 4:return`max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))`;default:throw Error(`Unsupported components: ${c}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.4028234663852886e+38f);
    for (var i = 0u; i < ${l}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${m}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      sum_vector += exp(${m}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(c){case 1:return`sum_vector`;case 2:return`sum_vector.x + sum_vector.y`;case 4:return`sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w`;default:throw Error(`Unsupported components: ${c}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${l}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        x[offset + i] = ${n.type.value}(${u}(1.0) / ${u}(seq_causal_length));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        var f32input = ${m}(x[offset + i]);
        x[offset + i] = ${n.type.value}(exp(f32input - max_value) / sum);
      }
    }
      ${o?`
        for (var total_seq_id: u32 = seq_causal_length; total_seq_id + local_offset < uniforms.total_sequence_length; total_seq_id++) {
          x[offset + total_seq_id] = ${n.type.value}(${u}(0));
        }`:``};
  }`},getRunData:()=>({outputs:[],dispatchGroup:{x:1,y:i,z:t*n},programUniforms:f})}},Ui=(e,t,n,r,i,a,o,s,c)=>{let l=o+a.kvSequenceLength,u=[a.batchSize,a.numHeads,a.sequenceLength,l],d=e>1&&r,f=a.kvNumHeads?a.kvNumHeads:a.numHeads,p=d?[a.batchSize,f,l,a.headSize]:void 0,m=a.nReps?a.nReps:1,h=a.scale===0?1/Math.sqrt(a.headSize):a.scale,g=K(a.headSize),_=a.headSize/g,v={x:Math.ceil(l/12),y:Math.ceil(a.sequenceLength/12),z:a.batchSize*a.numHeads},y=[{type:12,data:a.sequenceLength},{type:12,data:_},{type:12,data:l},{type:12,data:a.numHeads},{type:12,data:a.headSize},{type:1,data:h},{type:12,data:o},{type:12,data:a.kvSequenceLength},{type:12,data:m}],b=d&&r&&V.size(r.dims)>0,x=[`type`,`type`];b&&x.push(`type`),i&&x.push(`type`),s&&x.push(`type`),c&&x.push(`type`);let S=[{dims:u,dataType:t.dataType,gpuDataType:0}];return d&&S.push({dims:p,dataType:t.dataType,gpuDataType:0}),{name:`AttentionProbs`,shaderCache:{hint:`${g};${i!==void 0};${r!==void 0};${e}`,inputDependencies:x},getRunData:()=>({outputs:S,dispatchGroup:v,programUniforms:y}),getShaderSource:e=>{let a=X(`q`,t.dataType,t.dims,g),o=[a,X(`key`,n.dataType,n.dims,g)];if(b){let e=X(`past_key`,r.dataType,r.dims,g);o.push(e)}i&&o.push(X(`attention_bias`,i.dataType,i.dims));let l=s?X(`seq_lens`,s.dataType,s.dims):void 0;l&&o.push(l);let f=c?X(`total_sequence_length_input`,c.dataType,c.dims):void 0;f&&o.push(f);let h=Z(`output`,t.dataType,u),_=[h];d&&_.push(Z(`present_key`,t.dataType,p,g));let v=Cr(1,g);return`
  const TILE_SIZE = 12u;

  var<workgroup> tileQ: array<${a.type.storage}, 144>;
  var<workgroup> tileK: array<${a.type.storage}, 144>;
  ${e.registerUniforms([{name:`M`,type:`u32`},{name:`K`,type:`u32`},{name:`N`,type:`u32`},{name:`num_heads`,type:`u32`},{name:`head_size`,type:`u32`},{name:`alpha`,type:`f32`},{name:`past_sequence_length`,type:`u32`},{name:`kv_sequence_length`,type:`u32`},{name:`n_reps`,type:`u32`}]).declareVariables(...o,..._)}
  ${e.mainStart([12,12,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${m===1?`headIdx`:`headIdx / uniforms.n_reps`};
    let kv_num_heads = ${m===1?`uniforms.num_heads`:`uniforms.num_heads / uniforms.n_reps`};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${Vi(l,f,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${b&&d?`let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;`:``};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${d?`let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;`:``}
    var value = ${v}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${b&&d?`
              if (n + local_id.y < past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else if (n + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
                tileK[idx] = key[kOffset + (n + local_id.y - past_sequence_length) * uniforms.K + w + local_id.x];
              }`:`
          if (n + local_id.y < uniforms.kv_sequence_length) {
            tileK[idx] = key[kOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
          }`}
      ${d?`if (n + local_id.y < present_sequence_length) {
        present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];
      }`:``}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
          value += ${v}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch(g){case 1:return`value`;case 2:return`value.x + value.y`;case 4:return`value.x + value.y + value.z + value.w`;default:throw Error(`Unsupported components: ${g}`)}})()};
        output[outputIdx] = ${h.type.value} (sum * uniforms.alpha) + ${i?`attention_bias[outputIdx]`:`0.0`};
    }
  }`}}},Wi=(e,t,n,r,i,a,o=void 0,s=void 0)=>{let c=a+i.kvSequenceLength,l=i.nReps?i.nReps:1,u=i.vHiddenSize*l,d=e>1&&r,f=i.kvNumHeads?i.kvNumHeads:i.numHeads,p=d?[i.batchSize,f,c,i.headSize]:void 0,m=[i.batchSize,i.sequenceLength,u],h={x:Math.ceil(i.vHeadSize/12),y:Math.ceil(i.sequenceLength/12),z:i.batchSize*i.numHeads},g=[{type:12,data:i.sequenceLength},{type:12,data:c},{type:12,data:i.vHeadSize},{type:12,data:i.numHeads},{type:12,data:i.headSize},{type:12,data:u},{type:12,data:a},{type:12,data:i.kvSequenceLength},{type:12,data:l}],_=d&&r&&V.size(r.dims)>0,v=[`type`,`type`];_&&v.push(`type`),o&&v.push(`type`),s&&v.push(`type`);let y=[{dims:m,dataType:t.dataType,gpuDataType:0}];return d&&y.push({dims:p,dataType:t.dataType,gpuDataType:0}),{name:`AttentionScore`,shaderCache:{hint:`${r!==void 0};${e}`,inputDependencies:v},getRunData:()=>({outputs:y,dispatchGroup:h,programUniforms:g}),getShaderSource:e=>{let i=X(`probs`,t.dataType,t.dims),a=[i,X(`v`,n.dataType,n.dims)];_&&a.push(X(`past_value`,r.dataType,r.dims));let c=o?X(`seq_lens`,o.dataType,o.dims):void 0;o&&a.push(c);let u=s?X(`total_sequence_length_input`,s.dataType,s.dims):void 0;s&&a.push(u);let f=[Z(`output`,t.dataType,m)];return d&&f.push(Z(`present_value`,t.dataType,p)),`
  const TILE_SIZE = 12u;
  var<workgroup> tileQ: array<${i.type.value}, 144>;
  var<workgroup> tileV: array<${i.type.value}, 144>;
  ${e.registerUniforms([{name:`M`,type:`u32`},{name:`K`,type:`u32`},{name:`N`,type:`u32`},{name:`num_heads`,type:`u32`},{name:`head_size`,type:`u32`},{name:`v_hidden_size`,type:`u32`},{name:`past_sequence_length`,type:`u32`},{name:`kv_sequence_length`,type:`u32`},{name:`n_reps`,type:`u32`}]).declareVariables(...a,...f)}
  ${e.mainStart([12,12,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${l===1?`headIdx`:`headIdx / uniforms.n_reps`};
   let kv_num_heads = ${l===1?`uniforms.num_heads`:`uniforms.num_heads / uniforms.n_reps`};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${Vi(c,u,!0)}
   let offsetA = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
   let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx; // kvHeadIdx is relative to the batch
   ${_&&d?`let pastValueOffset = absKvHeadIdx * uniforms.N * uniforms.past_sequence_length + n;`:``};
   let vOffset = absKvHeadIdx * uniforms.N * uniforms.kv_sequence_length + n;
   ${d?`let presentValueOffset = absKvHeadIdx * uniforms.N * uniforms.K + n;`:``}
   var value = ${i.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${_&&d?`
        if (w + local_id.y < past_sequence_length) {
          tileV[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else if (w + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
          tileV[idx] = v[vOffset + (w + local_id.y - past_sequence_length) * uniforms.N];
        }
      `:`
            if (w + local_id.y < uniforms.kv_sequence_length) {
              tileV[idx] = v[vOffset + (w + local_id.y) * uniforms.N];
            }`}
        ${d?`
            if (w + local_id.y < present_sequence_length) {
          present_value[presentValueOffset + (w + local_id.y) * uniforms.N] = tileV[idx];
        }`:``}
      }
     workgroupBarrier();
     for (var k: u32 = 0u; k < TILE_SIZE && w+k < total_sequence_length; k++) {
       value += tileQ[TILE_SIZE * local_id.y + k] * tileV[TILE_SIZE * k + local_id.x];
     }
     workgroupBarrier();
   }

   // we need to transpose output from BNSH_v to BSND_v
   if (m < uniforms.M && n < uniforms.N) {
     let outputIdx = batchIdx * uniforms.M * uniforms.v_hidden_size + m * uniforms.v_hidden_size
       + headIdx * uniforms.N + n;
     output[outputIdx] = value;
   }
  }`}}},Gi=(e,t,n,r,i,a,o,s,c,l,u=void 0,d=void 0)=>{let f=Math.min(e.outputCount,1+ +!!o+ +!!s),p=f>1?o:void 0,m=f>1?s:void 0,h=f>1?l.pastSequenceLength:0,g=h+l.kvSequenceLength,_=c&&V.size(c.dims)>0?c:void 0,v=[t,n];p&&V.size(p.dims)>0&&v.push(p),_&&v.push(_),u&&v.push(u),d&&v.push(d);let y=e.compute(Ui(f,t,n,p,_,l,h,u,d),{inputs:v,outputs:f>1?[-1,1]:[-1]})[0];e.compute(Hi(y,l.batchSize,l.numHeads,h,l.sequenceLength,g,u,d),{inputs:u&&d?[y,u,d]:[y],outputs:[]});let b=[y,r];m&&V.size(m.dims)>0&&b.push(m),u&&b.push(u),d&&b.push(d),e.compute(Wi(f,y,r,m,l,h,u,d),{inputs:b,outputs:f>1?[0,2]:[0]})},Ki=(e,t)=>{let n=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],r=t.sequenceLength,i=t.inputHiddenSize,a=t.headSize,o={x:Math.ceil(t.headSize/12),y:Math.ceil(t.sequenceLength/12),z:t.batchSize*t.numHeads},s=[e.inputs[0],e.inputs[1],e.inputs[2]],c=[{type:12,data:r},{type:12,data:i},{type:12,data:a},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}];return e.compute({name:`AttentionPrepare`,shaderCache:{inputDependencies:[`type`,`type`,`type`]},getRunData:()=>({outputs:[{dims:n,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:n,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:n,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:o,programUniforms:c}),getShaderSource:e=>{let t=Z(`output_q`,s[0].dataType,n),r=Z(`output_k`,s[0].dataType,n),i=Z(`output_v`,s[0].dataType,n),a=X(`input`,s[0].dataType,s[0].dims),o=X(`weight`,s[1].dataType,s[1].dims),c=X(`bias`,s[2].dataType,s[2].dims),l=a.type.storage;return`
  const TILE_SIZE = 12u;
  var<workgroup> tileInput: array<${l}, 144>;
  var<workgroup> tileWeightQ: array<${l}, 144>;
  var<workgroup> tileWeightK: array<${l}, 144>;
  var<workgroup> tileWeightV: array<${l}, 144>;
  ${e.registerUniforms([{name:`M`,type:`u32`},{name:`K`,type:`u32`},{name:`N`,type:`u32`},{name:`num_heads`,type:`u32`},{name:`head_size`,type:`u32`},{name:`hidden_size`,type:`u32`},{name:`ldb`,type:`u32`}]).declareVariables(a,o,c,t,r,i)}
  ${e.mainStart([12,12,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${l}(0);
    var valueK = ${l}(0);
    var valueV = ${l}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileInput[TILE_SIZE * local_id.y + local_id.x] = input[inputOffset + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        let offset = n + (w + local_id.y) * uniforms.ldb;
        tileWeightQ[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetQ + offset];
        tileWeightK[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetK + offset];
        tileWeightV[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetV + offset];
      }
      workgroupBarrier();
      for (var k: u32 = 0u; k<TILE_SIZE && w+k < uniforms.K; k++) {
        let inputTileOffset = TILE_SIZE * local_id.y + k;
        let weightTileOffset = TILE_SIZE * k + local_id.x;
        valueQ += tileInput[inputTileOffset] * tileWeightQ[weightTileOffset];
        valueK += tileInput[inputTileOffset] * tileWeightK[weightTileOffset];
        valueV += tileInput[inputTileOffset] * tileWeightV[weightTileOffset];
      }

      workgroupBarrier();
    }

    let headOffset = (m * uniforms.N + n) % uniforms.head_size;
    valueQ += bias[headOffset + biasOffsetQ];
    valueK += bias[headOffset + biasOffsetK];
    valueV += bias[headOffset + biasOffsetV];

    let offset = workgroup_id.z * uniforms.M * uniforms.N;
    if (m < uniforms.M && n < uniforms.N) {
      let outputIdx = offset + m * uniforms.N + n;
      output_q[outputIdx] = valueQ;
      output_k[outputIdx] = valueK;
      output_v[outputIdx] = valueV;
    }
  }`}},{inputs:s,outputs:[-1,-1,-1]})},qi=(e,t)=>{let n=Bi(e.inputs,t),[r,i,a]=Ki(e,n);return Gi(e,r,i,a,e.inputs[4],void 0,void 0,void 0,e.inputs[5],n)}}),Yi,Xi,Zi,Qi,$i=N(()=>{Et(),z(),H(),W(),Q(),Yi=(e,t)=>{if(!e||e.length!==5)throw Error(`BatchNormalization requires 5 inputs`);let n=(e,t,n)=>{let r=t.length;if(r!==e.length)throw Error(`${n}: num dimensions != ${r}`);t.forEach((t,r)=>{if(t!==e[r])throw Error(`${n}: dim[${r}] do not match`)})};if(e[0].dims.length>1){let r=t.format===`NHWC`?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);n(e[1].dims,r,`Invalid input scale`),n(e[2].dims,r,`Invalid input B`),n(e[3].dims,r,`Invalid input mean`),n(e[4].dims,r,`Invalid input var`)}else n(e[1].dims,[1],`Invalid input scale`),n(e[2].dims,[1],`Invalid input B`),n(e[3].dims,[1],`Invalid input mean`),n(e[4].dims,[1],`Invalid input var`)},Xi=(e,t)=>{let{epsilon:n,spatial:r,format:i}=t,a=e[0].dims,o=r?K(a[a.length-1]):1,s=i===`NHWC`&&a.length>1?o:1,c=V.size(a)/o,l=r,u=l?a.length:a,d=X(`x`,e[0].dataType,e[0].dims,o),f=X(`scale`,e[1].dataType,e[1].dims,s),p=X(`bias`,e[2].dataType,e[2].dims,s),m=X(`inputMean`,e[3].dataType,e[3].dims,s),h=X(`inputVar`,e[4].dataType,e[4].dims,s),g=Z(`y`,e[0].dataType,u,o),_=()=>{let e=``;if(r)e=`let cOffset = ${a.length===1?`0u`:i===`NHWC`?`outputIndices[${a.length-1}] / ${o}`:`outputIndices[1]`};`;else if(i===`NCHW`)e=`
            ${g.indicesSet(`outputIndices`,`0`,`0`)}
            let cOffset = ${g.indicesToOffset(`outputIndices`)};`;else{e=`var cIndices = ${f.type.indices}(0);
                       cIndices[0] = outputIndices[${a.length-1}];`;for(let t=1;t<f.rank;t++)e+=`cIndices[${t}] = outputIndices[${t}];`;e+=`let cOffset = ${f.indicesToOffset(`cIndices`)};`}return e};return{name:`BatchNormalization`,shaderCache:{hint:`${t.epsilon}_${t.format}_${r}_${o}`,inputDependencies:l?[`rank`,`type`,`type`,`type`,`type`]:void 0},getShaderSource:e=>`
  const epsilon = ${n};
  ${e.registerUniform(`outputSize`,`u32`).declareVariables(d,f,p,m,h,g)}
  ${e.mainStart()}
  ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
    var outputIndices = ${g.offsetToIndices(`global_idx * ${o}`)};
    ${_()}
    let scale = ${f.getByOffset(`cOffset`)};
    let bias = ${p.getByOffset(`cOffset`)};
    let inputMean = ${m.getByOffset(`cOffset`)};
    let inputVar = ${h.getByOffset(`cOffset`)};
    let x = ${d.getByOffset(`global_idx`)};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${g.setByOffset(`global_idx`,`value`)}
  }`,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:l?[{type:12,data:c},...G(a)]:[{type:12,data:c}]})}},Zi=e=>U(e),Qi=(e,t)=>{let{inputs:n,outputCount:r}=e,i=Zi({...t,outputCount:r});if(P.webgpu.validateInputContent&&Yi(n,i),t.trainingMode)throw Error(`BatchNormalization trainingMode is not supported yet.`);e.compute(Xi(n,i))}}),ea,ta,na,ra=N(()=>{H(),Q(),ea=e=>{if(e[0].dims.length!==3)throw Error(`input should have 3 dimensions`);if(![320,640,1280].includes(e[0].dims[2]))throw Error(`number of channels should be 320, 640 or 1280`);if(e[1].dims.length!==1)throw Error(`bias is expected to have 1 dimensions`);if(e[0].dims[2]!==e[1].dims[0])throw Error(`last dimension of input and bias are not the same`)},ta=e=>{let t=e[0].dims,n=e[0].dims[2],r=V.size(t)/4,i=e[0].dataType,a=X(`input`,i,t,4),o=X(`bias`,i,[n],4),s=X(`residual`,i,t,4),c=Z(`output`,i,t,4);return{name:`BiasAdd`,getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(r/64)}}),getShaderSource:e=>`
  const channels = ${n}u / 4;
  ${e.declareVariables(a,o,s,c)}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(r)}
    let value = ${a.getByOffset(`global_idx`)}
      + ${o.getByOffset(`global_idx % channels`)} + ${s.getByOffset(`global_idx`)};
    ${c.setByOffset(`global_idx`,`value`)}
  }`}},na=e=>{ea(e.inputs),e.compute(ta(e.inputs))}}),ia,$,aa,oa,sa,ca,la,ua,da,fa,pa,ma,ha,ga,_a,va,ya,ba,xa,Sa,Ca,wa,Ta,Ea,Da,Oa,ka,Aa,ja,Ma,Na,Pa,Fa,Ia,La,Ra,za,Ba,Va,Ha,Ua,Wa,Ga,Ka,qa,Ja,Ya=N(()=>{z(),H(),W(),Q(),ia=(e,t,n,r,i,a,o)=>{let s=Math.ceil(t/4),c=``;c=typeof i==`string`?`${i}(a)`:i(`a`);let l=X(`inputData`,n,[s],4),u=Z(`outputData`,r,[s],4),d=[{name:`vec_size`,type:`u32`}];return o&&d.push(...o),`
      ${e.registerUniforms(d).declareVariables(l,u)}

  ${a??``}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.vec_size`)}

    let a = ${l.getByOffset(`global_idx`)};
    ${u.setByOffset(`global_idx`,c)}
  }`},$=(e,t,n,r,i,a=e.dataType,o,s)=>{let c=[{type:12,data:Math.ceil(V.size(e.dims)/4)}];return o&&c.push(...o),{name:t,shaderCache:{hint:i,inputDependencies:[`type`]},getShaderSource:t=>ia(t,V.size(e.dims),e.dataType,a,n,r,s),getRunData:t=>({outputs:[{dims:e.dims,dataType:a}],dispatchGroup:{x:Math.ceil(V.size(t[0].dims)/64/4)},programUniforms:c})}},aa=e=>{e.compute($(e.inputs[0],`Abs`,`abs`))},oa=e=>{e.compute($(e.inputs[0],`Acos`,`acos`))},sa=e=>{e.compute($(e.inputs[0],`Acosh`,`acosh`))},ca=e=>{e.compute($(e.inputs[0],`Asin`,`asin`))},la=e=>{e.compute($(e.inputs[0],`Asinh`,`asinh`))},ua=e=>{e.compute($(e.inputs[0],`Atan`,`atan`))},da=e=>{e.compute($(e.inputs[0],`Atanh`,`atanh`))},fa=e=>U(e),pa=(e,t)=>{let n;switch(t.to){case 10:n=`vec4<f16>`;break;case 1:n=`vec4<f32>`;break;case 12:n=`vec4<u32>`;break;case 6:n=`vec4<i32>`;break;case 9:n=`vec4<bool>`;break;default:throw RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute($(e.inputs[0],`Cast`,n,void 0,t.cacheKey,t.to))},ma=e=>{let t,n,r=e.length>=2&&e[1].data!==0,i=e.length>=3&&e[2].data!==0;switch(e[0].dataType){case 1:t=r?e[1].getFloat32Array()[0]:-34028234663852886e22,n=i?e[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:t=r?e[1].getUint16Array()[0]:64511,n=i?e[2].getUint16Array()[0]:31743;break;default:throw Error(`Unsupport data type`)}return U({min:t,max:n})},ha=(e,t)=>{let n=t||ma(e.inputs),r=Cr(e.inputs[0].dataType);e.compute($(e.inputs[0],`Clip`,e=>`clamp(${e}, vec4<${r}>(uniforms.min), vec4<${r}>(uniforms.max))`,void 0,n.cacheKey,void 0,[{type:e.inputs[0].dataType,data:n.min},{type:e.inputs[0].dataType,data:n.max}],[{name:`min`,type:r},{name:`max`,type:r}]),{inputs:[0]})},ga=e=>{e.compute($(e.inputs[0],`Ceil`,`ceil`))},_a=e=>{e.compute($(e.inputs[0],`Cos`,`cos`))},va=e=>{e.compute($(e.inputs[0],`Cosh`,`cosh`))},ya=e=>U(e),ba=(e,t)=>{let n=Cr(e.inputs[0].dataType);e.compute($(e.inputs[0],`Elu`,e=>`elu_vf32(${e})`,`
  const elu_alpha_ = ${n}(${t.alpha});

  fn elu_f32(a: ${n}) -> ${n} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${n}>) -> vec4<${n}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,t.cacheKey))},xa=(e=`f32`)=>`
const r0: ${e} = 0.3275911;
const r1: ${e} = 0.254829592;
const r2: ${e} = -0.284496736;
const r3: ${e} = 1.421413741;
const r4: ${e} = -1.453152027;
const r5: ${e} = 1.061405429;

fn erf_vf32(v: vec4<${e}>) -> vec4<${e}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,Sa=e=>{let t=Cr(e.inputs[0].dataType);e.compute($(e.inputs[0],`Erf`,e=>`erf_vf32(${e})`,xa(t)))},Ca=e=>{e.compute($(e.inputs[0],`Exp`,`exp`))},wa=e=>{e.compute($(e.inputs[0],`Floor`,`floor`))},Ta=e=>{let t=Cr(e.inputs[0].dataType);e.compute($(e.inputs[0],`Gelu`,e=>`0.5 * ${e} * (1.0 + erf_vf32(${e} * 0.7071067811865475))`,xa(t)))},Ea=(e,t)=>{let n=Cr(e.inputs[0].dataType);e.compute($(e.inputs[0],`LeakyRelu`,e=>`select(leaky_relu_alpha_ * ${e}, ${e}, ${e} >= vec4<${n}>(0.0))`,`const leaky_relu_alpha_ = ${n}(${t.alpha});`,t.cacheKey))},Da=e=>{e.compute($(e.inputs[0],`Not`,e=>`!${e}`))},Oa=e=>{e.compute($(e.inputs[0],`Neg`,e=>`-${e}`))},ka=e=>{e.compute($(e.inputs[0],`Reciprocal`,e=>`1.0/${e}`))},Aa=e=>{let t=Cr(e.inputs[0].dataType);e.compute($(e.inputs[0],`Relu`,e=>`select(vec4<${t}>(0.0), ${e}, ${e} > vec4<${t}>(0.0))`))},ja=e=>{e.compute($(e.inputs[0],`Sigmoid`,e=>`(1.0 / (1.0 + exp(-${e})))`))},Ma=e=>U(e),Na=(e,t)=>{let n=Cr(e.inputs[0].dataType);e.compute($(e.inputs[0],`HardSigmoid`,e=>`max(vec4<${n}>(0.0), min(vec4<${n}>(1.0), ${t.alpha} * ${e} + vec4<${n}>(${t.beta})))`,void 0,t.cacheKey))},Pa=e=>{let t=Cr(e.inputs[0].dataType);e.compute($(e.inputs[0],`HardSwish`,e=>`${e} * max(vec4<${t}>(0.0), min(vec4<${t}>(1.0), vec4<${t}>(${t}(1.0 / 6.0)) * ${e} + vec4<${t}>(0.5)))`))},Fa=e=>{e.compute($(e.inputs[0],`Sin`,`sin`))},Ia=e=>{e.compute($(e.inputs[0],`Sinh`,`sinh`))},La=e=>{e.compute($(e.inputs[0],`Sqrt`,`sqrt`))},Ra=e=>{e.compute($(e.inputs[0],`Tan`,`tan`))},za=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,Ba=e=>{e.compute($(e.inputs[0],`Tanh`,za))},Va=(e=`f32`)=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${za(`v`)};
}
`,Ha=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,Ua=e=>{let t=Cr(e.inputs[0].dataType);e.compute($(e.inputs[0],`FastGelu`,Ha,Va(t),void 0,e.inputs[0].dataType))},Wa=(e,t)=>{let n=Cr(e.inputs[0].dataType);return e.compute($(e.inputs[0],`ThresholdedRelu`,e=>`select(vec4<${n}>(0.0), ${e}, ${e} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${n}>(${t.alpha});`,t.cacheKey)),0},Ga=e=>{e.compute($(e.inputs[0],`Log`,`log`))},Ka=(e,t)=>`
const alpha = vec4<${e}>(${t});
const one = ${e}(1.0);
const zero = ${e}(0.0);

fn quick_gelu_impl(x: vec4<${e}>) -> vec4<${e}> {
  let v = x *alpha;
  var x1 : vec4<${e}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,qa=e=>`quick_gelu_impl(${e})`,Ja=(e,t)=>{let n=Cr(e.inputs[0].dataType);e.compute($(e.inputs[0],`QuickGelu`,qa,Ka(n,t.alpha),t.cacheKey,e.inputs[0].dataType))}}),Xa,Za,Qa,$a=N(()=>{H(),Q(),Ya(),Xa=e=>{if(e[0].dims.length!==3)throw Error(`input should have 3 dimensions`);if(![2560,5120,10240].includes(e[0].dims[2]))throw Error(`hidden state should be 2560, 5120 or 10240`);if(e[1].dims.length!==1)throw Error(`bias is expected to have 1 dimensions`);if(e[0].dims[2]!==e[1].dims[0])throw Error(`last dimension of input and bias are not the same`)},Za=e=>{let t=e[0].dims.slice();t[2]/=2;let n=X(`input`,e[0].dataType,e[0].dims,4),r=X(`bias`,e[0].dataType,[e[0].dims[2]],4),i=Z(`output`,e[0].dataType,t,4),a=V.size(t)/4,o=Sr(e[0].dataType);return{name:`BiasSplitGelu`,getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(a/64)}}),getShaderSource:t=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${e[0].dims[2]/4/2}u;

  ${t.declareVariables(n,r,i)}

  ${xa(o)}

  ${t.mainStart()}
    ${t.guardAgainstOutOfBoundsWorkgroupSizes(a)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${i.setByOffset(`global_idx`,`valueLeft * geluRight`)}
  }`}},Qa=e=>{Xa(e.inputs),e.compute(Za(e.inputs))}}),eo,to,no,ro,io,ao,oo,so,co,lo,uo,fo,po,mo=N(()=>{z(),H(),Q(),eo=(e,t,n,r,i,a,o,s,c,l,u,d)=>{let f,p;typeof s==`string`?f=p=(e,t)=>`${s}((${e}),(${t}))`:typeof s==`function`?f=p=s:(f=s.scalar,p=s.vector);let m=Z(`outputData`,u,r.length,4),h=X(`aData`,c,t.length,4),g=X(`bData`,l,n.length,4),_;if(i){if(a){let e=V.size(t)===1,r=V.size(n)===1,i=t.length>0&&t[t.length-1]%4==0,a=n.length>0&&n[n.length-1]%4==0;_=e||r?m.setByOffset(`global_idx`,p(e?`${h.type.value}(${h.getByOffset(`0`)}.x)`:h.getByOffset(`global_idx`),r?`${g.type.value}(${g.getByOffset(`0`)}.x)`:g.getByOffset(`global_idx`))):`
            let outputIndices = ${m.offsetToIndices(`global_idx * 4u`)};
            let offsetA = ${h.broadcastedIndicesToOffset(`outputIndices`,m)};
            let offsetB = ${g.broadcastedIndicesToOffset(`outputIndices`,m)};
            ${m.setByOffset(`global_idx`,p(o||i?h.getByOffset(`offsetA / 4u`):`${h.type.value}(${h.getByOffset(`offsetA / 4u`)}[offsetA % 4u])`,o||a?g.getByOffset(`offsetB / 4u`):`${g.type.value}(${g.getByOffset(`offsetB / 4u`)}[offsetB % 4u])`))}
          `}else _=m.setByOffset(`global_idx`,p(h.getByOffset(`global_idx`),g.getByOffset(`global_idx`)))}else{if(!a)throw Error(`no necessary to use scalar implementation for element-wise binary op implementation.`);let e=(e,t,n=``)=>{let r=`aData[indexA${t}][componentA${t}]`,i=`bData[indexB${t}][componentB${t}]`;return`
            let outputIndices${t} = ${m.offsetToIndices(`global_idx * 4u + ${t}u`)};
            let offsetA${t} = ${h.broadcastedIndicesToOffset(`outputIndices${t}`,m)};
            let offsetB${t} = ${g.broadcastedIndicesToOffset(`outputIndices${t}`,m)};
            let indexA${t} = offsetA${t} / 4u;
            let indexB${t} = offsetB${t} / 4u;
            let componentA${t} = offsetA${t} % 4u;
            let componentB${t} = offsetB${t} % 4u;
            ${e}[${t}] = ${n}(${f(r,i)});
          `};_=u===9?`
            var data = vec4<u32>(0);
            ${e(`data`,0,`u32`)}
            ${e(`data`,1,`u32`)}
            ${e(`data`,2,`u32`)}
            ${e(`data`,3,`u32`)}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:`
            ${e(`outputData[global_idx]`,0)}
            ${e(`outputData[global_idx]`,1)}
            ${e(`outputData[global_idx]`,2)}
            ${e(`outputData[global_idx]`,3)}
          `}return`
        ${e.registerUniform(`vec_size`,`u32`).declareVariables(h,g,m)}

        ${d??``}

        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.vec_size`)}
        ${_}
      }`},to=(e,t,n,r,i,a,o=n.dataType)=>{let s=n.dims.map(Number),c=r.dims.map(Number),l=!V.areEqual(s,c),u=s,d=V.size(s),f=!1,p=!1,m=[l];if(l){let e=zn.calcShape(s,c,!1);if(!e)throw Error(`Can't perform binary op on the given tensors`);u=e.slice(),d=V.size(u);let t=V.size(s)===1,n=V.size(c)===1,r=s.length>0&&s[s.length-1]%4==0,i=c.length>0&&c[c.length-1]%4==0;m.push(t),m.push(n),m.push(r),m.push(i);let a=1;for(let e=1;e<u.length;e++){let t=s[s.length-e];if(t===c[c.length-e])a*=t;else break}a%4==0?(p=!0,f=!0):(t||n||r||i)&&(f=!0)}else f=!0;return m.push(f),{name:e,shaderCache:{hint:t+m.map(e=>e.toString()).join(`_`),inputDependencies:[`rank`,`rank`]},getShaderSource:e=>eo(e,s,c,u,f,l,p,i,n.dataType,r.dataType,o,a),getRunData:()=>({outputs:[{dims:u,dataType:o}],dispatchGroup:{x:Math.ceil(d/64/4)},programUniforms:[{type:12,data:Math.ceil(V.size(u)/4)},...G(s,c,u)]})}},no=(e,t,n,r,i,a)=>{e.compute(to(t,i??``,e.inputs[0],e.inputs[1],n,r,a))},ro=e=>{no(e,`Add`,(e,t)=>`${e}+${t}`)},io=e=>{no(e,`Div`,(e,t)=>`${e}/${t}`)},ao=e=>{no(e,`Equal`,{scalar:(e,t)=>`u32(${e}==${t})`,vector:(e,t)=>`vec4<u32>(${e}==${t})`},void 0,void 0,9)},oo=e=>{no(e,`Mul`,(e,t)=>`${e}*${t}`)},so=e=>{let t=X(`input`,e.inputs[0].dataType,e.inputs[0].dims).type.value;no(e,`Pow`,{scalar:(e,t)=>`pow_custom(${e},${t})`,vector:(e,t)=>`pow_vector_custom(${e},${t})`},`
    fn pow_custom(a : ${t}, b : ${t}) -> ${t} {
      if (b == ${t}(0.0)) {
        return ${t}(1.0);
      } else if (a < ${t}(0.0) && f32(b) != floor(f32(b))) {
        return ${t}(pow(f32(a), f32(b))); // NaN
      }
      return select(sign(a), ${t}(1.0), round(f32(abs(b) % ${t}(2.0))) != 1.0) * ${t}(${t===`i32`?`round`:``}(pow(f32(abs(a)), f32(b))));
    }
    fn pow_vector_custom(a : vec4<${t}>, b : vec4<${t}>) -> vec4<${t}> {
      // TODO: implement vectorized pow
      return vec4<${t}>(pow_custom(a.x, b.x), pow_custom(a.y, b.y), pow_custom(a.z, b.z), pow_custom(a.w, b.w));
    }
      `)},co=e=>{no(e,`Sub`,(e,t)=>`${e}-${t}`)},lo=e=>{no(e,`Greater`,{scalar:(e,t)=>`u32(${e}>${t})`,vector:(e,t)=>`vec4<u32>(${e}>${t})`},void 0,void 0,9)},uo=e=>{no(e,`Less`,{scalar:(e,t)=>`u32(${e}<${t})`,vector:(e,t)=>`vec4<u32>(${e}<${t})`},void 0,void 0,9)},fo=e=>{no(e,`GreaterOrEqual`,{scalar:(e,t)=>`u32(${e}>=${t})`,vector:(e,t)=>`vec4<u32>(${e}>=${t})`},void 0,void 0,9)},po=e=>{no(e,`LessOrEqual`,{scalar:(e,t)=>`u32(${e}<=${t})`,vector:(e,t)=>`vec4<u32>(${e}<=${t})`},void 0,void 0,9)}}),ho,go,_o,vo,yo,bo,xo=N(()=>{z(),H(),W(),Q(),ho=(e,t)=>{if(!e||e.length<1)throw Error(`too few inputs`);let n=e[0],r=n.dataType,i=n.dims.length;e.forEach((e,a)=>{if(a!==0){if(e.dataType!==r)throw Error(`input tensors should be one type`);if(e.dims.length!==i)throw Error(`input tensors should have the same shape`);e.dims.forEach((e,r)=>{if(r!==t&&e!==n.dims[r])throw Error(`non concat dimensions must match`)})}})},go=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,_o=(e,t)=>{let n=e.length,r=[];for(let i=0;i<n;++i){let a=t.setByOffset(`global_idx`,e[i].getByIndices(`indices`));n===1?r.push(a):i===0?r.push(`if (inputIndex == ${i}u) { ${a} }`):i===n-1?r.push(`else { ${a} }`):r.push(`else if (inputIndex == ${i}) { ${a} }`)}return r.join(`
`)},vo=(e,t,n,r)=>{let i=V.size(n),a=Array(e.length),o=Array(e.length),s=0,c=[],l=[],u=[{type:12,data:i}];for(let n=0;n<e.length;++n)s+=e[n].dims[t],a[n]=s,l.push(e[n].dims.length),o[n]=X(`input${n}`,r,l[n]),c.push(`rank`),u.push({type:12,data:a[n]});for(let t=0;t<e.length;++t)u.push(...G(e[t].dims));u.push(...G(n));let d=Z(`output`,r,n.length),f=d.indicesGet(`indices`,t),p=Array.from(Array(a.length).keys()).map(e=>`uniforms.sizeInConcatAxis${e}`).join(`,`);return{name:`Concat`,shaderCache:{hint:`${t}`,inputDependencies:c},getRunData:()=>({outputs:[{dims:n,dataType:r}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:u}),getShaderSource:t=>`

  ${(()=>{t.registerUniform(`outputSize`,`u32`);for(let n=0;n<e.length;n++)t.registerUniform(`sizeInConcatAxis${n}`,`u32`);return t.declareVariables(...o,d)})()}

  ${go(a.length,p)}

  ${t.mainStart()}
    ${t.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}

    var indices = ${d.offsetToIndices(`global_idx`)};

    let inputIndex = calculateInputIndex(${f});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${a.length}u>(${p});
      ${f} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${_o(o,d)}
  }`}},yo=(e,t)=>{let n=e.inputs,r=n[0].dims,i=V.normalizeAxis(t.axis,r.length);ho(n,i);let a=r.slice();a[i]=n.reduce((e,t)=>e+(t.dims.length>i?t.dims[i]:0),0);let o=n.filter(e=>V.size(e.dims)>0);e.compute(vo(o,i,a,n[0].dataType),{inputs:o})},bo=e=>U({axis:e.axis})}),So,Co,wo,To,Eo=N(()=>{z(),H(),So=(e,t,n=`f32`)=>{switch(e.activation){case`Relu`:return`value = max(value, ${t}(0.0));`;case`Sigmoid`:return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case`Clip`:return`value = clamp(value, ${t}(${n}(uniforms.clip_min)), ${t}(${n}(uniforms.clip_max)));`;case`HardSigmoid`:return`value = max(${t}(0.0), min(${t}(1.0), ${n}(uniforms.alpha) * value + ${n}(uniforms.beta)));`;case`LeakyRelu`:return`value = select(${n}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case`Tanh`:return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case``:return``;default:throw Error(`Unsupported activation ${e.activation}`)}},Co=(e,t)=>{e.activation===`Clip`?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation===`HardSigmoid`?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation===`LeakyRelu`&&t.push({type:1,data:e.alpha})},wo=(e,t)=>{e.activation===`Clip`?t.push({name:`clip_max`,type:`f32`},{name:`clip_min`,type:`f32`}):e.activation===`HardSigmoid`?t.push({name:`alpha`,type:`f32`},{name:`beta`,type:`f32`}):e.activation===`LeakyRelu`&&t.push({name:`alpha`,type:`f32`})},To=e=>{let t=e?.activation||``;if(t===`HardSigmoid`){let[n,r]=e?.activation_params||[.2,.5];return{activation:t,alpha:n,beta:r}}if(t===`Clip`){let[n,r]=e?.activation_params||[Hn,Un];return{activation:t,clipMax:r,clipMin:n}}if(t===`LeakyRelu`){let[n]=e?.activation_params||[.01];return{activation:t,alpha:n}}return{activation:t}}}),Do,Oo,ko=N(()=>{Do=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw Error(`${e}-component is not supported.`)}},Oo=e=>`
      ${e?`value = value + getBiasByOutputCoords(coords);`:``}
      `}),Ao,jo=N(()=>{Ao=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`}),Mo,No,Po=N(()=>{z(),H(),Q(),Eo(),Mo=(e,t,n,r,i)=>{let a=r-n;return`
      ${Array.from({length:n}).map((n,o)=>`
      if (${J(t.shape,o,t.rank)} != 1) {
        ${t.indicesSet(e,o,J(i,o+a,r))}
      } else {
        ${t.indicesSet(e,o,0)}
      }`).join(``)}
`},No=(e,t,n,r,i=!1,a)=>{let o=e[0].dims,s=e[1].dims,c=o[o.length-2],l=s[s.length-1],u=o[o.length-1],d=K(l),f=K(u),p=K(c),m=V.size(n)/d/p,h=e.length>2,g=r?r.slice(0,-2):n.slice(0,-2),_=[V.size(g),c,l],v=[{type:12,data:m},{type:12,data:c},{type:12,data:l},{type:12,data:u}];return Co(t,v),v.push(...G(g,o,s)),h&&v.push(...G(e[2].dims)),v.push(...G(_)),{name:`MatMulNaive`,shaderCache:{hint:`${t.activation};${d};${f};${p};${i}`,inputDependencies:h?[`rank`,`rank`,`rank`]:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:a?a(n):n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(m/64)},programUniforms:v}),getShaderSource:r=>{let a=Dr(`batch_dims`,e[0].dataType,g.length),c=X(`a`,e[0].dataType,o.length,f),l=X(`b`,e[1].dataType,s.length,d),u=Z(`output`,e[0].dataType,_.length,d),m=Sr(u.type.tensor),v=So(t,u.type.value,m),y=[c,l],b=``;if(h){let t=i?d:1;y.push(X(`bias`,e[2].dataType,e[2].dims.length,t)),b=`${i?`value += bias[col / ${t}];`:`value += ${u.type.value}(bias[row + i]);`}`}let x=[{name:`output_size`,type:`u32`},{name:`M`,type:`u32`},{name:`N`,type:`u32`},{name:`K`,type:`u32`}];wo(t,x);let S=()=>{let e=`var a_data: ${c.type.value};`;for(let t=0;t<f;t++)e+=`
              let b_data${t} = b[(b_offset + (k + ${t}) * uniforms.N + col) / ${d}];`;for(let t=0;t<p;t++){e+=`a_data = a[(a_offset + (row + ${t}) * uniforms.K + k) / ${f}];`;for(let n=0;n<f;n++)e+=`
            values[${t}] = fma(${l.type.value}(a_data${f===1?``:`[${n}]`}), b_data${n}, values[${t}]);
`}return e};return`
  ${r.registerUniforms(x).registerInternalVariables(a).declareVariables(...y,u)}
  ${r.mainStart()}
    ${r.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    let col = (global_idx % (uniforms.N / ${d})) * ${d};
    var index1 = global_idx / (uniforms.N / ${d});
    let stride1 = uniforms.M / ${p};
    let row = (index1 % stride1) * ${p};
    let batch = index1 / stride1;

    ${n.length===2?``:`let batch_indices = ${a.offsetToIndices(`batch`)};`}

    var a_indices: ${c.type.indices};
    ${Mo(`a_indices`,c,c.rank-2,a.rank,`batch_indices`)}
    ${c.indicesSet(`a_indices`,c.rank-2,0)}
    ${c.indicesSet(`a_indices`,c.rank-1,0)}
    let a_offset = ${c.indicesToOffset(`a_indices`)};

    var b_indices: ${l.type.indices};
    ${Mo(`b_indices`,l,l.rank-2,a.rank,`batch_indices`)}
    ${l.indicesSet(`b_indices`,l.rank-2,0)}
    ${l.indicesSet(`b_indices`,l.rank-1,0)}
    let b_offset = ${l.indicesToOffset(`b_indices`)};
    var values: array<${u.type.value}, ${p}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${f}) {
      ${S()}
    }
    for (var i = 0u; i < ${p}u; i++) {
      var value = values[i];
      ${b}
      ${v}
      let cur_indices = ${u.type.indices}(batch, row + i, col);
      let offset = ${u.indicesToOffset(`cur_indices`)};
      ${u.setByOffset(`offset / ${d}`,`value`)};
    }
  }
  `}}}}),Fo,Io,Lo,Ro,zo,Bo,Vo,Ho,Uo=N(()=>{z(),H(),Q(),Eo(),Po(),ko(),Fo=(e,t)=>e?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${t?`, batchIndices`:``});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${t?`, batchIndices`:``});
        `,Io=(e,t)=>e?`
        let ACached0 = mm_Asub[k * innerElementSize][localRow];
        let ACached1 = mm_Asub[k * innerElementSize + 1][localRow];
        let ACached2 = mm_Asub[k * innerElementSize + 2][localRow];
        ${t===3?``:`let ACached3 = mm_Asub[k * innerElementSize + 3][localRow];`}
        for (var i = 0; i < rowPerThread; i = i + 1) {
          acc[i] = BCached0 * ACached0[i] + acc[i];
          acc[i] = BCached1 * ACached1[i] + acc[i];
          acc[i] = BCached2 * ACached2[i] + acc[i];
          ${t===3?``:`acc[i] = BCached3 * ACached3[i] + acc[i];`}
        }`:`
        for (var i = 0; i < rowPerThread; i = i + 1) {
          let ACached = mm_Asub[tileRow + i][k];
          acc[i] = BCached0 * ACached.x + acc[i];
          acc[i] = BCached1 * ACached.y + acc[i];
          acc[i] = BCached2 * ACached.z + acc[i];
          ${t===3?``:`acc[i] = BCached3 * ACached.w + acc[i];`}
        }`,Lo=(e,t,n=`f32`,r,i=!1,a=32,o=!1,s=32)=>{let c=t[1]*e[1],l=t[0]*e[0],u=i?c:a,d=i?a:c,f=u/t[0],p=a/t[1];if(!((i&&f===4&&e[1]===4||!i&&(f===3||f===4))&&u%t[0]===0&&a%t[1]===0&&e[0]===4))throw Error(`If transposeA ${i} is true, innerElementSize ${f} and workPerThread[1] ${e[1]} must be 4.
      Otherwise, innerElementSize ${f} must be 3 or 4.
  tileAWidth ${u} must be divisible by workgroupSize[0]${t[0]}. tileInner ${a} must be divisible by workgroupSize[1] ${t[1]}. colPerThread ${e[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${f}<${n}>, ${u/f}>, ${d}>;
var<workgroup> mm_Bsub: array<array<vec4<${n}>, ${l/e[0]}>, ${a}>;

const rowPerThread = ${e[1]};
const colPerThread = ${e[0]};
const innerElementSize = ${f};
const tileInner = ${a};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
  let localRow = i32(localId.y);
  let tileRow = localRow * rowPerThread;
  let tileCol = i32(localId.x);

  let globalRow =i32(globalId.y) * rowPerThread;
  let globalCol = i32(globalId.x);
  let batch = ${o?`0`:`i32(globalId.z)`};
  ${r?`let batchIndices = ${r.offsetToIndices(`u32(batch)`)};`:``}
  let globalRowStart = i32(workgroupId.y) * ${c};

  let num_tiles = ${o?`${Math.ceil(s/a)}`:`(uniforms.dim_inner - 1) / tileInner + 1`};
  var kStart = ${o?`i32(globalId.z) * ${s}`:`0`};

  var acc: array<vec4<${n}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${p};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${Fo(i,r)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${p}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${r?`, batchIndices`:``});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${f===3?``:`let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];`}

          ${Io(i,f)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},Ro=(e,t)=>e?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${t?`, batchIndices`:``});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${t?`, batchIndices`:``});
            `,zo=e=>e?`let ACached = mm_Asub[k][tileRow + innerRow];`:`let ACached = mm_Asub[tileRow + innerRow][k];`,Bo=(e,t,n=`f32`,r,i=!1,a=32,o=!1,s=32,c=!1)=>{let l=e[1]*t[1],u=e[0]*t[0],d=i?l:a,f=i?a:l;if(f%t[1]!==0||d%t[0]!==0||a%t[1]!==0)throw Error(`tileAHight ${f} must be divisible by workgroupSize[1]${t[1]}, tileAWidth ${d} must be divisible by workgroupSize[0]${t[0]}, tileInner ${a} must be divisible by workgroupSize[1]${t[1]}`);let p=f/t[1],m=d/t[0],h=a/t[1],g=c?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${l};
    let globalColStart = i32(workgroupId.x) * ${u};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${f}; inputRow = inputRow + ${t[1]}) {
        for (var inputCol = localCol; inputCol < ${d}; inputCol = inputCol + ${t[0]}) {
          ${Ro(i,r)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${a}; inputRow = inputRow + ${t[1]}) {
            for (var inputCol = localCol; inputCol < ${u}; inputCol = inputCol + ${t[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${r?`, batchIndices`:``});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${n}, colPerThread>;
      for (var k = 0; k < tileInner; k = k + 1) {
        for (var inner = 0; inner < colPerThread; inner = inner + 1) {
          BCached[inner] = mm_Bsub[k][localCol + inner * ${t[0]}];
        }
        for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let ACached = ${i?`mm_Asub[k][localRow + innerRow * ${t[1]}];`:`mm_Asub[localRow + innerRow * ${t[1]}][k];`}
          for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
            acc[innerRow][innerCol] = acc[innerRow][innerCol] +
                ACached * BCached[innerCol];
          }
        }
      }
      workgroupBarrier();
    }
    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      let gRow = globalRowStart + localRow + innerRow * ${t[1]};
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        let gCol = globalColStart + localCol + innerCol * ${t[0]};
        mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);
      }
    }
    `:`
let tileRow = i32(localId.y) * rowPerThread;
let tileCol = i32(localId.x) * colPerThread;

let globalRow = i32(globalId.y) * rowPerThread;
let globalCol = i32(globalId.x) * colPerThread;
let globalRowStart = i32(workgroupId.y) * ${l};

let tileRowA = i32(localId.y) * ${p};
let tileColA = i32(localId.x) * ${m};
let tileRowB = i32(localId.y) * ${h};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${p}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${m}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${Ro(i,r)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${h}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${r?`, batchIndices`:``});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${n}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${zo(i)}
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        acc[innerRow][innerCol] = acc[innerRow][innerCol] + ACached * BCached[innerCol];
      }
    }
  }

  workgroupBarrier();
}

for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
  for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
    mm_write(batch, globalRow + innerRow, globalCol + innerCol,
        acc[innerRow][innerCol]);
  }
}
`;return`
  var<workgroup> mm_Asub : array<array<${n}, ${d}>, ${f}>;
  var<workgroup> mm_Bsub : array<array<${n}, ${u}>, ${a}>;
  const rowPerThread = ${e[1]};
  const colPerThread = ${e[0]};
  const tileInner = ${a};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${o?`0`:`i32(globalId.z)`};
    ${r?`let batchIndices = ${r.offsetToIndices(`u32(batch)`)};`:``}
    let num_tiles = ${o?`${Math.ceil(s/a)}`:`(uniforms.dim_inner - 1) / tileInner + 1`};
    var kStart = ${o?`i32(globalId.z) * ${s}`:`0`};

    var acc : array<array<${n}, colPerThread>, rowPerThread>;
    ${g}
  }
`},Vo=(e,t,n,r,i=!1)=>{let[a,o,s,c]=r,l=Sr(r[0].type.tensor);return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${a.type.indices}) -> ${Do(e,l)} {
      var value = ${Do(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        var aIndices: ${o.type.indices};
        ${Mo(`aIndices`,o,o.rank-2,a.rank,`batchIndices`)}
        ${o.indicesSet(`aIndices`,o.rank-2,`u32(row)`)}
        ${o.indicesSet(`aIndices`,o.rank-1,`u32(colIn)`)}
        value = ${o.getByIndices(`aIndices`)};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${a.type.indices}) -> ${Do(e,l)} {
      var value = ${Do(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        var bIndices: ${s.type.indices};
        ${Mo(`bIndices`,s,s.rank-2,a.rank,`batchIndices`)}
        ${s.indicesSet(`bIndices`,s.rank-2,`u32(row)`)}
        ${s.indicesSet(`bIndices`,s.rank-1,`u32(colIn)`)}
        value = ${s.getByIndices(`bIndices`)};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${Do(e,l)}) {
      let col = colIn * ${e};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${t?`value = value + ${i?`bias[colIn]`:`${Do(e,l)}(bias[row])`};`:``}
        ${n}
        ${c.setByIndices(`vec3<u32>(coords)`,`value`)}
      }
    }
    `},Ho=(e,t,n,r,i=!1,a)=>{let o=e[0].dims,s=e[1].dims,c=o.slice(0,-2),l=s.slice(0,-2),u=r?r.slice(0,-2):n.slice(0,-2),d=V.size(u),f=o[o.length-2],p=o[o.length-1],m=s[s.length-1],h=p%4==0&&m%4==0,g=f<=8?[4,1,1]:[4,4,1],_=[8,8,1],v=[Math.ceil(m/_[0]/g[0]),Math.ceil(f/_[1]/g[1]),Math.ceil(d/_[2]/g[2])],y=h?4:1,b=[...c,f,p/y],x=b.length,S=[...l,p,m/y],C=S.length,w=[d,f,m/y],ee=[{type:6,data:f},{type:6,data:m},{type:6,data:p}];Co(t,ee),ee.push(...G(u,b,S));let T=[`rank`,`rank`],E=e.length>2;return E&&(ee.push(...G(e[2].dims)),T.push(`rank`)),ee.push(...G(w)),{name:`MatMul`,shaderCache:{hint:`${g};${t.activation};${h};${i}`,inputDependencies:T},getRunData:()=>({outputs:[{dims:a?a(n):n,dataType:e[0].dataType}],dispatchGroup:{x:v[0],y:v[1],z:v[2]},programUniforms:ee}),getShaderSource:n=>{let r=u.length,a=Dr(`batchDims`,e[0].dataType,r,1),o=Sr(e[0].dataType),s=X(`a`,e[0].dataType,x,y),c=X(`b`,e[1].dataType,C,y),l=Z(`result`,e[0].dataType,w.length,y),d=[s,c];if(E){let t=i?y:1;d.push(X(`bias`,e[2].dataType,e[2].dims.length,t))}let f=[{name:`dim_a_outer`,type:`i32`},{name:`dim_b_outer`,type:`i32`},{name:`dim_inner`,type:`i32`}];wo(t,f);let p=Sr(l.type.tensor),m=So(t,l.type.value,p),v=Vo(y,E,m,[a,s,c,l],i);return`
  ${n.registerUniforms(f).registerInternalVariables(a).declareVariables(...d,l)}
  ${v}
  ${h?Lo(g,_,o,a):Bo(g,_,o,a)}
                   `}}}}),Wo,Go,Ko=N(()=>{z(),Ln(),Q(),Eo(),ko(),jo(),Uo(),Wo=(e,t,n,r,i=!1,a,o=4,s=4,c=4,l=`f32`)=>{let u=e=>{switch(e){case 1:return`resData = x[xIndex];`;case 3:return`resData = vec3<${l}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return`resData = x[xIndex / 4];`;default:throw Error(`innerElementSize ${e} is not supported.`)}},d=e=>{switch(e){case 1:return`return w[row * i32(uniforms.w_shape[3]) + colIn];`;case 4:return`return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];`;default:throw Error(`innerElementSize ${e} is not supported.`)}},f=e?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,p=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,m=e?`i32(uniforms.x_shape[1])`:`i32(uniforms.x_shape[2])`,h=e?`i32(uniforms.x_shape[2])`:`i32(uniforms.x_shape[3])`,g=e?`row`:`col`,_=e?`col`:`row`,v=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${e?`i32(uniforms.result_shape[2])`:`i32(uniforms.result_shape[3])`};
    let outRow = ${g} / outWidth;
    let outCol = ${g} % outWidth;

    let WRow = ${_} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${_} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${_} % inChannels;
    var resData = ${Do(o,l)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${m} && xCol >= 0 && xCol < ${h}) {
      ${f}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${u(o)}
    }
    return resData;`,y=e?t&&r?`
    let col = colIn * ${o};
    ${v}`:`
    let col = colIn * ${o};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${v}
    }
    return ${Do(o,l)}(0.0);`:r&&n?`
    let col = colIn * ${o};
    ${v}`:`
    let col = colIn * ${o};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${v}
    }
    return ${Do(o,l)}(0.0);`,b=e?r&&n?d(s):`
    let col = colIn * ${s};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${d(s)}
    }
    return ${Do(s,l)}(0.0);`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_inner && col < uniforms.dim_a_outer) {
      ${d(s)}
    }
    return ${Do(s,l)}(0.0);`,x=Do(c,l),S=Do(e?o:s,l),C=Do(e?s:o,l),w=So(a,x,l);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${S} {
      ${e?y:b}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${C} {
      ${e?b:y}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${x}) {
      let col = colIn * ${c};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${e?`i32(uniforms.result_shape[2])`:`i32(uniforms.result_shape[3])`};
      ${p}
      ${Oo(i)}
      ${w}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},Go=(e,t,n,r,i,a,o,s,c)=>{let l=t.format===`NHWC`,u=l?e[0].dims[3]:e[0].dims[1],d=n[0],f=l?n[2]:n[3],p=l?n[1]:n[2],m=l?n[3]:n[1],h=l&&(u%4==0||u%3==0)&&m%4==0,g=l?m:f*p,_=l?f*p:m,v=[8,8,1],y=r<=8?[4,1,1]:[4,4,1],b=[Math.ceil(g/v[0]/y[0]),Math.ceil(_/v[1]/y[1]),Math.ceil(d/v[2]/y[2])];B(`verbose`,()=>`[conv2d_mm_webgpu] dispatch = ${b}`);let x=h?l&&u%4!=0?3:4:1,S=v[1]*y[1],C=v[0]*y[0],w=Math.max(v[0]*x,v[1]),ee=r%S===0,T=i%C===0,E=a%w===0,D=h?[x,4,4]:[1,1,1],O=[{type:6,data:r},{type:6,data:i},{type:6,data:a},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];Co(t,O),O.push(...G(e[0].dims,e[1].dims));let k=[`rank`,`rank`];return o&&(O.push(...G(e[2].dims)),k.push(`rank`)),O.push(...G(n)),{name:`Conv2DMatMul`,shaderCache:{hint:`${t.cacheKey};${x};${h};${ee};${T};${E};${S};${C};${w}`,inputDependencies:k},getRunData:()=>({outputs:[{dims:c?c(n):n,dataType:e[0].dataType}],dispatchGroup:{x:b[0],y:b[1],z:b[2]},programUniforms:O}),getShaderSource:r=>{let i=[{name:`dim_a_outer`,type:`i32`},{name:`dim_b_outer`,type:`i32`},{name:`dim_inner`,type:`i32`},{name:`pad`,type:`i32`,length:2},{name:`stride`,type:`i32`,length:2},{name:`dilation`,type:`i32`,length:2}];wo(t,i);let a=h?4:1,c=Sr(e[0].dataType),u=`
      fn setOutputAtIndex(flatIndex : i32, value : ${h?`vec4<${c}>`:c}) {
        result[flatIndex] = ${h?`vec4<${c}>`:c}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${h?`vec4<${c}>`:c}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${h?`/ 4`:``}, value);
      }`,d=[X(`x`,e[0].dataType,e[0].dims.length,x===3?1:x),X(`w`,e[1].dataType,e[1].dims.length,a)],f=Z(`result`,e[0].dataType,n.length,a);if(o){let t=X(`bias`,e[2].dataType,e[2].dims.length,a);d.push(t),u+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${h?`vec4<${c}>`:c} {
          return bias[coords.${l?`w`:`y`}${h?`/ 4`:``}];
        }`}return`
        ${Ao(`uniforms.result_strides`)}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${r.registerUniforms(i).declareVariables(...d,f)}
        ${u}
        ${Wo(l,ee,T,E,o,t,D[0],D[1],D[2],c)}
        ${h?Lo(y,v,c,void 0,!l,w):Bo(y,v,c,void 0,!l,w,!1,void 0,s)}`}}}}),qo,Jo,Yo,Xo,Zo,Qo,$o,es,ts=N(()=>{z(),Ln(),H(),Q(),Eo(),ko(),qo=e=>{let t=1;for(let n=0;n<e.length;n++)t*=e[n];return t},Jo=e=>typeof e==`number`?[e,e,e]:e,Yo=(e,t)=>t<=1?e:e+(e-1)*(t-1),Xo=(e,t,n,r=1)=>{let i=Yo(t,r);return Math.floor((e[0]*(n-1)-n+i)/2)},Zo=(e,t,n,r,i)=>{i??=Xo(e,t[0],r[0]);let a=[0,0,0,n];for(let n=0;n<3;n++)e[n]+2*i>=t[n]&&(a[n]=Math.trunc((e[n]-t[n]+2*i)/r[n]+1));return a},Qo=(e,t,n,r,i,a,o,s,c,l)=>{let u,d,f,p;if(e===`VALID`&&(e=0),typeof e==`number`){u={top:e,bottom:e,left:e,right:e,front:e,back:e};let m=Zo([t,n,r,1],[s,c,l],1,[i,a,o],e);d=m[0],f=m[1],p=m[2]}else if(Array.isArray(e)){if(!e.every((e,t,n)=>e===n[0]))throw Error(`Unsupported padding parameter: ${e}`);u={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let m=Zo([t,n,r,1],[s,c,l],1,[i,a,o],e[0]);d=m[0],f=m[1],p=m[2]}else if(e===`SAME_UPPER`){d=Math.ceil(t/i),f=Math.ceil(n/a),p=Math.ceil(r/o);let e=(d-1)*i+s-t,m=(f-1)*a+c-n,h=(p-1)*o+l-r,g=Math.floor(e/2),_=e-g,v=Math.floor(m/2),y=m-v,b=Math.floor(h/2);u={top:v,bottom:y,left:b,right:h-b,front:g,back:_}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:u,outDepth:d,outHeight:f,outWidth:p}},$o=(e,t,n,r,i,a=!1,o=`channelsLast`)=>{let s,c,l,u,d;if(o===`channelsLast`)[s,c,l,u,d]=e;else if(o===`channelsFirst`)[s,d,c,l,u]=e;else throw Error(`Unknown dataFormat ${o}`);let[f,,p,m,h]=t,[g,_,v]=Jo(n),[y,b,x]=Jo(r),S=Yo(p,y),C=Yo(m,b),w=Yo(h,x),{padInfo:ee,outDepth:T,outHeight:E,outWidth:D}=Qo(i,c,l,u,g,_,v,S,C,w),O=a?f*d:f,k=[0,0,0,0,0];return o===`channelsFirst`?k=[s,O,T,E,D]:o===`channelsLast`&&(k=[s,T,E,D,O]),{batchSize:s,dataFormat:o,inDepth:c,inHeight:l,inWidth:u,inChannels:d,outDepth:T,outHeight:E,outWidth:D,outChannels:O,padInfo:ee,strideDepth:g,strideHeight:_,strideWidth:v,filterDepth:p,filterHeight:m,filterWidth:h,effectiveFilterDepth:S,effectiveFilterHeight:C,effectiveFilterWidth:w,dilationDepth:y,dilationHeight:b,dilationWidth:x,inShape:e,outShape:k,filterShape:t}},es=(e,t,n,r,i,a)=>{let o=a===`channelsLast`;o?e[0].dims[3]:e[0].dims[1];let s=[64,1,1],c={x:n.map((e,t)=>t)},l=[Math.ceil(qo(c.x.map(e=>n[e]))/s[0]),1,1];B(`verbose`,()=>`[conv3d_naive_webgpu] dispatch = ${l}`);let u=[{type:12,data:V.size(n)},{type:12,data:r},{type:12,data:i},{type:12,data:t.strides},{type:12,data:t.dilations}];Co(t,u),u.push(...G(e[0].dims,e[1].dims));let d=[`rank`,`rank`],f=e.length===3;return f&&(u.push(...G(e[2].dims)),d.push(`rank`)),u.push(...G(n)),{name:`Conv3DNaive`,shaderCache:{hint:`${t.cacheKey};${o};1;${f}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:l[0],y:l[1],z:l[2]},programUniforms:u}),getShaderSource:a=>{let s=[{name:`output_size`,type:`u32`},{name:`filter_dims`,type:`u32`,length:r.length},{name:`pads`,type:`u32`,length:i.length},{name:`strides`,type:`u32`,length:t.strides.length},{name:`dilations`,type:`u32`,length:t.dilations.length}];wo(t,s);let c=Sr(e[0].dataType),l=X(`x`,e[0].dataType,e[0].dims.length,1),u=X(`W`,e[1].dataType,e[1].dims.length,1),d=[l,u],p=Z(`result`,e[0].dataType,n.length,1),m=``;if(f){let t=X(`bias`,e[2].dataType,e[2].dims.length,1);d.push(t),m+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${c} {
          return bias[${o?J(`coords`,4,5):J(`coords`,1,5)}];
        }`}let h=Do(1,c),g=So(t,h,c);return`
            ${m}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> ${c} {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${l.getByIndices(`aIndices`)};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> ${c} {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${u.getByIndices(`aIndices`)};
            }
          ${a.registerUniforms(s).declareVariables(...d,p)}
          ${a.mainStart()}
          ${a.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
              let coords = ${p.offsetToIndices(`global_idx`)};
              let batch = ${J(`coords`,0,l.rank)};
              let d2 = ${o?J(`coords`,l.rank-1,l.rank):J(`coords`,1,l.rank)};
              let xFRCCorner = vec3<u32>(${o?J(`coords`,1,l.rank):J(`coords`,2,l.rank)},
              ${o?J(`coords`,2,l.rank):J(`coords`,3,l.rank)},
              ${o?J(`coords`,3,l.rank):J(`coords`,4,l.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${o?J(`uniforms.x_shape`,1,l.rank):J(`uniforms.x_shape`,2,l.rank)};
              let xShapeZ = ${o?J(`uniforms.x_shape`,2,l.rank):J(`uniforms.x_shape`,3,l.rank)};
              let xShapeW = ${o?J(`uniforms.x_shape`,3,l.rank):J(`uniforms.x_shape`,4,l.rank)};
              let xShapeU = ${o?J(`uniforms.x_shape`,4,l.rank):J(`uniforms.x_shape`,1,l.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = ${c}(0);
              for (var wF = 0u; wF < uniforms.filter_dims[0]; wF++) {
                let xF = xFCorner + wF * uniforms.dilations[0];
                if (xF < 0 || xF >= xShapeY) {
                  continue;
                }

                for (var wR = 0u; wR < uniforms.filter_dims[1]; wR++) {
                  let xR = xRCorner + wR * uniforms.dilations[1];
                  if (xR < 0 || xR >= xShapeZ) {
                    continue;
                  }

                  for (var wC = 0u; wC < uniforms.filter_dims[2]; wC++) {
                    let xC = xCCorner + wC * uniforms.dilations[2];
                    if (xC < 0 || xC >= xShapeW) {
                      continue;
                    }

                    for (var d1 = 0u; d1 < inputDepthNearestVec4; d1 += 4) {
                      ${o?`let xValues = vec4<${c}>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<${c}>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<${c}>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${o?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${o?`let xValues = vec2<${c}>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<${c}>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<${c}>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${o?`let xValues = vec3<${c}>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<${c}>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<${c}>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${f?`value = value + getBiasByOutputCoords(coords)`:``};
              ${g}
              result[global_idx] = ${c}(value);
          }`}}}}),ns,rs,is=N(()=>{z(),H(),Q(),Eo(),ns=(e,t,n,r)=>{let i=e.length>2,a=i?`value += b[output_channel];`:``,o=e[0].dims,s=e[1].dims,c=t.format===`NHWC`,l=c?n[3]:n[1],u=l/t.group,d=c&&u>=4?K(l):1,f=V.size(n)/d,p=[{type:12,data:f},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:u}];Co(t,p),p.push(...G(o,[s[0],s[1],s[2],s[3]/d]));let m=i?[`rank`,`rank`,`rank`]:[`rank`,`rank`];return p.push(...G([n[0],n[1],n[2],n[3]/d])),{name:`GroupedConv`,shaderCache:{hint:`${t.cacheKey}_${d}`,inputDependencies:m},getRunData:()=>({outputs:[{dims:r?r(n):n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:p}),getShaderSource:r=>{let l=Z(`output`,e[0].dataType,n.length,d),u=Sr(l.type.tensor),f=So(t,l.type.value,u),p=X(`x`,e[0].dataType,o.length),m=X(`w`,e[1].dataType,s.length,d),h=[p,m];i&&h.push(X(`b`,e[2].dataType,e[2].dims,d));let g=[{name:`output_size`,type:`u32`},{name:`dilations`,type:`u32`,length:t.dilations.length},{name:`strides`,type:`u32`,length:2},{name:`pads`,type:`u32`,length:2},{name:`output_channels_per_group`,type:`u32`}];wo(t,g);let _=c?`
      for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[0]; wHeight++) {
        let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

        if (xHeight < 0u || xHeight >= uniforms.x_shape[1]) {
          continue;
        }

        for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[1]; wWidth++) {
          let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
          if (xWidth < 0u || xWidth >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[2]; wInChannel++) {
            let input_channel = in_channel_offset + wInChannel;
            let xVal = ${p.get(`batch`,`xHeight`,`xWidth`,`input_channel`)};
            let wVal = ${m.get(`wHeight`,`wWidth`,`wInChannel`,`output_channel`)};
            value += xVal * wVal;
          }
        }
      }
      `:`
      for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[1]; wInChannel++) {
        let input_channel = in_channel_offset + wInChannel;
        for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[2]; wHeight++) {
          let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

          if (xHeight < 0u || xHeight >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[3]; wWidth++) {
            let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
            if (xWidth < 0u || xWidth >= uniforms.x_shape[3]) {
              continue;
            }

            let xVal = ${p.get(`batch`,`input_channel`,`xHeight`,`xWidth`)};
            let wVal = ${m.get(`output_channel`,`wInChannel`,`wHeight`,`wWidth`)};
            value += xVal * wVal;
          }
        }
      }
      `;return`
  ${r.registerUniforms(g).declareVariables(...h,l)}

  ${r.mainStart()}
    ${r.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}

    let outputIndices = ${l.offsetToIndices(`global_idx`)};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${c?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${c?1:2}], outputIndices[${c?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${d} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${c?2:1}];

    var value: ${l.type.value} = ${l.type.value}(0);
    ${_}
    ${a}
    ${f}
    ${l.setByOffset(`global_idx`,`value`)}
  }`}}},rs=(e,t,n,r)=>{let i=e.length>2,a=K(n[3]),o=K(n[2]),s=V.size(n)/a/o,c=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/a],l=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/a],u=[n[0],n[1],n[2],n[3]/a],d=[{type:12,data:s},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];Co(t,d),d.push(...G(c,l,u));let f=(o-1)*t.strides[1]+l[1];return{name:`GroupedConv-Vectorize`,shaderCache:{hint:`${t.cacheKey};${a};${o};${f};${l[0]};${l[1]}`,inputDependencies:i?[`rank`,`rank`,`type`]:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:r?r(n):n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:d}),getShaderSource:n=>{let r=Z(`output`,e[0].dataType,u.length,a),s=Sr(r.type.tensor),d=So(t,r.type.value,s),p=X(`x`,e[0].dataType,c.length,a),m=X(`w`,e[1].dataType,l.length,a),h=[p,m];i&&h.push(X(`b`,e[2].dataType,e[2].dims,a));let g=i?`value += b[output_channel];`:``,_=[{name:`output_size`,type:`u32`},{name:`strides`,type:`i32`,length:2},{name:`pads`,type:`i32`,length:2}];return wo(t,_),`
  ${n.registerUniforms(_).declareVariables(...h,r)}
  ${n.mainStart()}
    ${n.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${o}u;
    let col = (index1 % width1) * ${o}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${p.type.value}, ${f}>;
    var values: array<${r.type.value}, ${o}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${l[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${f}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${p.get(`batch`,`u32(x_height)`,`u32(x_width)`,`input_channel`)};
          } else {
            x_vals[i] = ${p.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${l[1]}; w_width++) {
          let w_val = ${m.get(`w_height`,`w_width`,`0`,`output_channel`)};
          for (var i = 0u; i < ${o}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${o}u; i++) {
      var value = values[i];
      ${g}
      ${d}
      ${r.set(`batch`,`row`,`col + i`,`output_channel`,`value`)};
    }
  }`}}}}),as,os,ss,cs,ls,us,ds,fs,ps,ms=N(()=>{H(),Ko(),ts(),Uo(),is(),Eo(),Po(),zr(),as=(e,t,n,r,i,a)=>{let o=e[0],s=e.slice(a?1:2,a?3:4),c=s.length,l=t[0],u=t.slice(2).map((e,t)=>e+(e-1)*(n[t]-1)),d=s.map((e,t)=>e+r[t]+r[t+c]).map((e,t)=>Math.floor((e-u[t]+i[t])/i[t]));return d.splice(0,0,o),d.splice(a?3:1,0,l),d},os=[2,3,1,0],ss=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw Error(`Conv requires 2 or 3 inputs`);if(e[0].dims.length>5)throw Error(`greater than 5D is not supported`);if(e[0].dims.length!==e[1].dims.length)throw Error(`filter does not have same dimension as input`);if(e[0].dims[t.format===`NHWC`?e[0].dims.length-1:1]!==e[1].dims[1]*t.group)throw Error(`FILTER_IN_CHANNEL should be equal to DATA_CHANNEL`);if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw Error(`invalid bias`);let n=e[0].dims.length-2;if(t.dilations.length!==n)throw Error(`dilations should be ${n}D`);if(t.strides.length!==n)throw Error(`strides should be ${n}D`);if(t.pads.length!==n*2)throw Error(`pads should be ${n*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw Error(`invalid kernel shape`)},cs=(e,t)=>{let n=e.kernelShape.slice();n.length<t[1].dims.length-2&&n.push(...Array(t[1].dims.length-2-n.length).fill(0));for(let e=2;e<t[1].dims.length;++e)n[e-2]===0&&(n[e-2]=t[1].dims[e]);let r=e.pads.slice();Bn.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,n,r,e.format===`NHWC`,e.autoPad);let i=Object.assign({},e);return Object.assign(i,{kernelShape:n,pads:r}),i},ls=e=>{let t=To(e),n=e.format;return{autoPad:[`NOTSET`,`VALID`,`SAME_UPPER`,`SAME_LOWER`][e.auto_pad],format:n,dilations:e.dilations,group:e.group,kernelShape:e.kernel_shape,pads:e.pads,strides:e.strides,wIsConst:e.w_is_const(),...t,cacheKey:`${e.format};${t.activation};`}},us=(e,t,n,r)=>{let i=n.format===`NHWC`,a=as(t[0].dims,t[1].dims,n.dilations,n.pads,n.strides,i);if(n.group!==1){let o=[t[0]];if(i){let r=e.kernelCustomData.wT??e.compute(Ir(t[1],os),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=r),o.push(r)}else o.push(t[1]);t.length===3&&o.push(t[2]),!e.adapterInfo.isArchitecture(`ampere`)&&i&&t[1].dims[0]===n.group&&t[1].dims[1]===1&&n.dilations[0]===1&&n.dilations[1]===1?e.compute(rs(o,n,a,r),{inputs:o}):e.compute(ns(o,n,a,r),{inputs:o});return}let o=t.length===3,s=t[0].dims[i?1:2],c=t[0].dims[i?2:3],l=t[0].dims[i?3:1],u=t[1].dims[2],d=t[1].dims[3],f=a[i?1:2],p=a[i?2:3],m=a[i?3:1],h=i&&u===s&&d===c&&n.pads[0]===0&&n.pads[1]===0;if(h||u===1&&d===1&&n.dilations[0]===1&&n.dilations[1]===1&&n.strides[0]===1&&n.strides[1]===1&&n.pads[0]===0&&n.pads[1]===0){let u=a[0],d,g,_,v=[];if(i){let r=e.kernelCustomData.wT??e.compute(Ir(t[1],os),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];if(n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=r),h){let e=s*c*l;d=t[0].reshape([1,u,e]),g=r.reshape([1,e,m]),_=[1,u,m]}else d=t[0].reshape([u,s*c,l]),g=r.reshape([1,l,m]),_=[u,f*p,m];v.push(d),v.push(g)}else d=t[0].reshape([u,l,s*c]),g=t[1].reshape([1,m,l]),_=[u,m,f*p],v.push(g),v.push(d);o&&v.push(t[2]);let y=_[2],b=v[0].dims[v[0].dims.length-1];y<8&&b<8?e.compute(No(v,n,a,_,i,r),{inputs:v}):e.compute(Ho(v,n,a,_,i,r),{inputs:v});return}let g=e.kernelCustomData.wT??e.compute(Ir(t[1],os),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=g);let _=[t[0],g];o&&_.push(t[2]);let v=i?f*p:m,y=i?m:f*p,b=u*d*l;e.compute(Go(_,n,a,v,y,b,o,!0,r),{inputs:_})},ds=(e,t)=>{let n=t.format===`NHWC`,r=[e.inputs[0].reshape(n?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&r.push(e.inputs[2]);let i=[0,t.pads[0],0,t.pads[1]],a=[1].concat(t.strides),o=[1].concat(t.dilations),s=[1].concat(t.kernelShape),c=cs({...t,pads:i,strides:a,dilations:o,kernelShape:s},r);us(e,r,c,e=>n?[e[0],e[2],e[3]]:[e[0],e[1],e[3]])},fs=(e,t,n)=>{let r=n.format===`NHWC`?`channelsLast`:`channelsFirst`,i=cs(n,t),a=n.autoPad===`NOTSET`?n.pads:n.autoPad,o=$o(t[0].dims,t[1].dims,n.strides,n.dilations,a,!1,r);e.compute(es(t,i,o.outShape,[o.filterDepth,o.filterHeight,o.filterWidth],[o.padInfo.front,o.padInfo.top,o.padInfo.left],r))},ps=(e,t)=>{if(ss(e.inputs,t),e.inputs[0].dims.length===3)ds(e,t);else if(e.inputs[0].dims.length===5)fs(e,e.inputs,t);else{let n=cs(t,e.inputs);us(e,e.inputs,n)}}}),hs,gs=N(()=>{z(),Ln(),H(),Q(),hs=(e,t,n)=>{let r=e.length>2,i=t.outputShape,a=t.format===`NHWC`,o=t.group,s=e[1].dims,c=s[2]/o,l=s[3],u=a?K(c):1,d=a&&l===1&&c>=4,f=d?Math.floor(c/4)*4:Math.floor(c/u)*u,p=c-f,m=a?K(l):1,h=a?l===1?u:m:1,g=V.size(i)/m,_=[Math.ceil(g/64),1,1];B(`verbose`,()=>`[conv2d_backprop_webgpu] dispatch = ${_}`);let v=[`rank`,`rank`],y=[t.strides[0],t.strides[1]],b=[t.kernelShape[a?1:2],t.kernelShape[a?2:3]],x=[t.dilations[0],t.dilations[1]],S=[b[0]+(t.dilations[0]<=1?0:(t.kernelShape[a?1:2]-1)*(t.dilations[0]-1)),b[1]+(t.dilations[1]<=1?0:(t.kernelShape[a?2:3]-1)*(t.dilations[1]-1))],C=[S[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),S[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],w=[{type:12,data:g},{type:12,data:y},{type:12,data:b},{type:12,data:x},{type:12,data:S},{type:6,data:C},{type:12,data:f},{type:12,data:c},{type:12,data:l},...G(e[0].dims,e[1].dims)];return r&&(w.push(...G(e[2].dims)),v.push(`rank`)),w.push(...G(i)),{name:`ConvTranspose2D`,shaderCache:{hint:`${t.cacheKey};${u}${h}${m}${d}${p}`,inputDependencies:v},getRunData:()=>({dispatchGroup:{x:_[0],y:_[1],z:_[2]},outputs:[{dims:n?n(i):i,dataType:e[0].dataType}],programUniforms:w}),getShaderSource:t=>{let n=[{name:`output_size`,type:`u32`},{name:`strides`,type:`u32`,length:y.length},{name:`filter_dims`,type:`u32`,length:b.length},{name:`dilations`,type:`u32`,length:b.length},{name:`effective_filter_dims`,type:`u32`,length:S.length},{name:`pads`,type:`i32`,length:C.length},{name:`input_channels_per_group_int`,type:`u32`},{name:`input_channels_per_group`,type:`u32`},{name:`output_channels_per_group`,type:`u32`}],o=Sr(e[0].dataType),s=a?1:2,c=a?2:3,l=a?3:1,f=X(`W`,e[1].dataType,e[1].dims.length,h),g=X(`Dy`,e[0].dataType,e[0].dims.length,u),_=[g,f];r&&_.push(X(`bias`,e[2].dataType,[i[l]].length,m));let v=Z(`result`,e[0].dataType,i.length,m),x=`
            let outputIndices = ${v.offsetToIndices(`global_idx * ${m}`)};
            let batch = ${v.indicesGet(`outputIndices`,0)};
            let d1 = ${v.indicesGet(`outputIndices`,l)};
            let r = ${v.indicesGet(`outputIndices`,s)};
            let c = ${v.indicesGet(`outputIndices`,c)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${v.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${o}(dyRCorner) + ${o}(wR)) / ${o}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${o}(uniforms.Dy_shape[${s}]) || fract(dyR) > 0.0 ||
                  wRPerm < 0) {
                continue;
              }
              let idyR: u32 = u32(dyR);
              var wC: u32 = 0;
              if (uniforms.dilations.y == 1) {
                // Minimum wC >= 0 that satisfies (dyCCorner + wC) % (uniforms.strides.y) == 0
                wC = u32(((dyCCorner + i32(uniforms.strides.y) - 1) / i32(uniforms.strides.y)) * i32(uniforms.strides.y) - dyCCorner);
              }
              for (; wC < uniforms.effective_filter_dims.y; wC = wC + 1) {
                if (wC % uniforms.dilations.y != 0) {
                  continue;
                }
                let dyC = (${o}(dyCCorner) + ${o}(wC)) / ${o}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${o}(uniforms.Dy_shape[${c}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                ${d?`
                var x_offset = ${g.indicesToOffset(`${g.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${u};
                var w_offset = ${f.indicesToOffset(`${f.type.indices}(wRPerm, wCPerm, inputChannel, wOutChannel)`)} / ${h};
                  `:``}
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group_int; d2 = d2 + ${d?4:u}) {
                  ${(()=>{let e=``;if(d)u===4?e+=`
        let xValue = ${g.getByOffset(`x_offset`)};
        let wValue = ${f.getByOffset(`w_offset`)};
        dotProd = dotProd + dot(xValue, wValue);
        x_offset += 1u;
        w_offset += 1u;`:u===2?e+=`
          dotProd = dotProd + dot(vec4<${o}>(${g.getByOffset(`x_offset`)}, ${g.getByOffset(`x_offset + 1u`)}), vec4<${o}>(${f.getByOffset(`w_offset`)}, ${f.getByOffset(`w_offset + 1u`)}));
          x_offset += 2u;
          w_offset += 2u;`:u===1&&(e+=`
          dotProd = dotProd + dot(vec4<${o}>(${g.getByOffset(`x_offset`)}, ${g.getByOffset(`x_offset + 1u`)}, ${g.getByOffset(`x_offset + 2u`)}, ${g.getByOffset(`x_offset + 3u`)}), vec4<${o}>(${f.getByOffset(`w_offset`)}, ${f.getByOffset(`w_offset + 1u`)}, ${f.getByOffset(`w_offset + 2u`)}, ${f.getByOffset(`w_offset + 3u`)}));
          x_offset += 4u;
          w_offset += 4u;`);else if(e+=`
                  let xValue = ${a?g.getByOffset(`${g.indicesToOffset(`${g.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${u}`):g.get(`batch`,`inputChannel`,`idyR`,`idyC`)};
        `,u===1)e+=`
          let w_offset = ${f.indicesToOffset(`${f.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
          let wValue = ${f.getByOffset(`w_offset / ${h}`)};
          dotProd = dotProd + xValue * wValue;`;else for(let t=0;t<u;t++)e+=`
            let wValue${t} = ${f.getByOffset(`${f.indicesToOffset(`${f.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${t}, wOutChannel)`)} / ${h}`)};
            dotProd = dotProd + xValue[${t}] * wValue${t};`;return e})()}
                  inputChannel = inputChannel + ${d?4:u};
                }
                ${(()=>{if(p===0)return``;if(!d)throw Error(`packInputAs4 ${d} is not true.`);let e=``;if(u===1){e+=`dotProd = dotProd`;for(let t=0;t<p;t++)e+=`
            + ${g.getByOffset(`x_offset + ${t}`)} * ${f.getByOffset(`w_offset + ${t}`)}`;e+=`;`}else if(u===2){if(p!==2)throw Error(`Invalid inputChannelsRemainder ${p}.`);e+=`
          let xValue = ${g.getByOffset(`x_offset`)};
          let wValue = ${f.getByOffset(`w_offset`)};
          dotProd = dotProd + dot(xValue, wValue);`}return e})()}
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${r?` + bias[d1 / ${m}]`:``};
            ${v.setByOffset(`global_idx`,`value`)};
          `;return`
    ${t.registerUniforms(n).declareVariables(..._,v)}
      ${t.mainStart()}
      ${t.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)};
    ${x}}`}}}}),_s,vs,ys,bs,xs,Ss,Cs,ws,Ts,Es=N(()=>{gs(),Eo(),zr(),_s=(e,t,n,r,i,a)=>(e-1)*t+n+(r-1)*i+1-a,vs=(e,t,n,r,i)=>{let a=Math.floor(e/2);t===`SAME_UPPER`?(n[r]=a,n[i]=e-a):t===`SAME_LOWER`&&(n[r]=e-a,n[i]=a)},ys=(e,t,n,r,i,a,o,s,c,l)=>{let u=e.length-2,d=l.length===0;c.length<u&&c.push(...Array(u-c.length).fill(0));let f=e[0],p=t[s?3:1]*i;for(let i=0,f=e.length-u-+!!s;i<u;++i,++f){let s=e[f],p=d?s*o[i]:l[i],m=_s(s,o[i],a[i],t[f],n[i],p);vs(m,r,a,i,i+u),d&&l.push(o[i]*(s-1)+c[i]+(t[f]-1)*n[i]+1-a[i]-a[i+u])}l.splice(0,0,f),l.splice(s?3:1,0,p)},bs=(e,t)=>{let n=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((e,t)=>e*t,1)===0){n.length=0;for(let e=2;e<t[1].dims.length;++e)n.push(t[1].dims[e])}let r=e.format===`NHWC`;n.splice(0,0,t[1].dims[0]),n.splice(r?3:1,0,t[1].dims[1]);let i=e.pads.slice(),a=e.outputShape.slice(),o=e.outputPadding.slice(),s=t[0].dims,c=e.dilations.slice();if(c.reduce((e,t)=>e+t,0)===0){let e=t[0].dims.length-2;c=Array(e).fill(1)}let l=e.strides.slice();if(l.reduce((e,t)=>e+t,0)===0){let e=t[0].dims.length-2;l=Array(e).fill(1)}ys(s,n,c,e.autoPad,e.group,i,l,r,o,a);let u=Object.assign({},e);return Object.assign(u,{kernelShape:n,pads:i,outputPadding:o,outputShape:a,dilations:c,strides:l}),u},xs=e=>{let t=To(e),n=e.format,r=[`NOTSET`,`VALID`,`SAME_UPPER`,`SAME_LOWER`][typeof e.autoPad>`u`?0:e.autoPad],i=e.dilations,a=e.group??1,o=e.kernelShape,s=e.pads,c=e.strides,l=e.wIsConst();return{autoPad:r,format:n,dilations:i,group:a,kernelShape:o,outputPadding:e.outputPadding,outputShape:e.outputShape,pads:s,strides:c,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},Ss=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw Error(`Conv requires 2 or 3 inputs`);if(e[0].dims.length!==4&&e[0].dims.length!==3)throw Error(`currently only support 2-dimensional conv`);if(e[0].dims.length!==e[1].dims.length)throw Error(`filter does not have same dimension as input`);if(e[0].dims[t.format===`NHWC`?e[0].dims.length-1:1]!==e[1].dims[0])throw Error(`FILTER_IN_CHANNEL should be equal to DATA_CHANNEL`);let n=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==n))throw Error(`invalid bias`);let r=e[0].dims.length-2;if(t.dilations.reduce((e,t)=>e+t,0)>0&&t.dilations.length!==r)throw Error(`dilations should be ${r}D`);if(t.strides.reduce((e,t)=>e+t,0)>0&&t.strides.length!==r)throw Error(`strides should be ${r}D`);if(t.pads.reduce((e,t)=>e+t,0)>0&&t.pads.length!==r*2)throw Error(`pads should be ${r*2}D`);if(t.outputPadding.length!==r&&t.outputPadding.length!==0)throw Error(`output_padding should be ${r}D`);if(t.kernelShape.reduce((e,t)=>e+t,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw Error(`invalid kernel shape`);if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw Error(`invalid output shape`)},Cs=(e,t,n,r)=>{let i=e.kernelCustomData.wT??e.compute(Ir(t[1],[2,3,0,1]),{inputs:[1],outputs:[n.wIsConst?-2:-1]})[0];n.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=i);let a=[t[0],i];t.length===3&&a.push(t[2]),e.compute(hs(a,n,r),{inputs:a})},ws=(e,t)=>{let n=t.format===`NHWC`,r=[e.inputs[0].reshape(n?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&r.push(e.inputs[2]);let i=t.kernelShape;(i.length===0||i[0]===0)&&(i=[e.inputs[1].dims[2]]);let a=t.dilations;(a.length===0||a[0]===0)&&(a=[1]);let o=t.strides;(o.length===0||o[0]===0)&&(o=[1]);let s=t.pads;s.length===0&&(s=[0,0]),s=[0,s[0],0,s[1]],o=[1].concat(o),a=[1].concat(a),i=[1].concat(i);let c=t.outputPadding;c=[0].concat(c);let l=bs({...t,pads:s,strides:o,dilations:a,kernelShape:i,outputPadding:c},r);Cs(e,r,l,e=>n?[e[0],e[2],e[3]]:[e[0],e[1],e[3]])},Ts=(e,t)=>{if(Ss(e.inputs,t),e.inputs[0].dims.length===3)ws(e,t);else{let n=bs(t,e.inputs);Cs(e,e.inputs,n)}}}),Ds,Os,ks,As=N(()=>{z(),H(),W(),Q(),Ds=(e,t,n,r)=>{let i=V.size(t),a=t.length,o=X(`input`,e,a),s=Z(`output`,e,a),c=n.dataType===6?n.getInt32Array()[0]:Number(n.getBigInt64Array()[0]),l=V.normalizeAxis(c,a);return{name:`CumSum`,shaderCache:{hint:r.cacheKey,inputDependencies:[`rank`]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:[{type:12,data:i},{type:12,data:l},...G(t,t)]}),getShaderSource:e=>{let t=` i32(${o.indicesGet(`inputIndices`,`uniforms.axis`)}) `,n=J(`uniforms.input_shape`,`uniforms.axis`,a),i=r.reverse?t+(r.exclusive?` + 1`:``):`0`,c=r.reverse?n:t+(r.exclusive?``:` + 1`);return`
                ${e.registerUniform(`outputSize`,`u32`).registerUniform(`axis`,`u32`).declareVariables(o,s)}
                ${e.mainStart()}
                  ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
                  var inputIndices = ${s.offsetToIndices(`global_idx`)};
                  var sum = ${s.type.value}(0);
                  let first : i32 = ${i};
                  let last : i32 = ${c};
                  for (var i : i32 = first; i < last; i++) {
                    ${o.indicesSet(`inputIndices`,`uniforms.axis`,`u32(i)`)};
                    sum = sum + ${o.getByIndices(`inputIndices`)};
                  }
                  ${s.setByOffset(`global_idx`,`sum`)};
                }`}}},Os=(e,t)=>{let n=e.inputs[0].dims,r=e.inputs[0].dataType,i=e.inputs[1];e.compute(Ds(r,n,i,t),{inputs:[0]})},ks=e=>{let t=e.exclusive===1,n=e.reverse===1;return U({exclusive:t,reverse:n})}}),js,Ms,Ns,Ps,Fs,Is=N(()=>{z(),H(),W(),Q(),js=e=>{if(!e||e.length!==1)throw Error(`DepthToSpace requires 1 input.`);if(e[0].dims.length!==4)throw Error(`DepthToSpace requires 4D input.`)},Ms=(e,t,n,r)=>{let i=[];i.push(`fn perm(i: ${r.type.indices}) -> ${n.type.indices} {
    var a: ${n.type.indices};`);for(let r=0;r<t;++r)i.push(n.indicesSet(`a`,e[r],`i[${r}]`));return i.push(`return a;}`),i.join(`
`)},Ns=(e,t)=>{let n,r,i,a,o,s,c=t.format===`NHWC`,l=t.blocksize,u=t.mode===`DCR`;c?([n,r,i,a]=e.dims,o=u?[n,r,i,l,l,a/l**2]:[n,r,i,a/l**2,l,l],s=u?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([n,r,i,a]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],o=u?[n,l,l,a/l**2,r,i]:[n,a/l**2,l,l,r,i],s=u?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let d=e.reshape(o),f=d.dims.length,p=e.dataType,m=X(`a`,p,f),h=Z(`output`,p,f);return{name:`DepthToSpace`,shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:[`rank`]},getRunData:e=>{let t=c?[n,r*l,i*l,a/l**2]:[n,a/l**2,r*l,i*l],o=V.size(t),u=d.dims,f=V.sortBasedOnPerm(u,s);return{outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:[{type:12,data:o},...G(u,f)]}},getShaderSource:e=>`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(m,h)}

  ${Ms(s,f,m,h)}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}

    let indices = ${h.offsetToIndices(`global_idx`)};
    let aIndices = perm(indices);

    ${h.setByOffset(`global_idx`,m.getByIndices(`aIndices`))}
  }`}},Ps=(e,t)=>{js(e.inputs),e.compute(Ns(e.inputs[0],t))},Fs=e=>U({blocksize:e.blocksize,mode:e.mode,format:e.format})}),Ls,Rs,zs,Bs,Vs,Hs,Us,Ws,Gs,Ks,qs,Js,Ys,Xs,Zs,Qs,$s,ec=N(()=>{z(),H(),W(),Q(),Ls=256,Rs=512,zs=2*Math.PI,Bs=e=>{let t=[],n=e;for(let e of[4,2,3,5])for(;n%e===0;)t.push(e),n/=e;return n===1?t:void 0},Vs=e=>{let t=e.toPrecision(9);return/[.eE]/.test(t)?t:`${t}.0`},Hs=(e,t,n,r,i)=>{let a=n/e,o=Rs-r,s=e=>`smem[${o}u + base + ${e*t}u]`,c=`  for (var t = local_idx; t < ${a}u; t += ${Ls}u) {
`;c+=`    let twiddleIndex = t % ${t}u;
    let angleUnit = f32(twiddleIndex);
`,c+=`    var leg: array<vec2<f32>, 5>;
`;for(let n=0;n<e;n++){let o=`${r}u + t + ${n*a}u`;if(n===0)c+=`    leg[0] = smem[${o}];
`;else{let r=i*zs*n/(e*t);c+=`    { let a = ${Vs(r)} * angleUnit; leg[${n}] = cmul(smem[${o}], vec2<f32>(cos(a), sin(a))); }
`}}if(c+=`    let base = (t / ${t}u) * ${t*e}u + twiddleIndex;
`,e===2)c+=`    ${s(0)} = leg[0] + leg[1];
    ${s(1)} = leg[0] - leg[1];
`;else if(e===4){let e=i<0?`vec2<f32>(oddDiff.y, -oddDiff.x)`:`vec2<f32>(-oddDiff.y, oddDiff.x)`;c+=`    let evenSum = leg[0] + leg[2]; let evenDiff = leg[0] - leg[2];
`,c+=`    let oddSum = leg[1] + leg[3]; let oddDiff = leg[1] - leg[3];
`,c+=`    let oddRot = ${e};
`,c+=`    ${s(0)} = evenSum + oddSum;
    ${s(1)} = evenDiff + oddRot;
`,c+=`    ${s(2)} = evenSum - oddSum;
    ${s(3)} = evenDiff - oddRot;
`}else for(let t=0;t<e;t++){let n=[`leg[0]`];for(let r=1;r<e;r++){let a=i*zs*(r*t)/e,o=Vs(Math.cos(a)),s=Vs(Math.sin(a));n.push(`vec2<f32>(leg[${r}].x*${o} - leg[${r}].y*${s}, leg[${r}].x*${s} + leg[${r}].y*${o})`)}c+=`    ${s(t)} = ${n.join(` + `)};
`}return`${c}  }
  workgroupBarrier();
`},Us=(e,t,n)=>{let r=``,i=1,a=0;for(let o of e)r+=Hs(o,i,t,a,n),i*=o,a=Rs-a;return{code:r,resultOffset:a}},Ws=(e,t,n,r,i)=>{let a=e.dims,o=a.length,s=a[o-1],c=a[t],l=n&&r?(c-1)*2:c;i!==void 0&&(l=i);let u=n&&r?1:2,d=r&&!n?Math.floor(l/2)+1:l,f=a.slice();f[t]=d,f[o-1]=u;let p=1;for(let e=t+1;e<o-1;e++)p*=a[e];let m=V.size(a)/s/c;return{dataType:e.dataType,outputDims:f,length:l,signalLength:c,inner:p,batch:m,inputComponents:s,outputComponents:u,outputLength:d,inverse:n,onesided:r}},Gs=(e,t)=>[t,e.length,e.inputComponents,e.outputComponents,e.inverse,e.onesided].join(`;`),Ks=e=>[{type:12,data:e.batch},{type:12,data:e.signalLength},{type:12,data:e.inner},{type:12,data:e.outputLength}],qs=(e,t,n)=>e.registerUniform(`batch`,`u32`).registerUniform(`signalLength`,`u32`).registerUniform(`inner`,`u32`).registerUniform(`outputLength`,`u32`).declareVariables(t,n),Js=e=>{let{dataType:t,length:n,inputComponents:r,outputComponents:i,inverse:a,onesided:o}=e,s=Cr(t),c=a?1:-1,l=a?1/n:1,u=Bs(n);return{name:`DFT`,shaderCache:{hint:Gs(e,`fft`),inputDependencies:[`type`]},getShaderSource:e=>{let d=X(`x`,t,[1]),f=Z(`y`,t,[1]),p=e=>{let t=`inBase + (${e}) * uniforms.inner * ${r}u`;return`vec2<f32>(${`f32(${d.getByOffset(t)})`}, ${r===2?`f32(${d.getByOffset(`${t} + 1u`)})`:`0.0`})`},m;if(a&&o){let e=Math.floor(n/2)+1,t=n%2==0?`select(provided, provided - 1u, provided == ${e}u)`:`provided`;m=`
    let provided = min(uniforms.signalLength, ${e}u);
    for (var i = local_idx; i < ${n}u; i += ${Ls}u) {
      if (i < provided) { smem[i] = ${p(`i`)}; } else { smem[i] = vec2<f32>(0.0); }
    }
    workgroupBarrier();
    for (var k = local_idx + 1u; k < ${t}; k += ${Ls}u) {
      let h = smem[k];
      smem[${n}u - k] = vec2<f32>(h.x, -h.y);
    }
    workgroupBarrier();`}else m=`
    let loadCount = min(uniforms.signalLength, ${n}u);
    for (var i = local_idx; i < ${n}u; i += ${Ls}u) {
      if (i < loadCount) { smem[i] = ${p(`i`)}; } else { smem[i] = vec2<f32>(0.0); }
    }
    workgroupBarrier();`;let{code:h,resultOffset:g}=Us(u,n,c),_=l===1?`smem[${g}u + i]`:`smem[${g}u + i] * ${Vs(l)}`,v=i===2?f.setByOffset(`off + 1u`,`${s}(v.y)`):``;return`
  ${qs(e,d,f)}
  var<workgroup> smem: array<vec2<f32>, ${2*Rs}>;
  fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }
  ${e.mainStart(Ls)}
    let row = workgroup_index;
    if (row >= uniforms.batch) { return; }
    let outer = row / uniforms.inner;
    let within = row % uniforms.inner;
    let inBase = (outer * uniforms.signalLength * uniforms.inner + within) * ${r}u;
    let outBase = (outer * uniforms.outputLength * uniforms.inner + within) * ${i}u;
    ${m}
${h}    for (var i = local_idx; i < uniforms.outputLength; i += ${Ls}u) {
      let v = ${_};
      let off = outBase + i * uniforms.inner * ${i}u;
      ${f.setByOffset(`off`,`${s}(v.x)`)}
      ${v}
    }
  }`},getRunData:()=>({outputs:[{dims:e.outputDims,dataType:t}],programUniforms:Ks(e),dispatchGroup:{x:e.batch}})}},Ys=e=>{let{dataType:t,length:n,inputComponents:r,outputComponents:i,inverse:a,onesided:o}=e,s=Cr(t),c=a?1:-1,l=a?1/n:1;return{name:`DFT`,shaderCache:{hint:Gs(e,`direct`),inputDependencies:[`type`]},getShaderSource:e=>{let u=X(`x`,t,[1]),d=Z(`y`,t,[1]),f=e=>{let t=`inBase + (${e}) * uniforms.inner * ${r}u`;return`vec2<f32>(${`f32(${u.getByOffset(t)})`}, ${r===2?`f32(${u.getByOffset(`${t} + 1u`)})`:`0.0`})`},p=a&&o?`fn spectrum(inBase: u32, k: u32) -> vec2<f32> {
    let provided = min(uniforms.signalLength, ${Math.floor(n/2)+1}u);
    if (k < provided) { return ${f(`k`)}; }
    let m = ${n}u - k;
    if (m < provided) {
      let h = ${f(`m`)};
      return vec2<f32>(h.x, -h.y);
    }
    return vec2<f32>(0.0, 0.0);
  }`:`fn spectrum(inBase: u32, n: u32) -> vec2<f32> {
    if (n < uniforms.signalLength) { return ${f(`n`)}; }
    return vec2<f32>(0.0, 0.0);
  }`,m=`
      let angle = ${Vs(c*zs)} * f32(knMod) / ${Vs(n)};
      acc += cmul(spectrum(inBase, n), vec2<f32>(cos(angle), sin(angle)));
      knMod += k;
      if (knMod >= ${n}u) { knMod -= ${n}u; }`,h=i===2?d.setByOffset(`off + 1u`,`${s}(v.y)`):``,g=l===1?`acc`:`acc * ${Vs(l)}`;return`
  ${qs(e,u,d)}
  fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
  }
  ${p}
  ${e.mainStart(Ls)}
    let row = workgroup_index;
    if (row >= uniforms.batch) { return; }
    let outer = row / uniforms.inner;
    let within = row % uniforms.inner;
    let inBase = (outer * uniforms.signalLength * uniforms.inner + within) * ${r}u;
    let outBase = (outer * uniforms.outputLength * uniforms.inner + within) * ${i}u;
    for (var k = local_idx; k < uniforms.outputLength; k += ${Ls}u) {
      var acc = vec2<f32>(0.0, 0.0);
      var knMod = 0u;
      for (var n = 0u; n < ${n}u; n++) {${m}
      }
      let v = ${g};
      let off = outBase + k * uniforms.inner * ${i}u;
      ${d.setByOffset(`off`,`${s}(v.x)`)}
      ${h}
    }
  }`},getRunData:()=>({outputs:[{dims:e.outputDims,dataType:t}],programUniforms:Ks(e),dispatchGroup:{x:e.batch}})}},Xs=e=>{if(!e||e.dataType===0)return;if(V.size(e.dims)!==1)throw Error(`DFT optional scalar inputs must have exactly 1 element.`);if(e.dataType===6)return e.getInt32Array()[0];let t=Number(e.getBigInt64Array()[0]);if(!Number.isSafeInteger(t))throw Error(`DFT optional scalar inputs are out of JavaScript safe integer range.`);return t},Zs=e=>{if(!e||e.length<1)throw Error(`DFT requires at least 1 input.`);let t=e[0].dims;if(t.length<2)throw Error(`DFT input must have at least 2 dimensions.`);let n=t[t.length-1];if(n!==1&&n!==2)throw Error(`DFT input's innermost dimension must be 1 (real) or 2 (complex).`)},Qs=(e,t)=>{Zs(e.inputs);let n=e.inputs[0],r=n.dims.length,i=t.inverse!==0,a=t.onesided!==0,o=Xs(e.inputs[1]);if(o!==void 0&&o<=0)throw Error(`dft_length must be greater than zero.`);let s=V.normalizeAxis(Xs(e.inputs[2])??t.axis,r);if(s===r-1)throw Error(`DFT axis must refer to a signal dimension, not the innermost (real/imaginary) dimension.`);if(i&&a&&n.dims[r-1]!==2)throw Error(`Inverse one-sided DFT (IRFFT) requires complex-valued input (innermost dimension 2).`);let c=Ws(n,s,i,a,o);if(c.length<=0)throw Error(`Invalid DFT length: ${c.length}`);let l=c.length<=Rs&&Bs(c.length)!==void 0?Js(c):Ys(c);e.compute(l,{inputs:[0]})},$s=e=>U({axis:e.axis??1,inverse:e.inverse??0,onesided:e.onesided??0})}),tc,nc,rc,ic,ac,oc,sc,cc,lc,uc,dc,fc=N(()=>{z(),H(),W(),Q(),tc=`[a-zA-Z]|\\.\\.\\.`,nc=`(`+tc+`)+`,rc=`^`+nc+`$`,ic=`(`+nc+`,)*`+nc,ac=`^`+ic+`$`,oc=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,t){let n=this.symbolToIndices.get(e);n===void 0?n=[t]:n.push(t),this.symbolToIndices.set(e,n)}},sc=class{constructor(e,t){this.equation=t,this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=[],this.outputDims=[];let[n,r]=t.includes(`->`)?t.split(`->`,2):[t,``];if(!n.match(RegExp(ac)))throw Error(`Invalid LHS term`);if(n.split(`,`).forEach((t,n)=>{let r=e[n].dims.slice();if(!t.match(RegExp(rc)))throw Error(`Invalid LHS term`);let i=this.processTerm(t,!0,r,n);this.lhs.push(i)}),r===``)r+=[...this.symbolToInfo.entries()].filter(([e,t])=>t.count===1||e===`...`).map(([e])=>e).join(``);else if(!r.match(RegExp(nc)))throw Error(`Invalid RHS`);r.match(RegExp(tc,`g`))?.forEach(e=>{if(e===`...`)this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let t=this.symbolToInfo.get(e);if(t===void 0)throw Error(`Invalid RHS symbol`);this.outputDims.push(t.dimValue)}}),this.rhs=this.processTerm(r,!1,this.outputDims)}addSymbol(e,t,n){let r=this.symbolToInfo.get(e);if(r!==void 0){if(r.dimValue!==t&&r.count!==1)throw Error(`Dimension mismatch`);r.count++,r.inputIndices.push(n)}else r={count:1,dimValue:t,inputIndices:[n]};this.symbolToInfo.set(e,r)}processTerm(e,t,n,r=-1){let i=n.length,a=!1,o=[],s=0;if(!e.match(RegExp(rc))&&!t&&e!==``)throw Error(`Invalid LHS term`);let c=e.match(RegExp(tc,`g`)),l=new oc(r);return c?.forEach((e,u)=>{if(e===`...`){if(a)throw Error(`Only one ellipsis is allowed per input term`);a=!0;let e=i-c.length+1;if(e<0)throw Error(`Ellipsis out of bounds`);if(o=n.slice(s,s+e),this.hasEllipsis){if(this.ellipsisDims.length!==o.length||this.ellipsisDims.toString()!==o.toString())throw Error(`Ellipsis dimensions mismatch`)}else if(t)this.hasEllipsis=!0,this.ellipsisDims=o;else throw Error(`Ellipsis must be specified in the LHS`);for(let e=0;e<o.length;e++){let t=String.fromCharCode(48+e);l.addSymbol(t,u+e),this.addSymbol(t,n[s++],r)}}else l.addSymbol(e,u+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(e,n[s++],r)}),l}},cc=e=>e+`_max`,lc=(e,t,n,r)=>{let i=e.map(e=>e.length).map((e,n)=>X(`input${n}`,t,e)),a=V.size(r),o=Z(`output`,t,r.length),s=[...n.symbolToInfo.keys()].filter(e=>!n.rhs.symbolToIndices.has(e));return{name:`Einsum`,shaderCache:{hint:n.equation,inputDependencies:e.map(()=>`rank`)},getRunData:()=>{let i=s.filter(e=>n.symbolToInfo.has(e)).map(e=>({type:12,data:n.symbolToInfo.get(e)?.dimValue||0}));i.push({type:12,data:a});let o=e.map((e,t)=>[...G(e)]).reduce((e,t)=>e.concat(t),i);return o.push(...G(r)),{outputs:[{dims:r,dataType:t}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:o}},getShaderSource:e=>{let t=[],r=[],a=[],c=[],l=[],u=n.symbolToInfo.size===n.rhs.symbolToIndices.size;n.symbolToInfo.forEach((e,s)=>{if(n.rhs.symbolToIndices.has(s)){let r=n.rhs.symbolToIndices.get(s)?.[0];r!==void 0&&n.lhs.forEach((n,a)=>{if(e.inputIndices.includes(a)){let e=n.symbolToIndices.get(s);if(e===void 0)throw Error(`Invalid symbol error`);e.forEach(e=>{t.push(`${i[a].indicesSet(`input${a}Indices`,e,o.indicesGet(`outputIndices`,r))}`)})}})}else n.lhs.forEach((t,n)=>{if(e.inputIndices.includes(n)){let e=t.symbolToIndices.get(s);if(e===void 0)throw Error(`Invalid symbol error`);e.forEach(e=>{r.push(`${i[n].indicesSet(`input${n}Indices`,e,`${s}`)}`)}),l.push(`prod *= ${i[n].getByIndices(`input${n}Indices`)};`)}}),a.push(`for(var ${s}: u32 = 0; ${s} < uniforms.${cc(s)}; ${s}++) {`),c.push(`}`)});let d=u?[...t,`let sum = ${i.map((e,t)=>e.getByIndices(`input${t}Indices`)).join(` * `)};`]:[...t,`var sum = 0.0;`,...a,...r,`var prod = 1.0;`,...l,`sum += prod;`,...c];return`
            ${e.registerUniforms(s.map(e=>({name:`${cc(e)}`,type:`u32`}))).registerUniform(`outputSize`,`u32`).declareVariables(...i,o)}

            ${e.mainStart()}
            ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
            var outputIndices = ${o.offsetToIndices(`global_idx`)};
            ${i.map((e,t)=>`var input${t}Indices: ${i[t].type.indices};`).join(`
`)}
            ${d.join(`
`)};
            ${o.setByOffset(`global_idx`,`sum`)};
          }`}}},uc=(e,t)=>{let n=new sc(e.inputs,t.equation),r=n.outputDims,i=e.inputs.map((e,t)=>e.dims);e.compute(lc(i,e.inputs[0].dataType,n,r))},dc=e=>{let t=e.equation.replace(/\s+/g,``);return U({equation:t})}}),pc,mc,hc,gc,_c,vc=N(()=>{z(),H(),Q(),pc=e=>{if(!e||e.length!==2)throw Error(`Expand requires 2 input.`);let t=e[0].dims,n=Array.from(e[1].getBigInt64Array(),Number),r=n.length<t.length?0:n.length-t.length,i=t.length<n.length?0:t.length-n.length;for(;r<n.length&&i<t.length;++r,++i)if(n[r]!==t[i]&&n[r]!==1&&t[i]!==1)throw Error(`Expand requires shape to be broadcastable to input`)},mc=(e,t)=>{let n=e.length-t.length,r=[];for(let t=0;t<n;++t)r.push(e[t]);for(let i=0;i<t.length;++i)r.push(t[i]===1?e[i+n]:t[i]);return r},hc=(e,t)=>e.length>t.length?mc(e,t):mc(t,e),gc=e=>{let t=e[0].dims,n=Array.from(e[1].getBigInt64Array(),Number),r=hc(t,n),i=e[0].dataType,a=i===9||V.size(t)===1,o=i===9||t.length>0&&t[t.length-1]%4==0?4:1,s=a||r.length>0&&r[r.length-1]%4==0?4:1,c=Math.ceil(V.size(r)/s),l=e=>{let n=X(`input`,i,t.length,o),a=Z(`output`,i,r.length,s),c;if(i===9){let e=(e,t,r=``)=>`
          let outputIndices${t} = ${a.offsetToIndices(`outputOffset + ${t}u`)};
          let offset${t} = ${n.broadcastedIndicesToOffset(`outputIndices${t}`,a)};
          let index${t} = offset${t} / 4u;
          let component${t} = offset${t} % 4u;
          ${e}[${t}] = ${r}(${n.getByOffset(`index${t}`)}[component${t}]);
        `;c=`
        let outputOffset = global_idx * ${s};
        var data = vec4<u32>(0);
        ${e(`data`,0,`u32`)}
        ${e(`data`,1,`u32`)}
        ${e(`data`,2,`u32`)}
        ${e(`data`,3,`u32`)}
        ${a.setByOffset(`global_idx`,`data`)}
      }`}else c=`
        let outputIndices = ${a.offsetToIndices(`global_idx * ${s}`)};
        let inputOffset = ${n.broadcastedIndicesToOffset(`outputIndices`,a)};
        let data = ${a.type.value}(${n.getByOffset(`inputOffset / ${o}`)});
        ${a.setByOffset(`global_idx`,`data`)}
      }`;return`
    ${e.registerUniform(`vec_size`,`u32`).declareVariables(n,a)}
    ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.vec_size`)}
    ${c}`},u=[{type:12,data:c},...G(t,r)];return{name:`Expand`,shaderCache:{hint:`${r.length};${o}${s}`,inputDependencies:[`rank`]},getShaderSource:l,getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:u})}},_c=e=>{pc(e.inputs),e.compute(gc(e.inputs),{inputs:[0]})}}),yc,bc,xc=N(()=>{z(),H(),Q(),Ya(),yc=e=>{let t=e[0].dataType,n=V.size(e[0].dims),r=V.size(e[1].dims),i=r%4==0;return{name:`FastGeluWithBias`,shaderCache:{hint:`${i}`,inputDependencies:[`type`,`type`]},getShaderSource:e=>{let n=X(`x`,t,[1],4),r=X(`bias`,t,[1],4),a=Z(`y`,t,[1],4),o=[{name:`output_vec_size`,type:`u32`},{name:`bias_size`,type:`u32`}],s=e=>`
      let bias${e}_offset: u32 = (global_idx * 4 + ${e}) % uniforms.bias_size;
      let bias${e} = ${r.getByOffset(`bias${e}_offset / 4`)}[bias${e}_offset % 4];`,c=i?`
      let bias = ${r.getByOffset(`global_idx % (uniforms.bias_size / 4)`)};`:`${s(0)}${s(1)}${s(2)}${s(3)}
      let bias = ${n.type.value}(bias0, bias1, bias2, bias3);`;return`${e.registerUniforms(o).declareVariables(n,r,a)}

    ${Va(Cr(t))}

    ${e.mainStart(br)}
      ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_vec_size`)}

      let x = ${n.getByOffset(`global_idx`)};
      ${c}
      let x_in = x + bias;
      ${a.setByOffset(`global_idx`,Ha(`x_in`))}
    }`},getRunData:e=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],programUniforms:[{type:12,data:Math.ceil(n/4)},{type:12,data:r}],dispatchGroup:{x:Math.ceil(n/br/4)}})}},bc=e=>{e.inputs.length<2||V.size(e.inputs[1].dims)===0?Ua(e):e.compute(yc(e.inputs))}}),Sc,Cc,wc,Tc,Ec=N(()=>{z(),H(),W(),Q(),Sc=e=>{if(!e||e.length!==2)throw Error(`Gather requires 2 inputs.`)},Cc=(e,t)=>{let n=e[0].dims,r=e[1].dims,i=n.length,a=V.normalizeAxis(t.axis,i),o=n.slice(0);o.splice(a,1,...r);let s=n[a],c=e[0].dataType===9?4:1,l=Math.ceil(V.size(o)/c),u=[{type:12,data:l},{type:6,data:s},{type:12,data:a},...G(e[0].dims,e[1].dims,o)];return{name:`Gather`,shaderCache:{hint:t.cacheKey,inputDependencies:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:o,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:u}),getShaderSource:t=>{let n=X(`data`,e[0].dataType,e[0].dims.length,c),s=X(`inputIndices`,e[1].dataType,e[1].dims.length),l=Z(`output`,e[0].dataType,o.length,c),u=e=>{let t=r.length,c=`var indicesIndices${e}  = ${s.type.indices}(0);`;for(let n=0;n<t;n++)c+=`${t>1?`indicesIndices${e}[${n}]`:`indicesIndices${e}`} = ${o.length>1?`outputIndices${e}[uniforms.axis + ${n}]`:`outputIndices${e}`};`;c+=`
          var idx${e} = ${s.getByIndices(`indicesIndices${e}`)};
          if (idx${e} < 0) {
            idx${e} = idx${e} + uniforms.axisDimLimit;
          }
          var dataIndices${e} : ${n.type.indices};
        `;for(let n=0,r=0;n<i;n++)n===a?(c+=`${i>1?`dataIndices${e}[${n}]`:`dataIndices${e}`} = u32(idx${e});`,r+=t):(c+=`${i>1?`dataIndices${e}[${n}]`:`dataIndices${e}`} = ${o.length>1?`outputIndices${e}[${r}]`:`outputIndices${e}`};`,r++);return c},d;if(e[0].dataType===9){let e=(e,t,r=``)=>`
          let outputIndices${t} = ${l.offsetToIndices(`outputOffset + ${t}u`)};
          ${u(t)};
          let offset${t} = ${n.indicesToOffset(`dataIndices${t}`)};
          let index${t} = offset${t} / 4u;
          let component${t} = offset${t} % 4u;
          ${e}[${t}] = ${r}(${n.getByOffset(`index${t}`)}[component${t}]);
        `;d=`
        let outputOffset = global_idx * ${c};
        var value = vec4<u32>(0);
        ${e(`value`,0,`u32`)}
        ${e(`value`,1,`u32`)}
        ${e(`value`,2,`u32`)}
        ${e(`value`,3,`u32`)}
        ${l.setByOffset(`global_idx`,`value`)}
      `}else d=`
      let outputIndices = ${l.offsetToIndices(`global_idx`)};
      ${u(``)};
      let value = ${n.getByIndices(`dataIndices`)};
      ${l.setByOffset(`global_idx`,`value`)};
      `;return`
      ${t.registerUniform(`outputSize`,`u32`).registerUniform(`axisDimLimit`,`i32`).registerUniform(`axis`,`u32`).declareVariables(n,s,l)}
      ${t.mainStart()}
        ${t.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
        ${d}
      }`}}},wc=e=>U({axis:e.axis}),Tc=(e,t)=>{let n=e.inputs;Sc(n),e.compute(Cc(e.inputs,t))}}),Dc,Oc,kc,Ac=N(()=>{z(),H(),Q(),Dc=(e,t,n,r,i,a,o,s,c)=>{let l=[{type:12,data:a},{type:12,data:r},{type:12,data:i},{type:12,data:n},{type:12,data:o},{type:12,data:s},{type:12,data:c}],u=[a];return l.push(...G(t.dims,u)),e.compute({name:`computeSliceOffsets`,shaderCache:{hint:`${i.length}_${n.length}`,inputDependencies:[`rank`]},getRunData:()=>({outputs:[{dims:u,dataType:e.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:l}),getShaderSource:e=>{let r=[X(`indices_data`,t.dataType,t.dims.length),Z(`input_slice_offsets_data`,12,1,1)],a=[{name:`output_size`,type:`u32`},{name:`batch_dims`,type:`u32`},{name:`input_dims`,type:`u32`,length:i.length},{name:`sizes_from_slice_dims_data`,type:`u32`,length:n.length},{name:`num_slices_per_batch`,type:`u32`},{name:`input_batch_stride`,type:`u32`},{name:`num_slice_dims`,type:`u32`}];return`
  ${e.registerUniforms(a).declareVariables(...r)}
  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    let batch_idx = global_idx / uniforms.num_slices_per_batch;
    let base_offset = batch_idx * uniforms.input_batch_stride;

    let slice_indices_base_offset = global_idx * uniforms.num_slice_dims;
    var relative_slice_offset = 0;
    for (var dim_idx = 0u; dim_idx < uniforms.num_slice_dims; dim_idx ++) {
      var index = i32(indices_data[dim_idx + slice_indices_base_offset].x);
      let input_dim_idx = uniforms.batch_dims + dim_idx;
      if (index < 0) {
        ${i.length===1?`index += i32(uniforms.input_dims);`:`index += i32(uniforms.input_dims[input_dim_idx]);`}
      }
      ${n.length===1?`relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data);`:`relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data[dim_idx]);`}
    }

    input_slice_offsets_data[global_idx] =  base_offset + u32(relative_slice_offset);
  }`}},{inputs:[t],outputs:[-1]})[0]},Oc=(e,t)=>{let n=e.inputs,r=n[0].dims,i=n[0].dataType,a=n[1].dims,o=a[a.length-1],s=V.sizeToDimension(a,a.length-1),c=V.sizeFromDimension(r,t.batchDims+o),l=V.sizeToDimension(r,t.batchDims),u=V.sizeFromDimension(r,t.batchDims),d=s/l,f=Array(o),p=c;for(let e=0;e<o;++e)f[o-1-e]=p,p*=r[t.batchDims+o-1-e];let m=Dc(e,n[1],f,t.batchDims,r,s,d,u,o),h=t.batchDims+o;if(h>r.length)throw Error(`last dimension of indices must not be larger than rank of input tensor`);let g=a.slice(0,-1).concat(r.slice(h)),_=V.size(g),v=[{type:12,data:_},{type:12,data:c},...G(n[0].dims,m.dims,g)];e.compute({name:`GatherND`,shaderCache:{hint:t.cacheKey,inputDependencies:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:g,dataType:i}],dispatchGroup:{x:Math.ceil(_/64)},programUniforms:v}),getShaderSource:e=>{let t=X(`data`,n[0].dataType,n[0].dims.length),r=X(`slice_offsets`,12,m.dims.length),i=Z(`output`,n[0].dataType,g.length);return`
          ${e.registerUniform(`output_size`,`u32`).registerUniform(`slice_size`,`u32`).declareVariables(t,r,i)}
            ${e.mainStart()}
            ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`}},{inputs:[n[0],m]})},kc=e=>({batchDims:e.batch_dims,cacheKey:``})}),jc,Mc,Nc,Pc,Fc=N(()=>{z(),H(),W(),Q(),jc=(e,t)=>{if(e.length<3||e.length>4)throw Error(`GatherBlockQuantized requires 3 or 4 inputs.`);let n=V.normalizeAxis(t.quantizeAxis,e[0].dims.length),r=t.blockSize,i=e[0],a=e[2],o=e.length===4?e[3]:void 0;if(a.dims.length!==i.dims.length||!i.dims.map((e,t)=>t===n?Math.ceil(e/r)===a.dims[t]:e===a.dims[t]).reduce((e,t)=>e&&t,!0))throw Error(`Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.`);if(o){if(o.dataType!==i.dataType)throw Error(`Zero point must have the same data type as the input tensor.`);if(o.dims.length!==a.dims.length||!o.dims.map((e,t)=>e===a.dims[t]).reduce((e,t)=>e&&t,!0))throw Error(`Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.`)}},Mc=(e,t)=>{let n=e[0].dims,r=e[1].dims,i=n.length,a=V.normalizeAxis(t.gatherAxis,i),o=V.normalizeAxis(t.quantizeAxis,i),s=n.slice(0);s.splice(a,1,...r);let c=V.size(s),l=e[2].dataType,u=e[0].dataType===22,d=[{type:12,data:c},{type:12,data:o},{type:12,data:a},{type:12,data:t.blockSize},...G(...e.map((e,t)=>e.dims),s)];return{name:`GatherBlockQuantized`,shaderCache:{hint:`${t.cacheKey};${e.filter((e,t)=>t!==1).map(e=>e.dims.join(`_`)).join(`;`)}`,inputDependencies:Array.from({length:e.length},(e,t)=>`rank`)},getRunData:()=>({outputs:[{dims:s,dataType:l}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:d}),getShaderSource:t=>{let i=X(`data`,e[0].dataType,e[0].dims.length),o=X(`inputIndices`,e[1].dataType,e[1].dims.length),c=X(`scales`,e[2].dataType,e[2].dims.length),d=e.length>3?X(`zeroPoint`,e[3].dataType,e[3].dims.length):void 0,f=Z(`output`,l,s.length),p=[i,o,c];return d&&p.push(d),`
        ${t.registerUniforms([{name:`output_size`,type:`u32`},{name:`quantize_axis`,type:`u32`},{name:`gather_axis`,type:`u32`},{name:`block_size`,type:`u32`}]).declareVariables(...p,f)}
        ${t.mainStart()}
        let output_indices = ${f.offsetToIndices(`global_idx`)};
        var indices_indices = ${o.type.indices}(0);
        ${r.length>1?`
          for (var i: u32 = 0; i < ${r.length}; i++) {
            let index = ${f.indicesGet(`output_indices`,`uniforms.gather_axis + i`)};
            ${o.indicesSet(`indices_indices`,`i`,`index`)};
          }`:`indices_indices = ${f.indicesGet(`output_indices`,`uniforms.gather_axis`)};`};
        var data_indices = ${i.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${f.indicesGet(`output_indices`,`i`)};
          ${i.indicesSet(`data_indices`,`i`,`index`)};
        }
        var index_from_indices = ${o.getByIndices(`indices_indices`)};
        if (index_from_indices < 0) {
          index_from_indices += ${n[a]};
        }
        ${i.indicesSet(`data_indices`,`uniforms.gather_axis`,`u32(index_from_indices)`)};
        for (var i = uniforms.gather_axis + 1; i < ${s.length}; i++) {
          let index = ${f.indicesGet(`output_indices`,`i + ${r.length} - 1`)};
          ${i.indicesSet(`data_indices`,`i`,`index`)};
        }
        let data_offset = ${i.indicesToOffset(`data_indices`)};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${i.getByOffset(`data_offset / 8`)};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${u?`unpack4xI8`:`unpack4xU8`}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${c.indicesGet(`data_indices`,`uniforms.quantize_axis`)} / uniforms.block_size;
        ${c.indicesSet(`scale_indices`,`uniforms.quantize_axis`,`quantize_axis_index`)};
        var scale = ${c.getByIndices(`scale_indices`)};
        ${d?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${d.indicesToOffset(`zero_point_indices`)};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${d.getByOffset(`zero_point_offset / 8`)};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${u?`unpack4xI8`:`unpack4xU8`}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:`var zero_point = 0`};
        let dequantized_data = ${Cr(l)}(quantized_data - zero_point) * scale;
        ${f.setByOffset(`global_idx`,`dequantized_data`)};
    }`}}},Nc=(e,t)=>{let n=e.inputs;jc(n,t),e.compute(Mc(e.inputs,t))},Pc=e=>U({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})}),Ic,Lc,Rc,zc,Bc=N(()=>{z(),H(),W(),Q(),Ic=e=>{if(!e||e.length!==2)throw Error(`GatherElements requires 2 inputs.`);if(e[0].dims.length<1)throw Error(`GatherElements requires that the data input be rank >= 1.`);if(e[0].dims.length!==e[1].dims.length)throw Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},Lc=(e,t)=>{let n=e[0].dims,r=e[0].dataType,i=n.length,a=e[1].dims,o=e[1].dataType,s=V.normalizeAxis(t.axis,i),c=n[s],l=a.slice(0),u=V.size(l),d=X(`input`,r,i),f=X(`indicesInput`,o,a.length),p=Z(`output`,r,l.length),m=[{type:12,data:u},{type:6,data:c},{type:12,data:s}];return m.push(...G(n,a,l)),{name:`GatherElements`,shaderCache:{inputDependencies:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:l,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:m}),getShaderSource:e=>`
      ${e.registerUniform(`outputSize`,`u32`).registerUniform(`axisDimLimit`,`i32`).registerUniform(`axis`,`u32`).declareVariables(d,f,p)}
      ${e.mainStart()}
      ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}

      let outputIndices = ${p.offsetToIndices(`global_idx`)};

      var idx = ${f.getByOffset(`global_idx`)};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${d.type.indices}(outputIndices);
      ${d.indicesSet(`inputIndices`,`uniforms.axis`,`u32(idx)`)};
      let value = ${d.getByIndices(`inputIndices`)};

      ${p.setByOffset(`global_idx`,`value`)};
  }`}},Rc=e=>U({axis:e.axis}),zc=(e,t)=>{let n=e.inputs;Ic(n),e.compute(Lc(e.inputs,t))}}),Vc,Hc,Uc,Wc,Gc=N(()=>{z(),H(),Q(),Vc=e=>{if(!e)throw Error(`Input is missing`);if(e.length<2||e.length>3)throw Error(`Invaid input number.`);if(e.length===3&&e[2].dims.length>2)throw Error(`Invalid input shape of C`);if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw Error(`Input types are mismatched`)},Hc=(e,t)=>{let n=e[0].dims.slice(),r=e[1].dims.slice(),[i,a,o]=Vn.getShapeOfGemmResult(n,t.transA,r,t.transB,e.length===3?e[2].dims:void 0),s=[i,a];if(!s)throw Error(`Can't use gemm on the given tensors`);let c=Math.ceil(a/16),l=Math.ceil(i/16);V.size(s);let u=[{type:12,data:c},{type:12,data:i},{type:12,data:a},{type:12,data:o},{type:1,data:t.alpha},{type:1,data:t.beta}],d=[`type`,`type`];return e.length===3&&(u.push(...G(e[2].dims)),d.push(`rank`)),u.push(...G(s)),{name:`GemmShared`,shaderCache:{hint:`${t.cacheKey}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:s,dataType:e[0].dataType}],dispatchGroup:{x:c*l},programUniforms:u}),getShaderSource:n=>{let r=X(`a`,e[0].dataType,e[0].dims),i=X(`b`,e[1].dataType,e[1].dims),a=null,o=[r,i];e.length===3&&(a=X(`c`,e[2].dataType,e[2].dims.length),o.push(a));let c=Z(`output`,e[0].dataType,s.length);o.push(c);let l=[{name:`num_tile_n`,type:`u32`},{name:`M`,type:`u32`},{name:`N`,type:`u32`},{name:`K`,type:`u32`},{name:`alpha`,type:`f32`},{name:`beta`,type:`f32`}],u=``,d=``;t.transA&&t.transB?(d=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${r.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${i.type.value}(0);
      }
      `,u=`value += tile_a[k][local_id.y] * tile_b[local_id.x][k];`):t.transA&&!t.transB?(d=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${r.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${i.type.value}(0);
      }
      `,u=`value += tile_a[k][local_id.y] * tile_b[k][local_id.x];`):!t.transA&&t.transB?(d=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${r.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${i.type.value}(0);
      }
      `,u=`value += tile_a[local_id.y][k] * tile_b[local_id.x][k];`):!t.transA&&!t.transB&&(d=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${r.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${i.type.value}(0);
      }
      `,u=`value += tile_a[local_id.y][k] * tile_b[k][local_id.x];`);let f=t.alpha===1?``:`value *= uniforms.alpha;`;return`
  ${n.registerUniforms(l).declareVariables(...o)}
  var<workgroup> tile_a: array<array<${r.type.storage}, 16>, 16>;
  var<workgroup> tile_b: array<array<${i.type.storage}, 16>, 16>;
  ${n.mainStart([16,16,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * 16;
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * 16;
    let num_tiles = (uniforms.K - 1) / 16 + 1;
    var k_start = 0u;
    var value = ${c.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${d}
      k_start = k_start + 16;
      workgroupBarrier();

      for (var k: u32 = 0u; k < 16; k++) {
        ${u}
      }
      workgroupBarrier();
    }

    ${f}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${a==null?``:`let cOffset = ${a.broadcastedIndicesToOffset(`vec2(m, n)`,c)}; value += ${c.type.value}(uniforms.beta) * ${a.getByOffset(`cOffset`)};`}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`}}},Uc=e=>({transA:e.transA,transB:e.transB,alpha:e.alpha,beta:e.beta,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}),Wc=(e,t)=>{Vc(e.inputs),e.compute(Hc(e.inputs,t))}}),Kc,qc,Jc,Yc,Xc,Zc,Qc,$c,el,tl,nl,rl,il,al,ol=N(()=>{z(),H(),W(),Q(),[Kc,qc,Jc,Yc]=[0,1,2,3],Xc=e=>{if(e[0].dims.length!==4)throw Error(`only 4-D tensor is supported.`);if(e[0].dims.length!==e[1].dims.length)throw Error(`input dimensions must be equal to grid dimensions`);if(e[0].dims.length-2!==e[1].dims[e[1].dims.length-1])throw Error(`last dimension of grid must be equal to ${e[0].dims.length-2}`);if(e[0].dims[0]!==e[1].dims[0])throw Error(`grid batch size must match input batch size`)},Zc=`
  fn gs_get_cubic_coeffs(x: f32) -> vec4<f32> {
    let cubic_alpha = -0.75f;
    let x_abs = abs(x);
    var coeffs: vec4<f32>;
    coeffs[0] = (((cubic_alpha * (x_abs + 1) - 5 * cubic_alpha) * (x_abs + 1) + 8 * cubic_alpha) * (x_abs + 1) - 4 * cubic_alpha);
    coeffs[1] = (((cubic_alpha + 2) * x_abs - (cubic_alpha + 3)) * x_abs * x_abs + 1);
    coeffs[2] = (((cubic_alpha + 2) * (1 - x_abs) - (cubic_alpha + 3)) * (1 - x_abs) * (1 - x_abs) + 1);
    coeffs[3] = (((cubic_alpha * (2 - x_abs) - 5 * cubic_alpha) * (2 - x_abs) + 8 * cubic_alpha) * (2 - x_abs) - 4 * cubic_alpha);
    return coeffs;
  }
`,Qc=e=>`
  fn gs_bicubic_interpolate(p: mat4x4<${e}>, x: f32, y: f32) -> ${e} {
    var v: vec4<f32>;
    var coeffs = gs_get_cubic_coeffs(x);
    for (var i = 0; i < 4; i++) {
      v[i] = coeffs[0] * p[i][0] + coeffs[1] * p[i][1] + coeffs[2] * p[i][2] + coeffs[3] * p[i][3];
    }
    coeffs = gs_get_cubic_coeffs(y);
    let pixel = ${e}(coeffs[0] * v[0] + coeffs[1] * v[1] + coeffs[2] * v[2] + coeffs[3] * v[3]);
    return pixel;
  }
`,$c=e=>`
  fn gs_denormalize(n: f32, length: i32) -> f32 {
    ${e.alignCorners===0?`
    // alignCorners: false => [-1, 1] to [-0.5, length - 0.5]
    return ((n + 1.0) * f32(length) - 1.0) / 2.0;
    `:`
    // alignCorners: true => [-1, 1] to [0, length - 1]
    return (n + 1.0) / 2.0 * (f32(length - 1));
    `}
  }
`,el=e=>`
  ${e.paddingMode===`reflection`?`
      fn gs_reflect(x: i32, x_min: f32, x_max: f32) -> u32 {
        var dx = 0.0;
        var fx = f32(x);
        let range = x_max - x_min;
        if (fx < x_min) {
          dx = x_min - fx;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_min + r;
          } else {
            fx = x_max - r;
          }
        } else if (fx > x_max) {
          dx = fx - x_max;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_max - r;
          } else {
            fx = x_min + r;
          }
        }
        return u32(fx);
      }`:``}
`,tl=(e,t,n)=>`
  fn pixel_at_grid(r: i32, c: i32, H: i32, W: i32, batch: u32, channel: u32, border: vec4<f32>) -> ${t} {
     var pixel = ${t}(0);
     var indices = vec4<u32>(0);
     indices[${Kc}] = batch;
     indices[${qc}] = channel;`+(()=>{switch(n.paddingMode){case`zeros`:return`
          if (r >= 0 && r < H && c >=0 && c < W) {
            indices[${Jc}] = u32(r);
            indices[${Yc}] = u32(c);
          } else {
            return ${t}(0);
          }
        `;case`border`:return`
          indices[${Jc}] = u32(clamp(r, 0, H - 1));
          indices[${Yc}] = u32(clamp(c, 0, W - 1));
        `;case`reflection`:return`
          indices[${Jc}] = gs_reflect(r, border[1], border[3]);
          indices[${Yc}] = gs_reflect(c, border[0], border[2]);
        `;default:throw Error(`padding mode ${n.paddingMode} is not supported`)}})()+`
    return ${e.getByIndices(`indices`)};
  }
`,nl=(e,t,n)=>(()=>{switch(n.mode){case`nearest`:return`
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${Kc}], indices[${qc}], border);
        `;case`bilinear`:return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${Kc}], indices[${qc}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${Kc}], indices[${qc}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${Kc}], indices[${qc}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${Kc}], indices[${qc}], border);

          let dx2 = ${t}(f32(x2) - x);
          let dx1 = ${t}(x - f32(x1));
          let dy2 = ${t}(f32(y2) - y);
          let dy1 = ${t}(y - f32(y1));
          let result = dy2 * (dx2 * p11 + dx1 * p12) + dy1 * (dx2 * p21 + dx1 * p22);
        `;case`bicubic`:return`
          let x0 = i32(floor(x)) - 1;
          let y0 = i32(floor(y)) - 1;
          var p: mat4x4<${t}>;
          for (var h = 0; h < 4; h++) {
            for (var w = 0; w < 4; w++) {
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${Kc}], indices[${qc}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw Error(`mode ${n.mode} is not supported`)}})()+`${e.setByOffset(`global_idx`,`result`)}`,rl=(e,t)=>{let n=X(`x`,e[0].dataType,e[0].dims.length),r=[e[1].dims[0],e[1].dims[1],e[1].dims[2]],i=X(`grid`,e[1].dataType,r.length,2),a=[e[0].dims[0],e[0].dims[1],e[1].dims[1],e[1].dims[2]];t.format===`NHWC`&&(a=[e[0].dims[0],e[1].dims[1],e[1].dims[2],e[0].dims[3]],[Kc,qc,Jc,Yc]=[0,3,1,2]);let o=Z(`output`,e[0].dataType,a.length),s=n.type.value,c=[{type:12,data:V.size(a)},...G(e[0].dims,r,a)];return{name:`GridSample`,shaderCache:{hint:`${t.cacheKey}`,inputDependencies:[`type`,`type`]},getRunData:e=>{let t=V.size(a);return{outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(t/64)},programUniforms:c}},getShaderSource:e=>`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(n,i,o)}
  ${Zc}
  ${Qc(s)}
  ${$c(t)}
  ${el(t)}
  ${tl(n,s,t)}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
      let H_in = i32(uniforms.x_shape[${Jc}]);
      let W_in = i32(uniforms.x_shape[${Yc}]);

      ${t.alignCorners===0?`
      let x_min = -0.5;
      let x_max = f32(W_in) - 0.5;
      let y_min = -0.5;
      let y_max = f32(H_in) - 0.5;
      `:`
      let x_min = 0.0;
      let x_max = f32(W_in) - 1.0;
      let y_min = 0.0;
      let y_max = f32(H_in) - 1.0;
      `};
      let border = vec4<f32>(x_min, y_min, x_max, y_max);

      let indices = ${o.offsetToIndices(`global_idx`)};
      var grid_indices = vec3<u32>(indices[${Kc}], indices[${Jc}], indices[${Yc}]);
      let nxy = ${i.getByIndices(`grid_indices`)};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${nl(o,s,t)}
  }`}},il=(e,t)=>{Xc(e.inputs),e.compute(rl(e.inputs,t))},al=e=>U({alignCorners:e.align_corners,mode:e.mode,paddingMode:e.padding_mode,format:e.format})}),sl,cl,ll,ul,dl,fl,pl,ml=N(()=>{z(),H(),W(),cr(),Ji(),Q(),zr(),sl=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,cl=(e,t)=>{let n=e[0],r=sl(e,1),i=sl(e,2),a=sl(e,3),o=sl(e,4),s=sl(e,5),c=sl(e,6),l=sl(e,7);if(n.dims.length!==3&&n.dims.length!==5)throw Error(`Input query is expected to have 3 or 5 dimensions`);let u=n.dims[0],d=n.dims[1],f=n.dims.length===3?n.dims[2]:t.numHeads*n.dims[4],p=d,m=0,h=0,g=Math.floor(f/t.numHeads);if(c&&l&&V.size(c.dims)&&V.size(l.dims)){if(c.dims.length!==4)throw Error(`Input "past_key" is expected to have 4 dimensions`);if(c.dims[0]!==u||c.dims[1]!==t.numHeads||c.dims[3]!==g)throw Error(`Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)`);if(l.dims[0]!==u||l.dims[1]!==t.numHeads||l.dims[3]!==g)throw Error(`Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)`);if(c.dims[2]!==l.dims[2])throw Error(`Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)`);if(l.dims.length!==4)throw Error(`Input "past_value" is expected to have 4 dimensions`);m=c.dims[2],h=c.dims[2]}else if(c&&V.size(c.dims)||l&&V.size(l.dims))throw Error(`Input "past_key" and "past_value" shall be both present or both absent`);let _;if(r&&V.size(r.dims)>0){if(n.dims.length!==3)throw Error(`Input "query" is expected to have 3 dimensions when key is given`);if(r.dims.length<3||r.dims.length>5)throw Error(`Input "key" is expected to have 3, 4, or 5 dimensions`);if(n.dims[0]!==r.dims[0])throw Error(`Input "query" and "key" shall have same dim 0 (batch size)`);if(r.dims.length===3){if(r.dims[2]!==n.dims[2])throw Error(`Input "query" and "key" shall have same dim 2 (hidden_size)`);_=2,p=r.dims[1]}else if(r.dims.length===5){if(r.dims[2]!==t.numHeads||r.dims[3]!==2||r.dims[4]!==g)throw Error(`Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv`);if(i)throw Error(`Expect "value" be none when "key" has packed kv format.`);_=5,p=r.dims[1]}else{if(r.dims[1]!==t.numHeads||r.dims[3]!==g)throw Error(`Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key`);_=0,p=r.dims[2]}}else{if(n.dims.length!==5)throw Error(`Input "query" is expected to have 5 dimensions when key is empty`);if(n.dims[2]!==t.numHeads||n.dims[3]!==3)throw Error(`Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv`);_=3}if(a&&V.size(a.dims)>0){if(a.dims.length!==1)throw Error(`Input "bias" is expected to have 1 dimension`);if(r&&r.dims.length===5&&r.dims[3]===2)throw Error(`bias is not allowed for packed kv.`)}let v=m+p,y=0;if(o&&V.size(o.dims)>0){y=8;let e=o.dims;throw e.length===1?e[0]===u?y=1:e[0]===3*u+2&&(y=3):e.length===2&&e[0]===u&&e[1]===v&&(y=5),Error(y===8?`Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)`:`Mask not supported`)}let b=!1,x=f;if(i&&V.size(i.dims)>0){if(i.dims.length!==3&&i.dims.length!==4)throw Error(`Input "value" is expected to have 3 or 4 dimensions`);if(n.dims[0]!==i.dims[0])throw Error(`Input "query" and "value" shall have same dim 0 (batch_size)`);if(i.dims.length===3){if(p!==i.dims[1])throw Error(`Input "key" and "value" shall have the same dim 1 (kv_sequence_length)`);x=i.dims[2]}else{if(p!==i.dims[2])throw Error(`Input "key" and "value" shall have the same dim 2 (kv_sequence_length)`);x=i.dims[1]*i.dims[3],b=!0}}if(o&&V.size(o.dims)>0)throw Error(`Key padding mask is not supported`);if(s&&V.size(s.dims)>0){if(s.dims.length!==4)throw Error(`Input "attention_bias" is expected to have 4 dimensions`);if(s.dims[0]!==u||s.dims[1]!==t.numHeads||s.dims[2]!==d||s.dims[3]!==v)throw Error(`Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)`)}return{batchSize:u,sequenceLength:d,pastSequenceLength:m,kvSequenceLength:p,totalSequenceLength:v,maxSequenceLength:h,inputHiddenSize:0,hiddenSize:f,vHiddenSize:x,headSize:g,vHeadSize:Math.floor(x/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:y,scale:t.scale,broadcastResPosBias:!1,passPastInKv:b,qkvFormat:_}},ll=e=>U({...e}),ul=U({perm:[0,2,1,3]}),dl=(e,t,n,r,i,a,o)=>{let s=[r,i,a],c=V.size(s),l=[{type:12,data:c},{type:12,data:o},{type:12,data:a}];return e.compute({name:`MultiHeadAttentionAddBias`,shaderCache:{inputDependencies:[`type`,`type`]},getRunData:()=>({outputs:[{dims:s,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(c/64)},programUniforms:l}),getShaderSource:e=>{let r=Z(`qkv_with_bias`,t.dataType,s),i=X(`qkv`,t.dataType,s),a=X(`bias`,n.dataType,s);return`
  ${e.registerUniforms([{name:`output_size`,type:`u32`},{name:`bias_offset`,type:`u32`},{name:`hidden_size`,type:`u32`}]).declareVariables(i,a,r)}
  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`}},{inputs:[t,n],outputs:[-1]})[0]},fl=(e,t,n,r,i,a,o,s)=>{let c=a;if(o&&V.size(o.dims)>0){if(r===1)throw Error(`AddBiasReshape is not implemented. Please export your model with packed QKV or KV`);return c=dl(e,a,o,t,r,n*i,s),c=c.reshape([t,r,n,i]),n===1||r===1?c:e.compute(Ir(c,ul.perm),{inputs:[c],outputs:[-1]})[0]}return a.dims.length===3&&(c=a.reshape([t,r,n,i])),n===1||r===1?c:e.compute(Ir(c,ul.perm),{inputs:[c],outputs:[-1]})[0]},pl=(e,t)=>{let n=cl(e.inputs,t),r=e.inputs[0],i=sl(e.inputs,1),a=sl(e.inputs,2),o=sl(e.inputs,3),s=sl(e.inputs,4),c=sl(e.inputs,5),l=sl(e.inputs,6),u=sl(e.inputs,7);if(r.dims.length===5)throw Error(`Packed QKV is not implemented`);if(i?.dims.length===5)throw Error(`Packed KV is not implemented`);let d=i&&a&&i.dims.length===4&&a.dims.length===4,f=fl(e,n.batchSize,n.numHeads,n.sequenceLength,n.headSize,r,o,0);if(d)return Gi(e,f,i,a,s,void 0,l,u,c,n);if(!i||!a)throw Error(`key and value must be provided`);let p=fl(e,n.batchSize,n.numHeads,n.kvSequenceLength,n.headSize,i,o,n.hiddenSize),m=fl(e,n.batchSize,n.numHeads,n.kvSequenceLength,n.vHeadSize,a,o,2*n.hiddenSize);Gi(e,f,p,m,s,void 0,l,u,c,n)}}),hl,gl,_l,vl,yl,bl,xl,Sl=N(()=>{z(),H(),W(),Q(),hl=e=>{if(!e||e.length<1)throw Error(`too few inputs`)},gl=(e,t)=>{let n=[],r=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(e=>n.push(Number(e))),r=n.length),U({numOutputs:r,axis:t.axis,splitSizes:n})},_l=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${J(`uniforms.size_in_split_axis`,`i`,e)}) {
        return i;
    }
    }
    return ${e}u;
}`,vl=e=>{let t=e.length,n=[];for(let r=0;r<t;++r){let i=e[r].setByIndices(`indices`,`input[global_idx]`);t===1?n.push(i):r===0?n.push(`if (output_number == ${r}u) { ${i} }`):r===t-1?n.push(`else { ${i} }`):n.push(`else if (output_number == ${r}) { ${i} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${n.join(`
`)}
      }`},yl=(e,t)=>{let n=e[0].dims,r=V.size(n),i=e[0].dataType,a=V.normalizeAxis(t.axis,n.length),o=Array(t.numOutputs),s=X(`input`,i,n.length),c=Array(t.numOutputs),l=[],u=[],d=0,f=[{type:12,data:r}];for(let r=0;r<t.numOutputs;r++){d+=t.splitSizes[r],c[r]=d;let s=n.slice();s[a]=t.splitSizes[r],u.push(s),o[r]=Z(`output${r}`,i,s.length),l.push({dims:u[r],dataType:e[0].dataType})}return f.push({type:12,data:c},...G(n,...u)),{name:`Split`,shaderCache:{hint:t.cacheKey,inputDependencies:[`rank`]},getShaderSource:e=>`
  ${e.registerUniform(`input_size`,`u32`).registerUniform(`size_in_split_axis`,`u32`,c.length).declareVariables(s,...o)}
  ${_l(c.length)}
  ${vl(o)}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.input_size`)}

    var indices = ${s.offsetToIndices(`global_idx`)};
    var index = ${s.indicesGet(`indices`,a)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${J(`uniforms.size_in_split_axis`,`output_number - 1u`,c.length)};
      ${s.indicesSet(`indices`,a,`index`)};
    }
    writeBufferData(output_number, indices, global_idx);
  }`,getRunData:()=>({outputs:l,dispatchGroup:{x:Math.ceil(r/64)},programUniforms:f})}},bl=(e,t)=>{hl(e.inputs);let n=e.inputs.length===1?t:gl(e.inputs,t);e.compute(yl(e.inputs,n),{inputs:[0]})},xl=e=>{let t=e.axis,n=e.splitSizes,r=e.numOutputs<0?n.length:e.numOutputs;if(r!==n.length)throw Error(`numOutputs and splitSizes length must be equal`);return U({axis:t,numOutputs:r,splitSizes:n})}}),Cl,wl,Tl,El=N(()=>{z(),H(),W(),Q(),Cl=(e,t)=>{let[n,r,i,a]=e,{numHeads:o,rotaryEmbeddingDim:s}=t;if(n.dims.length!==3&&n.dims.length!==4)throw Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${n.dims.length}`);if(!V.areEqual(r.dims,[])&&!V.areEqual(r.dims,[1])&&r.dims.length!==2)throw Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${r.dims.length}`);if(i.dims.length!==2)throw Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${i.dims.length}`);if(a.dims.length!==2)throw Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${a.dims.length}`);if(!V.areEqual(i.dims,a.dims))throw Error(`Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape`);if(s>0&&o===0)throw Error(`num_heads must be provided if rotary_embedding_dim is specified`);let c=n.dims[0],l=n.dims[n.dims.length-2],u=i.dims[0],d=V.sizeFromDimension(n.dims,1)/l,f=s===0?i.dims[1]*2:d/o;if(s>f)throw Error(`rotary_embedding_dim must be less than or equal to head_size`);if(r.dims.length===2){if(c!==r.dims[0])throw Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${r.dims[0]}`);if(l!==r.dims[1])throw Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${r.dims[1]}`)}if(l>u)throw Error(`Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported`);if(f/2!==i.dims[1]&&s/2!==i.dims[1])throw Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${i.dims[1]}`)},wl=(e,t)=>{let{interleaved:n,numHeads:r,rotaryEmbeddingDim:i,scale:a}=t,o=e[0].dims[0],s=V.sizeFromDimension(e[0].dims,1),c=e[0].dims[e[0].dims.length-2],l=s/c,u=e[2].dims[1],d=i===0?u*2:l/r,f=[o,c,l/d,d-u],p=V.computeStrides(f),m=[{type:1,data:a},{type:12,data:f},{type:12,data:p},...e[0].dims.length===3?Array({type:12,data:[s,l,d,1]}):[],...e[0].dims.length===4?Array({type:12,data:[s,d,c*d,1]}):[],...G(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)];return{name:`RotaryEmbedding`,shaderCache:{hint:U({interleaved:n}).cacheKey,inputDependencies:[`rank`,`rank`,`rank`,`rank`]},getShaderSource:t=>{let r=X(`input`,e[0].dataType,e[0].dims.length),i=X(`position_ids`,e[1].dataType,e[1].dims.length),a=X(`cos_cache`,e[2].dataType,e[2].dims.length),o=X(`sin_cache`,e[3].dataType,e[3].dims.length),s=Z(`output`,e[0].dataType,e[0].dims.length);return t.registerUniforms([{name:`scale`,type:`f32`},{name:`global_shape`,type:`u32`,length:f.length},{name:`global_strides`,type:`u32`,length:p.length},{name:`input_output_strides`,type:`u32`,length:p.length}]),`
        ${t.declareVariables(r,i,a,o,s)}

        ${t.mainStart(br)}
          let half_rotary_emb_dim = uniforms.${a.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${t.guardAgainstOutOfBoundsWorkgroupSizes(`size`)}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${i.broadcastedIndicesToOffset(`bsnh.xy`,Z(``,i.type.tensor,2))};
            let position_id =
                u32(${i.getByOffset(`position_ids_idx`)}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${n});
            let j = i + select(half_rotary_emb_dim, 1, ${n});
            let re = ${r.getByOffset(`i`)} * ${a.get(`position_id`,`bsnh[3]`)} -
                ${r.getByOffset(`j`)} * ${o.get(`position_id`,`bsnh[3]`)};
            ${s.setByOffset(`i`,`re`)}
            let im = ${r.getByOffset(`i`)} * ${o.get(`position_id`,`bsnh[3]`)} +
                ${r.getByOffset(`j`)} * ${a.get(`position_id`,`bsnh[3]`)};
            ${s.setByOffset(`j`,`im`)}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${s.setByOffset(`k`,r.getByOffset(`k`))}
          }
        }`},getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(V.size(f)/br)},programUniforms:m})}},Tl=(e,t)=>{Cl(e.inputs,t),e.compute(wl(e.inputs,t))}}),Dl,Ol,kl,Al,jl,Ml=N(()=>{W(),z(),Ji(),ml(),Sl(),zr(),El(),Q(),Dl=(e,t)=>{if(t.doRotary&&e.length<=7)throw Error(`cos_cache and sin_cache inputs are required if do_rotary is specified`);let n=e[0],r=e[1],i=e[2],a=e[3],o=e[4];if(t.doRotary!==0&&e.length<=7)throw Error(`cos_cast and sin_cache are expected if do_rotary attribute is non-zero`);if(t.localWindowSize!==-1)throw Error(`Local attention is not supported`);if(t.softcap!==0)throw Error(`Softcap is not supported`);if(t.rotaryInterleaved!==0)throw Error(`Rotary interleaved is not supported`);if(t.smoothSoftmax)throw Error(`Smooth softmax is not supported`);if(n.dims.length!==3&&n.dims.length!==5)throw Error(`Input query is expected to have 3 or 5 dimensions`);let s=n.dims[0],c=n.dims[1],l=n.dims.length===3?n.dims[2]:t.numHeads*n.dims[4],u=c,d=0,f=!r||r.dims.length===0,p=Math.floor(f?l/(t.numHeads+2*t.kvNumHeads):l/t.numHeads);f&&(l=p*t.numHeads);let m=a&&a.dims.length!==0,h=o&&o.dims.length!==0;if(m&&a.dims.length===4&&a.dims[0]===s&&a.dims[1]!==t.kvNumHeads&&a.dims[2]===t.kvNumHeads&&a.dims[3]===p)throw Error(`BSNH pastKey/pastValue is not supported`);if(m&&h){if(a.dims.length!==4)throw Error(`Input "past_key" is expected to have 4 dimensions`);if(o.dims.length!==4)throw Error(`Input "past_value" is expected to have 4 dimensions`);d=a.dims[2]}else if(m||h)throw Error(`Input "past_key" and "past_value" shall be both present or both absent`);let g=1;if(r&&r.dims.length>0){if(n.dims.length!==3)throw Error(`Input "query" is expected to have 3 dimensions when key is given`);if(r.dims.length<3||r.dims.length>5)throw Error(`Input "key" is expected to have 3, 4, or 5 dimensions`);if(n.dims[0]!==r.dims[0])throw Error(`Input "query" and "key" shall have same dim 0 (batch size)`);if(r.dims.length===3){if(n.dims[2]%r.dims[2]!==0)throw Error(`Dimension 2 of "query" should be a multiple of "key"`);u=r.dims[1]}else if(r.dims.length===5){if(r.dims[2]!==t.numHeads||r.dims[3]!==2||r.dims[4]!==p)throw Error(`Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv`);if(i)throw Error(`Expect "value" be none when "key" has packed kv format.`);u=r.dims[1]}else{if(r.dims[1]!==t.numHeads||r.dims[3]!==p)throw Error(`Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key`);u=r.dims[2]}}else{if(n.dims.length!==3&&n.dims.length!==5)throw Error(`Input "query" is expected to have 3 or 5 dimensions when key is empty`);if(n.dims.length===5&&(n.dims[2]!==t.numHeads||n.dims[3]!==3))throw Error(`Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv`);g=3}let _=!1,v=t.kvNumHeads?p*t.kvNumHeads:l;if(i&&i.dims.length>0){if(i.dims.length!==3&&i.dims.length!==4)throw Error(`Input "value" is expected to have 3 or 4 dimensions`);if(n.dims[0]!==i.dims[0])throw Error(`Input "query" and "value" shall have same dim 0 (batch_size)`);if(i.dims.length===3){if(u!==i.dims[1])throw Error(`Input "key" and "value" shall have the same dim 1 (kv_sequence_length)`);v=i.dims[2]}else{if(u!==i.dims[2])throw Error(`Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)`);v=i.dims[1]*i.dims[3],_=!0}}let y=e.length>4?e[5]:void 0;if(y){if(y.dims.length===0)throw Error(`seqlens_k must be at least 1D, got scalar.`);let e=y.dims.reduce((e,t)=>e*t,1);if(e!==s)throw Error(`seqlens_k must have batch_size (${s}) elements, got ${e}.`);for(let e=0;e<y.dims.length;e++)if(y.dims[e]!==1&&y.dims[e]!==s)throw Error(`seqlens_k has unexpected shape. Each dimension must be 1 or batch_size (${s}), got dims[${e}] = ${y.dims[e]}.`)}return{batchSize:s,sequenceLength:c,pastSequenceLength:d,kvSequenceLength:u,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:l,vHiddenSize:v,headSize:p,vHeadSize:Math.floor(v/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:0,scale:t.scale,broadcastResPosBias:!1,passPastInKv:_,qkvFormat:g}},Ol=U({perm:[0,2,1,3]}),kl=(e,t,n)=>{let r=t,i=n.kvNumHeads;return t.dims.length===3&&n.kvSequenceLength!==0&&(r=t.reshape([n.batchSize,n.kvSequenceLength,i,n.headSize]),r=e.compute(Ir(r,Ol.perm),{inputs:[r],outputs:[-1]})[0]),r},Al=(e,t,n,r)=>{let i=[`type`,`type`],a=[e*t],o=e*t,s=[{type:12,data:o},{type:12,data:t},{type:12,data:e}];return{name:`GeneratePositionIds`,shaderCache:{hint:`${e};${t}`,inputDependencies:i},getRunData:()=>({outputs:[{dims:a,dataType:7}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:s}),getShaderSource:e=>{let t=X(`seq_lens`,n.dataType,n.dims),i=X(`total_seq_lens`,r.dataType,r.dims),o=Z(`pos_ids`,7,a);return`
  ${e.registerUniforms([{name:`output_size`,type:`u32`},{name:`sequence_length`,type:`u32`},{name:`batch_size`,type:`u32`}]).declareVariables(t,i,o)}
  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
    let total_sequence_length = u32(${i.getByOffset(`0`)});
    let is_subsequent_prompt = uniforms.sequence_length > 1 && uniforms.sequence_length != total_sequence_length;
    let is_first_prompt = !is_subsequent_prompt && uniforms.sequence_length == total_sequence_length;
    let batch_idx = global_idx / uniforms.sequence_length;
    let sequence_idx = i32(global_idx % uniforms.sequence_length);
    var pos_id: i32 = 0;
    let seqlen = ${t.getByOffset(`batch_idx`)};
    let total_seqlen = seqlen + 1;
    if (is_first_prompt) {
      if (sequence_idx < total_seqlen) {
        pos_id = sequence_idx;
      } else {
        pos_id = 1;
      }
      ${o.setByOffset(`global_idx`,`pos_id`)}
    } else if (is_subsequent_prompt) {
      let past_seqlen = total_seqlen - i32(uniforms.sequence_length);
      if (past_seqlen + sequence_idx < total_seqlen) {
        pos_id = past_seqlen + sequence_idx;
      } else {
        pos_id = 1;
      }
      ${o.setByOffset(`global_idx`,`pos_id`)}
    } else if (global_idx < uniforms.batch_size) {
      ${o.setByOffset(`global_idx`,`seqlen`)}
    };
  }
  `}}},jl=(e,t)=>{if(e.inputs.length>14&&e.inputs[14]||e.inputs.length>15&&e.inputs[15])throw Error(`GroupQueryAttention (JSEP): q_norm_weight / k_norm_weight inputs are not supported. The per-head Q/K RMS normalization prologue is implemented only on the CUDA and native WebGPU EPs.`);let n=Dl(e.inputs,t);if(e.inputs[0].dims.length===5)throw Error(`Packed QKV is not implemented`);if(e.inputs[1]?.dims.length===5)throw Error(`Packed KV is not implemented`);let r=e.inputs[0],i=e.inputs[1]&&e.inputs[1].dims.length>0?e.inputs[1]:void 0,a=e.inputs[2]&&e.inputs[2].dims.length>0?e.inputs[2]:void 0,o=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,s=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,c=e.inputs.length>4?e.inputs[5]:void 0,l=e.inputs.length>5?e.inputs[6]:void 0,u=n.kvNumHeads?n.kvNumHeads:n.numHeads,d=U({axis:2,numOutputs:3,splitSizes:[n.numHeads*n.headSize,u*n.headSize,u*n.headSize]}),[f,p,m]=!i&&!a?e.compute(yl([r],d),{inputs:[r],outputs:[-1,-1,-1]}):[r,i,a],h,g;if(t.doRotary){let r=e.compute(Al(n.batchSize,n.sequenceLength,c,l),{inputs:[c,l],outputs:[-1]})[0],i=e.inputs[7],a=e.inputs[8],o=U({interleaved:t.rotaryInterleaved!==0,numHeads:n.numHeads,rotaryEmbeddingDim:0,scale:t.scale}),s=[f,r,i,a],u=[-1];h=e.compute(wl(s,o),{inputs:s,outputs:u})[0],s.splice(0,1,p);let d=U({interleaved:t.rotaryInterleaved!==0,numHeads:n.kvNumHeads,rotaryEmbeddingDim:0,scale:t.scale});g=e.compute(wl(s,d),{inputs:s,outputs:u})[0]}let _=fl(e,n.batchSize,n.numHeads,n.sequenceLength,n.headSize,t.doRotary?h:f,void 0,0),v=kl(e,t.doRotary?g:p,n),y=kl(e,m,n);Gi(e,_,v,y,void 0,void 0,o,s,void 0,n,c,l)}}),Nl,Pl,Fl,Il,Ll=N(()=>{z(),H(),zr(),Q(),Nl=(e,t,n,r,i,a,o,s)=>{let c=K(a),l=c===1?`f32`:`vec${c}f`,u=c===1?`vec2f`:`mat2x${c}f`,d=i*o,f=64;d===1&&(f=256);let p=[i,o,a/c],m=[i,o,2],h=[`rank`,`type`,`type`],g=[];return g.push(...G(p,m)),e.compute({name:`InstanceNormComputeChannelScaleShift`,shaderCache:{hint:`${c};${s};${f}`,inputDependencies:h},getRunData:()=>({outputs:[{dims:m,dataType:1}],dispatchGroup:{x:d},programUniforms:g}),getShaderSource:e=>{let i=X(`x`,t.dataType,3,c),a=[i,X(`scale`,n.dataType,n.dims),X(`bias`,r.dataType,r.dims),Z(`output`,1,3,2)];return`
  var<workgroup> workgroup_shared : array<${u}, ${f}>;
  const workgroup_size = ${f}u;
  ${e.declareVariables(...a)}
  ${e.mainStart(f)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${l}(0);
    var squared_sum = ${l}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${l}(${i.get(`batch`,`channel`,`h`)});
      sum += value;
      squared_sum += value * value;
    }
    workgroup_shared[local_idx] = ${u}(sum, squared_sum);
    workgroupBarrier();

    for (var currSize = workgroup_size >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (local_idx < currSize) {
        workgroup_shared[local_idx] = workgroup_shared[local_idx] + workgroup_shared[local_idx + currSize];
      }
      workgroupBarrier();
    }
    if (local_idx == 0) {
      let sum_final = ${Tr(`workgroup_shared[0][0]`,c)} / f32(hight * ${c});
      let squared_sum_final = ${Tr(`workgroup_shared[0][1]`,c)} / f32(hight * ${c});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${s}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`}},{inputs:[t,n,r],outputs:[-1]})[0]},Pl=(e,t,n)=>{let r=t[0].dims,i=r,a=r[0],o=r[1],s=V.sizeFromDimension(r,2),c=K(s),l=V.size(i)/c,u=Nl(e,t[0],t[1],t[2],a,s,o,n.epsilon),d=[a,o,s/c],f=[a,o];e.compute({name:`InstanceNormalization`,shaderCache:{hint:`${c}`,inputDependencies:[`type`,`none`]},getRunData:()=>({outputs:[{dims:i,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:[{type:12,data:l},...G(d,f,d)]}),getShaderSource:e=>{let n=X(`x`,t[0].dataType,d.length,c),r=X(`scale_shift`,1,f.length,2),i=Z(`output`,t[0].dataType,d.length,c),a=[n,r,i];return`
  ${e.registerUniform(`output_size`,`u32`).declareVariables(...a)}
  ${e.mainStart()}
  ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
      let outputIndices = ${i.offsetToIndices(`global_idx`)};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${r.getByIndices(`vec2<u32>(batch, channel)`)};
      let value = ${n.getByOffset(`global_idx`)} * ${i.type.value}(scale_shift.x) + ${i.type.value}(scale_shift.y);
      ${i.setByOffset(`global_idx`,`value`)};
  }`}},{inputs:[t[0],u]})},Fl=(e,t,n)=>{let r=t[0].dims,i=r,a=r[0],o=r[r.length-1],s=V.sizeFromDimension(r,1)/o,c=K(o),l=V.size(i)/c,u=[{type:12,data:s},{type:12,data:Math.floor(o/c)}],d=[`type`,`type`],f=!1,p=[0,r.length-1];for(let e=0;e<r.length-2;e++)f||=r[e+1]!==1,p.push(e+1);f&&=r[r.length-1]!==1;let m=f?e.compute(Ir(e.inputs[0],p),{inputs:[e.inputs[0]],outputs:[-1]})[0]:e.inputs[0].reshape(Array.from({length:r.length},(e,t)=>r[p[t]])),h=Nl(e,m,t[1],t[2],a,s,o,n.epsilon);e.compute({name:`InstanceNormalizationNHWC`,shaderCache:{hint:`${c}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:i,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:u}),getShaderSource:e=>{let n=Sr(t[0].dataType),r=c===1?`vec2f`:`mat${c}x2f`,a=e=>{let t=e===0?`x`:`y`,r=c===1?`f32`:`vec${c}f`;switch(c){case 1:return`${n}(${r}(scale.${t}))`;case 2:return`vec2<${n}>(${r}(scale[0].${t}, scale[1].${t}))`;case 4:return`vec4<${n}>(${r}(scale[0].${t}, scale[1].${t}, scale[2].${t}, scale[3].${t}))`;default:throw Error(`Not supported compoents ${c}`)}},o=X(`input`,t[0].dataType,t[0].dims,c),s=Z(`output`,t[0].dataType,i,c);return`
  @group(0) @binding(0) var<storage, read> input : array<${o.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${r}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${s.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${e.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${a(0)}, ${a(1)});
  }`}},{inputs:[t[0],h]})},Il=(e,t)=>{t.format===`NHWC`?Fl(e,e.inputs,t):Pl(e,e.inputs,t)}}),Rl,zl,Bl,Vl=N(()=>{z(),H(),Q(),Rl=e=>{if(!e||e.length<2)throw Error(`layerNorm requires at least 2 inputs.`)},zl=(e,t,n)=>{let r=t.simplified,i=e[0].dims,a=e[1],o=!r&&e[2],s=i,c=V.normalizeAxis(t.axis,i.length),l=V.sizeToDimension(i,c),u=V.sizeFromDimension(i,c),d=V.size(a.dims),f=o?V.size(o.dims):0;if(d!==u||o&&f!==u)throw Error(`Size of X.shape()[axis:] == ${u}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${d} and bias size of ${f}`);let p=[];for(let e=0;e<i.length;++e)e<c?p.push(i[e]):p.push(1);let m=K(u),h=[`type`,`type`],g=[{type:12,data:l},{type:1,data:u},{type:12,data:Math.floor(u/m)},{type:1,data:t.epsilon}];o&&h.push(`type`);let _=n>1,v=n>2,y=t=>{let n=Sr(e[0].dataType),i=[X(`x`,e[0].dataType,e[0].dims,m),X(`scale`,a.dataType,a.dims,m)];return o&&i.push(X(`bias`,o.dataType,o.dims,m)),i.push(Z(`output`,e[0].dataType,s,m)),_&&i.push(Z(`mean_data_output`,1,p)),v&&i.push(Z(`inv_std_output`,1,p)),`
  ${t.registerUniforms([{name:`norm_count`,type:`u32`},{name:`norm_size`,type:`f32`},{name:`norm_size_vectorized`,type:`u32`},{name:`epsilon`,type:`f32`}]).declareVariables(...i)}
  ${t.mainStart()}
    ${t.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.norm_count`)}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${wr(`f32`,m)};
    var mean_square_vector = ${wr(`f32`,m)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${q(n,m,`x[h + offset]`)};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${Tr(`mean_vector`,m)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${Tr(`mean_square_vector`,m)} / uniforms.norm_size ${r?``:`- mean * mean`} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${q(n,m,`x[j + offset]`)};
      let f32scale = ${q(n,m,`scale[j]`)};
      output[j + offset] = ${i[0].type.value}((f32input ${r?``:`- mean`}) * inv_std_dev * f32scale
        ${o?`+ ${q(n,m,`bias[j]`)}`:``}
      );
    }

    ${_?`mean_data_output[global_idx] = mean`:``};
    ${v?`inv_std_output[global_idx] = inv_std_dev`:``};
  }`},b=[{dims:s,dataType:e[0].dataType}];return _&&b.push({dims:p,dataType:1}),v&&b.push({dims:p,dataType:1}),{name:`LayerNormalization`,shaderCache:{hint:`${m};${n};${r}`,inputDependencies:h},getRunData:()=>({outputs:b,dispatchGroup:{x:Math.ceil(l/64)},programUniforms:g}),getShaderSource:y}},Bl=(e,t)=>{Rl(e.inputs),e.compute(zl(e.inputs,t,e.outputCount))}}),Hl,Ul,Wl=N(()=>{H(),Po(),Uo(),Hl=e=>{if(!e||e.length!==2)throw Error(`MatMul requires 2 inputs.`);if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw Error(`shared dimension does not match.`)},Ul=e=>{Hl(e.inputs);let t=zn.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw Error(`Can't use matmul on the given tensors`);let n=t[t.length-1],r=e.inputs[0].dims[e.inputs[0].dims.length-1];if(n<8&&r<8)e.compute(No(e.inputs,{activation:``},t));else{let i=t[t.length-2],a=V.size(e.inputs[0].dims.slice(0,-2)),o=V.size(e.inputs[1].dims.slice(0,-2));if(a!==1&&i===1&&o===1){let i=e.inputs[0].reshape([1,a,r]),o=e.inputs[1].reshape([1,r,n]),s=[1,a,n],c=[i,o];e.compute(Ho(c,{activation:``},t,s),{inputs:c})}else e.compute(Ho(e.inputs,{activation:``},t))}}}),Gl,Kl,ql,Jl,Yl,Xl=N(()=>{z(),H(),W(),Q(),Gl=(e,t)=>{if(e.length<3||e.length>4)throw Error(`MatMulNBits requires 3 or 4 inputs`);let n=e[0],r=n.dims.length;if(n.dims[r-1]!==t.k)throw Error(`The last dim of input shape does not match the k value`);let i=Math.floor((t.k+t.blockSize-1)/t.blockSize),a=t.blockSize/8*t.bits,o=e[1];if(!V.areEqual(o.dims,[t.n,i,a]))throw Error(`The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize`);let s=e[2].dims;if(V.size(s)!==t.n*i)throw Error(`scales input size error.`);if(e.length===4){let n=e[3].dims,r=t.n*(t.bits===8?i:Math.floor((i*t.bits+7)/8));if(V.size(n)!==r)throw Error(`zeroPoints input size error.`)}},Kl=(e,t)=>{let n=e[0].dims,r=n.length,i=n[r-2],a=t.k,o=t.n,s=n.slice(0,r-2),c=V.size(s),l=e[1].dims[2]/4,u=e[0].dataType,d=K(t.k),f=K(l),p=K(o),m=s.concat([i,o]),h=i>1&&o/p%2==0?2:1,g=V.size(m)/p/h,_=[],v=[c,i,a/d],y=V.convertShape(e[1].dims).slice();y.splice(-1,1,l/f),_.push(...G(v)),_.push(...G(y)),_.push(...G(e[2].dims)),e.length===4&&_.push(...G(V.convertShape(e[3].dims)));let b=[c,i,o/p];return _.push(...G(b)),{name:`MatMulNBits`,shaderCache:{hint:`${t.blockSize};${t.bits};${d};${f};${p};${h};64`,inputDependencies:Array(e.length).fill(`rank`)},getRunData:()=>({outputs:[{dims:m,dataType:u}],dispatchGroup:{x:g},programUniforms:_}),getShaderSource:n=>{let r=v.length,i=X(`a`,e[0].dataType,r,d),a=X(`b`,12,y.length,f),o=X(`scales`,e[2].dataType,e[2].dims.length),s=[i,a,o],c=e.length===4?X(`zero_points`,12,e[3].dims.length):void 0;c&&s.push(c);let u=b.length,m=Z(`output`,e[0].dataType,u,p),g=Sr(e[0].dataType),_=(()=>{switch(d){case 1:return`array<${g}, 8>`;case 2:return`mat4x2<${g}>`;case 4:return`mat2x4<${g}>`;default:throw Error(`${d}-component is not supported.`)}})(),x=Math.floor(32/t.bits),S=Math.floor(x/8),C=()=>{let e=``;for(let n=0;n<S;n++){let r=n*t.bits*4,a=r+t.bits;e+=`
          // reuse a data (pass ${n})
            var input_offset${n>0?n:``} = ${n===0?i.indicesToOffset(`${i.type.indices}(batch, row, word_offset)`):`input_offset`};
            var a_data${n>0?n:``}: ${_};
            for (var j${n>0?n:``}: u32 = 0; j${n>0?n:``} < ${8/d}; j${n>0?n:``}++) {
              a_data${n>0?n:``}[j${n>0?n:``}] = ${i.getByOffset(`input_offset${n>0?n:``}`)};
              input_offset${n>0?n:``}++;
            }
          `;for(let i=0;i<p*h;i++)e+=`
            b_value = ${f===1?`b${i}_data`:`b${i}_data[i]`};
            ${t.bits===2?`{
              let half_word = b_value >> ${n*16}u;
              let byte_lo = half_word & 0xFFu;
              let byte_hi = (half_word >> 8u) & 0xFFu;
              let spread_word = (byte_lo & 0xFu) | ((byte_lo >> 4u) << 8u) | ((byte_hi & 0xFu) << 16u) | ((byte_hi >> 4u) << 24u);
              b_value_lower = unpack4xU8(spread_word & b_mask);
              b_value_upper = unpack4xU8((spread_word >> 2u) & b_mask);
            }`:`b_value_lower = unpack4xU8((b_value >> ${r}u) & b_mask);
            b_value_upper = unpack4xU8((b_value >> ${a}u) & b_mask);`}
            b_quantized_values = ${_}(${Array.from({length:4},(e,t)=>`${g}(b_value_lower[${t}]), ${g}(b_value_upper[${t}])`).join(`, `)});
            b_dequantized_values = ${d===1?`${_}(${Array.from({length:8},(e,t)=>`(b_quantized_values[${t}] - ${c?`zero_point${i}`:`zero_point`}) * scale${i}`).join(`, `)});`:`(b_quantized_values - ${_}(${Array(8).fill(`${c?`zero_point${i}`:`zero_point`}`).join(`,`)})) * scale${i};`};
            workgroup_shared[local_id.x * ${h} + ${Math.floor(i/p)}]${p>1?`[${i%p}]`:``} += ${Array.from({length:8/d},(e,t)=>`${d===1?`a_data${n>0?n:``}[${t}] * b_dequantized_values[${t}]`:`dot(a_data${n>0?n:``}[${t}], b_dequantized_values[${t}])`}`).join(` + `)};
          `}return e},w=()=>{let e=`
            var col_index = col * ${p};
            ${c?`
            let zero_point_values_per_byte: u32 = ${Math.floor(8/t.bits)}u;
            let zero_point_bytes_per_col = (nBlocksPerCol + zero_point_values_per_byte - 1u) / zero_point_values_per_byte;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_sub_offset: u32 = block % zero_point_values_per_byte;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is ${2**(t.bits-1)} for unsigned ${t.bits}-bit quantization.
            let zero_point = ${g}(${(2**(t.bits-1)).toFixed(1)});`}
            `;for(let n=0;n<p*h;n++)e+=`
            let scale${n} = ${o.getByOffset(`col_index * nBlocksPerCol + block`)};
            ${c?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block / zero_point_values_per_byte);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_sub_offset * ${t.bits}u);
            zero_point_word = ${c.getByOffset(`zero_point_word_index`)} >> zero_point_bits_offset;
            let zero_point${n} = ${g}((zero_point_word) & ${t.bits===2?`0x3u`:`0xFu`});`:``}
            col_index += 1;`;return e},ee=()=>{let e=`col_index = col * ${p};`;for(let t=0;t<p*h;t++)e+=`
            let b${t}_data = ${a.getByIndices(`${a.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return e+=`
            var b_value: u32;
            let b_mask: u32 = ${t.bits===2?`0x03030303u`:`0x0F0F0F0Fu`};
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${_};
            var b_dequantized_values: ${_};`,e};return`
        var<workgroup> workgroup_shared: array<${m.type.value}, ${h*64}>;
        ${n.declareVariables(...s,m)}
        ${n.mainStart([64,1,1])}
          let output_indices = ${m.offsetToIndices(`(global_idx / 64) * ${h}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += 64) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/d};
            ${w()}
            for (var word: u32 = 0; word < ${l}; word += ${f}) {
              ${ee()}
              for (var i: u32 = 0; i < ${f}; i++) {
                ${C()}
                word_offset += ${x/d};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${h}) {
            var output_value: ${m.type.value} = ${m.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < 64u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${h};
            }
            ${m.setByIndices(`${m.type.indices}(batch, row, col + local_id.x)`,`output_value`)};
          }
        }`}}},ql=(e,t)=>{let n=e[0].dims,r=n.length,i=n[r-2],a=t.k,o=t.n,s=n.slice(0,r-2),c=V.size(s),l=e[1].dims[2]/4,u=e[0].dataType,d=K(t.k),f=K(l),p=s.concat([i,o]),m=o%8==0?8:o%4==0?4:1,h=128/m,g=Math.floor(32/t.bits),_=h*f*g,v=_/d,y=_/t.blockSize,b=V.size(p)/m,x=[],S=[c,i,a/d],C=V.convertShape(e[1].dims).slice();C.splice(-1,1,l/f),x.push(...G(S)),x.push(...G(C)),x.push(...G(e[2].dims)),e.length===4&&x.push(...G(V.convertShape(e[3].dims)));let w=[c,i,o];return x.push(...G(w)),{name:`BlockwiseMatMulNBits32`,shaderCache:{hint:`${t.blockSize};${d};${f};${h};${m}`,inputDependencies:Array(e.length).fill(`rank`)},getRunData:()=>({outputs:[{dims:p,dataType:u}],dispatchGroup:{x:b},programUniforms:x}),getShaderSource:n=>{let r=S.length,i=X(`a`,e[0].dataType,r,d),a=X(`b`,12,C.length,f),o=X(`scales`,e[2].dataType,e[2].dims.length),s=[i,a,o],c=e.length===4?X(`zero_points`,12,e[3].dims.length):void 0;c&&s.push(c);let l=w.length,u=Z(`output`,e[0].dataType,l),p=Sr(e[0].dataType),_=()=>{switch(d){case 1:return`
          let a_data0 = vec4<${p}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${p}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${p}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${p}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw Error(`${d}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${i.type.value}, ${v}>;
        var<workgroup> inter_results: array<array<${u.type.value}, ${h}>, ${m}>;
        ${n.declareVariables(...s,u)}
        ${n.mainStart([h,m,1])}
          let output_indices = ${u.offsetToIndices(`workgroup_index * ${m}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${y} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${v};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${v}; a_offset += 128)
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${i.getByIndices(`${i.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${i.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${y} + local_id.x;
            ${c?`
            let zero_point_values_per_byte: u32 = ${Math.floor(8/t.bits)}u;
            let zero_point_bytes_per_col = (n_blocks_per_col + zero_point_values_per_byte - 1u) / zero_point_values_per_byte;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block / zero_point_values_per_byte);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_sub_offset: u32 = block % zero_point_values_per_byte;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_sub_offset * ${t.bits}u);
            let zero_point_word = ${c.getByOffset(`zero_point_word_index`)} >> zero_point_bits_offset;
            let zero_point = ${p}((zero_point_word) & ${t.bits===2?`0x3u`:`0xFu`});`:`
            // The default zero point is ${2**(t.bits-1)} for unsigned ${t.bits}-bit quantization.
            let zero_point = ${p}(${(2**(t.bits-1)).toFixed(1)});`}
            let scale = ${o.getByOffset(`b_row * n_blocks_per_col + block`)};
            let b_data = ${a.getByIndices(`${a.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${t.blockSize/d};
            for (var i: u32 = 0; i < ${f}; i++) {
              let b_value = ${f===1?`b_data`:`b_data[i]`};
              ${(()=>{let e=Math.floor(g/8),n=``;for(let r=0;r<e;r++){let e=r*t.bits*4,i=e+t.bits;n+=`
              ${_()}
              {${t.bits===2?`
                let half_word = b_value >> ${r*16}u;
                let byte_lo = half_word & 0xFFu;
                let byte_hi = (half_word >> 8u) & 0xFFu;
                let spread_word = (byte_lo & 0xFu) | ((byte_lo >> 4u) << 8u) | ((byte_hi & 0xFu) << 16u) | ((byte_hi >> 4u) << 24u);
                let b_value_lower = unpack4xU8(spread_word & 0x03030303u);
                let b_value_upper = unpack4xU8((spread_word >> 2u) & 0x03030303u);`:`
                let b_value_lower = unpack4xU8((b_value >> ${e}u) & 0x0F0F0F0Fu);
                let b_value_upper = unpack4xU8((b_value >> ${i}u) & 0x0F0F0F0Fu);`}
                let b_quantized_values = mat2x4<${p}>(${Array.from({length:4},(e,t)=>`${p}(b_value_lower[${t}]), ${p}(b_value_upper[${t}])`).join(`, `)});
                let b_dequantized_values = (b_quantized_values - mat2x4<${p}>(${Array(8).fill(`zero_point`).join(`,`)})) * scale;
                inter_results[local_id.y][local_id.x] += ${Array.from({length:2},(e,t)=>`${`dot(a_data${t}, b_dequantized_values[${t}])`}`).join(` + `)};
              }
              word_offset += ${8/d};`}return n})()}
            }
            workgroupBarrier();
          }

          if (local_idx < ${m}) {
            var output_value: ${u.type.value} = ${u.type.value}(0);
            for (var b = 0u; b < ${h}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${u.setByIndices(`${u.type.indices}(batch, row, col + local_idx)`,`output_value`)}
            }
          }
        }`}}},Jl=(e,t)=>{Gl(e.inputs,t),t.blockSize===32&&e.adapterInfo.isVendor(`intel`)&&e.adapterInfo.isArchitecture(`gen-12lp`)?e.compute(ql(e.inputs,t)):e.compute(Kl(e.inputs,t))},Yl=e=>U(e)}),Zl,Ql,$l,eu,tu,nu,ru,iu,au,ou=N(()=>{z(),H(),Q(),Zl=e=>{if(!e||e.length<1)throw Error(`Too few inputs`);if(e[0].dataType!==1&&e[0].dataType!==10)throw Error(`Input type must be float or float16.`);if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw Error(`The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].`)}},Ql=(e,t,n)=>{let r=``;for(let i=t-1;i>=0;--i)r+=`
            k = i32(${e.indicesGet(`indices`,i)}) - ${J(`uniforms.pads`,i,n)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${J(`uniforms.x_shape`,i,t)})) {
              break;
            }
            offset += k * i32(${J(`uniforms.x_strides`,i,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${r}
            value = x[offset];
          }
      `},$l=(e,t,n)=>{let r=``;for(let i=t-1;i>=0;--i)r+=`
                k = i32(${e.indicesGet(`indices`,i)}) - ${J(`uniforms.pads`,i,n)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${J(`uniforms.x_shape`,i,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${J(`uniforms.x_shape`,i,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${J(`uniforms.x_strides`,i,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},eu=(e,t,n)=>{let r=``;for(let i=t-1;i>=0;--i)r+=`
                k = i32(${e.indicesGet(`indices`,i)}) - ${J(`uniforms.pads`,i,n)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${J(`uniforms.x_shape`,i,t)})) {
                  k = i32(${J(`uniforms.x_shape`,i,t)}) - 1;
                }
                offset += k * i32(${J(`uniforms.x_strides`,i,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},tu=(e,t,n)=>{let r=``;for(let i=t-1;i>=0;--i)r+=`
                k = i32(${e.indicesGet(`indices`,i)}) - ${J(`uniforms.pads`,i,n)};
                if (k < 0)  {
                  k += i32(${J(`uniforms.x_shape`,i,t)}]);
                }
                if (k >= i32(${J(`uniforms.x_shape`,i,t)})) {
                  k -= i32(${J(`uniforms.x_shape`,i,t)});
                }
                offset += k * i32(${J(`uniforms.x_strides`,i,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${r}
              value = x[offset];
          `},nu=(e,t,n)=>{switch(n.mode){case 0:return Ql(e,t,n.pads.length);case 1:return $l(e,t,n.pads.length);case 2:return eu(e,t,n.pads.length);case 3:return tu(e,t,n.pads.length);default:throw Error(`Invalid mode`)}},ru=(e,t)=>{let n=V.padShape(e[0].dims.slice(),t.pads),r=e[0].dims,i=[{type:12,data:V.size(n)},{type:6,data:t.pads}],a=e.length>=3&&e[2].data;return t.mode===0&&i.push({type:a?e[2].dataType:1,data:t.value}),i.push(...G(e[0].dims,n)),{name:`Pad`,shaderCache:{hint:`${t.mode}${a}`,inputDependencies:[`rank`]},getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(V.size(n)/64)},programUniforms:i}),getShaderSource:i=>{let o=Z(`output`,e[0].dataType,n.length),s=X(`x`,e[0].dataType,r.length),c=s.type.value,l=nu(o,r.length,t),u=[{name:`output_size`,type:`u32`},{name:`pads`,type:`i32`,length:t.pads.length}];return t.mode===0&&u.push({name:`constant_value`,type:a?c:`f32`}),`
            ${i.registerUniforms(u).declareVariables(s,o)}
            ${i.mainStart()}
            ${i.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}

            let indices = ${o.offsetToIndices(`global_idx`)};

            var value = ${c}(0);
            ${l}
            output[global_idx] = value;
        }`}}},iu=(e,t)=>{if(e.length>1){let n=e[1].getBigInt64Array(),r=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,i=e[0].dims.length,a=new Int32Array(2*i).fill(0);if(e.length>=4){let t=e[3].getBigInt64Array();for(let e=0;e<t.length;e++)a[Number(t[e])]=Number(n[e]),a[Number(t[e])+i]=Number(n[e+t.length])}else n.forEach((e,t)=>a[Number(t)]=Number(e));let o=[];return a.forEach(e=>o.push(e)),{mode:t.mode,value:r,pads:o}}return t},au=(e,t)=>{Zl(e.inputs);let n=iu(e.inputs,t);e.compute(ru(e.inputs,n),{inputs:[0]})}}),su,cu,lu,uu,du,fu,pu,mu,hu,gu,_u,vu,yu,bu,xu,Su,Cu,wu,Tu,Eu=N(()=>{Et(),z(),H(),Q(),su=e=>{if(P.webgpu.validateInputContent&&(!e||e.length!==1))throw Error(`Pool ops requires 1 input.`)},cu=(e,t,n)=>{let r=t.format===`NHWC`,i=e.dims.slice();r&&i.splice(1,0,i.pop());let a=Object.hasOwnProperty.call(t,`dilations`),o=t.kernelShape.slice(),s=t.strides.slice(),c=a?t.dilations.slice():[],l=t.pads.slice();Bn.adjustPoolAttributes(n,i,o,s,c,l);let u=Bn.computePoolOutputShape(n,i,s,c,o,l,t.autoPad,t.ceilMode),d=Object.assign({},t);a?Object.assign(d,{kernelShape:o,strides:s,pads:l,dilations:c,cacheKey:t.cacheKey}):Object.assign(d,{kernelShape:o,strides:s,pads:l,cacheKey:t.cacheKey});let f=u.slice();return f.push(f.splice(1,1)[0]),[d,r?f:u]},lu=(e,t)=>{let n=t.format===`NHWC`,r=V.size(e),i=V.size(t.kernelShape),a=[{type:12,data:r},{type:12,data:i}],o=[{name:`outputSize`,type:`u32`},{name:`kernelSize`,type:`u32`}];if(t.kernelShape.length<=2){let e=t.kernelShape[t.kernelShape.length-1],n=t.strides[t.strides.length-1],r=t.pads[t.pads.length/2-1],i=t.pads[t.pads.length-1],s=!!(r+i);a.push({type:12,data:e},{type:12,data:n},{type:12,data:r},{type:12,data:i}),o.push({name:`kw`,type:`u32`},{name:`sw`,type:`u32`},{name:`pwStart`,type:`u32`},{name:`pwEnd`,type:`u32`});let c=!1;if(t.kernelShape.length===2){let e=t.kernelShape[t.kernelShape.length-2],n=t.strides[t.strides.length-2],r=t.pads[t.pads.length/2-2],i=t.pads[t.pads.length-2];c=!!(r+i),a.push({type:12,data:e},{type:12,data:n},{type:12,data:r},{type:12,data:i}),o.push({name:`kh`,type:`u32`},{name:`sh`,type:`u32`},{name:`phStart`,type:`u32`},{name:`phEnd`,type:`u32`})}return[a,o,!0,s,c]}{if(n)throw Error(`Pooling with kernelShape.length > 2 is not supported for NHWC format.`);let e=V.computeStrides(t.kernelShape);return a.push({type:12,data:e},{type:12,data:t.pads},{type:12,data:t.strides}),o.push({name:`kernelStrides`,type:`u32`,length:e.length},{name:`pads`,type:`u32`,length:t.pads.length},{name:`strides`,type:`u32`,length:t.strides.length}),[a,o,!!t.pads.reduce((e,t)=>e+t),!1,!1]}},uu=(e,t,n,r,i,a,o,s,c,l,u,d)=>{let f=i.format===`NHWC`,p=t.type.value,m=Z(`output`,t.type.tensor,r);if(i.kernelShape.length<=2){let r=``,l=``,h=``,g=n-(f?2:1);if(r=u?`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${g}] = indices[${g}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${g}] < 0 || xIndices[${g}]
                      >= uniforms.x_shape[${g}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${t.indicesToOffset(`xIndices`)}];
                  ${a}
                }`:`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${g}] = indices[${g}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${t.indicesToOffset(`xIndices`)}];
                  ${a}
                }`,i.kernelShape.length===2){let e=n-(f?3:2);l=d?`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${e}] = indices[${e}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${e}] < 0 || xIndices[${e}] >= uniforms.x_shape[${e}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${e}] = indices[${e}] * uniforms.sh - uniforms.phStart + j;
                `,h=`
              }
            `}return`
            ${e.registerUniforms(c).declareVariables(t,m)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}

              let indices = ${m.offsetToIndices(`global_idx`)};
              var xIndices = ${m.offsetToIndices(`global_idx`)};

              var value = ${p}(${s});
              var pad = 0;
              ${l}
              ${r}
              ${h}
              ${o}

              output[global_idx] = value;
            }`}{if(f)throw Error(`Pooling with kernelShape.length > 2 is not supported for NHWC format.`);let r=i.kernelShape.length,u=i.pads.length,d=``;return d=l?`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${t.indicesToOffset(`xIndices`)}];
                ${a}
              }`:`
              }
              let x_val = x[${t.indicesToOffset(`xIndices`)}];
              ${a}
            `,`
            ${e.registerUniforms(c).declareVariables(t,m)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
              let indices = ${m.offsetToIndices(`global_idx`)};
              var xIndices = ${m.offsetToIndices(`global_idx`)};

              var offsets: array<u32, ${r}>;

              var value = ${p}(${s});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${r-1}u; j++) {
                  offsets[j] = offset / ${J(`uniforms.kernelStrides`,`j`,r)};
                  offset -= offsets[j] * ${J(`uniforms.kernelStrides`,`j`,r)};
                }
                offsets[${r-1}] = offset;

                isPad = false;
                for (var j = ${n-r}u; j < ${n}u; j++) {
                  xIndices[j] = indices[j] * ${J(`uniforms.strides`,`j - ${n-r}u`,r)}
                    + offsets[j - ${n-r}u] - ${J(`uniforms.pads`,`j - 2u`,u)};
                  ${d}
              }
              ${o}

              output[global_idx] = value;
            }`}},du=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,fu=e=>`${du(e)};${e.countIncludePad}`,pu=e=>`${du(e)};${e.storageOrder};${e.dilations}`,mu=e=>({format:e.format,autoPad:[`NOTSET`,`VALID`,`SAME_UPPER`,`SAME_LOWER`][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),hu=(e,t,n,r)=>{let[i,a]=cu(t,r,n),o=X(`x`,t.dataType,t.dims.length),s=o.type.value,c=``;i.countIncludePad?c+=`value /= ${s}(uniforms.kernelSize);`:c+=`value /= ${s}(i32(uniforms.kernelSize) - pad);`;let[l,u,d,f,p]=lu(a,i);return l.push(...G(t.dims,a)),{name:e,shaderCache:{hint:`${r.cacheKey};${d};${f};${p}`,inputDependencies:[`rank`]},getRunData:()=>({outputs:[{dims:a,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(V.size(a)/64)},programUniforms:l}),getShaderSource:e=>uu(e,o,t.dims.length,a.length,i,`value += x_val;`,c,0,u,d,f,p)}},gu=e=>{let t=e.count_include_pad!==0,n=mu(e);if(n.ceilMode!==0)throw Error(`ceil_mode output-shape is computed, but ceil_mode kernel execution (padding/divisor) is not yet implemented in the WebGPU AveragePool kernel`);let r={countIncludePad:t,...n,cacheKey:``};return{...r,cacheKey:fu(r)}},_u=(e,t)=>{su(e.inputs),e.compute(hu(`AveragePool`,e.inputs[0],!1,t))},vu={autoPad:``,ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},yu=e=>{let t=e.format;return{format:t,...vu,cacheKey:t}},bu=(e,t)=>{su(e.inputs),e.compute(hu(`GlobalAveragePool`,e.inputs[0],!0,t))},xu=(e,t,n,r)=>{let[i,a]=cu(t,r,n),o=X(`x`,t.dataType,t.dims.length),s=[`rank`],[c,l,u,d,f]=lu(a,i);return c.push(...G(t.dims,a)),{name:e,shaderCache:{hint:`${r.cacheKey};${u};${d};${f}`,inputDependencies:s},getRunData:()=>({outputs:[{dims:a,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(V.size(a)/64)},programUniforms:c}),getShaderSource:e=>uu(e,o,t.dims.length,a.length,i,`
      value = max(x_val, value);
    `,``,t.dataType===10?-65504:-1e5,l,u,d,f)}},Su=(e,t)=>{su(e.inputs),e.compute(xu(`MaxPool`,e.inputs[0],!1,t))},Cu=e=>{let t=e.storage_order,n=e.dilations,r=mu(e);if(t!==0)throw Error(`column major storage order is not yet supported for MaxPool`);if(r.ceilMode!==0)throw Error(`ceil_mode output-shape is computed, but ceil_mode kernel execution (padding) is not yet implemented in the WebGPU MaxPool kernel`);let i={storageOrder:t,dilations:n,...r,cacheKey:``};return{...i,cacheKey:pu(i)}},wu=e=>{let t=e.format;return{format:t,...vu,cacheKey:t}},Tu=(e,t)=>{su(e.inputs),e.compute(xu(`GlobalMaxPool`,e.inputs[0],!0,t))}}),Du,Ou,ku,Au,ju=N(()=>{z(),H(),W(),Q(),Du=(e,t)=>{if(e.length<2||e.length>3)throw Error(`DequantizeLinear requires 2 or 3 inputs.`);if(e.length===3&&e[1].dims===e[2].dims)throw Error(`x-scale and x-zero-point must have the same shape.`);if(e.length===3&&e[0].dataType!==e[2].dataType)throw Error(`x and x-zero-point must have the same data type.`);if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw Error(`scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.`);if(e.length>2){if(e[0].dataType!==e[2].dataType)throw Error(`x and x-zero-point must have the same data type.`);if(e[1].dims.length!==e[2].dims.length)throw Error(`scale and zero-point inputs must have the same rank.`);if(!e[1].dims.map((t,n)=>t===e[2].dims[n]).reduce((e,t)=>e&&t,!0))throw Error(`scale and zero-point inputs must have the same shape.`)}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw Error(`blockSize must be set only for block quantization.`);if(!e[1].dims.map((n,r)=>r===t.axis||n===e[0].dims[r]).reduce((e,t)=>e&&t,!0))throw Error(`For block qunatization, scale input shape to match the input shape except for the axis`);if(e[1].dims.length!==e[0].dims.length)throw Error(`For block qunatization the scale input rank must be the same as the x rank.`);let n=e[0].dims[t.axis],r=e[1].dims[t.axis];if(t.blockSize<Math.ceil(n/r)||t.blockSize>Math.ceil(n/(r-1)-1))throw Error(`blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].`)}},Ou=(e,t)=>{let n=V.normalizeAxis(t.axis,e[0].dims.length),r=e[0].dataType,i=r===3,a=e[0].dims,o=e[1].dataType,s=V.size(a),c=r===3||r===2,l=c?[Math.ceil(V.size(e[0].dims)/4)]:e[0].dims,u=e[1].dims,d=e.length>2?e[2]:void 0,f=d?c?[Math.ceil(V.size(d.dims)/4)]:d.dims:void 0,p=u.length===0||u.length===1&&u[0]===1,m=p===!1&&u.length===1,h=K(s),g=p&&(!c||h===4),_=g?h:1,v=g&&!c?h:1,y=X(`input`,c?12:r,l.length,v),b=X(`scale`,o,u.length),x=d?X(`zero_point`,c?12:r,f.length):void 0,S=Z(`output`,o,a.length,_),C=[y,b];x&&C.push(x);let w=[l,u];d&&w.push(f);let ee=[{type:12,data:s/_},{type:12,data:n},{type:12,data:t.blockSize},...G(...w,a)];return{name:`DequantizeLinear`,shaderCache:{hint:t.cacheKey,inputDependencies:x?[`rank`,`rank`,`rank`]:[`rank`,`rank`]},getShaderSource:e=>`
      ${e.registerUniforms([{name:`output_size`,type:`u32`},{name:`axis`,type:`u32`},{name:`block_size`,type:`u32`}]).declareVariables(...C,S)}
      ${e.mainStart()}
          ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
          let output_indices = ${S.offsetToIndices(`global_idx`)};

          // Set input x
          ${c?`
            let input = ${y.getByOffset(`global_idx / 4`)};
            let x_vec = ${i?`unpack4xI8(input)`:`unpack4xU8(input)`};
            let x_value = ${_===1?`x_vec[global_idx % 4]`:`x_vec`};`:`let x_value = ${y.getByOffset(`global_idx`)};`};

          // Set scale input
          ${p?`let scale_value= ${b.getByOffset(`0`)}`:m?`
            let scale_index = ${S.indicesGet(`output_indices`,`uniforms.axis`)};
            let scale_value= ${b.getByOffset(`scale_index`)};`:`
            var scale_indices: ${b.type.indices} = output_indices;
            let index = ${b.indicesGet(`scale_indices`,`uniforms.axis`)} / uniforms.block_size;
            ${b.indicesSet(`scale_indices`,`uniforms.axis`,`index`)};
            let scale_value= ${b.getByIndices(`scale_indices`)};`};

          // Set zero-point input
          ${x?p?c?`
                let zero_point_input = ${x.getByOffset(`0`)};
                let zero_point_vec =  ${i?`unpack4xI8(zero_point_input)`:`unpack4xU8(zero_point_input)`};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${x.getByOffset(`0`)}`:m?c?`
                let zero_point_index = ${S.indicesGet(`output_indices`,`uniforms.axis`)};
                let zero_point_input = ${x.getByOffset(`zero_point_index / 4`)};
                let zero_point_vec =  ${i?`unpack4xI8(zero_point_input)`:`unpack4xU8(zero_point_input)`};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${S.indicesGet(`output_indices`,`uniforms.axis`)};
                let zero_point_value = ${x.getByOffset(`zero_point_index`)};`:c?`
                let zero_point_offset = ${b.indicesToOffset(`scale_indices`)};
                let zero_point_input = ${x.getByOffset(`zero_point_offset / 4`)};
                let zero_point_vec = ${i?`unpack4xI8(zero_point_input)`:`unpack4xU8(zero_point_input)`};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${x.getByIndices(`scale_indices`)};`:`let zero_point_value = ${c?i?`i32`:`u32`:y.type.value}(0);`};
      // Compute and write output
      ${S.setByOffset(`global_idx`,`${S.type.value}(x_value - zero_point_value) * scale_value`)};
      }`,getRunData:()=>({outputs:[{dims:a,dataType:o}],dispatchGroup:{x:Math.ceil(s/_/64),y:1,z:1},programUniforms:ee})}},ku=(e,t)=>{Du(e.inputs,t),e.compute(Ou(e.inputs,t))},Au=e=>U({axis:e.axis,blockSize:e.blockSize})}),Mu,Nu,Pu,Fu=N(()=>{Et(),z(),Q(),Mu=(e,t,n)=>{if(e===t||e<t&&n<0||e>t&&n>0)throw Error(`Range these inputs' contents are invalid.`)},Nu=(e,t,n,r)=>{let i=Math.abs(Math.ceil((t-e)/n)),a=[i],o=i,s=[{type:12,data:o},{type:r,data:e},{type:r,data:n},...G(a)];return{name:`Range`,shaderCache:{hint:`${r}`},getShaderSource:e=>{let t=Z(`output`,r,a.length),n=t.type.value,i=[{name:`outputSize`,type:`u32`},{name:`start`,type:n},{name:`delta`,type:n}];return`
        ${e.registerUniforms(i).declareVariables(t)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
        output[global_idx] = uniforms.start + ${n}(global_idx) * uniforms.delta;
      }`},getRunData:()=>({outputs:[{dims:a,dataType:r}],dispatchGroup:{x:Math.ceil(o/64)},programUniforms:s})}},Pu=e=>{let t=0,n=0,r=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],n=e.inputs[1].getInt32Array()[0],r=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],n=e.inputs[1].getFloat32Array()[0],r=e.inputs[2].getFloat32Array()[0]),P.webgpu.validateInputContent&&Mu(t,n,r),e.compute(Nu(t,n,r,e.inputs[0].dataType),{inputs:[]})}}),Iu,Lu,Ru,zu,Bu=N(()=>{z(),H(),W(),Q(),Iu=(e,t,n,r)=>{if(e!==`none`&&r!==`i32`&&r!==`u32`&&r!==`f32`)throw Error(`Input ${r} is not supported with reduction ${e}.`);let i=`{
                var oldValue = 0;
                loop {
                  let newValueF32 =`,a=`;
                  let newValue = bitcast<i32>(newValueF32);
                  let res = atomicCompareExchangeWeak(&${t}, oldValue, newValue);
                  if res.exchanged {
                    break;
                  }
                  oldValue = res.old_value;
                }
              }`;switch(e){case`none`:return`${t}=${n};`;case`add`:return r===`i32`||r===`u32`?`atomicAdd(&${t}, bitcast<${r}>(${n}));`:`
              ${i}bitcast<${r}>(oldValue) + (${n})${a}`;case`max`:return r===`i32`||r===`u32`?`atomicMax(&${t}, bitcast<${r}>(${n}));`:`
                ${i}max(bitcast<f32>(oldValue), (${n}))${a}`;case`min`:return r===`i32`||r===`u32`?`atomicMin(&${t}, bitcast<${r}>(${n}));`:`${i}min(bitcast<${r}>(oldValue), (${n}))${a}`;case`mul`:return`${i}(bitcast<${r}>(oldValue) * (${n}))${a}`;default:throw Error(`Reduction ${e} is not supported.`)}},Lu=(e,t)=>{let n=e[0].dims,r=e[1].dims,i=n,a=Math.ceil(V.sizeToDimension(r,r.length-1)/1),o=r[r.length-1],s=V.sizeFromDimension(n,o),c=[{type:12,data:a},{type:12,data:o},{type:12,data:s},...G(e[1].dims,e[2].dims,i)];return{name:`ScatterND`,shaderCache:{hint:`${t.cacheKey}_${t.reduction}`,inputDependencies:[`rank`,`rank`]},getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:c}),getShaderSource:n=>{let r=X(`indices`,e[1].dataType,e[1].dims.length),a=X(`updates`,e[2].dataType,e[2].dims.length,1),o=t.reduction!==`none`&&t.reduction!==``?Er(`output`,e[0].dataType,i.length):Z(`output`,e[0].dataType,i.length,1);return`
      ${n.registerUniform(`output_size`,`u32`).registerUniform(`last_index_dimension`,`u32`).registerUniform(`num_updates_elements`,`u32`).declareVariables(r,a,o)}
      ${n.mainStart()}
        ${n.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
  var data_offset = 0u;
  let indices_start = uniforms.last_index_dimension * global_idx;
  let indices_end = indices_start + uniforms.last_index_dimension;
  for (var i = indices_start; i < indices_end; i++) {
    var index = i32(indices[i].x);
    ${e[0].dims.length===1?`
    let element_count_dim = uniforms.output_strides;
    let dim_value = uniforms.output_shape;`:`
    let element_count_dim = uniforms.output_strides[i - indices_start];
    let dim_value = uniforms.output_shape[i - indices_start];`}
    if (index >= 0) {
      if (index >= i32(dim_value)) {
        index = i32(dim_value - 1);
      }
    } else {
      if (index < -i32(dim_value)) {
        index = 0;
      } else {
        index += i32(dim_value);
      }
    }
    data_offset += u32((u32(index) * element_count_dim));
  }

  for (var i = 0u; i < uniforms.num_updates_elements; i++) {
    let value = updates[uniforms.num_updates_elements * global_idx + i];
    ${Iu(t.reduction,`output[data_offset + i]`,`value`,o.type.value)}
  }

      }`}}},Ru=e=>U({reduction:e.reduction}),zu=(e,t)=>{e.compute(Lu(e.inputs,t),{inputs:[e.inputs[1],e.inputs[2]],outputs:[]})}}),Vu,Hu,Uu,Wu,Gu,Ku,qu,Ju,Yu,Xu,Zu,Qu,$u,ed,td,nd,rd,id,ad,od,sd=N(()=>{z(),H(),W(),Q(),Vu=(e,t)=>{if(e.every(e=>e>0||(()=>{throw Error(`Resize requires scales input values to be positive`)})),e.length>0){if(t.mode===`linear`){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode===`cubic`&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw Error(`Resize requires scales input size to be 2 or 4 for cubic mode`)}},Hu=(e,t,n)=>{t.every(e=>e>=0&&e<n||(()=>{throw Error(`Resize requires axes input values to be positive and less than rank`)}));let r=Array(n).fill(1);return t.forEach((t,n)=>r[t]=e[n]),r},Uu=(e,t,n,r,i,a)=>{let[o,s,c]=n>10?[1,2,3]:[-1,e.length>1?1:-1,-1],l=e[0].dims.length;if(o>0&&e.length>o&&e[o].dims.length>0)e[o].getFloat32Array().forEach(e=>a.push(e));else if(t.coordinateTransformMode===`tf_crop_and_resize`)throw Error(`Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize`);if(s>0&&e.length>s&&e[s].dims.length===1&&e[s].dims[0]>0){if(e[s].getFloat32Array().forEach(e=>r.push(e)),r.length!==0&&r.length!==l&&n>=18&&r.length!==t.axes.length)throw Error(`Resize requires scales input size to be same as input rank or axes size for opset 18 and up`);Vu(r,t),t.axes.length>0&&Hu(r,t.axes,l).forEach((e,t)=>r[t]=e)}if(c>0&&e.length>c&&e[c].dims.length===1&&e[c].dims[0]>0&&(e[c].getBigInt64Array().forEach(e=>i.push(Number(e))),i.length!==0&&i.length!==l&&n>=18&&i.length!==t.axes.length))throw Error(`Resize requires sizes input size to be same as input rank or axes size for opset 18 and up`);if(t.axes.length>0){if(r.length!==0&&r.length!==t.axes.length)throw Error(`Resize requires "scales" input size to be of axes rank when axes attributes is specified`);if(i.length!==0&&i.length!==t.axes.length)throw Error(`Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified`)}if(typeof r<`u`&&typeof i<`u`&&r.length>0&&i.length>l)throw Error(`Resize requires only of scales or sizes to be specified`)},Wu=(e,t,n,r)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${e}) * (${t});
  let whole = ${r}(big / (${n}));
  let fract = ${r}(big % (${n})) / ${r}(${n});
  return whole + fract;
`,Gu=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${t} { `+(()=>{switch(e){case`asymmetric`:return`
          if (xScale < 1.0 || floor(xScale) != xScale) {
            return ${t}(xResized) / ${t}(xScale);
          } else {
            ${Wu(`xResized`,`lengthOriginal`,`lengthResized`,t)}
          }
        `;case`pytorch_half_pixel`:return`if (lengthResized > 1) {
                    return (${t}(xResized) + 0.5) / ${t}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case`tf_half_pixel_for_nn`:return`return (${t}(xResized) + 0.5) / ${t}(xScale);`;case`align_corners`:return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    ${Wu(`xResized`,`lengthOriginal - 1`,`lengthResized - 1`,t)}
                  }`;case`tf_crop_and_resize`:return`if (lengthResized > 1) {
                    return ${t}(roiStart) * ${t}(lengthOriginal - 1) +
                        (${t}(xResized) * ${t}(roiEnd - roiStart) * ${t}(lengthOriginal - 1)) /
                        ${t}(lengthResized - 1);
                  } else {
                    return 0.5 * ${t}(roiStart + roiEnd) * ${t}(lengthOriginal - 1);
                  }`;case`half_pixel_symmetric`:return`const outputWidth = ${t}xScale * ${t}(lengthResized);
                  const adjustment = ${t}(lengthResized) / outputWidth;
                  const center = ${t}(lengthOriginal) / 2;
                  const offset = center * (1 - adjustment);
                  return offset + ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;case`half_pixel`:return`return ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;default:throw Error(`Coordinate transform mode ${e} is not supported`)}})()+`}`,Ku=(e,t,n)=>`fn getNearestPixelFromOriginal(xOriginal: ${n}, isDownSample: bool) -> ${n} {`+(()=>{switch(e){case`round_prefer_ceil`:return`if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }`;case`floor`:return`return floor(xOriginal);`;case`ceil`:return`return ceil(xOriginal);`;case`round_prefer_floor`:return`if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }`;default:if(t<11)return`if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }`;throw Error(`Nearest mode ${e} is not supported`)}})()+`}`,qu=(e,t,n)=>{let r=Array(n).fill(0).concat(Array(n).fill(1)),i=e.length===0?r:e.slice();return t.length>0?(t.forEach((e,a)=>{r[e]=i[a],r[a+n]=i[t.length+a]}),r):i},Ju=(e,t,n,r)=>{let i=[];if(n.length>0){if(r.length>0){if(e.forEach(e=>i.push(e)),Math.max(...r)>e.length)throw Error(`axes is out of bound`);r.forEach((e,t)=>i[e]=n[t])}else n.forEach(e=>i.push(e))}else{if(t.length===0)throw Error(`Resize requires either scales or sizes.`);i=e.map((e,n)=>Math.round(e*t[n]))}return i},Yu=(e,t,n)=>{let r=(()=>{switch(n.keepAspectRatioPolicy){case`not_larger`:return n.axes.length>0?Math.min(...n.axes.map(e=>t[e]),Number.MAX_VALUE):Math.min(...t,Number.MAX_VALUE);case`not_smaller`:return n.axes.length>0?Math.max(...n.axes.map(e=>t[e]),Number.MIN_VALUE):Math.max(...t,Number.MIN_VALUE);default:throw Error(`Keep aspect ratio policy ${n.keepAspectRatioPolicy} is not supported`)}})();t.fill(1,0,t.length);let i=e.slice();return n.axes.length>0?(n.axes.forEach(e=>t[e]=r),n.axes.forEach(n=>i[n]=Math.round(e[n]*t[n]))):(t.fill(r,0,t.length),i.forEach((e,n)=>i[n]=Math.round(e*t[n]))),i},Xu=(e,t,n,r,i)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> array<${e.type.value}, ${n.length}> {
      var original_indices: array<${e.type.value}, ${n.length}>;
      for (var i:u32 = 0; i < ${n.length}; i++) {
        var output_index = ${e.indicesGet(`output_indices`,`i`)};
        var scale = ${J(`uniforms.scales`,`i`,r)};
        var roi_low = ${J(`uniforms.roi`,`i`,i)};
        var roi_hi = ${J(`uniforms.roi`,`i + ${t.length}`,i)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${J(`uniforms.input_shape`,`i`,t.length)};
          var output_shape_i = ${J(`uniforms.output_shape`,`i`,n.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,Zu=(e,t,n,r,i,a,o)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
      var input_indices: ${e.type.indices};
      for (var i:u32 = 0; i < ${r.length}; i++) {
        var output_index = ${t.indicesGet(`output_indices`,`i`)};
        var input_index: u32;
        var scale = ${J(`uniforms.scales`,`i`,i)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${J(`uniforms.roi`,`i`,a)};
          var roi_hi = ${J(`uniforms.roi`,`i + ${n.length}`,a)};
          var input_shape_i = ${J(`uniforms.input_shape`,`i`,n.length)};
          var output_shape_i = ${J(`uniforms.output_shape`,`i`,r.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${o} || (original_idx >= 0 && original_idx < ${t.type.value}(input_shape_i))) {
            if (original_idx < 0) {
              input_index = 0;
            } else if (original_idx > ${t.type.value}(input_shape_i - 1)) {
              input_index = input_shape_i - 1;
            } else {
              input_index = u32(getNearestPixelFromOriginal(original_idx, scale < 1));
            }
          } else {
            input_index = u32(original_idx);
          }
        }
        ${e.indicesSet(`input_indices`,`i`,`input_index`)}
      }
      return input_indices;
    }`,Qu=(e,t)=>`
    fn checkInputIndices(input_indices: ${e.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var input_index = ${e.indicesGet(`input_indices`,`i`)};
        if (input_index < 0 || input_index >= ${J(`uniforms.input_shape`,`i`,t.length)}) {
          return false;
        }
      }
      return true;
    }`,$u=(e,t,n,r)=>e.rank>r?`
    ${e.indicesSet(`input_indices`,t,`channel`)};
    ${e.indicesSet(`input_indices`,n,`batch`)};
`:``,ed=(e,t,n,r,i)=>{let[a,o,s,c]=n.length===2?[-1,0,1,-1]:[0,2,3,1],l=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${l} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet(`input_indices`,o,`max(0, min(row, ${n[o]} - 1))`)};
      ${e.indicesSet(`input_indices`,s,`max(0, min(col, ${n[s]} - 1))`)};
      ${$u(e,c,a,2)}
      return ${e.getByIndices(`input_indices`)};
    }

    fn bilinearInterpolation(output_indices: ${t.type.indices}) -> ${l} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${l} = originalIndices[${o}];
      var col:${l} = originalIndices[${s}];
      ${r?`if (row < 0 || row > (${n[o]} - 1) || col < 0 || col > (${n[s]} - 1)) {
        return ${i};
      }`:``};
      row = max(0, min(row, ${n[o]} - 1));
      col = max(0, min(col, ${n[s]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${n.length>2?`u32(originalIndices[${c}])`:`0`};
      var batch: u32 =  ${n.length>2?`u32(originalIndices[${a}])`:`0`};
      var x11: ${l} = getInputValue(batch, channel, row1, col1);
      var x12: ${l} = getInputValue(batch, channel, row1, col2);
      var x21: ${l} = getInputValue(batch, channel, row2, col1);
      var x22: ${l} = getInputValue(batch, channel, row2, col2);
      var dx1: ${l} = abs(row - ${l}(row1));
      var dx2: ${l} = abs(${l}(row2) - row);
      var dy1: ${l} = abs(col - ${l}(col1));
      var dy2: ${l} = abs(${l}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},td=(e,t,n,r,i,a,o,s,c,l)=>{let[u,d]=n.length===2?[0,1]:[2,3],f=e.type.value,p=o=>{let d=o===u?`row`:`col`;return`
      fn ${d}CubicInterpolation(input_indices: ${e.type.indices}, output_indices: ${t.type.indices}) -> ${f} {
        var output_index = ${t.indicesGet(`output_indices`,o)};
        var originalIdx: ${f} = getOriginalCoordinateFromResizedCoordinate(output_index, ${i[o]},
        ${r[o]}, ${n[o]}, ${a[o]}, ${a[o]} + ${n.length});
        var fractOriginalIdx: ${f} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${s} && (originalIdx < 0 || originalIdx > (${n[o]} - 1))) {
          return ${c};
        }
        var data: array<${f}, 4> = array<${f}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${d}: ${f} = originalIdx + ${f}(i);
          if (${d} < 0 || ${d} >= ${n[o]}) {
            ${l?`coefs[i + 1] = 0.0;
                        continue;`:s?`return ${c};`:`${d} = max(0, min(${d}, ${n[o]} - 1));`};
          }
        var input_indices_copy: ${e.type.indices} = input_indices;
          ${e.indicesSet(`input_indices_copy`,o,`u32(${d})`)};
          data[i + 1] = ${o===u?e.getByIndices(`input_indices_copy`):`rowCubicInterpolation(input_indices_copy, output_indices)`};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${p(u)};
    ${p(d)};
  fn getCubicInterpolationCoefs(s: ${f}) -> array<${f}, 4> {
    var absS = abs(s);
    var coeffs: array<${f}, 4> = array<${f}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${f} = 1.0 - absS;
    var twoMinusAbsS: ${f} = 2.0 - absS;
    var onePlusAbsS: ${f} = 1.0 + absS;
    coeffs[0] = ((${o} * onePlusAbsS - 5 * ${o}) * onePlusAbsS + 8 * ${o}) * onePlusAbsS - 4 * ${o};
    coeffs[1] = ((${o} + 2) * absS - (${o} + 3)) * absS * absS + 1;
    coeffs[2] = ((${o} + 2) * oneMinusAbsS - (${o} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${o} * twoMinusAbsS - 5 * ${o}) * twoMinusAbsS + 8 * ${o}) * twoMinusAbsS - 4 * ${o};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${f}, 4>, coefs: array<${f}, 4>) -> ${f} {
    var coefsSum: ${f} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${t.type.indices}) -> ${f} {
    var input_indices: ${e.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},nd=(e,t,n,r,i)=>{let[a,o,s,c,l]=n.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],u=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${u} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet(`input_indices`,o,`max(0, min(depth, ${n[o]} - 1))`)};
      ${e.indicesSet(`input_indices`,s,`max(0, min(height, ${n[s]} - 1))`)};
      ${e.indicesSet(`input_indices`,c,`max(0, min(width, ${n[c]} - 1))`)};
      ${$u(e,l,a,3)}
      return ${e.getByIndices(`input_indices`)};
    }

    fn trilinearInterpolation(output_indices: ${t.type.indices}) -> ${u} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${u} = originalIndices[${o}];
      var height:${u} = originalIndices[${s}];
      var width:${u} = originalIndices[${c}];
      ${r?`if (depth < 0 || depth > (${n[o]} - 1) || height < 0 || height > (${n[s]} - 1) || width < 0 || (width > ${n[c]} - 1)) {
      return ${i};
        }`:``};

    depth = max(0, min(depth, ${n[o]} - 1));
      height = max(0, min(height, ${n[s]} - 1));
      width = max(0, min(width, ${n[c]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${n.length>3?`u32(originalIndices[${l}])`:`0`};
      var batch: u32 =  ${n.length>3?`u32(originalIndices[${a}])`:`0`};

      var x111: ${u} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${u} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${u} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${u} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${u} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${u} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${u} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${u} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${u} = abs(depth - ${u}(depth1));
      var dx2: ${u} = abs(${u}(depth2) - depth);
      var dy1: ${u} = abs(height - ${u}(height1));
      var dy2: ${u} = abs(${u}(height2) - height);
      var dz1: ${u} = abs(width - ${u}(width1));
      var dz2: ${u} = abs(${u}(width2) - width);
      if (depth1 == depth2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (height1 == height2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      if (width1 == width2) {
        dz1 = 0.5;
        dz2 = 0.5;
      }
      return (x111 * dx2 * dy2 * dz2 + x112 * dx2 * dy2 * dz1 + x121 * dx2 * dy1 *dz2 + x122 * dx2 * dy1 * dz1 +
              x211 * dx1 * dy2 * dz2 + x212 * dx1 * dy2 * dz1 + x221 * dx1 * dy1 *dz2 + x222 * dx1 * dy1 * dz1);
    }`},rd=(e,t,n,r,i,a)=>{let o=e.dims,s=qu(a,t.axes,o.length),c=Ju(o,r,i,t.axes),l=r.slice();r.length===0&&(l=o.map((e,t)=>e===0?1:c[t]/e),t.keepAspectRatioPolicy!==`stretch`&&(c=Yu(o,l,t)));let u=Z(`output`,e.dataType,c.length),d=X(`input`,e.dataType,o.length),f=V.size(c),p=o.length===c.length&&o.every((e,t)=>e===c[t]),m=t.coordinateTransformMode===`tf_crop_and_resize`,h=t.extrapolationValue,g=d.type.value;return{name:`Resize`,shaderCache:{hint:`${t.cacheKey}|${n}|${l.length>0?t.mode===`cubic`?l:l.length:``}|${i.length>0?i:``}|${s.length>0?s:``}|${p}|${t.mode===`nearest`?o.length:o}`,inputDependencies:[`rank`]},getShaderSource:e=>`
      ${p?``:`
      ${Gu(t.coordinateTransformMode,g)};
      ${(()=>{switch(t.mode){case`nearest`:return`
              ${Qu(d,o)};
              ${Ku(t.nearestMode,n,g)};
              ${Zu(d,u,o,c,l.length,s.length,m)};
              `;case`linear`:return`
              ${Xu(u,o,c,l.length,s.length)};
              ${(()=>{if(o.length===2||o.length===4)return`${ed(d,u,o,m,h)}`;if(o.length===3||o.length===5)return`${nd(d,u,o,m,h)}`;throw Error(`Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.`)})()};
            `;case`cubic`:return`
            ${(()=>{if(o.length===2||o.length===4)return`${td(d,u,o,c,l,s,t.cubicCoeffA,m,t.extrapolationValue,t.excludeOutside)}`;throw Error(`Cubic mode only supports input dims 2 and 4 are supported in linear mode.`)})()};
            `;default:throw Error(`Invalid resize mode`)}})()};
      `}
      ${e.registerUniform(`output_size`,`u32`).registerUniform(`scales`,`f32`,l.length).registerUniform(`roi`,`f32`,s.length).declareVariables(d,u)}
      ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
        ${p?`output[global_idx] = input[global_idx];`:`
        let output_indices = ${u.offsetToIndices(`global_idx`)};
        var input_indices: ${d.type.indices};
        ${(()=>{switch(t.mode){case`nearest`:return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${d.getByIndices(`input_indices`)};
                } else {
                  output[global_idx] = ${t.extrapolationValue};
                }`;case`linear`:return`output[global_idx] = ${o.length===2||o.length===4?`bilinearInterpolation`:`trilinearInterpolation`}(output_indices);`;case`cubic`:return`output[global_idx] = bicubicInterpolation(output_indices);`;default:throw Error(`Unsupported resize mode: ${t.mode}`)}})()};
`}
      }`,getRunData:()=>({outputs:[{dims:c,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},{type:1,data:l},{type:1,data:s},...G(o,c)]})}},id=e=>{let t=e.customDataBuffer;return new Uint32Array(t.buffer,t.byteOffset,1)[0]},ad=(e,t)=>{let n=[],r=[],i=[],a=id(e);if(t.antialias!==0)throw Error(`Only default value (0) for Antialias attribute is supported`);Uu(e.inputs,t,a,n,r,i),e.compute(rd(e.inputs[0],t,a,n,r,i),{inputs:[0]})},od=e=>{let t=e.antialias,n=e.axes,r=e.coordinateTransformMode,i=e.cubicCoeffA,a=e.excludeOutside!==0,o=e.extrapolationValue,s=e.keepAspectRatioPolicy,c=e.mode,l=e.nearestMode===``?`simple`:e.nearestMode;return U({antialias:t,axes:n,coordinateTransformMode:r,cubicCoeffA:i,excludeOutside:a,extrapolationValue:o,keepAspectRatioPolicy:s,mode:c,nearestMode:l})}}),cd,ld,ud,dd=N(()=>{z(),H(),Q(),cd=e=>{if(!e||e.length<3)throw Error(`layerNorm requires at least 3 inputs.`);let t=e[0],n=e[1],r=e[2];if(t.dataType!==n.dataType||t.dataType!==r.dataType)throw Error(`All inputs must have the same data type`);if(t.dims.length!==3&&t.dims.length!==2)throw Error(`Input must be 2D or 3D`);if(n.dims.length!==3&&n.dims.length!==2)throw Error(`Skip must be 2D or 3D`);let i=t.dims[t.dims.length-1],a=t.dims[t.dims.length-2];if(n.dims[n.dims.length-1]!==i)throw Error(`Skip must have the same hidden size as input`);if(n.dims[n.dims.length-2]!==a)throw Error(`Skip must have the same sequence length as input`);if(r.dims.length!==1)throw Error(`Gamma must be 1D`);if(r.dims[r.dims.length-1]!==i)throw Error(`Gamma must have the same hidden size as input`);if(e.length>3){let t=e[3];if(t.dims.length!==1)throw Error(`Beta must be 1D`);if(t.dims[t.dims.length-1]!==i)throw Error(`Beta must have the same hidden size as input`)}if(e.length>4){let t=e[4];if(t.dims.length!==1)throw Error(`Bias must be 1D`);if(t.dims[t.dims.length-1]!==i)throw Error(`Bias must have the same hidden size as input`)}},ld=(e,t,n,r)=>{let i=t.simplified,a=e[0].dims,o=V.size(a),s=a,c=o,l=a.slice(-1)[0],u=r?a.slice(0,-1).concat(1):[],d=!i&&e.length>3,f=e.length>4,p=r&&n>1,m=r&&n>2,h=n>3,g=K(l),_=[{type:12,data:c},{type:12,data:g},{type:12,data:l},{type:1,data:t.epsilon}],v=t=>{let n=[{name:`output_size`,type:`u32`},{name:`components`,type:`u32`},{name:`hidden_size`,type:`u32`},{name:`epsilon`,type:`f32`}],r=[X(`x`,e[0].dataType,e[0].dims,g),X(`skip`,e[1].dataType,e[1].dims,g),X(`gamma`,e[2].dataType,e[2].dims,g)];d&&r.push(X(`beta`,e[3].dataType,e[3].dims,g)),f&&r.push(X(`bias`,e[4].dataType,e[4].dims,g)),r.push(Z(`output`,e[0].dataType,s,g)),p&&r.push(Z(`mean_output`,1,u)),m&&r.push(Z(`inv_std_output`,1,u)),h&&r.push(Z(`input_skip_bias_sum`,e[0].dataType,s,g));let a=Sr(e[0].dataType),o=Sr(1,g);return`

      ${t.registerUniforms(n).declareVariables(...r)}
      var<workgroup> sum_shared : array<${o}, 64>;
      var<workgroup> sum_squared_shared : array<${o}, 64>;

      ${t.mainStart([64,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / 64;

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / 64;
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == 63) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${f?`bias[offset1d + i]`:a+`(0.0)`};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${h?`input_skip_bias_sum[offset + i] = value;`:``}
          output[offset + i] = value;
          let f32_value = ${q(a,g,`value`)};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = 64;
        for (var curr_size = reduce_size >> 1;  curr_size > 0; curr_size = reduce_size >> 1) {
          reduce_size = curr_size + (reduce_size & 1);
          if (ix < curr_size) {
            sum_shared[ix] += sum_shared[ix + reduce_size];
            sum_squared_shared[ix] += sum_squared_shared[ix + reduce_size];
          }
          workgroupBarrier();
        }

        let sum = sum_shared[0];
        let square_sum = sum_squared_shared[0];
        let mean = ${Tr(`sum`,g)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${Tr(`square_sum`,g)} / f32(uniforms.hidden_size) ${i?``:`- mean * mean`} + uniforms.epsilon);
        ${p?`mean_output[global_idx] = mean;`:``}
        ${m?`inv_std_output[global_idx] = inv_std_dev;`:``}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${i?``:`- ${a}(mean)`}) *
            ${a}(inv_std_dev) * gamma[offset1d + i]
            ${d?`+ beta[offset1d + i]`:``};
        }
      }`},y=[{dims:s,dataType:e[0].dataType}];return n>1&&y.push({dims:u,dataType:1}),n>2&&y.push({dims:u,dataType:1}),n>3&&y.push({dims:a,dataType:e[0].dataType}),{name:`SkipLayerNormalization`,shaderCache:{hint:`${g};${p};${m};${h}`,inputDependencies:e.map((e,t)=>`type`)},getShaderSource:v,getRunData:()=>({outputs:y,dispatchGroup:{x:Math.ceil(c/l)},programUniforms:_})}},ud=(e,t)=>{cd(e.inputs);let n=[0];e.outputCount>1&&n.push(-3),e.outputCount>2&&n.push(-3),e.outputCount>3&&n.push(3),e.compute(ld(e.inputs,t,e.outputCount,!1),{outputs:n})}}),fd,pd,md,hd,gd,_d,vd,yd,bd=N(()=>{z(),H(),W(),Q(),fd=(e,t)=>{if(!e||e.length<1)throw Error(`too few inputs`);if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw Error(`axes, starts and ends must have the same length`)}else if(t.starts.length!==t.ends.length)throw Error(`starts and ends must have the same length`);e.slice(1).forEach((t,n)=>{if(e[n+1].dataType!==6&&e[n+1].dataType!==7)throw Error(`Input ${n} must be an array of int32 or int64`)})},pd=(e,t)=>{let n=[];if(e.length>t){if(e[t].dataType===7)e[t].getBigInt64Array().forEach(e=>n.push(Number(e)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(e=>n.push(Number(e)));else throw Error(`Input ${t} must be an array of int32 or int64`)}return n},md=(e,t)=>{if(e.length>1){let t=pd(e,1),n=pd(e,2),r=pd(e,3);return r.length===0&&(r=[...Array(e[0].dims.length).keys()]),U({starts:t,ends:n,axes:r})}return t},hd=(e,t,n,r,i)=>{let a=e;return e<0&&(a+=n[r[t]]),i[t]<0?Math.max(0,Math.min(a,n[r[t]]-1)):Math.max(0,Math.min(a,n[r[t]]))},gd=(e,t,n)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${n.length-1}; i >= 0; i--) {
            let input_shape_i = ${J(`uniforms.input_shape`,`i`,n.length)};
            let steps_i = ${J(`uniforms.steps`,`i`,n.length)};
            let signs_i = ${J(`uniforms.signs`,`i`,n.length)};
            let starts_i = ${J(`uniforms.starts`,`i`,n.length)};
            var output_index = ${t.indicesGet(`output_indices`,`i`)};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${e.indicesSet(`input_indices`,`i`,`input_index`)};
          }
          return input_indices;
      }`,_d=(e,t)=>{let n=e[0].dims,r=V.size(n),i=t.axes.length>0?V.normalizeAxes(t.axes,n.length):[...Array(n.length).keys()],a=pd(e,4);a.forEach(e=>e!==0||(()=>{throw Error(`step cannot be 0`)})),a.length===0&&(a=Array(i.length).fill(1));let o=t.starts.map((e,t)=>hd(e,t,n,i,a)),s=t.ends.map((e,t)=>hd(e,t,n,i,a));if(i.length!==o.length||i.length!==s.length)throw Error(`start, ends and axes should have the same number of elements`);if(i.length!==n.length)for(let e=0;e<n.length;++e)i.includes(e)||(o.splice(e,0,0),s.splice(e,0,n[e]),a.splice(e,0,1));let c=a.map(e=>Math.sign(e));a.forEach((e,t,n)=>{if(e<0){let r=(s[t]-o[t])/e,i=o[t],c=i+r*a[t];o[t]=c,s[t]=i,n[t]=-e}});let l=n.slice(0);i.forEach((e,t)=>{l[e]=Math.ceil((s[e]-o[e])/a[e])});let u={dims:l,dataType:e[0].dataType},d=Z(`output`,e[0].dataType,l.length),f=X(`input`,e[0].dataType,e[0].dims.length),p=V.size(l),m=[{name:`outputSize`,type:`u32`},{name:`starts`,type:`u32`,length:o.length},{name:`signs`,type:`i32`,length:c.length},{name:`steps`,type:`u32`,length:a.length}],h=[{type:12,data:p},{type:12,data:o},{type:6,data:c},{type:12,data:a},...G(e[0].dims,l)];return{name:`Slice`,shaderCache:{hint:`${c.length}_${o.length}_${a.length}`,inputDependencies:[`rank`]},getShaderSource:e=>`
      ${e.registerUniforms(m).declareVariables(f,d)}
        ${gd(f,d,n)}
        ${e.mainStart()}
          ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.outputSize`)}
          let output_indices = ${d.offsetToIndices(`global_idx`)};
          let input_indices = calculateInputIndices(output_indices);
          ${d.setByOffset(`global_idx`,f.getByIndices(`input_indices`))}
      }`,getRunData:()=>({outputs:[u],dispatchGroup:{x:Math.ceil(r/64)},programUniforms:h})}},vd=(e,t)=>{fd(e.inputs,t);let n=md(e.inputs,t);e.compute(_d(e.inputs,n),{inputs:[0]})},yd=e=>{let t=e.starts,n=e.ends,r=e.axes;return U({starts:t,ends:n,axes:r})}}),xd,Sd,Cd,wd,Td=N(()=>{z(),H(),W(),zr(),Q(),xd=e=>{if(!e||e.length!==1)throw Error(`Softmax op requires 1 input.`)},Sd=(e,t)=>{let n=e.inputs[0],r=n.dims,i=V.size(r),a=r.length,o=V.normalizeAxis(t.axis,a),s=o<r.length-1,c,l=[];s?(l=Array.from({length:a},(e,t)=>t),l[o]=a-1,l[a-1]=o,c=e.compute(Ir(n,l),{inputs:[n],outputs:[-1]})[0]):c=n;let u=c.dims,d=u[a-1],f=i/d,p=K(d),m=d/p,h=64;f===1&&(h=256);let g=(e,t)=>t===4?`max(max(${e}.x, ${e}.y), max(${e}.z, ${e}.w))`:t===2?`max(${e}.x, ${e}.y)`:t===3?`max(max(${e}.x, ${e}.y), ${e}.z)`:e,_=X(`x`,c.dataType,c.dims,p),v=Z(`result`,c.dataType,c.dims,p),y=_.type.value,b=Sr(c.dataType)===`f32`?`var threadMax = ${y}(-3.4028234663852886e+38f);`:`var threadMax = ${y}(-65504.0h);`,x=e.compute({name:`Softmax`,shaderCache:{hint:`${p};${h}`,inputDependencies:[`type`]},getRunData:()=>({outputs:[{dims:u,dataType:c.dataType}],dispatchGroup:{x:f},programUniforms:[{type:6,data:m}]}),getShaderSource:e=>`
      var<workgroup> rowMaxShared : ${y};
      var<workgroup> rowSumShared : ${y};
      var<workgroup> threadShared : array<${y}, ${h}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${y} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${y}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${e.registerUniform(`packedCols`,`i32`).declareVariables(_,v)}
      ${e.mainStart(h)}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${h};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${b}
        for (var col = lindex; col < cols; col += wg) {
          let value = getValue(row, col, row_stride);
          threadMax = max(threadMax, value);
        }
        if (lindex < cols) {
          threadShared[lindex] = threadMax;
        }
        workgroupBarrier();

        var reduceSize = min(cols, wg);
        for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {
          reduceSize = currSize + (reduceSize & 1);
          if (lindex < currSize) {
            threadShared[lindex] = max(threadShared[lindex], threadShared[lindex + reduceSize]);
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowMaxShared = ${y}(${g(`threadShared[0]`,p)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${y}(0.0);
        for (var col = lindex; col < cols; col += wg) {
          let subExp = exp(getValue(row, col, row_stride) - rowMaxShared);
          threadSum += subExp;
        }
        threadShared[lindex] = threadSum;
        workgroupBarrier();

        for (var currSize = wg >> 1;  currSize > 0; currSize = currSize >> 1) {
          if (lindex < currSize) {
            threadShared[lindex] = threadShared[lindex] + threadShared[lindex + currSize];
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowSumShared = ${y}(${Tr(`threadShared[0]`,p)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          var value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          // max operation protects against NaN since all values should be >=0
          value = max(value, ${y}(0.0));
          setValue(row, col, row_stride, value);
        }
      }`},{inputs:[c],outputs:[s?-1:0]})[0];s&&e.compute(Ir(x,l),{inputs:[x]})},Cd=(e,t)=>{xd(e.inputs),Sd(e,t)},wd=e=>U({axis:e.axis})}),Ed,Dd,Od,kd,Ad,jd=N(()=>{z(),H(),Q(),Ed=e=>Array.from(e.getBigInt64Array(),Number),Dd=e=>{if(!e||e.length!==2)throw Error(`Tile requires 2 inputs.`);if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw Error(`Tile only support float, float16, int32, and uint32 data types`);if(e[1].dataType!==7)throw Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw Error("Tile `repeats` input should be 1-D");if(Ed(e[1]).length!==e[0].dims.length)throw Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},Od=(e,t)=>{let n=[];for(let r=0;r<e.length;++r)n.push(e[r]*t[r]);return n},kd=(e,t)=>{let n=e[0].dims,r=t??Ed(e[1]),i=Od(n,r),a=V.size(i),o=e[0].dataType,s=X(`input`,o,n.length),c=Z(`output`,o,i.length);return{name:`Tile`,shaderCache:{hint:`${r}`,inputDependencies:[`rank`]},getRunData:()=>({outputs:[{dims:i,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:[{type:12,data:a},...G(e[0].dims,i)]}),getShaderSource:e=>`
      const inputShape = ${s.indices(...n)};
      ${e.registerUniform(`output_size`,`u32`).declareVariables(s,c)}
      ${e.mainStart()}
      ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.output_size`)}
      let output_indices = ${c.offsetToIndices(`global_idx`)};
      var input_indices: ${s.type.indices};
      for (var i = 0; i < ${n.length}; i++) {
        let input_dim_i = ${s.indicesGet(`uniforms.input_shape`,`i`)};
        let input_dim_value = ${c.indicesGet(`output_indices`,`i`)}  % input_dim_i;

        ${s.indicesSet(`input_indices`,`i`,`input_dim_value`)}
      }
      ${c.setByOffset(`global_idx`,s.getByIndices(`input_indices`))}
    }`}},Ad=e=>{Dd(e.inputs),e.compute(kd(e.inputs),{inputs:[0]})}}),Md,Nd,Pd,Fd=N(()=>{z(),H(),Q(),Md=(e,t,n,r,i)=>{let a=Z(`output_data`,i,n.length,4),o=X(`a_data`,t[1].dataType,t[1].dims.length,4),s=X(`b_data`,t[2].dataType,t[2].dims.length,4),c=X(`c_data`,t[0].dataType,t[0].dims.length,4),l,u=(e,t,n)=>`select(${t}, ${e}, ${n})`;if(!r)l=a.setByOffset(`global_idx`,u(o.getByOffset(`global_idx`),s.getByOffset(`global_idx`),c.getByOffset(`global_idx`)));else{let e=(e,t,n=``)=>{let r=`a_data[index_a${t}][component_a${t}]`,i=`b_data[index_b${t}][component_b${t}]`,l=`bool(c_data[index_c${t}] & (0xffu << (component_c${t} * 8)))`;return`
            let output_indices${t} = ${a.offsetToIndices(`global_idx * 4u + ${t}u`)};
            let offset_a${t} = ${o.broadcastedIndicesToOffset(`output_indices${t}`,a)};
            let offset_b${t} = ${s.broadcastedIndicesToOffset(`output_indices${t}`,a)};
            let offset_c${t} = ${c.broadcastedIndicesToOffset(`output_indices${t}`,a)};
            let index_a${t} = offset_a${t} / 4u;
            let index_b${t} = offset_b${t} / 4u;
            let index_c${t} = offset_c${t} / 4u;
            let component_a${t} = offset_a${t} % 4u;
            let component_b${t} = offset_b${t} % 4u;
            let component_c${t} = offset_c${t} % 4u;
            ${e}[${t}] = ${n}(${u(r,i,l)});
          `};l=i===9?`
            var data = vec4<u32>(0);
            ${e(`data`,0,`u32`)}
            ${e(`data`,1,`u32`)}
            ${e(`data`,2,`u32`)}
            ${e(`data`,3,`u32`)}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:`
            ${e(`output_data[global_idx]`,0)}
            ${e(`output_data[global_idx]`,1)}
            ${e(`output_data[global_idx]`,2)}
            ${e(`output_data[global_idx]`,3)}
          `}return`
        ${e.registerUniform(`vec_size`,`u32`).declareVariables(c,o,s,a)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes(`uniforms.vec_size`)}
        ${l}
      }`},Nd=e=>{let t=e[1].dims,n=e[2].dims,r=e[0].dims,i=e[1].dataType,a=!(V.areEqual(t,n)&&V.areEqual(n,r)),o=t,s=V.size(t);if(a){let e=zn.calcShape(zn.calcShape(t,n,!1),r,!1);if(!e)throw Error(`Can't perform where op on the given tensors`);o=e,s=V.size(o)}let c=Math.ceil(s/4);return{name:`Where`,shaderCache:{inputDependencies:[`rank`,`rank`,`rank`]},getShaderSource:t=>Md(t,e,o,a,i),getRunData:()=>({outputs:[{dims:o,dataType:i}],dispatchGroup:{x:Math.ceil(s/64/4)},programUniforms:[{type:12,data:c},...G(r,t,n,o)]})}},Pd=e=>{e.compute(Nd(e.inputs))}}),Id,Ld=N(()=>{zi(),Ji(),$i(),ra(),$a(),mo(),xo(),ms(),Es(),As(),Is(),ec(),fc(),vc(),xc(),Ec(),Ac(),Fc(),Bc(),Gc(),ol(),Ml(),Ll(),Vl(),Wl(),Xl(),ml(),ou(),Eu(),ju(),Fu(),Bu(),Pi(),sd(),El(),dd(),bd(),Td(),Sl(),jd(),zr(),Ya(),Fd(),Id=new Map([[`Abs`,[aa]],[`Acos`,[oa]],[`Acosh`,[sa]],[`Add`,[ro]],[`ArgMax`,[Li,Ri]],[`ArgMin`,[Ii,Ri]],[`Asin`,[ca]],[`Asinh`,[la]],[`Atan`,[ua]],[`Atanh`,[da]],[`Attention`,[qi]],[`AveragePool`,[_u,gu]],[`BatchNormalization`,[Qi]],[`BiasAdd`,[na]],[`BiasSplitGelu`,[Qa]],[`Cast`,[pa,fa]],[`Ceil`,[ga]],[`Clip`,[ha]],[`Concat`,[yo,bo]],[`Conv`,[ps,ls]],[`ConvTranspose`,[Ts,xs]],[`Cos`,[_a]],[`Cosh`,[va]],[`CumSum`,[Os,ks]],[`DepthToSpace`,[Ps,Fs]],[`DequantizeLinear`,[ku,Au]],[`DFT`,[Qs,$s]],[`Div`,[io]],[`Einsum`,[uc,dc]],[`Elu`,[ba,ya]],[`Equal`,[ao]],[`Erf`,[Sa]],[`Exp`,[Ca]],[`Expand`,[_c]],[`FastGelu`,[bc]],[`Floor`,[wa]],[`FusedConv`,[ps,ls]],[`Gather`,[Tc,wc]],[`GatherElements`,[zc,Rc]],[`GatherBlockQuantized`,[Nc,Pc]],[`GatherND`,[Oc,kc]],[`Gelu`,[Ta]],[`Gemm`,[Wc,Uc]],[`GlobalAveragePool`,[bu,yu]],[`GlobalMaxPool`,[Tu,wu]],[`Greater`,[lo]],[`GreaterOrEqual`,[fo]],[`GridSample`,[il,al]],[`GroupQueryAttention`,[jl]],[`HardSigmoid`,[Na,Ma]],[`HardSwish`,[Pa]],[`InstanceNormalization`,[Il]],[`LayerNormalization`,[Bl]],[`LeakyRelu`,[Ea,ya]],[`Less`,[uo]],[`LessOrEqual`,[po]],[`Log`,[Ga]],[`MatMul`,[Ul]],[`MatMulNBits`,[Jl,Yl]],[`MaxPool`,[Su,Cu]],[`Mul`,[oo]],[`MultiHeadAttention`,[pl,ll]],[`Neg`,[Oa]],[`Not`,[Da]],[`Pad`,[au]],[`Pow`,[so]],[`QuickGelu`,[Ja,ya]],[`Range`,[Pu]],[`Reciprocal`,[ka]],[`ReduceMin`,[ki]],[`ReduceMean`,[wi]],[`ReduceMax`,[Oi]],[`ReduceSum`,[ji]],[`ReduceProd`,[Ai]],[`ReduceL1`,[Ti]],[`ReduceL2`,[Ei]],[`ReduceLogSum`,[Ni]],[`ReduceLogSumExp`,[Di]],[`ReduceSumSquare`,[Mi]],[`Relu`,[Aa]],[`Resize`,[ad,od]],[`RotaryEmbedding`,[Tl]],[`ScatterND`,[zu,Ru]],[`Sigmoid`,[ja]],[`Sin`,[Fa]],[`Sinh`,[Ia]],[`Slice`,[vd,yd]],[`SkipLayerNormalization`,[ud]],[`Split`,[bl,xl]],[`Sqrt`,[La]],[`Softmax`,[Cd,wd]],[`Sub`,[co]],[`Tan`,[Ra]],[`Tanh`,[Ba]],[`ThresholdedRelu`,[Wa,ya]],[`Tile`,[Ad]],[`Transpose`,[Lr,Rr]],[`Where`,[Pd]]])}),Rd,zd=N(()=>{Et(),Ln(),Q(),Rd=class{constructor(e){this.backend=e,this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,t){this.repo.set(e,t)}run(e,t,n,r,i){pt(e.programInfo.name);let a=this.backend.device,o=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let s=[];for(let e of t)s.push({binding:s.length,resource:{buffer:e.buffer}});for(let e of n)s.push({binding:s.length,resource:{buffer:e.buffer}});i&&s.push({binding:s.length,resource:i});let c=a.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:s,label:e.programInfo.name});if(this.backend.sessionStatus===`capturing`){let t={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:c,dispatchGroup:r};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(t)}o.setPipeline(e.computePipeline),o.setBindGroup(0,c),o.dispatchWorkgroups(...r),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType===`at-passes`)&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),mt(e.programInfo.name)}dispose(){}build(e,t){pt(e.name);let n=this.backend.device,r=[];[{feature:`shader-f16`,extension:`f16`},{feature:`subgroups`,extension:`subgroups`}].forEach(e=>{n.features.has(e.feature)&&r.push(`enable ${e.extension};`)});let i=kr(t,this.backend.device.limits),a=e.getShaderSource(i),o=`${r.join(`
`)}
${i.additionalImplementations}
${a}`,s=n.createShaderModule({code:o,label:e.name});B(`verbose`,()=>`[WebGPU] ${e.name} shader code: ${o}`);let c=n.createComputePipeline({compute:{module:s,entryPoint:`main`},layout:`auto`,label:e.name});return mt(e.name),{programInfo:e,computePipeline:c,uniformVariablesInfo:i.variablesInfo}}normalizeDispatchGroupSize(e){let t=typeof e==`number`?e:e.x,n=typeof e==`number`?1:e.y||1,r=typeof e==`number`?1:e.z||1,i=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(t<=i&&n<=i&&r<=i)return[t,n,r];let a=t*n*r,o=Math.ceil(Math.sqrt(a));if(o>i){if(o=Math.ceil(Math.cbrt(a)),o>i)throw Error(`Total dispatch size exceeds WebGPU maximum.`);return[o,o,o]}return[o,o,1]}}}),Bd={};ke(Bd,{WebGpuBackend:()=>Wd});var Vd,Hd,Ud,Wd,Gd=N(()=>{Et(),z(),Ln(),Gn(),vr(),Ld(),zd(),Vd=(e,t)=>{if(t.length!==e.length)throw Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let n=[];for(let r=0;r<e.length;++r){let i=e[r].dataType;switch(t[r]){case`none`:n.push(``);break;case`type`:n.push(`${i}`);break;case`rank`:{let t=e[r].dims.length;n.push(`${i};${t}`);break}case`dims`:{let t=e[r].dims.join(`,`);n.push(`${i};${t}`);break}default:throw Error(`unsupported input dependency: ${t[r]}`)}}return n.join(`|`)},Hd=(e,t,n)=>{let r=e.name;return e.shaderCache?.hint&&(r+=`[`+e.shaderCache.hint+`]`),r+=`:`+n+`:${Vd(t,e.shaderCache?.inputDependencies??Array(t.length).fill(`dims`))}`,r},Ud=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Wd=class{constructor(){this.currentSessionId=null,this.currentKernelId=null,this.commandEncoder=null,this.computePassEncoder=null,this.maxDispatchNumber=16,this.pendingDispatchNumber=0,this.pendingKernels=[],this.pendingQueries=new Map,this.sessionStatus=`default`,this.capturedCommandList=new Map,this.capturedPendingKernels=new Map,this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw Error(`currentKernelCustomData(): currentKernelId is null. (should not happen)`);let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,t){this.env=e;let n=[],r={requiredLimits:{maxComputeWorkgroupStorageSize:t.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:t.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:t.limits.maxStorageBufferBindingSize,maxBufferSize:t.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:t.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:t.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:t.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:t.limits.maxComputeWorkgroupSizeZ},requiredFeatures:n},i=e=>t.features.has(e)&&n.push(e)&&!0;i(`chromium-experimental-timestamp-query-inside-passes`)||i(`timestamp-query`),i(`shader-f16`),i(`subgroups`),this.device=await t.requestDevice(r);let a=t,o=t.info??(typeof a.requestAdapterInfo==`function`?await a.requestAdapterInfo():void 0);this.adapterInfo=new Ud(o),this.gpuDataManager=_r(this),this.programManager=new Rd(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,Fn(e.logLevel,!!e.debug),this.device.onuncapturederror=e=>{e.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${e.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!0}),Object.defineProperty(this.env.webgpu,"adapter",{value:t,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<`u`&&this.querySet.destroy(),this.gpuDataManager.dispose(),this.device&&this.env?.webgpu&&this.device.lost.then(()=>{delete this.env.webgpu.device})}getCommandEncoder(){return this.commandEncoder||=this.device.createCommandEncoder(),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),t={};this.queryType===`at-passes`&&(t.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(t)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&=(this.computePassEncoder.end(),null)}flush(){if(!this.commandEncoder)return;pt(),this.endComputePass();let e;this.queryType!==`none`&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!==`none`&&e.mapAsync(GPUMapMode.READ).then(()=>{let t=new BigUint64Array(e.getMappedRange()),n=this.pendingQueries.get(e);for(let e=0;e<t.length/2;e++){let r=n[e],i=r.kernelId,a=this.kernels.get(i),o=a.kernelType,s=a.kernelName,c=r.programName,l=r.inputTensorViews,u=r.outputTensorViews,d=t[e*2],f=t[e*2+1];typeof this.queryTimeBase>`u`&&(this.queryTimeBase=d);let p=Number(d-this.queryTimeBase),m=Number(f-this.queryTimeBase);if(!Number.isSafeInteger(p)||!Number.isSafeInteger(m))throw RangeError(`incorrect timestamp range`);if(this.env.webgpu.profiling?.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:l.map(e=>({dims:e.dims,dataType:Sn(e.dataType)})),outputsMetadata:u.map(e=>({dims:e.dims,dataType:Sn(e.dataType)})),kernelId:i,kernelType:o,kernelName:s,programName:c,startTime:p,endTime:m});else{let e=``;l.forEach((t,n)=>{e+=`input[${n}]: [${t.dims}] | ${Sn(t.dataType)}, `});let t=``;u.forEach((e,n)=>{t+=`output[${n}]: [${e.dims}] | ${Sn(e.dataType)}, `}),console.log(`[profiling] kernel "${i}|${o}|${s}|${c}" ${e}${t}start time: ${p} ns, execution time: ${m-p} ns`)}dt(`GPU`,`${c}::${d}::${f}`)}e.unmap(),this.pendingQueries.delete(e)}),mt()}run(e,t,n,r,i,a){pt(e.name);let o=[];for(let e=0;e<t.length;++e){let n=t[e].data;if(n===0)continue;let r=this.gpuDataManager.get(n);if(!r)throw Error(`no GPU data for input: ${n}`);o.push(r)}let{outputs:s,dispatchGroup:c,programUniforms:l}=e.getRunData(t),u=n.length===0?s.map((e,t)=>t):n;if(u.length!==s.length)throw Error(`Output size ${u.length} must be equal to ${s.length}.`);let d=[],f=[];for(let e=0;e<s.length;++e){if(!Number.isInteger(u[e])||u[e]<-3||u[e]>=a)throw Error(`Invalid output index: ${u[e]}`);if(u[e]===-3)continue;let t=u[e]===-1,n=u[e]===-2,o=t||n?i(s[e].dataType,s[e].dims):r(u[e],s[e].dataType,s[e].dims);if(d.push(o),o.data===0)continue;let c=this.gpuDataManager.get(o.data);if(!c)throw Error(`no GPU data for output: ${o.data}`);if(t&&this.temporaryData.push(c),n){let e=this.kernelPersistentData.get(this.currentKernelId);e||(e=[],this.kernelPersistentData.set(this.currentKernelId,e)),e.push(c)}f.push(c)}if(o.length!==t.length||f.length!==d.length){if(f.length===0)return mt(e.name),d;throw Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let p;if(l){let e=0,t=[];l.forEach(n=>{let r=typeof n.data==`number`?[n.data]:n.data;if(r.length===0)return;let i=n.type===10?2:4,a,o;n.type===10?(o=r.length>4?16:r.length>2?8:r.length*i,a=r.length>4?16:i*r.length):(o=r.length<=2?r.length*i:16,a=16),e=Math.ceil(e/o)*o,t.push(e);let s=n.type===10?8:4;e+=r.length>4?Math.ceil(r.length/s)*a:r.length*i}),e=Math.ceil(e/16)*16;let n=new ArrayBuffer(e);l.forEach((e,r)=>{let i=t[r],a=typeof e.data==`number`?[e.data]:e.data;if(e.type===6)new Int32Array(n,i,a.length).set(a);else if(e.type===12)new Uint32Array(n,i,a.length).set(a);else if(e.type===10)new Uint16Array(n,i,a.length).set(a);else if(e.type===1)new Float32Array(n,i,a.length).set(a);else throw Error(`Unsupported uniform type: ${Sn(e.type)}`)});let r=this.gpuDataManager.create(e,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(r.buffer,0,n,0,e),this.gpuDataManager.release(r.id),p={offset:0,size:e,buffer:r.buffer}}let m=this.programManager.normalizeDispatchGroupSize(c),h=m[1]===1&&m[2]===1,g=Hd(e,t,h),_=this.programManager.getArtifact(g);if(_||(_=this.programManager.build(e,m),this.programManager.setArtifact(g,_),B(`info`,()=>`[artifact] key: ${g}, programName: ${e.name}`)),l&&_.uniformVariablesInfo){if(l.length!==_.uniformVariablesInfo.length)throw Error(`Uniform variables count mismatch: expect ${_.uniformVariablesInfo.length}, got ${l.length} in program "${_.programInfo.name}".`);for(let e=0;e<l.length;e++){let t=l[e],n=t.type,r=typeof t.data==`number`?1:t.data.length,[i,a]=_.uniformVariablesInfo[e];if(n!==i||r!==a)throw Error(`Uniform variable ${e} mismatch: expect type ${i} with size ${a}, got type ${n} with size ${r} in program "${_.programInfo.name}".`)}}if(B(`info`,()=>`[ProgramManager] run "${e.name}" (key=${g}) with ${m[0]}x${m[1]}x${m[2]}`),this.queryType!==`none`||this.sessionStatus===`capturing`){let e={kernelId:this.currentKernelId,programName:_.programInfo.name,inputTensorViews:t,outputTensorViews:d};this.pendingKernels.push(e),this.sessionStatus===`capturing`&&this.capturedPendingKernels.get(this.currentSessionId).push(e)}return this.programManager.run(_,o,f,m,p),mt(e.name),d}upload(e,t){this.gpuDataManager.upload(e,t)}memcpy(e,t){this.gpuDataManager.memcpy(e,t)}async download(e,t){await this.gpuDataManager.download(e,t)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,t,n,r){let i=Id.get(e);if(!i)throw Error(`kernel not implemented: ${e}`);let a={kernelType:e,kernelName:r,kernelEntry:i[0],attributes:[i[1],n]};this.kernels.set(t,a)}releaseKernel(e){let t=this.kernelPersistentData.get(e);if(t){for(let e of t)this.gpuDataManager.release(e.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,t,n){let r=this.kernels.get(e);if(!r)throw Error(`kernel not created: ${e}`);let i=r.kernelType,a=r.kernelName,o=r.kernelEntry,s=r.attributes;if(this.currentKernelId!==null)throw Error(`kernel "[${i}] ${a}" is not allowed to be called recursively`);this.currentKernelId=e,s[0]&&=(s[1]=s[0](s[1]),void 0),B(`info`,()=>`[WebGPU] Start to run kernel "[${i}] ${a}"...`);let c=this.env.debug;this.temporaryData=[];try{return c&&this.device.pushErrorScope(`validation`),o(t,s[1]),0}catch(e){return n.push(Promise.resolve(`[WebGPU] Kernel "[${i}] ${a}" failed. ${e}`)),1}finally{c&&n.push(this.device.popErrorScope().then(e=>e?`GPU validation error for kernel "[${i}] ${a}": ${e.message}`:null));for(let e of this.temporaryData)this.gpuDataManager.release(e.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,t,n,r){let i=this.sessionExternalDataMapping.get(e);i||(i=new Map,this.sessionExternalDataMapping.set(e,i));let a=i.get(t),o=this.gpuDataManager.registerExternalBuffer(n,r,a);return i.set(t,[o,n]),o}unregisterBuffers(e){let t=this.sessionExternalDataMapping.get(e);t&&(t.forEach(e=>this.gpuDataManager.unregisterExternalBuffer(e[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let t=this.gpuDataManager.get(e);if(!t)throw Error(`no GPU data for buffer: ${e}`);return t.buffer}createDownloader(e,t,n){return async()=>{let r=await hr(this,e,t);return Wn(r.buffer,n)}}writeTimestamp(e){this.queryType===`inside-passes`&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){this.queryType=`none`,(this.env.webgpu.profiling?.mode==="default"||(typeof this.env.trace>`u`?this.env.wasm.trace:this.env.trace))&&(this.device.features.has(`chromium-experimental-timestamp-query-inside-passes`)?this.queryType=`inside-passes`:this.device.features.has(`timestamp-query`)&&(this.queryType=`at-passes`),this.queryType!==`none`&&typeof this.querySet>`u`&&(this.querySet=this.device.createQuerySet({type:`timestamp`,count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){B(`info`,`captureBegin`),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus=`capturing`}captureEnd(){B(`info`,`captureEnd`),this.flush(),this.sessionStatus=`default`}replay(){B(`info`,`replay`),this.sessionStatus=`replaying`;let e=this.capturedCommandList.get(this.currentSessionId),t=this.capturedPendingKernels.get(this.currentSessionId),n=e.length;this.pendingKernels=[];for(let r=0;r<n;r++){let n=this.getComputePassEncoder(),i=e[r];this.writeTimestamp(this.pendingDispatchNumber*2),n.setPipeline(i.computePipeline),n.setBindGroup(0,i.bindGroup),n.dispatchWorkgroups(...i.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!==`none`&&this.pendingKernels.push(t[r]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType===`at-passes`)&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus=`default`}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}}),Kd={};ke(Kd,{init:()=>Yd});var qd,Jd,Yd,Xd=N(()=>{z(),Ln(),H(),sr(),qd=class e{constructor(e,t,n,r){this.module=e,this.dataType=t,this.data=n,this.dims=r}getFloat32Array(){if(this.dataType!==1)throw Error(`Invalid data type`);let e=V.size(this.dims);return e===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,e)}getBigInt64Array(){if(this.dataType!==7)throw Error(`Invalid data type`);let e=V.size(this.dims);return e===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,e)}getInt32Array(){if(this.dataType!==6)throw Error(`Invalid data type`);let e=V.size(this.dims);return e===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,e)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw Error(`Invalid data type`);let e=V.size(this.dims);return e===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,e)}reshape(t){if(V.size(t)!==V.size(this.dims))throw Error(`Invalid new shape`);return new e(this.module,this.dataType,this.data,t)}},Jd=class{constructor(e,t,n){this.module=e,this.backend=t,this.customDataOffset=0,this.customDataSize=0,this.adapterInfo=t.adapterInfo;let r=e.PTR_SIZE,i=n/e.PTR_SIZE,a=r===4?`i32`:`i64`;this.opKernelContext=Number(e.getValue(r*i++,a));let o=Number(e.getValue(r*i++,a));this.outputCount=Number(e.getValue(r*i++,a)),this.customDataOffset=Number(e.getValue(r*i++,`*`)),this.customDataSize=Number(e.getValue(r*i++,a));let s=[];for(let t=0;t<o;t++){let t=Number(e.getValue(r*i++,a)),n=Number(e.getValue(r*i++,`*`)),o=Number(e.getValue(r*i++,a)),c=[];for(let t=0;t<o;t++)c.push(Number(e.getValue(r*i++,a)));s.push(new qd(e,t,n,c))}this.inputs=s}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,t){let n=t?.inputs?.map(e=>typeof e==`number`?this.inputs[e]:e)??this.inputs,r=t?.outputs??[];return this.backend.run(e,n,r,(e,t,n)=>new qd(this.module,t,this.output(e,n),n),(e,t)=>{let n=Cn(e,t);if(!n)throw Error(`Unsupported data type: ${e}`);let r=n>0?this.backend.gpuDataManager.create(n).id:0;return new qd(this.module,e,r,t)},this.outputCount)}output(e,t){let n=this.module.stackSave();try{let n=this.module.PTR_SIZE,r=n===4?`i32`:`i64`,i=this.module.stackAlloc((1+t.length)*n);this.module.setValue(i,t.length,r);for(let e=0;e<t.length;e++)this.module.setValue(i+n*(e+1),t[e],r);return this.module._JsepOutput(this.opKernelContext,e,i)}catch(n){throw Error(`Failed to generate kernel's output[${e}] with dims [${t}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${n}`)}finally{this.module.stackRestore(n)}}},Yd=async(e,t,n,r)=>{let i=t.jsepInit;if(!i)throw Error(`Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.`);if(e===`webgpu`){let e=(Gd(),je(Bd)).WebGpuBackend,a=new e;await a.initialize(n,r),i(`webgpu`,[a,e=>a.alloc(Number(e)),e=>a.free(e),(e,n,r,i=!1)=>{if(i)B(`verbose`,()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(e)}, dst=${Number(n)}, size=${Number(r)}`),a.memcpy(Number(e),Number(n));else{B(`verbose`,()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(e)}, gpuDataId=${Number(n)}, size=${Number(r)}`);let i=t.HEAPU8.subarray(Number(e>>>0),Number(e>>>0)+Number(r));a.upload(Number(n),i)}},async(e,n,r)=>{B(`verbose`,()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${e}, dataOffset=${n}, size=${r}`),await a.download(Number(e),()=>t.HEAPU8.subarray(Number(n)>>>0,Number(n+r)>>>0))},(e,n,r)=>a.createKernel(e,Number(n),r,t.UTF8ToString(t._JsepGetNodeName(Number(n)))),e=>a.releaseKernel(e),(e,n,r,i)=>{B(`verbose`,()=>`[WebGPU] jsepRun: sessionHandle=${r}, kernel=${e}, contextDataOffset=${n}`);let o=new Jd(t,a,Number(n));return a.computeKernel(Number(e),o,i)},()=>a.captureBegin(),()=>a.captureEnd(),()=>a.replay()])}else{let e=new or(n);i(`webnn`,[e,()=>e.reserveTensorId(),t=>e.releaseTensorId(t),async(t,n,r,i,a)=>e.ensureTensor(t,n,r,i,a),(t,n)=>{e.uploadTensor(t,n)},async(t,n)=>e.downloadTensor(t,n),(t,n)=>e.registerMLContext(t,n),!!n.trace])}}}),Zd,Qd,$d,ef,tf,nf,rf,af,of,sf,cf,lf,uf,df=N(()=>{Et(),pn(),bn(),z(),cn(),dn(),An(),Zd=(e,t)=>{L()._OrtInit(e,t)!==0&&R(`Can't initialize onnxruntime.`)},Qd=async e=>{Zd(e.wasm.numThreads,Tn(e.logLevel))},$d=async(e,t)=>{L().asyncInit?.();let n=e.webgpu.adapter;if(t===`webgpu`){if(typeof navigator>`u`||!navigator.gpu)throw Error(`WebGPU is not supported in current environment`);if(n){if(typeof n.limits!=`object`||typeof n.features!=`object`||typeof n.requestDevice!=`function`)throw Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let t=e.webgpu.powerPreference;if(t!==void 0&&t!==`low-power`&&t!==`high-performance`)throw Error(`Invalid powerPreference setting: "${t}"`);let r=e.webgpu.forceFallbackAdapter;if(r!==void 0&&typeof r!=`boolean`)throw Error(`Invalid forceFallbackAdapter setting: "${r}"`);if(n=await navigator.gpu.requestAdapter({powerPreference:t,forceFallbackAdapter:r}),!n)throw Error(`Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.`)}}if(t===`webnn`&&(typeof navigator>`u`||!navigator.ml))throw Error(`WebNN is not supported in current environment`);{let r=(Xd(),je(Kd)).init;t===`webgpu`&&await r(`webgpu`,L(),e,n),t===`webnn`&&await r(`webnn`,L(),e)}},ef=new Map,tf=e=>{let t=L(),n=t.stackSave();try{let n=t.PTR_SIZE,r=t.stackAlloc(2*n);t._OrtGetInputOutputCount(e,r,r+n)!==0&&R(`Can't get session input/output count.`);let i=n===4?`i32`:`i64`;return[Number(t.getValue(r,i)),Number(t.getValue(r+n,i))]}finally{t.stackRestore(n)}},nf=(e,t)=>{let n=L(),r=n.stackSave(),i=0;try{let r=n.PTR_SIZE,a=n.stackAlloc(2*r);n._OrtGetInputOutputMetadata(e,t,a,a+r)!==0&&R(`Can't get session input/output metadata.`);let o=Number(n.getValue(a,`*`));i=Number(n.getValue(a+r,`*`));let s=n.HEAP32[i/4];if(s===0)return[o,0];let c=n.HEAPU32[i/4+1],l=[];for(let e=0;e<c;e++){let t=Number(n.getValue(i+8+e*r,`*`));l.push(t===0?Number(n.getValue(i+8+(e+c)*r,`*`)):n.UTF8ToString(t))}return[o,s,l]}finally{n.stackRestore(r),i!==0&&n._OrtFree(i)}},rf=e=>{let t=L(),n=t._malloc(e.byteLength);if(n===0)throw Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,n),[n,e.byteLength]},af=async(e,t)=>{let n,r,i=L();Array.isArray(e)?[n,r]=e:e.buffer===i.HEAPU8.buffer?[n,r]=[e.byteOffset,e.byteLength]:[n,r]=rf(e);let a=0,o=0,s=0,c=[],l=[],u=[];try{if([o,c]=await yn(t),t?.externalData&&i.mountExternalData){let e=[];for(let n of t.externalData){let t=typeof n==`string`?n:n.path,r=typeof n==`string`?n:n.data;e.push(kn(r).then(e=>{i.mountExternalData(t,e)}))}await Promise.all(e)}for(let e of t?.executionProviders??[])if((typeof e==`string`?e:e.name)===`webnn`){if(i.shouldTransferToMLTensor=!1,typeof e!=`string`){let t=e,n=t?.context,r=t?.gpuDevice,a=t?.deviceType,o=t?.powerPreference;i.currentContext=n||(r?await i.webnnCreateMLContext(r):await i.webnnCreateMLContext({deviceType:a,powerPreference:o}))}else i.currentContext=await i.webnnCreateMLContext();break}a=await i._OrtCreateSession(n,r,o),i.webgpuOnCreateSession?.(a),a===0&&R(`Can't create a session.`),i.jsepOnCreateSession?.(),i.currentContext&&(i.webnnRegisterMLContext(a,i.currentContext),i.currentContext=void 0,i.shouldTransferToMLTensor=!0);let[e,d]=tf(a),f=!!t?.enableGraphCapture,p=[],m=[],h=[],g=[],_=[];for(let t=0;t<e;t++){let[e,n,r]=nf(a,t);e===0&&R(`Can't get an input name.`),l.push(e);let o=i.UTF8ToString(e);p.push(o),h.push(n===0?{name:o,isTensor:!1}:{name:o,isTensor:!0,type:Sn(n),shape:r})}for(let n=0;n<d;n++){let[r,o,s]=nf(a,n+e);r===0&&R(`Can't get an output name.`),u.push(r);let c=i.UTF8ToString(r);m.push(c),g.push(o===0?{name:c,isTensor:!1}:{name:c,isTensor:!0,type:Sn(o),shape:s});{if(f&&t?.preferredOutputLocation===void 0){_.push(`gpu-buffer`);continue}let e=typeof t?.preferredOutputLocation==`string`?t.preferredOutputLocation:t?.preferredOutputLocation?.[c]??`cpu`,n=i.webnnIsGraphOutput;if(e===`cpu`&&n&&n(a,c)){_.push(`ml-tensor-cpu-output`);continue}if(e!==`cpu`&&e!==`cpu-pinned`&&e!==`gpu-buffer`&&e!==`ml-tensor`)throw Error(`Not supported preferred output location: ${e}.`);if(f&&e!==`gpu-buffer`)throw Error(`Not supported preferred output location: ${e}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);_.push(e)}}let v=null;return _.some(e=>e===`gpu-buffer`||e===`ml-tensor`||e===`ml-tensor-cpu-output`)&&(s=i._OrtCreateBinding(a),s===0&&R(`Can't create IO binding.`),v={handle:s,outputPreferredLocations:_,outputPreferredLocationsEncoded:_.map(e=>e===`ml-tensor-cpu-output`?`ml-tensor`:e).map(e=>On(e))}),ef.set(a,[a,l,u,v,f,!1]),[a,p,m,h,g]}catch(e){throw l.forEach(e=>i._OrtFree(e)),u.forEach(e=>i._OrtFree(e)),s!==0&&i._OrtReleaseBinding(s)!==0&&R(`Can't release IO binding.`),a!==0&&i._OrtReleaseSession(a)!==0&&R(`Can't release session.`),e}finally{i._free(n),o!==0&&i._OrtReleaseSessionOptions(o)!==0&&R(`Can't release session options.`),c.forEach(e=>i._free(e)),i.unmountExternalData?.()}},of=e=>{let t=L(),n=ef.get(e);if(!n)throw Error(`cannot release session. invalid session id: ${e}`);let[r,i,a,o,s]=n;o&&(s&&t._OrtClearBoundOutputs(o.handle)!==0&&R(`Can't clear bound outputs.`),t._OrtReleaseBinding(o.handle)!==0&&R(`Can't release IO binding.`)),t.jsepOnReleaseSession?.(e),t.webnnOnReleaseSession?.(e),t.webgpuOnReleaseSession?.(e),i.forEach(e=>t._OrtFree(e)),a.forEach(e=>t._OrtFree(e)),t._OrtReleaseSession(r)!==0&&R(`Can't release session.`),ef.delete(e)},sf=async(e,t,n,r,i,a,o=!1)=>{if(!e){t.push(0);return}let s=L(),c=s.PTR_SIZE,l=e[0],u=e[1],d=e[3],f=d,p,m;if(l===`string`&&(d===`gpu-buffer`||d===`ml-tensor`))throw Error(`String tensor is not supported on GPU.`);if(o&&d!==`gpu-buffer`)throw Error(`External buffer must be provided for input/output index ${a} when enableGraphCapture is true.`);if(d===`gpu-buffer`){let t=e[2].gpuBuffer;m=Cn(xn(l),u);{let e=s.jsepRegisterBuffer;if(!e)throw Error(`Tensor location "gpu-buffer" is not supported without using WebGPU.`);p=e(r,a,t,m)}}else if(d===`ml-tensor`){let t=e[2].mlTensor;m=Cn(xn(l),u);let n=s.webnnRegisterMLTensor;if(!n)throw Error(`Tensor location "ml-tensor" is not supported without using WebNN.`);p=n(r,t,xn(l),u)}else{let t=e[2];if(Array.isArray(t)){m=c*t.length,p=s._malloc(m),n.push(p);for(let e=0;e<t.length;e++){if(typeof t[e]!=`string`)throw TypeError(`tensor data at index ${e} is not a string`);s.setValue(p+e*c,ln(t[e],n),`*`)}}else{let e=s.webnnIsGraphInput,a=s.webnnIsGraphOutput;if(l!==`string`&&e&&a){let o=s.UTF8ToString(i);if(e(r,o)||a(r,o)){let e=xn(l);m=Cn(e,u),f=`ml-tensor`;let n=s.webnnCreateTemporaryTensor,i=s.webnnUploadTensor;if(!n||!i)throw Error(`Tensor location "ml-tensor" is not supported without using WebNN.`);let a=await n(r,e,u);i(a,new Uint8Array(t.buffer,t.byteOffset,t.byteLength)),p=a}else m=t.byteLength,p=s._malloc(m),n.push(p),s.HEAPU8.set(new Uint8Array(t.buffer,t.byteOffset,m),p)}else m=t.byteLength,p=s._malloc(m),n.push(p),s.HEAPU8.set(new Uint8Array(t.buffer,t.byteOffset,m),p)}}let h=s.stackSave(),g=s.stackAlloc(4*u.length);try{u.forEach((e,t)=>s.setValue(g+t*c,e,c===4?`i32`:`i64`));let e=s._OrtCreateTensor(xn(l),p,m,g,u.length,On(f));e===0&&R(`Can't create tensor for input/output. session=${r}, index=${a}.`),t.push(e)}finally{s.stackRestore(h)}},cf=async(e,t,n,r,i,a)=>{let o=L(),s=o.PTR_SIZE,c=ef.get(e);if(!c)throw Error(`cannot run inference. invalid session id: ${e}`);let l=c[0],u=c[1],d=c[2],f=c[3],p=c[4],m=c[5],h=t.length,g=r.length,_=0,v=[],y=[],b=[],x=[],S=[],C=o.stackSave(),w=o.stackAlloc(h*s),ee=o.stackAlloc(h*s),T=o.stackAlloc(g*s),E=o.stackAlloc(g*s);try{[_,v]=fn(a),ht(`wasm prepareInputOutputTensor`);for(let r=0;r<h;r++)await sf(n[r],y,x,e,u[t[r]],t[r],p);for(let t=0;t<g;t++)await sf(i[t],b,x,e,d[r[t]],h+r[t],p);gt(`wasm prepareInputOutputTensor`);for(let e=0;e<h;e++)o.setValue(w+e*s,y[e],`*`),o.setValue(ee+e*s,u[t[e]],`*`);for(let e=0;e<g;e++)o.setValue(T+e*s,b[e],`*`),o.setValue(E+e*s,d[r[e]],`*`);if(f&&!m){let{handle:n,outputPreferredLocations:a,outputPreferredLocationsEncoded:s}=f;if(u.length!==h)throw Error(`input count from feeds (${h}) is expected to be always equal to model's input count (${u.length}).`);ht(`wasm bindInputsOutputs`);for(let r=0;r<h;r++){let i=t[r];await o._OrtBindInput(n,u[i],y[r])!==0&&R(`Can't bind input[${r}] for session=${e}.`)}for(let t=0;t<g;t++){let c=r[t];i[t]?.[3]?(S.push(b[t]),o._OrtBindOutput(n,d[c],b[t],0)!==0&&R(`Can't bind pre-allocated output[${t}] for session=${e}.`)):o._OrtBindOutput(n,d[c],0,s[c])!==0&&R(`Can't bind output[${t}] to ${a[t]} for session=${e}.`)}gt(`wasm bindInputsOutputs`),ef.set(e,[l,u,d,f,p,!0])}o.jsepOnRunStart?.(l),o.webnnOnRunStart?.(l);let c;c=f?await o._OrtRunWithBinding(l,f.handle,g,T,_):await o._OrtRun(l,ee,w,h,E,g,T,_),c!==0&&R(`failed to call OrtRun().`);let C=[],D=[];ht(`wasm ProcessOutputTensor`);for(let t=0;t<g;t++){let n=Number(o.getValue(T+t*s,`*`));if(n===b[t]||S.includes(b[t])){C.push(i[t]),n!==b[t]&&o._OrtReleaseTensor(n)!==0&&R(`Can't release tensor.`);continue}let a=o.stackSave(),c=o.stackAlloc(4*s),l=!1,u,d=0;try{o._OrtGetTensorData(n,c,c+s,c+2*s,c+3*s)!==0&&R(`Can't access output tensor data on index ${t}.`);let i=s===4?`i32`:`i64`,a=Number(o.getValue(c,i));d=o.getValue(c+s,`*`);let p=o.getValue(c+s*2,`*`),m=Number(o.getValue(c+s*3,i)),h=[];for(let e=0;e<m;e++)h.push(Number(o.getValue(p+e*s,i)));o._OrtFree(p)!==0&&R(`Can't free memory for tensor dims.`);let g=h.reduce((e,t)=>e*t,1);u=Sn(a);let _=f?.outputPreferredLocations[r[t]];if(u===`string`){if(_===`gpu-buffer`||_===`ml-tensor`)throw Error(`String tensor is not supported on GPU.`);let e=[];for(let t=0;t<g;t++){let n=o.getValue(d+t*s,`*`),r=o.getValue(d+(t+1)*s,`*`),i=t===g-1?void 0:r-n;e.push(o.UTF8ToString(n,i))}C.push([u,h,e,`cpu`])}else if(_===`gpu-buffer`&&g>0){let e=o.jsepGetBuffer;if(!e)throw Error(`preferredLocation "gpu-buffer" is not supported without using WebGPU.`);let t=e(d),r=Cn(a,g);if(r===void 0||!En(u))throw Error(`Unsupported data type: ${u}`);l=!0,C.push([u,h,{gpuBuffer:t,download:o.jsepCreateDownloader(t,r,u),dispose:()=>{o._OrtReleaseTensor(n)!==0&&R(`Can't release tensor.`)}},`gpu-buffer`])}else if(_===`ml-tensor`&&g>0){let t=o.webnnEnsureTensor,r=o.webnnIsGraphInputOutputTypeSupported;if(!t||!r)throw Error(`preferredLocation "ml-tensor" is not supported without using WebNN.`);if(Cn(a,g)===void 0||!Dn(u))throw Error(`Unsupported data type: ${u}`);if(!r(e,u,!1))throw Error(`preferredLocation "ml-tensor" for ${u} output is not supported by current WebNN Context.`);let i=await t(e,d,a,h,!1);l=!0,C.push([u,h,{mlTensor:i,download:o.webnnCreateMLTensorDownloader(d,u),dispose:()=>{o.webnnReleaseTensorId(d),o._OrtReleaseTensor(n)}},`ml-tensor`])}else if(_===`ml-tensor-cpu-output`&&g>0){let e=o.webnnCreateMLTensorDownloader(d,u)(),t=C.length;l=!0,D.push((async()=>{let r=[t,await e];return o.webnnReleaseTensorId(d),o._OrtReleaseTensor(n),r})()),C.push([u,h,[],`cpu`])}else{let e=new(wn(u))(g);new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(o.HEAPU8.subarray(d,d+e.byteLength)),C.push([u,h,e,`cpu`])}}finally{o.stackRestore(a),u===`string`&&d&&o._free(d),l||o._OrtReleaseTensor(n)}}f&&!p&&(o._OrtClearBoundOutputs(f.handle)!==0&&R(`Can't clear bound outputs.`),ef.set(e,[l,u,d,f,p,!1]));for(let[e,t]of await Promise.all(D))C[e][2]=t;return gt(`wasm ProcessOutputTensor`),C}finally{o.webnnOnRunEnd?.(l),o.stackRestore(C),y.forEach(e=>o._OrtReleaseTensor(e)),b.forEach(e=>o._OrtReleaseTensor(e)),x.forEach(e=>o._free(e)),_!==0&&o._OrtReleaseRunOptions(_),v.forEach(e=>o._free(e))}},lf=e=>{let t=L(),n=ef.get(e);if(!n)throw Error(`invalid session id`);let r=n[0],i=t._OrtEndProfiling(r);i===0&&R(`Can't get an profile file name.`),t._OrtFree(i)},uf=e=>{let t=[];for(let n of e){let e=n[2];!Array.isArray(e)&&`buffer`in e&&t.push(e.buffer)}return t}}),ff,pf,mf,hf,gf,_f,vf,yf,bf,xf,Sf,Cf,wf,Tf,Ef,Df,Of,kf,Af=N(()=>{Et(),df(),cn(),Qt(),ff=()=>!!P.wasm.proxy&&typeof document<`u`,mf=!1,hf=!1,gf=!1,yf=new Map,bf=(e,t)=>{let n=yf.get(e);n?n.push(t):yf.set(e,[t])},xf=()=>{if(mf||!hf||gf||!pf)throw Error(`worker not ready`)},Sf=e=>{switch(e.data.type){case`init-wasm`:mf=!1,e.data.err?(gf=!0,vf[1](e.data.err)):(hf=!0,vf[0]()),_f&&=(URL.revokeObjectURL(_f),void 0);break;case`init-ep`:case`copy-from`:case`create`:case`release`:case`run`:case`end-profiling`:{let t=yf.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}}},Cf=async()=>{if(!hf){if(mf)throw Error(`multiple calls to 'initWasm()' detected.`);if(gf)throw Error(`previous call to 'initWasm()' failed.`);if(mf=!0,ff())return new Promise((e,t)=>{pf?.terminate(),Yt().then(([n,r])=>{try{pf=r,pf.onerror=e=>t(e),pf.onmessage=Sf,vf=[e,t];let i={type:`init-wasm`,in:P};!i.in.wasm.wasmPaths&&(n||zt)&&(i.in.wasm.wasmPaths={wasm:new URL(``+new URL(`../assets/ort-wasm-simd-threaded.jsep.C7qz-dwA.wasm`,import.meta.url).href,``+import.meta.url).href}),pf.postMessage(i),_f=n}catch(e){t(e)}},t)});try{await sn(P.wasm),await Qd(P),hf=!0}catch(e){throw gf=!0,e}finally{mf=!1}}},wf=async e=>{if(ff())return xf(),new Promise((t,n)=>{bf(`init-ep`,[t,n]);let r={type:`init-ep`,in:{epName:e,env:P}};pf.postMessage(r)});await $d(P,e)},Tf=async e=>ff()?(xf(),new Promise((t,n)=>{bf(`copy-from`,[t,n]);let r={type:`copy-from`,in:{buffer:e}};pf.postMessage(r,[e.buffer])})):rf(e),Ef=async(e,t)=>{if(ff()){if(t?.preferredOutputLocation)throw Error(`session option "preferredOutputLocation" is not supported for proxy.`);return xf(),new Promise((n,r)=>{bf(`create`,[n,r]);let i={type:`create`,in:{model:e,options:{...t}}},a=[];e instanceof Uint8Array&&a.push(e.buffer),pf.postMessage(i,a)})}return af(e,t)},Df=async e=>{if(ff())return xf(),new Promise((t,n)=>{bf(`release`,[t,n]);let r={type:`release`,in:e};pf.postMessage(r)});of(e)},Of=async(e,t,n,r,i,a)=>{if(ff()){if(n.some(e=>e[3]!==`cpu`))throw Error(`input tensor on GPU is not supported for proxy.`);if(i.some(e=>e))throw Error(`pre-allocated output tensor is not supported for proxy.`);return xf(),new Promise((i,o)=>{bf(`run`,[i,o]);let s=n,c={type:`run`,in:{sessionId:e,inputIndices:t,inputs:s,outputIndices:r,options:a}};pf.postMessage(c,uf(s))})}return cf(e,t,n,r,i,a)},kf=async e=>{if(ff())return xf(),new Promise((t,n)=>{bf(`end-profiling`,[t,n]);let r={type:`end-profiling`,in:e};pf.postMessage(r)});lf(e)}}),jf,Mf,Nf,Pf=N(()=>{Et(),Af(),z(),Dt(),An(),jf=(e,t)=>{switch(e.location){case`cpu`:return[e.type,e.dims,e.data,`cpu`];case`gpu-buffer`:return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},`gpu-buffer`];case`ml-tensor`:return[e.type,e.dims,{mlTensor:e.mlTensor},`ml-tensor`];default:throw Error(`invalid data location: ${e.location} for ${t()}`)}},Mf=e=>{switch(e[3]){case`cpu`:return new I(e[0],e[2],e[1]);case`gpu-buffer`:{let t=e[0];if(!En(t))throw Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:n,download:r,dispose:i}=e[2];return I.fromGpuBuffer(n,{dataType:t,dims:e[1],download:r,dispose:i})}case`ml-tensor`:{let t=e[0];if(!Dn(t))throw Error(`not supported data type: ${t} for deserializing MLTensor tensor`);let{mlTensor:n,download:r,dispose:i}=e[2];return I.fromMLTensor(n,{dataType:t,dims:e[1],download:r,dispose:i})}default:throw Error(`invalid data location: ${e[3]}`)}},Nf=class{async fetchModelAndCopyToWasmMemory(e){return Tf(await kn(e))}async loadModel(e,t){pt();let n;n=typeof e==`string`?await this.fetchModelAndCopyToWasmMemory(e):e,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await Ef(n,t),mt()}async dispose(){return Df(this.sessionId)}async run(e,t,n){pt();let r=[],i=[];Object.entries(e).forEach(e=>{let t=e[0],n=e[1],a=this.inputNames.indexOf(t);if(a===-1)throw Error(`invalid input '${t}'`);r.push(n),i.push(a)});let a=[],o=[];Object.entries(t).forEach(e=>{let t=e[0],n=e[1],r=this.outputNames.indexOf(t);if(r===-1)throw Error(`invalid output '${t}'`);a.push(n),o.push(r)});let s=r.map((e,t)=>jf(e,()=>`input "${this.inputNames[i[t]]}"`)),c=a.map((e,t)=>e?jf(e,()=>`output "${this.outputNames[o[t]]}"`):null),l=await Of(this.sessionId,i,s,o,c,n),u={};for(let e=0;e<l.length;e++)u[this.outputNames[o[e]]]=a[e]??Mf(l[e]);return mt(),u}startProfiling(){}endProfiling(){kf(this.sessionId)}}}),Ff={};ke(Ff,{OnnxruntimeWebAssemblyBackend:()=>Lf,initializeFlags:()=>If,wasmBackend:()=>Rf});var If,Lf,Rf,zf=N(()=>{Et(),Af(),Pf(),If=()=>{(typeof P.wasm.initTimeout!=`number`||P.wasm.initTimeout<0)&&(P.wasm.initTimeout=0);let e=P.wasm.simd;if(typeof e!=`boolean`&&e!==void 0&&e!==`fixed`&&e!==`relaxed`&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${e}". Reset it to \`false\` and ignore SIMD feature checking.`),P.wasm.simd=!1),typeof P.wasm.proxy!=`boolean`&&(P.wasm.proxy=!1),typeof P.wasm.trace!=`boolean`&&(P.wasm.trace=!1),typeof P.wasm.numThreads!=`number`||!Number.isInteger(P.wasm.numThreads)||P.wasm.numThreads<=0){if(typeof self<`u`&&!self.crossOriginIsolated)P.wasm.numThreads=1;else{let e=typeof navigator>`u`?Oe(`node:os`).cpus().length:navigator.hardwareConcurrency;P.wasm.numThreads=Math.min(4,Math.ceil((e||1)/2))}}},Lf=class{async init(e){If(),await Cf(),await wf(e)}async createInferenceSessionHandler(e,t){let n=new Nf;return await n.loadModel(e,t),n}},Rf=new Lf});Et(),Et(),Et();var Bf=`1.31.0-dev.20260918-bc8e7ed75`;{let e=(zf(),je(Ff)).wasmBackend;Pe(`webgpu`,e,5),Pe(`webnn`,e,5),Pe(`cpu`,e,10),Pe(`wasm`,e,10)}Object.defineProperty(P.versions,"web",{value:Bf,enumerable:!0});var Vf=h(((e,t)=>{t.exports=n;function n(e,t){for(var n=Array(arguments.length-1),r=0,i=2,a=!0;i<arguments.length;)n[r++]=arguments[i++];return new Promise(function(i,o){n[r]=function(e){if(a){if(a=!1,e)o(e);else{for(var t=Array(arguments.length-1),n=0;n<t.length;)t[n++]=arguments[n];i.apply(null,t)}}};try{e.apply(t||null,n)}catch(e){a&&(a=!1,o(e))}})}})),Hf=h((e=>{var t=e;t.length=function(e){var t=e.length;if(!t)return 0;for(var n=0;--t%4>1&&e.charAt(t)===`=`;)++n;return Math.ceil(e.length*3)/4-n};for(var n=Array(64),r=Array(123),i=0;i<64;)r[n[i]=i<26?i+65:i<52?i+71:i<62?i-4:i-59|43]=i++;t.encode=function(e,t,r){for(var i=null,a=[],o=0,s=0,c;t<r;){var l=e[t++];switch(s){case 0:a[o++]=n[l>>2],c=(l&3)<<4,s=1;break;case 1:a[o++]=n[c|l>>4],c=(l&15)<<2,s=2;break;case 2:a[o++]=n[c|l>>6],a[o++]=n[l&63],s=0}o>8191&&((i||=[]).push(String.fromCharCode.apply(String,a)),o=0)}return s&&(a[o++]=n[c],a[o++]=61,s===1&&(a[o++]=61)),i?(o&&i.push(String.fromCharCode.apply(String,a.slice(0,o))),i.join(``)):String.fromCharCode.apply(String,a.slice(0,o))};var a=`invalid encoding`;t.decode=function(e,t,n){for(var i=n,o=0,s,c=0;c<e.length;){var l=e.charCodeAt(c++);if(l===61&&o>1)break;if((l=r[l])===void 0)throw Error(a);switch(o){case 0:s=l,o=1;break;case 1:t[n++]=s<<2|(l&48)>>4,s=l,o=2;break;case 2:t[n++]=(s&15)<<4|(l&60)>>2,s=l,o=3;break;case 3:t[n++]=(s&3)<<6|l,o=0}}if(o===1)throw Error(a);return n-i},t.test=function(e){return/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(e)}})),Uf=h(((e,t)=>{t.exports=n;function n(){this._listeners=Object.create(null)}n.prototype.on=function(e,t,n){return(this._listeners[e]||(this._listeners[e]=[])).push({fn:t,ctx:n||this}),this},n.prototype.off=function(e,t){if(e===void 0)this._listeners=Object.create(null);else if(t===void 0)this._listeners[e]=[];else{var n=this._listeners[e];if(!n)return this;for(var r=0;r<n.length;)n[r].fn===t?n.splice(r,1):++r}return this},n.prototype.emit=function(e){var t=this._listeners[e];if(t){for(var n=[],r=1;r<arguments.length;)n.push(arguments[r++]);for(r=0;r<t.length;)t[r].fn.apply(t[r++].ctx,n)}return this}})),Wf=h(((e,t)=>{t.exports=n(n);function n(e){return typeof Float32Array<`u`?(function(){var t=new Float32Array([-0]),n=new Uint8Array(t.buffer),r=n[3]===128;function i(e,r,i){t[0]=e,r[i]=n[0],r[i+1]=n[1],r[i+2]=n[2],r[i+3]=n[3]}function a(e,r,i){t[0]=e,r[i]=n[3],r[i+1]=n[2],r[i+2]=n[1],r[i+3]=n[0]}e.writeFloatLE=r?i:a,e.writeFloatBE=r?a:i;function o(e,r){return n[0]=e[r],n[1]=e[r+1],n[2]=e[r+2],n[3]=e[r+3],t[0]}function s(e,r){return n[3]=e[r],n[2]=e[r+1],n[1]=e[r+2],n[0]=e[r+3],t[0]}e.readFloatLE=r?o:s,e.readFloatBE=r?s:o})():(function(){function t(e,t,n,r){var i=+(t<0);if(i&&(t=-t),t===0)e(1/t>0?0:2147483648,n,r);else if(isNaN(t))e(2143289344,n,r);else if(t>34028234663852886e22)e((i<<31|2139095040)>>>0,n,r);else if(t<11754943508222875e-54)e((i<<31|Math.round(t/1401298464324817e-60))>>>0,n,r);else{var a=Math.floor(Math.log(t)/Math.LN2),o=Math.round(t*2**-a*8388608)&8388607;e((i<<31|a+127<<23|o)>>>0,n,r)}}e.writeFloatLE=t.bind(null,r),e.writeFloatBE=t.bind(null,i);function n(e,t,n){var r=e(t,n),i=(r>>31)*2+1,a=r>>>23&255,o=r&8388607;return a===255?o?NaN:i*(1/0):a===0?i*1401298464324817e-60*o:i*2**(a-150)*(o+8388608)}e.readFloatLE=n.bind(null,a),e.readFloatBE=n.bind(null,o)})(),typeof Float64Array<`u`?(function(){var t=new Float64Array([-0]),n=new Uint8Array(t.buffer),r=n[7]===128;function i(e,r,i){t[0]=e,r[i]=n[0],r[i+1]=n[1],r[i+2]=n[2],r[i+3]=n[3],r[i+4]=n[4],r[i+5]=n[5],r[i+6]=n[6],r[i+7]=n[7]}function a(e,r,i){t[0]=e,r[i]=n[7],r[i+1]=n[6],r[i+2]=n[5],r[i+3]=n[4],r[i+4]=n[3],r[i+5]=n[2],r[i+6]=n[1],r[i+7]=n[0]}e.writeDoubleLE=r?i:a,e.writeDoubleBE=r?a:i;function o(e,r){return n[0]=e[r],n[1]=e[r+1],n[2]=e[r+2],n[3]=e[r+3],n[4]=e[r+4],n[5]=e[r+5],n[6]=e[r+6],n[7]=e[r+7],t[0]}function s(e,r){return n[7]=e[r],n[6]=e[r+1],n[5]=e[r+2],n[4]=e[r+3],n[3]=e[r+4],n[2]=e[r+5],n[1]=e[r+6],n[0]=e[r+7],t[0]}e.readDoubleLE=r?o:s,e.readDoubleBE=r?s:o})():(function(){function t(e,t,n,r,i,a){var o=+(r<0);if(o&&(r=-r),r===0)e(0,i,a+t),e(1/r>0?0:2147483648,i,a+n);else if(isNaN(r))e(0,i,a+t),e(2146959360,i,a+n);else if(r>17976931348623157e292)e(0,i,a+t),e((o<<31|2146435072)>>>0,i,a+n);else{var s;if(r<22250738585072014e-324)s=r/5e-324,e(s>>>0,i,a+t),e((o<<31|s/4294967296)>>>0,i,a+n);else{var c=Math.floor(Math.log(r)/Math.LN2);c===1024&&(c=1023),s=r*2**-c,e(s*4503599627370496>>>0,i,a+t),e((o<<31|c+1023<<20|s*1048576&1048575)>>>0,i,a+n)}}}e.writeDoubleLE=t.bind(null,r,0,4),e.writeDoubleBE=t.bind(null,i,4,0);function n(e,t,n,r,i){var a=e(r,i+t),o=e(r,i+n),s=(o>>31)*2+1,c=o>>>20&2047,l=4294967296*(o&1048575)+a;return c===2047?l?NaN:s*(1/0):c===0?s*5e-324*l:s*2**(c-1075)*(l+4503599627370496)}e.readDoubleLE=n.bind(null,a,0,4),e.readDoubleBE=n.bind(null,o,4,0)})(),e}function r(e,t,n){t[n]=e&255,t[n+1]=e>>>8&255,t[n+2]=e>>>16&255,t[n+3]=e>>>24}function i(e,t,n){t[n]=e>>>24,t[n+1]=e>>>16&255,t[n+2]=e>>>8&255,t[n+3]=e&255}function a(e,t){return(e[t]|e[t+1]<<8|e[t+2]<<16|e[t+3]<<24)>>>0}function o(e,t){return(e[t]<<24|e[t+1]<<16|e[t+2]<<8|e[t+3])>>>0}})),Gf=h(((e,t)=>{t.exports=n;function n(e){try{if(typeof E!=`function`)return null;var t=E(e);return t&&(t.length||Object.keys(t).length)?t:null}catch{return null}}})),Kf=h((e=>{var t=e,n=65533;t.length=function(e){for(var t=0,n=0,r=0;r<e.length;++r)n=e.charCodeAt(r),n<128?t+=1:n<2048?t+=2:(n&64512)==55296&&(e.charCodeAt(r+1)&64512)==56320?(++r,t+=4):t+=3;return t},t.read=function(e,t,r){if(r-t<1)return``;for(var i=null,a=[],o=0,s,c,l,u;t<r;)s=e[t++],s<=127?a[o++]=s:s>=192&&s<224?(l=(s&31)<<6|e[t++]&63,a[o++]=l>=128?l:n):s>=224&&s<240?(u=(s&15)<<12|(e[t++]&63)<<6|e[t++]&63,a[o++]=u>=2048?u:n):s>=240&&(c=(s&7)<<18|(e[t++]&63)<<12|(e[t++]&63)<<6|e[t++]&63,c<65536||c>1114111?a[o++]=n:(c-=65536,a[o++]=55296+(c>>10),a[o++]=56320+(c&1023))),o>8191&&((i||=[]).push(String.fromCharCode.apply(String,a.slice(0,o))),o=0);return i?(o&&i.push(String.fromCharCode.apply(String,a.slice(0,o))),i.join(``)):String.fromCharCode.apply(String,a.slice(0,o))},t.write=function(e,t,n){for(var r=n,i,a,o=0;o<e.length;++o)i=e.charCodeAt(o),i<128?t[n++]=i:i<2048?(t[n++]=i>>6|192,t[n++]=i&63|128):(i&64512)==55296&&((a=e.charCodeAt(o+1))&64512)==56320?(i=65536+((i&1023)<<10)+(a&1023),++o,t[n++]=i>>18|240,t[n++]=i>>12&63|128,t[n++]=i>>6&63|128,t[n++]=i&63|128):(t[n++]=i>>12|224,t[n++]=i>>6&63|128,t[n++]=i&63|128);return n-r}})),qf=h(((e,t)=>{t.exports=n;function n(e,t,n){var r=n||8192,i=r>>>1,a=null,o=r;return function(n){if(n<1||n>i)return e(n);o+n>r&&(a=e(r),o=0);var s=t.call(a,o,o+=n);return o&7&&(o=(o|7)+1),s}}})),Jf=h(((e,t)=>{t.exports=r;var n=Yf();function r(e,t){this.lo=e>>>0,this.hi=t>>>0}var i=r.zero=new r(0,0);i.toNumber=function(){return 0},i.zzEncode=i.zzDecode=function(){return this},i.length=function(){return 1};var a=r.zeroHash=`\0\0\0\0\0\0\0\0`;r.fromNumber=function(e){if(e===0)return i;var t=e<0;t&&(e=-e);var n=e>>>0,a=(e-n)/4294967296>>>0;return t&&(a=~a>>>0,n=~n>>>0,++n>4294967295&&(n=0,++a>4294967295&&(a=0))),new r(n,a)},r.from=function(e){if(typeof e==`number`)return r.fromNumber(e);if(n.isString(e)){if(n.Long)e=n.Long.fromString(e);else return r.fromNumber(parseInt(e,10))}return e.low||e.high?new r(e.low>>>0,e.high>>>0):i},r.prototype.toNumber=function(e){if(!e&&this.hi>>>31){var t=~this.lo+1>>>0,n=~this.hi>>>0;return t||(n=n+1>>>0),-(t+n*4294967296)}return this.lo+this.hi*4294967296},r.prototype.toLong=function(e){return n.Long?new n.Long(this.lo|0,this.hi|0,!!e):{low:this.lo|0,high:this.hi|0,unsigned:!!e}};var o=String.prototype.charCodeAt;r.fromHash=function(e){return e===a?i:new r((o.call(e,0)|o.call(e,1)<<8|o.call(e,2)<<16|o.call(e,3)<<24)>>>0,(o.call(e,4)|o.call(e,5)<<8|o.call(e,6)<<16|o.call(e,7)<<24)>>>0)},r.prototype.toHash=function(){return String.fromCharCode(this.lo&255,this.lo>>>8&255,this.lo>>>16&255,this.lo>>>24,this.hi&255,this.hi>>>8&255,this.hi>>>16&255,this.hi>>>24)},r.prototype.zzEncode=function(){var e=this.hi>>31;return this.hi=((this.hi<<1|this.lo>>>31)^e)>>>0,this.lo=(this.lo<<1^e)>>>0,this},r.prototype.zzDecode=function(){var e=-(this.lo&1);return this.lo=((this.lo>>>1|this.hi<<31)^e)>>>0,this.hi=(this.hi>>>1^e)>>>0,this},r.prototype.length=function(){var e=this.lo,t=(this.lo>>>28|this.hi<<4)>>>0,n=this.hi>>>24;return n===0?t===0?e<16384?e<128?1:2:e<2097152?3:4:t<16384?t<128?5:6:t<2097152?7:8:n<128?9:10}})),Yf=h((e=>{var t=e;t.asPromise=Vf(),t.base64=Hf(),t.EventEmitter=Uf(),t.float=Wf(),t.inquire=Gf(),t.utf8=Kf(),t.pool=qf(),t.LongBits=Jf(),t.isNode=!!(typeof global<`u`&&global&&global.process&&global.process.versions&&global.process.versions.node),t.global=t.isNode&&global||typeof window<`u`&&window||typeof self<`u`&&self||e,t.emptyArray=Object.freeze?Object.freeze([]):[],t.emptyObject=Object.freeze?Object.freeze({}):{},t.isInteger=Number.isInteger||function(e){return typeof e==`number`&&isFinite(e)&&Math.floor(e)===e},t.isString=function(e){return typeof e==`string`||e instanceof String},t.isObject=function(e){return e&&typeof e==`object`},t.isset=t.isSet=function(e,t){var n=e[t];return n!=null&&e.hasOwnProperty(t)?typeof n!=`object`||(Array.isArray(n)?n.length:Object.keys(n).length)>0:!1},t.Buffer=(function(){try{var e=t.inquire(`buffer`).Buffer;return e.prototype.utf8Write?e:null}catch{return null}})(),t._Buffer_from=null,t._Buffer_allocUnsafe=null,t.newBuffer=function(e){return typeof e==`number`?t.Buffer?t._Buffer_allocUnsafe(e):new t.Array(e):t.Buffer?t._Buffer_from(e):typeof Uint8Array>`u`?e:new Uint8Array(e)},t.Array=typeof Uint8Array<`u`?Uint8Array:Array,t.Long=t.global.dcodeIO&&t.global.dcodeIO.Long||t.global.Long||t.inquire(`long`),t.key2Re=/^true|false|0|1$/,t.key32Re=/^-?(?:0|[1-9][0-9]*)$/,t.key64Re=/^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/,t.longToHash=function(e){return e?t.LongBits.from(e).toHash():t.LongBits.zeroHash},t.longFromHash=function(e,n){var r=t.LongBits.fromHash(e);return t.Long?t.Long.fromBits(r.lo,r.hi,n):r.toNumber(!!n)};function n(e,t,n){for(var r=Object.keys(t),i=0;i<r.length;++i)(e[r[i]]===void 0||!n)&&(e[r[i]]=t[r[i]]);return e}t.merge=n,t.lcFirst=function(e){return e.charAt(0).toLowerCase()+e.substring(1)};function r(e){function t(e,r){if(!(this instanceof t))return new t(e,r);Object.defineProperty(this,"message",{get:function(){return e}}),Error.captureStackTrace?Error.captureStackTrace(this,t):Object.defineProperty(this,"stack",{value:Error().stack||``}),r&&n(this,r)}return(t.prototype=Object.create(Error.prototype)).constructor=t,Object.defineProperty(t.prototype,"name",{get:function(){return e}}),t.prototype.toString=function(){return this.name+`: `+this.message},t}t.newError=r,t.ProtocolError=r(`ProtocolError`),t.oneOfGetter=function(e){for(var t={},n=0;n<e.length;++n)t[e[n]]=1;return function(){for(var e=Object.keys(this),n=e.length-1;n>-1;--n)if(t[e[n]]===1&&this[e[n]]!==void 0&&this[e[n]]!==null)return e[n]}},t.oneOfSetter=function(e){return function(t){for(var n=0;n<e.length;++n)e[n]!==t&&delete this[e[n]]}},t.toJSONOptions={longs:String,enums:String,bytes:String,json:!0},t._configure=function(){var e=t.Buffer;if(!e){t._Buffer_from=t._Buffer_allocUnsafe=null;return}t._Buffer_from=e.from!==Uint8Array.from&&e.from||function(t,n){return new e(t,n)},t._Buffer_allocUnsafe=e.allocUnsafe||function(t){return new e(t)}}})),Xf=h(((e,t)=>{t.exports=u;var n=Yf(),r,i=n.LongBits,a=n.base64,o=n.utf8;function s(e,t,n){this.fn=e,this.len=t,this.next=void 0,this.val=n}function c(){}function l(e){this.head=e.head,this.tail=e.tail,this.len=e.len,this.next=e.states}function u(){this.len=0,this.head=new s(c,0,0),this.tail=this.head,this.states=null}var d=function(){return n.Buffer?function(){return(u.create=function(){return new r})()}:function(){return new u}};u.create=d(),u.alloc=function(e){return new n.Array(e)},n.Array!==Array&&(u.alloc=n.pool(u.alloc,n.Array.prototype.subarray)),u.prototype._push=function(e,t,n){return this.tail=this.tail.next=new s(e,t,n),this.len+=t,this};function f(e,t,n){t[n]=e&255}function p(e,t,n){for(;e>127;)t[n++]=e&127|128,e>>>=7;t[n]=e}function m(e,t){this.len=e,this.next=void 0,this.val=t}m.prototype=Object.create(s.prototype),m.prototype.fn=p,u.prototype.uint32=function(e){return this.len+=(this.tail=this.tail.next=new m((e>>>=0)<128?1:e<16384?2:e<2097152?3:e<268435456?4:5,e)).len,this},u.prototype.int32=function(e){return e<0?this._push(h,10,i.fromNumber(e)):this.uint32(e)},u.prototype.sint32=function(e){return this.uint32((e<<1^e>>31)>>>0)};function h(e,t,n){for(;e.hi;)t[n++]=e.lo&127|128,e.lo=(e.lo>>>7|e.hi<<25)>>>0,e.hi>>>=7;for(;e.lo>127;)t[n++]=e.lo&127|128,e.lo>>>=7;t[n++]=e.lo}u.prototype.uint64=function(e){var t=i.from(e);return this._push(h,t.length(),t)},u.prototype.int64=u.prototype.uint64,u.prototype.sint64=function(e){var t=i.from(e).zzEncode();return this._push(h,t.length(),t)},u.prototype.bool=function(e){return this._push(f,1,+!!e)};function g(e,t,n){t[n]=e&255,t[n+1]=e>>>8&255,t[n+2]=e>>>16&255,t[n+3]=e>>>24}u.prototype.fixed32=function(e){return this._push(g,4,e>>>0)},u.prototype.sfixed32=u.prototype.fixed32,u.prototype.fixed64=function(e){var t=i.from(e);return this._push(g,4,t.lo)._push(g,4,t.hi)},u.prototype.sfixed64=u.prototype.fixed64,u.prototype.float=function(e){return this._push(n.float.writeFloatLE,4,e)},u.prototype.double=function(e){return this._push(n.float.writeDoubleLE,8,e)};var _=n.Array.prototype.set?function(e,t,n){t.set(e,n)}:function(e,t,n){for(var r=0;r<e.length;++r)t[n+r]=e[r]};u.prototype.bytes=function(e){var t=e.length>>>0;if(!t)return this._push(f,1,0);if(n.isString(e)){var r=u.alloc(t=a.length(e));a.decode(e,r,0),e=r}return this.uint32(t)._push(_,t,e)},u.prototype.string=function(e){var t=o.length(e);return t?this.uint32(t)._push(o.write,t,e):this._push(f,1,0)},u.prototype.fork=function(){return this.states=new l(this),this.head=this.tail=new s(c,0,0),this.len=0,this},u.prototype.reset=function(){return this.states?(this.head=this.states.head,this.tail=this.states.tail,this.len=this.states.len,this.states=this.states.next):(this.head=this.tail=new s(c,0,0),this.len=0),this},u.prototype.ldelim=function(){var e=this.head,t=this.tail,n=this.len;return this.reset().uint32(n),n&&(this.tail.next=e.next,this.tail=t,this.len+=n),this},u.prototype.finish=function(){for(var e=this.head.next,t=this.constructor.alloc(this.len),n=0;e;)e.fn(e.val,t,n),n+=e.len,e=e.next;return t},u._configure=function(e){r=e,u.create=d(),r._configure()}})),Zf=h(((e,t)=>{t.exports=i;var n=Xf();(i.prototype=Object.create(n.prototype)).constructor=i;var r=Yf();function i(){n.call(this)}i._configure=function(){i.alloc=r._Buffer_allocUnsafe,i.writeBytesBuffer=r.Buffer&&r.Buffer.prototype instanceof Uint8Array&&r.Buffer.prototype.set.name===`set`?function(e,t,n){t.set(e,n)}:function(e,t,n){if(e.copy)e.copy(t,n,0,e.length);else for(var r=0;r<e.length;)t[n++]=e[r++]}},i.prototype.bytes=function(e){r.isString(e)&&(e=r._Buffer_from(e,`base64`));var t=e.length>>>0;return this.uint32(t),t&&this._push(i.writeBytesBuffer,t,e),this};function a(e,t,n){e.length<40?r.utf8.write(e,t,n):t.utf8Write?t.utf8Write(e,n):t.write(e,n)}i.prototype.string=function(e){var t=r.Buffer.byteLength(e);return this.uint32(t),t&&this._push(a,t,e),this},i._configure()})),Qf=h(((e,t)=>{t.exports=s;var n=Yf(),r,i=n.LongBits,a=n.utf8;function o(e,t){return RangeError(`index out of range: `+e.pos+` + `+(t||1)+` > `+e.len)}function s(e){this.buf=e,this.pos=0,this.len=e.length}var c=typeof Uint8Array<`u`?function(e){if(e instanceof Uint8Array||Array.isArray(e))return new s(e);throw Error(`illegal buffer`)}:function(e){if(Array.isArray(e))return new s(e);throw Error(`illegal buffer`)},l=function(){return n.Buffer?function(e){return(s.create=function(e){return n.Buffer.isBuffer(e)?new r(e):c(e)})(e)}:c};s.create=l(),s.prototype._slice=n.Array.prototype.subarray||n.Array.prototype.slice,s.prototype.uint32=(function(){var e=4294967295;return function(){if(e=(this.buf[this.pos]&127)>>>0,this.buf[this.pos++]<128||(e=(e|(this.buf[this.pos]&127)<<7)>>>0,this.buf[this.pos++]<128)||(e=(e|(this.buf[this.pos]&127)<<14)>>>0,this.buf[this.pos++]<128)||(e=(e|(this.buf[this.pos]&127)<<21)>>>0,this.buf[this.pos++]<128)||(e=(e|(this.buf[this.pos]&15)<<28)>>>0,this.buf[this.pos++]<128))return e;if((this.pos+=5)>this.len)throw this.pos=this.len,o(this,10);return e}})(),s.prototype.int32=function(){return this.uint32()|0},s.prototype.sint32=function(){var e=this.uint32();return e>>>1^-(e&1)|0};function u(){var e=new i(0,0),t=0;if(this.len-this.pos>4){for(;t<4;++t)if(e.lo=(e.lo|(this.buf[this.pos]&127)<<t*7)>>>0,this.buf[this.pos++]<128)return e;if(e.lo=(e.lo|(this.buf[this.pos]&127)<<28)>>>0,e.hi=(e.hi|(this.buf[this.pos]&127)>>4)>>>0,this.buf[this.pos++]<128)return e;t=0}else{for(;t<3;++t){if(this.pos>=this.len)throw o(this);if(e.lo=(e.lo|(this.buf[this.pos]&127)<<t*7)>>>0,this.buf[this.pos++]<128)return e}return e.lo=(e.lo|(this.buf[this.pos++]&127)<<t*7)>>>0,e}if(this.len-this.pos>4){for(;t<5;++t)if(e.hi=(e.hi|(this.buf[this.pos]&127)<<t*7+3)>>>0,this.buf[this.pos++]<128)return e}else for(;t<5;++t){if(this.pos>=this.len)throw o(this);if(e.hi=(e.hi|(this.buf[this.pos]&127)<<t*7+3)>>>0,this.buf[this.pos++]<128)return e}throw Error(`invalid varint encoding`)}s.prototype.bool=function(){return this.uint32()!==0};function d(e,t){return(e[t-4]|e[t-3]<<8|e[t-2]<<16|e[t-1]<<24)>>>0}s.prototype.fixed32=function(){if(this.pos+4>this.len)throw o(this,4);return d(this.buf,this.pos+=4)},s.prototype.sfixed32=function(){if(this.pos+4>this.len)throw o(this,4);return d(this.buf,this.pos+=4)|0};function f(){if(this.pos+8>this.len)throw o(this,8);return new i(d(this.buf,this.pos+=4),d(this.buf,this.pos+=4))}s.prototype.float=function(){if(this.pos+4>this.len)throw o(this,4);var e=n.float.readFloatLE(this.buf,this.pos);return this.pos+=4,e},s.prototype.double=function(){if(this.pos+8>this.len)throw o(this,4);var e=n.float.readDoubleLE(this.buf,this.pos);return this.pos+=8,e},s.prototype.bytes=function(){var e=this.uint32(),t=this.pos,n=this.pos+e;if(n>this.len)throw o(this,e);return this.pos+=e,Array.isArray(this.buf)?this.buf.slice(t,n):t===n?new this.buf.constructor(0):this._slice.call(this.buf,t,n)},s.prototype.string=function(){var e=this.bytes();return a.read(e,0,e.length)},s.prototype.skip=function(e){if(typeof e==`number`){if(this.pos+e>this.len)throw o(this,e);this.pos+=e}else do if(this.pos>=this.len)throw o(this);while(this.buf[this.pos++]&128);return this},s.prototype.skipType=function(e){switch(e){case 0:this.skip();break;case 1:this.skip(8);break;case 2:this.skip(this.uint32());break;case 3:for(;(e=this.uint32()&7)!=4;)this.skipType(e);break;case 5:this.skip(4);break;default:throw Error(`invalid wire type `+e+` at offset `+this.pos)}return this},s._configure=function(e){r=e,s.create=l(),r._configure();var t=n.Long?`toLong`:`toNumber`;n.merge(s.prototype,{int64:function(){return u.call(this)[t](!1)},uint64:function(){return u.call(this)[t](!0)},sint64:function(){return u.call(this).zzDecode()[t](!1)},fixed64:function(){return f.call(this)[t](!0)},sfixed64:function(){return f.call(this)[t](!1)}})}})),$f=h(((e,t)=>{t.exports=i;var n=Qf();(i.prototype=Object.create(n.prototype)).constructor=i;var r=Yf();function i(e){n.call(this,e)}i._configure=function(){r.Buffer&&(i.prototype._slice=r.Buffer.prototype.slice)},i.prototype.string=function(){var e=this.uint32();return this.buf.utf8Slice?this.buf.utf8Slice(this.pos,this.pos=Math.min(this.pos+e,this.len)):this.buf.toString(`utf-8`,this.pos,this.pos=Math.min(this.pos+e,this.len))},i._configure()})),ep=h(((e,t)=>{t.exports=r;var n=Yf();(r.prototype=Object.create(n.EventEmitter.prototype)).constructor=r;function r(e,t,r){if(typeof e!=`function`)throw TypeError(`rpcImpl must be a function`);n.EventEmitter.call(this),this.rpcImpl=e,this.requestDelimited=!!t,this.responseDelimited=!!r}r.prototype.rpcCall=function e(t,r,i,a,o){if(!a)throw TypeError(`request must be specified`);var s=this;if(!o)return n.asPromise(e,s,t,r,i,a);if(!s.rpcImpl){setTimeout(function(){o(Error(`already ended`))},0);return}try{return s.rpcImpl(t,r[s.requestDelimited?`encodeDelimited`:`encode`](a).finish(),function(e,n){if(e)return s.emit(`error`,e,t),o(e);if(n===null){s.end(!0);return}if(!(n instanceof i))try{n=i[s.responseDelimited?`decodeDelimited`:`decode`](n)}catch(e){return s.emit(`error`,e,t),o(e)}return s.emit(`data`,n,t),o(null,n)})}catch(e){s.emit(`error`,e,t),setTimeout(function(){o(e)},0);return}},r.prototype.end=function(e){return this.rpcImpl&&(e||this.rpcImpl(null,null,null),this.rpcImpl=null,this.emit(`end`).off()),this}})),tp=h((e=>{var t=e;t.Service=ep()})),np=h(((e,t)=>{t.exports={}})),rp=h((e=>{var t=e;t.build=`minimal`,t.Writer=Xf(),t.BufferWriter=Zf(),t.Reader=Qf(),t.BufferReader=$f(),t.util=Yf(),t.rpc=tp(),t.roots=np(),t.configure=n;function n(){t.util._configure(),t.Writer._configure(t.BufferWriter),t.Reader._configure(t.BufferReader)}n()})),ip=h(((e,t)=>{t.exports=rp()})),ap=h(((e,t)=>{var n=ip(),r=n.Reader,i=n.Writer,a=n.util,o=n.roots.default||(n.roots.default={});o.onnx=(function(){var e={};return e.Version=(function(){var e={},t=Object.create(e);return t[e[0]=`_START_VERSION`]=0,t[e[1]=`IR_VERSION_2017_10_10`]=1,t[e[2]=`IR_VERSION_2017_10_30`]=2,t[e[3]=`IR_VERSION_2017_11_3`]=3,t[e[4]=`IR_VERSION_2019_1_22`]=4,t[e[5]=`IR_VERSION_2019_3_18`]=5,t[e[6]=`IR_VERSION_2019_9_19`]=6,t[e[7]=`IR_VERSION_2020_5_8`]=7,t[e[8]=`IR_VERSION`]=8,t})(),e.AttributeProto=(function(){function e(e){if(this.floats=[],this.ints=[],this.strings=[],this.tensors=[],this.graphs=[],this.sparseTensors=[],this.typeProtos=[],e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.name=``,e.prototype.refAttrName=``,e.prototype.docString=``,e.prototype.type=0,e.prototype.f=0,e.prototype.i=a.Long?a.Long.fromBits(0,0,!1):0,e.prototype.s=a.newBuffer([]),e.prototype.t=null,e.prototype.g=null,e.prototype.sparseTensor=null,e.prototype.tp=null,e.prototype.floats=a.emptyArray,e.prototype.ints=a.emptyArray,e.prototype.strings=a.emptyArray,e.prototype.tensors=a.emptyArray,e.prototype.graphs=a.emptyArray,e.prototype.sparseTensors=a.emptyArray,e.prototype.typeProtos=a.emptyArray,e.create=function(t){return new e(t)},e.encode=function(e,t){if(t||=i.create(),e.name!=null&&Object.hasOwnProperty.call(e,`name`)&&t.uint32(10).string(e.name),e.f!=null&&Object.hasOwnProperty.call(e,`f`)&&t.uint32(21).float(e.f),e.i!=null&&Object.hasOwnProperty.call(e,`i`)&&t.uint32(24).int64(e.i),e.s!=null&&Object.hasOwnProperty.call(e,`s`)&&t.uint32(34).bytes(e.s),e.t!=null&&Object.hasOwnProperty.call(e,`t`)&&o.onnx.TensorProto.encode(e.t,t.uint32(42).fork()).ldelim(),e.g!=null&&Object.hasOwnProperty.call(e,`g`)&&o.onnx.GraphProto.encode(e.g,t.uint32(50).fork()).ldelim(),e.floats!=null&&e.floats.length){t.uint32(58).fork();for(var n=0;n<e.floats.length;++n)t.float(e.floats[n]);t.ldelim()}if(e.ints!=null&&e.ints.length){t.uint32(66).fork();for(var n=0;n<e.ints.length;++n)t.int64(e.ints[n]);t.ldelim()}if(e.strings!=null&&e.strings.length)for(var n=0;n<e.strings.length;++n)t.uint32(74).bytes(e.strings[n]);if(e.tensors!=null&&e.tensors.length)for(var n=0;n<e.tensors.length;++n)o.onnx.TensorProto.encode(e.tensors[n],t.uint32(82).fork()).ldelim();if(e.graphs!=null&&e.graphs.length)for(var n=0;n<e.graphs.length;++n)o.onnx.GraphProto.encode(e.graphs[n],t.uint32(90).fork()).ldelim();if(e.docString!=null&&Object.hasOwnProperty.call(e,`docString`)&&t.uint32(106).string(e.docString),e.tp!=null&&Object.hasOwnProperty.call(e,`tp`)&&o.onnx.TypeProto.encode(e.tp,t.uint32(114).fork()).ldelim(),e.typeProtos!=null&&e.typeProtos.length)for(var n=0;n<e.typeProtos.length;++n)o.onnx.TypeProto.encode(e.typeProtos[n],t.uint32(122).fork()).ldelim();if(e.type!=null&&Object.hasOwnProperty.call(e,`type`)&&t.uint32(160).int32(e.type),e.refAttrName!=null&&Object.hasOwnProperty.call(e,`refAttrName`)&&t.uint32(170).string(e.refAttrName),e.sparseTensor!=null&&Object.hasOwnProperty.call(e,`sparseTensor`)&&o.onnx.SparseTensorProto.encode(e.sparseTensor,t.uint32(178).fork()).ldelim(),e.sparseTensors!=null&&e.sparseTensors.length)for(var n=0;n<e.sparseTensors.length;++n)o.onnx.SparseTensorProto.encode(e.sparseTensors[n],t.uint32(186).fork()).ldelim();return t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.AttributeProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.name=e.string();break;case 21:i.refAttrName=e.string();break;case 13:i.docString=e.string();break;case 20:i.type=e.int32();break;case 2:i.f=e.float();break;case 3:i.i=e.int64();break;case 4:i.s=e.bytes();break;case 5:i.t=o.onnx.TensorProto.decode(e,e.uint32());break;case 6:i.g=o.onnx.GraphProto.decode(e,e.uint32());break;case 22:i.sparseTensor=o.onnx.SparseTensorProto.decode(e,e.uint32());break;case 14:i.tp=o.onnx.TypeProto.decode(e,e.uint32());break;case 7:if(i.floats&&i.floats.length||(i.floats=[]),(a&7)==2)for(var s=e.uint32()+e.pos;e.pos<s;)i.floats.push(e.float());else i.floats.push(e.float());break;case 8:if(i.ints&&i.ints.length||(i.ints=[]),(a&7)==2)for(var s=e.uint32()+e.pos;e.pos<s;)i.ints.push(e.int64());else i.ints.push(e.int64());break;case 9:i.strings&&i.strings.length||(i.strings=[]),i.strings.push(e.bytes());break;case 10:i.tensors&&i.tensors.length||(i.tensors=[]),i.tensors.push(o.onnx.TensorProto.decode(e,e.uint32()));break;case 11:i.graphs&&i.graphs.length||(i.graphs=[]),i.graphs.push(o.onnx.GraphProto.decode(e,e.uint32()));break;case 23:i.sparseTensors&&i.sparseTensors.length||(i.sparseTensors=[]),i.sparseTensors.push(o.onnx.SparseTensorProto.decode(e,e.uint32()));break;case 15:i.typeProtos&&i.typeProtos.length||(i.typeProtos=[]),i.typeProtos.push(o.onnx.TypeProto.decode(e,e.uint32()));break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.name!=null&&e.hasOwnProperty(`name`)&&!a.isString(e.name))return`name: string expected`;if(e.refAttrName!=null&&e.hasOwnProperty(`refAttrName`)&&!a.isString(e.refAttrName))return`refAttrName: string expected`;if(e.docString!=null&&e.hasOwnProperty(`docString`)&&!a.isString(e.docString))return`docString: string expected`;if(e.type!=null&&e.hasOwnProperty(`type`))switch(e.type){default:return`type: enum value expected`;case 0:case 1:case 2:case 3:case 4:case 5:case 11:case 13:case 6:case 7:case 8:case 9:case 10:case 12:case 14:}if(e.f!=null&&e.hasOwnProperty(`f`)&&typeof e.f!=`number`)return`f: number expected`;if(e.i!=null&&e.hasOwnProperty(`i`)&&!a.isInteger(e.i)&&!(e.i&&a.isInteger(e.i.low)&&a.isInteger(e.i.high)))return`i: integer|Long expected`;if(e.s!=null&&e.hasOwnProperty(`s`)&&!(e.s&&typeof e.s.length==`number`||a.isString(e.s)))return`s: buffer expected`;if(e.t!=null&&e.hasOwnProperty(`t`)){var t=o.onnx.TensorProto.verify(e.t);if(t)return`t.`+t}if(e.g!=null&&e.hasOwnProperty(`g`)){var t=o.onnx.GraphProto.verify(e.g);if(t)return`g.`+t}if(e.sparseTensor!=null&&e.hasOwnProperty(`sparseTensor`)){var t=o.onnx.SparseTensorProto.verify(e.sparseTensor);if(t)return`sparseTensor.`+t}if(e.tp!=null&&e.hasOwnProperty(`tp`)){var t=o.onnx.TypeProto.verify(e.tp);if(t)return`tp.`+t}if(e.floats!=null&&e.hasOwnProperty(`floats`)){if(!Array.isArray(e.floats))return`floats: array expected`;for(var n=0;n<e.floats.length;++n)if(typeof e.floats[n]!=`number`)return`floats: number[] expected`}if(e.ints!=null&&e.hasOwnProperty(`ints`)){if(!Array.isArray(e.ints))return`ints: array expected`;for(var n=0;n<e.ints.length;++n)if(!a.isInteger(e.ints[n])&&!(e.ints[n]&&a.isInteger(e.ints[n].low)&&a.isInteger(e.ints[n].high)))return`ints: integer|Long[] expected`}if(e.strings!=null&&e.hasOwnProperty(`strings`)){if(!Array.isArray(e.strings))return`strings: array expected`;for(var n=0;n<e.strings.length;++n)if(!(e.strings[n]&&typeof e.strings[n].length==`number`||a.isString(e.strings[n])))return`strings: buffer[] expected`}if(e.tensors!=null&&e.hasOwnProperty(`tensors`)){if(!Array.isArray(e.tensors))return`tensors: array expected`;for(var n=0;n<e.tensors.length;++n){var t=o.onnx.TensorProto.verify(e.tensors[n]);if(t)return`tensors.`+t}}if(e.graphs!=null&&e.hasOwnProperty(`graphs`)){if(!Array.isArray(e.graphs))return`graphs: array expected`;for(var n=0;n<e.graphs.length;++n){var t=o.onnx.GraphProto.verify(e.graphs[n]);if(t)return`graphs.`+t}}if(e.sparseTensors!=null&&e.hasOwnProperty(`sparseTensors`)){if(!Array.isArray(e.sparseTensors))return`sparseTensors: array expected`;for(var n=0;n<e.sparseTensors.length;++n){var t=o.onnx.SparseTensorProto.verify(e.sparseTensors[n]);if(t)return`sparseTensors.`+t}}if(e.typeProtos!=null&&e.hasOwnProperty(`typeProtos`)){if(!Array.isArray(e.typeProtos))return`typeProtos: array expected`;for(var n=0;n<e.typeProtos.length;++n){var t=o.onnx.TypeProto.verify(e.typeProtos[n]);if(t)return`typeProtos.`+t}}return null},e.fromObject=function(e){if(e instanceof o.onnx.AttributeProto)return e;var t=new o.onnx.AttributeProto;switch(e.name!=null&&(t.name=String(e.name)),e.refAttrName!=null&&(t.refAttrName=String(e.refAttrName)),e.docString!=null&&(t.docString=String(e.docString)),e.type){case`UNDEFINED`:case 0:t.type=0;break;case`FLOAT`:case 1:t.type=1;break;case`INT`:case 2:t.type=2;break;case`STRING`:case 3:t.type=3;break;case`TENSOR`:case 4:t.type=4;break;case`GRAPH`:case 5:t.type=5;break;case`SPARSE_TENSOR`:case 11:t.type=11;break;case`TYPE_PROTO`:case 13:t.type=13;break;case`FLOATS`:case 6:t.type=6;break;case`INTS`:case 7:t.type=7;break;case`STRINGS`:case 8:t.type=8;break;case`TENSORS`:case 9:t.type=9;break;case`GRAPHS`:case 10:t.type=10;break;case`SPARSE_TENSORS`:case 12:t.type=12;break;case`TYPE_PROTOS`:case 14:t.type=14}if(e.f!=null&&(t.f=Number(e.f)),e.i!=null&&(a.Long?(t.i=a.Long.fromValue(e.i)).unsigned=!1:typeof e.i==`string`?t.i=parseInt(e.i,10):typeof e.i==`number`?t.i=e.i:typeof e.i==`object`&&(t.i=new a.LongBits(e.i.low>>>0,e.i.high>>>0).toNumber())),e.s!=null&&(typeof e.s==`string`?a.base64.decode(e.s,t.s=a.newBuffer(a.base64.length(e.s)),0):e.s.length&&(t.s=e.s)),e.t!=null){if(typeof e.t!=`object`)throw TypeError(`.onnx.AttributeProto.t: object expected`);t.t=o.onnx.TensorProto.fromObject(e.t)}if(e.g!=null){if(typeof e.g!=`object`)throw TypeError(`.onnx.AttributeProto.g: object expected`);t.g=o.onnx.GraphProto.fromObject(e.g)}if(e.sparseTensor!=null){if(typeof e.sparseTensor!=`object`)throw TypeError(`.onnx.AttributeProto.sparseTensor: object expected`);t.sparseTensor=o.onnx.SparseTensorProto.fromObject(e.sparseTensor)}if(e.tp!=null){if(typeof e.tp!=`object`)throw TypeError(`.onnx.AttributeProto.tp: object expected`);t.tp=o.onnx.TypeProto.fromObject(e.tp)}if(e.floats){if(!Array.isArray(e.floats))throw TypeError(`.onnx.AttributeProto.floats: array expected`);t.floats=[];for(var n=0;n<e.floats.length;++n)t.floats[n]=Number(e.floats[n])}if(e.ints){if(!Array.isArray(e.ints))throw TypeError(`.onnx.AttributeProto.ints: array expected`);t.ints=[];for(var n=0;n<e.ints.length;++n)a.Long?(t.ints[n]=a.Long.fromValue(e.ints[n])).unsigned=!1:typeof e.ints[n]==`string`?t.ints[n]=parseInt(e.ints[n],10):typeof e.ints[n]==`number`?t.ints[n]=e.ints[n]:typeof e.ints[n]==`object`&&(t.ints[n]=new a.LongBits(e.ints[n].low>>>0,e.ints[n].high>>>0).toNumber())}if(e.strings){if(!Array.isArray(e.strings))throw TypeError(`.onnx.AttributeProto.strings: array expected`);t.strings=[];for(var n=0;n<e.strings.length;++n)typeof e.strings[n]==`string`?a.base64.decode(e.strings[n],t.strings[n]=a.newBuffer(a.base64.length(e.strings[n])),0):e.strings[n].length&&(t.strings[n]=e.strings[n])}if(e.tensors){if(!Array.isArray(e.tensors))throw TypeError(`.onnx.AttributeProto.tensors: array expected`);t.tensors=[];for(var n=0;n<e.tensors.length;++n){if(typeof e.tensors[n]!=`object`)throw TypeError(`.onnx.AttributeProto.tensors: object expected`);t.tensors[n]=o.onnx.TensorProto.fromObject(e.tensors[n])}}if(e.graphs){if(!Array.isArray(e.graphs))throw TypeError(`.onnx.AttributeProto.graphs: array expected`);t.graphs=[];for(var n=0;n<e.graphs.length;++n){if(typeof e.graphs[n]!=`object`)throw TypeError(`.onnx.AttributeProto.graphs: object expected`);t.graphs[n]=o.onnx.GraphProto.fromObject(e.graphs[n])}}if(e.sparseTensors){if(!Array.isArray(e.sparseTensors))throw TypeError(`.onnx.AttributeProto.sparseTensors: array expected`);t.sparseTensors=[];for(var n=0;n<e.sparseTensors.length;++n){if(typeof e.sparseTensors[n]!=`object`)throw TypeError(`.onnx.AttributeProto.sparseTensors: object expected`);t.sparseTensors[n]=o.onnx.SparseTensorProto.fromObject(e.sparseTensors[n])}}if(e.typeProtos){if(!Array.isArray(e.typeProtos))throw TypeError(`.onnx.AttributeProto.typeProtos: array expected`);t.typeProtos=[];for(var n=0;n<e.typeProtos.length;++n){if(typeof e.typeProtos[n]!=`object`)throw TypeError(`.onnx.AttributeProto.typeProtos: object expected`);t.typeProtos[n]=o.onnx.TypeProto.fromObject(e.typeProtos[n])}}return t},e.toObject=function(e,t){t||={};var n={};if((t.arrays||t.defaults)&&(n.floats=[],n.ints=[],n.strings=[],n.tensors=[],n.graphs=[],n.typeProtos=[],n.sparseTensors=[]),t.defaults){if(n.name=``,n.f=0,a.Long){var r=new a.Long(0,0,!1);n.i=t.longs===String?r.toString():t.longs===Number?r.toNumber():r}else n.i=t.longs===String?`0`:0;t.bytes===String?n.s=``:(n.s=[],t.bytes!==Array&&(n.s=a.newBuffer(n.s))),n.t=null,n.g=null,n.docString=``,n.tp=null,n.type=t.enums===String?`UNDEFINED`:0,n.refAttrName=``,n.sparseTensor=null}if(e.name!=null&&e.hasOwnProperty(`name`)&&(n.name=e.name),e.f!=null&&e.hasOwnProperty(`f`)&&(n.f=t.json&&!isFinite(e.f)?String(e.f):e.f),e.i!=null&&e.hasOwnProperty(`i`)&&(n.i=typeof e.i==`number`?t.longs===String?String(e.i):e.i:t.longs===String?a.Long.prototype.toString.call(e.i):t.longs===Number?new a.LongBits(e.i.low>>>0,e.i.high>>>0).toNumber():e.i),e.s!=null&&e.hasOwnProperty(`s`)&&(n.s=t.bytes===String?a.base64.encode(e.s,0,e.s.length):t.bytes===Array?Array.prototype.slice.call(e.s):e.s),e.t!=null&&e.hasOwnProperty(`t`)&&(n.t=o.onnx.TensorProto.toObject(e.t,t)),e.g!=null&&e.hasOwnProperty(`g`)&&(n.g=o.onnx.GraphProto.toObject(e.g,t)),e.floats&&e.floats.length){n.floats=[];for(var i=0;i<e.floats.length;++i)n.floats[i]=t.json&&!isFinite(e.floats[i])?String(e.floats[i]):e.floats[i]}if(e.ints&&e.ints.length){n.ints=[];for(var i=0;i<e.ints.length;++i)typeof e.ints[i]==`number`?n.ints[i]=t.longs===String?String(e.ints[i]):e.ints[i]:n.ints[i]=t.longs===String?a.Long.prototype.toString.call(e.ints[i]):t.longs===Number?new a.LongBits(e.ints[i].low>>>0,e.ints[i].high>>>0).toNumber():e.ints[i]}if(e.strings&&e.strings.length){n.strings=[];for(var i=0;i<e.strings.length;++i)n.strings[i]=t.bytes===String?a.base64.encode(e.strings[i],0,e.strings[i].length):t.bytes===Array?Array.prototype.slice.call(e.strings[i]):e.strings[i]}if(e.tensors&&e.tensors.length){n.tensors=[];for(var i=0;i<e.tensors.length;++i)n.tensors[i]=o.onnx.TensorProto.toObject(e.tensors[i],t)}if(e.graphs&&e.graphs.length){n.graphs=[];for(var i=0;i<e.graphs.length;++i)n.graphs[i]=o.onnx.GraphProto.toObject(e.graphs[i],t)}if(e.docString!=null&&e.hasOwnProperty(`docString`)&&(n.docString=e.docString),e.tp!=null&&e.hasOwnProperty(`tp`)&&(n.tp=o.onnx.TypeProto.toObject(e.tp,t)),e.typeProtos&&e.typeProtos.length){n.typeProtos=[];for(var i=0;i<e.typeProtos.length;++i)n.typeProtos[i]=o.onnx.TypeProto.toObject(e.typeProtos[i],t)}if(e.type!=null&&e.hasOwnProperty(`type`)&&(n.type=t.enums===String?o.onnx.AttributeProto.AttributeType[e.type]:e.type),e.refAttrName!=null&&e.hasOwnProperty(`refAttrName`)&&(n.refAttrName=e.refAttrName),e.sparseTensor!=null&&e.hasOwnProperty(`sparseTensor`)&&(n.sparseTensor=o.onnx.SparseTensorProto.toObject(e.sparseTensor,t)),e.sparseTensors&&e.sparseTensors.length){n.sparseTensors=[];for(var i=0;i<e.sparseTensors.length;++i)n.sparseTensors[i]=o.onnx.SparseTensorProto.toObject(e.sparseTensors[i],t)}return n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e.AttributeType=(function(){var e={},t=Object.create(e);return t[e[0]=`UNDEFINED`]=0,t[e[1]=`FLOAT`]=1,t[e[2]=`INT`]=2,t[e[3]=`STRING`]=3,t[e[4]=`TENSOR`]=4,t[e[5]=`GRAPH`]=5,t[e[11]=`SPARSE_TENSOR`]=11,t[e[13]=`TYPE_PROTO`]=13,t[e[6]=`FLOATS`]=6,t[e[7]=`INTS`]=7,t[e[8]=`STRINGS`]=8,t[e[9]=`TENSORS`]=9,t[e[10]=`GRAPHS`]=10,t[e[12]=`SPARSE_TENSORS`]=12,t[e[14]=`TYPE_PROTOS`]=14,t})(),e})(),e.ValueInfoProto=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.name=``,e.prototype.type=null,e.prototype.docString=``,e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.name!=null&&Object.hasOwnProperty.call(e,`name`)&&t.uint32(10).string(e.name),e.type!=null&&Object.hasOwnProperty.call(e,`type`)&&o.onnx.TypeProto.encode(e.type,t.uint32(18).fork()).ldelim(),e.docString!=null&&Object.hasOwnProperty.call(e,`docString`)&&t.uint32(26).string(e.docString),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.ValueInfoProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.name=e.string();break;case 2:i.type=o.onnx.TypeProto.decode(e,e.uint32());break;case 3:i.docString=e.string();break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.name!=null&&e.hasOwnProperty(`name`)&&!a.isString(e.name))return`name: string expected`;if(e.type!=null&&e.hasOwnProperty(`type`)){var t=o.onnx.TypeProto.verify(e.type);if(t)return`type.`+t}return e.docString!=null&&e.hasOwnProperty(`docString`)&&!a.isString(e.docString)?`docString: string expected`:null},e.fromObject=function(e){if(e instanceof o.onnx.ValueInfoProto)return e;var t=new o.onnx.ValueInfoProto;if(e.name!=null&&(t.name=String(e.name)),e.type!=null){if(typeof e.type!=`object`)throw TypeError(`.onnx.ValueInfoProto.type: object expected`);t.type=o.onnx.TypeProto.fromObject(e.type)}return e.docString!=null&&(t.docString=String(e.docString)),t},e.toObject=function(e,t){t||={};var n={};return t.defaults&&(n.name=``,n.type=null,n.docString=``),e.name!=null&&e.hasOwnProperty(`name`)&&(n.name=e.name),e.type!=null&&e.hasOwnProperty(`type`)&&(n.type=o.onnx.TypeProto.toObject(e.type,t)),e.docString!=null&&e.hasOwnProperty(`docString`)&&(n.docString=e.docString),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.NodeProto=(function(){function e(e){if(this.input=[],this.output=[],this.attribute=[],e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.input=a.emptyArray,e.prototype.output=a.emptyArray,e.prototype.name=``,e.prototype.opType=``,e.prototype.domain=``,e.prototype.attribute=a.emptyArray,e.prototype.docString=``,e.create=function(t){return new e(t)},e.encode=function(e,t){if(t||=i.create(),e.input!=null&&e.input.length)for(var n=0;n<e.input.length;++n)t.uint32(10).string(e.input[n]);if(e.output!=null&&e.output.length)for(var n=0;n<e.output.length;++n)t.uint32(18).string(e.output[n]);if(e.name!=null&&Object.hasOwnProperty.call(e,`name`)&&t.uint32(26).string(e.name),e.opType!=null&&Object.hasOwnProperty.call(e,`opType`)&&t.uint32(34).string(e.opType),e.attribute!=null&&e.attribute.length)for(var n=0;n<e.attribute.length;++n)o.onnx.AttributeProto.encode(e.attribute[n],t.uint32(42).fork()).ldelim();return e.docString!=null&&Object.hasOwnProperty.call(e,`docString`)&&t.uint32(50).string(e.docString),e.domain!=null&&Object.hasOwnProperty.call(e,`domain`)&&t.uint32(58).string(e.domain),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.NodeProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.input&&i.input.length||(i.input=[]),i.input.push(e.string());break;case 2:i.output&&i.output.length||(i.output=[]),i.output.push(e.string());break;case 3:i.name=e.string();break;case 4:i.opType=e.string();break;case 7:i.domain=e.string();break;case 5:i.attribute&&i.attribute.length||(i.attribute=[]),i.attribute.push(o.onnx.AttributeProto.decode(e,e.uint32()));break;case 6:i.docString=e.string();break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.input!=null&&e.hasOwnProperty(`input`)){if(!Array.isArray(e.input))return`input: array expected`;for(var t=0;t<e.input.length;++t)if(!a.isString(e.input[t]))return`input: string[] expected`}if(e.output!=null&&e.hasOwnProperty(`output`)){if(!Array.isArray(e.output))return`output: array expected`;for(var t=0;t<e.output.length;++t)if(!a.isString(e.output[t]))return`output: string[] expected`}if(e.name!=null&&e.hasOwnProperty(`name`)&&!a.isString(e.name))return`name: string expected`;if(e.opType!=null&&e.hasOwnProperty(`opType`)&&!a.isString(e.opType))return`opType: string expected`;if(e.domain!=null&&e.hasOwnProperty(`domain`)&&!a.isString(e.domain))return`domain: string expected`;if(e.attribute!=null&&e.hasOwnProperty(`attribute`)){if(!Array.isArray(e.attribute))return`attribute: array expected`;for(var t=0;t<e.attribute.length;++t){var n=o.onnx.AttributeProto.verify(e.attribute[t]);if(n)return`attribute.`+n}}return e.docString!=null&&e.hasOwnProperty(`docString`)&&!a.isString(e.docString)?`docString: string expected`:null},e.fromObject=function(e){if(e instanceof o.onnx.NodeProto)return e;var t=new o.onnx.NodeProto;if(e.input){if(!Array.isArray(e.input))throw TypeError(`.onnx.NodeProto.input: array expected`);t.input=[];for(var n=0;n<e.input.length;++n)t.input[n]=String(e.input[n])}if(e.output){if(!Array.isArray(e.output))throw TypeError(`.onnx.NodeProto.output: array expected`);t.output=[];for(var n=0;n<e.output.length;++n)t.output[n]=String(e.output[n])}if(e.name!=null&&(t.name=String(e.name)),e.opType!=null&&(t.opType=String(e.opType)),e.domain!=null&&(t.domain=String(e.domain)),e.attribute){if(!Array.isArray(e.attribute))throw TypeError(`.onnx.NodeProto.attribute: array expected`);t.attribute=[];for(var n=0;n<e.attribute.length;++n){if(typeof e.attribute[n]!=`object`)throw TypeError(`.onnx.NodeProto.attribute: object expected`);t.attribute[n]=o.onnx.AttributeProto.fromObject(e.attribute[n])}}return e.docString!=null&&(t.docString=String(e.docString)),t},e.toObject=function(e,t){t||={};var n={};if((t.arrays||t.defaults)&&(n.input=[],n.output=[],n.attribute=[]),t.defaults&&(n.name=``,n.opType=``,n.docString=``,n.domain=``),e.input&&e.input.length){n.input=[];for(var r=0;r<e.input.length;++r)n.input[r]=e.input[r]}if(e.output&&e.output.length){n.output=[];for(var r=0;r<e.output.length;++r)n.output[r]=e.output[r]}if(e.name!=null&&e.hasOwnProperty(`name`)&&(n.name=e.name),e.opType!=null&&e.hasOwnProperty(`opType`)&&(n.opType=e.opType),e.attribute&&e.attribute.length){n.attribute=[];for(var r=0;r<e.attribute.length;++r)n.attribute[r]=o.onnx.AttributeProto.toObject(e.attribute[r],t)}return e.docString!=null&&e.hasOwnProperty(`docString`)&&(n.docString=e.docString),e.domain!=null&&e.hasOwnProperty(`domain`)&&(n.domain=e.domain),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.TrainingInfoProto=(function(){function e(e){if(this.initializationBinding=[],this.updateBinding=[],e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.initialization=null,e.prototype.algorithm=null,e.prototype.initializationBinding=a.emptyArray,e.prototype.updateBinding=a.emptyArray,e.create=function(t){return new e(t)},e.encode=function(e,t){if(t||=i.create(),e.initialization!=null&&Object.hasOwnProperty.call(e,`initialization`)&&o.onnx.GraphProto.encode(e.initialization,t.uint32(10).fork()).ldelim(),e.algorithm!=null&&Object.hasOwnProperty.call(e,`algorithm`)&&o.onnx.GraphProto.encode(e.algorithm,t.uint32(18).fork()).ldelim(),e.initializationBinding!=null&&e.initializationBinding.length)for(var n=0;n<e.initializationBinding.length;++n)o.onnx.StringStringEntryProto.encode(e.initializationBinding[n],t.uint32(26).fork()).ldelim();if(e.updateBinding!=null&&e.updateBinding.length)for(var n=0;n<e.updateBinding.length;++n)o.onnx.StringStringEntryProto.encode(e.updateBinding[n],t.uint32(34).fork()).ldelim();return t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TrainingInfoProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.initialization=o.onnx.GraphProto.decode(e,e.uint32());break;case 2:i.algorithm=o.onnx.GraphProto.decode(e,e.uint32());break;case 3:i.initializationBinding&&i.initializationBinding.length||(i.initializationBinding=[]),i.initializationBinding.push(o.onnx.StringStringEntryProto.decode(e,e.uint32()));break;case 4:i.updateBinding&&i.updateBinding.length||(i.updateBinding=[]),i.updateBinding.push(o.onnx.StringStringEntryProto.decode(e,e.uint32()));break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.initialization!=null&&e.hasOwnProperty(`initialization`)){var t=o.onnx.GraphProto.verify(e.initialization);if(t)return`initialization.`+t}if(e.algorithm!=null&&e.hasOwnProperty(`algorithm`)){var t=o.onnx.GraphProto.verify(e.algorithm);if(t)return`algorithm.`+t}if(e.initializationBinding!=null&&e.hasOwnProperty(`initializationBinding`)){if(!Array.isArray(e.initializationBinding))return`initializationBinding: array expected`;for(var n=0;n<e.initializationBinding.length;++n){var t=o.onnx.StringStringEntryProto.verify(e.initializationBinding[n]);if(t)return`initializationBinding.`+t}}if(e.updateBinding!=null&&e.hasOwnProperty(`updateBinding`)){if(!Array.isArray(e.updateBinding))return`updateBinding: array expected`;for(var n=0;n<e.updateBinding.length;++n){var t=o.onnx.StringStringEntryProto.verify(e.updateBinding[n]);if(t)return`updateBinding.`+t}}return null},e.fromObject=function(e){if(e instanceof o.onnx.TrainingInfoProto)return e;var t=new o.onnx.TrainingInfoProto;if(e.initialization!=null){if(typeof e.initialization!=`object`)throw TypeError(`.onnx.TrainingInfoProto.initialization: object expected`);t.initialization=o.onnx.GraphProto.fromObject(e.initialization)}if(e.algorithm!=null){if(typeof e.algorithm!=`object`)throw TypeError(`.onnx.TrainingInfoProto.algorithm: object expected`);t.algorithm=o.onnx.GraphProto.fromObject(e.algorithm)}if(e.initializationBinding){if(!Array.isArray(e.initializationBinding))throw TypeError(`.onnx.TrainingInfoProto.initializationBinding: array expected`);t.initializationBinding=[];for(var n=0;n<e.initializationBinding.length;++n){if(typeof e.initializationBinding[n]!=`object`)throw TypeError(`.onnx.TrainingInfoProto.initializationBinding: object expected`);t.initializationBinding[n]=o.onnx.StringStringEntryProto.fromObject(e.initializationBinding[n])}}if(e.updateBinding){if(!Array.isArray(e.updateBinding))throw TypeError(`.onnx.TrainingInfoProto.updateBinding: array expected`);t.updateBinding=[];for(var n=0;n<e.updateBinding.length;++n){if(typeof e.updateBinding[n]!=`object`)throw TypeError(`.onnx.TrainingInfoProto.updateBinding: object expected`);t.updateBinding[n]=o.onnx.StringStringEntryProto.fromObject(e.updateBinding[n])}}return t},e.toObject=function(e,t){t||={};var n={};if((t.arrays||t.defaults)&&(n.initializationBinding=[],n.updateBinding=[]),t.defaults&&(n.initialization=null,n.algorithm=null),e.initialization!=null&&e.hasOwnProperty(`initialization`)&&(n.initialization=o.onnx.GraphProto.toObject(e.initialization,t)),e.algorithm!=null&&e.hasOwnProperty(`algorithm`)&&(n.algorithm=o.onnx.GraphProto.toObject(e.algorithm,t)),e.initializationBinding&&e.initializationBinding.length){n.initializationBinding=[];for(var r=0;r<e.initializationBinding.length;++r)n.initializationBinding[r]=o.onnx.StringStringEntryProto.toObject(e.initializationBinding[r],t)}if(e.updateBinding&&e.updateBinding.length){n.updateBinding=[];for(var r=0;r<e.updateBinding.length;++r)n.updateBinding[r]=o.onnx.StringStringEntryProto.toObject(e.updateBinding[r],t)}return n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.ModelProto=(function(){function e(e){if(this.opsetImport=[],this.metadataProps=[],this.trainingInfo=[],this.functions=[],e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.irVersion=a.Long?a.Long.fromBits(0,0,!1):0,e.prototype.opsetImport=a.emptyArray,e.prototype.producerName=``,e.prototype.producerVersion=``,e.prototype.domain=``,e.prototype.modelVersion=a.Long?a.Long.fromBits(0,0,!1):0,e.prototype.docString=``,e.prototype.graph=null,e.prototype.metadataProps=a.emptyArray,e.prototype.trainingInfo=a.emptyArray,e.prototype.functions=a.emptyArray,e.create=function(t){return new e(t)},e.encode=function(e,t){if(t||=i.create(),e.irVersion!=null&&Object.hasOwnProperty.call(e,`irVersion`)&&t.uint32(8).int64(e.irVersion),e.producerName!=null&&Object.hasOwnProperty.call(e,`producerName`)&&t.uint32(18).string(e.producerName),e.producerVersion!=null&&Object.hasOwnProperty.call(e,`producerVersion`)&&t.uint32(26).string(e.producerVersion),e.domain!=null&&Object.hasOwnProperty.call(e,`domain`)&&t.uint32(34).string(e.domain),e.modelVersion!=null&&Object.hasOwnProperty.call(e,`modelVersion`)&&t.uint32(40).int64(e.modelVersion),e.docString!=null&&Object.hasOwnProperty.call(e,`docString`)&&t.uint32(50).string(e.docString),e.graph!=null&&Object.hasOwnProperty.call(e,`graph`)&&o.onnx.GraphProto.encode(e.graph,t.uint32(58).fork()).ldelim(),e.opsetImport!=null&&e.opsetImport.length)for(var n=0;n<e.opsetImport.length;++n)o.onnx.OperatorSetIdProto.encode(e.opsetImport[n],t.uint32(66).fork()).ldelim();if(e.metadataProps!=null&&e.metadataProps.length)for(var n=0;n<e.metadataProps.length;++n)o.onnx.StringStringEntryProto.encode(e.metadataProps[n],t.uint32(114).fork()).ldelim();if(e.trainingInfo!=null&&e.trainingInfo.length)for(var n=0;n<e.trainingInfo.length;++n)o.onnx.TrainingInfoProto.encode(e.trainingInfo[n],t.uint32(162).fork()).ldelim();if(e.functions!=null&&e.functions.length)for(var n=0;n<e.functions.length;++n)o.onnx.FunctionProto.encode(e.functions[n],t.uint32(202).fork()).ldelim();return t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.ModelProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.irVersion=e.int64();break;case 8:i.opsetImport&&i.opsetImport.length||(i.opsetImport=[]),i.opsetImport.push(o.onnx.OperatorSetIdProto.decode(e,e.uint32()));break;case 2:i.producerName=e.string();break;case 3:i.producerVersion=e.string();break;case 4:i.domain=e.string();break;case 5:i.modelVersion=e.int64();break;case 6:i.docString=e.string();break;case 7:i.graph=o.onnx.GraphProto.decode(e,e.uint32());break;case 14:i.metadataProps&&i.metadataProps.length||(i.metadataProps=[]),i.metadataProps.push(o.onnx.StringStringEntryProto.decode(e,e.uint32()));break;case 20:i.trainingInfo&&i.trainingInfo.length||(i.trainingInfo=[]),i.trainingInfo.push(o.onnx.TrainingInfoProto.decode(e,e.uint32()));break;case 25:i.functions&&i.functions.length||(i.functions=[]),i.functions.push(o.onnx.FunctionProto.decode(e,e.uint32()));break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.irVersion!=null&&e.hasOwnProperty(`irVersion`)&&!a.isInteger(e.irVersion)&&!(e.irVersion&&a.isInteger(e.irVersion.low)&&a.isInteger(e.irVersion.high)))return`irVersion: integer|Long expected`;if(e.opsetImport!=null&&e.hasOwnProperty(`opsetImport`)){if(!Array.isArray(e.opsetImport))return`opsetImport: array expected`;for(var t=0;t<e.opsetImport.length;++t){var n=o.onnx.OperatorSetIdProto.verify(e.opsetImport[t]);if(n)return`opsetImport.`+n}}if(e.producerName!=null&&e.hasOwnProperty(`producerName`)&&!a.isString(e.producerName))return`producerName: string expected`;if(e.producerVersion!=null&&e.hasOwnProperty(`producerVersion`)&&!a.isString(e.producerVersion))return`producerVersion: string expected`;if(e.domain!=null&&e.hasOwnProperty(`domain`)&&!a.isString(e.domain))return`domain: string expected`;if(e.modelVersion!=null&&e.hasOwnProperty(`modelVersion`)&&!a.isInteger(e.modelVersion)&&!(e.modelVersion&&a.isInteger(e.modelVersion.low)&&a.isInteger(e.modelVersion.high)))return`modelVersion: integer|Long expected`;if(e.docString!=null&&e.hasOwnProperty(`docString`)&&!a.isString(e.docString))return`docString: string expected`;if(e.graph!=null&&e.hasOwnProperty(`graph`)){var n=o.onnx.GraphProto.verify(e.graph);if(n)return`graph.`+n}if(e.metadataProps!=null&&e.hasOwnProperty(`metadataProps`)){if(!Array.isArray(e.metadataProps))return`metadataProps: array expected`;for(var t=0;t<e.metadataProps.length;++t){var n=o.onnx.StringStringEntryProto.verify(e.metadataProps[t]);if(n)return`metadataProps.`+n}}if(e.trainingInfo!=null&&e.hasOwnProperty(`trainingInfo`)){if(!Array.isArray(e.trainingInfo))return`trainingInfo: array expected`;for(var t=0;t<e.trainingInfo.length;++t){var n=o.onnx.TrainingInfoProto.verify(e.trainingInfo[t]);if(n)return`trainingInfo.`+n}}if(e.functions!=null&&e.hasOwnProperty(`functions`)){if(!Array.isArray(e.functions))return`functions: array expected`;for(var t=0;t<e.functions.length;++t){var n=o.onnx.FunctionProto.verify(e.functions[t]);if(n)return`functions.`+n}}return null},e.fromObject=function(e){if(e instanceof o.onnx.ModelProto)return e;var t=new o.onnx.ModelProto;if(e.irVersion!=null&&(a.Long?(t.irVersion=a.Long.fromValue(e.irVersion)).unsigned=!1:typeof e.irVersion==`string`?t.irVersion=parseInt(e.irVersion,10):typeof e.irVersion==`number`?t.irVersion=e.irVersion:typeof e.irVersion==`object`&&(t.irVersion=new a.LongBits(e.irVersion.low>>>0,e.irVersion.high>>>0).toNumber())),e.opsetImport){if(!Array.isArray(e.opsetImport))throw TypeError(`.onnx.ModelProto.opsetImport: array expected`);t.opsetImport=[];for(var n=0;n<e.opsetImport.length;++n){if(typeof e.opsetImport[n]!=`object`)throw TypeError(`.onnx.ModelProto.opsetImport: object expected`);t.opsetImport[n]=o.onnx.OperatorSetIdProto.fromObject(e.opsetImport[n])}}if(e.producerName!=null&&(t.producerName=String(e.producerName)),e.producerVersion!=null&&(t.producerVersion=String(e.producerVersion)),e.domain!=null&&(t.domain=String(e.domain)),e.modelVersion!=null&&(a.Long?(t.modelVersion=a.Long.fromValue(e.modelVersion)).unsigned=!1:typeof e.modelVersion==`string`?t.modelVersion=parseInt(e.modelVersion,10):typeof e.modelVersion==`number`?t.modelVersion=e.modelVersion:typeof e.modelVersion==`object`&&(t.modelVersion=new a.LongBits(e.modelVersion.low>>>0,e.modelVersion.high>>>0).toNumber())),e.docString!=null&&(t.docString=String(e.docString)),e.graph!=null){if(typeof e.graph!=`object`)throw TypeError(`.onnx.ModelProto.graph: object expected`);t.graph=o.onnx.GraphProto.fromObject(e.graph)}if(e.metadataProps){if(!Array.isArray(e.metadataProps))throw TypeError(`.onnx.ModelProto.metadataProps: array expected`);t.metadataProps=[];for(var n=0;n<e.metadataProps.length;++n){if(typeof e.metadataProps[n]!=`object`)throw TypeError(`.onnx.ModelProto.metadataProps: object expected`);t.metadataProps[n]=o.onnx.StringStringEntryProto.fromObject(e.metadataProps[n])}}if(e.trainingInfo){if(!Array.isArray(e.trainingInfo))throw TypeError(`.onnx.ModelProto.trainingInfo: array expected`);t.trainingInfo=[];for(var n=0;n<e.trainingInfo.length;++n){if(typeof e.trainingInfo[n]!=`object`)throw TypeError(`.onnx.ModelProto.trainingInfo: object expected`);t.trainingInfo[n]=o.onnx.TrainingInfoProto.fromObject(e.trainingInfo[n])}}if(e.functions){if(!Array.isArray(e.functions))throw TypeError(`.onnx.ModelProto.functions: array expected`);t.functions=[];for(var n=0;n<e.functions.length;++n){if(typeof e.functions[n]!=`object`)throw TypeError(`.onnx.ModelProto.functions: object expected`);t.functions[n]=o.onnx.FunctionProto.fromObject(e.functions[n])}}return t},e.toObject=function(e,t){t||={};var n={};if((t.arrays||t.defaults)&&(n.opsetImport=[],n.metadataProps=[],n.trainingInfo=[],n.functions=[]),t.defaults){if(a.Long){var r=new a.Long(0,0,!1);n.irVersion=t.longs===String?r.toString():t.longs===Number?r.toNumber():r}else n.irVersion=t.longs===String?`0`:0;if(n.producerName=``,n.producerVersion=``,n.domain=``,a.Long){var r=new a.Long(0,0,!1);n.modelVersion=t.longs===String?r.toString():t.longs===Number?r.toNumber():r}else n.modelVersion=t.longs===String?`0`:0;n.docString=``,n.graph=null}if(e.irVersion!=null&&e.hasOwnProperty(`irVersion`)&&(n.irVersion=typeof e.irVersion==`number`?t.longs===String?String(e.irVersion):e.irVersion:t.longs===String?a.Long.prototype.toString.call(e.irVersion):t.longs===Number?new a.LongBits(e.irVersion.low>>>0,e.irVersion.high>>>0).toNumber():e.irVersion),e.producerName!=null&&e.hasOwnProperty(`producerName`)&&(n.producerName=e.producerName),e.producerVersion!=null&&e.hasOwnProperty(`producerVersion`)&&(n.producerVersion=e.producerVersion),e.domain!=null&&e.hasOwnProperty(`domain`)&&(n.domain=e.domain),e.modelVersion!=null&&e.hasOwnProperty(`modelVersion`)&&(n.modelVersion=typeof e.modelVersion==`number`?t.longs===String?String(e.modelVersion):e.modelVersion:t.longs===String?a.Long.prototype.toString.call(e.modelVersion):t.longs===Number?new a.LongBits(e.modelVersion.low>>>0,e.modelVersion.high>>>0).toNumber():e.modelVersion),e.docString!=null&&e.hasOwnProperty(`docString`)&&(n.docString=e.docString),e.graph!=null&&e.hasOwnProperty(`graph`)&&(n.graph=o.onnx.GraphProto.toObject(e.graph,t)),e.opsetImport&&e.opsetImport.length){n.opsetImport=[];for(var i=0;i<e.opsetImport.length;++i)n.opsetImport[i]=o.onnx.OperatorSetIdProto.toObject(e.opsetImport[i],t)}if(e.metadataProps&&e.metadataProps.length){n.metadataProps=[];for(var i=0;i<e.metadataProps.length;++i)n.metadataProps[i]=o.onnx.StringStringEntryProto.toObject(e.metadataProps[i],t)}if(e.trainingInfo&&e.trainingInfo.length){n.trainingInfo=[];for(var i=0;i<e.trainingInfo.length;++i)n.trainingInfo[i]=o.onnx.TrainingInfoProto.toObject(e.trainingInfo[i],t)}if(e.functions&&e.functions.length){n.functions=[];for(var i=0;i<e.functions.length;++i)n.functions[i]=o.onnx.FunctionProto.toObject(e.functions[i],t)}return n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.StringStringEntryProto=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.key=``,e.prototype.value=``,e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.key!=null&&Object.hasOwnProperty.call(e,`key`)&&t.uint32(10).string(e.key),e.value!=null&&Object.hasOwnProperty.call(e,`value`)&&t.uint32(18).string(e.value),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.StringStringEntryProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.key=e.string();break;case 2:i.value=e.string();break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){return typeof e!=`object`||!e?`object expected`:e.key!=null&&e.hasOwnProperty(`key`)&&!a.isString(e.key)?`key: string expected`:e.value!=null&&e.hasOwnProperty(`value`)&&!a.isString(e.value)?`value: string expected`:null},e.fromObject=function(e){if(e instanceof o.onnx.StringStringEntryProto)return e;var t=new o.onnx.StringStringEntryProto;return e.key!=null&&(t.key=String(e.key)),e.value!=null&&(t.value=String(e.value)),t},e.toObject=function(e,t){t||={};var n={};return t.defaults&&(n.key=``,n.value=``),e.key!=null&&e.hasOwnProperty(`key`)&&(n.key=e.key),e.value!=null&&e.hasOwnProperty(`value`)&&(n.value=e.value),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.TensorAnnotation=(function(){function e(e){if(this.quantParameterTensorNames=[],e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.tensorName=``,e.prototype.quantParameterTensorNames=a.emptyArray,e.create=function(t){return new e(t)},e.encode=function(e,t){if(t||=i.create(),e.tensorName!=null&&Object.hasOwnProperty.call(e,`tensorName`)&&t.uint32(10).string(e.tensorName),e.quantParameterTensorNames!=null&&e.quantParameterTensorNames.length)for(var n=0;n<e.quantParameterTensorNames.length;++n)o.onnx.StringStringEntryProto.encode(e.quantParameterTensorNames[n],t.uint32(18).fork()).ldelim();return t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TensorAnnotation;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.tensorName=e.string();break;case 2:i.quantParameterTensorNames&&i.quantParameterTensorNames.length||(i.quantParameterTensorNames=[]),i.quantParameterTensorNames.push(o.onnx.StringStringEntryProto.decode(e,e.uint32()));break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.tensorName!=null&&e.hasOwnProperty(`tensorName`)&&!a.isString(e.tensorName))return`tensorName: string expected`;if(e.quantParameterTensorNames!=null&&e.hasOwnProperty(`quantParameterTensorNames`)){if(!Array.isArray(e.quantParameterTensorNames))return`quantParameterTensorNames: array expected`;for(var t=0;t<e.quantParameterTensorNames.length;++t){var n=o.onnx.StringStringEntryProto.verify(e.quantParameterTensorNames[t]);if(n)return`quantParameterTensorNames.`+n}}return null},e.fromObject=function(e){if(e instanceof o.onnx.TensorAnnotation)return e;var t=new o.onnx.TensorAnnotation;if(e.tensorName!=null&&(t.tensorName=String(e.tensorName)),e.quantParameterTensorNames){if(!Array.isArray(e.quantParameterTensorNames))throw TypeError(`.onnx.TensorAnnotation.quantParameterTensorNames: array expected`);t.quantParameterTensorNames=[];for(var n=0;n<e.quantParameterTensorNames.length;++n){if(typeof e.quantParameterTensorNames[n]!=`object`)throw TypeError(`.onnx.TensorAnnotation.quantParameterTensorNames: object expected`);t.quantParameterTensorNames[n]=o.onnx.StringStringEntryProto.fromObject(e.quantParameterTensorNames[n])}}return t},e.toObject=function(e,t){t||={};var n={};if((t.arrays||t.defaults)&&(n.quantParameterTensorNames=[]),t.defaults&&(n.tensorName=``),e.tensorName!=null&&e.hasOwnProperty(`tensorName`)&&(n.tensorName=e.tensorName),e.quantParameterTensorNames&&e.quantParameterTensorNames.length){n.quantParameterTensorNames=[];for(var r=0;r<e.quantParameterTensorNames.length;++r)n.quantParameterTensorNames[r]=o.onnx.StringStringEntryProto.toObject(e.quantParameterTensorNames[r],t)}return n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.GraphProto=(function(){function e(e){if(this.node=[],this.initializer=[],this.sparseInitializer=[],this.input=[],this.output=[],this.valueInfo=[],this.quantizationAnnotation=[],e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.node=a.emptyArray,e.prototype.name=``,e.prototype.initializer=a.emptyArray,e.prototype.sparseInitializer=a.emptyArray,e.prototype.docString=``,e.prototype.input=a.emptyArray,e.prototype.output=a.emptyArray,e.prototype.valueInfo=a.emptyArray,e.prototype.quantizationAnnotation=a.emptyArray,e.create=function(t){return new e(t)},e.encode=function(e,t){if(t||=i.create(),e.node!=null&&e.node.length)for(var n=0;n<e.node.length;++n)o.onnx.NodeProto.encode(e.node[n],t.uint32(10).fork()).ldelim();if(e.name!=null&&Object.hasOwnProperty.call(e,`name`)&&t.uint32(18).string(e.name),e.initializer!=null&&e.initializer.length)for(var n=0;n<e.initializer.length;++n)o.onnx.TensorProto.encode(e.initializer[n],t.uint32(42).fork()).ldelim();if(e.docString!=null&&Object.hasOwnProperty.call(e,`docString`)&&t.uint32(82).string(e.docString),e.input!=null&&e.input.length)for(var n=0;n<e.input.length;++n)o.onnx.ValueInfoProto.encode(e.input[n],t.uint32(90).fork()).ldelim();if(e.output!=null&&e.output.length)for(var n=0;n<e.output.length;++n)o.onnx.ValueInfoProto.encode(e.output[n],t.uint32(98).fork()).ldelim();if(e.valueInfo!=null&&e.valueInfo.length)for(var n=0;n<e.valueInfo.length;++n)o.onnx.ValueInfoProto.encode(e.valueInfo[n],t.uint32(106).fork()).ldelim();if(e.quantizationAnnotation!=null&&e.quantizationAnnotation.length)for(var n=0;n<e.quantizationAnnotation.length;++n)o.onnx.TensorAnnotation.encode(e.quantizationAnnotation[n],t.uint32(114).fork()).ldelim();if(e.sparseInitializer!=null&&e.sparseInitializer.length)for(var n=0;n<e.sparseInitializer.length;++n)o.onnx.SparseTensorProto.encode(e.sparseInitializer[n],t.uint32(122).fork()).ldelim();return t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.GraphProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.node&&i.node.length||(i.node=[]),i.node.push(o.onnx.NodeProto.decode(e,e.uint32()));break;case 2:i.name=e.string();break;case 5:i.initializer&&i.initializer.length||(i.initializer=[]),i.initializer.push(o.onnx.TensorProto.decode(e,e.uint32()));break;case 15:i.sparseInitializer&&i.sparseInitializer.length||(i.sparseInitializer=[]),i.sparseInitializer.push(o.onnx.SparseTensorProto.decode(e,e.uint32()));break;case 10:i.docString=e.string();break;case 11:i.input&&i.input.length||(i.input=[]),i.input.push(o.onnx.ValueInfoProto.decode(e,e.uint32()));break;case 12:i.output&&i.output.length||(i.output=[]),i.output.push(o.onnx.ValueInfoProto.decode(e,e.uint32()));break;case 13:i.valueInfo&&i.valueInfo.length||(i.valueInfo=[]),i.valueInfo.push(o.onnx.ValueInfoProto.decode(e,e.uint32()));break;case 14:i.quantizationAnnotation&&i.quantizationAnnotation.length||(i.quantizationAnnotation=[]),i.quantizationAnnotation.push(o.onnx.TensorAnnotation.decode(e,e.uint32()));break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.node!=null&&e.hasOwnProperty(`node`)){if(!Array.isArray(e.node))return`node: array expected`;for(var t=0;t<e.node.length;++t){var n=o.onnx.NodeProto.verify(e.node[t]);if(n)return`node.`+n}}if(e.name!=null&&e.hasOwnProperty(`name`)&&!a.isString(e.name))return`name: string expected`;if(e.initializer!=null&&e.hasOwnProperty(`initializer`)){if(!Array.isArray(e.initializer))return`initializer: array expected`;for(var t=0;t<e.initializer.length;++t){var n=o.onnx.TensorProto.verify(e.initializer[t]);if(n)return`initializer.`+n}}if(e.sparseInitializer!=null&&e.hasOwnProperty(`sparseInitializer`)){if(!Array.isArray(e.sparseInitializer))return`sparseInitializer: array expected`;for(var t=0;t<e.sparseInitializer.length;++t){var n=o.onnx.SparseTensorProto.verify(e.sparseInitializer[t]);if(n)return`sparseInitializer.`+n}}if(e.docString!=null&&e.hasOwnProperty(`docString`)&&!a.isString(e.docString))return`docString: string expected`;if(e.input!=null&&e.hasOwnProperty(`input`)){if(!Array.isArray(e.input))return`input: array expected`;for(var t=0;t<e.input.length;++t){var n=o.onnx.ValueInfoProto.verify(e.input[t]);if(n)return`input.`+n}}if(e.output!=null&&e.hasOwnProperty(`output`)){if(!Array.isArray(e.output))return`output: array expected`;for(var t=0;t<e.output.length;++t){var n=o.onnx.ValueInfoProto.verify(e.output[t]);if(n)return`output.`+n}}if(e.valueInfo!=null&&e.hasOwnProperty(`valueInfo`)){if(!Array.isArray(e.valueInfo))return`valueInfo: array expected`;for(var t=0;t<e.valueInfo.length;++t){var n=o.onnx.ValueInfoProto.verify(e.valueInfo[t]);if(n)return`valueInfo.`+n}}if(e.quantizationAnnotation!=null&&e.hasOwnProperty(`quantizationAnnotation`)){if(!Array.isArray(e.quantizationAnnotation))return`quantizationAnnotation: array expected`;for(var t=0;t<e.quantizationAnnotation.length;++t){var n=o.onnx.TensorAnnotation.verify(e.quantizationAnnotation[t]);if(n)return`quantizationAnnotation.`+n}}return null},e.fromObject=function(e){if(e instanceof o.onnx.GraphProto)return e;var t=new o.onnx.GraphProto;if(e.node){if(!Array.isArray(e.node))throw TypeError(`.onnx.GraphProto.node: array expected`);t.node=[];for(var n=0;n<e.node.length;++n){if(typeof e.node[n]!=`object`)throw TypeError(`.onnx.GraphProto.node: object expected`);t.node[n]=o.onnx.NodeProto.fromObject(e.node[n])}}if(e.name!=null&&(t.name=String(e.name)),e.initializer){if(!Array.isArray(e.initializer))throw TypeError(`.onnx.GraphProto.initializer: array expected`);t.initializer=[];for(var n=0;n<e.initializer.length;++n){if(typeof e.initializer[n]!=`object`)throw TypeError(`.onnx.GraphProto.initializer: object expected`);t.initializer[n]=o.onnx.TensorProto.fromObject(e.initializer[n])}}if(e.sparseInitializer){if(!Array.isArray(e.sparseInitializer))throw TypeError(`.onnx.GraphProto.sparseInitializer: array expected`);t.sparseInitializer=[];for(var n=0;n<e.sparseInitializer.length;++n){if(typeof e.sparseInitializer[n]!=`object`)throw TypeError(`.onnx.GraphProto.sparseInitializer: object expected`);t.sparseInitializer[n]=o.onnx.SparseTensorProto.fromObject(e.sparseInitializer[n])}}if(e.docString!=null&&(t.docString=String(e.docString)),e.input){if(!Array.isArray(e.input))throw TypeError(`.onnx.GraphProto.input: array expected`);t.input=[];for(var n=0;n<e.input.length;++n){if(typeof e.input[n]!=`object`)throw TypeError(`.onnx.GraphProto.input: object expected`);t.input[n]=o.onnx.ValueInfoProto.fromObject(e.input[n])}}if(e.output){if(!Array.isArray(e.output))throw TypeError(`.onnx.GraphProto.output: array expected`);t.output=[];for(var n=0;n<e.output.length;++n){if(typeof e.output[n]!=`object`)throw TypeError(`.onnx.GraphProto.output: object expected`);t.output[n]=o.onnx.ValueInfoProto.fromObject(e.output[n])}}if(e.valueInfo){if(!Array.isArray(e.valueInfo))throw TypeError(`.onnx.GraphProto.valueInfo: array expected`);t.valueInfo=[];for(var n=0;n<e.valueInfo.length;++n){if(typeof e.valueInfo[n]!=`object`)throw TypeError(`.onnx.GraphProto.valueInfo: object expected`);t.valueInfo[n]=o.onnx.ValueInfoProto.fromObject(e.valueInfo[n])}}if(e.quantizationAnnotation){if(!Array.isArray(e.quantizationAnnotation))throw TypeError(`.onnx.GraphProto.quantizationAnnotation: array expected`);t.quantizationAnnotation=[];for(var n=0;n<e.quantizationAnnotation.length;++n){if(typeof e.quantizationAnnotation[n]!=`object`)throw TypeError(`.onnx.GraphProto.quantizationAnnotation: object expected`);t.quantizationAnnotation[n]=o.onnx.TensorAnnotation.fromObject(e.quantizationAnnotation[n])}}return t},e.toObject=function(e,t){t||={};var n={};if((t.arrays||t.defaults)&&(n.node=[],n.initializer=[],n.input=[],n.output=[],n.valueInfo=[],n.quantizationAnnotation=[],n.sparseInitializer=[]),t.defaults&&(n.name=``,n.docString=``),e.node&&e.node.length){n.node=[];for(var r=0;r<e.node.length;++r)n.node[r]=o.onnx.NodeProto.toObject(e.node[r],t)}if(e.name!=null&&e.hasOwnProperty(`name`)&&(n.name=e.name),e.initializer&&e.initializer.length){n.initializer=[];for(var r=0;r<e.initializer.length;++r)n.initializer[r]=o.onnx.TensorProto.toObject(e.initializer[r],t)}if(e.docString!=null&&e.hasOwnProperty(`docString`)&&(n.docString=e.docString),e.input&&e.input.length){n.input=[];for(var r=0;r<e.input.length;++r)n.input[r]=o.onnx.ValueInfoProto.toObject(e.input[r],t)}if(e.output&&e.output.length){n.output=[];for(var r=0;r<e.output.length;++r)n.output[r]=o.onnx.ValueInfoProto.toObject(e.output[r],t)}if(e.valueInfo&&e.valueInfo.length){n.valueInfo=[];for(var r=0;r<e.valueInfo.length;++r)n.valueInfo[r]=o.onnx.ValueInfoProto.toObject(e.valueInfo[r],t)}if(e.quantizationAnnotation&&e.quantizationAnnotation.length){n.quantizationAnnotation=[];for(var r=0;r<e.quantizationAnnotation.length;++r)n.quantizationAnnotation[r]=o.onnx.TensorAnnotation.toObject(e.quantizationAnnotation[r],t)}if(e.sparseInitializer&&e.sparseInitializer.length){n.sparseInitializer=[];for(var r=0;r<e.sparseInitializer.length;++r)n.sparseInitializer[r]=o.onnx.SparseTensorProto.toObject(e.sparseInitializer[r],t)}return n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.TensorProto=(function(){function e(e){if(this.dims=[],this.floatData=[],this.int32Data=[],this.stringData=[],this.int64Data=[],this.externalData=[],this.doubleData=[],this.uint64Data=[],e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.dims=a.emptyArray,e.prototype.dataType=0,e.prototype.segment=null,e.prototype.floatData=a.emptyArray,e.prototype.int32Data=a.emptyArray,e.prototype.stringData=a.emptyArray,e.prototype.int64Data=a.emptyArray,e.prototype.name=``,e.prototype.docString=``,e.prototype.rawData=a.newBuffer([]),e.prototype.externalData=a.emptyArray,e.prototype.dataLocation=0,e.prototype.doubleData=a.emptyArray,e.prototype.uint64Data=a.emptyArray,e.create=function(t){return new e(t)},e.encode=function(e,t){if(t||=i.create(),e.dims!=null&&e.dims.length){t.uint32(10).fork();for(var n=0;n<e.dims.length;++n)t.int64(e.dims[n]);t.ldelim()}if(e.dataType!=null&&Object.hasOwnProperty.call(e,`dataType`)&&t.uint32(16).int32(e.dataType),e.segment!=null&&Object.hasOwnProperty.call(e,`segment`)&&o.onnx.TensorProto.Segment.encode(e.segment,t.uint32(26).fork()).ldelim(),e.floatData!=null&&e.floatData.length){t.uint32(34).fork();for(var n=0;n<e.floatData.length;++n)t.float(e.floatData[n]);t.ldelim()}if(e.int32Data!=null&&e.int32Data.length){t.uint32(42).fork();for(var n=0;n<e.int32Data.length;++n)t.int32(e.int32Data[n]);t.ldelim()}if(e.stringData!=null&&e.stringData.length)for(var n=0;n<e.stringData.length;++n)t.uint32(50).bytes(e.stringData[n]);if(e.int64Data!=null&&e.int64Data.length){t.uint32(58).fork();for(var n=0;n<e.int64Data.length;++n)t.int64(e.int64Data[n]);t.ldelim()}if(e.name!=null&&Object.hasOwnProperty.call(e,`name`)&&t.uint32(66).string(e.name),e.rawData!=null&&Object.hasOwnProperty.call(e,`rawData`)&&t.uint32(74).bytes(e.rawData),e.doubleData!=null&&e.doubleData.length){t.uint32(82).fork();for(var n=0;n<e.doubleData.length;++n)t.double(e.doubleData[n]);t.ldelim()}if(e.uint64Data!=null&&e.uint64Data.length){t.uint32(90).fork();for(var n=0;n<e.uint64Data.length;++n)t.uint64(e.uint64Data[n]);t.ldelim()}if(e.docString!=null&&Object.hasOwnProperty.call(e,`docString`)&&t.uint32(98).string(e.docString),e.externalData!=null&&e.externalData.length)for(var n=0;n<e.externalData.length;++n)o.onnx.StringStringEntryProto.encode(e.externalData[n],t.uint32(106).fork()).ldelim();return e.dataLocation!=null&&Object.hasOwnProperty.call(e,`dataLocation`)&&t.uint32(112).int32(e.dataLocation),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TensorProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:if(i.dims&&i.dims.length||(i.dims=[]),(a&7)==2)for(var s=e.uint32()+e.pos;e.pos<s;)i.dims.push(e.int64());else i.dims.push(e.int64());break;case 2:i.dataType=e.int32();break;case 3:i.segment=o.onnx.TensorProto.Segment.decode(e,e.uint32());break;case 4:if(i.floatData&&i.floatData.length||(i.floatData=[]),(a&7)==2)for(var s=e.uint32()+e.pos;e.pos<s;)i.floatData.push(e.float());else i.floatData.push(e.float());break;case 5:if(i.int32Data&&i.int32Data.length||(i.int32Data=[]),(a&7)==2)for(var s=e.uint32()+e.pos;e.pos<s;)i.int32Data.push(e.int32());else i.int32Data.push(e.int32());break;case 6:i.stringData&&i.stringData.length||(i.stringData=[]),i.stringData.push(e.bytes());break;case 7:if(i.int64Data&&i.int64Data.length||(i.int64Data=[]),(a&7)==2)for(var s=e.uint32()+e.pos;e.pos<s;)i.int64Data.push(e.int64());else i.int64Data.push(e.int64());break;case 8:i.name=e.string();break;case 12:i.docString=e.string();break;case 9:i.rawData=e.bytes();break;case 13:i.externalData&&i.externalData.length||(i.externalData=[]),i.externalData.push(o.onnx.StringStringEntryProto.decode(e,e.uint32()));break;case 14:i.dataLocation=e.int32();break;case 10:if(i.doubleData&&i.doubleData.length||(i.doubleData=[]),(a&7)==2)for(var s=e.uint32()+e.pos;e.pos<s;)i.doubleData.push(e.double());else i.doubleData.push(e.double());break;case 11:if(i.uint64Data&&i.uint64Data.length||(i.uint64Data=[]),(a&7)==2)for(var s=e.uint32()+e.pos;e.pos<s;)i.uint64Data.push(e.uint64());else i.uint64Data.push(e.uint64());break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.dims!=null&&e.hasOwnProperty(`dims`)){if(!Array.isArray(e.dims))return`dims: array expected`;for(var t=0;t<e.dims.length;++t)if(!a.isInteger(e.dims[t])&&!(e.dims[t]&&a.isInteger(e.dims[t].low)&&a.isInteger(e.dims[t].high)))return`dims: integer|Long[] expected`}if(e.dataType!=null&&e.hasOwnProperty(`dataType`)&&!a.isInteger(e.dataType))return`dataType: integer expected`;if(e.segment!=null&&e.hasOwnProperty(`segment`)){var n=o.onnx.TensorProto.Segment.verify(e.segment);if(n)return`segment.`+n}if(e.floatData!=null&&e.hasOwnProperty(`floatData`)){if(!Array.isArray(e.floatData))return`floatData: array expected`;for(var t=0;t<e.floatData.length;++t)if(typeof e.floatData[t]!=`number`)return`floatData: number[] expected`}if(e.int32Data!=null&&e.hasOwnProperty(`int32Data`)){if(!Array.isArray(e.int32Data))return`int32Data: array expected`;for(var t=0;t<e.int32Data.length;++t)if(!a.isInteger(e.int32Data[t]))return`int32Data: integer[] expected`}if(e.stringData!=null&&e.hasOwnProperty(`stringData`)){if(!Array.isArray(e.stringData))return`stringData: array expected`;for(var t=0;t<e.stringData.length;++t)if(!(e.stringData[t]&&typeof e.stringData[t].length==`number`||a.isString(e.stringData[t])))return`stringData: buffer[] expected`}if(e.int64Data!=null&&e.hasOwnProperty(`int64Data`)){if(!Array.isArray(e.int64Data))return`int64Data: array expected`;for(var t=0;t<e.int64Data.length;++t)if(!a.isInteger(e.int64Data[t])&&!(e.int64Data[t]&&a.isInteger(e.int64Data[t].low)&&a.isInteger(e.int64Data[t].high)))return`int64Data: integer|Long[] expected`}if(e.name!=null&&e.hasOwnProperty(`name`)&&!a.isString(e.name))return`name: string expected`;if(e.docString!=null&&e.hasOwnProperty(`docString`)&&!a.isString(e.docString))return`docString: string expected`;if(e.rawData!=null&&e.hasOwnProperty(`rawData`)&&!(e.rawData&&typeof e.rawData.length==`number`||a.isString(e.rawData)))return`rawData: buffer expected`;if(e.externalData!=null&&e.hasOwnProperty(`externalData`)){if(!Array.isArray(e.externalData))return`externalData: array expected`;for(var t=0;t<e.externalData.length;++t){var n=o.onnx.StringStringEntryProto.verify(e.externalData[t]);if(n)return`externalData.`+n}}if(e.dataLocation!=null&&e.hasOwnProperty(`dataLocation`))switch(e.dataLocation){default:return`dataLocation: enum value expected`;case 0:case 1:}if(e.doubleData!=null&&e.hasOwnProperty(`doubleData`)){if(!Array.isArray(e.doubleData))return`doubleData: array expected`;for(var t=0;t<e.doubleData.length;++t)if(typeof e.doubleData[t]!=`number`)return`doubleData: number[] expected`}if(e.uint64Data!=null&&e.hasOwnProperty(`uint64Data`)){if(!Array.isArray(e.uint64Data))return`uint64Data: array expected`;for(var t=0;t<e.uint64Data.length;++t)if(!a.isInteger(e.uint64Data[t])&&!(e.uint64Data[t]&&a.isInteger(e.uint64Data[t].low)&&a.isInteger(e.uint64Data[t].high)))return`uint64Data: integer|Long[] expected`}return null},e.fromObject=function(e){if(e instanceof o.onnx.TensorProto)return e;var t=new o.onnx.TensorProto;if(e.dims){if(!Array.isArray(e.dims))throw TypeError(`.onnx.TensorProto.dims: array expected`);t.dims=[];for(var n=0;n<e.dims.length;++n)a.Long?(t.dims[n]=a.Long.fromValue(e.dims[n])).unsigned=!1:typeof e.dims[n]==`string`?t.dims[n]=parseInt(e.dims[n],10):typeof e.dims[n]==`number`?t.dims[n]=e.dims[n]:typeof e.dims[n]==`object`&&(t.dims[n]=new a.LongBits(e.dims[n].low>>>0,e.dims[n].high>>>0).toNumber())}if(e.dataType!=null&&(t.dataType=e.dataType|0),e.segment!=null){if(typeof e.segment!=`object`)throw TypeError(`.onnx.TensorProto.segment: object expected`);t.segment=o.onnx.TensorProto.Segment.fromObject(e.segment)}if(e.floatData){if(!Array.isArray(e.floatData))throw TypeError(`.onnx.TensorProto.floatData: array expected`);t.floatData=[];for(var n=0;n<e.floatData.length;++n)t.floatData[n]=Number(e.floatData[n])}if(e.int32Data){if(!Array.isArray(e.int32Data))throw TypeError(`.onnx.TensorProto.int32Data: array expected`);t.int32Data=[];for(var n=0;n<e.int32Data.length;++n)t.int32Data[n]=e.int32Data[n]|0}if(e.stringData){if(!Array.isArray(e.stringData))throw TypeError(`.onnx.TensorProto.stringData: array expected`);t.stringData=[];for(var n=0;n<e.stringData.length;++n)typeof e.stringData[n]==`string`?a.base64.decode(e.stringData[n],t.stringData[n]=a.newBuffer(a.base64.length(e.stringData[n])),0):e.stringData[n].length&&(t.stringData[n]=e.stringData[n])}if(e.int64Data){if(!Array.isArray(e.int64Data))throw TypeError(`.onnx.TensorProto.int64Data: array expected`);t.int64Data=[];for(var n=0;n<e.int64Data.length;++n)a.Long?(t.int64Data[n]=a.Long.fromValue(e.int64Data[n])).unsigned=!1:typeof e.int64Data[n]==`string`?t.int64Data[n]=parseInt(e.int64Data[n],10):typeof e.int64Data[n]==`number`?t.int64Data[n]=e.int64Data[n]:typeof e.int64Data[n]==`object`&&(t.int64Data[n]=new a.LongBits(e.int64Data[n].low>>>0,e.int64Data[n].high>>>0).toNumber())}if(e.name!=null&&(t.name=String(e.name)),e.docString!=null&&(t.docString=String(e.docString)),e.rawData!=null&&(typeof e.rawData==`string`?a.base64.decode(e.rawData,t.rawData=a.newBuffer(a.base64.length(e.rawData)),0):e.rawData.length&&(t.rawData=e.rawData)),e.externalData){if(!Array.isArray(e.externalData))throw TypeError(`.onnx.TensorProto.externalData: array expected`);t.externalData=[];for(var n=0;n<e.externalData.length;++n){if(typeof e.externalData[n]!=`object`)throw TypeError(`.onnx.TensorProto.externalData: object expected`);t.externalData[n]=o.onnx.StringStringEntryProto.fromObject(e.externalData[n])}}switch(e.dataLocation){case`DEFAULT`:case 0:t.dataLocation=0;break;case`EXTERNAL`:case 1:t.dataLocation=1}if(e.doubleData){if(!Array.isArray(e.doubleData))throw TypeError(`.onnx.TensorProto.doubleData: array expected`);t.doubleData=[];for(var n=0;n<e.doubleData.length;++n)t.doubleData[n]=Number(e.doubleData[n])}if(e.uint64Data){if(!Array.isArray(e.uint64Data))throw TypeError(`.onnx.TensorProto.uint64Data: array expected`);t.uint64Data=[];for(var n=0;n<e.uint64Data.length;++n)a.Long?(t.uint64Data[n]=a.Long.fromValue(e.uint64Data[n])).unsigned=!0:typeof e.uint64Data[n]==`string`?t.uint64Data[n]=parseInt(e.uint64Data[n],10):typeof e.uint64Data[n]==`number`?t.uint64Data[n]=e.uint64Data[n]:typeof e.uint64Data[n]==`object`&&(t.uint64Data[n]=new a.LongBits(e.uint64Data[n].low>>>0,e.uint64Data[n].high>>>0).toNumber(!0))}return t},e.toObject=function(e,t){t||={};var n={};if((t.arrays||t.defaults)&&(n.dims=[],n.floatData=[],n.int32Data=[],n.stringData=[],n.int64Data=[],n.doubleData=[],n.uint64Data=[],n.externalData=[]),t.defaults&&(n.dataType=0,n.segment=null,n.name=``,t.bytes===String?n.rawData=``:(n.rawData=[],t.bytes!==Array&&(n.rawData=a.newBuffer(n.rawData))),n.docString=``,n.dataLocation=t.enums===String?`DEFAULT`:0),e.dims&&e.dims.length){n.dims=[];for(var r=0;r<e.dims.length;++r)typeof e.dims[r]==`number`?n.dims[r]=t.longs===String?String(e.dims[r]):e.dims[r]:n.dims[r]=t.longs===String?a.Long.prototype.toString.call(e.dims[r]):t.longs===Number?new a.LongBits(e.dims[r].low>>>0,e.dims[r].high>>>0).toNumber():e.dims[r]}if(e.dataType!=null&&e.hasOwnProperty(`dataType`)&&(n.dataType=e.dataType),e.segment!=null&&e.hasOwnProperty(`segment`)&&(n.segment=o.onnx.TensorProto.Segment.toObject(e.segment,t)),e.floatData&&e.floatData.length){n.floatData=[];for(var r=0;r<e.floatData.length;++r)n.floatData[r]=t.json&&!isFinite(e.floatData[r])?String(e.floatData[r]):e.floatData[r]}if(e.int32Data&&e.int32Data.length){n.int32Data=[];for(var r=0;r<e.int32Data.length;++r)n.int32Data[r]=e.int32Data[r]}if(e.stringData&&e.stringData.length){n.stringData=[];for(var r=0;r<e.stringData.length;++r)n.stringData[r]=t.bytes===String?a.base64.encode(e.stringData[r],0,e.stringData[r].length):t.bytes===Array?Array.prototype.slice.call(e.stringData[r]):e.stringData[r]}if(e.int64Data&&e.int64Data.length){n.int64Data=[];for(var r=0;r<e.int64Data.length;++r)typeof e.int64Data[r]==`number`?n.int64Data[r]=t.longs===String?String(e.int64Data[r]):e.int64Data[r]:n.int64Data[r]=t.longs===String?a.Long.prototype.toString.call(e.int64Data[r]):t.longs===Number?new a.LongBits(e.int64Data[r].low>>>0,e.int64Data[r].high>>>0).toNumber():e.int64Data[r]}if(e.name!=null&&e.hasOwnProperty(`name`)&&(n.name=e.name),e.rawData!=null&&e.hasOwnProperty(`rawData`)&&(n.rawData=t.bytes===String?a.base64.encode(e.rawData,0,e.rawData.length):t.bytes===Array?Array.prototype.slice.call(e.rawData):e.rawData),e.doubleData&&e.doubleData.length){n.doubleData=[];for(var r=0;r<e.doubleData.length;++r)n.doubleData[r]=t.json&&!isFinite(e.doubleData[r])?String(e.doubleData[r]):e.doubleData[r]}if(e.uint64Data&&e.uint64Data.length){n.uint64Data=[];for(var r=0;r<e.uint64Data.length;++r)typeof e.uint64Data[r]==`number`?n.uint64Data[r]=t.longs===String?String(e.uint64Data[r]):e.uint64Data[r]:n.uint64Data[r]=t.longs===String?a.Long.prototype.toString.call(e.uint64Data[r]):t.longs===Number?new a.LongBits(e.uint64Data[r].low>>>0,e.uint64Data[r].high>>>0).toNumber(!0):e.uint64Data[r]}if(e.docString!=null&&e.hasOwnProperty(`docString`)&&(n.docString=e.docString),e.externalData&&e.externalData.length){n.externalData=[];for(var r=0;r<e.externalData.length;++r)n.externalData[r]=o.onnx.StringStringEntryProto.toObject(e.externalData[r],t)}return e.dataLocation!=null&&e.hasOwnProperty(`dataLocation`)&&(n.dataLocation=t.enums===String?o.onnx.TensorProto.DataLocation[e.dataLocation]:e.dataLocation),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e.DataType=(function(){var e={},t=Object.create(e);return t[e[0]=`UNDEFINED`]=0,t[e[1]=`FLOAT`]=1,t[e[2]=`UINT8`]=2,t[e[3]=`INT8`]=3,t[e[4]=`UINT16`]=4,t[e[5]=`INT16`]=5,t[e[6]=`INT32`]=6,t[e[7]=`INT64`]=7,t[e[8]=`STRING`]=8,t[e[9]=`BOOL`]=9,t[e[10]=`FLOAT16`]=10,t[e[11]=`DOUBLE`]=11,t[e[12]=`UINT32`]=12,t[e[13]=`UINT64`]=13,t[e[14]=`COMPLEX64`]=14,t[e[15]=`COMPLEX128`]=15,t[e[16]=`BFLOAT16`]=16,t})(),e.Segment=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.begin=a.Long?a.Long.fromBits(0,0,!1):0,e.prototype.end=a.Long?a.Long.fromBits(0,0,!1):0,e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.begin!=null&&Object.hasOwnProperty.call(e,`begin`)&&t.uint32(8).int64(e.begin),e.end!=null&&Object.hasOwnProperty.call(e,`end`)&&t.uint32(16).int64(e.end),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TensorProto.Segment;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.begin=e.int64();break;case 2:i.end=e.int64();break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){return typeof e!=`object`||!e?`object expected`:e.begin!=null&&e.hasOwnProperty(`begin`)&&!a.isInteger(e.begin)&&!(e.begin&&a.isInteger(e.begin.low)&&a.isInteger(e.begin.high))?`begin: integer|Long expected`:e.end!=null&&e.hasOwnProperty(`end`)&&!a.isInteger(e.end)&&!(e.end&&a.isInteger(e.end.low)&&a.isInteger(e.end.high))?`end: integer|Long expected`:null},e.fromObject=function(e){if(e instanceof o.onnx.TensorProto.Segment)return e;var t=new o.onnx.TensorProto.Segment;return e.begin!=null&&(a.Long?(t.begin=a.Long.fromValue(e.begin)).unsigned=!1:typeof e.begin==`string`?t.begin=parseInt(e.begin,10):typeof e.begin==`number`?t.begin=e.begin:typeof e.begin==`object`&&(t.begin=new a.LongBits(e.begin.low>>>0,e.begin.high>>>0).toNumber())),e.end!=null&&(a.Long?(t.end=a.Long.fromValue(e.end)).unsigned=!1:typeof e.end==`string`?t.end=parseInt(e.end,10):typeof e.end==`number`?t.end=e.end:typeof e.end==`object`&&(t.end=new a.LongBits(e.end.low>>>0,e.end.high>>>0).toNumber())),t},e.toObject=function(e,t){t||={};var n={};if(t.defaults){if(a.Long){var r=new a.Long(0,0,!1);n.begin=t.longs===String?r.toString():t.longs===Number?r.toNumber():r}else n.begin=t.longs===String?`0`:0;if(a.Long){var r=new a.Long(0,0,!1);n.end=t.longs===String?r.toString():t.longs===Number?r.toNumber():r}else n.end=t.longs===String?`0`:0}return e.begin!=null&&e.hasOwnProperty(`begin`)&&(n.begin=typeof e.begin==`number`?t.longs===String?String(e.begin):e.begin:t.longs===String?a.Long.prototype.toString.call(e.begin):t.longs===Number?new a.LongBits(e.begin.low>>>0,e.begin.high>>>0).toNumber():e.begin),e.end!=null&&e.hasOwnProperty(`end`)&&(n.end=typeof e.end==`number`?t.longs===String?String(e.end):e.end:t.longs===String?a.Long.prototype.toString.call(e.end):t.longs===Number?new a.LongBits(e.end.low>>>0,e.end.high>>>0).toNumber():e.end),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.DataLocation=(function(){var e={},t=Object.create(e);return t[e[0]=`DEFAULT`]=0,t[e[1]=`EXTERNAL`]=1,t})(),e})(),e.SparseTensorProto=(function(){function e(e){if(this.dims=[],e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.values=null,e.prototype.indices=null,e.prototype.dims=a.emptyArray,e.create=function(t){return new e(t)},e.encode=function(e,t){if(t||=i.create(),e.values!=null&&Object.hasOwnProperty.call(e,`values`)&&o.onnx.TensorProto.encode(e.values,t.uint32(10).fork()).ldelim(),e.indices!=null&&Object.hasOwnProperty.call(e,`indices`)&&o.onnx.TensorProto.encode(e.indices,t.uint32(18).fork()).ldelim(),e.dims!=null&&e.dims.length){t.uint32(26).fork();for(var n=0;n<e.dims.length;++n)t.int64(e.dims[n]);t.ldelim()}return t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.SparseTensorProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.values=o.onnx.TensorProto.decode(e,e.uint32());break;case 2:i.indices=o.onnx.TensorProto.decode(e,e.uint32());break;case 3:if(i.dims&&i.dims.length||(i.dims=[]),(a&7)==2)for(var s=e.uint32()+e.pos;e.pos<s;)i.dims.push(e.int64());else i.dims.push(e.int64());break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.values!=null&&e.hasOwnProperty(`values`)){var t=o.onnx.TensorProto.verify(e.values);if(t)return`values.`+t}if(e.indices!=null&&e.hasOwnProperty(`indices`)){var t=o.onnx.TensorProto.verify(e.indices);if(t)return`indices.`+t}if(e.dims!=null&&e.hasOwnProperty(`dims`)){if(!Array.isArray(e.dims))return`dims: array expected`;for(var n=0;n<e.dims.length;++n)if(!a.isInteger(e.dims[n])&&!(e.dims[n]&&a.isInteger(e.dims[n].low)&&a.isInteger(e.dims[n].high)))return`dims: integer|Long[] expected`}return null},e.fromObject=function(e){if(e instanceof o.onnx.SparseTensorProto)return e;var t=new o.onnx.SparseTensorProto;if(e.values!=null){if(typeof e.values!=`object`)throw TypeError(`.onnx.SparseTensorProto.values: object expected`);t.values=o.onnx.TensorProto.fromObject(e.values)}if(e.indices!=null){if(typeof e.indices!=`object`)throw TypeError(`.onnx.SparseTensorProto.indices: object expected`);t.indices=o.onnx.TensorProto.fromObject(e.indices)}if(e.dims){if(!Array.isArray(e.dims))throw TypeError(`.onnx.SparseTensorProto.dims: array expected`);t.dims=[];for(var n=0;n<e.dims.length;++n)a.Long?(t.dims[n]=a.Long.fromValue(e.dims[n])).unsigned=!1:typeof e.dims[n]==`string`?t.dims[n]=parseInt(e.dims[n],10):typeof e.dims[n]==`number`?t.dims[n]=e.dims[n]:typeof e.dims[n]==`object`&&(t.dims[n]=new a.LongBits(e.dims[n].low>>>0,e.dims[n].high>>>0).toNumber())}return t},e.toObject=function(e,t){t||={};var n={};if((t.arrays||t.defaults)&&(n.dims=[]),t.defaults&&(n.values=null,n.indices=null),e.values!=null&&e.hasOwnProperty(`values`)&&(n.values=o.onnx.TensorProto.toObject(e.values,t)),e.indices!=null&&e.hasOwnProperty(`indices`)&&(n.indices=o.onnx.TensorProto.toObject(e.indices,t)),e.dims&&e.dims.length){n.dims=[];for(var r=0;r<e.dims.length;++r)typeof e.dims[r]==`number`?n.dims[r]=t.longs===String?String(e.dims[r]):e.dims[r]:n.dims[r]=t.longs===String?a.Long.prototype.toString.call(e.dims[r]):t.longs===Number?new a.LongBits(e.dims[r].low>>>0,e.dims[r].high>>>0).toNumber():e.dims[r]}return n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.TensorShapeProto=(function(){function e(e){if(this.dim=[],e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.dim=a.emptyArray,e.create=function(t){return new e(t)},e.encode=function(e,t){if(t||=i.create(),e.dim!=null&&e.dim.length)for(var n=0;n<e.dim.length;++n)o.onnx.TensorShapeProto.Dimension.encode(e.dim[n],t.uint32(10).fork()).ldelim();return t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TensorShapeProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.dim&&i.dim.length||(i.dim=[]),i.dim.push(o.onnx.TensorShapeProto.Dimension.decode(e,e.uint32()));break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.dim!=null&&e.hasOwnProperty(`dim`)){if(!Array.isArray(e.dim))return`dim: array expected`;for(var t=0;t<e.dim.length;++t){var n=o.onnx.TensorShapeProto.Dimension.verify(e.dim[t]);if(n)return`dim.`+n}}return null},e.fromObject=function(e){if(e instanceof o.onnx.TensorShapeProto)return e;var t=new o.onnx.TensorShapeProto;if(e.dim){if(!Array.isArray(e.dim))throw TypeError(`.onnx.TensorShapeProto.dim: array expected`);t.dim=[];for(var n=0;n<e.dim.length;++n){if(typeof e.dim[n]!=`object`)throw TypeError(`.onnx.TensorShapeProto.dim: object expected`);t.dim[n]=o.onnx.TensorShapeProto.Dimension.fromObject(e.dim[n])}}return t},e.toObject=function(e,t){t||={};var n={};if((t.arrays||t.defaults)&&(n.dim=[]),e.dim&&e.dim.length){n.dim=[];for(var r=0;r<e.dim.length;++r)n.dim[r]=o.onnx.TensorShapeProto.Dimension.toObject(e.dim[r],t)}return n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e.Dimension=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}e.prototype.dimValue=null,e.prototype.dimParam=null,e.prototype.denotation=``;var t;return Object.defineProperty(e.prototype,"value",{get:a.oneOfGetter(t=[`dimValue`,`dimParam`]),set:a.oneOfSetter(t)}),e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.dimValue!=null&&Object.hasOwnProperty.call(e,`dimValue`)&&t.uint32(8).int64(e.dimValue),e.dimParam!=null&&Object.hasOwnProperty.call(e,`dimParam`)&&t.uint32(18).string(e.dimParam),e.denotation!=null&&Object.hasOwnProperty.call(e,`denotation`)&&t.uint32(26).string(e.denotation),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TensorShapeProto.Dimension;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.dimValue=e.int64();break;case 2:i.dimParam=e.string();break;case 3:i.denotation=e.string();break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;var t={};if(e.dimValue!=null&&e.hasOwnProperty(`dimValue`)&&(t.value=1,!a.isInteger(e.dimValue)&&!(e.dimValue&&a.isInteger(e.dimValue.low)&&a.isInteger(e.dimValue.high))))return`dimValue: integer|Long expected`;if(e.dimParam!=null&&e.hasOwnProperty(`dimParam`)){if(t.value===1)return`value: multiple values`;if(t.value=1,!a.isString(e.dimParam))return`dimParam: string expected`}return e.denotation!=null&&e.hasOwnProperty(`denotation`)&&!a.isString(e.denotation)?`denotation: string expected`:null},e.fromObject=function(e){if(e instanceof o.onnx.TensorShapeProto.Dimension)return e;var t=new o.onnx.TensorShapeProto.Dimension;return e.dimValue!=null&&(a.Long?(t.dimValue=a.Long.fromValue(e.dimValue)).unsigned=!1:typeof e.dimValue==`string`?t.dimValue=parseInt(e.dimValue,10):typeof e.dimValue==`number`?t.dimValue=e.dimValue:typeof e.dimValue==`object`&&(t.dimValue=new a.LongBits(e.dimValue.low>>>0,e.dimValue.high>>>0).toNumber())),e.dimParam!=null&&(t.dimParam=String(e.dimParam)),e.denotation!=null&&(t.denotation=String(e.denotation)),t},e.toObject=function(e,t){t||={};var n={};return t.defaults&&(n.denotation=``),e.dimValue!=null&&e.hasOwnProperty(`dimValue`)&&(n.dimValue=typeof e.dimValue==`number`?t.longs===String?String(e.dimValue):e.dimValue:t.longs===String?a.Long.prototype.toString.call(e.dimValue):t.longs===Number?new a.LongBits(e.dimValue.low>>>0,e.dimValue.high>>>0).toNumber():e.dimValue,t.oneofs&&(n.value=`dimValue`)),e.dimParam!=null&&e.hasOwnProperty(`dimParam`)&&(n.dimParam=e.dimParam,t.oneofs&&(n.value=`dimParam`)),e.denotation!=null&&e.hasOwnProperty(`denotation`)&&(n.denotation=e.denotation),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e})(),e.TypeProto=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}e.prototype.tensorType=null,e.prototype.sequenceType=null,e.prototype.mapType=null,e.prototype.optionalType=null,e.prototype.sparseTensorType=null,e.prototype.denotation=``;var t;return Object.defineProperty(e.prototype,"value",{get:a.oneOfGetter(t=[`tensorType`,`sequenceType`,`mapType`,`optionalType`,`sparseTensorType`]),set:a.oneOfSetter(t)}),e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.tensorType!=null&&Object.hasOwnProperty.call(e,`tensorType`)&&o.onnx.TypeProto.Tensor.encode(e.tensorType,t.uint32(10).fork()).ldelim(),e.sequenceType!=null&&Object.hasOwnProperty.call(e,`sequenceType`)&&o.onnx.TypeProto.Sequence.encode(e.sequenceType,t.uint32(34).fork()).ldelim(),e.mapType!=null&&Object.hasOwnProperty.call(e,`mapType`)&&o.onnx.TypeProto.Map.encode(e.mapType,t.uint32(42).fork()).ldelim(),e.denotation!=null&&Object.hasOwnProperty.call(e,`denotation`)&&t.uint32(50).string(e.denotation),e.sparseTensorType!=null&&Object.hasOwnProperty.call(e,`sparseTensorType`)&&o.onnx.TypeProto.SparseTensor.encode(e.sparseTensorType,t.uint32(66).fork()).ldelim(),e.optionalType!=null&&Object.hasOwnProperty.call(e,`optionalType`)&&o.onnx.TypeProto.Optional.encode(e.optionalType,t.uint32(74).fork()).ldelim(),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TypeProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.tensorType=o.onnx.TypeProto.Tensor.decode(e,e.uint32());break;case 4:i.sequenceType=o.onnx.TypeProto.Sequence.decode(e,e.uint32());break;case 5:i.mapType=o.onnx.TypeProto.Map.decode(e,e.uint32());break;case 9:i.optionalType=o.onnx.TypeProto.Optional.decode(e,e.uint32());break;case 8:i.sparseTensorType=o.onnx.TypeProto.SparseTensor.decode(e,e.uint32());break;case 6:i.denotation=e.string();break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;var t={};if(e.tensorType!=null&&e.hasOwnProperty(`tensorType`)){t.value=1;var n=o.onnx.TypeProto.Tensor.verify(e.tensorType);if(n)return`tensorType.`+n}if(e.sequenceType!=null&&e.hasOwnProperty(`sequenceType`)){if(t.value===1)return`value: multiple values`;t.value=1;var n=o.onnx.TypeProto.Sequence.verify(e.sequenceType);if(n)return`sequenceType.`+n}if(e.mapType!=null&&e.hasOwnProperty(`mapType`)){if(t.value===1)return`value: multiple values`;t.value=1;var n=o.onnx.TypeProto.Map.verify(e.mapType);if(n)return`mapType.`+n}if(e.optionalType!=null&&e.hasOwnProperty(`optionalType`)){if(t.value===1)return`value: multiple values`;t.value=1;var n=o.onnx.TypeProto.Optional.verify(e.optionalType);if(n)return`optionalType.`+n}if(e.sparseTensorType!=null&&e.hasOwnProperty(`sparseTensorType`)){if(t.value===1)return`value: multiple values`;t.value=1;var n=o.onnx.TypeProto.SparseTensor.verify(e.sparseTensorType);if(n)return`sparseTensorType.`+n}return e.denotation!=null&&e.hasOwnProperty(`denotation`)&&!a.isString(e.denotation)?`denotation: string expected`:null},e.fromObject=function(e){if(e instanceof o.onnx.TypeProto)return e;var t=new o.onnx.TypeProto;if(e.tensorType!=null){if(typeof e.tensorType!=`object`)throw TypeError(`.onnx.TypeProto.tensorType: object expected`);t.tensorType=o.onnx.TypeProto.Tensor.fromObject(e.tensorType)}if(e.sequenceType!=null){if(typeof e.sequenceType!=`object`)throw TypeError(`.onnx.TypeProto.sequenceType: object expected`);t.sequenceType=o.onnx.TypeProto.Sequence.fromObject(e.sequenceType)}if(e.mapType!=null){if(typeof e.mapType!=`object`)throw TypeError(`.onnx.TypeProto.mapType: object expected`);t.mapType=o.onnx.TypeProto.Map.fromObject(e.mapType)}if(e.optionalType!=null){if(typeof e.optionalType!=`object`)throw TypeError(`.onnx.TypeProto.optionalType: object expected`);t.optionalType=o.onnx.TypeProto.Optional.fromObject(e.optionalType)}if(e.sparseTensorType!=null){if(typeof e.sparseTensorType!=`object`)throw TypeError(`.onnx.TypeProto.sparseTensorType: object expected`);t.sparseTensorType=o.onnx.TypeProto.SparseTensor.fromObject(e.sparseTensorType)}return e.denotation!=null&&(t.denotation=String(e.denotation)),t},e.toObject=function(e,t){t||={};var n={};return t.defaults&&(n.denotation=``),e.tensorType!=null&&e.hasOwnProperty(`tensorType`)&&(n.tensorType=o.onnx.TypeProto.Tensor.toObject(e.tensorType,t),t.oneofs&&(n.value=`tensorType`)),e.sequenceType!=null&&e.hasOwnProperty(`sequenceType`)&&(n.sequenceType=o.onnx.TypeProto.Sequence.toObject(e.sequenceType,t),t.oneofs&&(n.value=`sequenceType`)),e.mapType!=null&&e.hasOwnProperty(`mapType`)&&(n.mapType=o.onnx.TypeProto.Map.toObject(e.mapType,t),t.oneofs&&(n.value=`mapType`)),e.denotation!=null&&e.hasOwnProperty(`denotation`)&&(n.denotation=e.denotation),e.sparseTensorType!=null&&e.hasOwnProperty(`sparseTensorType`)&&(n.sparseTensorType=o.onnx.TypeProto.SparseTensor.toObject(e.sparseTensorType,t),t.oneofs&&(n.value=`sparseTensorType`)),e.optionalType!=null&&e.hasOwnProperty(`optionalType`)&&(n.optionalType=o.onnx.TypeProto.Optional.toObject(e.optionalType,t),t.oneofs&&(n.value=`optionalType`)),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e.Tensor=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.elemType=0,e.prototype.shape=null,e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.elemType!=null&&Object.hasOwnProperty.call(e,`elemType`)&&t.uint32(8).int32(e.elemType),e.shape!=null&&Object.hasOwnProperty.call(e,`shape`)&&o.onnx.TensorShapeProto.encode(e.shape,t.uint32(18).fork()).ldelim(),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TypeProto.Tensor;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.elemType=e.int32();break;case 2:i.shape=o.onnx.TensorShapeProto.decode(e,e.uint32());break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.elemType!=null&&e.hasOwnProperty(`elemType`)&&!a.isInteger(e.elemType))return`elemType: integer expected`;if(e.shape!=null&&e.hasOwnProperty(`shape`)){var t=o.onnx.TensorShapeProto.verify(e.shape);if(t)return`shape.`+t}return null},e.fromObject=function(e){if(e instanceof o.onnx.TypeProto.Tensor)return e;var t=new o.onnx.TypeProto.Tensor;if(e.elemType!=null&&(t.elemType=e.elemType|0),e.shape!=null){if(typeof e.shape!=`object`)throw TypeError(`.onnx.TypeProto.Tensor.shape: object expected`);t.shape=o.onnx.TensorShapeProto.fromObject(e.shape)}return t},e.toObject=function(e,t){t||={};var n={};return t.defaults&&(n.elemType=0,n.shape=null),e.elemType!=null&&e.hasOwnProperty(`elemType`)&&(n.elemType=e.elemType),e.shape!=null&&e.hasOwnProperty(`shape`)&&(n.shape=o.onnx.TensorShapeProto.toObject(e.shape,t)),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.Sequence=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.elemType=null,e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.elemType!=null&&Object.hasOwnProperty.call(e,`elemType`)&&o.onnx.TypeProto.encode(e.elemType,t.uint32(10).fork()).ldelim(),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TypeProto.Sequence;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.elemType=o.onnx.TypeProto.decode(e,e.uint32());break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.elemType!=null&&e.hasOwnProperty(`elemType`)){var t=o.onnx.TypeProto.verify(e.elemType);if(t)return`elemType.`+t}return null},e.fromObject=function(e){if(e instanceof o.onnx.TypeProto.Sequence)return e;var t=new o.onnx.TypeProto.Sequence;if(e.elemType!=null){if(typeof e.elemType!=`object`)throw TypeError(`.onnx.TypeProto.Sequence.elemType: object expected`);t.elemType=o.onnx.TypeProto.fromObject(e.elemType)}return t},e.toObject=function(e,t){t||={};var n={};return t.defaults&&(n.elemType=null),e.elemType!=null&&e.hasOwnProperty(`elemType`)&&(n.elemType=o.onnx.TypeProto.toObject(e.elemType,t)),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.Map=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.keyType=0,e.prototype.valueType=null,e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.keyType!=null&&Object.hasOwnProperty.call(e,`keyType`)&&t.uint32(8).int32(e.keyType),e.valueType!=null&&Object.hasOwnProperty.call(e,`valueType`)&&o.onnx.TypeProto.encode(e.valueType,t.uint32(18).fork()).ldelim(),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TypeProto.Map;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.keyType=e.int32();break;case 2:i.valueType=o.onnx.TypeProto.decode(e,e.uint32());break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.keyType!=null&&e.hasOwnProperty(`keyType`)&&!a.isInteger(e.keyType))return`keyType: integer expected`;if(e.valueType!=null&&e.hasOwnProperty(`valueType`)){var t=o.onnx.TypeProto.verify(e.valueType);if(t)return`valueType.`+t}return null},e.fromObject=function(e){if(e instanceof o.onnx.TypeProto.Map)return e;var t=new o.onnx.TypeProto.Map;if(e.keyType!=null&&(t.keyType=e.keyType|0),e.valueType!=null){if(typeof e.valueType!=`object`)throw TypeError(`.onnx.TypeProto.Map.valueType: object expected`);t.valueType=o.onnx.TypeProto.fromObject(e.valueType)}return t},e.toObject=function(e,t){t||={};var n={};return t.defaults&&(n.keyType=0,n.valueType=null),e.keyType!=null&&e.hasOwnProperty(`keyType`)&&(n.keyType=e.keyType),e.valueType!=null&&e.hasOwnProperty(`valueType`)&&(n.valueType=o.onnx.TypeProto.toObject(e.valueType,t)),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.Optional=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.elemType=null,e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.elemType!=null&&Object.hasOwnProperty.call(e,`elemType`)&&o.onnx.TypeProto.encode(e.elemType,t.uint32(10).fork()).ldelim(),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TypeProto.Optional;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.elemType=o.onnx.TypeProto.decode(e,e.uint32());break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.elemType!=null&&e.hasOwnProperty(`elemType`)){var t=o.onnx.TypeProto.verify(e.elemType);if(t)return`elemType.`+t}return null},e.fromObject=function(e){if(e instanceof o.onnx.TypeProto.Optional)return e;var t=new o.onnx.TypeProto.Optional;if(e.elemType!=null){if(typeof e.elemType!=`object`)throw TypeError(`.onnx.TypeProto.Optional.elemType: object expected`);t.elemType=o.onnx.TypeProto.fromObject(e.elemType)}return t},e.toObject=function(e,t){t||={};var n={};return t.defaults&&(n.elemType=null),e.elemType!=null&&e.hasOwnProperty(`elemType`)&&(n.elemType=o.onnx.TypeProto.toObject(e.elemType,t)),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.SparseTensor=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.elemType=0,e.prototype.shape=null,e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.elemType!=null&&Object.hasOwnProperty.call(e,`elemType`)&&t.uint32(8).int32(e.elemType),e.shape!=null&&Object.hasOwnProperty.call(e,`shape`)&&o.onnx.TensorShapeProto.encode(e.shape,t.uint32(18).fork()).ldelim(),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.TypeProto.SparseTensor;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.elemType=e.int32();break;case 2:i.shape=o.onnx.TensorShapeProto.decode(e,e.uint32());break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.elemType!=null&&e.hasOwnProperty(`elemType`)&&!a.isInteger(e.elemType))return`elemType: integer expected`;if(e.shape!=null&&e.hasOwnProperty(`shape`)){var t=o.onnx.TensorShapeProto.verify(e.shape);if(t)return`shape.`+t}return null},e.fromObject=function(e){if(e instanceof o.onnx.TypeProto.SparseTensor)return e;var t=new o.onnx.TypeProto.SparseTensor;if(e.elemType!=null&&(t.elemType=e.elemType|0),e.shape!=null){if(typeof e.shape!=`object`)throw TypeError(`.onnx.TypeProto.SparseTensor.shape: object expected`);t.shape=o.onnx.TensorShapeProto.fromObject(e.shape)}return t},e.toObject=function(e,t){t||={};var n={};return t.defaults&&(n.elemType=0,n.shape=null),e.elemType!=null&&e.hasOwnProperty(`elemType`)&&(n.elemType=e.elemType),e.shape!=null&&e.hasOwnProperty(`shape`)&&(n.shape=o.onnx.TensorShapeProto.toObject(e.shape,t)),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e})(),e.OperatorSetIdProto=(function(){function e(e){if(e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.domain=``,e.prototype.version=a.Long?a.Long.fromBits(0,0,!1):0,e.create=function(t){return new e(t)},e.encode=function(e,t){return t||=i.create(),e.domain!=null&&Object.hasOwnProperty.call(e,`domain`)&&t.uint32(10).string(e.domain),e.version!=null&&Object.hasOwnProperty.call(e,`version`)&&t.uint32(16).int64(e.version),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.OperatorSetIdProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.domain=e.string();break;case 2:i.version=e.int64();break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){return typeof e!=`object`||!e?`object expected`:e.domain!=null&&e.hasOwnProperty(`domain`)&&!a.isString(e.domain)?`domain: string expected`:e.version!=null&&e.hasOwnProperty(`version`)&&!a.isInteger(e.version)&&!(e.version&&a.isInteger(e.version.low)&&a.isInteger(e.version.high))?`version: integer|Long expected`:null},e.fromObject=function(e){if(e instanceof o.onnx.OperatorSetIdProto)return e;var t=new o.onnx.OperatorSetIdProto;return e.domain!=null&&(t.domain=String(e.domain)),e.version!=null&&(a.Long?(t.version=a.Long.fromValue(e.version)).unsigned=!1:typeof e.version==`string`?t.version=parseInt(e.version,10):typeof e.version==`number`?t.version=e.version:typeof e.version==`object`&&(t.version=new a.LongBits(e.version.low>>>0,e.version.high>>>0).toNumber())),t},e.toObject=function(e,t){t||={};var n={};if(t.defaults){if(n.domain=``,a.Long){var r=new a.Long(0,0,!1);n.version=t.longs===String?r.toString():t.longs===Number?r.toNumber():r}else n.version=t.longs===String?`0`:0}return e.domain!=null&&e.hasOwnProperty(`domain`)&&(n.domain=e.domain),e.version!=null&&e.hasOwnProperty(`version`)&&(n.version=typeof e.version==`number`?t.longs===String?String(e.version):e.version:t.longs===String?a.Long.prototype.toString.call(e.version):t.longs===Number?new a.LongBits(e.version.low>>>0,e.version.high>>>0).toNumber():e.version),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e.OperatorStatus=(function(){var e={},t=Object.create(e);return t[e[0]=`EXPERIMENTAL`]=0,t[e[1]=`STABLE`]=1,t})(),e.FunctionProto=(function(){function e(e){if(this.input=[],this.output=[],this.attribute=[],this.node=[],this.opsetImport=[],e)for(var t=Object.keys(e),n=0;n<t.length;++n)e[t[n]]!=null&&(this[t[n]]=e[t[n]])}return e.prototype.name=``,e.prototype.input=a.emptyArray,e.prototype.output=a.emptyArray,e.prototype.attribute=a.emptyArray,e.prototype.node=a.emptyArray,e.prototype.docString=``,e.prototype.opsetImport=a.emptyArray,e.prototype.domain=``,e.create=function(t){return new e(t)},e.encode=function(e,t){if(t||=i.create(),e.name!=null&&Object.hasOwnProperty.call(e,`name`)&&t.uint32(10).string(e.name),e.input!=null&&e.input.length)for(var n=0;n<e.input.length;++n)t.uint32(34).string(e.input[n]);if(e.output!=null&&e.output.length)for(var n=0;n<e.output.length;++n)t.uint32(42).string(e.output[n]);if(e.attribute!=null&&e.attribute.length)for(var n=0;n<e.attribute.length;++n)t.uint32(50).string(e.attribute[n]);if(e.node!=null&&e.node.length)for(var n=0;n<e.node.length;++n)o.onnx.NodeProto.encode(e.node[n],t.uint32(58).fork()).ldelim();if(e.docString!=null&&Object.hasOwnProperty.call(e,`docString`)&&t.uint32(66).string(e.docString),e.opsetImport!=null&&e.opsetImport.length)for(var n=0;n<e.opsetImport.length;++n)o.onnx.OperatorSetIdProto.encode(e.opsetImport[n],t.uint32(74).fork()).ldelim();return e.domain!=null&&Object.hasOwnProperty.call(e,`domain`)&&t.uint32(82).string(e.domain),t},e.encodeDelimited=function(e,t){return this.encode(e,t).ldelim()},e.decode=function(e,t){e instanceof r||(e=r.create(e));for(var n=t===void 0?e.len:e.pos+t,i=new o.onnx.FunctionProto;e.pos<n;){var a=e.uint32();switch(a>>>3){case 1:i.name=e.string();break;case 4:i.input&&i.input.length||(i.input=[]),i.input.push(e.string());break;case 5:i.output&&i.output.length||(i.output=[]),i.output.push(e.string());break;case 6:i.attribute&&i.attribute.length||(i.attribute=[]),i.attribute.push(e.string());break;case 7:i.node&&i.node.length||(i.node=[]),i.node.push(o.onnx.NodeProto.decode(e,e.uint32()));break;case 8:i.docString=e.string();break;case 9:i.opsetImport&&i.opsetImport.length||(i.opsetImport=[]),i.opsetImport.push(o.onnx.OperatorSetIdProto.decode(e,e.uint32()));break;case 10:i.domain=e.string();break;default:e.skipType(a&7)}}return i},e.decodeDelimited=function(e){return e instanceof r||(e=new r(e)),this.decode(e,e.uint32())},e.verify=function(e){if(typeof e!=`object`||!e)return`object expected`;if(e.name!=null&&e.hasOwnProperty(`name`)&&!a.isString(e.name))return`name: string expected`;if(e.input!=null&&e.hasOwnProperty(`input`)){if(!Array.isArray(e.input))return`input: array expected`;for(var t=0;t<e.input.length;++t)if(!a.isString(e.input[t]))return`input: string[] expected`}if(e.output!=null&&e.hasOwnProperty(`output`)){if(!Array.isArray(e.output))return`output: array expected`;for(var t=0;t<e.output.length;++t)if(!a.isString(e.output[t]))return`output: string[] expected`}if(e.attribute!=null&&e.hasOwnProperty(`attribute`)){if(!Array.isArray(e.attribute))return`attribute: array expected`;for(var t=0;t<e.attribute.length;++t)if(!a.isString(e.attribute[t]))return`attribute: string[] expected`}if(e.node!=null&&e.hasOwnProperty(`node`)){if(!Array.isArray(e.node))return`node: array expected`;for(var t=0;t<e.node.length;++t){var n=o.onnx.NodeProto.verify(e.node[t]);if(n)return`node.`+n}}if(e.docString!=null&&e.hasOwnProperty(`docString`)&&!a.isString(e.docString))return`docString: string expected`;if(e.opsetImport!=null&&e.hasOwnProperty(`opsetImport`)){if(!Array.isArray(e.opsetImport))return`opsetImport: array expected`;for(var t=0;t<e.opsetImport.length;++t){var n=o.onnx.OperatorSetIdProto.verify(e.opsetImport[t]);if(n)return`opsetImport.`+n}}return e.domain!=null&&e.hasOwnProperty(`domain`)&&!a.isString(e.domain)?`domain: string expected`:null},e.fromObject=function(e){if(e instanceof o.onnx.FunctionProto)return e;var t=new o.onnx.FunctionProto;if(e.name!=null&&(t.name=String(e.name)),e.input){if(!Array.isArray(e.input))throw TypeError(`.onnx.FunctionProto.input: array expected`);t.input=[];for(var n=0;n<e.input.length;++n)t.input[n]=String(e.input[n])}if(e.output){if(!Array.isArray(e.output))throw TypeError(`.onnx.FunctionProto.output: array expected`);t.output=[];for(var n=0;n<e.output.length;++n)t.output[n]=String(e.output[n])}if(e.attribute){if(!Array.isArray(e.attribute))throw TypeError(`.onnx.FunctionProto.attribute: array expected`);t.attribute=[];for(var n=0;n<e.attribute.length;++n)t.attribute[n]=String(e.attribute[n])}if(e.node){if(!Array.isArray(e.node))throw TypeError(`.onnx.FunctionProto.node: array expected`);t.node=[];for(var n=0;n<e.node.length;++n){if(typeof e.node[n]!=`object`)throw TypeError(`.onnx.FunctionProto.node: object expected`);t.node[n]=o.onnx.NodeProto.fromObject(e.node[n])}}if(e.docString!=null&&(t.docString=String(e.docString)),e.opsetImport){if(!Array.isArray(e.opsetImport))throw TypeError(`.onnx.FunctionProto.opsetImport: array expected`);t.opsetImport=[];for(var n=0;n<e.opsetImport.length;++n){if(typeof e.opsetImport[n]!=`object`)throw TypeError(`.onnx.FunctionProto.opsetImport: object expected`);t.opsetImport[n]=o.onnx.OperatorSetIdProto.fromObject(e.opsetImport[n])}}return e.domain!=null&&(t.domain=String(e.domain)),t},e.toObject=function(e,t){t||={};var n={};if((t.arrays||t.defaults)&&(n.input=[],n.output=[],n.attribute=[],n.node=[],n.opsetImport=[]),t.defaults&&(n.name=``,n.docString=``,n.domain=``),e.name!=null&&e.hasOwnProperty(`name`)&&(n.name=e.name),e.input&&e.input.length){n.input=[];for(var r=0;r<e.input.length;++r)n.input[r]=e.input[r]}if(e.output&&e.output.length){n.output=[];for(var r=0;r<e.output.length;++r)n.output[r]=e.output[r]}if(e.attribute&&e.attribute.length){n.attribute=[];for(var r=0;r<e.attribute.length;++r)n.attribute[r]=e.attribute[r]}if(e.node&&e.node.length){n.node=[];for(var r=0;r<e.node.length;++r)n.node[r]=o.onnx.NodeProto.toObject(e.node[r],t)}if(e.docString!=null&&e.hasOwnProperty(`docString`)&&(n.docString=e.docString),e.opsetImport&&e.opsetImport.length){n.opsetImport=[];for(var r=0;r<e.opsetImport.length;++r)n.opsetImport[r]=o.onnx.OperatorSetIdProto.toObject(e.opsetImport[r],t)}return e.domain!=null&&e.hasOwnProperty(`domain`)&&(n.domain=e.domain),n},e.prototype.toJSON=function(){return this.constructor.toObject(this,n.util.toJSONOptions)},e})(),e})(),t.exports=o}))(),op=7,sp=10;function cp(e){let t=(e.shape?.dim??[]).map(e=>e.dimParam?null:Number(e.dimValue??0));return{elemType:Number(e.elemType??0),dims:t}}function lp(e){let t=(e.attribute??[]).find(e=>e.name===`batch_dims`);return t?Number(t.i??0):0}function up(e,t,n){return ap.onnx.TensorProto.create({name:e,dataType:op,dims:t,int64Data:n})}function dp(e,t,n,r){return ap.onnx.NodeProto.create({opType:e,input:t,output:n,...r===void 0?{}:{attribute:[{name:`axis`,type:2,i:r}]}})}function fp(e){let t=ap.onnx.ModelProto.decode(new Uint8Array(e)),n=t.graph;if(!n)throw Error(`graph-rewrite: model has no graph`);let r=new Map;for(let e of[...n.input??[],...n.valueInfo??[],...n.output??[]])e.name&&e.type?.tensorType&&r.set(e.name,cp(e.type.tensorType));let i=[up(`GND_g0`,[1],[0]),up(`GND_g1`,[1],[1]),up(`GND_sqax`,[3],[0,1,3])],a=new Map,o=new Map,s=[],c=0;for(let e of n.node??[]){if(e.opType!==`GatherND`){s.push(e);continue}let t=lp(e),n=r.get(e.input?.[0]??``),l=r.get(e.input?.[1]??``),u=r.get(e.output?.[0]??``);if(t!==2||n?.elemType!==sp||n.dims.length!==5||n.dims[0]!==1||n.dims[1]!==1||n.dims[2]!==n.dims[3]||l?.elemType!==op||l.dims.length!==4||l.dims[0]!==1||l.dims[1]!==1||l.dims[3]!==2||u?.elemType!==sp||u.dims.length!==4||u.dims[0]!==1||u.dims[1]!==1||u.dims[2]!==l.dims[2]||u.dims[3]!==n.dims[4])throw Error(`graph-rewrite: GatherND '${e.name??`?`}' does not match the asserted (batch_dims=2, fp16 [1,1,D,D,R], int64 [1,1,N,2]) pattern — refusing to half-patch.`);let d=n.dims[2],f=n.dims[4],p=`${d}x${f}`;a.has(p)||(a.set(p,`GND_shape_${p}`),i.push(up(`GND_shape_${p}`,[4],[1,1,d*d,f])),o.set(d,`GND_d0_${d}`),i.push(up(`GND_d0_${d}`,[],[d])));let m=(e.name??`gathernd_${c}`).replace(/[/.]/g,`_`),[h,g,_,v,y,b,x]=[`dataR`,`i0r`,`i1r`,`i0`,`i1`,`t`,`lin`].map(e=>`GND_${m}_${e}`),S=e.input[0],C=e.input[1],w=e.output[0];s.push(dp(`Reshape`,[S,a.get(p)],[h])),s.push(dp(`Gather`,[C,`GND_g0`],[g],-1)),s.push(dp(`Gather`,[C,`GND_g1`],[_],-1)),s.push(dp(`Squeeze`,[g,`GND_sqax`],[v])),s.push(dp(`Squeeze`,[_,`GND_sqax`],[y])),s.push(dp(`Mul`,[v,o.get(d)],[b])),s.push(dp(`Add`,[b,y],[x])),s.push(dp(`Gather`,[h,x],[w],2)),c+=1}if(c===0)return{bytes:e.slice(0),replacedCount:0};n.node=s,n.initializer=[...n.initializer??[],...i];let l=ap.onnx.ModelProto.encode(t).finish(),u=new Uint8Array(l.length);return u.set(l),{bytes:u.buffer,replacedCount:c}}var pp=``+new URL(`../assets/ort-wasm-simd-threaded.BvXJc0iW.wasm`,import.meta.url).href,mp=``+new URL(`../assets/ort-wasm-simd-threaded.jsep.C7qz-dwA.wasm`,import.meta.url).href,hp=``+new URL(`../assets/ort-wasm-simd-threaded.jspi.C59cD9oQ.wasm`,import.meta.url).href,gp=``+new URL(`../assets/ort-wasm-simd-threaded.asyncify.BFbbDQjJ.wasm`,import.meta.url).href;function _p(){let e=pp.lastIndexOf(`/`);return e>=0?pp.slice(0,e+1):`./`}var vp=[pp,mp,hp,gp],yp=!1;function bp(){if(yp)return;yp=!0,vp.length;let e=typeof P.versions?.web==`string`?P.versions.web:`unknown`;console.debug(`[bg-removal] onnxruntime-web ${e}`),P.wasm.wasmPaths=_p(),typeof crossOriginIsolated<`u`&&!crossOriginIsolated&&(P.wasm.numThreads=1,P.wasm.proxy=!1)}var xp=null;async function Sp(){if(xp)return xp;let e=!1;try{e=localStorage.getItem(`paint.ai.backendForce`)===`wasm`}catch{}let t=!e&&typeof navigator<`u`?navigator.gpu:void 0;if(!t)return xp={backend:`wasm`,webgpuAvailable:!1,maxStorageBuffers:null,highQualitySupported:!1,note:`WebGPU is unavailable in this browser — the CPU fallback is much slower.`},xp;try{let e=await t.requestAdapter();if(!e)throw Error(`no adapter`);let n=e.limits.maxStorageBuffersPerShaderStage??null;return xp={backend:`webgpu`,webgpuAvailable:!0,maxStorageBuffers:n,highQualitySupported:n===null||n>=8,note:null},xp}catch{return xp={backend:`wasm`,webgpuAvailable:!1,maxStorageBuffers:null,highQualitySupported:!1,note:`WebGPU initialisation failed — the CPU fallback is much slower.`},xp}}async function Cp(e){let t=await crypto.subtle.digest(`SHA-256`,e);return[...new Uint8Array(t)].map(e=>e.toString(16).padStart(2,`0`)).join(``)}async function wp(e,t,n){let r;try{r=await fetch(de(e),{signal:n})}catch(e){throw n.aborted?new j(`aborted`,`Model download was cancelled.`):new j(`download-failed`,`Could not reach Hugging Face (${e instanceof Error?e.message:`network error`}). Check the connection and retry.`)}if(!r.ok||!r.body)throw new j(`download-failed`,`Model download failed (HTTP ${r.status}). Retry, or check the Hugging Face status page.`);let i=Number(r.headers.get(`content-length`)),a=Number.isFinite(i)&&i>0?i:e.byteSize,o=r.body.getReader(),s=[],c=0;for(;;){let{done:e,value:r}=await o.read();if(n.aborted){try{await o.cancel()}catch{}throw new j(`aborted`,`Model download was cancelled.`)}if(e)break;r&&(s.push(r),c+=r.byteLength,t({loadedBytes:c,totalBytes:a}))}let l=new Uint8Array(c),u=0;for(let e of s)l.set(e,u),u+=e.byteLength;if(l.byteLength!==e.byteSize)throw new j(`download-failed`,`Downloaded ${l.byteLength} bytes but expected ${e.byteSize} — the file changed upstream. Aborted safely; retry to fetch the pinned revision.`);return l.buffer}async function Tp(e,t,n,r){let i=le[e],a=await xe(i);if(a)return r?.(),{bytes:a,fromCache:!0};let o=await wp(i,t,n);if(i.sha256&&await Cp(o)!==i.sha256)throw new j(`integrity-mismatch`,`Downloaded model failed its checksum — not stored, not used. Retry the download.`);let s;try{let e=performance.now(),{bytes:t,replacedCount:n}=fp(o);s=t,console.debug(`[bg-removal] graph rewrite: ${n} GatherND replaced (${o.byteLength} -> ${t.byteLength} bytes, ${Math.round(performance.now()-e)} ms)`)}catch(e){throw new j(`session-failed`,`Downloaded model failed the WebGPU compatibility rewrite (${e instanceof Error?e.message:`unknown error`}). Not stored, not used.`)}try{await Se(i,s,o.byteLength)}catch{}return Ce(i),{bytes:s,fromCache:!1}}var Ep=null;function Dp(){if(Ep){try{Ep.session.release()}catch{}Ep=null}}async function Op(e,t,n){if(Ep&&Ep.quality===e&&Ep.backend===n)return Ep;Dp(),bp();let r=async e=>{try{return await bt.create(t,{executionProviders:[e],graphOptimizationLevel:`all`})}catch(t){throw new j(`session-failed`,e===`webgpu`?`Could not start the model on WebGPU (${t instanceof Error?t.message:`unknown error`}).`:`Could not start the model on the CPU fallback. The fp16 graph needs WebGPU on this device (${t instanceof Error?t.message:`unknown error`}).`)}},i=le[e];if(n===`webgpu`){let t=await r(`webgpu`);return Ep={session:t,backend:`webgpu`,inputName:t.inputNames[0]??`input_image`,inputSize:i.inputSize,quality:e},Ep}if(i.requiresWebGpu)throw new j(`no-webgpu`,`High quality needs WebGPU, which this browser does not provide — the 1024 graph cannot fit the CPU memory budget. Use Balanced instead.`);let a=await r(`wasm`);return Ep={session:a,backend:`wasm`,inputName:a.inputNames[0]??`input_image`,inputSize:i.inputSize,quality:e},Ep}function kp(){return new Promise(e=>setTimeout(e,0))}function Ap(e,t=1){let n=1/0,r=-1/0,i=0,a=0;for(let o=0;o<e.length;o+=t){let t=e[o];t<n&&(n=t),t>r&&(r=t),i+=t,a++}let o=a?i/a:0,s=0;for(let n=0;n<e.length;n+=t){let t=e[n]-o;s+=t*t}return{mean:o,min:n,max:r,std:a?Math.sqrt(s/a):0}}function jp(e){let t=(e&32768)>>15,n=(e&31744)>>10,r=e&1023;return n===0?(t?-1:1)*2**-14*(r/1024):n===31?r?NaN:(t?-1:1)*(1/0):(t?-1:1)*2**(n-15)*(1+r/1024)}function Mp(e){let t=e.data;if(typeof e.type==`string`&&e.type.toLowerCase().includes(`16`)){let e=t,n=new Float32Array(e.length);for(let t=0;t<e.length;t++)n[t]=jp(e[t]);return n}return Float32Array.from(t)}function Np(e,t){let n=document.createElement(`canvas`);return n.width=Math.max(1,Math.round(e)),n.height=Math.max(1,Math.round(t)),n}function Pp(e,t){let n=Np(t,t),r=n.getContext(`2d`,{willReadFrequently:!0});return r.imageSmoothingEnabled=!0,r.imageSmoothingQuality=`high`,r.drawImage(e,0,0,t,t),n}function Fp(e,t){let n=e.getContext(`2d`,{willReadFrequently:!0}).getImageData(0,0,t,t).data,r=t*t,i=new Float32Array(3*r),a=1/255;for(let e=0;e<r;e++){let t=n[e*4]*a,o=n[e*4+1]*a,s=n[e*4+2]*a;i[e]=(t-fe[0])/pe[0],i[r+e]=(o-fe[1])/pe[1],i[2*r+e]=(s-fe[2])/pe[2]}return new I(`float32`,i,[1,3,t,t])}function Ip(e){for(let t=0;t<e.length;t++){let n=e[t];e[t]=n>=0?1/(1+Math.exp(-n)):Math.exp(n)/(1+Math.exp(n))}}function Lp(e,t,n,r){let i=Np(t,t),a=i.getContext(`2d`,{willReadFrequently:!0}),o=a.createImageData(t,t),s=o.data;for(let t=0;t<e.length;t++){let n=Math.max(0,Math.min(1,e[t]));s[t*4]=255,s[t*4+1]=255,s[t*4+2]=255,s[t*4+3]=Math.round(n*255)}a.putImageData(o,0,0);let c=Np(n,r).getContext(`2d`,{willReadFrequently:!0});return c.imageSmoothingEnabled=!0,c.imageSmoothingQuality=`high`,c.drawImage(i,0,0,n,r),c.getImageData(0,0,n,r)}async function Rp(e,t,n,r){let i=t.width,a=t.height;if(i<1||a<1)throw new j(`empty-source`,`The source layer has no pixels to process.`);let o=e.inputSize,s=Fp(Pp(t,o),o),c=Ap(s.data,997);await kp(),n?.(`inferring`);let l,u=`unknown`;try{let t={[e.inputName]:s},n=await e.session.run(t),r=n[e.session.outputNames[0]??Object.keys(n)[0]];u=r?String(r.type):`missing`;let i=r?Mp(r):null;if(!i||i.length!==o*o)throw Error(`unexpected output shape (${String(r?.data.length)})`);l=i}catch(t){throw t instanceof j?t:new j(`inference-failed`,`Inference failed on ${e.backend===`webgpu`?`WebGPU`:`CPU`} (${t instanceof Error?t.message:`unknown error`}).`)}let d=Ap(l,997);Ip(l);let f=Ap(l,997),p=0;for(let e=0;e<l.length;e+=7)l[e]>.5&&p++;let m=p/Math.ceil(l.length/7);if(r?.({inputNames:[...e.session.inputNames],outputNames:[...e.session.outputNames],outputType:u,inputMean:c.mean,inputStd:c.std,inputMin:c.min,inputMax:c.max,logitMean:d.mean,logitMax:d.max,logitMin:d.min,matteMean:f.mean,matteMax:f.max,foregroundRatio:m,backend:e.backend,quality:e.quality}),f.max<.5)throw new j(`empty-source`,`No foreground subject detected — the model found nothing to keep in this layer.`);await kp(),n?.(`compositing`);let h=Lp(l,o,i,a),g=t.getContext(`2d`,{willReadFrequently:!0}).getImageData(0,0,i,a),_=Np(i,a),v=_.getContext(`2d`),y=v.createImageData(i,a),b=g.data,x=h.data,S=y.data;for(let e=0;e<i*a;e++){let t=x[e*4+3]/255;S[e*4]=b[e*4],S[e*4+1]=b[e*4+1],S[e*4+2]=b[e*4+2],S[e*4+3]=Math.round(b[e*4+3]*t)}return v.putImageData(y,0,0),await kp(),{canvas:_,width:i,height:a,backend:e.backend,quality:e.quality}}function zp(e){if(e?.())throw new j(`aborted`,`Cancelled.`)}async function Bp(e){let t=O.active;if(!t)throw new j(`empty-source`,`No document is open.`);let n=t.layers.find(t=>t.id===e)??t.activeLayer;if(!n)throw new j(`empty-source`,`No layer is selected.`);let r=te();if(!r.surfaces.has(n.surfaceId))throw new j(`empty-source`,`The source layer has no pixels.`);let i=r.exportTextureFor(n)??r.surfaces.getTexture(n.surfaceId);if(!i)throw new j(`empty-source`,`Could not read the source layer.`);let a=k(r,i);return{canvas:a,layerName:n.name,width:a.width,height:a.height}}function Vp(e,t,n){let r=O.active;if(!r){e.close();return}A();let i=te(),a=i.surfaces.createFromBitmap(e);e.close();let o=r.width,s=r.height,c=ie(a,`Background Removed`),l=r.indexOfLayer(t),u=l>=0?l+1:r.layers.length,d=r.activeLayerId;r.insertLayer(c,u),r.setActiveLayer(c.id),i.rebuildActiveLayers(),r.setDirty(!0),O.notifyChange(r),r.history.push({label:`Remove Background (${n===`webgpu`?`WebGPU`:`CPU`})`,memoryBytes:o*s*4*2,undo:()=>{r.removeLayer(c.id),r.layers.some(e=>e.id===d)&&r.setActiveLayer(d),i.rebuildActiveLayers(),O.notifyChange(r)},redo:()=>{r.insertLayer(c,Math.min(u,r.layers.length)),r.setActiveLayer(c.id),i.rebuildActiveLayers(),O.notifyChange(r)},dispose:()=>{r.layers.includes(c)||i.surfaces.dispose(a)}})}async function Hp(e,t){let{quality:n,onProgress:r,signal:i,isStale:a}=t,o=le[n],s=t.backendOverride??(await Sp()).backend;if(n===`high`&&s!==`webgpu`)throw new j(`no-webgpu`,`High quality needs WebGPU, which this browser does not provide. Use Balanced instead.`);zp(a);let c=await Bp(e);zp(a);let l=c.canvas.getContext(`2d`,{willReadFrequently:!0}).getImageData(0,0,c.width,c.height).data,u=!1;for(let e=3;e<l.length;e+=256)if(l[e]>0){u=!0;break}if(!u)throw new j(`empty-source`,`"${c.layerName}" is fully transparent — nothing to cut out.`);zp(a);let d=o.byteSize,{bytes:f,fromCache:p}=await Tp(n,e=>{r({phase:`downloading`,ratio:e.totalBytes?Math.min(1,e.loadedBytes/e.totalBytes):null,loadedBytes:e.loadedBytes,totalBytes:e.totalBytes,backend:null,quality:n,fromCache:!1})},i??new AbortController().signal,()=>r({phase:`loading`,ratio:null,loadedBytes:d,totalBytes:d,backend:s,quality:n,fromCache:!0}));zp(a),p||r({phase:`loading`,ratio:null,loadedBytes:d,totalBytes:d,backend:s,quality:n,fromCache:!1});let m=async e=>{let i=await Op(n,f,e);return zp(a),Rp(i,c.canvas,e=>{r({phase:e===`inferring`?`inferring`:`compositing`,ratio:null,loadedBytes:d,totalBytes:d,backend:i.backend,quality:n,fromCache:p})},t.onDebug)},h;try{h=await m(s)}catch(e){if(!(!t.backendOverride&&s===`webgpu`&&n===`balanced`&&e instanceof j&&(e.code===`empty-source`||e.code===`session-failed`)))throw e instanceof j&&e.code===`empty-source`&&n===`high`?new j(`empty-source`,`${e.message} If the subject is clearly visible, this browser is rejecting the high-quality model\u2019s GPU shaders — try Balanced, which can fall back to CPU.`):e;zp(a),h=await m(`wasm`)}return zp(a),Vp(await createImageBitmap(h.canvas),e,h.backend),r({phase:`done`,ratio:1,loadedBytes:d,totalBytes:d,backend:h.backend,quality:n,fromCache:p}),re(`Background removed (${h.backend===`webgpu`?`WebGPU`:`CPU`}) — original layer kept.`,`info`),h}var Up=o(`<button class="btn-secondary">Cancel</button> <button class="btn-primary" disabled="">Working…</button>`,1),Wp=o(`<button class="btn-secondary">Not now</button> <button class="btn-primary"> </button>`,1),Gp=o(`<button class="btn-secondary">Close</button> <button class="btn-primary"> </button>`,1),Kp=o(`<p class="ai-consent" role="group" aria-label="Download consent"> </p>`),qp=o(`<div class="ai-progress-fill"></div>`),Jp=o(`<div class="ai-progress-fill indeterminate"></div>`),Yp=o(`<div class="ai-progress" role="status" aria-live="polite"><div class="ai-progress-label"> </div> <div class="ai-progress-well"><!></div> <div class="ai-progress-bytes"><!></div></div>`),Xp=o(`<p class="ai-error" role="alert"> </p>`),Zp=o(`<div class="ai-body"><p class="ai-source">Source layer: <strong> </strong></p> <p class="ai-note">Runs entirely in this browser — no upload, no account. The original layer is kept; the cutout lands on a new layer above it.</p> <div class="seg ai-quality" role="group" aria-label="Model quality"><button>Balanced · 512</button> <button>High · 1024</button></div> <p class="ai-detail"> </p> <div class="seg ai-quality" role="group" aria-label="Execution backend"><button title="Detect WebGPU, fall back to CPU when its result is empty">Auto</button> <button title="WebGPU only, no fallback — for diagnostics">GPU</button> <button title="CPU only, no fallback — slower but deterministic">CPU</button></div> <!> <p class="ai-backend" aria-live="polite"><!></p> <!> <!></div>`);function Qp(r,o){ee(o,!0);let h=`ai.backgroundRemoval`,E={quality:ue,downloadGranted:[],backend:`auto`},D=g(`idle`),k=g(c(se(h,E))),A=g(c(l(k).quality)),te=g(null),re=w(()=>l(te)===!1&&!l(k).downloadGranted.includes(l(A))),ie=g(null),ce=g(null),de=g(!1),fe=g(!1),pe=g(!1),me=g(null),he=g(null),ge=g(`…`),_e=0,M=null,ve=w(()=>l(k).backend===`auto`?l(ie)??`auto`:l(k).backend),ye=w(()=>l(ve)===`webgpu`&&l(fe)&&l(pe)),xe=w(()=>l(ve)===`wasm`?`High needs WebGPU (CPU pinned)`:l(fe)?l(pe)?null:`Adapter reports too few storage buffers`:`Needs WebGPU (unavailable here)`);function Se(e){return`${(e/1048576).toFixed(1)} MB`}function Ce(e){let t=le[e.quality];switch(e.phase){case`downloading`:return`Downloading model (${t.label} ${Se(t.byteSize)})…`;case`loading`:return e.fromCache?`Loading cached model (${t.label})…`:`Loading model (${t.label})…`;case`inferring`:return`Removing background (${e.backend===`webgpu`?`WebGPU`:`CPU`})…`;case`compositing`:return`Applying mask at full resolution…`;case`done`:return`Done.`}}function we(){ae(h,l(k))}async function Te(){e(te,null);try{e(te,await be(le[l(A)]),!0)}catch{e(te,!1)}}C(()=>{let t=O.active,n=t?.layers.find(e=>e.id===o.payload.layerId)??t?.activeLayer??null;e(ge,n?`"${n.name}" (${t.width} × ${t.height})`:`no layer`,!0),Te(),Sp().then(t=>{e(ie,t.backend,!0),e(ce,t.note,!0),e(de,!0),e(fe,t.webgpuAvailable,!0),e(pe,t.highQualitySupported,!0),l(A)===`high`&&!(l(ie)===`webgpu`&&t.webgpuAvailable&&t.highQualitySupported)&&(e(A,`balanced`),e(k,{...l(k),quality:l(A)},!0),we())})});function Ee(t){l(D)!==`working`&&t!==l(A)&&(e(A,t,!0),e(k,{...l(k),quality:t},!0),we(),Te())}function De(t){if(l(D)===`working`||t===l(k).backend)return;let n=t===`wasm`&&l(A)===`high`?`balanced`:l(A);e(A,n,!0),e(k,{...l(k),backend:t,quality:n},!0),we()}async function Oe(){if(l(D)===`working`)return;l(re)&&!l(k).downloadGranted.includes(l(A))&&(e(k,{...l(k),downloadGranted:[...l(k).downloadGranted,l(A)]},!0),we()),e(D,`working`),e(he,null),e(me,null);let t=++_e;M=new AbortController;let n=()=>t!==_e;try{await Hp(o.payload.layerId,{quality:l(A),signal:M.signal,isStale:n,onProgress:t=>{n()||e(me,t,!0)},onDebug:e=>console.debug(`[bg-removal] ${JSON.stringify(e)}`),backendOverride:l(k).backend===`auto`?void 0:l(k).backend}),n()||ne()}catch(t){if(n()||t instanceof j&&t.code===`aborted`){ne();return}e(he,t instanceof j?t.message:`Unexpected error (${t instanceof Error?t.message:`unknown`}).`,!0),e(D,`error`)}finally{n()||(M=null)}}function N(){_e++,M?.abort(),M=null,ne()}oe(r,{title:`Remove Background`,onClose:N,width:380,actions:e=>{var r=x(),a=f(r),o=e=>{var n=Up(),r=f(n);b(2),i(`click`,r,N),t(e,n)},s=e=>{var n=Wp(),r=f(n),a=p(r,2),o=d(a);u(e=>S(o,`Download (${e??``})`),[()=>Se(le[l(A)].byteSize)]),i(`click`,r,N),i(`click`,a,Oe),t(e,n)},c=e=>{var n=Gp(),r=f(n),a=p(r,2),o=d(a,!0);u(()=>S(o,l(D)===`error`?`Retry`:l(te)===!1?`Download & Remove Background`:`Remove Background`)),i(`click`,r,N),i(`click`,a,Oe),t(e,n)};n(a,e=>{l(D)===`working`?e(o):l(re)?e(s,1):e(c,-1)}),t(e,r)},children:(e,r)=>{var o=Zp(),c=a(o),f=p(a(c)),h=d(f,!0);y(c);var g=p(c,4),_=a(g);let b;var x=p(_,2);let C;y(g);var w=p(g,2),ee=d(w),E=p(w,2),O=a(E);let te;var ne=p(O,2);let ae;var oe=p(ne,2);let se;y(E);var j=p(E,2),ue=e=>{var n=Kp(),r=d(n);u(e=>S(r,`First run needs a one-time download: the ${le[l(A)].label??``} model
				(${e??``}) from Hugging Face. It is stored in
				this browser's cache and reused offline — your images never leave this device.`),[()=>Se(le[l(A)].byteSize)]),t(e,n)};n(j,e=>{l(re)&&e(ue)});var fe=p(j,2),pe=a(fe),_e=e=>{var n=s();u(()=>S(n,`Backend pinned: ${l(k).backend===`webgpu`?`GPU (no fallback)`:`CPU (no fallback)`}.`)),t(e,n)},M=e=>{var n=s(`Detecting hardware…`);t(e,n)},ve=e=>{var n=s(`Backend: WebGPU (auto CPU fallback).`);t(e,n)},be=e=>{var n=s();u(()=>S(n,`Backend: CPU fallback. ${l(ce)??`Processing will be slower.`??``}`)),t(e,n)};n(pe,e=>{l(k).backend===`auto`?l(de)?l(ie)===`webgpu`?e(ve,2):e(be,-1):e(M,1):e(_e)}),y(fe);var we=p(fe,2),Te=e=>{var r=Yp(),i=a(r),o=d(i,!0),c=p(i,2),f=a(c),m=e=>{var n=qp();u(e=>v(n,`width:${e??``}%;`),[()=>Math.round(l(me).ratio*100)]),t(e,n)},h=e=>{var n=Jp();t(e,n)};n(f,e=>{l(me).ratio===null?e(h,-1):e(m)}),y(c);var g=p(c,2),_=a(g),b=e=>{var n=s();u((e,t)=>S(n,`${e??``} / ${t??``}`),[()=>Se(l(me).loadedBytes),()=>Se(l(me).totalBytes)]),t(e,n)},x=e=>{var n=s(`from local cache`);t(e,n)};n(_,e=>{l(me).phase===`downloading`&&l(me).totalBytes?e(b):l(me).fromCache&&(l(me).phase===`loading`||l(me).phase===`done`)&&e(x,1)}),y(g),y(r),u(e=>S(o,e),[()=>Ce(l(me))]),t(e,r)};n(we,e=>{l(me)&&e(Te)});var Oe=p(we,2),N=e=>{var n=Xp(),r=d(n,!0);u(()=>S(r,l(he))),t(e,n)};n(Oe,e=>{l(D)===`error`&&l(he)&&e(N)}),y(o),u(()=>{S(h,l(ge)),b=m(_,1,`seg-btn`,null,b,{on:l(A)===`balanced`}),_.disabled=l(D)===`working`,T(_,`title`,le.balanced.detail),C=m(x,1,`seg-btn`,null,C,{on:l(A)===`high`}),x.disabled=l(D)===`working`||!l(ye),T(x,`title`,l(ye)?le.high.detail:`High quality unavailable: ${l(xe)??`unknown reason`}`),S(ee,`${(l(A)===`balanced`?le.balanced.detail:le.high.detail)??``}
			${l(A)===`high`?` — downloads only when you run it.`:` — downloads once, then reused offline.`}`),te=m(O,1,`seg-btn`,null,te,{on:l(k).backend===`auto`}),O.disabled=l(D)===`working`,ae=m(ne,1,`seg-btn`,null,ae,{on:l(k).backend===`webgpu`}),ne.disabled=l(D)===`working`,se=m(oe,1,`seg-btn`,null,se,{on:l(k).backend===`wasm`}),oe.disabled=l(D)===`working`}),i(`click`,_,()=>Ee(`balanced`)),i(`click`,x,()=>Ee(`high`)),i(`click`,O,()=>De(`auto`)),i(`click`,ne,()=>De(`webgpu`)),i(`click`,oe,()=>De(`wasm`)),t(e,o)},$$slots:{actions:!0,default:!0}}),_()}r([`click`]);export{Qp as default};
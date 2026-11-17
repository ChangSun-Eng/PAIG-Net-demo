/* Portable replay of the meeting viewer's Q1 quad interpolation, sRGB palette and camera fit. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let data, viewerReady=false;
  const query = new URLSearchParams(location.search);
  const revision = '20261117.3';
  // Older cached orbit pages lack the multicase viewer controls.
  if (!$('staticView') || !$('expand')) {
    const fresh = new URL(location.href);
    if (fresh.searchParams.get('v') !== revision) {
      fresh.searchParams.set('v',revision);
      location.replace(fresh.href);
    } else if ($('status')) {
      $('status').textContent='Please reload to open the updated 3D viewer.';
    }
    return;
  }
  const cases=window.PAIG_CASES || [{id:117,label:"C2-117"}];
  const activeCase=cases.find(c=>c.id===Number(query.get('case'))) || cases.find(c=>c.id===117);
  const folder=activeCase.id===117 ? '' : '../cases/C2-'+activeCase.id+'/';
  const embedded=query.get('embed')==='1' && window.parent!==window;
  document.documentElement.classList.toggle('embed',embedded);
  $('caseInfo').textContent = embedded ? 'Drag to rotate both views' : activeCase.label+' · Linked cameras';
  $('expand').hidden=!embedded;
  const chosen = query.get('field');
  const fieldNames = ['temperature', 'strain', 'stress'];
  let field = fieldNames.includes(chosen) ? chosen : 'temperature';
  let frame = Math.min(119, Math.max(0, (parseInt(query.get('record'), 10) || 60) - 1));
  let gl, program, vertexBuffer, uvBuffer, triangles, wires, colors, attribute, uniform;
  let boxCorners, coordinates, faceIndices, triangleCount, wireCount, fieldCodes, colorUpload;
  let yaw, pitch, zoom, viewChanged = false, changedAt = -1;
  let token = 0, playing = false, timer = null, drag = null, renderQueued = false;
  const surface = $('surface');
  const pending = new Map();
  window.orbitBuffers = Object.create(null);
  const initialYaw = Math.atan2(-1.36, .89);
  const initialPitch = Math.atan2(1.64, Math.hypot(.89, 1.36));
  const tanVertical = Math.tan(17 * Math.PI / 180);
  const vertex = `
    attribute vec3 pos; attribute vec2 uv; attribute vec4 corners;
    uniform vec3 right, up, eye; uniform vec2 focal; uniform float distance;
    varying vec2 tex; varying vec4 values;
    void main(){
      float w = distance - dot(pos,eye);
      gl_Position=vec4(dot(pos,right)*focal.x,dot(pos,up)*focal.y,1.0001*w-.2,w);
      tex=uv; values=corners/4095.0;
    }`;
  const fragment = `
    precision highp float;
    varying vec2 tex; varying vec4 values; uniform bool wire;
    vec3 ramp(float v){
      vec3 a=vec3(36.,63.,145.), b=vec3(36.,124.,171.), c=vec3(56.,192.,192.);
      vec3 d=vec3(151.,216.,154.), e=vec3(245.,226.,102.), f=vec3(242.,138.,65.), g=vec3(177.,31.,53.);
      if(v<.17) return mix(a,b,v/.17); if(v<.35) return mix(b,c,(v-.17)/.18);
      if(v<.51) return mix(c,d,(v-.35)/.16); if(v<.67) return mix(d,e,(v-.51)/.16);
      if(v<.83) return mix(e,f,(v-.67)/.16); return mix(f,g,(v-.83)/.17);
    }
    void main(){
      float s = mix(mix(values.x,values.y,tex.x),mix(values.w,values.z,tex.x),tex.y);
      gl_FragColor = wire ? vec4(.23,.32,.34,.42) : vec4(ramp(clamp(s,0.,1.))/255.,1.);
    }`;

  async function inflate(text) {
    const binary = Uint8Array.from(atob(text), c => c.charCodeAt(0));
    const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }
  function loadField(key) {
    if (!pending.has(key)) pending.set(key, new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = folder + key + '.js?v=' + revision;
      script.onerror = () => reject(Error('The saved display colours could not be opened.'));
      script.onload = async () => {
        try {
          const bytes = new Uint8Array(await inflate(window.orbitBuffers[key]));
          delete window.orbitBuffers[key];
          const samples=data.fields[key].time.length*2*data.nodes;
          if (bytes.length !== samples+Math.ceil(samples/2)
              || data.displayLevels!==4096 || data.displayLayout!=='high8-low4-paired') throw Error('Incomplete surface display.');
          const codes=new Uint16Array(samples);
          for(let i=0;i<samples;i++){
            const pair=bytes[samples+(i>>1)];
            codes[i]=(bytes[i]<<4)|((i&1)?pair>>4:pair&15);
          }
          resolve(codes);
        } catch (e) { reject(e); }
      };
      document.head.append(script);
    }));
    return pending.get(key);
  }
  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s,source); gl.compileShader(s);
    if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
    return s;
  }
  function buffer(target, values, usage = gl.STATIC_DRAW) {
    const b = gl.createBuffer(); gl.bindBuffer(target,b); gl.bufferData(target,values,usage); return b;
  }
  function assignAttribute(name, b, size, type, normalized=false) {
    gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.enableVertexAttribArray(attribute[name]);
    gl.vertexAttribPointer(attribute[name],size,type,normalized,0,0);
  }
  async function prepare() {
    const [xyzBytes,indices] = await Promise.all([inflate(data.xyz),inflate(data.quads)]);
    const xyz = new Uint16Array(xyzBytes); faceIndices = new Uint16Array(indices);
    if (xyz.length!==3*data.nodes || faceIndices.length!==4*data.faces || faceIndices.length>65535)
      throw Error('Unexpected surface mesh size.');
    coordinates=Float32Array.from(xyz,(q,i)=>(q/65535-.5)*data.span[i%3]);
    boxCorners=[];
    for (const x of [-.5,.5]) for (const y of [-.5,.5]) for (const z of [-.5,.5])
      boxCorners.push([x*data.span[0], y*data.span[1], z*data.span[2]]);
    gl=surface.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
    if (!gl) throw Error('This browser could not open WebGL.');
    program=gl.createProgram(); gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    attribute=Object.fromEntries(['pos','uv','corners'].map(k=>[k,gl.getAttribLocation(program,k)]));
    uniform=Object.fromEntries(['right','up','eye','distance','focal','wire'].map(k=>[k,gl.getUniformLocation(program,k)]));
    const positions = new Float32Array(faceIndices.length*3), uvs = new Float32Array(faceIndices.length*2);
    const triangleIds = new Uint16Array(data.faces*6), wireIds = new Uint16Array(data.faces*8);
    for(let f=0;f<data.faces;f++) {
      const i=f*4;
      for(let k=0;k<4;k++) {
        const id=3*faceIndices[i+k], offset=3*(i+k);
        positions[offset]=coordinates[id]; positions[offset+1]=coordinates[id+1]; positions[offset+2]=coordinates[id+2];
      }
      uvs.set([0,0,1,0,1,1,0,1],i*2);
      triangleIds.set([i,i+1,i+2,i,i+2,i+3],f*6);
      wireIds.set([i,i+1,i+1,i+2,i+2,i+3,i+3,i],f*8);
    }
    vertexBuffer=buffer(gl.ARRAY_BUFFER,positions); uvBuffer=buffer(gl.ARRAY_BUFFER,uvs);
    triangles=buffer(gl.ELEMENT_ARRAY_BUFFER,triangleIds); wires=buffer(gl.ELEMENT_ARRAY_BUFFER,wireIds);
    triangleCount=triangleIds.length;wireCount=wireIds.length;
    colorUpload=new Uint16Array(faceIndices.length*4);
    colors=[0,1].map(()=>buffer(gl.ARRAY_BUFFER,colorUpload.byteLength,gl.DYNAMIC_DRAW));
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(1,1,1,1);
    assignAttribute('pos',vertexBuffer,3,gl.FLOAT);assignAttribute('uv',uvBuffer,2,gl.FLOAT);
  }
  function upload() {
    for(let side=0;side<2;side++) {
      const offset=(frame*2+side)*data.nodes;
      for(let q=0;q<faceIndices.length;q+=4) {
        const a=fieldCodes[offset+faceIndices[q]], b=fieldCodes[offset+faceIndices[q+1]];
        const c=fieldCodes[offset+faceIndices[q+2]], d=fieldCodes[offset+faceIndices[q+3]];
        for(let v=0;v<4;v++) {
          const i=(q+v)*4;
          colorUpload[i]=a;colorUpload[i+1]=b;colorUpload[i+2]=c;colorUpload[i+3]=d;
        }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER,colors[side]);gl.bufferSubData(gl.ARRAY_BUFFER,0,colorUpload);
    }
    changedAt=frame;
  }
  function fit(aspect, y, p) {
    const cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p);
    const eye=[cp*cy,cp*sy,sp],right=[-sy,cy,0],up=[-sp*cy,-sp*sy,cp];
    const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    let dist=1;
    for(const v of boxCorners) {
      const z=dot(v,eye);
      dist=Math.max(dist,z+1.2*Math.abs(dot(v,right))/(tanVertical*aspect),z+1.13*Math.abs(dot(v,up))/tanVertical,z+1);
    }
    return {eye,right,up,dist};
  }
  function render() {
    renderQueued=false;
    if (!fieldCodes || !gl) return;
    const ratio=Math.min(devicePixelRatio||1,2);
    const width=Math.max(2,2*Math.round(surface.clientWidth*ratio/2)),height=Math.max(1,Math.round(surface.clientHeight*ratio));
    if(surface.width!==width||surface.height!==height){surface.width=width;surface.height=height;}
    const half=width/2, aspect=half/height;
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    if (changedAt!==frame) upload();
    const camera=fit(aspect,yaw,pitch);
    const defaultDistance=viewChanged?fit(aspect,initialYaw,initialPitch).dist:camera.dist;
    for(const [k,v] of Object.entries(camera)) if (k!=='dist') gl.uniform3fv(uniform[k],v);
    gl.uniform1f(uniform.distance,defaultDistance/zoom);gl.uniform2f(uniform.focal,1/(tanVertical*aspect),1/tanVertical);
    for(let side=0;side<2;side++) {
      gl.viewport(side*half,0,half,height);assignAttribute('corners',colors[side],4,gl.UNSIGNED_SHORT);
      gl.uniform1i(uniform.wire,0);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangles);gl.drawElements(gl.TRIANGLES,triangleCount,gl.UNSIGNED_SHORT,0);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      if($('mesh').checked) {
        gl.uniform1i(uniform.wire,1);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,wires);gl.drawElements(gl.LINES,wireCount,gl.UNSIGNED_SHORT,0);gl.disable(gl.BLEND);
      }
    }
    surface.dataset.view=[yaw,pitch,zoom].map(v=>v.toFixed(3)).join(',');
    surface.dataset.displayed=field+'/'+(frame+1);
  }
  function paint(){if(!renderQueued){renderQueued=true;requestAnimationFrame(render);}}
  function notifyParent() {
    if (!embedded) return;
    window.parent.postMessage({type:'paig-view',case:activeCase.id,field,record:frame+1,
      height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+2},
      location.protocol==='file:' ? '*' : location.origin);
  }
  function updateLinks() {
    const params=new URLSearchParams({case:String(activeCase.id),field,record:String(frame+1),v:revision});
    $('back').href='../index.html?'+params+'#comparison';
    $('expand').href='index.html?'+params;
    notifyParent();
  }
  function updateFrame(index) {
    frame=Math.max(0,Math.min(119,index));$('timeline').value=frame+1;
    const f=data.fields[field];$('time').textContent=f.time[frame].toFixed(3)+' s · '+f.clock;
    $('record').textContent='Record '+(frame+1)+' / 120  ·  '+f.progress[frame].toFixed(1)+'%';
    updateLinks();
    $('previous').disabled=frame===0;$('next').disabled=frame===119;paint();
  }
  function stop() {
    playing=false;clearInterval(timer);timer=null;
    $('play').setAttribute('aria-pressed','false');$('playText').textContent='Play';
  }
  function togglePlay() {
    if(playing){stop();return;}
    if(!fieldCodes)return;
    if(frame===119)updateFrame(0);playing=true;
    $('playText').textContent='Pause';$('play').setAttribute('aria-pressed','true');
    timer=setInterval(()=>{if(frame===119)stop();else updateFrame(frame+1);},105);
  }
  async function select(key) {
    stop();
    const previousProgress=data?.fields[field]?.progress[frame];
    if (data && field!==key && Number.isFinite(previousProgress)) {
      frame=data.fields[key].progress.reduce((nearest,p,i,all)=>Math.abs(p-previousProgress)<Math.abs(all[nearest]-previousProgress) ? i : nearest,0);
    }
    const request=++token;field=key;fieldCodes=null;changedAt=-1;
    for(const btn of document.querySelectorAll('[data-field]'))btn.setAttribute('aria-pressed',String(btn.dataset.field===field));
    if(!viewerReady){showStatic();return;}
    document.documentElement.classList.remove('static-preview');
    $('staticView').hidden=true;
    $('status').hidden=false;
    const f=data.fields[field];
    const format=(n)=>n.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:0});
    $('scaleMin').textContent=format(f.low);$('scaleMax').textContent=format(f.high);
    $('scaleName').textContent=f.label+' ('+f.unit+')';
    updateFrame(frame);
    try {
      const values=await loadField(key);if(request!==token)return;
      fieldCodes=values;$('status').hidden=true;paint();
    } catch(e){if(request===token)showStatic(e);}
  }
  function showStatic(error) {
    stop();
    frame=59;
    document.documentElement.classList.add('static-preview');
    const f=data?.fields[field];
    const snapshotTime=f ? ' ('+f.time[59].toFixed(3)+' s, '+f.clock+')' : '';
    $('staticNote').textContent='The interactive renderer is unavailable. Showing record 60 of 120'+snapshotTime+'.';
    $('poster').alt=activeCase.label+' at record 60: Abaqus reference and PAIG-Net prediction for '+field+'.';
    $('poster').src=activeCase.id===117 ? '../media/'+field+'/059.webp' : folder+'poster-'+field+'.webp';
    $('staticView').hidden=false;
    for(const btn of document.querySelectorAll('[data-field]'))btn.setAttribute('aria-pressed',String(btn.dataset.field===field));
    updateLinks();notifyParent();
  }
  function reset(top=false) {
    yaw=top?-Math.PI/2:initialYaw; pitch=top?Math.PI/2:initialPitch;zoom=1;viewChanged=false;paint();
  }
  function rotate(dx,dy) {
    viewChanged=true;yaw+=dx;pitch=Math.max(-1.56,Math.min(1.56,pitch+dy));paint();
  }
  function zoomBy(factor){zoom=Math.max(.48,Math.min(2.5,zoom*factor));paint();}
  surface.addEventListener('pointerdown',e=>{
    if(e.button!==0||drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};surface.setPointerCapture(e.pointerId);surface.focus();
  });
  surface.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    rotate(-(e.clientX-drag.x)*.009,(e.clientY-drag.y)*.009);drag.x=e.clientX;drag.y=e.clientY;
  });
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(ev,e=>{if(drag&&drag.id===e.pointerId)drag=null;});
  surface.addEventListener('wheel',e=>{e.preventDefault();zoomBy(Math.exp(-Math.sign(e.deltaY)*.1));},{passive:false});
  surface.addEventListener('keydown',e=>{
    const actions={ArrowLeft:()=>rotate(-.1,0),ArrowRight:()=>rotate(.1,0),ArrowUp:()=>rotate(0,.1),ArrowDown:()=>rotate(0,-.1),
                   '+':()=>zoomBy(1.12),'=':()=>zoomBy(1.12),'-':()=>zoomBy(1/1.12),r:()=>reset()};
    if(actions[e.key]){e.preventDefault();actions[e.key]();}
  });
  for(const btn of document.querySelectorAll('[data-field]'))btn.addEventListener('click',()=>select(btn.dataset.field));
  $('top').addEventListener('click',()=>reset(true));$('reset').addEventListener('click',()=>reset());
  $('mesh').addEventListener('change',paint);
  $('play').addEventListener('click',togglePlay);$('timeline').addEventListener('input',()=>{stop();updateFrame(+$('timeline').value-1);});
  $('previous').addEventListener('click',()=>{stop();updateFrame(frame-1);});$('next').addEventListener('click',()=>{stop();updateFrame(frame+1);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  new ResizeObserver(paint).observe(surface);
  if(embedded) new ResizeObserver(notifyParent).observe(document.querySelector('main'));
  $('poster').addEventListener('load',notifyParent);
  reset();
  async function start(){
    const script=document.createElement('script');
    script.src=folder+'surface.js?v='+revision;
    await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;document.head.append(script);});
    data=window.orbitSurface;
    if(!data || data.case!==activeCase.label) throw Error('Unexpected case geometry');
    await prepare();
    viewerReady=true;
    await select(field);
  }
  start().catch(showStatic);
})();

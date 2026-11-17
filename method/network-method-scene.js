/* Diagram of the audited A1 prediction route. Display-only; no model execution. */
(function(root){
  'use strict';
  const NS='http://www.w3.org/2000/svg';let serial=0;
  function shell(host,width,height,label){
    const id='net-method-'+(++serial),svg=document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','group');svg.setAttribute('aria-label',label);svg.classList.add('method-svg');
    svg.innerHTML=`<defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker></defs><style>
      .method-svg{width:100%;height:100%;display:block;font-family:Arial,Helvetica,sans-serif;color:#142131}
      #${id} .ink{fill:#142131}#${id} .muted{fill:#6b7a8b}#${id} .label{font-size:20px;font-weight:500;letter-spacing:-.4px}#${id} .small{font-size:14px}#${id} .tiny{font-size:12px}#${id} .math{font-family:Georgia,serif;font-size:19px;font-style:italic}
      #${id} .line{fill:none;stroke:#52687e;stroke-width:2;stroke-linejoin:round;stroke-linecap:round;marker-end:url(#${id}-arrow)}#${id} .green-line{stroke:#4d8d51}#${id} .purple-line{stroke:#9373bd}
      #${id} .dim{opacity:.2;transition:opacity .45s}#${id} .dim.active{opacity:1}#${id} .clickable{cursor:pointer}#${id} .clickable:hover .click-border{stroke:#2364bd;stroke-width:2.5}#${id} .clickable:focus{outline:none}#${id} .clickable:focus .click-border{stroke:#2364bd;stroke-width:3}
      @media(prefers-reduced-motion:reduce){#${id} .dim{transition:none}}
      </style>`;
    svg.id=id;host.replaceChildren(svg);return {id,svg};
  }
  function bar(x,y,color,w=80){return `<g fill="${color}" stroke="#fff" stroke-width=".8">${Array.from({length:7},(_,i)=>`<rect x="${x+i*w/7}" y="${y}" width="${w/7}" height="18" opacity="${.45+i*.075}"/>`).join('')}</g>`;}
  function clickable(svg,onOpen){
    function select(event){const target=event.target.closest('[data-open]');if(!target)return;if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;event.preventDefault();event.stopPropagation();onOpen?.(target.dataset.open,{context:target.dataset.context||'thermal'});}
    svg.addEventListener('click',select);svg.addEventListener('keydown',select);
    return ()=>{svg.removeEventListener('click',select);svg.removeEventListener('keydown',select);};
  }
  function networkMount(host,onOpen){
    const {svg}=shell(host,1400,600,'PAIG-Net graph inputs, separate thermal and mechanical pathways, learned thermal coupling and prescribed elastic-strain stress closure');
    svg.insertAdjacentHTML('beforeend',`
      <g class="dim" data-tier="0">
        <g class="clickable" role="button" tabindex="0" aria-label="Inspect input-to-graph construction" data-open="graph">
          <rect class="click-border" x="25" y="190" width="200" height="203" rx="10" fill="#f7faff" stroke="#9eb6cc" stroke-width="1.5"/>
          <text x="125" y="222" text-anchor="middle" class="label ink">Graph inputs</text>
          <text x="46" y="260" class="math ink">h⁽⁰⁾</text>${bar(92,244,'#68b5dd',110)}
          <text x="46" y="299" class="math ink">e⁽⁰⁾</text>${bar(92,283,'#f2a06f',110)}
          <text x="46" y="338" class="math ink">g</text>${bar(92,322,'#8abc80',110)}
          <text x="125" y="371" text-anchor="middle" class="tiny muted">Mesh · configuration · scan</text>
          <text x="125" y="420" text-anchor="middle" class="small muted">Click to inspect the graph ↗</text>
        </g>
      </g>
      <g class="dim" data-tier="1">
        <rect x="285" y="55" width="1080" height="210" rx="10" fill="#fffaf5" stroke="#ead6bf" stroke-width="1.4"/>
        <text x="305" y="83" class="label ink">Thermal pathway</text>
        <path class="line" d="M225 255H253V174H325"/>
        <g class="clickable" role="button" tabindex="0" aria-label="Inspect the thermal multiscale processor" data-open="processor" data-context="thermal">
          <rect class="click-border" x="325" y="110" width="280" height="125" rx="6" fill="#fff" stroke="#e3a572" stroke-width="1.6"/>
          <text x="465" y="145" text-anchor="middle" class="label ink">Multiscale graph</text><text x="465" y="171" text-anchor="middle" class="label ink">processor</text>
          <text x="465" y="211" text-anchor="middle" class="small muted">Fine GMBs → Coarse GMBs ↗</text>
        </g>
        <path class="line" d="M605 172H690"/>
        <rect x="690" y="115" width="225" height="115" rx="6" fill="#f4f8fc" stroke="#8da9c4" stroke-width="1.5"/>
        <text x="802" y="148" text-anchor="middle" class="small ink">Thermal representation</text>${bar(762,161,'#68b5dd',80)}<text x="852" y="177" class="math ink">z<tspan baseline-shift="sub" font-size="12">T</tspan></text>
        <text x="802" y="211" text-anchor="middle" class="small ink">Temperature head</text>
        <path class="line" d="M915 172H1165"/><text x="1036" y="159" text-anchor="middle" class="small muted">Predicted ΔT</text>
        <rect x="1165" y="116" width="155" height="112" rx="8" fill="#fff" stroke="#d2a274" stroke-width="1.6"/>
        <text x="1242" y="162" text-anchor="middle" class="label ink">Temperature</text><text x="1242" y="200" text-anchor="middle" class="math ink">T</text>
      </g>
      <g class="dim" data-tier="2">
        <rect x="285" y="330" width="1080" height="235" rx="10" fill="#f7faff" stroke="#cad9e8" stroke-width="1.4"/>
        <text x="305" y="358" class="label ink">Mechanical pathway</text>
        <path class="line" d="M225 320H253V450H325"/>
        <g class="clickable" role="button" tabindex="0" aria-label="Inspect the mechanical multiscale processor" data-open="processor" data-context="mechanical">
          <rect class="click-border" x="325" y="390" width="280" height="125" rx="6" fill="#fff" stroke="#83acd5" stroke-width="1.6"/>
          <text x="465" y="425" text-anchor="middle" class="label ink">Multiscale graph</text><text x="465" y="451" text-anchor="middle" class="label ink">processor</text>
          <text x="465" y="491" text-anchor="middle" class="small muted">Independent parameters ↗</text>
        </g>
        <path class="line" d="M605 452H670"/>
        <rect x="670" y="386" width="200" height="137" rx="6" fill="#f2f8ef" stroke="#82af77" stroke-width="1.6"/>
        <text x="770" y="418" text-anchor="middle" class="label ink">Thermal coupling</text>
        <text x="770" y="447" text-anchor="middle" class="small ink">Nodewise z<tspan baseline-shift="sub" font-size="10">T</tspan> and ΔT</text><text x="770" y="477" text-anchor="middle" class="small ink">Pooled thermal FiLM</text><text x="770" y="504" text-anchor="middle" class="tiny muted">Learned adapters</text>
        <path class="line green-line" d="M805 230V302H770V386"/>
        <text x="815" y="293" class="small muted">Thermal features + ΔT</text>
        <path class="line green-line" d="M575 235V285H735V386"/>
        <path class="line" d="M870 452H930"/>
        <rect x="930" y="380" width="180" height="153" rx="6" fill="#fff" stroke="#83acd5" stroke-width="1.6"/>
        <text x="1020" y="408" text-anchor="middle" class="label ink">Strain heads</text>
        <text x="947" y="439" class="small ink">LE</text>${bar(991,425,'#68b5dd',98)}
        <text x="947" y="473" class="small ink">PE</text>${bar(991,459,'#68b5dd',98)}
        <text x="947" y="507" class="small ink">EEL</text>${bar(991,493,'#68b5dd',98)}
      </g>
      <g class="dim" data-tier="3">
        <path class="line" d="M1110 503H1138V447H1170"/><text x="1132" y="526" text-anchor="middle" class="tiny muted">EEL</text>
        <rect x="1170" y="380" width="170" height="153" rx="6" fill="#f5f6f7" stroke="#8995a2" stroke-width="1.6"/>
        <text x="1255" y="410" text-anchor="middle" class="small ink">Prescribed closure</text>
        <text x="1255" y="449" text-anchor="middle" class="math ink">σ = C : EEL</text>
        <path class="line" d="M1255 460V477"/><text x="1255" y="508" text-anchor="middle" class="label ink">von Mises</text>
      </g>`);
    const unbind=clickable(svg,onOpen);
    return {setStep(step){for(const g of svg.querySelectorAll('[data-tier]'))g.classList.toggle('active',Number(g.dataset.tier)<=step);svg.dataset.step=String(step);},dispose(){unbind();svg.remove();}};
  }
  function processorMount(host,onOpen){
    const {svg}=shell(host,1450,520,'Source-checked multiscale graph processor: node and edge encoders, eight fine GMBs, mean pooling, two coarse GMBs, unpooling and fusion with the fine skip');
    svg.insertAdjacentHTML('beforeend',`
      <g class="dim" data-group="condition">
        <rect x="400" y="12" width="655" height="118" fill="#f4f9ef" stroke="#a4c993" stroke-width="1.2"/>
        <text x="420" y="45" class="small ink">Global descriptor</text><text x="465" y="70" class="math ink">g</text>${bar(420,85,'#88b97a',92)}
        <path class="line green-line" d="M518 84H550"/><rect x="550" y="37" width="173" height="70" fill="#e7f2dc" stroke="#7ea962" stroke-width="1.4"/>
        <text x="636" y="65" text-anchor="middle" class="label ink">FiLM generators</text><text x="636" y="89" text-anchor="middle" class="tiny muted">Independent per GMB</text>
        <path class="line green-line" d="M723 64H764"/><path class="line green-line" d="M723 87H764"/>
        <text x="780" y="66" class="math ink">γ<tspan baseline-shift="sub" font-size="13">f</tspan>, β<tspan baseline-shift="sub" font-size="13">f</tspan></text><text x="875" y="66" class="small ink">Fine stack</text>
        <text x="780" y="95" class="math ink">γ<tspan baseline-shift="sub" font-size="13">c</tspan>, β<tspan baseline-shift="sub" font-size="13">c</tspan></text><text x="875" y="95" class="small ink">Coarse stack</text>
        <path class="line green-line" d="M865 70V155H445V217"/><path class="line green-line" d="M920 103V164H935V217"/>
      </g>
      <g class="dim" data-group="encode">
        <text x="15" y="254" class="small ink">Node features</text><text x="48" y="279" class="math ink">h⁽⁰⁾</text>
        <text x="15" y="348" class="small ink">Edge features</text><text x="48" y="373" class="math ink">e⁽⁰⁾</text>
        <path class="line" d="M92 280H125"/><path class="line" d="M92 370H125"/>
        <rect x="125" y="221" width="157" height="186" fill="#f1f7fc" stroke="#a2bfdb" stroke-dasharray="5 4"/>
        <text x="202" y="245" text-anchor="middle" class="small ink">Encoders</text>
        <path d="M140 258L263 267L263 304L140 314Z" fill="#d9e9f7" stroke="#6b9ac8" stroke-width="1.4"/><text x="201" y="291" text-anchor="middle" class="small ink">Node MLP</text>
        <path d="M140 343L263 352L263 389L140 399Z" fill="#fae5d5" stroke="#e4a172" stroke-width="1.4"/><text x="201" y="376" text-anchor="middle" class="small ink">Edge MLP</text>
        <path class="line" d="M282 280H342"/><path class="line" d="M282 370H322V326H342"/>
      </g>
      <g class="dim" data-group="fine">
        <rect x="342" y="217" width="282" height="162" fill="#fff5ec" stroke="#eca26d" stroke-width="1.4" stroke-dasharray="5 4"/>
        <text x="483" y="243" text-anchor="middle" class="label ink">Fine GMBs ×8</text>
        <rect x="359" y="265" width="62" height="86" fill="#fff" stroke="#e5a16e"/><text x="390" y="313" text-anchor="middle" class="small ink">GMB₁</text>
        <g class="clickable" role="button" tabindex="0" aria-label="Expand fine GMB 2" data-open="gmb"><rect class="click-border" x="440" y="265" width="62" height="86" fill="#fff" stroke="#e5a16e" stroke-width="1.6"/><text x="471" y="308" text-anchor="middle" class="small ink">GMB₂</text><text x="471" y="333" text-anchor="middle" class="tiny muted">↗</text></g>
        <path class="line" d="M421 308H439"/><path class="line" d="M503 308H524"/><text x="534" y="313" class="small ink">···</text>
        <rect x="557" y="265" width="52" height="86" fill="#fff" stroke="#e5a16e"/><text x="583" y="313" text-anchor="middle" class="small ink">GMB₈</text>
      </g>
      <g class="dim" data-group="coarse">
        <path class="line" d="M624 295H657"/>
        <rect x="657" y="251" width="105" height="94" fill="#f1eaf8" stroke="#ae93c9" stroke-width="1.4"/><text x="709" y="279" text-anchor="middle" class="small ink">Graph mean</text><text x="709" y="301" text-anchor="middle" class="small ink">pooling</text><text x="709" y="327" text-anchor="middle" class="tiny muted">pool_map</text>
        <path class="line purple-line" d="M762 295H803"/>
        <rect x="803" y="217" width="264" height="162" fill="#f0f7fe" stroke="#77a9d8" stroke-width="1.4" stroke-dasharray="5 4"/>
        <text x="935" y="243" text-anchor="middle" class="label ink">Coarse GMBs ×2</text>
        <rect x="823" y="265" width="89" height="86" fill="#fff" stroke="#77a9d8"/><text x="867" y="313" text-anchor="middle" class="small ink">GMB₁</text><path class="line" d="M912 308H956"/>
        <rect x="957" y="265" width="89" height="86" fill="#fff" stroke="#77a9d8"/><text x="1001" y="313" text-anchor="middle" class="small ink">GMB₂</text>
        <text x="754" y="440" class="math ink">e<tspan baseline-shift="sub" font-size="11">c</tspan>⁽⁰⁾</text><path class="line" d="M800 434H823"/><rect x="823" y="414" width="191" height="40" fill="#fff5ec" stroke="#e5b08a"/><text x="919" y="439" text-anchor="middle" class="small ink">Coarse edge encoder</text><path class="line" d="M919 414V380"/>
      </g>
      <g class="dim" data-group="fusion">
        <path class="line" d="M1067 295H1102"/><rect x="1102" y="251" width="106" height="94" fill="#f1eaf8" stroke="#ae93c9" stroke-width="1.4"/><text x="1155" y="278" text-anchor="middle" class="small ink">Unpool</text><text x="1155" y="302" text-anchor="middle" class="small ink">to fine nodes</text><text x="1155" y="328" text-anchor="middle" class="tiny muted">H[pool_map]</text>
        <path class="line purple-line" d="M1208 295H1252"/>
        <path class="line" d="M639 295V487H1228V307H1252"/><text x="940" y="510" text-anchor="middle" class="small muted">Fine-feature skip connection</text>
        <rect x="1252" y="217" width="159" height="190" fill="#f2f7fc" stroke="#8eb3d6" stroke-dasharray="5 4"/><text x="1331" y="244" text-anchor="middle" class="small ink">Concatenate</text><text x="1331" y="272" text-anchor="middle" class="tiny ink">[fine, unpooled]</text>
        <rect x="1270" y="314" width="123" height="62" fill="#dceaf7" stroke="#7a9dbc"/><text x="1331" y="350" text-anchor="middle" class="small ink">Fusion MLP</text><path class="line" d="M1331 279V313"/>
        <path class="line" d="M1411 346H1444"/>
      </g>
      <text x="18" y="484" class="tiny muted">Learned features change; graph connectivity stays fixed.</text>`);
    const unbind=clickable(svg,onOpen);
    return {setStep(step){const key=['all','fine','coarse','fusion','condition'][step]||'all';for(const g of svg.querySelectorAll('[data-group]'))g.classList.toggle('active',key==='all'||g.dataset.group===key||(key==='fine'&&g.dataset.group==='encode'));svg.dataset.step=String(step);},dispose(){unbind();svg.remove();}};
  }
  root.NetworkMethod={mount:networkMount};root.MultiscaleProcessor={mount:processorMount};
})(window);

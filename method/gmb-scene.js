/* Source-aligned EdgeAwareBlock illustration; no model execution. */
(function(root){
  'use strict';
  const NS='http://www.w3.org/2000/svg';let serial=0,active=null;
  const descriptions=[
    'A representative graph message-passing block between GMB 1 and GMB 3. Edge update, incoming-edge mean aggregation, residual node update and node-only FiLM use fixed graph connectivity.',
    'Edge update: concatenate sender and receiver node features with the current edge feature, apply an edge MLP, add the edge residual, then LayerNorm, SiLU and dropout.',
    'Mean aggregation collects the updated features of incoming edges at each destination node.',
    'Node update: concatenate the current node and its aggregated message, apply a node MLP, add the node residual and apply LayerNorm.',
    'A separate block-specific generator turns the global descriptor into gamma and beta. FiLM modulates the normalized node update, then SiLU and dropout produce the next node features. Edge features bypass FiLM.'
  ];
  function mount(host){
    if(typeof host==='string')host=document.querySelector(host);
    if(!host)throw Error('GMBScene.mount needs a host');
    const id='gmb-detail-'+(++serial),arrow=id+'-arrow',greenArrow=id+'-green';
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox','0 0 1400 510');svg.setAttribute('role','img');svg.setAttribute('class','gmb-scene');svg.setAttribute('id',id);
    svg.setAttribute('aria-labelledby',id+'-title '+id+'-desc');svg.style.cssText='width:100%;height:100%;display:block;overflow:visible';
    const bar=(x,y,color,w=50,h=16)=>`<g class="feature-bar"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="${color}" stroke-width="1.2"/>${Array.from({length:6},(_,i)=>`<path d="M${x+(i+1)*w/7} ${y+1}V${y+h-1}" stroke="white" stroke-opacity=".65" stroke-width="1"/>`).join('')}</g>`;
    const op=(x,y,w,label)=>`<g><rect x="${x}" y="${y}" width="${w}" height="32" rx="2" fill="#fff" stroke="#8e99a4" stroke-width="1.3"/><text x="${x+w/2}" y="${y+21}" text-anchor="middle" class="operator">${label}</text></g>`;
    const plus=(x,y)=>`<g><circle cx="${x}" cy="${y}" r="16" fill="#fff" stroke="#253342" stroke-width="1.6"/><path d="M${x-10} ${y}H${x+10}M${x} ${y-10}V${y+10}" stroke="#253342" stroke-width="1.5"/></g>`;
    const concat=(x,y)=>`<g><circle cx="${x}" cy="${y}" r="16" fill="#fff" stroke="#253342" stroke-width="1.6"/><text x="${x}" y="${y+6}" text-anchor="middle" class="concat">C</text></g>`;
    const link=d=>`<path d="${d}" class="link" marker-end="url(#${arrow})"/>`;
    svg.innerHTML=`
      <title id="${id}-title">Graph message-passing block GMB 2</title><desc id="${id}-desc"></desc>
      <defs><marker id="${arrow}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9" fill="#253342"/></marker><marker id="${greenArrow}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9" fill="#39873b"/></marker></defs>
      <style>
        #${id}{font-family:Arial,Helvetica,sans-serif;color:#142131}
        #${id} .title{font-size:21px;font-weight:600;fill:#142131}
        #${id} .label{font-size:16px;fill:#526174}
        #${id} .math{font-family:Georgia,'Times New Roman',serif;font-size:20px;font-style:italic;fill:#142131}
        #${id} .operator{font-size:15px;fill:#263747}
        #${id} .concat{font-family:Georgia,serif;font-size:21px;fill:#263747}
        #${id} .section-title{font-size:17px;font-weight:600;fill:#263747}
        #${id} .small{font-size:12px;fill:#657181}
        #${id} .link,#${id} .wire{fill:none;stroke:#253342;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
        #${id} .stage{opacity:1;transition:opacity .3s ease}
        #${id}[data-step="1"] .stage:not(.edge-stage),#${id}[data-step="2"] .stage:not(.mean-stage),#${id}[data-step="3"] .stage:not(.node-stage),#${id}[data-step="4"] .stage:not(.film-stage){opacity:.22}
        #${id} .surrounding{opacity:.78}
        #${id} .step-wash{fill-opacity:.5;stroke-width:1.3;stroke-dasharray:6 4}
        #${id}[data-step="1"] .edge-stage .step-wash,#${id}[data-step="2"] .mean-stage .step-wash,#${id}[data-step="3"] .node-stage .step-wash,#${id}[data-step="4"] .film-stage .step-wash{fill-opacity:1;stroke-width:2}
        @media(prefers-reduced-motion:reduce){#${id} .stage{transition:none}}
      </style>
      <rect x="224" y="112" width="1000" height="338" rx="4" fill="#fff" stroke="#dba572" stroke-width="1.2" stroke-dasharray="7 5"/>
      <text x="240" y="132" class="title">GMB₂</text><text x="1204" y="132" text-anchor="end" class="small">Independent block parameters · fixed edge_index</text>

      <g class="surrounding">
        <rect x="22" y="211" width="122" height="154" rx="3" fill="#f8f3ed" stroke="#d5a579" stroke-width="1.5"/>
        <text x="83" y="273" text-anchor="middle" class="title">GMB₁</text><text x="83" y="298" text-anchor="middle" class="small">same structure</text>
        <path d="M1 287H22" class="link" marker-end="url(#${arrow})"/>
        ${link('M144 287H224')}<text x="184" y="272" text-anchor="middle" class="math">(h, e)</text><text x="184" y="308" text-anchor="middle" class="small">edge_index</text>
        <rect x="1256" y="211" width="122" height="190" rx="3" fill="#f8f3ed" stroke="#d5a579" stroke-width="1.5"/>
        <text x="1317" y="285" text-anchor="middle" class="title">GMB₃</text><text x="1317" y="310" text-anchor="middle" class="small">same structure</text>
        ${link('M1378 306H1398')}
      </g>

      <g class="stage edge-stage">
        <rect class="step-wash" x="239" y="142" width="770" height="125" rx="2" fill="#fff2e7" stroke="#e5ad78"/>
        <text x="410" y="164" class="section-title">1 · Edge update</text>
        <text x="247" y="180" class="math">hⱼ</text>${bar(278,165,'#83b9de')}
        <text x="247" y="208" class="math">hᵢ</text>${bar(278,193,'#83b9de')}
        <text x="240" y="236" class="math">eⱼᵢ</text>${bar(278,221,'#efad77')}
        ${link('M328 173H340L353 193')}${link('M328 201H351')}${link('M328 229H340L353 211')}
        ${concat(368,202)}${link('M384 202H409')}
        <path d="M411 180L505 188V216L411 224Z" fill="#ffe8d3" stroke="#dc9658" stroke-width="1.6"/><text x="457" y="208" text-anchor="middle" class="math">MLPₑ</text>
        ${link('M505 202H548')}${bar(550,194,'#efad77')}<text x="575" y="180" text-anchor="middle" class="math">δeⱼᵢ</text>
        ${link('M600 202H613')}${plus(630,202)}
        <path d="M328 229H334V251H630V219" class="link" marker-end="url(#${arrow})"/><text x="481" y="247" class="math" style="font-size:15px">eⱼᵢ</text>
        ${link('M646 202H679')}${op(680,186,48,'LN')}${link('M728 202H764')}${op(765,186,56,'SiLU')}${link('M821 202H849')}${op(850,186,38,'D')}
        ${link('M888 202H929')}${bar(930,194,'#efad77',56)}<text x="958" y="180" text-anchor="middle" class="math">e′ⱼᵢ</text>
        ${link('M986 202H1220V253H1255')}<text x="1190" y="191" class="math">e′</text><text x="1192" y="218" class="small">E × d</text>
      </g>

      <g class="stage mean-stage">
        <text x="1097" y="248" text-anchor="middle" class="section-title">2 · Mean aggregation</text>
        <rect class="step-wash" x="1012" y="267" width="173" height="40" rx="2" fill="#f0e8fa" stroke="#b792d7"/>
        <text x="1098" y="293" text-anchor="middle" class="math" style="font-style:normal">Mean</text>
        <text x="1098" y="261" text-anchor="middle" class="small">incoming edges j → i</text>
        <path d="M999 202V287H1010" class="link" marker-end="url(#${arrow})"/><circle cx="999" cy="202" r="2.7" fill="#253342"/>
        <path d="M1185 287H1205V316H310V343" class="link" marker-end="url(#${arrow})"/>
        ${bar(285,344,'#b59cdb')}<text x="247" y="359" class="math">mᵢ</text>${link('M310 360H338L354 373')}
      </g>

      <g class="stage node-stage">
        <rect class="step-wash" x="239" y="335" width="499" height="106" rx="2" fill="#eaf4fc" stroke="#91bddb"/>
        <text x="245" y="330" class="section-title">3 · Node update</text>
        <text x="247" y="388" class="math">hᵢ</text>${bar(278,374,'#83b9de')}${link('M328 382H351')}
        ${concat(368,382)}${link('M384 382H409')}
        <path d="M411 360L505 368V396L411 404Z" fill="#d9edfc" stroke="#6b9fc7" stroke-width="1.6"/><text x="457" y="388" text-anchor="middle" class="math">MLPₕ</text>
        ${link('M505 382H548')}${bar(550,374,'#83b9de')}<text x="575" y="362" text-anchor="middle" class="math">δhᵢ</text>
        ${link('M600 382H613')}${plus(630,382)}
        <path d="M334 382V421H630V399" class="link" marker-end="url(#${arrow})"/><circle cx="334" cy="382" r="2.7" fill="#253342"/><text x="481" y="417" class="math" style="font-size:15px">hᵢ</text>
        ${link('M646 382H679')}${op(680,366,48,'LN')}${link('M728 382H774')}<text x="749" y="366" class="math" style="font-size:17px">uᵢ</text>
      </g>

      <g class="stage film-stage">
        <rect class="step-wash" x="565" y="17" width="454" height="84" rx="3" fill="#edf6e8" stroke="#91bd7b"/>
        <text x="612" y="40" text-anchor="middle" class="label">Global g</text>${bar(587,54,'#83b9de',50,17)}
        <path d="M637 63H699" fill="none" stroke="#39873b" stroke-width="1.8" marker-end="url(#${greenArrow})"/>
        <path d="M701 32L825 40V84L701 92Z" fill="#e0f0d5" stroke="#6aa04f" stroke-width="1.5"/>
        <text x="761" y="55" text-anchor="middle" class="operator" style="font-weight:600">FiLM generator</text><text x="761" y="77" text-anchor="middle" class="operator">MLP</text>
        <path d="M825 63H879" fill="none" stroke="#39873b" stroke-width="1.8" marker-end="url(#${greenArrow})"/>
        ${bar(880,55,'#91c99a',51,17)}<text x="905" y="44" text-anchor="middle" class="math">γ, β</text><text x="954" y="58" class="small">block-</text><text x="954" y="75" class="small">specific</text>
        <path d="M931 63H1008V111H832V354" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>
        <path d="M931 63H1008V111H832V354" fill="none" stroke="#39873b" stroke-width="1.8" stroke-linejoin="round" marker-end="url(#${greenArrow})"/>
        <text x="900" y="340" class="section-title">4 · Node-only FiLM</text>
        <rect class="step-wash" x="775" y="356" width="115" height="52" rx="2" fill="#e6f3dd" stroke="#79aa60"/>
        <text x="832" y="376" text-anchor="middle" class="operator" style="font-weight:600">FiLM</text><text x="832" y="398" text-anchor="middle" class="math">γ ⊙ uᵢ + β</text>
        ${link('M890 382H939')}${op(940,366,56,'SiLU')}${link('M996 382H1029')}${op(1030,366,38,'D')}${link('M1068 382H1109')}${bar(1110,374,'#83b9de',56)}
        <text x="1137" y="361" text-anchor="middle" class="math">h′ᵢ</text>${link('M1166 382H1255')}<text x="1202" y="372" class="small">N × d</text>
      </g>

      <g aria-hidden="true"><path d="M24 470H1378" stroke="#e0e6eb"/>
        ${bar(30,484,'#83b9de',32,12)}<text x="69" y="495" class="small">node features</text>
        ${bar(173,484,'#efad77',32,12)}<text x="212" y="495" class="small">edge features</text>
        ${bar(316,484,'#b59cdb',32,12)}<text x="355" y="495" class="small">aggregated message</text>
        <text x="505" y="495" class="small">C: concatenate · ⊕: residual addition · LN: LayerNorm</text>
        <text x="838" y="495" class="small">MLP: Linear → SiLU → D → Linear</text>
        <text x="1120" y="495" class="small">D: dropout (p = 0 here)</text>
      </g>`;
    host.replaceChildren(svg);let disposed=false;
    const controller={host,setStep(value){if(disposed)return;const step=Math.max(0,Math.min(4,Math.round(Number(value)||0)));svg.dataset.step=String(step);host.dataset.gmbStep=String(step);svg.querySelector('desc').textContent=descriptions[step];return step;},dispose(){if(disposed)return;disposed=true;svg.remove();delete host.dataset.gmbStep;if(active===controller)active=null;}};
    active=controller;controller.setStep(0);return controller;
  }
  root.GMBScene={mount,setStep(value){return active?.setStep(value);},dispose(){active?.dispose();}};
})(window);

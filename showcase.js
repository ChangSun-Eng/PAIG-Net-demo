/* Offline view of the stored Abaqus / PAIG-Net comparisons. */
(() => {
  "use strict";

  const byId = id => document.getElementById(id);

  const figures = {
    1: {
      name: "Overall architecture",
      alt: "Shared graph inputs enter separate thermal and mechanical graph processors. The thermal features condition mechanical prediction.",
      links: [
        [2, 0, 22, 19, 55],
        [3, 21.2, 10.5, 26.3, 30.5],
        [3, 21.2, 68.5, 26.3, 30.5]
      ]
    },
    2: {
      name: "Graph representation and input features",
      alt: "The computational mesh defines a local neighbourhood, node and edge features, and global process and geometric descriptors."
    },
    3: {
      name: "Multiscale graph processor",
      alt: "Eight fine graph message blocks feed mean pooling, two coarse blocks and unpooling. The fine and coarse representations are fused.",
      links: [[4, 19.6, 0.6, 22.8, 65.5], [4, 53.5, 0.6, 12.4, 65.5]]
    },
    4: {
      name: "Edge and node updates in a graph message block",
      alt: "An edge update precedes neighbourhood aggregation and the process-conditioned node update."
    },
    5: { name: "Paired representation exchange" },
    16: { name: "Process-induced change in von Mises stress" }
  };

  let figureId = 1;
  const figurePath = (id, type) => "figures/fig" + String(id).padStart(2, "0") + "." + type;

  function selectFigure(id, focusButton = false) {
    const figure = figures[id];
    figureId = id;
    const graphic = byId("archImage");
    graphic.src = figurePath(id, "png");
    graphic.alt = figure.alt;
    byId("figureNumber").textContent = "Fig. " + id;
    byId("figureName").textContent = figure.name;
    byId("archZoom").href = graphic.src;
    byId("archPdf").href = figurePath(id, "pdf");
    for (const button of byId("figurePicker").querySelectorAll("button")) {
      const selected = Number(button.dataset.fig) === id;
      button.setAttribute("aria-pressed", String(selected));
      if (selected && focusButton) button.focus({preventScroll:true});
    }
    const hotspots = byId("hotspots");
    hotspots.replaceChildren();
    for (const [target, left, top, width, height] of figure.links || []) {
      const hotspot = document.createElement("button");
      hotspot.type = "button";
      hotspot.className = "hotspot";
      hotspot.style.left = left + "%";
      hotspot.style.top = top + "%";
      hotspot.style.width = width + "%";
      hotspot.style.height = height + "%";
      hotspot.title = "Open Fig. " + target + " · " + figures[target].name;
      hotspot.setAttribute("aria-label", hotspot.title);
      hotspot.addEventListener("click", () => selectFigure(target, true));
      hotspots.append(hotspot);
    }
  }

  byId("figurePicker").addEventListener("click", event => {
    const button = event.target.closest("button[data-fig]");
    if (button) selectFigure(Number(button.dataset.fig));
  });
  selectFigure(1);

  const dialog = byId("lightbox");
  for (const link of document.querySelectorAll("[data-zoom]")) {
    link.addEventListener("click", event => {
      if (!dialog.showModal || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      const id = {architecture:figureId, exchange:5, response:16}[link.dataset.zoom];
      const title = "Fig. " + id + " · " + figures[id].name;
      byId("lightboxTitle").textContent = title;
      byId("largeFigure").src = figurePath(id, "png");
      byId("largeFigure").alt = figures[id].alt || title;
      byId("originalFigure").href = byId("largeFigure").src;
      dialog.showModal();
    });
  }
  byId("closeLightbox").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });

  // The processor and GMB scenes are reused from the group-meeting presentation.
  // Paper Fig. 2 supplies the graph-input view without shipping any raw mesh.
  const walkthrough = byId("walkthrough");
  const stack = [];
  let scene;
  const walkViews = {
    network: {
      title:"Prediction architecture", tabs:["Inputs","Thermal","Mechanics","Stress"],
      hints:["Select Graph inputs to inspect the mesh and descriptors.",
        "Select the thermal processor to inspect its fine and coarse graphs.",
        "Learned features and predicted temperature condition the mechanical pathway.",
        "Von Mises stress follows from the stress reconstructed using predicted elastic strain."]
    },
    graph:{
      title:"Graph inputs", tabs:["Mesh and features"],
      hints:["The mesh defines nodes and directed edges. Process and geometry descriptors supply graph-level context."]
    },
    processor:{
      title:"Multiscale graph processor", tabs:["Overview","Fine","Coarse","Fusion","FiLM"],
      hints:["Thermal and mechanical pathways have independent processor weights.",
        "Select GMB₂ for an expanded view of the second fine message block.",
        "Fine-node features are pooled onto the coarse graph.",
        "The unpooled and fine features are concatenated and fused.",
        "Global descriptors supply block-specific feature modulation."]
    },
    gmb:{
      title:"Graph message block", tabs:["Overview","Edge update","Aggregation","Node update","FiLM"],
      hints:["Edges update before nodes in each message block.",
        "Sender, receiver and edge features enter the residual edge update.",
        "Updated incoming edge features are averaged at the receiver.",
        "Each node combines its representation with the aggregated message.",
        "Global descriptors modulate the node features before activation. Dropout is disabled in the reported model."]
    }
  };

  function walkTo(view, context) {
    stack.push({view, context, step:0});
    renderWalkView();
  }

  function renderWalkView() {
    const current = stack[stack.length - 1];
    const spec = walkViews[current.view];
    const host = byId("walkGraphic");
    scene?.dispose();
    scene = null;
    host.replaceChildren();
    if (current.view === "network") scene = window.NetworkMethod.mount(host, (v,o) => walkTo(v,o.context));
    if (current.view === "processor") scene = window.MultiscaleProcessor.mount(host, v => walkTo(v,current.context));
    if (current.view === "gmb") scene = window.GMBScene.mount(host);
    if (current.view === "graph") {
      const graph = new Image();
      graph.src = figurePath(2,"png");
      graph.alt = figures[2].alt;
      host.append(graph);
    }
    byId("walkBack").hidden = stack.length < 2;
    byId("walkTitle").textContent = current.context && current.view !== "graph"
      ? spec.title + " · " + current.context + " pathway" : spec.title;
    const steps = byId("walkSteps");
    steps.replaceChildren();
    function showStep(index) {
      current.step = index;
      scene?.setStep(index);
      byId("walkCaption").textContent = spec.hints[index];
      [...steps.children].forEach((btn,i) => btn.setAttribute("aria-pressed",String(i === index)));
    }
    spec.tabs.forEach((name,i) => {
      const button = document.createElement("button");
      button.textContent = name;
      button.type = "button";
      button.addEventListener("click",() => showStep(i));
      steps.append(button);
    });
    showStep(current.step);
  }
  byId("openWalkthrough").addEventListener("click",() => {
    if (!window.NetworkMethod || !window.GMBScene) return;
    stack.length = 0;
    walkTo("network");
    walkthrough.showModal();
  });
  byId("walkBack").addEventListener("click",() => {
    if (stack.length < 2) return;
    stack.pop();
    renderWalkView();
    byId("walkSteps").querySelector('[aria-pressed="true"]').focus();
  });
  byId("closeWalk").addEventListener("click",() => walkthrough.close());
  walkthrough.addEventListener("close",() => { scene?.dispose(); scene = null; });
  walkthrough.addEventListener("click", event => { if (event.target === walkthrough) walkthrough.close(); });

  const data = window.PAIG_DATA;
  const frameImage = byId("fieldFrame");
  const errorBox = byId("error");
  const slider = byId("timeline");
  const playButton = byId("play");
  let field;
  let frame = 0;
  let requestedFrame = 0;
  let requestedField;
  let requestId = 0;
  let playing = false;
  let timer = null;

  function stop() {
    playing = false;
    clearTimeout(timer);
    playButton.setAttribute("aria-pressed", "false");
    playButton.setAttribute("aria-label", "Play comparison");
    byId("playLabel").textContent = "Play";
  }

  function showError(message) {
    stop();
    errorBox.textContent = message;
    errorBox.hidden = false;
    byId("frameView").setAttribute("aria-busy", "false");
  }

  if (!data || !Array.isArray(data.fields) || !data.fields.length ||
      data.fields.some(f => !Array.isArray(f.frames) || !f.frames.length)) {
    showError("The saved field data could not be opened. Extract the complete showcase folder, including its media folder, and reopen index.html.");
    for (const el of [playButton, slider, byId("previous"), byId("next")]) el.disabled = true;
    return;
  }

  const condition = [];
  if (Number.isFinite(data.powerW)) condition.push(data.powerW.toFixed(1) + " W");
  if (Number.isFinite(data.speedMmPerS)) condition.push(data.speedMmPerS.toFixed(1) + " mm/s");
  byId("caseLabel").textContent = [data.caseLabel, ...condition].filter(Boolean).join(" · ");
  byId("provenance").textContent = [data.provenance, data.sourceNote, data.view].filter(Boolean).join(" ");

  const fields = new Map(data.fields.map(f => [f.id, f]));
  for (const entry of data.fields) {
    const button = document.createElement("button");
    button.dataset.field = entry.id;
    button.type = "button";
    button.textContent = entry.label;
    button.setAttribute("aria-pressed", "false");
    byId("field").append(button);
  }

  // Resolve both sides of a comparison as a single image before advancing its clock.
  function loadPicture(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function nearestProgress(frames, pct) {
    let nearest = 0;
    for (let i = 1; i < frames.length; i++) {
      if (Math.abs(frames[i].pct - pct) < Math.abs(frames[nearest].pct - pct)) nearest = i;
    }
    return nearest;
  }

  function formatSeconds(t) {
    return Number(t).toLocaleString("en-US", {maximumFractionDigits:4, minimumFractionDigits:2});
  }

  function queueNext() {
    clearTimeout(timer);
    if (!playing) return;
    const frames = field.frames;
    let wait = 500;
    if (frame < frames.length - 1) {
      const span = frames[frames.length - 1].time - frames[0].time;
      const delta = Math.max(0, frames[frame + 1].time - frames[frame].time);
      wait = span > 0 ? Math.max(65, 10000 * delta / span) : 100;
    }
    timer = setTimeout(() => renderFrame(field, (frame + 1) % frames.length), wait);
  }

  async function renderFrame(newField, index) {
    clearTimeout(timer);
    const token = ++requestId;
    const selected = Math.max(0, Math.min(index, newField.frames.length - 1));
    requestedField = newField;
    requestedFrame = selected;
    const sample = newField.frames[selected];
    byId("frameView").setAttribute("aria-busy", "true");
    try {
      const picture = await loadPicture(sample.src);
      if (token !== requestId) return;
      field = newField;
      frame = selected;
      for (const btn of byId("field").querySelectorAll("button")) {
        btn.setAttribute("aria-pressed", String(btn.dataset.field === field.id));
      }
      errorBox.hidden = true;
      frameImage.alt = field.label + " at " + formatSeconds(sample.time) +
        " seconds, Abaqus finite-element field on the left and PAIG-Net prediction on the right, on a shared scale in " + field.unit + ".";
      frameImage.src = picture.src;
      frameImage.hidden = false;
      byId("openFrame").href = picture.src;
      byId("openFrame").title = "Open the original " + picture.naturalWidth + " × " + picture.naturalHeight + " pixel comparison";
      byId("openFrame").hidden = false;
      byId("orbitLink").href = "orbit/index.html?" + new URLSearchParams({
        field:field.id, record:String(sample.recordIndex ?? frame + 1)
      });
      byId("orbitLink").hidden = false;
      byId("time").textContent = (field.clock ? field.clock + " time · " : "") + formatSeconds(sample.time) + " s";
      const percent = Number(sample.pct).toFixed(1) + "%";
      byId("frameText").textContent = "Frame " + (sample.recordIndex ?? frame + 1) +
        " / " + field.frames.length + " · " + percent;
      slider.max = String(field.frames.length - 1);
      slider.value = String(frame);
      slider.setAttribute("aria-valuetext", "Frame " + (frame + 1) + ", " + formatSeconds(sample.time) + " seconds, " + percent);
      byId("previous").disabled = frame === 0;
      byId("next").disabled = frame === field.frames.length - 1;
      byId("fieldNote").textContent = field.note || "";
      byId("frameView").setAttribute("aria-busy", "false");
      queueNext();
    } catch {
      if (token === requestId) {
        requestedField = field;
        requestedFrame = frame;
        if (field) slider.value = String(frame);
        showError("This stored frame could not be opened. Check that the complete media folder is present.");
      }
    }
  }

  byId("field").addEventListener("click", event => {
    const button = event.target.closest("button[data-field]");
    if (!button) return;
    const nextField = fields.get(button.dataset.field);
    const pct = field ? field.frames[frame].pct : 50;
    renderFrame(nextField, nearestProgress(nextField.frames, pct));
  });
  slider.addEventListener("input", () => {
    if (!requestedField) return;
    stop();
    renderFrame(requestedField, Number(slider.value));
  });
  for (const [id, offset] of [["previous", -1], ["next", 1]]) {
    byId(id).addEventListener("click", () => {
      if (!requestedField) return;
      stop();
      renderFrame(requestedField, requestedFrame + offset);
    });
  }
  playButton.addEventListener("click", () => {
    if (!field) return;
    if (playing) { stop(); return; }
    playing = true;
    playButton.setAttribute("aria-pressed", "true");
    playButton.setAttribute("aria-label", "Pause comparison");
    byId("playLabel").textContent = "Pause";
    renderFrame(field, frame === field.frames.length - 1 ? 0 : frame + 1);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  window.addEventListener("pagehide", stop);
  const query = new URLSearchParams(location.search);
  const initial = fields.get(query.get("field")) || data.fields[0];
  const specified = Number(query.get("record"));
  const startRecord = Number.isInteger(specified) && specified > 0 ? specified : 60;
  renderFrame(initial, Math.min(startRecord,initial.frames.length) - 1);
})();

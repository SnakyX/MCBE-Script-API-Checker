require.config({ paths: { vs: "https://unpkg.com/monaco-editor@0.45.0/min/vs" } });

/* =========================
   LOADING SCREEN
========================= */
const bootStatus = document.getElementById("boot-status");
const progressFill = document.getElementById("progress-fill");

function setProgress(value, text) {
  if(progressFill) progressFill.style.width = value + "%";
  if(bootStatus && text) bootStatus.innerText = text;
}

function hideLoading() {
  const screen = document.getElementById("loading-screen");
  if(screen){
    screen.style.opacity="0";
    setTimeout(()=>screen.remove(),500);
  }
}

/* =========================
   MONACO EDITOR INIT
========================= */
require(["vs/editor/editor.main"], async function(){
  setProgress(10, "Loading Monaco Editor...");

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions:true,
    allowSyntheticDefaultImports:true,
    esModuleInterop:true,
    strict:false,
    noUnusedLocals:false,
    noUnusedParameters:false,
    noEmit:true
  });

  setProgress(30, "Loading Minecraft API typings...");
  const packages = ["@minecraft/server","@minecraft/server-ui","@minecraft/common","@minecraft/server-gametest"];
  for(const pkg of packages){
    const res = await fetch(`https://unpkg.com/${pkg}@latest/index.d.ts`);
    if(res.ok){
      const text = await res.text();
      const wrapped = `declare module "${pkg}" {\n${text}\n}`;
      monaco.languages.typescript.typescriptDefaults.addExtraLib(wrapped, `ts:filename/${pkg.replace("/","_")}.d.ts`);
    }
  }

  setProgress(70,"Starting editor...");
  window.editor = monaco.editor.create(document.getElementById("editor"),{
    value:`import { world } from "@minecraft/server";\nworld.afterEvents.playerSpawn.subscribe(ev => {\nev.player.sendMessage("@snakyxy")\n});`,
    language:"typescript",
    theme:"vs-dark",
    automaticLayout:true,
    minimap:{enabled:true},
    fontSize:14
  });

  setProgress(100,"Ready");
  setTimeout(hideLoading,400);
});

/* =========================
   DIAGNOSIS
========================= */
async function runDiagnosis(){
  const model = editor.getModel();
  const errorDiv = document.getElementById("errors");
  if(!model || !errorDiv) return;
  errorDiv.innerHTML="⏳ Running diagnosis...";
  await monaco.languages.typescript.getTypeScriptWorker()
    .then(worker => worker(model.uri))
    .then(client => client.getSemanticDiagnostics(model.uri.toString()));

  const markers = monaco.editor.getModelMarkers({resource:model.uri});
  const realErrors = markers.filter(m=>m.severity===monaco.MarkerSeverity.Error);
  errorDiv.innerHTML="";
  if(realErrors.length===0){
    const div=document.createElement("div");
    div.className="success";
    div.innerText="✅ No Script API errors detected.";
    errorDiv.appendChild(div);
    return;
  }
  realErrors.forEach(m=>{
    const div=document.createElement("div");
    div.className="error";
    div.innerText=`[Line ${m.startLineNumber}] ${m.message}`;
    errorDiv.appendChild(div);
  });
}

/* =========================
   TOOLBAR FUNCTIONS
========================= */
function loadExample(){
  editor.setValue(`import { world, system } from "@minecraft/server";\nsystem.runInterval(()=>{\nworld.sendMessage("Tick running...");\n},20);`);
}

function clearEditor(){ editor.setValue(""); }

function handleFileUpload(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=> editor.setValue(e.target.result);
  reader.readAsText(file);
}

function downloadScript(){
  const blob = new Blob([editor.getValue()], {type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="script.ts"; a.click();
  URL.revokeObjectURL(url);
}

window.editor = monaco.editor.create(document.getElementById("editor"), {
  value: "...",
  language: "typescript",
  theme: "vs-dark",
  automaticLayout: true, // 🔥 wajib
  minimap: { enabled: false }, // minimap tidak cocok di mobile
});

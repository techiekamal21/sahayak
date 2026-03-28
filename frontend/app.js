/**
 * SAHAYAK — AI Caregiver Co-pilot Demo
 * Simulated emergency analysis with realistic Gemini-style responses
 */

const SCENARIOS = {
  cardiac: {
    lang: "🇮🇳 Hindi",
    transcript: '"Namaste, meri maa ko bahut seene mein dard ho raha hai aur haath mein bhi dard hai. Woh paseene mein bhi hain. Kya karein?"',
    transcriptEn: '"My mother is having severe chest pain and arm pain. She is also sweating heavily. What should we do?"',
    vitals: { hr: "115 bpm", spo2: "94%", temp: "37.8°C" },
    result: {
      triage: "CRITICAL",
      triageClass: "",
      fhir: "Hospital notified via FHIR R4 ✓",
      icon: "🚨",
      drugFlags: { show: true, text: "Aspirin — Patient already on daily aspirin 75mg. Do NOT give additional aspirin. Risk of double-dosing." },
      steps: [
        { num: 1, text: "Call 108 immediately. Tell the operator: 'My elderly mother has severe chest pain radiating to her arm with heavy sweating.' Stay on the line.", caution: null },
        { num: 2, text: "Help her sit upright — lean slightly forward if it helps breathing. Do NOT lie her flat.", caution: "Do not move her unnecessarily" },
        { num: 3, text: "Loosen any tight clothing around chest and neck. Open windows for fresh air.", caution: null },
        { num: 4, text: "Do NOT give any aspirin or medication — she is already on daily aspirin 75mg.", caution: "Do not double her aspirin dose" },
        { num: 5, text: "Keep her calm and still. Note the time symptoms started — tell this to the ambulance crew.", caution: null },
      ],
      brief: "72F known CAD, HTN, T2DM. Active medications: metoprolol 25mg BD, metformin 500mg BD, aspirin 75mg OD, atorvastatin 20mg ON. ALLERGY: Penicillin (anaphylaxis). Presenting with acute chest pain radiating to left arm with diaphoresis × 20min. Suspected STEMI. Ambulance dispatched via 108.",
      time: "2.3s", lang: "Hindi (hi)", confidence: "88%",
    },
  },
  bp: {
    lang: "🇮🇳 Hindi",
    transcript: '"Papa ka BP bahut badh gaya hai, unke sar mein bahut dard ho raha hai aur thoda chakkar bhi aa raha hai."',
    transcriptEn: '"Father\'s blood pressure has gone up very high, he has a severe headache and slight dizziness."',
    vitals: { hr: "88 bpm", spo2: "97%", temp: "37.1°C" },
    result: {
      triage: "URGENT",
      triageClass: "triage-banner--urgent",
      fhir: "Monitoring — FHIR ready if escalated",
      icon: "⚠️",
      drugFlags: { show: true, text: "Metoprolol 25mg — Patient already on this for BP. Confirm last dose time. Do not give extra dose." },
      steps: [
        { num: 1, text: "Have him sit in a quiet, comfortable chair. Do not let him walk around or exert himself.", caution: null },
        { num: 2, text: "If BP reading is above 180/120, call 108 immediately. This is a hypertensive emergency.", caution: "Do not delay calling 108 if BP is extremely high" },
        { num: 3, text: "Ensure he has taken his regular metoprolol dose today. If he missed it, confirm with a doctor before giving it now.", caution: null },
        { num: 4, text: "Re-check blood pressure after 20 minutes of rest. If headache worsens or he becomes confused, call 108.", caution: null },
      ],
      brief: "72M known HTN, T2DM, CAD on metoprolol 25mg BD. Presenting with acute BP elevation, headache, and dizziness. Rule out hypertensive emergency. Needs urgent BP control assessment.",
      time: "1.9s", lang: "Hindi (hi)", confidence: "82%",
    },
  },
  fall: {
    lang: "🇮🇳 Tamil",
    transcript: '"Appa thadukki vizhhundhaar, thalai adi pattirukku, raththa varudhu. Enna panrathu?"',
    transcriptEn: '"Father tripped and fell. He hit his head and there is bleeding. What do we do?"',
    vitals: { hr: "96 bpm", spo2: "96%", temp: "36.9°C" },
    result: {
      triage: "CRITICAL",
      triageClass: "",
      fhir: "Hospital notified via FHIR R4 ✓",
      icon: "🚨",
      drugFlags: { show: true, text: "Aspirin 75mg — Patient is on daily aspirin (blood thinner). Head trauma + blood thinner = elevated bleeding risk. Inform ER immediately." },
      steps: [
        { num: 1, text: "Call 108 immediately. Tell them: 'Elderly patient on blood thinners has fallen and hit his head. There is bleeding.'", caution: null },
        { num: 2, text: "Apply gentle, steady pressure to the wound with a clean cloth. Do not press too hard.", caution: "Do not remove cloth once applied — add layers if blood soaks through" },
        { num: 3, text: "Keep him still and lying down. Do not let him stand or walk. Support his head gently.", caution: "Do not move his neck if there is any pain" },
        { num: 4, text: "Watch for danger signs: confusion, vomiting, unequal pupils, or loss of consciousness. Report these to 108.", caution: null },
      ],
      brief: "72M known CAD, HTN, T2DM on aspirin 75mg OD (antiplatelet). Fall with head trauma and active bleeding. ELEVATED BLEEDING RISK due to aspirin. Requires urgent CT head to rule out intracranial haemorrhage. ALLERGY: Penicillin (anaphylaxis).",
      time: "2.1s", lang: "Tamil (ta)", confidence: "91%",
    },
  },
  breathless: {
    lang: "🇮🇳 Kannada",
    transcript: '"Amma ge usirāṭa bahala kaṣṭa āgide, malagivāga innu hechchu āguttade. Ēnu māḍabēku?"',
    transcriptEn: '"Mother is having severe difficulty breathing, it gets worse when lying down. What should we do?"',
    vitals: { hr: "105 bpm", spo2: "91%", temp: "37.2°C" },
    result: {
      triage: "CRITICAL",
      triageClass: "",
      fhir: "Hospital notified via FHIR R4 ✓",
      icon: "🚨",
      drugFlags: { show: false, text: "" },
      steps: [
        { num: 1, text: "Call 108 immediately. Tell them: 'Elderly patient with breathing difficulty and low oxygen. She cannot lie flat.'", caution: null },
        { num: 2, text: "Sit her upright — prop her up with 2-3 pillows behind her back. Do NOT let her lie flat.", caution: "Lying flat will make breathing worse" },
        { num: 3, text: "Open all windows for fresh air. Remove any tight clothing around her chest and abdomen.", caution: null },
        { num: 4, text: "Count her breaths for 15 seconds and multiply by 4. Tell this number to the 108 operator.", caution: null },
        { num: 5, text: "If she becomes drowsy, confused, or her lips turn blue, inform 108 immediately — this is critical.", caution: "Blue lips = dangerously low oxygen" },
      ],
      brief: "72F known HTN, T2DM. Acute dyspnoea worsened by recumbency (orthopnoea). SpO2 91%, HR 105. Differential: acute heart failure exacerbation, PE, pneumonia. On metoprolol — avoid further rate control. Requires urgent CXR, BNP, ABG. ALLERGY: Penicillin.",
      time: "2.5s", lang: "Kannada (kn)", confidence: "85%",
    },
  },
};

let currentScenario = "cardiac";

// ── Scenario Selection ──────────────────────────────────────────────────────
document.querySelectorAll(".scenario-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".scenario-btn").forEach((b) => {
      b.classList.remove("scenario-btn--active");
      b.setAttribute("aria-pressed", "false");
    });
    btn.classList.add("scenario-btn--active");
    btn.setAttribute("aria-pressed", "true");

    currentScenario = btn.dataset.scenario;
    loadScenario(currentScenario);
  });
});

function loadScenario(key) {
  const s = SCENARIOS[key];
  if (!s) return;

  document.querySelector(".transcript-lang").textContent = s.lang;
  document.querySelector(".transcript-text").textContent = s.transcript;
  document.querySelector(".transcript-en").innerHTML = `<em>${s.transcriptEn}</em>`;
  document.getElementById("vital-hr").textContent = s.vitals.hr;
  document.getElementById("vital-spo2").textContent = s.vitals.spo2;
  document.getElementById("vital-temp").textContent = s.vitals.temp;

  // Reset output
  document.getElementById("output-placeholder").hidden = false;
  document.getElementById("output-loading").hidden = true;
  document.getElementById("output-result").hidden = true;
}

// ── Run Analysis ─────────────────────────────────────────────────────────────
document.getElementById("run-analysis-btn").addEventListener("click", runAnalysis);
document.getElementById("panic-btn")?.addEventListener("click", () => {
  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
  setTimeout(runAnalysis, 600);
});

async function fetch_live_analysis(scenarioKey) {
  const s = SCENARIOS[scenarioKey];
  
  // Create the exact payload expected by FastAPI EmergencyRequest Pydantic Model
  const payload = {
    patient_id: "demo-patient-123",
    transcript: s.transcriptEn, // Using English or original depending on the demo text
    ocr_text: null,
    vitals_json: {
      heart_rate_bpm: parseInt(s.vitals.hr),
      spo2_percent: parseInt(s.vitals.spo2),
    }
  };

  try {
    const response = await fetch('/api/v1/emergency/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    console.log("Live Gemini Response:", data);
    
    // Map FastAPI Response to UI State
    return {
      triage: data.triage_level,
      triageClass: data.triage_level === 'CRITICAL' || data.triage_level === 'CALL_108_IMMEDIATELY' ? '' : 'triage-banner--urgent',
      fhir: data.hospital_notified ? "Hospital notified via FHIR R4 ✓" : "Monitoring — FHIR ready if escalated",
      icon: data.triage_level === 'STABLE' ? '✅' : (data.triage_level === 'CRITICAL' ? '🚨' : '⚠️'),
      drugFlags: { 
        show: data.drug_flags.length > 0, 
        text: data.drug_flags.length > 0 ? data.drug_flags.map(f => f.explanation).join('. ') : "" 
      },
      steps: data.caregiver_steps.map((step, idx) => ({
        num: idx + 1,
        text: step.instruction,
        caution: step.caution || null
      })),
      brief: data.primary_concern, // Hackathon display short concern 
      time: "Live from Gemini ⚡", 
      lang: "English (en)", 
      confidence: Math.round(data.confidence * 100) + "%"
    };

  } catch (error) {
    console.error("Live fetch failed, falling back to mock:", error);
    // Fallback to static mock if API isn't booted yet
    return SCENARIOS[scenarioKey].result;
  }
}

async function runAnalysis() {
  const btn = document.getElementById("run-analysis-btn");
  btn.disabled = true;
  document.getElementById("run-btn-text").textContent = "Analysing via Gemini 1.5...";

  // Hide placeholder, show loading
  document.getElementById("output-placeholder").hidden = true;
  document.getElementById("output-loading").hidden = false;
  document.getElementById("output-result").hidden = true;

  // Start step-by-step loading animation
  const steps = ["ls-1", "ls-2", "ls-3", "ls-4"];
  const loadingAnim = async () => {
    for (let i = 0; i < steps.length; i++) {
      await delay(400);
      document.getElementById(steps[i]).classList.add("active");
    }
  };
  loadingAnim(); // non-blocking

  // FETCH LIVE DATA FROM GEMINI API
  const liveResult = await fetch_live_analysis(currentScenario);

  // Ensure minimum loading time for visual drama
  await delay(2000);

  // Show result
  renderResult(liveResult);

  document.getElementById("output-loading").hidden = true;
  document.getElementById("output-result").hidden = false;

  // Reset button
  btn.disabled = false;
  document.getElementById("run-btn-text").textContent = "Analyse Emergency";

  // Reset loading steps
  steps.forEach((id) => document.getElementById(id).classList.remove("active"));
}

function renderResult(r) {
  const banner = document.getElementById("triage-banner");
  banner.className = "triage-banner " + (r.triageClass || "");
  document.getElementById("triage-icon").textContent = r.icon;
  document.getElementById("triage-level").textContent = r.triage;
  document.getElementById("triage-fhir").textContent = r.fhir;

  // Drug flags
  const flagsSection = document.getElementById("drug-flags-section");
  if (r.drugFlags.show) {
    flagsSection.hidden = false;
    document.getElementById("drug-flags-text").textContent = r.drugFlags.text;
  } else {
    flagsSection.hidden = true;
  }

  // Steps
  const stepsList = document.getElementById("steps-list");
  stepsList.innerHTML = "";
  r.steps.forEach((step) => {
    const li = document.createElement("li");
    let html = `<span class="step-num">${step.num}</span> ${step.text}`;
    if (step.caution) {
      html += `<br><small style="color:var(--clr-moderate);margin-left:28px;display:inline-block;margin-top:4px;">⚠ ${step.caution}</small>`;
    }
    li.innerHTML = html;
    stepsList.appendChild(li);
  });

  // Hospital brief
  document.getElementById("hospital-brief-text").textContent = r.brief;

  // Meta
  document.getElementById("response-time").textContent = r.time;
  document.getElementById("response-lang").textContent = r.lang;
  document.getElementById("response-confidence").textContent = r.confidence;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Smooth scroll for nav links ─────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute("href"));
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

// ── Intersection Observer for fade-in animations ────────────────────────────
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll(".problem-card, .pipeline__step, .gcp-card").forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(20px)";
  el.style.transition = "all 0.6s ease";
  observer.observe(el);
});

console.log("SAHAYAK — AI Caregiver Co-pilot loaded ✓");

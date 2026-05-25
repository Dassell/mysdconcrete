const SUPABASE_URL = "https://gjqukytlonkkxudnqjjo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_caa1EfHUv02ZMdrbCKmPHA_T0mRiF57";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
const CUBIC_FEET_PER_YARD = 27;
const WASTE_FACTOR = 0.10;

const form = document.getElementById('calculator-form');
const formError = document.getElementById('form-error');
const resultsPlaceholder = document.getElementById('results-placeholder');
const resultsPanel = document.getElementById('results-panel');

const cubicYardsEl = document.getElementById('cubic-yards');
const costLowEl = document.getElementById('cost-low');
const costHighEl = document.getElementById('cost-high');
const netVolumeEl = document.getElementById('net-volume');
const totalVolumeEl = document.getElementById('total-volume');
const sqFtEl = document.getElementById('sq-ft');
const breakdownMaterialEl = document.getElementById('breakdown-material');
const breakdownLaborEl = document.getElementById('breakdown-labor');
const breakdownReinforcementEl = document.getElementById('breakdown-reinforcement');
const breakdownBaseEl = document.getElementById('breakdown-base');
let pricingRules = [];
let projectTypes = [];

async function loadPricingData() {
  const { data: rules, error: rulesError } = await supabaseClient
    .from("pricing_rules")
    .select("*")
    .eq("region", "san_diego")
    .eq("is_active", true);

  if (rulesError) {
    console.error("Pricing rules error:", rulesError);
    return;
  }

  const { data: projects, error: projectsError } = await supabaseClient
    .from("project_type")
    .select("*");

  if (projectsError) {
    console.error("Project type error:", projectsError);
    return;
  }

  pricingRules = rules || [];
  projectTypes = projects || [];

  console.log("Pricing loaded", { pricingRules, projectTypes });
}

function getRule(category, itemKey) {
  return pricingRules.find(rule =>
    rule.category === category &&
    rule.item_key === itemKey
  );
}

function getNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

loadPricingData();

function getSessionId() {
  let sessionId = localStorage.getItem("session_id");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("session_id", sessionId);
  }

  return sessionId;
}

function getTrackingParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    gclid: params.get("gclid"),
    gbraid: params.get("gbraid"),
    wbraid: params.get("wbraid"),
    fbclid: params.get("fbclid"),
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
  };
}
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatVolume(yards) {
  return yards.toFixed(2);
}
function calculate(lengthFt, widthFt, thicknessIn, includeWaste) {
  const thicknessFt = thicknessIn / 12;
  const cubicFeet = lengthFt * widthFt * thicknessFt;
  const netYards = cubicFeet / CUBIC_FEET_PER_YARD;
  const totalYards = includeWaste ? netYards * (1 + WASTE_FACTOR) : netYards;
  const squareFeet = lengthFt * widthFt;

  const concreteRule = getRule("concrete_material", "psi_3000");
  const laborRule = getRule("labor_finish", "broom");
  const reinforcementRule = getRule("reinforcement", "wire_mesh");
  const basePrepRule = getRule("base_prep", "standard_base");
  const accessRule = getRule("access", "easy_access");

  if (!concreteRule || !laborRule || !reinforcementRule || !basePrepRule || !accessRule) {
    throw new Error("Pricing data is missing. Check pricing_rules table.");
  }

  const materialLow = totalYards * getNumber(concreteRule.low_value);
  const materialMedium = totalYards * getNumber(concreteRule.medium_value);
  const materialHigh = totalYards * getNumber(concreteRule.high_value);

  const laborLow = squareFeet * getNumber(laborRule.low_value);
  const laborMedium = squareFeet * getNumber(laborRule.medium_value);
  const laborHigh = squareFeet * getNumber(laborRule.high_value);

  const reinforcementLow = squareFeet * getNumber(reinforcementRule.low_value);
  const reinforcementMedium = squareFeet * getNumber(reinforcementRule.medium_value);
  const reinforcementHigh = squareFeet * getNumber(reinforcementRule.high_value);

  const baseLow = squareFeet * getNumber(basePrepRule.low_value);
  const baseMedium = squareFeet * getNumber(basePrepRule.medium_value);
  const baseHigh = squareFeet * getNumber(basePrepRule.high_value);

  const subtotalLow = materialLow + laborLow + reinforcementLow + baseLow;
  const subtotalMedium = materialMedium + laborMedium + reinforcementMedium + baseMedium;
  const subtotalHigh = materialHigh + laborHigh + reinforcementHigh + baseHigh;

  return {
    netYards,
    totalYards,
    squareFeet,

    materialLow,
    materialMedium,
    materialHigh,

    laborLow,
    laborMedium,
    laborHigh,

    reinforcementLow,
    reinforcementMedium,
    reinforcementHigh,

    baseLow,
    baseMedium,
    baseHigh,

    costLow: subtotalLow * getNumber(accessRule.low_value, 1),
    costMedium: subtotalMedium * getNumber(accessRule.medium_value, 1),
    costHigh: subtotalHigh * getNumber(accessRule.high_value, 1),
  };
}

function showError(message) {
  formError.textContent = message;
  formError.classList.remove('hidden');
}

function hideError() {
  formError.classList.add('hidden');
  formError.textContent = '';
}
function displayResults(result) {
  cubicYardsEl.textContent = formatVolume(result.totalYards);

  costLowEl.textContent = formatCurrency(result.costLow);
  costHighEl.textContent = formatCurrency(result.costHigh);

  netVolumeEl.textContent = `${formatVolume(result.netYards)} cu yd`;
  totalVolumeEl.textContent = `${formatVolume(result.totalYards)} cu yd`;

  sqFtEl.textContent = `${result.squareFeet.toFixed(1)} sq ft`;

  if (breakdownMaterialEl) {
    breakdownMaterialEl.textContent = formatCurrency(result.materialMedium);
  }

  if (breakdownLaborEl) {
    breakdownLaborEl.textContent = formatCurrency(result.laborMedium);
  }

  if (breakdownReinforcementEl) {
    breakdownReinforcementEl.textContent = formatCurrency(result.reinforcementMedium);
  }

  if (breakdownBaseEl) {
    breakdownBaseEl.textContent = formatCurrency(result.baseMedium);
  }

  resultsPlaceholder.classList.add('hidden');
  resultsPanel.classList.remove('hidden');
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError();

  const length = parseFloat(document.getElementById('length').value);
  const width = parseFloat(document.getElementById('width').value);
  const thickness = parseFloat(document.getElementById('thickness').value);
  const includeWaste = document.getElementById('waste').checked;

  if (!length || length <= 0) {
    showError('Please enter a valid length greater than zero.');
    return;
  }
  if (!width || width <= 0) {
    showError('Please enter a valid width greater than zero.');
    return;
  }
  if (!thickness || thickness <= 0) {
    showError('Please enter a valid thickness greater than zero.');
    return;
  }
  let result;

  try {
    result = calculate(length, width, thickness, includeWaste);
  } catch (error) {
    console.error(error);
    showError("Pricing data is still loading. Please try again in a moment.");
    return;
  }

  const estimateMedium = result.costMedium;

  displayResults(result);

  window.dataLayer = window.dataLayer || [];

window.dataLayer.push({
  event: "concrete_calculation",

  cubic_yards: result.totalYards,
  estimate_low: result.costLow,
  estimate_medium: estimateMedium,
  estimate_high: result.costHigh,

  square_feet: result.squareFeet,

  length_ft: length,
  width_ft: width,
  thickness_in: thickness,

  waste_factor: includeWaste
});
console.log("concrete_calculation pushed", {
  cubic_yards: result.totalYards,
  estimate_low: result.costLow,
  estimate_medium: estimateMedium,
  estimate_high: result.costHigh,
  square_feet: result.squareFeet,
  waste_factor: includeWaste
});
  const sessionId = getSessionId();
  const tracking = getTrackingParams();



  const { error } = await supabaseClient
    .from("calculations")
    .insert([
      {
        created_at: new Date().toISOString(),
        session_id: sessionId,

        length_ft: length,
        width_ft: width,
        thickness_in: thickness,

        waste_factor: includeWaste,

        cubic_yards: result.totalYards,

        estimate_low: result.costLow,
        estimate_medium: estimateMedium,
        estimate_high: result.costHigh,

        gclid: tracking.gclid,
        gbraid: tracking.gbraid,
        wbraid: tracking.wbraid,
        fbclid: tracking.fbclid,

        utm_source: tracking.utm_source,
        utm_medium: tracking.utm_medium,
        utm_campaign: tracking.utm_campaign,

        landing_page: window.location.pathname
      }
    ]);

  if (error) {
    console.error("Supabase insert error:", error);
  }
});
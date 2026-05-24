const CUBIC_FEET_PER_YARD = 27;
const WASTE_FACTOR = 0.10;

// San Diego market ballpark: delivered + placed, varies by PSI, finish, access
const COST_PER_YARD = { low: 165, high: 245 };

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

  return {
    netYards,
    totalYards,
    squareFeet,
    costLow: totalYards * COST_PER_YARD.low,
    costHigh: totalYards * COST_PER_YARD.high,
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

  resultsPlaceholder.classList.add('hidden');
  resultsPanel.classList.remove('hidden');
}

form.addEventListener('submit', (event) => {
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

  const result = calculate(length, width, thickness, includeWaste);
  displayResults(result);
});

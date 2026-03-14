import '../../elements/dist/harmonogram-elements.js';
import { useCaseScenarios } from './use-case-plans.js';

const board = document.querySelector('#board');
const log = document.querySelector('#event-log');
const scenarioList = document.querySelector('#scenario-list');
const scenarioSelect = document.querySelector('#scenario-select');
const groupBySelect = document.querySelector('#group-by-select');
const scaleSelect = document.querySelector('#scale-select');
const scenarioDescription = document.querySelector('#scenario-description');
const scenarioEdge = document.querySelector('#scenario-edge');

const scenarioById = new Map(useCaseScenarios.map((scenario) => [scenario.id, scenario]));
let activeScenarioId = useCaseScenarios[0]?.id ?? null;
let activeGroupBy = useCaseScenarios[0]?.defaultGroupBy ?? 'lane';
let activeScale = useCaseScenarios[0]?.defaultScale ?? 'day';

function renderScenarioOptions() {
  scenarioSelect.replaceChildren();
  scenarioList.replaceChildren();

  for (const scenario of useCaseScenarios) {
    const option = document.createElement('option');
    option.value = scenario.id;
    option.textContent = scenario.title;
    scenarioSelect.append(option);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scenario-button';
    button.dataset.scenarioId = scenario.id;
    button.dataset.e2e = `scenario-${scenario.id}`;
    button.innerHTML = `
      <span class="scenario-title">${scenario.title}</span>
      <div class="scenario-edge">${scenario.edge}</div>
    `;
    button.addEventListener('click', () => {
      applyScenario(scenario.id, { applyDefaults: true });
    });
    scenarioList.append(button);
  }
}

function updateScenarioButtonState() {
  scenarioList.querySelectorAll('.scenario-button').forEach((button) => {
    button.dataset.active = String(button.dataset.scenarioId === activeScenarioId);
  });
}

function applyScenario(nextScenarioId, options = { applyDefaults: false }) {
  const scenario = scenarioById.get(nextScenarioId);
  if (!scenario) {
    return;
  }

  activeScenarioId = nextScenarioId;
  if (options.applyDefaults) {
    activeGroupBy = scenario.defaultGroupBy;
    activeScale = scenario.defaultScale;
  }

  const shouldResetBoardState = options.applyDefaults || board.plan !== scenario.plan;

  if (shouldResetBoardState) {
    board.plan = scenario.plan;
  }

  board.interactive = true;
  board.editingMode = 'local';
  board.view = shouldResetBoardState ? { scale: activeScale } : { ...(board.view ?? {}), scale: activeScale };
  board.filters = shouldResetBoardState
    ? { groupBy: activeGroupBy }
    : { ...(board.filters ?? {}), groupBy: activeGroupBy };

  scenarioSelect.value = scenario.id;
  groupBySelect.value = activeGroupBy;
  scaleSelect.value = activeScale;
  scenarioDescription.textContent = scenario.description;
  scenarioEdge.textContent = scenario.edge;
  updateScenarioButtonState();
  log.textContent = `loaded: ${scenario.title}`;
}

scenarioSelect.addEventListener('change', () => {
  applyScenario(scenarioSelect.value, { applyDefaults: false });
});

groupBySelect.addEventListener('change', () => {
  activeGroupBy = groupBySelect.value;
  applyScenario(activeScenarioId, { applyDefaults: false });
});

scaleSelect.addEventListener('change', () => {
  activeScale = scaleSelect.value;
  applyScenario(activeScenarioId, { applyDefaults: false });
});

board.addEventListener('harmonogram-select', (event) => {
  const { itemId, dependencyId } = event.detail;
  log.textContent = `select: item=${itemId ?? '-'} dependency=${dependencyId ?? '-'}`;
});

board.addEventListener('harmonogram-edit-request', (event) => {
  const { action, itemId, mode } = event.detail;
  log.textContent = `edit-request: action=${action} item=${itemId ?? '-'} mode=${mode}`;
});

board.addEventListener('harmonogram-range-change', (event) => {
  const { reason, range } = event.detail;
  log.textContent = `range-change: reason=${reason} start=${range.start} end=${range.end}`;
});

board.addEventListener('harmonogram-action', (event) => {
  const { action, itemId } = event.detail;
  log.textContent = `action: ${action} item=${itemId ?? '-'}`;
});

renderScenarioOptions();
applyScenario(activeScenarioId, { applyDefaults: true });

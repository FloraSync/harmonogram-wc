import '../../elements/dist/harmonogram-elements.js';
import { cropTrackingPlan } from './plan.js';

const board = document.querySelector('#crop-board');
const modeLabel = document.querySelector('#mode-label');
const eventLog = document.querySelector('#event-log');

board.plan = cropTrackingPlan;
board.view = {
  scale: 'week',
};
board.interactive = true;
board.editingMode = 'local';
board.filters = {
  groupBy: 'phase',
};

const setGrouping = (groupBy) => {
  board.filters = {
    ...(board.filters ?? {}),
    groupBy,
  };
  modeLabel.textContent = groupBy;
};

document.querySelectorAll('[data-group-by]').forEach((button) => {
  button.addEventListener('click', () => {
    setGrouping(button.dataset.groupBy);
  });
});

board.addEventListener('harmonogram-select', (event) => {
  const { itemId, dependencyId } = event.detail;
  eventLog.textContent = `select: item=${itemId ?? '-'} dependency=${dependencyId ?? '-'}`;
});

board.addEventListener('harmonogram-edit-request', (event) => {
  const { action, itemId, mode } = event.detail;
  eventLog.textContent = `edit-request: action=${action} item=${itemId ?? '-'} mode=${mode}`;
});

board.addEventListener('harmonogram-range-change', (event) => {
  const { reason, range } = event.detail;
  eventLog.textContent = `range-change: reason=${reason} start=${range.start} end=${range.end}`;
});

board.addEventListener('harmonogram-action', (event) => {
  const { action, itemId } = event.detail;
  eventLog.textContent = `action: ${action} item=${itemId ?? '-'}`;
});

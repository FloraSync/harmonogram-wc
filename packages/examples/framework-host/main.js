import '../../elements/dist/harmonogram-elements.js';
import { samplePlan } from '../shared/sample-plan.js';
import { h, render } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import htm from 'htm';

const html = htm.bind(h);

function App() {
  const boardRef = useRef(null);
  const [groupBy, setGroupBy] = useState('lane');
  const [lastEvent, setLastEvent] = useState('No events yet.');

  const plan = useMemo(() => samplePlan, []);

  useEffect(() => {
    if (!boardRef.current) {
      return;
    }

    const board = boardRef.current;
    const shouldResetBoardState = board.plan !== plan;

    if (shouldResetBoardState) {
      board.plan = plan;
    }

    board.interactive = true;
    board.editingMode = 'local';
    board.view = shouldResetBoardState ? { scale: 'day' } : { ...(board.view ?? {}), scale: 'day' };
    board.filters = shouldResetBoardState ? { groupBy } : { ...(board.filters ?? {}), groupBy };

    const onSelect = (event) => {
      setLastEvent(`select -> item=${event.detail.itemId ?? '-'} dependency=${event.detail.dependencyId ?? '-'}`);
    };

    const onEditRequest = (event) => {
      setLastEvent(
        `edit-request -> action=${event.detail.action} item=${event.detail.itemId ?? '-'} mode=${event.detail.mode}`,
      );
    };

    const onRangeChange = (event) => {
      setLastEvent(`range-change -> ${event.detail.reason} ${event.detail.range.start} .. ${event.detail.range.end}`);
    };

    const onAction = (event) => {
      setLastEvent(`action -> ${event.detail.action} item=${event.detail.itemId ?? '-'}`);
    };

    board.addEventListener('harmonogram-select', onSelect);
    board.addEventListener('harmonogram-edit-request', onEditRequest);
    board.addEventListener('harmonogram-range-change', onRangeChange);
    board.addEventListener('harmonogram-action', onAction);

    return () => {
      board.removeEventListener('harmonogram-select', onSelect);
      board.removeEventListener('harmonogram-edit-request', onEditRequest);
      board.removeEventListener('harmonogram-range-change', onRangeChange);
      board.removeEventListener('harmonogram-action', onAction);
    };
  }, [plan, groupBy]);

  return html`
    <main>
      <h1>Framework Host (Preact)</h1>
      <p>
        This host controls the same public contract used by the vanilla example, including direct bar selection and
        local edit flows.
      </p>
      <div class="controls">
        <button data-e2e="framework-group-lane" type="button" onClick=${() => setGroupBy('lane')}>Group: Lane</button>
        <button data-e2e="framework-group-hierarchy" type="button" onClick=${() => setGroupBy('hierarchy')}>Group: Hierarchy</button>
        <button data-e2e="framework-group-resource" type="button" onClick=${() => setGroupBy('resource')}>Group: Resource</button>
        <button data-e2e="framework-group-phase" type="button" onClick=${() => setGroupBy('phase')}>Group: Phase</button>
      </div>
      <harmonogram-board ref=${boardRef} data-e2e="framework-board"></harmonogram-board>
      <p data-e2e="framework-last-event"><strong>Last event:</strong> ${lastEvent}</p>
    </main>
  `;
}

render(html`<${App} />`, document.querySelector('#app'));

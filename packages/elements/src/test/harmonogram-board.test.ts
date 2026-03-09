import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import type { Plan } from '@harmonogram/core';
import {
  HarmonogramBoard,
  type HarmonogramEditRequestEventDetail,
  type HarmonogramHoverEventDetail,
  type HarmonogramRangeChangeEventDetail,
  type HarmonogramSelectEventDetail,
} from '../harmonogram-board.js';
import '../harmonogram-board.js';

function createPlan(): Plan {
  return {
    id: 'plan-1',
    name: 'Season Plan',
    timeZone: 'UTC',
    range: {
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-04T00:00:00.000Z',
    },
    lanes: [
      {
        id: 'lane-1',
        label: 'Field A',
        kind: 'field',
        collapsed: false,
      },
      {
        id: 'lane-2',
        label: 'Field B',
        kind: 'field',
        collapsed: false,
      },
    ],
    items: [
      {
        id: 'item-1',
        laneId: 'lane-1',
        label: 'Planting',
        kind: 'task',
        segments: [
          {
            id: 'seg-1',
            workItemId: 'item-1',
            start: '2026-03-01T00:00:00.000Z',
            end: '2026-03-01T12:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
          {
            id: 'seg-1b',
            workItemId: 'item-1',
            start: '2026-03-01T14:00:00.000Z',
            end: '2026-03-01T18:00:00.000Z',
            segmentKind: 'actual',
            locked: false,
          },
        ],
        resourceAssignments: [],
      },
      {
        id: 'item-2',
        laneId: 'lane-2',
        label: 'Irrigation',
        kind: 'task',
        segments: [
          {
            id: 'seg-2',
            workItemId: 'item-2',
            start: '2026-03-02T00:00:00.000Z',
            end: '2026-03-02T12:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [],
      },
    ],
    dependencies: [
      {
        id: 'dep-1',
        fromId: 'item-1',
        toId: 'item-2',
        relationship: 'FS',
        lag: 0,
        hard: true,
      },
    ],
    resources: [],
    calendars: [],
    markers: [
      {
        id: 'marker-1',
        label: 'Treatment window',
        range: {
          start: '2026-03-01T00:00:00.000Z',
          end: '2026-03-02T00:00:00.000Z',
        },
        severity: 'high',
        kind: 'window',
      },
    ],
  };
}

function getItemButtons(board: HarmonogramBoard): HTMLButtonElement[] {
  return [...board.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="item-select"]')];
}

function getItemActionButton(board: HarmonogramBoard, part: string, itemId: string): HTMLButtonElement | null {
  return board.shadowRoot!.querySelector<HTMLButtonElement>(`[part="${part}"][data-item-id="${itemId}"]`);
}

function getSegmentTitles(board: HarmonogramBoard, itemId: string): string[] {
  return [
    ...board.shadowRoot!.querySelectorAll<HTMLElement>(`[part="lane-item"][data-item-id="${itemId}"] [part="segment"]`),
  ].map((segment) => segment.title);
}

function getCreateButton(board: HarmonogramBoard): HTMLButtonElement | null {
  return board.shadowRoot!.querySelector<HTMLButtonElement>('[part="create-item"]');
}

function getUndoButton(board: HarmonogramBoard): HTMLButtonElement | null {
  return board.shadowRoot!.querySelector<HTMLButtonElement>('[part="undo-edit"]');
}

function getRedoButton(board: HarmonogramBoard): HTMLButtonElement | null {
  return board.shadowRoot!.querySelector<HTMLButtonElement>('[part="redo-edit"]');
}

function getDependencyLinks(board: HarmonogramBoard): SVGPathElement[] {
  return [...board.shadowRoot!.querySelectorAll<SVGPathElement>('[part="dependency-link"]')];
}

function getDependencyHitboxes(board: HarmonogramBoard): SVGPathElement[] {
  return [...board.shadowRoot!.querySelectorAll<SVGPathElement>('[part="dependency-hitbox"]')];
}

describe('harmonogram-board', () => {
  it('is defined as a custom element', () => {
    const el = document.createElement('harmonogram-board');
    expect(el).to.be.instanceOf(HarmonogramBoard);
  });

  it('renders plan data and item view state', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();
    el.view = { scale: 'day' };
    el.filters = { query: 'plant' };

    const summary = el.shadowRoot!.querySelector('[part="summary"]');
    expect(summary).to.exist;
    expect(summary!.textContent).to.contain('Items: 1/2');
    expect(summary!.textContent).to.contain('Lanes: 1');

    const itemButtons = getItemButtons(el);
    expect(itemButtons).to.have.length(1);
    expect(itemButtons[0].textContent).to.equal('Planting');

    const timelineTicks = el.shadowRoot!.querySelectorAll('[part="timeline-tick"]');
    expect(timelineTicks).to.have.length(3);

    const markers = el.shadowRoot!.querySelectorAll('[part="timeline-marker"]');
    expect(markers).to.have.length(1);

    const lanes = el.shadowRoot!.querySelectorAll('[part="lane"]');
    expect(lanes).to.have.length(1);

    const segments = el.shadowRoot!.querySelectorAll('[part="segment"]');
    expect(segments).to.have.length(2);
  });

  it('renders lane tracks and segment kind metadata for theming hooks', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();

    const tracks = el.shadowRoot!.querySelectorAll('[part="item-track"]');
    expect(tracks).to.have.length(2);

    const segmentKinds = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="segment"]')].map(
      (segment) => segment.dataset.segmentKind,
    );
    expect(segmentKinds).to.include.members(['planned', 'actual']);
  });

  it('renders dependency overlay paths with relationship and critical metadata', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();

    const dependencyLinks = getDependencyLinks(el);
    expect(dependencyLinks).to.have.length(1);
    expect(dependencyLinks[0].dataset.relationship).to.equal('FS');
    expect(dependencyLinks[0].dataset.critical).to.equal('true');
    expect(dependencyLinks[0].dataset.satisfied).to.equal('true');

    const dependencyOverlay = el.shadowRoot!.querySelector('[part="dependency-overlay"]');
    expect(dependencyOverlay).to.exist;
    expect(dependencyOverlay!.textContent).to.contain('1 visible');
  });

  it('dispatches harmonogram-select for item selection', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();

    const selectEventPromise = oneEvent(el, 'harmonogram-select') as Promise<CustomEvent<HarmonogramSelectEventDetail>>;
    getItemButtons(el)[0].click();
    const selectEvent = await selectEventPromise;

    expect(selectEvent.detail.itemId).to.equal('item-1');
    expect(selectEvent.detail.selection.itemIds).to.deep.equal(['item-1']);
  });

  it('dispatches harmonogram-hover for dependency inspection', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();

    const hoverEventPromise = oneEvent(el, 'harmonogram-hover') as Promise<CustomEvent<HarmonogramHoverEventDetail>>;
    getDependencyHitboxes(el)[0].dispatchEvent(new MouseEvent('mouseenter'));
    const hoverEvent = await hoverEventPromise;

    expect(hoverEvent.detail.dependencyId).to.equal('dep-1');
    expect(hoverEvent.detail.fromId).to.equal('item-1');
    expect(hoverEvent.detail.toId).to.equal('item-2');
    expect(hoverEvent.detail.relationship).to.equal('FS');
  });

  it('dispatches harmonogram-select for dependency selection and updates the inspector', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();

    const selectEventPromise = oneEvent(el, 'harmonogram-select') as Promise<CustomEvent<HarmonogramSelectEventDetail>>;
    getDependencyHitboxes(el)[0].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    const selectEvent = await selectEventPromise;

    expect(selectEvent.detail.dependencyId).to.equal('dep-1');
    expect(selectEvent.detail.selection.dependencyIds).to.deep.equal(['dep-1']);
    expect(selectEvent.detail.selection.itemIds).to.deep.equal(['item-1', 'item-2']);
    expect(getDependencyLinks(el)[0].dataset.selected).to.equal('true');

    const inspector = el.shadowRoot!.querySelector('[part="dependency-inspector"]');
    expect(inspector).to.exist;
    expect(inspector!.textContent).to.contain('Planting -> Irrigation');
    expect(inspector!.textContent).to.contain('Satisfied');
  });

  it('updates dependency overlay when selection or data changes', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();

    el.selection = {
      itemIds: ['item-1', 'item-2'],
      dependencyIds: ['dep-1'],
    };
    expect(getDependencyLinks(el)[0].dataset.selected).to.equal('true');
    expect(el.shadowRoot!.querySelector('[part="dependency-inspector"]')!.textContent).to.contain(
      'Planting -> Irrigation',
    );

    el.plan = {
      ...createPlan(),
      dependencies: [],
    };

    expect(getDependencyLinks(el)).to.have.length(0);
    expect(el.shadowRoot!.querySelector('[part="dependency-empty"]')!.textContent).to.contain(
      'No visible dependencies',
    );
  });

  it('dispatches range and edit events in interactive mode', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();
    el.interactive = true;

    const rangeEventPromise = oneEvent(el, 'harmonogram-range-change') as Promise<
      CustomEvent<HarmonogramRangeChangeEventDetail>
    >;
    const shiftButton = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="shift-range"]');
    expect(shiftButton).to.exist;
    shiftButton!.click();
    const rangeEvent = await rangeEventPromise;

    expect(rangeEvent.detail.reason).to.equal('shift-forward');
    expect(rangeEvent.detail.range.start).to.equal('2026-03-04T00:00:00.000Z');
    expect(rangeEvent.detail.range.end).to.equal('2026-03-07T00:00:00.000Z');

    const editEventPromise = oneEvent(el, 'harmonogram-edit-request') as Promise<
      CustomEvent<HarmonogramEditRequestEventDetail>
    >;
    const editButton = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="item-edit"]');
    expect(editButton).to.exist;
    expect(editButton!.disabled).to.equal(false);
    editButton!.click();
    const editEvent = await editEventPromise;

    expect(editEvent.detail.action).to.equal('update');
    expect(editEvent.detail.itemId).to.equal('item-1');
    expect(editEvent.detail.mode).to.equal('controlled');
  });

  it('prevents edit requests in readonly mode', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();
    el.interactive = true;
    el.readonly = true;

    let editRequestCount = 0;
    el.addEventListener('harmonogram-edit-request', () => {
      editRequestCount += 1;
    });

    const editButton = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="item-edit"]');
    expect(editButton).to.exist;
    expect(editButton!.disabled).to.equal(true);
    editButton!.click();

    expect(editRequestCount).to.equal(0);
  });

  it('applies local edit actions and supports local undo/redo history', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();
    el.interactive = true;
    el.editingMode = 'local';

    const editEvents: HarmonogramEditRequestEventDetail[] = [];
    el.addEventListener('harmonogram-edit-request', (event) => {
      editEvents.push((event as CustomEvent<HarmonogramEditRequestEventDetail>).detail);
    });

    const moveButton = getItemActionButton(el, 'item-move', 'item-1');
    expect(moveButton).to.exist;
    moveButton!.click();
    expect(getSegmentTitles(el, 'item-1')[0]).to.contain('2026-03-01T06:00:00.000Z');

    const resizeButton = getItemActionButton(el, 'item-resize', 'item-1');
    expect(resizeButton).to.exist;
    resizeButton!.click();
    expect(getSegmentTitles(el, 'item-1').some((title) => title.includes('2026-03-02T02:00:00.000Z'))).to.equal(true);

    const splitButton = getItemActionButton(el, 'item-split', 'item-1');
    expect(splitButton).to.exist;
    splitButton!.click();
    expect(getSegmentTitles(el, 'item-1')).to.have.length(3);

    const createButton = getCreateButton(el);
    expect(createButton).to.exist;
    createButton!.click();
    expect(getItemButtons(el)).to.have.length(3);

    const deleteButton = getItemActionButton(el, 'item-delete', 'item-1');
    expect(deleteButton).to.exist;
    deleteButton!.click();
    expect(getItemButtons(el)).to.have.length(2);
    expect(el.shadowRoot!.querySelector('[part="item-select"][data-item-id="item-1"]')).to.not.exist;

    const undoButton = getUndoButton(el);
    expect(undoButton).to.exist;
    expect(undoButton!.disabled).to.equal(false);
    undoButton!.click();
    expect(el.shadowRoot!.querySelector('[part="item-select"][data-item-id="item-1"]')).to.exist;

    const redoButton = getRedoButton(el);
    expect(redoButton).to.exist;
    expect(redoButton!.disabled).to.equal(false);
    redoButton!.click();
    expect(el.shadowRoot!.querySelector('[part="item-select"][data-item-id="item-1"]')).to.not.exist;

    expect(editEvents.map((event) => event.action)).to.include.members([
      'move',
      'resize',
      'split',
      'create',
      'delete',
    ]);
    expect(editEvents.every((event) => event.mode === 'local')).to.equal(true);
  });

  it('keeps hosts authoritative in controlled mode and disables local history controls', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();
    el.interactive = true;
    el.editingMode = 'controlled';

    const editEvents: HarmonogramEditRequestEventDetail[] = [];
    el.addEventListener('harmonogram-edit-request', (event) => {
      editEvents.push((event as CustomEvent<HarmonogramEditRequestEventDetail>).detail);
    });

    const createButton = getCreateButton(el);
    expect(createButton).to.exist;
    expect(createButton!.disabled).to.equal(false);
    createButton!.click();

    const deleteButton = getItemActionButton(el, 'item-delete', 'item-1');
    expect(deleteButton).to.exist;
    deleteButton!.click();

    expect(getItemButtons(el)).to.have.length(2);
    expect(editEvents.map((event) => event.action)).to.deep.equal(['create', 'delete']);
    expect(editEvents.every((event) => event.mode === 'controlled')).to.equal(true);

    const undoButton = getUndoButton(el);
    const redoButton = getRedoButton(el);
    expect(undoButton).to.exist;
    expect(redoButton).to.exist;
    expect(undoButton!.disabled).to.equal(true);
    expect(redoButton!.disabled).to.equal(true);
  });
});

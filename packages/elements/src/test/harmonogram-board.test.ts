import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import type { Plan } from '@florasync/harmonogram-core';
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

function createOrganizingPlan(): Plan {
  return {
    id: 'plan-organizing',
    name: 'Organizing Plan',
    timeZone: 'UTC',
    range: {
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-05T00:00:00.000Z',
    },
    lanes: [
      {
        id: 'lane-a',
        label: 'Field A',
        kind: 'field',
        collapsed: false,
      },
      {
        id: 'lane-a1',
        label: 'Field A / North',
        parentId: 'lane-a',
        kind: 'field-block',
        collapsed: false,
      },
      {
        id: 'lane-a2',
        label: 'Field A / South',
        parentId: 'lane-a',
        kind: 'field-block',
        collapsed: false,
      },
      {
        id: 'lane-b',
        label: 'Field B',
        kind: 'field',
        collapsed: false,
      },
    ],
    items: [
      {
        id: 'item-plant',
        laneId: 'lane-a1',
        label: 'Planting pass',
        kind: 'task',
        segments: [
          {
            id: 'seg-plant',
            workItemId: 'item-plant',
            start: '2026-03-01T00:00:00.000Z',
            end: '2026-03-01T10:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [{ resourceId: 'res-tractor' }],
        metadata: {
          phase: 'Planting',
        },
      },
      {
        id: 'item-irrigate',
        laneId: 'lane-a2',
        label: 'Irrigation setup',
        kind: 'task',
        segments: [
          {
            id: 'seg-irrigate',
            workItemId: 'item-irrigate',
            start: '2026-03-02T00:00:00.000Z',
            end: '2026-03-02T10:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [{ resourceId: 'res-irrigation' }],
        metadata: {
          phase: 'Irrigation',
        },
      },
      {
        id: 'item-scout',
        laneId: 'lane-b',
        label: 'Scout pass',
        kind: 'task',
        segments: [
          {
            id: 'seg-scout',
            workItemId: 'item-scout',
            start: '2026-03-03T00:00:00.000Z',
            end: '2026-03-03T10:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [],
        metadata: {
          phase: 'Scouting',
        },
      },
    ],
    dependencies: [
      {
        id: 'dep-organize',
        fromId: 'item-plant',
        toId: 'item-irrigate',
        relationship: 'FS',
        lag: 0,
        hard: true,
      },
    ],
    resources: [
      {
        id: 'res-tractor',
        label: 'Tractor Crew',
        kind: 'crew',
        capacity: 1,
      },
      {
        id: 'res-irrigation',
        label: 'Irrigation Crew',
        kind: 'crew',
        capacity: 1,
      },
    ],
    calendars: [],
    markers: [],
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

function getItemSegments(board: HarmonogramBoard, itemId: string): HTMLElement[] {
  return [
    ...board.shadowRoot!.querySelectorAll<HTMLElement>(`[part="lane-item"][data-item-id="${itemId}"] [part="segment"]`),
  ];
}

function getItemTrack(board: HarmonogramBoard, itemId: string): HTMLElement | null {
  return board.shadowRoot!.querySelector<HTMLElement>(`[part="item-track"][data-item-id="${itemId}"]`);
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

function getContainer(board: HarmonogramBoard): HTMLElement | null {
  return board.shadowRoot!.querySelector<HTMLElement>('[part="container"]');
}

function getLaneLabels(board: HarmonogramBoard): string[] {
  return [...board.shadowRoot!.querySelectorAll<HTMLElement>('[part="lane-label"]')].map((label) => label.textContent ?? '');
}

function getLaneCollapseButton(board: HarmonogramBoard, laneId: string): HTMLButtonElement | null {
  return board.shadowRoot!.querySelector<HTMLButtonElement>(`[part="lane-collapse-toggle"][data-lane-id="${laneId}"]`);
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

  it('supports hierarchy grouping with collapse and expand controls', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createOrganizingPlan();
    el.setGroupBy('hierarchy');

    expect(getLaneLabels(el)).to.deep.equal(['Field A', 'Field A / North', 'Field A / South', 'Field B']);

    const collapseButton = getLaneCollapseButton(el, 'lane-a');
    expect(collapseButton).to.exist;
    collapseButton!.click();

    expect(getLaneLabels(el)).to.deep.equal(['Field A', 'Field B']);

    const expandButton = getLaneCollapseButton(el, 'lane-a');
    expect(expandButton).to.exist;
    expect(expandButton!.getAttribute('aria-expanded')).to.equal('false');
    expandButton!.click();

    expect(getLaneLabels(el)).to.deep.equal(['Field A', 'Field A / North', 'Field A / South', 'Field B']);
  });

  it('supports resource/phase reorganization plus search and focus tools', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createOrganizingPlan();

    el.filters = { groupBy: 'resource' };
    expect(getLaneLabels(el)).to.deep.equal(['Irrigation Crew', 'Tractor Crew', 'Unassigned resource']);

    el.filters = { groupBy: 'phase', phases: ['planting'] };
    expect(getLaneLabels(el)).to.deep.equal(['Planting']);
    expect(getItemButtons(el)).to.have.length(1);
    expect(getItemButtons(el)[0].textContent).to.equal('Planting pass');

    el.clearFilters();
    el.setSearchQuery('scout');
    expect(getItemButtons(el)).to.have.length(1);
    expect(getItemButtons(el)[0].textContent).to.equal('Scout pass');

    el.clearFilters();
    el.focusItem('item-plant');
    expect(getItemButtons(el)).to.have.length(2);
    expect(el.shadowRoot!.querySelector('[part="summary"]')!.textContent).to.contain('Focus: item-plant');

    const clearFocusButton = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear-focus"]');
    expect(clearFocusButton).to.exist;
    expect(clearFocusButton!.disabled).to.equal(false);
    clearFocusButton!.click();

    expect(getItemButtons(el)).to.have.length(3);
    expect(el.shadowRoot!.querySelector('[part="summary"]')!.textContent).to.not.contain('Focus: item-plant');
  });

  it('focuses items safely when ids contain selector-sensitive characters', async () => {
    const trickyItemId = 'item-"special"][focus';
    const sourcePlan = createPlan();
    const plan: Plan = {
      ...sourcePlan,
      items: sourcePlan.items.map((item) =>
        item.id === 'item-1'
          ? {
              ...item,
              id: trickyItemId,
              segments: item.segments.map((segment) => ({
                ...segment,
                workItemId: trickyItemId,
              })),
            }
          : item,
      ),
      dependencies: sourcePlan.dependencies.map((dependency) =>
        dependency.fromId === 'item-1'
          ? {
              ...dependency,
              fromId: trickyItemId,
            }
          : dependency,
      ),
    };

    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = plan;

    const selectEventPromise = oneEvent(el, 'harmonogram-select') as Promise<CustomEvent<HarmonogramSelectEventDetail>>;
    expect(() => el.focusItem(trickyItemId)).to.not.throw();
    const selectEvent = await selectEventPromise;

    const targetButton = getItemButtons(el).find((button) => button.dataset.itemId === trickyItemId);
    expect(selectEvent.detail.itemId).to.equal(trickyItemId);
    expect(targetButton).to.exist;
    expect(el.shadowRoot!.activeElement).to.equal(targetButton);
  });

  it('supports keyboard navigation and edit shortcuts for essential flows', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();
    el.interactive = true;

    const container = getContainer(el);
    expect(container).to.exist;

    container!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    expect(getItemButtons(el)[0].getAttribute('aria-pressed')).to.equal('true');

    container!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    expect(getItemButtons(el)[1].getAttribute('aria-pressed')).to.equal('true');

    const updateEventPromise = oneEvent(el, 'harmonogram-edit-request') as Promise<
      CustomEvent<HarmonogramEditRequestEventDetail>
    >;
    container!.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true, composed: true }));
    const updateEvent = await updateEventPromise;
    expect(updateEvent.detail.action).to.equal('update');
    expect(updateEvent.detail.itemId).to.equal('item-2');

    const deleteEventPromise = oneEvent(el, 'harmonogram-edit-request') as Promise<
      CustomEvent<HarmonogramEditRequestEventDetail>
    >;
    container!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, composed: true }));
    const deleteEvent = await deleteEventPromise;
    expect(deleteEvent.detail.action).to.equal('delete');
    expect(deleteEvent.detail.itemId).to.equal('item-2');
  });

  it('adds accessibility semantics and live announcements', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();

    const container = getContainer(el);
    expect(container).to.exist;
    expect(container!.getAttribute('role')).to.equal('region');
    expect(container!.getAttribute('aria-label')).to.equal('Season Plan board');

    const lanes = el.shadowRoot!.querySelector('[part="lanes"]');
    const timeline = el.shadowRoot!.querySelector('[part="timeline"]');
    const dependencies = el.shadowRoot!.querySelector('[part="dependency-overlay"]');
    const announcer = el.shadowRoot!.querySelector('[part="announcer"]');

    expect(lanes).to.exist;
    expect(lanes!.getAttribute('role')).to.equal('list');
    expect(timeline).to.exist;
    expect(timeline!.getAttribute('role')).to.equal('region');
    expect(dependencies).to.exist;
    expect(dependencies!.getAttribute('role')).to.equal('region');
    expect(announcer).to.exist;
    expect(announcer!.getAttribute('aria-live')).to.equal('polite');
    expect(announcer!.getAttribute('aria-atomic')).to.equal('true');

    el.focusItem('item-1');
    expect((el.shadowRoot!.querySelector('[part="announcer"]')?.textContent ?? '').toLowerCase()).to.contain('focused item');

    const refreshedContainer = getContainer(el);
    expect(refreshedContainer).to.exist;
    refreshedContainer!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    expect((el.shadowRoot!.querySelector('[part="announcer"]')?.textContent ?? '').toLowerCase()).to.contain('focus cleared');
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

  it('allows selecting an item directly from a visible segment track', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();

    const selectEventPromise = oneEvent(el, 'harmonogram-select') as Promise<CustomEvent<HarmonogramSelectEventDetail>>;
    getItemSegments(el, 'item-1')[0].dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    const selectEvent = await selectEventPromise;

    expect(selectEvent.detail.itemId).to.equal('item-1');
    expect(selectEvent.detail.selection.itemIds).to.deep.equal(['item-1']);
    expect(getItemButtons(el)[0].getAttribute('aria-pressed')).to.equal('true');
    expect(getItemTrack(el, 'item-1')?.dataset.selected).to.equal('true');
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

  it('supports JSON, CSV, and PNG export flows', async () => {
    const el = await fixture<HarmonogramBoard>(html`<harmonogram-board></harmonogram-board>`);
    el.plan = createPlan();

    const actionEvents: string[] = [];
    el.addEventListener('harmonogram-action', (event) => {
      const detail = (event as CustomEvent<{ action: string }>).detail;
      actionEvents.push(detail.action);
    });

    const jsonPayload = el.exportJson();
    const parsedJson = JSON.parse(jsonPayload) as { plan: Plan | null };
    expect(parsedJson.plan?.id).to.equal('plan-1');

    const csvPayload = el.exportCsv();
    expect(csvPayload).to.contain('itemId,laneId,label,segmentId,segmentKind,start,end');
    expect(csvPayload).to.contain('item-1');
    expect(csvPayload).to.contain('seg-1');

    const pngPayload = el.exportPng();
    expect(pngPayload).to.be.a('string');
    expect(pngPayload!).to.match(/^data:image\/png;base64,/);

    expect(actionEvents).to.include.members(['export-json', 'export-csv', 'export-png']);
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

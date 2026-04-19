import { expect, fixture, html } from '@open-wc/testing';
import '../harmonogram-wc.js';
import type { HarmonogramTask, HarmonogramWc } from '../harmonogram-wc.js';

describe('harmonogram-wc characterization', () => {
  it('keeps the starter shadow structure and empty state contract', async () => {
    const el = await fixture<HarmonogramWc>(html`<harmonogram-wc></harmonogram-wc>`);

    const container = el.shadowRoot!.querySelector('[part="container"]');
    const header = el.shadowRoot!.querySelector('[part="header"]');
    const grid = el.shadowRoot!.querySelector('[part="grid"]');
    const empty = el.shadowRoot!.querySelector('.empty-message');

    expect(container).to.exist;
    expect(header).to.exist;
    expect(grid).to.exist;
    expect(empty).to.exist;
    expect(empty!.textContent!.trim()).to.equal('No tasks to display.');
  });

  it('keeps keyboard activation behavior for task items', async () => {
    const tasks: HarmonogramTask[] = [
      { id: '1', label: 'Task A', start: '2026-01-01', end: '2026-01-02' },
    ];

    const el = await fixture<HarmonogramWc>(html`<harmonogram-wc></harmonogram-wc>`);
    el.tasks = tasks;
    await el.updateComplete;

    const dispatchedIds: string[] = [];
    el.addEventListener('harmonogram-task-click', (event) => {
      dispatchedIds.push((event as CustomEvent<HarmonogramTask>).detail.id);
    });

    const taskEl = el.shadowRoot!.querySelector<HTMLElement>('[part="task"]');
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    taskEl!.dispatchEvent(enterEvent);
    taskEl!.dispatchEvent(spaceEvent);

    expect(dispatchedIds).to.deep.equal(['1', '1']);
    expect(enterEvent.defaultPrevented).to.equal(true);
    expect(spaceEvent.defaultPrevented).to.equal(true);
  });
});

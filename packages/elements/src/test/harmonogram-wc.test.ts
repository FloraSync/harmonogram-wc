import { expect, fixture, html } from '@open-wc/testing';
import '../harmonogram-wc.js';
import type { HarmonogramWc, HarmonogramTask } from '../harmonogram-wc.js';

describe('harmonogram-wc', () => {
  it('is defined as a custom element', () => {
    const el = document.createElement('harmonogram-wc');
    expect(el).to.be.an.instanceof(HTMLElement);
  });

  it('renders with a default title', async () => {
    const el = await fixture<HarmonogramWc>(html`<harmonogram-wc></harmonogram-wc>`);
    const header = el.shadowRoot!.querySelector('[part="header"]');
    expect(header).to.exist;
    expect(header!.textContent!.trim()).to.equal('Harmonogram');
  });

  it('renders with a custom title', async () => {
    const el = await fixture<HarmonogramWc>(
      html`<harmonogram-wc title="My Schedule"></harmonogram-wc>`,
    );
    const header = el.shadowRoot!.querySelector('[part="header"]');
    expect(header!.textContent!.trim()).to.equal('My Schedule');
  });

  it('shows empty message when no tasks are provided', async () => {
    const el = await fixture<HarmonogramWc>(html`<harmonogram-wc></harmonogram-wc>`);
    const emptyMsg = el.shadowRoot!.querySelector('.empty-message');
    expect(emptyMsg).to.exist;
    expect(emptyMsg!.textContent!.trim()).to.equal('No tasks to display.');
  });

  it('renders task bars for each task', async () => {
    const tasks: HarmonogramTask[] = [
      { id: '1', label: 'Task A', start: '2026-01-01', end: '2026-01-05' },
      { id: '2', label: 'Task B', start: '2026-01-06', end: '2026-01-10' },
    ];
    const el = await fixture<HarmonogramWc>(html`<harmonogram-wc></harmonogram-wc>`);
    el.tasks = tasks;
    await el.updateComplete;

    const taskEls = el.shadowRoot!.querySelectorAll('[part="task"]');
    expect(taskEls).to.have.length(2);
    expect(taskEls[0].textContent!.trim()).to.equal('Task A');
    expect(taskEls[1].textContent!.trim()).to.equal('Task B');
  });

  it('dispatches harmonogram-task-click when a task is clicked', async () => {
    const tasks: HarmonogramTask[] = [
      { id: '1', label: 'Task A', start: '2026-01-01', end: '2026-01-05' },
    ];
    const el = await fixture<HarmonogramWc>(html`<harmonogram-wc></harmonogram-wc>`);
    el.tasks = tasks;
    await el.updateComplete;

    let clicked: HarmonogramTask | null = null;
    el.addEventListener('harmonogram-task-click', (e) => {
      clicked = (e as CustomEvent<HarmonogramTask>).detail;
    });

    const taskEl = el.shadowRoot!.querySelector<HTMLElement>('[part="task"]');
    taskEl!.click();

    expect(clicked).to.not.be.null;
    expect(clicked!.id).to.equal('1');
    expect(clicked!.label).to.equal('Task A');
  });

  it('passes accessibility checks', async () => {
    const el = await fixture<HarmonogramWc>(html`<harmonogram-wc></harmonogram-wc>`);
    await expect(el).to.be.accessible();
  });
});

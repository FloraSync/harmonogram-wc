import { expect } from '@open-wc/testing';

describe('package contract smoke', () => {
  it('loads the browser bundle via script tag', async () => {
    const script = document.createElement('script');
    script.src = '/dist/harmonogram-elements.js';

    await new Promise((resolve, reject) => {
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error('Failed to load browser bundle.')), { once: true });
      document.head.append(script);
    });

    expect(window.HarmonogramElements).to.exist;
  });

  it('supports ESM imports for bundlers', async () => {
    const module = await import('../dist/index.js');

    expect(module.HarmonogramBoard).to.exist;
    expect(module.buildBoardViewModel).to.be.a('function');
    expect(module.TIMELINE_SCALES).to.include('week');
  });

  it('supports side-effect registration entrypoint', async () => {
    await import('../dist/register.js');

    expect(customElements.get('harmonogram-board')).to.exist;
    expect(customElements.get('harmonogram-wc')).to.exist;
  });
});

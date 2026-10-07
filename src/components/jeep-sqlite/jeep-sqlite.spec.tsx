import { describe, expect, h, it, render } from '@stencil/vitest';
import './jeep-sqlite';

describe('jeep-sqlite', () => {
  it('registers the element and attaches a shadow root', async () => {
    const { root, unmount } = await render(h('jeep-sqlite', null), { waitForReady: false });

    expect(root.tagName).toBe('JEEP-SQLITE');
    expect(root.shadowRoot).not.toBeNull();
    unmount();
  });

  it('answers echo', async () => {
    const { root, unmount } = await render(h('jeep-sqlite', null), { waitForReady: false });

    const sqlite = root as unknown as { echo(o: { value: string }): Promise<{ value: string }> };
    expect(await sqlite.echo({ value: 'Hello' })).toEqual({ value: 'Hello' });
    unmount();
  });

  it('reflects the autosave attribute', async () => {
    const { root, unmount } = await render(h('jeep-sqlite', { autosave: true }), {
      waitForReady: false,
    });

    expect(root.getAttribute('autosave')).not.toBeNull();
    unmount();
  });
});

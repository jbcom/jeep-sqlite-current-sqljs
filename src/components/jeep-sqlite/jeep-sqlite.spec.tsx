import { describe, expect, h, it, render } from '@stencil/vitest';
import './jeep-sqlite';

describe('jeep-sqlite', () => {
  it('exports only the selected bytes of a database buffer', async () => {
    const { instance, unmount } = await render(h('jeep-sqlite', null), { waitForReady: false });
    const sqlite = instance as {
      uint2blob(bytes: Uint8Array): Promise<Blob>;
    };
    const bytes = new Uint8Array([99, 1, 2, 3, 88]);
    const blob = await sqlite.uint2blob(bytes.subarray(1, 4));

    expect(blob.size).toBe(3);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    unmount();
    bytes[2] = 42;
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('exports complete and empty database buffers', async () => {
    const { instance, unmount } = await render(h('jeep-sqlite', null), { waitForReady: false });
    const sqlite = instance as {
      uint2blob(bytes: Uint8Array): Promise<Blob>;
    };
    for (const bytes of [new Uint8Array([1, 2, 3]), new Uint8Array()]) {
      const blob = await sqlite.uint2blob(bytes);
      expect(blob.size).toBe(bytes.length);
      expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    }
    unmount();
  });

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

import { describe, expect, h, it, render } from '@stencil/vitest';
import './jeep-sqlite';

describe('jeep-sqlite', () => {
  it('registers and renders the current web component', async () => {
    const { root, unmount } = await render(<jeep-sqlite />, { waitForReady: false });

    expect(root.tagName).toBe('JEEP-SQLITE');
    expect(root.shadowRoot).not.toBeNull();
    unmount();
  });
});

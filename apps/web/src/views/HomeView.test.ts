import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomeView from './HomeView.vue';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomeView', () => {
  it('shows the API version once the health check succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ status: 'ok', version: '1.2.3', gameDataVersion: 'patch-8' }),
          ),
        ),
    );

    const wrapper = mount(HomeView);
    await flushPromises();

    expect(wrapper.get('[data-testid="api-status"]').text()).toBe(
      'API online · v1.2.3 · game data patch-8',
    );
  });

  it('shows an error when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 502 })));

    const wrapper = mount(HomeView);
    await flushPromises();

    expect(wrapper.get('[data-testid="api-status"]').text()).toBe(
      'API unreachable: Health check failed: HTTP 502',
    );
  });
});

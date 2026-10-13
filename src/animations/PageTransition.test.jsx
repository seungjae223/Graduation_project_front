import React, { StrictMode, Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import PageTransition, { RouteContentReady } from './PageTransition';

beforeEach(() => { window.matchMedia = () => ({ matches: false }); });

const pageEntryFor = label => {
  // The animation state/event belongs to the unlabelled transition host, identified by its accessible content.
  // eslint-disable-next-line testing-library/no-node-access
  return screen.getByText(label).closest('[data-page-entry]');
};

test('StrictMode, subsequent suspension and data rerenders preserve the completed entry; a new key is fresh', async () => {
  let pending = false;
  let resolve;
  const data = new Promise(r => { resolve = r; });
  function Content({ label }) { if (pending) throw data; return <p>{label}</p>; }
  const page = (key, label) => <StrictMode><PageTransition key={key} className="route-transition">
    <Suspense fallback={<p>Loading</p>}><RouteContentReady><Content label={label} /></RouteContentReady></Suspense>
  </PageTransition></StrictMode>;
  const { rerender } = render(page('first', 'Initial'));
  const entry = pageEntryFor('Initial');
  expect(entry.dataset.pageEntry).toBe('ready');
  const end = new Event('animationend', { bubbles: true });
  Object.defineProperty(end, 'animationName', { value: 'pageFadeUp' });
  act(() => { entry.dispatchEvent(end); });
  expect(entry.dataset.pageEntry).toBe('settled');
  pending = true; rerender(page('first', 'Data'));
  expect(screen.getByText('Loading')).toBeInTheDocument();
  expect(entry.dataset.pageEntry).toBe('settled');
  pending = false; await act(async () => { resolve(); await data; });
  expect(screen.getByText('Data')).toBeInTheDocument();
  expect(pageEntryFor('Data')).toBe(entry);
  expect(entry.dataset.pageEntry).toBe('settled');
  rerender(page('second', 'Revisit'));
  const revisitEntry = pageEntryFor('Revisit');
  expect(revisitEntry).not.toBe(entry);
  expect(revisitEntry.dataset.pageEntry).toBe('ready');
});

test('initial Suspense waits for content, and reduced motion shows the final position immediately', async () => {
  let loaded = false;
  let resolve;
  const data = new Promise(r => { resolve = r; });
  function Content() { if (!loaded) throw data; return <p>Ready</p>; }
  window.matchMedia = () => ({ matches: true });
  render(<PageTransition className="route-transition"><Suspense fallback={<p>Loading</p>}>
    <RouteContentReady><Content /></RouteContentReady></Suspense></PageTransition>);
  const entry = pageEntryFor('Loading');
  expect(entry.dataset.pageEntry).toBe('pending');
  loaded = true; await act(async () => { resolve(); await data; });
  expect(pageEntryFor('Ready')).toBe(entry);
  expect(entry.dataset.pageEntry).toBe('settled');
  expect(screen.getByText('Ready')).toBeInTheDocument();
});

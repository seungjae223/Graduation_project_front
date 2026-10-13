import { cancelOnboardingTransition, navigateWithOnboardingTransition, syncOnboardingTransitionRoute } from './onboardingTransition';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const drain = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
let callbacks;
let transitions;
const arrive = path => {
  window.history.replaceState({}, '', path);
  document.querySelector('.onboarding-route').outerHTML = '<div class="onboarding-route"><div class="image-wrapper"></div><div class="text-area"><h2>Title</h2><p>Description</p></div></div>';
  syncOnboardingTransitionRoute(path);
};

beforeEach(() => {
  window.history.replaceState({}, '', '/onboarding');
  document.body.innerHTML = '<div class="onboarding-route"><div class="image-wrapper"></div><div class="text-area"><h2>Title</h2><p>Description</p></div></div>';
  window.matchMedia = jest.fn(() => ({ matches: false }));
  callbacks = []; transitions = [];
  document.startViewTransition = jest.fn(callback => {
    callbacks.push(callback);
    const completion = deferred();
    const transition = { ready: Promise.resolve(), finished: completion.promise, skipTransition: jest.fn(), finish: completion.resolve };
    transitions.push(transition);
    return transition;
  });
});
afterEach(() => { cancelOnboardingTransition(); delete document.startViewTransition; delete Element.prototype.getAnimations; });

test('native snapshot waits for route commit, then settles the entire incoming entry', async () => {
  const navigate = jest.fn();
  navigateWithOnboardingTransition(navigate, '/onboarding2', 'forward');
  const arrival = callbacks[0]();
  let resolved = false; arrival.then(() => { resolved = true; });
  await drain(); expect(resolved).toBe(false);
  arrive('/onboarding2'); await arrival;
  transitions[0].finish(); await drain();
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(document.querySelector('.onboarding-route').dataset.onboardingEntry).toBe('settled');
  expect(document.documentElement.className).toBe('');
});

test('rapid duplicate click and cancelled native callbacks never navigate later', async () => {
  const navigate = jest.fn();
  navigateWithOnboardingTransition(navigate, '/onboarding2', 'forward');
  navigateWithOnboardingTransition(navigate, '/onboarding2', 'forward');
  expect(callbacks).toHaveLength(1);
  arrive('/landing'); // external navigation before the native update callback
  callbacks[0](); transitions[0].finish(); await drain();
  expect(navigate).not.toHaveBeenCalled();
  expect(document.documentElement.className).toBe('');
});

test('an old completion cannot clear a newer transition', async () => {
  const navigate = jest.fn();
  navigateWithOnboardingTransition(navigate, '/onboarding2', 'forward');
  callbacks[0](); arrive('/onboarding2');
  navigateWithOnboardingTransition(navigate, '/onboarding3', 'forward');
  transitions[0].finish(); await drain();
  expect(document.documentElement.classList.contains('onboarding-transitioning')).toBe(true);
  callbacks[1](); arrive('/onboarding3'); transitions[1].finish(); await drain();
  expect(navigate.mock.calls).toEqual([['/onboarding2'], ['/onboarding3']]);
});

test('fallback starts on the committed route and cleans up on animation completion, without timers', async () => {
  delete document.startViewTransition;
  const animationEnd = deferred();
  const animation = { animationName: 'onboarding-view-graphic-enter', finished: animationEnd.promise, cancel: jest.fn() };
  Element.prototype.getAnimations = jest.fn(() => [animation]);
  const navigate = jest.fn();
  navigateWithOnboardingTransition(navigate, '/onboarding2', 'forward');
  expect(document.documentElement.classList.contains('onboarding-transition-fallback')).toBe(false);
  arrive('/onboarding2'); await drain();
  expect(document.documentElement.classList.contains('onboarding-transition-fallback')).toBe(true);
  expect(document.querySelector('.onboarding-exit-layer')).not.toBeNull();
  animationEnd.resolve(); await drain();
  expect(document.querySelector('.onboarding-exit-layer')).toBeNull();
  expect(document.querySelector('.onboarding-route').dataset.onboardingEntry).toBe('settled');
  expect(navigate).toHaveBeenCalledTimes(1);
});

test('native API throwing after its update callback does not navigate a second time', () => {
  const navigate = jest.fn();
  document.startViewTransition = callback => { callback(); throw new Error('transition failed'); };
  navigateWithOnboardingTransition(navigate, '/onboarding2', 'forward');
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(document.documentElement.className).toBe('');
});

test('history back waits for the arrived route; reduced motion cancels outstanding work', async () => {
  const navigate = jest.fn();
  navigateWithOnboardingTransition(navigate, -1, 'backward');
  const arrival = callbacks[0]();
  window.history.replaceState({}, '', '/onboarding3');
  window.dispatchEvent(new PopStateEvent('popstate'));
  syncOnboardingTransitionRoute('/onboarding3'); await arrival;
  window.matchMedia = () => ({ matches: true });
  navigateWithOnboardingTransition(navigate, '/landing', 'forward');
  expect(transitions[0].skipTransition).toHaveBeenCalledTimes(1);
  expect(navigate.mock.calls).toEqual([[-1], ['/landing']]);
  expect(document.documentElement.className).toBe('');
});

test('duplicate click while the router is committing is ignored', () => {
  const navigate = jest.fn();
  navigateWithOnboardingTransition(navigate, '/onboarding2', 'forward');
  callbacks[0]();
  navigateWithOnboardingTransition(navigate, '/onboarding2', 'forward');
  expect(callbacks).toHaveLength(1);
  expect(navigate).toHaveBeenCalledTimes(1);
});

test('the intended history event does not cancel a back transition if React committed first', async () => {
  navigateWithOnboardingTransition(jest.fn(), -1, 'backward');
  const arrival = callbacks[0]();
  arrive('/onboarding3');
  window.dispatchEvent(new PopStateEvent('popstate'));
  await arrival;
  expect(transitions[0].skipTransition).not.toHaveBeenCalled();
  expect(document.documentElement.classList.contains('onboarding-transitioning')).toBe(true);
  transitions[0].finish(); await drain();
  expect(document.documentElement.className).toBe('');
});

test('direct onboarding3 entry can fall back to onboarding2 and removes its snapshots', async () => {
  delete document.startViewTransition;
  window.history.replaceState({ idx: 0 }, '', '/onboarding3');
  const navigate = jest.fn();
  navigateWithOnboardingTransition(navigate, '/onboarding2', 'backward');
  expect(navigate.mock.calls).toEqual([['/onboarding2']]);
  expect(document.querySelector('.onboarding-exit-layer')).not.toBeNull();
  arrive('/onboarding2');
  await drain();
  expect(document.querySelector('.onboarding-exit-layer')).toBeNull();
  expect(document.documentElement.className).toBe('');
  expect(document.querySelector('.onboarding-route').dataset.onboardingEntry).toBe('settled');
});

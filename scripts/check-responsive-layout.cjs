/* Run against a local dev server with REACT_APP_USE_MOCK=false and its API URL
 * set to that same server. All API calls are intercepted below, with no backend
 * traffic. Playwright can come from NODE_PATH. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const baseURL = process.env.LAYOUT_BASE_URL || 'http://127.0.0.1:3009';
const label = process.argv[2] || 'after';
const output = path.resolve('output/responsive-layout', label);
const widths = process.env.LAYOUT_WIDTHS ? process.env.LAYOUT_WIDTHS.split(',').map(Number) : [360, 390, 430, 768, 1440, 1920];
// LAYOUT_THEMES=dark can still seed the old preference to verify its migration.
const themes = process.env.LAYOUT_THEMES ? process.env.LAYOUT_THEMES.split(',') : ['light'];
const routes = [
  ['home', '/home', '.home'],
  ['login', '/login', '.login-card'],
  ['signup', '/signup', '.signup-container'],
  ['find-password', '/find-password', '.find-password-form'],
  ['search', '/search', '.search-page'],
  ['search-results', '/search?keyword=서울', '.place-explore-card'],
  ['recommend', '/recommend', '.recommend-destination-card'],
  ['create', '/route-create', '.v16-create-page'],
  ['create-region', '/route-create/region', '.v16-create-region'],
  ['result', '/route-result?id=1', '.v16-detail-summary'],
  ['result-edit', '/route-result?id=1&edit=1', '.v16-detail-page.is-editing'],
  ['schedule', '/schedule', '.my-schedule-page'],
  ['mypage', '/mypage', '.mypage-v14'],
].filter(([name]) => !process.env.LAYOUT_ROUTES || process.env.LAYOUT_ROUTES.split(',').includes(name));

// Reuse the repository's demo responses, supplementing its missing catalog route
// inside this test harness only. Application/API source files are untouched.
const originalJSLoader = require.extensions['.js'];
const sourceRoot = path.resolve('src') + path.sep;
require.extensions['.js'] = (module, filename) => {
  if (!filename.startsWith(sourceRoot)) return originalJSLoader(module, filename);
  const { code } = require('@babel/core').transformFileSync(filename, {
    babelrc: false, configFile: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  module._compile(code, filename);
};
const user = { id: 1, name: '테스트 사용자', nickname: '테스트 사용자',
  email: 'test@example.com', role: 'USER', provider: 'LOCAL' };
global.localStorage = { getItem: key => key === 'mock_auth_session'
  ? JSON.stringify({ token: 'mock.responsive.demo', user }) : null };
global.sessionStorage = { getItem: () => null };
const { mockAdapter, resetMockData } = require('../src/mocks/mockAdapter');
const { TRAVEL_DESTINATIONS, COUNTRY_REGIONS } = require('../src/data/travelDestinations');
require.extensions['.js'] = originalJSLoader;
const countryCodes = { korea: 'kr', japan: 'jp', 'hong-kong': 'hk', thailand: 'th',
  vietnam: 'vn', philippines: 'ph', 'united-states': 'us' };
const catalog = TRAVEL_DESTINATIONS.map(item => ({ code: item.id, name: item.name,
  countryCode: countryCodes[item.countryRegionId],
  countryName: COUNTRY_REGIONS.find(country => country.id === item.countryRegionId).name,
  scope: item.countryRegionId === 'korea' ? 'DOMESTIC' : 'OVERSEAS',
}));

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const results = [];
  try {
    for (const theme of themes) {
    const screenshotDir = path.join(output, theme);
    fs.mkdirSync(screenshotDir, { recursive: true });
    for (const width of widths) {
      resetMockData();
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1,
        isMobile: width < 768, hasTouch: width < 768 });
      // Isolated demo session: never touches the user's account or backend.
      await context.addInitScript(theme => {
        localStorage.setItem('site-theme', theme);
        localStorage.setItem('accessToken', 'layout.responsive.demo');
        localStorage.setItem('mock_auth_session', JSON.stringify({
          token: 'mock.responsive.demo',
          user: { id: 1, name: '테스트 사용자', nickname: '테스트 사용자',
            email: 'test@example.com', role: 'USER', provider: 'LOCAL' },
        }));
      }, theme);
      await context.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        try {
          if (request.method() !== 'GET') throw new Error('Layout audit attempted a mutation');
          const data = url.pathname === '/api/destinations' ? catalog
            : url.pathname === '/api/home/rankings' ? { windowDays: 30, cities: [], hotPlaces: [] }
            : (await mockAdapter({ url: request.url(), method: 'get', headers: {}, params: {} })).data;
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
        } catch (error) {
          await route.fulfill({ status: 400, contentType: 'application/json',
            body: JSON.stringify({ message: error.message }) });
        }
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const [name, url, selector] of routes) {
        errors.length = 0;
        if (name === 'create-region') {
          // Enter through the real calendar flow so its scoped draft is valid.
          await page.locator('.v16-date-day').nth(4).click();
          await page.locator('.v16-date-day').nth(7).click();
          await page.locator('.v16-date-actions button').click();
        } else {
          await page.goto(baseURL + url, { waitUntil: 'domcontentloaded' });
        }
        await page.locator(selector).first().waitFor({ timeout: 20000 });
        if (name === 'create-region') {
          await page.locator('.v16-region-card').first().click();
          await page.locator('.v16-region-next.is-visible').waitFor();
        }
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500);
        const metrics = await page.evaluate(() => {
          const rect = el => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: +r.x.toFixed(2), width: +r.width.toFixed(2), right: +r.right.toFixed(2) };
          };
          const app = document.querySelector('.app');
          const main = document.querySelector('.app-content');
          const bounds = main.getBoundingClientRect();
          const overflow = [];
          for (const el of document.querySelectorAll('main *')) {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
            if (r.left >= bounds.left - 1 && r.right <= bounds.right + 1) continue;
            let clipped = false;
            for (let parent = el.parentElement; parent && parent !== main; parent = parent.parentElement) {
              const style = getComputedStyle(parent);
              if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX) &&
                  parent.getBoundingClientRect().width <= bounds.width + 1) {
                // The app/transition clipping is not a substitute for fitting content.
                if (!parent.matches('.app-content, .route-transition')) clipped = true;
              }
            }
            if (!clipped) overflow.push({ tag: el.tagName, class: String(el.className).slice(0, 100), ...rect(el) });
          }
          const overlaps = [];
          for (const group of document.querySelectorAll('.social, .login-options, .quick-menu, .home-ticket-bottom, .v16-detail-secondary-actions, .v16-date-month, .v16-detail-view-toolbar')) {
            const controls = [...group.querySelectorAll('button, a, input:not([type="checkbox"])')]
              .filter(el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
            controls.forEach((a, i) => controls.slice(i + 1).forEach(b => {
              const x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
              if (Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 &&
                  Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1) overlaps.push(group.className);
            }));
          }
          const footer = document.querySelector('.footer');
          const tabs = [...document.querySelectorAll('.footer-rail--main .tab')].map(rect);
          const grid = document.querySelector('.recommend-destination-grid, .search-results-list.destination-place-grid');
          const escapedPhotoCredits = [...document.querySelectorAll('.place-explore-photo .place-photo-credit')]
            .filter(el => {
              const r = el.getBoundingClientRect(), parent = el.parentElement.getBoundingClientRect();
              return r.left < parent.left - 1 || r.right > parent.right + 1 ||
                r.top < parent.top - 1 || r.bottom > parent.bottom + 1;
            }).length;
          return {
            app: rect(app), header: rect(document.querySelector('.header')),
            footer: rect(footer), main: rect(main),
            theme: document.documentElement.dataset.theme,
            colorScheme: getComputedStyle(document.documentElement).colorScheme,
            page: app.dataset.page,
            grid: grid ? { display: getComputedStyle(grid).display,
              columns: getComputedStyle(grid).gridTemplateColumns } : null,
            escapedPhotoCredits,
            form: rect(document.querySelector('.login-card, .signup-container')),
            action: rect(document.querySelector('.v16-date-actions, .v16-region-next')),
            actionBottom: document.querySelector('.v16-date-actions, .v16-region-next')?.getBoundingClientRect().bottom,
            footerTop: footer?.getBoundingClientRect().top,
            gutter: parseFloat(getComputedStyle(document.querySelector('.v16-create-page, .v16-create-region') || app).paddingLeft),
            searchHeight: document.querySelector('.home .search-box')?.getBoundingClientRect().height,
            cardHeight: document.querySelector('.home .menu-card')?.getBoundingClientRect().height,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth, overflow, tabs, overlaps,
          };
        });
        const failures = [];
        if (Math.abs(metrics.app.width - width) > 1) failures.push('app constrained to a narrow column');
        if (metrics.theme !== 'light' || metrics.colorScheme !== 'light') failures.push('removed dark mode reactivated');
        if (metrics.documentWidth > width) failures.push('document horizontal overflow');
        if (metrics.overflow.length) failures.push('content exceeds app');
        for (const part of ['header', 'main', 'footer']) {
          const r = metrics[part];
          if (r && (Math.abs(r.x - metrics.main.x) > 1 || Math.abs(r.width - metrics.main.width) > 1)) {
            failures.push(`${part} alignment`);
          }
        }
        if (metrics.tabs.some((r, index, tabs) => index && r.x < tabs[index - 1].right - 1)) failures.push('tabs overlap');
        if (metrics.overlaps.length) failures.push('controls overlap');
        if (metrics.escapedPhotoCredits) failures.push('photo credit escapes image');
        if (width >= 768 && ['recommend', 'search-results'].includes(name) &&
            (metrics.grid?.display !== 'grid' || metrics.grid.columns.split(' ').length !== 2)) {
          failures.push('discovery cards do not use two columns');
        }
        if (metrics.action) {
          if (Math.abs(metrics.action.x - metrics.main.x - metrics.gutter) > 1 ||
              Math.abs(metrics.action.right - metrics.main.right + metrics.gutter) > 1) failures.push('fixed action alignment');
          if (metrics.actionBottom > metrics.footerTop) failures.push('fixed action overlaps footer');
        }
        if (errors.length) failures.push('runtime errors');
        results.push({ width, name, url: page.url(), ...metrics, failures, errors: [...errors] });
        if (['home', 'login', 'signup', 'create', 'create-region', 'result', 'result-edit', 'recommend', 'search-results'].includes(name)) {
          await page.screenshot({ path: path.join(screenshotDir, `${name}-${width}.png`), fullPage: false });
        }
        console.log(`${theme} ${width} ${name}: app=${metrics.app.width} content=${metrics.main.width} ${failures.length ? failures.join(', ') : 'PASS'}`);
      }
      await context.close();
    }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  }
  console.log(JSON.stringify({ cases: results.length, failed: results.filter(x => x.failures.length).map(x => ({ width:x.width, name:x.name, failures:x.failures, overflow:x.overflow })) }));
  if (results.some(x => x.failures.length)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });

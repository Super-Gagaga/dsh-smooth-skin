import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (url) => readFile(new URL(url, import.meta.url), 'utf8');
const source = await read('../src/think.js');
const sandbox = {};
vm.runInNewContext(`${source}\nglobalThis.THINK_ART = THINK_ART;`, sandbox);
const art = sandbox.THINK_ART;
const LEVELS = ['off', 'low', 'high', 'max'];

test('the panel backdrop covers exactly the four reasoning levels', () => {
  assert.deepEqual(Object.keys(art), LEVELS);
  for (const level of LEVELS) {
    assert.match(art[level], /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/, `${level} is not an inline WebP`);
    const bytes = Buffer.from(art[level].slice('data:image/webp;base64,'.length), 'base64');
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'RIFF', `${level} is not a WebP container`);
    assert.equal(bytes.subarray(8, 12).toString('latin1'), 'WEBP', `${level} is not a WebP payload`);
    // A full-resolution source PNG would add megabytes to the client bundle.
    assert.ok(bytes.length <= 220 * 1024, `${level} is ${(bytes.length / 1024).toFixed(0)} KB; re-export it at 780px wide`);
  }
});

test('src/think.js mirrors the prepared cutouts byte for byte', async () => {
  for (const level of LEVELS) {
    const file = await readFile(new URL(`../assets/think/cutout/${level}.webp`, import.meta.url));
    assert.equal(art[level], `data:image/webp;base64,${file.toString('base64')}`, `${level} is stale; run node tools/export-think.mjs`);
  }
});

test('only the DeepSeek provider groups paint the backdrop', async () => {
  const composer = await read('../src/composer.js');
  // The artwork is DeepSeek's; other providers keep the plain panel.
  assert.match(composer, /function deepseekBackdrop\(group\)/);
  assert.match(composer, /\/deepseek\/i\.test\(`\$\{group\.id \|\| ''\} \$\{group\.name \|\| ''\}`\)/);
  assert.match(composer, /const backdrop = Boolean\(level && deepseekBackdrop\(group\)\)/);
  assert.match(composer, /backdrop && h\('div', \{ className: 'smooth-model-media'/, 'the media layer follows the provider check');
  // The level row and slider stay available for every model with reasoning efforts; the
  // row also carries the provider-default auto chip when the catalogue offers it.
  assert.match(composer, /\(levelName \|\| defaultOption\) && h\('div', \{ className: 'smooth-model-level'/);
});

test('the panel swaps the backdrop with the level and cross-fades the layers', async () => {
  const [composer, skin] = await Promise.all([read('../src/composer.js'), read('../src/skin.js')]);
  assert.match(composer, /const THINK_LEVELS = \['off', 'low', 'high', 'max'\]/);
  // Effort ids name the art first, so a rename in the Host still picks a picture.
  assert.match(composer, /const id = String\(efforts\[index\]\?\.id \|\| ''\)\.toLowerCase\(\);/);
  assert.match(composer, /if \(THINK_ART\[id\]\) return id;/);
  assert.match(composer, /className: 'smooth-model-media'/);
  assert.match(composer, /'data-active': key === level \? 'true' : undefined/, 'the current level is the visible layer');
  assert.match(skin, /\.smooth-model-media\{[^}]*height:168px/);
  assert.match(skin, /\.smooth-model-art\{[^}]*opacity:0[^}]*transition:opacity \.28s/, 'layers cross-fade');
  assert.match(skin, /\.smooth-model-art\[data-active="true"\]\{opacity:1\}/);
  assert.match(skin, /\.smooth-model-media::after\{[^}]*var\(--smooth-model-fade\)/, 'the art fades into the panel colour');
  assert.match(skin, /prefers-reduced-motion:reduce\)\{body\[data-smooth-skin\] \.smooth-model-art\{transition:none\}\}/);
});

test('the model catalogue slides in from the effort page, like the account help page', async () => {
  const [composer, skin] = await Promise.all([read('../src/composer.js'), read('../src/skin.js')]);
  // The old floating menu is gone: both pages live in one panel and slide over each other.
  assert.doesNotMatch(composer, /smooth-model-menu/);
  assert.doesNotMatch(composer, /data-smooth-model-menu/);
  assert.match(composer, /className: 'smooth-model-panel-viewport'/);
  assert.match(composer, /'data-pane': 'effort'/);
  assert.match(composer, /'data-pane': 'models'/);
  assert.match(composer, /'data-active': view === 'effort' \? 'true' : undefined/);
  assert.match(composer, /'data-active': view === 'models' \? 'true' : undefined/);
  assert.match(composer, /'data-view': view/);
  // The model page is entered from the model name and left by picking or going back.
  assert.match(composer, /onOpenModels: \(\) => setView\('models'\)/);
  assert.match(composer, /onDone: \(\) => setView\('effort'\)/);
  assert.match(composer, /onBack: \(\) => setView\('effort'\)/);
  // The panel height follows the page on screen, otherwise the bottom-anchored panel jumps.
  assert.match(composer, /new ResizeObserver\(update\)/);
  assert.match(skin, /\.smooth-model-panel-viewport\{[^}]*transition:height \.26s/);
  assert.match(skin, /\.smooth-model-panel-pane\{[^}]*opacity:0[^}]*transform:translateX\(14px\)[^}]*transition:opacity \.2s ease,transform \.26s/);
  assert.match(skin, /\.smooth-model-panel-pane\[data-pane="effort"\]\{transform:translateX\(-14px\)\}/);
  assert.match(skin, /\.smooth-model-panel-pane\[data-active="true"\]\{opacity:1;pointer-events:auto;transform:none\}/);
  assert.match(skin, /prefers-reduced-motion:reduce\)\{body\[data-smooth-skin\] \.smooth-model-panel\{animation:none\}body\[data-smooth-skin\] \.smooth-model-panel-viewport,body\[data-smooth-skin\] \.smooth-model-panel-pane\{transition:none\}\}/);
});

test('the model page shares the panel surface instead of the host menu card', async () => {
  const [composer, skin] = await Promise.all([read('../src/composer.js'), read('../src/skin.js')]);
  // A role="menu" container inherits the host's menu chrome (its own fill and radius),
  // which made the list look like a card inside the panel. Radio semantics keep the
  // list a plain list, and the reset wins over any inherited menu surface.
  // The list is plain buttons under a named group, not a listbox: nothing here implements
  // the listbox focus contract (no roving focus, no aria-activedescendant), and a listbox
  // that never owns focus lies to assistive tech. The current row keeps both its styling
  // hook and an ARIA statement of being current.
  assert.match(composer, /className: 'smooth-git-list', role: 'group'/);
  assert.match(composer, /'data-current': selected \? 'true' : undefined/);
  assert.match(composer, /'aria-current': selected \? 'true' : undefined/);
  assert.doesNotMatch(composer, /role: 'listbox'/, 'a listbox must implement focus management or not claim to be one');
  // One pick locks its own row, not the whole catalogue: a blanket `disabled: busy` froze
  // every provider's rows for the length of a round trip, so the key is the provider and
  // model together and the handler still guards a second click.
  assert.match(composer, /setPicking\(`\$\{group\.id\}:\$\{model\.id\}`\)/, 'the picked row is keyed by provider and model');
  assert.match(composer, /disabled: busy && picking === `\$\{group\.id\}:\$\{model\.id\}`/, 'only the picked row locks');
  assert.doesNotMatch(composer, /disabled: busy,\n/, 'no row disables on busy alone');
  assert.match(composer, /onClick: \(\) => \{ if \(busy\) return; pick\(group, model\); \}/, 'a second click while busy is ignored');
  assert.match(skin, /\.smooth-model-list \.smooth-git-list\{[^}]*border:0;border-radius:0;background:transparent;box-shadow:none/);
});

test('a held drag rides the pointer, then settles on the nearest stop', async () => {
  const composer = await read('../src/composer.js');
  // The pointer writes the ratio straight onto the element (no re-render per move), and
  // the store's own ratio only takes over again when nothing is held.
  assert.match(composer, /const setPointerRatio = \(clientX\) => \{[\s\S]*?style\.setProperty\('--smooth-model-ratio', String\(pointerRatio\)\)/);
  assert.match(composer, /if \(dragRef\.current\) return;\s*sliderRef\.current\?\.style\.setProperty\('--smooth-model-ratio', String\(ratio\)\)/);
  assert.match(composer, /const restoreRatio = \(\) => \{[\s\S]*?classList\.remove\('is-dragging'\)[\s\S]*?setProperty\('--smooth-model-ratio', String\(ratioRef\.current\)\)/);
  // The first paint already sits on the stored stop: the mount writes the ratio with the
  // transition off, then hands the class back on the next frame.
  assert.match(composer, /React\.useLayoutEffect\(\(\) => \{[\s\S]*?setProperty\('--smooth-model-ratio', String\(ratioRef\.current\)\)[\s\S]*?classList\.add\('is-dragging'\)[\s\S]*?remove\('is-dragging'\)/);
  // Nothing else may own the property, or React and the pointer would fight over it.
  assert.ok(!/style: \{ '--smooth-model-ratio'/.test(composer), 'the ratio must not ride the React style prop');
});

test('the level is named above the model selector instead of under the slider', async () => {
  const [composer, skin] = await Promise.all([read('../src/composer.js'), read('../src/skin.js')]);
  // The tick labels are gone; the level name sits above the model trigger and re-enters
  // whenever the thumb lands on another level.
  assert.doesNotMatch(composer, /smooth-model-stop/, 'no tick labels or per-stop buttons');
  assert.doesNotMatch(skin, /\.smooth-model-stop/);
  const level = composer.match(/\(levelName \|\| defaultOption\) && h\('div', \{ className: 'smooth-model-level'[^]*?\),\n\s*h\('button', \{/);
  assert.ok(level, 'the level row is rendered before the model trigger');
  assert.match(level[0], /key: levelName, className: 'smooth-model-level-name'/);
  // The range is the single announcement channel: it carries the level's position and its
// name. A polite live region beside it spoke the same change a second time.
  assert.doesNotMatch(level[0], /'aria-live'/, 'the range alone announces the level');
  assert.match(composer, /'aria-valuenow': index,/, 'the range states its position');
  assert.match(composer, /'aria-valuetext': levelName/, 'the range announces the level too');
  assert.match(skin, /\.smooth-model-level\{[^}]*justify-content:center/);
  assert.match(skin, /\.smooth-model-level-name\{[^}]*animation:smooth-model-level-in/);
  assert.match(skin, /@keyframes smooth-model-level-in\{/);
  assert.match(skin, /\.smooth-model-slider\{[^}]*padding:0;/, 'the strip that held the labels is gone');
});


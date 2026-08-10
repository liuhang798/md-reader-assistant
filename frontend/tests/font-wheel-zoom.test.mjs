import assert from 'node:assert/strict';
import test from 'node:test';

let fontWheelZoom = {};
try {
  fontWheelZoom = await import('../src/font-wheel-zoom.js');
} catch {
  // The first TDD run intentionally reaches this branch before the module exists.
}

const direction = event => fontWheelZoom.previewWheelZoomDirection?.(event);

test('Windows and Linux preview zoom uses Ctrl plus the mouse wheel', () => {
  assert.equal(direction({ platform: 'windows', ctrlKey: true, metaKey: false, deltaY: -120 }), 1);
  assert.equal(direction({ platform: 'linux', ctrlKey: true, metaKey: false, deltaY: 120 }), -1);
  assert.equal(direction({ platform: 'windows', ctrlKey: false, metaKey: true, deltaY: -120 }), 0);
});

test('macOS preview zoom uses Command plus the mouse wheel', () => {
  assert.equal(direction({ platform: 'darwin', ctrlKey: false, metaKey: true, deltaY: -120 }), 1);
  assert.equal(direction({ platform: 'darwin', ctrlKey: false, metaKey: true, deltaY: 120 }), -1);
  assert.equal(direction({ platform: 'darwin', ctrlKey: true, metaKey: false, deltaY: -120 }), 0);
});

test('ordinary preview scrolling does not change text size', () => {
  assert.equal(direction({ platform: 'windows', ctrlKey: false, metaKey: false, deltaY: -120 }), 0);
  assert.equal(direction({ platform: 'darwin', ctrlKey: false, metaKey: false, deltaY: 120 }), 0);
  assert.equal(direction({ platform: 'windows', ctrlKey: true, metaKey: false, deltaY: 0 }), 0);
});

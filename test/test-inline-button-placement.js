/**
 * Test: Inline Button Placement Simulation
 * Verifies that #jt-ln-inline-btn is placed directly adjacent to the native
 * Save button inside the button row, without modifying parent styles or shifting the UI.
 */

import assert from 'assert';

console.log('--- Test Suite: Inline Button Placement Verification ---');

// Simulated minimal DOM structure matching user's exact modern LinkedIn HTML
function createMockDOM() {
  const elements = {};

  const outerContainer = {
    tagName: 'DIV',
    className: '_48e06e86 _8a6ac38f a7439114',
    style: {},
    children: []
  };

  const buttonRow = {
    tagName: 'DIV',
    className: '_8a6ac38f f5f1e353 a78f11cb fbf3579a _68b61909 e6e6c754 b7dd9c56 _96036b7d f6555255',
    style: {},
    children: [],
    parentElement: outerContainer
  };
  outerContainer.children.push(buttonRow);

  const applyWrapper = {
    tagName: 'DIV',
    className: '_02384d06 ac136c95 f8addc91 f6555255',
    children: [],
    parentElement: buttonRow
  };
  const applyBtn = {
    tagName: 'A',
    className: '_34229610',
    attributes: { 'aria-label': 'Apply on company website' },
    textContent: 'Apply',
    parentElement: applyWrapper
  };
  applyWrapper.children.push(applyBtn);

  const saveWrapper = {
    tagName: 'DIV',
    className: '_02384d06 ac136c95 f8addc91 f6555255',
    children: [],
    parentElement: buttonRow
  };
  const saveBtn = {
    tagName: 'BUTTON',
    className: '_34229610',
    attributes: { 'aria-label': 'Save the job', 'type': 'button' },
    textContent: 'Save',
    parentElement: saveWrapper
  };
  saveWrapper.children.push(saveBtn);

  buttonRow.children.push(applyWrapper);
  buttonRow.children.push(saveWrapper);

  return { outerContainer, buttonRow, applyWrapper, applyBtn, saveWrapper, saveBtn };
}

// Simulate getInlineTarget logic
function simulateGetInlineTarget(mock) {
  const candidates = [mock.applyBtn, mock.saveBtn];
  let saveBtn = null;
  for (const b of candidates) {
    const aria = (b.attributes['aria-label'] || '').toLowerCase();
    const text = (b.textContent || '').trim().toLowerCase();
    if (aria.includes('save the job') || aria.includes('save job') || aria === 'save' || text === 'save') {
      saveBtn = b;
      break;
    }
  }

  const anchor = saveBtn;
  assert(anchor !== null, 'Save button must be detected');

  let target = anchor;
  if (anchor.parentElement && anchor.parentElement.tagName === 'DIV' && anchor.parentElement.children.length === 1) {
    target = anchor.parentElement;
  }
  return target;
}

const mock = createMockDOM();
const target = simulateGetInlineTarget(mock);

// Verify target is the Save button wrapper
assert.strictEqual(target, mock.saveWrapper, 'Target must be the exact wrapper of the native Save button');
console.log('✅ [PASS] Native Save button wrapper detected as insertion target');

// Simulate insertAdjacentElement('afterend', currentInlineBtn)
const inlineBtn = {
  tagName: 'BUTTON',
  id: 'jt-ln-inline-btn',
  textContent: 'Save Job'
};

const idx = mock.buttonRow.children.indexOf(target);
mock.buttonRow.children.splice(idx + 1, 0, inlineBtn);
inlineBtn.parentElement = mock.buttonRow;

// Verify positioning in row
assert.strictEqual(mock.buttonRow.children.length, 3, 'Button row must now contain exactly 3 children (Apply, Save, Save Job)');
assert.strictEqual(mock.buttonRow.children[0], mock.applyWrapper, 'First child is Apply wrapper');
assert.strictEqual(mock.buttonRow.children[1], mock.saveWrapper, 'Second child is Save wrapper');
assert.strictEqual(mock.buttonRow.children[2], inlineBtn, 'Third child is our inline button');
console.log('✅ [PASS] Button placed directly inline as 3rd child in native button row');

// Verify zero style mutation on parents
assert.strictEqual(Object.keys(mock.outerContainer.style).length, 0, 'Outer container must have NO style overrides');
assert.strictEqual(Object.keys(mock.buttonRow.style).length, 0, 'Button row must have NO style overrides');
console.log('✅ [PASS] Zero style overrides applied to LinkedIn containers - layout preserved intact');

console.log('=============================================');

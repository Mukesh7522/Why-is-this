import { classifyConstraint } from '../survivorship/parser';

test('classifyConstraint identifies infra tag', () => {
  expect(classifyConstraint({ description: 'pool size 10', tag: '#infra', survivorshipCheck: true })).toBe('#infra');
});

test('classifyConstraint identifies vendor tag', () => {
  expect(classifyConstraint({ description: 'stripe v2 API', tag: '#vendor', survivorshipCheck: true })).toBe('#vendor');
});

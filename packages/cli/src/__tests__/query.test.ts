import { parseFileArg } from '../commands/query';

test('parseFileArg single line', () => {
  expect(parseFileArg('src/foo.ts:42')).toEqual({ file: 'src/foo.ts', start: 42, end: 42 });
});

test('parseFileArg range', () => {
  expect(parseFileArg('src/foo.ts:10-20')).toEqual({ file: 'src/foo.ts', start: 10, end: 20 });
});

test('parseFileArg throws on bad format', () => {
  expect(() => parseFileArg('src/foo.ts')).toThrow('Invalid format');
});

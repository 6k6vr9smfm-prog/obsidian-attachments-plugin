import { DEFAULT_SETTINGS } from '../src/settings';

describe('smoke test', () => {
  it('loads default settings', () => {
    expect(DEFAULT_SETTINGS.twinFolder).toBe('attachments/twins');
    expect(DEFAULT_SETTINGS.watchedFolders).toEqual(['attachments/']);
  });
});

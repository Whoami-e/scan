import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

import {captureDocument, importDocuments} from '../../src/native/mediaPicker';

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

test('normalizes a captured asset into a local image path', async () => {
  (launchCamera as jest.Mock).mockResolvedValue({assets: [{uri: 'file:///tmp/captured.jpg'}]});

  await expect(captureDocument()).resolves.toEqual({
    cancelled: false,
    imagePaths: ['file:///tmp/captured.jpg'],
  });
  expect(launchCamera).toHaveBeenCalledWith(expect.objectContaining({mediaType: 'photo', cameraType: 'back'}));
});
test('preserves ordered gallery selection and cancellation', async () => {
  (launchImageLibrary as jest.Mock)
    .mockResolvedValueOnce({assets: [{uri: 'content://one'}, {uri: 'content://two'}]})
    .mockResolvedValueOnce({didCancel: true});

  await expect(importDocuments()).resolves.toEqual({
    cancelled: false,
    imagePaths: ['content://one', 'content://two'],
  });
  await expect(importDocuments()).resolves.toEqual({cancelled: true, imagePaths: []});
  expect(launchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({selectionLimit: 20, mediaType: 'photo'}));
});

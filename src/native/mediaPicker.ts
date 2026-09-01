import {
  Asset,
  CameraOptions,
  ImageLibraryOptions,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';

export interface MediaPickerResult {
  cancelled: boolean;
  imagePaths: string[];
  error?: string;
}

function normalizeAssets(assets?: Asset[]): MediaPickerResult {
  return {
    cancelled: false,
    imagePaths: (assets ?? [])
      .map(asset => asset.uri)
      .filter((uri): uri is string => Boolean(uri)),
  };
}

export function normalizeMediaResponse(response: {
  didCancel?: boolean;
  errorCode?: string;
  errorMessage?: string;
  assets?: Asset[];
}): MediaPickerResult {
  if (response.didCancel) return {cancelled: true, imagePaths: []};
  const error = normalizeError(response.errorCode, response.errorMessage);
  if (error) return {cancelled: false, imagePaths: [], error};
  return normalizeAssets(response.assets);
}

function normalizeError(code?: string, message?: string): string | undefined {
  if (!code) return undefined;
  if (code === 'permission') return '相机权限已拒绝';
  if (code === 'camera_unavailable') return '相机不可用，请检查设备后重试';
  return message ?? '媒体选择失败，请重试';
}

export async function captureDocument(): Promise<MediaPickerResult> {
  const options: CameraOptions = {
    cameraType: 'back',
    includeExtra: false,
    mediaType: 'photo',
    quality: 0.9,
    saveToPhotos: false,
  };
  const response = await launchCamera(options);
  return normalizeMediaResponse(response);
}

export async function importDocuments(): Promise<MediaPickerResult> {
  const options: ImageLibraryOptions = {
    includeExtra: false,
    mediaType: 'photo',
    selectionLimit: 20,
  };
  const response = await launchImageLibrary(options);
  return normalizeMediaResponse(response);
}

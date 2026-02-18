import { ApiClient } from './client';

export interface TryOnRequest {
  product_id: string;
  use_model?: boolean;
  user_photo?: File;
}

export interface TryOnResponse {
  try_on_url: string;
  cached?: boolean;
}

/**
 * Generate virtual try-on image
 */
export async function generateTryOn(
  productId: string,
  useModel: boolean,
  userPhoto?: File
): Promise<TryOnResponse> {
  const formData = new FormData();
  formData.append('product_id', productId);
  formData.append('use_model', String(useModel));
  if (userPhoto) {
    formData.append('user_photo', userPhoto);
  }

  const response = await ApiClient.postFormData<TryOnResponse>('/ai/try-on', formData);

  return response;
}

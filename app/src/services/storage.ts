// Cloudinary configuration
const CLOUD_NAME = 'dbhsyxwot';
const UPLOAD_PRESET = 'teamhub_chat';

// Upload image to Cloudinary
export async function uploadChatImage(
  file: File,
  userId: string,
  channelId: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `chat-images/${channelId}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  return data.secure_url;
}

// Upload multiple images
export async function uploadChatImages(
  files: File[],
  userId: string,
  channelId: string
): Promise<string[]> {
  const uploadPromises = files.map(file => uploadChatImage(file, userId, channelId));
  return Promise.all(uploadPromises);
}

// Validate image file
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB (Cloudinary free tier limit)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, GIF, and WebP images are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be less than 10MB' };
  }

  return { valid: true };
}

/* eslint-disable @typescript-eslint/no-unused-vars */
import * as tf from 'dist/tfjs.esm.js';
type BoundingBox = [number, number, number, number];

/**
 * Scale and position the bounding box for the original frame before cropping and resizing
 */
export const scaleAndPositionBoundingBox = (
  box: BoundingBox,
  xRatio: number,
  yRatio: number,
  faceBox: BoundingBox | null
): BoundingBox => {
  let [y1, x1, y2, x2] = box;

  x1 = x1 / xRatio;
  y1 = y1 / yRatio;
  x2 = x2 / xRatio;
  y2 = y2 / yRatio;

  if (faceBox) {
    const [faceX1, faceY1] = faceBox;
    x1 += faceX1;
    y1 += faceY1;
    x2 += faceX1;
    y2 += faceY1;
  }

  return [Math.round(y1), Math.round(x1), Math.round(y2), Math.round(x2)];
};

/**
 * Create a bounding box given center point and dimension
 */
export const createBoundingBoxFromCenter = (
  centerX: number,
  centerY: number,
  dimension: number
): BoundingBox => {
  const halfDim = dimension / 2;

  const x1 = centerX - halfDim;
  const y1 = centerY - halfDim;
  const x2 = centerX + halfDim;
  const y2 = centerY + halfDim;

  return [Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2)];
};

/**
 * Crop a tensor based on a given bounding box
 */
export function cropTensor(tensor: tf.Tensor3D, box: BoundingBox): tf.Tensor3D {
  const [y1, x1, y2, x2] = box;
  const [height, width] = tensor.shape.slice(0, 2);

  console.log('cropTensor input:', { tensorShape: tensor.shape, box });

  // Ensure box coordinates are within tensor bounds
  const safeY1 = Math.max(0, Math.min(y1, height - 1));
  const safeX1 = Math.max(0, Math.min(x1, width - 1));
  const safeY2 = Math.max(safeY1 + 1, Math.min(y2, height));
  const safeX2 = Math.max(safeX1 + 1, Math.min(x2, width));

  console.log('Adjusted crop box:', [safeY1, safeX1, safeY2, safeX2]);

  try {
    const croppedTensor = tensor.slice(
      [Math.floor(safeY1), Math.floor(safeX1), 0],
      [
        Math.ceil(safeY2) - Math.floor(safeY1),
        Math.ceil(safeX2) - Math.floor(safeX1),
        3,
      ]
    );
    console.log('Cropped tensor shape:', croppedTensor.shape);
    return croppedTensor;
  } catch (error) {
    console.error('Error in cropTensor:', error);
    // Return the original tensor if cropping fails
    return tensor;
  }
}

/**
 * Convert a tensor to ImageData
 */
export const convertTensorToImageData = async (
  tensor: tf.Tensor3D,
  isNormalized: boolean = false
): Promise<ImageData> => {
  if (tensor.rank !== 3) {
    throw new Error('Tensor must be of shape [height, width, channels]');
  }

  const [height, width, numChannels] = tensor.shape;
  const tensorData = await tensor.data();

  const imageData = new ImageData(width, height);
  for (let i = 0; i < height * width; i++) {
    const j = i * 4;
    const k = i * numChannels;
    const multiplier = isNormalized ? 255 : 1;
    imageData.data[j] = tensorData[k] * multiplier;
    imageData.data[j + 1] = tensorData[k + 1] * multiplier;
    imageData.data[j + 2] = tensorData[k + 2] * multiplier;
    imageData.data[j + 3] = 255;
  }

  return imageData;
};

/**
 * Convert a tensor to a downloadable image
 */
export const tensorToDownloadableImage = async (
  tensor: tf.Tensor4D,
  filename: string = 'image.png'
): Promise<void> => {
  const tensorData = await tensor.data();

  const [_, height, width, numChannels] = tensor.shape;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get 2D context from canvas');
  }

  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < height * width; i++) {
    const j = i * 4;
    const k = i * numChannels;
    imageData.data[j] = tensorData[k] * 255;
    imageData.data[j + 1] = tensorData[k + 1] * 255;
    imageData.data[j + 2] = tensorData[k + 2] * 255;
    imageData.data[j + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  const dataURL = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
};

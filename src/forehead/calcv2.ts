/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable comma-dangle */
/* eslint-disable camelcase */
/* eslint-disable no-use-before-define */

import * as tf from 'dist/tfjs.esm.js';
import { Box, ForeheadResult } from 'src/result';
import type { GraphModel, Tensor, Tensor4D, Tensor3D } from '../tfjs/types';

import { cropTensor, scaleAndPositionBoundingBox } from './tensorType';

const labels = ['ForeheadRect', 'Forehead'];

const numClass = labels.length;

type BoundingBox = [number, number, number, number];

interface PreprocessResult {
  frame: Tensor3D;
  input: Tensor4D;
  xRatio: number;
  yRatio: number;
}

interface DetectOptions {
  videoSource: Tensor4D;
  model: GraphModel<string | tf.io.IOHandler> | null;
  inputShape: number[];
  faceBox?: BoundingBox | null;
}

export const detect = async ({
  videoSource,
  model,
  inputShape,
  faceBox = null,
}: DetectOptions): Promise<ForeheadResult> => {
  const result: ForeheadResult = { numOfDetections: 0 };

  try {
    const [modelWidth, modelHeight] = inputShape.slice(1, 3);

    // tf.engine().startScope();
    // const { frame, input, xRatio, yRatio } = await preprocess(
    const { input, xRatio, yRatio } = await preprocess(
      videoSource,
      modelWidth,
      modelHeight,
      faceBox
    );
    if (!model) return result;
    // const frameData = await convertTensorToImageData(frame);
    const res = model.execute(input) as Tensor;
    console.log('model result', res);

    const transRes = tf.transpose(res, [0, 2, 1]);

    const numDetections = transRes.shape[2];
    if (numDetections === 0) {
      tf.dispose([res, transRes]);
      // callback();
      // tf.engine().endScope();
      return result;
    }

    const [scores, classes] = tf.tidy(() => {
      const sliced = tf.slice(transRes, [0, 0, 4], [-1, -1, numClass]);
      const rawScores = tf.squeeze(sliced, [0]);

      return [tf.max(rawScores, 1), tf.argMax(rawScores, 1)];
    });

    const boxes = tf.tidy(() => {
      const wSlice = tf.slice(transRes, [0, 0, 2], [-1, -1, 1]);
      const hSlice = tf.slice(transRes, [0, 0, 3], [-1, -1, 1]);

      const x1 = tf.sub(
        tf.slice(transRes, [0, 0, 0], [-1, -1, 1]),
        tf.div(wSlice, 2)
      );
      const y1 = tf.sub(
        tf.slice(transRes, [0, 0, 1], [-1, -1, 1]),
        tf.div(hSlice, 2)
      );
      const x2 = tf.add(x1, wSlice);
      const y2 = tf.add(y1, hSlice);
      const contacted = tf.concat([y1, x1, y2, x2], 2);
      return tf.squeeze(contacted);
    });

    const boxes_data = boxes.dataSync();
    const scores_data = scores.dataSync();
    const classes_data = classes.dataSync();
    let filteredIndices: number[] = [];
    let maxConfIndex = -1;
    let maxConf = 0.3;

    for (let i = 0; i < classes_data.length; i++) {
      if (classes_data[i] === 0) {
        if (scores_data[i] > maxConf) {
          maxConf = scores_data[i];
          maxConfIndex = i;
          filteredIndices.push(i);
        }
      }
    }

    if (maxConfIndex !== -1) {
      filteredIndices = [maxConfIndex];
    }

    const filtered_boxes_data = filteredIndices.reduce((acc: number[], i) => {
      const box = Array.from(
        boxes_data.slice(i * 4, (i + 1) * 4)
      ) as BoundingBox;
      const adjusted_box = scaleAndPositionBoundingBox(
        box,
        xRatio,
        yRatio,
        faceBox
      );
      acc.push(...adjusted_box);
      return acc;
    }, []);
    const filtered_scores_data = filteredIndices.map((i) => scores_data[i]);
    const filtered_classes_data = filteredIndices.map((i) => classes_data[i]);

    // if (useMask) {
    //   createMaskedFrame({
    //     videoSource,
    //     boxes_data: filtered_boxes_data,
    //     scores_data: filtered_scores_data,
    //     classes_data: filtered_classes_data,
    //     frame: frameData,
    //   });
    // } else {
    //   renderBoxes({
    //     videoSource,
    //     boxes_data: filtered_boxes_data,
    //     scores_data: filtered_scores_data,
    //     classes_data: filtered_classes_data,
    //     frame: frameData,
    //   });
    // }

    // tf.dispose([res, transRes, boxes, scores, classes]);
    result['box'] = filtered_boxes_data as Box;
    result['score'] = filtered_scores_data;
    result['class'] = filtered_classes_data;

    return result;
    // callback(videoSource);

    // tf.engine().endScope();
  } catch (error) {
    console.error('Error during detection:', error);
    return result;
  }
};

const preprocess = async (
  tensor: tf.Tensor4D,
  modelWidth: number,
  modelHeight: number,
  faceBox: BoundingBox | null
): Promise<PreprocessResult> => {
  let xRatio: number = 0;
  let yRatio: number = 0;

  // Remove the batch dimension if present
  let imageTensor = tf.squeeze(tensor) as tf.Tensor3D;

  // Ensure tensor has 4 channels (RGBA)
  const [height, width, channels] = imageTensor.shape;
  if (channels === 1) {
    // Grayscale to RGBA
    imageTensor = tf.stack(
      [
        imageTensor,
        imageTensor,
        imageTensor,
        tf.onesLike(imageTensor).mul(255),
      ],
      -1
    ) as Tensor3D;
  } else if (channels === 3) {
    // RGB to RGBA
    const alphaChannel = tf.ones([height, width, 1]);
    const alphaChannel2 = tf.mul(alphaChannel, 255);
    imageTensor = tf.concat([imageTensor, alphaChannel2], -1) as Tensor3D;
  }

  // Convert tensor data to Uint8ClampedArray
  const flattenedArray = new Uint8ClampedArray(
    imageTensor.dataSync().map((value) => Math.round(value)) // Ensure values are in [0, 255]
  );

  // Create ImageData
  const imageData = new ImageData(flattenedArray, width, height);
  const imageBitmap = await createImageBitmap(imageData);

  // Create ImageBitmap from the frame
  const [frame, input] = tf.tidy(() => {
    const img = tf.browser.fromPixels(imageBitmap);
    console.log('Initial tensor shape:', img.shape);

    let croppedImg: tf.Tensor3D;
    if (faceBox) {
      console.log('Attempting to crop with faceBox:', faceBox);
      try {
        croppedImg = cropTensor(img, faceBox);
      } catch (error) {
        console.error('Error during cropTensor:', error);
        croppedImg = img;
      }
    } else {
      croppedImg = img;
    }
    console.log('Cropped image shape:', croppedImg.shape);

    const [h, w] = croppedImg.shape.slice(0, 2);
    const aspectRatio = w / h;

    let newWidth: number;
    let newHeight: number;
    if (w > h) {
      newWidth = modelWidth;
      newHeight = modelWidth / aspectRatio;
    } else {
      newHeight = modelHeight;
      newWidth = modelHeight * aspectRatio;
    }

    const imgResized = tf.image.resizeBilinear(croppedImg, [
      Math.round(newHeight),
      Math.round(newWidth),
    ]);
    xRatio = modelWidth / w;
    yRatio = modelHeight / h;

    const padHeight = modelHeight - Math.round(newHeight);
    const padWidth = modelWidth - Math.round(newWidth);

    const imgPadded = tf.pad(imgResized, [
      [Math.floor(padHeight / 2), Math.ceil(padHeight / 2)],
      [Math.floor(padWidth / 2), Math.ceil(padWidth / 2)],
      [0, 0],
    ]);
    const dived = tf.div(imgPadded, 255.0);
    const expand = tf.expandDims(dived, 0) as Tensor4D;
    // const imgPadded = imgResized.pad([
    //   [Math.floor(padHeight / 2), Math.ceil(padHeight / 2)],
    //   [Math.floor(padWidth / 2), Math.ceil(padWidth / 2)],
    //   [0, 0],
    // ]);

    return [img, expand];
  });

  return { frame, input, xRatio, yRatio };
};

/* eslint-disable comma-dangle */
/**
 * Forehead model implementation
 */
import { ForeheadResult } from '../result';
import { log, now } from '../util/util';
import { loadModel } from '../tfjs/load';
import type { GraphModel, Tensor4D } from '../tfjs/types';
import type { Config } from '../config';
import { env } from '../util/env';
// import { detect } from './calc';
import { detect } from './calcv2';
import { createBoundingBoxFromCenter } from './tensorType';

let model: GraphModel | null;
let last: ForeheadResult;
// let lastCount = 0;
// eslint-disable-next-line prefer-const
let lastTime = 0;
let skipped = Number.MAX_SAFE_INTEGER;
// let inputSize = 0;

export async function load(config: Config): Promise<GraphModel> {
  if (env.initial) model = null;
  if (!model) model = await loadModel(config.forehead.modelPath);
  else if (config.debug) log('cached model:', model['modelUrl']);
  return model;
}

export async function predict(
  input: Tensor4D,
  config: Config
): Promise<ForeheadResult> {
  if (!model?.['executor']) return last;
  const skipTime = (config.object.skipTime || 0) > now() - lastTime;
  const skipFrame = skipped < (config.object.skipFrames || 0);
  if (config.skipAllowed && skipTime && skipFrame) {
    skipped++;
    return last;
  }
  skipped = 0;

  return new Promise(async (resolve) => {
    // Create an OffscreenCanvas and draw the imageBitmap onto it
    // const canvas = new OffscreenCanvas(input.width, input.height);
    // const context = canvas.getContext('2d');
    // context!.drawImage(input, 0, 0);
    // context!.imageSmoothingEnabled = true;
    // context!.imageSmoothingQuality = 'high';
    // const faceBox = createBoundingBoxFromCenter(
    //   canvas.width / 2,
    //   canvas.height / 2,
    //   640
    // );
    // const faceBox = createBoundingBoxFromCenter(input.shape[1] / 2, input.shape[0] / 2, 640);

    // const obj = await detect({
    //   source: input,
    //   model: model,
    //   faceBox,
    // });shape
    const inputShape = model?.inputs[0].shape || [1, 640, 640, 3];
    const faceBox = createBoundingBoxFromCenter(inputShape[1] / 2, inputShape[2] / 2, 640);

    const obj = await detect({
      videoSource: input,
      model,
      inputShape,
      faceBox,
    });

    last = obj;

    resolve(obj);
  });
}

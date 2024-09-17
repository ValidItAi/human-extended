// /**
//  * Forehead model implementation
//  */

// import { log, now } from '../util/util';
// import { loadModel } from '../tfjs/load';
// import type { Tensor, Tensor4D, GraphModel } from '../tfjs/types';
// import type { Config } from '../config';
// import { env } from '../util/env';
// import { ForeheadResult } from 'src/result';
// import { detect } from './v1/detect';
// import { createBoundingBoxFromCenter, Tensor3D } from './v1/tensor';

// let model: GraphModel | null;
// let last: ForeheadResult[] = [];
// let lastCount = 0;
// let lastTime = 0;
// let skipped = Number.MAX_SAFE_INTEGER;
// let inputSize = 0;

// export async function load(config: Config): Promise<GraphModel> {
//   if (env.initial) model = null;
//   if (!model) model = await loadModel(config.forehead.modelPath);
//   else if (config.debug) log('cached model:', model['modelUrl']);
//   return model;
// }
// //Usually gets Tensor
// export async function predict(input: Tensor3D, config: Config): Promise<ForeheadResult[]> {
//   if (!model?.['executor']) return [];
//   const skipTime = (config.object.skipTime || 0) > (now() - lastTime);
//   const skipFrame = skipped < (config.object.skipFrames || 0);
//   if (config.skipAllowed && skipTime && skipFrame && (last.length > 0)) {
//     skipped++;
//     return last;
//   }
//   skipped = 0;

//   return new Promise(async (resolve) => {
//     // Create an OffscreenCanvas and draw the imageBitmap onto it
//     console.log("i'm here")
//     // const canvas = new OffscreenCanvas(input.width, input.height);
//     // const context = canvas.getContext('2d');
//     // context!.drawImage(input, 0, 0);
//     // context!.imageSmoothingEnabled = true;
//     // context!.imageSmoothingQuality = 'high';
//     // const faceBox = createBoundingBoxFromCenter(
//     //   canvas.width / 2,
//     //   canvas.height / 2,
//     //   640
//     // );
//     const faceBox = createBoundingBoxFromCenter(input.shape[1] / 2, input.shape[0] / 2, 640);

//     const obj = await detect({
//       source: input,
//       model: model,
//       faceBox,
//     });
//     last = obj;

//     resolve(obj);
//   });
// }

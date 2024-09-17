

// import { createMaskedFrame, renderBoxes } from './renderBox';
// import { cropTensor, convertTensorToImageData, scaleAndPositionBoundingBox } from './tensor';
// import { labels } from './types';
// import * as tf from 'dist/tfjs.esm.js';
// import type { Tensor, Tensor4D, GraphModel, Tensor3D } from '../../tfjs/types';
// import { Box, ForeheadResult } from 'src/result';

//   const numClass = labels.length;
  
//   type ImageSource = OffscreenCanvas;
//   type BoundingBox = [number, number, number, number];
  
//   interface PreprocessResult {
//     frame: Tensor3D;
//     input: Tensor4D;
//     xRatio: number;
//     yRatio: number;
//   }
  
//   const preprocess = async (
//     imageFrame: Tensor3D,
//     modelWidth: number,
//     modelHeight: number,
//     faceBox: BoundingBox | null
//   ): Promise<PreprocessResult> => {
//     let xRatio: number = 0,
//       yRatio: number = 0;
  
//     // Create ImageBitmap from the frame
//     // const imageBitmap =
//     //   imageFrame instanceof VideoFrame
//     //     ? await createImageBitmap(imageFrame)
//     //     : await createImageBitmap(
//     //         imageFrame,
//     //         0,
//     //         0,
//     //         imageFrame.width,
//     //         imageFrame.height
//     //       );
  
//     const [frame, input] = tf.tidy(() => {
//       // const img = browser.fromPixels(imageFrame);
//       // console.log('Initial tensor shape:', img.shape);
  
//       let croppedImg: Tensor3D;
//       if (faceBox) {
//         console.log('Attempting to crop with faceBox:', faceBox);
//         try {
//           croppedImg = cropTensor(imageFrame, faceBox);
//         } catch (error) {
//           console.error('Error during cropTensor:', error);
//           croppedImg = imageFrame;
//         }
//       } else {
//         croppedImg = imageFrame;
//       }
//       console.log('Cropped image shape:', croppedImg.shape);
  
//       const [h, w] = croppedImg.shape.slice(0, 2);
//       const aspectRatio = w / h;
  
//       let newWidth: number, newHeight: number;
//       if (w > h) {
//         newWidth = modelWidth;
//         newHeight = modelWidth / aspectRatio;
//       } else {
//         newHeight = modelHeight;
//         newWidth = modelHeight * aspectRatio;
//       }
  
//       const imgResized = tf.image.resizeBilinear(croppedImg, [
//         Math.round(newHeight),
//         Math.round(newWidth),
//       ]);
//       xRatio = modelWidth / w;
//       yRatio = modelHeight / h;
  
//       const padHeight = modelHeight - Math.round(newHeight);
//       const padWidth = modelWidth - Math.round(newWidth);
//       console.log(typeof imgResized)
//       const imgPadded = imgResized.pad([
//         [Math.floor(padHeight / 2), Math.ceil(padHeight / 2)],
//         [Math.floor(padWidth / 2), Math.ceil(padWidth / 2)],
//         [0, 0],
//       ]);
  
//       return [imageFrame, imgPadded.div(255.0).expandDims(0)];
//     });
  
//     return { frame, input, xRatio, yRatio };
//   };
  
//   interface DetectOptions {
//     source: Tensor3D;
//     model?: GraphModel | null;
//     callback?: (videoSource?: OffscreenCanvas) => void;
//     useMask?: boolean;
//     faceBox?: BoundingBox | null;
//   }
  
//   export const detect = async ({
//     source,
//     model,
//     callback = () => {},
//     useMask = false,
//     faceBox = null,
//   }: DetectOptions): Promise<ForeheadResult[]> => {
//     let foreheadResult: ForeheadResult[] = [{ box: [0,0,0,0]}]
//     try {
//     if (!model) return foreheadResult;
//     const [modelWidth, modelHeight] = 
//         model.inputs[0].shape as number[] //ref to AIManager line 91
  
//     // engine().startScope();
  
//       const { frame, input, xRatio, yRatio } = await preprocess(
//         source,
//         modelWidth,
//         modelHeight,
//         faceBox
//       );
  
//       const frameData = await convertTensorToImageData(frame);
//       const res = model!.execute(input) as Tensor;

//       console.log('model result', res);
  
//       const transRes = res.transpose([0, 2, 1]);
  
//       const numDetections = transRes.shape[2];
//       if (numDetections === 0) {
//         // dispose([res, transRes]);
//         // callback();
//         // engine().endScope();
//         return foreheadResult;
//       }
  
//       const [scores, classes] = tf.tidy(() => {
//         const rawScores = transRes
//           .slice([0, 0, 4], [-1, -1, numClass])
//           .squeeze([0]);
//         return [rawScores.max(1), rawScores.argMax(1)];
//       });
  
//       const boxes = tf.tidy(() => {
//         const w = transRes.slice([0, 0, 2], [-1, -1, 1]);
//         const h = transRes.slice([0, 0, 3], [-1, -1, 1]);
//         const x1 = tf.sub(
//           transRes.slice([0, 0, 0], [-1, -1, 1]),
//           tf.div(w, 2)
//         );
//         const y1 = tf.sub(
//           transRes.slice([0, 0, 1], [-1, -1, 1]),
//           tf.div(h, 2)
//         );
//         const x2 = tf.add(x1, w);
//         const y2 = tf.add(y1, h);
//         return tf.concat([y1, x1, y2, x2], 2).squeeze();
//       });
  
//        const boxes_data = boxes.dataSync();
//       const scores_data = scores.dataSync();
//       const classes_data = classes.dataSync();
  
//       let filteredIndices: number[] = [];
//       let maxConfIndex = -1;
//       let maxConf = 0.3;
  
//       for (let i = 0; i < classes_data.length; i++) {
//         if (classes_data[i] === 0) {
//           if (scores_data[i] > maxConf) {
//             maxConf = scores_data[i];
//             maxConfIndex = i;
//             filteredIndices.push(i);
//           }
//         }
//       }
  
//       if (maxConfIndex !== -1) {
//         filteredIndices = [maxConfIndex];
//       }
  
//       const filtered_boxes_data = filteredIndices.reduce((acc: number[], i) => {
//         const box = Array.from(
//           boxes_data.slice(i * 4, (i + 1) * 4)
//         ) as BoundingBox;
//         const adjusted_box = scaleAndPositionBoundingBox(
//           box,
//           xRatio,
//           yRatio,
//           faceBox
//         );
//         acc.push(...adjusted_box);
//         return acc;
//       }, []);
//     //   const filtered_scores_data = filteredIndices.map((i) => scores_data[i]);
//     //   const filtered_classes_data = filteredIndices.map((i) => classes_data[i]);
  
//     //   if (useMask) {
//     //     createMaskedFrame({
//     //       videoSource,
//     //       boxes_data: filtered_boxes_data,
//     //       scores_data: filtered_scores_data,
//     //       classes_data: filtered_classes_data,
//     //       frame: frameData,
//     //     });
//     //   } else {
//     //     renderBoxes({
//     //       videoSource,
//     //       boxes_data: filtered_boxes_data,
//     //       scores_data: filtered_scores_data,
//     //       classes_data: filtered_classes_data,
//     //       frame: frameData,
//     //     });
//     //   }
  
//       tf.dispose([res, transRes, boxes, scores, classes]);
//       console.log("box?",filtered_boxes_data)
//       // engine().endScope();
//       foreheadResult = filtered_boxes_data as unknown as ForeheadResult[]
//       return foreheadResult;
//     } catch (error) {
//       console.error('Error during detection:', error);
//       return foreheadResult;
//     }
//   };
  
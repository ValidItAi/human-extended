
// import * as tf from 'dist/tfjs.esm.js';
// import { log, now } from '../util/util';
// import { loadModel } from '../tfjs/load';
// import type { GraphModel, Tensor, Tensor4D, Tensor3D } from '../tfjs/types';
// import type { Config } from '../config';
// import { env } from '../util/env';
// import { ForeheadResult } from 'src/result';

// import { convertTensorToImageData, cropTensor, scaleAndPositionBoundingBox } from './tensorType';

// const labels = [
//   "ForeheadRect", 
//   "Forehead"
// ]

// const numClass = labels.length;


// interface DetectOptions {
//     source: Tensor;
//     model: GraphModel<string | tf.io.IOHandler> | null;
//     inputShape: number[];
//     faceBox: any;
//   }
  
//    export const detect = async ({
//     source,
//     model,
//     inputShape,
//     faceBox
//   }: DetectOptions): Promise<ForeheadResult> => {
//     console.log(typeof source);
//     console.log(typeof model);
//     console.log(typeof inputShape);
//     let result: ForeheadResult = { numOfDetections: 0 }
//     if (!model) return result;
  
//     const [modelWidth, modelHeight] = inputShape.slice(1, 3); // get model width and height
//     const shape = source.shape;
//     // Get the original image dimensions TODO: THIS WAS ALERTED
//     const originalHeight = shape[0]
//     const originalWidth = shape[1]
//     console.log("H/W",originalHeight, originalWidth)
//     if (!originalHeight || !originalWidth) return result;
  
//     const { frame, input, xRatio, yRatio } = await preprocess(source, modelWidth, modelHeight, faceBox); // preprocess image
//     // const frameData = await convertTensorToImageData(frame); // convert tensor to image data //TODO: UNUSED
  
//     const res = model.execute(input) as Tensor; // inference model //TODO: Understand type here
//     console.log("model result", res);
  
//     const transRes = res.transpose([0, 2, 1]); // transpose result [b, det, n] => [b, n, det]
//     const numDetections = transRes.shape[2]; // number of detections
//     if (numDetections === 0) {
//       tf.dispose([res, transRes]); // clear memory
//       return result;
//     }
    
//     const [scores, classes] = tf.tidy(() => {
//       // class scores
//       const rawScores = transRes.slice([0, 0, 4], [-1, -1, numClass]).squeeze([0]);
//       return [rawScores.max(1), rawScores.argMax(1)];
//     }); // get max scores and classes index
//     // const highConfidenceMask = scores.greater(0.6); // filter indices with scores > 0.6
//     // const highConfidenceIndices = highConfidenceMask.where(highConfidenceMask); // get indices of high confidence scores
  
//     // if (highConfidenceIndices.shape[0] === 0) {
//     //   tf.dispose([res, transRes, scores]); // clear memory
//     //   callback();
//     //   tf.engine().endScope(); // end of scoping
//     //   return;
//     // }
  
//     const boxes = tf.tidy(() => {
//       const w = transRes.slice([0, 0, 2], [-1, -1, 1]); // get width
//       const h = transRes.slice([0, 0, 3], [-1, -1, 1]); // get height
//       const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)); // x1
//       const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)); // y1
//       const x2 = tf.add(x1, w)
//       const y2 = tf.add(y1, h)
//       return tf.concat([y1, x1, y2, x2], 2).squeeze(); 
//     }); // process boxes [y1, x1, y2, x2]
  
  
//     const boxes_data = boxes.dataSync(); // get boxes data
//     const scores_data = scores.dataSync(); // get scores data
//     const classes_data = classes.dataSync(); // get classes
  
//     // Filter arrays
//     let filteredIndices: number[] = [];
//     let maxConfIndex = -1;
//     let maxConf = 0.3;
  
//     for (let i = 0; i < classes_data.length; i++) {
//       if (classes_data[i] === 0) {
//         if (scores_data[i] > maxConf) {
//           maxConf = scores_data[i];
//           maxConfIndex = i;
//           filteredIndices.push(i);
//         }
//       }
//     }
  
//     // If we found any class 1 detections, keep only the one with highest confidence
//     if (maxConfIndex !== -1) {
//       filteredIndices = [maxConfIndex];
//     }
  
//     if (filteredIndices.length === 0) {
//       // tensorToDownloadableImage(input, "input.png");
//     }
  
//     // Create new filtered arrays
//     const filtered_boxes_data = filteredIndices.reduce((acc: any[], i) => {
//       const box = boxes_data.slice(i * 4, (i + 1) * 4);
//       const adjusted_box = scaleAndPositionBoundingBox(box as any, xRatio, yRatio, faceBox);
//       acc.push(...adjusted_box);
//       return acc;
//     }, []);
//     const filtered_scores_data = filteredIndices.map(i => scores_data[i]);
//     const filtered_classes_data = filteredIndices.map(i => classes_data[i]);
//     result['boxs'] = filtered_boxes_data;
//     return result;
//     // Replace the renderBoxes call with this conditional block
//     // if (useMask) {
//     //   createMaskedFrame(canvasRef, filtered_boxes_data, filtered_scores_data, filtered_classes_data, [1, 1], frameData);
//     // } else {
//     //   renderBoxes(canvasRef, filtered_boxes_data, filtered_scores_data, filtered_classes_data, [1, 1], frameData);
//     // }
  
//     // tf.dispose([res, transRes, boxes, scores, classes]); // clear memory
  
//   }
  
//   interface PreprocessResult {
//     frame: Tensor3D;
//     input: Tensor4D;
//     xRatio: number;
//     yRatio: number;
//   }
//   type BoundingBox = [number, number, number, number];
  
  
//   /**
//    * Preprocess image / frame before forwarded into the model
//    * @param {HTMLVideoElement|HTMLImageElement} source
//    * @param {Number} modelWidth
//    * @param {Number} modelHeight
//    * @param {Array} faceBox The bounding box [x1, y1, x2, y2]
//    * @returns input tensor, xRatio and yRatio
//    */
//   const preprocess = async (
//     source: Tensor,
//     modelWidth: number,
//     modelHeight: number,
//     faceBox: BoundingBox | null
//   ): Promise<PreprocessResult> => {
//     let xRatio, yRatio; // ratios for boxes
  
//     const [frame, input] = tf.tidy(() => {
//       // const img = tf.browser.fromPixels(source); //TODO: NO NEED BECAUSE IT'S ALREADY A TENSOR
//       const img = source as Tensor3D;
  
//       let croppedImg: Tensor3D;
//       if (faceBox) {
//         console.log('Attempting to crop with faceBox:', faceBox);
//         try {
//           croppedImg = cropTensor(img, faceBox);
//         } catch (error) {
//           console.error('Error during cropTensor:', error);
//           croppedImg = img;
//         }
//       } else {
//         croppedImg = img;
//       }
  
//       // const croppedImg = (faceBox ? cropTensor(img, faceBox) : img) as tf.Tensor3D; //TODO ADDED TYPE CONVERSATION HERE
//       const [originalH, originalW] = croppedImg.shape.slice(0, 2); // get source width and height
  
//       // Get source dimensions
//       const [h, w] = croppedImg.shape.slice(0, 2); // get source width and height
//       const aspectRatio = w / h; // calculate aspect ratio
  
//       // Calculate new dimensions while maintaining aspect ratio
//       let newWidth, newHeight;
//       if (w > h) {
//         newWidth = modelWidth;
//         newHeight = modelWidth / aspectRatio;
//       } else {
//         newHeight = modelHeight;
//         newWidth = modelHeight * aspectRatio;
//       }
  
//       console.log(typeof croppedImg)
//       // Resize the image to the new dimensions
//       const imgResized = tf.image.resizeBilinear(croppedImg, [Math.round(newHeight), Math.round(newWidth)]);
//       xRatio = modelWidth / w; // update xRatio based on the original width
//       yRatio = modelHeight / h; // update yRatio based on the original height
  
//       if (!imgResized || !(imgResized instanceof tf.Tensor)) {
//         throw new Error('imgResized is not a valid Tensor');
//       }
  
//       // Calculate padding to fit the resized image into the model's input dimensions
//       const padHeight = modelHeight - Math.round(newHeight);
//       const padWidth = modelWidth - Math.round(newWidth);
  
//       // Add padding to the resized image to fit the model dimensions
//       console.log(typeof imgResized)
//       //TODO: Original part here
//       const imgPadded = imgResized.pad([
//         [Math.floor(padHeight / 2), Math.ceil(padHeight / 2)],
//         [Math.floor(padWidth / 2), Math.ceil(padWidth / 2)],
//         [0, 0],
//       ]);
  
  
//       //new part
//       // const imgPadded = tf.pad(imgResized, [
//       //   [Math.floor(padHeight / 2), Math.ceil(padHeight / 2)],  // Padding for height
//       //   [Math.floor(padWidth / 2), Math.ceil(padWidth / 2)],    // Padding for width
//       //   [0, 0],  // No padding for depth (color channels)
//       // ]);
  
//       // console.log("imgPadded:", imgPadded);  // Debugging step
//       // console.log("imgPadded is Tensor:", imgPadded instanceof tf.Tensor);  // Check if it's a Tensor
  
//       // if (!imgPadded || !(imgPadded instanceof tf.Tensor)) {
//       //   throw new Error('imgPadded is not a valid Tensor');
//       // }
//       // console.log('TensorFlow.js version:', tf.version);
//       // console.log(imgPadded);
  
//       // const imgPaddedFloat = tf.cast(imgPadded, 'float32');
  
//       // // const imgPaddedFloat = imgPadded.toFloat();  // Cast to float32 fail
//       // // const imgNormalized = imgPaddedFloat.div(255.0);  // Normalize pixel values
//       // const imgNormalized = tf.div(imgPadded, tf.scalar(255.0));
//       // console.log('imgNormalized:', imgNormalized);
//       // console.log('imgNormalized is Tensor:', imgNormalized instanceof tf.Tensor);
//       // // const imgRank = imgNormalized.expandDims(0);
//       // const imgRank = tf.expandDims(imgNormalized, 0)
      
//       return [img, imgPadded.div(255.0).expandDims(0)];
//     });
  
//     return { frame, input, xRatio, yRatio };
//   };
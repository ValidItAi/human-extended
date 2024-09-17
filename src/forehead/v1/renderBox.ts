// /* eslint-disable prefer-const */

// import { labels, RenderBoxesParams } from './types';

// export const renderBoxes = ({
//   videoSource,
//   boxes_data,
//   scores_data,
//   classes_data,
//   frame,
// }: RenderBoxesParams): void => {
//   const ctx = videoSource.getContext('2d');
//   if (!ctx) return;

//   ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//   ctx.putImageData(frame, 0, 0);

//   const colors = new Colors();

//   const font = `${Math.max(
//     Math.round(Math.max(ctx.canvas.width, ctx.canvas.height) / 40),
//     14
//   )}px Arial`;
//   ctx.font = font;
//   ctx.textBaseline = 'top';

//   const offsetY = 80; // Adjust this value as needed to lower the bounding box

//   for (let i = 0; i < scores_data.length; ++i) {
//     const klass = labels[classes_data[i]];
//     const color = colors.get(classes_data[i]);
//     const score = (scores_data[i] * 100).toFixed(1);

//     let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4);
//     y1 += offsetY; // Adjust this value to lower the bounding box
//     y2 += offsetY; // Adjust this value to lower the bounding box
//     const width = x2 - x1;
//     const height = y2 - y1;

//     // Draw the bounding box
//     ctx.fillStyle = Colors.hexToRgba(color, 0.2) || 'black';
//     ctx.fillRect(x1, y1, width, height);

//     ctx.strokeStyle = color;
//     ctx.lineWidth = Math.max(
//       Math.min(ctx.canvas.width, ctx.canvas.height) / 200,
//       2.5
//     );
//     ctx.strokeRect(x1, y1, width, height);

//     // Draw the text label above the bounding box
//     ctx.fillStyle = color;
//     const textWidth = ctx.measureText(klass + ' - ' + score + '%').width;
//     const textHeight = parseInt(font, 10);
//     const yText = y1 - textHeight - ctx.lineWidth - 1.5; // Adjusted to draw text above the box
//     ctx.fillRect(
//       x1 - 1,
//       yText,
//       textWidth + ctx.lineWidth,
//       textHeight + ctx.lineWidth
//     );

//     ctx.fillStyle = '#ffffff';
//     ctx.fillText(klass + ' - ' + score + '%', x1 - 1, yText);
//   }
// };

// interface CreateMaskedFrameParams {
//   videoSource: OffscreenCanvas;
//   boxes_data: number[];
//   scores_data: number[];
//   classes_data: number[];
//   frame: ImageData;
// }

// export const createMaskedFrame = ({
//   videoSource,
//   boxes_data,
//   scores_data,
//   frame,
// }: CreateMaskedFrameParams): void => {
//   const ctx = videoSource.getContext('2d');
//   if (!ctx) return;

//   ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//   ctx.fillStyle = 'black';
//   ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

//   if (scores_data.length > 0) {
//     const [y1, x1, y2, x2] = boxes_data.slice(0, 4);

//     const tempCanvas = document.createElement('canvas');
//     tempCanvas.width = ctx.canvas.width;
//     tempCanvas.height = ctx.canvas.height;
//     const tempCtx = tempCanvas.getContext('2d');
//     if (!tempCtx) return;

//     tempCtx.fillStyle = 'black';
//     tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

//     tempCtx.clearRect(x1, y1, x2 - x1, y2 - y1);

//     ctx.putImageData(frame, 0, 0);
//     console.log('reached');

//     ctx.drawImage(tempCanvas, 0, 0);
//   }
// };

// class Colors {
//   private palette: string[];
//   private n: number;

//   constructor() {
//     this.palette = [
//       '#FF3838',
//       '#FF9D97',
//       '#FF701F',
//       '#FFB21D',
//       '#CFD231',
//       '#48F90A',
//       '#92CC17',
//       '#3DDB86',
//       '#1A9334',
//       '#00D4BB',
//       '#2C99A8',
//       '#00C2FF',
//       '#344593',
//       '#6473FF',
//       '#0018EC',
//       '#8438FF',
//       '#520085',
//       '#CB38FF',
//       '#FF95C8',
//       '#FF37C7',
//     ];
//     this.n = this.palette.length;
//   }

//   get = (i: number): string => this.palette[Math.floor(i) % this.n];

//   static hexToRgba = (hex: string, alpha: number): string | null => {
//     const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//     return result
//       ? `rgba(${[
//           parseInt(result[1], 16),
//           parseInt(result[2], 16),
//           parseInt(result[3], 16),
//         ].join(', ')}, ${alpha})`
//       : null;
//   };
// }

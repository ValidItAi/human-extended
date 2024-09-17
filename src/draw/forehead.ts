/**
 * Forehead model implementation
 */

import { log, now } from '../util/util';
import { loadModel } from '../tfjs/load';
import type { GraphModel, Tensor, Tensor4D, Tensor3D } from '../tfjs/types';
import type { Config } from '../config';
import { env } from '../util/env';
import { Box, ForeheadResult } from 'src/result';
import { mergeDeep } from '../util/util';
import { getCanvasContext, rad2deg, rect, point, lines, arrow, replace, labels } from './primitives';
import { options } from '../draw/options';
import type { AnyCanvas, DrawOptions } from '../exports';

let model: GraphModel | null;
let last: ForeheadResult;
let lastCount = 0;
let lastTime = 0;
let skipped = Number.MAX_SAFE_INTEGER;
let inputSize = 0;
const labelsForehead = [
  "ForeheadRect", 
  "Forehead"
]

const numClass = labelsForehead.length;

export async function load(config: Config): Promise<GraphModel> {
  if (env.initial) model = null;
  if (!model) model = await loadModel(config.forehead.modelPath);
  else if (config.debug) log('cached model:', model['modelUrl']);
  return model;
}


let localOptions: DrawOptions;

function drawForeheadBoxes(box: Box, ctx) {
  if (localOptions.drawBoxes && box.length) {
    rect(ctx, box[0], box[1],box[2], box[3], localOptions);
  }
}

/** draw detected faces */
export function forehead(inCanvas: AnyCanvas, result: ForeheadResult, drawOptions?: Partial<DrawOptions>) {
  localOptions = mergeDeep(options, drawOptions);
  if (!result || !inCanvas) return;
  const ctx = getCanvasContext(inCanvas) as CanvasRenderingContext2D;
  if (!ctx || !result || !result.box) return;
  ctx.font = localOptions.font;
  ctx.strokeStyle = localOptions.color;
  ctx.fillStyle = localOptions.color;
  const box = result.box;
  const class_data = result.class;
  let score = result.score;
  // console.log("box",box)
  // console.log("class",class_data)
  // console.log("score",score)

  // const emptyBox: Box = [0,0,0,0]
  // const box = boxs?.length ? boxs[0] : emptyBox;
    // drawForeheadBoxes(box, ctx);
    // drawLabels(box, ctx);
  
  
    // font configs
    const font = `${Math.max(
      Math.round(Math.max(ctx.canvas.width, ctx.canvas.height) / 40),
      14
    )}px Arial`;
    ctx.font = font;
    ctx.textBaseline = "top";
    const colors = new Colors();

      // filter based on class threshold
      const klass = labelsForehead[class_data];
      const color = colors.get(class_data);
      score = (score * 100).toFixed(1);
  
      //todo??
      let [y1, x1, y2, x2] = box.slice(0, (1) * 4);
      // x1 *= ratios[0];
      // x2 *= ratios[0];
      // y1 *= ratios[1];
      // y2 *= ratios[1];
      const width = x2 - x1;
      const height = y2 - y1;
  
      // draw box.
      ctx.fillStyle = Colors.hexToRgba(color, 0.2);
      ctx.fillRect(x1, y1, width, height);
  
      // draw border box.
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(Math.min(ctx.canvas.width, ctx.canvas.height) / 200, 2.5);
      ctx.strokeRect(x1, y1, width, height);
  
      // Draw the label background.
      ctx.fillStyle = color;
      const textWidth = ctx.measureText(klass + " - " + score + "%").width;
      const textHeight = parseInt(font, 10); // base 10
      const yText = y1 - (textHeight + ctx.lineWidth);
      ctx.fillRect(
        x1 - 1,
        yText < 0 ? 0 : yText, // handle overflow label box
        textWidth + ctx.lineWidth,
        textHeight + ctx.lineWidth
      );
  
      // Draw labels
      ctx.fillStyle = "#ffffff";
      ctx.fillText(klass + " - " + score + "%", x1 - 1, yText < 0 ? 0 : yText);
 
}

function drawLabels(f: Box, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
  if (!localOptions.drawLabels || (localOptions.faceLabels?.length === 0)) return;
  let l = localOptions.faceLabels.slice();
  // l = replace(l, '[id]', f.id.toFixed(0));
  // if (f.score) l = replace(l, '[score]', 100 * f.score);
  labels(ctx, l, f[0], f[1], localOptions);
}

class Colors {
  private palette: string[];
  private n: number;

  constructor() {
    this.palette = [
      '#FF3838',
      '#FF9D97',
      '#FF701F',
      '#FFB21D',
      '#CFD231',
      '#48F90A',
      '#92CC17',
      '#3DDB86',
      '#1A9334',
      '#00D4BB',
      '#2C99A8',
      '#00C2FF',
      '#344593',
      '#6473FF',
      '#0018EC',
      '#8438FF',
      '#520085',
      '#CB38FF',
      '#FF95C8',
      '#FF37C7',
    ];
    this.n = this.palette.length;
  }

  get = (i: number): string => this.palette[Math.floor(i) % this.n];

  static hexToRgba = (hex: string, alpha: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `rgba(${[
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ].join(', ')}, ${alpha})`
      : `rgba(0, 0, 0, ${alpha})`;
  };
}
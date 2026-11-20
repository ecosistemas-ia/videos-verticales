// Red de seguridad para quien lance la CLI de Remotion a mano (npx remotion studio). El render de verdad pasa por
// scripts/render.ts, que da las mismas opciones. Trampa conocida: sin el espacio de color bt709 sale yuvj420p.
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');

import { CONFIG } from "../config/config";

export class VideoDs {
  static getVideoDuration = async (video_file_path: string): Promise<number> => {
    return Promise.resolve(45)
    if(CONFIG.ENVIRONMENT === 'localhost') return Promise.resolve(10)
    return new Promise(function (resolve, rejects) {
      var ffmpeg = require('fluent-ffmpeg');
      ffmpeg.ffprobe(video_file_path, function (err: any, metadata: any) {
        if (err)
          rejects(err)
        console.log(metadata)
        resolve(metadata.format.duration);
      });
    })
  }
}

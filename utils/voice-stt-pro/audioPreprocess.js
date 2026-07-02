const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Tell fluent-ffmpeg where our static ffmpeg binary is
ffmpeg.setFfmpegPath(ffmpegStatic);

async function preprocessAudio(rawBuffer) {
  const sessionId = uuidv4();
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `stt-input-${sessionId}.raw`);
  const outputPath = path.join(tempDir, `stt-output-${sessionId}.wav`);

  try {
    // 1. Write raw PCM buffer to temporary input file
    fs.writeFileSync(inputPath, rawBuffer);

    console.log('🎚️ Running ffmpeg audio preprocessing...');
    // 2. Run ffmpeg preprocessing pipeline
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputPath)
        .inputFormat('s16le')
        .inputOptions('-ar', '16000', '-ac', '1')
        .audioFilters([
          'highpass=f=80',
          'lowpass=f=8000',
          'afftdn=nf=-25',
          'dynaudnorm=p=0.95:m=10',
          'silenceremove=1:0:-50dB',
          'loudnorm=I=-16:TP=-1.5:LRA=11'
        ])
        .output(outputPath)
        .outputOptions('-ar', '16000', '-ac', '1', '-f', 'wav')
        .on('end', () => {
          try {
            const processedBuffer = fs.readFileSync(outputPath);
            // Clean up temp files and return processed buffer
            cleanupFiles([inputPath, outputPath]);
            resolve(processedBuffer);
          } catch (err) {
            cleanupFiles([inputPath, outputPath]);
            reject(err);
          }
        })
        .on('error', (err) => {
          console.error('FFmpeg preprocessing failed, falling back to raw buffer:', err);
          cleanupFiles([inputPath, outputPath]);
          resolve(rawBuffer);
        })
        .run();
    });
  } catch (err) {
    console.error('Audio preprocessing error, falling back to raw buffer:', err);
    cleanupFiles([inputPath, outputPath]);
    return rawBuffer;
  }
}

function cleanupFiles(filePaths) {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Error cleaning up temp file:', filePath, err);
    }
  }
}

module.exports = { preprocessAudio };

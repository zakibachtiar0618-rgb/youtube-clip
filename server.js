const express = require('express');
const cors = require('cors');
const ytDlp = require('yt-dlp-exec');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mengarahkan lokasi ffmpeg.exe ke file yang ada di root folder proyek
const ffmpegPath = path.join(__dirname, 'ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegPath);

// Buat folder downloads jika belum ada
const downloadDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

app.post('/api/cut', async (req, res) => {
  const { videoUrl, startTime, endTime } = req.body;

  console.log('Data diterima dari frontend -> URL:', videoUrl, '| Start:', startTime, '| End:', endTime);

  if (!videoUrl || startTime === undefined || endTime === undefined) {
    return res.status(400).json({ error: 'Parameter tidak lengkap.' });
  }

  const fileId = `clip-${Date.now()}`;
  const tempPath = path.join(downloadDir, `temp-${fileId}.mp4`);
  const finalOutputPath = path.join(downloadDir, `${fileId}.mp4`);
  const sectionArg = `*${Number(startTime)}-${Number(endTime)}`;

  try {
    console.log(`1. Mengunduh klip dengan yt-dlp dan memaksa keyframe (${sectionArg})...`);

    // Unduh bagian klip dengan opsi forceKeyframesAtCuts agar tidak ada layar hitam di awal
    await ytDlp(videoUrl, {
      output: tempPath,
      downloadSections: sectionArg,
      forceKeyframesAtCuts: true,
      ffmpegLocation: __dirname,
    });

    console.log('2. Menyempurnakan video dengan FFmpeg...');

    // Re-encode ringan untuk memastikan kestabilan durasi dan pemutar media
    await new Promise((resolve, reject) => {
      ffmpeg(tempPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-avoid_negative_ts make_zero'
        ])
        .save(finalOutputPath)
        .on('end', () => {
          // Hapus file temporary mentah setelah selesai
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
          }
          resolve();
        })
        .on('error', (err) => {
          console.error('Error saat re-encode FFmpeg:', err);
          reject(err);
        });
    });

    console.log('3. Klip berhasil diproses, mengirim file akhir ke client...');

    // Kirim file hasil akhir ke client/browser
    res.download(finalOutputPath, 'clip-hasil.mp4', (err) => {
      if (err) {
        console.error('Gagal mengirim file:', err);
      }
    });

  } catch (error) {
    console.error('Error saat memproses video:', error);
    
    // Bersihkan file temporary jika terjadi error
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }

    res.status(500).json({ error: 'Gagal memproses video.' });
  }
});

app.listen(3000, () => {
  console.log('Server ClipTure berjalan stabil di http://localhost:3000');
});
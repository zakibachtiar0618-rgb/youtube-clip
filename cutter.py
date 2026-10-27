import sys
import os
import subprocess

def clip_video(url, start_time, duration, output_path):
    try:
        # Menggunakan yt-dlp untuk mendownload dan langsung memotong video dengan FFmpeg
        # Opsi --download-sections memotong video langsung dari server YouTube sebelum diunduh penuh (sangat cepat!)
        section_arg = f"*{start_time}-{int(start_time) + int(duration)}"
        
        command = [
            "yt-dlp",
            "-f", "mp4[height<=720]/best[ext=mp4]/best",
            "--download-sections", section_arg,
            "-o", output_path,
            url
        ]
        
        print(f"🚀 Menjalankan perintah Python untuk memotong video...")
        result = subprocess.run(command, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("SUCCESS")
        else:
            print(f"ERROR: {result.stderr}")
            sys.exit(1)
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("ERROR: Argumen kurang (url, start_time, duration, output_path)")
        sys.exit(1)
        
    video_url = sys.argv[1]
    start = sys.argv[2]
    dur = sys.argv[3]
    out = sys.argv[4]
    
    clip_video(video_url, start, dur, out)
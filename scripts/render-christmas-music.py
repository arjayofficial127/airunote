"""Render an original 30-minute synthesized holiday instrumental (no samples).
Requires numpy and imageio-ffmpeg. Deterministic score and synthesized instruments.
"""
from pathlib import Path
import subprocess
import numpy as np
import imageio_ffmpeg

RATE = 22050
BEAT = .75  # 80 BPM, eight-bar phrases
PHRASE = 24
COUNT = 75
rng = np.random.default_rng(20261225)
out = Path(__file__).resolve().parents[1] / "frontend/public/exam-assets/music/winter-lanterns.mp3"
out.parent.mkdir(parents=True, exist_ok=True)
encoder = subprocess.Popen([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-f", "f32le", "-ar", str(RATE), "-ac", "2", "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "96k", "-metadata", "title=Winter Lanterns", "-metadata", "artist=Airunote", "-t", "1800", str(out)], stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
carry = np.zeros((RATE * 3, 2), dtype=np.float32)
peak = 0.
energy = 0.
def note(buf, at, midi, duration, gain, kind, pan=0):
    t = np.arange(int(duration * RATE), dtype=np.float32) / RATE
    f = 440 * 2 ** ((midi - 69) / 12)
    if kind == 'bell':
        wave = (np.sin(2*np.pi*f*t)*np.exp(-t*1.5) +
                .22*np.sin(2*np.pi*f*2*t)*np.exp(-t*3.5) +
                .07*np.sin(2*np.pi*f*3*t)*np.exp(-t*6))
        wave *= np.minimum(t/.012, 1)
    else:
        wave = np.sin(2*np.pi*f*t) + .14*np.sin(2*np.pi*f*2*t)
        wave *= np.minimum(t/.3, 1) * np.minimum((duration-t)/.6, 1) * .65
    wave *= gain
    start = int(at * RATE)
    for delay, strength in [(0,1),(.23,.14),(.47,.08)]:
        pos = start + int(delay*RATE)
        n = min(len(wave), len(buf)-pos)
        if n > 0:
            buf[pos:pos+n,0] += wave[:n]*strength*np.sqrt((1-pan)/2)
            buf[pos:pos+n,1] += wave[:n]*strength*np.sqrt((1+pan)/2)

# Each section evolves the original motifs through new chord voicings and registers.
motifs = [[0,2,1,4,2,1,0,2], [2,4,3,2,0,1,2,0], [4,3,2,0,1,2,1,0],
          [0,1,2,4,3,2,1,2], [2,1,0,2,4,2,3,1]]
for section in range(COUNT):
    buf = np.zeros((RATE*(PHRASE+3),2),dtype=np.float32)
    buf[:len(carry)] += carry
    root = [50,55,48,53,50][(section//15)%5]
    scale = [0,2,4,5,7,9,11]
    chords = [[0,4,7],[9,12,16],[5,9,12],[7,11,14],[0,4,7],[5,9,12],[7,11,14],[0,4,7]]
    motif = motifs[section % len(motifs)]
    for bar, chord in enumerate(chords):
        at = bar*3
        for j, pitch in enumerate(chord):
            note(buf,at,root+pitch,3.3,.045,'pad',(j-1)*.45)
        note(buf,at,root+chord[0]-12,2.6,.045,'pad')
        for step in range(6):
            pitch = root + 12 + chord[[0,1,2,1,2,1][step]]
            note(buf,at+step*.5,pitch,1.8,.024,'bell',(-1 if step%2 else 1)*.35)
        # Breathing room between melody phrases; no borrowed carol melodies.
        if section % 5 != 4 or bar % 2 == 0:
            for step in range(3):
                degree = (motif[(bar+step)%8] + (1 if section%3==1 else 0)) % 7
                pitch = root+24+scale[degree]
                if step==0: pitch=root+24+chord[bar%3]%12
                note(buf,at+step*BEAT,pitch,2.1,.055 if step==0 else .038,'bell',.1)
    chunk = buf[:RATE*PHRASE]
    carry = buf[RATE*PHRASE:].copy()
    if section == 0: chunk[:RATE*3] *= np.linspace(0,1,RATE*3)[:,None]
    if section == COUNT-1: chunk[-RATE*6:] *= np.linspace(1,0,RATE*6)[:,None]
    chunk = np.tanh(chunk*1.6).astype('<f4')
    peak=max(peak,float(np.abs(chunk).max()))
    energy += float(np.sum(chunk.astype(np.float64)**2))
    encoder.stdin.write(chunk.tobytes())
encoder.stdin.close()
assert encoder.wait() == 0
print(f"Rendered {COUNT*PHRASE}s stereo. Peak {peak:.3f}; RMS {(energy/(1800*RATE*2))**.5:.4f}; {out}")

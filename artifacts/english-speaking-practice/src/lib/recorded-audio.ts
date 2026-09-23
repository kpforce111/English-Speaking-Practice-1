export type RecordedAudio = { audioBase64: string; mimeType: string };

export async function startRecordedAudio(): Promise<{ stop: () => Promise<RecordedAudio>; cancel: () => void }> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('This browser does not support microphone recording.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  let recorder: MediaRecorder;
  try {
    const preferred = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.start();
    let stopped = false;
    const cancel = () => {
      if (stopped) return;
      stopped = true;
      if (recorder.state !== 'inactive') recorder.stop();
      stream.getTracks().forEach(track => track.stop());
    };
    const stop = () => new Promise<RecordedAudio>((resolve, reject) => {
      if (stopped || recorder.state === 'inactive') { reject(new Error('Recording has already stopped.')); return; }
      stopped = true;
      recorder.onerror = () => reject(new Error('Recording failed. Please try again.'));
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || '' });
        if (!blob.size) { reject(new Error('No audio was captured. Please try again.')); return; }
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the recording.'));
        reader.onload = () => {
          const audioBase64 = String(reader.result).split(',')[1];
          if (!audioBase64) { reject(new Error('Could not read the recording.')); return; }
          resolve({ audioBase64, mimeType: blob.type.split(';')[0] });
        };
        reader.readAsDataURL(blob);
      };
      recorder.stop();
    });
    return { stop, cancel };
  } catch (error) {
    stream.getTracks().forEach(track => track.stop());
    throw error;
  }
}
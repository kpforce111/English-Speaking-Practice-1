import { useState, useRef, useEffect } from 'react';
import { useSendVoiceConversation, useAssessPronunciation, useGetPracticeSession } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { PremiumGate } from '@/components/premium-gate';
import { Mic, Square, Play, Sparkles, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';

function stripEmojis(str: string) {
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\uFE0F/g, '');
}

export function Voice() {
  return (
    <PremiumGate featureName="Voice Conversation">
      <VoicePractice />
    </PremiumGate>
  );
}

function VoicePractice() {
  const { data: sessionData } = useGetPracticeSession();
  const usageSeconds = (sessionData as any)?.usage?.voiceSeconds || 0;
  const limitMinutes = (sessionData as any)?.limits?.voiceMinutes || 15;
  const limitSeconds = limitMinutes * 60;
  const remainingSeconds = Math.max(0, limitSeconds - usageSeconds);
  const remainingMinutes = Math.floor(remainingSeconds / 60);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pronunciation, setPronunciation] = useState<any | null>(null);
  const [pronunciationError, setPronunciationError] = useState<string | null>(null);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerInterval = useRef<number | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  
  const sendVoice = useSendVoiceConversation();
  const pronunciationMutation = useAssessPronunciation();
  const queryClient = useQueryClient();

  const startRecording = async () => {
    try {
      setError(null);
      setTranscript(null);
      setAiReply(null);
      setAiAudioUrl(null);
      setPronunciation(null);
      setPronunciationError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          processVoice(base64data, recordingTime);
        };
      };
      
      audioChunks.current = [];
      recorder.start();
      mediaRecorder.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      
      timerInterval.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      setError('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    }
  };

  const processVoice = (base64data: string, duration: number) => {
    sendVoice.mutate(
      { data: { audioBase64: base64data, mimeType: 'audio/webm' } },
      {
        onSuccess: (res: any) => {
          if (res.userTranscript) {
            setTranscript(res.userTranscript);
            
            pronunciationMutation.mutate(
              { data: { audioBase64: base64data, mimeType: 'audio/webm', text: res.userTranscript } },
              {
                onSuccess: (pRes) => setPronunciation(pRes),
                onError: () => setPronunciationError("Pronunciation feedback unavailable: Configuration missing or API error.")
              }
            );
          }
          if (res.assistantTranscript) setAiReply(stripEmojis(res.assistantTranscript));
          if (res.audioBase64) {
            const mime = res.audioMimeType || 'audio/mp3';
            const aiUrl = `data:${mime};base64,${res.audioBase64}`;
            setAiAudioUrl(aiUrl);
            
            // Auto-play response
            if (audioElement.current) {
              audioElement.current.src = aiUrl;
              audioElement.current.play().catch(e => console.log('Autoplay prevented', e));
            }
          }
          queryClient.invalidateQueries({ queryKey: ['/api/session'] });
        },
        onError: (err: any) => {
          setError(err.message || 'Failed to process voice. Try again.');
        }
      }
    );
  };

  useEffect(() => {
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (mediaRecorder.current?.state === 'recording') {
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <div className="flex h-full flex-col px-4 py-6 md:px-10">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center space-y-10">
        
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
            <Mic size={24} />
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Voice Practice</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Have a natural, spoken conversation with Rllora AI. Premium voice practice is limited to 15 minutes per day.
          </p>
          <div className="inline-flex items-center justify-center rounded-full bg-secondary/50 px-3 py-1 mt-2">
            <span className="text-xs font-medium text-secondary-foreground">{remainingMinutes} minutes remaining today</span>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm min-h-[250px] flex flex-col justify-center items-center relative">
          
          {error && (
            <div className="absolute top-4 left-4 right-4 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} />
              <p className="flex-1">{error}</p>
              <button onClick={() => setError(null)}><X size={16} /></button>
            </div>
          )}

          {sendVoice.isPending ? (
            <div className="flex flex-col items-center gap-4 animate-in fade-in">
              <Loader2 size={32} className="text-primary animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Rllora AI is thinking...</p>
            </div>
          ) : aiReply ? (
            <div className="flex flex-col w-full gap-6 animate-in slide-in-from-bottom-4">
              <div className="flex flex-col gap-2 w-full max-w-md ml-auto">
                <div className="rounded-2xl rounded-tr-md bg-muted px-4 py-3 text-sm text-foreground self-end text-right">
                  {transcript || "Audio sent"}
                </div>
                {pronunciation && (
                  <div className="w-full text-sm text-left">
                    <div className="flex justify-end gap-2 mb-2">
                      <div className="bg-muted px-2 py-1 rounded-md text-xs">Acc: {pronunciation.accuracyScore}%</div>
                      <div className="bg-muted px-2 py-1 rounded-md text-xs">Fluency: {pronunciation.fluencyScore}%</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1 mb-1">
                      {pronunciation.words?.map((w: any, i: number) => (
                        <span key={i} className={w.correct ? "text-emerald-500" : "text-destructive border-b border-dashed border-destructive"}>
                          {w.word}
                        </span>
                      ))}
                    </div>
                    {pronunciation.feedback && <p className="text-muted-foreground text-[11px] text-right">{pronunciation.feedback}</p>}
                  </div>
                )}
                {pronunciationError && (
                  <div className="mt-1 text-[11px] text-amber-600 bg-amber-500/10 px-2 py-1.5 rounded-lg text-right">
                    {pronunciationError}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-right pr-2">You</span>
              </div>
              
              <div className="flex flex-col gap-2 w-full max-w-md mr-auto">
                <div className="rounded-2xl rounded-tl-md bg-primary text-primary-foreground px-4 py-3 text-sm shadow-sm relative group self-start text-left">
                  {aiReply}
                  {aiAudioUrl && (
                    <button 
                      onClick={() => audioElement.current?.play()} 
                      className="absolute -right-3 -bottom-3 bg-card border border-border text-foreground shadow-sm rounded-full p-2 hover:bg-secondary transition-colors"
                    >
                      <Play size={14} className="ml-0.5" />
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-left pl-2">Rllora AI</span>
              </div>
              
              <button 
                onClick={() => { setAiReply(null); setTranscript(null); setAiAudioUrl(null); }}
                className="mx-auto mt-6 flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw size={14} /> New recording
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <div className="relative">
                {isRecording && (
                  <div className="absolute -inset-4 rounded-full bg-primary/20 animate-ping opacity-75" />
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-all ${
                    isRecording 
                      ? 'bg-destructive hover:bg-destructive/90 scale-110' 
                      : 'bg-primary hover:bg-primary/90 hover:scale-105'
                  }`}
                >
                  {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={32} />}
                </button>
              </div>
              
              <div className="h-6 flex items-center justify-center font-mono text-xl font-medium tracking-wider text-muted-foreground">
                {isRecording ? (
                  <span>0:{recordingTime.toString().padStart(2, '0')}</span>
                ) : (
                  <span className="text-sm font-sans uppercase tracking-widest text-muted-foreground/60">Tap to start</span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
      
      <audio ref={audioElement} className="hidden" />
    </div>
  );
}

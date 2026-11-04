import React, { useState, useRef } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  X,
  RefreshCw,
  Check,
  DollarSign,
  ShoppingBag,
  Send,
  Volume2,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptReady: (transcript: string, suggestedAction?: string) => void;
}

const SUPPORTED_VOICE_COMMANDS = [
  {
    category: 'Finance & Expenses',
    commands: [
      'Add expense of 500 for groceries',
      'Spent 250 on lunch with team',
      'Record 1200 for electricity bill',
    ],
  },
  {
    category: 'Calendar & Reminders',
    commands: [
      'Remind me to pay bills tomorrow',
      'Set reminder for car service next Monday',
      'Remind me to renew passport on March 15',
    ],
  },
  {
    category: 'Pantry & Grocery Stock',
    commands: [
      'Add 2 kg of Greek yogurt to pantry',
      'Low stock alert for milk and eggs',
      'Add olive oil to shopping list',
    ],
  },
  {
    category: 'AI Assistant & Guidance',
    commands: [
      'How to clean Dyson vacuum filter?',
      'Find nearest repair center for washing machine',
      'Suggest recipe with tomatoes and cheese',
    ],
  },
];

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  onTranscriptReady,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());

        // Send to server for transcription
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript('');
    } catch (err) {
      console.error('Microphone access denied:', err);
      setTranscript('Microphone access permission required or not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const resp = await fetch('/api/gemini/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64Data,
            mimeType: blob.type || 'audio/webm',
          }),
        });

        if (resp.ok) {
          const res = await resp.json();
          setTranscript(res.transcript || 'No voice detected.');
        } else {
          setTranscript('Could not transcribe audio.');
        }
        setIsTranscribing(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Transcription error:', err);
      setIsTranscribing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Mic className="w-4 h-4 text-blue-500" />
            <span>Voice Command & Transcription</span>
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`px-2 py-1 rounded-lg transition-colors flex items-center space-x-1 text-xs font-semibold ${
                showHelp
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Supported Voice Commands Guide"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px]">Guide</span>
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Voice Commands Guide Tooltip / Modal */}
        {showHelp && (
          <div className="my-3 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-left text-xs animate-in fade-in space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
              <div className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                <BookOpen className="w-4 h-4" />
                <span>Supported Voice Commands</span>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Click any example below to fill the transcript or test command execution:
            </p>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {SUPPORTED_VOICE_COMMANDS.map((group) => (
                <div key={group.category} className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {group.category}
                  </span>
                  <div className="space-y-1">
                    {group.commands.map((cmd) => (
                      <button
                        key={cmd}
                        onClick={() => {
                          setTranscript(cmd);
                          setShowHelp(false);
                        }}
                        className="w-full text-left p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-500 text-[11px] text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate">"{cmd}"</span>
                        <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 font-semibold transition-opacity shrink-0">
                          Use →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-2">
          Speak naturally to record expenses, ask questions, or dictation for your pantry list.
        </p>

        {/* Recording Visualizer Button */}
        <div className="py-8 flex flex-col items-center justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-500/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105'
            }`}
          >
            {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>
          <span className="text-xs font-semibold mt-3 text-slate-700 dark:text-slate-300">
            {isRecording
              ? 'Listening... Click to Stop'
              : isTranscribing
              ? 'Transcribing speech...'
              : 'Tap microphone to speak'}
          </span>
        </div>

        {/* Transcript Output */}
        {isTranscribing && (
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 py-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>Transcribing with Gemini...</span>
          </div>
        )}

        {transcript && !isTranscribing && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs text-left mb-4">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Transcribed Speech:
            </span>
            <p className="text-slate-900 dark:text-white font-medium">{transcript}</p>
          </div>
        )}

        {transcript && !isTranscribing && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                onTranscriptReady(transcript, 'ai');
                onClose();
              }}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask AI Assistant</span>
            </button>
            <button
              onClick={() => {
                onTranscriptReady(transcript, 'expense');
                onClose();
              }}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

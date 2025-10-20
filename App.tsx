import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SkeletonIcon } from './components/SkeletonIcon';
import { SettingsIcon } from './components/SettingsIcon';
import { generateRoast, textToSpeech } from './services/geminiService';
import { playAudio } from './utils/audioUtils';

const FRAME_CAPTURE_INTERVAL = 5000; // 5 seconds

export default function App() {
  const [isScreenShareOn, setIsScreenShareOn] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastRoast, setLastRoast] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [piperUrl, setPiperUrl] = useState<string>(() => localStorage.getItem('piperUrl') || 'http://localhost:10200/api/tts');
  const [piperVoice, setPiperVoice] = useState<string>(() => localStorage.getItem('piperVoice') || 'en_GB-alan-medium');
  const [testButtonText, setTestButtonText] = useState('Test Voice');
  const [settingsError, setSettingsError] = useState('');
  const [isBrowserBlocking, setIsBrowserBlocking] = useState(false);


  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingRef = useRef<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    localStorage.setItem('piperUrl', piperUrl);
    localStorage.setItem('piperVoice', piperVoice);
  }, [piperUrl, piperVoice]);

  const handleError = useCallback((err: unknown, isSettingsError = false) => {
    console.error('Error:', err);
    let message = 'An unknown error occurred.';
    if (err instanceof Error) {
        message = err.message;
        if (message.startsWith('MIXED_CONTENT_ERROR')) {
            setIsBrowserBlocking(true);
            return;
        }
    }
    
    const friendlyMessage = message.replace('Failed to fetch', 'Network Error');
    if (isSettingsError) {
        setSettingsError(friendlyMessage);
    } else {
        setError(friendlyMessage);
    }
  }, []);
  
  const handleTestVoice = async () => {
    setTestButtonText('Downloading Voice (First time only)...');
    setSettingsError('');
    setIsBrowserBlocking(false);
    setError('');

    try {
        const testPhrase = "Hello, I am the Sassy Skeleton. This is a test of my voice.";
        const audioBlob = await textToSpeech(testPhrase, piperUrl, piperVoice);
        if (audioBlob) {
            await playAudio(audioBlob);
            setSettingsError("Success! Your voice is working.");
            setTimeout(() => setSettingsError(''), 5000);
        }
    } catch (err) {
        handleError(err, true);
    } finally {
        setTestButtonText('Test Voice');
    }
  };

  const stopScreenShare = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScreenShareOn(false);
    setIsProcessing(false);
    processingRef.current = false;
  }, []);

  const startScreenShare = useCallback(async () => {
    setError('');
    setIsBrowserBlocking(false);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        mediaStreamRef.current = stream;

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            stopScreenShare();
            setLastRoast('');
          };
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsScreenShareOn(true);
        setLastRoast('Watching...');
      } else {
        setError('Your browser does not support screen sharing.');
      }
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
        console.log('Screen share request was cancelled by the user.');
      } else {
        handleError(err);
      }
      stopScreenShare();
    }
  }, [stopScreenShare, handleError]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenShareOn) {
      stopScreenShare();
      setLastRoast('');
    } else {
      startScreenShare();
    }
  }, [isScreenShareOn, startScreenShare, stopScreenShare]);

  const captureFrameAndProcess = useCallback(async () => {
    if (processingRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }
    
    processingRef.current = true;
    setIsProcessing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
        processingRef.current = false;
        setIsProcessing(false);
        return;
    };
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

    try {
      const roast = await generateRoast(base64Image);
      if (roast) {
        setLastRoast(roast);
        const audioBlob = await textToSpeech(roast, piperUrl, piperVoice);
        if (audioBlob) {
          await playAudio(audioBlob);
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [piperUrl, piperVoice, handleError]);
  
  const openSettings = () => {
    setSettingsError('');
    setError('');
    setIsBrowserBlocking(false);
    setShowSettings(true);
  }

  useEffect(() => {
    let intervalId: number | null = null;
    if (isScreenShareOn) {
      intervalId = window.setInterval(captureFrameAndProcess, FRAME_CAPTURE_INTERVAL);
    }
    
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      if(isScreenShareOn){
        stopScreenShare();
      }
    };
  }, [isScreenShareOn, captureFrameAndProcess, stopScreenShare]);
  
  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center p-4 text-orange-500 selection:bg-orange-500 selection:text-black">
      <header className="absolute top-4 right-4 z-20">
        <button onClick={openSettings} className="text-gray-400 hover:text-white transition-colors">
            <SettingsIcon />
        </button>
      </header>

      {isBrowserBlocking && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-[100] font-sans p-4">
            <div className="bg-gray-900 border-2 border-red-700 p-8 rounded-lg max-w-2xl w-full shadow-lg shadow-red-900/50 text-red-200">
                <h2 className="font-['Creepster'] text-5xl text-red-300 mb-4">ACTION REQUIRED: Fix Browser Setting</h2>
                
                <div className="space-y-3 font-sans text-base">
                    <p><strong className="text-white">The Problem:</strong> Your Docker server is working perfectly, but your browser is blocking this secure website (<code className="text-xs">https://...</code>) from connecting to your insecure local server (<code className="text-xs">http://...</code>). This is a standard security feature.</p>
                    <p><strong className="text-white">The Solution:</strong> You must manually grant this website permission to connect to your local server.</p>
                </div>

                <h3 className="font-['Creepster'] text-3xl text-red-300 mt-6 mb-3">Step-by-Step Instructions</h3>
                <ol className="list-decimal list-inside space-y-2 font-sans text-base">
                    <li>Click the <strong className="text-white">lock icon (🔒)</strong> next to the website address in your browser's address bar.</li>
                    <li>Click on <strong className="text-white">"Site settings"</strong> or "Connection is secure" > "Site settings".</li>
                    <li>On the settings page for this website, scroll down until you find the permission for <strong className="text-white">"Insecure content"</strong>.</li>
                    <li>Using the dropdown menu next to it, change the value from "Block" to <strong className="text-white">"Allow"</strong>.</li>
                </ol>
                
                <div className="mt-6 p-4 bg-yellow-900/50 border border-yellow-700 rounded-md text-yellow-200">
                    <strong className="font-bold text-xl text-yellow-100">CRITICAL FINAL STEP</strong>
                    <p className="font-sans mt-1">You <strong className="uppercase">must reload this page</strong> for the new setting to take effect. Your URL and voice settings will be saved.</p>
                </div>
                 <div className="flex justify-end items-center mt-6">
                    <button onClick={() => setIsBrowserBlocking(false)} className="bg-orange-600 text-black font-bold py-2 px-6 rounded-lg hover:bg-orange-500 transition-colors">Close Guide</button>
                </div>
            </div>
        </div>
      )}


      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-start z-50 font-sans p-4 pt-8 pb-8 overflow-y-auto">
            <div className="bg-gray-900 border-2 border-orange-800 p-6 rounded-lg max-w-2xl w-full shadow-lg shadow-orange-900/50">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-['Creepster'] text-4xl">Custom Voice Setup</h2>
                    <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                
                <div className="space-y-4 text-gray-300">
                    <h3 className="font-['Creepster'] text-2xl text-orange-400 border-b border-orange-800 pb-2">Step 1: Run the Server</h3>
                    <p>To use a custom voice, run a local Piper TTS server using Docker. Your server must be running for this app to work.</p>
                    <ol className="list-decimal list-inside space-y-3 mt-4 p-4 bg-gray-800 rounded-md">
                        <li>
                            <strong className="text-white">Stop and Delete any old 'piper' containers</strong> in Docker Desktop to avoid conflicts.
                        </li>
                        <li>
                            Open your terminal (PowerShell, Command Prompt, etc.) and run this full command:
                            <code className="block bg-black p-3 mt-2 rounded-md text-sm text-white overflow-x-auto">docker run -d --name piper -p 10200:10200 -e VOICES='en_GB-alan-medium' linuxserver/piper:latest</code>
                        </li>
                         <li>Open Docker Desktop and make sure the new container named <strong className="text-orange-300">`piper`</strong> is running.</li>
                    </ol>

                     <div className="mt-5 p-3 bg-yellow-900/50 border border-yellow-700 rounded-md text-yellow-200">
                        <strong className="font-bold text-lg text-yellow-100">IMPORTANT: First Time Use</strong>
                        <p className="font-sans">The very first time you click "Test Voice", the server will download the voice model. This may take a minute or two. The app will seem frozen, but it's working! Every test after that will be instant.</p>
                    </div>

                    <h3 className="font-['Creepster'] text-2xl text-orange-400 border-b border-orange-800 pb-2 pt-4">Step 2: Configure & Test</h3>
                    <div>
                        <label htmlFor="piperUrl" className="block text-lg text-gray-300 mb-1">Server URL</label>
                        <input id="piperUrl" type="text" value={piperUrl} onChange={e => setPiperUrl(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        <p className="text-xs text-gray-500 mt-1">This should be the full endpoint, like http://localhost:10200/api/tts</p>
                    </div>
                    <div>
                        <label htmlFor="piperVoice" className="block text-lg text-gray-300 mb-1">Voice Model Name</label>
                        <input id="piperVoice" type="text" value={piperVoice} onChange={e => setPiperVoice(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        <p className="text-xs text-gray-500 mt-1">This must match the voice from the `VOICES` variable in your docker command.</p>
                    </div>
                
                    {settingsError && <p className={`text-sm mt-2 ${settingsError.startsWith('Success') ? 'text-green-400' : 'text-red-400'}`}>{settingsError}</p>}
                    
                    <div className="flex justify-end items-center space-x-4 pt-4">
                      <button onClick={handleTestVoice} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-500 transition-colors disabled:bg-gray-700 disabled:cursor-wait" disabled={testButtonText !== 'Test Voice'}>
                          {testButtonText}
                      </button>
                      <button onClick={() => setShowSettings(false)} className="bg-orange-600 text-black font-bold py-2 px-6 rounded-lg hover:bg-orange-500 transition-colors">Close</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <main className="w-full max-w-5xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-bold text-center mb-4 tracking-wider">
          Sassy Skeleton Screen
        </h1>
        <p className="text-center text-xl text-gray-400 mb-8">
          The AI Skeleton Sees Your Screen... And Has Opinions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="w-full aspect-video bg-gray-900 border-4 border-dashed border-orange-800 rounded-lg overflow-hidden flex items-center justify-center shadow-lg shadow-orange-900/50">
            <video ref={videoRef} muted playsInline className={`w-full h-full object-cover ${!isScreenShareOn && 'hidden'}`}></video>
            {!isScreenShareOn && (
                <div className="text-gray-600 text-center p-4">
                    <p className="text-2xl">Screen sharing is off</p>
                    <p>Click the button below to share your screen</p>
                </div>
            )}
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>

          <div className="flex flex-col items-center justify-center space-y-6">
            <SkeletonIcon isProcessing={isProcessing} />
            <div className="h-32 text-center flex items-center justify-center p-4">
              <p className="text-3xl md:text-4xl text-white font-semibold leading-tight tracking-wide">
                {isProcessing ? "Thinking..." : (lastRoast || "Awaiting victims...")}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <button onClick={toggleScreenShare} className="text-3xl bg-orange-600 text-black font-bold py-4 px-10 rounded-lg hover:bg-orange-500 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-md shadow-orange-700/60">
            {isScreenShareOn ? 'Stop Sharing' : 'Share Your Screen'}
          </button>
            {error && !isBrowserBlocking && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl mx-auto font-sans text-left p-4 bg-red-900 border-2 border-red-700 rounded-lg shadow-lg shadow-red-900/50 z-50">
                    <h3 className="font-['Creepster'] text-2xl text-red-300 mb-2">A ghost in the machine!</h3>
                    <p className="text-red-200">{error}</p>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

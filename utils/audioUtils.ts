/**
 * Plays audio from a Blob object (e.g., a .wav file).
 * @param audioBlob The audio data as a Blob.
 */
export async function playAudio(audioBlob: Blob): Promise<void> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (audioBlob.size === 0) {
        console.error("Received an empty audio blob. Cannot play.");
        return;
    }
    
    try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        return new Promise((resolve) => {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            source.onended = () => {
                setTimeout(() => {
                    audioContext.close().catch(console.error);
                }, 100);
                resolve();
            };

            source.start();
        });
    } catch (error) {
        console.error("Failed to decode or play audio:", error);
        audioContext.close().catch(console.error);
        throw new Error("Failed to process audio data from the server.");
    }
}
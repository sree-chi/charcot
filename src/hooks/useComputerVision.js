// useComputerVision.js
// Rewritten to use MediaPipe Tasks (FaceLandmarker) via CDN.
// Drop-in replacement for your previous hook. Returns: { eyeContact, gazeStability, breathingRate, emotions }

import { useEffect, useRef, useState, useCallback } from 'react';

// Helper: load the Tasks Vision module dynamically from the CDN
const loadMediaPipeTasks = async () => {
  try {
    // Modern browsers support dynamic import of module URLs
    const mod = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest');
    return mod;
  } catch (err) {
    console.error('Failed to dynamically import @mediapipe/tasks-vision from CDN:', err);
    throw err;
  }
};

export const useComputerVision = (videoRef, sessionActive, sessionPaused) => {
  const [eyeContact, setEyeContact] = useState(0);
  const [gazeStability, setGazeStability] = useState(100);
  const [breathingRate, setBreathingRate] = useState(14);
  const [emotions, setEmotions] = useState(null);

  const faceLandmarkerRef = useRef(null);
  const fileResolverRef = useRef(null);
  const animationRef = useRef(null);
  const gazeHistoryRef = useRef([]);
  const breathingHistoryRef = useRef([]);
  const frameCountRef = useRef(0);
  const initializedRef = useRef(false);

  // Initialize MediaPipe Tasks FaceLandmarker
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        console.log('Loading MediaPipe Tasks (FaceLandmarker) from CDN...');
        const tasks = await loadMediaPipeTasks();

        // FilesetResolver expects a wasm files path; use the Tasks Vision wasm folder on jsdelivr
        const { FilesetResolver, FaceLandmarker } = tasks;

        // Provide the wasm assets path
        fileResolverRef.current = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        // Create the FaceLandmarker
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(fileResolverRef.current, {
          baseOptions: {
            modelAssetPath:
              'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/face_landmarker.task'
          },
          numFaces: 1,
          runningMode: 'VIDEO',
          outputFaceBlendshapes: true,
          outputFaceLandmarks: true
        });

        initializedRef.current = true;
        console.log('✅ FaceLandmarker initialized');
      } catch (error) {
        console.error('❌ Error initializing MediaPipe face landmarker:', error);
        initializedRef.current = false;
      }
    };

    init();

    return () => {
      cancelled = true;
      if (faceLandmarkerRef.current) {
        try { faceLandmarkerRef.current.close(); } catch (e) {}
        faceLandmarkerRef.current = null;
      }
      initializedRef.current = false;
    };
  }, []);

  // Frame processing loop
  const processFrame = useCallback(async () => {
    try {
      frameCountRef.current += 1;

      if (!sessionActive || sessionPaused || !videoRef.current || !initializedRef.current) {
        // keep looping to detect when models/video become available
        animationRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const video = videoRef.current;
      if (video.readyState < 2) {
        animationRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Run detection using MediaPipe Tasks API
      const faceLandmarker = faceLandmarkerRef.current;
      if (!faceLandmarker) {
        animationRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // The Tasks API provides detectForVideo (synchronous), but wrapping in try/catch
      let results = null;
      try {
        // detectForVideo expects (videoElement, timestamp)
        results = faceLandmarker.detectForVideo(video, performance.now());
      } catch (err) {
        // Some builds use async detect; attempt that
        if (faceLandmarker.detect) {
          results = await faceLandmarker.detect(video);
        } else {
          console.error('FaceLandmarker detection error:', err);
        }
      }

      if (results && results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        // MediaPipe returns categories: each entry has categoryName and score
        const blends = results.faceBlendshapes[0].categories || [];
        // Map into the shape your app expects: {happy: 0.4, sad: 0.1...}
        const emotionMap = {};
        blends.forEach(cat => {
          const name = cat.categoryName.replace(/\s+/g, '').toLowerCase();
          emotionMap[name] = cat.score;
        });

        // Provide fallback keys that your UI expects
        const normalized = {
          happy: emotionMap.mouthsmileleft || emotionMap.mouthsmileright || emotionMap.happy || 0,
          sad: emotionMap.mouthfrownleft || emotionMap.mouthfrownright || emotionMap.sad || 0,
          surprised: emotionMap.jawopen || emotionMap.eyewideleft || emotionMap.eyewideright || 0,
          angry: emotionMap.browdownleft || emotionMap.browdownright || emotionMap.angry || 0,
          neutral: Math.max(0, 1 - ( (emotionMap.happy||0) + (emotionMap.sad||0) + (emotionMap.surprised||0) + (emotionMap.angry||0) ))
        };

        setEmotions(normalized);
      } else if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
        // No blendshapes but landmarks exist; set emotions to null so UI shows "Initializing..." or neutral
        setEmotions(null);
      } else {
        // No face detected
        setEmotions(null);
        setEyeContact(0);
        setGazeStability(0);
      }

      // Compute other metrics (try to use faceLandmarks if available)
      const landmarks = results && results.faceLandmarks && results.faceLandmarks[0] && results.faceLandmarks[0].map
        ? results.faceLandmarks[0].map(p => ({ x: p.x * video.videoWidth, y: p.y * video.videoHeight }))
        : null;

      if (landmarks && landmarks.length >= 468) {
        // Reuse your previous calculations with slight adaption
        const nose = landmarks[1];
        const upperLip = landmarks[13] || landmarks[0];

        // Eye contact
        try {
          const noseXNorm = Math.abs((nose.x / video.videoWidth) - 0.5);
          const noseYNorm = Math.abs((nose.y / video.videoHeight) - 0.5);
          const totalDeviation = (noseXNorm * 100) + (noseYNorm * 100);
          const eyeContactPct = Math.max(0, Math.min(100, 100 - (totalDeviation * 2.5)));
          setEyeContact(Math.round(eyeContactPct));
        } catch (e) { console.error('eye contact calc failed', e); }

        // Gaze stability
        try {
          const now = Date.now();
          gazeHistoryRef.current.push({ x: nose.x, y: nose.y, timestamp: now });
          gazeHistoryRef.current = gazeHistoryRef.current.filter(p => now - p.timestamp < 2000);
          if (gazeHistoryRef.current.length < 10) {
            setGazeStability(90);
          } else {
            const positions = gazeHistoryRef.current;
            const avgX = positions.reduce((s,p)=> s + p.x, 0) / positions.length;
            const avgY = positions.reduce((s,p)=> s + p.y, 0) / positions.length;
            const variance = positions.reduce((sum,p)=> {
              const dx = p.x - avgX; const dy = p.y - avgY; return sum + Math.sqrt(dx*dx + dy*dy);
            }, 0) / positions.length;
            const stability = Math.max(0, Math.min(100, 100 - (variance * 4)));
            setGazeStability(Math.round(stability));
          }
        } catch (e) { console.error('gaze calc failed', e); }

        // Breathing (nose-mouth vertical distance over time)
        try {
          const now = Date.now();
          const noseToMouthDist = nose.y - upperLip.y;
          breathingHistoryRef.current.push({ distance: noseToMouthDist, timestamp: now });
          breathingHistoryRef.current = breathingHistoryRef.current.filter(h => now - h.timestamp < 10000);

          if (breathingHistoryRef.current.length >= 50) {
            const distances = breathingHistoryRef.current.map(h => h.distance);
            const avg = distances.reduce((a,b)=>a+b,0)/distances.length;
            let peaks = 0;
            for (let i=1;i<distances.length-1;i++){
              if (distances[i] > distances[i-1] && distances[i] > distances[i+1] && distances[i] > avg * 1.01) {
                peaks++; i+=3;
              }
            }
            const duration = (now - breathingHistoryRef.current[0].timestamp) / 1000;
            const breathsPerMinute = duration > 0 ? (peaks / duration) * 60 : breathingRate;
            const clampedRate = Math.max(8, Math.min(30, breathsPerMinute));
            const smoothed = (clampedRate + breathingRate) / 2;
            setBreathingRate(Math.round(smoothed * 10) / 10);
          }
        } catch (e) { console.error('breathing calc failed', e); }
      }

    } catch (error) {
      console.error('Error in processFrame:', error);
    } finally {
      animationRef.current = requestAnimationFrame(processFrame);
    }
  }, [sessionActive, sessionPaused, videoRef, breathingRate]);

  // Start/stop loop
  useEffect(() => {
    frameCountRef.current = 0;
    if (!animationRef.current) {
      animationRef.current = requestAnimationFrame(processFrame);
      console.log('Starting face detection processing loop...');
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        console.log('Processing loop stopped');
      }
    };
  }, [processFrame]);

  // Cleanup faceLandmarker when hook unmounts
  useEffect(() => {
    return () => {
      if (faceLandmarkerRef.current) {
        try { faceLandmarkerRef.current.close(); } catch (e) {}
        faceLandmarkerRef.current = null;
      }
      if (fileResolverRef.current) {
        fileResolverRef.current = null;
      }
    };
  }, []);

  return { eyeContact, gazeStability, breathingRate, emotions };
};
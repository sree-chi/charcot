import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-converter';
import '@tensorflow/tfjs-backend-webgl';
// We have removed the problematic face-api.js import

/**
 * This helper function maps MediaPipe blendshapes to simple emotion labels.
 * Blendshapes are muscle movements detected by the MediaPipe model.
 */
const calculateEmotionsFromBlendshapes = (blendshapes) => {
  if (!blendshapes || blendshapes.length === 0) {
    return null; // Not enough data
  }

  // Helper to find the score of a specific facial muscle movement
  const findScore = (categoryName) => {
    const found = blendshapes.find(shape => shape.categoryName === categoryName);
    return found ? found.score : 0;
  };

  // Simple mapping logic:
  // We check the scores of movements related to specific emotions.
  const happyScore = Math.max(findScore('mouthSmileLeft'), findScore('mouthSmileRight'));
  const sadScore = Math.max(findScore('mouthFrownLeft'), findScore('mouthFrownRight'), findScore('browDownLeft'), findScore('browDownRight'));
  const surpriseScore = Math.max(findScore('browInnerUp'), findScore('jawOpen'), findScore('eyeWideLeft'), findScore('eyeWideRight'));
  const angryScore = Math.max(findScore('browDownLeft'), findScore('browDownRight'), findScore('mouthFrownLeft'));
  
  // Normalize the scores (simplified)
  const total = happyScore + sadScore + surpriseScore + angryScore + 0.0001; // Add epsilon to avoid division by zero
  const emotions = {
    happy: happyScore / total,
    sad: sadScore / total,
    surprised: surpriseScore / total,
    angry: angryScore / total,
    neutral: Math.max(0, 1.0 - (total * 2)) // Whatever is left over is "neutral"
  };

  return emotions;
};


export const useComputerVision = (videoRef, sessionActive, sessionPaused) => {
  // State for all our metrics
  const [eyeContact, setEyeContact] = useState(0);
  const [gazeStability, setGazeStability] = useState(100);
  const [breathingRate, setBreathingRate] = useState(14);
  const [emotions, setEmotions] = useState(null); // Emotion state

  // Refs to hold data between renders without causing re-renders
  const detectorRef = useRef(null);
  const breathingHistoryRef = useRef([]);
  const gazeHistoryRef = useRef([]);
  const animationFrameRef = useRef(null); // Holds the ID of the animation frame
  const canvasRef = useRef(null);
  const modelsLoadedRef = useRef(false);
  const frameCountRef = useRef(0);

  // Effect to initialize the MediaPipe model on component mount
  useEffect(() => {
    const initModels = async () => {
      try {
        console.log('Starting model initialization...');
        
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
          runtime: 'tfjs',
          refineLandmarks: true, // Gets detailed 478 landmarks
          maxFaces: 1,
          outputBlendshapes: true, // <-- This is the key: tells MediaPipe to output emotion data
        };

        console.log('Creating detector with config:', detectorConfig);
        detectorRef.current = await faceLandmarksDetection.createDetector(model, detectorConfig);
        console.log('✅ Face landmarks detector initialized (MediaPipe)');
        
        modelsLoadedRef.current = true; // Flag that models are ready
      } catch (error) {
        console.error('❌ Error initializing MediaPipe detector:', error);
        modelsLoadedRef.current = false;
      }
    };

    initModels();

    // Cleanup function when component unmounts
    return () => {
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
      modelsLoadedRef.current = false;
    };
  }, []); // Empty dependency array, runs once on mount

  // Define the main processing loop using useCallback
  const processFrame = useCallback(async () => {
    // 1. Guard Clause: Check if we should be running
    if (!sessionActive || sessionPaused || !videoRef.current || !modelsLoadedRef.current) {
      if (frameCountRef.current % 60 === 0) { // Log once per second if waiting
        console.warn('Skipping frame processing. Waiting for: ', {
            sessionActive,
            sessionPaused,
            videoReady: videoRef.current?.readyState,
            modelsLoaded: modelsLoadedRef.current
        });
      }
      frameCountRef.current += 1;
      // Keep requesting the next frame to continue checking
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // 2. Guard Clause: Check if video is ready
    if (videoRef.current.readyState < 2) {
         animationFrameRef.current = requestAnimationFrame(processFrame);
         return;
    }

    try {
      frameCountRef.current += 1;
      const video = videoRef.current;
      const frameCount = frameCountRef.current;

      // 3. Prepare Canvas
      // We draw the video to a hidden canvas for processing
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      
      const canvas = canvasRef.current;
      // Ensure canvas dimensions match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        if (canvas.width === 0 || canvas.height === 0) {
          // Video dimensions not ready, skip this frame
          animationFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
         animationFrameRef.current = requestAnimationFrame(processFrame);
         return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 4. Run AI Detection
      if (detectorRef.current) {
        // Run the MediaPipe model on the canvas
        const faces = await detectorRef.current.estimateFaces(canvas, {
          flipHorizontal: false
        });

        if (faces && faces.length > 0) {
          const face = faces[0];
          const keypoints = face.keypoints;
          const blendshapes = face.blendshapes; // <-- Get the emotion data

          // --- Calculate Emotions ---
          if (blendshapes) {
            const emotionData = calculateEmotionsFromBlendshapes(blendshapes);
            setEmotions(emotionData); // <-- Update React state with emotions
          }

          // --- Calculate Other Metrics ---
          if (keypoints && keypoints.length >= 468) {
            const eyeContactValue = calculateEyeContact(keypoints, canvas.width, canvas.height);
            setEyeContact(eyeContactValue); // <-- Update React state

            const gazeStabilityValue = calculateGazeStability(keypoints);
            setGazeStability(gazeStabilityValue); // <-- Update React state

            const breathingValue = calculateBreathing(keypoints);
            setBreathingRate(breathingValue); // <-- Update React state
          } 
        } else {
           // No face detected, reset metrics to idle values
           setEmotions(null);
           setEyeContact(0);
           setGazeStability(0);
        }
      }
    } catch (error) {
      console.error('❌ Error processing frame:', error);
    }

    // 5. Continue the loop
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [sessionActive, sessionPaused, videoRef]); // Dependencies for useCallback

  // This useEffect hook starts and stops the processing loop
  useEffect(() => {
    if (sessionActive && !sessionPaused) {
      console.log('🎬 Starting face detection processing loop...');
      frameCountRef.current = 0; // Reset frame count on start
      animationFrameRef.current = requestAnimationFrame(processFrame); // Start the loop
    }

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      console.log('🛑 Processing loop stopped');
    };
  }, [sessionActive, sessionPaused, processFrame]);

  // --- Metric Calculation Functions ---

  const calculateEyeContact = (keypoints, imageWidth, imageHeight) => {
    try {
      const noseTip = keypoints[1];
      if (!noseTip || !imageWidth || !imageHeight) {
        return eyeContact; 
      }
      const noseXNorm = Math.abs((noseTip.x / imageWidth) - 0.5);
      const noseYNorm = Math.abs((noseTip.y / imageHeight) - 0.5);
      const totalDeviation = (noseXNorm * 100) + (noseYNorm * 100);
      const eyeContactPct = Math.max(0, Math.min(100, 100 - (totalDeviation * 2.5)));
      return Math.round(eyeContactPct);
    } catch (error) {
      console.error('Error calculating eye contact:', error);
      return eyeContact;
    }
  };

  const calculateGazeStability = (keypoints) => {
    try {
      const noseTip = keypoints[1];
      if (!noseTip) return gazeStability;

      const now = Date.now();
      gazeHistoryRef.current.push({ x: noseTip.x, y: noseTip.y, timestamp: now });
      gazeHistoryRef.current = gazeHistoryRef.current.filter(p => now - p.timestamp < 2000);

      if (gazeHistoryRef.current.length < 10) {
        return 90;
      }

      const positions = gazeHistoryRef.current;
      const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
      const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
      const variance = positions.reduce((sum, p) => {
        const dx = p.x - avgX;
        const dy = p.y - avgY;
        return sum + Math.sqrt(dx * dx + dy * dy);
      }, 0) / positions.length;

      const stability = Math.max(0, Math.min(100, 100 - (variance * 4)));
      return Math.round(stability);
    } catch (error) {
      console.error('Error calculating gaze stability:', error);
      return gazeStability;
    }
  };

  const calculateBreathing = (keypoints) => {
    try {
      const noseTip = keypoints[1];
      const upperLip = keypoints[13];
      if (!noseTip || !upperLip) {
        return breathingRate;
      }

      const noseToMouthDist = noseTip.y - upperLip.y; // Simple Y-axis distance
      const now = Date.now();
      breathingHistoryRef.current.push({
        distance: noseToMouthDist,
        timestamp: now
      });

      breathingHistoryRef.current = breathingHistoryRef.current.filter(
        h => now - h.timestamp < 10000
      );

      if (breathingHistoryRef.current.length < 50) {
        return breathingRate; 
      }

      const distances = breathingHistoryRef.current.map(h => h.distance);
      const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
      
      let peaks = 0;
      for (let i = 1; i < distances.length - 1; i++) {
        if (distances[i] > distances[i-1] && distances[i] > distances[i+1] && distances[i] > avg * 1.01) {
          peaks++;
          i += 3; 
        }
      }

      const duration = (now - breathingHistoryRef.current[0].timestamp) / 1000;
      if (duration < 5) return breathingRate;
      
      const breathsPerMinute = (peaks / duration) * 60;
      const clampedRate = Math.max(8, Math.min(30, breathsPerMinute));
      
      // Simple smoothing: average with the last value
      const smoothedRate = (clampedRate + breathingRate) / 2;
      
      return Math.round(smoothedRate * 10) / 10;
    } catch (error) {
      console.error('Error calculating breathing:', error);
      return breathingRate;
    }
  };

  // Return all metrics to the App component
  return {
    eyeContact,
    gazeStability,
    breathingRate,
    emotions
  };
};
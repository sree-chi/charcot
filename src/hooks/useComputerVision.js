// src/hooks/useComputerVision.js

import React, { useEffect, useRef, useState } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as faceapi from 'face-api.js'; // 1. Import face-api.js
import '@tensorflow/tfjs-core';
// ... other imports

export const useComputerVision = (videoRef, sessionActive, sessionPaused) => {
  const [eyeContact, setEyeContact] = useState(0);
  const [gazeStability, setGazeStability] = useState(100);
  const [breathingRate, setBreathingRate] = useState(14);
  const [emotions, setEmotions] = useState(null); // 2. Add state for emotions

  const detectorRef = useRef(null);
  // ... other refs

  // Initialize face detector AND emotion models
  useEffect(() => {
    const initModels = async () => {
      try {
        console.log('Starting model initialization...');

        // --- Load face-api.js models for emotion detection ---
        // Ensure models are in your /public/models directory
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]);
        console.log('✅ Emotion models loaded (face-api.js)');

        // --- Load MediaPipeFaceMesh (existing code) ---
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
          runtime: 'tfjs',
          refineLandmarks: true,
          maxFaces: 1
        };
        detectorRef.current = await faceLandmarksDetection.createDetector(model, detectorConfig);
        console.log('✅ Face landmarks detector initialized (MediaPipe)');

      } catch (error) {
        console.error('❌ Error initializing models:', error);
      }
    };

    initModels();
    
    // ... rest of useEffect
  }, []);

  // Main processing loop
  useEffect(() => {
    // ... (no changes needed here until processFrame)

    const processFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !detectorRef.current || !faceapi.nets.tinyFaceDetector.isLoaded) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      try {
        frameCount++;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        // ... (canvas drawing code remains the same)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // --- 3. Run Emotion Detection (face-api.js) ---
        // We run this in parallel to the main face mesh detection
        if (frameCount % 15 === 0) { // Run emotion check less frequently to save performance
            const emotionDetections = await faceapi
                .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
                .withFaceExpressions();
            
            if (emotionDetections && emotionDetections.length > 0) {
                // Find the largest face (likely the main user)
                const sortedDetections = emotionDetections.sort((a, b) => b.detection.box.area - a.detection.box.area);
                setEmotions(sortedDetections[0].expressions);
                if (frameCount % 30 === 0) {
                  console.log('Emotions:', sortedDetections[0].expressions);
                }
            } else if (frameCount % 30 === 0) {
                console.log('⚠️ No face detected for emotion');
            }
        }


        // --- Existing MediaPipe Landmark Detection ---
        const faces = await detectorRef.current.estimateFaces(canvas, {
          flipHorizontal: false
        });

        if (faces && faces.length > 0) {
          const face = faces[0];

          // Calculate existing metrics
          const eyeContactValue = calculateEyeContact(face.keypoints);
          setEyeContact(eyeContactValue);
          // ... (calculate gazeStability, calculateBreathing)
          
          // ...
        } 
        // ... (rest of the try/catch block)
      } catch (error) {
        console.error('❌ Error processing frame:', error);
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();

    // ... (cleanup function remains the same)
  }, [sessionActive, sessionPaused, videoRef]);

  // ... (all calculate... functions remain the same) ...

  return {
    eyeContact,
    gazeStability,
    breathingRate,
    emotions // 4. Return emotions from the hook
  };
};
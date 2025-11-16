import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

export const useEmotionDetection = (videoRef, sessionActive, sessionPaused) => {
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [emotionConfidence, setEmotionConfidence] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const detectionIntervalRef = useRef(null);
  const initialTimeoutRef = useRef(null);

  // Load face-api.js models from CDN
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('🧠 Loading emotion detection models from CDN...');

        // Load from primary CDN
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);

        console.log('✅ Emotion detection models loaded successfully');
        setIsModelLoaded(true);
      } catch (error) {
        console.error('❌ Error loading emotion models:', error);
        console.log('ℹ️ Trying alternative CDN...');

        // Fallback: try alternative CDN
        try {
          const ALT_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(ALT_MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(ALT_MODEL_URL)
          ]);
          console.log('✅ Models loaded from alternative CDN');
          setIsModelLoaded(true);
        } catch (fallbackError) {
          console.error('❌ All model loading attempts failed:', fallbackError);
        }
      }
    };

    loadModels();
  }, []);

  // Detect emotions from video
  useEffect(() => {
    if (!sessionActive || sessionPaused || !videoRef.current || !isModelLoaded) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
        initialTimeoutRef.current = null;
      }
      console.log('⏸️ Emotion detection paused - waiting for requirements', {
        sessionActive,
        sessionPaused,
        hasVideo: !!videoRef.current,
        isModelLoaded
      });
      return;
    }

    console.log('😊 Starting emotion detection...', {
      modelLoaded: isModelLoaded,
      videoExists: !!videoRef.current,
      tinyFaceDetectorLoaded: faceapi.nets.tinyFaceDetector.isLoaded,
      faceExpressionLoaded: faceapi.nets.faceExpressionNet.isLoaded
    });

    const detectEmotions = async () => {
      if (!videoRef.current) {
        console.log('⚠️ Video ref not available');
        return;
      }

      // Wait for video to be ready with actual frames
      if (videoRef.current.readyState < 3) {
        console.log('⚠️ Video not ready yet, readyState:', videoRef.current.readyState);
        return;
      }

      // Check if video has actual dimensions
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        console.log('⚠️ Video has no dimensions yet');
        return;
      }

      try {
        // Double-check models are loaded
        if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceExpressionNet.isLoaded) {
          console.error('❌ Models not loaded! TinyFaceDetector:', faceapi.nets.tinyFaceDetector.isLoaded,
                       'FaceExpression:', faceapi.nets.faceExpressionNet.isLoaded);
          return;
        }

        // Use more sensitive detection options
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,  // Larger = more accurate (128, 224, 320, 416, 512, 608)
          scoreThreshold: 0.4  // Lower = more sensitive (0-1)
        });

        console.log('🔍 Running face detection with options:', options);

        // Detect face with expressions
        const detections = await faceapi
          .detectSingleFace(videoRef.current, options)
          .withFaceExpressions();

        console.log('🔍 Detection result:', detections ? 'Face found' : 'No face');

        if (detections && detections.expressions) {
          // Get the dominant emotion
          const expressions = detections.expressions;

          // Log all expressions for debugging
          console.log('📊 All expressions:', expressions);

          const emotionEntries = Object.entries(expressions);

          // Find emotion with highest confidence
          const [dominantEmotion, confidence] = emotionEntries.reduce((max, current) =>
            current[1] > max[1] ? current : max
          );

          // Update state with detected emotion
          setCurrentEmotion(dominantEmotion);
          setEmotionConfidence(Math.round(confidence * 100));

          console.log(`😊 Detected emotion: ${dominantEmotion} (${Math.round(confidence * 100)}%)`);
          console.log(`   Top 3: ${emotionEntries
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([e, c]) => `${e}:${Math.round(c * 100)}%`)
            .join(', ')}`);
        } else {
          console.log('⚠️ No face detected for emotion analysis');
          console.log('   Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          console.log('   Video playing:', !videoRef.current.paused);
        }
      } catch (error) {
        console.error('❌ Error detecting emotions:', error);
        console.error('   Error details:', error.message);
      }
    };

    // Run emotion detection every 3 seconds (synced with metrics collection)
    detectionIntervalRef.current = setInterval(detectEmotions, 3000);

    // Initial detection after 3 seconds to ensure video is ready
    initialTimeoutRef.current = setTimeout(() => {
      console.log('🎬 Running initial emotion detection...');
      detectEmotions();
    }, 3000);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
        initialTimeoutRef.current = null;
      }
      console.log('🛑 Emotion detection stopped');
    };
  }, [sessionActive, sessionPaused, videoRef, isModelLoaded]);

  return {
    currentEmotion,
    emotionConfidence,
    isModelLoaded
  };
};

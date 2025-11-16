import { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

export const useEmotionDetection = (videoRef, sessionActive, sessionPaused) => {
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [emotionConfidence, setEmotionConfidence] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const detectionIntervalRef = useRef(null);
  const initialTimeoutRef = useRef(null);
  const canvasRef = useRef(null);

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
        return;
      }

      // Wait for video to be ready with actual frames
      const readyState = videoRef.current.readyState;
      if (readyState < 2) {
        return;
      }

      // Check if video has actual dimensions
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      if (width === 0 || height === 0) {
        return;
      }

      try {
        // Double-check models are loaded
        if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceExpressionNet.isLoaded) {
          return;
        }

        // Create canvas and draw video frame to it (fixes TensorFlow.js compatibility)
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }

        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        // Draw video frame to canvas (undo the mirror transform for detection)
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        // Use more sensitive detection options
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,  // Larger = more accurate (128, 224, 320, 416, 512, 608)
          scoreThreshold: 0.4  // Lower = more sensitive (0-1)
        });

        // Detect face with expressions using canvas instead of video element
        const detections = await faceapi
          .detectSingleFace(canvas, options)
          .withFaceExpressions();

        if (detections && detections.expressions) {
          // Get the dominant emotion
          const expressions = detections.expressions;
          const emotionEntries = Object.entries(expressions);

          // Find emotion with highest confidence
          const [dominantEmotion, confidence] = emotionEntries.reduce((max, current) =>
            current[1] > max[1] ? current : max
          );

          // Update state with detected emotion
          setCurrentEmotion(dominantEmotion);
          setEmotionConfidence(Math.round(confidence * 100));

          // Only log occasionally (every 5 seconds)
          if (Math.random() < 0.2) {
            console.log(`😊 Emotion: ${dominantEmotion} (${Math.round(confidence * 100)}%)`);
          }
        }
      } catch (error) {
        // Silently fail - don't spam console
      }
    };

    // Run emotion detection every 1 second for real-time updates
    detectionIntervalRef.current = setInterval(() => {
      detectEmotions();
    }, 1000);

    // Initial detection after 2 seconds to ensure video is ready
    initialTimeoutRef.current = setTimeout(() => {
      detectEmotions();
    }, 2000);

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

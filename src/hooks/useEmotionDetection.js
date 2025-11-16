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
      console.log('🎯 detectEmotions called at', new Date().toLocaleTimeString());

      if (!videoRef.current) {
        console.log('⚠️ Video ref not available');
        return;
      }
      console.log('✓ Video ref exists');

      // Wait for video to be ready with actual frames
      const readyState = videoRef.current.readyState;
      console.log('📹 Video readyState:', readyState,
                  '(0=nothing, 1=metadata, 2=current, 3=future, 4=enough)');
      if (readyState < 2) {
        console.log('⚠️ Video not ready yet, waiting...');
        return;
      }

      // Check if video has actual dimensions
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      console.log('📐 Video dimensions:', width, 'x', height);
      if (width === 0 || height === 0) {
        console.log('⚠️ Video has no dimensions yet');
        return;
      }
      console.log('✓ Video ready for detection');

      try {
        // Double-check models are loaded
        if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceExpressionNet.isLoaded) {
          console.error('❌ Models not loaded! TinyFaceDetector:', faceapi.nets.tinyFaceDetector.isLoaded,
                       'FaceExpression:', faceapi.nets.faceExpressionNet.isLoaded);
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

        console.log('🎨 Canvas prepared:', canvas.width, 'x', canvas.height);

        // Use more sensitive detection options
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,  // Larger = more accurate (128, 224, 320, 416, 512, 608)
          scoreThreshold: 0.4  // Lower = more sensitive (0-1)
        });

        console.log('🔍 Running face detection with options:', options);

        // Detect face with expressions using canvas instead of video element
        const detections = await faceapi
          .detectSingleFace(canvas, options)
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

    // Run emotion detection every 1 second for real-time updates
    console.log('⏰ Setting up emotion detection interval (every 1 second)...');
    detectionIntervalRef.current = setInterval(() => {
      console.log('⏰ Interval triggered - calling detectEmotions');
      detectEmotions();
    }, 1000);
    console.log('✓ Interval set, ID:', detectionIntervalRef.current);

    // Initial detection after 2 seconds to ensure video is ready
    console.log('⏰ Setting up initial detection timeout (2 seconds)...');
    initialTimeoutRef.current = setTimeout(() => {
      console.log('🎬 Initial timeout triggered - running first emotion detection...');
      detectEmotions();
    }, 2000);
    console.log('✓ Timeout set, ID:', initialTimeoutRef.current);

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

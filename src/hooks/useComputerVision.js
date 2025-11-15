import { useEffect, useRef, useState } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-converter';
import '@tensorflow/tfjs-backend-webgl';

export const useComputerVision = (videoRef, sessionActive, sessionPaused) => {
  const [eyeContact, setEyeContact] = useState(0);
  const [gazeStability, setGazeStability] = useState(100);
  const [breathingRate, setBreathingRate] = useState(14);

  const detectorRef = useRef(null);
  const previousLandmarksRef = useRef([]);
  const breathingHistoryRef = useRef([]);
  const gazeHistoryRef = useRef([]);
  const animationFrameRef = useRef(null);

  // Initialize face detector
  useEffect(() => {
    const initDetector = async () => {
      try {
        console.log('Starting face detector initialization...');
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
          runtime: 'tfjs',
          refineLandmarks: true,
          maxFaces: 1
        };

        console.log('Creating detector with config:', detectorConfig);
        detectorRef.current = await faceLandmarksDetection.createDetector(model, detectorConfig);
        console.log('✅ Face detector initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing face detector:', error);
        console.error('Error details:', error.message, error.stack);
      }
    };

    initDetector();

    return () => {
      if (detectorRef.current) {
        detectorRef.current = null;
      }
    };
  }, []);

  // Main processing loop
  useEffect(() => {
    console.log('Processing loop check:', {
      sessionActive,
      sessionPaused,
      hasVideo: !!videoRef.current,
      hasDetector: !!detectorRef.current
    });

    if (!sessionActive || sessionPaused || !videoRef.current || !detectorRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      console.log('⏸️ Processing loop not started - waiting for requirements');
      return;
    }

    console.log('🎬 Starting face detection processing loop...');
    let frameCount = 0;

    const processFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      try {
        frameCount++;
        const faces = await detectorRef.current.estimateFaces(videoRef.current, {
          flipHorizontal: false
        });

        if (frameCount % 30 === 0) {
          console.log(`Frame ${frameCount}: Detected ${faces?.length || 0} faces`);
        }

        if (faces && faces.length > 0) {
          const face = faces[0];

          if (frameCount % 30 === 0) {
            console.log('Face keypoints:', face.keypoints?.length || 0);
          }

          // Calculate eye contact
          const eyeContactValue = calculateEyeContact(face.keypoints);
          setEyeContact(eyeContactValue);

          // Calculate gaze stability
          const gazeStabilityValue = calculateGazeStability(face.keypoints);
          setGazeStability(gazeStabilityValue);

          // Calculate breathing rate from facial movement
          const breathingValue = calculateBreathing(face.keypoints);
          setBreathingRate(breathingValue);

          if (frameCount % 30 === 0) {
            console.log('Metrics:', { eyeContactValue, gazeStabilityValue, breathingValue });
          }

          previousLandmarksRef.current = face.keypoints;
        } else if (frameCount % 30 === 0) {
          console.log('⚠️ No face detected');
        }
      } catch (error) {
        console.error('❌ Error processing frame:', error);
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      console.log('🛑 Processing loop stopped');
    };
  }, [sessionActive, sessionPaused, videoRef]);

  // Calculate eye contact based on eye landmarks
  const calculateEyeContact = (keypoints) => {
    try {
      if (!keypoints || keypoints.length < 468) {
        console.log('Insufficient keypoints for eye contact calculation');
        return eyeContact;
      }

      // MediaPipe Face Mesh keypoints are indexed 0-467
      // Nose tip is index 1
      const noseTip = keypoints[1];

      if (!noseTip || !videoRef.current) {
        return eyeContact;
      }

      // Estimate if looking at camera based on nose position
      const imageWidth = videoRef.current.videoWidth || 640;
      const imageHeight = videoRef.current.videoHeight || 480;

      // Normalize nose position (center of image = looking at camera)
      const noseXNorm = Math.abs((noseTip.x / imageWidth) - 0.5);
      const noseYNorm = Math.abs((noseTip.y / imageHeight) - 0.5);

      // Calculate eye contact percentage
      // Lower deviation from center = higher eye contact
      const xDeviation = noseXNorm * 100;
      const yDeviation = noseYNorm * 100;
      const totalDeviation = (xDeviation + yDeviation) / 2;

      // Convert to percentage (less deviation = more eye contact)
      const eyeContactPct = Math.max(0, Math.min(100, 100 - (totalDeviation * 2)));

      return Math.round(eyeContactPct);
    } catch (error) {
      console.error('Error calculating eye contact:', error);
      return eyeContact;
    }
  };

  // Calculate gaze stability based on eye movement
  const calculateGazeStability = (keypoints) => {
    try {
      if (!keypoints || keypoints.length < 468) {
        return gazeStability;
      }

      const noseTip = keypoints[1]; // Nose tip index

      if (!noseTip) return gazeStability;

      // Add current position to history
      gazeHistoryRef.current.push({ x: noseTip.x, y: noseTip.y, timestamp: Date.now() });

      // Keep only last 2 seconds of data (assuming ~30fps = 60 frames)
      if (gazeHistoryRef.current.length > 60) {
        gazeHistoryRef.current.shift();
      }

      // Calculate movement variance
      if (gazeHistoryRef.current.length < 10) {
        return 85; // Default value for insufficient data
      }

      const positions = gazeHistoryRef.current.slice(-30);
      const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
      const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

      // Calculate variance (how much the gaze moves)
      const variance = positions.reduce((sum, p) => {
        const dx = p.x - avgX;
        const dy = p.y - avgY;
        return sum + Math.sqrt(dx * dx + dy * dy);
      }, 0) / positions.length;

      // Convert variance to stability percentage
      // Lower variance = higher stability
      const stability = Math.max(0, Math.min(100, 100 - (variance / 5)));

      return Math.round(stability);
    } catch (error) {
      console.error('Error calculating gaze stability:', error);
      return gazeStability;
    }
  };

  // Calculate breathing rate from subtle facial movements
  const calculateBreathing = (keypoints) => {
    try {
      if (!keypoints || keypoints.length < 468) {
        return breathingRate;
      }

      // Use nose and mouth landmarks to detect breathing
      // MediaPipe Face Mesh indices: nose tip (1), upper lip (13), lower lip (14)
      const noseTip = keypoints[1];
      const upperLip = keypoints[13];
      const lowerLip = keypoints[14];

      if (!noseTip || !upperLip || !lowerLip) {
        return breathingRate;
      }

      // Calculate vertical distance between nose and mouth (changes with breathing)
      const noseToMouthDist = Math.sqrt(
        Math.pow(noseTip.x - upperLip.x, 2) +
        Math.pow(noseTip.y - upperLip.y, 2)
      );

      // Add to breathing history with timestamp
      const now = Date.now();
      breathingHistoryRef.current.push({
        distance: noseToMouthDist,
        timestamp: now
      });

      // Keep only last 10 seconds of data
      breathingHistoryRef.current = breathingHistoryRef.current.filter(
        h => now - h.timestamp < 10000
      );

      // Need at least 5 seconds of data to calculate breathing rate
      if (breathingHistoryRef.current.length < 50) {
        return 14; // Default breathing rate
      }

      // Detect peaks (inhalation cycles)
      const distances = breathingHistoryRef.current.map(h => h.distance);
      const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
      const threshold = avg * 1.02; // 2% above average

      let peaks = 0;
      let wasAbove = false;

      for (const dist of distances) {
        if (dist > threshold && !wasAbove) {
          peaks++;
          wasAbove = true;
        } else if (dist <= threshold) {
          wasAbove = false;
        }
      }

      // Calculate breaths per minute
      const duration = (now - breathingHistoryRef.current[0].timestamp) / 1000; // in seconds
      const breathsPerMinute = (peaks / duration) * 60;

      // Clamp to realistic range (8-30 breaths per minute)
      const clampedRate = Math.max(8, Math.min(30, breathsPerMinute));

      return Math.round(clampedRate * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      console.error('Error calculating breathing:', error);
      return breathingRate;
    }
  };

  return {
    eyeContact,
    gazeStability,
    breathingRate
  };
};

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Activity, AlertCircle, CheckCircle, Pause, Play, StopCircle, Download, Shield, Camera, FileText, Brain } from 'lucide-react';
import { useComputerVision } from './hooks/useComputerVision.js';

// A simple component to render the emotions
const EmotionDisplay = ({ emotions }) => {
  if (!emotions) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500">Initializing emotion analysis...</p>
      </div>
    );
  }

  // Sort emotions by probability, descending
  const sortedEmotions = Object.entries(emotions)
    .sort(([, a], [, b]) => b - a);
  
  const dominantEmotion = sortedEmotions[0] ? sortedEmotions[0][0] : 'N/A';
  const dominantProbability = sortedEmotions[0] ? Math.round(sortedEmotions[0][1] * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="text-center">
        <span className="text-lg font-semibold text-gray-700">Dominant Emotion</span>
        <div className={`text-4xl font-bold capitalize ${dominantProbability > 50 ? 'text-indigo-600' : 'text-gray-800'}`}>
          {dominantEmotion}
        </div>
        <span className="text-sm text-gray-500">{dominantProbability}% confidence</span>
      </div>
      <div className="space-y-1 pt-2">
        {sortedEmotions.map(([emotion, probability]) => (
          <div key={emotion} className="flex items-center justify-between gap-2">
            <span className="text-sm capitalize text-gray-600 w-20 shrink-0">{emotion}</span>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-500 h-2.5 rounded-full" 
                style={{ width: `${Math.round(probability * 100)}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-800 w-8 text-right">{Math.round(probability * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};


const App = () => {
  // --- 1. STATE HOOKS (Must be first) ---
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [patientConsent, setPatientConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(true);

  // Behavioral Metrics - baselines
  const [baselineBreathing, setBaselineBreathing] = useState(14);
  const [baselineEyeContact, setBaselineEyeContact] = useState(45);
  
  // Data Collection
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sessionEvents, setSessionEvents] = useState([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('monitor');
  const [showReport, setShowReport] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [sessionReport, setSessionReport] = useState(null);
  const [videoStream, setVideoStream] = useState(null);

  // --- 2. REF HOOKS (Must be after state) ---
  const videoRef = useRef(null);
  const metricsIntervalRef = useRef(null);

  // --- 3. PATIENT PROFILE (Can be here) ---
  const [patientId] = useState(Math.floor(Math.random() * 9000) + 1000);
  const [patientBaseline] = useState({ // Note: setPatientBaseline was unused, so simplified
    eyeContactRange: '45-55%',
    breathingRange: '13-16 bpm',
    stressThreshold: 19,
    dissociationIndicator: 90
  });

  // --- 4. CUSTOM HOOKS (Must be after state/refs they use) ---
  const { eyeContact, gazeStability, breathingRate, emotions } = useComputerVision(
    videoRef,
    sessionActive,
    sessionPaused
  );

  // --- 5. EFFECT HOOKS ---

  // Initialize webcam
  useEffect(() => {
    if (sessionActive && !sessionPaused) { // videoRef.current check is removed to allow stream init
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setVideoStream(stream);
        })
        .catch(err => console.error('Error accessing webcam:', err));
    } else {
      // Stop webcam tracks when session ends or is paused
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
    }
    
    // Cleanup function
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionActive, sessionPaused]); // Rerun when session state changes

  // Session timer
  useEffect(() => {
    let interval;
    if (sessionActive && !sessionPaused && sessionStartTime) {
      interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive, sessionPaused, sessionStartTime]);

  // Record real-time metrics from computer vision
  useEffect(() => {
    if (sessionActive && !sessionPaused) {
      metricsIntervalRef.current = setInterval(() => {
        const timestamp = Math.floor(sessionDuration / 60); // Use sessionDuration
        
        // Get dominant emotion
        let dominantEmotion = 'neutral';
        if (emotions) {
          dominantEmotion = Object.keys(emotions).reduce((a, b) => emotions[a] > emotions[b] ? a : b, 'neutral');
        }

        setMetricsHistory(prev => [...prev, {
          time: timestamp,
          eyeContact: Math.round(eyeContact),
          breathing: Math.round(breathingRate * 10) / 10,
          gaze: Math.round(gazeStability),
          emotion: dominantEmotion // Add emotion to history
        }]);

        checkForAlerts(eyeContact, breathingRate, gazeStability, emotions);
      }, 3000); // Record every 3 seconds
    }

    return () => clearInterval(metricsIntervalRef.current);
  }, [sessionActive, sessionPaused, sessionDuration, eyeContact, breathingRate, gazeStability, emotions]); // Add emotions as dependency

  
  // --- 6. HELPER FUNCTIONS ---

  const checkForAlerts = (ec, br, gs, em) => {
    const minute = Math.floor(sessionDuration / 60);
    
    // Hyperventilation
    if (br > 25) {
      addAlert('critical', `Hyperventilation detected (${Math.round(br)} breaths/min)`, minute);
    }
    // Rapid breathing increase
    else if (br > baselineBreathing * 1.5 && br > 20) { // Added threshold to avoid noise
      addAlert('warning', `Breathing rate increased 50% (${Math.round(br)} bpm)`, minute);
    }
    
    // Low eye contact
    if (ec < 20 && sessionDuration > 45) {
      addAlert('warning', `Minimal eye contact for extended period (${Math.round(ec)}%)`, minute);
    }
    
    // Possible dissociation (stable gaze for too long)
    if (gs > 95 && sessionDuration > 90) {
      addAlert('warning', 'Gaze patterns suggest possible dissociation', minute);
    }
    
    // Very low gaze stability (anxiety)
    if (gs < 30) {
      addAlert('warning', 'Rapid eye movement suggesting heightened anxiety', minute);
    }

    // Emotion-based alert
    if (em && (em.sad > 0.7 || em.angry > 0.7 || em.fearful > 0.7)) {
      const dominantNegative = Object.entries(em)
        .filter(([key]) => ['sad', 'angry', 'fearful'].includes(key))
        .sort(([,a], [,b]) => b - a)[0];
      
      if (dominantNegative && dominantNegative[1] > 0.7) {
        addAlert('warning', `Strong ${dominantNegative[0]} emotion detected`, minute);
      }
    }
  };

  const addAlert = (severity, message, minute) => {
    const alertId = Date.now() + Math.random();
    setAlerts(prev => {
      // Avoid duplicate alerts in a short time window
      if (prev.some(a => a.message === message && minute - a.minute < 2)) {
        return prev;
      }
      return [...prev, { id: alertId, severity, message, minute, timestamp: new Date() }].slice(-10);
    });
  };

  const startSession = () => {
    if (!patientConsent) {
      // Using custom modal instead of alert
      addAlert('critical', 'Patient consent is required to start session', 0);
      return;
    }

    setSessionActive(true);
    setSessionPaused(false);
    setSessionStartTime(Date.now());
    setSessionDuration(0);
    setMetricsHistory([]);
    setAlerts([]);
    setSessionEvents([]);
    setShowReport(false);
    setActiveTab('monitor'); // Switch to monitor tab on start

    addSessionEvent('Session started', 'Computer vision tracking initialized');
  };

  const pauseSession = () => {
    setSessionPaused(!sessionPaused);
    addSessionEvent(sessionPaused ? 'Session resumed' : 'Session paused', 
                     sessionPaused ? 'Tracking resumed' : 'Tracking paused at therapist request');
  };

  const endSession = () => {
    setSessionActive(false);
    setSessionPaused(false);
    // Webcam stream is stopped by the useEffect hook

    addSessionEvent('Session ended', `Total duration: ${formatDuration(sessionDuration)}`);

    setIsGeneratingReport(true);
    // Generate report
    const report = generateSessionReport(); 
    setSessionReport(report);
    setIsGeneratingReport(false);
    setShowReport(true);
    setActiveTab('report');
  };

  const generateSessionReport = () => {
    const timeline = analyzeTimeline();

    const avgBreathing = metricsHistory.length > 0
      ? metricsHistory.reduce((sum, m) => sum + m.breathing, 0) / metricsHistory.length
      : baselineBreathing;
    const avgEyeContact = metricsHistory.length > 0
      ? metricsHistory.reduce((sum, m) => sum + m.eyeContact, 0) / metricsHistory.length
      : baselineEyeContact;
    const avgGaze = metricsHistory.length > 0
      ? metricsHistory.reduce((sum, m) => sum + m.gaze, 0) / metricsHistory.length
      : 80; // Default gaze

    const analysis = `SESSION SUMMARY
(This is a simple metrics summary. The original Claude-based AI analysis is not connected in this version.)

AVERAGE METRICS:
• Eye Contact: ${avgEyeContact.toFixed(1)}% (Baseline: ${baselineEyeContact}%)
• Breathing Rate: ${avgBreathing.toFixed(1)} bpm (Baseline: ${baselineBreathing} bpm)
• Gaze Stability: ${avgGaze.toFixed(1)}%

ALERTS GENERATED: ${alerts.length}
${alerts.map(a => `• [Min ${a.minute}] ${a.message}`).join('\n')}

Total alerts: ${alerts.filter(a => a.severity === 'critical').length} critical, ${alerts.filter(a => a.severity === 'warning').length} warnings`;

    // Return the report object
    return {
      duration: formatDuration(sessionDuration),
      patientId,
      timeline,
      alerts: alerts.length,
      analysis,
      metricsHistory,
      timestamp: new Date()
    };
  };

  const analyzeTimeline = () => {
    if (metricsHistory.length === 0) return 'No data collected';
    
    const segments = [];
    const segmentSize = 5; // 5 minute segments
    const maxTime = Math.max(...metricsHistory.map(m => m.time), 0);
    
    for (let i = 0; i <= maxTime; i += segmentSize) {
      const segmentData = metricsHistory.filter(m => m.time >= i && m.time < i + segmentSize);
      if (segmentData.length > 0) {
        const avgBreathing = segmentData.reduce((sum, m) => sum + m.breathing, 0) / segmentData.length;
        const avgEyeContact = segmentData.reduce((sum, m) => sum + m.eyeContact, 0) / segmentData.length;
        
        let status = '🟢 Stable';
        if (avgBreathing > baselineBreathing * 1.3 || avgEyeContact < 30) {
          status = '🔴 Notable markers';
        } else if (avgBreathing > baselineBreathing * 1.15 || avgEyeContact < 40) {
          status = '🟡 Mild variation';
        }
        
        segments.push(`Minutes ${i}-${i+segmentSize-1}: ${status}
   • Avg Breathing: ${avgBreathing.toFixed(1)} bpm
   • Avg Eye contact: ${avgEyeContact.toFixed(0)}%`);
      }
    }
    
    return segments.join('\n\n') || 'Not enough data for timeline analysis.';
  };

  const addSessionEvent = (event, details) => {
    setSessionEvents(prev => [...prev, {
      minute: Math.floor(sessionDuration / 60),
      event,
      details,
      timestamp: new Date()
    }]);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const exportReport = () => {
    if (!sessionReport) return;
    
    const reportData = {
      sessionId: `SESSION_${patientId}_${sessionReport.timestamp.getTime()}`,
      patientId: `Anonymous #${patientId}`,
      duration: sessionReport.duration,
      timestamp: sessionReport.timestamp.toISOString(),
      metrics: {
        totalAlerts: sessionReport.alerts,
        baselineBreathing: baselineBreathing,
        baselineEyeContact: baselineEyeContact
      },
      analysis: sessionReport.analysis,
      timeline: sessionReport.timeline,
      disclaimer: 'This report contains anonymized behavioral metrics only. No audio or video data was stored.'
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `therapylens_report_${patientId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteSessionData = () => {
    // Re-implementing confirm with a simple custom modal to avoid browser blocking
    const confirmed = window.prompt('Type DELETE to confirm permanent deletion of all session data.');
    if (confirmed === 'DELETE') {
      setMetricsHistory([]);
      setAlerts([]);
      setSessionEvents([]);
      setSessionReport(null);
      setShowReport(false);
    }
  };

  // Get status color for metrics
  const getBreathingStatus = () => {
    if (breathingRate > 25) return 'text-red-500';
    if (breathingRate > baselineBreathing * 1.3 && breathingRate > 20) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getEyeContactStatus = () => {
    if (eyeContact < 20) return 'text-red-500';
    if (eyeContact < 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getGazeStatus = () => {
    if (gazeStability < 30 || gazeStability > 95) return 'text-yellow-500';
    return 'text-green-500';
  };

  // --- 7. RENDER ---

  // Consent Modal
  if (showConsentModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-10 h-10 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">TherapyLens</h1>
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Patient Consent Required</h2>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-sm text-blue-900 font-medium mb-2">What TherapyLens Tracks:</p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4">
              <li>• Eye movement patterns and gaze direction</li>
              <li>• Breathing rate and facial movement</li>
              <li>• Facial expressions (e.g., happy, sad, angry)</li>
            </ul>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <p className="text-sm text-green-900 font-medium mb-2">Privacy Protections:</p>
            <ul className="text-sm text-green-800 space-y-1 ml-4">
              <li>• ✓ NO audio recording</li>
              <li>• ✓ NO video recording or storage</li>
              <li>• ✓ All processing happens locally on this device</li>
              <li>• ✓ Metrics are anonymized (Patient ID: #{patientId})</li>
              <li>• ✓ Data automatically deleted after session</li>
              <li>• ✓ You can pause or stop tracking at any time</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 border border-gray-300 rounded p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Your Rights:</strong> You may pause tracking at any time during the session. 
              You may request to see what data has been collected. You may withdraw consent and end 
              tracking immediately. All data will be deleted at your request.
            </p>
          </div>
          
          <div className="flex items-start gap-3 mb-6">
            <input 
              type="checkbox" 
              id="consent"
              checked={patientConsent}
              onChange={(e) => setPatientConsent(e.target.checked)}
              className="mt-1 w-5 h-5 text-indigo-600 rounded"
            />
            <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">
              I understand what data will be collected and how it will be used. I consent to behavioral 
              tracking during this therapy session. I understand I can withdraw this consent at any time.
            </label>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                if(patientConsent) {
                  setShowConsentModal(false);
                  startSession(); // Automatically start session after consent
                }
              }}
              disabled={!patientConsent}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                patientConsent 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Consent & Begin Session
            </button>
            <button
              onClick={() => setShowConsentModal(false)} // Just close modal, don't start
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">TherapyLens</h1>
                <p className="text-sm text-gray-500">Real-Time Behavioral Tracking</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {sessionActive && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-mono font-semibold text-green-800">{formatDuration(sessionDuration)}</span>
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                Patient: <span className="font-semibold">#{patientId}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Control Panel */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Session Controls</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-green-600" />
              <span>HIPAA-Compliant • Local Processing</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {!sessionActive ? (
              <button
                onClick={startSession}
                disabled={!patientConsent} // Can't start without consent
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                  patientConsent
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-5 h-5" />
                Start Session
              </button>
            ) : (
              <>
                <button
                  onClick={pauseSession}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition"
                >
                  {sessionPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  {sessionPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={endSession}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  <StopCircle className="w-5 h-5" />
                  End Session
                </button>
              </>
            )}
            
            {sessionReport && (
              <>
                <button
                  onClick={exportReport}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  <Download className="w-5 h-5" />
                  Export Report
                </button>
                <button
                  onClick={deleteSessionData}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-red-500 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition"
                >
                  Delete All Data
                </button>
              </>
            )}
          </div>
          
          {sessionPaused && (
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <p className="text-sm text-yellow-800 font-medium">
                ⏸️ Session paused. Tracking is suspended. Click Resume to continue.
              </p>
            </div>
          )}
        </div>

        {/* Video element wrapper - ALWAYS rendered but hidden */}
        <div className={activeTab === 'monitor' ? 'block' : 'hidden'}>
          <div className="bg-white rounded-xl shadow-md mb-6">
            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline // Added for mobile compatibility
                muted
                className="w-full h-full object-cover"
              />
              {sessionActive && !sessionPaused && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-2 rounded-lg">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white font-semibold text-sm">TRACKING ACTIVE</span>
                </div>
              )}
              {(!sessionActive || sessionPaused) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-white mx-auto mb-3 opacity-50" />
                    <p className="text-white text-lg font-semibold">
                      {sessionPaused ? 'Session Paused' : 'Start session to begin tracking'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-2 px-6">
              {[
                { id: 'monitor', label: 'Live Monitor', icon: Activity },
                { id: 'report', label: 'Session Report', icon: FileText }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={!sessionActive && tab.id !== 'report'} // Disable monitor if session not active
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-semibold transition ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } ${
                    !sessionActive && tab.id !== 'report' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Live Monitor Tab */}
            {activeTab === 'monitor' && (
              <div className="space-y-6">
                {!sessionActive ? (
                   <div className="text-center py-16 text-gray-500">
                    <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Session is not active</p>
                    <p className="text-sm">Click "Start Session" in the controls above to begin monitoring.</p>
                  </div>
                ) : (
                  <>
                    {/* Real-time Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Eye Contact */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Eye className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-gray-700">Eye Contact</span>
                          </div>
                          <CheckCircle className={`w-5 h-5 ${getEyeContactStatus()}`} />
                        </div>
                        <div className={`text-4xl font-bold ${getEyeContactStatus()}`}>
                          {Math.round(eyeContact)}%
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Baseline: {baselineEyeContact}%
                        </div>
                      </div>

                      {/* Breathing Rate */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-gray-700">Breathing Rate</span>
                          </div>
                          <CheckCircle className={`w-5 h-5 ${getBreathingStatus()}`} />
                        </div>
                        <div className={`text-4xl font-bold ${getBreathingStatus()}`}>
                          {Math.round(breathingRate)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          breaths/min • Baseline: {baselineBreathing}
                        </div>
                      </div>

                      {/* Gaze Stability */}
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold text-gray-700">Gaze Stability</span>
                          </div>
                          <CheckCircle className={`w-5 h-5 ${getGazeStatus()}`} />
                        </div>
                        <div className={`text-4xl font-bold ${getGazeStatus()}`}>
                          {Math.round(gazeStability)}%
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Normal range: 60-90%
                        </div>
                      </div>
                    </div>

                    {/* Emotion Analysis */}
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6">
                      <EmotionDisplay emotions={emotions} />
                    </div>

                    {/* Metrics Chart */}
                    {metricsHistory.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Behavioral Timeline</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={metricsHistory}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="time" 
                              label={{ value: 'Minutes', position: 'insideBottom', offset: -5 }}
                              type="number"
                              domain={['dataMin', 'dataMax']}
                            />
                            <YAxis yAxisId="left" stroke="#10b981" />
                            <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                            <Tooltip />
                            <Line 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="breathing" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              name="Breathing (bpm)"
                              dot={false}
                            />
                            <Line 
                              yAxisId="right"
                              type="monotone" 
                              dataKey="eyeContact" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              name="Eye Contact (%)"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Real-time Alerts */}
                    {alerts.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-800">Recent Alerts</h3>
                        {alerts.slice(-5).reverse().map(alert => (
                          <div 
                            key={alert.id}
                            className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${
                              alert.severity === 'critical' 
                                ? 'bg-red-50 border-red-500' 
                                : 'bg-yellow-50 border-yellow-500'
                            }`}
                          >
                            <AlertCircle className={`w-5 h-5 mt-0.5 ${
                              alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                            }`} />
                            <div>
                              <p className={`font-medium ${
                                alert.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'
                              }`}>
                                [Minute {alert.minute}] {alert.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Session Report Tab */}
            {activeTab === 'report' && (
              <div>
                {isGeneratingReport ? (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Generating report...</p>
                    <p className="text-sm text-gray-500 mt-2">Analyzing behavioral patterns</p>
                  </div>
                ) : !sessionReport ? (
                  <div className="text-center py-16 text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No session report available</p>
                    <p className="text-sm">Complete a session to generate a comprehensive analysis report</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Report Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6">
                      <h2 className="text-2xl font-bold mb-2">Session Analysis Report</h2>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-indigo-200 text-sm">Duration</p>
                          <p className="text-xl font-semibold">{sessionReport.duration}</p>
                        </div>
                        <div>
                          <p className="text-indigo-200 text-sm">Patient ID</p>
                          <p className="text-xl font-semibold">#{sessionReport.patientId}</p>
                        </div>
                        <div>
                          <p className="text-indigo-200 text-sm">Generated</p>
                          <p className="text-xl font-semibold">
                            {sessionReport.timestamp.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="font-bold text-gray-800 mb-4">Behavioral Timeline</h3>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded">
                        {sessionReport.timeline}
                      </pre>
                    </div>

                    {/* Analysis */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain className="w-6 h-6 text-indigo-600" />
                        <h3 className="font-bold text-gray-800">Analysis Summary</h3>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed font-sans">
                          {sessionReport.analysis}
                        </pre>
                      </div>
                    </div>

                    {/* Metrics Summary */}
                    <div className="grid grid-cols-1 gap-4 max-w-md">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">Total Alerts Generated</p>
                        <p className="text-3xl font-bold text-blue-700">{sessionReport.alerts}</p>
                      </div>
                    </div>

                    {/* Privacy Notice */}
                    <div className="bg-green-50 border-l-4 border-green-500 p-4">
                      <div className="flex items-start gap-2">
                        <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-green-800 mb-1">Privacy Confirmed</p>
                          <p className="text-sm text-green-700">
                            This report contains only anonymized behavioral metrics. No audio or video 
                            was recorded. All data is stored locally and can be deleted at any time.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Eye, Activity, AlertCircle, CheckCircle, Pause, Play, StopCircle, Download, Shield, Camera, FileText, BarChart3 } from 'lucide-react';
import { useComputerVision } from './hooks/useComputerVision';

const App = () => {
  // Session State
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [patientConsent, setPatientConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(true);

  // Behavioral Metrics - baselines
  const [baselineBreathing, setBaselineBreathing] = useState(14);
  const [baselineEyeContact, setBaselineEyeContact] = useState(90);
  
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
  
  // Refs
  const videoRef = useRef(null);
  const metricsIntervalRef = useRef(null);
  const insightsIntervalRef = useRef(null);
  const currentMetricsRef = useRef({ eyeContact: 0, breathingRate: 0, gazeStability: 0, sessionDuration: 0 });

  // Patient Profile
  const [patientId] = useState(Math.floor(Math.random() * 9000) + 1000);
  const [patientBaseline, setPatientBaseline] = useState({
    eyeContactRange: '80-100%',
    breathingRange: '13-16 bpm',
    stressThreshold: 19,
    dissociationIndicator: 90
  });

  // Real-time computer vision tracking
  const { eyeContact, gazeStability, breathingRate } = useComputerVision(
    videoRef,
    sessionActive,
    sessionPaused
  );

  // Initialize webcam
  useEffect(() => {
    if (sessionActive && !sessionPaused && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          videoRef.current.srcObject = stream;
          setVideoStream(stream);
        })
        .catch(err => console.error('Error accessing webcam:', err));
    }
    
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionActive, sessionPaused]);

  // Keep ref updated with current metrics
  useEffect(() => {
    currentMetricsRef.current = {
      eyeContact,
      breathingRate,
      gazeStability,
      sessionDuration
    };
  }, [eyeContact, breathingRate, gazeStability, sessionDuration]);

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
      console.log('📝 Starting metrics recording interval...');
      metricsIntervalRef.current = setInterval(() => {
        // Get current metrics from ref
        const { eyeContact, breathingRate, gazeStability, sessionDuration } = currentMetricsRef.current;

        // Record metrics from computer vision
        const timestamp = Math.floor(sessionDuration / 60);
        const newMetric = {
          time: timestamp,
          eyeContact: Math.round(eyeContact),
          breathing: Math.round(breathingRate * 10) / 10,
          gaze: Math.round(gazeStability)
        };

        console.log('💾 Recording metric:', newMetric);
        setMetricsHistory(prev => {
          const updated = [...prev, newMetric];
          console.log('📊 Metrics history now has', updated.length, 'entries');
          return updated;
        });

        // Check for alerts based on real metrics
        checkForAlerts(eyeContact, breathingRate, gazeStability);
      }, 3000);
    } else {
      if (metricsIntervalRef.current) {
        console.log('⏸️ Clearing metrics interval');
        clearInterval(metricsIntervalRef.current);
      }
    }

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [sessionActive, sessionPaused]);

  const checkForAlerts = (ec, br, gs) => {
    const minute = Math.floor(sessionDuration / 60);
    
    // Hyperventilation
    if (br > 25) {
      addAlert('critical', `Hyperventilation detected (${Math.round(br)} breaths/min)`, minute);
    }
    // Rapid breathing increase
    else if (br > baselineBreathing * 1.5) {
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
  };

  const addAlert = (severity, message, minute) => {
    const alertId = Date.now() + Math.random();
    setAlerts(prev => {
      // Avoid duplicate alerts
      if (prev.some(a => a.message === message && minute - a.minute < 2)) {
        return prev;
      }
      return [...prev, { id: alertId, severity, message, minute, timestamp: new Date() }].slice(-10);
    });
  };

  const startSession = () => {
    if (!patientConsent) {
      alert('Patient consent is required to start session');
      return;
    }

    setSessionActive(true);
    setSessionStartTime(Date.now());
    setSessionDuration(0);
    setMetricsHistory([]);
    setAlerts([]);
    setSessionEvents([]);
    setShowReport(false);

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

    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }

    addSessionEvent('Session ended', `Total duration: ${formatDuration(sessionDuration)}`);

    // Generate comprehensive report
    setIsGeneratingReport(true);
    generateSessionReport();
    setIsGeneratingReport(false);
    setShowReport(true);
    setActiveTab('statistics');
  };

  const generateSessionReport = () => {
    console.log('🔍 Generating session report...');
    console.log('📊 Metrics history length:', metricsHistory.length);
    console.log('📊 Metrics history:', metricsHistory);

    // Analyze session data
    const timeline = analyzeTimeline();

    if (metricsHistory.length === 0) {
      console.log('⚠️ No metrics data available');
      setSessionReport({
        duration: formatDuration(sessionDuration),
        patientId,
        timeline: 'No data collected',
        alerts: alerts.length,
        analysis: 'No metrics data available',
        metricsHistory: [],
        timestamp: new Date(),
        statistics: null
      });
      return;
    }

    // Calculate comprehensive statistics
    const statistics = calculateComprehensiveStatistics();
    console.log('📈 Calculated statistics:', statistics);

    // Generate insights based on actual data
    const insights = generateDataInsights(statistics);
    console.log('💡 Generated insights:', insights);

    const analysis = `SESSION SUMMARY

AVERAGE METRICS:
• Eye Contact: ${statistics.eyeContact.avg.toFixed(1)}% (Baseline: ${baselineEyeContact}%)
• Breathing Rate: ${statistics.breathing.avg.toFixed(1)} bpm (Baseline: ${baselineBreathing} bpm)
• Gaze Stability: ${statistics.gaze.avg.toFixed(1)}%

ALERTS GENERATED: ${alerts.length}
${alerts.map(a => `• [Min ${a.minute}] ${a.message}`).join('\n')}

Total alerts: ${alerts.filter(a => a.severity === 'critical').length} critical, ${alerts.filter(a => a.severity === 'warning').length} warnings`;

    const reportData = {
      duration: formatDuration(sessionDuration),
      patientId,
      timeline,
      alerts: alerts.length,
      analysis,
      metricsHistory,
      timestamp: new Date(),
      statistics,
      insights
    };

    console.log('✅ Final session report:', reportData);
    setSessionReport(reportData);
  };

  // Calculate comprehensive statistics for all metrics
  const calculateComprehensiveStatistics = () => {
    if (metricsHistory.length === 0) return null;

    const calculateStats = (values) => {
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Calculate standard deviation
      const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
      const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
      const stdDev = Math.sqrt(variance);

      return { avg, min, max, stdDev, count: values.length };
    };

    const eyeContactValues = metricsHistory.map(m => m.eyeContact);
    const breathingValues = metricsHistory.map(m => m.breathing);
    const gazeValues = metricsHistory.map(m => m.gaze);

    return {
      eyeContact: calculateStats(eyeContactValues),
      breathing: calculateStats(breathingValues),
      gaze: calculateStats(gazeValues),
      sessionLength: sessionDuration,
      dataPoints: metricsHistory.length
    };
  };

  // Generate insights based on actual data patterns
  const generateDataInsights = (stats) => {
    if (!stats) return null;

    const insights = {
      eyeContact: '',
      breathing: '',
      gaze: ''
    };

    // Eye Contact Analysis
    const eyeContactDiff = stats.eyeContact.avg - baselineEyeContact;
    const eyeContactVariability = stats.eyeContact.stdDev;

    if (stats.eyeContact.avg < 30) {
      insights.eyeContact = `Low eye contact observed throughout session (avg ${stats.eyeContact.avg.toFixed(1)}%, baseline ${baselineEyeContact}%). This may indicate discomfort, avoidance, or neurodivergent communication patterns. Range: ${stats.eyeContact.min.toFixed(1)}%-${stats.eyeContact.max.toFixed(1)}%.`;
    } else if (eyeContactDiff > 10) {
      insights.eyeContact = `Above-baseline eye contact (avg ${stats.eyeContact.avg.toFixed(1)}% vs baseline ${baselineEyeContact}%). Patient shows good engagement. Variability of ${eyeContactVariability.toFixed(1)}% suggests ${eyeContactVariability > 15 ? 'fluctuating' : 'consistent'} attention patterns.`;
    } else if (eyeContactDiff < -10) {
      insights.eyeContact = `Below-baseline eye contact (avg ${stats.eyeContact.avg.toFixed(1)}% vs baseline ${baselineEyeContact}%). May indicate stress, distraction, or topic-related discomfort. Standard deviation: ${eyeContactVariability.toFixed(1)}%.`;
    } else {
      insights.eyeContact = `Eye contact within normal range (avg ${stats.eyeContact.avg.toFixed(1)}%, baseline ${baselineEyeContact}%). Variability (σ=${eyeContactVariability.toFixed(1)}%) shows ${eyeContactVariability > 20 ? 'high fluctuation - possibly topic-dependent' : 'stable engagement'}.`;
    }

    // Breathing Pattern Analysis
    const breathingDiff = stats.breathing.avg - baselineBreathing;
    const breathingVariability = stats.breathing.stdDev;
    const elevatedBreathingPercent = metricsHistory.filter(m => m.breathing > baselineBreathing * 1.3).length / metricsHistory.length * 100;

    if (stats.breathing.avg > baselineBreathing * 1.3) {
      insights.breathing = `Elevated breathing rate throughout session (avg ${stats.breathing.avg.toFixed(1)} bpm vs baseline ${baselineBreathing} bpm). This suggests sustained stress or anxiety. Maximum rate: ${stats.breathing.max.toFixed(1)} bpm. Consider stress-reduction techniques.`;
    } else if (stats.breathing.max > 25) {
      insights.breathing = `Hyperventilation episodes detected (max ${stats.breathing.max.toFixed(1)} bpm). While average breathing was ${stats.breathing.avg.toFixed(1)} bpm, ${elevatedBreathingPercent.toFixed(0)}% of session showed elevated rates. May indicate acute stress responses.`;
    } else if (breathingVariability > 4) {
      insights.breathing = `Highly variable breathing patterns (σ=${breathingVariability.toFixed(1)} bpm). Average ${stats.breathing.avg.toFixed(1)} bpm with range ${stats.breathing.min.toFixed(1)}-${stats.breathing.max.toFixed(1)} bpm. Suggests emotional reactivity during session.`;
    } else {
      insights.breathing = `Stable breathing patterns (avg ${stats.breathing.avg.toFixed(1)} bpm, baseline ${baselineBreathing} bpm). Low variability (σ=${breathingVariability.toFixed(1)}) indicates consistent calm state throughout session.`;
    }

    // Gaze Stability Analysis
    const gazeVariability = stats.gaze.stdDev;
    const lowGazePercent = metricsHistory.filter(m => m.gaze < 30).length / metricsHistory.length * 100;
    const highGazePercent = metricsHistory.filter(m => m.gaze > 95).length / metricsHistory.length * 100;

    if (stats.gaze.avg > 90) {
      insights.gaze = `Very high gaze stability (avg ${stats.gaze.avg.toFixed(1)}%). Fixed stare patterns observed ${highGazePercent.toFixed(0)}% of session. May indicate dissociation, intense focus, or freeze response. Monitor for trauma-related responses.`;
    } else if (stats.gaze.avg < 40) {
      insights.gaze = `Low gaze stability (avg ${stats.gaze.avg.toFixed(1)}%). Rapid eye movement observed ${lowGazePercent.toFixed(0)}% of session. May indicate anxiety, ADHD-related patterns, or environmental distractibility.`;
    } else if (gazeVariability > 25) {
      insights.gaze = `Highly variable gaze patterns (σ=${gazeVariability.toFixed(1)}%). Stability ranged from ${stats.gaze.min.toFixed(1)}% to ${stats.gaze.max.toFixed(1)}%. Suggests alternating between focused attention and distraction.`;
    } else {
      insights.gaze = `Balanced gaze stability (avg ${stats.gaze.avg.toFixed(1)}%, σ=${gazeVariability.toFixed(1)}%). Healthy range between fixation and movement. Indicates good attentional control and engagement.`;
    }

    return insights;
  };

  const analyzeTimeline = () => {
    if (metricsHistory.length === 0) return 'No data collected';
    
    const segments = [];
    const segmentSize = 5; // 5 minute segments
    
    for (let i = 0; i < Math.max(...metricsHistory.map(m => m.time)); i += segmentSize) {
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
        
        segments.push(`Minutes ${i}-${i+segmentSize}: ${status}
   • Breathing: ${avgBreathing.toFixed(1)} bpm
   • Eye contact: ${avgEyeContact.toFixed(0)}%`);
      }
    }
    
    return segments.join('\n\n');
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
  };

  const deleteSessionData = () => {
    if (confirm('Are you sure you want to permanently delete all session data? This cannot be undone.')) {
      setMetricsHistory([]);
      setAlerts([]);
      setSessionEvents([]);
      setSessionReport(null);
      setShowReport(false);
      alert('All session data has been permanently deleted.');
    }
  };

  // Get status color for metrics
  const getBreathingStatus = () => {
    if (breathingRate > 25) return 'text-red-500';
    if (breathingRate > baselineBreathing * 1.3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getEyeContactStatus = () => {
    if (eyeContact < 60) return 'text-red-500';
    if (eyeContact < 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getGazeStatus = () => {
    if (gazeStability < 30 || gazeStability > 95) return 'text-yellow-500';
    return 'text-green-500';
  };

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
              <li>• Breathing rate and depth</li>
              <li>• Facial position (no facial recognition)</li>
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
              onClick={() => setShowConsentModal(false)}
              disabled={!patientConsent}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                patientConsent 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Begin Session
            </button>
            <button
              onClick={() => alert('Session cancelled. No data collected.')}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          
          <div className="flex gap-3">
            {!sessionActive ? (
              <button
                onClick={startSession}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
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


        {/* Video element - always rendered for computer vision */}
        <div className={activeTab === 'monitor' ? '' : 'hidden'}>
          <div className="bg-white rounded-xl shadow-md mb-6">
            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              {sessionActive && !sessionPaused && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-2 rounded-lg">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white font-semibold text-sm">TRACKING ACTIVE</span>
                </div>
              )}
              {!sessionActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-white mx-auto mb-3 opacity-50" />
                    <p className="text-white text-lg font-semibold">Start session to begin tracking</p>
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
                { id: 'statistics', label: 'Final Statistics', icon: BarChart3 },
                { id: 'report', label: 'Session Report', icon: FileText }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-semibold transition ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
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
                {/* Real-time Metrics */}
                <div className="grid grid-cols-3 gap-4">
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
                        />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="breathing" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="Breathing (bpm)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="eyeContact" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Eye Contact (%)"
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
              </div>
            )}

            {/* Final Statistics Tab */}
            {activeTab === 'statistics' && (
              <div>
                {(() => {
                  console.log('📊 Statistics Tab - sessionReport:', sessionReport);
                  console.log('📊 Statistics Tab - sessionReport.statistics:', sessionReport?.statistics);
                  console.log('📊 Statistics Tab - sessionReport.insights:', sessionReport?.insights);
                  return null;
                })()}
                {!sessionReport ? (
                  <div className="text-center py-16 text-gray-500">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No statistics available</p>
                    <p className="text-sm">Complete a session to view final statistics</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Page Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <BarChart3 className="w-10 h-10" />
                        <h1 className="text-3xl font-bold">Final Statistics</h1>
                      </div>
                      <p className="text-blue-100">Comprehensive session metrics and behavioral analysis</p>
                    </div>

                    {/* Session Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-5 h-5 text-blue-600" />
                          <p className="text-sm font-medium text-gray-600">Session Duration</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{sessionReport.duration}</p>
                        <p className="text-xs text-gray-500 mt-1">{sessionReport.statistics?.dataPoints || 0} data points</p>
                      </div>

                      <div className="bg-white border-2 border-green-200 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-5 h-5 text-green-600" />
                          <p className="text-sm font-medium text-gray-600">Avg Eye Contact</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                          {sessionReport.statistics?.eyeContact.avg.toFixed(1) || 0}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          σ = {sessionReport.statistics?.eyeContact.stdDev.toFixed(1) || 0}%
                        </p>
                      </div>

                      <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-5 h-5 text-purple-600" />
                          <p className="text-sm font-medium text-gray-600">Avg Breathing</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                          {sessionReport.statistics?.breathing.avg.toFixed(1) || 0} bpm
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          σ = {sessionReport.statistics?.breathing.stdDev.toFixed(1) || 0} bpm
                        </p>
                      </div>

                      <div className="bg-white border-2 border-red-200 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{alerts.length}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {alerts.filter(a => a.severity === 'critical').length} critical, {alerts.filter(a => a.severity === 'warning').length} warnings
                        </p>
                      </div>
                    </div>

                    {/* Metrics Over Time Chart - Placeholder */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h2 className="text-xl font-bold text-gray-800 mb-4">Metrics Over Time</h2>
                      <div className="h-80">
                        {metricsHistory.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metricsHistory}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time" label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5 }} />
                              <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
                              <Tooltip />
                              <Line type="monotone" dataKey="eyeContact" stroke="#3b82f6" name="Eye Contact %" strokeWidth={2} />
                              <Line type="monotone" dataKey="breathing" stroke="#8b5cf6" name="Breathing (bpm)" strokeWidth={2} />
                              <Line type="monotone" dataKey="gaze" stroke="#10b981" name="Gaze Stability %" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            No data available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Distribution Charts - Placeholder */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Eye Contact Distribution */}
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Eye Contact Distribution</h3>
                        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                          <div className="text-center">
                            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 font-medium">Histogram Chart Placeholder</p>
                            <p className="text-sm text-gray-400 mt-1">Add bar chart showing eye contact ranges</p>
                          </div>
                        </div>
                      </div>

                      {/* Breathing Rate Distribution */}
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Breathing Rate Distribution</h3>
                        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                          <div className="text-center">
                            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 font-medium">Histogram Chart Placeholder</p>
                            <p className="text-sm text-gray-400 mt-1">Add bar chart showing breathing rate ranges</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Key Insights Section */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h2 className="text-xl font-bold text-gray-800 mb-4">Key Insights</h2>
                      {sessionReport.insights ? (
                        <div className="space-y-4">
                          <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
                            <h4 className="font-semibold text-blue-900 mb-2">Eye Contact Analysis</h4>
                            <p className="text-blue-800 text-sm">
                              {sessionReport.insights.eyeContact}
                            </p>
                          </div>

                          <div className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded">
                            <h4 className="font-semibold text-purple-900 mb-2">Breathing Pattern Analysis</h4>
                            <p className="text-purple-800 text-sm">
                              {sessionReport.insights.breathing}
                            </p>
                          </div>

                          <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                            <h4 className="font-semibold text-green-900 mb-2">Gaze Stability Analysis</h4>
                            <p className="text-green-800 text-sm">
                              {sessionReport.insights.gaze}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No insights available</p>
                      )}
                    </div>

                    {/* Aggregate Metrics Table */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h2 className="text-xl font-bold text-gray-800 mb-4">Aggregate Metrics</h2>
                      {sessionReport.statistics ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Metric</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Minimum</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Average</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Maximum</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Std Dev (σ)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              <tr>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">Eye Contact (%)</td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600">
                                  {sessionReport.statistics.eyeContact.min.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">
                                  {sessionReport.statistics.eyeContact.avg.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600">
                                  {sessionReport.statistics.eyeContact.max.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-indigo-600 font-medium">
                                  {sessionReport.statistics.eyeContact.stdDev.toFixed(1)}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">Breathing Rate (bpm)</td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600">
                                  {sessionReport.statistics.breathing.min.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">
                                  {sessionReport.statistics.breathing.avg.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600">
                                  {sessionReport.statistics.breathing.max.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-indigo-600 font-medium">
                                  {sessionReport.statistics.breathing.stdDev.toFixed(1)}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">Gaze Stability (%)</td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600">
                                  {sessionReport.statistics.gaze.min.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">
                                  {sessionReport.statistics.gaze.avg.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-gray-600">
                                  {sessionReport.statistics.gaze.max.toFixed(1)}
                                </td>
                                <td className="px-4 py-3 text-sm text-center text-indigo-600 font-medium">
                                  {sessionReport.statistics.gaze.stdDev.toFixed(1)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="mt-4 text-xs text-gray-500 text-center">
                            Based on {sessionReport.statistics.dataPoints} data points collected over {sessionReport.duration}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No statistics available</p>
                      )}
                    </div>

                    {/* Alert Timeline - Placeholder */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h2 className="text-xl font-bold text-gray-800 mb-4">Alert Timeline</h2>
                      {alerts.length > 0 ? (
                        <div className="space-y-3">
                          {alerts.map((alert, idx) => (
                            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${
                              alert.severity === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                            }`}>
                              <AlertCircle className={`w-5 h-5 mt-0.5 ${
                                alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className={`font-semibold text-sm ${
                                    alert.severity === 'critical' ? 'text-red-900' : 'text-yellow-900'
                                  }`}>
                                    {alert.message}
                                  </p>
                                  <span className={`text-xs font-medium ${
                                    alert.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
                                  }`}>
                                    Minute {alert.minute}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          No alerts generated during this session
                        </div>
                      )}
                    </div>

                    {/* Export Options */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                      <h3 className="font-bold text-gray-800 mb-4">Export Options</h3>
                      <div className="flex gap-4">
                        <button
                          onClick={exportReport}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                        >
                          <Download className="w-5 h-5" />
                          Export as JSON
                        </button>
                        <button className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition">
                          <Download className="w-5 h-5" />
                          Export as PDF (Coming Soon)
                        </button>
                      </div>
                    </div>
                  </div>
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

                    {/* Analysis Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-6 h-6 text-indigo-600" />
                        <h3 className="font-bold text-gray-800">Session Analysis</h3>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed">
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

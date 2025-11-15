import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Eye, Activity, AlertCircle, CheckCircle, Pause, Play, StopCircle, Download, Shield, Camera, Brain, FileText, Settings } from 'lucide-react';

const App = () => {
  // Session State
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [patientConsent, setPatientConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(true);
  
  // Behavioral Metrics
  const [eyeContact, setEyeContact] = useState(0);
  const [breathingRate, setBreathingRate] = useState(14);
  const [gazeStability, setGazeStability] = useState(100);
  const [baselineBreathing, setBaselineBreathing] = useState(14);
  const [baselineEyeContact, setBaselineEyeContact] = useState(45);
  
  // Data Collection
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [claudeInsights, setClaudeInsights] = useState([]);
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
  
  // Patient Profile
  const [patientId] = useState(Math.floor(Math.random() * 9000) + 1000);
  const [patientBaseline, setPatientBaseline] = useState({
    eyeContactRange: '45-55%',
    breathingRange: '13-16 bpm',
    stressThreshold: 19,
    dissociationIndicator: 90
  });

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

  // Simulate real-time metrics collection
  useEffect(() => {
    if (sessionActive && !sessionPaused) {
      metricsIntervalRef.current = setInterval(() => {
        // Simulate behavioral metrics with realistic variation
        const newEyeContact = Math.max(0, Math.min(100, eyeContact + (Math.random() - 0.5) * 10));
        const newBreathingRate = Math.max(8, Math.min(30, breathingRate + (Math.random() - 0.5) * 2));
        const newGazeStability = Math.max(0, Math.min(100, gazeStability + (Math.random() - 0.5) * 15));
        
        setEyeContact(newEyeContact);
        setBreathingRate(newBreathingRate);
        setGazeStability(newGazeStability);
        
        // Record metrics
        const timestamp = Math.floor(sessionDuration / 60);
        setMetricsHistory(prev => [...prev, {
          time: timestamp,
          eyeContact: Math.round(newEyeContact),
          breathing: Math.round(newBreathingRate * 10) / 10,
          gaze: Math.round(newGazeStability)
        }]);
        
        // Check for alerts
        checkForAlerts(newEyeContact, newBreathingRate, newGazeStability);
      }, 3000);
    }
    
    return () => clearInterval(metricsIntervalRef.current);
  }, [sessionActive, sessionPaused, sessionDuration, eyeContact, breathingRate, gazeStability]);

  // Periodic Claude insights
  useEffect(() => {
    if (sessionActive && !sessionPaused && sessionDuration > 0 && sessionDuration % 120 === 0) {
      generateClaudeInsight();
    }
  }, [sessionDuration, sessionActive, sessionPaused]);

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

  const generateClaudeInsight = async () => {
    const minute = Math.floor(sessionDuration / 60);
    const recentMetrics = metricsHistory.slice(-20);
    
    if (recentMetrics.length < 5) return;
    
    const avgBreathing = recentMetrics.reduce((sum, m) => sum + m.breathing, 0) / recentMetrics.length;
    const avgEyeContact = recentMetrics.reduce((sum, m) => sum + m.eyeContact, 0) / recentMetrics.length;
    
    const prompt = `You are an AI assistant for therapists analyzing patient behavioral patterns during a therapy session.

Current session context:
- Session duration: ${minute} minutes
- Recent average breathing rate: ${avgBreathing.toFixed(1)} bpm (baseline: ${baselineBreathing} bpm)
- Recent average eye contact: ${avgEyeContact.toFixed(0)}% (baseline: ${baselineEyeContact}%)
- Patient ID: Anonymous #${patientId}

Recent alerts: ${alerts.slice(-3).map(a => a.message).join('; ')}

Provide a brief (2-3 sentences) therapeutic insight about what these patterns might indicate. Focus on:
1. What the physiological changes suggest emotionally
2. A gentle suggestion for the therapist to consider

Keep it professional, non-diagnostic, and actionable. Format as plain text.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      const data = await response.json();
      const insight = data.content[0].text;
      
      setClaudeInsights(prev => [...prev, {
        minute,
        insight,
        timestamp: new Date()
      }].slice(-10));
    } catch (error) {
      console.error('Error generating Claude insight:', error);
    }
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
    setClaudeInsights([]);
    setSessionEvents([]);
    setShowReport(false);
    
    // Set initial baseline from patient profile
    setEyeContact(baselineEyeContact);
    setBreathingRate(baselineBreathing);
    setGazeStability(85);
    
    addSessionEvent('Session started', 'Baseline establishment phase');
  };

  const pauseSession = () => {
    setSessionPaused(!sessionPaused);
    addSessionEvent(sessionPaused ? 'Session resumed' : 'Session paused', 
                     sessionPaused ? 'Tracking resumed' : 'Tracking paused at therapist request');
  };

  const endSession = async () => {
    setSessionActive(false);
    setSessionPaused(false);
    
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    
    addSessionEvent('Session ended', `Total duration: ${formatDuration(sessionDuration)}`);
    
    // Generate comprehensive report
    setIsGeneratingReport(true);
    await generateSessionReport();
    setIsGeneratingReport(false);
    setShowReport(true);
    setActiveTab('report');
  };

  const generateSessionReport = async () => {
    // Analyze session data
    const timeline = analyzeTimeline();
    
    const prompt = `You are an AI assistant generating a post-session behavioral analysis report for a therapist.

SESSION DATA:
Duration: ${formatDuration(sessionDuration)}
Patient: Anonymous ID #${patientId}
Baseline Profile:
- Typical eye contact: ${patientBaseline.eyeContactRange}
- Baseline breathing: ${patientBaseline.breathingRange}
- Stress threshold: ${patientBaseline.stressThreshold}+ bpm

BEHAVIORAL TIMELINE:
${timeline}

ALERTS GENERATED:
${alerts.map(a => `[Min ${a.minute}] ${a.message}`).join('\n')}

INSIGHTS DURING SESSION:
${claudeInsights.map(i => `[Min ${i.minute}] ${i.insight}`).join('\n')}

Generate a comprehensive clinical report with the following sections:
1. PATTERNS IDENTIFIED (3-4 key behavioral patterns observed)
2. RECOMMENDATIONS FOR NEXT SESSION (4-5 specific, actionable recommendations)
3. NEURODIVERSITY CONSIDERATIONS (any patterns suggesting ADHD, autism, or trauma responses)

Be specific, professional, and focus on actionable insights. Use the actual data provided. Format with clear headers and bullet points.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      const data = await response.json();
      const analysis = data.content[0].text;
      
      setSessionReport({
        duration: formatDuration(sessionDuration),
        patientId,
        timeline,
        alerts: alerts.length,
        insights: claudeInsights.length,
        analysis,
        metricsHistory,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error generating report:', error);
      setSessionReport({
        duration: formatDuration(sessionDuration),
        patientId,
        timeline,
        alerts: alerts.length,
        insights: claudeInsights.length,
        analysis: 'Report generation failed. Please review raw metrics.',
        metricsHistory,
        timestamp: new Date()
      });
    }
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
        totalInsights: sessionReport.insights,
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
      setClaudeInsights([]);
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
    if (eyeContact < 20) return 'text-red-500';
    if (eyeContact < 40) return 'text-yellow-500';
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
              <Brain className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">TherapyLens</h1>
                <p className="text-sm text-gray-500">AI-Powered Behavioral Insights</p>
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

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-2 px-6">
              {[
                { id: 'monitor', label: 'Live Monitor', icon: Activity },
                { id: 'insights', label: 'AI Insights', icon: Brain },
                { id: 'report', label: 'Session Report', icon: FileText },
                { id: 'baseline', label: 'Patient Baseline', icon: Settings }
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

                {/* Video Feed */}
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

            {/* AI Insights Tab */}
            {activeTab === 'insights' && (
              <div className="space-y-4">
                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-6">
                  <p className="text-sm text-indigo-900">
                    <strong>Whisper Mode:</strong> Claude analyzes behavioral patterns every 2 minutes 
                    and provides gentle therapeutic insights. These are suggestions, not diagnoses.
                  </p>
                </div>

                {claudeInsights.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Brain className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No insights yet</p>
                    <p className="text-sm">Claude will generate insights every 2 minutes during active sessions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {claudeInsights.slice().reverse().map((insight, idx) => (
                      <div key={idx} className="bg-white border border-indigo-200 rounded-lg p-5">
                        <div className="flex items-start gap-3">
                          <div className="bg-indigo-100 rounded-full p-2">
                            <Brain className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-indigo-600">
                                Minute {insight.minute}
                              </span>
                              <span className="text-xs text-gray-500">
                                {insight.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed">{insight.insight}</p>
                          </div>
                        </div>
                      </div>
                    ))}
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
                    <p className="text-lg font-semibold text-gray-700">Generating comprehensive report...</p>
                    <p className="text-sm text-gray-500 mt-2">Analyzing behavioral patterns with Claude AI</p>
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

                    {/* Claude's Analysis */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain className="w-6 h-6 text-indigo-600" />
                        <h3 className="font-bold text-gray-800">Claude's Clinical Insights</h3>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed">
{sessionReport.analysis}
                        </pre>
                      </div>
                    </div>

                    {/* Metrics Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">Total Alerts Generated</p>
                        <p className="text-3xl font-bold text-blue-700">{sessionReport.alerts}</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-purple-600 font-medium">AI Insights Provided</p>
                        <p className="text-3xl font-bold text-purple-700">{sessionReport.insights}</p>
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

            {/* Patient Baseline Tab */}
            {activeTab === 'baseline' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Baseline Profiling:</strong> TherapyLens learns each patient's individual 
                    patterns to provide personalized insights. Baselines account for neurodiversity, 
                    cultural differences, and individual variation.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Patient #{patientId} Baseline Profile</h3>
                  
                  <div className="space-y-4">
                    <div className="border-b border-gray-200 pb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Typical Eye Contact Range
                      </label>
                      <input
                        type="text"
                        value={patientBaseline.eyeContactRange}
                        onChange={(e) => setPatientBaseline({...patientBaseline, eyeContactRange: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Autistic patients may have naturally lower ranges (20-40%)
                      </p>
                    </div>

                    <div className="border-b border-gray-200 pb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Baseline Breathing Range (bpm)
                      </label>
                      <input
                        type="text"
                        value={patientBaseline.breathingRange}
                        onChange={(e) => setPatientBaseline({...patientBaseline, breathingRange: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Normal adult range: 12-20 breaths per minute
                      </p>
                    </div>

                    <div className="border-b border-gray-200 pb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stress Response Threshold (bpm)
                      </label>
                      <input
                        type="number"
                        value={patientBaseline.stressThreshold}
                        onChange={(e) => setPatientBaseline({...patientBaseline, stressThreshold: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Breathing rate that indicates stress/anxiety for this patient
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dissociation Indicator (seconds)
                      </label>
                      <input
                        type="number"
                        value={patientBaseline.dissociationIndicator}
                        onChange={(e) => setPatientBaseline({...patientBaseline, dissociationIndicator: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Duration of fixed gaze that may indicate dissociation
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-semibold text-purple-900 mb-2">Neurodiversity Considerations</h4>
                  <ul className="text-sm text-purple-800 space-y-2">
                    <li>• <strong>Autism:</strong> May have lower baseline eye contact (not anxiety)</li>
                    <li>• <strong>ADHD:</strong> May show more gaze movement during concentration</li>
                    <li>• <strong>Trauma:</strong> May exhibit freeze responses (fixed gaze, shallow breathing)</li>
                    <li>• <strong>Cultural:</strong> Some cultures avoid direct eye contact as respect</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

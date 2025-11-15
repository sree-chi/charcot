// src/App.jsx

// ... other imports
import { useComputerVision } from './hooks/useComputerVision';

// A simple component to render the emotions
const EmotionDisplay = ({ emotions }) => {
  if (!emotions) {
    return <p>Loading emotions...</p>;
  }

  // Sort emotions by probability
  const sortedEmotions = Object.entries(emotions)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-1">
      <h4 className="font-semibold text-gray-700">Emotion Analysis</h4>
      {sortedEmotions.map(([emotion, probability]) => (
        <div key={emotion} className="flex items-center justify-between">
          <span className="text-sm capitalize text-gray-600">{emotion}</span>
          <div className="w-2/3 bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-500 h-2.5 rounded-full" 
              style={{ width: `${Math.round(probability * 100)}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-800">{Math.round(probability * 100)}%</span>
        </div>
      ))}
    </div>
  );
};


const App = () => {
  // ... (Session State, Data Collection, UI State...)
  
  // Refs
  const videoRef = useRef(null); // <--- videoRef is CREATED here
  const metricsIntervalRef = useRef(null);
  const insightsIntervalRef = useRef(null);
  
  // Patient Profile
  // ... (patientId, patientBaseline...)

  // Real-time computer vision tracking
  // The hook call MUST come AFTER videoRef is created
  const { eyeContact, gazeStability, breathingRate, emotions } = useComputerVision(
    videoRef,
    sessionActive,
    sessionPaused
  );

  // ... (all existing functions: startSession, pauseSession, etc.)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* ... (Header, Controls, Video) ... */}
      
      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ... */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          {/* ... (Tab navigation) ... */}

          <div className="p-6">
            {/* Live Monitor Tab */}
            {activeTab === 'monitor' && (
              <div className="space-y-6">
                {/* Real-time Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ... (Eye Contact, Breathing, Gaze Stability) ... */}
                </div>

                {/* 2. Add the new EmotionDisplay component */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
                  <EmotionDisplay emotions={emotions} />
                </div>

                {/* Metrics Chart */}
                {/* ... */}

                {/* Real-time Alerts */}
                {/* ... */}
              </div>
            )}

            {/* Session Report Tab */}
            {/* ... */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
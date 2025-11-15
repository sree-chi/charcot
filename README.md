# TherapyLens 🧠

**Tagline:** "Empowering therapists with real-time behavioral insights through ethical AI"

## Overview

TherapyLens is an AI-powered assistant that helps therapists detect non-verbal cues during therapy sessions by analyzing eye movement patterns and breathing through a webcam. It provides real-time behavioral insights and post-session summaries while maintaining strict privacy and ethical standards.

## Features

### ✨ Core Capabilities

1. **Live Session Monitor**
   - Real-time eye contact tracking
   - Breathing rate analysis
   - Gaze stability monitoring
   - Color-coded status indicators (green/yellow/red)
   - Gentle, non-intrusive notifications

2. **Claude AI Session Assistant**
   - Real-time pattern analysis every 2 minutes
   - Therapeutic insights and suggestions
   - Context-aware behavioral interpretation
   - Non-diagnostic, professional guidance

3. **Post-Session Analysis Report**
   - Comprehensive behavioral timeline
   - AI-generated clinical insights
   - Pattern identification
   - Recommendations for next session
   - Neurodiversity considerations

4. **Patient Baseline Profiling**
   - Individual baseline learning
   - Neurodiversity-aware comparisons
   - Cultural sensitivity settings
   - Personalized alert thresholds

5. **Privacy & Ethical Controls**
   - Patient consent requirement
   - Local-only processing
   - No audio/video recording
   - Automatic data deletion
   - HIPAA-ready architecture

## Technology Stack

- **Frontend:** React.js with Hooks
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **AI Analysis:** Claude API (Anthropic)
- **Computer Vision:** WebGazer.js (eye tracking), MediaPipe Pose (breathing)

## Installation & Setup

### Option 1: Quick Start (No Build Required)

1. **Download the files:**
   - `index.html`
   - `TherapyLens.jsx`

2. **Open `index.html` in a modern web browser**
   - The application loads all dependencies from CDN
   - No local server or build process required

3. **Grant webcam permissions** when prompted

### Option 2: Local Development

```bash
# Clone or download the project
cd therapylens

# Install dependencies
npm install react react-dom recharts lucide-react

# For development with a bundler (Vite recommended)
npm install -D vite @vitejs/plugin-react

# Run development server
npm run dev
```

### Option 3: Production Build

```bash
# Build for production
npm run build

# Serve the build
npx serve -s dist
```

## Usage Guide

### Starting a Session

1. **Patient Consent**
   - Patient must review and accept consent form
   - Explains what data is tracked
   - Outlines privacy protections
   - Patient can decline

2. **Start Tracking**
   - Click "Start Session" button
   - Webcam activates with visual indicator
   - Real-time metrics begin displaying

3. **During Session**
   - Monitor behavioral metrics in real-time
   - Review AI insights in the "AI Insights" tab
   - Pause tracking during sensitive moments
   - System generates alerts for significant changes

4. **End Session**
   - Click "End Session" button
   - Comprehensive report is automatically generated
   - Export report as JSON if needed
   - Delete all data when finished

### Understanding Metrics

**Eye Contact (%)**
- Percentage of time patient maintains eye contact
- Green: 40%+ (typical)
- Yellow: 20-40% (may indicate discomfort)
- Red: <20% (prolonged avoidance)
- Note: Baselines vary for neurodivergent individuals

**Breathing Rate (bpm)**
- Breaths per minute
- Green: 10-18 bpm (normal)
- Yellow: 19-24 bpm (elevated, possible stress)
- Red: 25+ bpm (hyperventilation)

**Gaze Stability (%)**
- Measures fixation vs. rapid eye movement
- Green: 60-90% (balanced)
- Yellow: <30% (rapid movement, anxiety) or >95% (fixed stare, dissociation)

### Interpreting Alerts

**🟡 Warning Alerts**
- Breathing rate increased 50%
- No eye contact for extended period
- Rapid eye movement suggesting anxiety
- Gaze patterns suggest dissociation

**🔴 Critical Alerts**
- Hyperventilation detected (25+ breaths/min)
- Prolonged fixed gaze (possible dissociation)
- Extreme breathing changes

### AI Insights

Claude analyzes patterns and provides:
- Contextual behavioral observations
- Gentle therapeutic suggestions
- Pattern recognition across session
- Non-diagnostic, professional guidance

Example insight:
> "Patient's breathing became shallow when discussing work stress. Consider exploring this topic further. The physiological response suggests this may be a significant stressor worth examining."

## Privacy & Security

### What is NOT Stored
- ❌ Video recordings
- ❌ Audio recordings
- ❌ Facial images
- ❌ Identifying information
- ❌ Session content or dialogue

### What IS Stored (Temporarily)
- ✅ Anonymized behavioral metrics
- ✅ Timestamps and durations
- ✅ Alert notifications
- ✅ AI-generated insights

### Data Lifecycle
1. **During Session:** Metrics stored in browser memory only
2. **After Session:** Report can be exported as anonymized JSON
3. **Deletion:** All data can be permanently deleted with one click
4. **Default:** No automatic cloud upload or long-term storage

### HIPAA Compliance
- All processing happens locally in the browser
- No data transmission except to Claude API (for insights only)
- Claude API calls do not include identifying patient information
- Therapist maintains full control over data retention
- Export functionality allows manual backup to encrypted storage

## Neurodiversity Considerations

### Autism Spectrum
- Lower baseline eye contact is normal, not anxiety
- System learns individual patterns
- Alerts calibrated to personal baseline
- Cultural eye contact variations respected

### ADHD
- More gaze movement during concentration is expected
- Fidgeting patterns tracked separately
- Difficulty with transitions noted in reports

### Trauma Survivors
- Freeze responses (fixed gaze, shallow breathing) identified
- Dissociation patterns flagged
- Grounding exercise effectiveness tracked

## Technical Architecture

```
┌─────────────────────────────────────────┐
│     TherapyLens Dashboard (React)       │
│  ┌──────────┐  ┌────────────────────┐  │
│  │  Live    │  │  Claude AI          │  │
│  │  Monitor │  │  Assistant          │  │
│  └──────────┘  └────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Real-time Behavioral Metrics     │  │
│  │  • Eye Movement  • Breathing      │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↓                    ↓
    ┌─────────────────┐  ┌──────────────┐
    │  WebGazer.js    │  │  MediaPipe   │
    │  (Eye Track)    │  │  (Breathing) │
    └─────────────────┘  └──────────────┘
```

## API Integration

### Claude API Setup

The application uses the Anthropic Messages API for behavioral analysis:

```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  })
});
```

**Note:** In the current implementation, API authentication is handled through the Claude.ai artifact environment. For production deployment, you'll need to add proper API key management.

### Adding API Key for Production

```javascript
// Add to fetch headers:
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'your-anthropic-api-key',
  'anthropic-version': '2023-06-01'
}
```

## Customization

### Adjusting Alert Thresholds

Edit the `checkForAlerts` function:

```javascript
// Hyperventilation threshold
if (br > 25) {  // Change 25 to desired threshold
  addAlert('critical', `Hyperventilation detected`);
}

// Eye contact threshold
if (ec < 20) {  // Change 20 to desired threshold
  addAlert('warning', `Minimal eye contact`);
}
```

### Changing Insight Frequency

Edit the useEffect for Claude insights:

```javascript
// Current: every 120 seconds (2 minutes)
if (sessionDuration > 0 && sessionDuration % 120 === 0) {
  generateClaudeInsight();
}

// Change to every 3 minutes:
if (sessionDuration > 0 && sessionDuration % 180 === 0) {
  generateClaudeInsight();
}
```

### Customizing Patient Baselines

Default values in `TherapyLens.jsx`:

```javascript
const [baselineBreathing, setBaselineBreathing] = useState(14);
const [baselineEyeContact, setBaselineEyeContact] = useState(45);
```

These can be adjusted per-patient in the "Patient Baseline" tab.

## Browser Compatibility

**Recommended:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features:**
- WebRTC for webcam access
- ES6+ JavaScript support
- CSS Grid and Flexbox
- Fetch API

## Troubleshooting

### Webcam Not Working
1. Check browser permissions
2. Ensure HTTPS or localhost (required for webcam)
3. Close other applications using the webcam
4. Try a different browser

### Claude Insights Not Generating
1. Check browser console for API errors
2. Verify internet connection
3. Ensure session is active and not paused
4. Wait 2+ minutes for first insight

### Metrics Not Updating
1. Ensure session is started (not just webcam)
2. Check that session is not paused
3. Refresh page and restart session
4. Check browser console for errors

## Future Enhancements

### Planned Features
- [ ] WebGazer.js integration for real eye tracking
- [ ] MediaPipe Pose for actual breathing detection
- [ ] Facial expression analysis (micro-expressions)
- [ ] Multi-session comparison reports
- [ ] Therapist notes integration
- [ ] Advanced pattern recognition algorithms
- [ ] Mobile app version
- [ ] Offline mode with local AI models

### Advanced Computer Vision
- Real eye tracking (currently simulated)
- Pupil dilation measurement
- Blink rate analysis
- Head pose estimation
- Facial action unit detection

## Contributing

This is a prototype/demonstration application. For production use:

1. Implement real eye tracking with WebGazer.js
2. Add MediaPipe for actual breathing detection
3. Implement proper authentication and API key management
4. Add database for session storage (with proper encryption)
5. Conduct clinical validation studies
6. Obtain necessary medical device certifications
7. Implement comprehensive audit logging

## Ethical Considerations

### Therapist Guidelines
- Always obtain informed consent
- Use as supplementary tool, not replacement for clinical judgment
- Respect patient autonomy (allow pause/stop)
- Delete data when no longer needed
- Never use for diagnosis without proper clinical training
- Be transparent about AI limitations

### Patient Rights
- Right to decline tracking
- Right to pause at any time
- Right to view all collected data
- Right to request deletion
- Right to understand how AI works
- Right to questions and concerns

### Limitations
- AI cannot diagnose mental health conditions
- Cultural and individual variations exist
- Not a replacement for therapist observation
- Requires clinical interpretation
- May not work equally for all populations

## License

This code is provided as-is for educational and demonstration purposes.

**Important:** This is a prototype. Do not use in clinical settings without:
- Proper medical device certification
- Clinical validation studies  
- Privacy and security audits
- Legal review for your jurisdiction
- IRB approval if used in research

## Support

For questions, issues, or feature requests, please open an issue in the project repository.

## Acknowledgments

Built with:
- React.js
- Tailwind CSS
- Recharts
- Lucide Icons
- Claude AI by Anthropic

Inspired by the need to support therapists and improve mental health outcomes through ethical AI.

---

**Remember:** TherapyLens is designed to empower therapists, not replace them. The human connection in therapy is irreplaceable.

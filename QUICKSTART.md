# TherapyLens Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Open the Application

**Option A: No Installation (Easiest)**
```bash
# Just open the HTML file in your browser
open index.html
```

**Option B: With Local Server**
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# Then visit: http://localhost:8000
```

### Step 2: Grant Webcam Permission

When prompted, click "Allow" to grant webcam access.

### Step 3: Patient Consent

1. Review consent information with patient
2. Patient checks the consent box
3. Click "Begin Session"

### Step 4: Start Tracking

Click the **"Start Session"** button to begin behavioral monitoring.

### Step 5: Monitor Session

- Watch real-time metrics in the dashboard
- Check AI insights every 2 minutes
- Pause if needed during sensitive moments

### Step 6: End Session

1. Click **"End Session"**
2. Review the comprehensive AI-generated report
3. Export if needed (JSON format)
4. Delete all data when finished

---

## 📊 Understanding the Dashboard

### Top Metrics (Green = Good, Yellow = Caution, Red = Alert)

**Eye Contact**
- Percentage of time patient looks at camera/therapist
- 40-60% is typical for most adults
- Lower baseline for autistic patients is normal

**Breathing Rate**
- Breaths per minute
- 12-20 bpm is normal resting rate
- 25+ indicates possible panic/hyperventilation

**Gaze Stability**
- How steady vs. scattered eye movements are
- 60-90% is balanced
- Very high (>95%) may indicate dissociation
- Very low (<30%) may indicate anxiety

### Real-Time Alerts

**🟡 Yellow Alerts** (Worth noting)
- Breathing increased 50%
- No eye contact for 45+ seconds
- Rapid eye movement (anxiety)

**🔴 Red Alerts** (Take action)
- Hyperventilation (25+ breaths/min)
- Possible dissociation (fixed gaze >90 sec)

### AI Insights Tab

Claude analyzes patterns every 2 minutes and provides:
- Observations about behavioral changes
- Suggested topics to explore
- Pattern recognition across the session

**Example Insight:**
> "Patient's breathing became shallow when discussing work stress. Consider exploring this topic further."

---

## ⚠️ When to Pause/Stop

**Pause Tracking If:**
- Patient seems uncomfortable with monitoring
- Discussing highly sensitive trauma
- System becomes distracting to you
- Technical issues occur
- Patient requests it

**Stop Completely If:**
- Patient withdraws consent
- Crisis situation (focus entirely on patient)
- Therapeutic alliance is being harmed
- System is consistently unhelpful

---

## 🎯 Quick Responses to Common Patterns

### Hyperventilation (25+ bpm)
```
"I notice your breathing has quickened. Let's pause and breathe together.
In for 4... hold for 4... out for 4..."
```

### Prolonged Eye Avoidance
```
"I notice something shifted when we talked about [topic]. 
How are you feeling about that?"
```

### Possible Dissociation (fixed gaze, shallow breathing)
```
"[Name], can you feel your feet on the floor? 
Tell me 5 things you can see in this room."
```

### Breathing Stabilized
```
"I notice you seem more settled now. 
That [coping strategy] seems to be helping."
```

---

## 🔒 Privacy Quick Reference

### What IS Collected (Temporarily)
- ✅ Eye movement percentages
- ✅ Breathing rate numbers
- ✅ Timestamps and durations

### What is NOT Collected
- ❌ Video recordings
- ❌ Audio recordings
- ❌ Patient names
- ❌ Session dialogue
- ❌ Medical records

### Data Lifecycle
1. **During Session:** Stored in browser memory only
2. **After Session:** Can export report (optional)
3. **Deletion:** Click "Delete All Data" or close browser

---

## 🧠 Neurodiversity Adjustments

### Autistic Patients

Set baseline in "Patient Baseline" tab:
- Eye Contact: 30-40% (vs. 45-55%)
- Note: Lower eye contact is typical, not anxiety

### ADHD Patients

Expect:
- More variable gaze (lower stability is normal)
- Better focus on interesting topics
- More fidgeting (tracked separately)

### Trauma Survivors

Watch for:
- Freeze responses (fixed gaze + shallow breathing)
- Dissociation indicators
- Grounding effectiveness

---

## 🛠️ Troubleshooting

### Webcam Not Working
1. Check browser permissions
2. Ensure HTTPS (or localhost)
3. Close other apps using webcam
4. Try different browser

### Metrics Not Updating
1. Check session is started (not just webcam)
2. Ensure not paused
3. Refresh page and restart

### No AI Insights
1. Check internet connection
2. Wait 2+ minutes
3. Check browser console for errors

### Patient Uncomfortable
1. Pause immediately
2. Discuss their concerns
3. Offer to stop completely
4. Don't pressure to continue

---

## 📋 Session Checklist

**Before Session:**
- [ ] Test webcam working
- [ ] Review previous session notes
- [ ] Check patient baseline settings
- [ ] Prepare consent discussion

**During Session:**
- [ ] Obtain consent
- [ ] Start session tracking
- [ ] Monitor metrics (glance, don't stare)
- [ ] Use insights to inform inquiry
- [ ] Stay present with patient

**After Session:**
- [ ] Review session report
- [ ] Note key patterns
- [ ] Export if needed
- [ ] Delete all data
- [ ] Update clinical notes

---

## 🎓 Key Principles

1. **Tool, Not Replacement**
   - Supports your clinical judgment
   - Doesn't replace rapport or observation

2. **Patient First**
   - Consent is mandatory
   - Respect patient autonomy
   - Pause/stop when needed

3. **Cultural Sensitivity**
   - Baselines vary by culture
   - Eye contact norms differ
   - Adjust accordingly

4. **Privacy Matters**
   - Local processing only
   - No permanent storage
   - Delete after each session

5. **Clinical Judgment Wins**
   - Trust your expertise
   - AI suggests, you decide
   - Ignore insights that don't fit

---

## 📞 Support

**Technical Issues:** Check README.md and DEPLOYMENT.md

**Privacy Questions:** See PRIVACY.md

**Clinical Guidance:** See CLINICAL_GUIDELINES.md (comprehensive)

**Quick Questions:** This guide!

---

## 💡 Pro Tips

**For Best Results:**
- Use with patients you know (not first session)
- Set individual baselines after 5-10 minutes
- Glance at metrics, don't stare
- Let insights inform, not dictate
- Process patient's experience with system

**Common Mistakes to Avoid:**
- ❌ Using as lie detector
- ❌ Diagnosing from metrics alone
- ❌ Forcing use when patient declines
- ❌ Letting system distract from patient
- ❌ Comparing patients to each other

**Advanced Usage:**
- Track grounding technique effectiveness
- Identify trauma triggers
- Notice regulation improvements
- Understand stress patterns
- Support neurodivergent patients

---

## 🔄 Typical Session Flow

```
0:00 - Consent & Setup
↓
0:05 - Start Session (establish baseline)
↓
0:05-0:45 - Therapy with monitoring
        │
        ├── Check metrics every 2-3 min
        ├── Review AI insights
        ├── Respond to alerts
        └── Stay present with patient
↓
0:45 - End Session
↓
0:46 - Review AI Report
↓
0:50 - Export (optional)
↓
0:51 - Delete All Data
```

---

## ⚡ Emergency Quick Reference

**Panic Attack**
1. Stay calm
2. Breathing exercises
3. Pause TherapyLens
4. Full attention to patient

**Dissociation**
1. Gentle reorientation
2. Grounding techniques
3. Don't touch without permission
4. Process when patient returns

**Suicidal Ideation**
1. **STOP THERAPYLENS IMMEDIATELY**
2. Conduct risk assessment
3. Follow clinical protocols
4. Focus entirely on patient safety

---

## 📱 Quick Reference Card

```
┌─────────────────────────────────────┐
│     THERAPYLENS QUICK GUIDE         │
├─────────────────────────────────────┤
│ NORMAL RANGES:                      │
│ • Eye Contact: 40-70%               │
│ • Breathing: 12-20 bpm              │
│ • Gaze Stability: 60-90%            │
├─────────────────────────────────────┤
│ ALERT IF:                           │
│ 🔴 Breathing >25 bpm                │
│ 🔴 Fixed gaze >90 sec               │
│ 🟡 Eye contact <20%                 │
│ 🟡 Breathing 50% above baseline     │
├─────────────────────────────────────┤
│ CONTROLS:                           │
│ • Pause: Yellow button              │
│ • Stop: Red button                  │
│ • Delete: After session ends        │
├─────────────────────────────────────┤
│ REMEMBER:                           │
│ ✓ Patient can stop anytime          │
│ ✓ You control the system            │
│ ✓ Trust your judgment               │
│ ✓ Privacy is paramount              │
└─────────────────────────────────────┘
```

---

**Ready to start? Open `index.html` and begin!**

**Need more detail? Check the comprehensive guides:**
- README.md - Full documentation
- CLINICAL_GUIDELINES.md - Therapist guide
- PRIVACY.md - Privacy policy
- DEPLOYMENT.md - Production deployment

**Questions? Issues? Feedback?**
Contact: support@therapylens.com

---

*TherapyLens: Empowering therapists with real-time behavioral insights through ethical AI*

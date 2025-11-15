# TherapyLens Privacy Policy

**Last Updated:** November 2025  
**Version:** 1.0

## Introduction

TherapyLens is committed to protecting patient privacy and maintaining the highest standards of data security. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your information.

## Our Privacy Principles

1. **Minimal Data Collection**: We collect only what's necessary for behavioral analysis
2. **Local Processing**: All analysis happens on your device
3. **No Permanent Storage**: Data is deleted after each session
4. **Patient Control**: You maintain full control over your data
5. **Transparency**: Clear disclosure of all tracking activities

## What We Collect

### Behavioral Metrics (Temporary)

During active therapy sessions, we temporarily collect:

- **Eye Movement Patterns**
  - Gaze direction (not what you're looking at)
  - Eye contact percentage
  - Gaze stability metrics
  - Blink rate

- **Breathing Patterns**
  - Breaths per minute
  - Breathing depth (chest expansion)
  - Breathing regularity

- **Timestamps**
  - Session start/end times
  - Duration of behavioral events
  - Alert timestamps

### What We DO NOT Collect

We **NEVER** collect, store, or transmit:

- ❌ Video recordings
- ❌ Audio recordings
- ❌ Facial images or photographs
- ❌ Facial recognition data
- ❌ Patient names or identifying information
- ❌ Session content or dialogue
- ❌ Medical records or diagnoses
- ❌ Insurance information
- ❌ Location data

## How We Use Your Data

### During the Session

1. **Real-Time Analysis**
   - Metrics are analyzed in your browser's memory
   - No data leaves your device during the session
   - Results displayed to therapist in real-time

2. **AI Insights** (Optional)
   - Anonymized metrics sent to Claude API for pattern analysis
   - No identifying information included
   - Anthropic's privacy policy applies to API calls
   - API calls can be disabled in settings

### After the Session

1. **Report Generation**
   - Comprehensive analysis compiled locally
   - Report stored temporarily in browser memory
   - Can be exported as anonymized JSON file

2. **Data Deletion**
   - All metrics automatically cleared from memory
   - No persistent storage in browser
   - Export files saved only if therapist chooses
   - Exported files under therapist's control

## Data Storage and Retention

### Temporary Storage (During Session Only)

- **Location**: Browser memory (RAM) only
- **Duration**: Session duration only
- **Deletion**: Automatic when session ends or browser closes

### No Persistent Storage

TherapyLens does **NOT** use:
- Browser localStorage
- Browser sessionStorage
- IndexedDB
- Cookies (except essential session cookies)
- Cloud storage
- Remote databases

### Optional Export

- Therapist may export anonymized session report
- Export is manual, not automatic
- Exported file stored on therapist's device
- Therapist responsible for exported file security

## Third-Party Services

### Claude API (Anthropic)

**When:** AI insights are generated  
**What's Sent:** Anonymized behavioral metrics only  
**Purpose:** Pattern analysis and therapeutic insights  
**Privacy Policy:** https://www.anthropic.com/privacy

**Data Sent to Claude:**
```json
{
  "session_duration": "47 minutes",
  "avg_breathing_rate": "16.2 bpm",
  "avg_eye_contact": "48%",
  "patient_id": "Anonymous #1847"
}
```

**NOT Sent to Claude:**
- Patient name
- Session video/audio
- Therapist notes
- Medical history
- Any identifying information

### No Other Third Parties

TherapyLens does not use:
- Analytics services (no Google Analytics, etc.)
- Advertising networks
- Social media integrations
- Third-party tracking scripts

## Patient Rights

### Right to Information

You have the right to:
- Know what data is being collected
- Understand how data is used
- Ask questions before consent
- Review this privacy policy anytime

### Right to Control

You have the right to:
- **Decline**: Refuse behavioral tracking entirely
- **Pause**: Stop tracking at any time during session
- **Resume**: Restart tracking when comfortable
- **End**: Terminate tracking and delete all data

### Right to Access

You have the right to:
- View all metrics being collected
- See real-time behavioral data
- Request explanation of any metric
- Review session report before export

### Right to Deletion

You have the right to:
- Request immediate data deletion
- Have all metrics permanently erased
- Prevent report export
- Ensure no data retention

### Right to Withdraw Consent

You can:
- Withdraw consent at any time
- Stop session without explanation
- No negative consequences for withdrawal
- Consent required for each session

## Informed Consent

### Before Each Session

Patients receive clear information about:

1. **What is tracked:**
   - Eye movements and patterns
   - Breathing rate and depth
   - Gaze stability and fixation

2. **How it's used:**
   - Help therapist notice behavioral patterns
   - Identify stress or anxiety markers
   - Improve therapeutic effectiveness

3. **Privacy protections:**
   - No video/audio recording
   - Local processing only
   - Automatic deletion
   - Full patient control

4. **Patient rights:**
   - Can decline or withdraw
   - Can pause at any time
   - Can request deletion
   - Can ask questions

### Consent Form Elements

Our consent form includes:
- ✅ Clear, plain language explanation
- ✅ Specific list of tracked metrics
- ✅ Statement of privacy protections
- ✅ Explanation of patient rights
- ✅ Option to decline
- ✅ Electronic signature/acknowledgment

## Security Measures

### Technical Safeguards

1. **Local Processing**
   - All analysis happens on local device
   - No data transmission except optional AI calls
   - No cloud storage or databases

2. **Encryption**
   - HTTPS required for webcam access
   - API calls encrypted in transit (TLS 1.3)
   - No data at rest to encrypt

3. **Access Control**
   - Only therapist sees behavioral data
   - No multi-user access
   - No remote access capabilities

4. **Memory Protection**
   - Data never written to disk
   - Cleared on session end
   - Inaccessible after browser close

### Organizational Safeguards

1. **Staff Training**
   - Therapists trained on privacy practices
   - Understanding of patient rights
   - Proper consent procedures

2. **Incident Response**
   - Plan for potential privacy breaches
   - Patient notification procedures
   - Corrective action protocols

3. **Regular Audits**
   - Privacy practice reviews
   - Security assessment
   - Compliance verification

## HIPAA Compliance (US)

### Applicability

TherapyLens is designed to support HIPAA compliance when:
- Used by covered entities (healthcare providers)
- Proper Business Associate Agreement in place
- Additional safeguards implemented

### Technical Compliance

✅ **Meets HIPAA Requirements:**
- No PHI (Protected Health Information) stored
- Local processing minimizes exposure
- Encryption in transit (HTTPS/TLS)
- Patient access controls
- Audit capabilities via export logs

⚠️ **Covered Entity Responsibilities:**
- Maintain secure device/network
- Implement access controls
- Train staff on privacy practices
- Secure exported files
- Maintain audit logs

### Not a HIPAA-Covered Service

TherapyLens itself:
- Does not store PHI
- Does not transmit PHI (except anonymized metrics to Claude)
- Is not a cloud service or data processor
- Functions as therapist's tool, not data handler

**Recommendation:** Consult with HIPAA compliance officer before deployment.

## GDPR Compliance (EU)

### Legal Basis

Processing based on:
- **Consent**: Explicit, informed patient consent
- **Legitimate Interest**: Improving therapeutic care
- **Vital Interest**: Detecting mental health crises

### Data Subject Rights

TherapyLens supports all GDPR rights:

1. **Right to Access**: View all collected data in real-time
2. **Right to Rectification**: Correct inaccurate baselines
3. **Right to Erasure**: Delete all data immediately
4. **Right to Restriction**: Pause tracking
5. **Right to Portability**: Export data in JSON format
6. **Right to Object**: Decline tracking entirely
7. **Right to Automated Decision-Making**: No automated diagnoses made

### Data Protection Officer

For GDPR inquiries, contact your organization's Data Protection Officer.

## Children's Privacy

### Special Protections

For patients under 18:
- Parental/guardian consent required
- Age-appropriate explanations
- Extra care with sensitive content
- No data collection without guardian approval

### COPPA Compliance (US)

For children under 13:
- Verifiable parental consent mandatory
- No persistent identifiers
- No data sales or transfers
- Special deletion procedures

## International Data Transfers

### Claude API Calls

When AI insights are used:
- Data sent to Anthropic (US-based company)
- Only anonymized metrics transmitted
- Subject to Anthropic's privacy policy
- EU Standard Contractual Clauses may apply

### No Other Transfers

- No other international data transfers
- All processing happens locally
- No cloud storage in any jurisdiction

## Changes to This Policy

### Notification

We will notify you of privacy policy changes through:
- In-app notification
- Email to registered therapists
- Website announcement
- Updated version number and date

### Material Changes

For significant changes:
- 30-day advance notice
- Re-consent required
- Option to discontinue use

## Contact Information

### Privacy Questions

For privacy-related questions or concerns:

**Email**: privacy@therapylens.com  
**Mail**: [Organization Address]  
**Phone**: [Phone Number]

### Data Subject Requests

To exercise your privacy rights:

**Email**: privacy@therapylens.com  
**Subject Line**: "Data Subject Request - [Your Patient ID]"

We will respond within:
- 30 days (GDPR)
- 45 days (CCPA)
- As required by local law

### Complaints

If you believe your privacy rights have been violated:

1. Contact us directly (information above)
2. File complaint with your organization
3. Contact regulatory authorities:
   - **US**: HHS Office for Civil Rights (HIPAA)
   - **EU**: Your national Data Protection Authority
   - **UK**: Information Commissioner's Office (ICO)

## Therapist Responsibilities

### Data Protection

Therapists using TherapyLens must:

1. **Secure Devices**
   - Use password-protected computers
   - Enable full-disk encryption
   - Install security updates
   - Use antivirus software

2. **Secure Networks**
   - Use encrypted WiFi (WPA3/WPA2)
   - Avoid public WiFi for sessions
   - Use VPN if necessary
   - Firewall enabled

3. **Secure Exports**
   - Encrypt exported files
   - Store in secure location
   - Delete when no longer needed
   - Never share without patient consent

4. **Patient Consent**
   - Obtain before each session
   - Document consent
   - Respect withdrawal
   - Answer patient questions

## Disclaimer

### Not a Medical Device

TherapyLens is:
- An assistive tool for therapists
- Not FDA-cleared or CE-marked
- Not a diagnostic device
- Not a replacement for clinical judgment

### No Guarantees

We do not guarantee:
- Accuracy of behavioral metrics
- Detection of all mental health conditions
- Suitability for all patients
- Availability or uptime

### Professional Responsibility

Therapists remain solely responsible for:
- Clinical assessments
- Treatment decisions
- Patient safety
- Professional liability

## Acknowledgment

By using TherapyLens, you acknowledge that you have:
- Read this privacy policy
- Understand how data is collected and used
- Consent to the practices described
- Understand your rights and how to exercise them

---

**Questions?** Contact privacy@therapylens.com

**Updates?** Check this policy regularly for changes

**Your Privacy Matters.** We're committed to protecting it.

"""
camera_emotions_physiology.py
Single-file prototype that:
- reads webcam frames
- uses MediaPipe for face/landmarks/iris
- uses 'fer' for facial emotion probabilities
- estimates breathing rate from cheek/forehead green-channel (simple rPPG)
- computes eye-contact percentage (looking toward camera)
- computes blink rate, stress score (heuristic), dissociation indicator (heuristic)

Run: python camera_emotions_physiology.py
"""

import cv2
import time
import numpy as np
from collections import deque
from fer import FER
import mediapipe as mp
from scipy.signal import detrend, welch

# -----------------------------
# CONFIG
# -----------------------------
FRAME_WIDTH = 640
FRAME_HEIGHT = 480
BUFFER_SECONDS = 20            # rolling buffer length for physiological estimates
FPS = 20                       # target processing FPS (approx)
SAMPLING_RATE = FPS
GREEN_CHANNEL_REGION = "cheek" # which region to sample for rPPG: 'forehead' or 'cheek'
BREATH_FREQ_BOUNDS = (0.1, 0.6)  # Hz -> 6 to 36 breaths/min (typical human breathing rates)

# Heuristic thresholds (tune for your environment)
EYE_CONTACT_ANGLE_THRESHOLD_DEG = 15  # allowable gaze deviation to count as "looking at camera"
BLINK_EAR_THRESHOLD = 0.18           # eye aspect ratio threshold for blink detection
BLINK_MIN_FRAMES = 2                 # consecutive frames to register blink
DISSOCIATION_FREEZE_MOVEMENT_THRESHOLD = 1.0  # px per frame average motion energy
# -----------------------------

# Initialize detectors/models
mp_face_mesh = mp.solutions.face_mesh
mp_face_detection = mp.solutions.face_detection
mp_drawing = mp.solutions.drawing_utils

face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False,
                                  max_num_faces=1,
                                  refine_landmarks=True,
                                  min_detection_confidence=0.5,
                                  min_tracking_confidence=0.5)

face_detector = mp_face_detection.FaceDetection(min_detection_confidence=0.5)
emotion_detector = FER(mtcnn=True)  # FER uses a pretrained CNN, mtcnn for face crop

# Rolling buffers
frame_buffer = deque(maxlen=BUFFER_SECONDS * SAMPLING_RATE)
green_signal_buffer = deque(maxlen=BUFFER_SECONDS * SAMPLING_RATE)
timestamp_buffer = deque(maxlen=BUFFER_SECONDS * SAMPLING_RATE)
motion_buffer = deque(maxlen=BUFFER_SECONDS * SAMPLING_RATE)
blink_timestamps = deque()

# helpers for EAR (eye aspect ratio)
def eye_aspect_ratio(landmarks, left_indices, right_indices, image_w, image_h):
    # compute EAR per-eye using 2D coords from face mesh
    def ear_for(indices):
        pts = np.array([(int(landmarks[i].x * image_w), int(landmarks[i].y * image_h)) for i in indices])
        # vertical distances
        A = np.linalg.norm(pts[1] - pts[5])
        B = np.linalg.norm(pts[2] - pts[4])
        # horizontal
        C = np.linalg.norm(pts[0] - pts[3])
        if C == 0:
            return 0.0
        return (A + B) / (2.0 * C)
    return ear_for(left_indices), ear_for(right_indices)

# key landmark indices for MediaPipe Face Mesh (refined model)
# iris / eye region indices from MediaPipe documentation
LEFT_EYE_IDX = [33, 160, 158, 133, 153, 144]   # approximate set for EAR
RIGHT_EYE_IDX = [362, 385, 387, 263, 373, 380]
LEFT_IRIS_IDX = [468, 469, 470, 471]   # iris landmarks
RIGHT_IRIS_IDX = [473, 474, 475, 476]

# function to sample green channel from forehead or cheek region
def sample_green_channel(frame, landmarks, region="cheek"):
    h, w = frame.shape[:2]
    if landmarks is None:
        return None
    # choose coordinates for small ROI
    if region == "forehead":
        # take midpoint between forehead approximate points (10 and 338 are top-ish)
        x = int((landmarks[10].x + landmarks[338].x) / 2 * w)
        y = int((landmarks[10].y + landmarks[338].y) / 2 * h) - int(0.06*h)
    else:
        # cheek: use landmark around cheek (e.g., 234 or 454)
        x = int(landmarks[234].x * w) if len(landmarks) > 234 else int(w*0.35)
        y = int(landmarks[234].y * h) if len(landmarks) > 234 else int(h*0.45)
    # small ROI
    s = int(min(w, h) * 0.06)
    x1, y1 = max(0, x - s), max(0, y - s)
    x2, y2 = min(w - 1, x + s), min(h - 1, y + s)
    roi = frame[y1:y2, x1:x2]
    if roi.size == 0:
        return None
    # return mean green channel
    return float(np.mean(roi[:, :, 1]))

# simple function to compute dominant frequency in band using Welch
def dominant_freq_from_signal(sig, fs, low, high):
    if len(sig) < 4:
        return None
    sig = np.asarray(sig)
    # detrend
    sig = detrend(sig)
    f, Pxx = welch(sig, fs=fs, nperseg=min(256, len(sig)))
    # find indices within band
    mask = (f >= low) & (f <= high)
    if not np.any(mask):
        return None
    f_band = f[mask]
    P_band = Pxx[mask]
    peak_i = np.argmax(P_band)
    return float(f_band[peak_i])

# camera capture
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

prev_gray = None
last_blink_state = False
blink_counter_frames = 0

# timing
last_print = time.time()
frame_idx = 0
start_time = time.time()

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        t = time.time() - start_time
        timestamp_buffer.append(t)
        small_frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
        rgb = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        # --------- Face detection + landmarks ----------
        face_results = face_mesh.process(rgb)
        face_landmarks = None
        if face_results.multi_face_landmarks:
            face_landmarks = face_results.multi_face_landmarks[0].landmark

        # --------- emotion detection (FER)
        # FER expects RGB images; pass whole frame (it's fast enough for prototype)
        try:
            emotion_result = emotion_detector.top_emotion(cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB))
            # top_emotion returns (label, score) or None
            emotion_label, emotion_score = (emotion_result if emotion_result is not None else ("neutral", 0.0))
            # for richer distribution, call emotion_detector.detect_emotions which returns dict with probabilities
            emotions_full = {}
            try:
                detections = emotion_detector.detect_emotions(cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB))
                if detections and len(detections) > 0:
                    emotions_full = detections[0]["emotions"]
                else:
                    emotions_full = {}
            except Exception:
                emotions_full = {}
        except Exception as e:
            emotion_label, emotion_score = "neutral", 0.0
            emotions_full = {}

        # --------- rPPG: green signal sampling ----------
        green_val = sample_green_channel(small_frame, face_landmarks, region=GREEN_CHANNEL_REGION)
        if green_val is not None:
            green_signal_buffer.append(green_val)
        else:
            # add previous or 0 to keep buffers aligned
            green_signal_buffer.append(green_signal_buffer[-1] if len(green_signal_buffer) else 0.0)

        # --------- motion energy (simple optical flow magnitude) ----------
        gray = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
        motion_mag = 0.0
        if prev_gray is not None:
            flow = cv2.calcOpticalFlowFarneback(prev_gray, gray, None,
                                                pyr_scale=0.5, levels=3, winsize=15,
                                                iterations=3, poly_n=5, poly_sigma=1.2, flags=0)
            motion_mag = np.mean(np.linalg.norm(flow, axis=2))
        prev_gray = gray
        motion_buffer.append(motion_mag)

        # --------- eye contact & blink detection ----------
        eye_contact = False
        blink = False
        if face_landmarks is not None:
            h, w = small_frame.shape[:2]

            # iris centers approximate
            left_iris_pts = [face_landmarks[i] for i in LEFT_IRIS_IDX]
            right_iris_pts = [face_landmarks[i] for i in RIGHT_IRIS_IDX]
            # compute iris centers in pixel coords
            def center_of(pts):
                xs = [p.x for p in pts]; ys = [p.y for p in pts]
                return (np.mean(xs)*w, np.mean(ys)*h)
            try:
                licx, licy = center_of(left_iris_pts)
                ricx, ricy = center_of(right_iris_pts)
                # head pose proxy: compare iris center to eye center to estimate deviation
                # Use the center between eye corners as camera-facing reference
                left_eye_center = np.array([(face_landmarks[33].x + face_landmarks[133].x)/2 * w,
                                            (face_landmarks[33].y + face_landmarks[133].y)/2 * h])
                right_eye_center = np.array([(face_landmarks[362].x + face_landmarks[263].x)/2 * w,
                                             (face_landmarks[362].y + face_landmarks[263].y)/2 * h])
                left_iris_rel = np.array([licx, licy]) - left_eye_center
                right_iris_rel = np.array([ricx, ricy]) - right_eye_center
                # compute angle approx as arctan of x-offset, convert to degrees
                # larger horizontal offsets mean looking to side
                avg_x_offset = (left_iris_rel[0] + right_iris_rel[0]) / 2.0
                gaze_angle_deg = np.degrees(np.arctan2(avg_x_offset, w))  # very rough
                eye_contact = abs(gaze_angle_deg) < EYE_CONTACT_ANGLE_THRESHOLD_DEG
            except Exception:
                eye_contact = False

            # EAR blink detection
            ear_l, ear_r = eye_aspect_ratio(face_landmarks, LEFT_EYE_IDX, RIGHT_EYE_IDX, w, h)
            ear = (ear_l + ear_r) / 2.0
            if ear < BLINK_EAR_THRESHOLD:
                blink_counter_frames += 1
            else:
                if blink_counter_frames >= BLINK_MIN_FRAMES:
                    blink = True
                    blink_timestamps.append(time.time())
                blink_counter_frames = 0

        # store per-frame info in buffers
        frame_buffer.append({
            "t": t,
            "motion": motion_mag,
            "eye_contact": eye_contact,
            "blink": blink,
            "emotion_label": emotion_label,
            "emotion_score": emotion_score,
            "emotions_full": emotions_full
        })

        # ---------- Periodically compute derived metrics ----------
        if len(timestamp_buffer) >= SAMPLING_RATE * 4 and (time.time() - last_print) > 1.0:
            last_print = time.time()

            # breathing estimate (dominant freq in green signal)
            sig = list(green_signal_buffer)
            df = dominant_freq_from_signal(sig, fs=SAMPLING_RATE, low=BREATH_FREQ_BOUNDS[0], high=BREATH_FREQ_BOUNDS[1])
            breaths_per_min = df * 60.0 if df is not None else None

            # eye contact percentage over buffer
            eye_contact_vals = [1.0 if f["eye_contact"] else 0.0 for f in frame_buffer]
            eye_contact_pct = 100.0 * (np.mean(eye_contact_vals) if len(eye_contact_vals) else 0.0)

            # blink rate (blinks / minute)
            # consider blinks in last BUFFER_SECONDS
            now = time.time()
            blinks_recent = [ts for ts in blink_timestamps if now - ts <= BUFFER_SECONDS]
            blink_rate_per_min = len(blinks_recent) * (60.0 / BUFFER_SECONDS)

            # motion energy mean
            motion_mean = float(np.mean(list(motion_buffer))) if len(motion_buffer) else 0.0

            # emotion distribution (aggregate last few frames)
            # combine emotions_full dictionaries
            agg = {}
            for f in list(frame_buffer)[-int(SAMPLING_RATE*5):]:  # last ~5 seconds
                e = f.get("emotions_full", {})
                for k, v in e.items():
                    agg[k] = agg.get(k, 0.0) + v
            # normalize
            total = sum(agg.values()) if agg else 0.0
            emotions_agg_norm = {k: (v/total if total>0 else 0.0) for k, v in agg.items()}

            # Stress score heuristics:
            # - higher blink rate and high motion + irregular breathing -> lower stress? (context dependent)
            # We'll compute a heuristic:
            # stress_score in 0-100 where higher is more stressed:
            #    - fast breathing (above 20 bpm) increases stress
            #    - low HRV proxy: high power in breathing band? (we lack HR)
            #    - high motion energy + high frequency facial expressions increase stress
            stress = 0.0
            if breaths_per_min is not None:
                if breaths_per_min > 20:
                    stress += min((breaths_per_min - 20) * 2.0, 40.0)  # up to +40
                elif breaths_per_min < 8:
                    # very low breathing can reflect freezing/low arousal, add a bit
                    stress += min((8 - breaths_per_min) * 2.0, 10.0)
            # blink-rate effect (very high blink rate can indicate stress)
            if blink_rate_per_min > 30:
                stress += min((blink_rate_per_min - 30) * 0.8, 15.0)
            # motion energy: big spikes (fidgeting) add stress
            stress += min(motion_mean * 5.0, 25.0)  # scale empirically
            stress = np.clip(stress, 0.0, 100.0)

            # Dissociation indicator heuristic (0-1):
            # - low motion energy (freeze)
            # - low expressivity (emotion entropy low)
            # - low blink rate
            # compute expressivity entropy over aggregated emotions
            ent = 0.0
            probs = np.array(list(emotions_agg_norm.values())) if emotions_agg_norm else np.array([])
            if probs.size > 0:
                probs = probs / (probs.sum() + 1e-9)
                ent = -float(np.sum([p * np.log(p + 1e-9) for p in probs]))
                # normalize by log(#categories)
                max_ent = np.log(len(probs)) if len(probs) > 0 else 1.0
                expressivity = ent / (max_ent + 1e-9)
            else:
                expressivity = 0.0

            motion_score = np.clip(motion_mean / (DISSOCIATION_FREEZE_MOVEMENT_THRESHOLD + 1e-9), 0.0, 1.0)
            blink_norm = np.clip((blink_rate_per_min / 20.0), 0.0, 1.0)  # typical blink rate ~15-20/min
            dissociation_score = ( (1.0 - motion_score) * 0.5 + (1.0 - expressivity) * 0.4 + (1.0 - blink_norm) * 0.1 )
            dissociation_score = float(np.clip(dissociation_score, 0.0, 1.0))

            # build a simple JSON-like output
            out = {
                "timestamp": time.time(),
                "breaths_per_min": None if breaths_per_min is None else round(float(breaths_per_min), 2),
                "eye_contact_pct": round(float(eye_contact_pct), 1),
                "blink_rate_per_min": round(float(blink_rate_per_min), 2),
                "motion_mean": round(float(motion_mean), 3),
                "stress_score_0_100": round(float(stress), 1),
                "dissociation_0_1": round(float(dissociation_score), 3),
                "dominant_emotion": emotion_label,
                "emotion_distribution": emotions_agg_norm
            }

            # print to console
            print("================ METRICS ================")
            for k, v in out.items():
                print(f"{k}: {v}")
            print("=========================================")

        # ----------- visualization overlays -------------
        display = small_frame.copy()
        # draw face landmarks
        if face_landmarks is not None:
            mp_drawing.draw_landmarks(display, face_results.multi_face_landmarks[0],
                                      mp_face_mesh.FACE_CONNECTIONS,
                                      landmark_drawing_spec=None,
                                      connection_drawing_spec=mp_drawing.DrawingSpec(thickness=1, circle_radius=1, color=(0,255,0)))
        # show top emotion label
        cv2.putText(display, f"Emotion: {emotion_label} ({emotion_score:.2f})", (10, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)
        # show eye contact / blink
        cv2.putText(display, f"EyeContact: {'YES' if eye_contact else 'no'}", (10, 45),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,0) if eye_contact else (0,0,255), 2)
        cv2.putText(display, f"Blink: {'Y' if blink else ' '}", (10, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)

        cv2.imshow("Camera Metrics", display)

        # cap the loop to target FPS
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

finally:
    cap.release()
    cv2.destroyAllWindows()

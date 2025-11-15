import cv2
from deepface import DeepFace

# -----------------------------
# Load webcam
# -----------------------------
cap = cv2.VideoCapture(0)

print("Starting real-time emotion detection...")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # DeepFace expects RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    try:
        # Analyze emotions using pretrained DeepFace model
        analysis = DeepFace.analyze(
            rgb_frame,
            actions=['emotion'],
            enforce_detection=False
        )

        emotion = analysis['dominant_emotion']

        # Draw label on video
        cv2.putText(frame, f"Emotion: {emotion}",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 0),
                    2)
    except Exception as e:
        cv2.putText(frame, "No face detected",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 0, 255),
                    2)

    # Show the video
    cv2.imshow("Live Emotion Detection", frame)

    # Quit on 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()


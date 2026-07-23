import { useCallback, useEffect, useRef, useState } from "react";
import "./CrowdDetectionPage.css";

const CONFIDENCE_STEP = 0.05;
const INITIAL_CONFIDENCE = 0.55;
const DETECTION_INTERVAL_MS = 700;
const PERSON_CLASS = "person";
const INITIAL_GYM_CAPACITY = 70;
const INITIAL_RANGES = {
  normalMax: 35,
  moderateMax: 55,
};
const TENSORFLOW_SCRIPT_ID = "tensorflow-js-script";
const COCO_SSD_SCRIPT_ID = "coco-ssd-script";
const TENSORFLOW_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
const COCO_SSD_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";

function loadScript({ id, src }) {
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(id);

    if (existingScript?.dataset.loaded === "true") {
      resolve();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadCrowdDetectionModel() {
  await loadScript({ id: TENSORFLOW_SCRIPT_ID, src: TENSORFLOW_SCRIPT_SRC });
  await loadScript({ id: COCO_SSD_SCRIPT_ID, src: COCO_SSD_SCRIPT_SRC });

  if (!window.cocoSsd?.load) {
    throw new Error("COCO-SSD model loader is unavailable.");
  }

  return window.cocoSsd.load();
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function getCrowdStatus(count, ranges) {
  if (count > ranges.moderateMax) {
    return { label: "Crowded", tone: "red"};
  }

  if (count > ranges.normalMax) {
    return { label: "Moderate", tone: "yellow"};
  }

  return { label: "Normal", tone: "green"};
}

function getCameraStatus({ modelStatus, sourceStatus }) {
  if (modelStatus === "error" || sourceStatus === "error") {
    return { label: "Offline", tone: "red"};
  }

  if (modelStatus === "loading" || sourceStatus === "loading" || sourceStatus === "idle") {
    return { label: "Starting", tone: "yellow"};
  }

  return { label: "Online", tone: "green"};
}

function drawPredictions(canvas, source, people) {
  const width = source.videoWidth || source.naturalWidth || source.clientWidth;
  const height = source.videoHeight || source.naturalHeight || source.clientHeight;
  const context = canvas.getContext("2d");

  if (!context || !width || !height) {
    return;
  }

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.lineWidth = Math.max(3, Math.round(width / 240));
  context.font = `${Math.max(14, Math.round(width / 42))}px Inter, Arial, sans-serif`;

  people.forEach((person, index) => {
    const [x, y, boxWidth, boxHeight] = person.bbox;
    const label = `Person ${index + 1} ${formatPercent(person.score)}`;
    const labelWidth = context.measureText(label).width + 16;
    const labelY = y > 30 ? y - 28 : y + 8;

    context.strokeStyle = "#39e600";
    context.fillStyle = "rgba(57, 230, 0, 0.18)";
    context.strokeRect(x, y, boxWidth, boxHeight);
    context.fillRect(x, y, boxWidth, boxHeight);

    context.fillStyle = "#39e600";
    context.fillRect(x, labelY, labelWidth, 24);
    context.fillStyle = "#081008";
    context.fillText(label, x + 8, labelY + 17);
  });
}

export default function CrowdDetectionPage({ isActive = true }) {
  const modelRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const lastDetectionRef = useRef(0);
  const cameraSessionRef = useRef(0);
  const isMountedRef = useRef(false);

  const [confidence, setConfidence] = useState(INITIAL_CONFIDENCE);
  const [detections, setDetections] = useState([]);
  const [gymCapacity, setGymCapacity] = useState(INITIAL_GYM_CAPACITY);
  const [ranges, setRanges] = useState(INITIAL_RANGES);
  const [videoAspectRatio, setVideoAspectRatio] = useState("16 / 9");
  const [modelStatus, setModelStatus] = useState("loading");
  const [sourceStatus, setSourceStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const people = detections.filter((prediction) => prediction.class === PERSON_CLASS && prediction.score >= confidence);
  const crowdStatus = getCrowdStatus(people.length, ranges);
  const cameraStatus = getCameraStatus({ modelStatus, sourceStatus });
  const capacityPercent = Math.min(100, Math.round((people.length / gymCapacity) * 100));
  const averageConfidence = people.length
    ? people.reduce((total, person) => total + person.score, 0) / people.length
    : 0;
  const moderateMin = ranges.normalMax + 1;
  const crowdedMin = ranges.moderateMax + 1;

  const updateRange = (key, value) => {
    const nextValue = Math.max(0, Math.min(gymCapacity - 1, Number(value) || 0));

    setRanges((currentRanges) => {
      if (key === "normalMax") {
        return {
          normalMax: Math.min(nextValue, currentRanges.moderateMax - 1),
          moderateMax: currentRanges.moderateMax,
        };
      }

      return {
        normalMax: currentRanges.normalMax,
        moderateMax: Math.max(nextValue, currentRanges.normalMax + 1),
      };
    });
  };

  const updateGymCapacity = (value) => {
    const nextCapacity = Math.max(1, Number(value) || 1);

    setGymCapacity(nextCapacity);
    setRanges((currentRanges) => {
      const normalMax = Math.min(currentRanges.normalMax, Math.max(0, nextCapacity - 2));
      const moderateMax = Math.min(
        Math.max(currentRanges.moderateMax, normalMax + 1),
        Math.max(1, nextCapacity - 1),
      );

      return { normalMax, moderateMax };
    });
  };

  const updateVideoAspectRatio = () => {
    const video = videoRef.current;

    if (video?.videoWidth && video?.videoHeight) {
      setVideoAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
    }
  };

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const runDetection = useCallback(async (source) => {
    if (!isMountedRef.current || !modelRef.current || !source) {
      return;
    }

    try {
      const predictions = await modelRef.current.detect(source);
      const nextPeople = predictions.filter((prediction) => prediction.class === PERSON_CLASS && prediction.score >= confidence);

      if (!isMountedRef.current) {
        return;
      }

      setDetections(predictions);
      drawPredictions(canvasRef.current, source, nextPeople);
      setSourceStatus("ready");
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      console.error(error);
      setErrorMessage("Detection failed. Try another image or restart the camera.");
      setSourceStatus("error");
    }
  }, [confidence]);

  const detectVideoFrame = useCallback((timestamp = 0) => {
    const video = videoRef.current;

    if (!isMountedRef.current) {
      return;
    }

    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !modelRef.current) {
      animationRef.current = requestAnimationFrame(detectVideoFrame);
      return;
    }

    if (timestamp - lastDetectionRef.current >= DETECTION_INTERVAL_MS) {
      lastDetectionRef.current = timestamp;
      runDetection(video);
    }

    animationRef.current = requestAnimationFrame(detectVideoFrame);
  }, [runDetection]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Camera access is not available in this browser.");
      setSourceStatus("error");
      return;
    }

    stopCamera();
    clearCanvas();
    setDetections([]);
    setErrorMessage("");
    setSourceStatus("loading");

    try {
      const cameraSession = cameraSessionRef.current + 1;
      cameraSessionRef.current = cameraSession;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (!isMountedRef.current || cameraSessionRef.current !== cameraSession) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        if (!isMountedRef.current || cameraSessionRef.current !== cameraSession) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        lastDetectionRef.current = 0;
        animationRef.current = requestAnimationFrame(detectVideoFrame);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Camera permission was blocked or no camera was found.");
      setSourceStatus("error");
    }
  }, [clearCanvas, detectVideoFrame, stopCamera]);

  useEffect(() => {
    isMountedRef.current = true;

    let isCurrent = true;

    async function loadModel() {
      try {
        const model = await loadCrowdDetectionModel();

        if (isCurrent) {
          modelRef.current = model;
          setModelStatus("ready");
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setModelStatus("error");
          setErrorMessage("The crowd detection model could not be loaded.");
        }
      }
    }

    loadModel();

    return () => {
      isCurrent = false;
      isMountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (modelStatus === "ready" && sourceStatus === "idle") {
      startCamera();
    }
  }, [modelStatus, sourceStatus, startCamera]);

  useEffect(() => {
    const source = videoRef.current;
    const visiblePeople = detections.filter((prediction) => prediction.class === PERSON_CLASS && prediction.score >= confidence);

    if (source && detections.length > 0) {
      drawPredictions(canvasRef.current, source, visiblePeople);
    }
  }, [confidence, detections]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  const goToOverview = () => {
    window.history.pushState(null, "", "/admin");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <section
      className={isActive ? "admin-content crowd-detection-page" : "admin-content crowd-detection-page crowd-detection-page-hidden"}
      id="crowd-detection"
    >
      <header className="admin-header crowd-detection-header">
        <div>
          <h2>Crowd Detection System</h2>
          <p>Admin view for monitoring the AI model video, live capacity, and detection results.</p>
        </div>

        <button className="crowd-back-button" onClick={goToOverview} type="button">Back to Overview</button>
      </header>

      <div className="crowd-monitor-grid">
        <section className="admin-card crowd-monitor-card">
          <div className="crowd-monitor-titlebar">
            <h3>AI Model Video Preview</h3>
            <span className="crowd-live-pill">LIVE</span>
          </div>

          <div className="crowd-monitor-stage" style={{ "--crowd-video-aspect": videoAspectRatio }}>
            <video
              aria-label="Live gym camera preview"
              muted
              onLoadedMetadata={updateVideoAspectRatio}
              playsInline
              ref={videoRef}
            ></video>

            <canvas aria-hidden="true" ref={canvasRef}></canvas>

            {(modelStatus === "loading" || sourceStatus === "loading") && (
              <div className="crowd-stage-state">
                <strong>{modelStatus === "loading" ? "Loading detection model" : "Preparing source"}</strong>
                <span>{modelStatus === "loading" ? "COCO-SSD is starting in the browser." : "Waiting for a usable frame."}</span>
              </div>
            )}

            {(modelStatus === "error" || sourceStatus === "error") && (
              <div className="crowd-stage-state error">
                <strong>Detection unavailable</strong>
                <span>{errorMessage}</span>
              </div>
            )}

          </div>

          <footer className="crowd-monitor-footer">
            <div className="crowd-source-controls" aria-label="Detection source controls">
              <button
                className="active"
                disabled={modelStatus !== "ready"}
                onClick={startCamera}
                type="button"
              >
                Live camera
              </button>
            </div>
          </footer>
        </section>

        <aside className="admin-card crowd-live-status-card">
          <h3>Live Status</h3>
          <div className={`crowd-level-badge ${crowdStatus.tone}`}>
            <span></span>
            {crowdStatus.label}
          </div>

          <div className="crowd-capacity-count">
            <strong>{people.length} / {gymCapacity}</strong>
            <span>people detected</span>
          </div>

          <label className="crowd-capacity-editor" htmlFor="gym-capacity">
            <span>Gym capacity</span>
            <input
              id="gym-capacity"
              min="1"
              onChange={(event) => updateGymCapacity(event.target.value)}
              type="number"
              value={gymCapacity}
            />
          </label>

          <div className="crowd-capacity-meter" aria-label={`${capacityPercent}% capacity`}>
            <span style={{ width: `${capacityPercent}%` }}></span>
          </div>
          <b className="crowd-capacity-label">{capacityPercent}% capacity</b>

          <div className="crowd-range-list">
            <div>
              <span className="green"></span>
              <strong>Normal</strong>
              <label>
                0-
                <input
                  aria-label="Normal range maximum"
                  max={ranges.moderateMax - 1}
                  min="0"
                  onChange={(event) => updateRange("normalMax", event.target.value)}
                  type="number"
                  value={ranges.normalMax}
                />
              </label>
            </div>
            <div>
              <span className="yellow"></span>
              <strong>Moderate</strong>
              <label>
                {moderateMin}-
                <input
                  aria-label="Moderate range maximum"
                  max={gymCapacity - 1}
                  min={moderateMin}
                  onChange={(event) => updateRange("moderateMax", event.target.value)}
                  type="number"
                  value={ranges.moderateMax}
                />
              </label>
            </div>
            <div>
              <span className="red"></span>
              <strong>Crowded</strong>
              <small>{crowdedMin}+</small>
            </div>
          </div>
        </aside>
      </div>

      <div className="crowd-summary-grid">
        <article className="admin-card crowd-summary-card">
          <strong className="yellow">{people.length}</strong>
          <h3>Detected People</h3>
        </article>

        <article className="admin-card crowd-summary-card">
          <strong className="green">{people.length ? formatPercent(averageConfidence) : "0%"}</strong>
          <h3>Model Accuracy</h3>
        </article>

        <article className="admin-card crowd-summary-card">
          <strong className={cameraStatus.tone}>{cameraStatus.label}</strong>
          <h3>Camera Status</h3>
          <p>{cameraStatus.note}</p>
        </article>

        <article className="admin-card crowd-summary-card">
          <strong className={crowdStatus.tone}>{crowdStatus.label}</strong>
          <h3>Alert Level</h3>
          <p>{crowdStatus.note}</p>
        </article>
      </div>

      <article className="admin-card crowd-settings-card">
        <label htmlFor="confidence-threshold">
          <span>Confidence threshold</span>
          <strong>{formatPercent(confidence)}</strong>
        </label>
        <input
          id="confidence-threshold"
          max="0.9"
          min="0.25"
          onChange={(event) => setConfidence(Number(event.target.value))}
          step={CONFIDENCE_STEP}
          type="range"
          value={confidence}
        />
      </article>
    </section>
  );
}

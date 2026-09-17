import { useCallback, useEffect, useRef, useState } from 'react';
import { updateCrowdStatus } from '../../../../shared/api';

const CONFIDENCE_STEP = 0.05;
const INITIAL_CONFIDENCE = 0.45;
const DETECTION_INTERVAL_MS = 700;
const STATUS_PUBLISH_INTERVAL_MS = 1800;
const MAX_TEST_IMAGE_BYTES = 20 * 1024 * 1024;
const PERSON_CLASS = 'person';
const INITIAL_GYM_CAPACITY = 70;
const INITIAL_RANGES = {
  normalMax: 35,
  moderateMax: 55
};
const YOLO_INPUT_SIZE = 640;
const YOLO_PERSON_CLASS_INDEX = 0;
const YOLO_NMS_THRESHOLD = 0.45;
const YOLO_MAX_DETECTIONS = 120;
const YOLO11_MODEL_URL =
  import.meta.env.VITE_YOLO11_MODEL_URL || '/models/yolo11n.onnx';
const ONNX_RUNTIME_SCRIPT_ID = 'onnx-runtime-web-script';
const TENSORFLOW_SCRIPT_ID = 'tensorflow-js-script';
const COCO_SSD_SCRIPT_ID = 'coco-ssd-script';
const ONNX_RUNTIME_SCRIPT_SRC =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js';
const TENSORFLOW_SCRIPT_SRC =
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
const COCO_SSD_SCRIPT_SRC =
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
const toneTextClasses = {
  green: 'text-[#39e600]',
  red: 'text-[#d90429]',
  yellow: 'text-[#ffd54f]'
};
const toneDotClasses = {
  green: 'bg-[#39e600]',
  red: 'bg-[#d90429]',
  yellow: 'bg-[#ffd54f]'
};
const monitorCardClass =
  'admin-card flex min-h-0 flex-col overflow-hidden rounded-[26px] border-[#424242] bg-[#252525] p-0';
const sourceButtonClass =
  'flex h-[30px] min-w-24 cursor-pointer items-center justify-center rounded-full border border-[#3e3e3e] bg-[#1a1a1a] px-[13px] text-[11px] font-black text-white hover:border-[#d90429] disabled:cursor-not-allowed disabled:opacity-55';
const rangeInputClass =
  'h-8 w-10 border-x border-[#353535] bg-transparent p-0 text-center text-[11px] font-extrabold text-white outline-none';
const rangeStepperButtonClass =
  'grid h-8 w-8 cursor-pointer place-items-center border-0 bg-transparent p-0 text-sm font-black leading-none text-[#b8b8b8] hover:text-white';
const stepperShellClass =
  'ml-1 inline-flex overflow-hidden rounded-lg border border-[#424242] bg-[#1a1a1a]';
const summaryCardClass =
  'admin-card flex min-h-[108px] flex-col justify-center rounded-[20px] border-[#424242] bg-[#252525] px-[18px] py-4';

const hiddenCameraPageStyle = {
  height: 1,
  inset: 0,
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  position: 'fixed',
  width: 1,
  zIndex: -1
};

function isLocalCameraOrigin() {
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

function canRequestCameraPermission() {
  return window.isSecureContext || isLocalCameraOrigin();
}

function loadScript({ id, src }) {
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(id);

    if (existingScript?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function getSourceSize(source) {
  return {
    height: source.videoHeight || source.naturalHeight || source.clientHeight,
    width: source.videoWidth || source.naturalWidth || source.clientWidth
  };
}

function getIntersectionOverUnion(leftBox, rightBox) {
  const [leftX, leftY, leftWidth, leftHeight] = leftBox;
  const [rightX, rightY, rightWidth, rightHeight] = rightBox;
  const x1 = Math.max(leftX, rightX);
  const y1 = Math.max(leftY, rightY);
  const x2 = Math.min(leftX + leftWidth, rightX + rightWidth);
  const y2 = Math.min(leftY + leftHeight, rightY + rightHeight);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const leftArea = leftWidth * leftHeight;
  const rightArea = rightWidth * rightHeight;
  const union = leftArea + rightArea - intersection;

  return union ? intersection / union : 0;
}

function applyNonMaxSuppression(predictions) {
  const sortedPredictions = [...predictions].sort(
    (left, right) => right.score - left.score
  );
  const selectedPredictions = [];

  sortedPredictions.forEach((prediction) => {
    const overlapsExistingPrediction = selectedPredictions.some(
      (selectedPrediction) =>
        getIntersectionOverUnion(prediction.bbox, selectedPrediction.bbox) >
        YOLO_NMS_THRESHOLD
    );

    if (
      !overlapsExistingPrediction &&
      selectedPredictions.length < YOLO_MAX_DETECTIONS
    ) {
      selectedPredictions.push(prediction);
    }
  });

  return selectedPredictions;
}

function makeYoloInputTensor(source) {
  const { height, width } = getSourceSize(source);
  const scale = Math.min(YOLO_INPUT_SIZE / width, YOLO_INPUT_SIZE / height);
  const resizedWidth = Math.round(width * scale);
  const resizedHeight = Math.round(height * scale);
  const padX = Math.floor((YOLO_INPUT_SIZE - resizedWidth) / 2);
  const padY = Math.floor((YOLO_INPUT_SIZE - resizedHeight) / 2);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = YOLO_INPUT_SIZE;
  canvas.height = YOLO_INPUT_SIZE;
  context.fillStyle = '#727272';
  context.fillRect(0, 0, YOLO_INPUT_SIZE, YOLO_INPUT_SIZE);
  context.drawImage(source, padX, padY, resizedWidth, resizedHeight);

  const imageData = context.getImageData(
    0,
    0,
    YOLO_INPUT_SIZE,
    YOLO_INPUT_SIZE
  );
  const input = new Float32Array(3 * YOLO_INPUT_SIZE * YOLO_INPUT_SIZE);
  const channelSize = YOLO_INPUT_SIZE * YOLO_INPUT_SIZE;

  for (let index = 0; index < channelSize; index += 1) {
    input[index] = imageData.data[index * 4] / 255;
    input[index + channelSize] = imageData.data[index * 4 + 1] / 255;
    input[index + channelSize * 2] = imageData.data[index * 4 + 2] / 255;
  }

  return {
    meta: {
      height,
      padX,
      padY,
      scale,
      width
    },
    tensor: new window.ort.Tensor('float32', input, [
      1,
      3,
      YOLO_INPUT_SIZE,
      YOLO_INPUT_SIZE
    ])
  };
}

function getYoloValue(data, dimensions, boxIndex, valueIndex) {
  const [, firstDimension, secondDimension] = dimensions;

  if (firstDimension < secondDimension) {
    return data[valueIndex * secondDimension + boxIndex];
  }

  return data[boxIndex * secondDimension + valueIndex];
}

function parseYoloOutput(output, meta, confidence) {
  const dimensions =
    output.dims.length === 3
      ? output.dims
      : [1, output.dims[0], output.dims[1]];
  const [, firstDimension, secondDimension] = dimensions;
  const valueCount = Math.min(firstDimension, secondDimension);
  const boxCount = Math.max(firstDimension, secondDimension);
  const usesObjectness = valueCount > 84;
  const predictions = [];

  for (let boxIndex = 0; boxIndex < boxCount; boxIndex += 1) {
    const objectness = usesObjectness
      ? getYoloValue(output.data, dimensions, boxIndex, 4)
      : 1;
    const classOffset = usesObjectness ? 5 : 4;
    const classScore = getYoloValue(
      output.data,
      dimensions,
      boxIndex,
      classOffset + YOLO_PERSON_CLASS_INDEX
    );
    const score = objectness * classScore;

    if (score < confidence) {
      continue;
    }

    let centerX = getYoloValue(output.data, dimensions, boxIndex, 0);
    let centerY = getYoloValue(output.data, dimensions, boxIndex, 1);
    let boxWidth = getYoloValue(output.data, dimensions, boxIndex, 2);
    let boxHeight = getYoloValue(output.data, dimensions, boxIndex, 3);

    if (Math.max(centerX, centerY, boxWidth, boxHeight) <= 2) {
      centerX *= YOLO_INPUT_SIZE;
      centerY *= YOLO_INPUT_SIZE;
      boxWidth *= YOLO_INPUT_SIZE;
      boxHeight *= YOLO_INPUT_SIZE;
    }

    const x = Math.max(0, (centerX - boxWidth / 2 - meta.padX) / meta.scale);
    const y = Math.max(0, (centerY - boxHeight / 2 - meta.padY) / meta.scale);
    const width = Math.min(meta.width - x, boxWidth / meta.scale);
    const height = Math.min(meta.height - y, boxHeight / meta.scale);

    if (width > 1 && height > 1) {
      predictions.push({
        bbox: [x, y, width, height],
        class: PERSON_CLASS,
        score
      });
    }
  }

  return applyNonMaxSuppression(predictions);
}

async function loadYolo11Model() {
  await loadScript({
    id: ONNX_RUNTIME_SCRIPT_ID,
    src: ONNX_RUNTIME_SCRIPT_SRC
  });

  if (!window.ort?.InferenceSession) {
    throw new Error('ONNX Runtime Web is unavailable.');
  }

  window.ort.env.wasm.wasmPaths =
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';

  const session = await window.ort.InferenceSession.create(YOLO11_MODEL_URL, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all'
  });
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];

  return {
    modelName: 'YOLO11',
    async detect(source, confidence) {
      const { meta, tensor } = makeYoloInputTensor(source);
      const results = await session.run({ [inputName]: tensor });

      return parseYoloOutput(results[outputName], meta, confidence);
    }
  };
}

async function loadCocoSsdFallbackModel() {
  await loadScript({ id: TENSORFLOW_SCRIPT_ID, src: TENSORFLOW_SCRIPT_SRC });
  await loadScript({ id: COCO_SSD_SCRIPT_ID, src: COCO_SSD_SCRIPT_SRC });

  if (!window.cocoSsd?.load) {
    throw new Error('COCO-SSD model loader is unavailable.');
  }

  const model = await window.cocoSsd.load();

  return {
    modelName: 'COCO-SSD fallback',
    detect(source) {
      return model.detect(source);
    }
  };
}

async function loadCrowdDetectionModel() {
  try {
    return await loadYolo11Model();
  } catch (error) {
    console.warn(
      'YOLO11 model could not be loaded. Falling back to COCO-SSD.',
      error
    );
    return loadCocoSsdFallbackModel();
  }
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function getCrowdStatus(count, ranges) {
  if (count > ranges.moderateMax) {
    return { label: 'Crowded', tone: 'red' };
  }

  if (count > ranges.normalMax) {
    return { label: 'Moderate', tone: 'yellow' };
  }

  return { label: 'Normal', tone: 'green' };
}

function getCameraStatus({ modelStatus, sourceStatus }) {
  if (modelStatus === 'error' || sourceStatus === 'error') {
    return { label: 'Offline', tone: 'red' };
  }

  if (
    modelStatus === 'loading' ||
    sourceStatus === 'loading' ||
    sourceStatus === 'idle'
  ) {
    return { label: 'Starting', tone: 'yellow' };
  }

  return { label: 'Online', tone: 'green' };
}

function drawPredictions(canvas, source, people) {
  const width = source.videoWidth || source.naturalWidth || source.clientWidth;
  const height =
    source.videoHeight || source.naturalHeight || source.clientHeight;
  const context = canvas.getContext('2d');

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

    context.strokeStyle = '#39e600';
    context.fillStyle = 'rgba(57, 230, 0, 0.18)';
    context.strokeRect(x, y, boxWidth, boxHeight);
    context.fillRect(x, y, boxWidth, boxHeight);

    context.fillStyle = '#39e600';
    context.fillRect(x, labelY, labelWidth, 24);
    context.fillStyle = '#081008';
    context.fillText(label, x + 8, labelY + 17);
  });
}

export default function CrowdDetectionPage({ isVisible = true }) {
  const modelRef = useRef(null);
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const imageUrlRef = useRef('');
  const imageSessionRef = useRef(0);
  const sourceModeRef = useRef('camera');
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const lastDetectionRef = useRef(0);
  const crowdStatusPayloadRef = useRef(null);
  const cameraSessionRef = useRef(0);
  const isMountedRef = useRef(false);

  const [confidence, setConfidence] = useState(INITIAL_CONFIDENCE);
  const [detections, setDetections] = useState([]);
  const [gymCapacity, setGymCapacity] = useState(INITIAL_GYM_CAPACITY);
  const [ranges, setRanges] = useState(INITIAL_RANGES);
  const [modelStatus, setModelStatus] = useState('loading');
  const [modelName, setModelName] = useState('YOLO11');
  const [sourceStatus, setSourceStatus] = useState('idle');
  const [sourceMode, setSourceMode] = useState('camera');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [actualCount, setActualCount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const people = detections.filter(
    (prediction) =>
      prediction.class === PERSON_CLASS && prediction.score >= confidence
  );
  const crowdStatus = getCrowdStatus(people.length, ranges);
  const cameraStatus = getCameraStatus({ modelStatus, sourceStatus });
  const capacityPercent = Math.min(
    100,
    Math.round((people.length / gymCapacity) * 100)
  );
  const averageConfidence = people.length
    ? people.reduce((total, person) => total + person.score, 0) / people.length
    : 0;
  const moderateMin = ranges.normalMax + 1;
  const crowdedMin = ranges.moderateMax + 1;
  const hasActualCount = actualCount !== '' && Number.isFinite(Number(actualCount));
  const countDifference = hasActualCount
    ? Math.abs(people.length - Number(actualCount))
    : null;
  crowdStatusPayloadRef.current = {
    active:
      sourceMode === 'camera' &&
      modelStatus === 'ready' &&
      sourceStatus === 'ready',
    peopleCount: sourceMode === 'camera' ? people.length : 0,
    capacity: gymCapacity,
    normalMax: ranges.normalMax,
    moderateMax: ranges.moderateMax
  };

  useEffect(() => {
    const publishStatus = () => {
      updateCrowdStatus(crowdStatusPayloadRef.current).catch((error) => {
        console.warn('Live crowd status could not be published.', error);
      });
    };

    publishStatus();
    const intervalId = window.setInterval(
      publishStatus,
      STATUS_PUBLISH_INTERVAL_MS
    );

    return () => window.clearInterval(intervalId);
  }, []);

  const updateRange = (key, value) => {
    const nextValue = Math.max(
      0,
      Math.min(gymCapacity - 1, Number(value) || 0)
    );

    setRanges((currentRanges) => {
      if (key === 'normalMax') {
        return {
          normalMax: Math.min(nextValue, currentRanges.moderateMax - 1),
          moderateMax: currentRanges.moderateMax
        };
      }

      return {
        normalMax: currentRanges.normalMax,
        moderateMax: Math.max(nextValue, currentRanges.normalMax + 1)
      };
    });
  };

  const stepRange = (key, direction) => {
    updateRange(key, ranges[key] + direction);
  };

  const stepGymCapacity = (direction) => {
    updateGymCapacity(gymCapacity + direction);
  };

  const updateGymCapacity = (value) => {
    const nextCapacity = Math.max(1, Number(value) || 1);

    setGymCapacity(nextCapacity);
    setRanges((currentRanges) => {
      const normalMax = Math.min(
        currentRanges.normalMax,
        Math.max(0, nextCapacity - 2)
      );
      const moderateMax = Math.min(
        Math.max(currentRanges.moderateMax, normalMax + 1),
        Math.max(1, nextCapacity - 1)
      );

      return { normalMax, moderateMax };
    });
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

  const clearImage = useCallback(() => {
    imageSessionRef.current += 1;
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = '';
    }
    setImageUrl('');
    setImageName('');
    setImageLoaded(false);
    setActualCount('');
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const runDetection = useCallback(
    async (source, mode = 'camera', imageSession = 0) => {
      if (!isMountedRef.current || !modelRef.current || !source) {
        return;
      }

      try {
        const predictions = await modelRef.current.detect(source, confidence);
        const nextPeople = predictions.filter(
          (prediction) =>
            prediction.class === PERSON_CLASS && prediction.score >= confidence
        );

        if (
          !isMountedRef.current ||
          sourceModeRef.current !== mode ||
          (mode === 'image' && imageSessionRef.current !== imageSession)
        ) {
          return;
        }

        setDetections(predictions);
        drawPredictions(canvasRef.current, source, nextPeople);
        setSourceStatus('ready');
      } catch (error) {
        if (
          !isMountedRef.current ||
          sourceModeRef.current !== mode ||
          (mode === 'image' && imageSessionRef.current !== imageSession)
        ) {
          return;
        }

        console.error(error);
        setErrorMessage(
          'Detection failed. Try another image or restart the camera.'
        );
        setSourceStatus('error');
      }
    },
    [confidence]
  );

  const detectVideoFrame = useCallback(
    (timestamp = 0) => {
      const video = videoRef.current;

      if (!isMountedRef.current) {
        return;
      }

      if (
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        !modelRef.current
      ) {
        animationRef.current = requestAnimationFrame(detectVideoFrame);
        return;
      }

      if (timestamp - lastDetectionRef.current >= DETECTION_INTERVAL_MS) {
        lastDetectionRef.current = timestamp;
        runDetection(video);
      }

      animationRef.current = requestAnimationFrame(detectVideoFrame);
    },
    [runDetection]
  );

  const startCamera = useCallback(async () => {
    sourceModeRef.current = 'camera';
    setSourceMode('camera');
    clearImage();
    if (!canRequestCameraPermission()) {
      setErrorMessage(
        `Camera permission only appears on HTTPS or localhost. Open http://localhost:${window.location.port || '5173'}/admin/crowd-detection on this Mac, or serve the network URL with HTTPS.`
      );
      setSourceStatus('error');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Camera access is not available in this browser.');
      setSourceStatus('error');
      return;
    }

    stopCamera();
    clearCanvas();
    setDetections([]);
    setErrorMessage('');
    setSourceStatus('loading');

    try {
      const cameraSession = cameraSessionRef.current + 1;
      cameraSessionRef.current = cameraSession;
      let stream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (cameraError) {
        console.warn(
          'Preferred camera constraints failed. Retrying default camera.',
          cameraError
        );
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true
        });
      }

      if (!isMountedRef.current || cameraSessionRef.current !== cameraSession) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        if (
          !isMountedRef.current ||
          cameraSessionRef.current !== cameraSession
        ) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        lastDetectionRef.current = 0;
        setSourceStatus('ready');
        animationRef.current = requestAnimationFrame(detectVideoFrame);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error?.name === 'NotAllowedError'
          ? 'Camera permission was blocked. Allow camera access in the browser and try again.'
          : 'No usable camera was found. Connect a camera and try again.'
      );
      setSourceStatus('error');
    }
  }, [clearCanvas, clearImage, detectVideoFrame, stopCamera]);

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file.');
      return;
    }
    if (file.size > MAX_TEST_IMAGE_BYTES) {
      setErrorMessage('Please select an image smaller than 20 MB.');
      return;
    }

    sourceModeRef.current = 'image';
    crowdStatusPayloadRef.current = {
      ...crowdStatusPayloadRef.current,
      active: false,
      peopleCount: 0
    };
    stopCamera();
    clearImage();
    clearCanvas();
    setDetections([]);
    setSourceMode('image');
    setSourceStatus('loading');
    setErrorMessage('');
    const url = URL.createObjectURL(file);
    imageUrlRef.current = url;
    setImageUrl(url);
    setImageName(file.name);
  };

  useEffect(() => {
    if (sourceMode !== 'image' || !imageLoaded || modelStatus !== 'ready') return;
    const image = imageRef.current;
    if (!image) return;
    setSourceStatus('loading');
    runDetection(image, 'image', imageSessionRef.current);
  }, [confidence, imageLoaded, imageUrl, modelStatus, runDetection, sourceMode]);

  useEffect(() => {
    isMountedRef.current = true;

    let isCurrent = true;

    async function loadModel() {
      try {
        const model = await loadCrowdDetectionModel();

        if (isCurrent) {
          modelRef.current = model;
          setModelName(model.modelName);
          setModelStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isCurrent) {
          setModelStatus('error');
          setErrorMessage(
            'The YOLO11 crowd detection model could not be loaded.'
          );
        }
      }
    }

    loadModel();

    return () => {
      isCurrent = false;
      isMountedRef.current = false;
      stopCamera();
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    };
  }, [stopCamera]);

  useEffect(() => {
    if (sourceMode === 'camera' && sourceStatus === 'idle') {
      startCamera();
    }
  }, [sourceMode, sourceStatus, startCamera]);

  useEffect(() => {
    const source = sourceMode === 'image' ? imageRef.current : videoRef.current;
    const visiblePeople = detections.filter(
      (prediction) =>
        prediction.class === PERSON_CLASS && prediction.score >= confidence
    );

    if (source && (sourceMode === 'camera' || imageLoaded)) {
      drawPredictions(canvasRef.current, source, visiblePeople);
    }
  }, [confidence, detections, imageLoaded, sourceMode]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  const goToOverview = () => {
    window.history.pushState(null, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section
      className='admin-content min-h-[calc(100vh_-_64px)] overflow-visible pt-5 min-[1360px]:h-[calc(100svh-64px)] min-[1360px]:min-h-0 min-[1360px]:overflow-hidden max-[1360px]:h-auto'
      id='crowd-detection'
      style={isVisible ? undefined : hiddenCameraPageStyle}
    >
      <header className='admin-header mb-4 flex-none items-start lg:mb-4 max-[760px]:items-stretch max-[760px]:flex-col'>
        <div>
          <h2 className='mb-2 text-[clamp(34px,3.4vw,40px)] tracking-normal'>
            Crowd Detection System
          </h2>
          <p className='max-w-[760px] text-base text-[#a9a9a9]'>
            Detect people from the live camera or a test image. Uploaded images
            do not update the member dashboard.
          </p>
        </div>

        <button
          className='min-h-[46px] min-w-[184px] flex-none cursor-pointer rounded-[14px] border border-[#3b3b3b] bg-[#292929] px-[22px] text-[13px] font-black text-white max-[760px]:w-full'
          onClick={goToOverview}
          type='button'
        >
          Back to Overview
        </button>
      </header>

      <div className='grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_310px] gap-4 max-[1359px]:grid-cols-1'>
        <section className={monitorCardClass}>
          <div className='flex min-h-[52px] flex-none items-center justify-between rounded-[25px] bg-[#151515] px-[25px]'>
            <h3 className='m-0 text-base leading-none text-white'>
              {sourceMode === 'image' ? 'AI Model Image Preview' : 'AI Model Video Preview'}
            </h3>
            <span className='inline-flex h-7 min-w-[86px] items-center justify-center rounded-full bg-[#d90429] text-[11px] font-black text-white'>
              {sourceMode === 'image' ? 'TEST IMAGE' : 'LIVE'}
            </span>
          </div>

          <div
            className='relative mt-3 aspect-video min-h-0 w-full flex-none overflow-hidden border-y border-[#444] bg-[#2c2c2c] min-[1360px]:aspect-auto min-[1360px]:flex-1 after:absolute after:inset-x-0 after:bottom-0 after:z-0 after:h-[29%] after:rounded-t-2xl after:bg-[#111] max-[760px]:min-h-80'
            style={{
              backgroundImage:
                'linear-gradient(rgba(57, 230, 0, 0.38) 1px, transparent 1px)',
              backgroundPosition: '0 28px',
              backgroundSize: '100% 82px'
            }}
          >
            <video
              aria-label='Live gym camera preview'
              className={`absolute inset-0 z-[1] h-full w-full object-cover ${sourceMode === 'image' ? 'hidden' : ''}`}
              muted
              playsInline
              ref={videoRef}
            ></video>

            {sourceMode === 'image' && imageUrl && (
              <img
                alt={`Uploaded image: ${imageName}`}
                className='absolute inset-0 z-[1] h-full w-full object-contain'
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (image.naturalWidth && image.naturalHeight) {
                    setImageLoaded(true);
                  }
                }}
                onError={() => {
                  setErrorMessage('The image could not be opened. Try another file.');
                  setSourceStatus('error');
                }}
                ref={imageRef}
                src={imageUrl}
              />
            )}

            <canvas
              aria-hidden='true'
              className={`pointer-events-none absolute inset-0 z-[2] h-full w-full ${sourceMode === 'image' ? 'object-contain' : 'object-cover'}`}
              ref={canvasRef}
            ></canvas>

            {modelStatus !== 'error' &&
              ((modelStatus === 'loading' && sourceStatus !== 'ready') ||
                sourceStatus === 'loading') && (
              <div className='absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2.5 bg-[rgba(17,17,17,0.88)] p-7 text-center'>
                <strong className='text-[clamp(20px,2.2vw,30px)] leading-tight text-white'>
                  {modelStatus === 'loading'
                    ? `Loading ${modelName} detection model`
                    : sourceMode === 'image' ? 'Detecting people in image' : 'Preparing source'}
                </strong>
                <span className='max-w-[360px] text-sm leading-normal text-[#b8b8b8]'>
                  {modelStatus === 'loading'
                    ? 'YOLO11 ONNX is starting in the browser.'
                    : sourceMode === 'image'
                      ? 'Processing this image in your browser.'
                      : 'Waiting for a usable frame.'}
                </span>
              </div>
            )}

            {(sourceStatus === 'error' ||
              (modelStatus === 'error' && sourceStatus !== 'ready')) && (
              <div className='absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2.5 bg-[rgba(17,17,17,0.88)] p-7 text-center'>
                <strong className='text-[clamp(20px,2.2vw,30px)] leading-tight text-[#d90429]'>
                  Detection unavailable
                </strong>
                <span className='max-w-[360px] text-sm leading-normal text-[#b8b8b8]'>
                  {errorMessage}
                </span>
              </div>
            )}
          </div>

          <footer className='flex min-h-[42px] flex-none items-center justify-between gap-[18px] px-[23px] pb-[13px] pt-3 max-[760px]:items-stretch max-[760px]:flex-col'>
            <div
              className='flex flex-none gap-2 max-[760px]:flex-wrap'
              aria-label='Detection source controls'
            >
              <button
                className={`${sourceButtonClass} ${sourceMode === 'camera' ? 'border-[#d90429]' : ''} max-[760px]:flex-[1_1_140px]`}
                disabled={sourceMode === 'camera' && sourceStatus === 'loading'}
                onClick={startCamera}
                type='button'
              >
                Live camera
              </button>
              <input
                accept='image/*'
                className='sr-only'
                id='crowd-test-image'
                onChange={selectImage}
                type='file'
              />
              <label
                className={`${sourceButtonClass} ${sourceMode === 'image' ? 'border-[#d90429]' : ''} max-[760px]:flex-[1_1_140px]`}
                htmlFor='crowd-test-image'
              >
                Upload image
              </label>
            </div>
            {sourceMode === 'image' && (
              <span className='min-w-0 truncate text-xs text-[#b8b8b8]'>
                {imageName} · admin test only
              </span>
            )}
          </footer>
          {sourceMode === 'image' && (
            <div className='flex flex-wrap items-end gap-4 border-t border-[#424242] px-[23px] py-4'>
              <label className='grid gap-1 text-xs text-[#b8b8b8]' htmlFor='actual-person-count'>
                Actual people in image (optional)
                <input
                  className='h-9 w-48 rounded-lg border border-[#424242] bg-[#151515] px-3 text-sm text-white'
                  id='actual-person-count'
                  min='0'
                  onChange={(event) => setActualCount(event.target.value)}
                  placeholder='Manual count'
                  type='number'
                  value={actualCount}
                />
              </label>
              {hasActualCount && sourceStatus === 'ready' && (
                <span className='pb-2 text-sm font-bold text-white'>
                  {countDifference === 0 ? 'Exact count match' : `Count differs by ${countDifference}`}
                </span>
              )}
              <p className='m-0 text-xs text-[#b8b8b8]'>Confidence is not overall model accuracy.</p>
            </div>
          )}
        </section>

        <aside className='admin-card mx-auto grid h-fit min-h-0 w-full max-w-[310px] content-start gap-3 rounded-[22px] border-[#424242] bg-[#252525] p-4 max-[1359px]:max-w-none max-[1359px]:grid-cols-3 max-[900px]:grid-cols-1'>
          <div className='flex min-w-0 flex-wrap items-center justify-between gap-2 max-[1359px]:col-span-full'>
            <h3 className='m-0 whitespace-nowrap text-lg leading-none'>
              {sourceMode === 'image' ? 'Image Status' : 'Live Status'}
            </h3>
            <span
              className={`inline-flex min-h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-current px-2.5 text-[11px] font-black uppercase ${toneTextClasses[crowdStatus.tone]}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${toneDotClasses[crowdStatus.tone]}`}
              ></span>
              {crowdStatus.label}
            </span>
          </div>

          <div className='grid min-h-[118px] place-items-center rounded-[18px] border border-[#373737] bg-[#202020] p-4 text-center'>
            <strong className='block whitespace-nowrap text-[42px] leading-none text-[#e6002e]'>
              {people.length}
              <span className='text-[26px] text-[#8f8f8f]'>/{gymCapacity}</span>
            </strong>
            <span className='mt-2 block text-xs font-bold text-[#b8b8b8]'>
              people detected
            </span>
          </div>

          <div className='rounded-[18px] border border-[#373737] bg-[#202020] p-4'>
            <label className='mb-3 flex items-center justify-between gap-3'>
              <span className='text-[11px] font-black uppercase text-[#b8b8b8]'>
                Gym capacity
              </span>
              <span className={stepperShellClass}>
                <button
                  aria-label='Decrease gym capacity'
                  className={rangeStepperButtonClass}
                  onClick={() => stepGymCapacity(-1)}
                  type='button'
                >
                  -
                </button>
                <input
                  aria-label='Gym capacity'
                  className={rangeInputClass}
                  min='1'
                  onChange={(event) => updateGymCapacity(event.target.value)}
                  type='text'
                  value={gymCapacity}
                />
                <button
                  aria-label='Increase gym capacity'
                  className={rangeStepperButtonClass}
                  onClick={() => stepGymCapacity(1)}
                  type='button'
                >
                  +
                </button>
              </span>
            </label>

            <div
              className='h-2.5 w-full overflow-hidden rounded-full bg-[#303030]'
              aria-label={`${capacityPercent}% capacity`}
            >
              <span
                className='block h-full rounded-[inherit] bg-[#ffd54f]'
                style={{ width: `${capacityPercent}%` }}
              ></span>
            </div>
            <b className='mt-3 block text-center text-sm text-[#ffd54f]'>
              {capacityPercent}% capacity
            </b>
          </div>

          <div className='grid gap-2 rounded-[18px] border border-[#373737] bg-[#202020] p-4'>
            <h4 className='mb-1 mt-0 text-xs font-black uppercase text-[#b8b8b8]'>
              Alert ranges
            </h4>
            <div className='grid grid-cols-[10px_minmax(64px,1fr)_92px] items-center gap-[9px]'>
              <span className='h-2.5 w-2.5 rounded-full bg-[#39e600]'></span>
              <strong className='text-[11px] text-white'>Normal</strong>
              <label className='flex items-center justify-end whitespace-nowrap text-[11px] text-[#b8b8b8]'>
                0-
                <span className={stepperShellClass}>
                  <button
                    aria-label='Decrease normal range maximum'
                    className={rangeStepperButtonClass}
                    onClick={() => stepRange('normalMax', -1)}
                    type='button'
                  >
                    -
                  </button>
                  <input
                    aria-label='Normal range maximum'
                    className={rangeInputClass}
                    max={ranges.moderateMax - 1}
                    min='0'
                    onChange={(event) =>
                      updateRange('normalMax', event.target.value)
                    }
                    type='text'
                    value={ranges.normalMax}
                  />
                  <button
                    aria-label='Increase normal range maximum'
                    className={rangeStepperButtonClass}
                    onClick={() => stepRange('normalMax', 1)}
                    type='button'
                  >
                    +
                  </button>
                </span>
              </label>
            </div>
            <div className='grid grid-cols-[10px_minmax(64px,1fr)_92px] items-center gap-[9px]'>
              <span className='h-2.5 w-2.5 rounded-full bg-[#ffd54f]'></span>
              <strong className='text-[11px] text-white'>Moderate</strong>
              <label className='flex items-center justify-end whitespace-nowrap text-[11px] text-[#b8b8b8]'>
                {moderateMin}-
                <span className={stepperShellClass}>
                  <button
                    aria-label='Decrease moderate range maximum'
                    className={rangeStepperButtonClass}
                    onClick={() => stepRange('moderateMax', -1)}
                    type='button'
                  >
                    -
                  </button>
                  <input
                    aria-label='Moderate range maximum'
                    className={rangeInputClass}
                    max={gymCapacity - 1}
                    min={moderateMin}
                    onChange={(event) =>
                      updateRange('moderateMax', event.target.value)
                    }
                    type='text'
                    value={ranges.moderateMax}
                  />
                  <button
                    aria-label='Increase moderate range maximum'
                    className={rangeStepperButtonClass}
                    onClick={() => stepRange('moderateMax', 1)}
                    type='button'
                  >
                    +
                  </button>
                </span>
              </label>
            </div>
            <div className='grid grid-cols-[10px_minmax(64px,1fr)_92px] items-center gap-[9px]'>
              <span className='h-2.5 w-2.5 rounded-full bg-[#d90429]'></span>
              <strong className='text-[11px] text-white'>Crowded</strong>
              <small className='text-right text-[11px] text-[#b8b8b8]'>
                {crowdedMin}+
              </small>
            </div>
          </div>
        </aside>
      </div>

      <div className='mt-4 grid flex-none grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[760px]:grid-cols-1'>
        <article className={summaryCardClass}>
          <strong className='pb-1 text-[clamp(27px,2.7vw,32px)] leading-none text-[#e6002e]'>
            {people.length}
          </strong>
          <h3 className='mb-0 mt-2 text-sm leading-tight text-white'>
            Detected People
          </h3>
        </article>

        <article className={summaryCardClass}>
          <strong className='pb-1 text-[clamp(27px,2.7vw,32px)] leading-none text-[#e6002e]'>
            {people.length ? formatPercent(averageConfidence) : '0%'}
          </strong>
          <h3 className='mb-0 mt-2 text-sm leading-tight text-white'>
            {modelName}
          </h3>
        </article>

        <article className={summaryCardClass}>
          <strong
            className={`pb-1 text-[clamp(27px,2.7vw,32px)] leading-none ${toneTextClasses[cameraStatus.tone]}`}
          >
            {sourceMode === 'image'
              ? sourceStatus === 'ready' ? 'Analyzed' : cameraStatus.label
              : cameraStatus.label}
          </strong>
          <h3 className='mb-0 mt-2 text-sm leading-tight text-white'>
            {sourceMode === 'image' ? 'Image Status' : 'Camera Status'}
          </h3>
          <p className='m-0 text-xs leading-snug text-[#a7a7a7]'>
            {cameraStatus.note}
          </p>
        </article>

        <article className={summaryCardClass}>
          <strong
            className={`pb-1 text-[clamp(27px,2.7vw,32px)] leading-none ${toneTextClasses[crowdStatus.tone]}`}
          >
            {crowdStatus.label}
          </strong>
          <h3 className='mb-0 mt-2 text-sm leading-tight text-white'>
            Alert Level
          </h3>
          <p className='m-0 text-xs leading-snug text-[#a7a7a7]'>
            {crowdStatus.note}
          </p>
        </article>
      </div>

      <article className='admin-card hidden'>
        <label htmlFor='confidence-threshold'>
          <span>Confidence threshold</span>
          <strong>{formatPercent(confidence)}</strong>
        </label>
        <input
          id='confidence-threshold'
          max='0.9'
          min='0.25'
          onChange={(event) => setConfidence(Number(event.target.value))}
          step={CONFIDENCE_STEP}
          type='range'
          value={confidence}
        />
      </article>
    </section>
  );
}

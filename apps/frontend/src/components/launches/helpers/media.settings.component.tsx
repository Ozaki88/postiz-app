'use client';

import { EventEmitter } from 'events';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { MediaBox } from '@gitroom/frontend/components/media/media.component';
const postUrlEmitter = new EventEmitter();

export const MediaSettingsLayout = () => {
  const [showPostSelector, setShowPostSelector] = useState(false);
  const [media, setMedia] = useState(undefined);
  const [callback, setCallback] = useState<{
    callback: (tag: {
      id: string;
      name: string;
      path: string;
      thumbnail: string;
      alt: string;
    }) => void;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  } | null>({
    callback: (params: {
      id: string;
      name: string;
      path: string;
      thumbnail: string;
      alt: string;
    }) => {},
  } as any);
  useEffect(() => {
    postUrlEmitter.on(
      'show',
      (params: {
        media: any;
        callback: (url: {
          id: string;
          name: string;
          path: string;
          thumbnail: string;
          alt: string;
        }) => void;
      }) => {
        setCallback(params);
        setMedia(params.media);
        setShowPostSelector(true);
      }
    );
    return () => {
      setShowPostSelector(false);
      setCallback(null);
      setMedia(undefined);
      postUrlEmitter.removeAllListeners();
    };
  }, []);
  const close = useCallback(() => {
    setShowPostSelector(false);
    setCallback(null);
    setMedia(undefined);
  }, []);
  if (!showPostSelector) {
    return <></>;
  }
  return (
    <MediaComponentInner
      media={media}
      onClose={close}
      onSelect={callback?.callback!}
    />
  );
};

export const useMediaSettings = () => {
  return useCallback((media: any) => {
    return new Promise((resolve) => {
      postUrlEmitter.emit('show', {
        media,
        callback: (value: any) => {
          resolve(value);
        },
      });
    });
  }, []);
};

// Edit cover (Instagram style): a big preview of the chosen frame, a filmstrip of the whole video to drag along, and
// "Add from camera roll" for a picture of your own. timestampMs is null for a camera-roll picture.
export const CreateThumbnail: FC<{
  onSelect: (blob: Blob, timestampMs: number | null) => void;
  media:
    | {
        id: string;
        name: string;
        path: string;
        thumbnail?: string;
        alt?: string;
        thumbnailTimestamp?: number;
      }
    | undefined;
  altText?: string;
  onAltTextChange?: (altText: string) => void;
}> = (props) => {
  const { onSelect, media } = props;
  const { backendUrl } = useVariables();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [frames, setFrames] = useState<string[]>([]);
  const dragging = useRef(false);
  const FRAME_COUNT = 8;
  const src = media
    ? backendUrl + '/public/stream?url=' + encodeURIComponent(media.path)
    : '';

  // The filmstrip: FRAME_COUNT small frames spread over the video, drawn from a second, hidden copy of it.
  const buildStrip = useCallback(
    async (d: number) => {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.muted = true;
      v.preload = 'auto';
      v.src = src;
      await new Promise<void>((ok) => {
        v.onloadeddata = () => ok();
        v.onerror = () => ok();
      });
      const c = document.createElement('canvas');
      const out: string[] = [];
      for (let i = 0; i < FRAME_COUNT; i++) {
        const t = (d * (i + 0.5)) / FRAME_COUNT;
        await new Promise<void>((ok) => {
          v.onseeked = () => ok();
          v.currentTime = t;
        });
        c.width = 90;
        c.height = Math.round((90 * (v.videoHeight || 16)) / (v.videoWidth || 9));
        try {
          c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
          out.push(c.toDataURL('image/jpeg', 0.6));
        } catch {
          out.push('');
        }
        setFrames([...out]);
      }
    },
    [src]
  );

  const handleLoadedMetadata = useCallback(() => {
    const d = videoRef?.current?.duration || 0;
    setDuration(d);
    setIsLoaded(true);
    const start = Math.min(d, (media?.thumbnailTimestamp || 0) / 1000);
    if (videoRef.current) videoRef.current.currentTime = start;
    setCurrentTime(start);
    buildStrip(d);
  }, [buildStrip, media?.thumbnailTimestamp]);

  // Dragging (mouse or finger) along the filmstrip picks the frame under the pointer.
  const seekTo = useCallback(
    (clientX: number) => {
      const box = stripRef.current?.getBoundingClientRect();
      if (!box || !duration) return;
      const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
      const t = ratio * duration;
      if (videoRef.current) videoRef.current.currentTime = t;
      setCurrentTime(t);
    },
    [duration]
  );

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setIsCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob: Blob | null) => {
          if (blob) onSelect(blob, Math.round(currentTime * 1000));
          setIsCapturing(false);
        },
        'image/jpeg',
        0.9
      );
    } catch (error) {
      console.error('Error capturing frame:', error);
      alert('Unable to capture this frame. Try another one, or add a picture from your camera roll.');
      setIsCapturing(false);
    }
  }, [onSelect, currentTime]);

  const fromCameraRoll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onSelect(file, null);
      e.target.value = '';
    },
    [onSelect]
  );

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (!media) return null;
  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-[16px] items-center w-full">
      <p className="text-sm text-textColor text-center opacity-80">
        Select a cover image from your video or camera roll.
      </p>
      <div className="relative bg-black rounded-[16px] overflow-hidden w-full max-w-[300px] aspect-[9/16] max-h-[55vh]">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          onLoadedMetadata={handleLoadedMetadata}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
        />
      </div>

      {isLoaded && (
        <div className="w-full flex flex-col gap-[6px]">
          <div
            ref={stripRef}
            className="relative w-full h-[72px] rounded-[10px] overflow-hidden bg-fifth touch-none select-none cursor-pointer"
            onPointerDown={(e) => {
              dragging.current = true;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              seekTo(e.clientX);
            }}
            onPointerMove={(e) => dragging.current && seekTo(e.clientX)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
          >
            <div className="absolute inset-0 flex">
              {Array.from({ length: FRAME_COUNT }).map((_, i) => (
                <div key={i} className="flex-1 h-full bg-black/40">
                  {frames[i] && (
                    <img src={frames[i]} alt="" className="w-full h-full object-cover opacity-60" draggable={false} />
                  )}
                </div>
              ))}
            </div>
            <div
              className="absolute top-0 h-full w-[48px] -translate-x-1/2 rounded-[8px] border-[3px] border-[#4f46e5] shadow-[0_0_0_2000px_rgba(0,0,0,0.25)] pointer-events-none"
              style={{ left: `clamp(24px, ${pct}%, calc(100% - 24px))` }}
            />
          </div>
          <div className="flex justify-between text-xs text-textColor opacity-70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col gap-[8px]">
        <button
          onClick={captureFrame}
          disabled={!isLoaded || isCapturing}
          className="w-full bg-forth text-white px-6 py-3 rounded-[12px] font-[600] hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCapturing ? 'Capturing...' : 'Use this frame'}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full bg-third text-textColor px-6 py-3 rounded-[12px] font-[600] border border-tableBorder hover:bg-opacity-80 transition-all"
        >
          Add from camera roll
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={fromCameraRoll} />
      </div>
    </div>
  );
};

export const MediaComponentInner: FC<{
  onClose: () => void;
  onSelect: (media: {
    id: string;
    name: string;
    path: string;
    thumbnail: string;
    alt: string;
  }) => void;
  media:
    | {
        id: string;
        name: string;
        path: string;
        thumbnail: string;
        alt: string;
        thumbnailTimestamp?: number;
      }
    | undefined;
}> = (props) => {
  const { onClose, onSelect, media } = props;
  const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);
  const newFetch = useFetch();
  const modals = useModals();
  const [newThumbnail, setNewThumbnail] = useState<string | null>(null);
  const [isEditingThumbnail, setIsEditingThumbnail] = useState(false);
  const [altText, setAltText] = useState<string>(media?.alt || '');
  const [loading, setLoading] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(
    props.media?.thumbnail || null
  );
  const [thumbnailTimestamp, setThumbnailTimestamp] = useState<number | null>(
    props.media?.thumbnailTimestamp || null
  );

  useEffect(() => {
    setActivateExitButton(false);
    return () => {
      setActivateExitButton(true);
    };
  }, []);

  const save = useCallback(async () => {
    setLoading(true);
    let path = thumbnail || '';
    if (newThumbnail) {
      const blob = await (await fetch(newThumbnail)).blob();
      const formData = new FormData();
      formData.append('file', blob, 'media.jpg');
      formData.append('preventSave', 'true');
      const data = await (
        await newFetch('/media/upload-simple', {
          method: 'POST',
          body: formData,
        })
      ).json();
      path = data.path;
    }

    const media = await (
      await newFetch('/media/information', {
        method: 'POST',
        body: JSON.stringify({
          id: props.media.id,
          alt: altText,
          thumbnail: path,
          thumbnailTimestamp: thumbnailTimestamp,
        }),
      })
    ).json();

    onSelect(media);
    onClose();
  }, [altText, newThumbnail, thumbnail, thumbnailTimestamp]);

  return (
    <div className="mt-[10px] flex flex-col gap-[20px]">
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-textColor font-medium">
          Alt Text (for accessibility)
        </label>
        <input
          type="text"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Describe the image/video content..."
          className="w-full px-3 py-2 bg-fifth border border-tableBorder rounded-lg text-textColor placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forth focus:border-transparent"
        />
      </div>
      {hasExtension(media?.path, 'mp4') && (
        <>
          {/* Alt Text Input */}
          <div>
            {!isEditingThumbnail ? (
              <div className="flex flex-col">
                <div className="flex flex-col space-y-2">
                  <span className="text-sm text-textColor">Thumbnail:</span>
                  {(newThumbnail || thumbnail) && (
                    <img
                      src={newThumbnail || thumbnail}
                      alt="Current thumbnail"
                      className="max-w-full max-h-[500px] object-contain rounded-lg border border-tableBorder"
                    />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-[8px] mt-[12px]">
                  <button
                    disabled={loading}
                    onClick={() => setIsEditingThumbnail(true)}
                    className="bg-third text-textColor px-6 py-2 rounded-lg hover:bg-opacity-80 transition-all flex-1 border border-tableBorder whitespace-nowrap"
                  >
                    Choose from video
                  </button>
                  <button
                    disabled={loading}
                    onClick={() =>
                      modals.openModal({
                        title: 'Media Library',
                        askClose: false,
                        closeOnEscape: true,
                        fullScreen: true,
                        size: 'calc(100% - 80px)',
                        height: 'calc(100% - 80px)',
                        children: (close) => (
                          <MediaBox
                            type="image-static"
                            closeModal={close}
                            setMedia={(m) => {
                              const [first] = m || [];
                              if (first) {
                                setNewThumbnail(null);
                                setThumbnail(first.path);
                                setThumbnailTimestamp(null);
                              }
                            }}
                          />
                        ),
                      })
                    }
                    className="bg-third text-textColor px-6 py-2 rounded-lg hover:bg-opacity-80 transition-all flex-1 border border-tableBorder whitespace-nowrap"
                  >
                    From Gallery
                  </button>
                  {(thumbnail || newThumbnail) && (
                    <button
                      disabled={loading}
                      onClick={() => {
                        setNewThumbnail(null);
                        setThumbnail(null);
                      }}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-opacity-80 transition-all flex-1 border border-red-700 whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Back button */}
                <div className="flex justify-start">
                  <button
                    onClick={() => setIsEditingThumbnail(false)}
                    className="text-textColor hover:text-white transition-colors flex items-center space-x-2"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19 12H5M12 19L5 12L12 5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Back</span>
                  </button>
                </div>

                {/* Thumbnail Editor */}
                <CreateThumbnail
                  onSelect={(blob: Blob, timestampMs: number | null) => {
                    // Convert blob to base64 or handle as needed
                    const reader = new FileReader();
                    reader.onload = () => {
                      // You can handle the result here - for now just call onSelect with the blob URL
                      const url = URL.createObjectURL(blob);
                      setNewThumbnail(url);
                      setThumbnailTimestamp(timestampMs);
                      setIsEditingThumbnail(false);
                    };
                    reader.readAsDataURL(blob);
                  }}
                  media={media}
                  altText={altText}
                  onAltTextChange={setAltText}
                />
              </div>
            )}
          </div>
        </>
      )}

      {!isEditingThumbnail && (
        <div className="flex space-x-2 !mt-[20px]">
          <button
            disabled={loading}
            onClick={onClose}
            className="flex-1 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-opacity-80 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="flex-1 bg-forth text-white px-6 py-2 rounded-lg hover:bg-opacity-80 transition-all"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

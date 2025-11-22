'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Video, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { getAuthToken } from '@/lib/auth';

interface CreativeUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onError?: (error: string) => void;
  token: string;
  className?: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const VALID_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export function CreativeUpload({ value, onChange, onError, token, className }: CreativeUploadProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const validateFile = (file: File): string | null => {
    const isImage = VALID_IMAGE_TYPES.includes(file.type);
    const isVideo = VALID_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return 'Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, MOV, WebM';
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = isImage ? '5MB' : '200MB';
      return `File too large. Maximum size: ${maxSizeMB}`;
    }

    return null;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setError(null);
    setFile(selectedFile);

    // Create preview
    if (VALID_IMAGE_TYPES.includes(selectedFile.type)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }, [onError]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    if (!token) {
      const errorMsg = 'Authentication required. Please connect your wallet.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await api.uploadCreative(file, token, (progress) => {
        setUploadProgress(progress);
      });

      onChange(result.url);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUrlChange = (url: string) => {
    setUrlInput(url);
    onChange(url);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          type="button"
          variant={mode === 'upload' ? 'glass-dark' : 'ghost'}
          size="sm"
          onClick={() => setMode('upload')}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload File
        </Button>
        <Button
          type="button"
          variant={mode === 'url' ? 'glass-dark' : 'ghost'}
          size="sm"
          onClick={() => setMode('url')}
          className="flex items-center gap-2"
        >
          <Link2 className="w-4 h-4" />
          Enter URL
        </Button>
      </div>

      {mode === 'upload' ? (
        <div className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`
              relative border-2 border-dashed rounded-2xl p-8 text-center
              transition-all duration-200
              ${error ? 'border-red-500/50 bg-red-500/5' : 'border-white/20 bg-black/10 hover:border-white/30 hover:bg-black/20'}
              ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={uploading}
            />

            {uploading ? (
              <div className="space-y-3">
                <Loader2 className="w-8 h-8 mx-auto text-white/60 animate-spin" />
                <p className="text-white/80">Uploading... {Math.round(uploadProgress)}%</p>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-white/30 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : preview ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  {VALID_IMAGE_TYPES.includes(file?.type || '') ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-48 max-w-full rounded-xl object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-48 h-48 bg-black/20 rounded-xl">
                      <Video className="w-12 h-12 text-white/60" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div>
                  <p className="text-white font-medium">{file?.name}</p>
                  <p className="text-white/60 text-sm">
                    {(file?.size || 0) / 1024 / 1024} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="glass-dark"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 mx-auto text-white/40" />
                <div>
                  <p className="text-white font-medium mb-1">Drag and drop your creative here</p>
                  <p className="text-white/60 text-sm">or click to browse</p>
                </div>
                <p className="text-white/40 text-xs">
                  Images: JPG, PNG, GIF, WebP (max 5MB) • Videos: MP4, MOV, WebM (max 200MB)
                </p>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="error" showIcon={true}>
              {error}
            </Alert>
          )}

          {value && !file && (
            <Alert variant="success" showIcon={true}>
              Creative uploaded: <a href={value} target="_blank" rel="noopener noreferrer" className="underline">{value}</a>
            </Alert>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="creative_url" className="text-white font-medium mb-3 block text-base">
            Creative URL <span className="text-white/60 font-normal" aria-label="required">*</span>
          </Label>
          <Input
            id="creative_url"
            type="url"
            variant="glass"
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/creative.jpg"
            className="rounded-2xl"
          />
          <p className="text-white/60 text-sm">
            Enter a URL to an existing creative file
          </p>
        </div>
      )}
    </div>
  );
}


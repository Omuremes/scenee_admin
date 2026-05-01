import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  label: string;
  onFileSelect: (file: File | null) => void;
  currentImageUrl?: string;
  className?: string;
}

export function ImageUpload({ label, onFileSelect, currentImageUrl, className }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setSelectedFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setSelectedFileName(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const displayUrl = previewUrl || currentImageUrl;

  return (
    <div className={`${styles.container} ${className || ''}`.trim()}>
      <label className={styles.label}>{label}</label>
      
      <div 
        className={`${styles.dropzone} ${displayUrl ? styles.hasPreview : ''}`}
        onClick={triggerFileInput}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className={styles.hiddenInput} 
        />
        
        {displayUrl ? (
          <div className={styles.previewContainer}>
            <img src={displayUrl} alt="Preview" className={styles.previewImage} />
            <div className={styles.overlay}>
              <div className={styles.overlayContent}>
                <Upload size={20} />
                <span>Change Image</span>
              </div>
            </div>
            <button className={styles.clearBtn} onClick={handleClear} type="button">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.iconCircle}>
              <ImageIcon size={24} className={styles.icon} />
            </div>
            <div className={styles.textContainer}>
              <span className={styles.primaryText}>Click to upload</span>
              <span className={styles.secondaryText}>PNG, JPG or WebP</span>
            </div>
          </div>
        )}
      </div>
      
      {selectedFileName && (
        <span className={styles.fileName}>{selectedFileName}</span>
      )}
    </div>
  );
}

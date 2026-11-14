import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { UploadProgressModal, UploadModalState, FileUploadStatusItem } from '../components/files/UploadProgressModal';

interface UploadContextType {
  uploadFiles: (files: File[]) => Promise<void>;
  uploadModalState: UploadModalState;
  minimizeModal: () => void;
  expandModal: () => void;
  closeModal: () => void;
  onUploadComplete: (callback: () => void) => () => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploadModalState, setUploadModalState] = useState<UploadModalState>({
    isOpen: false,
    isMinimized: false,
    status: 'uploading',
    totalFiles: 0,
    currentFileIndex: 0,
    currentFileName: '',
    loadedBytes: 0,
    totalBytes: 0,
    percent: 0,
    fileStatuses: [],
    successCount: 0,
    failedCount: 0,
  });

  const completeListenersRef = useRef<Set<() => void>>(new Set());

  const onUploadComplete = useCallback((callback: () => void) => {
    completeListenersRef.current.add(callback);
    return () => {
      completeListenersRef.current.delete(callback);
    };
  }, []);

  const minimizeModal = useCallback(() => {
    setUploadModalState((prev) => ({ ...prev, isMinimized: true }));
  }, []);

  const expandModal = useCallback(() => {
    setUploadModalState((prev) => ({ ...prev, isMinimized: false }));
  }, []);

  const closeModal = useCallback(() => {
    setUploadModalState((prev) => ({ ...prev, isOpen: false, isMinimized: false }));
  }, []);

  const uploadFiles = useCallback(async (fileList: File[]) => {
    if (!fileList || fileList.length === 0) return;

    const totalBytes = fileList.reduce((acc, f) => acc + f.size, 0);
    const initialStatuses: FileUploadStatusItem[] = fileList.map((f) => ({
      name: f.name,
      size: f.size,
      status: 'pending',
    }));

    setUploadModalState({
      isOpen: true,
      isMinimized: false,
      status: 'uploading',
      totalFiles: fileList.length,
      currentFileIndex: 1,
      currentFileName: fileList[0].name,
      loadedBytes: 0,
      totalBytes,
      percent: 0,
      fileStatuses: initialStatuses,
      successCount: 0,
      failedCount: 0,
    });

    const formData = new FormData();
    fileList.forEach((file) => formData.append('files', file));

    try {
      await api.files.upload(formData, (update) => {
        setUploadModalState((prev) => ({
          ...prev,
          ...update,
        }));
      });

      // Notify all listening components to refresh files
      completeListenersRef.current.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.warn('Upload completion listener notice:', e);
        }
      });
    } catch (err: any) {
      console.error('Upload error in context:', err);
      setUploadModalState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'File upload failed. Please try again.',
      }));
    }
  }, []);

  return (
    <UploadContext.Provider
      value={{
        uploadFiles,
        uploadModalState,
        minimizeModal,
        expandModal,
        closeModal,
        onUploadComplete,
      }}
    >
      {children}

      {/* Global Persistent Upload Progress Modal & Floating Corner Widget */}
      <UploadProgressModal
        state={uploadModalState}
        onClose={closeModal}
        onMinimize={minimizeModal}
        onExpand={expandModal}
      />
    </UploadContext.Provider>
  );
};

export const useUpload = (): UploadContextType => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

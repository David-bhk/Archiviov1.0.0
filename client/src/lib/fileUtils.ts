// File upload utilities for client-side validation and handling

export const FILE_CONSTANTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif'],
  MAX_FILES: 10,
};

export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  if (!FILE_CONSTANTS.ALLOWED_TYPES.includes(fileExtension)) {
    return { 
      isValid: false, 
      error: `Type de fichier non autorisé: ${fileExtension}. Types autorisés: ${FILE_CONSTANTS.ALLOWED_TYPES.join(', ')}` 
    };
  }
  
  if (file.size > FILE_CONSTANTS.MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB. Limite: ${FILE_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB` 
    };
  }
  
  return { isValid: true };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const getFileTypeIcon = (fileType: string): string => {
  const type = fileType.toLowerCase();
  if (['pdf'].includes(type)) return '📄';
  if (['doc', 'docx'].includes(type)) return '📝';
  if (['xls', 'xlsx'].includes(type)) return '📊';
  if (['png', 'jpg', 'jpeg', 'gif'].includes(type)) return '🖼️';
  return '📎';
};

export const isDragEventWithFiles = (e: DragEvent): boolean => {
  return !!(e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files'));
};

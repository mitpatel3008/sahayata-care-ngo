export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
  beneficiary_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export enum DocumentType {
  DISABILITY_CERTIFICATE = 'disability_certificate',
  IDENTITY_PROOF = 'identity_proof',
  PASSPORT_PHOTO = 'passport_photo',
  BIRTH_CERTIFICATE = 'birth_certificate',
  MEDICAL_REPORT = 'medical_report',
  INCOME_CERTIFICATE = 'income_certificate',
  CASTE_CERTIFICATE = 'caste_certificate'
}

export const DocumentTypeLabels: Record<DocumentType, string> = {
  [DocumentType.DISABILITY_CERTIFICATE]: 'Disability Certificate',
  [DocumentType.IDENTITY_PROOF]: 'Identity Proof (Aadhaar Card)',
  [DocumentType.PASSPORT_PHOTO]: 'Passport-sized Photo',
  [DocumentType.BIRTH_CERTIFICATE]: 'Birth Certificate',
  [DocumentType.MEDICAL_REPORT]: 'Medical Reports',
  [DocumentType.INCOME_CERTIFICATE]: 'Income Certificate',
  [DocumentType.CASTE_CERTIFICATE]: 'Caste Certificate'
};

export const DocumentTypeDescriptions: Record<DocumentType, string> = {
  [DocumentType.DISABILITY_CERTIFICATE]: 'Official disability certificate from government authority',
  [DocumentType.IDENTITY_PROOF]: 'Aadhaar card or other valid government ID proof',
  [DocumentType.PASSPORT_PHOTO]: 'Recent passport-sized photograph',
  [DocumentType.BIRTH_CERTIFICATE]: 'Official birth certificate',
  [DocumentType.MEDICAL_REPORT]: 'Medical reports and assessments related to disability',
  [DocumentType.INCOME_CERTIFICATE]: 'Income certificate from competent authority',
  [DocumentType.CASTE_CERTIFICATE]: 'Caste certificate (if applicable for reservations)'
};

export const DocumentTypeIcons: Record<DocumentType, string> = {
  [DocumentType.DISABILITY_CERTIFICATE]: '🏥',
  [DocumentType.IDENTITY_PROOF]: '🆔',
  [DocumentType.PASSPORT_PHOTO]: '📸',
  [DocumentType.BIRTH_CERTIFICATE]: '📜',
  [DocumentType.MEDICAL_REPORT]: '🩺',
  [DocumentType.INCOME_CERTIFICATE]: '💰',
  [DocumentType.CASTE_CERTIFICATE]: '📋'
};

export interface DocumentUploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}
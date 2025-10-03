import { Document, DocumentType } from '@/types/document';

// Mock document service for development without database
export class MockDocumentService {
  private static readonly STORAGE_KEY = 'ngo-documents';

  private static getStoredDocuments(): Document[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private static saveDocuments(documents: Document[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documents));
  }

  static async uploadDocument(
    file: File, 
    documentType: DocumentType, 
    userId: string,
    beneficiaryId?: string
  ): Promise<Document> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newDocument: Document = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: documentType,
      file_path: `mock/${userId}/${file.name}`,
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
      uploaded_by: userId,
      beneficiary_id: beneficiaryId,
      status: 'pending',
    };

    const documents = this.getStoredDocuments();
    documents.unshift(newDocument);
    this.saveDocuments(documents);

    return newDocument;
  }

  static async getUserDocuments(userId: string): Promise<Document[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const documents = this.getStoredDocuments();
    return documents.filter(doc => doc.uploaded_by === userId);
  }

  static async getBeneficiaryDocuments(beneficiaryId: string): Promise<Document[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const documents = this.getStoredDocuments();
    return documents.filter(doc => doc.beneficiary_id === beneficiaryId);
  }

  static async downloadDocument(document: Document): Promise<Blob> {
    // Simulate file download
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create a mock blob for demo purposes
    const mockContent = `Mock file content for ${document.name}`;
    return new Blob([mockContent], { type: 'text/plain' });
  }

  static getDocumentUrl(filePath: string): string {
    // Return a placeholder URL for preview
    return `https://via.placeholder.com/800x600/f0f0f0/333333?text=Document+Preview`;
  }

  static async deleteDocument(documentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const documents = this.getStoredDocuments();
    const filteredDocuments = documents.filter(doc => doc.id !== documentId);
    this.saveDocuments(filteredDocuments);
  }

  static async updateDocumentStatus(
    documentId: string, 
    status: 'pending' | 'approved' | 'rejected',
    notes?: string
  ): Promise<Document> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const documents = this.getStoredDocuments();
    const documentIndex = documents.findIndex(doc => doc.id === documentId);
    
    if (documentIndex === -1) {
      throw new Error('Document not found');
    }

    documents[documentIndex] = {
      ...documents[documentIndex],
      status,
      notes: notes || undefined,
    };

    this.saveDocuments(documents);
    return documents[documentIndex];
  }

  static async getDocumentStats(userId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byType: Record<DocumentType, number>;
  }> {
    const documents = await this.getUserDocuments(userId);
    
    const stats = {
      total: documents.length,
      pending: documents.filter(doc => doc.status === 'pending').length,
      approved: documents.filter(doc => doc.status === 'approved').length,
      rejected: documents.filter(doc => doc.status === 'rejected').length,
      byType: {} as Record<DocumentType, number>
    };

    // Count by type
    Object.values(DocumentType).forEach(type => {
      stats.byType[type] = documents.filter(doc => doc.type === type).length;
    });

    return stats;
  }

  static async checkDocumentExists(
    userId: string, 
    documentType: DocumentType,
    beneficiaryId?: string
  ): Promise<boolean> {
    const documents = await this.getUserDocuments(userId);
    return documents.some(doc => {
      if (beneficiaryId) {
        return doc.type === documentType && doc.beneficiary_id === beneficiaryId;
      }
      return doc.type === documentType;
    });
  }

  // Utility method to seed some sample data for demo
  static seedSampleData(userId: string): void {
    const sampleDocuments: Document[] = [
      {
        id: 'doc_sample_1',
        name: 'disability_certificate.pdf',
        type: DocumentType.DISABILITY_CERTIFICATE,
        file_path: `mock/${userId}/disability_certificate.pdf`,
        file_size: 245760,
        uploaded_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        uploaded_by: userId,
        status: 'approved',
      },
      {
        id: 'doc_sample_2',
        name: 'aadhaar_card.jpg',
        type: DocumentType.IDENTITY_PROOF,
        file_path: `mock/${userId}/aadhaar_card.jpg`,
        file_size: 156480,
        uploaded_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        uploaded_by: userId,
        status: 'pending',
      },
      {
        id: 'doc_sample_3',
        name: 'passport_photo.jpg',
        type: DocumentType.PASSPORT_PHOTO,
        file_path: `mock/${userId}/passport_photo.jpg`,
        file_size: 89234,
        uploaded_at: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
        uploaded_by: userId,
        status: 'approved',
      }
    ];

    this.saveDocuments(sampleDocuments);
  }
}
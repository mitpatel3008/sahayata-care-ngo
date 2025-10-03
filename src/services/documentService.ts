import { supabase } from '@/integrations/supabase/client';
import { Document, DocumentType } from '@/types/document';

export class DocumentService {
  private static readonly BUCKET_NAME = 'documents';

  /**
   * Upload a document to Supabase storage
   */
  static async uploadDocument(
    file: File, 
    documentType: DocumentType, 
    userId: string,
    beneficiaryId?: string
  ): Promise<Document> {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${documentType}_${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Insert document record into database
      const { data: documentData, error: dbError } = await supabase
        .from('documents')
        .insert({
          name: file.name,
          type: documentType,
          file_path: uploadData.path,
          file_size: file.size,
          uploaded_by: userId,
          beneficiary_id: beneficiaryId,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await this.deleteFile(uploadData.path);
        throw new Error(`Database error: ${dbError.message}`);
      }

      return documentData;
    } catch (error) {
      console.error('Document upload failed:', error);
      throw error;
    }
  }

  /**
   * Get all documents for a user
   */
  static async getUserDocuments(userId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('uploaded_by', userId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get documents for a specific beneficiary
   */
  static async getBeneficiaryDocuments(beneficiaryId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch beneficiary documents: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all beneficiaries with their document counts
   */
  static async getBeneficiariesWithDocumentCounts(): Promise<Array<{
    id: string;
    name: string;
    date_of_birth: string;
    gender: string;
    disability_type: string;
    guardian_name: string;
    city: string;
    state: string;
    document_count: number;
    completed_documents: number;
    total_required: number;
  }>> {
    // First get all beneficiaries
    const { data: beneficiaries, error: beneficiariesError } = await supabase
      .from('beneficiaries')
      .select('*')
      .order('name', { ascending: true });

    if (beneficiariesError) {
      throw new Error(`Failed to fetch beneficiaries: ${beneficiariesError.message}`);
    }

    // Then get document counts for each beneficiary
    const beneficiariesWithCounts = await Promise.all(
      (beneficiaries || []).map(async (beneficiary) => {
        const { data: documents } = await supabase
          .from('documents')
          .select('type')
          .eq('beneficiary_id', beneficiary.id);

        const documentCount = documents?.length || 0;
        const totalRequired = Object.values(DocumentType).length;
        const completedDocuments = new Set(documents?.map(doc => doc.type) || []).size;

        return {
          id: beneficiary.id,
          name: beneficiary.name,
          date_of_birth: beneficiary.date_of_birth,
          gender: beneficiary.gender,
          disability_type: beneficiary.disability_type,
          guardian_name: beneficiary.guardian_name,
          city: beneficiary.city,
          state: beneficiary.state,
          document_count: documentCount,
          completed_documents: completedDocuments,
          total_required: totalRequired
        };
      })
    );

    return beneficiariesWithCounts;
  }

  /**
   * Get document statistics for a specific beneficiary
   */
  static async getBeneficiaryDocumentStats(beneficiaryId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byType: Record<DocumentType, number>;
    missingTypes: DocumentType[];
  }> {
    const documents = await this.getBeneficiaryDocuments(beneficiaryId);
    
    const stats = {
      total: documents.length,
      pending: documents.filter(doc => doc.status === 'pending').length,
      approved: documents.filter(doc => doc.status === 'approved').length,
      rejected: documents.filter(doc => doc.status === 'rejected').length,
      byType: {} as Record<DocumentType, number>,
      missingTypes: [] as DocumentType[]
    };

    // Count by type
    Object.values(DocumentType).forEach(type => {
      stats.byType[type] = documents.filter(doc => doc.type === type).length;
      if (stats.byType[type] === 0) {
        stats.missingTypes.push(type);
      }
    });

    return stats;
  }

  /**
   * Download a document
   */
  static async downloadDocument(document: Document): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .download(document.file_path);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a public URL for document preview
   */
  static getDocumentUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    // First get the document to know the file path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch document: ${fetchError.message}`);
    }

    // Delete from storage
    await this.deleteFile(document.file_path);

    // Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      throw new Error(`Failed to delete document record: ${dbError.message}`);
    }
  }

  /**
   * Update document status
   */
  static async updateDocumentStatus(
    documentId: string, 
    status: 'pending' | 'approved' | 'rejected',
    notes?: string
  ): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update({ 
        status,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update document status: ${error.message}`);
    }

    return data;
  }

  /**
   * Get document statistics
   */
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

  /**
   * Private helper to delete file from storage
   */
  private static async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete file from storage:', error);
      // Don't throw error here as it might be already deleted
    }
  }

  /**
   * Check if a document type already exists for a user
   */
  static async checkDocumentExists(
    userId: string, 
    documentType: DocumentType,
    beneficiaryId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('documents')
      .select('id')
      .eq('uploaded_by', userId)
      .eq('type', documentType);

    if (beneficiaryId) {
      query = query.eq('beneficiary_id', beneficiaryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking document existence:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }
}
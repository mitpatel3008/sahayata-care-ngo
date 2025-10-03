import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  User
} from 'lucide-react';
import { Document, DocumentType, DocumentTypeLabels, DocumentTypeIcons, Beneficiary } from '@/types/document';
import { DocumentService } from '@/services/documentService';
import { toast } from 'sonner';
import DocumentUpload from './DocumentUpload';

interface StudentDocumentManagerProps {
  student: Beneficiary;
  onBack?: () => void;
  currentUserId?: string;
}

const StudentDocumentManager: React.FC<StudentDocumentManagerProps> = ({ 
  student, 
  onBack,
  currentUserId
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteDocument, setDeleteDocument] = useState<Document | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    byType: {} as Record<DocumentType, number>,
    missingTypes: [] as DocumentType[]
  });

  useEffect(() => {
    if (student) {
      loadDocuments();
    }
  }, [student]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const [studentDocuments, documentStats] = await Promise.all([
        DocumentService.getBeneficiaryDocuments(student.id),
        DocumentService.getBeneficiaryDocumentStats(student.id)
      ]);
      setDocuments(studentDocuments);
      setStats(documentStats);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File, documentType: DocumentType) => {
    if (!currentUserId) {
      toast.error('User not authenticated');
      return;
    }
    
    setUploading(true);
    try {
      await DocumentService.uploadDocument(file, documentType, currentUserId, student.id);
      await loadDocuments();
      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload document');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDocument) return;
    
    try {
      await DocumentService.deleteDocument(deleteDocument.id);
      await loadDocuments();
      toast.success('Document deleted successfully');
      setDeleteDocument(null);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const blob = await DocumentService.downloadDocument(document);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  const handlePreview = (document: Document) => {
    const url = DocumentService.getDocumentUrl(document.file_path);
    window.open(url, '_blank');
  };

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const completionPercentage = Math.round((stats.total > 0 ? ((Object.values(DocumentType).length - stats.missingTypes.length) / Object.values(DocumentType).length) * 100 : 0));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {onBack && (
        <Button variant="outline" onClick={onBack} className="mb-4">
          ← Back to Student List
        </Button>
      )}

      {/* Student Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
                {student.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{student.name}</h1>
                <p className="text-muted-foreground">
                  {calculateAge(student.date_of_birth)} years • {student.disability_type} • {student.city}, {student.state}
                </p>
                <p className="text-sm text-muted-foreground">
                  Guardian: {student.guardian_name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Document Completion</span>
                <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
                  {completionPercentage}%
                </Badge>
              </div>
              <Progress value={completionPercentage} className="w-32" />
              <p className="text-xs text-muted-foreground mt-1">
                {Object.values(DocumentType).length - stats.missingTypes.length} / {Object.values(DocumentType).length} documents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <div className="text-2xl font-bold">{stats.pending}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <div className="text-2xl font-bold">{stats.approved}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Missing</p>
                <div className="text-2xl font-bold">{stats.missingTypes.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload New
          </TabsTrigger>
          <TabsTrigger value="missing" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Missing ({stats.missingTypes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          {documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-2">No documents uploaded</p>
                <p className="text-muted-foreground mb-4">
                  Start by uploading the required documents for {student.name}
                </p>
                <Button onClick={() => document.querySelector('[data-state="active"][value="upload"]')?.click()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload First Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((document) => (
                <Card key={document.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{DocumentTypeIcons[document.type]}</span>
                        <Badge variant={getStatusColor(document.status)} className="text-xs">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(document.status)}
                            {document.status}
                          </div>
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreview(document)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(document)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteDocument(document)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div>
                      <h3 className="font-medium truncate mb-1">{document.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {DocumentTypeLabels[document.type]}
                      </p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(document.file_size)}</span>
                        <span>{formatDate(document.uploaded_at)}</span>
                      </div>
                      {document.notes && (
                        <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                          {document.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Document for {student.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUpload onUpload={handleUpload} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Missing Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.missingTypes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium mb-2">All documents completed!</p>
                  <p className="text-muted-foreground">
                    {student.name} has uploaded all required documents.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground mb-4">
                    The following documents are still required for {student.name}:
                  </p>
                  <div className="grid gap-3">
                    {stats.missingTypes.map((docType) => (
                      <div key={docType} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{DocumentTypeIcons[docType]}</span>
                          <div>
                            <h4 className="font-medium">{DocumentTypeLabels[docType]}</h4>
                            <p className="text-sm text-muted-foreground">Required document</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          Missing
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDocument} onOpenChange={() => setDeleteDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDocument?.name}" for {student.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentDocumentManager;
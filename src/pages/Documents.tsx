import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DocumentUpload from "@/components/documents/DocumentUpload";
import DocumentList from "@/components/documents/DocumentList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, FolderOpen, BarChart3 } from "lucide-react";
import { Document, DocumentType } from "@/types/document";
import { MockDocumentService as DocumentService } from "@/services/mockDocumentService";
import { toast } from "sonner";

const Documents = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    byType: {} as Record<DocumentType, number>
  });

  const loadDocuments = async (userId: string) => {
    setDocumentsLoading(true);
    try {
      const [userDocuments, documentStats] = await Promise.all([
        DocumentService.getUserDocuments(userId),
        DocumentService.getDocumentStats(userId)
      ]);
      setDocuments(userDocuments);
      setStats(documentStats);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      setLoading(false);
      
      // Load documents after authentication
      // Seed sample data for demo if no documents exist
      const existingDocs = await DocumentService.getUserDocuments(session.user.id);
      if (existingDocs.length === 0) {
        DocumentService.seedSampleData(session.user.id);
      }
      await loadDocuments(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        await loadDocuments(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleUpload = async (file: File, documentType: DocumentType) => {
    if (!user) return;
    
    try {
      await DocumentService.uploadDocument(file, documentType, user.id);
      await loadDocuments(user.id);
      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      throw error; // Re-throw to let the upload component handle it
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!user) return;
    
    try {
      await DocumentService.deleteDocument(documentId);
      await loadDocuments(user.id);
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
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
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  };

  const handlePreview = (document: Document) => {
    const url = DocumentService.getDocumentUrl(document.file_path);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Document Management</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Upload and manage all required documents for NGO beneficiaries
          </p>
        </div>

        {/* Document Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold">{stats.pending}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">✓</div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold">{stats.approved}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">✗</div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold">{stats.rejected}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Documents
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              My Documents
              {stats.total > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {stats.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="required" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Required Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload New Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentUpload onUpload={handleUpload} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <DocumentList
              documents={documents}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onPreview={handlePreview}
              loading={documentsLoading}
            />
          </TabsContent>

          <TabsContent value="required" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Required Documents for NGO Beneficiaries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground mb-6">
                  Please ensure you have all the following documents to complete your registration as a beneficiary:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <span className="text-2xl">🏥</span>
                      <div>
                        <h3 className="font-semibold">Disability Certificate</h3>
                        <p className="text-sm text-muted-foreground">
                          Official disability certificate from government authority (UDID or equivalent)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <span className="text-2xl">🆔</span>
                      <div>
                        <h3 className="font-semibold">Identity Proof</h3>
                        <p className="text-sm text-muted-foreground">
                          Aadhaar card or other valid government-issued ID proof
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <span className="text-2xl">📸</span>
                      <div>
                        <h3 className="font-semibold">Passport-sized Photo</h3>
                        <p className="text-sm text-muted-foreground">
                          Recent passport-sized photograph (white background preferred)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <span className="text-2xl">📜</span>
                      <div>
                        <h3 className="font-semibold">Birth Certificate</h3>
                        <p className="text-sm text-muted-foreground">
                          Official birth certificate issued by municipal authority
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <span className="text-2xl">🩺</span>
                      <div>
                        <h3 className="font-semibold">Medical Reports</h3>
                        <p className="text-sm text-muted-foreground">
                          Medical reports and assessments related to the disability condition
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <span className="text-2xl">💰</span>
                      <div>
                        <h3 className="font-semibold">Income Certificate</h3>
                        <p className="text-sm text-muted-foreground">
                          Income certificate from competent authority (for financial assistance)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <span className="text-2xl">📋</span>
                      <div>
                        <h3 className="font-semibold">Caste Certificate</h3>
                        <p className="text-sm text-muted-foreground">
                          Caste certificate (if applicable for reservation benefits)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Important Notes:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• All documents should be clear and legible</li>
                    <li>• Accepted formats: PDF, JPG, JPEG, PNG, DOC, DOCX</li>
                    <li>• Maximum file size: 10MB per document</li>
                    <li>• Original documents may be required for verification</li>
                    <li>• Documents will be reviewed within 3-5 business days</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Documents;

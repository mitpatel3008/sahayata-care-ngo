import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  Upload, 
  Users, 
  Search,
  Plus,
  Eye,
  Download,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { Document, DocumentType, Beneficiary } from "@/types/document";
import { DocumentService } from "@/services/documentService";
import DocumentUpload from "@/components/documents/DocumentUpload";
import { toast } from "sonner";

// Define the required document types exactly as specified
const REQUIRED_DOCUMENTS = [
  { type: DocumentType.DISABILITY_CERTIFICATE, label: 'Disability Certificate', icon: '🏥' },
  { type: DocumentType.IDENTITY_PROOF, label: 'Identity Proof (Aadhaar Card)', icon: '🆔' },
  { type: DocumentType.PASSPORT_PHOTO, label: 'Passport-sized Photo', icon: '📸' },
  { type: DocumentType.BIRTH_CERTIFICATE, label: 'Birth Certificate', icon: '📜' },
  { type: DocumentType.MEDICAL_REPORT, label: 'Medical Reports', icon: '🩺' },
  { type: DocumentType.INCOME_CERTIFICATE, label: 'Income Certificate', icon: '💰' },
  { type: DocumentType.CASTE_CERTIFICATE, label: 'Caste Certificate', icon: '📋' }
] as const;

interface StudentWithDocuments extends Beneficiary {
  documents: Document[];
  completedDocuments: number;
  totalRequired: number;
  completionPercentage: number;
}

const Documents = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentWithDocuments[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDocuments | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  const loadStudentsWithDocuments = async () => {
    try {
      // Fetch all beneficiaries
      const { data: beneficiaries, error: beneficiariesError } = await supabase
        .from('beneficiaries')
        .select('*')
        .order('name', { ascending: true });

      if (beneficiariesError) {
        throw new Error(`Failed to fetch beneficiaries: ${beneficiariesError.message}`);
      }

      if (!beneficiaries || beneficiaries.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch documents for all beneficiaries
      const studentsWithDocuments: StudentWithDocuments[] = await Promise.all(
        beneficiaries.map(async (beneficiary) => {
          try {
            const documents = await DocumentService.getBeneficiaryDocuments(beneficiary.id);
            const completedDocuments = new Set(documents.map(doc => doc.type)).size;
            const totalRequired = REQUIRED_DOCUMENTS.length;
            const completionPercentage = Math.round((completedDocuments / totalRequired) * 100);

            return {
              ...beneficiary,
              documents,
              completedDocuments,
              totalRequired,
              completionPercentage
            };
          } catch (error) {
            console.error(`Failed to load documents for ${beneficiary.name}:`, error);
            return {
              ...beneficiary,
              documents: [],
              completedDocuments: 0,
              totalRequired: REQUIRED_DOCUMENTS.length,
              completionPercentage: 0
            };
          }
        })
      );

      setStudents(studentsWithDocuments);
    } catch (error) {
      console.error('Failed to load students and documents:', error);
      toast.error('Failed to load students and documents');
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
      await loadStudentsWithDocuments();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        await loadStudentsWithDocuments();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleUpload = async (file: File, documentType: DocumentType) => {
    if (!user || !selectedStudent) return;
    
    try {
      await DocumentService.uploadDocument(file, documentType, user.id, selectedStudent.id);
      await loadStudentsWithDocuments();
      toast.success(`Document uploaded successfully for ${selectedStudent.name}!`);
      setUploadDialogOpen(false);
      setSelectedDocumentType(null);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload document');
      throw error;
    }
  };

  const handleDocumentAction = (student: StudentWithDocuments, docType: DocumentType, action: 'add' | 'view') => {
    setSelectedStudent(student);
    if (action === 'add') {
      setSelectedDocumentType(docType);
      setUploadDialogOpen(true);
    } else {
      const document = student.documents.find(doc => doc.type === docType);
      if (document) {
        setPreviewDocument(document);
      }
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

  const handleDelete = async (document: Document) => {
    try {
      await DocumentService.deleteDocument(document.id);
      await loadStudentsWithDocuments();
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete document');
    }
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

  const getStatusColor = (hasDocument: boolean) => {
    return hasDocument 
      ? 'bg-green-50 border-green-200 text-green-700'
      : 'bg-red-50 border-red-200 text-red-700';
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-4xl font-bold text-foreground">Student Documents</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage documents for each student - upload, view, and track completion status
          </p>
        </div>
        {/* Search Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, guardian, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-2">
                {students.length === 0 ? "No students found" : "No students match your search"}
              </p>
              <p className="text-muted-foreground">
                {students.length === 0 
                  ? "Add students in the Beneficiaries section first"
                  : "Try adjusting your search criteria"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{student.name}</h3>
                        <p className="text-muted-foreground">
                          {calculateAge(student.date_of_birth)} years • {student.disability_type} • {student.city}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Guardian: {student.guardian_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">Completion</span>
                        <Badge variant={student.completionPercentage === 100 ? 'default' : 'secondary'}>
                          {student.completionPercentage}%
                        </Badge>
                      </div>
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            student.completionPercentage === 100 ? 'bg-green-500' :
                            student.completionPercentage > 0 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${student.completionPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {student.completedDocuments} / {student.totalRequired} documents
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {REQUIRED_DOCUMENTS.map((reqDoc) => {
                      const existingDocument = student.documents.find(doc => doc.type === reqDoc.type);
                      const hasDocument = !!existingDocument;
                      
                      return (
                        <div 
                          key={reqDoc.type}
                          className={`p-3 border rounded-lg transition-all ${getStatusColor(hasDocument)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{reqDoc.icon}</span>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{reqDoc.label}</p>
                                {hasDocument && existingDocument && (
                                  <p className="text-xs opacity-70 truncate">
                                    {existingDocument.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {hasDocument && existingDocument ? (
                                <>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handlePreview(existingDocument)}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Preview
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDownload(existingDocument)}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        onClick={() => handleDelete(existingDocument)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              ) : (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleDocumentAction(student, reqDoc.type, 'add')}
                                  className="text-xs px-2 py-1 h-7"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Upload {selectedDocumentType && REQUIRED_DOCUMENTS.find(d => d.type === selectedDocumentType)?.label}
              </DialogTitle>
              {selectedStudent && (
                <p className="text-sm text-muted-foreground">
                  For student: {selectedStudent.name}
                </p>
              )}
            </DialogHeader>
            {selectedDocumentType && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📄 You are uploading: <strong>{REQUIRED_DOCUMENTS.find(d => d.type === selectedDocumentType)?.label}</strong>
                  </p>
                </div>
                <DocumentUpload 
                  onUpload={handleUpload} 
                  preSelectedType={selectedDocumentType}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Document Preview</DialogTitle>
              {previewDocument && (
                <p className="text-sm text-muted-foreground">
                  {previewDocument.name}
                </p>
              )}
            </DialogHeader>
            {previewDocument && (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Document preview will appear here</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handlePreview(previewDocument)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload(previewDocument)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Documents;

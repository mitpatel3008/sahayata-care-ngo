import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentSelector from "@/components/documents/StudentSelector";
import StudentDocumentManager from "@/components/documents/StudentDocumentManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  FileText, 
  Users, 
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3
} from "lucide-react";
import { Beneficiary, Document } from "@/types/document";
import { DocumentService } from "@/services/documentService";
import { toast } from "sonner";

const StudentDocuments = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Beneficiary | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompletion, setFilterCompletion] = useState<'all' | 'complete' | 'incomplete' | 'missing'>('all');
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    studentsWithCompleteDocuments: 0,
    totalDocuments: 0,
    pendingDocuments: 0
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      setLoading(false);
      await loadData();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        await loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, filterCompletion, students]);

  const loadData = async () => {
    try {
      const [studentsWithCounts, documents] = await Promise.all([
        DocumentService.getBeneficiariesWithDocumentCounts(),
        fetchAllDocuments()
      ]);

      setStudents(studentsWithCounts);
      setAllDocuments(documents);
      
      // Calculate overall statistics
      const totalStudents = studentsWithCounts.length;
      const studentsWithCompleteDocuments = studentsWithCounts.filter(
        student => student.completed_documents === student.total_required
      ).length;
      const totalDocuments = documents.length;
      const pendingDocuments = documents.filter(doc => doc.status === 'pending').length;

      setOverallStats({
        totalStudents,
        studentsWithCompleteDocuments,
        totalDocuments,
        pendingDocuments
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load student data');
    }
  };

  const fetchAllDocuments = async (): Promise<Document[]> => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .not('beneficiary_id', 'is', null)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    return data || [];
  };

  const filterStudents = () => {
    let filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterCompletion !== 'all') {
      filtered = filtered.filter(student => {
        const completionPercentage = (student.completed_documents / student.total_required) * 100;
        
        switch (filterCompletion) {
          case 'complete':
            return completionPercentage === 100;
          case 'incomplete':
            return completionPercentage > 0 && completionPercentage < 100;
          case 'missing':
            return completionPercentage === 0;
          default:
            return true;
        }
      });
    }

    setFilteredStudents(filtered);
  };

  const handleStudentSelect = (student: Beneficiary | null) => {
    setSelectedStudent(student);
  };

  const handleBackToList = () => {
    setSelectedStudent(null);
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

  const getCompletionStatus = (student: any) => {
    const percentage = Math.round((student.completed_documents / student.total_required) * 100);
    
    if (percentage === 100) {
      return { 
        color: 'text-green-600 bg-green-50 border-green-200', 
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Complete'
      };
    } else if (percentage > 0) {
      return { 
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200', 
        icon: <Clock className="w-4 h-4" />,
        label: 'In Progress'
      };
    } else {
      return { 
        color: 'text-red-600 bg-red-50 border-red-200', 
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Missing'
      };
    }
  };

  const getDisabilityColor = (type: string) => {
    const colors: Record<string, string> = {
      physical: 'bg-blue-500',
      visual: 'bg-purple-500',
      hearing: 'bg-green-500',
      intellectual: 'bg-orange-500',
      multiple: 'bg-red-500',
      other: 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (selectedStudent) {
    return (
      <DashboardLayout user={user}>
        <StudentDocumentManager 
          student={selectedStudent} 
          onBack={handleBackToList}
          currentUserId={user?.id}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Student Documents</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage documents for individual students and track completion status
          </p>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-muted-foreground" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <div className="text-2xl font-bold">{overallStats.totalStudents}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Complete Documents</p>
                  <div className="text-2xl font-bold">{overallStats.studentsWithCompleteDocuments}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                  <div className="text-2xl font-bold">{overallStats.totalDocuments}</div>
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
                  <div className="text-2xl font-bold">{overallStats.pendingDocuments}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Search & Filter Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by student name, guardian, or city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterCompletion} onValueChange={(value: any) => setFilterCompletion(value)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by completion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="complete">Complete (100%)</SelectItem>
                  <SelectItem value="incomplete">In Progress</SelectItem>
                  <SelectItem value="missing">Missing Documents</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Students ({filteredStudents.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-2">No students found</p>
                <p className="text-muted-foreground">
                  {students.length === 0 
                    ? "No students have been added to the system yet"
                    : "Try adjusting your search or filter criteria"
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => {
                  const completionStatus = getCompletionStatus(student);
                  const completionPercentage = Math.round((student.completed_documents / student.total_required) * 100);

                  return (
                    <Card 
                      key={student.id}
                      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                      onClick={() => handleStudentSelect(student)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Student Info Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold truncate">{student.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {calculateAge(student.date_of_birth)} years • {student.gender}
                              </p>
                            </div>
                            <Badge className={`${getDisabilityColor(student.disability_type)} text-white text-xs`}>
                              {student.disability_type}
                            </Badge>
                          </div>

                          {/* Guardian & Location */}
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Guardian: {student.guardian_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.city}, {student.state}
                            </p>
                          </div>

                          {/* Document Progress */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Documents</span>
                              <span className="text-sm text-muted-foreground">
                                {student.completed_documents}/{student.total_required}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  completionPercentage === 100 ? 'bg-green-500' :
                                  completionPercentage > 0 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${completionPercentage}%` }}
                              />
                            </div>
                            <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${completionStatus.color}`}>
                              {completionStatus.icon}
                              <span>{completionStatus.label} ({completionPercentage}%)</span>
                            </div>
                          </div>

                          {/* Document Stats */}
                          <div className="pt-2 border-t">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Total: {student.document_count}</span>
                              <span>Missing: {student.total_required - student.completed_documents}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentDocuments;
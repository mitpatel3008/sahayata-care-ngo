import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Search, Users, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Document, DocumentType, DocumentTypeLabels } from '@/types/document';

interface Beneficiary {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  disability_type: string;
  guardian_name: string;
  guardian_phone: string;
  city: string;
  state: string;
}

interface StudentSelectorProps {
  selectedStudent: Beneficiary | null;
  onStudentSelect: (student: Beneficiary | null) => void;
  studentDocuments: Document[];
}

const StudentSelector: React.FC<StudentSelectorProps> = ({
  selectedStudent,
  onStudentSelect,
  studentDocuments
}) => {
  const [students, setStudents] = useState<Beneficiary[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Beneficiary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'dropdown'>('dropdown');

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching students:', error);
    } else {
      setStudents(data || []);
      setFilteredStudents(data || []);
    }
    setLoading(false);
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

  const getDocumentCompletionStatus = (studentId: string) => {
    const requiredDocuments = Object.values(DocumentType);
    const studentDocs = studentDocuments.filter(doc => doc.beneficiary_id === studentId);
    
    const completed = requiredDocuments.filter(docType => 
      studentDocs.some(doc => doc.type === docType)
    ).length;
    
    const total = requiredDocuments.length;
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, total, percentage };
  };

  const getStatusColor = (percentage: number) => {
    if (percentage === 100) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage === 100) return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
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
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading students...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Student for Document Management
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'dropdown' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('dropdown')}
              >
                Dropdown
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'dropdown' ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search students by name, guardian, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select 
                value={selectedStudent?.id || ''} 
                onValueChange={(value) => {
                  const student = students.find(s => s.id === value) || null;
                  onStudentSelect(student);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student to manage documents" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.map((student) => {
                    const status = getDocumentCompletionStatus(student.id);
                    return (
                      <SelectItem key={student.id} value={student.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {calculateAge(student.date_of_birth)} years • {student.guardian_name}
                              </p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(status.percentage)}`}>
                            {getStatusIcon(status.percentage)}
                            {status.completed}/{status.total}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {filteredStudents.map((student) => {
                  const status = getDocumentCompletionStatus(student.id);
                  const isSelected = selectedStudent?.id === student.id;
                  
                  return (
                    <Card 
                      key={student.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => onStudentSelect(student)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium truncate">{student.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {calculateAge(student.date_of_birth)} years • {student.gender}
                              </p>
                            </div>
                            <Badge className={`${getDisabilityColor(student.disability_type)} text-white text-xs`}>
                              {student.disability_type}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Guardian: {student.guardian_name}</p>
                            <p className="text-xs text-muted-foreground">{student.city}, {student.state}</p>
                          </div>

                          <div className={`flex items-center justify-between p-2 rounded text-xs border ${getStatusColor(status.percentage)}`}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(status.percentage)}
                              <span>Documents</span>
                            </div>
                            <span className="font-medium">
                              {status.completed}/{status.total} ({status.percentage}%)
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedStudent.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {calculateAge(selectedStudent.date_of_birth)} years • {selectedStudent.disability_type} • {selectedStudent.city}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${getStatusColor(getDocumentCompletionStatus(selectedStudent.id).percentage)}`}>
                  <FileText className="w-4 h-4" />
                  <span>
                    {getDocumentCompletionStatus(selectedStudent.id).completed}/
                    {getDocumentCompletionStatus(selectedStudent.id).total} Documents Complete
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentSelector;
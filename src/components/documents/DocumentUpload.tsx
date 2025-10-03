import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import { DocumentType, DocumentTypeLabels, DocumentTypeDescriptions, DocumentUploadProgress } from '@/types/document';
import { toast } from 'sonner';

interface DocumentUploadProps {
  onUpload: (file: File, documentType: DocumentType) => Promise<void>;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
  onUpload, 
  acceptedFileTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  maxFileSize = 10
}) => {
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | ''>('');
  const [uploadProgress, setUploadProgress] = useState<DocumentUploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      return `File type not supported. Accepted types: ${acceptedFileTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !selectedDocumentType) {
      if (!selectedDocumentType) {
        toast.error('Please select a document type first');
      }
      return;
    }

    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const uploadItem: DocumentUploadProgress = {
      file,
      progress: 0,
      status: 'uploading'
    };

    setUploadProgress(prev => [...prev, uploadItem]);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => 
          prev.map(item => 
            item.file === file && item.status === 'uploading'
              ? { ...item, progress: Math.min(item.progress + 10, 90) }
              : item
          )
        );
      }, 100);

      await onUpload(file, selectedDocumentType as DocumentType);

      clearInterval(progressInterval);
      setUploadProgress(prev => 
        prev.map(item => 
          item.file === file 
            ? { ...item, progress: 100, status: 'completed' }
            : item
        )
      );

      toast.success(`${file.name} uploaded successfully!`);

      // Remove completed uploads after 3 seconds
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(item => item.file !== file));
      }, 3000);

    } catch (error) {
      setUploadProgress(prev => 
        prev.map(item => 
          item.file === file 
            ? { ...item, status: 'error', error: 'Upload failed' }
            : item
        )
      );
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeUpload = (file: File) => {
    setUploadProgress(prev => prev.filter(item => item.file !== file));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Document Type</label>
        <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
          <SelectTrigger>
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DocumentTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                <div className="flex flex-col">
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {DocumentTypeDescriptions[key as DocumentType]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8 text-center">
          <Upload className={`w-12 h-12 mx-auto mb-4 ${
            isDragOver ? 'text-primary' : 'text-muted-foreground'
          }`} />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragOver ? 'Drop your file here' : 'Upload Document'}
            </p>
            <p className="text-sm text-muted-foreground">
              Drag and drop your file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: {acceptedFileTypes.join(', ')} • Max size: {maxFileSize}MB
            </p>
          </div>
          <Button 
            className="mt-4" 
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedDocumentType}
          >
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={acceptedFileTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Upload Progress</h4>
          {uploadProgress.map((upload, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium truncate max-w-xs">
                    {upload.file.name}
                  </span>
                  <Badge variant={
                    upload.status === 'completed' ? 'default' :
                    upload.status === 'error' ? 'destructive' : 'secondary'
                  }>
                    {upload.status === 'uploading' && 'Uploading'}
                    {upload.status === 'completed' && (
                      <><CheckCircle className="w-3 h-3 mr-1" />Completed</>
                    )}
                    {upload.status === 'error' && (
                      <><AlertCircle className="w-3 h-3 mr-1" />Error</>
                    )}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUpload(upload.file)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Progress value={upload.progress} className="h-2" />
              {upload.error && (
                <p className="text-xs text-destructive mt-1">{upload.error}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;